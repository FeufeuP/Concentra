// =============================================================================
// Prefixo de caminho público da aplicação.
//
// Em produção normal (Vercel, servidor próprio, localhost) o app é servido na
// raiz, então BASE_PATH é vazio. No GitHub Pages de um repositório (site de
// projeto) o app fica em /<nome-do-repositorio> — por isso o build de Pages
// define NEXT_PUBLIC_BASE_PATH=/Concentra.
//
// Use `assetPath()` para arquivos de /public referenciados em strings
// (<img src="/logo...">, metadados, PDF). O Next.js já aplica o basePath em
// `next/link`, `next/image` e nos chunks, mas não em caminhos absolutos escritos
// à mão.
// =============================================================================

export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/+$/, '');

/** Adiciona o prefixo público a um caminho absoluto de /public. */
export function assetPath(path: string): string {
  if (!path.startsWith('/')) return path;
  if (!BASE_PATH) return path;
  return `${BASE_PATH}${path}`;
}
