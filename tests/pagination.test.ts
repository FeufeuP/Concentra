import { describe, it, expect, vi } from 'vitest';
import { fetchAllPages } from '@/lib/supabase';

describe('paginação sem sucesso parcial', () => {
  it('não para quando o servidor limita páginas abaixo do tamanho solicitado', async () => {
    const rows = Array.from({ length: 1203 }, (_, id) => ({ id }));
    const page = vi.fn(async (from: number) => ({ data: rows.slice(from, from + 137), count: rows.length, error: null }));
    expect(await fetchAllPages(page)).toEqual({ success: true, data: rows });
    expect(page.mock.calls.map(([from]) => from)).toEqual([0, 137, 274, 411, 548, 685, 822, 959, 1096]);
  });
  it('falha na segunda página não devolve os registros da primeira como carga completa', async () => {
    const res = await fetchAllPages(async (from) => from === 0
      ? { data: [{ id: 1 }], count: 2, error: null }
      : { data: null, count: null, error: { message: 'offline' } });
    expect(res).toEqual({ success: false, error: 'offline' });
  });
  it('contagem mudou durante a consulta: pede nova carga, em vez de misturar páginas', async () => {
    const res = await fetchAllPages(async (from) => ({ data: [{ id: from }], count: from === 0 ? 3 : 4, error: null }));
    expect(res.success).toBe(false);
  });
  it('página vazia antes da contagem esperada é erro, não sucesso parcial', async () => {
    const res = await fetchAllPages(async () => ({ data: [], count: 2, error: null }));
    expect(res.success).toBe(false);
  });
  it('sem Content-Range continua até uma página realmente vazia', async () => {
    const res = await fetchAllPages(async (from) => ({ data: from < 3 ? [from] : [], count: null, error: null }));
    expect(res).toEqual({ success: true, data: [0, 1, 2] });
  });
  it('zero registros é um resultado válido', async () => {
    expect(await fetchAllPages(async () => ({ data: [], count: 0, error: null }))).toEqual({ success: true, data: [] });
  });
});
