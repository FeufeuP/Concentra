'use client';

import React, { useState, useEffect } from 'react';
import { Quote } from '@/lib/types';
import { COMPANY_PROFILE, DIRECT_LOGO_URL } from '@/lib/mock-data';
import { getStoredLogoUrl } from '@/lib/logo';
import { getStoredResponsibles } from '@/lib/responsibles';
import { downloadQuotePdf, printQuotePdf } from '@/lib/pdf-generator';
import { TabType } from './Sidebar';
import { AuthUser, getCurrentUser, isAdminUser } from '@/lib/auth';
import { 
  getStoredCompanyProfile, 
  getStoredQuoteTexts, 
  CompanyProfile, 
  QuoteTextsConfig 
} from '@/lib/company';
import { AdminQuoteConfigModal } from './AdminQuoteConfigModal';

interface PdfVisualizerViewProps {
  quote: Quote;
  onBackToEdit: () => void;
  setActiveTab: (tab: TabType) => void;
  onSendWhatsapp: (quote: Quote) => void;
  onSendEmail: (quote: Quote) => void;
  onDuplicateQuote: (quote: Quote) => void;
  onOpenServiceOrder?: (quote: Quote) => void;
  responsiblePersons?: string[];
  currentUser?: AuthUser | null;
  onSaveQuote?: (updatedQuote: Quote) => void;
}

export const PdfVisualizerView: React.FC<PdfVisualizerViewProps> = ({
  quote,
  onBackToEdit,
  setActiveTab,
  onSendWhatsapp,
  onSendEmail,
  onDuplicateQuote,
  onOpenServiceOrder,
  responsiblePersons,
  currentUser,
  onSaveQuote,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [logoUrl, setLogoUrl] = useState<string>(getStoredLogoUrl());

  // Estado para controle do modal administrativo
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminModalTab, setAdminModalTab] = useState<'header' | 'texts'>('header');
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => getStoredCompanyProfile());
  const [quoteTexts, setQuoteTexts] = useState<QuoteTextsConfig>(() => getStoredQuoteTexts());

  const isAdmin = isAdminUser(currentUser) || 
    (typeof window !== 'undefined' && isAdminUser(getCurrentUser()));

  // Cabeçalho e textos efetivos
  const effectiveHeader: CompanyProfile = {
    ...companyProfile,
    ...(quote.headerConfig || {})
  };

  const effectiveTexts: QuoteTextsConfig = {
    ...quoteTexts,
    ...(quote.customTexts || {})
  };

  const responsibleName = quote.responsibleTech || (responsiblePersons && responsiblePersons[0]) || getStoredResponsibles()[0] || effectiveHeader.technicalResponsible;

  useEffect(() => {
    const handleLogoUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setLogoUrl(customEvent.detail);
      } else {
        setLogoUrl(getStoredLogoUrl());
      }
    };

    const handleProfileUpdate = (e: Event) => {
      const custom = e as CustomEvent<CompanyProfile>;
      if (custom.detail) setCompanyProfile(custom.detail);
    };

    const handleTextsUpdate = (e: Event) => {
      const custom = e as CustomEvent<QuoteTextsConfig>;
      if (custom.detail) setQuoteTexts(custom.detail);
    };

    window.addEventListener('consentra_logo_updated', handleLogoUpdate);
    window.addEventListener('consentra_company_profile_updated', handleProfileUpdate);
    window.addEventListener('consentra_quote_texts_updated', handleTextsUpdate);

    return () => {
      window.removeEventListener('consentra_logo_updated', handleLogoUpdate);
      window.removeEventListener('consentra_company_profile_updated', handleProfileUpdate);
      window.removeEventListener('consentra_quote_texts_updated', handleTextsUpdate);
    };
  }, []);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printQuotePdf(quote);
    } catch (err) {
      console.error('Erro ao imprimir PDF:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const success = await downloadQuotePdf(quote);
      if (success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 4000);
      } else {
        // Fallback nativo confiável
        window.print();
      }
    } catch (err) {
      console.error('Erro ao gerar download do PDF:', err);
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Floating Visualizer Control Toolbar */}
      <div
        id="visualizer-toolbar"
        className="sticky top-16 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-[#e5eeff] p-3 shadow-md flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Voltar para Edição</span>
          </button>

          <div className="h-6 w-[1px] bg-[#e5eeff] hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-[#004328] bg-[#eff4ff] px-2 py-1 rounded-lg">
              DOC {quote.id.replace('#', '')}
            </span>
            <span className="hidden md:inline text-xs text-[#49607e]">
              A4 (210×297mm) • Pronto para Impressão
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#a9f3c5] text-[#002111]">
              {quote.status}
            </span>
          </div>
        </div>

        {/* Zoom & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden lg:flex items-center bg-[#eff4ff] rounded-xl p-0.5 border border-[#c4dcff]/40 text-xs">
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 10, 60))}
              title="Diminuir Zoom"
              className="w-7 h-7 rounded-lg hover:bg-white text-[#0b1c30] flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">remove</span>
            </button>
            <span className="px-2 font-mono font-semibold text-[#004328] text-xs min-w-[48px] text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 10, 140))}
              title="Aumentar Zoom"
              className="w-7 h-7 rounded-lg hover:bg-white text-[#0b1c30] flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              title="Ajustar 100%"
              className="px-2 text-[10px] text-[#49607e] hover:text-[#0b1c30]"
            >
              Ajustar
            </button>
          </div>

          {/* Se aprovado: Gerar Ordem de Serviços */}
          {quote.status === 'Aprovado' && onOpenServiceOrder && (
            <button
              onClick={() => onOpenServiceOrder(quote)}
              title="Gerar Ordem de Serviços sem valores do orçamento"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">assignment</span>
              <span>Gerar O.S.</span>
            </button>
          )}

          {/* WhatsApp */}
          <button
            onClick={() => onSendWhatsapp(quote)}
            title="Compartilhar Proposta via WhatsApp"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          {/* Email */}
          <button
            onClick={() => onSendEmail(quote)}
            title="Enviar Proposta por E-mail"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#004328] text-xs font-semibold border border-[#c4dcff]/50 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">mail</span>
            <span className="hidden sm:inline">E-mail</span>
          </button>

          {/* Controles de Edição Exclusivos do Administrador */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-amber-50 p-1 rounded-2xl border border-amber-300 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setAdminModalTab('header');
                  setShowAdminModal(true);
                }}
                title="Editar dados cadastrais e cabeçalho da proposta antes da impressão (Apenas Administrador)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all active:scale-98"
              >
                <span className="material-symbols-outlined text-[16px]">view_headline</span>
                <span>Editar Cabeçalho (Admin)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdminModalTab('texts');
                  setShowAdminModal(true);
                }}
                title="Editar todos os textos, escopo e cláusulas do orçamento antes de imprimir (Apenas Administrador)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold shadow-xs transition-all active:scale-98"
              >
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                <span>Editar Textos (Admin)</span>
              </button>
            </div>
          )}

          {/* Print */}
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            title="Imprimir Documento Oficial com layout idêntico à tela"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold border border-[#e5eeff] shadow-xs transition-colors active:scale-98"
          >
            <span className="material-symbols-outlined text-[16px] text-[#49607e]">
              {isPrinting ? 'sync' : 'print'}
            </span>
            <span>{isPrinting ? 'Preparando...' : 'Imprimir'}</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#004328] hover:bg-[#005c3e] text-white text-xs font-bold shadow-xs transition-colors active:scale-98"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isDownloading ? 'sync' : downloadSuccess ? 'check' : 'download'}
            </span>
            <span>{isDownloading ? 'Gerando...' : downloadSuccess ? 'Baixado!' : 'Baixar PDF'}</span>
          </button>
        </div>
      </div>

      {/* Sheet Frame Centering Container with Dynamic Zoom */}
      <div className="flex justify-center w-full overflow-x-auto p-2 sm:p-6 bg-[#f0f4fa]/60 rounded-3xl border border-[#e5eeff]">
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out'
          }}
        >
          {/* Pristine A4 Document Sheet */}
          <div
            id="a4-sheet"
            className="w-[210mm] max-w-[210mm] h-[297mm] max-h-[297mm] bg-white text-[#0b1c30] p-[12mm_14mm] shadow-2xl rounded-sm flex flex-col justify-between border border-gray-200 overflow-hidden box-border"
          >
            <div className="flex flex-col gap-4">
              {/* Header: Logo and Consentra Corporate Info */}
              <div className="flex items-center justify-between pb-5 border-b-2 border-[#145E5B] gap-4">
                <div className="flex items-center">
                  <img
                    src={logoUrl || '/logo-consentra-horizontal.png'}
                    alt="Consentra Segurança do Trabalho"
                    className="h-20 w-auto max-w-[260px] object-contain object-left"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo-consentra.png';
                    }}
                  />
                </div>

                <div className="text-right text-[10px] text-[#49607e] leading-tight flex flex-col items-end">
                  <span className="font-bold text-xs text-[#145E5B]">{effectiveHeader.name}</span>
                  <span className="font-mono mt-0.5">CNPJ: {effectiveHeader.cnpj} • I.E: {effectiveHeader.ie}</span>
                  <span>{effectiveHeader.address}</span>
                  <span className="font-mono">Tel: {effectiveHeader.phone} • {effectiveHeader.email}</span>
                  <span className="font-semibold text-[#004328] mt-0.5 bg-[#eff4ff] px-2 py-0.5 rounded border border-[#c4dcff]/60">
                    Responsável pelo Orçamento: <strong className="text-[#004328]">{responsibleName}</strong>
                  </span>
                </div>
              </div>

              {/* Document Banner */}
              <div className="p-3.5 rounded-lg bg-gradient-to-r from-[#004328] to-[#0d5c3a] text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#a9f3c5] tracking-wider block">
                    {effectiveTexts.documentSubtitle || 'Documento Oficial de Proposta Comercial & Técnica'}
                  </span>
                  <h2 className="text-base font-bold tracking-tight">
                    {(effectiveTexts.documentTitle || 'PROPOSTA TÉCNICA').toUpperCase()} Nº {quote.numberOnly || quote.id.replace('#', '')}
                  </h2>
                </div>
                <div className="text-right text-[11px] font-mono leading-tight">
                  <div>Emissão: <strong>{quote.issueDate}</strong></div>
                  <div className="text-[#a9f3c5]">Validade: <strong>{quote.validityDate} ({quote.validityDays} dias)</strong></div>
                </div>
              </div>

              {/* Contratante Dados Cadastrais */}
              <div className="p-3.5 rounded-lg bg-[#f8f9ff] border border-[#e5eeff] text-[11px]">
                <div className="text-[10px] uppercase font-bold text-[#004328] mb-1.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">corporate_fare</span>
                  <span>Dados Cadastrais do Contratante</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[#0b1c30]">
                  <div>
                    <span className="text-[#49607e]">Razão Social: </span>
                    <strong>{quote.clientName}</strong>
                  </div>
                  <div>
                    <span className="text-[#49607e]">CNPJ: </span>
                    <span className="font-mono">{quote.cnpj}</span> {quote.ie ? `• I.E: ${quote.ie}` : ''}
                  </div>
                  <div>
                    <span className="text-[#49607e]">Classificação de Risco: </span>
                    <strong className="text-[#004328]">{quote.riskGrade}</strong>
                  </div>
                  <div>
                    <span className="text-[#49607e]">A/C / Gestor EHS: </span>
                    <strong>{quote.contactPerson}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#49607e]">Endereço Operacional: </span>
                    <span>{quote.operationalAddress}</span>
                  </div>
                  <div>
                    <span className="text-[#49607e]">Contato Direto: </span>
                    <span className="font-mono">{quote.contactPhone} • {quote.contactEmail}</span>
                  </div>
                  <div>
                    <span className="text-[#49607e]">Prazo de Execução: </span>
                    <strong>{quote.executionForecast}</strong>
                  </div>
                </div>
              </div>

              {/* 1. Objeto & Escopo Técnico Geral */}
              <div className="flex flex-col gap-1.5 text-[11px]">
                <h4 className="font-bold text-xs text-[#004328] uppercase tracking-wide flex items-center gap-1 border-b border-[#e5eeff] pb-1">
                  <span>{effectiveTexts.section1Title || '1. Objeto & Escopo Técnico Geral'}</span>
                </h4>
                <p className="text-[#404942] leading-relaxed text-justify whitespace-pre-line">
                  {quote.scopeSummary || effectiveTexts.defaultScopeIntro || 'A presente Proposta Técnica contempla a prestação continuada de serviços especializados em Engenharia de Segurança e Medicina Ocupacional.'}
                </p>
              </div>

              {/* 2. Demonstração de Itens e Precificação */}
              <div className="flex flex-col gap-1.5 text-[11px]">
                <h4 className="font-bold text-xs text-[#004328] uppercase tracking-wide flex items-center gap-1 border-b border-[#e5eeff] pb-1">
                  <span>{effectiveTexts.section2Title || '2. Demonstração de Itens e Honorários Técnicos'}</span>
                </h4>

                <table className="w-full text-left border-collapse mt-1">
                  <thead>
                    <tr className="bg-[#eff4ff] text-[#004328] text-[10px] font-bold uppercase border-y border-[#c4dcff]">
                      <th className="py-2 px-2 text-center w-8">Item</th>
                      <th className="py-2 px-3">Descrição dos Serviços Regulatórios</th>
                      <th className="py-2 px-2 text-center w-16">Qtd/Un</th>
                      <th className="py-2 px-3 text-right w-24">Valor Unit.</th>
                      <th className="py-2 px-3 text-right w-28">Total Item</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eff4ff] text-[11px]">
                    {quote.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 px-2 text-center font-mono font-bold text-[#004328]">
                          {item.itemNumber}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-[#0b1c30]">{item.title}</div>
                          <div className="text-[10px] text-[#49607e] leading-snug">{item.description}</div>
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-[10px]">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[#49607e]">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#0b1c30]">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {/* Subtotal */}
                    <tr className="border-t border-[#c4dcff]">
                      <td colSpan={3}></td>
                      <td className="py-1.5 px-3 text-right text-[10px] text-[#49607e] font-semibold">Subtotal Bruto:</td>
                      <td className="py-1.5 px-3 text-right font-mono text-[11px] text-[#49607e]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.subtotal)}
                      </td>
                    </tr>
                    {/* Discount if any */}
                    {quote.discount > 0 && (
                      <tr>
                        <td colSpan={3}></td>
                        <td className="py-1 px-3 text-right text-[10px] text-[#0d5c3a] font-semibold">Desconto Comercial:</td>
                        <td className="py-1 px-3 text-right font-mono text-[11px] text-[#0d5c3a] font-semibold">
                          - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.discount)}
                        </td>
                      </tr>
                    )}
                    {/* Final Total */}
                    <tr className="bg-[#eff4ff] text-[#004328]">
                      <td colSpan={3} className="py-2 px-3 text-[10px] font-semibold italic text-[#49607e]">
                        {effectiveTexts.taxClause || '* Tributos inclusos de acordo com a legislação fiscal vigente.'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-xs uppercase">Valor Total:</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-sm text-[#004328]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 3. Condições Comerciais, Faturamento e Dados Bancários */}
              <div className="flex flex-col gap-1.5 text-[11px]">
                <h4 className="font-bold text-xs text-[#004328] uppercase tracking-wide flex items-center gap-1 border-b border-[#e5eeff] pb-1">
                  <span>{effectiveTexts.section3Title || '3. Condições Comerciais, Faturamento & Dados Bancários'}</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#f8f9ff] border border-[#e5eeff]">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#49607e] block">
                      {effectiveTexts.billingLabel || 'Forma de Faturamento'}
                    </span>
                    <strong className="text-[#004328]">{quote.paymentCondition}</strong>
                    {quote.installments > 1 && (
                      <span className="block text-[10px] text-[#49607e] mt-0.5">
                        {quote.installments} parcelas de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.installmentValue)}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#49607e] block">
                      {effectiveTexts.paymentDataLabel || 'Dados para Pagamento / PIX'}
                    </span>
                    <span className="font-mono text-[#0b1c30] text-[10px] block">
                      {effectiveHeader.bankName} • Ag: {effectiveHeader.bankAgency} • C/C: {effectiveHeader.bankAccount}
                    </span>
                    <span className="font-mono text-[#004328] text-[10px] block font-semibold">
                      Chave PIX: {effectiveHeader.pixKey}
                    </span>
                  </div>
                  <div className="col-span-2 text-[10px] text-[#49607e] border-t border-[#eff4ff] pt-2 whitespace-pre-line">
                    {quote.observations}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Block: Signatures & Legal Verification */}
            <div className="flex flex-col gap-4 pt-5 mt-4 border-t border-[#e5eeff]">
              {/* Signatures */}
              <div className="grid grid-cols-2 gap-12 text-center text-[10px]">
                <div className="flex flex-col items-center">
                  <div className="w-56 h-[1px] bg-[#0b1c30] mb-1.5" />
                  <span className="font-bold text-[#004328] text-[11px]">{effectiveTexts.signatureLeftCompany || effectiveHeader.name}</span>
                  <span className="text-[#0b1c30] font-bold text-[10.5px]">{responsibleName}</span>
                  <span className="text-[9px] text-[#49607e]">{effectiveTexts.signatureLeftRole || 'Responsável pelo Orçamento (SST)'}</span>
                  <span className="text-[8.5px] text-[#64748b]">{effectiveTexts.signatureLeftDoc || 'CREA / Registro Profissional Vinculado'}</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-56 h-[1px] bg-[#0b1c30] mb-1.5" />
                  <span className="font-bold text-[#0b1c30] text-[11px]">{quote.clientName}</span>
                  <span className="text-[#49607e] font-semibold">{effectiveTexts.signatureRightCompany || 'De Acordo / Aceite Formal do Contratante'}</span>
                  <span className="text-[9px] text-[#49607e]">{effectiveTexts.signatureRightLine || 'Data: ____ / ____ / ________  Assinatura: ___________________'}</span>
                </div>
              </div>

              {/* Document Hash & Confidentiality Footer */}
              <div className="flex items-center justify-between text-[9px] text-[#707971] pt-3 border-t border-[#eff4ff] font-mono">
                <span>{effectiveTexts.footerSystemLabel || 'CONSENTRA GESTÃO SST • SISTEMA EMISSOR v2.4'}</span>
                <span>{effectiveTexts.footerAuthenticityLabel || 'CHAVE DE AUTENTICIDADE'}: {effectiveHeader.systemHash}-{quote.numberOnly}</span>
                <span>PÁGINA 1 DE 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Configuração Administrativa do Orçamento */}
      <AdminQuoteConfigModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        quote={quote}
        onApplyToQuote={(updatedQuote) => {
          if (onSaveQuote) {
            onSaveQuote(updatedQuote);
          }
        }}
        initialTab={adminModalTab}
      />
    </div>
  );
};
