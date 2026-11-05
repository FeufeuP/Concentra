import { assetPath } from './base-path';
import { pushSetting, SETTING_KEYS } from './remote-sync';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export const DEFAULT_LOGO_URL = assetPath('/logo-consentra-horizontal.png');

const LOGO_STORAGE_KEY = 'consentra_custom_logo';
export const LOGO_LOCAL_STORAGE_KEY = LOGO_STORAGE_KEY;

/** Limite do logotipo no modo local (base64 no localStorage, cota total ~5 MB). */
export const MAX_LOCAL_LOGO_BYTES = 1024 * 1024;

/**
 * Valida/normaliza um valor de logotipo salvo.
 * Retorna o logotipo padrão para valores vazios ou sabidamente inválidos:
 * - referências legadas a arquivos que não existem mais em /public
 *   (`logo-consentra-real.jpg`, `logo-consentra.jpg`) — quebravam a imagem;
 * - URLs `blob:` — só existem na sessão em que foram criadas; restauradas do
 *   localStorage depois de recarregar, apontam para um objeto inexistente;
 * - qualquer coisa que não seja data URL de imagem, http(s) ou caminho absoluto.
 */
export function normalizeLogoUrl(saved: string | null | undefined): string {
  const value = (saved || '').trim();
  if (!value) return DEFAULT_LOGO_URL;
  if (value.includes('logo-consentra-real.jpg') || value.includes('logo-consentra.jpg')) {
    return DEFAULT_LOGO_URL;
  }
  if (value.startsWith('blob:')) return DEFAULT_LOGO_URL;
  if (value.startsWith('data:image/')) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return value;
  return DEFAULT_LOGO_URL;
}

export function getStoredLogoUrl(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_LOGO_URL;
  }
  try {
    return normalizeLogoUrl(localStorage.getItem(LOGO_STORAGE_KEY));
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
export function saveStoredLogoUrl(logoUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, logoUrl);
  } catch (err) {
    console.error('Erro ao salvar logo customizada:', err);
    return false;
  }
  window.dispatchEvent(new CustomEvent('consentra_logo_updated', { detail: logoUrl }));
  // Nunca envia base64 para o banco: no modo Supabase o logo vive no Storage
  if (!logoUrl.startsWith('data:')) {
    pushSetting(SETTING_KEYS.logo, logoUrl);
  }
  return true;
}

export function clearStoredLogoUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOGO_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('consentra_logo_updated', { detail: DEFAULT_LOGO_URL }));
  } catch (err) {
    console.error('Erro ao redefinir logo corporativa:', err);
  }
  pushSetting(SETTING_KEYS.logo, null);
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

/**
 * Busca a URL do logotipo no servidor (mesmo deslogado) e aplica no cache local.
 * Usado pela tela de login, para um navegador novo já abrir com o logotipo
 * oficial da empresa — antes, o logo do servidor só era aplicado depois do login
 * (`pullRemoteSettings`) e a tela de acesso ficava com o padrão/desatualizado.
 * Requer a política de leitura pública SOMENTE da chave `logo_url`
 * (ver `supabase/upgrade_fase6.sql`). Sem efeito no modo local.
 */
export async function fetchPublicLogoUrl(): Promise<void> {
  if (typeof window === 'undefined' || !isSupabaseConfigured()) return;
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const { data, error } = await client
      .from('app_settings')
      .select('value')
      .eq('key', SETTING_KEYS.logo)
      .maybeSingle();
    if (error) return; // sem política/permissão: mantém o cache atual
    const value = (data as { value?: unknown } | null)?.value;
    // Só aplica quando há um logo no servidor; ausência = padrão do sistema
    // (não apaga um logo válido já em cache à toa nesta etapa pré-login).
    if (typeof value === 'string' && /^https:\/\//.test(value)) {
      applyRemoteLogo(value);
    }
  } catch {
    /* mantém o cache atual */
  }
}
