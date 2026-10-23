'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from './ui/ToastProvider';
import { getStoredCompanyProfile, saveStoredCompanyProfile, CompanyProfile } from '@/lib/company';
import { isSupabaseConfigured } from '@/lib/supabase';
import { LocalDataImportCard } from './LocalDataImportCard';
import { AuthUser, getCurrentUser, isAdminUser, canWrite } from '@/lib/auth';
import { AdminQuoteConfigModal } from './AdminQuoteConfigModal';
import { UsersSection } from './settings/UsersSection';
import { LogoSection } from './settings/LogoSection';
import { ResponsiblesSection } from './settings/ResponsiblesSection';
import { SectionSaveButton, useSectionSave } from './settings/SectionSave';

interface SettingsViewProps {
  responsiblePersons?: string[];
  onUpdateResponsiblePersons?: (list: string[]) => void;
  currentUser?: AuthUser | null;
  /** Chamado após importar dados locais para o servidor (recarrega os dados). */
  onDataImported?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  responsiblePersons: initialResponsiblePersons,
  onUpdateResponsiblePersons,
  currentUser,
  onDataImported,
}) => {
  const showToast = useToast();
  const [profile, setProfile] = useState<CompanyProfile>(() => getStoredCompanyProfile());
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Salvamento com barra de progresso individual por seção
  const { savingSection, savingProgress, savedSection, triggerSectionSave } = useSectionSave();

  // Controle de Modais Administrativos e Segurança
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminModalTab, setAdminModalTab] = useState<'header' | 'texts'>('header');

  const activeUser = currentUser || (typeof window !== 'undefined' ? getCurrentUser() : null);
  const isAdmin = isAdminUser(activeUser);
  const remoteMode = isSupabaseConfigured();
  const userCanWrite = canWrite(activeUser);

  // No modo Supabase, dados da empresa, textos e logotipo são exclusivos de administradores (RLS)
  const ensureCanEditCompany = (): boolean => {
    if (!remoteMode || isAdmin) return true;
    showToast('Somente administradores podem alterar os dados da empresa, textos e logotipo.', 'error');
    return false;
  };
  const ensureCanEditResponsibles = (): boolean => {
    if (userCanWrite) return true;
    showToast('Seu perfil (Auditor SST) tem acesso somente leitura.', 'error');
    return false;
  };

  useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<CompanyProfile>;
      if (customEvent.detail) {
        setProfile(customEvent.detail);
      }
    };

    window.addEventListener('consentra_company_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('consentra_company_profile_updated', handleProfileUpdate);
    };
  }, []);

  // 1. Identificação da Empresa Emissora
  const handleSaveSection1 = () => {
    if (!ensureCanEditCompany()) return;
    triggerSectionSave('sec-1', () => {
      const saved = saveStoredCompanyProfile(profile);
      setProfile(saved);
    }, '1. Identificação da Empresa salva com sucesso!');
  };

  // 2. Responsável Técnico & Emissão de ART
  const handleSaveSection2 = () => {
    if (!ensureCanEditCompany()) return;
    triggerSectionSave('sec-2', () => {
      const saved = saveStoredCompanyProfile(profile);
      setProfile(saved);
    }, '2. Responsável Técnico & ART salvos com sucesso!');
  };

  // 3. Dados Bancários para Pagamentos & PIX
  const handleSaveSection3 = () => {
    if (!ensureCanEditCompany()) return;
    triggerSectionSave('sec-3', () => {
      const saved = saveStoredCompanyProfile(profile);
      setProfile(saved);
    }, '3. Dados Bancários e Chave PIX salvos com sucesso!');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureCanEditCompany()) return;
    triggerSectionSave('global', () => {
      // 1. Salvar dados cadastrais e bancários da empresa
      const saved = saveStoredCompanyProfile(profile);
      setProfile(saved);

      // 2. Feedback visual no topo e no botão
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

      {remoteMode && (
        <LocalDataImportCard
          isAdmin={isAdmin}
          canWrite={userCanWrite}
          onImported={onDataImported}
        />
      )}

      {remoteMode && !isAdmin && (
        <div className="p-3 rounded-xl bg-[#eff4ff] border border-[#c4dcff]/60 text-xs text-[#49607e] flex items-start gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#004328] shrink-0">lock</span>
          <span>
            Dados da empresa, textos padrão do PDF e logotipo são compartilhados por toda a equipe e só podem ser alterados por administradores.
          </span>
        </div>
      )}

      <LogoSection remoteMode={remoteMode} ensureCanEdit={ensureCanEditCompany} />

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

        <ResponsiblesSection
          initialResponsibles={initialResponsiblePersons}
          onUpdateResponsiblePersons={onUpdateResponsiblePersons}
          ensureCanEdit={ensureCanEditResponsibles}
        />

        <UsersSection currentUser={currentUser} activeUser={activeUser} isAdmin={isAdmin} />

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
          showToast('Configurações globais de cabeçalho e textos atualizadas com sucesso!');
        }}
      />

    </div>
  );
};
