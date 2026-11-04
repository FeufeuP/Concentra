// Runs in GitHub Actions, not in the app. No service-role or real-user passwords.
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = 'https://consentra-sst-psi.vercel.app';
const endpoint = 'https://bdpapewphroxsbrnqpst.supabase.co/functions/v1/persistence-test-fixture';
const op = process.argv[2];
if (op === 'wait') {
  const deadline = Date.now() + 8 * 60_000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/api/version`, { signal: AbortSignal.timeout(15000) });
      const version = await response.json();
      if (response.ok && version.commit === process.env.GITHUB_SHA) { ready = true; break; }
    } catch { /* deployment is not ready yet */ }
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  if (!ready) throw new Error('The expected production commit was not published in time.');
  console.log(`Production commit verified: ${process.env.GITHUB_SHA}`);
} else if (op === 'provision' || op === 'cleanup') {
  const tokenUrl = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
  tokenUrl.searchParams.set('audience', 'consentra-persistence-validation');
  const tokenResponse = await fetch(tokenUrl, { headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` } });
  if (!tokenResponse.ok) throw new Error('GitHub OIDC is not available.');
  const { value: oidc } = await tokenResponse.json();
  const password = randomBytes(32).toString('base64url');
  console.log(`::add-mask::${password}`);
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${oidc}` },
    body: JSON.stringify({ operation: op, ...(op === 'provision' ? { password } : {}) }), signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Fixture ${op} failed (${response.status}).`);
  const data = await response.json();
  if (op === 'provision') {
    mkdirSync('.e2e', { recursive: true });
    writeFileSync('.e2e/fixture.json', JSON.stringify({ ...data, password, base }), { mode: 0o600 });
    console.log('Two temporary test identities provisioned. No real-user credentials used.');
  } else console.log(`Fixture cleanup confirmed: ${JSON.stringify(data)}`);
} else throw new Error('Expected provision, wait or cleanup');
