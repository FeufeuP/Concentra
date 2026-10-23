// =============================================================================
// Autenticação e gestão de usuários do Consentra SST
//
// Dois modos de operação:
//
// 1. SUPABASE (recomendado / produção) — ativado quando NEXT_PUBLIC_SUPABASE_URL
//    e NEXT_PUBLIC_SUPABASE_ANON_KEY estão definidos.
//    - Login real via Supabase Auth (senhas com bcrypt no servidor).
//    - Perfis e papéis na tabela `profiles`, protegidos por RLS.
//    - Criar / editar / excluir usuários e redefinir senhas de terceiros passa
//      pela Edge Function `admin-users`, que confere se quem chama é administrador.
//    - Recuperação de senha por link enviado ao e-mail.
//
// 2. LOCAL (demonstração / offline) — sem Supabase configurado.
//    - Usuários no localStorage do navegador, senhas com hash SHA-256 + salt.
//    - Sem atalhos: nenhuma senha mestra, nenhuma criação automática de conta.
//    - Não há como enviar e-mail: a recuperação é feita pelo administrador.
//    ATENÇÃO: o modo local NÃO é seguro para dados reais — qualquer pessoa com
//    acesso ao navegador pode ler/alterar o localStorage.
// =============================================================================

import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { addStoredResponsible } from './responsibles';

export type UserRole =
  | 'Administrador'
  | 'Responsável Técnico'
  | 'Responsável Técnico e Administrador'
  | 'Comercial'
  | 'Auditor SST';

export const USER_ROLES: UserRole[] = [
  'Responsável Técnico',
  'Responsável Técnico e Administrador',
  'Comercial',
  'Auditor SST',
  'Administrador',
];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  documentRegistration?: string; // ex: CREA, CRM, MTE
  phone?: string;
  initials: string;
  avatarBg?: string;
}

/** Registro armazenado no modo local (inclui credenciais). Nunca sai deste módulo. */
interface LocalUserRecord extends AuthUser {
  /** Senha legada em texto puro — migrada para hash no primeiro login. */
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  message?: string;
}

/** Tamanho mínimo para NOVAS senhas (exigência do Supabase Auth). */
export const MIN_PASSWORD_LENGTH = 6;

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'Administrador' || user.role === 'Responsável Técnico e Administrador';
}

/** Auditor SST tem acesso somente leitura. */
export function canWrite(user: AuthUser | null | undefined): boolean {
  return Boolean(user) && user!.role !== 'Auditor SST';
}

export function isRemoteAuth(): boolean {
  return isSupabaseConfigured();
}

function initialsFrom(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || 'US'
  );
}

function sanitize(user: LocalUserRecord | AuthUser): AuthUser {
  const { id, name, email, role, documentRegistration, phone, initials, avatarBg } = user;
  return { id, name, email, role, documentRegistration, phone, initials, avatarBg };
}

// =============================================================================
// Usuários padrão (modo local). No Supabase, os mesmos usuários são criados
// por supabase/seed_users.sql com as mesmas senhas.
// =============================================================================
const DEFAULT_USERS: LocalUserRecord[] = [
  {
    id: 'user-washington',
    name: 'Washington Assis',
    email: 'assis.sul@gmail.com',
    password: '123',
    role: 'Responsável Técnico e Administrador',
    documentRegistration: 'CREA-SP 506.892/D',
    phone: '(11) 98765-4321',
    initials: 'WA',
    avatarBg: 'bg-[#004328]',
  },
  {
    id: 'user-2',
    name: 'Dra. Mariana Rios',
    email: 'mariana@consentra.com.br',
    password: '123',
    role: 'Responsável Técnico',
    documentRegistration: 'CRM/SP 148.920',
    phone: '(11) 97654-3210',
    initials: 'MR',
    avatarBg: 'bg-[#145E5B]',
  },
  {
    id: 'user-3',
    name: 'Tec. Roberto Silva',
    email: 'roberto@consentra.com.br',
    password: '123',
    role: 'Responsável Técnico',
    documentRegistration: 'MTE 0042189/SP',
    phone: '(11) 96543-2109',
    initials: 'RS',
    avatarBg: 'bg-[#0284c7]',
  },
  {
    id: 'user-4',
    name: 'Amanda Silveira',
    email: 'amanda@consentra.com.br',
    password: '123',
    role: 'Comercial',
    documentRegistration: 'CRA 19.820',
    phone: '(11) 95432-1098',
    initials: 'AS',
    avatarBg: 'bg-[#7c3aed]',
  },
  {
    id: 'user-5',
    name: 'Administrador Geral',
    email: 'admin@consentra.com.br',
    password: 'admin',
    role: 'Administrador',
    documentRegistration: 'Consentra Gestão SST',
    phone: '(11) 3289-4500',
    initials: 'AD',
    avatarBg: 'bg-[#0b1c30]',
  },
];

const STORAGE_USERS_KEY = 'consentra_auth_users_v2';
const STORAGE_SESSION_KEY = 'consentra_auth_current_session';
const STORAGE_LOGGED_OUT_KEY = 'consentra_auth_logged_out';
const STORAGE_RESET_CODES_KEY = 'consentra_auth_reset_codes'; // legado, apenas removido

// =============================================================================
// Cache da sessão (ambos os modos) — usado para renderizar a UI de forma síncrona.
// No modo Supabase o cache é revalidado contra o servidor em initAuth().
// =============================================================================
export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    if (localStorage.getItem(STORAGE_LOGGED_OUT_KEY) === 'true') return null;
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthUser | null;
    if (!session?.id) return null;

    if (!isRemoteAuth()) {
      // Modo local: reflete alterações feitas no cadastro; sessão de usuário removido é invalidada
      const found = readLocalUsers().find((u) => u.id === session.id);
      return found ? sanitize(found) : null;
    }
    return sanitize(session);
  } catch (e) {
    console.error('Erro ao ler sessão do usuário:', e);
    return null;
  }
}

export function setCurrentUserSession(user: AuthUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sanitize(user)));
      localStorage.removeItem(STORAGE_LOGGED_OUT_KEY);
    } else {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.setItem(STORAGE_LOGGED_OUT_KEY, 'true');
    }
    window.dispatchEvent(new CustomEvent('consentra_auth_updated', { detail: user ? sanitize(user) : null }));
  } catch (e) {
    console.error('Erro ao gravar sessão:', e);
  }
}

// =============================================================================
// MODO LOCAL — armazenamento e hash de senhas
// =============================================================================
function readLocalUsers(): LocalUserRecord[] {
  if (typeof window === 'undefined') return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as LocalUserRecord[];
    }
  } catch (e) {
    console.error('Erro ao ler usuários:', e);
  }
  return DEFAULT_USERS;
}

function writeLocalUsers(users: LocalUserRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    localStorage.removeItem(STORAGE_RESET_CODES_KEY);
  } catch (e) {
    console.error('Erro ao salvar usuários:', e);
  }
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Criptografia indisponível neste navegador (use HTTPS ou localhost).');
  }
  const data = new TextEncoder().encode(`${salt}:${password}`);
  return toHex(await crypto.subtle.digest('SHA-256', data));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function setLocalPassword(record: LocalUserRecord, password: string): Promise<LocalUserRecord> {
  const salt = randomSalt();
  const hash = await hashPassword(password, salt);
  const { password: _legacy, ...rest } = record;
  return { ...rest, passwordSalt: salt, passwordHash: hash };
}

/** Verifica a senha; migra senha legada (texto puro) para hash quando confere. */
async function verifyLocalPassword(record: LocalUserRecord, password: string): Promise<{ ok: boolean; migrated?: LocalUserRecord }> {
  if (record.passwordHash && record.passwordSalt) {
    const hash = await hashPassword(password, record.passwordSalt);
    return { ok: constantTimeEqual(hash, record.passwordHash) };
  }
  if (typeof record.password === 'string' && record.password.length > 0) {
    if (!constantTimeEqual(password, record.password)) return { ok: false };
    return { ok: true, migrated: await setLocalPassword(record, password) };
  }
  return { ok: false };
}

/** Mesma regra do RPC resolve_login_email do Supabase. */
function resolveLocalUser(users: LocalUserRecord[], identifier: string): LocalUserRecord | undefined {
  const q = identifier.trim().toLowerCase();
  if (!q) return undefined;
  if (q.includes('@')) return users.find((u) => u.email.toLowerCase() === q);

  const byName = users.find((u) => u.name.toLowerCase() === q);
  if (byName) return byName;

  const byPrefix = users.find((u) => u.email.toLowerCase().split('@')[0] === q);
  if (byPrefix) return byPrefix;

  if (q.length >= 3) {
    const words = (name: string) => name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const matches = users.filter((u) => words(u.name).includes(q));
    if (matches.length === 1) return matches[0];
  }
  return undefined;
}

function countAdmins(users: AuthUser[], excludeId?: string): number {
  return users.filter((u) => u.id !== excludeId && isAdminUser(u)).length;
}

function addToResponsibles(user: AuthUser): void {
  // Responsáveis técnicos passam a aparecer na lista de "Responsável pelo Orçamento"
  if (user.role !== 'Responsável Técnico' && user.role !== 'Responsável Técnico e Administrador') return;
  try {
    addStoredResponsible(user.name);
  } catch {
    // erro secundário — ignora
  }
}

// =============================================================================
// MODO SUPABASE — helpers
// =============================================================================
interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string | null;
  avatar_bg: string | null;
  document_registration: string | null;
  phone: string | null;
}

function mapProfile(row: ProfileRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    initials: row.initials || initialsFrom(row.name),
    avatarBg: row.avatar_bg || 'bg-[#004328]',
    documentRegistration: row.document_registration || undefined,
    phone: row.phone || undefined,
  };
}

function requireClient(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado.');
  return client;
}

async function fetchProfile(client: SupabaseClient, userId: string): Promise<AuthUser | null> {
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) return null;
  return mapProfile(data as ProfileRow);
}

function translateAuthError(message: string | undefined): string {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail/usuário ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'E-mail ainda não confirmado.';
  if (m.includes('should be different')) return 'A nova senha deve ser diferente da senha atual.';
  if (m.includes('password should be at least') || m.includes('weak password')) {
    return `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Falha de conexão com o servidor. Verifique sua internet.';
  return message || 'Erro inesperado de autenticação.';
}

/** Chama a Edge Function admin-users (o token da sessão é enviado automaticamente). */
async function invokeAdmin<T = { profile?: ProfileRow; success?: boolean }>(body: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  const client = requireClient();
  const { data, error } = await client.functions.invoke('admin-users', { body });
  if (error) {
    // Extrai a mensagem { error } retornada pela função, se houver
    let msg = error.message;
    const ctx = (error as { context?: unknown }).context;
    if (ctx instanceof Response) {
      try {
        const parsed = await ctx.clone().json();
        if (parsed?.error) msg = parsed.error;
      } catch {
        /* resposta sem JSON */
      }
    }
    return { error: msg || 'Erro ao comunicar com o servidor.' };
  }
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    return { error: (data as { error: string }).error };
  }
  return { data: data as T };
}

// =============================================================================
// INICIALIZAÇÃO / EVENTOS DE SESSÃO (modo Supabase)
// =============================================================================
export interface AuthInitResult {
  user: AuthUser | null;
  /** O usuário chegou pelo link de recuperação de senha e deve definir uma nova. */
  recovery: boolean;
  /** Erro vindo do link do e-mail (ex.: link expirado). */
  linkError?: string;
}

/**
 * Valida a sessão com o servidor. Deve ser chamada uma vez, ao montar o app.
 * No modo local, apenas devolve o usuário do cache.
 */
export async function initAuth(): Promise<AuthInitResult> {
  if (!isRemoteAuth()) return { user: getCurrentUser(), recovery: false };

  // Detecta o link de recuperação ANTES de o cliente consumir o hash da URL
  let recovery = false;
  let linkError: string | undefined;
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, '') + '&' + window.location.search.replace(/^\?/, ''));
    recovery = params.get('type') === 'recovery';
    const errDesc = params.get('error_description') || params.get('error');
    if (errDesc) {
      linkError = params.get('error_code') === 'otp_expired'
        ? 'O link de recuperação expirou ou já foi usado. Solicite um novo.'
        : decodeURIComponent(errDesc.replace(/\+/g, ' '));
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  try {
    const client = requireClient();
    const { data } = await client.auth.getSession();
    const session: Session | null = data.session;
    if (!session) {
      setCurrentUserSession(null);
      return { user: null, recovery: false, linkError };
    }
    const profile = await fetchProfile(client, session.user.id);
    if (!profile) {
      await client.auth.signOut();
      setCurrentUserSession(null);
      return { user: null, recovery: false, linkError: 'Perfil de usuário não encontrado. Contate o administrador.' };
    }
    if (recovery && typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (!recovery) setCurrentUserSession(profile);
    return { user: recovery ? null : profile, recovery, linkError };
  } catch (err) {
    console.warn('Falha ao validar sessão:', err);
    return { user: getCurrentUser(), recovery: false, linkError };
  }
}

/** Observa eventos do Supabase Auth (logout em outra aba, recuperação de senha). */
export function onAuthEvent(callback: (event: 'SIGNED_OUT' | 'PASSWORD_RECOVERY') => void): () => void {
  if (!isRemoteAuth()) return () => {};
  const client = getSupabaseClient();
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' || event === 'PASSWORD_RECOVERY') callback(event);
  });
  return () => data.subscription.unsubscribe();
}

// =============================================================================
// LOGIN / LOGOUT
// =============================================================================
export async function loginUser(identifier: string, pass: string): Promise<AuthResult> {
  const query = (identifier || '').trim();
  const password = (pass || '').trim();
  if (!query || !password) {
    return { success: false, error: 'Por favor, preencha o e-mail ou nome de usuário e a senha de acesso.' };
  }

  if (isRemoteAuth()) {
    try {
      const client = requireClient();
      let email = query.toLowerCase();
      if (!email.includes('@')) {
        const { data, error } = await client.rpc('resolve_login_email', { identifier: query });
        if (error) return { success: false, error: translateAuthError(error.message) };
        if (!data) return { success: false, error: 'E-mail/usuário ou senha incorretos.' };
        email = data as string;
      }
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.user) return { success: false, error: translateAuthError(error?.message) };

      const profile = await fetchProfile(client, data.user.id);
      if (!profile) {
        await client.auth.signOut();
        return { success: false, error: 'Perfil de usuário não encontrado. Contate o administrador.' };
      }
      setCurrentUserSession(profile);
      return { success: true, user: profile };
    } catch (err) {
      return { success: false, error: translateAuthError(err instanceof Error ? err.message : undefined) };
    }
  }

  // ---- modo local ----
  const users = readLocalUsers();
  const found = resolveLocalUser(users, query);
  if (!found) return { success: false, error: 'E-mail/usuário ou senha incorretos.' };

  try {
    const { ok, migrated } = await verifyLocalPassword(found, password);
    if (!ok) return { success: false, error: 'E-mail/usuário ou senha incorretos.' };
    if (migrated) writeLocalUsers(users.map((u) => (u.id === found.id ? migrated : u)));
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao verificar a senha.' };
  }

  const user = sanitize(found);
  setCurrentUserSession(user);
  return { success: true, user };
}

export async function logoutUser(): Promise<void> {
  setCurrentUserSession(null);
  if (isRemoteAuth()) {
    try {
      await getSupabaseClient()?.auth.signOut();
    } catch {
      /* sessão já encerrada */
    }
  }
}

// =============================================================================
// SENHAS
// =============================================================================
/** O próprio usuário altera sua senha, confirmando a senha atual. */
export async function changeUserPassword(userId: string, oldPass: string, newPass: string): Promise<AuthResult> {
  if (!oldPass) return { success: false, error: 'Informe a senha atual.' };
  if (newPass.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `A nova senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.` };
  }

  if (isRemoteAuth()) {
    try {
      const client = requireClient();
      const { data: userData } = await client.auth.getUser();
      const email = userData.user?.email;
      if (!email || userData.user?.id !== userId) {
        return { success: false, error: 'Sessão expirada. Faça login novamente.' };
      }
      const check = await client.auth.signInWithPassword({ email, password: oldPass });
      if (check.error) return { success: false, error: 'Senha atual incorreta.' };
      const { error } = await client.auth.updateUser({ password: newPass });
      if (error) return { success: false, error: translateAuthError(error.message) };
      return { success: true };
    } catch (err) {
      return { success: false, error: translateAuthError(err instanceof Error ? err.message : undefined) };
    }
  }

  const users = readLocalUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return { success: false, error: 'Usuário não encontrado.' };
  const { ok } = await verifyLocalPassword(users[idx]!, oldPass);
  if (!ok) return { success: false, error: 'Senha atual incorreta.' };
  users[idx] = await setLocalPassword(users[idx]!, newPass);
  writeLocalUsers(users);
  return { success: true };
}

/** Administrador define uma nova senha para outro usuário. */
export async function adminResetPassword(userId: string, newPass: string): Promise<AuthResult> {
  if (newPass.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (!isAdminUser(getCurrentUser())) return { success: false, error: 'Apenas administradores podem redefinir senhas.' };

  if (isRemoteAuth()) {
    const res = await invokeAdmin({ action: 'reset_password', user_id: userId, password: newPass });
    return res.error ? { success: false, error: res.error } : { success: true };
  }

  const users = readLocalUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return { success: false, error: 'Usuário não encontrado.' };
  users[idx] = await setLocalPassword(users[idx]!, newPass);
  writeLocalUsers(users);
  return { success: true, user: sanitize(users[idx]!) };
}

/** Envia o link de recuperação para o e-mail (somente modo Supabase). */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail.includes('@')) {
    return { success: false, error: 'Por favor, informe um endereço de e-mail válido.' };
  }
  if (!isRemoteAuth()) {
    return {
      success: false,
      error: 'A recuperação por e-mail está disponível apenas com o Supabase configurado. Peça ao administrador para redefinir sua senha em Configurações > Usuários.',
    };
  }
  try {
    const client = requireClient();
    const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    });
    if (error) return { success: false, error: translateAuthError(error.message) };
    // Mensagem neutra: não revela se o e-mail existe
    return {
      success: true,
      message: `Se ${cleanEmail} estiver cadastrado, você receberá um link para criar uma nova senha. Verifique também a caixa de spam.`,
    };
  } catch (err) {
    return { success: false, error: translateAuthError(err instanceof Error ? err.message : undefined) };
  }
}

/** Conclui a recuperação: define a nova senha após o usuário abrir o link do e-mail. */
export async function completePasswordRecovery(newPass: string): Promise<AuthResult> {
  if (newPass.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `A nova senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  try {
    const client = requireClient();
    const { data, error } = await client.auth.updateUser({ password: newPass });
    if (error || !data.user) return { success: false, error: translateAuthError(error?.message) };
    const profile = await fetchProfile(client, data.user.id);
    if (!profile) return { success: false, error: 'Perfil de usuário não encontrado.' };
    setCurrentUserSession(profile);
    return { success: true, user: profile };
  } catch (err) {
    return { success: false, error: translateAuthError(err instanceof Error ? err.message : undefined) };
  }
}

// =============================================================================
// GESTÃO DE USUÁRIOS
// =============================================================================
export async function listUsers(): Promise<AuthUser[]> {
  if (isRemoteAuth()) {
    try {
      const client = requireClient();
      const { data, error } = await client.from('profiles').select('*').order('name', { ascending: true });
      if (error || !data) return [];
      return (data as ProfileRow[]).map(mapProfile);
    } catch {
      return [];
    }
  }
  return readLocalUsers().map(sanitize);
}

export interface NewUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  documentRegistration?: string;
  phone?: string;
}

/** Cria um novo acesso (somente administradores). */
export async function createUserAccount(input: NewUserInput): Promise<AuthResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return { success: false, error: 'O nome é obrigatório.' };
  if (!email.includes('@')) return { success: false, error: 'E-mail inválido.' };
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (!isAdminUser(getCurrentUser())) return { success: false, error: 'Apenas administradores podem cadastrar usuários.' };

  const colors = ['bg-[#004328]', 'bg-[#145E5B]', 'bg-[#0284c7]', 'bg-[#7c3aed]', 'bg-[#d97706]'];
  const avatarBg = colors[Math.floor(Math.random() * colors.length)];

  let created: AuthUser;
  if (isRemoteAuth()) {
    const res = await invokeAdmin({
      action: 'create',
      name,
      email,
      password: input.password,
      role: input.role,
      document_registration: input.documentRegistration?.trim() || '',
      phone: input.phone?.trim() || '',
      avatar_bg: avatarBg,
    });
    if (res.error || !res.data?.profile) return { success: false, error: res.error || 'Erro ao cadastrar usuário.' };
    created = mapProfile(res.data.profile);
  } else {
    const users = readLocalUsers();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      return { success: false, error: 'Este e-mail já está cadastrado.' };
    }
    const record = await setLocalPassword(
      {
        id: `user-${Date.now()}`,
        name,
        email,
        role: input.role,
        documentRegistration: input.documentRegistration?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        initials: initialsFrom(name),
        avatarBg,
      },
      input.password
    );
    writeLocalUsers([...users, record]);
    created = sanitize(record);
  }

  addToResponsibles(created);
  return { success: true, user: created };
}

/**
 * Atualiza dados cadastrais. Administradores editam qualquer usuário (inclusive
 * perfil e e-mail); os demais editam apenas nome, registro e telefone próprios.
 */
export async function updateUser(userId: string, data: Partial<AuthUser>): Promise<AuthResult> {
  const current = getCurrentUser();
  const admin = isAdminUser(current);
  const isSelf = current?.id === userId;
  if (!admin && !isSelf) return { success: false, error: 'Você só pode editar o seu próprio cadastro.' };

  if (data.name !== undefined && !data.name.trim()) return { success: false, error: 'O nome é obrigatório.' };
  if (data.email !== undefined && !data.email.includes('@')) return { success: false, error: 'E-mail inválido.' };

  let updated: AuthUser;

  if (isRemoteAuth()) {
    if (admin) {
      const res = await invokeAdmin({
        action: 'update',
        user_id: userId,
        name: data.name,
        email: data.email,
        role: data.role,
        document_registration: data.documentRegistration,
        phone: data.phone,
      });
      if (res.error || !res.data?.profile) return { success: false, error: res.error || 'Erro ao atualizar usuário.' };
      updated = mapProfile(res.data.profile);
    } else {
      if ((data.email && data.email.trim().toLowerCase() !== current!.email) || (data.role && data.role !== current!.role)) {
        return { success: false, error: 'Apenas administradores podem alterar e-mail ou perfil de acesso.' };
      }
      const patch: Record<string, unknown> = {};
      if (data.name !== undefined) {
        patch.name = data.name.trim();
        patch.initials = initialsFrom(data.name.trim());
      }
      if (data.documentRegistration !== undefined) patch.document_registration = data.documentRegistration.trim() || null;
      if (data.phone !== undefined) patch.phone = data.phone.trim() || null;
      try {
        const client = requireClient();
        const { data: row, error } = await client.from('profiles').update(patch).eq('id', userId).select('*').single();
        if (error || !row) return { success: false, error: error?.message || 'Erro ao atualizar cadastro.' };
        updated = mapProfile(row as ProfileRow);
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Erro ao atualizar cadastro.' };
      }
    }
  } else {
    const users = readLocalUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return { success: false, error: 'Usuário não encontrado.' };
    const existing = users[idx]!;

    const email = data.email !== undefined ? data.email.trim().toLowerCase() : existing.email;
    const role = data.role || existing.role;
    if (!admin && (email !== existing.email || role !== existing.role)) {
      return { success: false, error: 'Apenas administradores podem alterar e-mail ou perfil de acesso.' };
    }
    if (users.some((u) => u.id !== userId && u.email.toLowerCase() === email)) {
      return { success: false, error: 'Este e-mail já está cadastrado para outro usuário.' };
    }
    if (isAdminUser(existing) && !isAdminUser({ ...existing, role }) && countAdmins(users, userId) === 0) {
      return { success: false, error: 'O sistema precisa de pelo menos um administrador.' };
    }
    const name = data.name !== undefined ? data.name.trim() : existing.name;
    users[idx] = {
      ...existing,
      name,
      email,
      role,
      initials: initialsFrom(name),
      documentRegistration: data.documentRegistration !== undefined ? data.documentRegistration.trim() || undefined : existing.documentRegistration,
      phone: data.phone !== undefined ? data.phone.trim() || undefined : existing.phone,
    };
    writeLocalUsers(users);
    updated = sanitize(users[idx]!);
  }

  if (isSelf) setCurrentUserSession(updated);
  return { success: true, user: updated };
}

/** Remove um acesso (somente administradores; não permite excluir a si mesmo nem o último admin). */
export async function deleteUserAccount(userId: string): Promise<AuthResult> {
  const current = getCurrentUser();
  if (!isAdminUser(current)) return { success: false, error: 'Apenas administradores podem remover usuários.' };
  if (current?.id === userId) return { success: false, error: 'Você não pode excluir sua própria conta.' };

  if (isRemoteAuth()) {
    const res = await invokeAdmin({ action: 'delete', user_id: userId });
    return res.error ? { success: false, error: res.error } : { success: true };
  }

  const users = readLocalUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return { success: false, error: 'Usuário não encontrado.' };
  if (isAdminUser(target) && countAdmins(users, userId) === 0) {
    return { success: false, error: 'O sistema precisa de pelo menos um administrador.' };
  }
  writeLocalUsers(users.filter((u) => u.id !== userId));
  return { success: true };
}
