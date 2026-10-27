-- ==============================================================================
-- CONSENTRA SST - UPGRADE FASE 6 (logotipo público na tela de login)
-- ==============================================================================
-- Execute no SQL Editor de um banco que já tenha o schema da Fase 5.
-- (O `schema.sql` completo já inclui este bloco para instalações novas.)
-- Script idempotente.
--
-- Problema: a tela de login só conhecia o logotipo guardado no navegador
-- (localStorage). Num navegador novo, ela abria com o logotipo padrão mesmo
-- com um logo oficial já enviado ao servidor — o logo do servidor só era
-- aplicado DEPOIS do login (`pullRemoteSettings`), porque `app_settings`
-- exige autenticação para qualquer leitura.
--
-- Correção: leitura pública (anon) SOMENTE da linha `logo_url` de
-- `app_settings`. O valor é a URL pública do bucket `branding` (já pública
-- por natureza); nenhuma outra configuração fica acessível sem login.
-- ==============================================================================

GRANT SELECT ON public.app_settings TO anon;

DROP POLICY IF EXISTS "app_settings_select_logo_public" ON public.app_settings;
CREATE POLICY "app_settings_select_logo_public" ON public.app_settings
    FOR SELECT TO anon USING (key = 'logo_url');
