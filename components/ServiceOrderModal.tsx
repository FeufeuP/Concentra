'use client';

import React, { useState, useEffect } from 'react';
import { Quote } from '@/lib/types';
import { getStoredCompanyProfile, CompanyProfile } from '@/lib/company';
import { getStoredLogoUrl } from '@/lib/logo';
import { 
  getStoredResponsibles, 
  addStoredResponsible, 
  removeStoredResponsible 
} from '@/lib/responsibles';

interface ServiceOrderModalProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  responsiblePersons: string[];
}

export const ServiceOrderModal: React.FC<ServiceOrderModalProps> = ({
  quote,
  isOpen,
  onClose,
  responsiblePersons = [],
}) => {
  const [responsibles, setResponsibles] = useState<string[]>(() => {
    const list = responsiblePersons.length > 0 ? responsiblePersons : getStoredResponsibles();
    return list.filter(n => n !== 'Carlos Eduardo');
  });

  const [responsibleName, setResponsibleName] = useState<string>(() => {
    const defaultResp = quote?.responsibleTech || responsibles[0] || 'Washington Assis';
    return defaultResp === 'Carlos Eduardo' ? 'Washington Assis' : defaultResp;
  });

  const [executionDeadline, setExecutionDeadline] = useState<string>(() =>
    quote?.executionForecast || 'A COMBINAR'
  );
  const [startDate, setStartDate] = useState<string>(
    new Date().toLocaleDateString('pt-BR')
  );
  const [logoUrl, setLogoUrl] = useState<string>(() => getStoredLogoUrl());
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => getStoredCompanyProfile());
  
  // Responsibles management modal state
  const [isManagingResponsibles, setIsManagingResponsibles] = useState(false);
  const [newResponsibleInput, setNewResponsibleInput] = useState('');

  // Sincronização e classes de controle de impressão
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('os-modal-open');
      setCompanyProfile(getStoredCompanyProfile());
      setLogoUrl(getStoredLogoUrl());
    } else {
      document.body.classList.remove('os-modal-open');
    }
    return () => {
      document.body.classList.remove('os-modal-open');
    };
  }, [isOpen]);

  useEffect(() => {
    const handleLogoUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setLogoUrl(customEvent.detail);
      } else {
        setLogoUrl(getStoredLogoUrl());
      }
    };
    window.addEventListener('consentra_logo_updated', handleLogoUpdate);
    return () => window.removeEventListener('consentra_logo_updated', handleLogoUpdate);
  }, []);

  useEffect(() => {
    const handleCompanyUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<CompanyProfile>;
      if (customEvent.detail) {
        setCompanyProfile(customEvent.detail);
      } else {
        setCompanyProfile(getStoredCompanyProfile());
      }
    };
    window.addEventListener('consentra_company_profile_updated', handleCompanyUpdate);
    return () => window.removeEventListener('consentra_company_profile_updated', handleCompanyUpdate);
  }, []);

  useEffect(() => {
    const handleRespUpdate = (e: Event) => {
      const custom = e as CustomEvent<string[]>;
      if (custom.detail && Array.isArray(custom.detail)) {
        const filtered = custom.detail.filter(n => n !== 'Carlos Eduardo');
        setResponsibles(filtered);
      }
    };
    window.addEventListener('consentra_responsibles_updated', handleRespUpdate);
    return () => window.removeEventListener('consentra_responsibles_updated', handleRespUpdate);
  }, []);

  if (!isOpen || !quote) return null;

  const osNumber = `OS-${quote.numberOnly || 320}/${new Date().getFullYear()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsapp = () => {
    const safeQuoteId = String(quote.id || quote.numberOnly || '').replace('#', '');
    const text = encodeURIComponent(
      `*ORDEM DE SERVIÇO DE SST - ${osNumber}*\n\n` +
      `*Cliente:* ${quote.clientName}\n` +
      `*CNPJ:* ${quote.cnpj}\n` +
      `*Responsável Técnico a Executar:* ${responsibleName}\n` +
      `*Prazo de Execução:* ${executionDeadline}\n` +
      `*Escopo:* ${quote.items.map(i => `${i.quantity}x ${i.title}`).join(', ')}\n\n` +
      `O.S. emitida com base na proposta aprovada Nº ${safeQuoteId}.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleAddNewResponsible = () => {
    if (!newResponsibleInput.trim()) return;
    const updated = addStoredResponsible(newResponsibleInput.trim());
    setResponsibles(updated);
    setResponsibleName(newResponsibleInput.trim());
    setNewResponsibleInput('');
  };

  const handleRemoveResponsible = (name: string) => {
    const updated = removeStoredResponsible(name);
    setResponsibles(updated);
    if (responsibleName === name && updated.length > 0) {
      setResponsibleName(updated[0]);
    }
  };

  return (
    <div
      id="service-order-modal-root"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:m-0 print:bg-transparent print:static print:block"
    >
      <div
        id="service-order-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-[#e5eeff] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:h-auto print:border-none print:shadow-none print:rounded-none print:w-full print:m-0 print:p-0"
      >
        
        {/* Modal Top Command Bar (Hidden during Print) */}
        <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#004328] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[20px]">assignment</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0b1c30]">
                  Ordem de Serviços (O.S.) — {osNumber}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Orçamento Aprovado
                </span>
              </div>
              <p className="text-xs text-[#64748b]">
                Documento operacional sem valores monetários para a equipe técnica e execução
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsapp}
              title="Compartilhar via WhatsApp"
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 border border-emerald-200 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">share</span>
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white border border-[#cbd5e1] hover:bg-[#f1f5f9] text-[#64748b] flex items-center justify-center transition-colors ml-1"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Configuration Strip (Hidden during Print) */}
        <div className="px-6 py-3 bg-[#eff4ff]/70 border-b border-[#dbe7ff] flex flex-col gap-3 text-xs print:hidden shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-[#004328]">
                  Responsável Técnico (O.S.):
                </label>
                <button
                  type="button"
                  onClick={() => setIsManagingResponsibles(!isManagingResponsibles)}
                  className="text-[10px] text-[#004328] hover:underline font-bold"
                >
                  {isManagingResponsibles ? 'Fechar Gestão' : '+ Gerenciar Técnicos'}
                </button>
              </div>
              <select
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-white border border-[#cbd5e1] text-xs font-semibold text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#004328]"
              >
                {responsibles.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-[#004328]">
                  Prazo de Execução:
                </label>
                <div className="flex items-center gap-1">
                  {['A COMBINAR', '05 dias', '10 dias', '15 dias'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setExecutionDeadline(opt === '05 dias' ? '05 dias úteis' : opt === '10 dias' ? '10 dias úteis' : opt === '15 dias' ? '15 dias úteis' : opt)}
                      className={`text-[9.5px] px-1.5 py-0.5 rounded border ${
                        executionDeadline.includes(opt)
                          ? 'bg-[#004328] text-white border-[#004328]'
                          : 'bg-white text-[#004328] border-[#cbd5e1] hover:bg-[#eff4ff]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={executionDeadline}
                onChange={(e) => setExecutionDeadline(e.target.value)}
                placeholder="Ex: A COMBINAR ou 15 dias úteis"
                className="w-full h-8 px-2.5 rounded-lg bg-white border border-[#cbd5e1] text-xs text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#004328]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#004328] mb-1">
                Data de Abertura da O.S.:
              </label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-white border border-[#cbd5e1] text-xs text-[#0b1c30] font-mono focus:outline-none focus:ring-1 focus:ring-[#004328]"
              />
            </div>
          </div>

          {/* Quick Responsibles CRUD manager */}
          {isManagingResponsibles && (
            <div className="p-3 bg-white rounded-xl border border-emerald-300 flex flex-col gap-2">
              <span className="font-bold text-[#004328] text-[11px]">
                Cadastro e Gestão de Responsáveis Técnicos
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newResponsibleInput}
                  onChange={(e) => setNewResponsibleInput(e.target.value)}
                  placeholder="Nome e título do novo responsável (ex: Eng. Marcos Lima)"
                  className="flex-1 h-8 px-2.5 rounded-lg bg-[#eff4ff] border border-[#cbd5e1] text-xs focus:outline-none focus:ring-1 focus:ring-[#004328]"
                />
                <button
                  type="button"
                  onClick={handleAddNewResponsible}
                  className="px-3 h-8 rounded-lg bg-[#004328] text-white font-bold text-xs hover:bg-[#005c3e]"
                >
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {responsibles.map((resp) => (
                  <span
                    key={resp}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#eff4ff] text-[#004328] text-[11px] font-semibold border border-emerald-200"
                  >
                    {resp}
                    {responsibles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveResponsible(resp)}
                        className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs"
                        title="Remover este responsável"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Printable OS Document Body */}
        <div
          id="service-order-printable"
          className="p-6 sm:p-8 overflow-y-auto flex-1 text-[#0b1c30] bg-white print:p-0 print:m-0 print:overflow-hidden print:w-full print:max-w-[190mm] print:box-border print:text-[8pt] print:leading-tight"
          style={{
            pageBreakAfter: 'avoid',
            breakAfter: 'avoid',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}
        >
          {/* Header Consentra */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#004328] print:pb-1.5 print:gap-2">
            <div className="flex items-center gap-3">
              <img
                src={logoUrl || '/logo-consentra-horizontal.png'}
                alt="Consentra Gestão de SST"
                className="h-12 sm:h-14 w-auto max-w-[210px] object-contain print:h-10 print:max-h-10"
                style={{ objectFit: 'contain', width: 'auto', maxHeight: '48px' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo-consentra-horizontal.png';
                }}
              />
              <div>
                <h1 className="text-lg font-black tracking-tight text-[#004328] print:text-[13pt] print:leading-none">
                  {companyProfile.tradeName || companyProfile.name || 'CONSENTRA'}
                </h1>
                <p className="text-[10px] font-semibold text-[#49607e] uppercase tracking-wider print:text-[7pt] print:mt-0.5">
                  Segurança, Medicina Ocupacional & Higiene Ocupacional
                </p>
                <p className="text-[9px] text-[#64748b] font-mono print:text-[6.5pt] print:leading-tight">
                  CNPJ: {companyProfile.cnpj} • Telefone: {companyProfile.phone}
                  {companyProfile.email ? ` • E-mail: ${companyProfile.email}` : ''}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="inline-block px-2.5 py-0.5 bg-[#004328] text-white text-[11px] font-black tracking-wider uppercase rounded shadow-2xs print:text-[7.5pt] print:py-0.5 print:px-2">
                ORDEM DE SERVIÇO DE SST
              </span>
              <div className="font-mono text-sm font-bold text-[#004328] mt-1 print:text-[9.5pt] print:mt-0.5">
                {osNumber}
              </div>
              <div className="text-[10px] text-[#49607e] print:text-[6.5pt]">
                Origem: Proposta Técnica {String(quote.id || quote.numberOnly || '').replace('#', '')} (Aprovada)
              </div>
            </div>
          </div>

          {/* Destaque Operacional: Responsável a Executar & Prazo */}
          <div className="mt-3 p-3 rounded-xl bg-[#f8fafc] border border-[#004328]/30 grid grid-cols-1 sm:grid-cols-3 gap-3 print:mt-1.5 print:p-2 print:gap-2 print:rounded-md">
            <div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-[#004328] block print:text-[6.5pt]">
                Responsável a Executar a O.S.
              </span>
              <span className="text-xs font-bold text-[#0b1c30] block mt-0.5 print:text-[8pt]">
                {responsibleName}
              </span>
              <span className="text-[10px] text-[#64748b] print:text-[6.5pt]">
                Corpo Técnico Credenciado SST
              </span>
            </div>

            <div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-[#004328] block print:text-[6.5pt]">
                Prazo de Execução
              </span>
              <span className="text-xs font-bold text-[#004328] font-mono block mt-0.5 print:text-[8pt]">
                {executionDeadline}
              </span>
              <span className="text-[10px] text-[#64748b] print:text-[6.5pt]">
                A partir da autorização / alinhamento
              </span>
            </div>

            <div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-[#004328] block print:text-[6.5pt]">
                Data de Emissão da O.S.
              </span>
              <span className="text-xs font-bold text-[#0b1c30] font-mono block mt-0.5 print:text-[8pt]">
                {startDate}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold print:text-[6.5pt]">
                Status: Liberada para Execução
              </span>
            </div>
          </div>

          {/* Dados da Empresa Contratante */}
          <div className="mt-3 print:mt-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#004328] pb-1 border-b border-[#e2e8f0] flex items-center gap-1.5 print:text-[8pt] print:pb-0.5">
              <span className="material-symbols-outlined text-[15px] print:text-[12px]">domain</span>
              1. Dados da Empresa Contratante (Cliente)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs print:mt-1 print:gap-x-4 print:gap-y-1 print:text-[7.5pt]">
              <div>
                <span className="text-[#64748b] block text-[10px] print:text-[6.5pt]">Razão Social:</span>
                <span className="font-bold text-[#0b1c30]">{quote.clientName}</span>
              </div>
              <div>
                <span className="text-[#64748b] block text-[10px] print:text-[6.5pt]">CNPJ / Inscrição Estadual:</span>
                <span className="font-mono font-semibold text-[#0b1c30]">
                  {quote.cnpj} {quote.ie ? `• IE: ${quote.ie}` : ''}
                </span>
              </div>
              <div>
                <span className="text-[#64748b] block text-[10px] print:text-[6.5pt]">Endereço Operacional / Local de Execução:</span>
                <span className="text-[#0b1c30]">{quote.operationalAddress}</span>
              </div>
              <div>
                <span className="text-[#64748b] block text-[10px] print:text-[6.5pt]">Contato / Representante:</span>
                <span className="text-[#0b1c30] font-medium">
                  {quote.contactPerson} {quote.contactPhone ? `(${quote.contactPhone})` : ''}
                </span>
              </div>
              <div>
                <span className="text-[#64748b] block text-[10px] print:text-[6.5pt]">Enquadramento & Grau de Risco:</span>
                <span className="font-semibold text-[#004328]">{quote.riskGrade}</span>
              </div>
              <div>
                <span className="text-[#64748b] block text-[10px] print:text-[6.5pt]">E-mail para Alinhamento:</span>
                <span className="font-mono text-[#0b1c30]">{quote.contactEmail}</span>
              </div>
            </div>
          </div>

          {/* Escopo Técnico a Executar - SEM VALORES */}
          <div className="mt-3 print:mt-1.5">
            <div className="flex items-center justify-between pb-1 border-b border-[#e2e8f0] print:pb-0.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#004328] flex items-center gap-1.5 print:text-[8pt]">
                <span className="material-symbols-outlined text-[15px] print:text-[12px]">construction</span>
                2. Atividades e Serviços a Serem Executados
              </h3>
              <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 print:text-[6.5pt] print:py-0">
                Sem valores monetários — Exclusivo Operacional / Técnico
              </span>
            </div>

            <div className="mt-2 overflow-x-auto print:mt-1">
              <table className="w-full text-left text-xs border border-[#e2e8f0] rounded-lg overflow-hidden print:text-[7.5pt] print:rounded-none">
                <thead className="bg-[#f8fafc] text-[#475569] font-bold border-b border-[#e2e8f0]">
                  <tr>
                    <th className="py-1.5 px-2.5 w-10 text-center print:py-1 print:px-1.5">Item</th>
                    <th className="py-1.5 px-2.5 print:py-1 print:px-1.5">Serviço Técnico / Documentação</th>
                    <th className="py-1.5 px-2.5 print:py-1 print:px-1.5">Descrição Detalhada das Atividades</th>
                    <th className="py-1.5 px-2.5 w-16 text-center print:py-1 print:px-1.5">Unidade</th>
                    <th className="py-1.5 px-2.5 w-12 text-center print:py-1 print:px-1.5">Qtd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {quote.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-[#f8fafc]/50">
                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-[#004328] print:py-1 print:px-1.5">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-1.5 px-2.5 font-bold text-[#0b1c30] print:py-1 print:px-1.5">
                        {item.title}
                      </td>
                      <td className="py-1.5 px-2.5 text-[#475569] text-[10px] leading-tight print:text-[7pt] print:py-1 print:px-1.5">
                        {item.description || 'Elaboração técnica, inspeção e emissão de documentação de conformidade SST.'}
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-mono text-[#64748b] print:py-1 print:px-1.5">
                        {item.unit}
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-[#0b1c30] print:py-1 print:px-1.5">
                        {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diretrizes & Normas Regulamentadoras */}
          <div className="mt-3 p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs print:mt-1.5 print:p-2 print:text-[7.5pt] print:rounded-md">
            <h4 className="font-bold text-[#004328] mb-1 flex items-center gap-1.5 print:text-[7.5pt] print:mb-0.5">
              <span className="material-symbols-outlined text-[14px] print:text-[11px]">verified_user</span>
              3. Diretrizes Técnicas de Execução & Normas de Referência
            </h4>
            <div className="flex flex-wrap gap-1 mb-1.5 print:gap-1 print:mb-1">
              {quote.regulatoryScope.map((scope, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded bg-white text-[#004328] font-mono text-[9px] font-bold border border-[#cbd5e1] print:text-[6.5pt] print:py-0"
                >
                  {scope}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-[#475569] leading-snug print:text-[6.5pt] print:leading-tight">
              O responsável técnico designado deverá portar EPIs adequados para vistoria nos postos operacionais,
              agendar previamente com o interlocutor do cliente a visita técnica, coletar as assinaturas necessárias
              e registrar as evidências fotográficas para instrução dos laudos e programas.
            </p>
          </div>

          {/* Assinaturas Formais */}
          <div className="mt-5 pt-3 border-t border-[#e2e8f0] grid grid-cols-2 gap-6 text-center text-xs print:mt-2 print:pt-1.5 print:text-[7.5pt] print:gap-4">
            <div>
              <div className="border-b border-[#0b1c30] w-3/4 mx-auto pb-4 mb-1 print:pb-2 print:mb-0.5"></div>
              <span className="font-bold text-[#0b1c30] block print:text-[7.5pt]">{responsibleName}</span>
              <span className="text-[10px] text-[#64748b] block print:text-[6.5pt]">Responsável Técnico SST / Executor</span>
              <span className="text-[9px] text-[#64748b] font-mono block print:text-[6pt]">{companyProfile.tradeName || 'Consentra Gestão de SST'}</span>
            </div>

            <div>
              <div className="border-b border-[#0b1c30] w-3/4 mx-auto pb-4 mb-1 print:pb-2 print:mb-0.5"></div>
              <span className="font-bold text-[#0b1c30] block print:text-[7.5pt]">{quote.contactPerson}</span>
              <span className="text-[10px] text-[#64748b] block print:text-[6.5pt]">Aceite Operacional / Vistoria Agendada</span>
              <span className="text-[9px] text-[#64748b] font-mono block print:text-[6pt]">{quote.clientName}</span>
            </div>
          </div>

          {/* Rodapé institucional */}
          <div className="mt-3 text-center text-[9px] text-[#94a3b8] border-t border-[#f1f5f9] pt-1.5 font-mono print:mt-1.5 print:pt-1 print:text-[6pt]">
            {companyProfile.name} • CNPJ: {companyProfile.cnpj} • Endereço: {companyProfile.address} • Tel: {companyProfile.phone}
            {companyProfile.email ? ` • ${companyProfile.email}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
};
