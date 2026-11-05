'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TabType } from './Sidebar';
import { AuthUser } from '@/lib/auth';
import type { Quote } from '@/lib/types';
import { useConnectionStatus } from '@/lib/connection-status';
import { NotificationsMenu, ConnectionBadge } from '@/components/header/NotificationsMenu';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: TabType) => void;
  onToggleMobileMenu: () => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onOpenChangePassword?: () => void;
  quotes: Quote[];
  onOpenQuote: (quoteId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  setActiveTab,
  onToggleMobileMenu,
  currentUser,
  onLogout,
  onOpenChangePassword,
  quotes,
  onOpenQuote,
}) => {
  const connection = useConnectionStatus();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu do usuário ao clicar fora ou pressionar Esc (antes ele ficava
  // aberto sobre o conteúdo até o usuário clicar exatamente no avatar de novo).
  useEffect(() => {
    if (!showUserMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowUserMenu(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showUserMenu]);

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

        {/* Status da conexão + notificações calculadas dos orçamentos */}
        <ConnectionBadge connection={connection} />
        <NotificationsMenu
          userId={currentUser?.id || 'anon'}
          quotes={quotes}
          connection={connection}
          onOpenQuote={onOpenQuote}
        />

        {/* User profile */}
        <div className="relative" ref={userMenuRef}>
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
