'use client';

import React, { useState } from 'react';
import { getPendingLocalData, importLocalData, markLocalImportDone, LocalImportResult, PendingLocalData } from '@/lib/local-import';

interface LocalDataImportCardProps {
  isAdmin: boolean;
  canWrite: boolean;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
  /** Chamado após a importação, para recarregar os dados do servidor. */
  onImported?: () => void;
}

/**
 * Cartão exibido em Configurações (modo Supabase) quando existem orçamentos,
 * clientes ou configurações salvos somente neste navegador.
 */
export const LocalDataImportCard: React.FC<LocalDataImportCardProps> = ({ isAdmin, canWrite, onShowToast, onImported }) => {
  const [pending, setPending] = useState<PendingLocalData | null>(() => getPendingLocalData());
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<LocalImportResult | null>(null);

  if (!pending && !result) return null;

  const handleImport = async () => {
    if (!canWrite) return;
    setIsImporting(true);
    try {
      const res = await importLocalData(isAdmin);
      setResult(res);
      setPending(getPendingLocalData());
      if (res.errors.length === 0) {
        onShowToast?.(
          `Importação concluída: ${res.quotesImported} orçamento(s) e ${res.clientsImported} cliente(s) enviados ao servidor.`
        );
      } else {
        onShowToast?.(`Importação com ${res.errors.length} erro(s). Veja os detalhes em Configurações.`, 'error');
      }
      onImported?.();
    } finally {
      setIsImporting(false);
    }
  };

  const handleDiscard = () => {
    if (!confirm('Ignorar os dados salvos neste navegador? Eles não serão enviados ao servidor (nada é apagado do navegador).')) return;
    markLocalImportDone();
    setPending(null);
    setResult(null);
  };

  return (
    <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-[24px] text-amber-700 shrink-0">cloud_upload</span>
        <div className="flex-1">
          <h3 className="font-bold text-sm text-[#0b1c30]">Dados salvos somente neste navegador</h3>
          {pending ? (
            <p className="text-xs text-[#49607e] mt-1 leading-relaxed">
              Encontramos <strong>{pending.quotes.length} orçamento(s)</strong> e <strong>{pending.clients.length} cliente(s)</strong>
              {pending.settingsLabels.length > 0 && (
                <> e configurações personalizadas ({pending.settingsLabels.join(', ')})</>
              )}{' '}
              gravados apenas neste navegador, antes da conexão com o banco de dados. Importe-os para que fiquem disponíveis para toda a equipe.
            </p>
          ) : (
            <p className="text-xs text-emerald-800 mt-1 font-semibold">Todos os dados locais foram importados.</p>
          )}
          {pending && pending.settingsLabels.length > 0 && !isAdmin && (
            <p className="text-[11px] text-amber-800 mt-1">
              As configurações (empresa, textos, logotipo) só podem ser importadas por um administrador.
            </p>
          )}
          <p className="text-[11px] text-[#64748b] mt-1">
            Orçamentos cujo número já exista no servidor recebem um novo número. É seguro repetir a importação: itens já enviados são ignorados.
          </p>
        </div>
      </div>

      {result && (
        <div className="p-3 rounded-xl bg-white border border-amber-100 text-xs text-[#0b1c30] flex flex-col gap-1">
          <span>
            ✔ {result.quotesImported} orçamento(s) importado(s){result.quotesSkipped > 0 && `, ${result.quotesSkipped} já existente(s)`};{' '}
            {result.clientsImported} cliente(s) novo(s)
            {result.settingsImported.length > 0 && `; configurações: ${result.settingsImported.join(', ')}`}.
          </span>
          {result.renumbered.length > 0 && <span>Renumerados: {result.renumbered.join(', ')}</span>}
          {result.errors.map((err) => (
            <span key={err} className="text-[#ba1a1a]">✖ {err}</span>
          ))}
        </div>
      )}

      {pending && (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={isImporting}
            className="px-4 py-2 rounded-xl bg-white border border-amber-200 text-[#0b1c30] text-xs font-semibold hover:bg-amber-100 disabled:opacity-50"
          >
            Ignorar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || !canWrite}
            title={!canWrite ? 'Seu perfil é somente leitura' : undefined}
            className="px-4 py-2 rounded-xl bg-[#004328] text-white text-xs font-semibold hover:bg-[#0a5234] flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${isImporting ? 'animate-spin' : ''}`}>
              {isImporting ? 'sync' : 'upload'}
            </span>
            {isImporting ? 'Importando...' : 'Importar para o servidor'}
          </button>
        </div>
      )}
    </div>
  );
};
