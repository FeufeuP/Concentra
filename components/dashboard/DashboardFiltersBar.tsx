'use client';

import React, { useMemo } from 'react';
import {
  CASCADING_STATUS_LIST,
  CASCADING_MACRO_CATEGORIES,
  PRIORITY_LEVELS,
} from '@/lib/classification-data';
import { DashboardFilters, EMPTY_DASHBOARD_FILTERS, countActiveFilters } from '@/lib/dashboard-metrics';

interface DashboardFiltersBarProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  filteredCount: number;
  totalCount: number;
  /** Opções do filtro de responsável (ver responsibleFilterOptions). */
  responsibles: string[];
}

/** Barra de filtros em cascata do dashboard (macro → subcategoria, status, responsável, prioridade). */
export const DashboardFiltersBar: React.FC<DashboardFiltersBarProps> = ({ filters, onChange, filteredCount, totalCount, responsibles }) => {
  const activeFilterCount = countActiveFilters(filters);
  const activeMacroForFilter = useMemo(
    () => CASCADING_MACRO_CATEGORIES.find((m) => m.name === filters.macroCategory),
    [filters.macroCategory]
  );
  const update = (key: keyof DashboardFilters, value: string) => onChange({ ...filters, [key]: value });

  return (
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
            onClick={() => onChange(EMPTY_DASHBOARD_FILTERS)}
            className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1 transition-colors self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
            Limpar Filtros ({filteredCount} de {totalCount} orçamentos)
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
            value={filters.macroCategory}
            onChange={(e) => onChange({ ...filters, macroCategory: e.target.value, subCategory: 'all' })}
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
            value={filters.subCategory}
            onChange={(e) => update('subCategory', e.target.value)}
            disabled={filters.macroCategory === 'all'}
            className="w-full h-9 px-2.5 rounded-xl bg-[#eff4ff] text-xs font-medium text-[#0b1c30] border border-[#c4dcff]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">
              {filters.macroCategory === 'all' ? 'Selecione a Macro Categoria' : 'Todas as Subcategorias'}
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
            value={filters.status}
            onChange={(e) => update('status', e.target.value)}
            className="w-full h-9 px-2.5 rounded-xl bg-[#eff4ff] text-xs font-semibold text-[#0b1c30] border border-[#c4dcff]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
          >
            <option value="all">Todos os Status ({totalCount})</option>
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
            value={filters.responsibleTech}
            onChange={(e) => update('responsibleTech', e.target.value)}
            className="w-full h-9 px-2.5 rounded-xl bg-[#eff4ff] text-xs font-medium text-[#0b1c30] border border-[#c4dcff]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
          >
            <option value="all">Todos os Responsáveis</option>
            {responsibles.map((name) => (
              <option key={name} value={name}>
                {name}
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
            value={filters.priority}
            onChange={(e) => update('priority', e.target.value)}
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
  );
};
