import { describe, it, expect, vi } from 'vitest';
import { createLocalRepository, LOCAL_CATALOG_KEY, nextProvisionalNumber, resolveLocalQuoteNumber, QUOTE_NUMBER_BASE } from '@/lib/repository';
import { LOCAL_QUOTES_KEY, LOCAL_CLIENTS_KEY } from '@/lib/local-import';
import { CATALOG_SERVICES } from '@/lib/mock-data';
import type { ClientData } from '@/lib/types';
import { MemoryStorage, makeQuote } from './helpers';

const client: ClientData = {
  id: 'cli-1',
  name: 'Indústria Teste',
  cnpj: '12.345.678/0001-90',
  contactName: 'Ana',
  email: 'ana@teste.com',
  phone: '(41) 3333-4444',
  address: 'Rua A, 1',
  riskGrade: 'Grau de Risco 3',
} as ClientData;

describe('numeração', () => {
  it('começa em 319 e segue maior + 1', () => {
    expect(QUOTE_NUMBER_BASE + 1).toBe(319);
    expect(nextProvisionalNumber([])).toBe(319);
    expect(nextProvisionalNumber([{ numberOnly: 319 }, { numberOnly: 325 }, { numberOnly: 320 }])).toBe(326);
  });

  it('modo local mantém o número do rascunho se estiver livre', () => {
    expect(resolveLocalQuoteNumber({ id: '330', numberOnly: 330 }, [{ numberOnly: 319 }])).toEqual({ id: '330', numberOnly: 330 });
  });

  it('modo local renumera se o número já existe ou é o placeholder', () => {
    expect(resolveLocalQuoteNumber({ id: '319', numberOnly: 319 }, [{ numberOnly: 319 }, { numberOnly: 320 }])).toEqual({ id: '321', numberOnly: 321 });
    expect(resolveLocalQuoteNumber({ id: '001', numberOnly: 1 }, [])).toEqual({ id: '319', numberOnly: 319 });
  });
});

describe('repositório local', () => {
  it('carrega os dados padrão quando o navegador está vazio', async () => {
    const repo = createLocalRepository(new MemoryStorage());
    const res = await repo.loadAll();
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.quotes).toEqual([]);
    expect(res.data.clients).toEqual([]);
    expect(res.data.catalog).toEqual(CATALOG_SERVICES);
  });

  it('ignora JSON inválido no armazenamento', async () => {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_QUOTES_KEY, '{quebrado');
    const res = await createLocalRepository(storage).loadAll();
    expect(res.success && res.data.quotes).toEqual([]);
  });

  it('salva, atualiza e exclui orçamentos', async () => {
    const storage = new MemoryStorage();
    const repo = createLocalRepository(storage);
    await repo.saveQuote(makeQuote({ id: '319', numberOnly: 319 }));
    await repo.saveQuote(makeQuote({ id: '320', numberOnly: 320 }));
    await repo.saveQuote(makeQuote({ id: '319', numberOnly: 319, status: 'Aprovado' }));

    let stored = JSON.parse(storage.getItem(LOCAL_QUOTES_KEY) as string);
    expect(stored.map((q: { id: string }) => q.id)).toEqual(['320', '319']);
    expect(stored.find((q: { id: string }) => q.id === '319').status).toBe('Aprovado');

    await repo.deleteQuote('320');
    stored = JSON.parse(storage.getItem(LOCAL_QUOTES_KEY) as string);
    expect(stored.map((q: { id: string }) => q.id)).toEqual(['319']);
  });

  it('zera orçamentos e informa quantos foram removidos', async () => {
    const storage = new MemoryStorage();
    const repo = createLocalRepository(storage);
    await repo.saveQuote(makeQuote({ id: '319', numberOnly: 319 }));
    await repo.saveQuote(makeQuote({ id: '320', numberOnly: 320 }));
    const res = await repo.clearAllQuotes('ZERAR');
    expect(res).toEqual({ success: true, data: 2 });
    expect(JSON.parse(storage.getItem(LOCAL_QUOTES_KEY) as string)).toEqual([]);
  });

  it('gerencia clientes e catálogo', async () => {
    const storage = new MemoryStorage();
    const repo = createLocalRepository(storage);
    await repo.saveClient(client);
    await repo.saveClient({ ...client, name: 'Indústria Renomeada' });
    let clients = JSON.parse(storage.getItem(LOCAL_CLIENTS_KEY) as string);
    expect(clients).toHaveLength(1);
    expect(clients[0].name).toBe('Indústria Renomeada');
    await repo.deleteClient('cli-1');
    clients = JSON.parse(storage.getItem(LOCAL_CLIENTS_KEY) as string);
    expect(clients).toEqual([]);

    const first = CATALOG_SERVICES[0];
    await repo.saveService({ ...first, suggestedPrice: 1234 });
    await repo.saveService({ ...first, id: 'srv-novo', title: 'Novo' });
    const catalog = JSON.parse(storage.getItem(LOCAL_CATALOG_KEY) as string);
    expect(catalog[0].id).toBe('srv-novo');
    expect(catalog.find((s: { id: string }) => s.id === first.id).suggestedPrice).toBe(1234);
    await repo.deleteService('srv-novo');
    expect(JSON.parse(storage.getItem(LOCAL_CATALOG_KEY) as string)).toHaveLength(CATALOG_SERVICES.length);
  });

  it('allocateQuoteNumber usa a regra local', async () => {
    const repo = createLocalRepository(new MemoryStorage());
    const res = await repo.allocateQuoteNumber(makeQuote({ id: '319', numberOnly: 319 }), [makeQuote({ id: '319', numberOnly: 319 })]);
    expect(res).toEqual({ success: true, data: { id: '320', numberOnly: 320 } });
  });

  it('informa falha quando o armazenamento está cheio', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const res = await createLocalRepository(storage).saveQuote(makeQuote());
    expect(res.success).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
