'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';
export type ShowToast = (message: string, type?: ToastType) => void;

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<ShowToast | null>(null);

const DURATION: Record<ToastType, number> = { success: 3500, info: 4500, error: 7000 };

const STYLES: Record<ToastType, { box: string; icon: string; iconName: string }> = {
  success: { box: 'bg-[#004328] border border-[#a9f3c5]/30', icon: 'text-[#a9f3c5]', iconName: 'check_circle' },
  info: { box: 'bg-[#0b1c30] border border-white/15', icon: 'text-sky-200', iconName: 'info' },
  error: { box: 'bg-[#ba1a1a] border border-red-300/40', icon: 'text-red-100', iconName: 'error' },
};

/**
 * Aviso flutuante único do sistema (substitui `alert()` e os toasts próprios de cada tela).
 * Uso: `const showToast = useToast(); showToast('Salvo!'); showToast('Falhou', 'error');`
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback<ShowToast>((message, type = 'success') => {
    seq.current += 1;
    setToast({ id: seq.current, message, type });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), DURATION[type]);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const style = toast ? STYLES[toast.type] : null;

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && style && (
        <div
          key={toast.id}
          id="toastNotification"
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          className={`fixed bottom-6 right-6 z-[80] max-w-md text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-300 ${style.box}`}
        >
          <span className={`material-symbols-outlined text-[20px] ${style.icon}`}>{style.iconName}</span>
          <span className="whitespace-pre-line">{toast.message}</span>
          <button onClick={dismiss} className="text-white/70 hover:text-white ml-2" aria-label="Fechar aviso">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const ctx = useContext(ToastContext);
  // Fora do provider (ex.: testes isolados) não quebra: registra no console
  return useMemo(() => ctx ?? ((message: string) => console.info('[toast]', message)), [ctx]);
}
