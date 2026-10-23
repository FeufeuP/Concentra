'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { CatalogService } from '@/lib/types';
import { filterCatalog } from '@/lib/catalog-search';

interface CatalogPickerModalProps {
  /** Serviços ativos do catálogo. */
  services: CatalogService[];
  onSelect: (service: CatalogService) => void;
  onClose: () => void;
}

/** Modal de busca e seleção de serviços do catálogo para incluir na proposta. */
export const CatalogPickerModal: React.FC<CatalogPickerModalProps> = ({ services, onSelect, onClose }) => {
  const [search, setSearch] = useState<string>('');
  const results = useMemo(() => filterCatalog(services, search), [services, search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
      <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto border border-[#e5eeff]">
          <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
            <div>
              <h3 className="font-bold text-base text-[#0b1c30]">Catálogo Oficial de Serviços SST Consentra</h3>
              <p className="text-xs text-[#49607e]">Selecione um item regulatório para adicionar à proposta</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar catálogo"
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por título, norma regulamentadora (ex: NR-01, NR-07), laudo ou descrição..."
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#eff4ff] text-xs text-[#0b1c30] placeholder-[#64748b] border border-[#c4dcff]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#49607e] hover:text-[#0b1c30] px-1 py-0.5"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2.5 py-4">
            {results.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748b] bg-[#f8fafc] rounded-xl border border-dashed border-[#cbd5e1]">
                Nenhum serviço regulatório encontrado para &quot;{search}&quot;.
              </div>
            ) : (
              results.map((serv) => (
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
                      onClick={() => onSelect(serv)}
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
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#e5eeff]"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
  );
};
