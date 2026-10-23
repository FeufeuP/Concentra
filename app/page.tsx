'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { LoginView } from '@/components/LoginView';
import { RecoveryPasswordModal } from '@/components/RecoveryPasswordModal';
import { Workspace } from '@/components/Workspace';
import { useToast } from '@/components/ui/ToastProvider';
import { AppDataProvider } from '@/lib/store/AppDataContext';
import { AuthUser, getCurrentUser, logoutUser, initAuth, onAuthEvent, isRemoteAuth } from '@/lib/auth';

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/**
 * Página única do sistema: valida a sessão e decide entre login e área de trabalho.
 * Dados → `lib/store/AppDataContext` (via `lib/repository`); interface → `components/Workspace`.
 */
export default function HomePage() {
  const isMounted = useIsMounted();
  const showToast = useToast();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentUser());
  // No modo Supabase a sessão é validada no servidor antes de exibir o sistema
  const [authChecked, setAuthChecked] = useState<boolean>(() => !isRemoteAuth());
  const [recoveryMode, setRecoveryMode] = useState<boolean>(false);
  const [authLinkError, setAuthLinkError] = useState<string | null>(null);

  // Valida a sessão e acompanha eventos de autenticação (logout, recuperação de senha)
  useEffect(() => {
    let alive = true;
    initAuth().then((res) => {
      if (!alive) return;
      setCurrentUser(res.user);
      setRecoveryMode(res.recovery);
      setAuthLinkError(res.linkError || null);
      setAuthChecked(true);
    });
    const unsubscribe = onAuthEvent((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
        setCurrentUser(null);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });
    const handleAuthUpdated = (e: Event) => {
      setCurrentUser((e as CustomEvent<AuthUser | null>).detail || null);
    };
    window.addEventListener('consentra_auth_updated', handleAuthUpdated);
    return () => {
      alive = false;
      unsubscribe();
      window.removeEventListener('consentra_auth_updated', handleAuthUpdated);
    };
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    showToast('Sessão encerrada com sucesso.');
  };

  if (!isMounted || !authChecked) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-[#004328] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-[#004328] tracking-wide">Consentra SST</p>
        <p className="text-xs text-[#50606e]">Carregando sistema de orçamentos...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f8f9ff]">
        <LoginView
          initialError={authLinkError}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            showToast(`Bem-vindo, ${user.name}!`);
          }}
        />
        {recoveryMode && (
          <RecoveryPasswordModal
            onComplete={(user) => {
              setRecoveryMode(false);
              setCurrentUser(user);
              showToast('Nova senha cadastrada com sucesso! Bem-vindo de volta.');
            }}
            onCancel={() => setRecoveryMode(false)}
          />
        )}
      </div>
    );
  }

  // key: trocar de usuário remonta o store e descarta os dados do anterior
  return (
    <AppDataProvider key={currentUser.id} user={currentUser}>
      <Workspace onLogout={handleLogout} />
    </AppDataProvider>
  );
}
