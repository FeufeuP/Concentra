import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

/** PostgreSQL real (WASM), com Auth/HTTP simulados. Nunca acessa produção. */
export async function isolatedSupabase() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}', raw_app_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
  `);
  await db.exec(readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8')
    .replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;', ''));
  const users = { admin: randomUUID(), writer: randomUUID(), auditor: randomUUID() };
  for (const [kind, id] of Object.entries(users)) {
    await db.query('INSERT INTO auth.users(id,email,raw_user_meta_data,raw_app_meta_data) VALUES ($1,$2,$3::jsonb,$4::jsonb)',
      [id, `${id}@test.invalid`, JSON.stringify({ name: `Synthetic ${kind}` }), JSON.stringify({ role: kind === 'admin' ? 'Administrador' : kind === 'writer' ? 'Comercial' : 'Auditor SST' })]);
  }
  const asUser = async (kind: keyof typeof users | 'anon') => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [kind === 'anon' ? '' : users[kind]]);
    await db.exec(`SET ROLE ${kind === 'anon' ? 'anon' : 'authenticated'}`);
  };
  const requests: { path: string; method: string; offset: number }[] = [];
  const state = { cap: 2, loseImportResponse: false, failTable: '' };
  const tables = new Set(['quotes', 'quote_items', 'clients', 'catalog_services', 'app_settings', 'quote_events', 'quote_import_receipts']);
  const fetch: typeof globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (!url.hostname.endsWith('.test.invalid')) throw new Error('Network forbidden in isolated tests');
    const table = url.pathname.replace('/rest/v1/', '');
    const method = (init.method || 'GET').toUpperCase();
    const offset = Number(url.searchParams.get('offset') || 0);
    requests.push({ path: table, method, offset });
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      if (state.failTable === table) throw Object.assign(new Error('Synthetic write failure'), { code: '42501' });
      let data: unknown;
      if (table === 'rpc/next_quote_number') {
        data = (await db.query<{ n: number }>('SELECT public.next_quote_number() AS n')).rows[0].n;
      } else if (table === 'rpc/save_quote' || table === 'rpc/import_quote') {
        const body = JSON.parse(init.body as string);
        const fn = table === 'rpc/save_quote' ? 'save_quote' : 'import_quote';
        data = (await db.query<{ result: unknown }>(`SELECT public.${fn}($1::jsonb,$2::jsonb) AS result`, [JSON.stringify(body.p_quote), JSON.stringify(body.p_items)])).rows[0].result;
        if (fn === 'import_quote' && state.loseImportResponse) {
          state.loseImportResponse = false;
          return new Response('connection lost after commit', { status: 502 });
        }
      } else {
        if (!tables.has(table)) throw new Error(`Unexpected route ${table}`);
        const filter = url.searchParams.get('id') || url.searchParams.get('quote_id') || url.searchParams.get('key');
        const filterCol = url.searchParams.has('id') ? 'id' : url.searchParams.has('quote_id') ? 'quote_id' : 'key';
        const filterValue = filter?.replace(/^eq\./, '');
        if (method === 'GET' || method === 'HEAD') {
          const args = filter ? [filterValue] : [];
          const where = filter ? ` WHERE "${filterCol}" = $1` : '';
          const count = (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.${table}${where}`, args)).rows[0].n;
          let sql = `SELECT * FROM public.${table}${where}`;
          const order = url.searchParams.get('order');
          if (order) sql += ' ORDER BY ' + order.split(',').map(part => {
            const match = /^([a-z_]+)\.(asc|desc)(?:\.(nullsfirst|nullslast))?$/.exec(part);
            if (!match) throw new Error(`Unexpected ordering ${part}`);
            return `"${match[1]}" ${match[2]}${match[3] ? ` NULLS ${match[3] === 'nullsfirst' ? 'FIRST' : 'LAST'}` : ''}`;
          }).join(',');
          const limit = Math.min(state.cap, Number(url.searchParams.get('limit') || state.cap));
          data = (await db.query(`${sql} LIMIT ${limit} OFFSET ${offset}`, args)).rows;
          const length = (data as unknown[]).length;
          headers['Content-Range'] = length ? `${offset}-${offset + length - 1}/${count}` : `*/${count}`;
        } else if (method === 'POST') {
          const parsed = JSON.parse(init.body as string);
          const rows = Array.isArray(parsed) ? parsed : [parsed];
          const prefer = new Headers(init.headers).get('Prefer') || '';
          const pk = table === 'app_settings' ? 'key' : 'id';
          const saved: unknown[] = [];
          for (const body of rows) {
            const keys = Object.keys(body);
            if (!keys.every(key => /^[a-z_]+$/.test(key))) throw new Error('Invalid payload');
            const cols = keys.map(key => `"${key}"`).join(',');
            let conflict = '';
            if (prefer.includes('resolution=ignore-duplicates')) conflict = ` ON CONFLICT (${pk}) DO NOTHING`;
            else if (prefer.includes('resolution=merge-duplicates')) conflict = ` ON CONFLICT (${pk}) DO UPDATE SET ` + keys.filter(key => key !== pk).map(key => `"${key}" = EXCLUDED."${key}"`).join(',');
            saved.push(...(await db.query(`WITH src AS (SELECT * FROM jsonb_populate_record(NULL::public.${table},$1::jsonb)) INSERT INTO public.${table}(${cols}) SELECT ${cols} FROM src${conflict} RETURNING *`, [JSON.stringify(body)])).rows);
          }
          data = saved;
        } else if (method === 'PATCH') {
          if (!filter) throw new Error('Unscoped update forbidden');
          const body = JSON.parse(init.body as string);
          const keys = Object.keys(body);
          if (!keys.every(key => /^[a-z_]+$/.test(key))) throw new Error('Invalid payload');
          const setters = keys.map(key => `"${key}" = src."${key}"`).join(',');
          data = (await db.query(`WITH src AS (SELECT * FROM jsonb_populate_record(NULL::public.${table},$1::jsonb)) UPDATE public.${table} t SET ${setters} FROM src WHERE t."${filterCol}" = $2 RETURNING t.*`, [JSON.stringify(body), filterValue])).rows;
        } else if (method === 'DELETE') {
          if (!filter) throw new Error('Unscoped delete forbidden');
          data = (await db.query(`DELETE FROM public.${table} WHERE "${filterCol}" = $1 RETURNING *`, [filterValue])).rows;
        } else throw new Error(`Unexpected method ${method}`);
      }
      return new Response(method === 'HEAD' ? null : JSON.stringify(data), { status: 200, headers });
    } catch (err) {
      const error = err as { code?: string; message: string };
      return new Response(JSON.stringify({ code: error.code || 'TEST_ERROR', message: error.message }), { status: 400, headers });
    }
  };
  const reset = async () => {
    await db.exec('RESET ROLE; TRUNCATE public.quotes, public.clients, public.quote_events CASCADE; ALTER SEQUENCE public.quote_number_seq RESTART WITH 319;');
    await asUser('admin');
    state.cap = 2; state.loseImportResponse = false; state.failTable = ''; requests.length = 0;
  };
  return { db, users, asUser, reset, state, requests, fetch, url: `https://${randomUUID()}.test.invalid` };
}
