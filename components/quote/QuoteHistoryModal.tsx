'use client';

import React, { useEffect, useState } from 'react';
import type { Quote } from '@/lib/types';
import { useAppData } from '@/lib/store/AppDataContext';
import { describeQuoteEvent, formatEventDate, QuoteEvent, QuoteEventView } from '@/lib/quote-events';

interface QuoteHistoryModalProps {
  quote: Quote;
  onClose: () => void;
}

const TONE: Record<QuoteEventView['tone'], string> = {
  green: 'bg-emerald-100 text-emerald-800',
  blue: 'bg-[#e5eeff] text-[#0b4f8a]',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-[#ffdad6] text-[#ba1a1a]',
  gray: 'bg-slate-100 text-slate-600',
};

/**
 * Linha do tempo do orçamento: criação, mudanças de status, e-mails enviados.
 * Montar com `key={quote.id}` para recarregar ao trocar de orçamento.
 */
export function QuoteHistoryModal({ quote, onClose }: QuoteHistoryModalProps) {
  const { fetchQuoteHistory, isRemote } = useAppData();
  const [events, setEvents] = useState<QuoteEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchQuoteHistory(quote.id).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setEvents(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchQuoteHistory, quote.id, reloadKey]);

  const num = String(quote.numberOnly || quote.id).replace('#', '');

  return (
    <div
      className="fixed inset-0 bg-[#0b1c30]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-history-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-[#e5eeff] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
          <div className="flex items-center gap-2 text-[#004328]">
            <span className="material-symbols-outlined text-[22px]">history</span>
            <div>
              <h3 id="quote-history-title" className="font-bold text-base text-[#0b1c30]">
                Histórico da Proposta Nº {num}
              </h3>
              <p className="text-[11px] text-[#49607e]">{quote.clientName || 'Cliente não informado'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg hover:bg-[#eff4ff] flex items-center justify-center text-[#49607e]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="py-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-[#fff1ef] border border-[#ffdad6] text-xs text-[#ba1a1a] flex items-center justify-between gap-2">
              <span>Não foi possível carregar o histórico: {error}</span>
              <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="font-semibold underline shrink-0">
                Tentar novamente
              </button>
            </div>
          )}

          {!error && events === null && (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 border-4 border-[#004328] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!error && events && events.length === 0 && (
            <p className="py-8 text-center text-xs text-[#49607e]">
              Nenhum evento registrado ainda.
              <br />
              O histórico começa a ser gravado a partir da criação ou da próxima mudança de status.
            </p>
          )}

          {!error && events && events.length > 0 && (
            <ol className="relative border-l-2 border-[#e5eeff] ml-3 flex flex-col gap-4">
              {events.map((event) => {
                const view = describeQuoteEvent(event);
                return (
                  <li key={event.id} className="ml-5 relative">
                    <span
                      className={`absolute -left-[33px] top-0 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-white ${TONE[view.tone]}`}
                    >
                      <span className="material-symbols-outlined text-[15px]">{view.icon}</span>
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-[#0b1c30]">{view.title}</p>
                      {view.description && <p className="text-[#49607e] mt-0.5 break-words">{view.description}</p>}
                      <p className="text-[10px] text-[#707971] mt-1 font-mono">
                        {formatEventDate(event.createdAt)}
                        {event.actorName ? ` • ${event.actorName}` : ''}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <p className="pt-3 border-t border-[#eff4ff] text-[10px] text-[#707971]">
          {isRemote
            ? 'Registro gravado pelo servidor; não pode ser alterado pelos usuários.'
            : 'Modo local: histórico guardado somente neste navegador.'}
        </p>
      </div>
    </div>
  );
}
