'use client';

import React, { useState } from 'react';
import { AuthUser, changeUserPassword, MIN_PASSWORD_LENGTH } from '@/lib/auth';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onSuccess: (msg: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess
}) => {
  const [currentPass, setCurrentPass] = useState<string>('');
  const [newPass, setNewPass] = useState<string>('');
  const [confirmPass, setConfirmPass] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPass !== confirmPass) {
      setErrorMsg('A nova senha e a confirmação não coincidem.');
      return;
    }

    if (newPass.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(`A nova senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    setIsSubmitting(true);
    const res = await changeUserPassword(currentUser.id, currentPass, newPass);
    setIsSubmitting(false);

    if (res.success) {
      onSuccess('Senha atualizada com sucesso!');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      onClose();
    } else {
      setErrorMsg(res.error || 'Erro ao alterar senha.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0]">
        <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#004328] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">lock_reset</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0b1c30]">Alterar Senha de Acesso</h3>
              <p className="text-[11px] text-[#64748b]">Usuário: {currentUser.name} ({currentUser.email})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-[#94a3b8] hover:text-[#0b1c30] p-1 rounded-lg"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold text-[#0b1c30] mb-1">
              Senha Atual
            </label>
            <input
              type="password"
              required
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Digite sua senha atual"
              className="w-full h-10 px-3 rounded-xl bg-[#f8fafc] text-xs text-[#0b1c30] border border-[#cbd5e1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0b1c30] mb-1">
              Nova Senha
            </label>
            <input
              type="password"
              required
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder={`Nova senha (mínimo ${MIN_PASSWORD_LENGTH} caracteres)`}
              className="w-full h-10 px-3 rounded-xl bg-[#f8fafc] text-xs text-[#0b1c30] border border-[#cbd5e1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0b1c30] mb-1">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              required
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full h-10 px-3 rounded-xl bg-[#f8fafc] text-xs text-[#0b1c30] border border-[#cbd5e1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl text-xs font-semibold text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Salvar Nova Senha</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
