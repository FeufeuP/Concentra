'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '../ui/ToastProvider';
import { useDialog } from '../ui/DialogProvider';
import { getStoredResponsibles, saveStoredResponsibles, DEFAULT_RESPONSIBLES } from '@/lib/responsibles';
import { SectionSaveButton, useSectionSave } from './SectionSave';

interface ResponsiblesSectionProps {
  initialResponsibles?: string[];
  onUpdateResponsiblePersons?: (list: string[]) => void;
  /** Verifica permissão (Auditor SST é somente leitura). */
  ensureCanEdit: () => boolean;
}

/** Configurações — seção 4: pessoas exibidas como "Responsável pelo Orçamento". */
export const ResponsiblesSection: React.FC<ResponsiblesSectionProps> = ({
  initialResponsibles,
  onUpdateResponsiblePersons,
  ensureCanEdit,
}) => {
  const showToast = useToast();
  const { confirm } = useDialog();
  const { savingSection, savingProgress, savedSection, triggerSectionSave } = useSectionSave();
  // Responsáveis pelo Orçamento (apenas nome)
  const [responsibles, setResponsibles] = useState<string[]>(() => {
    if (initialResponsibles && initialResponsibles.length > 0) {
      return initialResponsibles;
    }
    return getStoredResponsibles();
  });
  const [newPersonName, setNewPersonName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [personSuccessMsg, setPersonSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleResponsiblesUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      if (customEvent.detail) {
        setResponsibles(customEvent.detail);
      }
    };
    window.addEventListener('consentra_responsibles_updated', handleResponsiblesUpdate);
    return () => window.removeEventListener('consentra_responsibles_updated', handleResponsiblesUpdate);
  }, []);

  const showPersonFeedback = (msg: string) => {
    setPersonSuccessMsg(msg);
    setTimeout(() => setPersonSuccessMsg(null), 3000);
  };

  const handleAddPerson = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!ensureCanEdit()) return;
    const trimmed = newPersonName.trim();
    if (!trimmed) return;

    if (responsibles.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Esta pessoa já está cadastrada na lista de responsáveis.', 'error');
      return;
    }

    const updated = [...responsibles, trimmed];
    setResponsibles(updated);
    saveStoredResponsibles(updated);
    if (onUpdateResponsiblePersons) onUpdateResponsiblePersons(updated);
    setNewPersonName('');
    showPersonFeedback(`"${trimmed}" cadastrado(a) com sucesso! Já disponível no menu em cascata de orçamentos.`);
  };

  const handleRemovePerson = async (nameToRemove: string) => {
    if (!ensureCanEdit()) return;
    if (responsibles.length <= 1) {
      showToast('Deve haver pelo menos um responsável cadastrado no sistema.', 'error');
      return;
    }
    const ok = await confirm({
      title: 'Remover responsável?',
      message: `"${nameToRemove}" deixará de aparecer na lista de responsáveis pelo orçamento.`,
      confirmLabel: 'Remover',
      tone: 'danger',
    });
    if (ok) {
      const updated = responsibles.filter(p => p !== nameToRemove);
      setResponsibles(updated);
      saveStoredResponsibles(updated);
      if (onUpdateResponsiblePersons) onUpdateResponsiblePersons(updated);
      showPersonFeedback(`"${nameToRemove}" removido(a) com sucesso.`);
    }
  };

  const handleStartEdit = (index: number, currentName: string) => {
    setEditingIndex(index);
    setEditingName(currentName);
  };

  const handleSaveEdit = (index: number) => {
    if (!ensureCanEdit()) return;
    const trimmed = editingName.trim();
    if (!trimmed) return;
    const updated = [...responsibles];
    updated[index] = trimmed;
    setResponsibles(updated);
    saveStoredResponsibles(updated);
    if (onUpdateResponsiblePersons) onUpdateResponsiblePersons(updated);
    setEditingIndex(null);
    setEditingName('');
    showPersonFeedback(`Nome atualizado para "${trimmed}" com sucesso!`);
  };

  const handleResetDefault = async () => {
    if (!ensureCanEdit()) return;
    const ok = await confirm({
      title: 'Restaurar responsáveis padrão?',
      message: 'A lista atual será substituída pela lista padrão do sistema.',
      confirmLabel: 'Restaurar',
    });
    if (ok) {
      setResponsibles(DEFAULT_RESPONSIBLES);
      saveStoredResponsibles(DEFAULT_RESPONSIBLES);
      if (onUpdateResponsiblePersons) onUpdateResponsiblePersons(DEFAULT_RESPONSIBLES);
      showPersonFeedback('Lista de responsáveis restaurada com sucesso!');
    }
  };

  // 4. Responsável pelo Orçamento
  const handleSaveSection4 = () => {
    if (!ensureCanEdit()) return;
    triggerSectionSave('sec-4', () => {
      saveStoredResponsibles(responsibles);
      if (onUpdateResponsiblePersons) onUpdateResponsiblePersons(responsibles);
    }, '4. Lista de Responsáveis pelo Orçamento salva com sucesso!');
  };

  return (
    <>
        {/* Section 4: Responsável pelo Orçamento */}
        <div className="p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
            <div className="flex items-center gap-2 text-[#004328]">
              <span className="material-symbols-outlined text-[20px]">person_check</span>
              <div>
                <h3 className="font-bold text-sm text-[#0b1c30]">4. Responsável pelo Orçamento</h3>
                <p className="text-[11px] text-[#49607e]">
                  Cadastre as pessoas (apenas nome) vinculadas como menu em cascata na página de orçamentos e na emissão de Ordens de Serviço (O.S.).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetDefault}
              className="text-[11px] font-semibold text-[#49607e] hover:text-[#004328] flex items-center gap-1 underline"
            >
              <span className="material-symbols-outlined text-[14px]">restore</span>
              Restaurar Padrão
            </button>
          </div>

          {personSuccessMsg && (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2 border border-emerald-200">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
              <span>{personSuccessMsg}</span>
            </div>
          )}

          {/* Menu / Formulário de Cadastro de Pessoas (Apenas Nome) */}
          <div className="p-4 rounded-xl bg-[#f8faff] border border-[#dbe7ff] flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#004328]">person_add</span>
              <h4 className="text-xs font-bold text-[#0b1c30]">Cadastrar Nova Pessoa (Apenas Nome)</h4>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="Digite apenas o nome da pessoa (ex: Juliana Martins, Dr. Fernando Costa)..."
                className="flex-1 h-10 px-3.5 rounded-xl bg-white border border-[#cbd5e1] text-xs text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#004328] focus:border-transparent shadow-2xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPerson(e);
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddPerson}
                className="h-10 px-4 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>+ Cadastrar Pessoa</span>
              </button>
            </div>
            <p className="text-[10.5px] text-[#64748b]">
              Ao cadastrar, o nome é disponibilizado instantaneamente no menu em cascata <strong>1.2 Responsável Técnico</strong> dos orçamentos.
            </p>
          </div>

          {/* Lista de Pessoas Cadastradas */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#404942]">
              <span>Pessoas Cadastradas ({responsibles.length})</span>
              <span className="text-[11px] text-[#64748b]">Vinculadas à página de Orçamentos</span>
            </div>

            <div className="divide-y divide-[#eff4ff] border border-[#eff4ff] rounded-xl overflow-hidden bg-white">
              {responsibles.map((person, index) => {
                const isEditing = editingIndex === index;
                return (
                  <div
                    key={index}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#f8fafc] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#eff4ff] border border-[#c4dcff]/40 text-[#004328] font-bold text-xs flex items-center justify-center font-mono shrink-0">
                        {person.charAt(0).toUpperCase()}
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-8 px-2.5 text-xs rounded-lg border border-[#004328] focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(index);
                              if (e.key === 'Escape') setEditingIndex(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(index)}
                            className="p-1 rounded-md bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            title="Salvar"
                          >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingIndex(null)}
                            className="p-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                            title="Cancelar"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs font-bold text-[#0b1c30]">{person}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Menu em cascata ativo
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(index, person)}
                          className="p-1.5 rounded-lg text-[#49607e] hover:bg-[#eff4ff] hover:text-[#004328] transition-colors"
                          title="Editar nome"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePerson(person)}
                          className="p-1.5 rounded-lg text-[#ba1a1a] hover:bg-rose-50 transition-colors"
                          title="Excluir pessoa"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <SectionSaveButton
            label="Salvar 4. Lista de Responsáveis pelo Orçamento"
            isSaving={savingSection === 'sec-4'}
            isSaved={savedSection === 'sec-4'}
            progress={savingSection === 'sec-4' ? savingProgress : 0}
            onClick={handleSaveSection4}
          />
        </div>
    </>
  );
};
