import { describe, it, expect } from 'vitest';
import { filterCatalog, sortCatalog, serviceRecencyValue } from '@/lib/catalog-search';
import type { CatalogService } from '@/lib/types';

const svc = (over: Partial<CatalogService>): CatalogService => ({
  id: 'x',
  title: 'Serviço',
  description: 'Descrição',
  unit: 'Unidade',
  suggestedPrice: 100,
  nrCategory: 'NR-01',
  ...over,
});

describe('sortCatalog', () => {
  it("'recent' ordena pelo updatedAt mais novo (serviço salvo aparece primeiro)", () => {
    const list = [
      svc({ id: 'a', code: '#SRV-01', updatedAt: '2026-10-01T00:00:00Z' }),
      svc({ id: 'b', code: '#SRV-02', updatedAt: '2026-10-20T00:00:00Z' }),
      svc({ id: 'c', code: '#SRV-03', createdAt: '2026-10-10T00:00:00Z' }),
    ];
    expect(sortCatalog(list, 'recent').map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it("'recent' sem datas usa o número do código (cadastro mais novo primeiro)", () => {
    const list = [svc({ id: 'pgr-01', code: '#SRV-01' }), svc({ id: 'novo', code: '#SRV-13' }), svc({ id: 'ltcat', code: '#SRV-03' })];
    expect(sortCatalog(list, 'recent').map((s) => s.id)).toEqual(['novo', 'ltcat', 'pgr-01']);
  });

  it("'recent' reconhece ids gerados pelo app (srv-<timestamp>)", () => {
    const novo = svc({ id: 'srv-1792750712000', code: '#SRV-13' });
    const antigo = svc({ id: 'srv-1700000000000', code: '#SRV-13' });
    expect(serviceRecencyValue(novo)).toBeGreaterThan(serviceRecencyValue(antigo));
  });

  it('ordena por preço, código (numérico) e nome', () => {
    const list = [
      svc({ id: '1', code: '#SRV-10', title: 'Beta', suggestedPrice: 300 }),
      svc({ id: '2', code: '#SRV-02', title: 'Alfa', suggestedPrice: 100 }),
      svc({ id: '3', code: '#SRV-01', title: 'Gama', suggestedPrice: 200 }),
    ];
    expect(sortCatalog(list, 'price-asc').map((s) => s.id)).toEqual(['2', '3', '1']);
    expect(sortCatalog(list, 'price-desc').map((s) => s.id)).toEqual(['1', '3', '2']);
    expect(sortCatalog(list, 'code').map((s) => s.id)).toEqual(['3', '2', '1']);
    expect(sortCatalog(list, 'name').map((s) => s.id)).toEqual(['2', '1', '3']);
  });

  it('não altera a lista original', () => {
    const list = [svc({ id: '1', suggestedPrice: 2 }), svc({ id: '2', suggestedPrice: 1 })];
    sortCatalog(list, 'price-asc');
    expect(list.map((s) => s.id)).toEqual(['1', '2']);
  });
});

describe('filterCatalog', () => {
  it('busca por título, NR, código e categoria sem diferenciar maiúsculas', () => {
    const list = [
      svc({ id: '1', title: 'PGR Completo', code: '#SRV-01', nrCategory: 'NR-01', category: 'Programas NR' }),
      svc({ id: '2', title: 'Treinamento NR-35', code: '#SRV-04', nrCategory: 'NR-35', category: 'Treinamentos' }),
    ];
    expect(filterCatalog(list, 'pgr').map((s) => s.id)).toEqual(['1']);
    expect(filterCatalog(list, 'nr-35').map((s) => s.id)).toEqual(['2']);
    expect(filterCatalog(list, '#srv-04').map((s) => s.id)).toEqual(['2']);
    expect(filterCatalog(list, '  ').map((s) => s.id)).toEqual(['1', '2']);
  });
});
