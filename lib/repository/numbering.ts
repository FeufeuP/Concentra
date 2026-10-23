import type { Quote } from '../types';
import { DEFAULT_EMPTY_QUOTE } from '../mock-data';

/** Base da numeração: o primeiro orçamento recebe o número 319. */
export const QUOTE_NUMBER_BASE = 318;

/** Número provisório (rascunho ainda não salvo / modo local): maior número + 1. */
export function nextProvisionalNumber(list: Pick<Quote, 'numberOnly'>[]): number {
  return list.reduce((max, q) => (Number(q.numberOnly) > max ? Number(q.numberOnly) : max), QUOTE_NUMBER_BASE) + 1;
}

/** Numeração local: mantém o número do rascunho, salvo se for o placeholder ou já estiver em uso. */
export function resolveLocalQuoteNumber(draft: Pick<Quote, 'id' | 'numberOnly'>, existing: Pick<Quote, 'numberOnly'>[]): { id: string; numberOnly: number } {
  const conflict = draft.id === DEFAULT_EMPTY_QUOTE.id || existing.some(q => q.numberOnly === draft.numberOnly);
  if (!conflict) return { id: draft.id, numberOnly: draft.numberOnly };
  const n = nextProvisionalNumber(existing);
  return { id: String(n), numberOnly: n };
}
