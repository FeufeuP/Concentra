/**
 * Histórico (trilha de auditoria) dos orçamentos.
 *
 * Supabase: gravado pelo servidor (trigger em `quotes` + Edge Function de
 * e-mail) na tabela `quote_events`, que o app apenas lê.
 * Modo local: o repositório local registra os mesmos eventos no navegador.
 */
import type { Quote } from './types';

export type QuoteEventType = 'created' | 'status_changed' | 'email_sent' | 'deleted';

export interface QuoteEvent {
  id: string;
  quoteId: string;
  quoteNumber?: number;
  type: QuoteEventType;
  fromStatus?: string;
  toStatus?: string;
  details: Record<string, unknown>;
  actorName?: string;
  /** ISO 8601 */
  createdAt: string;
}

export interface EventActor {
  id?: string;
  name?: string;
}

export const LOCAL_EVENTS_KEY = 'consentra_quote_events';
/** Limite de eventos guardados no modo local (os mais antigos saem primeiro). */
export const MAX_LOCAL_EVENTS = 2000;

const cleanId = (id: string) => String(id).replace('#', '');

function baseEvent(quote: Pick<Quote, 'id' | 'numberOnly' | 'clientName' | 'total'>, actor: EventActor | null, now: Date) {
  return {
    id: `evt-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    quoteId: cleanId(quote.id),
    quoteNumber: quote.numberOnly,
    details: { client_name: quote.clientName, total: quote.total },
    actorName: actor?.name,
    createdAt: now.toISOString(),
  };
}

/**
 * Eventos gerados ao gravar um orçamento (mesma regra do trigger do banco):
 * criação, ou mudança de status. Edições sem troca de status não geram evento.
 */
export function eventsForSave(previous: Quote | undefined, next: Quote, actor: EventActor | null, now = new Date()): QuoteEvent[] {
  if (!previous) {
    return [{ ...baseEvent(next, actor, now), type: 'created', toStatus: next.status }];
  }
  if (previous.status !== next.status) {
    return [{ ...baseEvent(next, actor, now), type: 'status_changed', fromStatus: previous.status, toStatus: next.status }];
  }
  return [];
}

export function eventForDelete(quote: Quote, actor: EventActor | null, now = new Date()): QuoteEvent {
  return { ...baseEvent(quote, actor, now), type: 'deleted', fromStatus: quote.status };
}

/** Acrescenta eventos mantendo o limite (descarta os mais antigos). */
export function appendEvents(list: QuoteEvent[], added: QuoteEvent[], max = MAX_LOCAL_EVENTS): QuoteEvent[] {
  const merged = [...list, ...added];
  return merged.length > max ? merged.slice(merged.length - max) : merged;
}

/** Eventos de um orçamento, do mais recente para o mais antigo. */
export function eventsOfQuote(list: QuoteEvent[], quoteId: string): QuoteEvent[] {
  const id = cleanId(quoteId);
  return list
    .filter((e) => e.quoteId === id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

export interface QuoteEventView {
  icon: string;
  title: string;
  description?: string;
  tone: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}

const STATUS_TONE: Record<string, QuoteEventView['tone']> = {
  Aprovado: 'green',
  Enviado: 'blue',
  'Aguardando Retorno': 'amber',
  Reprovado: 'red',
  Cancelado: 'red',
  Vencido: 'red',
  Rascunho: 'gray',
};

function list(value: unknown): string {
  return Array.isArray(value) ? value.filter((v) => typeof v === 'string').join(', ') : '';
}

/** Texto e ícone de cada evento para a linha do tempo. */
export function describeQuoteEvent(event: QuoteEvent): QuoteEventView {
  switch (event.type) {
    case 'created':
      return {
        icon: 'add_circle',
        title: 'Orçamento criado',
        description: event.toStatus ? `Status inicial: ${event.toStatus}` : undefined,
        tone: 'green',
      };
    case 'status_changed':
      return {
        icon: 'swap_horiz',
        title: `Status alterado para "${event.toStatus ?? '—'}"`,
        description: event.fromStatus ? `Antes: ${event.fromStatus}` : undefined,
        tone: STATUS_TONE[event.toStatus ?? ''] ?? 'blue',
      };
    case 'email_sent': {
      const to = list(event.details.to);
      const cc = list(event.details.cc);
      const parts = [to && `Para: ${to}`, cc && `CC: ${cc}`].filter(Boolean);
      return {
        icon: 'outgoing_mail',
        title: 'Proposta enviada por e-mail',
        description: parts.length ? parts.join(' • ') : undefined,
        tone: 'blue',
      };
    }
    case 'deleted':
      return { icon: 'delete', title: 'Orçamento excluído', tone: 'red' };
    default:
      return { icon: 'info', title: 'Evento', tone: 'gray' };
  }
}

/** Data/hora no formato brasileiro (dd/mm/aaaa hh:mm). */
export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
