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
