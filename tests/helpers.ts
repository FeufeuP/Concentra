import type { Quote, QuoteItem } from '@/lib/types';
import { DEFAULT_EMPTY_QUOTE } from '@/lib/mock-data';

/** localStorage em memória (mesma API usada pelo app). */
export class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
  get length(): number {
    return this.map.size;
  }
  key(i: number): string | null {
    return Array.from(this.map.keys())[i] ?? null;
  }
}

/** Simula `window` + `localStorage` do navegador no ambiente Node. */
export function installBrowserGlobals(): MemoryStorage {
  const storage = new MemoryStorage();
  const win = new EventTarget() as EventTarget & { localStorage: MemoryStorage };
  win.localStorage = storage;
  Object.assign(globalThis, { window: win, localStorage: storage });
  return storage;
}

export function uninstallBrowserGlobals(): void {
  const g = globalThis as Record<string, unknown>;
  delete g.window;
  delete g.localStorage;
}

export function makeItem(overrides: Partial<QuoteItem> = {}): QuoteItem {
  return {
    id: 'item-1',
    itemNumber: 1,
    title: 'PGR',
    description: 'Programa de Gerenciamento de Riscos',
    unit: 'Unidade',
    quantity: 1,
    unitPrice: 1000,
    totalPrice: 1000,
    ...overrides,
  };
}

export function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    ...DEFAULT_EMPTY_QUOTE,
    id: '319',
    numberOnly: 319,
    clientId: 'cli-1',
    clientName: 'Cliente Teste Ltda',
    cnpj: '12.345.678/0001-90',
    issueDate: '19/09/2026',
    validityDate: '04/10/2026',
    ...overrides,
  };
}
