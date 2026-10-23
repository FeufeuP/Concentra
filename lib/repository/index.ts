import { isSupabaseConfigured } from '../supabase';
import { createLocalRepository } from './local';
import { createSupabaseRepository } from './supabase';
import type { DataRepository } from './types';

export type { DataRepository, AppData, RepoResult } from './types';
export { createLocalRepository, LOCAL_CATALOG_KEY } from './local';
export { createSupabaseRepository } from './supabase';
export { QUOTE_NUMBER_BASE, nextProvisionalNumber, resolveLocalQuoteNumber } from './numbering';

/** Repositório conforme a configuração: Supabase (variáveis definidas) ou localStorage. */
export function createRepository(): DataRepository {
  return isSupabaseConfigured() ? createSupabaseRepository() : createLocalRepository();
}
