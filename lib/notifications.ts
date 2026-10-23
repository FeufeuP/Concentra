/**
 * Notificações calculadas a partir dos orçamentos (substitui a lista fixa do topo).
 *
 * Regras:
 * - Vencida:   Enviado / Aguardando Retorno com validade já passada  (alta)
 * - A vencer:  Enviado / Aguardando Retorno com validade em até 3 dias (alta)
 * - Retorno:   Enviado / Aguardando Retorno sem movimentação há 7+ dias (média)
 * - Rascunho:  Rascunho parado há 7+ dias (baixa)
 *
 * O id de cada notificação inclui a data de referência: se o orçamento mudar
 * (nova validade, nova movimentação), a notificação volta a aparecer como não lida.
 * As lidas ficam no navegador, por usuário.
 */
import type { Quote } from './types';

export type NotificationKind = 'expired' | 'expiring' | 'awaiting' | 'stale_draft';
export type NotificationSeverity = 'high' | 'medium' | 'low';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  quoteId: string;
  title: string;
  description: string;
  /** Dias até a validade (negativo = vencida) ou dias parado */
  days: number;
}

export const EXPIRING_WITHIN_DAYS = 3;
export const FOLLOW_UP_AFTER_DAYS = 7;
export const STALE_DRAFT_AFTER_DAYS = 7;
export const MAX_NOTIFICATIONS = 30;

const OPEN_STATUSES = ['Enviado', 'Aguardando Retorno'];
const SEVERITY_ORDER: Record<NotificationSeverity, number> = { high: 0, medium: 1, low: 2 };
const DAY_MS = 86_400_000;

/** dd/mm/aaaa → Date (meia-noite local) ou null. */
export function parseBrDate(value: string | undefined | null): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((value || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Diferença em dias de calendário (b - a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

/** Última movimentação: lastModified (ISO) ou, na falta, a data de emissão. */
export function lastActivity(quote: Pick<Quote, 'lastModified' | 'issueDate'>): Date | null {
  if (quote.lastModified && /^\d{4}-\d{2}-\d{2}/.test(quote.lastModified)) {
    const d = new Date(quote.lastModified);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return parseBrDate(quote.issueDate);
}

const num = (q: Quote) => String(q.numberOnly || q.id).replace('#', '');
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export function computeNotifications(quotes: Quote[], now: Date = new Date()): AppNotification[] {
  const list: AppNotification[] = [];

  for (const q of quotes) {
    const id = String(q.id).replace('#', '');
    const client = q.clientName || 'Cliente não informado';

    if (OPEN_STATUSES.includes(q.status)) {
      const validity = parseBrDate(q.validityDate);
      if (validity) {
        const left = daysBetween(now, validity);
        if (left < 0) {
          list.push({
            id: `expired:${id}:${q.validityDate}`,
            kind: 'expired',
            severity: 'high',
            quoteId: q.id,
            days: left,
            title: `Proposta Nº ${num(q)} vencida`,
            description: `${client} • venceu há ${plural(-left, 'dia', 'dias')} (${q.validityDate}). Renove ou marque como Vencido.`,
          });
        } else if (left <= EXPIRING_WITHIN_DAYS) {
          list.push({
            id: `expiring:${id}:${q.validityDate}`,
            kind: 'expiring',
            severity: 'high',
            quoteId: q.id,
            days: left,
            title: `Proposta Nº ${num(q)} vence ${left === 0 ? 'hoje' : left === 1 ? 'amanhã' : `em ${left} dias`}`,
            description: `${client} • validade ${q.validityDate}. Faça contato antes do vencimento.`,
          });
        }
      }

      const activity = lastActivity(q);
      if (activity) {
        const idle = daysBetween(activity, now);
        if (idle >= FOLLOW_UP_AFTER_DAYS) {
          list.push({
            id: `awaiting:${id}:${dayKey(activity)}`,
            kind: 'awaiting',
            severity: 'medium',
            quoteId: q.id,
            days: idle,
            title: `Retorno pendente: Nº ${num(q)}`,
            description: `${client} • ${q.status.toLowerCase()} há ${plural(idle, 'dia', 'dias')} sem movimentação.`,
          });
        }
      }
    } else if (q.status === 'Rascunho') {
      const activity = lastActivity(q);
      if (activity) {
        const idle = daysBetween(activity, now);
        if (idle >= STALE_DRAFT_AFTER_DAYS) {
          list.push({
            id: `stale_draft:${id}:${dayKey(activity)}`,
            kind: 'stale_draft',
            severity: 'low',
            quoteId: q.id,
            days: idle,
            title: `Rascunho parado: Nº ${num(q)}`,
            description: `${client} • sem alterações há ${plural(idle, 'dia', 'dias')}. Conclua e envie ou cancele.`,
          });
        }
      }
    }
  }

  return list
    .sort((a, b) => {
      const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (sev !== 0) return sev;
      // alta: mais urgente primeiro (menos dias); demais: mais tempo parado primeiro
      return a.severity === 'high' ? a.days - b.days : b.days - a.days;
    })
    .slice(0, MAX_NOTIFICATIONS);
}

// ---- Lidas (por usuário, neste navegador) ----

const READ_KEY_PREFIX = 'consentra_notifications_read_';
const MAX_READ_IDS = 500;

interface ReadStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): ReadStorage | null {
  return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
}

export function getReadNotificationIds(userId: string, storage: ReadStorage | null = defaultStorage()): string[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(READ_KEY_PREFIX + userId) || '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function markNotificationsRead(userId: string, ids: string[], storage: ReadStorage | null = defaultStorage()): string[] {
  const merged = Array.from(new Set([...getReadNotificationIds(userId, storage), ...ids])).slice(-MAX_READ_IDS);
  try {
    storage?.setItem(READ_KEY_PREFIX + userId, JSON.stringify(merged));
  } catch {
    /* armazenamento cheio: só não persiste */
  }
  return merged;
}
