// =============================================================================
// Edge Function: admin-users
// Gestão de usuários (criar, editar, redefinir senha, excluir) para administradores.
//
// A chave de serviço (service role) fica APENAS aqui, no servidor. O navegador
// envia o token de sessão do usuário logado; a função confere se ele é
// administrador antes de executar qualquer ação.
//
// Deploy: supabase functions deploy admin-users --no-verify-jwt
// (o JWT é validado dentro da função via auth.getUser, compatível com as novas
//  chaves assimétricas do Supabase)
// =============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ROLES = [
  'Administrador',
  'Responsável Técnico',
  'Responsável Técnico e Administrador',
  'Comercial',
  'Auditor SST',
] as const;
type Role = (typeof ROLES)[number];

const ADMIN_ROLES: Role[] = ['Administrador', 'Responsável Técnico e Administrador'];
const MIN_PASSWORD_LENGTH = 6;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function initialsFrom(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || 'US'
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Função mal configurada.' }, 500);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ---- 1. Autenticação e autorização do chamador ----
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sessão não informada. Faça login novamente.' }, 401);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) return json({ error: 'Sessão inválida ou expirada.' }, 401);
  const caller = userData.user;

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (!callerProfile || !ADMIN_ROLES.includes(callerProfile.role as Role)) {
    return json({ error: 'Apenas administradores podem gerenciar usuários.' }, 403);
  }

  // ---- 2. Ação solicitada ----
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corpo da requisição inválido.' }, 400);
  }

  const action = str(body.action);

  async function countOtherAdmins(excludeId: string): Promise<number> {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('role', ADMIN_ROLES)
      .neq('id', excludeId);
    return count ?? 0;
  }

  try {
    switch (action) {
      // ---------------------------------------------------------------
      case 'create': {
        const name = str(body.name);
        const email = str(body.email).toLowerCase();
        const password = typeof body.password === 'string' ? body.password : '';
        const role = isRole(body.role) ? body.role : 'Responsável Técnico';

        if (!name) return json({ error: 'O nome é obrigatório.' }, 400);
        if (!email.includes('@')) return json({ error: 'E-mail inválido.' }, 400);
        if (password.length < MIN_PASSWORD_LENGTH) {
          return json({ error: `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.` }, 400);
        }

        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: { role },
          user_metadata: {
            name,
            initials: initialsFrom(name),
            avatar_bg: str(body.avatar_bg) || 'bg-[#004328]',
            document_registration: str(body.document_registration) || null,
            phone: str(body.phone) || null,
          },
        });
        if (error || !data.user) {
          const msg = error?.message?.toLowerCase().includes('already')
            ? 'Este e-mail já está cadastrado.'
            : error?.message || 'Erro ao criar usuário.';
          return json({ error: msg }, 400);
        }

        // O Auth grava app_metadata após o INSERT, então o trigger pode não receber
        // o papel: garante explicitamente o papel e os dados no perfil.
        const { data: profile, error: profileError } = await admin
          .from('profiles')
          .update({
            role,
            name,
            initials: initialsFrom(name),
            document_registration: str(body.document_registration) || null,
            phone: str(body.phone) || null,
          })
          .eq('id', data.user.id)
          .select('*')
          .single();
        if (profileError) return json({ error: profileError.message }, 400);
        return json({ profile });
      }

      // ---------------------------------------------------------------
      case 'update': {
        const userId = str(body.user_id);
        if (!userId) return json({ error: 'Usuário não informado.' }, 400);

        const { data: current } = await admin.from('profiles').select('*').eq('id', userId).single();
        if (!current) return json({ error: 'Usuário não encontrado.' }, 404);

        const patch: Record<string, unknown> = {};
        if (typeof body.name === 'string' && str(body.name)) {
          patch.name = str(body.name);
          patch.initials = initialsFrom(str(body.name));
        }
        if (typeof body.document_registration === 'string') patch.document_registration = str(body.document_registration) || null;
        if (typeof body.phone === 'string') patch.phone = str(body.phone) || null;

        if (body.role !== undefined) {
          if (!isRole(body.role)) return json({ error: 'Perfil de acesso inválido.' }, 400);
          const losingAdmin = ADMIN_ROLES.includes(current.role) && !ADMIN_ROLES.includes(body.role);
          if (losingAdmin && (await countOtherAdmins(userId)) === 0) {
            return json({ error: 'O sistema precisa de pelo menos um administrador.' }, 400);
          }
          patch.role = body.role;
        }

        const authPatch: { email?: string; email_confirm?: boolean; app_metadata?: Record<string, unknown> } = {};
        if (typeof body.email === 'string') {
          const email = str(body.email).toLowerCase();
          if (!email.includes('@')) return json({ error: 'E-mail inválido.' }, 400);
          if (email !== current.email) {
            authPatch.email = email;
            authPatch.email_confirm = true;
            patch.email = email;
          }
        }
        if (patch.role) authPatch.app_metadata = { role: patch.role };

        if (Object.keys(authPatch).length > 0) {
          const { error } = await admin.auth.admin.updateUserById(userId, authPatch);
          if (error) {
            const msg = error.message?.toLowerCase().includes('already')
              ? 'Este e-mail já está cadastrado para outro usuário.'
              : error.message;
            return json({ error: msg }, 400);
          }
        }

        if (Object.keys(patch).length > 0) {
          const { error } = await admin.from('profiles').update(patch).eq('id', userId);
          if (error) return json({ error: error.message }, 400);
        }

        const { data: profile } = await admin.from('profiles').select('*').eq('id', userId).single();
        return json({ profile });
      }

      // ---------------------------------------------------------------
      case 'reset_password': {
        const userId = str(body.user_id);
        const password = typeof body.password === 'string' ? body.password : '';
        if (!userId) return json({ error: 'Usuário não informado.' }, 400);
        if (password.length < MIN_PASSWORD_LENGTH) {
          return json({ error: `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.` }, 400);
        }
        const { error } = await admin.auth.admin.updateUserById(userId, { password });
        if (error) return json({ error: error.message }, 400);
        return json({ success: true });
      }

      // ---------------------------------------------------------------
      case 'delete': {
        const userId = str(body.user_id);
        if (!userId) return json({ error: 'Usuário não informado.' }, 400);
        if (userId === caller.id) return json({ error: 'Você não pode excluir sua própria conta.' }, 400);

        const { data: target } = await admin.from('profiles').select('role').eq('id', userId).single();
        if (target && ADMIN_ROLES.includes(target.role) && (await countOtherAdmins(userId)) === 0) {
          return json({ error: 'O sistema precisa de pelo menos um administrador.' }, 400);
        }

        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) return json({ error: error.message }, 400);
        return json({ success: true });
      }

      default:
        return json({ error: 'Ação desconhecida.' }, 400);
    }
  } catch (err) {
    console.error('admin-users error:', err);
    return json({ error: 'Erro interno ao processar a solicitação.' }, 500);
  }
});
