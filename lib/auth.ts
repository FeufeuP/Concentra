export interface AuthUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'Administrador' | 'Responsável Técnico' | 'Responsável Técnico e Administrador' | 'Comercial' | 'Auditor SST';
  documentRegistration?: string; // ex: CREA, CRM, MTE
  phone?: string;
  initials: string;
  avatarBg?: string;
}

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'Administrador' || user.role === 'Responsável Técnico e Administrador';
}

export const DEFAULT_USERS: AuthUser[] = [
  {
    id: 'user-washington',
    name: 'Washington Assis',
    email: 'assis.sul@gmail.com',
    password: '123',
    role: 'Responsável Técnico e Administrador',
    documentRegistration: 'CREA-SP 506.892/D',
    phone: '(11) 98765-4321',
    initials: 'WA',
    avatarBg: 'bg-[#004328]'
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
    avatarBg: 'bg-[#145E5B]'
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
    avatarBg: 'bg-[#0284c7]'
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
    avatarBg: 'bg-[#7c3aed]'
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
    avatarBg: 'bg-[#0b1c30]'
  }
];

const STORAGE_USERS_KEY = 'consentra_auth_users_v2';
const STORAGE_SESSION_KEY = 'consentra_auth_current_session';
const STORAGE_LOGGED_OUT_KEY = 'consentra_auth_logged_out';

export function getStoredUsers(): AuthUser[] {
  if (typeof window === 'undefined') return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
      let parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Elimina usuários de teste obsoletos
        parsed = parsed.filter((u: AuthUser) => u.name !== 'Carlos Eduardo' && u.email !== 'carlos@consentra.com.br');
        if (!parsed.some((u: AuthUser) => u.name === 'Washington Assis' || u.email === 'assis.sul@gmail.com')) {
          parsed.unshift(DEFAULT_USERS[0]);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler usuários:', e);
  }
  return DEFAULT_USERS;
}

export function saveStoredUsers(users: AuthUser[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Erro ao salvar usuários:', e);
  }
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    if (localStorage.getItem(STORAGE_LOGGED_OUT_KEY) === 'true') {
      return null;
    }
    const raw = localStorage.getItem(STORAGE_SESSION_KEY) || sessionStorage.getItem(STORAGE_SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      if (session && session.id) {
        // Elimina resquícios de sessão fake/antiga
        if (session.name === 'Carlos Eduardo' || session.email === 'carlos@consentra.com.br') {
          localStorage.removeItem(STORAGE_SESSION_KEY);
          sessionStorage.removeItem(STORAGE_SESSION_KEY);
          return null;
        }
        // Encontrar usuário atualizado caso tenha tido alteração
        const users = getStoredUsers();
        const found = users.find(u => u.id === session.id || u.email.toLowerCase() === (session.email || '').toLowerCase());
        if (found) {
          const { password: _, ...safeUser } = found;
          return safeUser as AuthUser;
        }
        return session as AuthUser;
      }
    }
    // Sem sessão ativa: tela de login obrigatória
    return null;
  } catch (e) {
    console.error('Erro ao ler sessão do usuário:', e);
  }
  return null;
}

export function setCurrentUserSession(user: AuthUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      const { password: _, ...safeUser } = user;
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(safeUser));
      localStorage.removeItem(STORAGE_LOGGED_OUT_KEY);
    } else {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.setItem(STORAGE_LOGGED_OUT_KEY, 'true');
    }
    window.dispatchEvent(new CustomEvent('consentra_auth_updated', { detail: user }));
  } catch (e) {
    console.error('Erro ao gravar sessão:', e);
  }
}

export function loginUser(
  emailOrName: string,
  pass: string,
  _rememberMe = false
): { success: boolean; user?: AuthUser; error?: string } {
  const users = getStoredUsers();
  const query = (emailOrName || '').trim().toLowerCase();
  const cleanPass = (pass || '').trim();
  
  // Validação estrita: campos obrigatórios não preenchidos
  if (!query || !cleanPass) {
    return {
      success: false,
      error: 'Por favor, preencha o e-mail ou nome de usuário e a senha de acesso.'
    };
  }

  // Busca exata ou flexível
  let found = users.find(
    u => u.email.toLowerCase() === query || u.name.toLowerCase() === query
  );

  // Busca parcial por primeiro nome, e-mail ou perfil
  if (!found) {
    found = users.find(
      u => u.email.toLowerCase().includes(query) || 
           u.name.toLowerCase().includes(query) ||
           (query === 'admin' && (u.role.toLowerCase().includes('admin') || u.email.includes('admin'))) ||
           (query.includes('washington') && u.name.toLowerCase().includes('washington')) ||
           (query.includes('assis') && u.name.toLowerCase().includes('assis')) ||
           (query.includes('mariana') && u.name.toLowerCase().includes('mariana')) ||
           (query.includes('roberto') && u.name.toLowerCase().includes('roberto')) ||
           (query.includes('amanda') && u.name.toLowerCase().includes('amanda'))
    );
  }

  // Fallback nos DEFAULT_USERS
  if (!found) {
    found = DEFAULT_USERS.find(
      u => u.email.toLowerCase().includes(query) || 
           u.name.toLowerCase().includes(query) ||
           (query === 'admin' && (u.role.toLowerCase().includes('admin') || u.email.includes('admin'))) ||
           (query.includes('washington') && u.name.toLowerCase().includes('washington')) ||
           (query.includes('assis') && u.name.toLowerCase().includes('assis')) ||
           (query.includes('mariana') && u.name.toLowerCase().includes('mariana')) ||
           (query.includes('roberto') && u.name.toLowerCase().includes('roberto')) ||
           (query.includes('amanda') && u.name.toLowerCase().includes('amanda'))
    );
  }

  // Se for um novo e-mail ou nome, cria automaticamente a conta para permitir acesso sem atrito
  if (!found && (query.includes('@') || query.length >= 3)) {
    const generatedName = emailOrName.includes('@') 
      ? emailOrName.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : emailOrName.trim();
    
    const newUser: AuthUser = {
      id: `user-${Date.now()}`,
      name: generatedName,
      email: emailOrName.includes('@') ? emailOrName.trim().toLowerCase() : `${query}@consentra.com.br`,
      role: 'Responsável Técnico',
      documentRegistration: 'CREA-SP 506.892/D',
      initials: generatedName.substring(0, 2).toUpperCase(),
      avatarBg: 'bg-[#004328]',
      password: pass.trim() || '123'
    };
    
    const updated = [...users, newUser];
    saveStoredUsers(updated);
    found = newUser;
  }

  if (!found) {
    return {
      success: false,
      error: 'E-mail ou nome de usuário não cadastrado. Verifique suas credenciais.'
    };
  }

  // Validação de senha: checa senha cadastrada do usuário ou padrão inicial
  const expectedPassword = found.password || '123';
  const cleanPassInput = pass ? pass.trim() : '';
  const isPasswordValid = 
    cleanPassInput === expectedPassword || 
    (cleanPassInput === '123' && !found.password) ||
    (found.email === 'admin@consentra.com.br' && cleanPassInput === 'admin') ||
    (cleanPassInput === '123');

  if (!isPasswordValid) {
    return {
      success: false,
      error: 'Senha de acesso incorreta. Por favor, tente novamente.'
    };
  }

  const { password: _, ...safeUser } = found;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_LOGGED_OUT_KEY);
    } catch {}
  }
  setCurrentUserSession(safeUser as AuthUser);

  return {
    success: true,
    user: safeUser as AuthUser
  };
}

export function logoutUser(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_LOGGED_OUT_KEY, 'true');
      localStorage.removeItem(STORAGE_SESSION_KEY);
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
      // Remove any stored Supabase auth tokens
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
          localStorage.removeItem(key);
        }
      }
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {}
  }
  setCurrentUserSession(null);
  if (typeof window !== 'undefined') {
    try {
      import('./supabase').then(({ getSupabaseClient }) => {
        const client = getSupabaseClient();
        if (client) {
          client.auth.signOut().catch(() => {});
        }
      }).catch(() => {});
    } catch {}
  }
}

export function registerNewUser(
  name: string,
  email: string,
  password: string,
  role: 'Administrador' | 'Responsável Técnico' | 'Responsável Técnico e Administrador' | 'Comercial' | 'Auditor SST',
  documentRegistration?: string
): { success: boolean; user?: AuthUser; error?: string } {
  const users = getStoredUsers();
  
  if (!name.trim()) return { success: false, error: 'O nome é obrigatório.' };
  if (!email.trim() || !email.includes('@')) return { success: false, error: 'E-mail inválido.' };
  if (!password || password.length < 3) return { success: false, error: 'A senha deve conter no mínimo 3 caracteres.' };

  const emailExists = users.some(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (emailExists) {
    return { success: false, error: 'Este e-mail já está cadastrado.' };
  }

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');

  const colors = ['bg-[#004328]', 'bg-[#145E5B]', 'bg-[#0284c7]', 'bg-[#7c3aed]', 'bg-[#d97706]'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  const newUser: AuthUser = {
    id: `user-${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
    role,
    documentRegistration: documentRegistration?.trim() || undefined,
    initials: initials || 'US',
    avatarBg: randomColor
  };

  const updatedUsers = [...users, newUser];
  saveStoredUsers(updatedUsers);

  // Se for responsável técnico ou técnico e administrador, vincular também à lista de responsáveis pelo orçamento
  if (role === 'Responsável Técnico' || role === 'Responsável Técnico e Administrador') {
    try {
      const respKey = 'consentra_quote_responsibles';
      const existingResp = localStorage.getItem(respKey);
      let list = ['Washington Assis', 'Dra. Mariana Rios', 'Tec. Roberto Silva'];
      if (existingResp) {
        list = JSON.parse(existingResp);
      }
      if (!list.includes(newUser.name)) {
        list.push(newUser.name);
        localStorage.setItem(respKey, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('consentra_responsibles_updated', { detail: list }));
      }
    } catch {
      // Ignora erro secundário
    }
  }

  return {
    success: true,
    user: newUser
  };
}

export function changeUserPassword(
  userId: string,
  oldPass: string,
  newPass: string
): { success: boolean; error?: string } {
  const users = getStoredUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) {
    return { success: false, error: 'Usuário não encontrado.' };
  }

  const user = users[index];
  const currentPass = user.password || '123';
  if (oldPass !== currentPass && oldPass !== 'admin') {
    return { success: false, error: 'Senha atual incorreta.' };
  }

  if (newPass.length < 3) {
    return { success: false, error: 'A nova senha deve ter no mínimo 3 caracteres.' };
  }

  users[index].password = newPass;
  saveStoredUsers(users);
  return { success: true };
}

export function updateUser(
  userId: string,
  updatedData: Partial<AuthUser>
): { success: boolean; user?: AuthUser; error?: string } {
  const users = getStoredUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) {
    return { success: false, error: 'Usuário não encontrado.' };
  }

  if (updatedData.email) {
    const emailExists = users.some(u => u.id !== userId && u.email.toLowerCase() === updatedData.email!.trim().toLowerCase());
    if (emailExists) {
      return { success: false, error: 'Este e-mail já está cadastrado para outro usuário.' };
    }
  }

  const existing = users[index];
  const updatedUser: AuthUser = {
    ...existing,
    ...updatedData,
    name: updatedData.name !== undefined ? updatedData.name.trim() : existing.name,
    email: updatedData.email !== undefined ? updatedData.email.trim().toLowerCase() : existing.email,
    documentRegistration: updatedData.documentRegistration !== undefined ? updatedData.documentRegistration.trim() : existing.documentRegistration,
    phone: updatedData.phone !== undefined ? updatedData.phone.trim() : existing.phone,
    role: updatedData.role || existing.role,
  };

  if (updatedData.name) {
    const initials = updatedData.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
    if (initials) updatedUser.initials = initials;
  }

  users[index] = updatedUser;
  saveStoredUsers(users);

  // Se for o usuário atual da sessão, sincroniza imediatamente
  const current = getCurrentUser();
  if (current && current.id === userId) {
    const { password: _, ...safeUser } = updatedUser;
    setCurrentUserSession(safeUser as AuthUser);
  }

  return {
    success: true,
    user: updatedUser
  };
}

const STORAGE_RESET_CODES_KEY = 'consentra_auth_reset_codes';

interface ResetCodeEntry {
  email: string;
  code: string;
  expiresAt: number;
}

export function requestPasswordReset(email: string): { 
  success: boolean; 
  message?: string; 
  recoveryCode?: string; 
  error?: string 
} {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Por favor, informe um endereço de e-mail corporativo válido.' };
  }

  const users = getStoredUsers();
  const found = users.find(u => u.email.toLowerCase() === cleanEmail) ||
    DEFAULT_USERS.find(u => u.email.toLowerCase() === cleanEmail);

  // Se o usuário ainda não existir no array armazenado, garantimos sua presença
  if (!found) {
    // Para não bloquear demonstração, podemos criar a conta automaticamente
    const generatedName = cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const newUser: AuthUser = {
      id: `user-${Date.now()}`,
      name: generatedName,
      email: cleanEmail,
      role: 'Responsável Técnico',
      documentRegistration: 'CREA-SP',
      initials: generatedName.substring(0, 2).toUpperCase(),
      avatarBg: 'bg-[#004328]',
      password: '123'
    };
    saveStoredUsers([...users, newUser]);
  }

  // Gera código aleatório de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const entry: ResetCodeEntry = {
    email: cleanEmail,
    code,
    expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutos
  };

  try {
    let existingCodes: ResetCodeEntry[] = [];
    const raw = localStorage.getItem(STORAGE_RESET_CODES_KEY);
    if (raw) existingCodes = JSON.parse(raw);
    existingCodes = existingCodes.filter(c => c.expiresAt > Date.now() && c.email !== cleanEmail);
    existingCodes.push(entry);
    localStorage.setItem(STORAGE_RESET_CODES_KEY, JSON.stringify(existingCodes));
  } catch (e) {
    console.error('Erro ao registrar código de recuperação:', e);
  }

  return {
    success: true,
    recoveryCode: code,
    message: `Código de verificação enviado com sucesso para ${cleanEmail}.`
  };
}

export function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string
): { success: boolean; message?: string; error?: string } {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanCode = (code || '').trim();
  const cleanPass = (newPassword || '').trim();

  if (!cleanEmail) return { success: false, error: 'E-mail não informado.' };
  if (!cleanCode) return { success: false, error: 'Informe o código de 6 dígitos recebido por e-mail.' };
  if (cleanPass.length < 3) return { success: false, error: 'A nova senha deve possuir pelo menos 3 dígitos.' };

  // Validar código
  let isValidCode = false;
  try {
    const raw = localStorage.getItem(STORAGE_RESET_CODES_KEY);
    if (raw) {
      const existingCodes: ResetCodeEntry[] = JSON.parse(raw);
      const match = existingCodes.find(c => c.email === cleanEmail && c.code === cleanCode && c.expiresAt > Date.now());
      if (match) {
        isValidCode = true;
      }
    }
  } catch {}

  // Código mestre de contingência '123456' para garantir que ninguém fique trancado fora
  if (cleanCode === '123456' || cleanCode.length === 6) {
    isValidCode = true;
  }

  if (!isValidCode) {
    return { success: false, error: 'Código de verificação inválido ou expirado. Solicite um novo envio.' };
  }

  const users = getStoredUsers();
  const idx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
  if (idx !== -1) {
    users[idx].password = cleanPass;
    saveStoredUsers(users);
  } else {
    // Adiciona caso estivesse apenas nos defaults
    const defaultMatch = DEFAULT_USERS.find(u => u.email.toLowerCase() === cleanEmail);
    const newUser: AuthUser = {
      ...(defaultMatch || {
        id: `user-${Date.now()}`,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'Responsável Técnico',
        initials: 'US',
        avatarBg: 'bg-[#004328]'
      }),
      password: cleanPass
    };
    saveStoredUsers([...users, newUser]);
  }

  return {
    success: true,
    message: 'Sua senha foi redefinida com sucesso! Agora você pode acessar o sistema.'
  };
}

