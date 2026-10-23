'use client';

/**
 * Status real da conexão com o servidor (substitui o "Conectado" fixo do topo).
 *
 * - local:     sem Supabase configurado (dados só neste navegador)
 * - checking:  verificando
 * - online:    o banco respondeu
 * - offline:   sem internet ou o servidor não respondeu
 * - session:   o servidor respondeu, mas a sessão expirou (precisa novo login)
 *
 * Verifica a cada 60 s, ao voltar para a aba, nos eventos online/offline do
 * navegador e quando alguma gravação falha (evento CONNECTION_RECHECK_EVENT).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export type ConnectionState = 'local' | 'checking' | 'online' | 'offline' | 'session';

export interface ConnectionStatus {
  state: ConnectionState;
  /** Tempo de resposta da última verificação (ms) */
  latencyMs?: number;
  /** ISO da última verificação concluída */
  checkedAt?: string;
  detail?: string;
}

export const CONNECTION_RECHECK_EVENT = 'consentra:connection-recheck';
export const CONNECTION_CHECK_INTERVAL_MS = 60_000;
const PING_TIMEOUT_MS = 8_000;

/** Pede uma nova verificação (ex.: após falha de gravação). */
export function requestConnectionRecheck(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CONNECTION_RECHECK_EVENT));
}

/** Classifica o resultado de uma verificação (puro, testável). */
export function classifyPing(input: {
  configured: boolean;
  browserOnline: boolean;
  error?: { message?: string; code?: string; status?: number } | null;
}): { state: ConnectionState; detail?: string } {
  if (!input.configured) return { state: 'local', detail: 'Dados salvos somente neste navegador.' };
  if (!input.browserOnline) return { state: 'offline', detail: 'Sem conexão com a internet.' };
  const err = input.error;
  if (!err) return { state: 'online' };
  const msg = (err.message || '').toLowerCase();
  if (err.status === 401 || err.code === 'PGRST301' || err.code === 'PGRST303' || msg.includes('jwt')) {
    return { state: 'session', detail: 'Sessão expirada. Saia e entre novamente.' };
  }
  if (msg.includes('timeout')) return { state: 'offline', detail: 'O servidor demorou para responder.' };
  return { state: 'offline', detail: 'Não foi possível contatar o servidor.' };
}

/** Uma verificação: consulta mínima (HEAD) em `app_settings`, com tempo limite. */
export async function pingServer(): Promise<ConnectionStatus> {
  const configured = isSupabaseConfigured();
  const browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  const client = getSupabaseClient();
  if (!configured || !client || !browserOnline) {
    return { ...classifyPing({ configured: configured && !!client, browserOnline }), checkedAt: new Date().toISOString() };
  }

  const started = Date.now();
  let error: { message?: string; code?: string; status?: number } | null = null;
  try {
    const query = client.from('app_settings').select('key', { head: true, count: 'exact' }).limit(1);
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), PING_TIMEOUT_MS));
    const res = await Promise.race([query, timeout]);
    if (res.error) error = { message: res.error.message, code: res.error.code, status: res.status };
  } catch (err) {
    error = { message: err instanceof Error ? err.message : String(err) };
  }
  const result = classifyPing({ configured, browserOnline, error });
  return { ...result, latencyMs: Date.now() - started, checkedAt: new Date().toISOString() };
}

/** Hook com verificação periódica e por eventos. */
export function useConnectionStatus(): ConnectionStatus & { recheck: () => void } {
  const [status, setStatus] = useState<ConnectionStatus>(() =>
    isSupabaseConfigured() ? { state: 'checking' } : { state: 'local', detail: 'Dados salvos somente neste navegador.' }
  );
  const running = useRef(false);

  const recheck = useCallback(() => {
    if (!isSupabaseConfigured() || running.current) return;
    running.current = true;
    void pingServer()
      .then(setStatus)
      .finally(() => {
        running.current = false;
      });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const first = setTimeout(recheck, 0);
    const interval = setInterval(recheck, CONNECTION_CHECK_INTERVAL_MS);
    const onOffline = () => setStatus({ ...classifyPing({ configured: true, browserOnline: false }), checkedAt: new Date().toISOString() });
    const onVisible = () => {
      if (document.visibilityState === 'visible') recheck();
    };
    window.addEventListener('online', recheck);
    window.addEventListener('offline', onOffline);
    window.addEventListener(CONNECTION_RECHECK_EVENT, recheck);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      window.removeEventListener('online', recheck);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener(CONNECTION_RECHECK_EVENT, recheck);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [recheck]);

  return { ...status, recheck };
}

export const CONNECTION_LABELS: Record<ConnectionState, { label: string; dot: string; text: string }> = {
  local: { label: 'Modo local', dot: 'bg-amber-500', text: 'text-amber-800' },
  checking: { label: 'Verificando…', dot: 'bg-slate-400 animate-pulse', text: 'text-[#49607e]' },
  online: { label: 'Online', dot: 'bg-emerald-500', text: 'text-emerald-800' },
  offline: { label: 'Sem conexão', dot: 'bg-red-500', text: 'text-red-700' },
  session: { label: 'Sessão expirada', dot: 'bg-red-500', text: 'text-red-700' },
};
