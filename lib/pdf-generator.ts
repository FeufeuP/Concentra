import { jsPDF } from 'jspdf';
import { Quote } from './types';
import { getStoredLogoUrl, DEFAULT_LOGO_URL } from './logo';
import { getStoredCompanyProfile, getStoredQuoteTexts, CompanyProfile, QuoteTextsConfig } from './company';
import { getStoredResponsibles } from './responsibles';

export interface ReportItem {
  id: string;
  clientName: string;
  cnpj: string;
  issueDate: string;
  status: string;
  responsibleTech: string;
  macroCategory?: string;
  total: number;
}

export interface ReportSummary {
  monthLabel: string;
  year: string;
  totalQuotes: number;
  totalValue: number;
  approvedValue: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  conversionRate: number;
}

/**
 * Tipagem mínima da cadeia fluente do html2pdf.js utilizada neste módulo
 */
interface Html2PdfWorker {
  set(options: Record<string, unknown>): Html2PdfWorker;
  from(element: HTMLElement): Html2PdfWorker;
  toPdf(): Html2PdfWorker;
  get(key: 'pdf'): Promise<jsPDF>;
  save(): Promise<void>;
  output(type: 'blob'): Promise<Blob>;
}

type Html2PdfFactory = () => Html2PdfWorker;

/**
 * Import dinâmico do html2pdf.js (somente no navegador, compatível com SSR / App Router)
 */
async function loadHtml2Pdf(): Promise<Html2PdfFactory> {
  const mod = (await import('html2pdf.js')) as unknown as { default?: Html2PdfFactory } & Html2PdfFactory;
  return mod.default || mod;
}

/**
 * Formata valor monetário em Real (BRL)
 */
function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

/**
 * Converte qualquer URL de imagem para base64 Data URL
 */
export async function getImageUrlAsBase64(url: string): Promise<string> {
  if (!url || typeof window === 'undefined') return url || '';
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Erro ao carregar imagem para base64:', err);
    return url;
  }
}

/**
 * Prepara ou clona o elemento A4 garantindo isolamento total de zoom e transformações de tela
 */
async function getOrBuildA4Element(quote: Quote): Promise<{ element: HTMLElement; cleanup: () => void }> {
  const existingSheet = document.getElementById('a4-sheet');
  const staging = document.createElement('div');
  staging.id = 'pdf-render-staging-' + Date.now();
  staging.style.position = 'fixed';
  staging.style.left = '-10000px';
  staging.style.top = '0';
  staging.style.width = '794px'; // 210mm a 96 DPI
  staging.style.backgroundColor = '#ffffff';
  staging.style.zIndex = '-99999';
  staging.style.overflow = 'visible';

  if (existingSheet) {
    const clone = existingSheet.cloneNode(true) as HTMLElement;
    clone.id = 'a4-sheet-render-clone';
    clone.style.width = '794px';
    clone.style.maxWidth = '794px';
    clone.style.minHeight = '1120px';
    clone.style.maxHeight = '1122px';
    clone.style.transform = 'none';
    clone.style.margin = '0';
    clone.style.padding = '36px 44px';
    clone.style.boxSizing = 'border-box';
    clone.style.boxShadow = 'none';
    clone.style.borderRadius = '0';
    clone.style.border = 'none';
    clone.style.backgroundColor = '#ffffff';
    clone.style.overflow = 'hidden';
    clone.style.pageBreakAfter = 'avoid';
    clone.style.pageBreakInside = 'avoid';

    // Converte imagens internas para Base64 para garantir carregamento instantâneo pelo html2canvas
    const images = clone.querySelectorAll('img');
    for (const img of Array.from(images)) {
      const src = img.getAttribute('src') || '';
      if (src && !src.startsWith('data:')) {
        try {
          const b64 = await getImageUrlAsBase64(src);
          if (b64) img.setAttribute('src', b64);
        } catch {
          // Mantém src original
        }
      }
    }

    staging.appendChild(clone);
    document.body.appendChild(staging);

    return {
      element: clone,
      cleanup: () => {
        if (staging.parentNode) staging.parentNode.removeChild(staging);
      }
    };
  }

  // Se a folha não estiver visível na página atual, constrói a folha A4 idêntica off-screen
  const companyProfile = getStoredCompanyProfile();
  const quoteTexts = getStoredQuoteTexts();
  const storedLogo = getStoredLogoUrl();
  let logoBase64 = storedLogo;
  if (storedLogo && !storedLogo.startsWith('data:')) {
    try {
      logoBase64 = await getImageUrlAsBase64(storedLogo);
    } catch {
      logoBase64 = storedLogo;
    }
  }

  const effectiveHeader: CompanyProfile = { ...companyProfile, ...(quote.headerConfig || {}) };
  const effectiveTexts: QuoteTextsConfig = { ...quoteTexts, ...(quote.customTexts || {}) };
  const responsibleName = quote.responsibleTech || getStoredResponsibles()[0] || effectiveHeader.technicalResponsible;
  const cleanNum = String(quote.numberOnly || quote.id).replace('#', '').trim();

  staging.innerHTML = `
    <div id="a4-sheet-standalone" style="width: 794px; max-width: 794px; min-height: 1120px; max-height: 1122px; background-color: #ffffff; color: #0b1c30; padding: 36px 44px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; justify-content: space-between; page-break-after: avoid; page-break-inside: avoid; break-after: avoid; break-inside: avoid; overflow: hidden;">
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <!-- Header: Logotipo e Dados Consentra -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 2px solid #145E5B; gap: 16px;">
          <div style="display: flex; align-items: center;">
            <img src="${logoBase64 || '/logo-consentra-horizontal.png'}" alt="Consentra Segurança do Trabalho" style="height: 64px; max-width: 250px; object-fit: contain; object-position: left;" />
          </div>
          <div style="text-align: right; font-size: 10px; color: #49607e; line-height: 1.35; display: flex; flex-direction: column; align-items: flex-end;">
            <span style="font-weight: bold; font-size: 12px; color: #145E5B;">${effectiveHeader.name}</span>
            <span style="font-family: monospace; margin-top: 2px;">CNPJ: ${effectiveHeader.cnpj} • I.E: ${effectiveHeader.ie}</span>
            <span>${effectiveHeader.address}</span>
            <span style="font-family: monospace;">Tel: ${effectiveHeader.phone} • ${effectiveHeader.email}</span>
            <span style="font-weight: 600; color: #004328; margin-top: 3px; background-color: #eff4ff; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(196, 220, 255, 0.6);">
              Responsável pelo Orçamento: <strong style="color: #004328;">${responsibleName}</strong>
            </span>
          </div>
        </div>

        <!-- Document Banner Verde Oficial -->
        <div style="padding: 12px 16px; border-radius: 8px; background: linear-gradient(135deg, #004328 0%, #0d5c3a 100%); color: #ffffff; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <span style="font-size: 10px; text-transform: uppercase; font-weight: 600; color: #a9f3c5; letter-spacing: 0.05em; display: block;">
              ${effectiveTexts.documentSubtitle || 'Documento Oficial de Proposta Comercial & Técnica'}
            </span>
            <h2 style="font-size: 15px; font-weight: bold; margin: 2px 0 0 0; letter-spacing: -0.01em;">
              ${(effectiveTexts.documentTitle || 'PROPOSTA TÉCNICA').toUpperCase()} Nº ${cleanNum}
            </h2>
          </div>
          <div style="text-align: right; font-size: 11px; font-family: monospace; line-height: 1.3;">
            <div>Emissão: <strong>${quote.issueDate}</strong></div>
            <div style="color: #a9f3c5;">Validade: <strong>${quote.validityDate} (${quote.validityDays} dias)</strong></div>
          </div>
        </div>

        <!-- Contratante: Dados Cadastrais -->
        <div style="padding: 12px 16px; border-radius: 8px; background-color: #f8f9ff; border: 1px solid #e5eeff; font-size: 11px;">
          <div style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #004328; margin-bottom: 6px;">
            Dados Cadastrais do Contratante
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; color: #0b1c30;">
            <div><span style="color: #49607e;">Razão Social: </span><strong>${quote.clientName || 'Cliente'}</strong></div>
            <div><span style="color: #49607e;">CNPJ: </span><span style="font-family: monospace;">${quote.cnpj || 'Não informado'}</span> ${quote.ie ? `• I.E: ${quote.ie}` : ''}</div>
            <div><span style="color: #49607e;">Classificação de Risco: </span><strong style="color: #004328;">${quote.riskGrade || 'Grau de Risco 2'}</strong></div>
            <div><span style="color: #49607e;">A/C / Gestor EHS: </span><strong>${quote.contactPerson || 'Não informado'}</strong></div>
            <div style="grid-column: span 2;"><span style="color: #49607e;">Endereço Operacional: </span><span>${quote.operationalAddress || 'Não informado'}</span></div>
            <div><span style="color: #49607e;">Contato Direto: </span><span style="font-family: monospace;">${quote.contactPhone || ''} ${quote.contactEmail ? `• ${quote.contactEmail}` : ''}</span></div>
            <div><span style="color: #49607e;">Prazo de Execução: </span><strong>${quote.executionForecast || 'Conforme alinhamento'}</strong></div>
          </div>
        </div>

        <!-- 1. Objeto & Escopo Técnico Geral -->
        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
          <h4 style="font-weight: bold; font-size: 11.5px; color: #004328; text-transform: uppercase; border-bottom: 1px solid #e5eeff; padding-bottom: 4px; margin: 0;">
            ${effectiveTexts.section1Title || '1. Objeto & Escopo Técnico Geral'}
          </h4>
          <p style="color: #404942; line-height: 1.5; text-align: justify; margin: 0; white-space: pre-line;">
            ${quote.scopeSummary || effectiveTexts.defaultScopeIntro || 'A presente Proposta Técnica contempla a prestação continuada de serviços especializados em Engenharia de Segurança e Medicina Ocupacional.'}
          </p>
        </div>

        <!-- 2. Demonstração de Itens e Honorários Técnicos -->
        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
          <h4 style="font-weight: bold; font-size: 11.5px; color: #004328; text-transform: uppercase; border-bottom: 1px solid #e5eeff; padding-bottom: 4px; margin: 0;">
            ${effectiveTexts.section2Title || '2. Demonstração de Itens e Honorários Técnicos'}
          </h4>
          <table style="width: 100%; border-collapse: collapse; margin-top: 4px; text-align: left;">
            <thead>
              <tr style="background-color: #eff4ff; color: #004328; font-size: 10px; font-weight: bold; text-transform: uppercase; border-top: 1px solid #c4dcff; border-bottom: 1px solid #c4dcff;">
                <th style="padding: 6px 8px; text-align: center; width: 32px;">Item</th>
                <th style="padding: 6px 10px;">Descrição dos Serviços Regulatórios</th>
                <th style="padding: 6px 8px; text-align: center; width: 64px;">Qtd/Un</th>
                <th style="padding: 6px 10px; text-align: right; width: 90px;">Valor Unit.</th>
                <th style="padding: 6px 10px; text-align: right; width: 100px;">Total Item</th>
              </tr>
            </thead>
            <tbody>
              ${quote.items.map(item => `
                <tr style="border-bottom: 1px solid #eff4ff; font-size: 11px;">
                  <td style="padding: 6px 8px; text-align: center; font-family: monospace; font-weight: bold; color: #004328;">${item.itemNumber}</td>
                  <td style="padding: 6px 10px;">
                    <div style="font-weight: bold; color: #0b1c30;">${item.title}</div>
                    <div style="font-size: 10px; color: #49607e; line-height: 1.3;">${item.description || ''}</div>
                  </td>
                  <td style="padding: 6px 8px; text-align: center; font-family: monospace; font-size: 10px;">${item.quantity} ${item.unit}</td>
                  <td style="padding: 6px 10px; text-align: right; font-family: monospace; color: #49607e;">${formatCurrency(item.unitPrice)}</td>
                  <td style="padding: 6px 10px; text-align: right; font-family: monospace; font-weight: bold; color: #0b1c30;">${formatCurrency(item.totalPrice)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top: 1px solid #c4dcff;">
                <td colspan="3"></td>
                <td style="padding: 5px 10px; text-align: right; font-size: 10px; color: #49607e; font-weight: 600;">Subtotal Bruto:</td>
                <td style="padding: 5px 10px; text-align: right; font-family: monospace; font-size: 11px; color: #49607e;">${formatCurrency(quote.subtotal)}</td>
              </tr>
              ${quote.discount > 0 ? `
                <tr>
                  <td colspan="3"></td>
                  <td style="padding: 4px 10px; text-align: right; font-size: 10px; color: #0d5c3a; font-weight: 600;">Desconto Comercial:</td>
                  <td style="padding: 4px 10px; text-align: right; font-family: monospace; font-size: 11px; color: #0d5c3a; font-weight: 600;">- ${formatCurrency(quote.discount)}</td>
                </tr>
              ` : ''}
              <tr style="background-color: #eff4ff; color: #004328;">
                <td colspan="3" style="padding: 6px 10px; font-size: 10px; font-weight: 600; font-style: italic; color: #49607e;">
                  ${effectiveTexts.taxClause || '* Tributos inclusos de acordo com a legislação fiscal vigente.'}
                </td>
                <td style="padding: 6px 10px; text-align: right; font-weight: bold; font-size: 11px; text-transform: uppercase;">Valor Total:</td>
                <td style="padding: 6px 10px; text-align: right; font-family: monospace; font-weight: bold; font-size: 13px; color: #004328;">${formatCurrency(quote.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- 3. Condições Comerciais, Faturamento e Dados Bancários -->
        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
          <h4 style="font-weight: bold; font-size: 11.5px; color: #004328; text-transform: uppercase; border-bottom: 1px solid #e5eeff; padding-bottom: 4px; margin: 0;">
            ${effectiveTexts.section3Title || '3. Condições Comerciais, Faturamento & Dados Bancários'}
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px; border-radius: 8px; background-color: #f8f9ff; border: 1px solid #e5eeff;">
            <div>
              <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #49607e; display: block;">
                ${effectiveTexts.billingLabel || 'Forma de Faturamento'}
              </span>
              <strong style="color: #004328;">${quote.paymentCondition || 'À Vista / Faturado 15 dias'}</strong>
              ${quote.installments > 1 ? `
                <span style="display: block; font-size: 10px; color: #49607e; margin-top: 2px;">
                  ${quote.installments} parcelas de ${formatCurrency(quote.installmentValue)}
                </span>
              ` : ''}
            </div>
            <div>
              <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #49607e; display: block;">
                ${effectiveTexts.paymentDataLabel || 'Dados para Pagamento / PIX'}
              </span>
              <span style="font-family: monospace; color: #0b1c30; font-size: 10px; display: block;">
                ${effectiveHeader.bankName} • Ag: ${effectiveHeader.bankAgency} • C/C: ${effectiveHeader.bankAccount}
              </span>
              <span style="font-family: monospace; color: #004328; font-size: 10px; display: block; font-weight: 600;">
                Chave PIX: ${effectiveHeader.pixKey}
              </span>
            </div>
            ${quote.paymentNotes ? `
              <div style="grid-column: span 2; font-size: 10px; color: #004328; background-color: #eff4ff; padding: 8px; border-radius: 6px; border: 1px solid rgba(196,220,255,0.4);">
                <strong style="display: block; font-size: 9.5px; text-transform: uppercase;">Condições Especiais de Pagamento:</strong>
                ${quote.paymentNotes}
              </div>
            ` : ''}
            <div style="grid-column: span 2; font-size: 10px; color: #49607e; border-top: 1px solid #eff4ff; padding-top: 6px; white-space: pre-line;">
              ${quote.observations || ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Rodapé: Assinaturas e Chave de Autenticidade -->
      <div style="display: flex; flex-direction: column; gap: 18px; padding-top: 20px; margin-top: 18px; border-top: 1px solid #e5eeff;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; font-size: 10px;">
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 210px; height: 1px; background-color: #0b1c30; margin-bottom: 5px;"></div>
            <span style="font-weight: bold; color: #004328; font-size: 11px;">${effectiveTexts.signatureLeftCompany || effectiveHeader.name}</span>
            <span style="color: #0b1c30; font-weight: bold; font-size: 10.5px;">${responsibleName}</span>
            <span style="font-size: 9px; color: #49607e;">${effectiveTexts.signatureLeftRole || 'Responsável pelo Orçamento (SST)'}</span>
            <span style="font-size: 8.5px; color: #64748b;">${effectiveTexts.signatureLeftDoc || 'CREA / Registro Profissional Vinculado'}</span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 210px; height: 1px; background-color: #0b1c30; margin-bottom: 5px;"></div>
            <span style="font-weight: bold; color: #0b1c30; font-size: 11px;">${quote.clientName || 'Cliente'}</span>
            <span style="color: #49607e; font-weight: 600;">${effectiveTexts.signatureRightCompany || 'De Acordo / Aceite Formal do Contratante'}</span>
            <span style="font-size: 9px; color: #49607e;">${effectiveTexts.signatureRightLine || 'Data: ____ / ____ / ________  Assinatura: ___________________'}</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 9px; color: #707971; padding-top: 8px; border-top: 1px solid #eff4ff; font-family: monospace;">
          <span>${effectiveTexts.footerSystemLabel || 'CONSENTRA GESTÃO SST • SISTEMA EMISSOR v2.4'}</span>
          <span>${effectiveTexts.footerAuthenticityLabel || 'CHAVE DE AUTENTICIDADE'}: ${effectiveHeader.systemHash}-${quote.numberOnly}</span>
          <span>PÁGINA 1 DE 1</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(staging);
  const target = staging.firstElementChild as HTMLElement;

  return {
    element: target,
    cleanup: () => {
      if (staging.parentNode) staging.parentNode.removeChild(staging);
    }
  };
}

/**
 * Gera o documento jsPDF através da biblioteca html2pdf.js com renderização vetorial e canvas de alta fidelidade
 */
export async function generateQuotePdfDoc(quote: Quote): Promise<jsPDF> {
  const { element, cleanup } = await getOrBuildA4Element(quote);

  try {
    // Import dinâmico do html2pdf.js para compatibilidade SSR / App Router
    const html2pdf = await loadHtml2Pdf();

    const opt = {
      margin: 0,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const pdf = await html2pdf().set(opt).from(element).toPdf().get('pdf');
    return pdf as jsPDF;
  } finally {
    cleanup();
  }
}

/**
 * Gera e realiza o download direto do PDF da Proposta Comercial & Técnica de SST
 * utilizando html2pdf.js para 100% de fidelidade visual ao layout exibido na tela
 */
export async function downloadQuotePdf(quote: Quote): Promise<boolean> {
  const { element, cleanup } = await getOrBuildA4Element(quote);

  try {
    const cleanNum = String(quote.numberOnly || quote.id).replace('#', '').trim();
    const cleanClient = (quote.clientName || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
    const fileName = `Proposta_Tecnica_Consentra_${cleanNum}_${cleanClient}.pdf`;

    const html2pdf = await loadHtml2Pdf();

    const opt = {
      margin: 0,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    await html2pdf().set(opt).from(element).save();
    return true;
  } catch (err) {
    console.error('Erro crítico ao gerar download do PDF com html2pdf.js:', err);
    return false;
  } finally {
    cleanup();
  }
}

/**
 * Envia o PDF gerado diretamente para a impressora do navegador via iframe oculto
 * Mantém 100% de fidelidade de cores, logotipo e proporções sem distorções de página
 */
export async function printQuotePdf(quote: Quote): Promise<boolean> {
  const { element, cleanup } = await getOrBuildA4Element(quote);

  try {
    const html2pdf = await loadHtml2Pdf();

    const opt = {
      margin: 0,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const pdfWorker = html2pdf().set(opt).from(element);
    const blob: Blob = await pdfWorker.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = blobUrl;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Erro ao acionar impressão pelo iframe:', e);
          window.open(blobUrl, '_blank');
        }
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      }, 300);
    };

    return true;
  } catch (err) {
    console.error('Erro ao imprimir PDF do orçamento com html2pdf.js:', err);
    return false;
  } finally {
    cleanup();
  }
}

/**
 * Gera e realiza o download direto do Relatório Mensal/Anual Consolidado de SST em PDF
 */
export async function downloadReportPdf(
  items: ReportItem[],
  summary: ReportSummary
): Promise<boolean> {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 14;

    // Cabeçalho institucional verde escuro
    doc.setFillColor(0, 67, 40);
    doc.rect(14, y, pageWidth - 28, 16, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('CONSENTRA GESTÃO SST • RELATÓRIO COMERCIAL & TÉCNICO DE ORÇAMENTOS', 20, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Período de Referência: ${summary.monthLabel} de ${summary.year}   |   Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 20, y + 12);

    y += 22;

    // Cards de Resumo Executivo
    const cardWidth = (pageWidth - 28 - 12) / 4;
    const cardHeight = 16;

    // Card 1: Volume Total Orçado
    doc.setFillColor(245, 248, 252);
    doc.roundedRect(14, y, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(210, 225, 240);
    doc.roundedRect(14, y, cardWidth, cardHeight, 2, 2, 'D');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('VOLUME TOTAL ORÇADO', 18, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(11, 28, 48);
    doc.text(formatCurrency(summary.totalValue), 18, y + 11.5);

    // Card 2: Valor Aprovado
    const c2X = 14 + cardWidth + 4;
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(c2X, y, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(c2X, y, cardWidth, cardHeight, 2, 2, 'D');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52);
    doc.text('VALOR APROVADO', c2X + 4, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 67, 40);
    doc.text(formatCurrency(summary.approvedValue), c2X + 4, y + 11.5);

    // Card 3: Taxa de Conversão
    const c3X = c2X + cardWidth + 4;
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(c3X, y, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(253, 224, 71);
    doc.roundedRect(c3X, y, cardWidth, cardHeight, 2, 2, 'D');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(133, 77, 14);
    doc.text('TAXA DE CONVERSÃO', c3X + 4, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(161, 98, 7);
    doc.text(`${summary.conversionRate}%`, c3X + 4, y + 11.5);

    // Card 4: Quantidade Total
    const c4X = c3X + cardWidth + 4;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(c4X, y, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(c4X, y, cardWidth, cardHeight, 2, 2, 'D');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('TOTAL DE PROPOSTAS', c4X + 4, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(11, 28, 48);
    doc.text(`${summary.totalQuotes} orçamentos`, c4X + 4, y + 11.5);

    y += 22;

    // Tabela de Itens
    doc.setFillColor(0, 67, 40);
    doc.rect(14, y, pageWidth - 28, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    doc.text('Nº', 17, y + 4.8);
    doc.text('DATA', 28, y + 4.8);
    doc.text('CLIENTE / RAZÃO SOCIAL', 52, y + 4.8);
    doc.text('CNPJ', 130, y + 4.8);
    doc.text('RESPONSÁVEL', 170, y + 4.8);
    doc.text('CATEGORIA', 205, y + 4.8);
    doc.text('STATUS', 242, y + 4.8);
    doc.text('VALOR (R$)', pageWidth - 16, y + 4.8, { align: 'right' });

    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    items.forEach((item, index) => {
      if (y > pageHeight - 16) {
        doc.addPage();
        y = 14;
        doc.setFillColor(0, 67, 40);
        doc.rect(14, y, pageWidth - 28, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('Nº', 17, y + 4.8);
        doc.text('DATA', 28, y + 4.8);
        doc.text('CLIENTE / RAZÃO SOCIAL', 52, y + 4.8);
        doc.text('CNPJ', 130, y + 4.8);
        doc.text('RESPONSÁVEL', 170, y + 4.8);
        doc.text('CATEGORIA', 205, y + 4.8);
        doc.text('STATUS', 242, y + 4.8);
        doc.text('VALOR (R$)', pageWidth - 16, y + 4.8, { align: 'right' });
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
      }

      if (index % 2 === 0) {
        doc.setFillColor(250, 252, 255);
        doc.rect(14, y, pageWidth - 28, 6.5, 'F');
      }

      doc.setDrawColor(240, 240, 240);
      doc.line(14, y + 6.5, pageWidth - 14, y + 6.5);

      doc.setTextColor(11, 28, 48);
      const cleanId = String(item.id).replace('#', '');
      doc.text(cleanId, 17, y + 4.5);
      doc.text(item.issueDate, 28, y + 4.5);

      const clientName = item.clientName.length > 38 ? item.clientName.substring(0, 36) + '...' : item.clientName;
      doc.text(clientName, 52, y + 4.5);

      doc.setTextColor(100, 116, 139);
      doc.text(item.cnpj, 130, y + 4.5);
      doc.text(item.responsibleTech || 'Washington Assis', 170, y + 4.5);

      const cat = (item.macroCategory || 'SST').substring(0, 18);
      doc.text(cat, 205, y + 4.5);

      if (item.status === 'Aprovado') {
        doc.setTextColor(22, 101, 52);
      } else if (item.status === 'Rejeitado') {
        doc.setTextColor(185, 28, 28);
      } else {
        doc.setTextColor(161, 98, 7);
      }
      doc.text(item.status, 242, y + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(11, 28, 48);
      doc.text(formatCurrency(item.total), pageWidth - 16, y + 4.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      y += 6.5;
    });

    const fileName = `Relatorio_Consolidado_Consentra_${summary.monthLabel}_${summary.year}.pdf`;
    doc.save(fileName);
    return true;
  } catch (err) {
    console.error('Erro crítico ao gerar download do relatório em PDF:', err);
    return false;
  }
}
