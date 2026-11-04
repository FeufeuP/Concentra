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
  importQuoteToSupabase,
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
const PROGRESS_KEY = 'consentra_local_import_progress_v2';

interface ImportProgress { quotes?: boolean; clients?: boolean; settings?: string[] }
function readProgress(): ImportProgress {
  return readJson<ImportProgress>(localStorage.getItem(PROGRESS_KEY)) || {};
}
function checkpoint(progress: ImportProgress): void {
  // Se não for possível guardar o progresso, não anuncia uma conclusão falsa.
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

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
  const progress = readProgress();
  const quotes = (Array.isArray(quotesRaw) && !progress.quotes ? quotesRaw : []).filter(
    (q): q is Quote => typeof q === 'object' && q !== null && 'numberOnly' in q && Array.isArray((q as Quote).items)
  );
  const clients = (Array.isArray(clientsRaw) && !progress.clients ? clientsRaw : []).filter(
    (c): c is ClientData => typeof c === 'object' && c !== null && typeof (c as ClientData).id === 'string' && typeof (c as ClientData).name === 'string'
  );

  const backup = readJson<Record<string, string>>(localStorage.getItem(SETTINGS_BACKUP_KEY)) || {};
  const settings: PendingLocalSettings = {};
  const settingsLabels: string[] = [];

  const profile = readJson<Record<string, unknown>>(backup[COMPANY_PROFILE_STORAGE_KEY]);
  if (profile && typeof profile === 'object' && !progress.settings?.includes(SETTING_KEYS.companyProfile)) {
    settings.companyProfile = profile;
    settingsLabels.push('Dados da empresa');
  }
  const texts = readJson<Record<string, unknown>>(backup[QUOTE_TEXTS_STORAGE_KEY]);
  if (texts && typeof texts === 'object' && !progress.settings?.includes(SETTING_KEYS.quoteTexts)) {
    settings.quoteTexts = texts;
    settingsLabels.push('Textos padrão do PDF');
  }
  const responsibles = readJson<string[]>(backup[RESPONSIBLES_STORAGE_KEY]);
  if (
    !progress.settings?.includes(SETTING_KEYS.responsibles) &&
    Array.isArray(responsibles) &&
    responsibles.length > 0 &&
    JSON.stringify(responsibles) !== JSON.stringify(DEFAULT_RESPONSIBLES)
  ) {
    settings.responsibles = responsibles.filter((n) => typeof n === 'string' && n.trim() !== '');
    settingsLabels.push('Lista de responsáveis');
  }
  const logo = backup[LOGO_LOCAL_STORAGE_KEY];
  if (typeof logo === 'string' && logo.startsWith('data:image/') && !progress.settings?.includes(SETTING_KEYS.logo)) {
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
 *   Recibos no servidor impedem duplicações, mesmo após falha de rede ou nova sessão.
 * - Configurações: somente administradores (`includeSettings`).
 */
// Coalesce cliques simultâneos nesta aba; o RPC também serializa abas concorrentes.
let activeImport: Promise<LocalImportResult> | null = null;
export function importLocalData(includeSettings: boolean): Promise<LocalImportResult> {
  if (activeImport) return activeImport;
  activeImport = runImport(includeSettings).finally(() => { activeImport = null; });
  return activeImport;
}

async function runImport(includeSettings: boolean): Promise<LocalImportResult> {
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
  const progress = readProgress();
  progress.settings ||= [];
  const completeSetting = (key: string) => {
    if (!progress.settings!.includes(key)) progress.settings!.push(key);
    checkpoint(progress);
  };

  try {
    // 1. Clientes
    if (pending.clients.length > 0) {
      const res = await insertClientsIfMissing(pending.clients);
      if (res.success) {
        result.clientsImported = res.data;
        progress.clients = true;
        checkpoint(progress);
      }
      else result.errors.push(`Clientes: ${res.error}`);
    }

    // 2. Orçamentos: recibo persistente no servidor, não inferências por valor/data.
    let quoteErrors = false;
    for (const original of [...pending.quotes].sort((a, b) => a.numberOnly - b.numberOnly)) {
      const candidate = { ...original, id: normalizeQuoteId(original.id) || String(original.numberOnly) };
      const res = await importQuoteToSupabase(candidate);
      if (!res.success) {
        quoteErrors = true;
        result.errors.push(`Orçamento ${candidate.id}: ${res.error}`);
        continue;
      }
      if (res.data.skipped) result.quotesSkipped++;
      else result.quotesImported++;
      if (res.data.id !== candidate.id) result.renumbered.push(`${candidate.id} → ${res.data.numberOnly}`);
    }
    if (!quoteErrors) {
      progress.quotes = true;
      checkpoint(progress);
    }

    // 3. Configurações (somente administradores — RLS bloqueia os demais)
    if (includeSettings) {
      const s = pending.settings;
      if (s.companyProfile) {
        const res = await saveAppSetting(SETTING_KEYS.companyProfile, s.companyProfile);
        if (res.success) {
          completeSetting(SETTING_KEYS.companyProfile);
          applyRemoteCompanyProfile(s.companyProfile);
          result.settingsImported.push('Dados da empresa');
        } else result.errors.push(`Dados da empresa: ${res.error}`);
      }
      if (s.quoteTexts) {
        const res = await saveAppSetting(SETTING_KEYS.quoteTexts, s.quoteTexts);
        if (res.success) {
          completeSetting(SETTING_KEYS.quoteTexts);
          applyRemoteQuoteTexts(s.quoteTexts);
          result.settingsImported.push('Textos padrão do PDF');
        } else result.errors.push(`Textos do PDF: ${res.error}`);
      }
      if (s.responsibles) {
        const res = await saveAppSetting(SETTING_KEYS.responsibles, s.responsibles);
        if (res.success) {
          completeSetting(SETTING_KEYS.responsibles);
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
              completeSetting(SETTING_KEYS.logo);
              applyRemoteLogo(up.data);
              result.settingsImported.push('Logotipo');
            } else result.errors.push(`Logotipo: ${res.error}`);
          }
        }
      }
    }

    // Uma importação sem privilégios não trata configurações como importadas.
    if (result.errors.length === 0 && !getPendingLocalData()) markLocalImportDone();
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'Não foi possível guardar o progresso da importação.');
  }
  return result;
}
