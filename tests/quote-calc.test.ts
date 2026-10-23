import { describe, it, expect } from 'vitest';
import { calculateQuoteTotals, itemTotal, updateItem, renumberItems, withTotals, appendItem } from '@/lib/quote-calc';
import { makeItem, makeQuote } from './helpers';

describe('calculateQuoteTotals', () => {
  it('soma quantidade × preço de cada item', () => {
    const items = [makeItem({ quantity: 2, unitPrice: 1500 }), makeItem({ id: 'b', quantity: 3, unitPrice: 200 })];
    expect(calculateQuoteTotals(items, 0, 1)).toEqual({ subtotal: 3600, total: 3600, installmentValue: 3600 });
  });

  it('aplica desconto sem deixar o total negativo', () => {
    const items = [makeItem({ quantity: 1, unitPrice: 1000 })];
    expect(calculateQuoteTotals(items, 250, 1).total).toBe(750);
    expect(calculateQuoteTotals(items, 5000, 1).total).toBe(0);
    expect(calculateQuoteTotals(items, -100, 1).total).toBe(1000); // desconto negativo é ignorado
  });

  it('divide o total pelas parcelas', () => {
    const items = [makeItem({ quantity: 1, unitPrice: 1000 })];
    expect(calculateQuoteTotals(items, 100, 3).installmentValue).toBeCloseTo(300);
    expect(calculateQuoteTotals(items, 0, 4).installmentValue).toBe(250);
  });

  it('trata parcelas inválidas como pagamento único', () => {
    const items = [makeItem({ quantity: 1, unitPrice: 900 })];
    expect(calculateQuoteTotals(items, 0, 0).installmentValue).toBe(900);
    expect(calculateQuoteTotals(items, 0, Number.NaN).installmentValue).toBe(900);
  });

  it('orçamento sem itens tem tudo zerado', () => {
    expect(calculateQuoteTotals([], 0, 2)).toEqual({ subtotal: 0, total: 0, installmentValue: 0 });
  });
});

describe('itens', () => {
  it('itemTotal tolera valores não numéricos', () => {
    expect(itemTotal(2, 10)).toBe(20);
    expect(itemTotal(Number.NaN, 10)).toBe(0);
  });

  it('updateItem recalcula o total e respeita os limites', () => {
    const item = makeItem({ quantity: 2, unitPrice: 100, totalPrice: 200 });
    expect(updateItem(item, { quantity: 5 })).toMatchObject({ quantity: 5, totalPrice: 500 });
    expect(updateItem(item, { quantity: 0 })).toMatchObject({ quantity: 1, totalPrice: 100 });
    expect(updateItem(item, { unitPrice: -50 })).toMatchObject({ unitPrice: 0, totalPrice: 0 });
    expect(updateItem(item, { unitPrice: 75.5 })).toMatchObject({ totalPrice: 151 });
  });

  it('renumberItems reordena 1..n', () => {
    const items = [makeItem({ id: 'a', itemNumber: 3 }), makeItem({ id: 'b', itemNumber: 7 })];
    expect(renumberItems(items).map((i) => i.itemNumber)).toEqual([1, 2]);
  });
});

describe('withTotals / appendItem', () => {
  it('withTotals aplica itens, desconto e parcelas ao orçamento', () => {
    const quote = makeQuote({ items: [], discount: 0, installments: 1 });
    const updated = withTotals(quote, { items: [makeItem({ quantity: 2, unitPrice: 600 })], discount: 200, installments: 2 });
    expect(updated).toMatchObject({ subtotal: 1200, discount: 200, total: 1000, installments: 2, installmentValue: 500 });
  });

  it('appendItem inclui o serviço com quantidade 1, numeração e escopo NR sem duplicar', () => {
    const quote = makeQuote({ items: [makeItem()], regulatoryScope: ['NR-01'], discount: 0, installments: 1 });
    const updated = appendItem(quote, { title: 'PCMSO', description: 'Programa médico', unit: 'Unidade', unitPrice: 800, nrCategory: 'NR-07' }, 'item-2');
    expect(updated.items).toHaveLength(2);
    expect(updated.items[1]).toMatchObject({ id: 'item-2', itemNumber: 2, quantity: 1, totalPrice: 800 });
    expect(updated.regulatoryScope).toEqual(['NR-01', 'NR-07']);
    expect(updated.total).toBe(1800);

    const again = appendItem(updated, { title: 'PGR 2', description: '', unit: 'Unidade', unitPrice: 0, nrCategory: 'NR-01' }, 'item-3');
    expect(again.regulatoryScope).toEqual(['NR-01', 'NR-07']);
  });
});
