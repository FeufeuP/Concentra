'use client';

import React, { useState, useEffect } from 'react';
import { Quote, QuoteItem, ClientData, QuoteStatus, CatalogService } from '@/lib/types';
import { DEFAULT_EMPTY_QUOTE } from '@/lib/mock-data';
import { 
  CASCADING_STATUS_LIST, 
  CASCADING_MACRO_CATEGORIES, 
  DEMAND_ORIGINS, 
  PRIORITY_LEVELS, 
} from '@/lib/classification-data';
import { getStoredResponsibles } from '@/lib/responsibles';
import { downloadQuotePdf } from '@/lib/pdf-generator';
import { TabType } from './Sidebar';
import { AuthUser, getCurrentUser, isAdminUser } from '@/lib/auth';
import { AdminQuoteConfigModal } from './AdminQuoteConfigModal';
import { getTodayFormatted, maskPhoneBR, calculateValidityDate } from '@/lib/masks';

interface NewQuoteViewProps {
  initialQuote: Quote;
  clients: ClientData[];
  /** Catálogo de serviços persistido (Supabase ou localStorage). */
  catalog: CatalogService[];
  /** Salva o orçamento; devolve a versão salva (com número definitivo) ou null se falhar. */
  onSaveQuote: (quote: Quote) => Promise<Quote | null>;
  onPreviewPdf: (quote: Quote) => void;
  onSendEmail: (quote: Quote) => void;
  setActiveTab: (tab: TabType) => void;
  responsiblePersons?: string[];
  onOpenServiceOrder?: (quote: Quote) => void;
  currentUser?: AuthUser | null;
}

let nextItemId = 1000;
function generateItemId(prefix = 'item'): string {
  nextItemId += 1;
  return `${prefix}-${nextItemId}`;
}

export const NewQuoteView: React.FC<NewQuoteViewProps> = ({
  initialQuote,
  clients = [],
  catalog = [],
  onSaveQuote,
  onPreviewPdf,
  onSendEmail,
  setActiveTab,
  responsiblePersons,
  onOpenServiceOrder,
  currentUser,
}) => {
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminModalTab, setAdminModalTab] = useState<'header' | 'texts'>('header');
  const [adminToast, setAdminToast] = useState<string | null>(null);

  const isAdmin = isAdminUser(currentUser || getCurrentUser());
  const activeCatalog = catalog.filter((serv) => serv.status !== 'Inativo');

  // Lista dinâmica de responsáveis vinculada a Configurações (Item 4)
  const [responsiblesList, setResponsiblesList] = useState<string[]>(() => {
    if (responsiblePersons && responsiblePersons.length > 0) return responsiblePersons;
    return getStoredResponsibles();
  });

  const [quote, setQuote] = useState<Quote>(() => {
    const base = initialQuote || DEFAULT_EMPTY_QUOTE;
    const defaultResp = base.responsibleTech || (currentUser?.name ? `${currentUser.name} (${currentUser.role || 'Responsável'})` : (responsiblePersons && responsiblePersons[0]) || getStoredResponsibles()[0] || 'Washington Assis');
    const todayStr = getTodayFormatted();
    const issueDate = base.issueDate || todayStr;
    const validityDays = base.validityDays || 15;
    const validityDate = base.validityDate || calculateValidityDate(issueDate, validityDays);

    return {
      ...DEFAULT_EMPTY_QUOTE,
      ...base,
      id: String(base.id || base.numberOnly || '320'),
      numberOnly: base.numberOnly || 320,
      issueDate,
      validityDays,
      validityDate,
      items: Array.isArray(base.items) ? [...base.items] : [],
      regulatoryScope: Array.isArray(base.regulatoryScope) ? [...base.regulatoryScope] : [],
      responsibleTech: defaultResp,
      executionForecast: base.executionForecast || 'A COMBINAR'
    };
  });

  const [selectedClient, setSelectedClient] = useState<ClientData | null>(() => {
    if (!clients || clients.length === 0) return null;
    return clients.find((c) => c.id === quote.clientId) || clients[0] || null;
  });
  const [showCatalogModal, setShowCatalogModal] = useState(false);

  const [prevQuoteId, setPrevQuoteId] = useState(initialQuote?.id);

  if (initialQuote?.id && initialQuote.id !== prevQuoteId) {
    setPrevQuoteId(initialQuote.id);
    const defaultResp = initialQuote.responsibleTech || (currentUser?.name ? `${currentUser.name} (${currentUser.role || 'Responsável'})` : (responsiblePersons && responsiblePersons[0]) || getStoredResponsibles()[0] || 'Washington Assis');
    const todayStr = getTodayFormatted();
    const issueDate = initialQuote.issueDate || todayStr;
    const validityDays = initialQuote.validityDays || 15;
    const validityDate = initialQuote.validityDate || calculateValidityDate(issueDate, validityDays);

    setQuote({
      ...DEFAULT_EMPTY_QUOTE,
      ...initialQuote,
      id: String(initialQuote.id || initialQuote.numberOnly || '320'),
      numberOnly: initialQuote.numberOnly || 320,
      issueDate,
      validityDays,
      validityDate,
      items: Array.isArray(initialQuote.items) ? [...initialQuote.items] : [],
      regulatoryScope: Array.isArray(initialQuote.regulatoryScope) ? [...initialQuote.regulatoryScope] : [],
      responsibleTech: defaultResp,
      executionForecast: initialQuote.executionForecast || 'A COMBINAR'
    });
    const found = (clients || []).find((c) => c.id === initialQuote.clientId) || (clients && clients[0]) || null;
    setSelectedClient(found);
  }

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail && Array.isArray(custom.detail)) {
        setResponsiblesList(custom.detail);
      }
    };
    window.addEventListener('consentra_responsibles_updated', handleUpdate);
    return () => window.removeEventListener('consentra_responsibles_updated', handleUpdate);
  }, []);

  // Recalculate totals
  const updateQuoteTotals = (items: QuoteItem[], discountValue: number, installmentsCount: number) => {
    const subtotal = items.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);
    const total = Math.max(subtotal - discountValue, 0);
    const installmentValue = installmentsCount > 0 ? total / installmentsCount : total;

    setQuote(prev => ({
      ...prev,
      items,
      subtotal,
      discount: discountValue,
      total,
      installments: installmentsCount,
      installmentValue
    }));
  };

  const handleClientChange = (clientId: string) => {
    if (!clientId) {
      setSelectedClient(null);
      return;
    }
    const found = (clients || []).find(c => c.id === clientId);
    if (!found) return;
    setSelectedClient(found);
    setQuote(prev => ({
      ...prev,
      clientId: found.id,
      clientName: found.name,
      cnpj: found.cnpj,
      ie: found.ie || '',
      contactPerson: `${found.contactName || ''} (${found.contactRole || 'Contato'})`,
      contactEmail: found.email || '',
      contactPhone: found.phone || '',
      operationalAddress: found.address || '',
      riskGrade: found.riskGrade || 'Grau de Risco 2'
    }));
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    const currentItems = quote.items || [];
    const newItems = currentItems.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(item.quantity + delta, 1);
        return {
          ...item,
          quantity: newQty,
          totalPrice: newQty * item.unitPrice
        };
      }
      return item;
    });
    updateQuoteTotals(newItems, quote.discount || 0, quote.installments || 1);
  };

  const handlePriceChange = (itemId: string, price: number) => {
    const safePrice = Math.max(price, 0);
    const currentItems = quote.items || [];
    const newItems = currentItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          unitPrice: safePrice,
          totalPrice: item.quantity * safePrice
        };
      }
      return item;
    });
    updateQuoteTotals(newItems, quote.discount || 0, quote.installments || 1);
  };

  const handleRemoveItem = (itemId: string) => {
    const currentItems = quote.items || [];
    if (currentItems.length <= 1) {
      alert('O orçamento deve conter no mínimo 1 item técnico.');
      return;
    }
    const newItems = currentItems.filter(i => i.id !== itemId).map((it, idx) => ({
      ...it,
      itemNumber: idx + 1
    }));
    updateQuoteTotals(newItems, quote.discount || 0, quote.installments || 1);
  };

  const handleDuplicateItem = (item: QuoteItem) => {
    const currentItems = quote.items || [];
    const duplicated: QuoteItem = {
      ...item,
      id: generateItemId('item'),
      itemNumber: currentItems.length + 1,
      title: `${item.title} (Cópia)`
    };
    const newItems = [...currentItems, duplicated];
    updateQuoteTotals(newItems, quote.discount || 0, quote.installments || 1);
  };

  const handleAddCatalogItem = (service: CatalogService) => {
    const currentItems = quote.items || [];
    const newItem: QuoteItem = {
      id: generateItemId('item'),
      itemNumber: currentItems.length + 1,
      title: service.title,
      description: service.description,
      unit: service.unit,
      quantity: 1,
      unitPrice: service.suggestedPrice,
      totalPrice: service.suggestedPrice
    };
    const newItems = [...currentItems, newItem];
    const newRegulatory = Array.from(new Set([...(quote.regulatoryScope || []), service.nrCategory]));
    setQuote(prev => ({ ...prev, regulatoryScope: newRegulatory }));
    updateQuoteTotals(newItems, quote.discount || 0, quote.installments || 1);
    setShowCatalogModal(false);
  };

  const handleQuickAddService = (title: string, desc: string, unit: string, price: number, nrTag: string) => {
    const currentItems = quote.items || [];
    const newItem: QuoteItem = {
      id: generateItemId('item'),
      itemNumber: currentItems.length + 1,
      title,
      description: desc,
      unit,
      quantity: 1,
      unitPrice: price,
      totalPrice: price
    };
    const newItems = [...currentItems, newItem];
    const newRegulatory = Array.from(new Set([...(quote.regulatoryScope || []), nrTag]));
    setQuote(prev => ({ ...prev, regulatoryScope: newRegulatory }));
    updateQuoteTotals(newItems, quote.discount || 0, quote.installments || 1);
  };

  const handleDiscountChange = (val: number) => {
    updateQuoteTotals(quote.items || [], val, quote.installments || 1);
  };

  const handlePaymentConditionSelect = (label: string, installments: number) => {
    setQuote(prev => ({
      ...prev,
      paymentCondition: label,
      installments
    }));
    updateQuoteTotals(quote.items || [], quote.discount || 0, installments);
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveProgress, setSaveProgress] = useState<number>(0);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  const getEffectiveResponsible = () => {
    return quote.responsibleTech || 
      (currentUser?.name ? `${currentUser.name} (${currentUser.role || 'Responsável'})` : responsiblesList[0] || 'Washington Assis');
  };

  const triggerSaveWithProgress = async (callback?: (saved: Quote) => void | Promise<void>) => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveProgress(20);
    const currentResp = getEffectiveResponsible();
    const quoteToSave = { ...quote, responsibleTech: currentResp };
    setQuote(quoteToSave);

    setSaveProgress(65);
    const saved = await onSaveQuote(quoteToSave);
    if (!saved) {
      // Falha: a página já exibiu o erro; mantém as alterações no formulário
      setIsSaving(false);
      setSaveProgress(0);
      return;
    }
    setQuote(saved);

    setSaveProgress(100);
    setSaveSuccess(true);

    setTimeout(() => {
      setIsSaving(false);
      setSaveProgress(0);
      setSaveSuccess(false);
      if (callback) void callback(saved);
    }, 450);
  };

  const handleSaveDraft = () => {
    triggerSaveWithProgress();
  };

  const handleGeneratePdf = () => {
    triggerSaveWithProgress(async (saved) => {
      await downloadQuotePdf(saved);
      onPreviewPdf(saved);
    });
  };

  const handleDownloadDirect = async () => {
    setIsDownloadingPdf(true);
    const currentResp = getEffectiveResponsible();
    const quoteToSave = { ...quote, responsibleTech: currentResp };
    setQuote(quoteToSave);
    const saved = await onSaveQuote(quoteToSave);
    if (saved) {
      setQuote(saved);
      await downloadQuotePdf(saved);
    }
    setIsDownloadingPdf(false);
  };

  // Cascading classification calculations
  const activeMacro = CASCADING_MACRO_CATEGORIES.find(m => m.name === quote.macroCategory) || CASCADING_MACRO_CATEGORIES[0];
  const activeStatusDef = CASCADING_STATUS_LIST.find(s => s.status === quote.status) || CASCADING_STATUS_LIST[0];

  const handleStatusChange = (newStatus: QuoteStatus) => {
    const statusDef = CASCADING_STATUS_LIST.find(s => s.status === newStatus);
    const defaultSubStage = statusDef?.subStages[0]?.name || '';
    setQuote(prev => ({
      ...prev,
      status: newStatus,
      statusSubStage: defaultSubStage
    }));
  };

  const handleStatusSubStageChange = (subStage: string) => {
    setQuote(prev => ({ ...prev, statusSubStage: subStage }));
  };

  const handleMacroCategoryChange = (macroName: string) => {
    const macro = CASCADING_MACRO_CATEGORIES.find(m => m.name === macroName);
    const defaultSub = macro?.subcategories[0]?.name || '';
    setQuote(prev => ({
      ...prev,
      macroCategory: macroName,
      subCategory: defaultSub
    }));
  };

  const handleSubCategoryChange = (subName: string) => {
    setQuote(prev => {
      const macro = CASCADING_MACRO_CATEGORIES.find(m => m.name === (prev.macroCategory || CASCADING_MACRO_CATEGORIES[0].name));
      const sub = macro?.subcategories.find(s => s.name === subName);
      let newRegulatory = prev.regulatoryScope || [];
      if (sub && !newRegulatory.includes(sub.nrCode)) {
        newRegulatory = [...newRegulatory, sub.nrCode];
      }
      return {
        ...prev,
        subCategory: subName,
        regulatoryScope: newRegulatory
      };
    });
  };

  const handleApplySubCategoryScope = () => {
    const macro = CASCADING_MACRO_CATEGORIES.find(m => m.name === quote.macroCategory);
    const sub = macro?.subcategories.find(s => s.name === quote.subCategory);
    if (!sub) return;

    const textToInsert = `[Escopo Vinculado - ${sub.nrCode}]: ${sub.name}. ${sub.defaultScope}`;
    setQuote(prev => ({
      ...prev,
      scopeSummary: prev.scopeSummary ? `${prev.scopeSummary}\n• ${textToInsert}` : `• ${textToInsert}`
    }));
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Top Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#e5eeff]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('orcamentos')}
            className="p-2 rounded-xl bg-white border border-[#e5eeff] hover:bg-[#eff4ff] text-[#49607e] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg text-[#004328]">{String(quote?.id || quote?.numberOnly || '').replace('#', '')}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${activeStatusDef.badgeBg} ${activeStatusDef.badgeText}`}>
                {quote.status}
              </span>
              {quote.statusSubStage && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#f0f4f8] text-[#49607e] border border-[#e2e8f0]">
                  {quote.statusSubStage}
                </span>
              )}
            </div>
            <p className="text-xs text-[#49607e]">Elaboração Técnica & Proposta Comercial de SST</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {quote.status === 'Aprovado' && onOpenServiceOrder && (
            <button
              onClick={() => onOpenServiceOrder(quote)}
              className="px-3.5 py-2 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              title="Gerar Ordem de Serviço sem valores do orçamento"
            >
              <span className="material-symbols-outlined text-[16px]">assignment</span>
              <span>Gerar Ordem de Serviços</span>
            </button>
          )}

          <button
            onClick={handleSaveDraft}
            className="px-4 py-2 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-xs font-semibold hover:bg-[#eff4ff] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px] text-[#49607e]">save</span>
            <span>Salvar Rascunho</span>
          </button>

          {/* Botões exclusivos do Administrador para editar cabeçalho e todos os textos antes de gerar ou imprimir */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-amber-50 p-1 rounded-2xl border border-amber-300 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setAdminModalTab('header');
                  setShowAdminModal(true);
                }}
                title="Configurar cabeçalho da proposta antes de gerar ou imprimir (Exclusivo Administrador)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all active:scale-98"
              >
                <span className="material-symbols-outlined text-[16px]">view_headline</span>
                <span>Editar Cabeçalho (Admin)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdminModalTab('texts');
                  setShowAdminModal(true);
                }}
                title="Editar todos os textos do orçamento antes de gerar ou imprimir (Exclusivo Administrador)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold shadow-xs transition-all active:scale-98"
              >
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                <span>Editar Textos (Admin)</span>
              </button>
            </div>
          )}

          <button
            onClick={() => onPreviewPdf(quote)}
            className="px-4 py-2 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] text-xs font-semibold transition-colors flex items-center gap-1.5 border border-[#c4dcff]/50"
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            <span>Visualizar PDF</span>
          </button>

          <button
            onClick={handleDownloadDirect}
            disabled={isDownloadingPdf}
            className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#004328] border border-emerald-300 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${isDownloadingPdf ? 'animate-spin' : ''}`}>
              {isDownloadingPdf ? 'sync' : 'download'}
            </span>
            <span>{isDownloadingPdf ? 'Baixando...' : 'Baixar PDF'}</span>
          </button>

          <button
            onClick={handleGeneratePdf}
            className="px-4 py-2 rounded-xl bg-[#004328] text-white text-xs font-semibold hover:bg-[#005c3e] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            <span>Salvar e Gerar PDF</span>
          </button>
        </div>
      </div>

      {adminToast && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#004328] text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{adminToast}</span>
          </div>
          <button
            onClick={() => setAdminToast(null)}
            className="text-[#004328] hover:opacity-75"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Two Column Layout: Left Form (8 cols) and Right Summary Inspector (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Banner de permissão de Administrador */}
          {isAdmin && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-[#0b1c30] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#0b1c30] flex items-center gap-1.5">
                    <span>Controles Exclusivos do Administrador</span>
                    <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Admin Ativo</span>
                  </h4>
                  <p className="text-[11px] text-[#49607e]">
                    Você pode personalizar os dados do cabeçalho da proposta e editar todos os textos e cláusulas antes de gerar ou imprimir o orçamento.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAdminModalTab('header');
                    setShowAdminModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">view_headline</span>
                  <span>Cabeçalho</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminModalTab('texts');
                    setShowAdminModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[15px]">edit_note</span>
                  <span>Editar Todos os Textos</span>
                </button>
              </div>
            </div>
          )}
          {/* Section 0: Menu 1 - 1.1 Status Atual do Orçamento e 1.2 Responsável Técnico */}
          <div className="p-6 rounded-2xl bg-white border-2 border-[#004328]/20 shadow-[0_2px_8px_rgba(0,67,40,0.06)] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
              <div className="flex items-center gap-2 text-[#004328]">
                <span className="material-symbols-outlined text-[22px]">tune</span>
                <div>
                  <h3 className="font-bold text-sm text-[#0b1c30]">
                    Menu 1: Status Atual do Orçamento & Responsável Técnico
                  </h3>
                  <p className="text-[11px] text-[#49607e]">
                    Estágio do orçamento e responsável técnico vinculado às pessoas cadastradas em Configurações.
                  </p>
                </div>
              </div>

              {quote.status === 'Aprovado' && onOpenServiceOrder && (
                <button
                  type="button"
                  onClick={() => onOpenServiceOrder(quote)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">assignment</span>
                  <span>Gerar Ordem de Serviços</span>
                </button>
              )}
            </div>

            {/* Menu 1: Apenas 1.1 Status Atual do Orçamento e 1.2 Responsável Técnico */}
            <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1.1 Status Atual do Orçamento */}
                <div>
                  <label className="block text-[11px] font-bold text-[#004328] mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">flag</span>
                    1.1 Status Atual do Orçamento
                  </label>
                  <select
                    value={quote.status}
                    onChange={(e) => handleStatusChange(e.target.value as QuoteStatus)}
                    className="w-full h-10 px-3 rounded-xl bg-white text-xs font-semibold text-[#0f172a] border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#004328]"
                  >
                    <option value="Rascunho">Rascunho</option>
                    <option value="Enviado">Enviado</option>
                    <option value="Aguardando Retorno">Aguardando Retorno</option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Reprovado">Reprovado</option>
                    <option value="Cancelado">Cancelado</option>
                    <option value="Vencido">Vencido</option>
                  </select>
                  <span className="text-[10px] text-[#64748b] mt-1 block">
                    Defina o status comercial atual desta proposta.
                  </span>
                </div>

                {/* 1.2 Responsável pelo Orçamento (Menu em cascata vinculado ao cadastro de pessoas de Configurações - Item 4) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-[#004328] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">badge</span>
                      1.2 Responsável pelo Orçamento (Configurações item 4)
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('configuracoes')}
                      className="text-[10px] text-[#49607e] hover:text-[#004328] underline"
                      title="Gerenciar lista de pessoas no item 4 de configurações"
                    >
                      Cadastrar Pessoas
                    </button>
                  </div>
                  <select
                    value={quote.responsibleTech || getEffectiveResponsible()}
                    onChange={(e) => setQuote(prev => ({ ...prev, responsibleTech: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-white text-xs font-bold text-[#004328] border border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#004328]"
                  >
                    {responsiblesList.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-[#64748b] mt-1 block">
                    Menu em cascata sincronizado com <strong>Configurações &gt; 4. Responsável pelo Orçamento</strong>.
                  </span>
                </div>
              </div>

              {/* Se orçamento estiver aprovado: Notificação destacada com o botão de gerar O.S. */}
              {quote.status === 'Aprovado' && (
                <div className="mt-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">
                        Orçamento Aprovado pelo Cliente
                      </span>
                      <span className="text-[11px] text-emerald-800">
                        Responsável a executar a O.S.: <strong>{quote.responsibleTech || responsiblesList[0]}</strong> • Prazo previsto: <strong>{quote.executionForecast || '15 dias úteis'}</strong>
                      </span>
                    </div>
                  </div>

                  {onOpenServiceOrder && (
                    <button
                      type="button"
                      onClick={() => onOpenServiceOrder(quote)}
                      className="px-4 py-2 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">assignment</span>
                      <span>Gerar Ordem de Serviços</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 1: Dados Cadastrais do Cliente & Prazos */}
          <div className="p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
              <div className="flex items-center gap-2 text-[#004328]">
                <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
                <h3 className="font-bold text-sm text-[#0b1c30]">1. Dados Cadastrais do Cliente & Prazos</h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#eff4ff] text-[#004328] px-2 py-0.5 rounded">
                CNAE 25.11-0
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Select Client */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#404942]">
                    Empresa Contratante
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('clientes')}
                    className="text-[11px] text-[#004328] font-bold hover:underline"
                  >
                    + Gerenciar / Cadastrar Clientes
                  </button>
                </div>
                <select
                  value={selectedClient?.id || quote.clientId || ''}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] border border-[#c4dcff]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                >
                  {clients.length === 0 ? (
                    <option value="">Nenhum cliente cadastrado (preencha os dados abaixo)</option>
                  ) : (
                    <>
                      <option value="">-- Selecione uma empresa cadastrada --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} — CNPJ: {c.cnpj}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Client Info Card */}
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#49607e] block mb-1">Razão Social / Nome da Empresa</span>
                  <input
                    type="text"
                    value={quote.clientName || ''}
                    onChange={(e) => setQuote({ ...quote, clientName: e.target.value })}
                    placeholder="Digite a Razão Social da Contratante"
                    className="w-full h-9 px-2.5 rounded-lg bg-white border border-[#cbd5e1] text-xs font-bold text-[#004328] focus:outline-none focus:ring-1 focus:ring-[#004328]"
                  />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#49607e] block mb-1">CNPJ / CPF</span>
                  <input
                    type="text"
                    value={quote.cnpj || ''}
                    onChange={(e) => setQuote({ ...quote, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    className="w-full h-9 px-2.5 rounded-lg bg-white border border-[#cbd5e1] text-xs font-mono text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#004328]"
                  />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#49607e] block">Grau de Risco & CNAE</span>
                  <span className="font-bold text-[#004328]">{selectedClient?.riskGrade || quote.riskGrade || 'Grau de Risco 2'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#49607e] block">Inscrição Estadual</span>
                  <span className="font-mono text-[#0b1c30]">{selectedClient?.ie || quote.ie || 'Isento'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#49607e] block mb-1">Gestor / Contato</span>
                  <input
                    type="text"
                    value={quote.contactPerson || ''}
                    onChange={(e) => setQuote({ ...quote, contactPerson: e.target.value })}
                    placeholder="Nome do Gestor / Contato"
                    className="w-full h-9 px-2.5 rounded-lg bg-white border border-[#cbd5e1] text-xs text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#004328]"
                  />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#49607e] block mb-1">Telefone de Contato</span>
                  <input
                    type="text"
                    value={quote.contactPhone || ''}
                    onChange={(e) => setQuote({ ...quote, contactPhone: maskPhoneBR(e.target.value) })}
                    placeholder="(11) 98765-4321"
                    className="w-full h-9 px-2.5 rounded-lg bg-white border border-[#cbd5e1] text-xs font-mono text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#004328]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] uppercase font-semibold text-[#49607e] block">Endereço Operacional da Planta</span>
                  <input
                    type="text"
                    value={quote.operationalAddress || ''}
                    onChange={(e) => setQuote({ ...quote, operationalAddress: e.target.value })}
                    placeholder="Endereço da planta operacional"
                    className="w-full h-9 px-2.5 rounded-lg bg-white border border-[#cbd5e1] text-xs text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#004328] mt-1"
                  />
                </div>
              </div>

              {/* Prazos */}
              <div>
                <label className="block text-xs font-semibold text-[#404942] mb-1">
                  Data de Emissão
                </label>
                <input
                  type="text"
                  value={quote.issueDate || ''}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setQuote(prev => ({
                      ...prev,
                      issueDate: newDate,
                      validityDate: calculateValidityDate(newDate, prev.validityDays || 15)
                    }));
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] font-mono border border-[#c4dcff]/40 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#404942] mb-1">
                  Validade da Proposta
                </label>
                <div className="flex items-center gap-1.5">
                  {[10, 15, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setQuote(prev => ({
                        ...prev,
                        validityDays: days,
                        validityDate: calculateValidityDate(prev.issueDate || getTodayFormatted(), days)
                      }))}
                      className={`flex-1 h-10 rounded-xl text-xs font-semibold transition-colors ${
                        quote.validityDays === days
                          ? 'bg-[#004328] text-white'
                          : 'bg-[#eff4ff] text-[#49607e] hover:bg-[#e5eeff]'
                      }`}
                    >
                      {days} dias
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <label className="block text-xs font-semibold text-[#404942]">
                    Previsão de Execução Técnica
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[#49607e]">Opções rápidas:</span>
                    {['A COMBINAR', '05 dias úteis', '10 dias úteis', '15 dias úteis'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setQuote({ ...quote, executionForecast: option })}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all border ${
                          quote.executionForecast === option
                            ? 'bg-[#004328] text-white border-[#004328]'
                            : 'bg-white text-[#004328] border-[#c4dcff]/70 hover:bg-[#eff4ff]'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={quote.executionForecast || ''}
                  onChange={(e) => setQuote({ ...quote, executionForecast: e.target.value })}
                  placeholder="Ex: A COMBINAR ou 10 dias úteis"
                  className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] border border-[#c4dcff]/40 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Responsável pelo Orçamento no formulário da proposta */}
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#004328] text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">person_check</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#004328] block">
                      Responsável pelo Orçamento Designado
                    </span>
                    <span className="text-[10px] text-[#49607e]">
                      Pessoa que assinará e acompanhará este orçamento
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={quote.responsibleTech || getEffectiveResponsible()}
                    onChange={(e) => setQuote(prev => ({ ...prev, responsibleTech: e.target.value }))}
                    className="h-9 px-3 rounded-xl bg-white text-xs font-bold text-[#004328] border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-[#004328]"
                  >
                    {responsiblesList.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setActiveTab('configuracoes')}
                    className="text-[10px] text-[#004328] hover:underline font-semibold whitespace-nowrap"
                    title="Cadastrar novas pessoas em Configurações (item 4)"
                  >
                    + Gerenciar Pessoas
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Escopo e Descrição Técnica dos Serviços */}
          <div className="p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
              <div className="flex items-center gap-2 text-[#004328]">
                <span className="material-symbols-outlined text-[20px]">assignment</span>
                <h3 className="font-bold text-sm text-[#0b1c30]">2. Escopo e Descrição Técnica dos Serviços</h3>
              </div>
              <span className="text-[10px] text-[#49607e]">Consta na folha impressa A4</span>
            </div>

            <textarea
              rows={4}
              value={quote.scopeSummary}
              onChange={(e) => setQuote({ ...quote, scopeSummary: e.target.value })}
              className="w-full p-3 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] border border-[#c4dcff]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328] leading-relaxed"
            />
          </div>

          {/* Section 3: Composição de Itens e Honorários Técnicos */}
          <div className="p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#eff4ff]">
              <div className="flex items-center gap-2 text-[#004328]">
                <span className="material-symbols-outlined text-[20px]">list_alt</span>
                <h3 className="font-bold text-sm text-[#0b1c30]">3. Composição de Itens e Honorários Técnicos</h3>
              </div>

              <button
                type="button"
                onClick={() => setShowCatalogModal(true)}
                className="px-3 py-1.5 rounded-lg bg-[#004328] text-white text-xs font-semibold hover:bg-[#005c3e] transition-colors flex items-center gap-1 self-start"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>+ Adicionar do Catálogo</span>
              </button>
            </div>

            {/* Quick insert chips */}
            <div>
              <span className="text-[10px] font-bold uppercase text-[#49607e] block mb-1.5">
                Inserção Rápida de Serviços SST:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickAddService("PGR - Programa de Gerenciamento de Riscos (NR-01)", "Levantamento de riscos químicos, físicos, biológicos e matriz 5x5", "Unid", 3800, "NR-01")}
                  className="px-2.5 py-1 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] text-[11px] font-semibold transition-colors border border-[#c4dcff]/40"
                >
                  + PGR NR-01 (R$ 3.800)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddService("PCMSO - Prog. Médico de Saúde Ocupacional (NR-07)", "Cronograma anual de exames clínicos e complementares", "Unid", 2900, "NR-07")}
                  className="px-2.5 py-1 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] text-[11px] font-semibold transition-colors border border-[#c4dcff]/40"
                >
                  + PCMSO NR-07 (R$ 2.900)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddService("LTCAT - Laudo Técnico Condições Ambientais", "Auditoria previdenciária e enquadramento de insalubridade", "Laudo", 4200, "LTCAT")}
                  className="px-2.5 py-1 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] text-[11px] font-semibold transition-colors border border-[#c4dcff]/40"
                >
                  + LTCAT (R$ 4.200)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddService("Treinamento NR-35 Trabalho em Altura", "Carga horária 8h presencial com emissão de ART e certificados", "Turma", 1500, "NR-35")}
                  className="px-2.5 py-1 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] text-[11px] font-semibold transition-colors border border-[#c4dcff]/40"
                >
                  + NR-35 Altura (R$ 1.500)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddService("ASO Clínico Ocupacional", "Exame clínico com anamnese ocupacional presencial", "Por Vida", 165, "NR-07")}
                  className="px-2.5 py-1 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] text-[11px] font-semibold transition-colors border border-[#c4dcff]/40"
                >
                  + ASO Clínico (R$ 165)
                </button>
              </div>
            </div>

            {/* Dynamic Items Table */}
            <div className="overflow-x-auto border border-[#eff4ff] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#eff4ff]/60 border-b border-[#e5eeff] text-[#49607e]">
                    <th className="py-2.5 px-3 font-semibold w-10 text-center">#</th>
                    <th className="py-2.5 px-3 font-semibold">Descrição do Serviço</th>
                    <th className="py-2.5 px-3 font-semibold w-24 text-center">Qtd</th>
                    <th className="py-2.5 px-3 font-semibold w-28 text-right">Unitário</th>
                    <th className="py-2.5 px-3 font-semibold w-28 text-right">Subtotal</th>
                    <th className="py-2.5 px-3 font-semibold w-20 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eff4ff]">
                  {(!quote.items || quote.items.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#49607e]">
                        <span className="material-symbols-outlined text-[28px] text-[#94a3b8] block mb-1">
                          post_add
                        </span>
                        <span>Nenhum serviço adicionado ainda. Adicione itens rápidos acima ou clique em <strong>+ Item Personalizado</strong>.</span>
                      </td>
                    </tr>
                  ) : (
                    quote.items.map((item) => (
                      <tr key={item.id} className="hover:bg-[#f8f9ff]">
                        <td className="py-3 px-3 font-mono font-bold text-center text-[#004328]">
                          {item.itemNumber}
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const newTitle = e.target.value;
                              const newItems = (quote.items || []).map(it =>
                                it.id === item.id ? { ...it, title: newTitle } : it
                              );
                              setQuote({ ...quote, items: newItems });
                            }}
                            className="w-full font-bold text-[#0b1c30] bg-transparent border-b border-transparent focus:border-[#004328] focus:outline-none"
                          />
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              const newDesc = e.target.value;
                              const newItems = (quote.items || []).map(it =>
                                it.id === item.id ? { ...it, description: newDesc } : it
                              );
                              setQuote({ ...quote, items: newItems });
                            }}
                            className="w-full text-[11px] text-[#49607e] bg-transparent border-b border-transparent focus:border-[#c4dcff] focus:outline-none mt-0.5"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1 bg-[#eff4ff] rounded-lg p-0.5 border border-[#c4dcff]/40">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item.id, -1)}
                              className="w-6 h-6 rounded bg-white hover:bg-[#e5eeff] text-[#0b1c30] font-bold text-xs flex items-center justify-center transition-colors"
                            >
                              -
                            </button>
                            <span className="w-8 font-mono font-bold text-xs text-[#0b1c30]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item.id, 1)}
                              className="w-6 h-6 rounded bg-white hover:bg-[#e5eeff] text-[#0b1c30] font-bold text-xs flex items-center justify-center transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <span className="block text-[10px] text-[#49607e] mt-0.5 font-mono">{item.unit}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-[11px] text-[#49607e]">R$</span>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handlePriceChange(item.id, Number(e.target.value))}
                              className="w-20 text-right font-mono text-xs font-bold text-[#0b1c30] bg-[#eff4ff] rounded-md px-1.5 py-1 focus:bg-white focus:outline-none border border-transparent focus:border-[#c4dcff]"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#004328]">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalPrice)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateItem(item)}
                              title="Duplicar Item"
                              className="p-1 rounded hover:bg-[#eff4ff] text-[#49607e] transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">content_copy</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              title="Remover Item"
                              className="p-1 rounded hover:bg-[#ffdad6] text-[#ba1a1a] transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Validation note */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#eff4ff] text-xs text-[#004328] border border-[#c4dcff]/40">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>Itens validados pelo Responsável Técnico: <strong>{getEffectiveResponsible()}</strong></span>
            </div>
          </div>

          {/* Section 4: Condições de Pagamento e Cláusulas Operacionais */}
          <div className="p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
              <div className="flex items-center gap-2 text-[#004328]">
                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                <h3 className="font-bold text-sm text-[#0b1c30]">4. Condições de Pagamento & Cláusulas</h3>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#404942] mb-2">
                Modalidade de Pagamento / Faturamento
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handlePaymentConditionSelect("À vista (PIX com 5% de desconto)", 1)}
                  className={`p-2.5 rounded-xl text-xs font-semibold text-center border transition-all ${
                    quote.installments === 1 && quote.paymentCondition.includes('vista')
                      ? 'border-[#004328] bg-[#eff4ff] text-[#004328]'
                      : 'border-[#e5eeff] hover:bg-[#f8f9ff] text-[#0b1c30]'
                  }`}
                >
                  À vista (PIX - 5%)
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentConditionSelect("Faturado 3x (30/60/90d) via Boleto Bancário", 3)}
                  className={`p-2.5 rounded-xl text-xs font-semibold text-center border transition-all ${
                    quote.installments === 3
                      ? 'border-[#004328] bg-[#eff4ff] text-[#004328]'
                      : 'border-[#e5eeff] hover:bg-[#f8f9ff] text-[#0b1c30]'
                  }`}
                >
                  Faturado 3x (30/60/90d)
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentConditionSelect("Faturado 2x (30/60d) via Boleto Bancário", 2)}
                  className={`p-2.5 rounded-xl text-xs font-semibold text-center border transition-all ${
                    quote.installments === 2
                      ? 'border-[#004328] bg-[#eff4ff] text-[#004328]'
                      : 'border-[#e5eeff] hover:bg-[#f8f9ff] text-[#0b1c30]'
                  }`}
                >
                  Faturado 2x (30/60d)
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentConditionSelect("Cartão Corporativo em até 6x", 6)}
                  className={`p-2.5 rounded-xl text-xs font-semibold text-center border transition-all ${
                    quote.installments === 6
                      ? 'border-[#004328] bg-[#eff4ff] text-[#004328]'
                      : 'border-[#e5eeff] hover:bg-[#f8f9ff] text-[#0b1c30]'
                  }`}
                >
                  Cartão Corporativo
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#404942] mb-1">
                Observações para Condições Especiais de Pagamento
              </label>
              <textarea
                rows={2}
                value={quote.paymentNotes || ''}
                onChange={(e) => setQuote({ ...quote, paymentNotes: e.target.value })}
                placeholder="Ex: 50% de entrada no aceite e 50% na entrega final; faturamento especial em 4x para clientes corporativos; desconto pontualidade..."
                className="w-full p-3 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] border border-[#c4dcff]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328] leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#404942] mb-1">
                Cláusulas Operacionais e Obrigações Técnicas
              </label>
              <textarea
                rows={3}
                value={quote.observations}
                onChange={(e) => setQuote({ ...quote, observations: e.target.value })}
                className="w-full p-3 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] border border-[#c4dcff]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328] leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Right Sticky Summary Inspector (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="sticky top-20 p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
              <h3 className="font-bold text-sm text-[#0b1c30]">Resumo Comercial</h3>
              <span className="text-[10px] font-mono font-bold text-[#004328] bg-[#eff4ff] px-2 py-0.5 rounded">
                Doc {quote.numberOnly || quote.id.replace('#', '')}
              </span>
            </div>

            {/* Calculations Breakdown */}
            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between text-[#49607e]">
                <span>Soma dos Itens (Bruto):</span>
                <span className="font-mono font-semibold text-[#0b1c30]">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#49607e]">Desconto Comercial:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#0d5c3a] font-mono">
                    ({quote.subtotal > 0 ? ((quote.discount / quote.subtotal) * 100).toFixed(1) : 0}%)
                  </span>
                  <div className="flex items-center bg-[#eff4ff] px-2 py-1 rounded-lg border border-[#c4dcff]/40">
                    <span className="text-[11px] text-[#49607e] mr-1">R$</span>
                    <input
                      type="number"
                      value={quote.discount}
                      onChange={(e) => handleDiscountChange(Number(e.target.value))}
                      className="w-16 font-mono text-xs font-bold text-[#004328] bg-transparent focus:outline-none text-right"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[#49607e]">
                <span>Retenções de Impostos:</span>
                <span className="font-mono text-emerald-800 text-[11px] font-semibold">
                  Inclusas (Simples Nac.)
                </span>
              </div>

              {/* Highlight Total Price */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#004328] to-[#0d5c3a] text-white flex flex-col gap-1 shadow-md my-1">
                <span className="text-[11px] uppercase font-semibold text-[#a9f3c5]">
                  Valor Total da Proposta
                </span>
                <span className="font-mono font-bold text-2xl">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.total)}
                </span>
                <span className="text-[11px] text-white/90 font-mono">
                  {quote.installments > 1
                    ? `${quote.installments} parcelas de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.installmentValue)} sem juros`
                    : 'Pagamento à vista'}
                </span>
              </div>
            </div>

            {/* Classificação Registrada & Vínculo ao Dashboard */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#004328] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-emerald-700">account_tree</span>
                  Classificação do Orçamento:
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                  Dashboard
                </span>
              </div>
              <div className="flex flex-col gap-1.5 text-[11px]">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[#49607e]">Status / Sub-etapa:</span>
                  <span className="font-semibold text-[#004328] text-right">
                    {quote.status} {quote.statusSubStage ? `• ${quote.statusSubStage}` : ''}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[#49607e]">Categoria Técnica:</span>
                  <span className="font-medium text-[#0b1c30] text-right">
                    {quote.macroCategory || 'Programas e Laudos'}
                  </span>
                </div>
                {quote.subCategory && (
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[#49607e]">Subcategoria / NR:</span>
                    <span className="font-medium text-[#004328] text-right max-w-[170px] truncate">
                      {quote.subCategory}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[#49607e]">Prioridade:</span>
                  <span className="font-bold text-amber-800 text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    {quote.priority || 'Padrão'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#49607e]">Responsável pelo Orçamento:</span>
                  <span className="text-[#004328] font-bold text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">
                    {quote.responsibleTech || getEffectiveResponsible()}
                  </span>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#eff4ff]">
              <div className="flex flex-col gap-1.5 w-full">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleGeneratePdf}
                  className="relative overflow-hidden w-full py-3 px-4 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-90 active:scale-[0.99]"
                >
                  {/* Visual Loading / Progress Bar Fill */}
                  {isSaving && (
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-[#25BDA7]/30 transition-all duration-300 ease-out"
                      style={{ width: `${saveProgress}%` }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {isSaving ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Salvando dados ({saveProgress}%)...</span>
                      </>
                    ) : saveSuccess ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] text-[#8ed6aa]">check_circle</span>
                        <span>Salvo com Sucesso!</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">print</span>
                        <span>Salvar e Gerar Proposta A4</span>
                      </>
                    )}
                  </span>
                </button>
                {isSaving && (
                  <div className="w-full bg-[#eff4ff] h-1.5 rounded-full overflow-hidden border border-[#c4dcff]/40">
                    <div
                      className="h-full bg-gradient-to-r from-[#004328] to-[#25BDA7] transition-all duration-300 rounded-full"
                      style={{ width: `${saveProgress}%` }}
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onSendEmail(quote)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-[#c4dcff]/50"
              >
                <span className="material-symbols-outlined text-[18px]">mail</span>
                <span>Enviar Diretamente por E-mail</span>
              </button>
            </div>

            {/* Checklist Regulatório Vinculado */}
            <div className="p-3.5 rounded-xl bg-[#eff4ff] flex flex-col gap-2 border border-[#c4dcff]/40 text-xs">
              <span className="font-bold text-[#004328] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                Checklist Regulatório Vinculado:
              </span>
              <div className="flex flex-col gap-1 text-[11px] text-[#404942]">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-700 text-[14px]">check_circle</span>
                  <span>NR-01: Gestão de Riscos Ocupacionais (GRO)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-700 text-[14px]">check_circle</span>
                  <span>NR-07: Médico Coordenador Responsável</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-700 text-[14px]">check_circle</span>
                  <span>Previdenciário: LTCAT art. 58 Lei 8.213</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-700 text-[14px]">check_circle</span>
                  <span>eSocial: Geração de XML S-2220 e S-2240</span>
                </div>
              </div>
            </div>

            {/* Auditoria Footer */}
            <div className="flex items-center justify-between text-[11px] text-[#49607e] pt-1">
              <span>Elaborado por: <strong>{getEffectiveResponsible()}</strong></span>
              <span className="font-mono">CREA / MTE Vinculado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto border border-[#e5eeff]">
            <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
              <div>
                <h3 className="font-bold text-base text-[#0b1c30]">Catálogo Oficial de Serviços SST Consentra</h3>
                <p className="text-xs text-[#49607e]">Selecione um item regulatório para adicionar à proposta</p>
              </div>
              <button
                onClick={() => {
                  setShowCatalogModal(false);
                  setCatalogSearch('');
                }}
                className="w-8 h-8 rounded-lg hover:bg-[#eff4ff] flex items-center justify-center text-[#49607e]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Search Bar for Official SST Catalog */}
            <div className="pt-3 pb-1">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#49607e]">
                  search
                </span>
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Pesquisar por título, norma regulamentadora (ex: NR-01, NR-07), laudo ou descrição..."
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] placeholder-[#64748b] border border-[#c4dcff]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                  autoFocus
                />
                {catalogSearch && (
                  <button
                    onClick={() => setCatalogSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#49607e] hover:text-[#0b1c30] px-1 py-0.5"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 py-4">
              {activeCatalog.filter(serv => {
                if (!catalogSearch.trim()) return true;
                const q = catalogSearch.toLowerCase();
                return (
                  serv.title.toLowerCase().includes(q) ||
                  serv.description.toLowerCase().includes(q) ||
                  serv.nrCategory.toLowerCase().includes(q) ||
                  (serv.code && serv.code.toLowerCase().includes(q)) ||
                  (serv.category && serv.category.toLowerCase().includes(q))
                );
              }).length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748b] bg-[#f8fafc] rounded-xl border border-dashed border-[#cbd5e1]">
                  Nenhum serviço regulatório encontrado para &quot;{catalogSearch}&quot;.
                </div>
              ) : (
                activeCatalog.filter(serv => {
                  if (!catalogSearch.trim()) return true;
                  const q = catalogSearch.toLowerCase();
                  return (
                    serv.title.toLowerCase().includes(q) ||
                    serv.description.toLowerCase().includes(q) ||
                    serv.nrCategory.toLowerCase().includes(q) ||
                    (serv.code && serv.code.toLowerCase().includes(q)) ||
                    (serv.category && serv.category.toLowerCase().includes(q))
                  );
                }).map((serv) => (
                  <div
                    key={serv.id}
                    className="p-3.5 rounded-xl border border-[#e5eeff] hover:border-[#004328] bg-[#f8f9ff] flex items-start justify-between gap-4 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#eff4ff] text-[#004328] font-mono">
                          {serv.nrCategory}
                        </span>
                        <h4 className="font-bold text-xs text-[#0b1c30]">{serv.title}</h4>
                      </div>
                      <p className="text-[11px] text-[#49607e] mt-1 leading-relaxed">{serv.description}</p>
                      <span className="text-[10px] text-[#49607e] font-mono mt-1 block">Unidade: {serv.unit}</span>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="font-mono font-bold text-sm text-[#004328]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(serv.suggestedPrice)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddCatalogItem(serv)}
                        className="px-3 py-1.5 rounded-lg bg-[#004328] text-white text-xs font-semibold hover:bg-[#005c3e] transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowCatalogModal(false)}
                className="px-4 py-2 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#e5eeff]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração Exclusiva do Administrador */}
      <AdminQuoteConfigModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        quote={quote}
        onApplyToQuote={(updatedQuote) => {
          setQuote(updatedQuote);
          if (onSaveQuote) {
            onSaveQuote(updatedQuote);
          }
          setAdminToast('Textos e cabeçalho da proposta configurados pelo Administrador com sucesso!');
          setTimeout(() => setAdminToast(null), 4000);
        }}
        initialTab={adminModalTab}
      />
    </div>
  );
};
