// TEMPORÁRIO: provisiona SOMENTE fixtures da homologação solicitada.
// Exige OIDC do GitHub assinado, repositório/branch/workflow exatos e prazo curto.
// Remover a função publicada ao concluir; não é uma API do aplicativo.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@6.1.0';

const deadline = Date.parse('2026-11-04T03:00:00Z');
const ref = 'refs/heads/arena/86d03fa8-concentra';
const workflow = `FeufeuP/Concentra/.github/workflows/persistence-e2e.yml@${ref}`;
const jwks = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
const check = (error: unknown) => { if (error) throw new Error('Fixture operation failed'); };

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response('POST only', { status: 405 });
  if (Date.now() > deadline) return new Response('Validation window closed', { status: 403 });
  let claims;
  try {
    const bearer = request.headers.get('Authorization') || '';
    if (!bearer.startsWith('Bearer ')) throw new Error('Missing OIDC');
    ({ payload: claims } = await jwtVerify(bearer.slice(7), jwks, {
      issuer: 'https://token.actions.githubusercontent.com', audience: 'consentra-persistence-validation', maxTokenAge: '10m',
    }));
    if (claims.repository_id !== '1430978965' || claims.repository_owner_id !== '323132493'
      || claims.ref !== ref || claims.workflow_ref !== workflow
      || !['push', 'workflow_dispatch'].includes(String(claims.event_name))
      || !/^\d+$/.test(String(claims.run_id)) || !/^\d+$/.test(String(claims.run_attempt))) throw new Error('Untrusted run');
  } catch {
    return new Response('Unauthorized workflow', { status: 403 });
  }
  try {
    const body = await request.json();
    const tag = `${claims.run_id}-${claims.run_attempt}`;
    const name = `E2E Persistência ${tag}`;
    const prefix = `e2e-${tag}-`;
    const emails = [`${prefix}admin@test.invalid`, `${prefix}auditor@test.invalid`];
    const cleanup = async () => {
      const profiles = await admin.from('profiles').select('id,email').in('email', emails);
      check(profiles.error);
      const ids: string[] = [];
      for (const profile of profiles.data || []) {
        const user = await admin.auth.admin.getUserById(profile.id);
        check(user.error);
        if (user.data.user?.app_metadata.persistence_e2e !== tag) throw new Error('Fixture ownership mismatch');
        ids.push(profile.id);
      }
      let quoteIds: string[] = [];
      if (ids.length) {
        const quotes = await admin.from('quotes').select('id').in('created_by', ids);
        check(quotes.error);
        quoteIds = (quotes.data || []).map(q => q.id);
        if (quoteIds.length) {
          check((await admin.from('quotes').delete().in('id', quoteIds)).error);
          check((await admin.from('quote_events').delete().in('quote_id', quoteIds)).error);
        }
      }
      // Nomes/chaves exclusivos deste run. Nunca limpa coleções inteiras.
      check((await admin.from('clients').delete().eq('name', name)).error);
      check((await admin.from('catalog_services').delete().eq('id', `${prefix}service`)).error);
      check((await admin.from('app_settings').delete().eq('key', `${prefix}setting`)).error);
      for (const id of ids) check((await admin.auth.admin.deleteUser(id)).error);
      return { usersRemoved: ids.length, quotesRemoved: quoteIds.length, tag };
    };
    if (body.operation === 'cleanup') return Response.json(await cleanup());
    if (body.operation !== 'provision' || typeof body.password !== 'string' || body.password.length < 32) {
      return new Response('Invalid fixture request', { status: 400 });
    }
    await cleanup();
    const users = [];
    for (let i = 0; i < emails.length; i++) {
      const result = await admin.auth.admin.createUser({
        email: emails[i], password: body.password, email_confirm: true,
        app_metadata: { role: i === 0 ? 'Administrador' : 'Auditor SST', persistence_e2e: tag },
        user_metadata: { name: `${name} ${i === 0 ? 'Admin' : 'Auditor'}`, initials: 'E2' },
      });
      check(result.error);
      users.push({ id: result.data.user!.id, email: emails[i] });
    }
    return Response.json({ url, anonKey: Deno.env.get('SUPABASE_ANON_KEY'), users, name, prefix });
  } catch {
    return Response.json({ error: 'Fixture operation failed; run cleanup before retrying.' }, { status: 500 });
  }
});
