import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installBrowserGlobals, uninstallBrowserGlobals, makeQuote, type MemoryStorage } from './helpers';
import { COMPANY_PROFILE_STORAGE_KEY, QUOTE_TEXTS_STORAGE_KEY } from '@/lib/company';
import { getPendingLocalData, importLocalData, snapshotLocalSettingsOnce, LOCAL_QUOTES_KEY, LOCAL_CLIENTS_KEY } from '@/lib/local-import';
import { importQuoteToSupabase, saveAppSetting, insertClientsIfMissing } from '@/lib/supabase';

vi.mock('@/lib/supabase', async (original) => ({
  ...await original<typeof import('@/lib/supabase')>(),
  importQuoteToSupabase: vi.fn(), saveAppSetting: vi.fn(), insertClientsIfMissing: vi.fn(),
}));
let storage: MemoryStorage;
beforeEach(() => {
  storage = installBrowserGlobals();
  vi.mocked(importQuoteToSupabase).mockResolvedValue({ success: true, data: { id: '900', numberOnly: 900, skipped: false } });
  vi.mocked(saveAppSetting).mockResolvedValue({ success: true });
  vi.mocked(insertClientsIfMissing).mockResolvedValue({ success: true, data: 1 });
  storage.setItem(LOCAL_QUOTES_KEY, JSON.stringify([makeQuote()]));
  storage.setItem(LOCAL_CLIENTS_KEY, JSON.stringify([{ id: 'source-client', name: 'Synthetic client' }]));
  storage.setItem(COMPANY_PROFILE_STORAGE_KEY, JSON.stringify({ name: 'Synthetic source company' }));
  storage.setItem(QUOTE_TEXTS_STORAGE_KEY, JSON.stringify({ documentTitle: 'Synthetic source title' }));
  snapshotLocalSettingsOnce();
});
afterEach(() => { vi.resetAllMocks(); vi.restoreAllMocks(); uninstallBrowserGlobals(); });

describe('execução e retomada da importação', () => {
  it('falha parcial não repete categorias já concluídas e não reenvia configuração confirmada', async () => {
    vi.mocked(saveAppSetting).mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false, error: 'offline' });
    const first = await importLocalData(true);
    expect(first.errors).toHaveLength(1);
    expect(getPendingLocalData()).toMatchObject({ quotes: [], clients: [], settingsLabels: ['Textos padrão do PDF'] });
    const second = await importLocalData(true);
    expect(second.errors).toEqual([]);
    expect(importQuoteToSupabase).toHaveBeenCalledOnce();
    expect(insertClientsIfMissing).toHaveBeenCalledOnce();
    expect(saveAppSetting).toHaveBeenCalledTimes(3);
    expect(getPendingLocalData()).toBeNull();
    // Originais preservados, mesmo quando a importação terminou.
    expect(JSON.parse(storage.getItem(LOCAL_QUOTES_KEY)!)).toHaveLength(1);
  });
  it('não administrador importa dados de trabalho, mas mantém configurações pendentes para o administrador', async () => {
    const result = await importLocalData(false);
    expect(result.errors).toEqual([]);
    expect(result.settingsImported).toEqual([]);
    expect(saveAppSetting).not.toHaveBeenCalled();
    expect(getPendingLocalData()).toMatchObject({ quotes: [], clients: [], settingsLabels: ['Dados da empresa', 'Textos padrão do PDF'] });
    await importLocalData(true);
    expect(getPendingLocalData()).toBeNull();
    expect(importQuoteToSupabase).toHaveBeenCalledOnce();
  });
  it('retomada em uma nova instância mantém o progresso persistido', async () => {
    await importLocalData(false);
    vi.resetModules();
    const resumed = await import('@/lib/local-import');
    expect(resumed.getPendingLocalData()).toMatchObject({ quotes: [], clients: [], settingsLabels: ['Dados da empresa', 'Textos padrão do PDF'] });
  });
  it('cliques concorrentes compartilham a mesma execução', async () => {
    const first = importLocalData(true);
    const second = importLocalData(true);
    expect(second).toBe(first);
    await first;
    expect(importQuoteToSupabase).toHaveBeenCalledOnce();
  });
  it('ACK perdido na importação deixa o documento pendente; RPC idempotente confirma o recibo na repetição', async () => {
    vi.mocked(importQuoteToSupabase).mockResolvedValueOnce({ success: false, error: 'Resposta perdida' });
    expect((await importLocalData(true)).errors).toHaveLength(1);
    expect(getPendingLocalData()?.quotes).toHaveLength(1);
    vi.mocked(importQuoteToSupabase).mockResolvedValue({ success: true, data: { id: '900', numberOnly: 900, skipped: true } });
    const retry = await importLocalData(true);
    expect(retry.quotesImported).toBe(0);
    expect(retry.quotesSkipped).toBe(1);
    expect(getPendingLocalData()).toBeNull();
  });
  it('falha ao guardar progresso não anuncia conclusão nem esconde os originais', async () => {
    const set = storage.setItem.bind(storage);
    vi.spyOn(storage, 'setItem').mockImplementation((key, value) => {
      if (key === 'consentra_local_import_progress_v2') throw new Error('Armazenamento cheio');
      set(key, value);
    });
    const result = await importLocalData(true);
    expect(result.errors).toContain('Armazenamento cheio');
    expect(getPendingLocalData()?.quotes).toHaveLength(1);
  });
});
