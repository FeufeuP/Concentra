-- ==============================================================================
-- CONSENTRA SST - CARGA DOS USUÁRIOS INICIAIS NO SUPABASE AUTH
-- ==============================================================================
-- Execute APÓS `supabase/schema.sql` (SQL Editor > New query > Run).
--
-- Cria os mesmos usuários e senhas da versão local (lib/auth.ts > DEFAULT_USERS).
-- As senhas são gravadas com bcrypt em auth.users (nunca em texto puro) e o perfil
-- correspondente é criado em public.profiles.
--
-- Idempotente: usuários já existentes (mesmo e-mail) NÃO têm a senha alterada;
-- apenas os dados de perfil são sincronizados.
--
-- ⚠️ Estas senhas iniciais são públicas no código-fonte. Recomenda-se trocá-las
--    pelo próprio sistema (Configurações > Alterar senha) assim que possível.
-- ==============================================================================

DO $$
DECLARE
    u RECORD;
    v_uid UUID;
BEGIN
    FOR u IN
        SELECT * FROM (VALUES
            ('user-washington', 'Washington Assis',    'assis.sul@gmail.com',       '123',   'Responsável Técnico e Administrador', 'CREA-SP 506.892/D',   '(11) 98765-4321', 'WA', 'bg-[#004328]'),
            ('user-2',          'Dra. Mariana Rios',   'mariana@consentra.com.br',  '123',   'Responsável Técnico',                 'CRM/SP 148.920',      '(11) 97654-3210', 'MR', 'bg-[#145E5B]'),
            ('user-3',          'Tec. Roberto Silva',  'roberto@consentra.com.br',  '123',   'Responsável Técnico',                 'MTE 0042189/SP',      '(11) 96543-2109', 'RS', 'bg-[#0284c7]'),
            ('user-4',          'Amanda Silveira',     'amanda@consentra.com.br',   '123',   'Comercial',                           'CRA 19.820',          '(11) 95432-1098', 'AS', 'bg-[#7c3aed]'),
            ('user-5',          'Administrador Geral', 'admin@consentra.com.br',    'admin', 'Administrador',                       'Consentra Gestão SST', '(11) 3289-4500', 'AD', 'bg-[#0b1c30]')
        ) AS t(legacy_id, name, email, pass, role, doc, phone, initials, avatar_bg)
    LOOP
        SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(u.email);

        IF v_uid IS NULL THEN
            v_uid := gen_random_uuid();

            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                confirmation_token, recovery_token, email_change_token_new, email_change,
                email_change_token_current, phone_change, phone_change_token, reauthentication_token
            ) VALUES (
                '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
                lower(u.email), extensions.crypt(u.pass, extensions.gen_salt('bf')), NOW(),
                jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', u.role),
                jsonb_build_object(
                    'name', u.name, 'legacy_id', u.legacy_id, 'initials', u.initials,
                    'avatar_bg', u.avatar_bg, 'document_registration', u.doc, 'phone', u.phone
                ),
                NOW(), NOW(),
                '', '', '', '', '', '', '', ''
            );

            INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
            VALUES (
                gen_random_uuid(), v_uid, v_uid::text,
                jsonb_build_object('sub', v_uid::text, 'email', lower(u.email), 'email_verified', true, 'phone_verified', false),
                'email', NOW(), NOW(), NOW()
            );
        END IF;

        -- Garante o perfil (o trigger on_auth_user_created já cria; aqui sincroniza os dados)
        INSERT INTO public.profiles (id, legacy_id, name, email, role, initials, avatar_bg, document_registration, phone)
        VALUES (v_uid, u.legacy_id, u.name, lower(u.email), u.role, u.initials, u.avatar_bg, u.doc, u.phone)
        ON CONFLICT (id) DO UPDATE SET
            legacy_id = EXCLUDED.legacy_id,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            initials = EXCLUDED.initials,
            avatar_bg = EXCLUDED.avatar_bg,
            document_registration = EXCLUDED.document_registration,
            phone = EXCLUDED.phone;
    END LOOP;
END $$;
