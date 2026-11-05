'use client';

import React, { useState } from 'react';
import { Sidebar, TabType } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DashboardView } from '@/components/DashboardView';
import { QuotesView } from '@/components/QuotesView';
import { NewQuoteView } from '@/components/NewQuoteView';
import { PdfVisualizerView } from '@/components/PdfVisualizerView';
import { ClientsView } from '@/components/ClientsView';
import { ServicesView } from '@/components/ServicesView';
import { SettingsView } from '@/components/SettingsView';
import { EmailModal, EmailSentInfo } from '@/components/EmailModal';
import { QuoteHistoryModal } from '@/components/quote/QuoteHistoryModal';
import { ServiceOrderModal } from '@/components/ServiceOrderModal';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { ReportsView } from '@/components/ReportsView';
import { useToast } from '@/components/ui/ToastProvider';
import { useAppData, FIRST_QUOTE_NUMBER } from '@/lib/store/AppDataContext';
import { Quote, QuoteStatus, ClientData, CatalogService } from '@/lib/types';
import { DEFAULT_EMPTY_QUOTE } from '@/lib/mock-data';
import { appendItem } from '@/lib/quote-calc';

interface WorkspaceProps {
  onLogout: () => void;
}

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

/**
 * Área autenticada: navegação entre abas, orçamento em edição e modais.
 * Dados e gravação vêm do store (`useAppData`).
 */
export function Workspace({ onLogout }: WorkspaceProps) {
  const store = useAppData();
  const showToast = useToast();
  const { user: currentUser, quotes, clients, catalog, responsiblePersons, status } = store;

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [currentQuote, setCurrentQuote] = useState<Quote>(DEFAULT_EMPTY_QUOTE);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [emailQuoteTarget, setEmailQuoteTarget] = useState<Quote | null>(null);
  const [serviceOrderQuote, setServiceOrderQuote] = useState<Quote | null>(null);
  const [historyQuote, setHistoryQuote] = useState<Quote | null>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const openQuote = (quote: Quote, tab: TabType) => {
    setCurrentQuote(quote);
    setActiveTab(tab);
    scrollTop();
  };

  const handleOpenPdf = (quote: Quote) => openQuote(quote, 'visualizar-pdf');
  const handleEditQuote = (quote: Quote) => openQuote(quote, 'novo-orcamento');

  // Rascunhos novos só entram na lista (e na base) quando forem salvos.
  const handleStartNewQuote = () => {
    if (!store.ensureCanWrite()) return;
    openQuote(store.makeDraftQuote(), 'novo-orcamento');
  };

  const handleSaveQuote = async (quote: Quote): Promise<Quote | null> => {
    const saved = await store.saveQuote(quote);
    if (saved) setCurrentQuote(saved);
    return saved;
  };

  const handleDuplicateQuote = async (quote: Quote) => {
    const saved = await store.duplicateQuote(quote);
    if (saved) setCurrentQuote(saved);
  };

  const handleUpdateQuoteStatus = async (quoteId: string, newStatus: QuoteStatus) => {
    const saved = await store.updateQuoteStatus(quoteId, newStatus);
    if (saved && currentQuote.id === quoteId) setCurrentQuote(saved);
  };

  const handleDeleteQuote = async (quoteId: string) => {
    await store.deleteQuote(quoteId);
  };

  const handleClearAllQuotes = async (confirmation: string): Promise<boolean> => {
    const ok = await store.clearAllQuotes(confirmation);
    if (ok) setCurrentQuote(store.makeDraftQuote({ id: `${FIRST_QUOTE_NUMBER}`, numberOnly: FIRST_QUOTE_NUMBER }));
    return ok;
  };

  const handleNewQuoteForClient = (client: ClientData) => {
    if (!store.ensureCanWrite()) return;
    openQuote(
      store.makeDraftQuote({
        clientId: client.id,
        clientName: client.name,
        cnpj: client.cnpj,
        ie: client.ie,
        contactPerson: client.contactName,
        contactEmail: client.email,
        contactPhone: client.phone,
        operationalAddress: client.address,
        riskGrade: client.riskGrade,
      }),
      'novo-orcamento'
    );
    showToast(`Iniciando novo orçamento para ${client.name}!`);
  };

  const handleSelectServiceForNewQuote = async (service: CatalogService) => {
    if (!store.ensureCanWrite()) return;
    const isSaved = quotes.some((q) => q.id === currentQuote.id);
    // Sem orçamento em edição: começa um rascunho novo
    const base = isSaved || currentQuote.id !== DEFAULT_EMPTY_QUOTE.id ? currentQuote : store.makeDraftQuote();
    const updated = appendItem(
      base,
      {
        title: service.title,
        description: service.description,
        unit: service.unit,
        unitPrice: service.suggestedPrice,
        nrCategory: service.nrCategory,
      },
      `item-${Date.now()}`
    );

    if (isSaved) {
      // Orçamento já salvo: grava a inclusão do item imediatamente
      const saved = await store.persistQuote(updated);
      if (!saved) return;
      setCurrentQuote(saved);
    } else {
      setCurrentQuote(updated);
    }
    setActiveTab('novo-orcamento');
    showToast(`Serviço "${service.title}" incluído no orçamento ${String(updated.id).replace('#', '')}!`);
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

  const isSavedQuote = (quote: Quote) => quotes.some((q) => q.id === quote.id);

  // O e-mail fica registrado no histórico do orçamento: exige orçamento salvo
  const handleOpenEmailModal = (quote: Quote) => {
    if (!isSavedQuote(quote)) {
      showToast('Salve o orçamento antes de enviá-lo por e-mail.', 'error');
      return;
    }
    setEmailQuoteTarget(quote);
  };

  const handleEmailSent = async (quote: Quote, info: EmailSentInfo) => {
    const num = String(quote.numberOnly || quote.id).replace('#', '');
    if (info.markAsSent) await handleUpdateQuoteStatus(quote.id, 'Enviado');
    showToast(
      info.automatic
        ? `Proposta Nº ${num} enviada para ${info.to.join(', ')}.`
        : `PDF da proposta Nº ${num} baixado. Anexe-o no seu aplicativo de e-mail.`
    );
  };

  const handleShowHistory = (quote: Quote) => setHistoryQuote(quote);

  // Clique numa notificação: abre o orçamento correspondente
  const handleOpenQuoteById = (quoteId: string) => {
    const quote = quotes.find((q) => q.id === quoteId);
    if (quote) handleEditQuote(quote);
    else showToast('Orçamento não encontrado (pode ter sido excluído).', 'error');
  };
  const handleOpenServiceOrder = (quote: Quote) => setServiceOrderQuote(quote);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      {emailQuoteTarget && (
        <EmailModal
          key={emailQuoteTarget.id}
          quote={emailQuoteTarget}
          onClose={() => setEmailQuoteTarget(null)}
          onSent={(info) => void handleEmailSent(emailQuoteTarget, info)}
        />
      )}

      {historyQuote && (
        <QuoteHistoryModal key={historyQuote.id} quote={historyQuote} onClose={() => setHistoryQuote(null)} />
      )}

      <ServiceOrderModal
        quote={serviceOrderQuote}
        isOpen={serviceOrderQuote !== null}
        onClose={() => setServiceOrderQuote(null)}
        responsiblePersons={responsiblePersons}
      />

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        currentUser={currentUser}
        onSuccess={(msg) => showToast(msg)}
      />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        quotesCount={quotes.length}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        currentUser={currentUser}
        onLogout={onLogout}
      />

      {/* Conteúdo principal (deslocado pela largura da sidebar em telas lg).
          O id `main-content` é usado pelo CSS de impressão para ocultar toda a
          tela quando a Ordem de Serviço está aberta (só a O.S. deve imprimir). */}
      <div id="main-content" className="lg:pl-72 flex flex-col min-h-screen">
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setActiveTab={setActiveTab}
          onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)}
          currentUser={currentUser}
          onLogout={onLogout}
          onOpenChangePassword={() => setShowChangePasswordModal(true)}
          quotes={quotes}
          onOpenQuote={handleOpenQuoteById}
        />

        <main className="flex-1 p-4 sm:p-8 pt-20 sm:pt-22">
          {!store.isRemote && (
            <div
              role="alert"
              className="no-print max-w-7xl mx-auto mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5"
            >
              <span className="material-symbols-outlined text-[18px] shrink-0">warning</span>
              <span>
                <strong>Modo local (demonstração):</strong> o servidor (Supabase) não está configurado neste
                endereço, então orçamentos, clientes, serviços, logotipo e configurações ficam salvos{' '}
                <strong>apenas neste navegador</strong> — somem em outro aparelho/navegador ou ao limpar os dados
                do navegador. Para uso real da equipe, publique com{' '}
                <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> e{' '}
                <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (README → “Publicar na Vercel”).
              </span>
            </div>
          )}
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-9 h-9 border-4 border-[#004328] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold text-[#004328]">
                {store.isRemote ? 'Carregando dados do servidor...' : 'Carregando dados...'}
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="max-w-lg mx-auto mt-16 p-6 bg-white rounded-2xl border border-red-200 shadow-sm flex flex-col items-center text-center gap-3">
              <span className="material-symbols-outlined text-[36px] text-[#ba1a1a]">cloud_off</span>
              <h2 className="font-bold text-sm text-[#0b1c30]">Não foi possível carregar os dados</h2>
              <p className="text-xs text-[#49607e]">{store.error || 'Erro ao comunicar com o servidor.'}</p>
              <button
                type="button"
                onClick={() => void store.reload()}
                className="mt-1 px-4 py-2 rounded-xl bg-[#004328] text-white text-xs font-semibold hover:bg-[#0a5234] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Tentar novamente
              </button>
            </div>
          )}

          {status === 'ready' && (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  quotes={quotes}
                  setActiveTab={setActiveTab}
                  onOpenPdf={handleOpenPdf}
                  onStartNewQuote={handleStartNewQuote}
                  onSendWhatsapp={handleSendWhatsapp}
                  onSendEmail={handleOpenEmailModal}
                  responsiblePersons={responsiblePersons}
                />
              )}

              {activeTab === 'orcamentos' && (
                <QuotesView
                  quotes={quotes}
                  onOpenPdf={handleOpenPdf}
                  onEditQuote={handleEditQuote}
                  onDuplicateQuote={handleDuplicateQuote}
                  onDeleteQuote={handleDeleteQuote}
                  onClearAllQuotes={store.isAdmin ? handleClearAllQuotes : undefined}
                  onUpdateQuoteStatus={handleUpdateQuoteStatus}
                  onSendWhatsapp={handleSendWhatsapp}
                  onSendEmail={handleOpenEmailModal}
                  onStartNewQuote={handleStartNewQuote}
                  responsiblePersons={responsiblePersons}
                  onOpenServiceOrder={handleOpenServiceOrder}
                  onShowHistory={handleShowHistory}
                  globalSearchQuery={searchQuery}
                />
              )}

              {activeTab === 'relatorios' && (
                <ReportsView
                  quotes={quotes}
                  onOpenPdf={handleOpenPdf}
                  onDeleteQuote={handleDeleteQuote}
                  responsiblePersons={responsiblePersons}
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
                  onShowHistory={isSavedQuote(currentQuote) ? handleShowHistory : undefined}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'visualizar-pdf' && (
                <PdfVisualizerView
                  quote={currentQuote}
                  onBackToEdit={() => setActiveTab('novo-orcamento')}
                  onSendWhatsapp={handleSendWhatsapp}
                  onSendEmail={handleOpenEmailModal}
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
                  onEditClient={store.editClient}
                  onDeleteClient={store.deleteClient}
                  onAddClient={store.addClient}
                />
              )}

              {activeTab === 'produtos-servicos' && (
                <ServicesView
                  services={catalog}
                  onSaveService={store.saveService}
                  onDeleteService={store.deleteService}
                  canEdit={store.canWrite}
                  onSelectServiceForNewQuote={handleSelectServiceForNewQuote}
                />
              )}

              {activeTab === 'configuracoes' && (
                <SettingsView
                  responsiblePersons={responsiblePersons}
                  onUpdateResponsiblePersons={store.setResponsiblePersons}
                  currentUser={currentUser}
                  onDataImported={() => store.reload({ silent: true })}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
