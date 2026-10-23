'use client';

import React, { useState, useMemo } from 'react';
import { CATALOG_SERVICES } from '@/lib/mock-data';
import { CatalogService } from '@/lib/types';

interface ServicesViewProps {
  onSelectServiceForNewQuote?: (service: CatalogService) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({ onSelectServiceForNewQuote }) => {
  // State for services list (editable in session)
  const [services, setServices] = useState<CatalogService[]>(CATALOG_SERVICES);
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
  const [formCode, setFormCode] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formSubtitle, setFormSubtitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Programas NR');
  const [formNr, setFormNr] = useState<string>('NR-01');
  const [formUnit, setFormUnit] = useState<string>('Unidade');
  const [formPrice, setFormPrice] = useState<number>(3800);
  const [formDescription, setFormDescription] = useState<string>('');
  const [formDeliverables, setFormDeliverables] = useState<string[]>([
    'Emissão de Anotação de Responsabilidade Técnica (ART / CREA)',
    'Visita técnica presencial com engenheiro de segurança credenciado',
    'Entrega em formato digital PDF assinado com certificado ICP-Brasil'
  ]);
  const [formQuickSelect, setFormQuickSelect] = useState<boolean>(true);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

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

  // Open Drawer for New Service
  const handleOpenNewDrawer = () => {
    const nextCodeNum = services.length + 1;
    const nextCode = `#SRV-${nextCodeNum < 10 ? '0' : ''}${nextCodeNum}`;
    
    setEditingService(null);
    setFormCode(nextCode);
    setFormTitle('');
    setFormSubtitle('');
    setFormCategory('Programas NR');
    setFormNr('NR-01 Geral');
    setFormUnit('Unidade');
    setFormPrice(3000);
    setFormDescription('');
    setFormDeliverables([
      'Emissão de Anotação de Responsabilidade Técnica (ART / CREA)',
      'Visita técnica presencial com engenheiro de segurança credenciado',
      'Entrega em formato digital PDF assinado com certificado ICP-Brasil'
    ]);
    setFormQuickSelect(true);
    setIsDrawerOpen(true);
  };

  // Open Drawer for Editing Service
  const handleOpenEditDrawer = (service: CatalogService) => {
    setEditingService(service);
    setFormCode(service.code || `#SRV-01`);
    setFormTitle(service.title);
    setFormSubtitle(service.subtitle || '');
    setFormCategory(service.category || 'Programas NR');
    setFormNr(service.nrCategory || 'NR-01');
    setFormUnit(service.unit);
    setFormPrice(service.suggestedPrice);
    setFormDescription(service.description);
    setFormDeliverables(service.deliverables || [
      'Emissão de Anotação de Responsabilidade Técnica (ART / CREA)',
      'Visita técnica presencial com engenheiro de segurança credenciado'
    ]);
    setFormQuickSelect(service.quickSelect ?? true);
    setIsDrawerOpen(true);
  };

  // Save Service from Drawer
  const handleSaveDrawer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Por favor, informe o nome do serviço.');
      return;
    }

    if (editingService) {
      // Update
      const updated: CatalogService = {
        ...editingService,
        code: formCode,
        title: formTitle,
        subtitle: formSubtitle,
        category: formCategory,
        nrCategory: formNr,
        unit: formUnit,
        suggestedPrice: formPrice,
        description: formDescription,
        deliverables: formDeliverables,
        quickSelect: formQuickSelect,
        status: 'Ativo'
      };

      setServices(prev => prev.map(s => s.id === editingService.id ? updated : s));
      showToast(`Serviço ${formCode} atualizado com sucesso!`);
    } else {
      // Create new
      const newId = `srv-${Date.now()}`;
      const created: CatalogService = {
        id: newId,
        code: formCode,
        title: formTitle,
        subtitle: formSubtitle,
        category: formCategory,
        nrCategory: formNr,
        unit: formUnit,
        suggestedPrice: formPrice,
        description: formDescription,
        deliverables: formDeliverables,
        quickSelect: formQuickSelect,
        status: 'Ativo'
      };

      setServices(prev => [created, ...prev]);
      showToast(`Novo serviço ${formCode} cadastrado no catálogo!`);
    }

    setIsDrawerOpen(false);
  };

  // Duplicate Service
  const handleDuplicate = (service: CatalogService) => {
    const nextCodeNum = services.length + 1;
    const nextCode = `#SRV-${nextCodeNum < 10 ? '0' : ''}${nextCodeNum}`;
    const duplicated: CatalogService = {
      ...service,
      id: `srv-${Date.now()}`,
      code: nextCode,
      title: `${service.title} (Cópia)`,
      status: 'Ativo'
    };

    setServices(prev => [duplicated, ...prev]);
    showToast(`Serviço duplicado como ${nextCode}!`);
  };

  // Delete Service
  const handleDelete = (serviceId: string, title: string) => {
    if (window.confirm(`Tem certeza que deseja remover o serviço "${title}" do catálogo?`)) {
      setServices(prev => prev.filter(s => s.id !== serviceId));
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
      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#004328] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-[#4edea3]/30 animate-in fade-in slide-in-from-bottom-5">
          <span className="material-symbols-outlined text-[#4edea3] text-[20px]">check_circle</span>
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

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

            <button
              onClick={handleOpenNewDrawer}
              type="button"
              className="flex items-center gap-1.5 px-5 h-10 rounded-xl bg-[#0d5c3a] text-white font-medium text-xs sm:text-sm shadow-md hover:bg-[#004328] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_box</span>
              <span>Novo Serviço / Item</span>
            </button>
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
                  onChange={(e) => setSortBy(e.target.value as any)}
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

      {/* CADASTRO / EDIÇÃO SLIDE-OVER DRAWER (MODAL ELEGANTE DO STITCH) */}
      {/* Backdrop */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity animate-in fade-in"
        />
      )}

      {/* Slide Drawer Panel */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 transition-transform duration-300 ease-in-out flex flex-col justify-between overflow-y-auto ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-6 bg-[#eff4ff] flex items-start justify-between border-b border-[#e5eeff]">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[#49607e] uppercase tracking-wider font-mono">
              FORMULÁRIO TÉCNICO DE SST
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0b1c30]">
              {editingService ? `Editar Serviço ${formCode}` : 'Cadastrar Novo Serviço'}
            </h2>
            <p className="text-xs text-[#49607e] mt-0.5 leading-relaxed">
              Configure o escopo técnico para refletir instantaneamente nas propostas comerciais e contratos.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 rounded-xl text-[#49607e] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Drawer Body Form */}
        <form onSubmit={handleSaveDrawer} className="p-6 flex flex-col gap-5 flex-1">
          {/* Código e Nome do Serviço */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-1 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#0b1c30]">Código *</label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                required
                className="h-10 px-3 rounded-xl bg-[#eff4ff] text-xs font-mono font-bold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#0d5c3a]"
              />
            </div>

            <div className="sm:col-span-3 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#0b1c30]">Nome Oficial do Serviço / Laudo *</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: Laudo de Periculosidade e Insalubridade"
                required
                className="h-10 px-3.5 rounded-xl bg-[#eff4ff] text-xs sm:text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#0d5c3a]"
              />
            </div>
          </div>

          {/* Subtítulo / Detalhe Rápido */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#0b1c30]">Subtítulo Normativo / Especialidade</label>
            <input
              type="text"
              value={formSubtitle}
              onChange={(e) => setFormSubtitle(e.target.value)}
              placeholder="Ex: Inventário + Plano de Ação ou Aposentadoria Especial"
              className="h-10 px-3.5 rounded-xl bg-[#eff4ff] text-xs sm:text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#0d5c3a]"
            />
          </div>

          {/* Duas Colunas: Categoria e NR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#0b1c30]">Categoria Normativa *</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="h-10 px-3 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#0d5c3a]"
              >
                <option value="Programas NR">Programas & Gestão (NRs)</option>
                <option value="Laudos Técnicos">Laudos & Avaliações Técnicas</option>
                <option value="Treinamentos">Treinamentos Obrigatórios</option>
                <option value="Saúde Ocupacional">Saúde Ocupacional (PCMSO)</option>
                <option value="Gestão eSocial">Gestão eSocial SST</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#0b1c30]">Norma Regulamentadora (NR)</label>
              <input
                type="text"
                value={formNr}
                onChange={(e) => setFormNr(e.target.value)}
                placeholder="Ex: NR-01, NR-15, NR-35..."
                className="h-10 px-3.5 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#0d5c3a]"
              />
            </div>
          </div>

          {/* Duas Colunas: Unidade de Medida e Preço Base */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#0b1c30]">Unidade de Medida *</label>
              <select
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                className="h-10 px-3 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#0d5c3a]"
              >
                <option value="Unidade">Unidade (Documento Fechado)</option>
                <option value="Laudo">Por Laudo Emitido</option>
                <option value="Turma (15p)">Por Turma Presencial (15p)</option>
                <option value="Turma">Por Turma</option>
                <option value="Vidas / Exame">Por Colaborador / Vida</option>
                <option value="Mensalidade">Mensalidade Recorrente</option>
                <option value="Hora-Técnica">Hora-Técnica Especializada</option>
                <option value="Por Equip.">Por Equipamento Avaliado</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#0b1c30]">Valor Padrão de Referência (R$) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[#49607e] font-bold text-xs">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={formPrice}
                  onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                  className="h-10 pl-10 pr-3.5 rounded-xl bg-[#eff4ff] font-mono text-sm font-bold text-[#004328] focus:outline-none focus:ring-2 focus:ring-[#0d5c3a] w-full"
                />
              </div>
            </div>
          </div>

          {/* Descrição Detalhada do Escopo */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#0b1c30]">Descrição do Escopo Técnico Padrão *</label>
              <span className="text-[11px] text-[#49607e]">Exportado para a proposta em PDF</span>
            </div>
            <textarea
              rows={4}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Descreva o escopo, metodologia de vistoria, elaboração de matriz de risco e cronograma executivo..."
              className="p-3.5 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#0d5c3a] leading-relaxed resize-none"
            />
          </div>

          {/* Checklist de Entregáveis / Inclusos Padrão */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#0b1c30]">Checklist de Entregáveis Obrigatórios</label>
            <div className="flex flex-col gap-2 p-3.5 bg-[#eff4ff] rounded-xl text-xs">
              {[
                'Emissão de Anotação de Responsabilidade Técnica (ART / CREA)',
                'Visita técnica presencial com engenheiro de segurança credenciado',
                'Entrega em formato digital PDF assinado com certificado ICP-Brasil',
                'Acompanhamento em auditorias presenciais do MTE',
                'Upload automático dos eventos no eSocial'
              ].map((item) => {
                const isSelected = formDeliverables.includes(item);
                return (
                  <label key={item} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) {
                          setFormDeliverables(formDeliverables.filter(d => d !== item));
                        } else {
                          setFormDeliverables([...formDeliverables, item]);
                        }
                      }}
                      className="rounded text-[#004328] focus:ring-[#004328] h-4 w-4"
                    />
                    <span className="text-[#0b1c30] text-[11px]">{item}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Switch de Disponibilidade Rápida */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#eff4ff]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#0b1c30]">Seleção Rápida em Orçamentos</span>
              <span className="text-[11px] text-[#49607e]">Exibir como item de destaque no gerador comercial</span>
            </div>
            <input
              type="checkbox"
              checked={formQuickSelect}
              onChange={(e) => setFormQuickSelect(e.target.checked)}
              className="w-5 h-5 rounded text-[#004328] focus:ring-[#004328] cursor-pointer"
            />
          </div>

          {/* Drawer Footer Actions */}
          <div className="pt-4 border-t border-[#eff4ff] flex items-center justify-end gap-3 mt-auto">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-5 h-11 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-6 h-11 rounded-xl bg-[#0d5c3a] text-white text-xs font-semibold hover:bg-[#004328] shadow-md transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>{editingService ? 'Salvar Alterações' : 'Cadastrar Serviço'}</span>
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
};
