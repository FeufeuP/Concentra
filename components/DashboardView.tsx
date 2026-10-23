'use client';

import React, { useState, useMemo } from 'react';
import { Quote, QuoteStatus } from '@/lib/types';
import { 
  CASCADING_STATUS_LIST, 
  CASCADING_MACRO_CATEGORIES, 
  PRIORITY_LEVELS, 
  TECHNICAL_RESPONSIBLES 
} from '@/lib/classification-data';
import { TabType } from './Sidebar';

interface DashboardViewProps {
  quotes: Quote[];
  setActiveTab: (tab: TabType) => void;
  onOpenPdf: (quote: Quote) => void;
  onStartNewQuote: () => void;
  onSendWhatsapp: (quote: Quote) => void;
  onSendEmail: (quote: Quote) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  quotes,
  setActiveTab,
  onOpenPdf,
  onStartNewQuote,
  onSendWhatsapp,
  onSendEmail,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'mes' | '30dias' | 'trimestre'>('mes');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  // Cascading Filters state
  const [filterMacroCategory, setFilterMacroCategory] = useState<string>('all');
  const [filterSubCategory, setFilterSubCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterResponsibleTech, setFilterResponsibleTech] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Find active macro category object for cascading subcategories
  const activeMacroForFilter = useMemo(() => {
    return CASCADING_MACRO_CATEGORIES.find(m => m.name === filterMacroCategory);
  }, [filterMacroCategory]);

  const handleMacroFilterChange = (macroName: string) => {
    setFilterMacroCategory(macroName);
    setFilterSubCategory('all'); // Reset subcategory when macro changes
  };

  const handleResetFilters = () => {
    setFilterMacroCategory('all');
    setFilterSubCategory('all');
    setFilterStatus('all');
    setFilterResponsibleTech('all');
    setFilterPriority('all');
  };

  const activeFilterCount = [
    filterMacroCategory !== 'all',
    filterSubCategory !== 'all',
    filterStatus !== 'all',
    filterResponsibleTech !== 'all',
    filterPriority !== 'all'
  ].filter(Boolean).length;

  // Filtered quotes based on cascading menus
  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      if (filterStatus !== 'all' && q.status !== filterStatus) return false;
      if (filterMacroCategory !== 'all' && q.macroCategory !== filterMacroCategory) return false;
      if (filterSubCategory !== 'all' && q.subCategory !== filterSubCategory) return false;
      if (filterResponsibleTech !== 'all' && q.responsibleTech !== filterResponsibleTech) return false;
      if (filterPriority !== 'all' && q.priority !== filterPriority) return false;
      return true;
    });
  }, [quotes, filterStatus, filterMacroCategory, filterSubCategory, filterResponsibleTech, filterPriority]);

  // Overall and filtered KPI calculations
  const totalOrcadoAll = useMemo(() => quotes.reduce((acc, q) => acc + q.total, 0), [quotes]);
  const totalOrcadoFiltered = useMemo(() => filteredQuotes.reduce((acc, q) => acc + q.total, 0), [filteredQuotes]);
  
  const approvedQuotes = useMemo(() => filteredQuotes.filter(q => q.status === 'Aprovado'), [filteredQuotes]);
  const totalAprovado = useMemo(() => approvedQuotes.reduce((acc, q) => acc + q.total, 0), [approvedQuotes]);

  const pendingQuotes = useMemo(() => filteredQuotes.filter(q => q.status === 'Aguardando Retorno' || q.status === 'Enviado'), [filteredQuotes]);
  const totalPending = useMemo(() => pendingQuotes.reduce((acc, q) => acc + q.total, 0), [pendingQuotes]);

  const rejectedQuotes = useMemo(() => filteredQuotes.filter(q => q.status === 'Reprovado'), [filteredQuotes]);

  const conversionRate = filteredQuotes.length > 0 
    ? ((approvedQuotes.length / filteredQuotes.length) * 100).toFixed(1) 
    : '0.0';

  const lossRate = filteredQuotes.length > 0 
    ? ((rejectedQuotes.length / filteredQuotes.length) * 100).toFixed(1) 
    : '0.0';

  // 7-Status Accounting breakdown (contabilização nos 7 status)
  const statusAccounting = useMemo(() => {
    return CASCADING_STATUS_LIST.map(stDef => {
      const matched = quotes.filter(q => q.status === stDef.status);
      const sum = matched.reduce((acc, q) => acc + q.total, 0);
      const pct = totalOrcadoAll > 0 ? ((sum / totalOrcadoAll) * 100).toFixed(1) : '0';
      return {
        ...stDef,
        count: matched.length,
        sum,
        pct
      };
    });
  }, [quotes, totalOrcadoAll]);

  // Dynamic Mix de Serviços SST aggregation from real quotes
  const mixDeServicos = useMemo(() => {
    const counts: { [macroName: string]: { count: number; total: number; color: string } } = {};
    
    CASCADING_MACRO_CATEGORIES.forEach(m => {
      counts[m.name] = { count: 0, total: 0, color: m.color || '#004328' };
    });

    quotes.forEach(q => {
      const cat = q.macroCategory || 'Programas e Laudos Regulamentares';
      if (!counts[cat]) {
        counts[cat] = { count: 0, total: 0, color: '#004328' };
      }
      counts[cat].count += 1;
      counts[cat].total += q.total;
    });

    return Object.entries(counts).map(([name, data]) => {
      const pct = totalOrcadoAll > 0 ? ((data.total / totalOrcadoAll) * 100).toFixed(1) : '0';
      return {
        name,
        count: data.count,
        total: data.total,
        pct,
        color: data.color
      };
    }).sort((a, b) => b.total - a.total);
  }, [quotes, totalOrcadoAll]);

  // Urgent quotes (status Aguardando Retorno or Enviado)
  const urgentQuotes = quotes.filter(q => q.status === 'Aguardando Retorno' || q.status === 'Enviado').slice(0, 3);

  // Recent quotes for preview table
  const recentQuotes = filteredQuotes.slice(0, 6);

  // Month bars data
  const monthlyData = [
    { month: 'Mai', orcado: 210, aprovado: 120, orcadoLabel: 'R$ 210k', aprovadoLabel: 'R$ 120k' },
    { month: 'Jun', orcado: 245, aprovado: 140, orcadoLabel: 'R$ 245k', aprovadoLabel: 'R$ 140k' },
    { month: 'Jul', orcado: 280, aprovado: 175, orcadoLabel: 'R$ 280k', aprovadoLabel: 'R$ 175k' },
    { month: 'Ago', orcado: 290, aprovado: 165, orcadoLabel: 'R$ 290k', aprovadoLabel: 'R$ 165k' },
    { month: 'Set', orcado: 315, aprovado: 185, orcadoLabel: 'R$ 315k', aprovadoLabel: 'R$ 185k' },
    { month: 'Out', orcado: 342, aprovado: 198, orcadoLabel: 'R$ 342.8k', aprovadoLabel: 'R$ 198.4k' },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Banner: Sequencial Atual #319 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#004328] via-[#0d5c3a] to-[#005c3e] p-6 text-white shadow-[0_4px_20px_rgba(0,67,40,0.15)] border border-[#a9f3c5]/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#a9f3c5]/20 text-[#a9f3c5] text-[11px] font-mono font-bold tracking-wider uppercase border border-[#a9f3c5]/30">
                Sequencial Comercial Atual
              </span>
              <span className="text-[#a9f3c5] text-xs font-mono font-bold">ID: #319</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Emitir Novo Orçamento Sequencial
            </h2>
            <p className="text-white/85 text-xs sm:text-sm max-w-2xl leading-relaxed">
              O próximo ID comercial sequencial é o <strong>#319</strong>. Defina os menus em cascata para classificar o orçamento e acompanhar sua contabilização direta neste Dashboard.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onStartNewQuote}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#a9f3c5] text-[#002111] font-bold text-sm hover:bg-white transition-all shadow-md active:scale-98"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>Iniciar Orçamento #319</span>
            </button>
          </div>
        </div>

        {/* Decorative backdrop elements */}
        <div className="absolute -right-8 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-32 -top-10 w-32 h-32 bg-[#a9f3c5]/10 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Main Header & Period Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold text-[#49607e] uppercase tracking-wider block font-mono">
            CONSENTRA GESTÃO COMERCIAL / VISÃO GERAL
          </span>
          <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
            Visão Geral Comercial & Contabilização de SST
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Period chips */}
          <div className="flex items-center bg-[#eff4ff] p-1 rounded-xl border border-[#c4dcff]/50 text-xs">
            <button
              onClick={() => setSelectedPeriod('mes')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedPeriod === 'mes'
                  ? 'bg-white text-[#004328] font-bold shadow-xs'
                  : 'text-[#49607e] hover:text-[#0b1c30]'
              }`}
            >
              Mês Atual: Set 2026
            </button>
            <button
              onClick={() => setSelectedPeriod('30dias')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedPeriod === '30dias'
                  ? 'bg-white text-[#004328] font-bold shadow-xs'
                  : 'text-[#49607e] hover:text-[#0b1c30]'
              }`}
            >
              Últimos 30 dias
            </button>
            <button
              onClick={() => setSelectedPeriod('trimestre')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedPeriod === 'trimestre'
                  ? 'bg-white text-[#004328] font-bold shadow-xs'
                  : 'text-[#49607e] hover:text-[#0b1c30]'
              }`}
            >
              Trimestre
            </button>
          </div>

          <button
            onClick={() => setActiveTab('relatorios')}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-xs font-semibold hover:bg-[#eff4ff] transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px] text-[#004328]">bar_chart</span>
            <span>Relatórios Mensal / Anual</span>
          </button>
        </div>
      </div>

      {/* NOVO: Barra de Filtros em Cascata do Dashboard */}
      <div className="p-4 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#eff4ff]">
          <div className="flex items-center gap-2 text-[#004328]">
            <span className="material-symbols-outlined text-[20px]">filter_alt</span>
            <span className="font-bold text-xs text-[#0b1c30]">
              Filtros em Cascata & Segmentação Analítica do Dashboard
            </span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#004328] text-white">
                {activeFilterCount} ativo{activeFilterCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1 transition-colors self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
              Limpar Filtros ({filteredQuotes.length} de {quotes.length} orçamentos)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Cascading Filter 1: Macro Categoria SST */}
          <div>
            <label className="block text-[11px] font-semibold text-[#49607e] mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#004328]">category</span>
              1. Macro Categoria SST
            </label>
            <select
              value={filterMacroCategory}
              onChange={(e) => handleMacroFilterChange(e.target.value)}
              className="w-full h-9 px-2.5 rounded-xl bg-[#eff4ff] text-xs font-semibold text-[#0b1c30] border border-[#c4dcff]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
            >
              <option value="all">Todas as Categorias</option>
              {CASCADING_MACRO_CATEGORIES.map(m => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cascading Filter 2: Subcategoria (Cascateia da macro) */}
          <div>
            <label className="block text-[11px] font-semibold text-[#49607e] mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#004328]">subdirectory_arrow_right</span>
              2. Subcategoria / NR
            </label>
            <select
              value={filterSubCategory}
              onChange={(e) => setFilterSubCategory(e.target.value)}
              disabled={filterMacroCategory === 'all'}
              className="w-full h-9 px-2.5 rounded-xl bg-[#eff4ff] text-xs font-medium text-[#0b1c30] border border-[#c4dcff]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">
                {filterMacroCategory === 'all' ? 'Selecione a Macro Categoria' : 'Todas as Subcategorias'}
              </option>
              {activeMacroForFilter?.subcategories.map(sc => (
                <option key={sc.id} value={sc.name}>
                  [{sc.nrCode}] {sc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Status Geral */}
          <div>
            <label className="block text-[11px] font-semibold text-[#49607e] mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#004328]">conversion_path</span>
              3. Status do Orçamento
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-9 px-2.5 rounded-xl bg-[#eff4ff] text-xs font-semibold text-[#0b1c30] border border-[#c4dcff]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
            >
              <option value="all">Todos os Status ({quotes.length})</option>
              {CASCADING_STATUS_LIST.map(st => (
                <option key={st.status} value={st.status}>
                  {st.status}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 4: Responsável Técnico */}
          <div>
            <label className="block text-[11px] font-semibold text-[#49607e] mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#004328]">person</span>
              4. Responsável Técnico
            </label>
            <select
              value={filterResponsibleTech}
              onChange={(e) => setFilterResponsibleTech(e.target.value)}
              className="w-full h-9 px-2.5 rounded-xl bg-[#eff4ff] text-xs font-medium text-[#0b1c30] border border-[#c4dcff]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
            >
              <option value="all">Todos os Responsáveis</option>
              {TECHNICAL_RESPONSIBLES.map(t => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 5: Prioridade */}
          <div>
            <label className="block text-[11px] font-semibold text-[#49607e] mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#004328]">flag</span>
              5. Prioridade
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full h-9 px-2.5 rounded-xl bg-[#eff4ff] text-xs font-medium text-[#0b1c30] border border-[#c4dcff]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
            >
              <option value="all">Todas as Prioridades</option>
              {PRIORITY_LEVELS.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* NOVO: Pipeline Contabilizado nos 7 Status de Orçamento */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0b1c30]">
            <span className="material-symbols-outlined text-[18px] text-[#004328]">stacked_bar_chart</span>
            <span>Contabilização no Pipeline (7 Status em Cascata)</span>
          </div>
          <span className="text-[11px] text-[#49607e]">
            Clique em qualquer card para filtrar o painel instantaneamente
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {statusAccounting.map((st) => {
            const isSelected = filterStatus === st.status;
            return (
              <button
                key={st.status}
                type="button"
                onClick={() => setFilterStatus(isSelected ? 'all' : st.status)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 shadow-2xs ${
                  isSelected 
                    ? 'border-[#004328] ring-2 ring-[#004328]/30 bg-white' 
                    : 'border-[#e5eeff] bg-white hover:border-[#004328]/40 hover:bg-[#f8faff]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${st.badgeBg} ${st.badgeText}`}>
                    {st.status}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#0b1c30]">
                    {st.count}
                  </span>
                </div>

                <div className="mt-1">
                  <div className="font-mono font-bold text-xs text-[#004328] truncate">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(st.sum)}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#64748b] mt-0.5">
                    <span>Participação</span>
                    <span className="font-semibold text-[#0f172a]">{st.pct}%</span>
                  </div>
                </div>

                <div className="w-full h-1 bg-[#eff4ff] rounded-full overflow-hidden mt-1">
                  <div 
                    className="h-full bg-[#004328] rounded-full transition-all" 
                    style={{ width: `${Math.min(Number(st.pct) * 2, 100)}%` }} 
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6 KPI Cards Grid (Recalculados com base nos orçamentos filtrados) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1 */}
        <div className="p-4 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#49607e]">Contabilizados</span>
            <span className="p-1.5 rounded-lg bg-[#eff4ff] text-[#004328]">
              <span className="material-symbols-outlined text-[18px]">send</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[#0b1c30] font-mono">{filteredQuotes.length}</span>
              <span className="text-xs text-[#49607e]">de {quotes.length}</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-[#0d5c3a] font-semibold">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              <span>100% auditados</span>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-4 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#49607e]">Valor Total Orçado</span>
            <span className="p-1.5 rounded-lg bg-[#eff4ff] text-[#004328]">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </span>
          </div>
          <div>
            <span className="text-lg font-bold text-[#0b1c30] font-mono truncate block">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalOrcadoFiltered)}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-[#0d5c3a] font-semibold">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              <span>Soma dos filtros</span>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-4 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#49607e]">Valor Aprovado</span>
            <span className="p-1.5 rounded-lg bg-[#e5eeff] text-[#004328]">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </span>
          </div>
          <div>
            <span className="text-lg font-bold text-[#004328] font-mono truncate block">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalAprovado)}
            </span>
            <div className="mt-1.5">
              <div className="flex justify-between text-[10px] text-[#49607e] font-semibold mb-0.5">
                <span>Conversão</span>
                <span className="text-[#004328]">{conversionRate}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#eff4ff] rounded-full overflow-hidden">
                <div className="h-full bg-[#004328] rounded-full" style={{ width: `${Math.min(Number(conversionRate), 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-4 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#49607e]">Em Negociação</span>
            <span className="p-1.5 rounded-lg bg-[#eff4ff] text-[#49607e]">
              <span className="material-symbols-outlined text-[18px]">pending</span>
            </span>
          </div>
          <div>
            <span className="text-lg font-bold text-[#0b1c30] font-mono truncate block">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPending)}
            </span>
            <div className="mt-1.5">
              <div className="flex justify-between text-[10px] text-[#49607e] font-semibold mb-0.5">
                <span>Qtd. Pendente</span>
                <span className="text-[#49607e]">{pendingQuotes.length} propostas</span>
              </div>
              <div className="w-full h-1.5 bg-[#eff4ff] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#49607e] rounded-full" 
                  style={{ width: `${filteredQuotes.length > 0 ? (pendingQuotes.length / filteredQuotes.length) * 100 : 0}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI 5 */}
        <div className="p-4 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#49607e]">Qtd. Aprovada</span>
            <span className="p-1.5 rounded-lg bg-[#eff4ff] text-[#004328]">
              <span className="material-symbols-outlined text-[18px]">task_alt</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[#004328] font-mono">{approvedQuotes.length}</span>
              <span className="text-xs text-[#49607e]">fechados</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-[#0d5c3a] font-semibold">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              <span>{conversionRate}% conversão</span>
            </div>
          </div>
        </div>

        {/* KPI 6 */}
        <div className="p-4 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#49607e]">Perdas / Reprovados</span>
            <span className="p-1.5 rounded-lg bg-[#ffdad6] text-[#ba1a1a]">
              <span className="material-symbols-outlined text-[18px]">cancel</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[#ba1a1a] font-mono">{rejectedQuotes.length}</span>
              <span className="text-xs text-[#49607e]">perdas</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-[#ba1a1a] font-semibold">
              <span>{lossRate}% taxa de perda</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Charts and Urgency Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Evolution Chart (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="font-bold text-base text-[#0b1c30]">Evolução de Emissões & Fechamentos SST</h3>
              <p className="text-xs text-[#49607e]">Comparativo mensal: volume financeiro orçado vs. faturamento aprovado</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#c4dcff]" />
                <span className="text-[#49607e]">Orçado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#004328]" />
                <span className="text-[#004328] font-bold">Aprovado</span>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="h-64 flex items-end justify-between gap-3 sm:gap-6 pt-6 px-2 border-b border-[#eff4ff]">
            {monthlyData.map((item) => {
              const maxVal = 380;
              const orcadoHeight = (item.orcado / maxVal) * 100;
              const aprovadoHeight = (item.aprovado / maxVal) * 100;
              const isHovered = hoveredMonth === item.month;

              return (
                <div
                  key={item.month}
                  onMouseEnter={() => setHoveredMonth(item.month)}
                  onMouseLeave={() => setHoveredMonth(null)}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-12 z-20 p-2 rounded-xl bg-[#0b1c30] text-white text-[11px] font-mono shadow-lg whitespace-nowrap">
                      <div>Orçado: {item.orcadoLabel}</div>
                      <div>Aprovado: {item.aprovadoLabel}</div>
                    </div>
                  )}

                  <div className="w-full flex items-end justify-center gap-1.5 h-full">
                    {/* Orçado bar */}
                    <div
                      style={{ height: `${orcadoHeight}%` }}
                      className="w-full max-w-[20px] rounded-t-md bg-[#c4dcff] group-hover:bg-[#a9c9f5] transition-all relative"
                    />
                    {/* Aprovado bar */}
                    <div
                      style={{ height: `${aprovadoHeight}%` }}
                      className="w-full max-w-[20px] rounded-t-md bg-[#004328] group-hover:bg-[#005c3e] transition-all relative"
                    />
                  </div>
                  <span className={`text-xs font-medium transition-colors ${
                    isHovered ? 'text-[#004328] font-bold' : 'text-[#49607e]'
                  }`}>
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-[#49607e] pt-3">
            <span>Média de faturamento mensal: <strong>R$ 164.200</strong></span>
            <span className="font-mono text-[11px]">SST Analytics Engine</span>
          </div>
        </div>

        {/* Retorno Urgente (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">hourglass_top</span>
                <h3 className="font-bold text-base text-[#0b1c30]">Retorno Urgente</h3>
              </div>
              <span className="text-[10px] font-bold bg-[#ffdad6] text-[#ba1a1a] px-2 py-0.5 rounded-full">
                Vencem em até 5 dias
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {urgentQuotes.map((q) => (
                <div
                  key={q.id}
                  className="p-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/60 flex flex-col gap-2 hover:border-[#004328]/40 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-[#004328]">{q.id.replace('#', '')}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                          Validade: {q.validityDate}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-[#0b1c30] mt-0.5 line-clamp-1">{q.clientName}</h4>
                      {q.macroCategory && (
                        <span className="text-[10px] text-[#49607e] block">
                          {q.macroCategory}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-xs text-[#004328]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(q.total)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#c4dcff]/40">
                    <span className="text-[11px] text-[#49607e] line-clamp-1">
                      {q.statusSubStage || q.scopeSummary?.slice(0, 35)}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onSendWhatsapp(q)}
                        title="Cobrança via WhatsApp"
                        className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">chat</span>
                      </button>
                      <button
                        onClick={() => onSendEmail(q)}
                        title="Enviar E-mail"
                        className="w-7 h-7 rounded-lg bg-[#c4dcff] hover:bg-[#a9c9f5] text-[#004328] flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">mail</span>
                      </button>
                      <button
                        onClick={() => onOpenPdf(q)}
                        title="Ver Proposta"
                        className="w-7 h-7 rounded-lg bg-white hover:bg-[#eff4ff] text-[#0b1c30] flex items-center justify-center border border-[#e5eeff] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={() => setActiveTab('orcamentos')}
              className="w-full py-2 px-3 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] font-semibold text-xs transition-colors flex items-center justify-center gap-1"
            >
              <span>Acessar Pipeline Completo</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Mix de Serviços SST & Compliance Auditoria */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mix de Serviços SST (7 cols) - Contabilização Dinâmica das Macro Categorias */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-[#0b1c30]">Mix de Serviços SST Orçados</h3>
              <p className="text-xs text-[#49607e]">Contabilização do faturamento pelas Macro Categorias selecionadas nos orçamentos</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#004328] bg-[#eff4ff] px-2.5 py-1 rounded-lg">
              Total Geral: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalOrcadoAll)}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {mixDeServicos.map((item) => (
              <div 
                key={item.name} 
                onClick={() => setFilterMacroCategory(filterMacroCategory === item.name ? 'all' : item.name)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  filterMacroCategory === item.name 
                    ? 'border-[#004328] bg-[#eff4ff]/60' 
                    : 'border-[#eff4ff] hover:bg-[#f8fafc]'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-[#0b1c30]">{item.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                      {item.count} orçamentos
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-[#004328]">{item.pct}%</span>
                    <span className="text-[#49607e] text-[11px] ml-1.5">
                      ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(item.total)})
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-[#eff4ff] rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.max(Number(item.pct), 2)}%`, backgroundColor: item.color }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Auditoria Técnica de Conformidade (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#004328] mb-3">
              <span className="material-symbols-outlined text-[24px]">verified_user</span>
              <h3 className="font-bold text-base text-[#0b1c30]">Auditoria Técnica & eSocial</h3>
            </div>

            <p className="text-xs text-[#49607e] leading-relaxed mb-4">
              Todos os orçamentos emitidos pelo sistema Consentra seguem rigorosamente os parâmetros da <strong>Portaria MTP 4.219</strong> e das Normas Regulamentadoras vigentes, garantindo conformidade jurídica e técnica aos clientes.
            </p>

            <div className="flex flex-col gap-2.5">
              <div className="p-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#004328] text-[20px]">assignment_turned_in</span>
                  <div>
                    <h5 className="font-bold text-xs text-[#0b1c30]">Eventos S-2220 e S-2240</h5>
                    <span className="text-[11px] text-[#49607e]">Estrutura de dados compatível com leiaute S-1.2</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">100% OK</span>
              </div>

              <div className="p-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#004328] text-[20px]">badge</span>
                  <div>
                    <h5 className="font-bold text-xs text-[#0b1c30]">Anotação de Resp. Técnica (ART)</h5>
                    <span className="text-[11px] text-[#49607e]">CREA-SP 506.892/D vinculado a laudos</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Válido</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between text-xs text-[#49607e] border-t border-[#eff4ff]">
            <span>Sede Operacional</span>
            <span className="font-mono font-semibold text-[#004328]">Consentra SST</span>
          </div>
        </div>
      </div>

      {/* Row 4: Propostas Comerciais Recentes com Classificação Cascata */}
      <div className="p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-[#0b1c30]">Propostas Comerciais Classificadas</h3>
            <p className="text-xs text-[#49607e]">
              Orçamentos recentes com categoria técnica SST, sub-etapa e contabilização
            </p>
          </div>
          <button
            onClick={() => setActiveTab('orcamentos')}
            className="text-xs font-bold text-[#004328] hover:underline flex items-center gap-1"
          >
            <span>Ver todos os {quotes.length} orçamentos</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#eff4ff] text-[#49607e]">
                <th className="py-3 px-3 font-semibold">Número</th>
                <th className="py-3 px-3 font-semibold">Cliente</th>
                <th className="py-3 px-3 font-semibold">Classificação SST</th>
                <th className="py-3 px-3 font-semibold">Sub-etapa / Funil</th>
                <th className="py-3 px-3 font-semibold">Valor Total</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f8f9ff]">
              {recentQuotes.map((quote) => {
                const statusDef = CASCADING_STATUS_LIST.find(s => s.status === quote.status) || CASCADING_STATUS_LIST[0];

                return (
                  <tr key={quote.id} className="hover:bg-[#eff4ff]/40 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-[#004328]">
                      {quote.id.replace('#', '')}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-[#0b1c30]">{quote.clientName}</div>
                      <div className="text-[11px] text-[#49607e]">{quote.cnpj}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-[#0b1c30] text-[11px]">
                          {quote.macroCategory || 'Programas e Laudos'}
                        </span>
                        {quote.subCategory && (
                          <span className="text-[10px] text-[#004328] font-medium truncate max-w-[200px]">
                            {quote.subCategory}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#f0f4f8] text-[#49607e] border border-[#e2e8f0]">
                        {quote.statusSubStage || 'Padrão'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#0b1c30]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.total)}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusDef.badgeBg} ${statusDef.badgeText}`}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onOpenPdf(quote)}
                          title="Visualizar Proposta A4"
                          className="p-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </button>
                        <button
                          onClick={() => onSendWhatsapp(quote)}
                          title="Compartilhar via WhatsApp"
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">chat</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
