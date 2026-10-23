'use client';

/**
 * Importação dos dados que ficaram salvos SOMENTE neste navegador (localStorage)
 * para o Supabase: orçamentos, clientes e configurações (empresa, textos do PDF,
 * responsáveis e logotipo).
 *
 * No modo Supabase o app não lê nem grava mais orçamentos/clientes no
 * localStorage, então esses dados antigos ficam intactos até serem importados
 * (ou descartados). As configurações, porém, usam o localStorage como cache e
 * são sobrescritas pelos valores do servidor; por isso tiramos uma cópia delas
 * (`snapshotLocalSettingsOnce`) antes da primeira sincronização.
 */
import { Quote, ClientData } from './types';
import {
  fetchQuotes,
  fetchNextQuoteNumber,
  saveQuoteToSupabase,
  insertClientsIfMissing,
  normalizeQuoteId,
  uploadLogoToStorage,
  saveAppSetting,
} from './supabase';
import {
  COMPANY_PROFILE_STORAGE_KEY,
  QUOTE_TEXTS_STORAGE_KEY,
  applyRemoteCompanyProfile,
  applyRemoteQuoteTexts,
} from './company';
import { RESPONSIBLES_STORAGE_KEY, DEFAULT_RESPONSIBLES, applyRemoteResponsibles } from './responsibles';
import { LOGO_LOCAL_STORAGE_KEY, applyRemoteLogo } from './logo';
import { SETTING_KEYS } from './remote-sync';

export const LOCAL_QUOTES_KEY = 'consentra_quotes_data';
export const LOCAL_CLIENTS_KEY = 'consentra_clients_data';
const SETTINGS_BACKUP_KEY = 'consentra_local_settings_backup';
const IMPORT_DONE_KEY = 'consentra_local_import_done';

const SETTINGS_KEYS_TO_BACKUP = [
  COMPANY_PROFILE_STORAGE_KEY,
  QUOTE_TEXTS_STORAGE_KEY,
  RESPONSIBLES_STORAGE_KEY,
  LOGO_LOCAL_STORAGE_KEY,
];

function isDone(): boolean {
  try {
    return Boolean(localStorage.getItem(IMPORT_DONE_KEY));
  } catch {
    return true;
  }
}

/** Guarda uma cópia das configurações locais antes de o servidor sobrescrevê-las. */
export function snapshotLocalSettingsOnce(): void {
  if (typeof window === 'undefined') return;
  try {
    if (isDone() || localStorage.getItem(SETTINGS_BACKUP_KEY) !== null) return;
    const backup: Record<string, string> = {};
    for (const key of SETTINGS_KEYS_TO_BACKUP) {
      const value = localStorage.getItem(key);
      if (value) backup[key] = value;
    }
    localStorage.setItem(SETTINGS_BACKUP_KEY, JSON.stringify(backup));
  } catch (err) {
    console.warn('Não foi possível copiar as configurações locais:', err);
  }
}

function readJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export interface PendingLocalSettings {
  companyProfile?: Record<string, unknown>;
  quoteTexts?: Record<string, unknown>;
  responsibles?: string[];
  logoDataUrl?: string;
}

export interface PendingLocalData {
  quotes: Quote[];
  clients: ClientData[];
  settings: PendingLocalSettings;
  settingsLabels: string[];
}

/** Dados locais ainda não importados (ou null se não houver nada). */
export function getPendingLocalData(): PendingLocalData | null {
  if (typeof window === 'undefined' || isDone()) return null;

  const quotesRaw = readJson<unknown>(localStorage.getItem(LOCAL_QUOTES_KEY));
  const clientsRaw = readJson<unknown>(localStorage.getItem(LOCAL_CLIENTS_KEY));
  const quotes = (Array.isArray(quotesRaw) ? quotesRaw : []).filter(
    (q): q is Quote => typeof q === 'object' && q !== null && 'numberOnly' in q && Array.isArray((q as Quote).items)
  );
  const clients = (Array.isArray(clientsRaw) ? clientsRaw : []).filter(
    (c): c is ClientData => typeof c === 'object' && c !== null && typeof (c as ClientData).id === 'string' && typeof (c as ClientData).name === 'string'
  );

  const backup = readJson<Record<string, string>>(localStorage.getItem(SETTINGS_BACKUP_KEY)) || {};
  const settings: PendingLocalSettings = {};
  const settingsLabels: string[] = [];

  const profile = readJson<Record<string, unknown>>(backup[COMPANY_PROFILE_STORAGE_KEY]);
  if (profile && typeof profile === 'object') {
    settings.companyProfile = profile;
    settingsLabels.push('Dados da empresa');
  }
  const texts = readJson<Record<string, unknown>>(backup[QUOTE_TEXTS_STORAGE_KEY]);
  if (texts && typeof texts === 'object') {
    settings.quoteTexts = texts;
    settingsLabels.push('Textos padrão do PDF');
  }
  const responsibles = readJson<string[]>(backup[RESPONSIBLES_STORAGE_KEY]);
  if (
    Array.isArray(responsibles) &&
    responsibles.length > 0 &&
    JSON.stringify(responsibles) !== JSON.stringify(DEFAULT_RESPONSIBLES)
  ) {
    settings.responsibles = responsibles.filter((n) => typeof n === 'string' && n.trim() !== '');
    settingsLabels.push('Lista de responsáveis');
  }
  const logo = backup[LOGO_LOCAL_STORAGE_KEY];
  if (typeof logo === 'string' && logo.startsWith('data:image/')) {
    settings.logoDataUrl = logo;
    settingsLabels.push('Logotipo');
  }

  if (quotes.length === 0 && clients.length === 0 && settingsLabels.length === 0) return null;
  return { quotes, clients, settings, settingsLabels };
}

/** Marca os dados locais como tratados (importados ou descartados). Não apaga nada. */
export function markLocalImportDone(): void {
  try {
    localStorage.setItem(IMPORT_DONE_KEY, new Date().toISOString());
  } catch {}
}

function dataUrlToFile(dataUrl: string): File | null {
  const match = /^data:([^;,]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  try {
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], 'logo', { type: match[1] });
  } catch {
    return null;
  }
}

function isSameQuote(a: Quote, b: Quote): boolean {
  return (
    (a.clientName || '').trim() === (b.clientName || '').trim() &&
    Math.abs((Number(a.total) || 0) - (Number(b.total) || 0)) < 0.005 &&
    (a.issueDate || '') === (b.issueDate || '')
  );
}

export interface LocalImportResult {
  quotesImported: number;
  quotesSkipped: number;
  renumbered: string[];
  clientsImported: number;
  settingsImported: string[];
  errors: string[];
}

/**
 * Envia os dados locais para o Supabase.
 * - Clientes: inseridos sem sobrescrever os já existentes no servidor.
 * - Orçamentos: se o número já existir no servidor com outro conteúdo, recebem
 *   um novo número da sequência (o mapeamento é informado no resultado).
 *   Orçamentos idênticos já importados são ignorados (é seguro repetir).
 * - Configurações: somente administradores (`includeSettings`).
 */
export async function importLocalData(includeSettings: boolean): Promise<LocalImportResult> {
  const result: LocalImportResult = {
    quotesImported: 0,
    quotesSkipped: 0,
    renumbered: [],
    clientsImported: 0,
    settingsImported: [],
    errors: [],
  };
  const pending = getPendingLocalData();
  if (!pending) return result;

  // 1. Clientes
  if (pending.clients.length > 0) {
    const res = await insertClientsIfMissing(pending.clients);
    if (res.success) result.clientsImported = res.data;
    else result.errors.push(`Clientes: ${res.error}`);
  }

  // 2. Orçamentos
  if (pending.quotes.length > 0) {
    const remote = await fetchQuotes();
    if (!remote.success) {
      result.errors.push(`Orçamentos: ${remote.error}`);
    } else {
      const byId = new Map(remote.data.map((q) => [q.id, q]));
      const usedNumbers = new Set(remote.data.map((q) => q.numberOnly));
      const sorted = [...pending.quotes].sort((a, b) => (a.numberOnly || 0) - (b.numberOnly || 0));

      for (const original of sorted) {
        let candidate: Quote = {
          ...original,
          id: normalizeQuoteId(original.id) || String(original.numberOnly),
          numberOnly: Number(original.numberOnly),
        };
        const existing = byId.get(candidate.id);
        if (existing && isSameQuote(existing, candidate)) {
          result.quotesSkipped++;
          continue;
        }
        const invalidNumber = !Number.isInteger(candidate.numberOnly) || candidate.numberOnly <= 0;
        if (existing || invalidNumber || usedNumbers.has(candidate.numberOnly)) {
          const next = await fetchNextQuoteNumber();
          if (!next.success) {
            result.errors.push(`Orçamento ${candidate.id}: ${next.error}`);
            continue;
          }
          result.renumbered.push(`${candidate.id} → ${next.data}`);
          candidate = { ...candidate, id: String(next.data), numberOnly: next.data };
        }
        const saved = await saveQuoteToSupabase(candidate);
        if (saved.success) {
          result.quotesImported++;
          byId.set(candidate.id, candidate);
          usedNumbers.add(candidate.numberOnly);
        } else {
          result.errors.push(`Orçamento ${candidate.id}: ${saved.error}`);
        }
      }
    }
  }

  // 3. Configurações (somente administradores — RLS bloqueia os demais)
  if (includeSettings) {
    const s = pending.settings;
    if (s.companyProfile) {
      const res = await saveAppSetting(SETTING_KEYS.companyProfile, s.companyProfile);
      if (res.success) {
        applyRemoteCompanyProfile(s.companyProfile);
        result.settingsImported.push('Dados da empresa');
      } else result.errors.push(`Dados da empresa: ${res.error}`);
    }
    if (s.quoteTexts) {
      const res = await saveAppSetting(SETTING_KEYS.quoteTexts, s.quoteTexts);
      if (res.success) {
        applyRemoteQuoteTexts(s.quoteTexts);
        result.settingsImported.push('Textos padrão do PDF');
      } else result.errors.push(`Textos do PDF: ${res.error}`);
    }
    if (s.responsibles) {
      const res = await saveAppSetting(SETTING_KEYS.responsibles, s.responsibles);
      if (res.success) {
        applyRemoteResponsibles(s.responsibles);
        result.settingsImported.push('Lista de responsáveis');
      } else result.errors.push(`Responsáveis: ${res.error}`);
    }
    if (s.logoDataUrl) {
      const file = dataUrlToFile(s.logoDataUrl);
      if (!file) {
        result.errors.push('Logotipo: arquivo local inválido.');
      } else {
        const up = await uploadLogoToStorage(file);
        if (!up.success) {
          result.errors.push(`Logotipo: ${up.error}`);
        } else {
          const res = await saveAppSetting(SETTING_KEYS.logo, up.data);
          if (res.success) {
            applyRemoteLogo(up.data);
            result.settingsImported.push('Logotipo');
          } else result.errors.push(`Logotipo: ${res.error}`);
        }
      }
    }
  }

  if (result.errors.length === 0) markLocalImportDone();
  return result;
}
