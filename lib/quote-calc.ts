import type { Quote, QuoteItem } from './types';

/**
 * Regras de cálculo do orçamento (funções puras, cobertas por testes).
 *
 * - total do item = quantidade × preço unitário
 * - subtotal = soma dos itens
 * - total = subtotal − desconto (nunca negativo)
 * - parcela = total ÷ nº de parcelas (1x quando o número for inválido)
 */
export interface QuoteTotals {
  subtotal: number;
  total: number;
  installmentValue: number;
}

const safeNumber = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

export function itemTotal(quantity: number, unitPrice: number): number {
  return safeNumber(quantity) * safeNumber(unitPrice);
}

export function calculateQuoteTotals(
  items: Pick<QuoteItem, 'quantity' | 'unitPrice'>[],
  discount: number,
  installments: number
): QuoteTotals {
  const subtotal = items.reduce((acc, it) => acc + itemTotal(it.quantity, it.unitPrice), 0);
  const total = Math.max(subtotal - Math.max(safeNumber(discount), 0), 0);
  const n = Math.floor(safeNumber(installments));
  const installmentValue = n > 0 ? total / n : total;
  return { subtotal, total, installmentValue };
}

/** Atualiza quantidade e/ou preço de um item, recalculando o total do item. */
export function updateItem(item: QuoteItem, changes: { quantity?: number; unitPrice?: number }): QuoteItem {
  const quantity = changes.quantity !== undefined ? Math.max(Math.floor(safeNumber(changes.quantity)), 1) : item.quantity;
  const unitPrice = changes.unitPrice !== undefined ? Math.max(safeNumber(changes.unitPrice), 0) : item.unitPrice;
  return { ...item, quantity, unitPrice, totalPrice: itemTotal(quantity, unitPrice) };
}

/** Renumera os itens em sequência (1, 2, 3...). */
export function renumberItems(items: QuoteItem[]): QuoteItem[] {
  return items.map((it, idx) => ({ ...it, itemNumber: idx + 1 }));
}

/** Aplica itens/desconto/parcelas ao orçamento e recalcula subtotal, total e parcela. */
export function withTotals(
  quote: Quote,
  changes: { items?: QuoteItem[]; discount?: number; installments?: number } = {}
): Quote {
  const items = changes.items ?? quote.items ?? [];
  const discount = changes.discount ?? quote.discount ?? 0;
  const installments = changes.installments ?? quote.installments ?? 1;
  return { ...quote, items, discount, installments, ...calculateQuoteTotals(items, discount, installments) };
}

export interface NewItemInput {
  title: string;
  description: string;
  unit: string;
  unitPrice: number;
  /** Norma (NR) incluída no escopo regulatório do orçamento. */
  nrCategory?: string;
}

/** Inclui um serviço como novo item (quantidade 1) e atualiza escopo regulatório e totais. */
export function appendItem(quote: Quote, input: NewItemInput, id: string): Quote {
  const current = quote.items || [];
  const item: QuoteItem = {
    id,
    itemNumber: current.length + 1,
    title: input.title,
    description: input.description,
    unit: input.unit,
    quantity: 1,
    unitPrice: input.unitPrice,
    totalPrice: itemTotal(1, input.unitPrice),
  };
  const regulatoryScope = input.nrCategory
    ? Array.from(new Set([...(quote.regulatoryScope || []), input.nrCategory]))
    : quote.regulatoryScope || [];
  return withTotals({ ...quote, regulatoryScope }, { items: [...current, item] });
}
