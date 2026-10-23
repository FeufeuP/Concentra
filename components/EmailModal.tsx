'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Quote } from '@/lib/types';
import { useAppData } from '@/lib/store/AppDataContext';
import { getStoredCompanyProfile } from '@/lib/company';
import { downloadQuotePdf, generateQuotePdfAttachment, quotePdfFileName } from '@/lib/pdf-generator';
import {
  buildMailtoUrl,
  defaultEmailContent,
  EmailServiceStatus,
  getEmailServiceStatus,
  isValidEmail,
  MAX_EMAIL_ATTACHMENT_BYTES,
  MAX_EMAIL_MESSAGE,
  sendQuoteEmail,
  validateEmailDraft,
} from '@/lib/email';

export interface EmailSentInfo {
  to: string[];
  /** true = enviado pelo servidor; false = usuário enviou pelo próprio aplicativo de e-mail */
  automatic: boolean;
  markAsSent: boolean;
}

interface EmailModalProps {
  quote: Quote;
  onClose: () => void;
  onSent: (info: EmailSentInfo) => void;
}

type Phase = 'idle' | 'pdf' | 'sending';

const inputClass =
  'w-full h-9 px-3 rounded-lg bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d5c3a]/30';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/**
 * Envio da proposta por e-mail.
 * - Servidor configurado (Supabase + Resend): envia com o PDF anexo e registra no histórico.
 * - Caso contrário: envio manual (baixa o PDF e abre o aplicativo de e-mail com tudo preenchido).
 * Montar com `key={quote.id}` para reiniciar o formulário a cada orçamento.
 */
export const EmailModal: React.FC<EmailModalProps> = ({ quote, onClose, onSent }) => {
  const { user, canWrite } = useAppData();
  const company = useMemo(() => getStoredCompanyProfile(), []);
  const defaults = useMemo(() => defaultEmailContent(quote, company, user.name), [quote, company, user.name]);

  const [to, setTo] = useState(quote.contactEmail || '');
  const [cc, setCc] = useState(isValidEmail(company.email || '') ? company.email : '');
  const [subject, setSubject] = useState(defaults.subject);
  const [message, setMessage] = useState(defaults.message);
  const [markAsSent, setMarkAsSent] = useState(quote.status === 'Rascunho' && canWrite);
  const [service, setService] = useState<EmailServiceStatus | 'checking'>('checking');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pdfSize, setPdfSize] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEmailServiceStatus().then((s) => {
      if (!cancelled) setService(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auditor (somente leitura) usa sempre o envio manual
  const automatic = service === 'configured' && canWrite;
  const busy = phase !== 'idle';
  const fileName = quotePdfFileName(quote);
  const showStatusOption = canWrite && quote.status === 'Rascunho';

  const validate = () => {
    const v = validateEmailDraft({ to, cc, subject, message });
    if (v.error) {
      setError(v.error);
      return null;
    }
    setError(null);
    return v;
  };

  const handleSendAutomatic = async () => {
    const v = validate();
    if (!v) return;
    try {
      setPhase('pdf');
      const attachment = await generateQuotePdfAttachment(quote);
      setPdfSize(attachment.bytes);
      if (attachment.bytes > MAX_EMAIL_ATTACHMENT_BYTES) {
        setError(`O PDF ficou com ${formatBytes(attachment.bytes)}, acima do limite de 8 MB para e-mail. Use o envio manual.`);
        setPhase('idle');
        return;
      }
      setPhase('sending');
      const res = await sendQuoteEmail({
        quoteId: quote.id,
        to: v.to,
        cc: v.cc,
        subject,
        message,
        attachment: { filename: attachment.filename, content: attachment.content },
      });
      setPhase('idle');
      if (!res.success) {
        if (res.notConfigured) {
          setService('not_configured');
          setNotice('O envio automático não está configurado no servidor. Use o envio manual abaixo.');
        } else {
          setError(res.error);
        }
        return;
      }
      onSent({ to: v.to, automatic: true, markAsSent: showStatusOption && markAsSent });
      onClose();
    } catch (err) {
      console.error('Falha ao enviar e-mail:', err);
      setPhase('idle');
      setError('Não foi possível gerar o PDF da proposta. Tente novamente.');
    }
  };

  const handleManual = async () => {
    const v = validate();
    if (!v) return;
    setPhase('pdf');
    const ok = await downloadQuotePdf(quote);
    setPhase('idle');
    if (!ok) {
      setError('Não foi possível gerar o PDF. Tente novamente.');
      return;
    }
    window.location.href = buildMailtoUrl(v.to, v.cc, subject, message);
    onSent({ to: v.to, automatic: false, markAsSent: showStatusOption && markAsSent });
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || service === 'checking') return;
    void (automatic ? handleSendAutomatic() : handleManual());
  };

  const submitLabel =
    phase === 'pdf'
      ? 'Gerando PDF...'
      : phase === 'sending'
        ? 'Enviando...'
        : service === 'checking'
          ? 'Verificando...'
          : automatic
            ? 'Enviar Proposta'
            : 'Baixar PDF e abrir e-mail';

  const manualReason =
    service === 'local'
      ? 'Modo local: o envio automático exige o Supabase.'
      : !canWrite
        ? 'Seu perfil é somente leitura: envie pelo seu aplicativo de e-mail.'
        : service === 'unavailable'
          ? 'Não foi possível consultar o servidor de e-mail agora.'
          : 'Envio automático ainda não configurado no servidor.';

  return (
    <div
      id="email-modal"
      className="fixed inset-0 bg-[#0b1c30]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-[#e5eeff] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
          <div className="flex items-center gap-2 text-[#004328]">
            <span className="material-symbols-outlined text-[22px]">outgoing_mail</span>
            <h3 id="email-modal-title" className="font-bold text-base text-[#0b1c30]">
              Enviar Proposta por E-mail
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg hover:bg-[#eff4ff] flex items-center justify-center text-[#49607e] disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {service !== 'checking' && !automatic && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex gap-2">
            <span className="material-symbols-outlined text-[18px]">info</span>
            <div>
              <p className="font-bold">Envio manual</p>
              <p>
                {notice || manualReason} Ao continuar, o PDF será baixado e seu aplicativo de e-mail abrirá com destinatários,
                assunto e mensagem preenchidos. <strong>Anexe o PDF baixado</strong> antes de enviar.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="py-4 flex flex-col gap-3 text-xs" noValidate>
          <div>
            <label htmlFor="email-to" className="block font-semibold text-[#404942] mb-1">
              Destinatário(s) *
            </label>
            <input
              id="email-to"
              type="text"
              inputMode="email"
              autoComplete="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="cliente@empresa.com.br"
              className={inputClass}
            />
            <p className="text-[10px] text-[#707971] mt-0.5">Separe vários e-mails por vírgula (máx. 5).</p>
          </div>

          <div>
            <label htmlFor="email-cc" className="block font-semibold text-[#404942] mb-1">
              Cópia (CC)
            </label>
            <input
              id="email-cc"
              type="text"
              inputMode="email"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="email-subject" className="block font-semibold text-[#404942] mb-1">
              Assunto *
            </label>
            <input
              id="email-subject"
              type="text"
              value={subject}
              maxLength={200}
              onChange={(e) => setSubject(e.target.value)}
              className={`${inputClass} font-medium`}
            />
          </div>

          <div>
            <label htmlFor="email-message" className="block font-semibold text-[#404942] mb-1">
              Mensagem *
            </label>
            <textarea
              id="email-message"
              rows={8}
              value={message}
              maxLength={MAX_EMAIL_MESSAGE}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 rounded-lg bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none leading-relaxed font-sans"
            />
          </div>

          {/* Anexo */}
          <div className="p-3 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-lg bg-[#ffdad6] text-[#ba1a1a]">
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              </span>
              <div className="min-w-0">
                <span className="font-bold text-xs text-[#0b1c30] block truncate">{fileName}</span>
                <span className="text-[10px] text-[#49607e]">
                  {pdfSize !== null ? formatBytes(pdfSize) : 'Gerado no momento do envio'}
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                automatic ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {automatic ? 'Anexo automático' : 'Anexar manualmente'}
            </span>
          </div>

          {showStatusOption && (
            <label className="flex items-center gap-2 text-[11px] text-[#404942] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={markAsSent}
                onChange={(e) => setMarkAsSent(e.target.checked)}
                className="w-4 h-4 accent-[#004328]"
              />
              Atualizar o status do orçamento de &quot;Rascunho&quot; para &quot;Enviado&quot;
            </label>
          )}

          {error && (
            <p role="alert" className="p-2.5 rounded-lg bg-[#fff1ef] border border-[#ffdad6] text-[#ba1a1a] font-medium">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#eff4ff]">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-[#eff4ff] text-[#0b1c30] font-semibold hover:bg-[#e5eeff] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || service === 'checking'}
              className="px-5 py-2 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[16px] ${busy ? 'animate-spin' : ''}`}>
                {busy ? 'sync' : automatic ? 'send' : 'forward_to_inbox'}
              </span>
              <span>{submitLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
