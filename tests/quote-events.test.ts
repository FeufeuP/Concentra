import { describe, it, expect } from 'vitest';
import { appendEvents, describeQuoteEvent, eventForDelete, eventsForSave, eventsOfQuote, formatEventDate, QuoteEvent } from '@/lib/quote-events';
import { rowToQuoteEvent } from '@/lib/supabase';
import { classifyPing } from '@/lib/connection-status';
import { createLocalRepository } from '@/lib/repository';
import { MemoryStorage, makeQuote } from './helpers';

const actor = { id: 'u1', name: 'Amanda Silveira' };

describe('regras de eventos (iguais ao trigger do banco)', () => {
  it('criação, mudança de status e edição sem mudança', () => {
    const q = makeQuote({ id: '#320', status: 'Rascunho' });
    expect(eventsForSave(undefined, q, actor)[0]).toMatchObject({ type: 'created', toStatus: 'Rascunho', quoteId: '320', actorName: 'Amanda Silveira' });
    expect(eventsForSave(q, { ...q, status: 'Enviado' }, actor)[0]).toMatchObject({ type: 'status_changed', fromStatus: 'Rascunho', toStatus: 'Enviado' });
    expect(eventsForSave(q, { ...q, total: 999 }, actor)).toEqual([]);
    expect(eventForDelete(q, null)).toMatchObject({ type: 'deleted', fromStatus: 'Rascunho', actorName: undefined });
  });

  it('limite de eventos e ordenação por data', () => {
    const mk = (i: number, quoteId = '1'): QuoteEvent => ({
      id: String(i), quoteId, type: 'created', details: {}, createdAt: new Date(2026, 0, i).toISOString(),
    });
    expect(appendEvents([mk(1), mk(2)], [mk(3)], 2).map((e) => e.id)).toEqual(['2', '3']);
    expect(eventsOfQuote([mk(1), mk(3), mk(2, '2'), mk(2)], '#1').map((e) => e.id)).toEqual(['3', '2', '1']);
  });

  it('textos da linha do tempo', () => {
    const base = { id: '1', quoteId: '1', details: {}, createdAt: '2026-10-23T13:05:00.000Z' };
    expect(describeQuoteEvent({ ...base, type: 'status_changed', fromStatus: 'Enviado', toStatus: 'Aprovado' })).toMatchObject({
      title: 'Status alterado para "Aprovado"', description: 'Antes: Enviado', tone: 'green',
    });
    expect(describeQuoteEvent({ ...base, type: 'email_sent', details: { to: ['a@x.com'], cc: ['b@y.com'] } }).description).toBe('Para: a@x.com • CC: b@y.com');
    expect(formatEventDate('xx')).toBe('xx');
    expect(formatEventDate(base.createdAt)).toMatch(/^\d{2}\/10\/2026 \d{2}:\d{2}$/);
  });
});

describe('histórico no repositório local', () => {
  it('registra criação, status e exclusão com o usuário', async () => {
    const storage = new MemoryStorage();
    storage.setItem('consentra_quotes_data', '[]');
    const repo = createLocalRepository(storage, () => actor);
    const q = makeQuote({ id: '400', numberOnly: 400, status: 'Rascunho' });
    await repo.saveQuote(q);
    await repo.saveQuote({ ...q, total: 10 });
    await repo.saveQuote({ ...q, status: 'Enviado' });
    await repo.deleteQuote('400');
    const res = await repo.fetchQuoteEvents('400');
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.map((e) => e.type).sort()).toEqual(['created', 'deleted', 'status_changed']);
    expect(res.data.every((e) => e.actorName === 'Amanda Silveira')).toBe(true);
  });

  it('zerar registra exclusão de cada orçamento', async () => {
    const storage = new MemoryStorage();
    storage.setItem('consentra_quotes_data', JSON.stringify([makeQuote({ id: '1' }), makeQuote({ id: '2' })]));
    const repo = createLocalRepository(storage);
    await repo.clearAllQuotes('ZERAR');
    const res = await repo.fetchQuoteEvents('2');
    expect(res.success && res.data[0].type).toBe('deleted');
  });
});

describe('mapeamento quote_events (Supabase)', () => {
  it('converte a linha do banco', () => {
    expect(
      rowToQuoteEvent({
        id: 7, quote_id: '#320', quote_number: 320, event_type: 'email_sent', from_status: null, to_status: 'Enviado',
        details: { to: ['a@x.com'] }, actor_name: 'Amanda', created_at: '2026-10-23T10:00:00Z',
      })
    ).toEqual({
      id: '7', quoteId: '320', quoteNumber: 320, type: 'email_sent', fromStatus: undefined, toStatus: 'Enviado',
      details: { to: ['a@x.com'] }, actorName: 'Amanda', createdAt: '2026-10-23T10:00:00Z',
    });
  });
});

describe('status da conexão', () => {
  it('classifica a verificação', () => {
    expect(classifyPing({ configured: false, browserOnline: true }).state).toBe('local');
    expect(classifyPing({ configured: true, browserOnline: false }).state).toBe('offline');
    expect(classifyPing({ configured: true, browserOnline: true, error: null }).state).toBe('online');
    expect(classifyPing({ configured: true, browserOnline: true, error: { status: 401, message: 'JWT expired' } }).state).toBe('session');
    expect(classifyPing({ configured: true, browserOnline: true, error: { message: 'timeout' } }).detail).toMatch(/demorou/);
    expect(classifyPing({ configured: true, browserOnline: true, error: { message: 'Failed to fetch' } }).state).toBe('offline');
  });
});
