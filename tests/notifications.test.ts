import { describe, it, expect } from 'vitest';
import {
  computeNotifications,
  daysBetween,
  getReadNotificationIds,
  lastActivity,
  markNotificationsRead,
  parseBrDate,
} from '@/lib/notifications';
import { MemoryStorage, makeQuote } from './helpers';

// "Hoje" fixo: 23/10/2026 10:00 (horário local)
const NOW = new Date(2026, 9, 23, 10, 0);

describe('datas', () => {
  it('converte dd/mm/aaaa e rejeita datas inválidas', () => {
    expect(parseBrDate('29/09/2026')?.getDate()).toBe(29);
    expect(parseBrDate('31/02/2026')).toBeNull();
    expect(parseBrDate('2026-09-29')).toBeNull();
    expect(parseBrDate(undefined)).toBeNull();
  });

  it('conta dias de calendário', () => {
    expect(daysBetween(NOW, new Date(2026, 9, 26, 1, 0))).toBe(3);
    expect(daysBetween(NOW, new Date(2026, 9, 22, 23, 0))).toBe(-1);
  });

  it('última movimentação usa lastModified ISO ou a emissão', () => {
    expect(lastActivity({ lastModified: '2026-10-01T12:00:00.000Z', issueDate: '01/01/2026' })?.getMonth()).toBe(9);
    expect(lastActivity({ lastModified: 'Agora', issueDate: '05/10/2026' })?.getDate()).toBe(5);
  });
});

describe('computeNotifications', () => {
  const recent = new Date(2026, 9, 22).toISOString();

  it('proposta enviada vencida e a vencer', () => {
    const list = computeNotifications(
      [
        makeQuote({ id: '320', numberOnly: 320, status: 'Enviado', validityDate: '20/10/2026', lastModified: recent }),
        makeQuote({ id: '321', numberOnly: 321, status: 'Aguardando Retorno', validityDate: '24/10/2026', lastModified: recent }),
        makeQuote({ id: '322', numberOnly: 322, status: 'Enviado', validityDate: '23/11/2026', lastModified: recent }),
      ],
      NOW
    );
    expect(list.map((n) => n.kind)).toEqual(['expired', 'expiring']);
    expect(list[0].title).toContain('320');
    expect(list[0].description).toContain('venceu há 3 dias');
    expect(list[1].title).toContain('vence amanhã');
  });

  it('ignora aprovados/cancelados e trata rascunho parado', () => {
    const list = computeNotifications(
      [
        makeQuote({ id: '330', status: 'Aprovado', validityDate: '01/10/2026', lastModified: '2026-01-01T00:00:00Z' }),
        makeQuote({ id: '331', status: 'Cancelado', validityDate: '01/10/2026' }),
        makeQuote({ id: '332', status: 'Rascunho', validityDate: '01/10/2026', lastModified: '2026-10-10T12:00:00Z' }),
        makeQuote({ id: '333', status: 'Rascunho', lastModified: recent }),
      ],
      NOW
    );
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: 'stale_draft', severity: 'low', quoteId: '332' });
  });

  it('retorno pendente após 7 dias sem movimentação', () => {
    const list = computeNotifications(
      [makeQuote({ id: '340', status: 'Aguardando Retorno', validityDate: '30/12/2026', lastModified: '2026-10-12T12:00:00Z' })],
      NOW
    );
    expect(list).toHaveLength(1);
    expect(list[0].kind).toBe('awaiting');
    expect(list[0].description).toContain('11 dias');
  });

  it('ordena por gravidade e o id muda quando a validade muda', () => {
    const q = makeQuote({ id: '350', status: 'Enviado', validityDate: '24/10/2026', lastModified: '2026-10-01T12:00:00Z' });
    const list = computeNotifications([q], NOW);
    expect(list.map((n) => n.severity)).toEqual(['high', 'medium']);
    const renewed = computeNotifications([{ ...q, validityDate: '25/10/2026' }], NOW);
    expect(renewed[0].id).not.toBe(list[0].id);
  });
});

describe('notificações lidas', () => {
  it('guarda por usuário, sem repetição', () => {
    const storage = new MemoryStorage();
    markNotificationsRead('u1', ['a', 'b'], storage);
    markNotificationsRead('u1', ['b', 'c'], storage);
    expect(getReadNotificationIds('u1', storage)).toEqual(['a', 'b', 'c']);
    expect(getReadNotificationIds('u2', storage)).toEqual([]);
  });
});
