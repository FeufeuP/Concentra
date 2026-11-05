'use client';

/**
 * Envio das configurações gerais (app_settings) para o Supabase.
 *
 * As configurações continuam com um cache síncrono no localStorage (os
 * componentes leem de lá), mas no modo Supabase o banco é a fonte da verdade:
 * - ao entrar, `pullRemoteSettings()` (lib/settings-sync.ts) baixa os valores;
 * - ao salvar, as funções de lib/company.ts, lib/responsibles.ts e lib/logo.ts
 *   chamam `pushSetting()`, que grava no banco em segundo plano.
 * Se a gravação falhar (ex.: perfil sem permissão), é disparado o evento
 * SETTINGS_SYNC_ERROR_EVENT; a página mostra o erro e recarrega os valores do
 * servidor, desfazendo a alteração local.
 */
import { isSupabaseConfigured, saveAppSetting } from './supabase';

export const SETTINGS_SYNC_ERROR_EVENT = 'consentra_settings_sync_error';

export const SETTING_KEYS = {
  companyProfile: 'company_profile',
  quoteTexts: 'quote_texts',
  responsibles: 'responsible_persons',
  logo: 'logo_url',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export interface SettingsSyncErrorDetail {
  key: SettingKey;
  error: string;
}

// Uma fila por chave: garante que a última alteração seja a última gravada
const queues: Partial<Record<SettingKey, Promise<void>>> = {};

/** Grava (ou remove, com `null`) uma configuração no Supabase. Sem efeito no modo local. */
export function pushSetting(key: SettingKey, value: unknown): void {
  if (typeof window === 'undefined' || !isSupabaseConfigured()) return;
  const previous = queues[key] || Promise.resolve();
  queues[key] = previous.then(async () => {
    const res = await saveAppSetting(key, value);
    if (!res.success) {
      window.dispatchEvent(
        new CustomEvent<SettingsSyncErrorDetail>(SETTINGS_SYNC_ERROR_EVENT, {
          detail: { key, error: res.error || 'Erro ao salvar configuração.' },
        })
      );
    }
  });
}

/** Aguarda as gravações pendentes (útil antes de recarregar do servidor). */
export async function flushPendingSettings(): Promise<void> {
  await Promise.all(Object.values(queues));
}
