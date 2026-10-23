import { pushSetting, SETTING_KEYS } from './remote-sync';

/** Lista padrão de responsáveis pelo orçamento (fonte única; o SQL usa os mesmos nomes). */
export const DEFAULT_RESPONSIBLES: string[] = [
  'Washington Assis',
  'Dra. Mariana Rios',
  'Tec. Roberto Silva',
  'Amanda Silveira',
  'Gabriel Santana'
];

/** Responsável técnico principal: sempre presente na lista. */
export const PRIMARY_RESPONSIBLE = 'Washington Assis';

/** Nomes removidos definitivamente do sistema (não podem voltar à lista). */
const REMOVED_RESPONSIBLES = new Set(['Carlos Eduardo']);

const STORAGE_KEY = 'consentra_quote_responsibles';
export const RESPONSIBLES_STORAGE_KEY = STORAGE_KEY;

export function isAllowedResponsible(name: string | null | undefined): name is string {
  return typeof name === 'string' && name.trim() !== '' && !REMOVED_RESPONSIBLES.has(name.trim());
}

/** Remove nomes inválidos/removidos e duplicados, preservando a ordem. */
export function sanitizeResponsibles(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of list) {
    if (!isAllowedResponsible(item as string)) continue;
    const name = (item as string).trim();
    if (seen.has(name)) continue;
    seen.add(name);
    result.push(name);
  }
  return result;
}

/**
 * Opções de filtro por responsável: lista cadastrada + nomes já usados nos orçamentos
 * (para que orçamentos antigos continuem filtráveis), sem duplicar.
 */
export function responsibleFilterOptions(configured: string[], quotes: { responsibleTech?: string | null }[]): string[] {
  const base = sanitizeResponsibles(configured);
  const extra = sanitizeResponsibles(quotes.map((q) => q.responsibleTech)).filter((n) => !base.includes(n));
  return [...base, ...extra.sort((a, b) => a.localeCompare(b, 'pt-BR'))];
}

export function getStoredResponsibles(): string[] {
  if (typeof window === 'undefined') {
    return DEFAULT_RESPONSIBLES;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = sanitizeResponsibles(JSON.parse(saved));
      if (parsed.length > 0) {
        if (!parsed.includes(PRIMARY_RESPONSIBLE)) parsed.unshift(PRIMARY_RESPONSIBLE);
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
  const filtered = sanitizeResponsibles(list);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    // Evento para atualização reativa entre componentes
    window.dispatchEvent(new CustomEvent('consentra_responsibles_updated', { detail: filtered }));
  } catch (err) {
    console.error('Erro ao salvar responsáveis no localStorage:', err);
  }
  pushSetting(SETTING_KEYS.responsibles, filtered);
}

/** Aplica a lista vinda do servidor (substitui o cache local, sem reenviar). */
export function applyRemoteResponsibles(value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    const list = sanitizeResponsibles(value);
    if (list.length > 0) {
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
  if (!isAllowedResponsible(trimmed)) return getStoredResponsibles();
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
