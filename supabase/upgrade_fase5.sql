-- ==============================================================================
-- CONSENTRA SST - UPGRADE FASE 5 (histórico de orçamentos / e-mail real)
-- ==============================================================================
-- Execute no SQL Editor de um banco que já tenha o schema da Fase 3.
-- (O `schema.sql` completo já inclui este bloco para instalações novas.)
-- Script idempotente.
--
-- * `quote_events`: histórico de cada orçamento (criação, mudanças de status,
--   e-mails enviados e exclusão). Preenchido SOMENTE pelo servidor:
--     - trigger em `quotes` (criação, status, exclusão), com o usuário logado;
--     - Edge Function `send-quote-email` (service role) ao enviar e-mail.
--   Usuários autenticados apenas leem; ninguém altera ou apaga pelo app.
-- * Sem chave estrangeira para `quotes`: o registro de exclusão permanece
--   (rastreabilidade), mesmo após "Zerar sistema".
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.quote_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quote_id TEXT NOT NULL,
    quote_number INTEGER,
    event_type TEXT NOT NULL
        CHECK (event_type IN ('created', 'status_changed', 'email_sent', 'deleted')),
    from_status TEXT,
    to_status TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_events_quote ON public.quote_events(quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_events_created ON public.quote_events(created_at DESC);

ALTER TABLE public.quote_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quote_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.quote_events TO authenticated;

DROP POLICY IF EXISTS "quote_events_select_authenticated" ON public.quote_events;
CREATE POLICY "quote_events_select_authenticated" ON public.quote_events
    FOR SELECT TO authenticated USING (true);
-- Sem políticas de INSERT/UPDATE/DELETE: somente trigger (SECURITY DEFINER) e service role.

-- Registra criação, mudança de status e exclusão de orçamentos
CREATE OR REPLACE FUNCTION public.log_quote_event()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor UUID := auth.uid();
    v_name TEXT;
BEGIN
    IF v_actor IS NOT NULL THEN
        SELECT name INTO v_name FROM public.profiles WHERE id = v_actor;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.quote_events (quote_id, quote_number, event_type, to_status, details, actor_id, actor_name)
        VALUES (NEW.id, NEW.number_only, 'created', NEW.status,
                jsonb_build_object('client_name', NEW.client_name, 'total', NEW.total),
                v_actor, v_name);
        RETURN NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            INSERT INTO public.quote_events (quote_id, quote_number, event_type, from_status, to_status, details, actor_id, actor_name)
            VALUES (NEW.id, NEW.number_only, 'status_changed', OLD.status, NEW.status,
                    jsonb_build_object('client_name', NEW.client_name, 'total', NEW.total),
                    v_actor, v_name);
        END IF;
        RETURN NULL;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.quote_events (quote_id, quote_number, event_type, from_status, details, actor_id, actor_name)
        VALUES (OLD.id, OLD.number_only, 'deleted', OLD.status,
                jsonb_build_object('client_name', OLD.client_name, 'total', OLD.total),
                v_actor, v_name);
        RETURN NULL;
    END IF;
    RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.log_quote_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tr_quotes_log_events ON public.quotes;
CREATE TRIGGER tr_quotes_log_events
    AFTER INSERT OR UPDATE OF status OR DELETE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.log_quote_event();
