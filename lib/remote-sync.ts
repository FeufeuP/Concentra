'use client';

/** Gravações de configurações confirmadas pelo servidor, serializadas por chave. */
import { isSupabaseConfigured, saveAppSetting } from './supabase';

export const SETTINGS_SYNC_ERROR_EVENT = 'consentra_settings_sync_error';
export const SETTING_KEYS = {
  companyProfile: 'company_profile',
  quoteTexts: 'quote_texts',
  responsibles: 'responsible_persons',
  logo: 'logo_url',
} as const;
export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
export interface SettingsSyncErrorDetail { key: SettingKey; error: string }

const queues: Partial<Record<SettingKey, Promise<void>>> = {};

/** Só resolve depois do commit. Uma falha não impede tentativas posteriores. */
export function pushSetting(key: SettingKey, value: unknown): Promise<void> {
  if (typeof window === 'undefined' || !isSupabaseConfigured()) return Promise.resolve();
  const previous = queues[key] || Promise.resolve();
  const pending = previous.catch(() => {}).then(async () => {
    const res = await saveAppSetting(key, value);
    if (!res.success) throw new Error(res.error || 'Erro ao salvar configuração.');
  });
  queues[key] = pending;
  // O observador global é complementar: quem iniciou o save também recebe a rejeição.
  void pending.catch((err: unknown) => {
    window.dispatchEvent(new CustomEvent<SettingsSyncErrorDetail>(SETTINGS_SYNC_ERROR_EVENT, {
      detail: { key, error: err instanceof Error ? err.message : 'Erro ao salvar configuração.' },
    }));
  });
  return pending;
}

/** Uma falha passada não deve bloquear a releitura dos valores reais do servidor. */
export async function flushPendingSettings(): Promise<void> {
  await Promise.allSettled(Object.values(queues));
}
