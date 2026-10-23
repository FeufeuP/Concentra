'use client';

import React, { useState } from 'react';
import { TabType } from './Sidebar';
import { AuthUser } from '@/lib/auth';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: TabType) => void;
  onToggleMobileMenu: () => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onOpenChangePassword?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  setActiveTab,
  onToggleMobileMenu,
  currentUser,
  onLogout,
  onOpenChangePassword,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userName = currentUser?.name || 'Washington Assis';
  const userInitials = currentUser?.initials || 'WA';
  const userRole = currentUser?.role || 'Responsável Técnico e Administrador';
  const userDoc = currentUser?.documentRegistration || 'CREA-SP 506.892/D';
  const userBg = currentUser?.avatarBg || 'bg-[#004328]';

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-white/95 backdrop-blur-xl z-30 shadow-[0_1px_8px_rgba(0,0,0,0.04)] px-4 sm:px-8 flex items-center justify-between gap-4 border-b border-[#eff4ff]">
      {/* Mobile hamburger & search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-[#49607e] hover:bg-[#eff4ff]"
          type="button"
          aria-label="Abrir Menu"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#49607e] text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar cliente, proposta ou CNPJ..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#eff4ff] text-[13px] text-[#0b1c30] placeholder:text-[#707971] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0d5c3a] transition-all border border-transparent focus:border-[#c4dcff]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#707971] hover:text-[#0b1c30]"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Primary CTA */}
        <button
          onClick={() => setActiveTab('novo-orcamento')}
          className="hidden sm:flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#004328] text-white text-[13px] font-semibold hover:bg-[#005c3e] transition-colors shadow-[0_1px_3px_0_rgba(10,37,64,0.05)] active:scale-98"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Criar Orçamento</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notificações"
            className="relative w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#49607e] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#ba1a1a] ring-2 ring-white"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#e5eeff] p-4 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#eff4ff]">
                <span className="font-bold text-sm text-[#0b1c30]">Notificações Comerciais</span>
                <span className="text-[10px] font-semibold bg-[#ffdad6] text-[#ba1a1a] px-2 py-0.5 rounded-full">3 Urgentes</span>
              </div>
              <div className="flex flex-col gap-2.5 pt-3">
                <div className="p-2.5 rounded-xl bg-[#eff4ff] text-xs flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#004328]">Sistema Conectado ao Supabase</span>
                    <span className="text-[10px] text-emerald-700 font-bold">Ativo</span>
                  </div>
                  <span className="text-[#49607e]">Banco de dados em tempo real operacional</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#eff4ff] text-xs flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#004328]">Novo sequencial pronto</span>
                    <span className="text-[10px] text-[#49607e]">Agora</span>
                  </div>
                  <span className="text-[#49607e]">Sequencial #319 pronto para emissão com IA de NRs</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 pl-2 py-1 rounded-xl hover:bg-[#eff4ff] transition-colors text-left"
            type="button"
          >
            <div className={`w-8 h-8 rounded-full ${userBg} text-white flex items-center justify-center font-bold text-xs shadow-2xs`}>
              {userInitials}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-[13px] font-semibold text-[#0b1c30] leading-tight">
                {userName}
              </span>
              <span className="text-[11px] text-[#49607e]">{userRole}</span>
            </div>
            <span className="material-symbols-outlined text-[#49607e] text-[18px] hidden md:block">
              expand_more
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#e5eeff] p-4 z-50">
              <div className="flex items-center gap-3 pb-3 border-b border-[#eff4ff]">
                <div className={`w-10 h-10 rounded-full ${userBg} text-white flex items-center justify-center font-bold text-sm shadow-xs`}>
                  {userInitials}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-sm text-[#0b1c30] truncate">{userName}</h4>
                  <p className="text-[11px] text-[#49607e] truncate">{userDoc}</p>
                  {currentUser?.email && (
                    <p className="text-[10px] text-[#64748b] truncate">{currentUser.email}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1 pt-3 text-xs text-[#0b1c30]">
                {onOpenChangePassword && (
                  <button
                    onClick={() => {
                      onOpenChangePassword();
                      setShowUserMenu(false);
                    }}
                    className="p-2 rounded-lg hover:bg-[#eff4ff] text-left flex items-center gap-2 text-[#004328] font-medium"
                  >
                    <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                    <span>Alterar Minha Senha</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveTab('configuracoes');
                    setShowUserMenu(false);
                  }}
                  className="p-2 rounded-lg hover:bg-[#eff4ff] text-left flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#49607e]">tune</span>
                  <span>Preferências do Sistema</span>
                </button>

                {onLogout && (
                  <>
                    <div className="my-1 border-t border-[#f1f5f9]" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 text-left flex items-center gap-2 text-[#ba1a1a] font-semibold transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      <span>Sair do Sistema (Logout)</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
