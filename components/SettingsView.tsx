'use client';

import React, { useState, useEffect, useRef } from 'react';
import { COMPANY_PROFILE, DIRECT_LOGO_URL } from '@/lib/mock-data';
import { getStoredCompanyProfile, saveStoredCompanyProfile, CompanyProfile } from '@/lib/company';
import { getStoredResponsibles, saveStoredResponsibles, DEFAULT_RESPONSIBLES } from '@/lib/responsibles';
import { getStoredLogoUrl, saveStoredLogoUrl, clearStoredLogoUrl, DEFAULT_REAL_LOGO_URL, DEFAULT_LOGO_URL } from '@/lib/logo';
import { AuthUser, UserRole, USER_ROLES, listUsers, createUserAccount, adminResetPassword, deleteUserAccount, getCurrentUser, isAdminUser, MIN_PASSWORD_LENGTH } from '@/lib/auth';
import { Quote, ClientData } from '@/lib/types';
import { AdminQuoteConfigModal } from './AdminQuoteConfigModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { EditUserModal } from './EditUserModal';

interface SettingsViewProps {
  responsiblePersons?: string[];
  onUpdateResponsiblePersons?: (list: string[]) => void;
  currentUser?: AuthUser | null;
  quotes?: Quote[];
  clients?: ClientData[];
  onShowToast?: (msg: string) => void;
  onClearAllQuotes?: () => void;
}

interface SectionSaveButtonProps {
  label: string;
  isSaving: boolean;
  isSaved: boolean;
  progress: number;
  onClick: () => void;
}

const SectionSaveButton: React.FC<SectionSaveButtonProps> = ({
  label,
  isSaving,
  isSaved,
  progress,
  onClick,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#eff4ff] mt-2">
      <div className="flex-1 min-w-[200px]">
        {isSaving ? (
          <div className="flex flex-col gap-1 max-w-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#004328]">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                Gravando alterações...
              </span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="w-full bg-emerald-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#004328] h-full transition-all duration-150 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : isSaved ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 animate-fadeIn">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
            <span>Salvo com sucesso!</span>
          </div>
        ) : (
          <span className="text-[11px] text-[#64748b]">
            Salve individualmente as alterações deste item.
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={isSaving}
        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 active:scale-98 ${
          isSaved
            ? 'bg-emerald-700 text-white'
            : isSaving
            ? 'bg-[#004328]/80 text-white cursor-wait'
            : 'bg-[#004328] hover:bg-[#005c3e] text-white'
        }`}
      >
        <span className="material-symbols-outlined text-[16px]">
          {isSaving ? 'sync' : isSaved ? 'check' : 'save'}
        </span>
        <span>
          {isSaving ? `Salvando (${progress}%)` : isSaved ? 'Salvo!' : label}
        </span>
      </button>
    </div>
  );
};

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  responsiblePersons: initialResponsiblePersons,
  onUpdateResponsiblePersons,
  currentUser,
  quotes = [],
  clients = [],
  onShowToast,
  onClearAllQuotes,
}) => {
  const [profile, setProfile] = useState<CompanyProfile>(() => getStoredCompanyProfile());
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Estados para salvar com barra de progresso individual por seção
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState<number>(0);
  const [savedSection, setSavedSection] = useState<string | null>(null);

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
  const [resetPassProgress, setResetPassProgress] = useState<number>(0);

  // Modal de edição de dados de usuário
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);

  // Modal de confirmação de limpeza/zerar orçamentos
  const [showClearQuotesModal, setShowClearQuotesModal] = useState<boolean>(false);
  const [isClearingQuotes, setIsClearingQuotes] = useState<boolean>(false);
  const [clearingProgress, setClearingProgress] = useState<number>(0);

  // Controle de Modais Administrativos e Segurança
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminModalTab, setAdminModalTab] = useState<'header' | 'texts'>('header');
  const [showChangePassModal, setShowChangePassModal] = useState<boolean>(false);

  const activeUser = currentUser || (typeof window !== 'undefined' ? getCurrentUser() : null);
  const isAdmin = isAdminUser(activeUser);

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

  // Responsáveis pelo Orçamento (apenas nome)
  const [responsibles, setResponsibles] = useState<string[]>(() => {
    if (initialResponsiblePersons && initialResponsiblePersons.length > 0) {
      return initialResponsiblePersons;
    }
    return getStoredResponsibles();
  });
  const [newPersonName, setNewPersonName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [personSuccessMsg, setPersonSuccessMsg] = useState<string | null>(null);

  // Logotipo Corporativo Customizado
  const [activeLogo, setActiveLogo] = useState<string>(getStoredLogoUrl());
  const [logoUploadMsg, setLogoUploadMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        saveStoredLogoUrl(dataUrl);
        setActiveLogo(dataUrl);
        setLogoUploadMsg('Logotipo importado com sucesso! Aplicado em todos os orçamentos e Ordens de Serviço.');
        setTimeout(() => setLogoUploadMsg(null), 4000);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be reselected
    e.target.value = '';
  };

  const handleResetLogo = () => {
    clearStoredLogoUrl();
    setActiveLogo(DEFAULT_LOGO_URL);
    setLogoUploadMsg('Logotipo restaurado para a versão oficial real padrão.');
    setTimeout(() => setLogoUploadMsg(null), 4000);
  };

  useEffect(() => {
    const handleResponsiblesUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      if (customEvent.detail) {
        setResponsibles(customEvent.detail);
      }
    };

    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<CompanyProfile>;
      if (customEvent.detail) {
        setProfile(customEvent.detail);
      }
    };

    window.addEventListener('consentra_responsibles_updated', handleResponsiblesUpdate);
    window.addEventListener('consentra_company_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('consentra_responsibles_updated', handleResponsiblesUpdate);
      window.removeEventListener('consentra_company_profile_updated', handleProfileUpdate);
    };
  }, []);

  const showPersonFeedback = (msg: string) => {
    setPersonSuccessMsg(msg);
    setTimeout(() => setPersonSuccessMsg(null), 3000);
  };

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPersonName.trim();
    if (!trimmed) return;

    if (responsibles.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      alert('Esta pessoa já está cadastrada na lista de responsáveis.');
      return;
    }

    const updated = [...responsibles, trimmed];
    setResponsibles(updated);
    saveStoredResponsibles(updated);
    if (onUpdateResponsiblePersons) onUpdateResponsiblePersons(updated);
    setNewPersonName('');
    showPersonFeedback(`"${trimmed}" cadastrado(a) com sucesso! Já disponível no menu em cascata de orçamentos.`);
  };

  const handleRemovePerson = (nameToRemove: string) => {
    if (responsibles.length <= 1) {
      alert('Deve haver pelo menos um responsável cadastrado no sistema.');
      return;
    }
    if (confirm(`Deseja remover "${nameToRemove}" da lista de responsáveis pelo orçamento?`)) {
      const updated = responsibles.filter(p => p !== nameToRemove);
      setResponsibles(updated);
      saveStoredResponsibles(updated);
      if (onUpdateResponsiblePersons) onUpdateResponsiblePersons(updated);
      showPersonFeedback(`"${nameToRemove}" removido(a) com sucesso.`);
    }
  };

  const handleStartEdit = (index: number, currentName: string) => {
    setEditingIndex(index);
    setEditingName(currentName);
  };

  const handleSaveEdit = (index: number) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    const updated = [...responsibles];
    updated[index] = trimmed;
    setResponsibles(updated);
    saveStoredResponsibles(updated);
    if (onUpdateResponsiblePersons) onUpdateResponsiblePersons(updated);
    setEditingIndex(null);
    setEditingName('');
    showPersonFeedback(`Nome atualizado para "${trimmed}" com sucesso!`);
  };

  const handleResetDefault = () => {
    if (confirm('Deseja restaurar os responsáveis padrão do sistema?')) {
      setResponsibles(DEFAULT_RESPONSIBLES);
      saveStoredResponsibles(DEFAULT_RESPONSIBLES);
      if (onUpdateResponsiblePersons) onUpdateResponsiblePersons(DEFAULT_RESPONSIBLES);
      showPersonFeedback('Lista de responsáveis restaurada com sucesso!');
    }
  };

  const triggerSectionSave = (sectionId: string, action: () => void, successMsg: string) => {
    setSavingSection(sectionId);
    setSavingProgress(25);

    setTimeout(() => setSavingProgress(55), 110);
    setTimeout(() => setSavingProgress(85), 240);
    setTimeout(() => {
      setSavingProgress(100);
      action();
      setSavingSection(null);
      setSavedSection(sectionId);
      if (onShowToast) onShowToast(successMsg);
      setTimeout(() => setSavedSection(null), 3000);
    }, 400);
  };

  // 1. Identificação da Empresa Emissora
  const handleSaveSection1 = () => {
    triggerSectionSave('sec-1', () => {
      const saved = saveStoredCompanyProfile(profile);
      setProfile(saved);
    }, '1. Identificação da Empresa salva com sucesso!');
  };

  // 2. Responsável Técnico & Emissão de ART
  const handleSaveSection2 = () => {
    triggerSectionSave('sec-2', () => {
      const saved = saveStoredCompanyProfile(profile);
      setProfile(saved);
    }, '2. Responsável Técnico & ART salvos com sucesso!');
  };

  // 3. Dados Bancários para Pagamentos & PIX
  const handleSaveSection3 = () => {
    triggerSectionSave('sec-3', () => {
      const saved = saveStoredCompanyProfile(profile);
      setProfile(saved);
    }, '3. Dados Bancários e Chave PIX salvos com sucesso!');
  };

  // 4. Responsável pelo Orçamento
  const handleSaveSection4 = () => {
    triggerSectionSave('sec-4', () => {
      saveStoredResponsibles(responsibles);
      if (onUpdateResponsiblePersons) onUpdateResponsiblePersons(responsibles);
    }, '4. Lista de Responsáveis pelo Orçamento salva com sucesso!');
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
      if (onShowToast) onShowToast('Usuário cadastrado e salvo com sucesso!');
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
    setResetPassProgress(40);
    const target = usersList.find((u) => u.id === userId);
    const res = await adminResetPassword(userId, resetPassValue);
    setResetPassProgress(100);

    if (res.success) {
      setResettingUserId(null);
      setResetPassValue('');
      flashUserMsg('success', `Senha do usuário ${target?.name || ''} redefinida com sucesso!`);
    } else {
      flashUserMsg('error', res.error || 'Erro ao redefinir a senha.');
    }
    setIsResettingPass(false);
    setResetPassProgress(0);
  };

  const handleConfirmClearQuotes = () => {
    setIsClearingQuotes(true);
    setClearingProgress(25);
    setTimeout(() => setClearingProgress(65), 140);
    setTimeout(() => setClearingProgress(90), 280);
    setTimeout(() => {
      setClearingProgress(100);
      if (onClearAllQuotes) {
        onClearAllQuotes();
      }
      setIsClearingQuotes(false);
      setShowClearQuotesModal(false);
      setClearingProgress(0);
      if (onShowToast) {
        onShowToast('Todos os orçamentos foram apagados. Sistema zerado com sucesso!');
      }
    }, 450);
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (currentUser?.id === userId) {
      alert('Você não pode excluir sua própria conta atualmente em uso.');
      return;
    }
    if (!confirm(`Deseja remover o acesso de ${userName}?`)) return;
    const res = await deleteUserAccount(userId);
    if (res.success) {
      await refreshUsers();
      flashUserMsg('success', `Usuário ${userName} removido.`);
    } else {
      flashUserMsg('error', res.error || 'Erro ao remover usuário.');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSectionSave('global', () => {
      // 1. Salvar dados cadastrais e bancários da empresa
      const saved = saveStoredCompanyProfile(profile);
      setProfile(saved);

      // 2. Garantir sincronização dos responsáveis
      saveStoredResponsibles(responsibles);
      if (onUpdateResponsiblePersons) {
        onUpdateResponsiblePersons(responsibles);
      }

      // 3. Feedback visual no topo e no botão
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    }, 'Todas as configurações foram salvas com sucesso!');
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[#49607e] uppercase tracking-wider block font-mono">
            SISTEMA & GOVERNANÇA EMPRESARIAL
          </span>
          <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">
            Configurações da Emissora Consentra
          </h1>
          <p className="text-xs text-[#49607e] mt-0.5">
            Dados cadastrais, registro profissional técnico e parametrizações de faturamento
          </p>
        </div>

        {savedSuccess && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 animate-bounce">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Configurações salvas!</span>
          </div>
        )}
      </div>

      {/* Official Brand Identity & Logomarca Banner */}
      <div className="p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#eff4ff] gap-3">
          <div className="flex items-center gap-2 text-[#145E5B]">
            <span className="material-symbols-outlined text-[22px]">verified</span>
            <div>
              <h3 className="font-bold text-sm text-[#0b1c30]">Identidade Visual & Logomarca Oficial</h3>
              <p className="text-[11px] text-[#49607e]">Logomarca aplicada sem distorção no cabeçalho do sistema, orçamentos e relatórios em PDF.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl bg-[#004328] hover:bg-[#00331e] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              <span>Importar Logotipo Correto</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              onChange={handleLogoFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {logoUploadMsg && (
          <div className="p-3 rounded-xl bg-[#e6f7f2] border border-[#a3e8d7] text-[#004328] text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{logoUploadMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setLogoUploadMsg(null)}
              className="text-[#004328] hover:opacity-75"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Active Logo in Use Preview Card */}
        <div className="p-4 rounded-xl bg-[#f8fcfb] border-2 border-[#145E5B]/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="h-20 w-48 bg-white rounded-lg border border-[#c4dcff]/60 p-2 flex items-center justify-center shadow-xs">
              <img
                src={activeLogo || '/logo-consentra-horizontal.png'}
                alt="Logotipo Ativo no Orçamento"
                className="h-16 w-auto max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo-consentra.png';
                }}
              />
            </div>
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-xs font-bold text-[#004328]">Logotipo Ativo nos Orçamentos & O.S.</span>
                <span className="px-2 py-0.5 rounded-full bg-[#e6f7f2] text-[#004328] text-[10px] font-bold">
                  {activeLogo.startsWith('data:') ? 'Customizado / Importado' : 'Oficial Real'}
                </span>
              </div>
              <p className="text-[11px] text-[#49607e] mt-0.5">
                Exibido com proporção original (1.71:1) de alta definição, sem estiramento ou distorções.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-[#0b1c30] text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
              <span>Substituir Imagem</span>
            </button>
            {activeLogo !== DEFAULT_LOGO_URL && (
              <button
                type="button"
                onClick={handleResetLogo}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#fca5a5] hover:bg-[#fef2f2] text-[#b91c1c] text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                <span>Restaurar Padrão Real</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Section 1: Dados da Empresa Emissora */}
        <div className="p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#eff4ff] text-[#004328]">
            <span className="material-symbols-outlined text-[20px]">store</span>
            <h3 className="font-bold text-sm text-[#0b1c30]">1. Identificação da Empresa Emissora (Consentra)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#404942] mb-1">Razão Social Completa</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#404942] mb-1">CNPJ</label>
              <input
                type="text"
                value={profile.cnpj}
                onChange={(e) => setProfile({ ...profile, cnpj: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] font-mono focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#404942] mb-1">Inscrição Estadual</label>
              <input
                type="text"
                value={profile.ie}
                onChange={(e) => setProfile({ ...profile, ie: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] font-mono focus:bg-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#404942] mb-1">Endereço da Sede</label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#404942] mb-1">Telefone Comercial</label>
              <input
                type="text"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] font-mono focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#404942] mb-1">E-mail Comercial</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <SectionSaveButton
            label="Salvar 1. Identificação da Empresa"
            isSaving={savingSection === 'sec-1'}
            isSaved={savedSection === 'sec-1'}
            progress={savingSection === 'sec-1' ? savingProgress : 0}
            onClick={handleSaveSection1}
          />
        </div>

        {/* Section 2: Responsabilidade Técnica CREA */}
        <div className="p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#eff4ff] text-[#004328]">
            <span className="material-symbols-outlined text-[20px]">badge</span>
            <h3 className="font-bold text-sm text-[#0b1c30]">2. Responsável Técnico & Emissão de ART</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#404942] mb-1">Engenheiro / Responsável Técnico</label>
              <input
                type="text"
                value={profile.technicalResponsible}
                onChange={(e) => setProfile({ ...profile, technicalResponsible: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#404942] mb-1">Cargo Técnico</label>
              <input
                type="text"
                value={profile.technicalTitle}
                onChange={(e) => setProfile({ ...profile, technicalTitle: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <SectionSaveButton
            label="Salvar 2. Responsável Técnico & ART"
            isSaving={savingSection === 'sec-2'}
            isSaved={savedSection === 'sec-2'}
            progress={savingSection === 'sec-2' ? savingProgress : 0}
            onClick={handleSaveSection2}
          />
        </div>

        {/* Section 3: Dados Bancários para Faturamento */}
        <div className="p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#eff4ff] text-[#004328]">
            <span className="material-symbols-outlined text-[20px]">account_balance</span>
            <h3 className="font-bold text-sm text-[#0b1c30]">3. Dados Bancários para Pagamentos & PIX</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#404942] mb-1">Instituição Bancária</label>
              <input
                type="text"
                value={profile.bankName}
                onChange={(e) => setProfile({ ...profile, bankName: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#404942] mb-1">Agência e Conta</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={profile.bankAgency}
                  onChange={(e) => setProfile({ ...profile, bankAgency: e.target.value })}
                  placeholder="Agência"
                  className="w-1/2 h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] font-mono focus:bg-white focus:outline-none"
                />
                <input
                  type="text"
                  value={profile.bankAccount}
                  onChange={(e) => setProfile({ ...profile, bankAccount: e.target.value })}
                  placeholder="C/C"
                  className="w-1/2 h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] font-mono focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#404942] mb-1">Chave PIX Oficial</label>
              <input
                type="text"
                value={profile.pixKey}
                onChange={(e) => setProfile({ ...profile, pixKey: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-[#0b1c30] font-mono focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <SectionSaveButton
            label="Salvar 3. Dados Bancários & PIX"
            isSaving={savingSection === 'sec-3'}
            isSaved={savedSection === 'sec-3'}
            progress={savingSection === 'sec-3' ? savingProgress : 0}
            onClick={handleSaveSection3}
          />
        </div>

        {/* Section 4: Responsável pelo Orçamento */}
        <div className="p-6 rounded-2xl bg-white border border-[#e5eeff] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
            <div className="flex items-center gap-2 text-[#004328]">
              <span className="material-symbols-outlined text-[20px]">person_check</span>
              <div>
                <h3 className="font-bold text-sm text-[#0b1c30]">4. Responsável pelo Orçamento</h3>
                <p className="text-[11px] text-[#49607e]">
                  Cadastre as pessoas (apenas nome) vinculadas como menu em cascata na página de orçamentos e na emissão de Ordens de Serviço (O.S.).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetDefault}
              className="text-[11px] font-semibold text-[#49607e] hover:text-[#004328] flex items-center gap-1 underline"
            >
              <span className="material-symbols-outlined text-[14px]">restore</span>
              Restaurar Padrão
            </button>
          </div>

          {personSuccessMsg && (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2 border border-emerald-200">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
              <span>{personSuccessMsg}</span>
            </div>
          )}

          {/* Menu / Formulário de Cadastro de Pessoas (Apenas Nome) */}
          <div className="p-4 rounded-xl bg-[#f8faff] border border-[#dbe7ff] flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#004328]">person_add</span>
              <h4 className="text-xs font-bold text-[#0b1c30]">Cadastrar Nova Pessoa (Apenas Nome)</h4>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="Digite apenas o nome da pessoa (ex: Juliana Martins, Dr. Fernando Costa)..."
                className="flex-1 h-10 px-3.5 rounded-xl bg-white border border-[#cbd5e1] text-xs text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#004328] focus:border-transparent shadow-2xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPerson(e);
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddPerson}
                className="h-10 px-4 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>+ Cadastrar Pessoa</span>
              </button>
            </div>
            <p className="text-[10.5px] text-[#64748b]">
              Ao cadastrar, o nome é disponibilizado instantaneamente no menu em cascata <strong>1.2 Responsável Técnico</strong> dos orçamentos.
            </p>
          </div>

          {/* Lista de Pessoas Cadastradas */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#404942]">
              <span>Pessoas Cadastradas ({responsibles.length})</span>
              <span className="text-[11px] text-[#64748b]">Vinculadas à página de Orçamentos</span>
            </div>

            <div className="divide-y divide-[#eff4ff] border border-[#eff4ff] rounded-xl overflow-hidden bg-white">
              {responsibles.map((person, index) => {
                const isEditing = editingIndex === index;
                return (
                  <div
                    key={index}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#f8fafc] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#eff4ff] border border-[#c4dcff]/40 text-[#004328] font-bold text-xs flex items-center justify-center font-mono shrink-0">
                        {person.charAt(0).toUpperCase()}
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-8 px-2.5 text-xs rounded-lg border border-[#004328] focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(index);
                              if (e.key === 'Escape') setEditingIndex(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(index)}
                            className="p-1 rounded-md bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            title="Salvar"
                          >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingIndex(null)}
                            className="p-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                            title="Cancelar"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs font-bold text-[#0b1c30]">{person}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Menu em cascata ativo
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(index, person)}
                          className="p-1.5 rounded-lg text-[#49607e] hover:bg-[#eff4ff] hover:text-[#004328] transition-colors"
                          title="Editar nome"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePerson(person)}
                          className="p-1.5 rounded-lg text-[#ba1a1a] hover:bg-rose-50 transition-colors"
                          title="Excluir pessoa"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <SectionSaveButton
            label="Salvar 4. Lista de Responsáveis pelo Orçamento"
            isSaving={savingSection === 'sec-4'}
            isSaved={savedSection === 'sec-4'}
            progress={savingSection === 'sec-4' ? savingProgress : 0}
            onClick={handleSaveSection4}
          />
        </div>

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

        {/* Section 6: Configurações de Cabeçalho & Textos do Orçamento (Exclusivo Administrador) */}
        {isAdmin ? (
          <div className="p-6 rounded-2xl bg-amber-50/70 border-2 border-amber-300 shadow-[0_2px_8px_rgba(217,119,6,0.08)] flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200 text-[#0b1c30]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">admin_panel_settings</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#0b1c30]">6. Cabeçalho Oficial & Textos do Orçamento</h3>
                    <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Exclusivo Administrador</span>
                  </div>
                  <p className="text-[11px] text-[#49607e]">
                    Configure previamente o cabeçalho impresso da proposta e edite todos os textos padrões (introdução, escopo, objeto técnico, termos comerciais, eSocial e assinaturas).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdminModalTab('header');
                    setShowAdminModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">view_headline</span>
                  <span>Configurar Cabeçalho (Admin)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminModalTab('texts');
                    setShowAdminModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">edit_note</span>
                  <span>Editar Textos do Orçamento (Admin)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-white border border-amber-200">
                <h4 className="font-bold text-xs text-[#0b1c30] flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-600">article</span>
                  <span>Personalização de Textos & Cláusulas</span>
                </h4>
                <p className="text-[11px] text-[#49607e] leading-relaxed">
                  Permite definir textos personalizados ou restabelecer os textos padrão oficiais para o escopo, cronograma, condições de pagamento, cláusulas de eSocial e declaração de aceite.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-amber-200">
                <h4 className="font-bold text-xs text-[#0b1c30] flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-600">badge</span>
                  <span>Cabeçalho Oficial Impresso</span>
                </h4>
                <p className="text-[11px] text-[#49607e] leading-relaxed">
                  Ajuste a Razão Social, CNPJ, Inscrição Estadual, endereço da sede, dados bancários/PIX e o Responsável Técnico CREA exibidos no cabeçalho antes de gerar o orçamento ou imprimir.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/40 text-xs text-[#49607e] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#004328]">lock</span>
            <span>A configuração do cabeçalho da proposta e edição geral de textos padrão é de acesso exclusivo para usuários com perfil de <strong>Administrador</strong>.</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 animate-fadeIn">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
              <span>Alterações salvas com sucesso!</span>
            </div>
          )}
          <button
            type="submit"
            className={`px-6 py-2.5 rounded-xl text-white font-bold text-xs transition-all flex items-center gap-2 shadow-xs ${
              savedSuccess 
                ? 'bg-emerald-700 hover:bg-emerald-800' 
                : 'bg-[#004328] hover:bg-[#005c3e]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {savedSuccess ? 'done_all' : 'save'}
            </span>
            <span>{savedSuccess ? 'Salvo com Sucesso!' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>

      {/* Modal de Configuração Administrativa do Cabeçalho e Textos */}
      <AdminQuoteConfigModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        initialTab={adminModalTab}
        onApplyToQuote={() => {
          if (onShowToast) {
            onShowToast('Configurações globais de cabeçalho e textos atualizadas com sucesso!');
          }
        }}
      />

      {/* Modal de Edição de Usuário */}
      <EditUserModal
        isOpen={editingUser !== null}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onUserUpdated={(updated) => {
          setUsersList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          if (onShowToast) onShowToast(`Dados de ${updated.name} atualizados com sucesso!`);
        }}
      />

      {/* Modal de Alteração de Senha do Próprio Usuário */}
      {activeUser && (
        <ChangePasswordModal
          isOpen={showChangePassModal}
          onClose={() => setShowChangePassModal(false)}
          currentUser={activeUser}
          onSuccess={(msg) => {
            if (onShowToast) {
              onShowToast(msg);
            }
          }}
        />
      )}
    </div>
  );
};
