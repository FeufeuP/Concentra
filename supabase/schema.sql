-- ==============================================================================
-- CONSENTRA SST - SUPABASE POSTGRESQL SCHEMA (v2 - Fase 2: Segurança)
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
    issue_date TEXT NOT NULL,
    validity_days INTEGER NOT NULL DEFAULT 15,
    validity_date TEXT NOT NULL,
    execution_forecast TEXT NOT NULL DEFAULT '15 a 20 dias úteis',
    status TEXT NOT NULL DEFAULT 'Rascunho',
    scope_summary TEXT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    installments INTEGER NOT NULL DEFAULT 1,
    installment_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_condition TEXT NOT NULL DEFAULT 'À vista / Faturado',
    observations TEXT,
    regulatory_scope TEXT[],
    responsible_tech TEXT NOT NULL DEFAULT 'Washington Assis',
    macro_category TEXT,
    sub_category TEXT,
    status_sub_stage TEXT,
    demand_origin TEXT,
    priority TEXT DEFAULT 'Normal',
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
-- CARGA INICIAL (catálogo e configurações)
-- Usuários: ver `supabase/seed_users.sql`
-- ==============================================================================
INSERT INTO public.catalog_services (id, code, title, subtitle, description, unit, suggested_price, nr_category, category, status, deliverables, quick_select)
VALUES
    ('serv-pgr', 'PGR-01', 'Elaboração de PGR (NR-01)', 'Programa de Gerenciamento de Riscos', 'Inventário de Riscos Ocupacionais (GRO) e Plano de Ação em consonância com as NRs atualizadas.', 'documento', 1400.00, 'NR-01', 'Programas Legais', 'Ativo', ARRAY['Inventário de Riscos', 'Plano de Ação', 'Matriz de Risco AIHA/BS8800', 'Assinatura com ART/CREA'], true),
    ('serv-pcmso', 'PCM-01', 'Coordenação e Elaboração do PCMSO (NR-07)', 'Programa de Controle Médico de Saúde Ocupacional', 'Definição dos exames médicos ocupacionais (admissional, periódico, demissional, retorno ao trabalho).', 'documento', 1200.00, 'NR-07', 'Saúde Ocupacional', 'Ativo', ARRAY['Documento-base PCMSO', 'Cronograma de Exames', 'Guia de Encaminhamento Clínico'], true),
    ('serv-ltcat', 'LTC-01', 'Laudo Técnico das Condições Ambientais (LTCAT)', 'Comprovação Previdenciária - INSS / eSocial S-2240', 'Avaliação de agentes nocivos físicos, químicos e biológicos para fins de aposentadoria especial.', 'laudo', 1800.00, 'Previdência', 'Laudos Técnicos', 'Ativo', ARRAY['Medições quantitativas de ruído e calor', 'Enquadramento INSS Decreto 3.048/99', 'ART de Engenharia de Segurança'], true),
    ('serv-nr35', 'TRE-35', 'Treinamento de Trabalho em Altura (NR-35)', 'Capacitação teórica e prática (8 horas)', 'Capacitação obrigatória para execução de atividades acima de 2 metros do nível inferior com risco de queda.', 'treinamento', 650.00, 'NR-35', 'Treinamentos', 'Ativo', ARRAY['Apostila digital em PDF', 'Certificado válido em todo território nacional', 'Registro em livro de treinamento'], true),
    ('serv-nr10', 'TRE-10', 'Treinamento Básico de Segurança em Eletricidade (NR-10)', 'Formação Básica de 40 horas', 'Segurança em instalações e serviços em eletricidade para eletricistas e profissionais de manutenção.', 'treinamento', 1200.00, 'NR-10', 'Treinamentos', 'Ativo', ARRAY['Certificado reconhecido', 'Material didático', 'Avaliação de aprendizado'], false),
    ('serv-insalubridade', 'LAU-15', 'Laudo de Insalubridade (NR-15)', 'Avaliação Técnica Pericial de Atividades Insalubres', 'Verificação e quantificação de insalubridade com base nas tolerâncias e limites da NR-15.', 'laudo', 1600.00, 'NR-15', 'Laudos Técnicos', 'Ativo', ARRAY['Laudo Pericial Conclusivo', 'Aferições com dosímetros calibrados', 'ART recolhida'], false),
    ('serv-periculosidade', 'LAU-16', 'Laudo de Periculosidade (NR-16)', 'Avaliação de Inflamáveis, Explosivos e Energia', 'Análise das condições de periculosidade de acordo com a NR-16 para aplicação de adicional.', 'laudo', 1500.00, 'NR-16', 'Laudos Técnicos', 'Ativo', ARRAY['Relatório fotográfico circunstanciado', 'Enquadramento legal', 'Emissão de parecer'], false),
    ('serv-esocial', 'ESO-01', 'Gestão e Envio de Eventos eSocial SST', 'Eventos S-2210, S-2220 e S-2240', 'Gestão mensal de mensageria direta para o portal governamental com validação de XML.', 'mensal', 450.00, 'eSocial', 'Gestão Contínua', 'Ativo', ARRAY['Envio XML autenticado', 'Relatório de recibos do governo', 'Suporte a inconsistências'], true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.app_settings (key, value)
VALUES
    ('responsible_persons', '["Washington Assis", "Dra. Mariana Rios", "Tec. Roberto Silva", "Amanda Silveira", "Gabriel Santana"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- FIM
-- ==============================================================================
