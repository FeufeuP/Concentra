import { assetPath } from './base-path';
import { pushSetting, SETTING_KEYS } from './remote-sync';

export const DEFAULT_LOGO_URL = assetPath('/logo-consentra-horizontal.png');

const LOGO_STORAGE_KEY = 'consentra_custom_logo';
export const LOGO_LOCAL_STORAGE_KEY = LOGO_STORAGE_KEY;

/** Limite do logotipo no modo local (base64 no localStorage, cota total ~5 MB). */
export const MAX_LOCAL_LOGO_BYTES = 1024 * 1024;

export function getStoredLogoUrl(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_LOGO_URL;
  }
  try {
    const saved = localStorage.getItem(LOGO_STORAGE_KEY);
    if (saved && saved.trim().length > 0) {
      // Ignora referências obsoletas a arquivos JPEG antigos
      if (saved.includes('logo-consentra-real.jpg') || saved.includes('logo-consentra.jpg')) {
        return DEFAULT_LOGO_URL;
      }
      return saved;
    }
  } catch (err) {
    console.error('Erro ao recuperar logo customizada:', err);
  }
  return DEFAULT_LOGO_URL;
}

/**
 * Salva o logotipo. No modo Supabase recebe a URL pública do Storage (o envio do
 * arquivo é feito antes, com `uploadLogoToStorage`); no modo local, um data URL.
 * Retorna false se não couber no armazenamento do navegador.
 */
export async function saveStoredLogoUrl(logoUrl: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!logoUrl.startsWith('data:')) await pushSetting(SETTING_KEYS.logo, logoUrl);
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, logoUrl);
  } catch (err) {
    console.error('Erro ao salvar logo customizada:', err);
    return false;
  }
  window.dispatchEvent(new CustomEvent('consentra_logo_updated', { detail: logoUrl }));
  return true;
}

export async function clearStoredLogoUrl(): Promise<void> {
  if (typeof window === 'undefined') return;
  await pushSetting(SETTING_KEYS.logo, null);
  try {
    localStorage.removeItem(LOGO_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('consentra_logo_updated', { detail: DEFAULT_LOGO_URL }));
  } catch (err) {
    console.error('Erro ao redefinir logo corporativa:', err);
  }
}

/** Aplica o logotipo vindo do servidor (substitui o cache local, sem reenviar). */
export function applyRemoteLogo(value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    if (typeof value === 'string' && /^https:\/\//.test(value)) {
      localStorage.setItem(LOGO_STORAGE_KEY, value);
      window.dispatchEvent(new CustomEvent('consentra_logo_updated', { detail: value }));
    } else {
      localStorage.removeItem(LOGO_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('consentra_logo_updated', { detail: DEFAULT_LOGO_URL }));
    }
  } catch (err) {
    console.error('Erro ao aplicar logo do servidor:', err);
  }
}
