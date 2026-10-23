'use client';

import React, { useState, useEffect } from 'react';
import { DIRECT_LOGO_URL } from '@/lib/mock-data';
import { AuthUser } from '@/lib/auth';
import { getStoredLogoUrl } from '@/lib/logo';

export type TabType = 'dashboard' | 'orcamentos' | 'relatorios' | 'novo-orcamento' | 'visualizar-pdf' | 'clientes' | 'produtos-servicos' | 'configuracoes';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  quotesCount: number;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  quotesCount,
  isMobileOpen,
  setIsMobileOpen,
  currentUser,
  onLogout,
}) => {
  const [logoUrl, setLogoUrl] = useState<string>(() => getStoredLogoUrl());

  useEffect(() => {
    const handleLogoUpdated = (e: CustomEvent<string>) => {
      setLogoUrl(e.detail || getStoredLogoUrl());
    };
    window.addEventListener('consentra_logo_updated', handleLogoUpdated as EventListener);
    return () => {
      window.removeEventListener('consentra_logo_updated', handleLogoUpdated as EventListener);
    };
  }, []);

  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: 'dashboard',
    },
    {
      id: 'orcamentos' as TabType,
      label: 'Orçamentos',
      icon: 'folder_open',
      badge: quotesCount > 0 ? quotesCount : undefined,
    },
    {
      id: 'relatorios' as TabType,
      label: 'Relatórios (PDF)',
      icon: 'analytics',
    },
    {
      id: 'clientes' as TabType,
      label: 'Clientes',
      icon: 'business',
    },
    {
      id: 'produtos-servicos' as TabType,
      label: 'Serviços',
      icon: 'health_and_safety',
    },
    {
      id: 'configuracoes' as TabType,
      label: 'Configurações',
      icon: 'settings',
    },
  ];

  const handleNavClick = (tab: TabType) => {
    setActiveTab(tab);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-white z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-[#eff4ff] transition-transform duration-200 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col">
          {/* Logo Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-[#f8f9ff]">
            <div
              className="flex items-center cursor-pointer group py-1"
              onClick={() => handleNavClick('dashboard')}
            >
              <img
                src={logoUrl || '/logo-consentra-horizontal.png'}
                alt="Consentra Segurança do Trabalho"
                className="h-10 w-auto max-w-[210px] object-contain object-left group-hover:scale-[1.02] transition-transform"
                style={{ objectFit: 'contain', width: 'auto', maxHeight: '40px' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo-consentra-horizontal.png';
                }}
              />
            </div>

            {/* Mobile close */}
            {setIsMobileOpen && (
              <button
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden text-[#49607e] p-1 rounded-lg hover:bg-[#eff4ff]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </div>

          {/* Primary Action Button */}
          <div className="px-4 pt-4">
            <button
              onClick={() => handleNavClick('novo-orcamento')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0d5c3a] text-white text-[13px] font-semibold hover:bg-[#005c3e] transition-colors shadow-[0_1px_3px_0_rgba(10,37,64,0.05)] active:scale-98"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Novo Orçamento</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-4 pt-5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all text-[13px] font-medium ${
                    isActive
                      ? 'bg-[#e5eeff] text-[#004328] font-semibold shadow-xs'
                      : 'text-[#404942] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        isActive ? 'text-[#004328]' : 'text-[#49607e]'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                        isActive
                          ? 'bg-[#004328] text-white'
                          : 'bg-[#c4dcff] text-[#49617f]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logged in User Bar */}
        {currentUser && (
          <div className="px-4 pt-2">
            <div className="p-2.5 rounded-xl bg-white border border-[#e2e8f0] shadow-2xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className={`w-8 h-8 rounded-lg ${currentUser.avatarBg || 'bg-[#004328]'} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                  {currentUser.initials}
                </div>
                <div className="overflow-hidden">
                  <span className="text-xs font-bold text-[#0b1c30] block truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-[#49607e] block truncate">
                    {currentUser.role}
                  </span>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sair do Sistema"
                  className="p-1.5 rounded-lg text-[#64748b] hover:text-[#ba1a1a] hover:bg-red-50 transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
