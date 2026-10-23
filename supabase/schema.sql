-- ==============================================================================
-- CONSENTRA SST - SUPABASE POSTGRESQL SCHEMA (v3 - Fase 3: Dados e persistência)
-- ==============================================================================
-- Instruções:
-- 1. Supabase Dashboard > SQL Editor > New query
-- 2. Cole este arquivo inteiro e clique em "Run"
-- 3. Em seguida execute `supabase/seed_users.sql` para cadastrar os usuários iniciais
-- 4. Publique a Edge Function `supabase/functions/admin-users` (gestão de usuários)
--
-- Modelo de segurança:
-- * Login via Supabase Auth (senhas com bcrypt, nunca em texto puro).
-- * `public.profiles` guarda os dados de perfil (1:1 com auth.users), SEM senha.
-- * RLS: nada é acessível sem login (role `anon`).
--   - Usuários autenticados leem todos os dados de trabalho.
--   - Escrita liberada para todos os perfis, exceto "Auditor SST" (somente leitura).
--   - Configurações gerais e gestão de usuários: somente administradores.
-- * Script idempotente: pode ser executado novamente para atualizar um banco
--   criado com a versão antiga (remove a tabela `users` com senhas em texto puro
--   e as políticas abertas para `anon`).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ==============================================================================
-- 0. LIMPEZA DA VERSÃO ANTIGA (INSEGURA)
-- ==============================================================================
-- Tabela antiga com senhas em texto puro e acesso público
DROP TABLE IF EXISTS public.users CASCADE;

-- ==============================================================================
-- 1. PERFIS DE USUÁRIO (profiles) - vinculados ao Supabase Auth
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    legacy_id TEXT UNIQUE,              -- id usado na versão local (ex.: 'user-washington')
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'Responsável Técnico'
        CHECK (role IN (
            'Administrador',
            'Responsável Técnico',
            'Responsável Técnico e Administrador',
            'Comercial',
            'Auditor SST'
        )),
    initials TEXT NOT NULL DEFAULT 'US',
    avatar_bg TEXT DEFAULT 'bg-[#004328]',
    document_registration TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. CLIENTES (clients)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    ie TEXT,
    risk_grade TEXT NOT NULL DEFAULT 'Grau de Risco 1',
    cnae TEXT,
    contact_name TEXT NOT NULL,
    contact_role TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. CATÁLOGO DE SERVIÇOS SST (catalog_services)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.catalog_services (
    id TEXT PRIMARY KEY,
    code TEXT,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    unit TEXT NOT NULL DEFAULT 'unidade',
    suggested_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    nr_category TEXT NOT NULL DEFAULT 'Geral',
    category TEXT,
    status TEXT NOT NULL DEFAULT 'Ativo',
    deliverables TEXT[],
    quick_select BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. PROPOSTAS E ORÇAMENTOS (quotes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.quotes (
    id TEXT PRIMARY KEY,
    number_only INTEGER NOT NULL,
    client_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    ie TEXT,
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    operational_address TEXT,
    risk_grade TEXT,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    validity_days INTEGER NOT NULL DEFAULT 15,
    validity_date DATE NOT NULL,
    execution_forecast TEXT NOT NULL DEFAULT '15 a 20 dias úteis',
    status TEXT NOT NULL DEFAULT 'Rascunho',
    scope_summary TEXT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    installments INTEGER NOT NULL DEFAULT 1,
    installment_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_condition TEXT NOT NULL DEFAULT 'À vista / Faturado',
    payment_notes TEXT,
    observations TEXT,
    regulatory_scope TEXT[],
    responsible_tech TEXT NOT NULL DEFAULT 'Washington Assis',
    macro_category TEXT,
    sub_category TEXT,
    status_sub_stage TEXT,
    demand_origin TEXT,
    priority TEXT DEFAULT 'Normal',
    custom_texts JSONB,           -- textos personalizados do PDF (por orçamento)
    header_config JSONB,          -- cabeçalho/dados da empresa (por orçamento)
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. ITENS DO ORÇAMENTO (quote_items)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.quote_items (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    item_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL DEFAULT 'unidade',
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. CONFIGURAÇÕES GERAIS (app_settings)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_name ON public.profiles(lower(name));
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON public.quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_catalog_services_nr ON public.catalog_services(nr_category);

-- ==============================================================================
-- FUNÇÕES DE APOIO (papel do usuário logado)
-- SECURITY DEFINER evita recursão de RLS ao consultar `profiles` dentro das políticas.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT role IN ('Administrador', 'Responsável Técnico e Administrador')
           FROM public.profiles WHERE id = auth.uid()),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.can_write()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT role <> 'Auditor SST' FROM public.profiles WHERE id = auth.uid()),
        false
    );
$$;

REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_write() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write() TO authenticated;

-- ------------------------------------------------------------------------------
-- Login por nome: resolve "Washington Assis" -> e-mail cadastrado.
-- Somente correspondência exata (sem diferenciar maiúsculas); nunca expõe senha.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_login_email(identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
-- Aceita: e-mail; nome completo; prefixo do e-mail (ex.: "admin");
-- ou uma palavra do nome, desde que identifique um único usuário (ex.: "amanda").
DECLARE
    q TEXT := lower(trim(coalesce(identifier, '')));
    v TEXT;
    n INT;
BEGIN
    IF q = '' THEN RETURN NULL; END IF;
    IF position('@' IN q) > 0 THEN RETURN q; END IF;

    SELECT email INTO v FROM public.profiles WHERE lower(name) = q ORDER BY created_at LIMIT 1;
    IF v IS NOT NULL THEN RETURN v; END IF;

    SELECT email INTO v FROM public.profiles WHERE split_part(lower(email), '@', 1) = q ORDER BY created_at LIMIT 1;
    IF v IS NOT NULL THEN RETURN v; END IF;

    IF length(q) >= 3 THEN
        SELECT count(*), min(email) INTO n, v
          FROM public.profiles
         WHERE position(' ' || q || ' ' IN ' ' || regexp_replace(lower(name), '[^[:alnum:]]+', ' ', 'g') || ' ') > 0;
        IF n = 1 THEN RETURN v; END IF;
    END IF;

    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(TEXT) TO anon, authenticated;

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_clients_updated_at ON public.clients;
CREATE TRIGGER tr_clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_quotes_updated_at ON public.quotes;
CREATE TRIGGER tr_quotes_updated_at BEFORE UPDATE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_catalog_services_updated_at ON public.catalog_services;
CREATE TRIGGER tr_catalog_services_updated_at BEFORE UPDATE ON public.catalog_services
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER tr_app_settings_updated_at BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- Cria o perfil automaticamente quando um usuário é criado no Supabase Auth.
-- O papel (role) vem de app_metadata, que só pode ser definido com a service role
-- (Edge Function admin-users / seed). Dados livres vêm de user_metadata.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_name TEXT := COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1));
    v_role TEXT := COALESCE(NULLIF(NEW.raw_app_meta_data->>'role', ''), 'Responsável Técnico');
BEGIN
    IF v_role NOT IN ('Administrador', 'Responsável Técnico', 'Responsável Técnico e Administrador', 'Comercial', 'Auditor SST') THEN
        v_role := 'Responsável Técnico';
    END IF;

    INSERT INTO public.profiles (id, legacy_id, name, email, role, initials, avatar_bg, document_registration, phone)
    VALUES (
        NEW.id,
        NULLIF(NEW.raw_user_meta_data->>'legacy_id', ''),
        v_name,
        lower(NEW.email),
        v_role,
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'initials', ''), upper(left(v_name, 2))),
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'avatar_bg', ''), 'bg-[#004328]'),
        NULLIF(NEW.raw_user_meta_data->>'document_registration', ''),
        NULLIF(NEW.raw_user_meta_data->>'phone', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ------------------------------------------------------------------------------
-- Impede escalada de privilégio: só administradores alteram papel, e-mail ou
-- legacy_id de um perfil. (A service role ignora esta regra.)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        -- Chamada sem usuário (service role / SQL Editor): permitido
        RETURN NEW;
    END IF;

    IF NOT public.is_admin() AND (
        NEW.role IS DISTINCT FROM OLD.role OR
        NEW.email IS DISTINCT FROM OLD.email OR
        NEW.legacy_id IS DISTINCT FROM OLD.legacy_id
    ) THEN
        RAISE EXCEPTION 'Apenas administradores podem alterar perfil de acesso, e-mail ou identificador.'
            USING ERRCODE = '42501';
    END IF;

    NEW.id := OLD.id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_profiles_protect ON public.profiles;
CREATE TRIGGER tr_profiles_protect BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Remove as políticas antigas (versão insegura) que liberavam tudo para anon
DROP POLICY IF EXISTS "Anon & Authenticated full access to clients" ON public.clients;
DROP POLICY IF EXISTS "Anon & Authenticated full access to catalog_services" ON public.catalog_services;
DROP POLICY IF EXISTS "Anon & Authenticated full access to quotes" ON public.quotes;
DROP POLICY IF EXISTS "Anon & Authenticated full access to quote_items" ON public.quote_items;
DROP POLICY IF EXISTS "Anon & Authenticated full access to app_settings" ON public.app_settings;

-- Nenhum acesso para visitantes não autenticados
REVOKE ALL ON public.profiles, public.clients, public.catalog_services,
              public.quotes, public.quote_items, public.app_settings FROM anon;

-- ---------- profiles ----------
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (id = auth.uid() OR public.is_admin());
-- INSERT / DELETE de perfis: somente via trigger do Auth e Edge Function (service role)

-- ---------- tabelas de trabalho (clients, catalog_services, quotes, quote_items) ----------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['clients', 'catalog_services', 'quotes', 'quote_items'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%1$s_select_authenticated" ON public.%1$I', t);
        EXECUTE format('CREATE POLICY "%1$s_select_authenticated" ON public.%1$I FOR SELECT TO authenticated USING (true)', t);

        EXECUTE format('DROP POLICY IF EXISTS "%1$s_insert_writers" ON public.%1$I', t);
        EXECUTE format('CREATE POLICY "%1$s_insert_writers" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.can_write())', t);

        EXECUTE format('DROP POLICY IF EXISTS "%1$s_update_writers" ON public.%1$I', t);
        EXECUTE format('CREATE POLICY "%1$s_update_writers" ON public.%1$I FOR UPDATE TO authenticated USING (public.can_write()) WITH CHECK (public.can_write())', t);

        EXECUTE format('DROP POLICY IF EXISTS "%1$s_delete_writers" ON public.%1$I', t);
        EXECUTE format('CREATE POLICY "%1$s_delete_writers" ON public.%1$I FOR DELETE TO authenticated USING (public.can_write())', t);
    END LOOP;
END $$;

-- ---------- app_settings ----------
DROP POLICY IF EXISTS "app_settings_select_authenticated" ON public.app_settings;
CREATE POLICY "app_settings_select_authenticated" ON public.app_settings
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "app_settings_write_admin" ON public.app_settings;
CREATE POLICY "app_settings_write_admin" ON public.app_settings
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==============================================================================
-- FASE 3: DADOS E PERSISTÊNCIA (numeração, gravação atômica, storage do logo)
-- Os blocos abaixo também atualizam bancos criados com a versão anterior.
-- ==============================================================================
-- 1. Campos que existiam no app mas não no banco (eram perdidos ao salvar)
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS payment_notes TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS custom_texts JSONB;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS header_config JSONB;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Datas como DATE (antes: texto 'dd/mm/aaaa', que ordena errado)
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'issue_date') = 'text' THEN
        ALTER TABLE public.quotes
            ALTER COLUMN issue_date TYPE DATE USING (
                CASE WHEN issue_date ~ '^\d{2}/\d{2}/\d{4}$' THEN to_date(issue_date, 'DD/MM/YYYY')
                     WHEN issue_date ~ '^\d{4}-\d{2}-\d{2}' THEN left(issue_date, 10)::date
                     ELSE CURRENT_DATE END),
            ALTER COLUMN validity_date TYPE DATE USING (
                CASE WHEN validity_date ~ '^\d{2}/\d{2}/\d{4}$' THEN to_date(validity_date, 'DD/MM/YYYY')
                     WHEN validity_date ~ '^\d{4}-\d{2}-\d{2}' THEN left(validity_date, 10)::date
                     ELSE CURRENT_DATE + 15 END);
    END IF;
END $$;
ALTER TABLE public.quotes ALTER COLUMN issue_date SET DEFAULT CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_quotes_issue_date ON public.quotes(issue_date DESC);

-- 3. Identificadores padronizados (sem '#') e número único
ALTER TABLE public.quote_items DROP CONSTRAINT IF EXISTS quote_items_quote_id_fkey;
ALTER TABLE public.quote_items ADD CONSTRAINT quote_items_quote_id_fkey
    FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE ON UPDATE CASCADE;
UPDATE public.quotes SET id = replace(id, '#', '') WHERE position('#' IN id) > 0;
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_id_sem_cerquilha;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_id_sem_cerquilha CHECK (position('#' IN id) = 0);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_number_only_key') THEN
        ALTER TABLE public.quotes ADD CONSTRAINT quotes_number_only_key UNIQUE (number_only);
    END IF;
END $$;

-- 4. Numeração sequencial no servidor (sem números repetidos entre usuários)
CREATE SEQUENCE IF NOT EXISTS public.quote_number_seq START WITH 319;
REVOKE ALL ON SEQUENCE public.quote_number_seq FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.next_quote_number()
RETURNS INTEGER
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    n INTEGER;
BEGIN
    IF NOT public.can_write() THEN
        RAISE EXCEPTION 'Seu perfil não tem permissão para criar orçamentos.' USING ERRCODE = '42501';
    END IF;
    LOOP
        n := nextval('public.quote_number_seq');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.quotes WHERE number_only = n);
    END LOOP;
    RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.next_quote_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_quote_number() TO authenticated;

-- 5. Gravação atômica de orçamento + itens (antes: apagava e reinseria itens
--    sem transação; uma falha no meio deixava o orçamento sem itens).
--    SECURITY INVOKER: as políticas RLS continuam valendo (Auditor não grava).
CREATE OR REPLACE FUNCTION public.save_quote(p_quote JSONB, p_items JSONB DEFAULT '[]'::jsonb)
RETURNS public.quotes
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_id TEXT := replace(coalesce(p_quote->>'id', ''), '#', '');
    r public.quotes;
BEGIN
    IF v_id = '' THEN
        RAISE EXCEPTION 'Orçamento sem identificador.' USING ERRCODE = '22023';
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        p_items := '[]'::jsonb;
    END IF;

    INSERT INTO public.quotes AS q (
        id, number_only, client_id, client_name, cnpj, ie, contact_person, contact_email,
        contact_phone, operational_address, risk_grade, issue_date, validity_days, validity_date,
        execution_forecast, status, scope_summary, subtotal, discount, total, installments,
        installment_value, payment_condition, payment_notes, observations, regulatory_scope,
        responsible_tech, macro_category, sub_category, status_sub_stage, demand_origin, priority,
        custom_texts, header_config, updated_by
    ) VALUES (
        v_id,
        (p_quote->>'number_only')::int,
        coalesce(p_quote->>'client_id', ''),
        coalesce(p_quote->>'client_name', ''),
        coalesce(p_quote->>'cnpj', ''),
        p_quote->>'ie',
        p_quote->>'contact_person',
        p_quote->>'contact_email',
        p_quote->>'contact_phone',
        p_quote->>'operational_address',
        p_quote->>'risk_grade',
        coalesce(nullif(p_quote->>'issue_date', '')::date, CURRENT_DATE),
        coalesce(nullif(p_quote->>'validity_days', '')::int, 15),
        coalesce(nullif(p_quote->>'validity_date', '')::date, CURRENT_DATE + 15),
        coalesce(nullif(p_quote->>'execution_forecast', ''), 'A combinar'),
        coalesce(nullif(p_quote->>'status', ''), 'Rascunho'),
        p_quote->>'scope_summary',
        coalesce(nullif(p_quote->>'subtotal', '')::numeric, 0),
        coalesce(nullif(p_quote->>'discount', '')::numeric, 0),
        coalesce(nullif(p_quote->>'total', '')::numeric, 0),
        coalesce(nullif(p_quote->>'installments', '')::int, 1),
        coalesce(nullif(p_quote->>'installment_value', '')::numeric, 0),
        coalesce(nullif(p_quote->>'payment_condition', ''), 'À vista / Faturado'),
        p_quote->>'payment_notes',
        p_quote->>'observations',
        CASE WHEN jsonb_typeof(p_quote->'regulatory_scope') = 'array'
             THEN ARRAY(SELECT jsonb_array_elements_text(p_quote->'regulatory_scope')) END,
        coalesce(nullif(p_quote->>'responsible_tech', ''), 'Washington Assis'),
        p_quote->>'macro_category',
        p_quote->>'sub_category',
        p_quote->>'status_sub_stage',
        p_quote->>'demand_origin',
        coalesce(nullif(p_quote->>'priority', ''), 'Normal'),
        CASE WHEN jsonb_typeof(p_quote->'custom_texts') = 'object' THEN p_quote->'custom_texts' END,
        CASE WHEN jsonb_typeof(p_quote->'header_config') = 'object' THEN p_quote->'header_config' END,
        auth.uid()
    )
    ON CONFLICT (id) DO UPDATE SET
        number_only = EXCLUDED.number_only,
        client_id = EXCLUDED.client_id,
        client_name = EXCLUDED.client_name,
        cnpj = EXCLUDED.cnpj,
        ie = EXCLUDED.ie,
        contact_person = EXCLUDED.contact_person,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        operational_address = EXCLUDED.operational_address,
        risk_grade = EXCLUDED.risk_grade,
        issue_date = EXCLUDED.issue_date,
        validity_days = EXCLUDED.validity_days,
        validity_date = EXCLUDED.validity_date,
        execution_forecast = EXCLUDED.execution_forecast,
        status = EXCLUDED.status,
        scope_summary = EXCLUDED.scope_summary,
        subtotal = EXCLUDED.subtotal,
        discount = EXCLUDED.discount,
        total = EXCLUDED.total,
        installments = EXCLUDED.installments,
        installment_value = EXCLUDED.installment_value,
        payment_condition = EXCLUDED.payment_condition,
        payment_notes = EXCLUDED.payment_notes,
        observations = EXCLUDED.observations,
        regulatory_scope = EXCLUDED.regulatory_scope,
        responsible_tech = EXCLUDED.responsible_tech,
        macro_category = EXCLUDED.macro_category,
        sub_category = EXCLUDED.sub_category,
        status_sub_stage = EXCLUDED.status_sub_stage,
        demand_origin = EXCLUDED.demand_origin,
        priority = EXCLUDED.priority,
        custom_texts = EXCLUDED.custom_texts,
        header_config = EXCLUDED.header_config,
        updated_by = auth.uid()
    RETURNING * INTO r;

    DELETE FROM public.quote_items WHERE quote_id = v_id;

    INSERT INTO public.quote_items (id, quote_id, item_number, title, description, unit, quantity, unit_price, total_price)
    SELECT v_id || '-' || t.ord,
           v_id,
           coalesce(nullif(t.item->>'item_number', '')::int, t.ord::int),
           coalesce(nullif(t.item->>'title', ''), 'Item'),
           t.item->>'description',
           coalesce(nullif(t.item->>'unit', ''), 'unidade'),
           coalesce(nullif(t.item->>'quantity', '')::numeric, 1),
           coalesce(nullif(t.item->>'unit_price', '')::numeric, 0),
           coalesce(nullif(t.item->>'total_price', '')::numeric, 0)
      FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(item, ord);

    RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.save_quote(JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_quote(JSONB, JSONB) TO authenticated;

-- 6. "Zerar sistema": apaga todos os orçamentos no servidor (somente admin,
--    com confirmação explícita). A numeração NÃO é reiniciada (rastreabilidade).
CREATE OR REPLACE FUNCTION public.clear_all_quotes(p_confirm TEXT)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    n INTEGER;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem zerar os orçamentos.' USING ERRCODE = '42501';
    END IF;
    IF p_confirm IS DISTINCT FROM 'ZERAR' THEN
        RAISE EXCEPTION 'Confirmação inválida. Digite ZERAR para confirmar.' USING ERRCODE = '22023';
    END IF;
    DELETE FROM public.quotes WHERE id IS NOT NULL;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.clear_all_quotes(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_all_quotes(TEXT) TO authenticated;

-- 7. Lista de responsáveis: editável por quem pode gravar (usada na Ordem de Serviço).
--    Demais configurações (empresa, textos, logo) continuam exclusivas de administradores.
DROP POLICY IF EXISTS "app_settings_write_responsibles" ON public.app_settings;
CREATE POLICY "app_settings_write_responsibles" ON public.app_settings
    FOR ALL TO authenticated
    USING (key = 'responsible_persons' AND public.can_write())
    WITH CHECK (key = 'responsible_persons' AND public.can_write());

-- 8. Logotipo no Supabase Storage (antes: base64 no localStorage, limite ~5 MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('branding', 'branding', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
    SET public = true,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "branding_read_authenticated" ON storage.objects;
CREATE POLICY "branding_read_authenticated" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'branding');
DROP POLICY IF EXISTS "branding_admin_insert" ON storage.objects;
CREATE POLICY "branding_admin_insert" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branding' AND public.is_admin());
DROP POLICY IF EXISTS "branding_admin_update" ON storage.objects;
CREATE POLICY "branding_admin_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'branding' AND public.is_admin())
    WITH CHECK (bucket_id = 'branding' AND public.is_admin());
DROP POLICY IF EXISTS "branding_admin_delete" ON storage.objects;
CREATE POLICY "branding_admin_delete" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'branding' AND public.is_admin());

-- ==============================================================================
-- CARGA INICIAL (catálogo e configurações)
-- Usuários: ver `supabase/seed_users.sql`
-- Dados da empresa, textos do PDF e logo: quando não há registro em app_settings,
-- o app usa os padrões do código (lib/mock-data.ts e lib/company.ts).
-- ==============================================================================
-- Catálogo: os mesmos 12 serviços do app (lib/mock-data.ts). Remove a carga antiga.
DELETE FROM public.catalog_services
 WHERE id IN ('serv-pgr', 'serv-pcmso', 'serv-ltcat', 'serv-nr35', 'serv-nr10',
              'serv-insalubridade', 'serv-periculosidade', 'serv-esocial');

INSERT INTO public.catalog_services (id, code, title, subtitle, description, unit, suggested_price, nr_category, category, status, deliverables, quick_select)
VALUES
    ('pgr-01', '#SRV-01', 'PGR - Programa de Gerenciamento de Riscos', 'Inventário + Plano de Ação', 'Levantamento de riscos físicos, químicos, biológicos, ergonômicos e mecânicos com matriz de probabilidade x severidade e cronograma técnico.', 'Unidade', 3800.00, 'NR-01 Geral', 'Programas NR', 'Ativo', ARRAY['Emissão de Anotação de Responsabilidade Técnica (ART / CREA)', 'Visita técnica presencial com engenheiro de segurança credenciado', 'Entrega em formato digital PDF assinado com certificado ICP-Brasil'], true),
    ('pcmso-07', '#SRV-02', 'PCMSO - Prog. Controle Médico Saúde Ocupacional', 'Médico do Trabalho Coordenador', 'Planejamento anual dos exames clínicos e complementares por função, faixa etária e grupo homogêneo de exposição (GHE), integrado ao PGR.', 'Unidade', 2900.00, 'NR-07 Médica', 'Saúde Ocupacional', 'Ativo', ARRAY['Indicação de Médico Coordenador com CRM ativo', 'Cronograma anual de exames clínicos e complementares', 'Relatório analítico epidemiológico anual'], true),
    ('ltcat-prev', '#SRV-03', 'LTCAT - Laudo Técnico Condições Ambientais', 'Previdência / INSS & Aposentadoria Especial', 'Análise conclusiva de insalubridade e periculosidade conforme Lei 8.213/91, fundamentação técnica para evento governamental S-2240 e GFIP.', 'Laudo', 4200.00, 'Previdenciário', 'Laudos Técnicos', 'Ativo', ARRAY['Dosimetria de ruído com dosímetros calibrados RBC', 'Amostragens químicas de vapores e poeiras em laboratório acreditado', 'ART registrada no CREA pelo Engenheiro de Segurança'], true),
    ('nr-35-turma', '#SRV-04', 'Treinamento NR-35 (Trabalho em Altura)', 'Carga Horária: 8h Teórico-Prático', 'Carga horária de 8 horas teórico-prática, instrutor técnico qualificado, materiais didáticos individuais e emissão de certificados com ART do Eng. Responsável.', 'Turma (15p)', 1500.00, 'NR-35 Formação', 'Treinamentos', 'Ativo', ARRAY['Certificados individuais com código de validação e QR Code', 'Apostila técnica ilustrada e lista de presença formal', 'ART de capacitação e proficiência do instrutor'], false),
    ('cipa-05', '#SRV-05', 'Implantação & Treinamento de CIPA (NR-05)', 'CIPA + Designado', 'Assessoria em todo o processo eleitoral, minutas de convocação, apuração de votos, posse formal e treinamento regulamentar dos membros titulares e suplentes.', 'Turma', 1800.00, 'NR-05 Comissão', 'Treinamentos', 'Ativo', ARRAY['Minuta de edital de convocação, votação e ata de posse', 'Treinamento regulamentar de 20h para os membros eleitos', 'Manual de atuação da CIPA e cronograma anual de reuniões'], false),
    ('aet-17', '#SRV-06', 'Laudo de Ergonomia / AET (NR-17)', 'Biomecânica & Avaliação Postural', 'Análise ergonômica preliminar (AEP) e Aprofundada (AET) de postos operacionais e administrativos com ferramentas validadas (RULA, REBA, NIOSH).', 'Laudo', 3600.00, 'NR-17 Biomecânica', 'Laudos Técnicos', 'Ativo', ARRAY['Avaliação fotográfica e de esforço muscular dos postos', 'Planilhas com critérios internacionais (RULA, REBA, OWAS)', 'Recomendações técnicas de adequação de mobiliário e pausas'], false),
    ('esocial-gestao', '#SRV-07', 'Envio Mensal de Eventos eSocial SST', 'S-2210 / S-2220 / S-2240', 'Auditoria, geração contínua e transmissão de arquivos XML para o ambiente do Governo Federal via certificado digital A1 da contratante ou procuração.', 'Mensalidade', 450.00, 'eSocial SST', 'Gestão eSocial', 'Ativo', ARRAY['Auditoria prévia de dados cadastrais e cargos', 'Transmissão e monitoramento dos lotes de eventos XML', 'Emissão mensal de relatório de recibos oficiais do governo'], true),
    ('aso-clinico', '#SRV-08', 'Exame Clínico Ocupacional (ASO)', 'Admissional / Periódico / Demissional', 'Anamnese ocupacional presencial com médico examinador habilitado e emissão de Atestado de Saúde Ocupacional em 2 vias físicas e digitais.', 'Vidas / Exame', 65.00, 'NR-07 Exames', 'Saúde Ocupacional', 'Ativo', ARRAY['ASO emitido em 2 vias com carimbo e CRM do médico examinador', 'Registro e guarda de prontuário clínico ocupacional', 'Integração imediata com o layout S-2220 do eSocial'], false),
    ('nr-10-seg', '#SRV-09', 'Treinamento de Segurança em Instalações Elétricas (NR-10)', 'Básico 40h Teórico-Prático', 'Capacitação com ênfase em riscos em eletricidade, medidas de controle, combate a princípios de incêndio e primeiros socorros.', 'Turma (10p)', 2400.00, 'NR-10 Eletricidade', 'Treinamentos', 'Ativo', ARRAY['Material didático individual impresso e digital', 'Prática de primeiros socorros e combate a princípio de incêndio', 'Certificado assinado por instrutores habilitados com ART'], false),
    ('nr-12-laudo', '#SRV-10', 'Apreciação de Riscos em Máquinas e Equipamentos (NR-12)', 'Inventário & Categoria de Segurança', 'Levantamento de dispositivos de segurança, intertravamentos categoria 4, paradas de emergência e plano de adequação mecânica e elétrica.', 'Por Equip.', 1200.00, 'NR-12 Máquinas', 'Laudos Técnicos', 'Ativo', ARRAY['Inventário detalhado e planta de localização das máquinas', 'Matriz HRN (Hazard Rating Number) e categoria de comando', 'Laudo conclusivo com ART recolhida no CREA'], false),
    ('periculosidade-16', '#SRV-11', 'Laudo Pericial de Periculosidade (NR-16)', 'Inflamáveis, Explosivos e Eletricidade', 'Avaliação quantitativa e qualitativa das áreas de armazenamento e operação de inflamáveis líquidos/gasosos e sistemas elétricos de potência.', 'Laudo', 2800.00, 'NR-16 Periculosidade', 'Laudos Técnicos', 'Ativo', ARRAY['Delimitação de áreas de risco e bacias de contenção', 'Enquadramento legal para pagamento do adicional de 30%', 'ART registrada e parecer técnico para contestação jurídica'], false),
    ('insalubridade-15', '#SRV-12', 'Laudo Pericial de Insalubridade (NR-15)', 'Agentes Físicos, Químicos e Biológicos', 'Avaliação técnica das atividades exercidas com exposição a agentes nocivos, comparando medições com os limites de tolerância regulamentares.', 'Laudo', 2900.00, 'NR-15 Insalubridade', 'Laudos Técnicos', 'Ativo', ARRAY['Relatórios de medição ambiental com certificado de calibração', 'Definição de graus mínimo (10%), médio (20%) ou máximo (40%)', 'Recomendações técnicas para neutralização via EPI/EPC'], false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.app_settings (key, value)
VALUES
    ('responsible_persons', '["Washington Assis", "Dra. Mariana Rios", "Tec. Roberto Silva", "Amanda Silveira", "Gabriel Santana"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- FIM
-- ==============================================================================
