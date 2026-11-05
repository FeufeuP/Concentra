'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BrandLogo } from '../ui/BrandLogo';
import { useToast } from '../ui/ToastProvider';
import { getStoredLogoUrl, saveStoredLogoUrl, clearStoredLogoUrl, DEFAULT_LOGO_URL, MAX_LOCAL_LOGO_BYTES } from '@/lib/logo';
import { uploadLogoToStorage } from '@/lib/supabase';

interface LogoSectionProps {
  /** Supabase: envia ao Storage. Local: guarda em base64 no navegador. */
  remoteMode: boolean;
  /** Verifica permissão (no Supabase, somente administradores). */
  ensureCanEdit: () => boolean;
}

/** Configurações: identidade visual e logotipo usado no sistema, orçamentos e O.S. */
export const LogoSection: React.FC<LogoSectionProps> = ({ remoteMode, ensureCanEdit }) => {
  const showToast = useToast();
  // Logotipo Corporativo Customizado
  const [activeLogo, setActiveLogo] = useState<string>(getStoredLogoUrl());
  const [logoUploadMsg, setLogoUploadMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);

  const flashLogoMsg = (msg: string) => {
    setLogoUploadMsg(msg);
    setTimeout(() => setLogoUploadMsg(null), 4000);
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Permite selecionar o mesmo arquivo novamente
    e.target.value = '';
    if (!file) return;
    if (!ensureCanEdit()) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      showToast('Selecione uma imagem PNG, JPG ou WebP.', 'error');
      return;
    }

    if (remoteMode) {
      setIsUploadingLogo(true);
      const res = await uploadLogoToStorage(file);
      setIsUploadingLogo(false);
      if (!res.success) {
        showToast(`Logotipo não enviado: ${res.error}`, 'error');
        return;
      }
      saveStoredLogoUrl(res.data);
      setActiveLogo(res.data);
      flashLogoMsg('Logotipo enviado ao servidor! Aplicado em todos os orçamentos e Ordens de Serviço.');
      return;
    }

    // Modo local: base64 no navegador (limite para não estourar a cota do localStorage)
    if (file.size > MAX_LOCAL_LOGO_BYTES) {
      showToast('Arquivo muito grande para salvar no navegador (máximo 1 MB). Reduza a imagem e tente novamente.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;
      if (!saveStoredLogoUrl(dataUrl)) {
        showToast('Não foi possível salvar o logotipo: armazenamento do navegador cheio.', 'error');
        return;
      }
      setActiveLogo(dataUrl);
      flashLogoMsg('Logotipo importado com sucesso! Aplicado em todos os orçamentos e Ordens de Serviço.');
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    if (!ensureCanEdit()) return;
    clearStoredLogoUrl();
    setActiveLogo(DEFAULT_LOGO_URL);
    flashLogoMsg('Logotipo restaurado para a versão oficial real padrão.');
  };

  useEffect(() => {
    const onLogo = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setActiveLogo(detail || DEFAULT_LOGO_URL);
    };
    window.addEventListener('consentra_logo_updated', onLogo);
    return () => window.removeEventListener('consentra_logo_updated', onLogo);
  }, []);

  return (
    <>
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
              disabled={isUploadingLogo}
              className="px-3.5 py-1.5 rounded-xl bg-[#004328] hover:bg-[#00331e] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs disabled:opacity-60 disabled:cursor-wait"
            >
              <span className={`material-symbols-outlined text-[16px] ${isUploadingLogo ? 'animate-spin' : ''}`}>{isUploadingLogo ? 'sync' : 'upload_file'}</span>
              <span>{isUploadingLogo ? 'Enviando...' : 'Importar Logotipo Correto'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
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
              <BrandLogo
                src={activeLogo}
                alt="Logotipo Ativo no Orçamento"
                className="h-16 w-auto max-w-full object-contain"
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
                Exibido sempre na proporção original da imagem, sem estiramento ou distorções.
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
    </>
  );
};
