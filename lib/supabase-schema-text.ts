export const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- CONSENTRA SST - SUPABASE POSTGRESQL SCHEMA & MIGRATION SCRIPT
-- ==============================================================================
-- Instruções de Execução no Supabase:
-- 1. Acesse o seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. No menu lateral, clique em "SQL Editor"
-- 3. Clique em "+ New query"
-- 4. Cole o conteúdo integral deste arquivo e clique no botão "Run" (Executar)
-- ==============================================================================

-- Habilita extensão pgcrypto para UUIDs se necessário
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABELA DE USUÁRIOS E OPERADORES DO SISTEMA (users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Responsável Técnico',
    initials TEXT NOT NULL,
    avatar_bg TEXT DEFAULT 'bg-[#004328]',
    document_registration TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. TABELA DE CLIENTES (clients)
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
-- 3. TABELA DO CATÁLOGO DE SERVIÇOS SST (catalog_services)
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
-- 4. TABELA PRINCIPAL DE PROPOSTAS E ORÇAMENTOS (quotes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.quotes (
    id TEXT PRIMARY KEY, -- e.g. '#319'
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
-- 5. ITENS DETALHADOS DO ORÇAMENTO (quote_items)
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
-- 6. CONFIGURAÇÕES GERAIS E PERFIL DA EMPRESA (app_settings)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES DE DESEMPENHO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON public.quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_catalog_services_nr ON public.catalog_services(nr_category);

-- ==============================================================================
-- ATIVAR ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO
-- Permite leitura e escrita pelo cliente Supabase anônimo (anon key) e autenticado
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para users
DROP POLICY IF EXISTS "Anon & Authenticated full access to users" ON public.users;
CREATE POLICY "Anon & Authenticated full access to users" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para clients
DROP POLICY IF EXISTS "Anon & Authenticated full access to clients" ON public.clients;
CREATE POLICY "Anon & Authenticated full access to clients" ON public.clients
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para catalog_services
DROP POLICY IF EXISTS "Anon & Authenticated full access to catalog_services" ON public.catalog_services;
CREATE POLICY "Anon & Authenticated full access to catalog_services" ON public.catalog_services
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para quotes
DROP POLICY IF EXISTS "Anon & Authenticated full access to quotes" ON public.quotes;
CREATE POLICY "Anon & Authenticated full access to quotes" ON public.quotes
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para quote_items
DROP POLICY IF EXISTS "Anon & Authenticated full access to quote_items" ON public.quote_items;
CREATE POLICY "Anon & Authenticated full access to quote_items" ON public.quote_items
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para app_settings
DROP POLICY IF EXISTS "Anon & Authenticated full access to app_settings" ON public.app_settings;
CREATE POLICY "Anon & Authenticated full access to app_settings" ON public.app_settings
    FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_users_updated_at ON public.users;
CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON public.users
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

-- ==============================================================================
-- CARGA INICIAL DE DADOS (SEEDS)
-- ==============================================================================

-- 1. Usuários Padrão
INSERT INTO public.users (id, name, email, password, role, initials, avatar_bg, document_registration, phone)
VALUES 
    ('user_washington', 'Washington Assis', 'assis.sul@gmail.com', '123', 'Responsável Técnico e Administrador', 'WA', 'bg-[#004328]', 'CREA-SP 506.892/D', '(11) 98765-4321'),
    ('user_mariana', 'Mariana Souza', 'mariana.souza@consentra.com.br', '123', 'Comercial', 'MS', 'bg-blue-700', 'MTE 004821/SP', '(11) 97123-8890'),
    ('user_roberto', 'Dr. Roberto Almeida', 'roberto.almeida@consentra.com.br', '123', 'Responsável Técnico', 'RA', 'bg-emerald-700', 'CRM-SP 142.500', '(11) 99887-1122')
ON CONFLICT (email) DO UPDATE SET 
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    document_registration = EXCLUDED.document_registration;

-- 2. Catálogo de Serviços SST
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

-- 3. Configurações da Empresa
INSERT INTO public.app_settings (key, value)
VALUES
    ('company_profile', '{
        "name": "Consentra Engenharia & Segurança do Trabalho",
        "cnpj": "12.345.678/0001-99",
        "crea": "CREA-SP 2049182",
        "address": "Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100",
        "phone": "(11) 3456-7890",
        "email": "comercial@consentra.com.br",
        "website": "www.consentra.com.br",
        "quoteValidityDays": 15,
        "defaultExecutionForecast": "15 a 20 dias úteis",
        "defaultPaymentCondition": "Faturado em 3x (30/60/90 dias)"
    }'::jsonb),
    ('responsible_persons', '["Washington Assis", "Mariana Souza", "Roberto Almeida", "Ana Beatriz Costa", "Eng. Gabriel Freitas"]'::jsonb)
ON CONFLICT (key) DO NOTHING;
`;
