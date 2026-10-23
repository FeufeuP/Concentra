'use client';

import React, { useEffect, useState } from 'react';
import { AuthUser, UserRole, USER_ROLES, listUsers, createUserAccount, adminResetPassword, deleteUserAccount, MIN_PASSWORD_LENGTH } from '@/lib/auth';
import { useToast } from '../ui/ToastProvider';
import { useDialog } from '../ui/DialogProvider';
import { ChangePasswordModal } from '../ChangePasswordModal';
import { EditUserModal } from '../EditUserModal';

interface UsersSectionProps {
  /** Usuário recebido da página (pode ser nulo durante a inicialização). */
  currentUser?: AuthUser | null;
  /** Usuário efetivo (página ou sessão local). */
  activeUser: AuthUser | null;
  isAdmin: boolean;
}

/** Seção 5 de Configurações: contas de acesso, perfis e senhas. */
export const UsersSection: React.FC<UsersSectionProps> = ({ currentUser, activeUser, isAdmin }) => {
  const showToast = useToast();
  const { confirm } = useDialog();
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState<number>(0);
  const [showChangePassModal, setShowChangePassModal] = useState<boolean>(false);

  // Usuários e Senhas de Acesso (Seção 5)
  const [usersList, setUsersList] = useState<AuthUser[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Responsável Técnico');
  const [newUserDoc, setNewUserDoc] = useState('');
  const [userSuccessMsg, setUserSuccessMsg] = useState<string | null>(null);
  const [userErrorMsg, setUserErrorMsg] = useState<string | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetPassValue, setResetPassValue] = useState('');
  const [isResettingPass, setIsResettingPass] = useState<boolean>(false);

  // Modal de edição de dados de usuário
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);

  const refreshUsers = async () => {
    setUsersList(await listUsers());
  };

  useEffect(() => {
    let alive = true;
    listUsers().then((users) => {
      if (alive) setUsersList(users);
    });
    return () => {
      alive = false;
    };
  }, []);

  const flashUserMsg = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setUserSuccessMsg(msg);
      setTimeout(() => setUserSuccessMsg(null), 3500);
    } else {
      setUserErrorMsg(msg);
      setTimeout(() => setUserErrorMsg(null), 5000);
    }
  };

  const handleCreateUserWithProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSuccessMsg(null);
    setUserErrorMsg(null);

    if (!newUserName.trim()) {
      setUserErrorMsg('O nome do usuário é obrigatório.');
      return;
    }
    if (!newUserEmail.trim() || !newUserEmail.includes('@')) {
      setUserErrorMsg('Informe um e-mail válido.');
      return;
    }
    if (newUserPass.length < MIN_PASSWORD_LENGTH) {
      setUserErrorMsg(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    setSavingSection('sec-5-create');
    setSavingProgress(40);
    const res = await createUserAccount({
      name: newUserName,
      email: newUserEmail,
      password: newUserPass,
      role: newUserRole,
      documentRegistration: newUserDoc,
    });
    setSavingProgress(100);
    setSavingSection(null);

    if (res.success && res.user) {
      await refreshUsers();
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPass('');
      setNewUserDoc('');
      flashUserMsg('success', `Usuário ${res.user.name} cadastrado com sucesso!`);
      showToast('Usuário cadastrado e salvo com sucesso!');
    } else {
      flashUserMsg('error', res.error || 'Erro ao cadastrar usuário.');
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (resetPassValue.length < MIN_PASSWORD_LENGTH) {
      setUserErrorMsg(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    setIsResettingPass(true);
    const target = usersList.find((u) => u.id === userId);
    const res = await adminResetPassword(userId, resetPassValue);

    if (res.success) {
      setResettingUserId(null);
      setResetPassValue('');
      flashUserMsg('success', `Senha do usuário ${target?.name || ''} redefinida com sucesso!`);
    } else {
      flashUserMsg('error', res.error || 'Erro ao redefinir a senha.');
    }
    setIsResettingPass(false);
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (currentUser?.id === userId) {
      showToast('Você não pode excluir sua própria conta atualmente em uso.', 'error');
      return;
    }
    const ok = await confirm({
      title: 'Remover usuário?',
      message: `${userName} perderá o acesso ao sistema.`,
      confirmLabel: 'Remover acesso',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await deleteUserAccount(userId);
    if (res.success) {
      await refreshUsers();
      flashUserMsg('success', `Usuário ${userName} removido.`);
    } else {
      flashUserMsg('error', res.error || 'Erro ao remover usuário.');
    }
  };

  return (
    <>
        {/* Section 5: Controle de Usuários, Logins e Senhas */}
        <div className="p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
            <div className="flex items-center gap-2 text-[#004328]">
              <span className="material-symbols-outlined text-[20px]">lock_person</span>
              <div>
                <h3 className="font-bold text-sm text-[#0b1c30]">5. Controle de Usuários, Logins e Senhas</h3>
                <p className="text-[11px] text-[#49607e]">
                  Gerencie as contas com acesso ao sistema Consentra SST, edite perfis e credenciais, redefina senhas e cadastre novos usuários.
                </p>
              </div>
            </div>

            {activeUser && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Conectado: <strong>{activeUser.name}</strong> ({activeUser.role})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChangePassModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] text-xs font-bold border border-[#c4dcff]/50 flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Alterar minha própria senha de acesso"
                >
                  <span className="material-symbols-outlined text-[15px]">key</span>
                  <span>Alterar Minha Senha</span>
                </button>
              </div>
            )}
          </div>

          {userSuccessMsg && (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2 border border-emerald-200">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
              <span>{userSuccessMsg}</span>
            </div>
          )}

          {userErrorMsg && (
            <div className="px-3.5 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2 border border-red-200">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{userErrorMsg}</span>
            </div>
          )}

          {/* Cadastro de Novo Usuário (somente administradores) */}
          {!isAdmin && (
            <div className="p-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-xs text-[#49607e] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#004328]">lock</span>
              <span>Novos acessos, perfis e senhas de outros usuários são gerenciados por um <strong>Administrador</strong>. Você pode editar seus próprios dados e alterar sua senha.</span>
            </div>
          )}
          {isAdmin && (
          <div className="p-4 rounded-xl bg-[#f8faff] border border-[#dbe7ff] flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#004328]">person_add</span>
              <h4 className="text-xs font-bold text-[#0b1c30]">Cadastrar Novo Usuário com Senha</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#49607e] mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ex: Engenheiro Gabriel"
                  className="w-full h-9 px-3 rounded-lg bg-white border border-[#cbd5e1] text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#004328]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#49607e] mb-1">E-mail de Login</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Ex: gabriel@consentra.com.br"
                  className="w-full h-9 px-3 rounded-lg bg-white border border-[#cbd5e1] text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#004328]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#49607e] mb-1">Perfil / Função</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full h-9 px-2 rounded-lg bg-white border border-[#cbd5e1] text-xs font-semibold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#004328]"
                >
                  {USER_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#49607e] mb-1">Registro (CREA/CRM/MTE)</label>
                <input
                  type="text"
                  value={newUserDoc}
                  onChange={(e) => setNewUserDoc(e.target.value)}
                  placeholder="Ex: CREA-SP 987.654"
                  className="w-full h-9 px-3 rounded-lg bg-white border border-[#cbd5e1] text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#004328]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#49607e] mb-1">Senha Inicial</label>
                <input
                  type="text"
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
                  autoComplete="new-password"
                  className="w-full h-9 px-3 rounded-lg bg-white border border-[#cbd5e1] text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#004328]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleCreateUserWithProgress}
                  disabled={savingSection === 'sec-5-create'}
                  className="w-full h-9 rounded-lg bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-98 disabled:opacity-80"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {savingSection === 'sec-5-create' ? 'sync' : 'how_to_reg'}
                  </span>
                  <span>
                    {savingSection === 'sec-5-create' ? `Salvando (${savingProgress}%)` : 'Salvar Usuário'}
                  </span>
                </button>
              </div>
            </div>

            {/* Barra de Progresso durante salvamento de novo usuário */}
            {savingSection === 'sec-5-create' && (
              <div className="flex flex-col gap-1 mt-1 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#004328]">
                  <span>Salvando cadastro de usuário no sistema...</span>
                  <span className="font-mono">{savingProgress}%</span>
                </div>
                <div className="w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#004328] h-full transition-all duration-150 rounded-full"
                    style={{ width: `${savingProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          )}

          {/* Tabela de Contas Registradas */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[#404942]">
              Contas de Acesso Cadastradas ({usersList.length})
            </span>

            <div className="divide-y divide-[#eff4ff] border border-[#eff4ff] rounded-xl overflow-hidden bg-white">
              {usersList.map((user) => {
                const isResetting = resettingUserId === user.id;
                const isCurrent = currentUser?.id === user.id;

                return (
                  <div key={user.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#fafcff] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl ${user.avatarBg || 'bg-[#004328]'} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}>
                        {user.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0b1c30]">{user.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                              Você
                            </span>
                          )}
                          <span className="text-[10px] font-semibold bg-slate-100 text-[#49607e] px-2 py-0.2 rounded-full">
                            {user.role}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#64748b] mt-0.5">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">mail</span>
                            {user.email}
                          </span>
                          {user.documentRegistration && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">badge</span>
                              {user.documentRegistration}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      {(isAdmin || isCurrent) && (
                        <button
                          type="button"
                          onClick={() => setEditingUser(user)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#49607e] hover:bg-[#eff4ff] hover:text-[#004328] flex items-center gap-1 transition-colors border border-slate-200"
                          title={isAdmin ? 'Editar dados, perfil e senha deste usuário' : 'Editar meus dados'}
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          <span>Editar</span>
                        </button>
                      )}

                      {!isAdmin ? null : isResetting ? (
                        <div className="flex items-center gap-1.5 bg-amber-50 p-1.5 rounded-xl border border-amber-200">
                          <input
                            type="text"
                            value={resetPassValue}
                            onChange={(e) => setResetPassValue(e.target.value)}
                            placeholder={`Mín. ${MIN_PASSWORD_LENGTH} caracteres`}
                            autoComplete="new-password"
                            className="w-24 h-7 px-2 text-xs rounded bg-white border border-amber-300 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleResetPassword(user.id)}
                            disabled={isResettingPass}
                            className="h-7 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setResettingUserId(null)}
                            className="h-7 px-1.5 text-slate-500 text-[10px]"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setResettingUserId(user.id);
                            setResetPassValue('');
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#49607e] hover:bg-[#eff4ff] hover:text-[#004328] flex items-center gap-1 transition-colors border border-slate-200"
                          title="Redefinir senha deste usuário"
                        >
                          <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                          <span>Redefinir Senha</span>
                        </button>
                      )}

                      {isAdmin && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(user.id, user.name)}
                          className="p-1.5 rounded-lg text-[#ba1a1a] hover:bg-rose-50 transition-colors"
                          title="Remover este usuário"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      {/* Modal de Edição de Usuário */}
      <EditUserModal
        isOpen={editingUser !== null}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onUserUpdated={(updated) => {
          setUsersList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          showToast(`Dados de ${updated.name} atualizados com sucesso!`);
        }}
      />

      {/* Modal de Alteração de Senha do Próprio Usuário */}
      {activeUser && (
        <ChangePasswordModal
          isOpen={showChangePassModal}
          onClose={() => setShowChangePassModal(false)}
          currentUser={activeUser}
          onSuccess={(msg) => {
            showToast(msg);
          }}
        />
      )}
    </>
  );
};
