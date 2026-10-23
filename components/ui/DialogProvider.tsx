'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` destaca o botão de confirmação em vermelho (exclusões). */
  tone?: 'default' | 'danger';
}

interface DialogApi {
  /** Abre um diálogo de confirmação. Resolve `true` se o usuário confirmar. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

interface PendingDialog extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const DialogContext = createContext<DialogApi | null>(null);

/**
 * Diálogos próprios do sistema (substituem `window.confirm`).
 * Uso: `const { confirm } = useDialog(); if (!(await confirm({ title: 'Excluir?' }))) return;`
 */
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<PendingDialog | null>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog((prev) => {
        prev?.resolve(false); // um diálogo por vez
        return { ...options, resolve };
      });
    });
  }, []);

  const close = useCallback((value: boolean) => {
    setDialog((prev) => {
      prev?.resolve(value);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;
    confirmBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, close]);

  const danger = dialog?.tone === 'danger';

  return (
    <DialogContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[#0b1c30]/50 backdrop-blur-sm animate-in fade-in duration-150"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmDialogTitle"
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e5eeff] p-6 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-3">
              <span
                className={`material-symbols-outlined text-[26px] shrink-0 ${danger ? 'text-[#ba1a1a]' : 'text-[#004328]'}`}
                aria-hidden="true"
              >
                {danger ? 'warning' : 'help'}
              </span>
              <div className="min-w-0">
                <h2 id="confirmDialogTitle" className="text-sm font-bold text-[#0b1c30]">
                  {dialog.title}
                </h2>
                {dialog.message && <div className="mt-1.5 text-xs text-[#49607e] leading-relaxed whitespace-pre-line">{dialog.message}</div>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="px-4 py-2 rounded-xl border border-[#c0c9c0] text-xs font-semibold text-[#404943] hover:bg-[#eff4ff]"
              >
                {dialog.cancelLabel || 'Cancelar'}
              </button>
              <button
                ref={confirmBtn}
                type="button"
                onClick={() => close(true)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${
                  danger ? 'bg-[#ba1a1a] hover:bg-[#93000a]' : 'bg-[#004328] hover:bg-[#0a5234]'
                }`}
              >
                {dialog.confirmLabel || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog deve ser usado dentro de <DialogProvider>.');
  return ctx;
}
