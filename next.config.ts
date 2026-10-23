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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

export default nextConfig;
