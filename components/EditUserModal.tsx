'use client';

import React, { useState } from 'react';
import { AuthUser, UserRole, USER_ROLES, updateUser, adminResetPassword, isAdminUser, getCurrentUser, MIN_PASSWORD_LENGTH } from '@/lib/auth';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  onUserUpdated: (updatedUser: AuthUser) => void;
}

interface EditUserDialogContentProps {
  user: AuthUser;
  onClose: () => void;
  onUserUpdated: (updatedUser: AuthUser) => void;
}

const EditUserDialogContent: React.FC<EditUserDialogContentProps> = ({
  user,
  onClose,
  onUserUpdated,
}) => {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [role, setRole] = useState<UserRole>(user.role || 'Responsável Técnico');
  // Só administradores alteram e-mail, perfil e senha de terceiros
  const [canManage] = useState<boolean>(() => isAdminUser(getCurrentUser()));
  const [documentRegistration, setDocumentRegistration] = useState(user.documentRegistration || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveProgress, setSaveProgress] = useState<number>(0);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('O nome do usuário é obrigatório.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Informe um e-mail corporativo válido.');
      return;
    }
    if (newPassword && newPassword.trim().length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(`A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    setIsSaving(true);
    setSaveProgress(30);

    const payload: Partial<AuthUser> = {
      name: name.trim(),
      documentRegistration: documentRegistration.trim(),
      phone: phone.trim(),
    };
    if (canManage) {
      payload.email = email.trim().toLowerCase();
      payload.role = role;
    }

    const res = await updateUser(user.id, payload);
    if (!res.success || !res.user) {
      setIsSaving(false);
      setSaveProgress(0);
      setErrorMsg(res.error || 'Erro ao atualizar dados do usuário.');
      return;
    }
    setSaveProgress(70);

    if (canManage && newPassword.trim()) {
      const passRes = await adminResetPassword(user.id, newPassword.trim());
      if (!passRes.success) {
        setIsSaving(false);
        setSaveProgress(0);
        onUserUpdated(res.user);
        setErrorMsg(`Dados salvos, mas a senha não foi alterada: ${passRes.error}`);
        return;
      }
    }

    setSaveProgress(100);
    setSaveSuccess(true);
    setIsSaving(false);
    onUserUpdated(res.user);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-[#e5eeff] flex flex-col gap-5 animate-fadeIn">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
          <div className="flex items-center gap-2.5 text-[#004328]">
            <div className="w-10 h-10 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#004328] flex items-center justify-center font-bold text-sm shrink-0">
              <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0b1c30]">Editar Dados do Usuário</h3>
              <p className="text-[11px] text-[#49607e]">Atualize as credenciais, função e registros do colaborador.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
            <span>Dados do usuário atualizados com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#404942] mb-1">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              placeholder="Ex: Washington Assis"
              className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#404942] mb-1">E-mail de Login</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSaving || !canManage}
                title={canManage ? undefined : 'Somente administradores podem alterar o e-mail'}
                placeholder="Ex: carlos@consentra.com.br"
                className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none font-mono text-[11.5px]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[#404942] mb-1">Perfil / Função no Sistema</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isSaving || !canManage}
                title={canManage ? undefined : 'Somente administradores podem alterar o perfil'}
                className="w-full h-10 px-2 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] font-semibold focus:bg-white focus:outline-none"
              >
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#404942] mb-1">Registro Profissional (CREA/CRM/MTE)</label>
              <input
                type="text"
                value={documentRegistration}
                onChange={(e) => setDocumentRegistration(e.target.value)}
                disabled={isSaving}
                placeholder="Ex: CREA-SP 506.892/D"
                className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#404942] mb-1">Telefone / Celular</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSaving}
                placeholder="Ex: (11) 98765-4321"
                className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none font-mono"
              />
            </div>
          </div>

          {canManage && (
          <div>
            <label className="block font-semibold text-[#404942] mb-1">
              Nova Senha de Acesso <span className="font-normal text-[#64748b]">(Deixe em branco para manter a atual)</span>
            </label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSaving}
              placeholder={`Digite a nova senha (mínimo ${MIN_PASSWORD_LENGTH} caracteres)...`}
              className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none font-mono"
            />
          </div>
          )}

          {/* Barra de Progresso do Salvamento */}
          {isSaving && (
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center justify-between text-xs font-bold text-[#004328]">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  Salvando dados do usuário...
                </span>
                <span className="font-mono">{saveProgress}%</span>
              </div>
              <div className="w-full bg-emerald-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#004328] h-full transition-all duration-150 rounded-full"
                  style={{ width: `${saveProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#eff4ff] mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#e5eeff] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-98 ${
                saveSuccess
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : isSaving
                  ? 'bg-[#004328]/80 cursor-wait'
                  : 'bg-[#004328] hover:bg-[#005c3e]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isSaving ? 'sync' : saveSuccess ? 'check' : 'save'}
              </span>
              <span>
                {isSaving ? `Salvando (${saveProgress}%)` : saveSuccess ? 'Salvo!' : 'Salvar Alterações'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated,
}) => {
  if (!isOpen || !user) return null;

  return (
    <EditUserDialogContent
      key={`${user.id}-${isOpen}`}
      user={user}
      onClose={onClose}
      onUserUpdated={onUserUpdated}
    />
  );
};

