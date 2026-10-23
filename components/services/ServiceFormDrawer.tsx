'use client';

import React, { useState } from 'react';
import type { CatalogService } from '@/lib/types';
import { useToast } from '../ui/ToastProvider';

interface ServiceFormDrawerProps {
  isOpen: boolean;
  /** Serviço em edição; null = cadastro novo. */
  service: CatalogService | null;
  /** Código sugerido para um serviço novo. */
  defaultCode: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (service: CatalogService, isNew: boolean) => void;
}

/** Painel lateral de cadastro/edição de serviço do catálogo. */
export const ServiceFormDrawer: React.FC<ServiceFormDrawerProps> = ({
  isOpen,
  service,
  defaultCode,
  isSaving,
  onClose,
  onSubmit,
}) => {
  const showToast = useToast();
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

  // Ao abrir (ou trocar o serviço), recarrega o formulário — ajuste de estado durante o render
  const openToken = isOpen ? (service ? `edit:${service.id}` : 'new') : null;
  const [loadedToken, setLoadedToken] = useState<string | null>(null);
  if (openToken !== loadedToken) {
    setLoadedToken(openToken);
    if (openToken && service) {
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
    } else if (openToken) {
      setFormCode(defaultCode);
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
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!formTitle.trim()) {
      showToast('Por favor, informe o nome do serviço.', 'error');
      return;
    }

    if (service) {
      // Update
      const updated: CatalogService = {
        ...service,
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
      onSubmit(updated, false);
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
      onSubmit(created, true);
    }
  };

  return (
    <>
    {/* CADASTRO / EDIÇÃO SLIDE-OVER DRAWER (MODAL ELEGANTE DO STITCH) */}
    {/* Backdrop */}
    {isOpen && (
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity animate-in fade-in"
      />
    )}

    {/* Slide Drawer Panel */}
    <aside
      className={`fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 transition-transform duration-300 ease-in-out flex flex-col justify-between overflow-y-auto ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Drawer Header */}
      <div className="p-6 bg-[#eff4ff] flex items-start justify-between border-b border-[#e5eeff]">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-[#49607e] uppercase tracking-wider font-mono">
            FORMULÁRIO TÉCNICO DE SST
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0b1c30]">
            {service ? `Editar Serviço ${formCode}` : 'Cadastrar Novo Serviço'}
          </h2>
          <p className="text-xs text-[#49607e] mt-0.5 leading-relaxed">
            Configure o escopo técnico para refletir instantaneamente nas propostas comerciais e contratos.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-[#49607e] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
      </div>

      {/* Drawer Body Form */}
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 flex-1">
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
            onClick={onClose}
            className="px-5 h-11 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-1.5 px-6 h-11 rounded-xl bg-[#0d5c3a] text-white text-xs font-semibold hover:bg-[#004328] shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            <span className={`material-symbols-outlined text-[18px] ${isSaving ? 'animate-spin' : ''}`}>{isSaving ? 'sync' : 'save'}</span>
            <span>{isSaving ? 'Salvando...' : service ? 'Salvar Alterações' : 'Cadastrar Serviço'}</span>
          </button>
        </div>
      </form>
    </aside>
    </>
  );
};
