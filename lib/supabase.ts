'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Quote, QuoteItem, QuoteStatus, ClientData, CatalogService } from './types';
import type { QuoteEvent, QuoteEventType } from './quote-events';

// ==============================================================================
// TIPOS DAS LINHAS DO BANCO (snake_case) E HELPERS
// ==============================================================================

interface QuoteRow {
  id: string;
  number_only: number;
  client_id: string;
  client_name: string;
  cnpj: string;
  ie: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  operational_address: string | null;
  risk_grade: string | null;
  issue_date: string;
  validity_days: number;
  validity_date: string;
  execution_forecast: string;
  status: QuoteStatus;
  scope_summary: string | null;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  installments: number | null;
  installment_value: number | string;
  payment_condition: string | null;
  payment_notes: string | null;
  observations: string | null;
  regulatory_scope: string[] | null;
  responsible_tech: string | null;
  macro_category: string | null;
  sub_category: string | null;
  status_sub_stage: string | null;
  demand_origin: string | null;
  priority: string | null;
  custom_texts: Record<string, string> | null;
  header_config: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

interface QuoteItemRow {
  id: string;
  quote_id: string;
  item_number: number;
  title: string;
  description: string | null;
  unit: string | null;
  quantity: number | string;
  unit_price: number | string;
  total_price: number | string;
}

interface CatalogRow {
  id: string;
  code: string | null;
  title: string;
  subtitle: string | null;
  description: string;
  unit: string;
  suggested_price: number | string;
  nr_category: string;
  category: string | null;
  status: string | null;
  deliverables: string[] | null;
  quick_select: boolean | null;
}

interface ClientRow {
  id: string;
  name: string;
  cnpj: string;
  ie: string | null;
  risk_grade: string;
  cnae: string | null;
  contact_name: string;
  contact_role: string | null;
  email: string;
  phone: string;
  address: string;
}

export type RemoteResult<T = void> = { success: true; data: T } | { success: false; error: string };

function getRawErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string' && msg) return msg;
  }
  return '';
}

/**
 * Converte erros do PostgREST/Postgres/rede em mensagens compreensíveis para o usuário.
 */
export function friendlyDbError(err: unknown, fallback = 'Erro inesperado ao comunicar com o servidor.'): string {
  const raw = getRawErrorMessage(err);
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
  const lower = raw.toLowerCase();
  if (code === '42501' || lower.includes('row-level security') || lower.includes('permission denied')) {
    // Mensagens próprias das funções do banco já vêm em português
    if (raw && !lower.includes('row-level security') && !lower.includes('permission denied')) return raw;
    return 'Seu perfil não tem permissão para esta alteração.';
  }
  if (code === '23505' || lower.includes('duplicate key')) {
    return 'Já existe um registro com este identificador/número. Recarregue a página e tente novamente.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network request failed')) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
  }
  if (lower.includes('jwt') && lower.includes('expired')) {
    return 'Sua sessão expirou. Entre novamente.';
  }
  return raw || fallback;
}

function getErrorMessage(err: unknown, fallback: string): string {
  return friendlyDbError(err, fallback);
}

// Credenciais públicas do projeto (URL + chave anon/publishable).
// Vêm SOMENTE de variáveis de ambiente — nunca do localStorage, para que ninguém
// consiga apontar o app para um banco de terceiros pelo navegador.
export function getSupabaseCredentials(): { url: string; anonKey: string; source: 'env' | 'none' } {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (url && anonKey && !url.includes('SUA_URL_DO_SUPABASE') && !anonKey.includes('SUA_CHAVE_ANON')) {
    return { url, anonKey, source: 'env' };
  }
  return { url, anonKey, source: 'none' };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(
    url && 
    anonKey && 
    url.startsWith('https://') && 
    !url.includes('SUA_URL_DO_SUPABASE') && 
    !anonKey.includes('SUA_CHAVE_ANON')
  );
}

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey || !url.startsWith('https://') || url.includes('SUA_URL_DO_SUPABASE') || anonKey.includes('SUA_CHAVE_ANON')) {
    return null;
  }

  if (cachedClient && lastUsedUrl === url && lastUsedKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Link de recuperação de senha chega com o token no hash da URL
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
    });
    lastUsedUrl = url;
    lastUsedKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Erro ao inicializar cliente Supabase:', err);
    return null;
  }
}

// ==============================================================================
// CONVERSÕES (datas e identificadores)
// ==============================================================================

/** 'dd/mm/aaaa' (formato do app) -> 'aaaa-mm-dd' (DATE no banco). */
export function brDateToIso(value: string | undefined | null): string | null {
  if (!value) return null;
  const v = value.trim();
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (br) {
    const [, d, m, y] = br;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const date = new Date(`${iso}T00:00:00Z`);
    if (!isNaN(date.getTime()) && date.toISOString().startsWith(iso)) return iso;
    return null;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}

/** 'aaaa-mm-dd' (banco) -> 'dd/mm/aaaa' (app). Mantém o valor se já estiver no formato BR. */
export function isoDateToBr(value: string | undefined | null): string {
  if (!value) return '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return value;
}

/** Identificador do orçamento sem '#', padrão único entre app e banco. */
export function normalizeQuoteId(id: string | number | undefined | null): string {
  return String(id ?? '').replace(/#/g, '').trim();
}

function rowToQuote(q: QuoteRow, items: QuoteItem[]): Quote {
  return {
    id: normalizeQuoteId(q.id),
    numberOnly: q.number_only,
    clientId: q.client_id,
    clientName: q.client_name,
    cnpj: q.cnpj,
    ie: q.ie || undefined,
    contactPerson: q.contact_person || '',
    contactEmail: q.contact_email || '',
    contactPhone: q.contact_phone || '',
    operationalAddress: q.operational_address || '',
    riskGrade: q.risk_grade || '',
    issueDate: isoDateToBr(q.issue_date),
    validityDays: q.validity_days,
    validityDate: isoDateToBr(q.validity_date),
    executionForecast: q.execution_forecast,
    status: q.status,
    scopeSummary: q.scope_summary || '',
    items,
    subtotal: Number(q.subtotal) || 0,
    discount: Number(q.discount) || 0,
    total: Number(q.total) || 0,
    installments: q.installments || 1,
    installmentValue: Number(q.installment_value) || 0,
    paymentCondition: q.payment_condition || '',
    paymentNotes: q.payment_notes || undefined,
    observations: q.observations || '',
    regulatoryScope: q.regulatory_scope || [],
    responsibleTech: q.responsible_tech || 'Washington Assis',
    lastModified: q.updated_at,
    macroCategory: q.macro_category || undefined,
    subCategory: q.sub_category || undefined,
    statusSubStage: q.status_sub_stage || undefined,
    demandOrigin: q.demand_origin || undefined,
    priority: q.priority || undefined,
    customTexts: q.custom_texts || undefined,
    headerConfig: q.header_config || undefined,
  };
}

export function quoteToPayload(quote: Quote) {
  return {
    id: normalizeQuoteId(quote.id),
    number_only: quote.numberOnly,
    client_id: quote.clientId || '',
    client_name: quote.clientName || '',
    cnpj: quote.cnpj || '',
    ie: quote.ie || null,
    contact_person: quote.contactPerson || null,
    contact_email: quote.contactEmail || null,
    contact_phone: quote.contactPhone || null,
    operational_address: quote.operationalAddress || null,
    risk_grade: quote.riskGrade || null,
    issue_date: brDateToIso(quote.issueDate),
    validity_days: quote.validityDays,
    validity_date: brDateToIso(quote.validityDate),
    execution_forecast: quote.executionForecast || null,
    status: quote.status,
    scope_summary: quote.scopeSummary || null,
    subtotal: quote.subtotal || 0,
    discount: quote.discount || 0,
    total: quote.total || 0,
    installments: quote.installments || 1,
    installment_value: quote.installmentValue || 0,
    payment_condition: quote.paymentCondition || null,
    payment_notes: quote.paymentNotes || null,
    observations: quote.observations || null,
    regulatory_scope: Array.isArray(quote.regulatoryScope) ? quote.regulatoryScope : [],
    responsible_tech: quote.responsibleTech || null,
    macro_category: quote.macroCategory || null,
    sub_category: quote.subCategory || null,
    status_sub_stage: quote.statusSubStage || null,
    demand_origin: quote.demandOrigin || null,
    priority: quote.priority || 'Normal',
    custom_texts: quote.customTexts && Object.keys(quote.customTexts).length > 0 ? quote.customTexts : null,
    header_config: quote.headerConfig && Object.keys(quote.headerConfig).length > 0 ? quote.headerConfig : null,
  };
}

export function itemsToPayload(items: QuoteItem[] | undefined) {
  return (items || []).map((item, idx) => ({
    item_number: item.itemNumber ?? idx + 1,
    title: item.title || 'Item',
    description: item.description || '',
    unit: item.unit || 'unidade',
    quantity: Number(item.quantity) || 0,
    unit_price: Number(item.unitPrice) || 0,
    total_price: Number(item.totalPrice) || 0,
  }));
}

function notConnected<T>(): RemoteResult<T> {
  return { success: false, error: 'Supabase não conectado.' };
}

// ==============================================================================
// ORÇAMENTOS (QUOTES) & ITENS
// ==============================================================================

export async function fetchQuotes(): Promise<RemoteResult<Quote[]>> {
  const client = getSupabaseClient();
  if (!client) return notConnected();

  try {
    const [quotesRes, itemsRes] = await Promise.all([
      client.from('quotes').select('*').order('number_only', { ascending: false }),
      client.from('quote_items').select('*').order('item_number', { ascending: true }),
    ]);
    if (quotesRes.error) return { success: false, error: friendlyDbError(quotesRes.error) };
    if (itemsRes.error) return { success: false, error: friendlyDbError(itemsRes.error) };

    const itemsMap: Record<string, QuoteItem[]> = {};
    for (const item of (itemsRes.data || []) as QuoteItemRow[]) {
      const key = normalizeQuoteId(item.quote_id);
      (itemsMap[key] ||= []).push({
        id: item.id,
        itemNumber: item.item_number,
        title: item.title,
        description: item.description || '',
        unit: item.unit || 'unidade',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unit_price) || 0,
        totalPrice: Number(item.total_price) || 0,
      });
    }

    const quotes = ((quotesRes.data || []) as QuoteRow[]).map((q) => rowToQuote(q, itemsMap[normalizeQuoteId(q.id)] || []));
    return { success: true, data: quotes };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao carregar orçamentos.') };
  }
}

/** Próximo número de orçamento, gerado pela sequência do banco (sem colisões entre usuários). */
export async function fetchNextQuoteNumber(): Promise<RemoteResult<number>> {
  const client = getSupabaseClient();
  if (!client) return notConnected();
  try {
    const { data, error } = await client.rpc('next_quote_number');
    if (error) return { success: false, error: friendlyDbError(error) };
    const n = Number(data);
    if (!Number.isFinite(n) || n <= 0) return { success: false, error: 'Número de orçamento inválido retornado pelo servidor.' };
    return { success: true, data: n };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao gerar número do orçamento.') };
  }
}

/**
 * Salva orçamento + itens numa única transação (RPC `save_quote`).
 * Se qualquer parte falhar, nada é gravado.
 */
export async function saveQuoteToSupabase(quote: Quote): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não conectado.' };

  try {
    const { error } = await client.rpc('save_quote', {
      p_quote: quoteToPayload(quote),
      p_items: itemsToPayload(quote.items),
    });
    if (error) return { success: false, error: friendlyDbError(error) };
    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao salvar orçamento.') };
  }
}

export async function deleteQuoteFromSupabase(quoteId: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não conectado.' };

  try {
    const { data, error } = await client.from('quotes').delete().eq('id', normalizeQuoteId(quoteId)).select('id');
    if (error) return { success: false, error: friendlyDbError(error) };
    if (!data || data.length === 0) {
      return { success: false, error: 'O orçamento não foi excluído (sem permissão ou já removido).' };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao excluir orçamento.') };
  }
}

/** "Zerar sistema": apaga todos os orçamentos (somente administradores; exige digitar ZERAR). */
export async function clearAllQuotesInSupabase(confirmation: string): Promise<RemoteResult<number>> {
  const client = getSupabaseClient();
  if (!client) return notConnected();
  try {
    const { data, error } = await client.rpc('clear_all_quotes', { p_confirm: confirmation });
    if (error) return { success: false, error: friendlyDbError(error) };
    return { success: true, data: Number(data) || 0 };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao zerar orçamentos.') };
  }
}

// ==============================================================================
// HISTÓRICO DE ORÇAMENTOS (quote_events) — somente leitura no app
// ==============================================================================

export interface QuoteEventRow {
  id: number | string;
  quote_id: string;
  quote_number: number | null;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  details: Record<string, unknown> | null;
  actor_name: string | null;
  created_at: string;
}

const EVENT_TYPES: QuoteEventType[] = ['created', 'status_changed', 'email_sent', 'deleted'];

export function rowToQuoteEvent(row: QuoteEventRow): QuoteEvent {
  return {
    id: String(row.id),
    quoteId: normalizeQuoteId(row.quote_id),
    quoteNumber: row.quote_number ?? undefined,
    type: (EVENT_TYPES as string[]).includes(row.event_type) ? (row.event_type as QuoteEventType) : 'created',
    fromStatus: row.from_status ?? undefined,
    toStatus: row.to_status ?? undefined,
    details: row.details && typeof row.details === 'object' ? row.details : {},
    actorName: row.actor_name ?? undefined,
    createdAt: row.created_at,
  };
}

export async function fetchQuoteEventsFromSupabase(quoteId: string): Promise<RemoteResult<QuoteEvent[]>> {
  const client = getSupabaseClient();
  if (!client) return notConnected();
  try {
    const { data, error } = await client
      .from('quote_events')
      .select('*')
      .eq('quote_id', normalizeQuoteId(quoteId))
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return { success: false, error: friendlyDbError(error) };
    return { success: true, data: ((data || []) as QuoteEventRow[]).map(rowToQuoteEvent) };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao carregar o histórico.') };
  }
}

// ==============================================================================
// EDGE FUNCTIONS
// ==============================================================================

/**
 * Chama uma Edge Function (o token da sessão vai automaticamente) e extrai a
 * mensagem `{ error }` devolvida pela função, quando houver.
 */
export async function invokeEdgeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>
): Promise<{ data?: T; error?: string; code?: string; status?: number }> {
  const client = getSupabaseClient();
  if (!client) return { error: 'Supabase não configurado.' };
  try {
    const { data, error } = await client.functions.invoke(name, { body });
    if (error) {
      let msg = error.message;
      let code: string | undefined;
      let status: number | undefined;
      const ctx = (error as { context?: unknown }).context;
      if (ctx instanceof Response) {
        status = ctx.status;
        try {
          const parsed = await ctx.clone().json();
          if (parsed?.error) msg = parsed.error;
          if (typeof parsed?.code === 'string') code = parsed.code;
        } catch {
          /* resposta sem JSON */
        }
      }
      return { error: msg || 'Erro ao comunicar com o servidor.', code, status };
    }
    if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
      return { error: (data as { error: string }).error };
    }
    return { data: data as T };
  } catch (err) {
    return { error: getErrorMessage(err, 'Erro ao comunicar com o servidor.') };
  }
}

// ==============================================================================
// CLIENTES (CLIENTS)
// ==============================================================================

export async function fetchClients(): Promise<RemoteResult<ClientData[]>> {
  const client = getSupabaseClient();
  if (!client) return notConnected();

  try {
    const { data, error } = await client.from('clients').select('*').order('name', { ascending: true });
    if (error) return { success: false, error: friendlyDbError(error) };

    return {
      success: true,
      data: ((data || []) as ClientRow[]).map((c): ClientData => ({
        id: c.id,
        name: c.name,
        cnpj: c.cnpj,
        ie: c.ie || undefined,
        riskGrade: c.risk_grade,
        cnae: c.cnae || undefined,
        contactName: c.contact_name,
        contactRole: c.contact_role || undefined,
        email: c.email,
        phone: c.phone,
        address: c.address,
      })),
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao carregar clientes.') };
  }
}

function clientToPayload(c: ClientData) {
  return {
    id: c.id,
    name: c.name,
    cnpj: c.cnpj || '',
    ie: c.ie || null,
    risk_grade: c.riskGrade || '',
    cnae: c.cnae || null,
    contact_name: c.contactName || '',
    contact_role: c.contactRole || null,
    email: c.email || '',
    phone: c.phone || '',
    address: c.address || '',
  };
}

export async function saveClientToSupabase(c: ClientData): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não conectado.' };

  try {
    const { error } = await client.from('clients').upsert(clientToPayload(c), { onConflict: 'id' });
    if (error) return { success: false, error: friendlyDbError(error) };
    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao salvar cliente.') };
  }
}

/** Importação: insere clientes sem sobrescrever os que já existem no servidor. */
export async function insertClientsIfMissing(list: ClientData[]): Promise<RemoteResult<number>> {
  const client = getSupabaseClient();
  if (!client) return notConnected();
  if (list.length === 0) return { success: true, data: 0 };
  try {
    const { data, error } = await client
      .from('clients')
      .upsert(list.map(clientToPayload), { onConflict: 'id', ignoreDuplicates: true })
      .select('id');
    if (error) return { success: false, error: friendlyDbError(error) };
    return { success: true, data: (data || []).length };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao importar clientes.') };
  }
}

export async function deleteClientFromSupabase(clientId: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não conectado.' };

  try {
    const { data, error } = await client.from('clients').delete().eq('id', clientId).select('id');
    if (error) return { success: false, error: friendlyDbError(error) };
    if (!data || data.length === 0) {
      return { success: false, error: 'O cliente não foi excluído (sem permissão ou já removido).' };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao excluir cliente.') };
  }
}

// ==============================================================================
// CATÁLOGO DE SERVIÇOS
// ==============================================================================

function rowToCatalog(r: CatalogRow): CatalogService {
  return {
    id: r.id,
    code: r.code || undefined,
    title: r.title,
    subtitle: r.subtitle || undefined,
    description: r.description,
    unit: r.unit,
    suggestedPrice: Number(r.suggested_price) || 0,
    nrCategory: r.nr_category,
    category: r.category || undefined,
    status: r.status === 'Inativo' ? 'Inativo' : 'Ativo',
    deliverables: r.deliverables || [],
    quickSelect: Boolean(r.quick_select),
  };
}

export async function fetchCatalog(): Promise<RemoteResult<CatalogService[]>> {
  const client = getSupabaseClient();
  if (!client) return notConnected();
  try {
    const { data, error } = await client.from('catalog_services').select('*').order('code', { ascending: true });
    if (error) return { success: false, error: friendlyDbError(error) };
    return { success: true, data: ((data || []) as CatalogRow[]).map(rowToCatalog) };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao carregar o catálogo.') };
  }
}

export async function saveCatalogService(s: CatalogService): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não conectado.' };
  try {
    const { error } = await client.from('catalog_services').upsert(
      {
        id: s.id,
        code: s.code || null,
        title: s.title,
        subtitle: s.subtitle || null,
        description: s.description || '',
        unit: s.unit || 'Unidade',
        suggested_price: Number(s.suggestedPrice) || 0,
        nr_category: s.nrCategory || '',
        category: s.category || null,
        status: s.status || 'Ativo',
        deliverables: s.deliverables || [],
        quick_select: Boolean(s.quickSelect),
      },
      { onConflict: 'id' }
    );
    if (error) return { success: false, error: friendlyDbError(error) };
    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao salvar serviço.') };
  }
}

export async function deleteCatalogService(id: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não conectado.' };
  try {
    const { data, error } = await client.from('catalog_services').delete().eq('id', id).select('id');
    if (error) return { success: false, error: friendlyDbError(error) };
    if (!data || data.length === 0) {
      return { success: false, error: 'O serviço não foi excluído (sem permissão ou já removido).' };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao excluir serviço.') };
  }
}

// ==============================================================================
// CONFIGURAÇÕES GERAIS (app_settings) E LOGOTIPO (Storage)
// ==============================================================================

export async function fetchAppSettings(): Promise<RemoteResult<Record<string, unknown>>> {
  const client = getSupabaseClient();
  if (!client) return notConnected();
  try {
    const { data, error } = await client.from('app_settings').select('key, value');
    if (error) return { success: false, error: friendlyDbError(error) };
    const map: Record<string, unknown> = {};
    for (const row of (data || []) as { key: string; value: unknown }[]) map[row.key] = row.value;
    return { success: true, data: map };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao carregar configurações.') };
  }
}

/** Grava (value != null) ou remove (value == null, volta ao padrão do sistema) uma configuração. */
export async function saveAppSetting(key: string, value: unknown): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não conectado.' };
  try {
    if (value === null || value === undefined) {
      const { error } = await client.from('app_settings').delete().eq('key', key);
      if (error) return { success: false, error: friendlyDbError(error) };
      return { success: true };
    }
    const { data, error } = await client
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' })
      .select('key');
    if (error) return { success: false, error: friendlyDbError(error) };
    if (!data || data.length === 0) return { success: false, error: 'Seu perfil não tem permissão para esta alteração.' };
    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao salvar configuração.') };
  }
}

export const LOGO_BUCKET = 'branding';
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_MIME_EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

/** Envia o logotipo para o Storage (bucket público `branding`) e devolve a URL pública. */
export async function uploadLogoToStorage(file: File): Promise<RemoteResult<string>> {
  const client = getSupabaseClient();
  if (!client) return notConnected();
  const ext = LOGO_MIME_EXT[file.type];
  if (!ext) return { success: false, error: 'Formato não suportado. Use PNG, JPG ou WebP.' };
  if (file.size > MAX_LOGO_BYTES) return { success: false, error: 'Arquivo muito grande (máximo 2 MB).' };
  try {
    const path = `logo/logo-${Date.now()}.${ext}`;
    const { error } = await client.storage.from(LOGO_BUCKET).upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    });
    if (error) return { success: false, error: friendlyDbError(error) };
    const { data } = client.storage.from(LOGO_BUCKET).getPublicUrl(path);

    // Remove versões anteriores (melhor esforço)
    const { data: files } = await client.storage.from(LOGO_BUCKET).list('logo', { limit: 100 });
    const old = (files || []).map((f) => `logo/${f.name}`).filter((p) => p !== path);
    if (old.length > 0) await client.storage.from(LOGO_BUCKET).remove(old);

    return { success: true, data: data.publicUrl };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao enviar o logotipo.') };
  }
}
