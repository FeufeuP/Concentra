'use client';

import React from 'react';
import { DEFAULT_LOGO_URL } from '@/lib/logo';

interface BrandLogoProps {
  /** Logotipo configurado (URL do Storage, data URL ou caminho em /public). Vazio → logotipo padrão. */
  src?: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Logotipo da empresa com fallback automático para o padrão.
 *
 * Usa `<img>` de propósito (e não `next/image`):
 * - o logo é dinâmico (data URL no modo local / URL pública do Supabase Storage),
 *   então a otimização do Next não se aplica (exigiria `unoptimized`);
 * - os blocos com o logo são capturados pelo html2canvas (PDF/O.S.), que precisa
 *   de um `<img>` simples, sem wrapper/lazy-loading;
 * - o fallback em `onError` troca o `src` diretamente.
 */
export function BrandLogo({ src, alt, className, style }: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ver justificativa acima
    <img
      src={src || DEFAULT_LOGO_URL}
      alt={alt}
      className={className}
      style={style}
      decoding="async"
      onError={(e) => {
        const img = e.currentTarget;
        if (img.dataset.fallback) {
          // Nem o logotipo padrão carregou: esconde o ícone de imagem quebrada
          img.style.visibility = 'hidden';
          return;
        }
        img.dataset.fallback = '1';
        img.src = DEFAULT_LOGO_URL;
      }}
    />
  );
}
