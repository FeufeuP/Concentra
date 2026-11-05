import {
  fetchQuotes,
  fetchClients,
  fetchCatalog,
  fetchNextQuoteNumber,
  saveQuoteToSupabase,
  deleteQuoteFromSupabase,
  clearAllQuotesInSupabase,
  saveClientToSupabase,
  deleteClientFromSupabase,
  saveCatalogService,
  deleteCatalogService,
  fetchQuoteEventsFromSupabase,
} from '../supabase';
import { pullRemoteSettings } from '../settings-sync';
import type { DataRepository, RepoResult } from './types';

/** Converte `{ success, error? }` em RepoResult. */
function toResult(res: { success: boolean; error?: string }): RepoResult {
  return res.success ? { success: true, data: undefined } : { success: false, error: res.error || 'Erro desconhecido.' };
}

/** Modo Supabase: o banco é a fonte da verdade (RLS valida cada operação). */
export function createSupabaseRepository(): DataRepository {
  return {
    kind: 'supabase',

    async loadAll() {
      const [q, c, s, settings] = await Promise.all([fetchQuotes(), fetchClients(), fetchCatalog(), pullRemoteSettings()]);
      if (!q.success) return q;
      if (!c.success) return c;
      if (!s.success) return s;
      if (!settings.success) return { success: false, error: settings.error || 'Erro ao carregar configurações.' };
      return { success: true, data: { quotes: q.data, clients: c.data, catalog: s.data } };
    },

    async allocateQuoteNumber() {
      const num = await fetchNextQuoteNumber();
      if (!num.success) return num;
      return { success: true, data: { id: String(num.data), numberOnly: num.data } };
    },

    saveQuote: async (quote) => toResult(await saveQuoteToSupabase(quote)),
    deleteQuote: async (id) => toResult(await deleteQuoteFromSupabase(id)),
    clearAllQuotes: (confirmation) => clearAllQuotesInSupabase(confirmation),
    saveClient: async (client) => toResult(await saveClientToSupabase(client)),
    deleteClient: async (id) => toResult(await deleteClientFromSupabase(id)),
    saveService: async (service) => toResult(await saveCatalogService(service)),
    deleteService: async (id) => toResult(await deleteCatalogService(id)),
    fetchQuoteEvents: (quoteId) => fetchQuoteEventsFromSupabase(quoteId),
  };
}
