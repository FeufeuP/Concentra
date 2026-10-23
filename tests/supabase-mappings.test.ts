import { describe, it, expect } from 'vitest';
import { brDateToIso, isoDateToBr, normalizeQuoteId, quoteToPayload, itemsToPayload } from '@/lib/supabase';
import { makeItem, makeQuote } from './helpers';

describe('datas app ⇄ banco', () => {
  it('brDateToIso converte dd/mm/aaaa e completa zeros', () => {
    expect(brDateToIso('19/09/2026')).toBe('2026-09-19');
    expect(brDateToIso('1/2/2026')).toBe('2026-02-01');
    expect(brDateToIso(' 05/10/2026 ')).toBe('2026-10-05');
  });

  it('brDateToIso aceita ISO e rejeita datas inválidas', () => {
    expect(brDateToIso('2026-09-19')).toBe('2026-09-19');
    expect(brDateToIso('2026-09-19T10:00:00Z')).toBe('2026-09-19');
    expect(brDateToIso('31/02/2026')).toBeNull();
    expect(brDateToIso('qualquer')).toBeNull();
    expect(brDateToIso('')).toBeNull();
    expect(brDateToIso(null)).toBeNull();
  });

  it('isoDateToBr converte e preserva valores já no formato BR', () => {
    expect(isoDateToBr('2026-09-19')).toBe('19/09/2026');
    expect(isoDateToBr('19/09/2026')).toBe('19/09/2026');
    expect(isoDateToBr(null)).toBe('');
  });

  it('ida e volta mantém a data', () => {
    for (const d of ['01/01/2026', '29/02/2028', '31/12/2030']) {
      expect(isoDateToBr(brDateToIso(d))).toBe(d);
    }
  });
});

describe('normalizeQuoteId', () => {
  it('remove # e espaços', () => {
    expect(normalizeQuoteId('#319')).toBe('319');
    expect(normalizeQuoteId(' 320 ')).toBe('320');
    expect(normalizeQuoteId(321)).toBe('321');
    expect(normalizeQuoteId(null)).toBe('');
  });
});

describe('quoteToPayload', () => {
  it('mapeia campos para snake_case com datas ISO e id normalizado', () => {
    const payload = quoteToPayload(
      makeQuote({ id: '#330', numberOnly: 330, subtotal: 1000, discount: 100, total: 900, installments: 3, installmentValue: 300 })
    );
    expect(payload).toMatchObject({
      id: '330',
      number_only: 330,
      client_id: 'cli-1',
      client_name: 'Cliente Teste Ltda',
      issue_date: '2026-09-19',
      validity_date: '2026-10-04',
      subtotal: 1000,
      discount: 100,
      total: 900,
      installments: 3,
      installment_value: 300,
      status: 'Rascunho',
    });
  });

  it('usa null/padrões para campos opcionais vazios', () => {
    const payload = quoteToPayload(makeQuote({ ie: '', contactEmail: '', priority: undefined, customTexts: {}, headerConfig: undefined, regulatoryScope: undefined as unknown as string[] }));
    expect(payload.ie).toBeNull();
    expect(payload.contact_email).toBeNull();
    expect(payload.priority).toBe('Normal');
    expect(payload.custom_texts).toBeNull();
    expect(payload.header_config).toBeNull();
    expect(payload.regulatory_scope).toEqual([]);
  });

  it('itemsToPayload numera itens sem número e converte valores', () => {
    const rows = itemsToPayload([
      makeItem({ itemNumber: 1, quantity: 2, unitPrice: 50, totalPrice: 100 }),
      { ...makeItem({ id: 'b', title: '', unit: '' }), itemNumber: undefined as unknown as number },
    ]);
    expect(rows[0]).toMatchObject({ item_number: 1, quantity: 2, unit_price: 50, total_price: 100 });
    expect(rows[1]).toMatchObject({ item_number: 2, title: 'Item', unit: 'unidade' });
    expect(itemsToPayload(undefined)).toEqual([]);
  });
});
