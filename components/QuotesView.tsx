'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Quote, QuoteStatus } from '@/lib/types';
import { getStoredResponsibles } from '@/lib/responsibles';
import { downloadQuotePdf } from '@/lib/pdf-generator';
import { TabType } from './Sidebar';

interface QuotesViewProps {
  quotes: Quote[];
  setActiveTab: (tab: TabType) => void;
  onOpenPdf: (quote: Quote) => void;
  onEditQuote: (quote: Quote) => void;
  onDuplicateQuote: (quote: Quote) => void;
  onDeleteQuote: (quoteId: string) => void;
  /** Somente administradores. Recebe o texto digitado (deve ser "ZERAR"). */
  onClearAllQuotes?: (confirmation: string) => Promise<boolean> | boolean | void;
  onUpdateQuoteStatus: (quoteId: string, newStatus: QuoteStatus) => void;
  onSendWhatsapp: (quote: Quote) => void;
  onSendEmail: (quote: Quote) => void;
  onStartNewQuote: () => void;
  responsiblePersons?: string[];
  onOpenServiceOrder?: (quote: Quote) => void;
  globalSearchQuery?: string;
}

export const QuotesView: React.FC<QuotesViewProps> = ({
  quotes,
  setActiveTab,
  onOpenPdf,
  onEditQuote,
  onDuplicateQuote,
  onDeleteQuote,
  onClearAllQuotes,
  onUpdateQuoteStatus,
  onSendWhatsapp,
  onSendEmail,
  onStartNewQuote,
  responsiblePersons,
  onOpenServiceOrder,
  globalSearchQuery,
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = globalSearchQuery !== undefined && globalSearchQuery !== '' ? globalSearchQuery : localSearchQuery;
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');

  const volumeEmNegociacao = useMemo(() => {
    return quotes
      .filter(q => q.status === 'Enviado' || q.status === 'Aguardando Retorno' || q.status === 'Rascunho')
      .reduce((acc, q) => acc + (Number(q.total) || 0), 0);
  }, [quotes]);

  const taxaConversao = useMemo(() => {
    if (quotes.length === 0) return '0.0%';
    const aprovados = quotes.filter(q => q.status === 'Aprovado').length;
    return `${((aprovados / quotes.length) * 100).toFixed(1)}%`;
  }, [quotes]);
  const [selectedResponsible, setSelectedResponsible] = useState<string>('Todos');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'number' | 'date' | 'total'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [downloadingQuoteId, setDownloadingQuoteId] = useState<string | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);
  const [clearConfirmText, setClearConfirmText] = useState<string>('');
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);

  const handleDownloadSingleQuote = async (quote: Quote) => {
    setDownloadingQuoteId(quote.id);
    await downloadQuotePdf(quote);
    setDownloadingQuoteId(null);
  };

  const [responsiblesList, setResponsiblesList] = useState<string[]>(() => {
    if (responsiblePersons && responsiblePersons.length > 0) return responsiblePersons;
    return getStoredResponsibles();
  });

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

  // Status lists and counts
  const statusList = [
    { label: 'Todos', count: quotes.length },
    { label: 'Rascunho', count: quotes.filter(q => q.status === 'Rascunho').length },
    { label: 'Enviado', count: quotes.filter(q => q.status === 'Enviado').length },
    { label: 'Aguardando retorno', count: quotes.filter(q => q.status === 'Aguardando Retorno').length },
    { label: 'Aprovado', count: quotes.filter(q => q.status === 'Aprovado').length },
    { label: 'Reprovado', count: quotes.filter(q => q.status === 'Reprovado').length },
    { label: 'Cancelado', count: quotes.filter(q => q.status === 'Cancelado').length },
    { label: 'Vencido', count: quotes.filter(q => q.status === 'Vencido').length },
  ];

  // Filtering
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      // Search
      const searchMatch =
        searchQuery === '' ||
        (q.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.cnpj || '').includes(searchQuery) ||
        (q.macroCategory && q.macroCategory.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.subCategory && q.subCategory.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.statusSubStage && q.statusSubStage.toLowerCase().includes(searchQuery.toLowerCase())) ||
        ((q.regulatoryScope || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase())));

      // Status
      let statusMatch = true;
      if (selectedStatus !== 'Todos') {
        if (selectedStatus === 'Aguardando retorno') {
          statusMatch = q.status === 'Aguardando Retorno';
        } else {
          statusMatch = q.status === selectedStatus;
        }
      }

      // Responsible
      const respMatch =
        selectedResponsible === 'Todos' ||
        (q.responsibleTech || '').toLowerCase().includes(selectedResponsible.toLowerCase());

      return searchMatch && statusMatch && respMatch;
    }).sort((a, b) => {
      if (sortField === 'number') {
        return sortOrder === 'asc' ? a.numberOnly - b.numberOnly : b.numberOnly - a.numberOnly;
      }
      if (sortField === 'total') {
        return sortOrder === 'asc' ? a.total - b.total : b.total - a.total;
      }
      return 0;
    });
  }, [quotes, searchQuery, selectedStatus, selectedResponsible, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredQuotes.length / rowsPerPage) || 1;
  const paginatedQuotes = filteredQuotes.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleExportCSV = () => {
    const headers = ['Número,Cliente,CNPJ,Emissão,Validade,Valor Total,Status\n'];
    const rows = filteredQuotes.map(
      q => `"${q.id}","${q.clientName}","${q.cnpj}","${q.issueDate}","${q.validityDate}","${q.total}","${q.status}"\n`
    );
    const blob = new Blob([...headers, ...rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `consentra_orcamentos_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold text-[#49607e] uppercase tracking-wider block font-mono">
            CONSENTRA GESTÃO COMERCIAL / EMISSÃO & PIPELINE
          </span>
          <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
            Gerenciamento de Orçamentos
          </h1>
          <p className="text-xs text-[#49607e] mt-0.5">
            Controle de propostas comerciais de Segurança e Saúde no Trabalho (SST)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white border border-[#e5eeff] shadow-xs">
            <div>
              <span className="text-[10px] text-[#49607e] uppercase font-semibold block">Volume em Negociação</span>
              <span className="font-mono font-bold text-sm text-[#004328]">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(volumeEmNegociacao)}
              </span>
            </div>
            <div className="h-7 w-[1px] bg-[#eff4ff]" />
            <div>
              <span className="text-[10px] text-[#49607e] uppercase font-semibold block">Taxa de Conversão</span>
              <span className="font-mono font-bold text-sm text-[#0d5c3a]">{taxaConversao}</span>
            </div>
          </div>

          <button
            onClick={onStartNewQuote}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#004328] text-white font-semibold text-xs hover:bg-[#005c3e] transition-colors shadow-xs active:scale-98"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Criar Novo Orçamento (#319)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="p-4 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#49607e] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setLocalSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por número, cliente, CNPJ ou serviço..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] placeholder:text-[#707971] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0d5c3a] border border-transparent focus:border-[#c4dcff]"
            />
          </div>

          {/* Responsible Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedResponsible}
              onChange={(e) => {
                setSelectedResponsible(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] border border-transparent focus:border-[#c4dcff] focus:bg-white focus:outline-none"
            >
              <option value="Todos">Todos os Responsáveis pelo Orçamento</option>
              {responsiblesList.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="md:col-span-4 flex items-center justify-end gap-2">
            {(searchQuery || selectedStatus !== 'Todos' || selectedResponsible !== 'Todos') && (
              <button
                onClick={() => {
                  setLocalSearchQuery('');
                  setSelectedStatus('Todos');
                  setSelectedResponsible('Todos');
                  setCurrentPage(1);
                }}
                className="h-10 px-3 rounded-xl text-xs text-[#49607e] hover:bg-[#eff4ff] flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                <span>Limpar</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="h-10 px-3.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] font-semibold text-xs flex items-center gap-1.5 transition-colors border border-[#c4dcff]/40"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Exportar</span>
            </button>

            {onClearAllQuotes && quotes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setClearConfirmText('');
                  setShowClearAllModal(true);
                }}
                title="Apagar todos os orçamentos e zerar o sistema (somente administradores)"
                className="h-10 px-3.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-red-200"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                <span>Zerar Sistema</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-[#eff4ff] pt-3">
          {statusList.map((st) => {
            const isSelected = selectedStatus === st.label;
            return (
              <button
                key={st.label}
                onClick={() => {
                  setSelectedStatus(st.label);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#004328] text-white font-semibold shadow-xs'
                    : 'bg-[#eff4ff] text-[#404942] hover:bg-[#e5eeff]'
                }`}
              >
                <span>{st.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#c4dcff] text-[#0b1c30]'
                  }`}
                >
                  {st.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Quotes Data Table */}
      <div className="rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#eff4ff]/60 border-b border-[#e5eeff] text-[#49607e]">
                <th
                  onClick={() => {
                    if (sortField === 'number') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('number');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#004328] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Número</span>
                    <span className="material-symbols-outlined text-[14px]">
                      {sortField === 'number' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Emissão</th>
                <th className="py-3 px-4 font-semibold">Cliente & CNPJ</th>
                <th className="py-3 px-4 font-semibold">Escopo Regulatório SST</th>
                <th
                  onClick={() => {
                    if (sortField === 'total') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('total');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-[#004328] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Valor Total</span>
                    <span className="material-symbols-outlined text-[14px]">
                      {sortField === 'total' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                    </span>
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Validade</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eff4ff]">
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-[#49607e]">
                    <span className="material-symbols-outlined text-[44px] text-[#004328]/40 block mb-2">
                      folder_open
                    </span>
                    <p className="text-sm font-bold text-[#0b1c30] mb-1">Nenhum orçamento cadastrado</p>
                    <p className="text-xs text-[#64748b] mb-4">Inicie criando a primeira proposta técnica e comercial do sistema.</p>
                    <button
                      type="button"
                      onClick={onStartNewQuote}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      <span>+ Criar Primeiro Orçamento</span>
                    </button>
                  </td>
                </tr>
              ) : paginatedQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#49607e]">
                    <span className="material-symbols-outlined text-[36px] text-[#bfc9c0] block mb-2">
                      search_off
                    </span>
                    Nenhum orçamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedQuotes.map((quote) => {
                  const isApproved = quote.status === 'Aprovado';
                  const isPending = quote.status === 'Aguardando Retorno' || quote.status === 'Enviado';
                  const isDraft = quote.status === 'Rascunho';
                  const isExpired = quote.status === 'Vencido' || quote.status === 'Cancelado';

                  return (
                    <tr
                      key={quote.id}
                      className="hover:bg-[#f8f9ff] transition-colors group"
                    >
                      {/* Número */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#004328] whitespace-nowrap">
                        <span className="px-2 py-1 rounded-lg bg-[#eff4ff] border border-[#c4dcff]/40">
                          {quote.id.replace('#', '')}
                        </span>
                      </td>

                      {/* Emissão */}
                      <td className="py-3.5 px-4 font-mono text-[#49607e] whitespace-nowrap">
                        {quote.issueDate}
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0b1c30] max-w-xs line-clamp-1">
                          {quote.clientName}
                        </div>
                        <div className="text-[11px] text-[#49607e] font-mono mt-0.5">
                          {quote.cnpj} {quote.contactPerson ? `• ${quote.contactPerson.split('(')[0]}` : ''}
                        </div>
                        {quote.macroCategory && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[9.5px] font-semibold border border-emerald-200">
                              {quote.macroCategory}
                            </span>
                            {quote.subCategory && (
                              <span className="text-[9.5px] text-[#49607e] truncate max-w-[150px]">
                                • {quote.subCategory}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 text-[10.5px]">
                          <span className="material-symbols-outlined text-[13px] text-[#004328]">badge</span>
                          <span className="text-[#49607e]">Resp.:</span>
                          <strong className="text-[#004328] font-semibold">{quote.responsibleTech || 'Washington Assis'}</strong>
                        </div>
                      </td>

                      {/* Escopo */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {quote.regulatoryScope.map((scope, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-[#eff4ff] text-[#0b1c30] text-[10px] font-medium border border-[#c4dcff]/40"
                            >
                              {scope}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Valor Total */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0b1c30] whitespace-nowrap">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.total)}
                        {quote.installments > 1 && (
                          <span className="block text-[10px] text-[#49607e] font-normal font-sans">
                            {quote.installments}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.installmentValue)}
                          </span>
                        )}
                      </td>

                      {/* Validade */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                        <div className="text-[#0b1c30]">{quote.validityDate}</div>
                        <span className="text-[10px] text-[#49607e]">
                          {quote.status === 'Vencido' ? 'Expirado' : `${quote.validityDays} dias`}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            isApproved
                              ? 'bg-[#a9f3c5] text-[#002111]'
                              : isPending
                              ? 'bg-amber-100 text-amber-900'
                              : isDraft
                              ? 'bg-[#e5eeff] text-[#49607e]'
                              : isExpired
                              ? 'bg-[#ffdad6] text-[#ba1a1a]'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {quote.status}
                        </span>
                        {quote.statusSubStage && (
                          <span className="block text-[10px] text-[#64748b] font-medium mt-1">
                            {quote.statusSubStage}
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap relative">
                        <div className="inline-flex items-center gap-1">
                          {/* Se aprovado: Novo botão Gerar Ordem de Serviços */}
                          {isApproved && onOpenServiceOrder && (
                            <button
                              onClick={() => onOpenServiceOrder(quote)}
                              title="Gerar Ordem de Serviços (sem valores financeiros do orçamento)"
                              className="px-2.5 py-1.5 rounded-lg bg-[#004328] hover:bg-[#005c3e] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors shrink-0"
                            >
                              <span className="material-symbols-outlined text-[15px]">assignment</span>
                              <span>Gerar O.S.</span>
                            </button>
                          )}

                          {/* Visualizar PDF */}
                          <button
                            onClick={() => onOpenPdf(quote)}
                            title="Visualizar Proposta A4"
                            className="p-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>

                          {/* Baixar PDF Direto */}
                          <button
                            onClick={() => handleDownloadSingleQuote(quote)}
                            disabled={downloadingQuoteId === quote.id}
                            title="Baixar Orçamento em PDF"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#004328] transition-colors disabled:opacity-50"
                          >
                            <span className={`material-symbols-outlined text-[18px] ${downloadingQuoteId === quote.id ? 'animate-spin' : ''}`}>
                              {downloadingQuoteId === quote.id ? 'sync' : 'download'}
                            </span>
                          </button>

                          {/* Editar Proposta */}
                          <button
                            onClick={() => onEditQuote(quote)}
                            title="Editar Orçamento"
                            className="p-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#49607e] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>

                          {/* Duplicar */}
                          <button
                            onClick={() => onDuplicateQuote(quote)}
                            title="Duplicar Orçamento"
                            className="p-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#49607e] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                          </button>

                          {/* Excluir Orçamento Direto */}
                          <button
                            onClick={() => setQuoteToDelete(quote)}
                            title="Excluir Orçamento Selecionado"
                            className="p-1.5 rounded-lg bg-[#ffdad6]/40 hover:bg-[#ffdad6] text-[#ba1a1a] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>

                          {/* More dropdown */}
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() => setActiveMenuId(activeMenuId === quote.id ? null : quote.id)}
                              className="p-1.5 rounded-lg hover:bg-[#eff4ff] text-[#49607e] transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">more_vert</span>
                            </button>

                            {activeMenuId === quote.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-[#e5eeff] py-1.5 z-40 text-left">
                                {isApproved && onOpenServiceOrder && (
                                  <>
                                    <button
                                      onClick={() => {
                                        onOpenServiceOrder(quote);
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full px-3 py-2 text-xs text-[#004328] font-bold hover:bg-emerald-50 flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-[16px] text-[#004328]">assignment</span>
                                      <span>Gerar Ordem de Serviços</span>
                                    </button>
                                    <div className="border-t border-[#eff4ff] my-1" />
                                  </>
                                )}

                                <button
                                  onClick={() => {
                                    handleDownloadSingleQuote(quote);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-[#004328] font-semibold hover:bg-emerald-50 flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-[#004328]">download</span>
                                  <span>Baixar PDF Direto</span>
                                </button>
                                <button
                                  onClick={() => {
                                    onSendWhatsapp(quote);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-[#0b1c30] hover:bg-[#eff4ff] flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-emerald-600">chat</span>
                                  <span>Enviar WhatsApp</span>
                                </button>
                                <button
                                  onClick={() => {
                                    onSendEmail(quote);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-[#0b1c30] hover:bg-[#eff4ff] flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-[#49607e]">mail</span>
                                  <span>Enviar por E-mail</span>
                                </button>

                                <div className="border-t border-[#eff4ff] my-1" />

                                <div className="px-3 py-1 text-[10px] text-[#49607e] uppercase font-bold">
                                  Alterar Status
                                </div>
                                <button
                                  onClick={() => {
                                    onUpdateQuoteStatus(quote.id, 'Aprovado');
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-[14px]">check</span>
                                  <span>Marcar Aprovado</span>
                                </button>
                                <button
                                  onClick={() => {
                                    onUpdateQuoteStatus(quote.id, 'Aguardando Retorno');
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                                  <span>Aguardando Retorno</span>
                                </button>
                                <button
                                  onClick={() => {
                                    onUpdateQuoteStatus(quote.id, 'Reprovado');
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-[14px]">close</span>
                                  <span>Marcar Reprovado</span>
                                </button>

                                <div className="border-t border-[#eff4ff] my-1" />

                                <button
                                  onClick={() => {
                                    setQuoteToDelete(quote);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-[#ba1a1a] hover:bg-[#ffdad6]/40 flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                  <span>Excluir Orçamento</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination and Summary Footer */}
        <div className="p-4 border-t border-[#e5eeff] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#49607e]">
          <div>
            Exibindo <strong>{paginatedQuotes.length}</strong> de <strong>{filteredQuotes.length}</strong> orçamentos
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Linhas por página:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 px-2 rounded-lg bg-[#eff4ff] border border-[#c4dcff]/40 text-xs text-[#0b1c30]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="w-8 h-8 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] disabled:opacity-40 disabled:hover:bg-[#eff4ff] flex items-center justify-center text-[#0b1c30]"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>

              <span className="px-2 font-mono font-medium text-[#0b1c30]">
                {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="w-8 h-8 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] disabled:opacity-40 disabled:hover:bg-[#eff4ff] flex items-center justify-center text-[#0b1c30]"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão de Orçamento */}
      {quoteToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-[#ffdad6] shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">delete_forever</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-[#0b1c30]">Excluir Orçamento Selecionado?</h3>
                <p className="text-xs text-[#49607e]">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#004328] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Orçamento Nº {String(quoteToDelete.numberOnly || quoteToDelete.id).replace('#', '')}
                </span>
                <span className="font-bold text-[#0b1c30]">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quoteToDelete.total)}
                </span>
              </div>
              <span className="font-bold text-[#0b1c30]">{quoteToDelete.clientName}</span>
              <span className="font-mono text-[#64748b]">CNPJ: {quoteToDelete.cnpj} • Emissão: {quoteToDelete.issueDate}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#eff4ff]">
              <button
                type="button"
                onClick={() => setQuoteToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#e5eeff]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteQuote(quoteToDelete.id);
                  setQuoteToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#ba1a1a] text-white text-xs font-semibold hover:bg-[#93000a] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação para Zerar Todos os Orçamentos */}
      {showClearAllModal && onClearAllQuotes && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-red-200 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-[#ba1a1a]">
              <span className="material-symbols-outlined text-[32px]">delete_sweep</span>
              <div>
                <h3 className="font-bold text-base text-[#0b1c30]">Zerar Todos os Orçamentos?</h3>
                <span className="text-[11px] text-[#ba1a1a] font-semibold uppercase tracking-wider">Ação Irreversível</span>
              </div>
            </div>

            <p className="text-xs text-[#49607e] leading-relaxed">
              Você está prestes a apagar <strong>todos os {quotes.length} orçamentos</strong> cadastrados no sistema
              {isSupabaseConfigured() ? <> para <strong>todos os usuários</strong> (banco de dados no servidor)</> : <> neste navegador</>}.
              {isSupabaseConfigured()
                ? ' A numeração continua de onde parou (números já usados não são reaproveitados).'
                : ' A numeração de novos orçamentos volta a começar em 319.'}
            </p>

            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0 mt-0.5">report</span>
              <span>Esta ação não pode ser desfeita. Exporte relatórios ou PDFs antes de prosseguir.</span>
            </div>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#0b1c30]">
              Para confirmar, digite <span className="font-mono text-[#ba1a1a]">ZERAR</span>:
              <input
                type="text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                autoFocus
                autoComplete="off"
                className="h-10 px-3 rounded-xl border border-red-200 focus:border-[#ba1a1a] focus:ring-1 focus:ring-[#ba1a1a] outline-none font-mono text-sm"
                placeholder="ZERAR"
              />
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#eff4ff]">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                disabled={isClearingAll}
                className="px-4 py-2 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#e5eeff] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={clearConfirmText !== 'ZERAR' || isClearingAll}
                onClick={async () => {
                  setIsClearingAll(true);
                  try {
                    const ok = await onClearAllQuotes(clearConfirmText);
                    if (ok !== false) setShowClearAllModal(false);
                  } finally {
                    setIsClearingAll(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#ba1a1a] text-white text-xs font-semibold hover:bg-[#93000a] flex items-center gap-1.5 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className={`material-symbols-outlined text-[16px] ${isClearingAll ? 'animate-spin' : ''}`}>{isClearingAll ? 'sync' : 'delete_forever'}</span>
                <span>{isClearingAll ? 'Apagando...' : 'Sim, Zerar Todos os Orçamentos'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
