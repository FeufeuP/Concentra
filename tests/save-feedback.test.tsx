// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSectionSave } from '@/components/settings/SectionSave';
import { ClientsView } from '@/components/ClientsView';

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('@/components/ui/ToastProvider', () => ({ useToast: () => toast }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('feedback de salvamento', () => {
  it('passagem do tempo não anuncia sucesso; espera o commit real e impede duplo clique', async () => {
    vi.useFakeTimers();
    const save = deferred<void>();
    const action = vi.fn(() => save.promise);
    const { result } = renderHook(() => useSectionSave());
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.triggerSectionSave('section', action, 'Confirmed'); });
    act(() => { vi.advanceTimersByTime(10000); });
    expect(result.current.savingSection).toBe('section');
    expect(result.current.savedSection).toBeNull();
    expect(toast).not.toHaveBeenCalled();
    await act(async () => { expect(await result.current.triggerSectionSave('other', action, 'Wrong')).toBe(false); });
    expect(action).toHaveBeenCalledOnce();
    await act(async () => { save.resolve(); await pending; });
    expect(result.current.savedSection).toBe('section');
    expect(toast).toHaveBeenCalledExactlyOnceWith('Confirmed');
  });
  it('erro mantém indicador sem sucesso e permite uma nova tentativa', async () => {
    const save = deferred<void>();
    const { result } = renderHook(() => useSectionSave());
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.triggerSectionSave('section', () => save.promise, 'Wrong success'); });
    await act(async () => { save.reject(new Error('offline')); expect(await pending).toBe(false); });
    expect(result.current.savedSection).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('offline'), 'error');
    expect(toast).not.toHaveBeenCalledWith('Wrong success');
    await act(async () => { await result.current.triggerSectionSave('section', async () => {}, 'Retry confirmed'); });
    expect(result.current.savedSection).toBe('section');
  });
});

describe('cadastro de cliente', () => {
  it('usa UUID, aguarda gravação e mantém o formulário e os dados se falhar', async () => {
    const save = deferred<boolean>();
    const onAdd = vi.fn<(client: import('@/lib/types').ClientData) => Promise<boolean>>(() => save.promise);
    render(<ClientsView clients={[]} onNewQuoteForClient={() => {}} onAddClient={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar Novo Cliente/i }));
    const form = document.querySelector('form')!;
    const inputs = form.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'Synthetic company' } });
    fireEvent.change(inputs[1], { target: { value: '00.000.000/0000-00' } });
    fireEvent.submit(form);
    expect(onAdd).toHaveBeenCalledOnce();
    expect(onAdd.mock.calls[0][0].id).toMatch(/^CL-[0-9a-f-]{36}$/);
    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeTruthy();
    expect(document.querySelector('form')).not.toBeNull();
    fireEvent.submit(form);
    expect(onAdd).toHaveBeenCalledOnce();
    await act(async () => { save.resolve(false); await save.promise; });
    expect(document.querySelector('form')).not.toBeNull();
    expect((inputs[0] as HTMLInputElement).value).toBe('Synthetic company');
    expect(screen.getByRole('button', { name: 'Salvar Cliente' })).toBeTruthy();
    await act(async () => { fireEvent.submit(form); });
    expect(onAdd).toHaveBeenCalledTimes(2);
    expect(onAdd.mock.calls[1][0].id).toBe(onAdd.mock.calls[0][0].id);
  });
});
