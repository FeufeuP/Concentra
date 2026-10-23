'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Quote, QuoteItem, QuoteStatus, ClientData } from './types';
import { AuthUser } from './auth';

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
  observations: string | null;
  regulatory_scope: string[] | null;
  responsible_tech: string | null;
  macro_category: string | null;
  sub_category: string | null;
  status_sub_stage: string | null;
  demand_origin: string | null;
  priority: string | null;
  created_at: string;
  updated_at: string;
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

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: AuthUser['role'];
  password: string;
  initials: string;
  avatar_bg: string | null;
  document_registration: string | null;
  phone: string | null;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string' && msg) return msg;
  }
  return fallback;
}

// Storage keys for runtime client overrides if needed
const STORAGE_URL_KEY = 'consentra_supabase_url';
const STORAGE_ANON_KEY = 'consentra_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string; source: 'env' | 'localStorage' | 'none' } {
  // Check env vars first (supports both VITE_ and NEXT_PUBLIC_)
  const envUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const envKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey && !envUrl.includes('SUA_URL_DO_SUPABASE') && !envKey.includes('SUA_CHAVE_ANON')) {
    return { url: envUrl.trim(), anonKey: envKey.trim(), source: 'env' };
  }

  // Check localStorage if in browser
  if (typeof window !== 'undefined') {
    try {
      const storedUrl = localStorage.getItem(STORAGE_URL_KEY);
      const storedKey = localStorage.getItem(STORAGE_ANON_KEY);
      if (storedUrl && storedKey) {
        return { url: storedUrl.trim(), anonKey: storedKey.trim(), source: 'localStorage' };
      }
    } catch {
      // ignore
    }
  }

  return { url: envUrl.trim(), anonKey: envKey.trim(), source: 'none' };
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

export function saveCustomSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    if (url && anonKey) {
      localStorage.setItem(STORAGE_URL_KEY, url.trim());
      localStorage.setItem(STORAGE_ANON_KEY, anonKey.trim());
    } else {
      localStorage.removeItem(STORAGE_URL_KEY);
      localStorage.removeItem(STORAGE_ANON_KEY);
    }
    cachedClient = null;
    lastUsedUrl = '';
    lastUsedKey = '';
  }
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; details?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase não configurado. Forneça VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY válidas no .env ou nas Configurações.',
    };
  }

  try {
    const { data, error } = await client.from('users').select('id, name').limit(1);
    if (error) {
      return {
        success: false,
        message: `Falha na consulta ao Supabase: ${error.message}`,
        details: error.details || error.hint || undefined,
      };
    }

    return {
      success: true,
      message: `Conexão estabelecida com sucesso com o PostgreSQL do Supabase! (${data?.length ?? 0} registros consultados na tabela users).`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Erro ao conectar: ${getErrorMessage(err, 'Falha de rede ou CORS')}`,
    };
  }
}

// ==============================================================================
// ORÇAMENTOS (QUOTES) & ITENS
// ==============================================================================

export async function fetchQuotesFromSupabase(): Promise<Quote[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // 1. Fetch quotes
    const { data: quotesData, error: quotesError } = await client
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (quotesError || !quotesData) {
      console.warn('Supabase: Erro ao listar orçamentos', quotesError);
      return null;
    }

    // 2. Fetch all quote items
    const { data: itemsData, error: itemsError } = await client
      .from('quote_items')
      .select('*')
      .order('item_number', { ascending: true });

    if (itemsError) {
      console.warn('Supabase: Erro ao listar itens de orçamento', itemsError);
    }

    const itemsMap: Record<string, QuoteItem[]> = {};
    if (itemsData) {
      for (const item of itemsData) {
        if (!itemsMap[item.quote_id]) {
          itemsMap[item.quote_id] = [];
        }
        itemsMap[item.quote_id].push({
          id: item.id,
          itemNumber: item.item_number,
          title: item.title,
          description: item.description || '',
          unit: item.unit || 'unidade',
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unit_price) || 0,
          totalPrice: Number(item.total_price) || 0,
        });
      }
    }

    // Map database snake_case to TypeScript Quote interface
    return (quotesData as QuoteRow[]).map((q): Quote => ({
      id: q.id,
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
      issueDate: q.issue_date,
      validityDays: q.validity_days,
      validityDate: q.validity_date,
      executionForecast: q.execution_forecast,
      status: q.status,
      scopeSummary: q.scope_summary || '',
      items: itemsMap[q.id] || [],
      subtotal: Number(q.subtotal) || 0,
      discount: Number(q.discount) || 0,
      total: Number(q.total) || 0,
      installments: q.installments || 1,
      installmentValue: Number(q.installment_value) || 0,
      paymentCondition: q.payment_condition || '',
      observations: q.observations || '',
      regulatoryScope: q.regulatory_scope || [],
      responsibleTech: q.responsible_tech || 'Washington Assis',
      lastModified: q.updated_at,
      macroCategory: q.macro_category || undefined,
      subCategory: q.sub_category || undefined,
      statusSubStage: q.status_sub_stage || undefined,
      demandOrigin: q.demand_origin || undefined,
      priority: q.priority || undefined,
    }));
  } catch (err) {
    console.error('Erro geral ao buscar orçamentos no Supabase:', err);
    return null;
  }
}

export async function saveQuoteToSupabase(quote: Quote): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não conectado' };

  try {
    // 1. Upsert quote
    const quotePayload = {
      id: quote.id,
      number_only: quote.numberOnly,
      client_id: quote.clientId,
      client_name: quote.clientName,
      cnpj: quote.cnpj,
      ie: quote.ie || null,
      contact_person: quote.contactPerson,
      contact_email: quote.contactEmail,
      contact_phone: quote.contactPhone,
      operational_address: quote.operationalAddress,
      risk_grade: quote.riskGrade,
      issue_date: quote.issueDate,
      validity_days: quote.validityDays,
      validity_date: quote.validityDate,
      execution_forecast: quote.executionForecast,
      status: quote.status,
      scope_summary: quote.scopeSummary,
      subtotal: quote.subtotal,
      discount: quote.discount,
      total: quote.total,
      installments: quote.installments,
      installment_value: quote.installmentValue,
      payment_condition: quote.paymentCondition,
      observations: quote.observations,
      regulatory_scope: quote.regulatoryScope,
      responsible_tech: quote.responsibleTech,
      macro_category: quote.macroCategory || null,
      sub_category: quote.subCategory || null,
      status_sub_stage: quote.statusSubStage || null,
      demand_origin: quote.demandOrigin || null,
      priority: quote.priority || 'Normal',
      updated_at: new Date().toISOString(),
    };

    const { error: quoteError } = await client
      .from('quotes')
      .upsert(quotePayload, { onConflict: 'id' });

    if (quoteError) {
      return { success: false, error: quoteError.message };
    }

    // 2. Refresh items: delete existing items for this quote and reinsert
    await client.from('quote_items').delete().eq('quote_id', quote.id);

    if (quote.items && quote.items.length > 0) {
      const itemsPayload = quote.items.map((item, idx) => ({
        id: item.id || `item-${quote.id.replace('#', '')}-${idx + 1}-${Date.now()}`,
        quote_id: quote.id,
        item_number: item.itemNumber ?? (idx + 1),
        title: item.title,
        description: item.description || '',
        unit: item.unit || 'unidade',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
      }));

      const { error: itemsError } = await client
        .from('quote_items')
        .insert(itemsPayload);

      if (itemsError) {
        console.warn('Erro ao inserir itens no Supabase:', itemsError);
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro inesperado') };
  }
}

export async function deleteQuoteFromSupabase(quoteId: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não conectado' };

  try {
    const { error } = await client.from('quotes').delete().eq('id', quoteId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro inesperado') };
  }
}

// ==============================================================================
// CLIENTES (CLIENTS)
// ==============================================================================

export async function fetchClientsFromSupabase(): Promise<ClientData[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data) {
      console.warn('Supabase: Erro ao listar clientes', error);
      return null;
    }

    return (data as ClientRow[]).map((c): ClientData => ({
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
    }));
  } catch (err) {
    console.error('Erro ao buscar clientes no Supabase:', err);
    return null;
  }
}

export async function saveClientToSupabase(c: ClientData): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não conectado' };

  try {
    const payload = {
      id: c.id,
      name: c.name,
      cnpj: c.cnpj,
      ie: c.ie || null,
      risk_grade: c.riskGrade,
      cnae: c.cnae || null,
      contact_name: c.contactName,
      contact_role: c.contactRole || null,
      email: c.email,
      phone: c.phone,
      address: c.address,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('clients').upsert(payload, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao salvar cliente') };
  }
}

export async function deleteClientFromSupabase(clientId: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não conectado' };

  try {
    const { error } = await client.from('clients').delete().eq('id', clientId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao excluir cliente') };
  }
}

// ==============================================================================
// USUÁRIOS (USERS)
// ==============================================================================

export async function fetchUsersFromSupabase(): Promise<AuthUser[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data) return null;

    return (data as UserRow[]).map((u): AuthUser => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      password: u.password,
      initials: u.initials,
      avatarBg: u.avatar_bg || 'bg-[#004328]',
      documentRegistration: u.document_registration || undefined,
      phone: u.phone || undefined,
    }));
  } catch {
    return null;
  }
}

export async function saveUserToSupabase(u: AuthUser): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não conectado' };

  try {
    const payload = {
      id: u.id,
      name: u.name,
      email: u.email,
      password: u.password || '123',
      role: u.role,
      initials: u.initials,
      avatar_bg: u.avatarBg || 'bg-[#004328]',
      document_registration: u.documentRegistration || null,
      phone: u.phone || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('users').upsert(payload, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err, 'Erro ao salvar usuário') };
  }
}

// ==============================================================================
// SINCRONIZAÇÃO COMPLETA LOCAL -> SUPABASE
// ==============================================================================

export async function syncAllLocalDataToSupabase(
  quotes: Quote[],
  clients: ClientData[],
  users: AuthUser[]
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase não configurado. Verifique as credenciais no .env.' };
  }

  try {
    let clientsCount = 0;
    let quotesCount = 0;
    let usersCount = 0;

    // 1. Sync users
    for (const u of users) {
      await saveUserToSupabase(u);
      usersCount++;
    }

    // 2. Sync clients
    for (const c of clients) {
      await saveClientToSupabase(c);
      clientsCount++;
    }

    // 3. Sync quotes
    for (const q of quotes) {
      await saveQuoteToSupabase(q);
      quotesCount++;
    }

    return {
      success: true,
      message: `Sincronização concluída com sucesso! ${quotesCount} orçamentos, ${clientsCount} clientes e ${usersCount} operadores enviados ao Supabase PostgreSQL.`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Erro durante a sincronização: ${getErrorMessage(err, 'Falha de comunicação')}`,
    };
  }
}
