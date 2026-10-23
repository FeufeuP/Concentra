'use client';

import React, { useState, useMemo } from 'react';
import { useDialog } from './ui/DialogProvider';
import { useToast } from './ui/ToastProvider';
import { CatalogService } from '@/lib/types';
import { ServiceFormDrawer } from './services/ServiceFormDrawer';

interface ServicesViewProps {
  /** Catálogo persistido (Supabase ou localStorage), mantido pela página. */
  services: CatalogService[];
  /** Grava o serviço; retorna false em caso de falha (o erro já é exibido pela página). */
  onSaveService: (service: CatalogService, isNew: boolean) => Promise<boolean>;
  onDeleteService: (serviceId: string) => Promise<boolean>;
  canEdit?: boolean;
  onSelectServiceForNewQuote?: (service: CatalogService) => void;
}

export function nextServiceCode(services: CatalogService[]): string {
  const max = services.reduce((acc, s) => {
    const n = parseInt(String(s.code || '').replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  const next = max + 1;
  return `#SRV-${next < 10 ? '0' : ''}${next}`;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  onSaveService,
  onDeleteService,
  canEdit = true,
  onSelectServiceForNewQuote,
}) => {
  const [isPersisting, setIsPersisting] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedNrFilter, setSelectedNrFilter] = useState<string>('Todas');
  const [sortBy, setSortBy] = useState<'recent' | 'price-asc' | 'price-desc' | 'code' | 'name'>('recent');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Drawer (Slide-Over) State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<CatalogService | null>(null);

  // Drawer Form State
  const showToast = useToast();
  const { confirm } = useDialog();

  // Categories for Filter Pills
  const categoriesList = [
    { name: 'Todos', count: services.length },
    { name: 'Programas NR', count: services.filter(s => s.category === 'Programas NR' || s.nrCategory?.includes('NR-01')).length },
    { name: 'Laudos Técnicos', count: services.filter(s => s.category === 'Laudos Técnicos' || s.nrCategory?.includes('Previdenciário')).length },
    { name: 'Treinamentos', count: services.filter(s => s.category === 'Treinamentos' || s.nrCategory?.includes('NR-35') || s.nrCategory?.includes('NR-10')).length },
    { name: 'Saúde Ocupacional', count: services.filter(s => s.category === 'Saúde Ocupacional' || s.nrCategory?.includes('NR-07')).length },
    { name: 'Gestão eSocial', count: services.filter(s => s.category === 'Gestão eSocial' || s.nrCategory?.includes('eSocial')).length },
  ];

  // Filtering & Sorting
  const filteredServices = useMemo(() => {
    return services.filter(item => {
      // Category pill filter
      let matchesCat = true;
      if (selectedCategory !== 'Todos') {
        matchesCat = item.category === selectedCategory || 
                     (selectedCategory === 'Programas NR' && item.nrCategory?.includes('NR-01')) ||
                     (selectedCategory === 'Laudos Técnicos' && (item.category === 'Laudos Técnicos' || item.nrCategory?.includes('Previdenciário'))) ||
                     (selectedCategory === 'Treinamentos' && (item.category === 'Treinamentos' || item.nrCategory?.includes('NR-35') || item.nrCategory?.includes('NR-10') || item.nrCategory?.includes('NR-05'))) ||
                     (selectedCategory === 'Saúde Ocupacional' && (item.category === 'Saúde Ocupacional' || item.nrCategory?.includes('NR-07'))) ||
                     (selectedCategory === 'Gestão eSocial' && (item.category === 'Gestão eSocial' || item.nrCategory?.includes('eSocial')));
      }

      // NR selector filter
      let matchesNr = true;
      if (selectedNrFilter !== 'Todas') {
        matchesNr = item.nrCategory?.toLowerCase().includes(selectedNrFilter.toLowerCase()) || 
                    item.title.toLowerCase().includes(selectedNrFilter.toLowerCase());
      }

      // Search query
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
                            item.title.toLowerCase().includes(query) ||
                            (item.code && item.code.toLowerCase().includes(query)) ||
                            item.description.toLowerCase().includes(query) ||
                            (item.subtitle && item.subtitle.toLowerCase().includes(query)) ||
                            item.nrCategory.toLowerCase().includes(query);

      return matchesCat && matchesNr && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.suggestedPrice - b.suggestedPrice;
      if (sortBy === 'price-desc') return b.suggestedPrice - a.suggestedPrice;
      if (sortBy === 'code') return (a.code || a.id).localeCompare(b.code || b.id);
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      return 0; // recent/default
    });
  }, [services, selectedCategory, selectedNrFilter, searchTerm, sortBy]);

  // Paginated Items
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage) || 1;
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredServices.slice(start, start + itemsPerPage);
  }, [filteredServices, currentPage]);

  const handleOpenNewDrawer = () => {
    setEditingService(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (service: CatalogService) => {
    setEditingService(service);
    setIsDrawerOpen(true);
  };

  const handleSubmitService = async (service: CatalogService, isNew: boolean) => {
    if (isPersisting) return;
    setIsPersisting(true);
    const ok = await onSaveService(service, isNew);
    setIsPersisting(false);
    if (!ok) return;
    showToast(isNew ? `Novo serviço ${service.code} cadastrado no catálogo!` : `Serviço ${service.code} atualizado com sucesso!`);
    setIsDrawerOpen(false);
  };

  // Duplicate Service
  const handleDuplicate = async (service: CatalogService) => {
    const nextCode = nextServiceCode(services);
    const duplicated: CatalogService = {
      ...service,
      id: `srv-${Date.now()}`,
      code: nextCode,
      title: `${service.title} (Cópia)`,
      status: 'Ativo'
    };

    const ok = await onSaveService(duplicated, true);
    if (!ok) return;
    showToast(`Serviço duplicado como ${nextCode}!`);
  };

  // Delete Service
  const handleDelete = async (serviceId: string, title: string) => {
    const ok = await confirm({
      title: 'Remover serviço?',
      message: `O serviço "${title}" será removido do catálogo.`,
      confirmLabel: 'Remover',
      tone: 'danger',
    });
    if (ok) {
      const ok = await onDeleteService(serviceId);
      if (!ok) return;
      setSelectedIds(prev => prev.filter(id => id !== serviceId));
      showToast(`Serviço removido com sucesso.`);
    }
  };

  // Select all toggle
  const handleToggleSelectAll = () => {
    if (selectedIds.length === paginatedServices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedServices.map(s => s.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Export JSON/CSV
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(services, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `catalogo_consentra_sst_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Catálogo técnico exportado em formato JSON com sucesso!');
  };

  return (
    <div className="flex flex-col w-full gap-6 max-w-7xl mx-auto">

      {/* BREADCRUMB & CONTEXT HEADER */}
      <div className="flex flex-col gap-1">
        <nav className="flex items-center gap-1.5 text-[#49607e] text-xs">
          <span className="hover:text-[#004328] transition-colors cursor-pointer font-medium">Consentra Gestão Comercial</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="hover:text-[#004328] transition-colors cursor-pointer font-medium">Cadastros Base</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#004328] font-semibold">Serviços</span>
        </nav>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-1">
          <div className="flex flex-col max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
              Catálogo de Serviços de SST
            </h1>
            <p className="text-xs sm:text-sm text-[#49607e] mt-1 leading-relaxed">
              Cadastre, precifique e padronize o escopo técnico de laudos, programas normativos (NRs), treinamentos e exames ocupacionais para agilizar a emissão de orçamentos e contratos corporativos.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
            <button
              onClick={handleExportData}
              type="button"
              className="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] font-medium text-xs sm:text-sm shadow-xs hover:bg-[#eff4ff] hover:border-[#c4dcff] transition-all cursor-pointer"
              title="Exportar base de serviços em JSON"
            >
              <span className="material-symbols-outlined text-[18px] text-[#49607e]">swap_vert</span>
              <span>Importar / Exportar</span>
            </button>

{canEdit && (
            <button
              onClick={handleOpenNewDrawer}
              type="button"
              className="flex items-center gap-1.5 px-5 h-10 rounded-xl bg-[#0d5c3a] text-white font-medium text-xs sm:text-sm shadow-md hover:bg-[#004328] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_box</span>
              <span>Novo Serviço / Item</span>
            </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI SUMMARY TILES (BENTO ROW) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Serviços */}
        <div className="flex flex-col p-5 rounded-2xl bg-white border border-[#e5eeff] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#49607e] uppercase tracking-wider">
              Total de Itens Ativos
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#004328]">
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2.5">
            <span className="text-3xl font-bold text-[#0b1c30]">{services.length}</span>
            <span className="text-xs text-[#49607e]">serviços cadastrados</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[#004328] text-xs font-medium">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>100% em conformidade MTE/NRs</span>
          </div>
        </div>

        {/* Card 2: Categorias */}
        <div className="flex flex-col p-5 rounded-2xl bg-white border border-[#e5eeff] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#49607e] uppercase tracking-wider">
              Categorias Normativas
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#49607e]">
              <span className="material-symbols-outlined text-[18px]">category</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2.5">
            <span className="text-3xl font-bold text-[#0b1c30]">6</span>
            <span className="text-xs text-[#49607e]">grupos normativos</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[#49607e] text-xs">
            <span className="material-symbols-outlined text-[16px]">layers</span>
            <span>Programas, Treinamentos e Laudos</span>
          </div>
        </div>

        {/* Card 3: Ticket Médio */}
        <div className="flex flex-col p-5 rounded-2xl bg-white border border-[#e5eeff] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#49607e] uppercase tracking-wider">
              Ticket Médio de Venda
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#004328]">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2.5">
            <span className="text-2xl sm:text-3xl font-bold text-[#0b1c30] font-mono">R$ 1.850,00</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[#49607e] text-xs">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            <span>Base de propostas emitidas no mês</span>
          </div>
        </div>

        {/* Card 4: Mais Orçados */}
        <div className="flex flex-col p-5 rounded-2xl bg-white border border-[#e5eeff] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#49607e] uppercase tracking-wider">
              Itens Mais Orçados
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#004328]">
              <span className="material-symbols-outlined text-[18px]">star</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2.5">
            <span className="text-xl sm:text-2xl font-bold text-[#0b1c30]">PGR & PCMSO</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[#004328] text-xs font-medium">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>84% de presença nas propostas comerciais</span>
          </div>
        </div>
      </div>

      {/* MAIN LIST & FILTERS CONTAINER */}
      <div className="flex flex-col bg-white rounded-2xl border border-[#e5eeff] shadow-xs overflow-hidden">
        {/* SEARCH & CATEGORY PILLS TOOLBAR */}
        <div className="p-4 sm:p-5 border-b border-[#eff4ff] flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
            {/* Text Search */}
            <div className="relative w-full lg:w-96">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#49607e] text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Pesquisar por código (#SRV), nome, NR ou palavra-chave..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#eff4ff] text-xs sm:text-sm text-[#0b1c30] placeholder:text-[#707971] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0d5c3a] border border-transparent focus:border-[#c4dcff] transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707971] hover:text-[#0b1c30]"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Action Selectors */}
            <div className="flex items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#49607e] font-medium hidden sm:inline">Filtrar NR:</span>
                <select
                  value={selectedNrFilter}
                  onChange={(e) => {
                    setSelectedNrFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 px-3 rounded-xl bg-[#eff4ff] text-xs font-medium text-[#0b1c30] border border-transparent focus:outline-none focus:ring-2 focus:ring-[#0d5c3a]"
                >
                  <option value="Todas">Todas as NRs / Portarias</option>
                  <option value="NR-01">NR-01 (Disposições Gerais / PGR)</option>
                  <option value="NR-05">NR-05 (CIPA)</option>
                  <option value="NR-07">NR-07 (PCMSO / Saúde)</option>
                  <option value="NR-10">NR-10 (Instalações Elétricas)</option>
                  <option value="NR-12">NR-12 (Máquinas & Equipamentos)</option>
                  <option value="NR-15">NR-15 (Insalubridade)</option>
                  <option value="NR-16">NR-16 (Periculosidade)</option>
                  <option value="NR-17">NR-17 (Ergonomia / AET)</option>
                  <option value="NR-35">NR-35 (Trabalho em Altura)</option>
                  <option value="Previdenciário">Previdenciário (INSS / LTCAT)</option>
                  <option value="eSocial">eSocial SST (S-2210/2220/2240)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#49607e] font-medium hidden sm:inline">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="h-10 px-3 rounded-xl bg-[#eff4ff] text-xs font-medium text-[#0b1c30] border border-transparent focus:outline-none focus:ring-2 focus:ring-[#0d5c3a]"
                >
                  <option value="recent">Mais Recentes</option>
                  <option value="price-asc">Menor Preço</option>
                  <option value="price-desc">Maior Preço</option>
                  <option value="code">Código (#SRV)</option>
                  <option value="name">Nome (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categoriesList.map(cat => (
              <button
                key={cat.name}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedCategory === cat.name
                    ? 'bg-[#004328] text-white shadow-xs'
                    : 'bg-[#eff4ff] text-[#49607e] hover:bg-[#e5eeff] hover:text-[#0b1c30]'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  selectedCategory === cat.name ? 'bg-white/20 text-white' : 'bg-white text-[#49607e]'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-[#eff4ff] bg-[#eff4ff]/50 text-[11px] font-semibold text-[#49607e] uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === paginatedServices.length}
                    onChange={handleToggleSelectAll}
                    className="rounded text-[#004328] focus:ring-[#004328] h-4 w-4 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4 w-24">CÓDIGO</th>
                <th className="py-3.5 px-4 min-w-[260px]">SERVIÇO / ESCOPO NORMATIVO</th>
                <th className="py-3.5 px-4 min-w-[240px]">DESCRIÇÃO TÉCNICA</th>
                <th className="py-3.5 px-4">CATEGORIA</th>
                <th className="py-3.5 px-4 text-center">UNIDADE</th>
                <th className="py-3.5 px-4 text-right">VALOR BASE</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-right min-w-[170px]">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eff4ff] text-xs">
              {paginatedServices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#49607e]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-[#707971]">search_off</span>
                      <p className="font-semibold text-[#0b1c30]">Nenhum serviço encontrado</p>
                      <p className="text-xs">Tente ajustar seus termos de pesquisa ou filtros de categoria.</p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedCategory('Todos');
                          setSelectedNrFilter('Todas');
                        }}
                        className="mt-2 text-xs font-semibold text-[#004328] underline cursor-pointer"
                      >
                        Limpar todos os filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedServices.map(service => {
                  const isChecked = selectedIds.includes(service.id);
                  return (
                    <tr
                      key={service.id}
                      className={`hover:bg-[#eff4ff]/60 transition-colors group ${
                        isChecked ? 'bg-[#eff4ff]/80' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectRow(service.id)}
                          className="rounded text-[#004328] focus:ring-[#004328] h-4 w-4 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-[#49607e]">
                        {service.code || `#SRV-00`}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-sm text-[#0b1c30] group-hover:text-[#004328] transition-colors leading-snug">
                            {service.title}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-[#a9f3c5] text-[#002111] text-[10px] font-bold">
                              {service.nrCategory}
                            </span>
                            {service.subtitle && (
                              <span className="text-[11px] text-[#49607e]">
                                {service.subtitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#49607e]">
                        <p className="line-clamp-2 leading-relaxed text-[11px]">
                          {service.description}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#eff4ff] text-[#49617f] text-[11px] font-medium border border-[#c4dcff]/40">
                          {service.category || 'Programas NR'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="text-[11px] font-medium text-[#49607e]">
                          {service.unit}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono text-sm text-[#004328] font-bold">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.suggestedPrice)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#dce9ff] text-[#004328] text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0d5c3a] inline-block animate-pulse"></span>
                          {service.status || 'Ativo'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onSelectServiceForNewQuote && (
                            <button
                              onClick={() => onSelectServiceForNewQuote(service)}
                              className="px-2.5 py-1 rounded-lg bg-[#004328] hover:bg-[#005c3e] text-white text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                              title="Inserir serviço em novo orçamento"
                            >
                              <span className="material-symbols-outlined text-[14px]">add</span>
                              <span className="hidden xl:inline">Orçar</span>
                            </button>
                          )}

                          {canEdit && (
                          <>
                          <button
                            onClick={() => handleOpenEditDrawer(service)}
                            className="p-1.5 rounded-lg text-[#49607e] hover:text-[#004328] hover:bg-[#eff4ff] transition-colors"
                            title="Editar Serviço Técnico"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>

                          <button
                            onClick={() => handleDuplicate(service)}
                            className="p-1.5 rounded-lg text-[#49607e] hover:text-[#004328] hover:bg-[#eff4ff] transition-colors"
                            title="Duplicar Item"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                          </button>

                          <button
                            onClick={() => handleDelete(service.id, service.title)}
                            className="p-1.5 rounded-lg text-[#49607e] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/50 transition-colors"
                            title="Remover Serviço"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                          </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* TABLE FOOTER & PAGINATION */}
        <div className="p-4 border-t border-[#eff4ff] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#49607e]">
          <div>
            Mostrando <span className="font-bold text-[#0b1c30]">{paginatedServices.length}</span> de{' '}
            <span className="font-bold text-[#0b1c30]">{filteredServices.length}</span> serviços cadastrados
            {selectedIds.length > 0 && (
              <span className="ml-2 font-medium text-[#004328]">
                ({selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selecionado{selectedIds.length > 1 ? 's' : ''})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-xl border border-[#e5eeff] font-medium transition-all ${
                currentPage === 1
                  ? 'opacity-40 cursor-not-allowed bg-transparent'
                  : 'hover:bg-[#eff4ff] text-[#0b1c30] cursor-pointer'
              }`}
            >
              Anterior
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded-xl font-bold transition-all cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-[#004328] text-white'
                    : 'bg-[#eff4ff] text-[#49607e] hover:bg-[#e5eeff]'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-xl border border-[#e5eeff] font-medium transition-all ${
                currentPage === totalPages
                  ? 'opacity-40 cursor-not-allowed bg-transparent'
                  : 'hover:bg-[#eff4ff] text-[#0b1c30] cursor-pointer'
              }`}
            >
              Próximo
            </button>
          </div>
        </div>
      </div>

      <ServiceFormDrawer
        isOpen={isDrawerOpen}
        service={editingService}
        defaultCode={nextServiceCode(services)}
        isSaving={isPersisting}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleSubmitService}
      />
    </div>
  );
};
