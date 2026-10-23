/**
 * Envio de propostas por e-mail.
 *
 * Modo Supabase + Resend configurado: Edge Function `send-quote-email` envia de
 * verdade, com o PDF anexo, e registra no histórico do orçamento.
 * Sem configuração (ou no modo local): envio manual — o app baixa o PDF e abre
 * o aplicativo de e-mail do usuário com destinatários, assunto e texto prontos.
 */
import type { Quote } from './types';
import type { CompanyProfile } from './company';
import { invokeEdgeFunction, isSupabaseConfigured } from './supabase';

export const MAX_EMAIL_RECIPIENTS = 5;
export const MAX_EMAIL_SUBJECT = 200;
export const MAX_EMAIL_MESSAGE = 10_000;
export const MAX_EMAIL_ATTACHMENT_BYTES = 8 * 1024 * 1024;

const EMAIL_RE = /^[^\s@<>(),;:"[\]]+@[^\s@<>(),;:"[\]]+\.[^\s@<>(),;:"[\]]{2,}$/;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  return v.length <= 254 && EMAIL_RE.test(v);
}

/** Separa uma lista digitada ("a@x.com; b@y.com, ...") em válidos (sem repetição) e inválidos. */
export function parseEmailList(text: string): { valid: string[]; invalid: string[] } {
  const parts = text
    .split(/[,;\s]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    if (!isValidEmail(p)) invalid.push(p);
    else if (!valid.includes(p)) valid.push(p);
  }
  return { valid, invalid };
}

export interface EmailDraft {
  to: string;
  cc: string;
  subject: string;
  message: string;
}

export interface EmailValidation {
  to: string[];
  cc: string[];
  error?: string;
}

/** Mesmas regras da Edge Function (feedback imediato no formulário). */
export function validateEmailDraft(draft: EmailDraft): EmailValidation {
  const to = parseEmailList(draft.to);
  const cc = parseEmailList(draft.cc);
  const result = { to: to.valid, cc: cc.valid };
  if (to.invalid.length) return { ...result, error: `E-mail inválido em "Destinatário": ${to.invalid.join(', ')}` };
  if (cc.invalid.length) return { ...result, error: `E-mail inválido em "Cópia (CC)": ${cc.invalid.join(', ')}` };
  if (to.valid.length === 0) return { ...result, error: 'Informe ao menos um destinatário.' };
  if (to.valid.length > MAX_EMAIL_RECIPIENTS || cc.valid.length > MAX_EMAIL_RECIPIENTS) {
    return { ...result, error: `Máximo de ${MAX_EMAIL_RECIPIENTS} e-mails por campo.` };
  }
  const subject = draft.subject.trim();
  if (!subject) return { ...result, error: 'Informe o assunto.' };
  if (subject.length > MAX_EMAIL_SUBJECT) return { ...result, error: `Assunto com no máximo ${MAX_EMAIL_SUBJECT} caracteres.` };
  const message = draft.message.trim();
  if (!message) return { ...result, error: 'Escreva a mensagem.' };
  if (message.length > MAX_EMAIL_MESSAGE) return { ...result, error: `Mensagem com no máximo ${MAX_EMAIL_MESSAGE} caracteres.` };
  return result;
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const quoteNumber = (q: Pick<Quote, 'id' | 'numberOnly'>) => String(q.numberOnly || q.id).replace('#', '');

/** Assunto e mensagem padrão, com os dados reais da empresa (Configurações) e do remetente. */
export function defaultEmailContent(
  quote: Quote,
  company: Pick<CompanyProfile, 'name' | 'tradeName' | 'phone' | 'email'>,
  senderName?: string
): { subject: string; message: string } {
  const num = quoteNumber(quote);
  const companyName = company.name || company.tradeName || 'Consentra';
  const contactLine = [company.phone && `Tel: ${company.phone}`, company.email].filter(Boolean).join(' | ');
  const greeting = quote.contactPerson ? `Prezado(a) ${quote.contactPerson},` : 'Prezados(as),';
  const payment = quote.paymentCondition ? ` (${quote.paymentCondition})` : '';
  const signature = [senderName || quote.responsibleTech, companyName, contactLine].filter(Boolean).join('\n');
  return {
    subject: `Proposta Técnica & Comercial SST Nº ${num} - ${quote.clientName}`.slice(0, MAX_EMAIL_SUBJECT),
    message:
      `${greeting}\n\n` +
      `Conforme alinhamento prévio, encaminhamos em anexo a Proposta Técnica e Comercial Nº ${num} ` +
      `para prestação de serviços de Segurança e Saúde no Trabalho (SST) para ${quote.clientName}.\n\n` +
      `Valor total da proposta: ${brl(quote.total)}${payment}.\n` +
      (quote.validityDate ? `Validade da proposta: ${quote.validityDate}.\n` : '') +
      `\nFicamos à disposição para quaisquer esclarecimentos.\n\n` +
      `Atenciosamente,\n${signature}`,
  };
}

/** Link mailto: (envio manual pelo aplicativo de e-mail do usuário). */
export function buildMailtoUrl(to: string[], cc: string[], subject: string, message: string): string {
  const params = [`subject=${encodeURIComponent(subject)}`, `body=${encodeURIComponent(message)}`];
  if (cc.length) params.unshift(`cc=${encodeURIComponent(cc.join(','))}`);
  return `mailto:${to.map(encodeURIComponent).join(',')}?${params.join('&')}`;
}

export type EmailServiceStatus = 'configured' | 'not_configured' | 'local' | 'unavailable';

let cachedStatus: EmailServiceStatus | null = null;

/** O envio automático está disponível? (consulta a Edge Function uma vez por sessão) */
export async function getEmailServiceStatus(force = false): Promise<EmailServiceStatus> {
  if (!isSupabaseConfigured()) return 'local';
  if (cachedStatus && !force) return cachedStatus;
  const res = await invokeEdgeFunction<{ configured?: boolean }>('send-quote-email', { action: 'status' });
  if (res.error) return 'unavailable'; // não guarda: pode ser falha temporária
  cachedStatus = res.data?.configured ? 'configured' : 'not_configured';
  return cachedStatus;
}

export interface SendQuoteEmailInput {
  quoteId: string;
  to: string[];
  cc: string[];
  subject: string;
  message: string;
  attachment?: { filename: string; content: string };
}

export async function sendQuoteEmail(input: SendQuoteEmailInput): Promise<{ success: true } | { success: false; error: string; notConfigured?: boolean }> {
  const res = await invokeEdgeFunction<{ success?: boolean }>('send-quote-email', {
    quote_id: String(input.quoteId).replace('#', ''),
    to: input.to,
    cc: input.cc,
    subject: input.subject.trim(),
    message: input.message.trim(),
    attachment: input.attachment,
  });
  if (res.error) {
    const notConfigured = res.code === 'not_configured';
    if (notConfigured) cachedStatus = 'not_configured';
    return { success: false, error: res.error, notConfigured };
  }
  return { success: true };
}
