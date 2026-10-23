'use client';

import React, { useState } from 'react';
import { AuthUser, completePasswordRecovery, logoutUser, MIN_PASSWORD_LENGTH } from '@/lib/auth';

interface RecoveryPasswordModalProps {
  /** Chamado após a nova senha ser salva — o usuário já fica autenticado. */
  onComplete: (user: AuthUser) => void;
  onCancel: () => void;
}

/**
 * Exibido quando o usuário abre o link de recuperação enviado por e-mail
 * (evento PASSWORD_RECOVERY do Supabase Auth).
 */
export const RecoveryPasswordModal: React.FC<RecoveryPasswordModalProps> = ({ onComplete, onCancel }) => {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    setIsSaving(true);
    const res = await completePasswordRecovery(newPass);
    setIsSaving(false);
    if (res.success && res.user) {
      onComplete(res.user);
    } else {
      setErrorMsg(res.error || 'Não foi possível salvar a nova senha. Solicite um novo link.');
    }
  };

  const handleCancel = async () => {
    await logoutUser();
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#004328] flex items-center justify-center shrink-0 border border-emerald-100">
            <span className="material-symbols-outlined text-[24px]">lock_reset</span>
          </div>
          <div>
            <h3 className="font-bold text-base text-[#0b1c30]">Definir Nova Senha</h3>
            <p className="text-[11px] text-[#64748b]">Link de recuperação validado. Cadastre sua nova senha de acesso.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-bold text-[#0b1c30] mb-1">Nova Senha de Acesso:</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                autoFocus
                autoComplete="new-password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
                className="w-full h-10 pl-3 pr-10 rounded-xl bg-[#f8fafc] text-xs text-[#0b1c30] border border-[#cbd5e1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0b1c30] p-1"
                title={showPass ? 'Ocultar senha' : 'Exibir senha'}
              >
                <span className="material-symbols-outlined text-[18px]">{showPass ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0b1c30] mb-1">Confirmar Nova Senha:</label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full h-10 px-3 rounded-xl bg-[#f8fafc] text-xs text-[#0b1c30] border border-[#cbd5e1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">{isSaving ? 'sync' : 'check'}</span>
              <span>{isSaving ? 'Salvando...' : 'Salvar Nova Senha e Entrar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
