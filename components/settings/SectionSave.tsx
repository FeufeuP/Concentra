'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../ui/ToastProvider';

/** Estado de "salvar seção" com barra de progresso (Configurações). */
export function useSectionSave() {
  const showToast = useToast();
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState<number>(0);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  const busy = useRef(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  const triggerSectionSave = useCallback(async (sectionId: string, action: () => void | Promise<unknown>, successMsg: string) => {
    if (busy.current) return false;
    busy.current = true;
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setSavedSection(null);
    setSavingSection(sectionId);
    setSavingProgress(25);
    try {
      await action();
      setSavingProgress(100);
      setSavedSection(sectionId);
      showToast(successMsg);
      savedTimer.current = setTimeout(() => setSavedSection(null), 3000);
      return true;
    } catch (err) {
      setSavingProgress(0);
      showToast(`Não foi possível salvar: ${err instanceof Error ? err.message : 'tente novamente.'}`, 'error');
      return false;
    } finally {
      busy.current = false;
      setSavingSection(null);
    }
  }, [showToast]);

  return { savingSection, savingProgress, savedSection, triggerSectionSave };
}

interface SectionSaveButtonProps {
  label: string;
  isSaving: boolean;
  isSaved: boolean;
  progress: number;
  onClick: () => void;
}

export const SectionSaveButton: React.FC<SectionSaveButtonProps> = ({
  label,
  isSaving,
  isSaved,
  progress,
  onClick,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#eff4ff] mt-2">
      <div className="flex-1 min-w-[200px]">
        {isSaving ? (
          <div className="flex flex-col gap-1 max-w-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#004328]">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                Gravando alterações...
              </span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="w-full bg-emerald-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#004328] h-full transition-all duration-150 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : isSaved ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 animate-fadeIn">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
            <span>Salvo com sucesso!</span>
          </div>
        ) : (
          <span className="text-[11px] text-[#64748b]">
            Salve individualmente as alterações deste item.
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={isSaving}
        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 active:scale-98 ${
          isSaved
            ? 'bg-emerald-700 text-white'
            : isSaving
            ? 'bg-[#004328]/80 text-white cursor-wait'
            : 'bg-[#004328] hover:bg-[#005c3e] text-white'
        }`}
      >
        <span className="material-symbols-outlined text-[16px]">
          {isSaving ? 'sync' : isSaved ? 'check' : 'save'}
        </span>
        <span>
          {isSaving ? `Salvando (${progress}%)` : isSaved ? 'Salvo!' : label}
        </span>
      </button>
    </div>
  );
};
