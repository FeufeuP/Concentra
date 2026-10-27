import type { CatalogService } from './types';

/** Busca no catálogo por título, descrição, NR, código ou categoria (sem diferenciar maiúsculas). */
export function filterCatalog(services: CatalogService[], query: string): CatalogService[] {
  const q = query.trim().toLowerCase();
  if (!q) return services;
  return services.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.nrCategory.toLowerCase().includes(q) ||
      (s.code?.toLowerCase().includes(q) ?? false) ||
      (s.category?.toLowerCase().includes(q) ?? false)
  );
}

export type ServiceSortBy = 'recent' | 'price-asc' | 'price-desc' | 'code' | 'name';

/**
 * "Recente" de verdade: maior updatedAt/createdAt primeiro.
 * Registros antigos sem datas (carga inicial / modo local anterior) usam, como
 * aproximação da ordem de cadastro, o número do código (#SRV-13 > #SRV-02) e,
 * por fim, o timestamp embutido em ids gerados pelo app (`srv-<epoch>`).
 * Antes, "Mais Recentes" não ordenava nada e um serviço recém-cadastrado
 * "sumia" no fim da paginação após recarregar a página.
 */
export function serviceRecencyValue(s: CatalogService): number {
  for (const raw of [s.updatedAt, s.createdAt]) {
    if (raw) {
      const t = Date.parse(raw);
      if (Number.isFinite(t)) return t;
    }
  }
  const fromId = /^srv-(\d{10,})$/.exec(s.id);
  if (fromId) return Number(fromId[1]);
  const codeNum = parseInt(String(s.code || '').replace(/\D/g, ''), 10);
  return Number.isFinite(codeNum) ? codeNum : 0;
}

/** Ordena uma cópia da lista (não altera a original). */
export function sortCatalog(services: CatalogService[], sortBy: ServiceSortBy): CatalogService[] {
  const list = [...services];
  switch (sortBy) {
    case 'price-asc':
      return list.sort((a, b) => a.suggestedPrice - b.suggestedPrice);
    case 'price-desc':
      return list.sort((a, b) => b.suggestedPrice - a.suggestedPrice);
    case 'code':
      return list.sort((a, b) => (a.code || a.id).localeCompare(b.code || b.id, 'pt-BR', { numeric: true }));
    case 'name':
      return list.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    case 'recent':
    default:
      return list.sort((a, b) => serviceRecencyValue(b) - serviceRecencyValue(a));
  }
}
