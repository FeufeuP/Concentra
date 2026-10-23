'use client';

import { fetchAppSettings } from './supabase';
import { applyRemoteCompanyProfile, applyRemoteQuoteTexts } from './company';
import { applyRemoteResponsibles } from './responsibles';
import { applyRemoteLogo } from './logo';
import { SETTING_KEYS, flushPendingSettings } from './remote-sync';
import { snapshotLocalSettingsOnce } from './local-import';

/**
 * Baixa as configurações gerais do Supabase e aplica no cache local, disparando
 * os eventos que os componentes já escutam (`consentra_*_updated`).
 * Chaves ausentes no servidor = padrão do sistema.
 */
export async function pullRemoteSettings(): Promise<{ success: boolean; error?: string }> {
  snapshotLocalSettingsOnce();
  await flushPendingSettings();
  const res = await fetchAppSettings();
  if (!res.success) return { success: false, error: res.error };
  const values = res.data;
  applyRemoteCompanyProfile(values[SETTING_KEYS.companyProfile] ?? null);
  applyRemoteQuoteTexts(values[SETTING_KEYS.quoteTexts] ?? null);
  applyRemoteResponsibles(values[SETTING_KEYS.responsibles] ?? null);
  applyRemoteLogo(values[SETTING_KEYS.logo] ?? null);
  return { success: true };
}
