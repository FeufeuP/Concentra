import type { Quote, ClientData, CatalogService } from '../types';
import { INITIAL_QUOTES, INITIAL_CLIENTS, CATALOG_SERVICES } from '../mock-data';
import { LOCAL_QUOTES_KEY, LOCAL_CLIENTS_KEY } from '../local-import';
import { resolveLocalQuoteNumber } from './numbering';
import type { DataRepository, RepoResult } from './types';
import {
  LOCAL_EVENTS_KEY,
  appendEvents,
  eventForDelete,
  eventsForSave,
  eventsOfQuote,
  type EventActor,
  type QuoteEvent,
} from '../quote-events';

export const LOCAL_CATALOG_KEY = 'consentra_catalog_data';

/** Armazenamento mínimo (permite testar com um Map em memória). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const ok = <T = void>(data?: T): RepoResult<T> => ({ success: true, data: data as T });

function browserStorage(): KeyValueStorage | null {
  return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
}

/**
 * Modo local (sem Supabase): dados no localStorage deste navegador.
 * Na primeira abertura usa os dados de demonstração.
 */
export function createLocalRepository(
  storage: KeyValueStorage | null = browserStorage(),
  getActor: () => EventActor | null = () => null
): DataRepository {
  function read<T>(key: string, fallback: T[]): T[] {
    if (!storage) return fallback;
    try {
      const saved = storage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed as T[];
      }
    } catch {
      // JSON inválido: volta ao padrão
    }
    return fallback;
  }

  function write(key: string, value: unknown): RepoResult {
    if (!storage) return ok();
    try {
      storage.setItem(key, JSON.stringify(value));
      return ok();
    } catch (err) {
      console.warn(`Não foi possível salvar ${key} no navegador:`, err);
      return { success: false, error: 'Espaço do navegador esgotado ou indisponível.' };
    }
  }

  const quotes = () => read<Quote>(LOCAL_QUOTES_KEY, INITIAL_QUOTES);
  const clients = () => read<ClientData>(LOCAL_CLIENTS_KEY, INITIAL_CLIENTS);
  const catalog = () => read<CatalogService>(LOCAL_CATALOG_KEY, CATALOG_SERVICES);
  const events = () => read<QuoteEvent>(LOCAL_EVENTS_KEY, []);

  /** Histórico é complementar: se não couber no navegador, o dado principal já foi salvo. */
  function logEvents(added: QuoteEvent[]) {
    if (added.length === 0) return;
    write(LOCAL_EVENTS_KEY, appendEvents(events(), added));
  }

  return {
    kind: 'local',

    async loadAll() {
      return ok({ quotes: quotes(), clients: clients(), catalog: catalog() });
    },

    async allocateQuoteNumber(draft, existing) {
      return ok(resolveLocalQuoteNumber(draft, existing));
    },

    async saveQuote(quote) {
      const list = quotes();
      const idx = list.findIndex(q => q.id === quote.id);
      const res = write(LOCAL_QUOTES_KEY, idx >= 0 ? list.map((q, i) => (i === idx ? quote : q)) : [quote, ...list]);
      if (res.success) logEvents(eventsForSave(idx >= 0 ? list[idx] : undefined, quote, getActor()));
      return res;
    },

    async deleteQuote(quoteId) {
      const list = quotes();
      const target = list.find(q => q.id === quoteId);
      const res = write(LOCAL_QUOTES_KEY, list.filter(q => q.id !== quoteId));
      if (res.success && target) logEvents([eventForDelete(target, getActor())]);
      return res;
    },

    async clearAllQuotes() {
      const list = quotes();
      const res = write(LOCAL_QUOTES_KEY, []);
      if (!res.success) return res;
      const actor = getActor();
      logEvents(list.map(q => eventForDelete(q, actor)));
      return ok(list.length);
    },

    async saveClient(client) {
      return write(LOCAL_CLIENTS_KEY, [client, ...clients().filter(c => c.id !== client.id)]);
    },

    async deleteClient(clientId) {
      return write(LOCAL_CLIENTS_KEY, clients().filter(c => c.id !== clientId));
    },

    async saveService(service) {
      const list = catalog();
      const idx = list.findIndex(s => s.id === service.id);
      return write(LOCAL_CATALOG_KEY, idx >= 0 ? list.map((s, i) => (i === idx ? service : s)) : [service, ...list]);
    },

    async deleteService(serviceId) {
      return write(LOCAL_CATALOG_KEY, catalog().filter(s => s.id !== serviceId));
    },

    async fetchQuoteEvents(quoteId) {
      return ok(eventsOfQuote(events(), quoteId));
    },
  };
}
