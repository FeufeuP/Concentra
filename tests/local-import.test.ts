import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installBrowserGlobals, uninstallBrowserGlobals, makeQuote, MemoryStorage } from './helpers';
import { getPendingLocalData, markLocalImportDone, snapshotLocalSettingsOnce, LOCAL_QUOTES_KEY, LOCAL_CLIENTS_KEY } from '@/lib/local-import';
import { sanitizeResponsibles, getStoredResponsibles, applyRemoteResponsibles, DEFAULT_RESPONSIBLES, RESPONSIBLES_STORAGE_KEY } from '@/lib/responsibles';

let storage: MemoryStorage;

beforeEach(() => {
  storage = installBrowserGlobals();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  uninstallBrowserGlobals();
  vi.restoreAllMocks();
});

describe('importação de dados locais', () => {
  it('sem dados no navegador → nada pendente', () => {
    expect(getPendingLocalData()).toBeNull();
  });

  it('detecta orçamentos e clientes válidos e descarta lixo', () => {
    storage.setItem(LOCAL_QUOTES_KEY, JSON.stringify([makeQuote(), { foo: 1 }, null]));
    storage.setItem(LOCAL_CLIENTS_KEY, JSON.stringify([{ id: 'c1', name: 'Cliente' }, { id: 2 }]));
    const pending = getPendingLocalData();
    expect(pending?.quotes).toHaveLength(1);
    expect(pending?.clients).toHaveLength(1);
  });

  it('inclui configurações do backup, exceto a lista padrão de responsáveis', () => {
    storage.setItem(RESPONSIBLES_STORAGE_KEY, JSON.stringify(DEFAULT_RESPONSIBLES));
    snapshotLocalSettingsOnce();
    expect(getPendingLocalData()).toBeNull();
  });

  it('lista de responsáveis personalizada aparece como configuração pendente', () => {
    storage.setItem(RESPONSIBLES_STORAGE_KEY, JSON.stringify(['Washington Assis', 'Nova Pessoa']));
    snapshotLocalSettingsOnce();
    const pending = getPendingLocalData();
    expect(pending?.settingsLabels).toContain('Lista de responsáveis');
    expect(pending?.settings.responsibles).toEqual(['Washington Assis', 'Nova Pessoa']);
  });

  it('depois de marcar como concluído, não oferece mais a importação', () => {
    storage.setItem(LOCAL_QUOTES_KEY, JSON.stringify([makeQuote()]));
    markLocalImportDone();
    expect(getPendingLocalData()).toBeNull();
  });
});

describe('responsáveis', () => {
  it('sanitizeResponsibles remove vazios, duplicados e nomes removidos', () => {
    expect(sanitizeResponsibles([' Ana ', 'Ana', '', 'Carlos Eduardo', 42, 'Bruno'])).toEqual(['Ana', 'Bruno']);
    expect(sanitizeResponsibles('x')).toEqual([]);
  });

  it('getStoredResponsibles garante o responsável principal', () => {
    storage.setItem(RESPONSIBLES_STORAGE_KEY, JSON.stringify(['Ana']));
    expect(getStoredResponsibles()).toEqual(['Washington Assis', 'Ana']);
  });

  it('applyRemoteResponsibles substitui o cache e avisa a interface', () => {
    const listener = vi.fn();
    (globalThis as unknown as { window: EventTarget }).window.addEventListener('consentra_responsibles_updated', listener);
    applyRemoteResponsibles(['Washington Assis', 'Carlos Eduardo', 'Bia']);
    expect(JSON.parse(storage.getItem(RESPONSIBLES_STORAGE_KEY) as string)).toEqual(['Washington Assis', 'Bia']);
    expect(listener).toHaveBeenCalledOnce();

    applyRemoteResponsibles([]);
    expect(storage.getItem(RESPONSIBLES_STORAGE_KEY)).toBeNull();
    expect(getStoredResponsibles()).toEqual(DEFAULT_RESPONSIBLES);
  });
});

describe('responsibleFilterOptions', () => {
  it('une cadastrados e nomes dos orçamentos, sem duplicar', async () => {
    const { responsibleFilterOptions } = await import('@/lib/responsibles');
    expect(
      responsibleFilterOptions(['Washington Assis', 'Ana'], [{ responsibleTech: 'Zeca' }, { responsibleTech: 'Ana' }, { responsibleTech: 'Bia' }, {}])
    ).toEqual(['Washington Assis', 'Ana', 'Bia', 'Zeca']);
  });
});
