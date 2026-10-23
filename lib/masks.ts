/**
 * Utilitários de máscaras e formatação padrão Brasil (SST / Corporativo)
 */

/**
 * Aplica máscara automática de telefone padrão brasileiro:
 * - Formato celular: (XX) XXXXX-XXXX
 * - Formato fixo: (XX) XXXX-XXXX
 * - Ao digitar os 2 primeiros dígitos (DDD), envolve automaticamente em parênteses: (XX) 
 */
export function maskPhoneBR(value: string | undefined | null): string {
  if (!value) return '';

  // Extrai apenas dígitos numéricos (máximo 11 dígitos no Brasil)
  const digits = value.replace(/\D/g, '').substring(0, 11);

  if (digits.length === 0) return '';
  if (digits.length === 1) return `(${digits}`;
  if (digits.length === 2) return `(${digits}) `;

  // 3 a 6 dígitos: (XX) XXXX
  if (digits.length <= 6) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
  }

  // 7 a 10 dígitos (Telefone Fixo padrão ex: (11) 3450-8900)
  if (digits.length <= 10) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
  }

  // 11 dígitos (Celular padrão ex: (11) 98765-4321)
  return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7, 11)}`;
}

/**
 * Retorna a data atual (hoje) formatada no padrão DD/MM/AAAA
 */
export function getTodayFormatted(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Calcula a data de validade com base na data de emissão e quantidade de dias
 */
export function calculateValidityDate(issueDateStr: string, days: number = 15): string {
  try {
    const parts = issueDateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        date.setDate(date.getDate() + days);
        const vDay = String(date.getDate()).padStart(2, '0');
        const vMonth = String(date.getMonth() + 1).padStart(2, '0');
        const vYear = date.getFullYear();
        return `${vDay}/${vMonth}/${vYear}`;
      }
    }
  } catch {}
  
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + days);
  const fDay = String(fallback.getDate()).padStart(2, '0');
  const fMonth = String(fallback.getMonth() + 1).padStart(2, '0');
  return `${fDay}/${fMonth}/${fallback.getFullYear()}`;
}
