'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { BrandLogo } from './ui/BrandLogo';
import { Quote } from '@/lib/types';
import { downloadQuotePdf, downloadReportPdf, ReportItem, ReportSummary } from '@/lib/pdf-generator';
import { responsibleFilterOptions } from '@/lib/responsibles';
import { getStoredCompanyProfile, CompanyProfile } from '@/lib/company';
import { getStoredLogoUrl } from '@/lib/logo';

interface ReportsViewProps {
  quotes: Quote[];
  onOpenPdf: (quote: Quote) => void;
  onDeleteQuote?: (quoteId: string) => void;
  /** Responsáveis cadastrados (Configurações). */
  responsiblePersons?: string[];
}

const MONTHS_LIST = [
  { value: 'all', label: 'Todos os Meses' },
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
];

export const ReportsView: React.FC<ReportsViewProps> = ({ quotes, onOpenPdf, onDeleteQuote, responsiblePersons = [] }) => {
  const responsibleOptions = useMemo(() => responsibleFilterOptions(responsiblePersons, quotes), [responsiblePersons, quotes]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => getStoredCompanyProfile());
  const [logoUrl, setLogoUrl] = useState<string>(() => getStoredLogoUrl());

  useEffect(() => {
    const handleCompanyUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<CompanyProfile>;
      if (customEvent.detail) {
        setCompanyProfile(customEvent.detail);
      } else {
        setCompanyProfile(getStoredCompanyProfile());
      }
    };
    const handleLogoUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setLogoUrl(customEvent.detail);
      } else {
        setLogoUrl(getStoredLogoUrl());
      }
    };
    window.addEventListener('consentra_company_profile_updated', handleCompanyUpdate);
    window.addEventListener('consentra_logo_updated', handleLogoUpdate);
    return () => {
      window.removeEventListener('consentra_company_profile_updated', handleCompanyUpdate);
      window.removeEventListener('consentra_logo_updated', handleLogoUpdate);
    };
  }, []);

  // Filtros de Mês e Ano (padrão no ano atual 2026)
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedResponsible, setSelectedResponsible] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [downloadingQuoteId, setDownloadingQuoteId] = useState<string | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);

  // Helper para formatar moeda brasileira
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Filtragem dos orçamentos com base no Mês, Ano e demais critérios
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      // Data formato DD/MM/YYYY ou similar
      const parts = q.issueDate ? q.issueDate.split('/') : [];
      const itemYear = parts[2] || '';
      const itemMonth = parts[1] || '';

      // Filtro Ano
      if (selectedYear !== 'all' && itemYear !== selectedYear) {
        return false;
      }

      // Filtro Mês
      if (selectedMonth !== 'all' && itemMonth !== selectedMonth) {
        return false;
      }

      // Filtro Status
      if (selectedStatus !== 'all' && q.status !== selectedStatus) {
        return false;
      }

      // Filtro Responsável
      if (selectedResponsible !== 'all' && q.responsibleTech !== selectedResponsible) {
        return false;
      }

      // Busca por texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesClient = q.clientName.toLowerCase().includes(query);
        const matchesCnpj = q.cnpj.toLowerCase().includes(query);
        const matchesId = String(q.id).toLowerCase().includes(query);
        if (!matchesClient && !matchesCnpj && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [quotes, selectedYear, selectedMonth, selectedStatus, selectedResponsible, searchQuery]);

  // Cálculos do Resumo Executivo do período filtrado
  const summary: ReportSummary = useMemo(() => {
    const totalQuotes = filteredQuotes.length;
    const totalValue = filteredQuotes.reduce((acc, q) => acc + q.total, 0);
    const approvedQuotes = filteredQuotes.filter((q) => q.status === 'Aprovado');
    const approvedValue = approvedQuotes.reduce((acc, q) => acc + q.total, 0);
    const approvedCount = approvedQuotes.length;
    const pendingCount = filteredQuotes.filter((q) => q.status === 'Aguardando Retorno' || q.status === 'Enviado').length;
    const rejectedCount = filteredQuotes.filter((q) => q.status === 'Reprovado').length;
    const conversionRate = totalQuotes > 0 ? (approvedCount / totalQuotes) * 100 : 0;

    const monthObj = MONTHS_LIST.find((m) => m.value === selectedMonth);
    const monthLabel = selectedMonth === 'all' ? 'Ano Inteiro' : (monthObj?.label || selectedMonth);

    return {
      monthLabel,
      year: selectedYear === 'all' ? 'Todos os Anos' : selectedYear,
      totalQuotes,
      totalValue,
      approvedValue,
      approvedCount,
      pendingCount,
      rejectedCount,
      conversionRate
    };
  }, [filteredQuotes, selectedMonth, selectedYear]);

  // Itens para o exportador de PDF
  const reportItems: ReportItem[] = useMemo(() => {
    return filteredQuotes.map((q) => ({
      id: q.id,
      clientName: q.clientName,
      cnpj: q.cnpj,
      issueDate: q.issueDate,
      status: q.status,
      responsibleTech: q.responsibleTech || 'Washington Assis',
      macroCategory: q.macroCategory,
      total: q.total
    }));
  }, [filteredQuotes]);

  // Ação: Baixar Relatório em PDF
  const handleDownloadReportPdf = async () => {
    setIsExportingPdf(true);
    const success = await downloadReportPdf(reportItems, summary);
    setIsExportingPdf(false);
    if (success) {
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    }
  };

  // Ação: Imprimir Relatório
  const handlePrintReport = () => {
    window.print();
  };

  // Ação: Exportar CSV para Excel
  const handleExportCsv = () => {
    const headers = ['Numero', 'Data', 'Cliente', 'CNPJ', 'Responsavel', 'Categoria', 'Status', 'Valor Total'];
    const rows = filteredQuotes.map((q) => [
      `"${String(q.id).replace('#', '')}"`,
      `"${q.issueDate}"`,
      `"${q.clientName.replace(/"/g, '""')}"`,
      `"${q.cnpj}"`,
      `"${q.responsibleTech || 'Washington Assis'}"`,
      `"${q.macroCategory || 'SST'}"`,
      `"${q.status}"`,
      `"${q.total.toFixed(2)}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_consentra_${summary.monthLabel}_${summary.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download individual de orçamento diretamente da tabela
  const handleDownloadSingleQuote = async (quote: Quote) => {
    setDownloadingQuoteId(quote.id);
    await downloadQuotePdf(quote);
    setDownloadingQuoteId(null);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-[#e5eeff]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#004328] text-white material-symbols-outlined text-[20px]">
              analytics
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0b1c30] tracking-tight">
              Relatórios de Orçamentos SST
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-[#004328]">
              Ano Base: {selectedYear === 'all' ? 'Todos' : selectedYear}
            </span>
          </div>
          <p className="text-xs text-[#49607e]">
            Filtre por mês e ano para consolidação comercial, controle de volume faturado e exportação oficial em PDF.
          </p>
        </div>

        {/* Action Buttons: Download PDF, Print & CSV */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-xs font-semibold hover:bg-[#eff4ff] transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Exportar dados para planilha Excel / CSV"
          >
            <span className="material-symbols-outlined text-[18px] text-[#49607e]">table_view</span>
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-xs font-semibold hover:bg-[#eff4ff] transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Imprimir relatório na impressora ou salvar pelo navegador"
          >
            <span className="material-symbols-outlined text-[18px] text-[#49607e]">print</span>
            <span>Imprimir Relatório</span>
          </button>

          <button
            onClick={handleDownloadReportPdf}
            disabled={isExportingPdf}
            className="px-4 py-2 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            title="Baixar Relatório Oficial Consolidado em formato PDF"
          >
            <span className={`material-symbols-outlined text-[18px] ${isExportingPdf ? 'animate-spin' : ''}`}>
              {isExportingPdf ? 'sync' : exportSuccess ? 'check_circle' : 'picture_as_pdf'}
            </span>
            <span>{isExportingPdf ? 'Gerando PDF...' : exportSuccess ? 'Relatório Baixado!' : 'Baixar Relatório em .PDF'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Filter Menu: Year, Month, Status & Technician */}
      <div className="p-5 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
          <div className="flex items-center gap-2 text-[#004328]">
            <span className="material-symbols-outlined text-[22px]">tune</span>
            <h2 className="font-bold text-sm text-[#0b1c30]">
              Menu de Filtros por Período & Parâmetros
            </h2>
          </div>
          <span className="text-xs text-[#49607e]">
            {filteredQuotes.length} orçamento{filteredQuotes.length !== 1 ? 's' : ''} encontrado{filteredQuotes.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Filtro: Ano */}
          <div>
            <label className="block text-[11px] font-bold text-[#0b1c30] mb-1">
              Ano de Referência
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#f8fafc] text-xs font-semibold text-[#0b1c30] border border-[#cbd5e1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
            >
              <option value="2026">2026 (Ano Atual)</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="all">Todos os Anos</option>
            </select>
          </div>

          {/* Filtro: Mês */}
          <div>
            <label className="block text-[11px] font-bold text-[#0b1c30] mb-1">
              Mês de Referência
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#f8fafc] text-xs font-semibold text-[#0b1c30] border border-[#cbd5e1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
            >
              {MONTHS_LIST.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro: Status Comercial */}
          <div>
            <label className="block text-[11px] font-bold text-[#0b1c30] mb-1">
              Status do Orçamento
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#f8fafc] text-xs font-semibold text-[#0b1c30] border border-[#cbd5e1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
            >
              <option value="all">Todos os Status</option>
              <option value="Aprovado">Aprovados</option>
              <option value="Aguardando Retorno">Aguardando Retorno</option>
              <option value="Enviado">Enviados</option>
              <option value="Rascunho">Rascunhos</option>
              <option value="Reprovado">Reprovados</option>
              <option value="Vencido">Vencidos</option>
              <option value="Cancelado">Cancelados</option>
            </select>
          </div>

          {/* Filtro: Responsável Técnico */}
          <div>
            <label className="block text-[11px] font-bold text-[#0b1c30] mb-1">
              Responsável Técnico
            </label>
            <select
              value={selectedResponsible}
              onChange={(e) => setSelectedResponsible(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#f8fafc] text-xs font-semibold text-[#0b1c30] border border-[#cbd5e1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
            >
              <option value="all">Todos os Responsáveis</option>
              {responsibleOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Busca Textual */}
          <div>
            <label className="block text-[11px] font-bold text-[#0b1c30] mb-1">
              Buscar Cliente / CNPJ
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por nome ou CNPJ..."
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#f8fafc] text-xs font-semibold text-[#0b1c30] border border-[#cbd5e1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
              />
            </div>
          </div>
        </div>

        {/* Chips de Acesso Rápido aos Meses */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#eff4ff]">
          <span className="text-[11px] font-bold text-[#49607e] mr-2">Meses de {selectedYear === 'all' ? '2026' : selectedYear}:</span>
          {MONTHS_LIST.map((m) => {
            const isSelected = selectedMonth === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setSelectedMonth(m.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#004328] text-white shadow-2xs scale-102'
                    : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards: Executive Summary of the filtered period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Orçado */}
        <div className="p-5 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#49607e]">Total Orçado no Período</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">request_quote</span>
            </div>
          </div>
          <span className="text-2xl font-extrabold text-[#0b1c30]">
            {formatCurrency(summary.totalValue)}
          </span>
          <span className="text-[11px] text-[#49607e]">
            {summary.totalQuotes} proposta{summary.totalQuotes !== 1 ? 's' : ''} em {summary.monthLabel}/{summary.year}
          </span>
        </div>

        {/* Card 2: Total Aprovado */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-[0_1px_4px_rgba(0,67,40,0.04)] flex flex-col gap-2 bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Volume Fechado / Aprovado</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#004328] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
            </div>
          </div>
          <span className="text-2xl font-extrabold text-[#004328]">
            {formatCurrency(summary.approvedValue)}
          </span>
          <span className="text-[11px] text-emerald-700 font-medium">
            {summary.approvedCount} proposta{summary.approvedCount !== 1 ? 's' : ''} aprovada{summary.approvedCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Card 3: Taxa de Conversão */}
        <div className="p-5 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#49607e]">Taxa de Conversão</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">trending_up</span>
            </div>
          </div>
          <span className="text-2xl font-extrabold text-[#0b1c30]">
            {summary.conversionRate.toFixed(1)}%
          </span>
          <span className="text-[11px] text-[#49607e]">
            Meta corporativa: 35.0%
          </span>
        </div>

        {/* Card 4: Ticket Médio */}
        <div className="p-5 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#49607e]">Ticket Médio da Proposta</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">price_check</span>
            </div>
          </div>
          <span className="text-2xl font-extrabold text-[#0b1c30]">
            {summary.totalQuotes > 0
              ? formatCurrency(summary.totalValue / summary.totalQuotes)
              : 'R$ 0,00'}
          </span>
          <span className="text-[11px] text-[#49607e]">
            {summary.pendingCount} pendente{summary.pendingCount !== 1 ? 's' : ''} em negociação
          </span>
        </div>
      </div>

      {/* Main Report Table Container */}
      <div className="bg-white rounded-2xl border border-[#e5eeff] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-[#eff4ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fafcff]">
          <div>
            <h3 className="font-bold text-sm text-[#0b1c30]">
              Detalhamento de Propostas — {summary.monthLabel} de {summary.year}
            </h3>
            <p className="text-xs text-[#49607e]">
              Exibindo listagem analítica com valores unitários, totais e status de emissão.
            </p>
          </div>
          <div className="text-xs font-semibold text-[#004328] bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            Total do Relatório: {formatCurrency(summary.totalValue)}
          </div>
        </div>

        {filteredQuotes.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-[#94a3b8] mb-2">
              folder_off
            </span>
            <p className="font-bold text-sm text-[#0b1c30]">Nenhum orçamento encontrado no período selecionado.</p>
            <p className="text-xs text-[#64748b] mt-1">
              Tente selecionar outro mês ou ano no menu superior para visualizar os dados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] text-[#475569] font-bold border-b border-[#e2e8f0]">
                  <th className="py-3 px-4">Nº</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Cliente / Razão Social</th>
                  <th className="py-3 px-4">CNPJ</th>
                  <th className="py-3 px-4">Resp. Técnico</th>
                  <th className="py-3 px-4">Categoria SST</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {filteredQuotes.map((q) => {
                  const isApproved = q.status === 'Aprovado';
                  const isPending = q.status === 'Aguardando Retorno' || q.status === 'Enviado';
                  const isDownloadingThis = downloadingQuoteId === q.id;

                  return (
                    <tr key={q.id} className="hover:bg-[#f8fafc]/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#004328]">
                        {String(q.numberOnly || q.id).replace('#', '')}
                      </td>
                      <td className="py-3 px-4 text-[#475569] whitespace-nowrap">
                        {q.issueDate}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#0b1c30]">
                        <div>{q.clientName}</div>
                        {q.riskGrade && (
                          <div className="text-[10px] text-[#64748b] font-normal">{q.riskGrade}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#64748b] whitespace-nowrap">
                        {q.cnpj}
                      </td>
                      <td className="py-3 px-4 text-[#475569]">
                        {q.responsibleTech || 'Washington Assis'}
                      </td>
                      <td className="py-3 px-4 text-[#475569]">
                        {q.macroCategory || 'Programas e Laudos'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#0b1c30] whitespace-nowrap">
                        {formatCurrency(q.total)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onOpenPdf(q)}
                            title="Visualizar Proposta em A4"
                            className="p-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[17px]">visibility</span>
                          </button>
                          <button
                            onClick={() => handleDownloadSingleQuote(q)}
                            disabled={isDownloadingThis}
                            title="Baixar Orçamento em PDF"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#004328] transition-colors disabled:opacity-50"
                          >
                            <span className={`material-symbols-outlined text-[17px] ${isDownloadingThis ? 'animate-spin' : ''}`}>
                              {isDownloadingThis ? 'sync' : 'download'}
                            </span>
                          </button>
                          {onDeleteQuote && (
                            <button
                              onClick={() => setQuoteToDelete(q)}
                              title="Excluir este relatório/orçamento"
                              className="p-1.5 rounded-lg bg-[#ffdad6]/50 hover:bg-[#ffdad6] text-[#ba1a1a] transition-colors"
                            >
                              <span className="material-symbols-outlined text-[17px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer with totals */}
        {filteredQuotes.length > 0 && (
          <div className="p-4 bg-[#f8fafc] border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between text-xs gap-2">
            <span className="text-[#64748b]">
              Mostrando {filteredQuotes.length} de {quotes.length} orçamentos totais do sistema.
            </span>
            <div className="flex items-center gap-3">
              <span className="font-bold text-[#0b1c30]">
                Volume Consolidado:
              </span>
              <span className="text-sm font-extrabold text-[#004328]">
                {formatCurrency(summary.totalValue)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Printable official layout - rendered for standard browser print dialog */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 text-black">
        <div className="border-b-2 border-[#004328] pb-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <BrandLogo
                src={logoUrl}
                alt="Consentra Gestão SST"
                className="h-12 w-auto max-w-[200px] object-contain"
                style={{ objectFit: 'contain', width: 'auto', maxHeight: '48px' }}
              />
              <div>
                <h1 className="text-xl font-bold text-[#004328]">{companyProfile.name}</h1>
                <p className="text-xs text-gray-600">
                  CNPJ: {companyProfile.cnpj} • Telefone: {companyProfile.phone} • E-mail: {companyProfile.email}
                </p>
                <p className="text-[11px] text-gray-500">{companyProfile.address}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block">
                Emitido em: {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-200">
            <h2 className="text-base font-bold text-gray-800">
              Relatório Comercial SST — {summary.monthLabel} de {summary.year}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6 border p-4 rounded-lg bg-gray-50 text-xs">
          <div>
            <div className="font-bold text-gray-600">Total de Propostas</div>
            <div className="text-lg font-bold text-gray-900">{summary.totalQuotes}</div>
          </div>
          <div>
            <div className="font-bold text-gray-600">Total Orçado</div>
            <div className="text-lg font-bold text-[#004328]">{formatCurrency(summary.totalValue)}</div>
          </div>
          <div>
            <div className="font-bold text-gray-600">Total Aprovado</div>
            <div className="text-lg font-bold text-emerald-700">{formatCurrency(summary.approvedValue)}</div>
          </div>
          <div>
            <div className="font-bold text-gray-600">Taxa de Conversão</div>
            <div className="text-lg font-bold text-gray-900">{summary.conversionRate.toFixed(1)}%</div>
          </div>
        </div>

        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-400 bg-gray-100">
              <th className="p-2">Nº</th>
              <th className="p-2">Data</th>
              <th className="p-2">Cliente</th>
              <th className="p-2">CNPJ</th>
              <th className="p-2">Responsável</th>
              <th className="p-2">Status</th>
              <th className="p-2 text-right">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.map((q) => (
              <tr key={q.id} className="border-b border-gray-200">
                <td className="p-2 font-mono">{String(q.numberOnly || q.id).replace('#', '')}</td>
                <td className="p-2">{q.issueDate}</td>
                <td className="p-2 font-bold">{q.clientName}</td>
                <td className="p-2 font-mono text-[10px]">{q.cnpj}</td>
                <td className="p-2">{q.responsibleTech || 'Washington Assis'}</td>
                <td className="p-2">{q.status}</td>
                <td className="p-2 text-right font-bold">{formatCurrency(q.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal for Quote/Report Deletion */}
      {quoteToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-[#ffdad6] shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">delete_forever</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-[#0b1c30]">Excluir Orçamento / Relatório?</h3>
                <p className="text-xs text-[#49607e]">Esta ação removerá permanentemente este orçamento do relatório e do sistema.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#004328] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Nº {String(quoteToDelete.numberOnly || quoteToDelete.id).replace('#', '')}
                </span>
                <span className="font-bold text-[#0b1c30]">{formatCurrency(quoteToDelete.total)}</span>
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
                  if (onDeleteQuote && quoteToDelete) {
                    onDeleteQuote(quoteToDelete.id);
                  }
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
    </div>
  );
};
