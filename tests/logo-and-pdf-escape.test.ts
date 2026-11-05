import { describe, it, expect } from 'vitest';
import { normalizeLogoUrl, DEFAULT_LOGO_URL } from '@/lib/logo';
import { esc, escapeFields } from '@/lib/pdf-generator';

describe('normalizeLogoUrl', () => {
  it('aceita caminho padrão, URL https e data URL de imagem', () => {
    expect(normalizeLogoUrl('/logo-consentra-horizontal.png')).toBe('/logo-consentra-horizontal.png');
    expect(normalizeLogoUrl('https://x.supabase.co/storage/v1/object/public/branding/logo/logo-1.png')).toContain('https://');
    expect(normalizeLogoUrl('data:image/png;base64,iVBORw0KGgo=')).toContain('data:image/png');
  });

  it('descarta referências legadas inexistentes (quebravam o logotipo)', () => {
    expect(normalizeLogoUrl('/logo-consentra-real.jpg')).toBe(DEFAULT_LOGO_URL);
    expect(normalizeLogoUrl('logo-consentra.jpg')).toBe(DEFAULT_LOGO_URL);
  });

  it('descarta blob: (morre ao recarregar a página) e valores vazios/estranhos', () => {
    expect(normalizeLogoUrl('blob:https://consentra-sst.vercel.app/abc-123')).toBe(DEFAULT_LOGO_URL);
    expect(normalizeLogoUrl('')).toBe(DEFAULT_LOGO_URL);
    expect(normalizeLogoUrl(null)).toBe(DEFAULT_LOGO_URL);
    expect(normalizeLogoUrl(undefined)).toBe(DEFAULT_LOGO_URL);
    expect(normalizeLogoUrl('javascript:alert(1)')).toBe(DEFAULT_LOGO_URL);
  });
});

describe('esc / escapeFields (folha A4 do PDF)', () => {
  it('escapa &, <, >, aspas e apóstrofo', () => {
    expect(esc('A & B <Ltda> "X" \'Y\'')).toBe('A &amp; B &lt;Ltda&gt; &quot;X&quot; &#39;Y&#39;');
    expect(esc(null)).toBe('');
    expect(esc(42)).toBe('42');
  });

  it('escapeFields escapa só strings e preserva números/booleans/arrays', () => {
    const out = escapeFields({ name: 'A & B', total: 1200.5, active: true, tags: ['<x>'], note: null as unknown as string });
    expect(out.name).toBe('A &amp; B');
    expect(out.total).toBe(1200.5);
    expect(out.active).toBe(true);
    expect(out.tags).toEqual(['<x>']); // arrays são responsabilidade de quem monta (itens são escapados por item)
    expect(out.note).toBeNull();
  });
});
