import { describe, it, expect } from 'vitest';
import { filterQuotes, countActiveFilters, computeKpis, statusBreakdown, serviceMix, percent, EMPTY_DASHBOARD_FILTERS } from '@/lib/dashboard-metrics';
import { filterCatalog } from '@/lib/catalog-search';
import { CATALOG_SERVICES } from '@/lib/mock-data';
import { makeQuote } from './helpers';

const quotes = [
  makeQuote({ id: '1', status: 'Aprovado', total: 1000, macroCategory: 'A', responsibleTech: 'Ana' }),
  makeQuote({ id: '2', status: 'Enviado', total: 500, macroCategory: 'B' }),
  makeQuote({ id: '3', status: 'Reprovado', total: 300, macroCategory: 'A' }),
  makeQuote({ id: '4', status: 'Aguardando Retorno', total: 200 }),
];

describe('dashboard', () => {
  it('filtra e conta filtros ativos', () => {
    expect(filterQuotes(quotes, EMPTY_DASHBOARD_FILTERS)).toHaveLength(4);
    const f = { ...EMPTY_DASHBOARD_FILTERS, macroCategory: 'A', responsibleTech: 'Ana' };
    expect(filterQuotes(quotes, f).map((q) => q.id)).toEqual(['1']);
    expect(countActiveFilters(f)).toBe(2);
  });

  it('calcula KPIs, conversão e perda', () => {
    const k = computeKpis(quotes, quotes);
    expect(k).toMatchObject({
      totalAll: 2000,
      totalApproved: 1000,
      pendingCount: 2,
      totalPending: 700,
      approvedCount: 1,
      rejectedCount: 1,
      conversionRate: '25.0',
      lossRate: '25.0',
    });
    expect(computeKpis([], []).conversionRate).toBe('0.0');
    expect(percent(1, 3)).toBe('33.3');
  });

  it('agrupa por status e por macro categoria', () => {
    const st = statusBreakdown(quotes, [{ status: 'Aprovado' }, { status: 'Rascunho' }]);
    expect(st[0]).toMatchObject({ count: 1, sum: 1000, pct: '50.0' });
    expect(st[1]).toMatchObject({ count: 0, sum: 0 });

    const mix = serviceMix(quotes, [{ name: 'A', color: '#111' }, { name: 'C' }]);
    expect(mix[0]).toMatchObject({ name: 'A', count: 2, total: 1300, color: '#111' });
    expect(mix.find((m) => m.name === 'Programas e Laudos Regulamentares')?.total).toBe(200);
    expect(mix.find((m) => m.name === 'C')?.count).toBe(0);
  });
});

describe('busca no catálogo', () => {
  it('encontra por título/NR sem diferenciar maiúsculas e devolve tudo com busca vazia', () => {
    expect(filterCatalog(CATALOG_SERVICES, '   ')).toHaveLength(CATALOG_SERVICES.length);
    const nr = CATALOG_SERVICES[0].nrCategory;
    expect(filterCatalog(CATALOG_SERVICES, nr.toLowerCase()).length).toBeGreaterThan(0);
    expect(filterCatalog(CATALOG_SERVICES, 'zzz-inexistente')).toEqual([]);
  });
});
