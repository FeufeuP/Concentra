import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { installBrowserGlobals, uninstallBrowserGlobals, type MemoryStorage } from './helpers';
import { saveAppSetting } from '@/lib/supabase';
import { pushSetting, flushPendingSettings, SETTING_KEYS } from '@/lib/remote-sync';
import { saveStoredCompanyProfile, saveStoredQuoteTexts, getStoredCompanyProfile, COMPANY_PROFILE_STORAGE_KEY } from '@/lib/company';
import { saveStoredResponsibles, RESPONSIBLES_STORAGE_KEY } from '@/lib/responsibles';
import { saveStoredLogoUrl, LOGO_LOCAL_STORAGE_KEY } from '@/lib/logo';

vi.mock('@/lib/supabase', async (original) => ({
  ...await original<typeof import('@/lib/supabase')>(), isSupabaseConfigured: () => true, saveAppSetting: vi.fn(),
}));
let storage: MemoryStorage;
beforeEach(() => { storage = installBrowserGlobals(); vi.mocked(saveAppSetting).mockResolvedValue({ success: true }); });
afterEach(async () => { await flushPendingSettings(); vi.resetAllMocks(); uninstallBrowserGlobals(); });

describe('configurações confirmadas pelo servidor', () => {
  it('cache e evento só mudam depois da confirmação do banco', async () => {
    let resolve!: (res: { success: boolean }) => void;
    vi.mocked(saveAppSetting).mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const listener = vi.fn();
    window.addEventListener('consentra_company_profile_updated', listener);
    const saving = saveStoredCompanyProfile({ name: 'Confirmed company' });
    await vi.waitFor(() => expect(saveAppSetting).toHaveBeenCalledOnce());
    expect(storage.getItem(COMPANY_PROFILE_STORAGE_KEY)).toBeNull();
    expect(listener).not.toHaveBeenCalled();
    resolve({ success: true });
    await saving;
    expect(getStoredCompanyProfile().name).toBe('Confirmed company');
    expect(listener).toHaveBeenCalledOnce();
  });
  it('rejeição preserva cache anterior; nova tentativa funciona e a fila não fica envenenada', async () => {
    storage.setItem(COMPANY_PROFILE_STORAGE_KEY, JSON.stringify({ name: 'Previous company' }));
    vi.mocked(saveAppSetting).mockResolvedValueOnce({ success: false, error: 'Sem permissão' });
    await expect(saveStoredCompanyProfile({ name: 'Forbidden' })).rejects.toThrow('Sem permissão');
    expect(getStoredCompanyProfile().name).toBe('Previous company');
    await saveStoredCompanyProfile({ name: 'Retry succeeded' });
    expect(getStoredCompanyProfile().name).toBe('Retry succeeded');
  });
  it('uma falha passada não impede a releitura do servidor', async () => {
    vi.mocked(saveAppSetting).mockResolvedValueOnce({ success: false, error: 'offline' });
    await expect(pushSetting(SETTING_KEYS.quoteTexts, {})).rejects.toThrow('offline');
    await expect(flushPendingSettings()).resolves.toBeUndefined();
  });
  it('responsáveis e logo também mantêm o cache intacto quando a gravação falha', async () => {
    vi.mocked(saveAppSetting).mockResolvedValue({ success: false, error: 'offline' });
    await expect(saveStoredResponsibles(['Synthetic'])).rejects.toThrow('offline');
    await expect(saveStoredLogoUrl('https://test.invalid/logo.png')).rejects.toThrow('offline');
    expect(storage.getItem(RESPONSIBLES_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(LOGO_LOCAL_STORAGE_KEY)).toBeNull();
    await expect(saveStoredQuoteTexts({ documentTitle: 'Synthetic' })).rejects.toThrow('offline');
  });
  it('serializa alterações na mesma chave e permite chaves diferentes em paralelo', async () => {
    const order: string[] = [];
    vi.mocked(saveAppSetting).mockImplementation(async (key, value) => { order.push(`${key}:${value}`); return { success: true }; });
    await Promise.all([pushSetting(SETTING_KEYS.logo, 'one'), pushSetting(SETTING_KEYS.logo, 'two'), pushSetting(SETTING_KEYS.quoteTexts, 'other')]);
    expect(order.indexOf('logo_url:one')).toBeLessThan(order.indexOf('logo_url:two'));
  });
});
