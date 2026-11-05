import { COMPANY_PROFILE } from './mock-data';
import { pushSetting, SETTING_KEYS } from './remote-sync';

export interface CompanyProfile {
  name: string;
  tradeName: string;
  cnpj: string;
  ie: string;
  address: string;
  phone: string;
  email: string;
  financeEmail: string;
  bankName: string;
  bankAgency: string;
  bankAccount: string;
  pixKey: string;
  technicalResponsible: string;
  technicalTitle: string;
  systemVersion: string;
  systemHash: string;
  directImageUrl: string;
}

export interface QuoteTextsConfig {
  documentTitle: string;
  documentSubtitle: string;
  section1Title: string;
  section2Title: string;
  taxClause: string;
  section3Title: string;
  billingLabel: string;
  paymentDataLabel: string;
  section4Title: string;
  esocialClause: string;
  artBadge: string;
  signatureLeftCompany: string;
  signatureLeftRole: string;
  signatureLeftDoc: string;
  signatureRightCompany: string;
  signatureRightLine: string;
  footerSystemLabel: string;
  footerAuthenticityLabel: string;
  defaultScopeIntro?: string;
}

export const DEFAULT_QUOTE_TEXTS: QuoteTextsConfig = {
  documentTitle: "PROPOSTA TÉCNICA",
  documentSubtitle: "Documento Oficial de Proposta Comercial & Técnica",
  section1Title: "1. Objeto & Escopo Técnico Geral",
  defaultScopeIntro: "A presente Proposta Técnica contempla a prestação continuada de serviços especializados em Engenharia de Segurança e Medicina Ocupacional, visando o pleno atendimento aos preceitos da Consolidação das Leis do Trabalho (CLT - Capítulo V), às Normas Regulamentadoras (NRs) aprovadas pelo Ministério do Trabalho e Emprego, e às exigências de conformidade dos eventos de Saúde e Segurança do Trabalho do eSocial (Eventos S-2220 e S-2240).",
  section2Title: "2. Demonstração de Itens e Honorários Técnicos",
  taxClause: "* Tributos inclusos de acordo com a legislação fiscal vigente.",
  section3Title: "3. Condições Comerciais, Faturamento & Dados Bancários",
  billingLabel: "Forma de Faturamento",
  paymentDataLabel: "Dados para Pagamento / PIX",
  section4Title: "4. Diretrizes de Execução & eSocial",
  esocialClause: "Conformidade eSocial SST: Geração dos eventos S-2220 (Monitoramento de Saúde) e S-2240 (Condições Ambientais) inclusa com assinatura digital de Engenheiro e Médico do Trabalho.",
  artBadge: "ART CREA/SP",
  signatureLeftCompany: "CONSENTRA SEGURANÇA E MEDICINA DO TRABALHO LTDA",
  signatureLeftRole: "Responsável pelo Orçamento (SST)",
  signatureLeftDoc: "CREA / Registro Profissional Vinculado",
  signatureRightCompany: "De Acordo / Aceite Formal do Contratante",
  signatureRightLine: "Data: ____ / ____ / ________  Assinatura: ___________________",
  footerSystemLabel: "CONSENTRA GESTÃO SST • SISTEMA EMISSOR v2.4",
  footerAuthenticityLabel: "CHAVE DE AUTENTICIDADE"
};

const STORAGE_PROFILE_KEY = 'consentra_company_profile_v2';
const STORAGE_QUOTE_TEXTS_KEY = 'consentra_quote_texts_v2';

export function getStoredCompanyProfile(): CompanyProfile {
  if (typeof window === 'undefined') return COMPANY_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...COMPANY_PROFILE, ...parsed };
    }
  } catch (e) {
    console.error('Erro ao ler perfil da empresa:', e);
  }
  return COMPANY_PROFILE;
}

export function saveStoredCompanyProfile(profile: Partial<CompanyProfile>): CompanyProfile {
  const current = getStoredCompanyProfile();
  const updated = { ...current, ...profile };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('consentra_company_profile_updated', { detail: updated }));
    } catch (e) {
      console.error('Erro ao salvar perfil da empresa:', e);
    }
    pushSetting(SETTING_KEYS.companyProfile, updated);
  }
  return updated;
}

export function resetStoredCompanyProfile(): CompanyProfile {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_PROFILE_KEY);
      window.dispatchEvent(new CustomEvent('consentra_company_profile_updated', { detail: COMPANY_PROFILE }));
    } catch {}
    pushSetting(SETTING_KEYS.companyProfile, null);
  }
  return COMPANY_PROFILE;
}

export function getStoredQuoteTexts(): QuoteTextsConfig {
  if (typeof window === 'undefined') return DEFAULT_QUOTE_TEXTS;
  try {
    const raw = localStorage.getItem(STORAGE_QUOTE_TEXTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_QUOTE_TEXTS, ...parsed };
    }
  } catch (e) {
    console.error('Erro ao ler textos padrão do orçamento:', e);
  }
  return DEFAULT_QUOTE_TEXTS;
}

export function saveStoredQuoteTexts(texts: Partial<QuoteTextsConfig>): QuoteTextsConfig {
  const current = getStoredQuoteTexts();
  const updated = { ...current, ...texts };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_QUOTE_TEXTS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('consentra_quote_texts_updated', { detail: updated }));
    } catch (e) {
      console.error('Erro ao salvar textos do orçamento:', e);
    }
    pushSetting(SETTING_KEYS.quoteTexts, updated);
  }
  return updated;
}

export function resetStoredQuoteTexts(): QuoteTextsConfig {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_QUOTE_TEXTS_KEY);
      window.dispatchEvent(new CustomEvent('consentra_quote_texts_updated', { detail: DEFAULT_QUOTE_TEXTS }));
    } catch {}
    pushSetting(SETTING_KEYS.quoteTexts, null);
  }
  return DEFAULT_QUOTE_TEXTS;
}

// ------------------------------------------------------------------------------
// Aplicação de valores vindos do servidor (substitui o cache local, sem reenviar)
// ------------------------------------------------------------------------------

export const COMPANY_PROFILE_STORAGE_KEY = STORAGE_PROFILE_KEY;
export const QUOTE_TEXTS_STORAGE_KEY = STORAGE_QUOTE_TEXTS_KEY;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** `null` = sem personalização no servidor (usa o padrão do sistema). */
export function applyRemoteCompanyProfile(value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    if (isPlainObject(value)) {
      const profile = { ...COMPANY_PROFILE, ...value } as CompanyProfile;
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
      window.dispatchEvent(new CustomEvent('consentra_company_profile_updated', { detail: profile }));
    } else {
      localStorage.removeItem(STORAGE_PROFILE_KEY);
      window.dispatchEvent(new CustomEvent('consentra_company_profile_updated', { detail: COMPANY_PROFILE }));
    }
  } catch (e) {
    console.error('Erro ao aplicar perfil da empresa do servidor:', e);
  }
}

export function applyRemoteQuoteTexts(value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    if (isPlainObject(value)) {
      const texts = { ...DEFAULT_QUOTE_TEXTS, ...value } as QuoteTextsConfig;
      localStorage.setItem(STORAGE_QUOTE_TEXTS_KEY, JSON.stringify(texts));
      window.dispatchEvent(new CustomEvent('consentra_quote_texts_updated', { detail: texts }));
    } else {
      localStorage.removeItem(STORAGE_QUOTE_TEXTS_KEY);
      window.dispatchEvent(new CustomEvent('consentra_quote_texts_updated', { detail: DEFAULT_QUOTE_TEXTS }));
    }
  } catch (e) {
    console.error('Erro ao aplicar textos do orçamento do servidor:', e);
  }
}
