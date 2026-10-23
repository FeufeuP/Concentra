import type { NextConfig } from 'next';

/**
 * Origens extras autorizadas a acessar os recursos do servidor de desenvolvimento
 * (HMR, chunks em /_next). Útil ao abrir o `npm run dev` por um domínio de preview/túnel.
 * Ex.: ALLOWED_DEV_ORIGINS="*.e2b.app,meu-tunel.ngrok.app"
 */
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * Prefixo público do app. Fica vazio no deploy tradicional (raiz do domínio) e
 * vem "/<repositorio>" no GitHub Pages (site de projeto).
 * Ex.: NEXT_PUBLIC_BASE_PATH=/Concentra
 */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').trim().replace(/\/+$/, '');

/**
 * GitHub Pages só serve arquivos estáticos: `GITHUB_PAGES=true` gera o site em
 * `out/` (`output: 'export'`), pronto para o workflow de deploy.
 */
const isStaticExport = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(basePath ? { basePath } : {}),
  /* O export estático não tem otimizador de imagens do servidor. */
  images: { unoptimized: true },
  ...(isStaticExport ? ({ output: 'export', trailingSlash: true } as const) : {}),
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

export default nextConfig;
