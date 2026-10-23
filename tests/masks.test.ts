import { describe, it, expect, vi, afterEach } from 'vitest';
import { maskPhoneBR, getTodayFormatted, calculateValidityDate } from '@/lib/masks';

describe('maskPhoneBR', () => {
  it('retorna vazio para entradas vazias', () => {
    expect(maskPhoneBR('')).toBe('');
    expect(maskPhoneBR(null)).toBe('');
    expect(maskPhoneBR(undefined)).toBe('');
    expect(maskPhoneBR('abc')).toBe('');
  });

  it('formata o DDD progressivamente', () => {
    expect(maskPhoneBR('4')).toBe('(4');
    expect(maskPhoneBR('41')).toBe('(41) ');
    expect(maskPhoneBR('4133')).toBe('(41) 33');
  });

  it('formata telefone fixo (10 dígitos)', () => {
    expect(maskPhoneBR('4133334444')).toBe('(41) 3333-4444');
  });

  it('formata celular (11 dígitos) e ignora excesso e caracteres não numéricos', () => {
    expect(maskPhoneBR('41987654321')).toBe('(41) 98765-4321');
    expect(maskPhoneBR('+55 (41) 98765-4321')).toBe('(55) 41987-6543');
    expect(maskPhoneBR('41 98765 4321 999')).toBe('(41) 98765-4321');
  });
});

describe('datas', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('getTodayFormatted usa dd/mm/aaaa', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 12, 0, 0));
    expect(getTodayFormatted()).toBe('05/10/2026');
  });

  it('calculateValidityDate soma dias (inclusive virada de mês/ano)', () => {
    expect(calculateValidityDate('19/09/2026', 15)).toBe('04/10/2026');
    expect(calculateValidityDate('20/12/2026', 15)).toBe('04/01/2027');
    expect(calculateValidityDate('28/02/2028', 1)).toBe('29/02/2028'); // ano bissexto
  });

  it('calculateValidityDate usa 15 dias por padrão e hoje como base se a data for inválida', () => {
    expect(calculateValidityDate('01/01/2026')).toBe('16/01/2026');
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 10, 12, 0, 0));
    expect(calculateValidityDate('data inválida', 5)).toBe('15/01/2026');
  });
});
