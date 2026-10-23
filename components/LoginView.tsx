'use client';

import React, { useState, useEffect } from 'react';
import { BrandLogo } from './ui/BrandLogo';
import { AuthUser, loginUser, requestPasswordReset, isRemoteAuth } from '@/lib/auth';
import { getStoredLogoUrl } from '@/lib/logo';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  /** Mensagem exibida ao abrir a tela (ex.: link de recuperação expirado). */
  initialError?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, initialError = null }) => {
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError);
  const [remoteAuth] = useState<boolean>(() => isRemoteAuth());
  const [isLoading, setIsLoading] = useState<boolean>(false);
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

  // Modal esqueci senha / recuperação por e-mail
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [recoveryEmail, setRecoveryEmail] = useState<string>('');
  const [recoveryStep, setRecoveryStep] = useState<'email' | 'sent'>('email');
  const [recoverySentMsg, setRecoverySentMsg] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState<boolean>(false);

  const handleOpenForgot = () => {
    setRecoveryEmail(identifier.includes('@') ? identifier : '');
    setRecoveryStep('email');
    setRecoverySentMsg(null);
    setRecoveryError(null);
    setShowForgotModal(true);
  };

  const handleRequestRecoveryEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoveryLoading(true);

    const res = await requestPasswordReset(recoveryEmail);
    setRecoveryLoading(false);

    if (res.success) {
      setRecoverySentMsg(res.message || 'Link de recuperação enviado.');
      setRecoveryStep('sent');
    } else {
      setRecoveryError(res.error || 'Não foi possível enviar o link para o e-mail informado.');
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await loginUser(identifier, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.error || 'Credenciais inválidas.');
      }
    } catch {
      setErrorMsg('Erro inesperado ao processar login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f7fb] flex flex-col justify-between items-center p-4 sm:p-8 selection:bg-[#004328] selection:text-white">
      {/* Top bar info */}
      <div className="w-full max-w-5xl flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-[#49607e]">Servidor Seguro Consentra SST</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#49607e]">
          <span className="font-mono bg-white px-2 py-0.5 rounded border border-[#e2e8f0]">Versão 2.4</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-4xl my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Side: Brand & Context */}
        <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
          {/* Logo with proper aspect ratio */}
          <div className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-[#e2e8f0] inline-flex items-center justify-center">
            <BrandLogo
              src={logoUrl}
              alt="Consentra Gestão SST"
              className="h-16 sm:h-20 w-auto max-w-[260px] object-contain"
              style={{ objectFit: 'contain', width: 'auto', maxHeight: '72px' }}
            />
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/70 text-[#004328] border border-emerald-300/60 mb-3 inline-block">
            Portal de Orçamentos & Gestão SST
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight leading-snug mb-3">
            Acesso Restrito ao Sistema Corporativo
          </h1>

          <p className="text-sm text-[#49607e] leading-relaxed max-w-md mb-6">
            Ambiente exclusivo para emissão técnica de orçamentos, propostas de SST, geração de Ordens de Serviço e contabilização em cascata nos dashboards.
          </p>

          {/* Quick info badges */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-md text-left">
            <div className="p-3 bg-white rounded-xl border border-[#e2e8f0] shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#004328] mb-1">
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                <span>Assinatura Digital</span>
              </div>
              <p className="text-[11px] text-[#64748b]">Vinculada aos responsáveis técnicos cadastrados.</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#e2e8f0] shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#004328] mb-1">
                <span className="material-symbols-outlined text-[16px]">lock_clock</span>
                <span>Ordens de Serviço</span>
              </div>
              <p className="text-[11px] text-[#64748b]">Geração sem valores financeiros para campo.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-[#e2e8f0] p-6 sm:p-8">
            
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#f1f5f9]">
              <div>
                <h2 className="text-lg font-bold text-[#0b1c30]">Identificação de Usuário</h2>
                <p className="text-xs text-[#64748b]">Entre com seu e-mail e senha de acesso</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#eff4ff] text-[#004328] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[20px]">key</span>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Formulário de Login */}
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                    E-mail ou Nome do Usuário
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-[18px]">
                      mail
                    </span>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="Digite seu e-mail ou nome de usuário"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#f8fafc] text-xs font-semibold text-[#0b1c30] border border-[#cbd5e1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#0b1c30]">
                      Senha de Acesso
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenForgot}
                      className="text-[11px] font-semibold text-[#004328] hover:underline"
                    >
                      Esqueceu a senha? Recuperar via e-mail
                    </button>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-[18px]">
                      lock
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="Digite sua senha de acesso"
                      className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#f8fafc] text-xs font-semibold text-[#0b1c30] border border-[#cbd5e1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328] focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0b1c30] p-1"
                      title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verificando credenciais...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">login</span>
                      <span>Entrar no Sistema</span>
                    </>
                  )}
                </button>

                {/* Novos acessos: somente pelo administrador */}
                <div className="pt-2 flex items-start gap-2 text-[11px] text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3">
                  <span className="material-symbols-outlined text-[16px] text-[#004328] shrink-0">info</span>
                  <span>
                    Novo na equipe? Os acessos são criados pelo administrador em <strong>Configurações &gt; Usuários</strong>.
                  </span>
                </div>
            </form>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="w-full max-w-5xl py-4 text-center text-xs text-[#94a3b8]">
        Consentra Gestão em Segurança e Saúde do Trabalho • Sistema de Orçamentos e O.S. Protegido
      </div>

      {/* Modal Esqueci a Senha / Recuperar via E-mail */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              title="Fechar"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#004328] flex items-center justify-center shrink-0 border border-emerald-100">
                <span className="material-symbols-outlined text-[24px]">mark_email_read</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-[#0b1c30]">Recuperar Senha por E-mail</h3>
                <p className="text-[11px] text-[#64748b]">Acesso aos usuários do sistema Consentra SST</p>
              </div>
            </div>

            {recoveryError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{recoveryError}</span>
              </div>
            )}

            {recoveryStep === 'email' && (
              <form onSubmit={handleRequestRecoveryEmail} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1">
                    Digite seu e-mail corporativo cadastrado:
                  </label>
                  <p className="text-[11px] text-[#64748b] mb-2">
                    Enviaremos um link seguro para que você possa cadastrar uma nova senha.
                  </p>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-[18px]">
                      mail
                    </span>
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="seu.email@consentra.com.br"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#f8fafc] text-xs font-semibold text-[#0b1c30] border border-[#cbd5e1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004328]"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-[11px] text-emerald-900 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-700 shrink-0 mt-0.5">info</span>
                  <span>
                    {remoteAuth
                      ? 'O link expira em 1 hora e só pode ser usado uma vez. Se não receber, verifique o spam ou peça ao administrador para redefinir sua senha.'
                      : 'Modo local (sem servidor): o envio de e-mail não está disponível. Peça ao administrador para redefinir sua senha em Configurações > Usuários.'}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  >
                    {recoveryLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        <span>Enviar Link</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {recoveryStep === 'sent' && (
              <div className="flex flex-col items-center text-center py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[32px]">forward_to_inbox</span>
                </div>
                <h4 className="text-base font-bold text-[#0b1c30] mb-1">Verifique seu e-mail</h4>
                <p className="text-xs text-[#64748b] max-w-xs mb-5">{recoverySentMsg}</p>
                <p className="text-[11px] text-[#64748b] max-w-xs mb-5">
                  Abra o link recebido neste mesmo navegador para cadastrar a nova senha.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full h-11 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  <span>Voltar ao Login</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
