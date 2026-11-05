import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

type Fixture = { base: string; url: string; anonKey: string; password: string; name: string; prefix: string; users: { id: string; email: string }[] };
const fixture = JSON.parse(readFileSync('.e2e/fixture.json', 'utf8')) as Fixture;
const login = async (page: Page) => {
  await page.goto(fixture.base);
  await page.getByPlaceholder('Digite seu e-mail ou nome de usuário').fill(fixture.users[0].email);
  await page.getByPlaceholder('Digite sua senha de acesso').fill(fixture.password);
  await page.getByRole('button', { name: /Entrar no Sistema/ }).click();
  await expect(page.locator('aside nav').getByRole('button', { name: /Clientes/ })).toBeVisible({ timeout: 30000 });
};
const sdk = () => createClient(fixture.url, fixture.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

test('produção: cliente + orçamento + itens sobrevivem a logout e novo navegador; edições, histórico, importação e RLS', async ({ page, browser }) => {
  const admin = sdk();
  const signedIn = await admin.auth.signInWithPassword({ email: fixture.users[0].email, password: fixture.password });
  expect(signedIn.error).toBeNull();
  expect((await admin.rpc('is_admin')).data).toBe(true);
  await login(page);
  await page.locator('aside nav').getByRole('button', { name: /Clientes/ }).click();
  await page.getByRole('button', { name: /Cadastrar Novo Cliente/ }).click();
  await page.getByPlaceholder('Ex: Indústria Metalúrgica Delta S.A.').fill(fixture.name);
  await page.getByPlaceholder('00.000.000/0000-00', { exact: true }).fill('00.000.000/0000-00');
  await page.getByPlaceholder('Nome do responsável').fill('Contato sintético de homologação');
  const clientAck = page.waitForResponse(r => r.url().includes('/rest/v1/clients') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Salvar Cliente', exact: true }).click();
  expect((await clientAck).ok()).toBe(true);
  await expect(page.getByRole('heading', { name: 'Novo Cliente Corporativo', exact: true })).not.toBeVisible();
  const clients = await admin.from('clients').select('*').eq('name', fixture.name);
  expect(clients.error).toBeNull();
  expect(clients.data).toHaveLength(1);
  expect(clients.data![0].id).toMatch(/^CL-[0-9a-f-]{36}$/);
  await page.getByPlaceholder('Pesquisar por razão social, CNPJ ou gestor responsável...').fill(fixture.name);
  await page.getByRole('button', { name: /Gerar Orçamento SST/ }).click();
  await page.getByRole('button', { name: '+ PGR NR-01 (R$ 3.800)', exact: true }).click();
  await page.getByRole('button', { name: '+ ASO Clínico (R$ 165)', exact: true }).click();
  const note = `Condição sintética de homologação ${fixture.prefix}`;
  await page.getByPlaceholder(/50% de entrada/).fill(note);
  const quoteAck = page.waitForResponse(r => r.url().includes('/rpc/save_quote') && r.request().method() === 'POST');
  await page.getByRole('button', { name: /Salvar Rascunho/ }).click();
  expect((await quoteAck).ok()).toBe(true);
  const saved = await admin.from('quotes').select('*,quote_items(*)').eq('client_name', fixture.name).single();
  expect(saved.error).toBeNull();
  expect(saved.data.total).toBe(3965);
  expect(saved.data.payment_notes).toBe(note);
  expect(saved.data.quote_items).toHaveLength(2);
  expect(saved.data.created_by).toBe(fixture.users[0].id);
  const id: string = saved.data.id;

  await page.getByTitle('Sair do Sistema', { exact: true }).click();
  await expect(page.getByRole('button', { name: /Entrar no Sistema/ })).toBeVisible();
  // Sem localStorage/cookies herdados: dados têm de vir do servidor.
  const fresh = await browser.newContext();
  const again = await fresh.newPage();
  try {
    await login(again);
    await again.locator('aside nav').getByRole('button', { name: /Orçamentos/ }).click();
    const row = again.getByRole('row').filter({ hasText: fixture.name });
    await expect(row).toHaveCount(1);
    await row.getByTitle('Editar Orçamento', { exact: true }).click();
    await expect(again.getByPlaceholder(/50% de entrada/)).toHaveValue(note);
    await expect(again.locator('tbody tr')).toHaveCount(2);
    const price = again.locator('tbody').getByRole('spinbutton').first();
    await expect(price).toHaveValue('3800');
    await price.fill('42');
    const editAck = again.waitForResponse(r => r.url().includes('/rpc/save_quote') && r.request().method() === 'POST');
    await again.getByRole('button', { name: /Salvar Rascunho/ }).click();
    expect((await editAck).ok()).toBe(true);
    const edited = await admin.from('quotes').select('*,quote_items(*)').eq('id', id).single();
    expect(edited.error).toBeNull();
    expect(edited.data.total).toBe(207);
    expect(edited.data.quote_items).toHaveLength(2);
    expect(edited.data.quote_items.find((i: { item_number: number }) => i.item_number === 1).unit_price).toBe(42);

    const { quote_items: items, created_at: _created, updated_at: _updated, created_by: _by, updated_by: _updatedBy, ...header } = edited.data;
    void _created; void _updated; void _by; void _updatedBy;
    const itemPayload = items.map((i: Record<string, unknown>) => ({ item_number: i.item_number, title: i.title, description: i.description, unit: i.unit, quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price }));
    expect((await admin.rpc('save_quote', { p_quote: { ...header, status: 'Enviado' }, p_items: itemPayload })).error).toBeNull();
    const events = await admin.from('quote_events').select('event_type').eq('quote_id', id);
    expect(events.error).toBeNull();
    expect(events.data!.map(e => e.event_type).sort()).toEqual(['created', 'status_changed']);

    const source = { ...header, id: `${fixture.prefix}source`, number_only: -1, observations: 'Documento sintético de importação' };
    const imported = await Promise.all([admin.rpc('import_quote', { p_quote: source, p_items: itemPayload }), admin.rpc('import_quote', { p_quote: source, p_items: itemPayload })]);
    expect(imported.every(r => !r.error)).toBe(true);
    expect(imported[0].data.id).toBe(imported[1].data.id);
    expect(imported.filter(r => r.data.skipped === false)).toHaveLength(1);

    expect((await admin.from('catalog_services').insert({ id: `${fixture.prefix}service`, title: fixture.name, unit: 'Unidade', suggested_price: 123, nr_category: 'Homologação' })).error).toBeNull();
    expect((await admin.from('app_settings').insert({ key: `${fixture.prefix}setting`, value: { synthetic: true } })).error).toBeNull();
    const auditor = sdk();
    expect((await auditor.auth.signInWithPassword({ email: fixture.users[1].email, password: fixture.password })).error).toBeNull();
    expect((await auditor.rpc('can_write')).data).toBe(false);
    expect((await auditor.from('quotes').select('id').eq('created_by', fixture.users[0].id)).data).toHaveLength(2);
    expect((await auditor.rpc('save_quote', { p_quote: header, p_items: itemPayload })).error).not.toBeNull();
    expect((await auditor.rpc('import_quote', { p_quote: source, p_items: itemPayload })).error).not.toBeNull();
    expect((await auditor.from('app_settings').update({ value: 'forbidden' }).eq('key', `${fixture.prefix}setting`).select('key')).data).toHaveLength(0);
    await auditor.auth.signOut();
    await admin.auth.signOut();
    const reconnected = sdk();
    expect((await reconnected.auth.signInWithPassword({ email: fixture.users[0].email, password: fixture.password })).error).toBeNull();
    expect((await reconnected.from('catalog_services').select('suggested_price').eq('id', `${fixture.prefix}service`).single()).data?.suggested_price).toBe(123);
    expect((await reconnected.from('app_settings').select('value').eq('key', `${fixture.prefix}setting`).single()).data?.value).toEqual({ synthetic: true });
    expect((await reconnected.from('quotes').select('total,status').eq('id', id).single()).data).toEqual({ total: 207, status: 'Enviado' });
    await reconnected.auth.signOut();
    console.log('Validated production: UI save → logout → clean browser login → reload → edit; atomic import retry; history; catalog/settings persistence; Auditor RLS.');
  } finally {
    await fresh.close();
  }
});
