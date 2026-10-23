'use client';

import React, { useMemo, useState } from 'react';
import type { Quote } from '@/lib/types';
import {
  AppNotification,
  computeNotifications,
  getReadNotificationIds,
  markNotificationsRead,
  NotificationSeverity,
} from '@/lib/notifications';
import { CONNECTION_LABELS, ConnectionStatus } from '@/lib/connection-status';

interface NotificationsMenuProps {
  userId: string;
  quotes: Quote[];
  connection: ConnectionStatus & { recheck: () => void };
  onOpenQuote: (quoteId: string) => void;
}

const SEVERITY_STYLE: Record<NotificationSeverity, { icon: string; box: string; iconColor: string }> = {
  high: { icon: 'priority_high', box: 'bg-[#fff1ef] border-[#ffdad6]', iconColor: 'text-[#ba1a1a]' },
  medium: { icon: 'schedule', box: 'bg-amber-50 border-amber-100', iconColor: 'text-amber-700' },
  low: { icon: 'edit_note', box: 'bg-[#eff4ff] border-[#e5eeff]', iconColor: 'text-[#49607e]' },
};

const KIND_ICON: Record<AppNotification['kind'], string> = {
  expired: 'event_busy',
  expiring: 'hourglass_bottom',
  awaiting: 'schedule',
  stale_draft: 'edit_note',
};

function formatCheckedAt(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Sino de notificações calculadas a partir dos orçamentos + status real da conexão. */
export function NotificationsMenu({ userId, quotes, connection, onOpenQuote }: NotificationsMenuProps) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => getReadNotificationIds(userId));
  // Data de referência atualizada a cada abertura (ex.: sistema aberto de um dia para outro)
  const [now, setNow] = useState(() => new Date());

  const notifications = useMemo(() => computeNotifications(quotes, now), [quotes, now]);
  const unread = notifications.filter((n) => !readIds.includes(n.id));
  const urgentUnread = unread.filter((n) => n.severity === 'high').length;
  const conn = CONNECTION_LABELS[connection.state];

  const toggle = () => {
    if (!open) setNow(new Date());
    setOpen(!open);
  };

  const markAllRead = () => setReadIds(markNotificationsRead(userId, notifications.map((n) => n.id)));

  const openNotification = (n: AppNotification) => {
    setReadIds(markNotificationsRead(userId, [n.id]));
    setOpen(false);
    onOpenQuote(n.quoteId);
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label={unread.length ? `Notificações (${unread.length} não lidas)` : 'Notificações'}
        aria-expanded={open}
        className="relative w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#49607e] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
        type="button"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unread.length > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white ${
              urgentUnread > 0 ? 'bg-[#ba1a1a]' : 'bg-[#49607e]'
            }`}
          >
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-[#e5eeff] p-4 z-50">
            <div className="flex items-center justify-between pb-2 border-b border-[#eff4ff] gap-2">
              <span className="font-bold text-sm text-[#0b1c30]">Notificações Comerciais</span>
              <div className="flex items-center gap-2">
                {urgentUnread > 0 && (
                  <span className="text-[10px] font-semibold bg-[#ffdad6] text-[#ba1a1a] px-2 py-0.5 rounded-full">
                    {urgentUnread} {urgentUnread === 1 ? 'urgente' : 'urgentes'}
                  </span>
                )}
                {unread.length > 0 && (
                  <button type="button" onClick={markAllRead} className="text-[10px] font-semibold text-[#004328] hover:underline">
                    Marcar como lidas
                  </button>
                )}
              </div>
            </div>

            {/* Status real da conexão */}
            <div className="mt-3 p-2.5 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${conn.dot}`} />
                <div className="min-w-0">
                  <span className={`font-bold ${conn.text}`}>{conn.label}</span>
                  <span className="block text-[10px] text-[#49607e] truncate">
                    {connection.state === 'online'
                      ? `Banco de dados respondendo${connection.latencyMs ? ` (${connection.latencyMs} ms)` : ''}${
                          connection.checkedAt ? ` • ${formatCheckedAt(connection.checkedAt)}` : ''
                        }`
                      : connection.detail || 'Verificando o servidor…'}
                  </span>
                </div>
              </div>
              {connection.state !== 'local' && (
                <button
                  type="button"
                  onClick={connection.recheck}
                  className="text-[10px] font-semibold text-[#004328] hover:underline shrink-0"
                >
                  Verificar
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-3 max-h-[55vh] overflow-y-auto">
              {notifications.length === 0 && (
                <div className="py-6 text-center text-xs text-[#49607e]">
                  <span className="material-symbols-outlined text-[28px] text-emerald-600 block mb-1">task_alt</span>
                  Nenhuma pendência: propostas em dia.
                </div>
              )}
              {notifications.map((n) => {
                const style = SEVERITY_STYLE[n.severity];
                const isRead = readIds.includes(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openNotification(n)}
                    className={`p-2.5 rounded-xl border text-left text-xs flex gap-2.5 hover:brightness-[0.98] transition ${style.box} ${
                      isRead ? 'opacity-60' : ''
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] mt-0.5 ${style.iconColor}`}>{KIND_ICON[n.kind]}</span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="font-bold text-[#0b1c30]">{n.title}</span>
                        {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] shrink-0" aria-label="não lida" />}
                      </span>
                      <span className="block text-[#49607e] mt-0.5 leading-snug">{n.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Indicador compacto de conexão no topo (clique verifica novamente). */
export function ConnectionBadge({ connection }: { connection: ConnectionStatus & { recheck: () => void } }) {
  const conn = CONNECTION_LABELS[connection.state];
  return (
    <button
      type="button"
      onClick={connection.recheck}
      title={connection.detail || (connection.state === 'online' ? 'Conectado ao servidor. Clique para verificar novamente.' : conn.label)}
      className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#f8f9ff] border border-[#e5eeff] text-[11px] font-semibold hover:bg-[#eff4ff]"
    >
      <span className={`w-2 h-2 rounded-full ${conn.dot}`} />
      <span className={conn.text}>{conn.label}</span>
    </button>
  );
}
