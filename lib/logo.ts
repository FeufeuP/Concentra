export const DEFAULT_LOGO_URL = '/logo-consentra-horizontal.png';
export const DEFAULT_REAL_LOGO_URL = '/logo-consentra-horizontal.png';

const LOGO_STORAGE_KEY = 'consentra_custom_logo';

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

export function saveStoredLogoUrl(logoDataUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, logoDataUrl);
    window.dispatchEvent(new CustomEvent('consentra_logo_updated', { detail: logoDataUrl }));
  } catch (err) {
    console.error('Erro ao salvar logo customizada:', err);
  }
}

export function clearStoredLogoUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOGO_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('consentra_logo_updated', { detail: DEFAULT_LOGO_URL }));
  } catch (err) {
    console.error('Erro ao redefinir logo corporativa:', err);
  }
}
