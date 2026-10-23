import type { Quote, ClientData, CatalogService } from '../types';
import type { RemoteResult } from '../supabase';

export type RepoResult<T = void> = RemoteResult<T>;

/** Conjunto de dados de trabalho carregados na abertura do sistema. */
export interface AppData {
  quotes: Quote[];
  clients: ClientData[];
  catalog: CatalogService[];
}

/**
 * Camada única de acesso a dados.
 *
 * A interface (store/telas) não sabe se está no modo local (localStorage) ou
 * Supabase: chama sempre o repositório e trata `RepoResult`. Cada implementação
 * decide como persistir e como numerar orçamentos novos.
 */
export interface DataRepository {
  readonly kind: 'local' | 'supabase';

  /** Carrega orçamentos, clientes, catálogo (e, no Supabase, as configurações compartilhadas). */
  loadAll(): Promise<RepoResult<AppData>>;

  /**
   * Define o número definitivo de um orçamento que ainda não existe na base.
   * Supabase: sequência do servidor. Local: mantém o número provisório,
   * a menos que ele já esteja em uso (então usa maior + 1).
   */
  allocateQuoteNumber(draft: Quote, existing: Quote[]): Promise<RepoResult<{ id: string; numberOnly: number }>>;

  saveQuote(quote: Quote): Promise<RepoResult>;
  deleteQuote(quoteId: string): Promise<RepoResult>;
  /** Apaga todos os orçamentos. Retorna quantos foram removidos. */
  clearAllQuotes(confirmation: string): Promise<RepoResult<number>>;

  saveClient(client: ClientData): Promise<RepoResult>;
  deleteClient(clientId: string): Promise<RepoResult>;

  saveService(service: CatalogService): Promise<RepoResult>;
  deleteService(serviceId: string): Promise<RepoResult>;
}
