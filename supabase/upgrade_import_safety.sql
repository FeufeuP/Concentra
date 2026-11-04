-- Importação idempotente: executar após a Fase 5. Não altera registros existentes.
-- Recibo, orçamento, itens e histórico são confirmados na MESMA transação.
CREATE TABLE IF NOT EXISTS public.quote_import_receipts (
    source_hash TEXT PRIMARY KEY CHECK (source_hash ~ '^[0-9a-f]{64}$'),
    quote_id TEXT NOT NULL REFERENCES public.quotes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    imported_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.quote_import_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quote_import_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.quote_import_receipts TO authenticated;
DROP POLICY IF EXISTS import_receipts_read ON public.quote_import_receipts;
CREATE POLICY import_receipts_read ON public.quote_import_receipts
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS import_receipts_insert ON public.quote_import_receipts;
CREATE POLICY import_receipts_insert ON public.quote_import_receipts
    FOR INSERT TO authenticated WITH CHECK (public.can_write() AND imported_by = auth.uid());

CREATE OR REPLACE FUNCTION public.import_quote(p_quote JSONB, p_items JSONB DEFAULT '[]'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_hash TEXT;
    v_id TEXT;
    v_number INTEGER;
    v_original_id TEXT;
    v_items JSONB;
    v_skipped BOOLEAN := false;
BEGIN
    IF NOT public.can_write() THEN
        RAISE EXCEPTION 'Seu perfil não tem permissão para importar orçamentos.' USING ERRCODE = '42501';
    END IF;
    IF p_quote IS NULL OR jsonb_typeof(p_quote) <> 'object' THEN
        RAISE EXCEPTION 'Orçamento inválido.' USING ERRCODE = '22023';
    END IF;
    p_items := COALESCE(p_items, '[]'::jsonb);
    IF jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'Itens de orçamento inválidos.' USING ERRCODE = '22023';
    END IF;
    v_original_id := replace(trim(COALESCE(p_quote->>'id', '')), '#', '');
    p_quote := p_quote || jsonb_build_object('id', v_original_id);
    -- JSONB normaliza a ordem das chaves. IDs locais de itens e lastModified
    -- não fazem parte do payload, portanto o recibo sobrevive a uma nova sessão.
    SELECT COALESCE(jsonb_agg(value ORDER BY (value->>'item_number')::integer, ord), '[]'::jsonb)
      INTO v_items FROM jsonb_array_elements(p_items) WITH ORDINALITY AS x(value, ord);
    v_hash := encode(sha256(convert_to(jsonb_build_object('quote', p_quote, 'items', v_items)::text, 'UTF8')), 'hex');
    -- Duas abas/requisições simultâneas não podem importar o mesmo documento duas vezes.
    PERFORM pg_advisory_xact_lock(hashtextextended(v_hash, 0));
    SELECT q.id, q.number_only INTO v_id, v_number
      FROM public.quote_import_receipts r JOIN public.quotes q ON q.id = r.quote_id
     WHERE r.source_hash = v_hash;
    IF FOUND THEN
        RETURN jsonb_build_object('id', v_id, 'numberOnly', v_number, 'skipped', true);
    END IF;

    -- Compatibilidade com importações antigas: só considera igual se TODOS os
    -- campos enviados e TODOS os itens coincidirem, não apenas cliente/total/data.
    SELECT q.id, q.number_only INTO v_id, v_number
      FROM public.quotes q
     WHERE q.id = v_original_id AND to_jsonb(q) @> p_quote
       AND (SELECT COALESCE(jsonb_agg(to_jsonb(i) - 'id' - 'quote_id' - 'created_at'
                                      ORDER BY i.item_number, i.id), '[]'::jsonb)
              FROM public.quote_items i WHERE i.quote_id = q.id) = v_items;
    IF FOUND THEN
        v_skipped := true;
    ELSE
        -- Todo documento novo recebe um número reservado pelo servidor. Não
        -- reutiliza um número livre observado antes da requisição (corrida).
        v_number := public.next_quote_number();
        v_id := v_number::text;
        PERFORM public.save_quote(p_quote || jsonb_build_object('id', v_id, 'number_only', v_number), v_items);
    END IF;
    INSERT INTO public.quote_import_receipts(source_hash, quote_id) VALUES (v_hash, v_id);
    RETURN jsonb_build_object('id', v_id, 'numberOnly', v_number, 'skipped', v_skipped);
END;
$$;
REVOKE ALL ON FUNCTION public.import_quote(JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_quote(JSONB, JSONB) TO authenticated;
