'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
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
import { getStoredResponsibles, saveStoredResponsibles } from '@/lib/responsibles';
import { AuthUser, getCurrentUser, logoutUser, initAuth, onAuthEvent, isRemoteAuth } from '@/lib/auth';
import { 
  isSupabaseConfigured, 
  fetchQuotesFromSupabase, 
  saveQuoteToSupabase, 
  deleteQuoteFromSupabase, 
  fetchClientsFromSupabase,
  saveClientToSupabase,
  deleteClientFromSupabase
} from '@/lib/supabase';

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const QUOTES_STORAGE_KEY = 'consentra_quotes_data';
const CLIENTS_STORAGE_KEY = 'consentra_clients_data';

export default function HomePage() {
  const isMounted = useIsMounted();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentUser());
  // No modo Supabase a sessão é validada no servidor antes de exibir o sistema
  const [authChecked, setAuthChecked] = useState<boolean>(() => !isRemoteAuth());
  const [recoveryMode, setRecoveryMode] = useState<boolean>(false);
  const [authLinkError, setAuthLinkError] = useState<string | null>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);

  const [quotes, setQuotes] = useState<Quote[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(QUOTES_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_QUOTES;
  });

  const [clients, setClients] = useState<ClientData[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CLIENTS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_CLIENTS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(quotes));
      } catch (e) {}
    }
  }, [quotes]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
      } catch (e) {}
    }
  }, [clients]);

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [currentQuote, setCurrentQuote] = useState<Quote>(DEFAULT_EMPTY_QUOTE); // Initialized safely
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [emailQuoteTarget, setEmailQuoteTarget] = useState<Quote | null>(null);
  const [serviceOrderQuote, setServiceOrderQuote] = useState<Quote | null>(null);
  const [showServiceOrderModal, setShowServiceOrderModal] = useState<boolean>(false);
  const [responsiblePersons, setResponsiblePersons] = useState<string[]>(() => getStoredResponsibles());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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

  // Carrega dados do Supabase (somente com usuário autenticado — RLS exige sessão)
  const currentUserId = currentUser?.id;
  useEffect(() => {
    let isMounted = true;
    async function loadSupabaseData() {
      if (!isSupabaseConfigured() || !currentUserId) return;
      try {
        const [remoteQuotes, remoteClients] = await Promise.all([
          fetchQuotesFromSupabase(),
          fetchClientsFromSupabase()
        ]);
        if (isMounted) {
          if (remoteQuotes && remoteQuotes.length > 0) {
            setQuotes(remoteQuotes);
            setCurrentQuote(remoteQuotes[0]);
          }
          if (remoteClients && remoteClients.length > 0) {
            setClients(remoteClients);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar dados do Supabase:', err);
      }
    }
    loadSupabaseData();
    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

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

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleOpenServiceOrder = (quote: Quote) => {
    setServiceOrderQuote(quote);
    setShowServiceOrderModal(true);
  };

  const handleUpdateResponsiblePersons = (newList: string[]) => {
    setResponsiblePersons(newList);
    saveStoredResponsibles(newList);
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

  const handleStartNewQuote = () => {
    // Check if #319 already in quotes or create next
    const highestNum = quotes.reduce((max, q) => (q.numberOnly > max ? q.numberOnly : max), 318);
    const existingDraft = quotes.find(q => q.numberOnly === 319 && q.status === 'Rascunho');
    
    if (existingDraft) {
      setCurrentQuote(existingDraft);
    } else {
      const nextNum = highestNum + 1;
      const newQuote: Quote = {
        ...DEFAULT_EMPTY_QUOTE,
        id: `${nextNum}`,
        numberOnly: nextNum,
        status: 'Rascunho',
        issueDate: new Date().toLocaleDateString('pt-BR'),
        lastModified: 'Agora',
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        responsibleTech: currentUser?.name || responsiblePersons[0] || getStoredResponsibles()[0] || 'Washington Assis'
      };
      setQuotes([newQuote, ...quotes]);
      setCurrentQuote(newQuote);
    }

    setActiveTab('novo-orcamento');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveQuote = (updatedQuote: Quote) => {
    setQuotes(prev => {
      const exists = prev.some(q => q.id === updatedQuote.id);
      if (exists) {
        return prev.map(q => (q.id === updatedQuote.id ? updatedQuote : q));
      }
      return [updatedQuote, ...prev];
    });
    setCurrentQuote(updatedQuote);
    showToast(`Orçamento ${updatedQuote.id.replace('#', '')} salvo com sucesso!`);

    if (isSupabaseConfigured()) {
      saveQuoteToSupabase(updatedQuote).then((res) => {
        if (!res.success && res.error) {
          console.warn('Supabase save quote error:', res.error);
        }
      });
    }
  };

  const handleDuplicateQuote = (quoteToDup: Quote) => {
    const highestNum = quotes.reduce((max, q) => (q.numberOnly > max ? q.numberOnly : max), 318);
    const nextNum = highestNum + 1;
    const duplicated: Quote = {
      ...quoteToDup,
      id: `${nextNum}`,
      numberOnly: nextNum,
      status: 'Rascunho',
      issueDate: new Date().toLocaleDateString('pt-BR'),
      lastModified: 'Agora (Cópia)'
    };
    setQuotes([duplicated, ...quotes]);
    setCurrentQuote(duplicated);
    showToast(`Orçamento ${nextNum} duplicado a partir de ${quoteToDup.id.replace('#', '')}!`);

    if (isSupabaseConfigured()) {
      saveQuoteToSupabase(duplicated).catch(() => {});
    }
  };

  const handleDeleteQuote = (quoteId: string) => {
    setQuotes(prev => prev.filter(q => q.id !== quoteId));
    showToast(`Orçamento ${quoteId.replace('#', '')} excluído com sucesso.`);

    if (isSupabaseConfigured()) {
      deleteQuoteFromSupabase(quoteId).catch(() => {});
    }
  };

  const handleClearAllQuotes = () => {
    setQuotes([]);
    const emptyQuote: Quote = {
      ...DEFAULT_EMPTY_QUOTE,
      id: '1',
      numberOnly: 1,
      status: 'Rascunho',
      issueDate: new Date().toLocaleDateString('pt-BR'),
      lastModified: 'Agora',
      clientId: '',
      clientName: '',
      cnpj: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      operationalAddress: '',
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      responsibleTech: currentUser?.name || responsiblePersons[0] || 'Washington Assis'
    };
    setCurrentQuote(emptyQuote);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('consentra_quotes_data');
    }
    showToast('Todos os orçamentos foram apagados com sucesso. O sistema foi zerado!');
  };

  const handleAddClient = (newClient: ClientData) => {
    setClients(prev => [newClient, ...prev]);
    showToast(`Cliente "${newClient.name}" cadastrado com sucesso.`);

    if (isSupabaseConfigured()) {
      saveClientToSupabase(newClient).catch(() => {});
    }
  };

  const handleEditClient = (updatedClient: ClientData) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    showToast(`Dados do cliente "${updatedClient.name}" atualizados com sucesso.`);

    if (isSupabaseConfigured()) {
      saveClientToSupabase(updatedClient).catch(() => {});
    }
  };

  const handleDeleteClient = (clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
    showToast(`Cliente removido com sucesso.`);

    if (isSupabaseConfigured()) {
      deleteClientFromSupabase(clientId).catch(() => {});
    }
  };

  const handleUpdateQuoteStatus = (quoteId: string, newStatus: QuoteStatus) => {
    setQuotes(prev =>
      prev.map(q => (q.id === quoteId ? { ...q, status: newStatus } : q))
    );
    showToast(`Status do orçamento ${quoteId.replace('#', '')} atualizado para ${newStatus}!`);
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
    const highestNum = quotes.reduce((max, q) => (q.numberOnly > max ? q.numberOnly : max), 318);
    const nextNum = highestNum + 1;
    const newQuote: Quote = {
      ...DEFAULT_EMPTY_QUOTE,
      id: `${nextNum}`,
      numberOnly: nextNum,
      clientId: client.id,
      clientName: client.name,
      cnpj: client.cnpj,
      ie: client.ie,
      contactPerson: client.contactName,
      contactEmail: client.email,
      contactPhone: client.phone,
      operationalAddress: client.address,
      riskGrade: client.riskGrade,
      status: 'Rascunho',
      issueDate: new Date().toLocaleDateString('pt-BR'),
    };
    setQuotes([newQuote, ...quotes]);
    setCurrentQuote(newQuote);
    setActiveTab('novo-orcamento');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Iniciando novo orçamento ${nextNum} para ${client.name}!`);
  };

  const handleSelectServiceForNewQuote = (service: CatalogService) => {
    // Add service to current quote or create new quote
    const updatedItems = [
      ...currentQuote.items,
      {
        id: `item-${Date.now()}`,
        itemNumber: currentQuote.items.length + 1,
        title: service.title,
        description: service.description,
        unit: service.unit,
        quantity: 1,
        unitPrice: service.suggestedPrice,
        totalPrice: service.suggestedPrice
      }
    ];
    const subtotal = updatedItems.reduce((acc, it) => acc + it.totalPrice, 0);
    const total = Math.max(subtotal - currentQuote.discount, 0);
    const installmentValue = currentQuote.installments > 0 ? total / currentQuote.installments : total;

    const updated: Quote = {
      ...currentQuote,
      items: updatedItems,
      subtotal,
      total,
      installmentValue,
      regulatoryScope: Array.from(new Set([...currentQuote.regulatoryScope, service.nrCategory]))
    };

    setCurrentQuote(updated);
    setQuotes(prev => prev.map(q => (q.id === updated.id ? updated : q)));
    setActiveTab('novo-orcamento');
    showToast(`Serviço "${service.title}" incluído no orçamento ${updated.id}!`);
  };

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
        {toastMessage && (
          <div
            id="toastNotification"
            className="fixed bottom-6 right-6 z-50 bg-[#004328] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-[#a9f3c5]/30 text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-300"
          >
            <span className="material-symbols-outlined text-[20px] text-[#a9f3c5]">
              check_circle
            </span>
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-white/70 hover:text-white ml-2"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}
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
      {toastMessage && (
        <div
          id="toastNotification"
          className="fixed bottom-6 right-6 z-50 bg-[#004328] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-[#a9f3c5]/30 text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <span className="material-symbols-outlined text-[20px] text-[#a9f3c5]">
            check_circle
          </span>
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/70 hover:text-white ml-2"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

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
              onClearAllQuotes={handleClearAllQuotes}
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
              onClearAllQuotes={handleClearAllQuotes}
            />
          )}
        </main>
      </div>
    </div>
  );
}
