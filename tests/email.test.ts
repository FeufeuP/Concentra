import { describe, it, expect } from 'vitest';
import { buildMailtoUrl, defaultEmailContent, getEmailServiceStatus, isValidEmail, parseEmailList, validateEmailDraft } from '@/lib/email';
import { makeQuote } from './helpers';

const company = { name: 'CONSENTRA LTDA', tradeName: 'Consentra', phone: '(41) 3333-0000', email: 'contato@consentra.com.br' };

describe('validação de e-mails', () => {
  it('aceita e recusa formatos', () => {
    expect(isValidEmail('ana@empresa.com.br')).toBe(true);
    expect(isValidEmail('ana@empresa')).toBe(false);
    expect(isValidEmail('ana empresa@x.com')).toBe(false);
    expect(isValidEmail('<script>@x.com')).toBe(false);
  });

  it('separa lista por vírgula/ponto e vírgula, sem repetição', () => {
    expect(parseEmailList('A@x.com; b@y.com, a@x.com  invalido')).toEqual({ valid: ['a@x.com', 'b@y.com'], invalid: ['invalido'] });
  });

  it('valida o rascunho completo', () => {
    const ok = { to: 'a@x.com', cc: '', subject: 'Proposta', message: 'Olá' };
    expect(validateEmailDraft(ok).error).toBeUndefined();
    expect(validateEmailDraft({ ...ok, to: '' }).error).toMatch(/destinatário/);
    expect(validateEmailDraft({ ...ok, cc: 'x@' }).error).toMatch(/CC/);
    expect(validateEmailDraft({ ...ok, to: 'a@x.com,b@x.com,c@x.com,d@x.com,e@x.com,f@x.com' }).error).toMatch(/Máximo/);
    expect(validateEmailDraft({ ...ok, subject: '  ' }).error).toMatch(/assunto/);
    expect(validateEmailDraft({ ...ok, message: '' }).error).toMatch(/mensagem/);
  });
});

describe('conteúdo padrão', () => {
  it('usa dados reais do orçamento, empresa e remetente', () => {
    const quote = makeQuote({ id: '325', numberOnly: 325, clientName: 'Metalúrgica X', contactPerson: 'João', total: 1500, validityDate: '07/11/2026' });
    const { subject, message } = defaultEmailContent(quote, company, 'Amanda Silveira');
    expect(subject).toBe('Proposta Técnica & Comercial SST Nº 325 - Metalúrgica X');
    expect(message).toContain('Prezado(a) João');
    expect(message).toContain('R$');
    expect(message).toContain('07/11/2026');
    expect(message).toContain('Amanda Silveira\nCONSENTRA LTDA\nTel: (41) 3333-0000 | contato@consentra.com.br');
    expect(message).not.toContain('3450-8900');
  });
});

describe('mailto', () => {
  it('codifica destinatários, cópia, assunto e corpo', () => {
    const url = buildMailtoUrl(['a@x.com', 'b@y.com'], ['c@z.com'], 'Proposta Nº 1 & cia', 'Linha 1\nLinha 2');
    expect(url).toBe('mailto:a%40x.com,b%40y.com?cc=c%40z.com&subject=Proposta%20N%C2%BA%201%20%26%20cia&body=Linha%201%0ALinha%202');
  });
});

describe('status do serviço', () => {
  it('sem Supabase configurado é modo local (envio manual)', async () => {
    expect(await getEmailServiceStatus()).toBe('local');
  });
});
