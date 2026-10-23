import { pushSetting, SETTING_KEYS } from './remote-sync';

export const DEFAULT_RESPONSIBLES: string[] = [
  'Washington Assis',
  'Dra. Mariana Rios',
  'Tec. Roberto Silva',
  'Amanda Silveira',
  'Gabriel Santana'
];

const STORAGE_KEY = 'consentra_quote_responsibles';
export const RESPONSIBLES_STORAGE_KEY = STORAGE_KEY;

export function getStoredResponsibles(): string[] {
  if (typeof window === 'undefined') {
    return DEFAULT_RESPONSIBLES;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      let parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Remove permanentemente Carlos Eduardo e garante Washington Assis
        parsed = parsed.filter((name: string) => name !== 'Carlos Eduardo');
        if (!parsed.includes('Washington Assis')) {
          parsed.unshift('Washington Assis');
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao ler responsáveis do localStorage:', err);
  }
  return DEFAULT_RESPONSIBLES;
}

export function saveStoredResponsibles(list: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const filtered = list.filter((n: string) => n !== 'Carlos Eduardo');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    // Dispatch custom event for cross-component reactive updates
    window.dispatchEvent(new CustomEvent('consentra_responsibles_updated', { detail: filtered }));
  } catch (err) {
    console.error('Erro ao salvar responsáveis no localStorage:', err);
  }
  pushSetting(SETTING_KEYS.responsibles, list.filter((n: string) => n !== 'Carlos Eduardo'));
}

/** Aplica a lista vinda do servidor (substitui o cache local, sem reenviar). */
export function applyRemoteResponsibles(value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    if (Array.isArray(value) && value.length > 0) {
      const list = value.filter((n): n is string => typeof n === 'string' && n.trim() !== '' && n !== 'Carlos Eduardo');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('consentra_responsibles_updated', { detail: getStoredResponsibles() }));
  } catch (err) {
    console.error('Erro ao aplicar responsáveis do servidor:', err);
  }
}

export function addStoredResponsible(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed || trimmed === 'Carlos Eduardo') return getStoredResponsibles();
  const current = getStoredResponsibles();
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    saveStoredResponsibles(updated);
    return updated;
  }
  return current;
}

export function removeStoredResponsible(name: string): string[] {
  const current = getStoredResponsibles();
  const updated = current.filter(n => n !== name);
  saveStoredResponsibles(updated);
  return updated;
}
