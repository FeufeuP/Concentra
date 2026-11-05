import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { isolatedSupabase } from './support/isolated-supabase';
import { makeQuote, makeItem } from './helpers';
import * as api from '@/lib/supabase';

let fixture: Awaited<ReturnType<typeof isolatedSupabase>>;
const client = { id: 'CL-test', name: 'Synthetic A', cnpj: '00.000.000/0000-00', riskGrade: 'Grau de Risco 1', contactName: '', email: '', phone: '', address: '' };
const quote = () => makeQuote({ items: [makeItem({ title: 'Synthetic item' })], total: 1000, subtotal: 1000 });

beforeAll(async () => {
  fixture = await isolatedSupabase();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', fixture.url);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_isolated_test');
  vi.stubGlobal('fetch', fixture.fetch);
}, 30000);
beforeEach(async () => { await fixture.reset(); });
afterAll(async () => { await fixture?.db.close(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('SDK real + PostgreSQL isolado (Auth/HTTP simulados)', () => {
  it('salva, relê, edita status e relê em outro cliente; exclui com histórico e cascata', async () => {
    const n = await api.fetchNextQuoteNumber();
    expect(n).toEqual({ success: true, data: 319 });
    expect((await api.saveQuoteToSupabase(quote())).success).toBe(true);
    let loaded = await api.fetchQuotes();
    expect(loaded.success && loaded.data[0]).toMatchObject({ id: '319', total: 1000, items: [{ quantity: 1, title: 'Synthetic item' }] });
    expect((await api.saveQuoteToSupabase({ ...quote(), status: 'Enviado' })).success).toBe(true);
    // Cliente sem o cache do anterior, mas consultando o mesmo banco persistido.
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_another_isolated_client');
    loaded = await api.fetchQuotes();
    expect(loaded.success && loaded.data[0].status).toBe('Enviado');
    const events = await api.fetchQuoteEventsFromSupabase('319');
    expect(events.success && events.data.map(e => e.type)).toEqual(['status_changed', 'created']);
    expect((await api.deleteQuoteFromSupabase('319')).success).toBe(true);
    expect(await api.fetchQuotes()).toEqual({ success: true, data: [] });
    expect((await fixture.db.query('SELECT * FROM public.quote_items')).rows).toHaveLength(0);
    expect((await fixture.db.query('SELECT * FROM public.quote_events')).rows).toHaveLength(3);
  });

  it('falha em item reverte cabeçalho, itens e histórico na mesma transação', async () => {
    await api.saveQuoteToSupabase(quote());
    const res = await api.saveQuoteToSupabase({ ...quote(), total: 99, status: 'Aprovado', items: [makeItem({ quantity: 1e99 })] });
    expect(res.success).toBe(false);
    const loaded = await api.fetchQuotes();
    expect(loaded.success && loaded.data[0]).toMatchObject({ total: 1000, status: 'Rascunho', items: [{ quantity: 1 }] });
    expect((await fixture.db.query('SELECT * FROM public.quote_events')).rows).toHaveLength(1);
  });

  it('cadastro novo com ID repetido falha sem sobrescrever; edição não recria cliente removido', async () => {
    expect((await api.saveClientToSupabase(client, true)).success).toBe(true);
    expect((await api.saveClientToSupabase({ ...client, name: 'Synthetic B' }, true)).success).toBe(false);
    expect((await api.fetchClients())).toMatchObject({ success: true, data: [{ name: 'Synthetic A' }] });
    expect((await api.saveClientToSupabase({ ...client, name: 'Updated A' }, false)).success).toBe(true);
    expect((await api.fetchClients())).toMatchObject({ success: true, data: [{ name: 'Updated A' }] });
    expect((await api.deleteClientFromSupabase(client.id)).success).toBe(true);
    expect((await api.saveClientToSupabase(client, false)).success).toBe(false);
    expect(await api.fetchClients()).toEqual({ success: true, data: [] });
  });

  it('carrega todas as páginas de orçamentos, itens, clientes, catálogo e configurações, com empates', async () => {
    for (let i = 0; i < 5; i++) {
      const items = Array.from({ length: 3 }, (_, j) => makeItem({ itemNumber: j + 1 }));
      await api.saveQuoteToSupabase(makeQuote({ id: String(400 + i), numberOnly: 400 + i, items }));
      await api.saveClientToSupabase({ ...client, id: `page-${i}`, name: 'Same name' }, true);
    }
    const quotes = await api.fetchQuotes();
    expect(quotes.success && quotes.data).toHaveLength(5);
    if (quotes.success) expect(quotes.data.every(q => q.items.length === 3)).toBe(true);
    const clients = await api.fetchClients();
    expect(clients.success && clients.data).toHaveLength(5);
    const catalog = await api.fetchCatalog();
    expect(catalog.success && catalog.data).toHaveLength(12);
    for (let i = 0; i < 4; i++) await api.saveAppSetting(`isolated-${i}`, { index: i });
    const settings = await api.fetchAppSettings();
    expect(settings.success && Object.keys(settings.data)).toHaveLength(5);
    expect(fixture.requests.some(r => r.path === 'quote_items' && r.offset === 14)).toBe(true);
    expect(fixture.requests.some(r => r.path === 'clients' && r.offset === 4)).toBe(true);
  });

  it('importação repetida, inclusive após perder a resposta, não duplica nem sobrescreve o orçamento', async () => {
    await api.saveQuoteToSupabase(quote()); // Colisão de número com outro documento.
    const imported = { ...quote(), observations: 'A different source document' };
    fixture.state.loseImportResponse = true;
    expect((await api.importQuoteToSupabase(imported)).success).toBe(false); // commit ocorreu, ACK perdido
    const retry = await api.importQuoteToSupabase(imported);
    expect(retry).toMatchObject({ success: true, data: { id: '320', numberOnly: 320, skipped: true } });
    const loaded = await api.fetchQuotes();
    expect(loaded.success && loaded.data).toHaveLength(2);
    expect((await fixture.db.query('SELECT * FROM public.quote_import_receipts')).rows).toHaveLength(1);
    // Edição posterior da equipe não pode ser desfeita ao repetir a importação.
    await api.saveQuoteToSupabase({ ...imported, id: '320', numberOnly: 320, observations: 'Edited remotely' });
    await api.importQuoteToSupabase(imported);
    const after = await api.fetchQuotes();
    expect(after.success && after.data.find(q => q.id === '320')?.observations).toBe('Edited remotely');
  });

  it('importação legada integralmente idêntica ganha recibo sem criar outra cópia', async () => {
    await api.saveQuoteToSupabase(quote());
    expect(await api.importQuoteToSupabase(quote())).toMatchObject({ success: true, data: { id: '319', skipped: true } });
    expect((await fixture.db.query('SELECT * FROM public.quotes')).rows).toHaveLength(1);
  });

  it('compara conteúdo completo: mesmo cliente, total e data, mas itens diferentes não são ignorados', async () => {
    await api.saveQuoteToSupabase(quote());
    const imported = await api.importQuoteToSupabase({ ...quote(), items: [makeItem({ title: 'A different item' })] });
    expect(imported).toMatchObject({ success: true, data: { skipped: false, id: '320' } });
  });

  it('duas solicitações da mesma importação usam um único recibo e um único orçamento', async () => {
    const results = await Promise.all([api.importQuoteToSupabase(quote()), api.importQuoteToSupabase(quote())]);
    expect(results.every(r => r.success)).toBe(true);
    expect(results.filter(r => r.success && !r.data.skipped)).toHaveLength(1);
    const loaded = await api.fetchQuotes();
    expect(loaded.success && loaded.data).toHaveLength(1);
  });

  it('importação inválida não deixa orçamento, itens, recibo ou histórico parcial', async () => {
    expect((await api.importQuoteToSupabase({ ...quote(), items: [makeItem({ quantity: 1e99 })] })).success).toBe(false);
    for (const table of ['quotes', 'quote_items', 'quote_import_receipts', 'quote_events']) {
      expect((await fixture.db.query(`SELECT * FROM public.${table}`)).rows).toHaveLength(0);
    }
  });

  it('Auditor lê, mas não grava; Comercial não altera configurações; visitante não lê nem importa', async () => {
    await api.saveQuoteToSupabase(quote());
    await fixture.asUser('auditor');
    expect((await api.fetchQuotes()).success).toBe(true);
    expect((await api.saveQuoteToSupabase(quote())).success).toBe(false);
    expect((await api.importQuoteToSupabase(quote())).success).toBe(false);
    expect((await api.saveClientToSupabase(client, true)).success).toBe(false);
    await fixture.asUser('admin');
    await api.saveAppSetting('isolated-protected', true);
    await fixture.asUser('writer');
    expect((await api.saveAppSetting('isolated-forbidden', 'no')).success).toBe(false);
    expect((await api.saveAppSetting('isolated-protected', null)).success).toBe(false);
    await fixture.asUser('anon');
    expect((await api.fetchQuotes()).success).toBe(false);
    expect((await api.importQuoteToSupabase(quote())).success).toBe(false);
  });
});
