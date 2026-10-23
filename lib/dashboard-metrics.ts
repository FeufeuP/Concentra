import type { Quote } from './types';

/** Filtros em cascata do dashboard ('all' = sem filtro). */
export interface DashboardFilters {
  macroCategory: string;
  subCategory: string;
  status: string;
  responsibleTech: string;
  priority: string;
}

export const EMPTY_DASHBOARD_FILTERS: DashboardFilters = {
  macroCategory: 'all',
  subCategory: 'all',
  status: 'all',
  responsibleTech: 'all',
  priority: 'all',
};

export function filterQuotes(quotes: Quote[], f: DashboardFilters): Quote[] {
  return quotes.filter((q) => {
    if (f.status !== 'all' && q.status !== f.status) return false;
    if (f.macroCategory !== 'all' && q.macroCategory !== f.macroCategory) return false;
    if (f.subCategory !== 'all' && q.subCategory !== f.subCategory) return false;
    if (f.responsibleTech !== 'all' && q.responsibleTech !== f.responsibleTech) return false;
    if (f.priority !== 'all' && q.priority !== f.priority) return false;
    return true;
  });
}

export function countActiveFilters(f: DashboardFilters): number {
  return (Object.keys(f) as (keyof DashboardFilters)[]).filter((k) => f[k] !== 'all').length;
}

export function sumTotals(quotes: Pick<Quote, 'total'>[]): number {
  return quotes.reduce((acc, q) => acc + (Number(q.total) || 0), 0);
}

/** Percentual com 1 casa decimal ("0.0" quando o total é zero). */
export function percent(part: number, whole: number): string {
  return whole > 0 ? ((part / whole) * 100).toFixed(1) : '0.0';
}

const isPending = (q: Quote) => q.status === 'Aguardando Retorno' || q.status === 'Enviado';

export interface DashboardKpis {
  totalAll: number;
  totalFiltered: number;
  approvedCount: number;
  totalApproved: number;
  pendingCount: number;
  totalPending: number;
  rejectedCount: number;
  conversionRate: string;
  lossRate: string;
}

export function computeKpis(all: Quote[], filtered: Quote[]): DashboardKpis {
  const approved = filtered.filter((q) => q.status === 'Aprovado');
  const pending = filtered.filter(isPending);
  const rejected = filtered.filter((q) => q.status === 'Reprovado');
  return {
    totalAll: sumTotals(all),
    totalFiltered: sumTotals(filtered),
    approvedCount: approved.length,
    totalApproved: sumTotals(approved),
    pendingCount: pending.length,
    totalPending: sumTotals(pending),
    rejectedCount: rejected.length,
    conversionRate: percent(approved.length, filtered.length),
    lossRate: percent(rejected.length, filtered.length),
  };
}

/** Quantidade e valor por status (pipeline). `pct` = participação no valor total. */
export function statusBreakdown<T extends { status: string }>(quotes: Quote[], statusList: T[]) {
  const total = sumTotals(quotes);
  return statusList.map((def) => {
    const matched = quotes.filter((q) => q.status === def.status);
    const sum = sumTotals(matched);
    return { ...def, count: matched.length, sum, pct: total > 0 ? ((sum / total) * 100).toFixed(1) : '0' };
  });
}

export const DEFAULT_MACRO_CATEGORY = 'Programas e Laudos Regulamentares';

/** Mix de serviços: quantidade/valor por macro categoria, ordenado pelo valor. */
export function serviceMix(quotes: Quote[], macros: { name: string; color?: string }[]) {
  const total = sumTotals(quotes);
  const counts = new Map<string, { count: number; total: number; color: string }>();
  macros.forEach((m) => counts.set(m.name, { count: 0, total: 0, color: m.color || '#004328' }));
  quotes.forEach((q) => {
    const cat = q.macroCategory || DEFAULT_MACRO_CATEGORY;
    const entry = counts.get(cat) ?? { count: 0, total: 0, color: '#004328' };
    entry.count += 1;
    entry.total += Number(q.total) || 0;
    counts.set(cat, entry);
  });
  return Array.from(counts.entries())
    .map(([name, d]) => ({ name, count: d.count, total: d.total, color: d.color, pct: total > 0 ? ((d.total / total) * 100).toFixed(1) : '0' }))
    .sort((a, b) => b.total - a.total);
}

export function pendingQuotes(quotes: Quote[]): Quote[] {
  return quotes.filter(isPending);
}
