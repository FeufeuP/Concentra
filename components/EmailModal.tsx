'use client';

import React, { useState } from 'react';
import { Quote } from '@/lib/types';

interface EmailModalProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onSentSuccess: () => void;
}

export const EmailModal: React.FC<EmailModalProps> = ({ quote, isOpen, onClose, onSentSuccess }) => {
  const [recipient, setRecipient] = useState(quote?.contactEmail || 'cliente@empresa.com.br');
  const [cc, setCc] = useState('comercial@consentra.com.br');
  const [subject, setSubject] = useState(quote ? `Proposta Técnica & Comercial SST Nº ${quote.numberOnly || quote.id.replace('#', '')} - ${quote.clientName}` : '');
  const [body, setBody] = useState(
    quote
      ? `Prezado(a) ${quote.contactPerson},\n\nConforme alinhamento técnico prévio, encaminhamos em anexo a Proposta Técnica e Comercial Nº ${quote.numberOnly || quote.id.replace('#', '')} para prestação de serviços de Engenharia de Segurança e Medicina do Trabalho (SST) para ${quote.clientName}.\n\nValor total da proposta: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.total)} (${quote.paymentCondition}).\n\nFicamos à disposição para quaisquer esclarecimentos técnicos ou agendamento de reunião de alinhamento com nosso Responsável Técnico.\n\nAtenciosamente,\n${quote.responsibleTech || 'Washington Assis'}\nCONSENTRA SEGURANÇA E MEDICINA DO TRABALHO LTDA\nTel: (11) 3450-8900 | comercial@consentra.com.br`
      : ''
  );
  const [isSending, setIsSending] = useState(false);

  if (!isOpen || !quote) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      onSentSuccess();
      onClose();
    }, 1200);
  };

  return (
    <div id="email-modal" className="fixed inset-0 bg-[#0b1c30]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-[#e5eeff] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
          <div className="flex items-center gap-2 text-[#004328]">
            <span className="material-symbols-outlined text-[22px]">outgoing_mail</span>
            <h3 className="font-bold text-base text-[#0b1c30]">Disparar Proposta por E-mail</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#eff4ff] flex items-center justify-center text-[#49607e]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSend} className="py-4 flex flex-col gap-3 text-xs">
          <div>
            <label className="block font-semibold text-[#404942] mb-1">Destinatário Principal *</label>
            <input
              required
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#404942] mb-1">Cópia (CC)</label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#404942] mb-1">Assunto</label>
            <input
              required
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#404942] mb-1">Mensagem</label>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 rounded-lg bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none leading-relaxed font-sans"
            />
          </div>

          {/* Attachment Box */}
          <div className="p-3 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-[#ffdad6] text-[#ba1a1a]">
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              </span>
              <div>
                <span className="font-bold text-xs text-[#0b1c30] block">
                  Proposta_Tecnica_Consentra_{quote.numberOnly || quote.id.replace('#', '')}.pdf
                </span>
                <span className="text-[10px] text-[#49607e] font-mono">1.8 MB • Assinado digitalmente</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Anexado
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#eff4ff]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#eff4ff] text-[#0b1c30] font-semibold hover:bg-[#e5eeff]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isSending ? 'sync' : 'send'}
              </span>
              <span>{isSending ? 'Enviando...' : 'Enviar Proposta'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
