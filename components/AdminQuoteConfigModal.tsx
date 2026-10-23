'use client';

import React, { useState, useEffect } from 'react';
import { Quote } from '@/lib/types';
import { 
  getStoredCompanyProfile, 
  saveStoredCompanyProfile, 
  getStoredQuoteTexts, 
  saveStoredQuoteTexts, 
  resetStoredCompanyProfile, 
  resetStoredQuoteTexts,
  CompanyProfile,
  QuoteTextsConfig,
  DEFAULT_QUOTE_TEXTS
} from '@/lib/company';

interface AdminQuoteConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote?: Quote;
  onApplyToQuote?: (updatedQuote: Quote) => void;
  onShowToast?: (msg: string) => void;
  initialTab?: 'header' | 'texts';
}

const AdminQuoteConfigModalContent: React.FC<Omit<AdminQuoteConfigModalProps, 'isOpen'>> = ({
  onClose,
  quote,
  onApplyToQuote,
  onShowToast,
  initialTab = 'header'
}) => {
  const [activeTab, setActiveTab] = useState<'header' | 'texts'>(initialTab);

  // Perfil da Empresa / Cabeçalho
  const [headerData, setHeaderData] = useState<CompanyProfile>(() => {
    const base = getStoredCompanyProfile();
    if (quote?.headerConfig) {
      return { ...base, ...quote.headerConfig } as CompanyProfile;
    }
    return base;
  });

  // Textos do Orçamento
  const [textsData, setTextsData] = useState<QuoteTextsConfig>(() => {
    const base = getStoredQuoteTexts();
    if (quote?.customTexts) {
      return { ...base, ...quote.customTexts } as QuoteTextsConfig;
    }
    return base;
  });

  // Textos específicos do orçamento (escopo e observações)
  const [scopeSummary, setScopeSummary] = useState<string>(quote?.scopeSummary || '');
  const [observations, setObservations] = useState<string>(quote?.observations || '');

  const handleApplyToCurrentQuote = () => {
    if (!quote || !onApplyToQuote) {
      // Se não houver quote específico, salva globalmente
      handleSaveAsGlobalDefault();
      return;
    }

    const updatedQuote: Quote = {
      ...quote,
      scopeSummary: scopeSummary,
      observations: observations,
      headerConfig: {
        name: headerData.name,
        tradeName: headerData.tradeName,
        cnpj: headerData.cnpj,
        ie: headerData.ie,
        address: headerData.address,
        phone: headerData.phone,
        email: headerData.email,
        bankName: headerData.bankName,
        bankAgency: headerData.bankAgency,
        bankAccount: headerData.bankAccount,
        pixKey: headerData.pixKey,
        technicalResponsible: headerData.technicalResponsible,
        systemVersion: headerData.systemVersion,
        systemHash: headerData.systemHash
      },
      customTexts: {
        documentTitle: textsData.documentTitle,
        documentSubtitle: textsData.documentSubtitle,
        section1Title: textsData.section1Title,
        section2Title: textsData.section2Title,
        taxClause: textsData.taxClause,
        section3Title: textsData.section3Title,
        billingLabel: textsData.billingLabel,
        paymentDataLabel: textsData.paymentDataLabel,
        section4Title: textsData.section4Title,
        esocialClause: textsData.esocialClause,
        artBadge: textsData.artBadge,
        signatureLeftCompany: textsData.signatureLeftCompany,
        signatureLeftRole: textsData.signatureLeftRole,
        signatureLeftDoc: textsData.signatureLeftDoc,
        signatureRightCompany: textsData.signatureRightCompany,
        signatureRightLine: textsData.signatureRightLine,
        footerSystemLabel: textsData.footerSystemLabel,
        footerAuthenticityLabel: textsData.footerAuthenticityLabel,
        defaultScopeIntro: textsData.defaultScopeIntro || ''
      }
    };

    onApplyToQuote(updatedQuote);
    if (onShowToast) {
      onShowToast('Configurações aplicadas ao orçamento com sucesso!');
    }
    onClose();
  };

  const handleSaveAsGlobalDefault = () => {
    saveStoredCompanyProfile(headerData);
    saveStoredQuoteTexts(textsData);

    if (quote && onApplyToQuote) {
      handleApplyToCurrentQuote();
    } else {
      if (onShowToast) {
        onShowToast('Configurações salvas como padrão oficial da empresa!');
      }
      onClose();
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Deseja restaurar todos os textos e cabeçalhos padrão do sistema?')) {
      const resetHeader = resetStoredCompanyProfile();
      const resetTexts = resetStoredQuoteTexts();
      setHeaderData(resetHeader);
      setTextsData(resetTexts);
      if (onShowToast) {
        onShowToast('Padrões restaurados com sucesso.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#cbd5e1] overflow-hidden">
        {/* Header Modal */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#004328] to-[#0a5234] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-[24px] text-emerald-300">admin_panel_settings</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">Painel de Configuração do Orçamento</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-[#004328]">
                  Exclusivo Administrador
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Edite os dados cadastrais do cabeçalho oficial e todos os textos da proposta antes da impressão
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="Fechar"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#e2e8f0] bg-[#f8fafc] px-6 pt-3 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('header')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'header'
                ? 'border-[#004328] text-[#004328]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">view_headline</span>
            <span>1. Cabeçalho de Impressão & Dados da Empresa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('texts')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'texts'
                ? 'border-[#004328] text-[#004328]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">article</span>
            <span>2. Textos, Cláusulas & Termos do Orçamento</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-800">
          {activeTab === 'header' && (
            <div className="space-y-6">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-amber-700 shrink-0 mt-0.5">verified_user</span>
                <div>
                  <strong className="block text-amber-950 font-bold">Controle Administrativo de Cabeçalho</strong>
                  <span>
                    Qualquer alteração feita nestes campos altera diretamente o cabeçalho impresso no documento A4 e no PDF oficial gerado para o cliente.
                  </span>
                </div>
              </div>

              {/* Informações da Empresa no Cabeçalho */}
              <div className="p-5 rounded-2xl border border-[#e2e8f0] bg-white space-y-4">
                <h4 className="font-bold text-sm text-[#004328] flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-[18px]">store</span>
                  <span>Identificação da Emissora no Cabeçalho</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Razão Social Consentra</label>
                    <input
                      type="text"
                      value={headerData.name}
                      onChange={(e) => setHeaderData({ ...headerData, name: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CNPJ</label>
                    <input
                      type="text"
                      value={headerData.cnpj}
                      onChange={(e) => setHeaderData({ ...headerData, cnpj: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Inscrição Estadual (I.E.)</label>
                    <input
                      type="text"
                      value={headerData.ie}
                      onChange={(e) => setHeaderData({ ...headerData, ie: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Endereço da Sede no Cabeçalho</label>
                    <input
                      type="text"
                      value={headerData.address}
                      onChange={(e) => setHeaderData({ ...headerData, address: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Telefone Comercial</label>
                    <input
                      type="text"
                      value={headerData.phone}
                      onChange={(e) => setHeaderData({ ...headerData, phone: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">E-mail Comercial</label>
                    <input
                      type="email"
                      value={headerData.email}
                      onChange={(e) => setHeaderData({ ...headerData, email: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Responsável Técnico no Cabeçalho</label>
                    <input
                      type="text"
                      value={headerData.technicalResponsible}
                      onChange={(e) => setHeaderData({ ...headerData, technicalResponsible: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>
                </div>
              </div>

              {/* Tarja Principal do Orçamento */}
              <div className="p-5 rounded-2xl border border-[#e2e8f0] bg-white space-y-4">
                <h4 className="font-bold text-sm text-[#004328] flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                  <span>Banner de Título do Documento</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Título da Proposta</label>
                    <input
                      type="text"
                      value={textsData.documentTitle}
                      onChange={(e) => setTextsData({ ...textsData, documentTitle: e.target.value })}
                      placeholder="Ex: PROPOSTA TÉCNICA"
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Subtítulo Superior da Tarja</label>
                    <input
                      type="text"
                      value={textsData.documentSubtitle}
                      onChange={(e) => setTextsData({ ...textsData, documentSubtitle: e.target.value })}
                      placeholder="Ex: Documento Oficial de Proposta Comercial & Técnica"
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>
                </div>
              </div>

              {/* Dados Bancários & PIX */}
              <div className="p-5 rounded-2xl border border-[#e2e8f0] bg-white space-y-4">
                <h4 className="font-bold text-sm text-[#004328] flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-[18px]">account_balance</span>
                  <span>Dados Bancários e Chave PIX da Emissora</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Instituição Bancária</label>
                    <input
                      type="text"
                      value={headerData.bankName}
                      onChange={(e) => setHeaderData({ ...headerData, bankName: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Agência</label>
                    <input
                      type="text"
                      value={headerData.bankAgency}
                      onChange={(e) => setHeaderData({ ...headerData, bankAgency: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Conta Corrente</label>
                    <input
                      type="text"
                      value={headerData.bankAccount}
                      onChange={(e) => setHeaderData({ ...headerData, bankAccount: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Chave PIX Oficial</label>
                    <input
                      type="text"
                      value={headerData.pixKey}
                      onChange={(e) => setHeaderData({ ...headerData, pixKey: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'texts' && (
            <div className="space-y-6">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-emerald-700 shrink-0 mt-0.5">edit_note</span>
                <div>
                  <strong className="block text-emerald-950 font-bold">Edição Completa dos Textos do Orçamento</strong>
                  <span>
                    Como administrador, você pode customizar cada título de seção, redação de escopo, cláusula fiscal, termos de eSocial, textos das assinaturas e notas legais.
                  </span>
                </div>
              </div>

              {/* Seção 1: Objeto & Escopo */}
              <div className="p-5 rounded-2xl border border-[#e2e8f0] bg-white space-y-4">
                <h4 className="font-bold text-sm text-[#004328] flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-[18px]">description</span>
                  <span>1. Objeto & Escopo Técnico Geral</span>
                </h4>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Título da Seção 1</label>
                  <input
                    type="text"
                    value={textsData.section1Title}
                    onChange={(e) => setTextsData({ ...textsData, section1Title: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Redação do Escopo Técnico Geral (Texto Completo)
                  </label>
                  <textarea
                    rows={4}
                    value={scopeSummary}
                    onChange={(e) => setScopeSummary(e.target.value)}
                    placeholder="Descrição detalhada do escopo regulatório a ser executado..."
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328] leading-relaxed"
                  />
                </div>
              </div>

              {/* Seção 2: Demonstração de Itens & Tributos */}
              <div className="p-5 rounded-2xl border border-[#e2e8f0] bg-white space-y-4">
                <h4 className="font-bold text-sm text-[#004328] flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-[18px]">table_rows</span>
                  <span>2. Demonstração de Itens, Honorários & Tributos</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Título da Seção 2</label>
                    <input
                      type="text"
                      value={textsData.section2Title}
                      onChange={(e) => setTextsData({ ...textsData, section2Title: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nota de Tributos no Rodapé da Tabela</label>
                    <input
                      type="text"
                      value={textsData.taxClause}
                      onChange={(e) => setTextsData({ ...textsData, taxClause: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Condições Comerciais & Observações */}
              <div className="p-5 rounded-2xl border border-[#e2e8f0] bg-white space-y-4">
                <h4 className="font-bold text-sm text-[#004328] flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  <span>3. Condições Comerciais, Faturamento & Observações</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Título da Seção 3</label>
                    <input
                      type="text"
                      value={textsData.section3Title}
                      onChange={(e) => setTextsData({ ...textsData, section3Title: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Rótulo: Faturamento</label>
                    <input
                      type="text"
                      value={textsData.billingLabel}
                      onChange={(e) => setTextsData({ ...textsData, billingLabel: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Rótulo: Dados Bancários</label>
                    <input
                      type="text"
                      value={textsData.paymentDataLabel}
                      onChange={(e) => setTextsData({ ...textsData, paymentDataLabel: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">
                      Observações Comerciais & Prazos da Proposta
                    </label>
                    <textarea
                      rows={3}
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Observações complementares, prazos de pagamento, etc."
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 4: Conformidade eSocial & ART */}
              <div className="p-5 rounded-2xl border border-[#e2e8f0] bg-white space-y-4">
                <h4 className="font-bold text-sm text-[#004328] flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>4. Conformidade eSocial & Emissão de ART</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">
                      Texto da Cláusula eSocial SST (Eventos S-2220 / S-2240)
                    </label>
                    <textarea
                      rows={2}
                      value={textsData.esocialClause}
                      onChange={(e) => setTextsData({ ...textsData, esocialClause: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Selo / Sigla ART</label>
                    <input
                      type="text"
                      value={textsData.artBadge}
                      onChange={(e) => setTextsData({ ...textsData, artBadge: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>
                </div>
              </div>

              {/* Assinaturas & Rodapé */}
              <div className="p-5 rounded-2xl border border-[#e2e8f0] bg-white space-y-4">
                <h4 className="font-bold text-sm text-[#004328] flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-[18px]">draw</span>
                  <span>Assinaturas das Partes & Rodapé Legal</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                    <span className="font-bold text-[#004328] block">Assinatura Contratada (Consentra)</span>
                    <input
                      type="text"
                      value={textsData.signatureLeftCompany}
                      onChange={(e) => setTextsData({ ...textsData, signatureLeftCompany: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-white border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      value={textsData.signatureLeftRole}
                      onChange={(e) => setTextsData({ ...textsData, signatureLeftRole: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-white border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      value={textsData.signatureLeftDoc}
                      onChange={(e) => setTextsData({ ...textsData, signatureLeftDoc: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-white border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                    <span className="font-bold text-slate-800 block">Assinatura Contratante (Cliente)</span>
                    <input
                      type="text"
                      value={textsData.signatureRightCompany}
                      onChange={(e) => setTextsData({ ...textsData, signatureRightCompany: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-white border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      value={textsData.signatureRightLine}
                      onChange={(e) => setTextsData({ ...textsData, signatureRightLine: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg bg-white border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Texto de Autenticidade do Rodapé</label>
                    <input
                      type="text"
                      value={textsData.footerSystemLabel}
                      onChange={(e) => setTextsData({ ...textsData, footerSystemLabel: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Restaurar Padrões Originais</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveAsGlobalDefault}
              className="px-4 py-2.5 rounded-xl bg-white border-2 border-[#004328] text-[#004328] hover:bg-emerald-50 text-xs font-bold transition-colors"
              title="Salva como padrão da empresa para todos os orçamentos futuros"
            >
              Salvar como Padrão da Empresa
            </button>

            {quote && (
              <button
                type="button"
                onClick={handleApplyToCurrentQuote}
                className="px-5 py-2.5 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-98"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Aplicar a Esta Proposta</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminQuoteConfigModal: React.FC<AdminQuoteConfigModalProps> = (props) => {
  if (!props.isOpen) return null;
  return (
    <AdminQuoteConfigModalContent
      key={`${props.quote?.id || 'new'}-${props.initialTab || 'header'}-${props.isOpen}`}
      {...props}
    />
  );
};
