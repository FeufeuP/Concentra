'use client';

import React, { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { Sidebar, TabType } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DashboardView } from '@/components/DashboardView';
import { QuotesView } from '@/components/QuotesView';
import { NewQuoteView } from '@/components/NewQuoteView';
import { PdfVisualizerView } from '@/components/PdfVisualizerView';
import { ClientsView } from '@/components/ClientsView';
import { ServicesView } from '@/components/ServicesView';
import { SettingsView } from '@/components/SettingsView';
import { EmailModal } from '@/components/EmailModal';
import { ServiceOrderModal } from '@/components/ServiceOrderModal';
import { LoginView } from '@/components/LoginView';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { RecoveryPasswordModal } from '@/components/RecoveryPasswordModal';
import { ReportsView } from '@/components/ReportsView';
import { Quote, QuoteStatus, ClientData, CatalogService } from '@/lib/types';
import { INITIAL_QUOTES, INITIAL_CLIENTS, CATALOG_SERVICES, DEFAULT_EMPTY_QUOTE } from '@/lib/mock-data';
import { getStoredResponsibles } from '@/lib/responsibles';
import { AuthUser, getCurrentUser, logoutUser, initAuth, onAuthEvent, isRemoteAuth, canWrite, isAdminUser } from '@/lib/auth';
import {
  isSupabaseConfigured,
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
} from '@/lib/supabase';
import { pullRemoteSettings } from '@/lib/settings-sync';
import { SETTINGS_SYNC_ERROR_EVENT, SettingsSyncErrorDetail } from '@/lib/remote-sync';
import { getPendingLocalData, LOCAL_QUOTES_KEY, LOCAL_CLIENTS_KEY } from '@/lib/local-import';
import { getTodayFormatted, calculateValidityDate } from '@/lib/masks';

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const CATALOG_STORAGE_KEY = 'consentra_catalog_data';
/** Base da numeração local: o primeiro orçamento recebe o número 319. */
const QUOTE_NUMBER_BASE = 318;

type ToastType = 'success' | 'error';
type DataStatus = 'loading' | 'ready' | 'error';

function readLocalArray<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed as T[];
    }
  } catch {}
  return fallback;
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Não foi possível salvar ${key} no navegador:`, err);
  }
}

/** Número provisório (rascunho ainda não salvo / modo local): maior número + 1. */
function nextProvisionalNumber(list: Quote[]): number {
  return list.reduce((max, q) => (Number(q.numberOnly) > max ? Number(q.numberOnly) : max), QUOTE_NUMBER_BASE) + 1;
}

export default function HomePage() {
  const isMounted = useIsMounted();
  // Modo Supabase: o banco é a fonte da verdade; modo local: localStorage
  const remote = isSupabaseConfigured();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentUser());
  // No modo Supabase a sessão é validada no servidor antes de exibir o sistema
  const [authChecked, setAuthChecked] = useState<boolean>(() => !isRemoteAuth());
  const [recoveryMode, setRecoveryMode] = useState<boolean>(false);
  const [authLinkError, setAuthLinkError] = useState<string | null>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);

  const [quotes, setQuotes] = useState<Quote[]>(() => (remote ? [] : readLocalArray(LOCAL_QUOTES_KEY, INITIAL_QUOTES)));
  const [clients, setClients] = useState<ClientData[]>(() => (remote ? [] : readLocalArray(LOCAL_CLIENTS_KEY, INITIAL_CLIENTS)));
  const [catalog, setCatalog] = useState<CatalogService[]>(() => (remote ? [] : readLocalArray(CATALOG_STORAGE_KEY, CATALOG_SERVICES)));
  const [dataStatus, setDataStatus] = useState<DataStatus>(remote ? 'loading' : 'ready');
  const [dataError, setDataError] = useState<string | null>(null);

  // Modo local: persiste no navegador. Modo Supabase: nada de dados de trabalho no localStorage.
  useEffect(() => {
    if (!remote) writeLocal(LOCAL_QUOTES_KEY, quotes);
  }, [quotes, remote]);

  useEffect(() => {
    if (!remote) writeLocal(LOCAL_CLIENTS_KEY, clients);
  }, [clients, remote]);

  useEffect(() => {
    if (!remote) writeLocal(CATALOG_STORAGE_KEY, catalog);
  }, [catalog, remote]);

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [currentQuote, setCurrentQuote] = useState<Quote>(DEFAULT_EMPTY_QUOTE); // Initialized safely
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [emailQuoteTarget, setEmailQuoteTarget] = useState<Quote | null>(null);
  const [serviceOrderQuote, setServiceOrderQuote] = useState<Quote | null>(null);
  const [showServiceOrderModal, setShowServiceOrderModal] = useState<boolean>(false);
  const [responsiblePersons, setResponsiblePersons] = useState<string[]>(() => getStoredResponsibles());
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Valida a sessão e acompanha eventos de autenticação (logout, recuperação de senha)
  useEffect(() => {
    let alive = true;
    initAuth().then((res) => {
      if (!alive) return;
      setCurrentUser(res.user);
      setRecoveryMode(res.recovery);
      setAuthLinkError(res.linkError || null);
      setAuthChecked(true);
    });
    const unsubscribe = onAuthEvent((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
        setCurrentUser(null);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), type === 'error' ? 7000 : 3500);
  }, []);

  // Carrega tudo do Supabase (somente com usuário autenticado — RLS exige sessão).
  // O resultado SUBSTITUI o estado local, mesmo vazio: o servidor é a fonte da verdade.
  const loadRemoteData = useCallback(async (opts: { silent?: boolean } = {}): Promise<boolean> => {
    if (!remote) return true;
    const [q, c, s, settings] = await Promise.all([fetchQuotes(), fetchClients(), fetchCatalog(), pullRemoteSettings()]);
    const firstError = [q, c, s, settings].find((r) => !r.success) as { error?: string } | undefined;
    if (q.success) setQuotes(q.data);
    if (c.success) setClients(c.data);
    if (s.success) setCatalog(s.data);
    if (firstError) {
      const msg = firstError.error || 'Erro ao carregar dados do servidor.';
      if (opts.silent) {
        showToast(`Não foi possível recarregar os dados: ${msg}`, 'error');
      } else {
        setDataError(msg);
        setDataStatus('error');
      }
      return false;
    }
    setDataError(null);
    setDataStatus('ready');
    return true;
  }, [remote, showToast]);

  const currentUserId = currentUser?.id;
  // Troca de usuário / logout: descarta os dados em memória (ajuste de estado durante o render)
  const [dataOwnerId, setDataOwnerId] = useState<string | undefined>(currentUserId);
  if (remote && dataOwnerId !== currentUserId) {
    setDataOwnerId(currentUserId);
    setQuotes([]);
    setClients([]);
    setCatalog([]);
    setDataStatus('loading');
  }

  useEffect(() => {
    if (!remote || !currentUserId) return;
    let alive = true;
    // Assíncrono por definição: os setState acontecem após as requisições
    Promise.resolve().then(() => loadRemoteData()).then((ok) => {
      if (!alive || !ok) return;
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
  }, [currentUserId, remote, loadRemoteData, showToast]);

  // Falha ao gravar configurações no servidor: avisa e volta aos valores do banco
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

  // Sincronização segura da sessão de autenticação no cliente
  useEffect(() => {
    const handleAuthUpdated = (e: Event) => {
      const custom = e as CustomEvent<AuthUser | null>;
      setCurrentUser(custom.detail || null);
    };

    window.addEventListener('consentra_auth_updated', handleAuthUpdated);
    return () => {
      window.removeEventListener('consentra_auth_updated', handleAuthUpdated);
    };
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    showToast('Sessão encerrada com sucesso.');
  };

  /** Bloqueia ações de escrita para perfis somente leitura (o banco também bloqueia). */
  const ensureCanWrite = (): boolean => {
    if (canWrite(currentUser)) return true;
    showToast('Seu perfil (Auditor SST) tem acesso somente leitura.', 'error');
    return false;
  };

  /** Falha de gravação remota: mostra o erro e recarrega os dados do servidor. */
  const handleRemoteFailure = (action: string, error?: string) => {
    showToast(`${action}: ${error || 'erro desconhecido'}`, 'error');
    void loadRemoteData({ silent: true });
  };

  const handleOpenServiceOrder = (quote: Quote) => {
    setServiceOrderQuote(quote);
    setShowServiceOrderModal(true);
  };

  // SettingsView já grava a lista (localStorage + servidor); aqui só atualiza o estado
  const handleUpdateResponsiblePersons = (newList: string[]) => {
    setResponsiblePersons(newList);
  };

  // Navigations & actions
  const handleOpenPdf = (quote: Quote) => {
    setCurrentQuote(quote);
    setActiveTab('visualizar-pdf');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditQuote = (quote: Quote) => {
    setCurrentQuote(quote);
    setActiveTab('novo-orcamento');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const makeDraftQuote = (overrides: Partial<Quote> = {}): Quote => {
    const nextNum = nextProvisionalNumber(quotes);
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
      responsibleTech: currentUser?.name || responsiblePersons[0] || getStoredResponsibles()[0] || 'Washington Assis',
      ...overrides,
    };
  };

  // Rascunhos novos só entram na lista (e no banco) quando forem salvos.
  // No modo Supabase o número definitivo é gerado pelo servidor no primeiro salvamento.
  const handleStartNewQuote = () => {
    if (!ensureCanWrite()) return;
    setCurrentQuote(makeDraftQuote());
    setActiveTab('novo-orcamento');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const upsertQuoteInState = (saved: Quote, previousId?: string) => {
    setQuotes(prev => {
      const matches = (q: Quote) => q.id === saved.id || q.id === previousId;
      if (!prev.some(matches)) return [saved, ...prev];
      let replaced = false;
      return prev.flatMap(q => {
        if (!matches(q)) return [q];
        if (replaced) return [];
        replaced = true;
        return [saved];
      });
    });
  };

  // Salvamentos em fila: evita que dois cliques no mesmo rascunho gerem dois números
  const quotesRef = useRef<Quote[]>(quotes);
  useEffect(() => {
    quotesRef.current = quotes;
  }, [quotes]);
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  const savedDraftIds = useRef(new Map<string, { id: string; numberOnly: number }>());

  /** Persiste um orçamento. Retorna o orçamento salvo (com número definitivo) ou null em caso de falha. */
  const persistQuote = (input: Quote): Promise<Quote | null> => {
    const run = async (): Promise<Quote | null> => {
      // Rascunho já salvo antes (com outro id provisório): usa o número definitivo
      const alias = savedDraftIds.current.get(input.id);
      const quote: Quote = alias ? { ...input, ...alias } : input;
      const current = quotesRef.current;
      const isNew = !current.some(q => q.id === quote.id) && !alias;
      let toSave: Quote = { ...quote, lastModified: new Date().toISOString() };

      if (remote) {
        if (isNew) {
          const num = await fetchNextQuoteNumber();
          if (!num.success) {
            showToast(`Não foi possível gerar o número do orçamento: ${num.error}`, 'error');
            return null;
          }
          toSave = { ...toSave, id: String(num.data), numberOnly: num.data };
        }
        const res = await saveQuoteToSupabase(toSave);
        if (!res.success) {
          handleRemoteFailure(`Orçamento ${toSave.id} não foi salvo`, res.error);
          return null;
        }
      } else if (isNew && (quote.id === DEFAULT_EMPTY_QUOTE.id || current.some(q => q.numberOnly === toSave.numberOnly))) {
        // Modo local: evita número repetido se outro rascunho foi salvo antes
        const nextNum = nextProvisionalNumber(current);
        toSave = { ...toSave, id: String(nextNum), numberOnly: nextNum };
      }

      if (toSave.id !== input.id) savedDraftIds.current.set(input.id, { id: toSave.id, numberOnly: toSave.numberOnly });
      // Atualiza a referência imediatamente (o estado só muda no próximo render)
      quotesRef.current = [toSave, ...current.filter(q => q.id !== toSave.id && q.id !== input.id)];
      upsertQuoteInState(toSave, input.id);
      return toSave;
    };
    const result = saveChain.current.then(run, run);
    saveChain.current = result.catch(() => null);
    return result;
  };

  const handleSaveQuote = async (updatedQuote: Quote): Promise<Quote | null> => {
    if (!ensureCanWrite()) return null;
    const saved = await persistQuote(updatedQuote);
    if (!saved) return null;
    setCurrentQuote(saved);
    const renumbered = saved.id !== updatedQuote.id ? ` (número definitivo: ${saved.numberOnly})` : '';
    showToast(`Orçamento ${String(saved.id).replace('#', '')} salvo com sucesso!${renumbered}`);
    return saved;
  };

  const handleDuplicateQuote = async (quoteToDup: Quote) => {
    if (!ensureCanWrite()) return;
    const issueDate = getTodayFormatted();
    const draft: Quote = {
      ...quoteToDup,
      ...(() => {
        const n = nextProvisionalNumber(quotes);
        return { id: `${n}`, numberOnly: n };
      })(),
      status: 'Rascunho',
      issueDate,
      validityDate: calculateValidityDate(issueDate, quoteToDup.validityDays || 15),
      items: quoteToDup.items.map((it, idx) => ({ ...it, id: `item-${Date.now()}-${idx}` })),
      lastModified: 'Agora (Cópia)',
    };
    const saved = await persistQuote(draft);
    if (!saved) return;
    setCurrentQuote(saved);
    showToast(`Orçamento ${saved.numberOnly} duplicado a partir de ${String(quoteToDup.id).replace('#', '')}!`);
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!ensureCanWrite()) return;
    if (remote) {
      const res = await deleteQuoteFromSupabase(quoteId);
      if (!res.success) {
        handleRemoteFailure(`Orçamento ${quoteId.replace('#', '')} não foi excluído`, res.error);
        return;
      }
    }
    setQuotes(prev => prev.filter(q => q.id !== quoteId));
    showToast(`Orçamento ${quoteId.replace('#', '')} excluído com sucesso.`);
  };

  const handleClearAllQuotes = async (confirmation: string): Promise<boolean> => {
    if (!isAdminUser(currentUser)) {
      showToast('Apenas administradores podem zerar os orçamentos.', 'error');
      return false;
    }
    if (confirmation !== 'ZERAR') {
      showToast('Digite ZERAR para confirmar.', 'error');
      return false;
    }
    let removed = quotes.length;
    if (remote) {
      const res = await clearAllQuotesInSupabase(confirmation);
      if (!res.success) {
        handleRemoteFailure('Não foi possível zerar os orçamentos', res.error);
        return false;
      }
      removed = res.data;
    }
    setQuotes([]);
    setCurrentQuote(makeDraftQuote({ id: `${QUOTE_NUMBER_BASE + 1}`, numberOnly: QUOTE_NUMBER_BASE + 1 }));
    showToast(`${removed} orçamento(s) apagado(s). O sistema foi zerado!`);
    return true;
  };

  const handleAddClient = async (newClient: ClientData) => {
    if (!ensureCanWrite()) return;
    if (remote) {
      const res = await saveClientToSupabase(newClient);
      if (!res.success) {
        handleRemoteFailure(`Cliente "${newClient.name}" não foi cadastrado`, res.error);
        return;
      }
    }
    setClients(prev => [newClient, ...prev.filter(c => c.id !== newClient.id)]);
    showToast(`Cliente "${newClient.name}" cadastrado com sucesso.`);
  };

  const handleEditClient = async (updatedClient: ClientData) => {
    if (!ensureCanWrite()) return;
    if (remote) {
      const res = await saveClientToSupabase(updatedClient);
      if (!res.success) {
        handleRemoteFailure(`Dados do cliente "${updatedClient.name}" não foram salvos`, res.error);
        return;
      }
    }
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    showToast(`Dados do cliente "${updatedClient.name}" atualizados com sucesso.`);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!ensureCanWrite()) return;
    if (remote) {
      const res = await deleteClientFromSupabase(clientId);
      if (!res.success) {
        handleRemoteFailure('Cliente não foi removido', res.error);
        return;
      }
    }
    setClients(prev => prev.filter(c => c.id !== clientId));
    showToast(`Cliente removido com sucesso.`);
  };

  const handleUpdateQuoteStatus = async (quoteId: string, newStatus: QuoteStatus) => {
    if (!ensureCanWrite()) return;
    const target = quotes.find(q => q.id === quoteId);
    if (!target) return;
    const saved = await persistQuote({ ...target, status: newStatus });
    if (!saved) return;
    if (currentQuote.id === quoteId) setCurrentQuote(saved);
    showToast(`Status do orçamento ${quoteId.replace('#', '')} atualizado para ${newStatus}!`);
  };

  // Catálogo de serviços (Supabase ou localStorage)
  const handleSaveCatalogService = async (service: CatalogService, isNew: boolean): Promise<boolean> => {
    if (!ensureCanWrite()) return false;
    if (remote) {
      const res = await saveCatalogService(service);
      if (!res.success) {
        handleRemoteFailure(`Serviço "${service.title}" não foi salvo`, res.error);
        return false;
      }
    }
    setCatalog(prev => (isNew ? [service, ...prev.filter(s => s.id !== service.id)] : prev.map(s => (s.id === service.id ? service : s))));
    return true;
  };

  const handleDeleteCatalogService = async (serviceId: string): Promise<boolean> => {
    if (!ensureCanWrite()) return false;
    if (remote) {
      const res = await deleteCatalogService(serviceId);
      if (!res.success) {
        handleRemoteFailure('Serviço não foi excluído', res.error);
        return false;
      }
    }
    setCatalog(prev => prev.filter(s => s.id !== serviceId));
    return true;
  };

  const handleSendWhatsapp = (quote: Quote) => {
    const cleanNum = String(quote.numberOnly || quote.id).replace('#', '');
    const message = encodeURIComponent(
      `Olá ${quote.contactPerson}! Seguem os detalhes da Proposta Técnica & Comercial Consentra Gestão SST Nº ${cleanNum} no valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.total)}. Qualquer dúvida técnica, estamos à total disposição!`
    );
    const cleanPhone = quote.contactPhone.replace(/\D/g, '');
    const phone = cleanPhone ? `55${cleanPhone}` : '5511999999999';
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${message}`, '_blank');
    showToast(`Iniciando envio no WhatsApp para ${quote.clientName}...`);
  };

  const handleOpenEmailModal = (quote: Quote) => {
    setEmailQuoteTarget(quote);
    setShowEmailModal(true);
  };

  const handleNewQuoteForClient = (client: ClientData) => {
    if (!ensureCanWrite()) return;
    const newQuote = makeDraftQuote({
      clientId: client.id,
      clientName: client.name,
      cnpj: client.cnpj,
      ie: client.ie,
      contactPerson: client.contactName,
      contactEmail: client.email,
      contactPhone: client.phone,
      operationalAddress: client.address,
      riskGrade: client.riskGrade,
    });
    setCurrentQuote(newQuote);
    setActiveTab('novo-orcamento');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Iniciando novo orçamento para ${client.name}!`);
  };

  const handleSelectServiceForNewQuote = async (service: CatalogService) => {
    if (!ensureCanWrite()) return;
    const isSaved = quotes.some(q => q.id === currentQuote.id);
    // Sem orçamento em edição: começa um rascunho novo
    const base = isSaved || currentQuote.id !== DEFAULT_EMPTY_QUOTE.id ? currentQuote : makeDraftQuote();
    const updatedItems = [
      ...base.items,
      {
        id: `item-${Date.now()}`,
        itemNumber: base.items.length + 1,
        title: service.title,
        description: service.description,
        unit: service.unit,
        quantity: 1,
        unitPrice: service.suggestedPrice,
        totalPrice: service.suggestedPrice
      }
    ];
    const subtotal = updatedItems.reduce((acc, it) => acc + it.totalPrice, 0);
    const total = Math.max(subtotal - base.discount, 0);
    const installmentValue = base.installments > 0 ? total / base.installments : total;

    const updated: Quote = {
      ...base,
      items: updatedItems,
      subtotal,
      total,
      installmentValue,
      regulatoryScope: Array.from(new Set([...(base.regulatoryScope || []), service.nrCategory]))
    };

    if (isSaved) {
      // Orçamento já salvo: grava a inclusão do item imediatamente
      const saved = await persistQuote(updated);
      if (!saved) return;
      setCurrentQuote(saved);
    } else {
      setCurrentQuote(updated);
    }
    setActiveTab('novo-orcamento');
    showToast(`Serviço "${service.title}" incluído no orçamento ${String(updated.id).replace('#', '')}!`);
  };

  const toastNode = toast && (
    <div
      id="toastNotification"
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`fixed bottom-6 right-6 z-[60] max-w-md text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-300 ${
        toast.type === 'error' ? 'bg-[#ba1a1a] border border-red-300/40' : 'bg-[#004328] border border-[#a9f3c5]/30'
      }`}
    >
      <span className={`material-symbols-outlined text-[20px] ${toast.type === 'error' ? 'text-red-100' : 'text-[#a9f3c5]'}`}>
        {toast.type === 'error' ? 'error' : 'check_circle'}
      </span>
      <span>{toast.message}</span>
      <button onClick={() => setToast(null)} className="text-white/70 hover:text-white ml-2" aria-label="Fechar aviso">
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );

  if (!isMounted || !authChecked) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-[#004328] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-[#004328] tracking-wide">Consentra SST</p>
        <p className="text-xs text-[#50606e]">Carregando sistema de orçamentos...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f8f9ff]">
        {toastNode}
        <LoginView
          initialError={authLinkError}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            showToast(`Bem-vindo, ${user.name}!`);
          }}
        />
        {recoveryMode && (
          <RecoveryPasswordModal
            onComplete={(user) => {
              setRecoveryMode(false);
              setCurrentUser(user);
              showToast('Nova senha cadastrada com sucesso! Bem-vindo de volta.');
            }}
            onCancel={() => setRecoveryMode(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      {/* Toast Notification */}
      {toastNode}

      {/* Modals */}
      <EmailModal
        quote={emailQuoteTarget}
        isOpen={showEmailModal}
        onClose={() => {
          setShowEmailModal(false);
          setEmailQuoteTarget(null);
        }}
        onSentSuccess={() => {
          showToast(`Proposta Nº ${emailQuoteTarget?.numberOnly || emailQuoteTarget?.id.replace('#', '')} enviada com sucesso por e-mail!`);
        }}
      />

      <ServiceOrderModal
        quote={serviceOrderQuote}
        isOpen={showServiceOrderModal}
        onClose={() => {
          setShowServiceOrderModal(false);
          setServiceOrderQuote(null);
        }}
        responsiblePersons={responsiblePersons}
      />

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        currentUser={currentUser}
        onSuccess={(msg) => showToast(msg)}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        quotesCount={quotes.length}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area (offset by sidebar width 72 = 288px on lg screens) */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setActiveTab={setActiveTab}
          onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenChangePassword={() => setShowChangePasswordModal(true)}
        />

        {/* Dynamic Main View */}
        <main className="flex-1 p-4 sm:p-8 pt-20 sm:pt-22">
          {remote && dataStatus === 'loading' && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-9 h-9 border-4 border-[#004328] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold text-[#004328]">Carregando dados do servidor...</p>
            </div>
          )}

          {remote && dataStatus === 'error' && (
            <div className="max-w-lg mx-auto mt-16 p-6 bg-white rounded-2xl border border-red-200 shadow-sm flex flex-col items-center text-center gap-3">
              <span className="material-symbols-outlined text-[36px] text-[#ba1a1a]">cloud_off</span>
              <h2 className="font-bold text-sm text-[#0b1c30]">Não foi possível carregar os dados</h2>
              <p className="text-xs text-[#49607e]">{dataError || 'Erro ao comunicar com o servidor.'}</p>
              <button
                type="button"
                onClick={() => {
                  setDataStatus('loading');
                  void loadRemoteData();
                }}
                className="mt-1 px-4 py-2 rounded-xl bg-[#004328] text-white text-xs font-semibold hover:bg-[#0a5234] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Tentar novamente
              </button>
            </div>
          )}

          {dataStatus === 'ready' && (
          <>
          {activeTab === 'dashboard' && (
            <DashboardView
              quotes={quotes}
              setActiveTab={setActiveTab}
              onOpenPdf={handleOpenPdf}
              onStartNewQuote={handleStartNewQuote}
              onSendWhatsapp={handleSendWhatsapp}
              onSendEmail={handleOpenEmailModal}
            />
          )}

          {activeTab === 'orcamentos' && (
            <QuotesView
              quotes={quotes}
              setActiveTab={setActiveTab}
              onOpenPdf={handleOpenPdf}
              onEditQuote={handleEditQuote}
              onDuplicateQuote={handleDuplicateQuote}
              onDeleteQuote={handleDeleteQuote}
              onClearAllQuotes={isAdminUser(currentUser) ? handleClearAllQuotes : undefined}
              onUpdateQuoteStatus={handleUpdateQuoteStatus}
              onSendWhatsapp={handleSendWhatsapp}
              onSendEmail={handleOpenEmailModal}
              onStartNewQuote={handleStartNewQuote}
              responsiblePersons={responsiblePersons}
              onOpenServiceOrder={handleOpenServiceOrder}
              globalSearchQuery={searchQuery}
            />
          )}

          {activeTab === 'relatorios' && (
            <ReportsView
              quotes={quotes}
              onOpenPdf={handleOpenPdf}
              onDeleteQuote={handleDeleteQuote}
            />
          )}

          {activeTab === 'novo-orcamento' && (
            <NewQuoteView
              initialQuote={currentQuote}
              clients={clients}
              catalog={catalog}
              onSaveQuote={handleSaveQuote}
              onPreviewPdf={handleOpenPdf}
              onSendEmail={handleOpenEmailModal}
              setActiveTab={setActiveTab}
              responsiblePersons={responsiblePersons}
              onOpenServiceOrder={handleOpenServiceOrder}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'visualizar-pdf' && (
            <PdfVisualizerView
              quote={currentQuote}
              onBackToEdit={() => setActiveTab('novo-orcamento')}
              setActiveTab={setActiveTab}
              onSendWhatsapp={handleSendWhatsapp}
              onSendEmail={handleOpenEmailModal}
              onDuplicateQuote={handleDuplicateQuote}
              onOpenServiceOrder={handleOpenServiceOrder}
              responsiblePersons={responsiblePersons}
              currentUser={currentUser}
              onSaveQuote={handleSaveQuote}
            />
          )}

          {activeTab === 'clientes' && (
            <ClientsView
              clients={clients}
              onNewQuoteForClient={handleNewQuoteForClient}
              onEditClient={handleEditClient}
              onDeleteClient={handleDeleteClient}
              onAddClient={handleAddClient}
            />
          )}

          {activeTab === 'produtos-servicos' && (
            <ServicesView
              services={catalog}
              onSaveService={handleSaveCatalogService}
              onDeleteService={handleDeleteCatalogService}
              canEdit={canWrite(currentUser)}
              onSelectServiceForNewQuote={handleSelectServiceForNewQuote}
            />
          )}

          {activeTab === 'configuracoes' && (
            <SettingsView
              responsiblePersons={responsiblePersons}
              onUpdateResponsiblePersons={handleUpdateResponsiblePersons}
              currentUser={currentUser}
              quotes={quotes}
              clients={clients}
              onShowToast={showToast}
              onDataImported={() => loadRemoteData({ silent: true })}
            />
          )}
          </>
          )}
        </main>
      </div>
    </div>
  );
}
