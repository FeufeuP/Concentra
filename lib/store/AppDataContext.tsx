'use client';

/**
 * Store de dados do sistema (React Context).
 *
 * Concentra o estado de trabalho (orçamentos, clientes, catálogo, responsáveis)
 * e as operações de gravação. Toda persistência passa pelo repositório
 * (`lib/repository`), então as telas não sabem se estão no modo local ou Supabase.
 *
 * Decisão de arquitetura (Fase 4): Context + hook em vez de rotas do App Router.
 * O sistema é uma SPA autenticada com estado compartilhado entre as abas
 * (orçamento em edição, fila de salvamento); mover para rotas exigiria
 * serializar esse estado na URL/servidor e reescrever a navegação. O Context
 * dá o mesmo desacoplamento com risco menor — rotas podem vir depois, usando
 * este mesmo store.
 *
 * O provider deve ser montado com `key={user.id}`: trocar de usuário remonta o
 * store e descarta os dados em memória do usuário anterior.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Quote, QuoteStatus, ClientData, CatalogService } from '../types';
import { DEFAULT_EMPTY_QUOTE } from '../mock-data';
import { AuthUser, canWrite as userCanWrite, isAdminUser } from '../auth';
import { createRepository, DataRepository, nextProvisionalNumber, QUOTE_NUMBER_BASE } from '../repository';
import { getStoredResponsibles, PRIMARY_RESPONSIBLE } from '../responsibles';
import { pullRemoteSettings } from '../settings-sync';
import { SETTINGS_SYNC_ERROR_EVENT, SettingsSyncErrorDetail } from '../remote-sync';
import { getPendingLocalData } from '../local-import';
import { getTodayFormatted, calculateValidityDate } from '../masks';
import { useToast } from '@/components/ui/ToastProvider';

export type DataStatus = 'loading' | 'ready' | 'error';

const shortId = (id: string) => String(id).replace('#', '');

export interface AppDataStore {
  user: AuthUser;
  isRemote: boolean;
  status: DataStatus;
  error: string | null;
  quotes: Quote[];
  clients: ClientData[];
  catalog: CatalogService[];
  responsiblePersons: string[];
  canWrite: boolean;
  isAdmin: boolean;

  /** Recarrega tudo do repositório. `silent`: em falha só avisa, sem trocar a tela por erro. */
  reload(opts?: { silent?: boolean }): Promise<boolean>;
  /** Avisa e retorna false se o perfil for somente leitura. */
  ensureCanWrite(): boolean;
  /** Novo rascunho (ainda não salvo) com número provisório. */
  makeDraftQuote(overrides?: Partial<Quote>): Quote;
  /** Grava sem mensagem de sucesso. Retorna o orçamento salvo (número definitivo) ou null. */
  persistQuote(quote: Quote): Promise<Quote | null>;
  saveQuote(quote: Quote): Promise<Quote | null>;
  duplicateQuote(quote: Quote): Promise<Quote | null>;
  updateQuoteStatus(quoteId: string, status: QuoteStatus): Promise<Quote | null>;
  deleteQuote(quoteId: string): Promise<boolean>;
  clearAllQuotes(confirmation: string): Promise<boolean>;
  addClient(client: ClientData): Promise<boolean>;
  editClient(client: ClientData): Promise<boolean>;
  deleteClient(clientId: string): Promise<boolean>;
  saveService(service: CatalogService, isNew: boolean): Promise<boolean>;
  deleteService(serviceId: string): Promise<boolean>;
  setResponsiblePersons(list: string[]): void;
}

const AppDataContext = createContext<AppDataStore | null>(null);

interface AppDataProviderProps {
  user: AuthUser;
  children: React.ReactNode;
  /** Injeção para testes; por padrão escolhe local/Supabase pela configuração. */
  repository?: DataRepository;
}

export function AppDataProvider({ user, children, repository }: AppDataProviderProps) {
  const showToast = useToast();
  const [repo] = useState<DataRepository>(() => repository ?? createRepository());
  const isRemote = repo.kind === 'supabase';

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [status, setStatus] = useState<DataStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [responsiblePersons, setResponsiblePersons] = useState<string[]>(() => getStoredResponsibles());

  const canWrite = userCanWrite(user);
  const isAdmin = isAdminUser(user);

  // Referência síncrona da lista (o estado só muda no próximo render)
  const quotesRef = useRef<Quote[]>(quotes);
  useEffect(() => {
    quotesRef.current = quotes;
  }, [quotes]);

  const reload = useCallback(
    async (opts: { silent?: boolean } = {}): Promise<boolean> => {
      const res = await repo.loadAll();
      if (!res.success) {
        if (opts.silent) {
          showToast(`Não foi possível recarregar os dados: ${res.error}`, 'error');
        } else {
          setError(res.error);
          setStatus('error');
        }
        return false;
      }
      // O resultado SUBSTITUI o estado, mesmo vazio: o repositório é a fonte da verdade
      quotesRef.current = res.data.quotes;
      setQuotes(res.data.quotes);
      setClients(res.data.clients);
      setCatalog(res.data.catalog);
      setError(null);
      setStatus('ready');
      return true;
    },
    [repo, showToast]
  );

  // Carga inicial (assíncrona por definição: os setState ocorrem após a leitura)
  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => reload())
      .then((ok) => {
        if (!alive || !ok || !isRemote) return;
        const pending = getPendingLocalData();
        if (pending && (pending.quotes.length > 0 || pending.clients.length > 0 || pending.settingsLabels.length > 0)) {
          showToast(
            `Há dados salvos apenas neste navegador (${pending.quotes.length} orçamento(s), ${pending.clients.length} cliente(s)). Importe-os em Configurações.`,
            'error'
          );
        }
      });
    return () => {
      alive = false;
    };
  }, [reload, isRemote, showToast]);

  // Configurações: falha de sincronização e atualização da lista de responsáveis
  useEffect(() => {
    const onSyncError = (e: Event) => {
      const detail = (e as CustomEvent<SettingsSyncErrorDetail>).detail;
      showToast(`Configuração não salva no servidor: ${detail?.error || 'erro desconhecido'}`, 'error');
      void pullRemoteSettings();
    };
    const onResponsibles = (e: Event) => {
      const detail = (e as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) setResponsiblePersons(detail);
    };
    window.addEventListener(SETTINGS_SYNC_ERROR_EVENT, onSyncError);
    window.addEventListener('consentra_responsibles_updated', onResponsibles);
    return () => {
      window.removeEventListener(SETTINGS_SYNC_ERROR_EVENT, onSyncError);
      window.removeEventListener('consentra_responsibles_updated', onResponsibles);
    };
  }, [showToast]);

  const ensureCanWrite = useCallback((): boolean => {
    if (canWrite) return true;
    showToast('Seu perfil (Auditor SST) tem acesso somente leitura.', 'error');
    return false;
  }, [canWrite, showToast]);

  /** Falha de gravação: mostra o erro e recarrega do repositório (estado volta ao real). */
  const handleFailure = useCallback(
    (action: string, err?: string) => {
      showToast(`${action}: ${err || 'erro desconhecido'}`, 'error');
      if (isRemote) void reload({ silent: true });
    },
    [isRemote, reload, showToast]
  );

  const makeDraftQuote = useCallback(
    (overrides: Partial<Quote> = {}): Quote => {
      const nextNum = nextProvisionalNumber(quotesRef.current);
      const issueDate = getTodayFormatted();
      return {
        ...DEFAULT_EMPTY_QUOTE,
        id: `${nextNum}`,
        numberOnly: nextNum,
        status: 'Rascunho',
        issueDate,
        validityDate: calculateValidityDate(issueDate, DEFAULT_EMPTY_QUOTE.validityDays || 15),
        lastModified: 'Agora',
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        regulatoryScope: [],
        responsibleTech: user.name || responsiblePersons[0] || getStoredResponsibles()[0] || PRIMARY_RESPONSIBLE,
        ...overrides,
      };
    },
    [user.name, responsiblePersons]
  );

  const upsertQuoteInState = useCallback((saved: Quote, previousId?: string) => {
    setQuotes((prev) => {
      const matches = (q: Quote) => q.id === saved.id || q.id === previousId;
      if (!prev.some(matches)) return [saved, ...prev];
      let replaced = false;
      return prev.flatMap((q) => {
        if (!matches(q)) return [q];
        if (replaced) return [];
        replaced = true;
        return [saved];
      });
    });
  }, []);

  // Salvamentos em fila: evita que dois cliques no mesmo rascunho gerem dois números
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  const savedDraftIds = useRef(new Map<string, { id: string; numberOnly: number }>());

  const persistQuote = useCallback(
    (input: Quote): Promise<Quote | null> => {
      const run = async (): Promise<Quote | null> => {
        // Rascunho já salvo antes (com outro id provisório): usa o número definitivo
        const alias = savedDraftIds.current.get(input.id);
        const quote: Quote = alias ? { ...input, ...alias } : input;
        const current = quotesRef.current;
        const isNew = !current.some((q) => q.id === quote.id) && !alias;
        let toSave: Quote = { ...quote, lastModified: new Date().toISOString() };

        if (isNew) {
          const num = await repo.allocateQuoteNumber(toSave, current);
          if (!num.success) {
            showToast(`Não foi possível gerar o número do orçamento: ${num.error}`, 'error');
            return null;
          }
          toSave = { ...toSave, ...num.data };
        }

        const res = await repo.saveQuote(toSave);
        if (!res.success) {
          handleFailure(`Orçamento ${toSave.id} não foi salvo`, res.error);
          return null;
        }

        if (toSave.id !== input.id) savedDraftIds.current.set(input.id, { id: toSave.id, numberOnly: toSave.numberOnly });
        quotesRef.current = [toSave, ...current.filter((q) => q.id !== toSave.id && q.id !== input.id)];
        upsertQuoteInState(toSave, input.id);
        return toSave;
      };
      const result = saveChain.current.then(run, run);
      saveChain.current = result.catch(() => null);
      return result;
    },
    [repo, showToast, handleFailure, upsertQuoteInState]
  );

  const saveQuote = useCallback(
    async (quote: Quote): Promise<Quote | null> => {
      if (!ensureCanWrite()) return null;
      const saved = await persistQuote(quote);
      if (!saved) return null;
      const renumbered = saved.id !== quote.id ? ` (número definitivo: ${saved.numberOnly})` : '';
      showToast(`Orçamento ${shortId(saved.id)} salvo com sucesso!${renumbered}`);
      return saved;
    },
    [ensureCanWrite, persistQuote, showToast]
  );

  const duplicateQuote = useCallback(
    async (source: Quote): Promise<Quote | null> => {
      if (!ensureCanWrite()) return null;
      const issueDate = getTodayFormatted();
      const n = nextProvisionalNumber(quotesRef.current);
      const draft: Quote = {
        ...source,
        id: `${n}`,
        numberOnly: n,
        status: 'Rascunho',
        issueDate,
        validityDate: calculateValidityDate(issueDate, source.validityDays || 15),
        items: source.items.map((it, idx) => ({ ...it, id: `item-${Date.now()}-${idx}` })),
        lastModified: 'Agora (Cópia)',
      };
      const saved = await persistQuote(draft);
      if (!saved) return null;
      showToast(`Orçamento ${saved.numberOnly} duplicado a partir de ${shortId(source.id)}!`);
      return saved;
    },
    [ensureCanWrite, persistQuote, showToast]
  );

  const updateQuoteStatus = useCallback(
    async (quoteId: string, newStatus: QuoteStatus): Promise<Quote | null> => {
      if (!ensureCanWrite()) return null;
      const target = quotesRef.current.find((q) => q.id === quoteId);
      if (!target) return null;
      const saved = await persistQuote({ ...target, status: newStatus });
      if (!saved) return null;
      showToast(`Status do orçamento ${shortId(quoteId)} atualizado para ${newStatus}!`);
      return saved;
    },
    [ensureCanWrite, persistQuote, showToast]
  );

  const deleteQuote = useCallback(
    async (quoteId: string): Promise<boolean> => {
      if (!ensureCanWrite()) return false;
      const res = await repo.deleteQuote(quoteId);
      if (!res.success) {
        handleFailure(`Orçamento ${shortId(quoteId)} não foi excluído`, res.error);
        return false;
      }
      quotesRef.current = quotesRef.current.filter((q) => q.id !== quoteId);
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      showToast(`Orçamento ${shortId(quoteId)} excluído com sucesso.`);
      return true;
    },
    [ensureCanWrite, repo, handleFailure, showToast]
  );

  const clearAllQuotes = useCallback(
    async (confirmation: string): Promise<boolean> => {
      if (!isAdmin) {
        showToast('Apenas administradores podem zerar os orçamentos.', 'error');
        return false;
      }
      if (confirmation !== 'ZERAR') {
        showToast('Digite ZERAR para confirmar.', 'error');
        return false;
      }
      const res = await repo.clearAllQuotes(confirmation);
      if (!res.success) {
        handleFailure('Não foi possível zerar os orçamentos', res.error);
        return false;
      }
      quotesRef.current = [];
      setQuotes([]);
      showToast(`${res.data} orçamento(s) apagado(s). O sistema foi zerado!`);
      return true;
    },
    [isAdmin, repo, handleFailure, showToast]
  );

  const addClient = useCallback(
    async (client: ClientData): Promise<boolean> => {
      if (!ensureCanWrite()) return false;
      const res = await repo.saveClient(client);
      if (!res.success) {
        handleFailure(`Cliente "${client.name}" não foi cadastrado`, res.error);
        return false;
      }
      setClients((prev) => [client, ...prev.filter((c) => c.id !== client.id)]);
      showToast(`Cliente "${client.name}" cadastrado com sucesso.`);
      return true;
    },
    [ensureCanWrite, repo, handleFailure, showToast]
  );

  const editClient = useCallback(
    async (client: ClientData): Promise<boolean> => {
      if (!ensureCanWrite()) return false;
      const res = await repo.saveClient(client);
      if (!res.success) {
        handleFailure(`Dados do cliente "${client.name}" não foram salvos`, res.error);
        return false;
      }
      setClients((prev) => prev.map((c) => (c.id === client.id ? client : c)));
      showToast(`Dados do cliente "${client.name}" atualizados com sucesso.`);
      return true;
    },
    [ensureCanWrite, repo, handleFailure, showToast]
  );

  const deleteClient = useCallback(
    async (clientId: string): Promise<boolean> => {
      if (!ensureCanWrite()) return false;
      const res = await repo.deleteClient(clientId);
      if (!res.success) {
        handleFailure('Cliente não foi removido', res.error);
        return false;
      }
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      showToast('Cliente removido com sucesso.');
      return true;
    },
    [ensureCanWrite, repo, handleFailure, showToast]
  );

  const saveService = useCallback(
    async (service: CatalogService, isNew: boolean): Promise<boolean> => {
      if (!ensureCanWrite()) return false;
      const res = await repo.saveService(service);
      if (!res.success) {
        handleFailure(`Serviço "${service.title}" não foi salvo`, res.error);
        return false;
      }
      setCatalog((prev) =>
        isNew ? [service, ...prev.filter((s) => s.id !== service.id)] : prev.map((s) => (s.id === service.id ? service : s))
      );
      return true;
    },
    [ensureCanWrite, repo, handleFailure]
  );

  const deleteService = useCallback(
    async (serviceId: string): Promise<boolean> => {
      if (!ensureCanWrite()) return false;
      const res = await repo.deleteService(serviceId);
      if (!res.success) {
        handleFailure('Serviço não foi excluído', res.error);
        return false;
      }
      setCatalog((prev) => prev.filter((s) => s.id !== serviceId));
      return true;
    },
    [ensureCanWrite, repo, handleFailure]
  );

  const value = useMemo<AppDataStore>(
    () => ({
      user,
      isRemote,
      status,
      error,
      quotes,
      clients,
      catalog,
      responsiblePersons,
      canWrite,
      isAdmin,
      reload,
      ensureCanWrite,
      makeDraftQuote,
      persistQuote,
      saveQuote,
      duplicateQuote,
      updateQuoteStatus,
      deleteQuote,
      clearAllQuotes,
      addClient,
      editClient,
      deleteClient,
      saveService,
      deleteService,
      setResponsiblePersons,
    }),
    [
      user, isRemote, status, error, quotes, clients, catalog, responsiblePersons, canWrite, isAdmin,
      reload, ensureCanWrite, makeDraftQuote, persistQuote, saveQuote, duplicateQuote, updateQuoteStatus,
      deleteQuote, clearAllQuotes, addClient, editClient, deleteClient, saveService, deleteService,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataStore {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData deve ser usado dentro de <AppDataProvider>.');
  return ctx;
}

/** Número inicial após ZERAR (modo local; no Supabase a sequência nunca volta). */
export const FIRST_QUOTE_NUMBER = QUOTE_NUMBER_BASE + 1;
