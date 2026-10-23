# MELHORIAS — Análise do Repositório Concentra (Consentra · Gestão de SST)

> Documento gerado a partir da análise completa do repositório em 23/10/2026
> (commit base `a672a99` — "Add files via upload").

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Estrutura do projeto](#2-estrutura-do-projeto)
3. [Bloqueador: projeto não executável](#3-bloqueador-projeto-não-executável)
4. [Segurança (crítico)](#4-segurança-crítico)
5. [Bugs e problemas de lógica](#5-bugs-e-problemas-de-lógica)
6. [Código morto e duplicação](#6-código-morto-e-duplicação)
7. [Pontos positivos](#7-pontos-positivos)
8. [Roadmap de melhorias (checklist)](#8-roadmap-de-melhorias-checklist)

---

## 1. Visão geral

Sistema de emissão de **orçamentos / propostas técnicas de Saúde e Segurança do Trabalho (SST)**,
com dashboard, pipeline comercial, cadastro de clientes, catálogo de serviços, relatórios,
geração de PDF da proposta e ordem de serviço.

| Item | Valor |
|---|---|
| Stack | Next.js (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase |
| PDF | `jspdf` + `html2pdf.js` |
| Tamanho | ~14 mil linhas de código, 1 commit |
| Persistência | `localStorage` (principal) + Supabase (opcional, *fire-and-forget*) |

**Diagnóstico:** a interface está bem elaborada e o código compila sem erros, mas o projeto é,
na prática, um **protótipo**: o repositório não é executável sozinho, a autenticação é
simulada e o banco de dados está totalmente exposto.

---

## 2. Estrutura do projeto

| Pasta | Conteúdo |
|---|---|
| `app/` | `layout.tsx` + `page.tsx` (614 linhas) — SPA que alterna telas via estado `activeTab` |
| `components/` | 16 telas/modais. Maiores: `NewQuoteView` (1528 linhas), `SettingsView` (1287), `ServicesView` (937), `DashboardView` (918) |
| `lib/` | `auth.ts`, `supabase.ts`, `pdf-generator.ts`, `company.ts`, `masks.ts`, `types.ts`, `mock-data.ts`, `classification-data.ts`, `responsibles.ts`, `logo.ts` |
| `supabase/schema.sql` | 6 tabelas, índices, RLS, triggers `updated_at` e seeds |
| `public/` | ~3,6 MB de logos/favicons |
| `src/assets/` | ~0,8 MB de logos (não utilizados) |

---

## 3. Bloqueador: projeto não executável

### 3.1 Arquivos de configuração ausentes

Não existem no repositório:

- `package.json` (e lockfile)
- `tsconfig.json` (o código usa o alias `@/*`)
- `next.config.(js|ts)`
- `postcss.config.mjs` (necessário para Tailwind v4)
- `.gitignore`
- `.env.example`

Sem eles não é possível rodar `npm install` / `npm run dev`.

**Validação feita:** em uma cópia temporária (fora do repo), adicionando as configurações com as
dependências inferidas dos imports, o resultado foi:

- `tsc --noEmit` em modo **strict** → **0 erros**
- `next build` → **compilou com sucesso** (rota `/` com 373 kB de First Load JS)

Dependências necessárias identificadas:

```
dependencies:    next, react, react-dom, @supabase/supabase-js, jspdf, html2pdf.js, clsx, tailwind-merge
devDependencies: typescript, @types/react, @types/react-dom, @types/node, tailwindcss@4, @tailwindcss/postcss
```

> ⚠️ Usar uma versão **atual e corrigida** do Next.js (versões 15.x antigas possuem
> vulnerabilidade conhecida — CVE-2025-66478).

### 3.2 Arquivos-lixo do upload

Arquivos de 1 byte (apenas uma quebra de linha), criados provavelmente pelo upload via web:

- `app/app`
- `components/components`
- `hooks/hooks`
- `lib/lib`
- `public/public`
- `src/src`
- `src/assets/assets`
- `src/assets/images/images`
- `supabase/supabase`

### 3.3 Documentação

- `README.md` contém apenas `# Concentra`.
- Observação: o repositório se chama **Concentra**, mas o produto se chama **Consentra**.

---

## 4. Segurança (crítico)

### 4.1 Autenticação (`lib/auth.ts`)

| # | Problema | Local |
|---|---|---|
| S1 | **A senha `123` autentica qualquer usuário**, inclusive administradores (`|| (cleanPassInput === '123')`) | `lib/auth.ts:248` |
| S2 | **Usuários inexistentes com ≥ 3 caracteres são criados automaticamente** como "Responsável Técnico" | `lib/auth.ts:213` |
| S3 | **Qualquer código de 6 dígitos** é aceito na redefinição de senha (`cleanCode.length === 6`), além do código mestre `123456` | `lib/auth.ts:545` |
| S4 | O código de recuperação "enviado por e-mail" é exibido na própria tela | `components/LoginView.tsx` |
| S5 | `changeUserPassword` aceita `admin` como senha atual de qualquer usuário | `lib/auth.ts:385` |
| S6 | Senhas armazenadas em **texto puro** no `localStorage` e na coluna `users.password` | `lib/auth.ts`, `supabase/schema.sql` |
| S7 | Sessão é apenas um JSON no `localStorage`; checagem de admin (`isAdminUser`) feita só no cliente | `lib/auth.ts` |
| S8 | Busca de login com nomes fixos no código (`washington`, `mariana`, `roberto`, `amanda`) e fallback em `DEFAULT_USERS` | `lib/auth.ts` |

### 4.2 Banco de dados (`supabase/schema.sql`)

- Todas as tabelas possuem política `FOR ALL USING (true) WITH CHECK (true)` (a partir da linha 158).
- A *anon key* do Supabase é pública (vai no bundle do navegador) → **qualquer pessoa pode ler a
  tabela `users` (incluindo senhas) e inserir/alterar/apagar qualquer registro**.
- Credenciais do Supabase também podem ser lidas do `localStorage` (`consentra_supabase_url` /
  `consentra_supabase_anon_key`).

### 4.3 Correção recomendada

1. Migrar para **Supabase Auth** (`supabase.auth.signInWithPassword`, reset de senha por e-mail nativo).
2. Remover a coluna `password` de `public.users`; transformar `users` em tabela de **perfis**
   vinculada a `auth.users(id)`.
3. Reescrever as políticas RLS com base em `auth.uid()` e no papel (role) do usuário.
4. Remover todas as senhas-coringa, a criação automática de contas e os nomes fixos.
5. Validar permissões de administrador também no banco (RLS / funções `SECURITY DEFINER`).

---

## 5. Bugs e problemas de lógica

| # | Problema | Local | Impacto |
|---|---|---|---|
| B1 ✅ | **Resolvido (Fase 3).** Campos `customTexts`, `headerConfig` e `paymentNotes` existem em `Quote`, mas **não estão no schema nem no mapeamento** do Supabase | `lib/types.ts`, `lib/supabase.ts`, `supabase/schema.sql` | Perda de dados ao usar Supabase |
| B2 ✅ | **Resolvido (Fase 3).** "Zerar sistema" (`handleClearAllQuotes`) limpa apenas o estado local; ao recarregar, os orçamentos **voltam do Supabase** | `app/page.tsx:260` | Comportamento enganoso |
| B3 ✅ | **Resolvido (Fase 3).** `saveQuoteToSupabase` apaga os itens e reinsere **sem transação**; se o insert falhar, os itens somem (erro só no console) | `lib/supabase.ts:265` | Perda de dados |
| B4 ✅ | **Resolvido (Fase 3).** Numeração de orçamentos parte de `318` fixo, com regra especial para `#319`; ids antigos com `#`, novos sem; não há sequência no banco | `app/page.tsx:183, 232, 340` | Números duplicados entre navegadores/usuários |
| B5 ✅ | **Resolvido (Fase 3).** `handleSelectServiceForNewQuote` não persiste no Supabase | `app/page.tsx:365` | Alterações perdidas |
| B6 ✅ | **Resolvido (Fase 3).** Catálogo de serviços existe só em memória (`useState(CATALOG_SERVICES)`); edições somem ao recarregar. A tabela `catalog_services` nunca é usada | `components/ServicesView.tsx:13` | Funcionalidade incompleta |
| B7 ✅ | **Resolvido (Fase 3).** Carga do Supabase só substitui os dados locais se o remoto **não estiver vazio**; não há merge nem tratamento de conflito | `app/page.tsx` | Divergência silenciosa local × remoto |
| B8 ✅ | **Resolvido (Fase 3).** Erros de gravação no Supabase são ignorados (`.catch(() => {})`) e o toast de sucesso aparece mesmo assim | `app/page.tsx` | Usuário não sabe que falhou |
| B9 ✅ | **Resolvido (Fase 3).** Datas armazenadas como texto `dd/mm/aaaa` (`issue_date`, `validity_date`) | `supabase/schema.sql` | Ordenação/filtros incorretos no banco |
| B10 ✅ | **Resolvido (Fases 2/3).** Seeds do SQL divergem do código (`user_washington` × `user-washington`; "Mariana Souza" × "Dra. Mariana Rios"; lista de responsáveis diferente de `lib/responsibles.ts`); dados da empresa também divergem (`app_settings` × `COMPANY_PROFILE`) | `supabase/schema.sql`, `lib/auth.ts`, `lib/mock-data.ts` | Inconsistência de dados |
| B11 | Envio de e-mail é **simulado** (`setTimeout` + toast de "enviado") | `components/EmailModal.tsx:29` | Funcionalidade falsa |
| B12 | Notificações fixas no código, incluindo "Sistema Conectado ao Supabase — Ativo" mesmo sem conexão | `components/Header.tsx:103` | Informação enganosa |
| B13 ✅ | **Resolvido (Fase 3).** Logo customizado salvo como base64 no `localStorage` (limite ~5 MB) | `lib/logo.ts` | Pode estourar a cota e quebrar outras gravações |
| B14 ✅ | **Resolvido (Fase 2).** Usuários nunca são sincronizados com o Supabase (funções existem mas não são chamadas) | `lib/supabase.ts` | Usuários existem só no navegador |
| B15 ✅ | **Resolvido (Fase 2).** `process.env.VITE_*` não é exposto ao cliente no Next.js (apenas `NEXT_PUBLIC_*`) | `lib/supabase.ts:13-14` | Configuração confusa |
| B16 ✅ | **Resolvido (Fase 4).** `alert()` / `confirm()` nativos misturados com toasts customizados | vários componentes | UX inconsistente |

---

## 6. Código morto e duplicação

### 6.1 Arquivos nunca importados

- ~~`lib/supabaseClient.ts`~~ ✅ removido
- ~~`lib/supabase-schema-text.ts` (cópia literal de `supabase/schema.sql` em string)~~ ✅ removido
- ~~`lib/utils.ts` (função `cn`)~~ ✅ removido (Fase 4, junto com `clsx` e `tailwind-merge`)
- ~~`hooks/use-mobile.ts`~~ ✅ removido (Fase 4)
- ~~`src/assets/` (pasta inteira)~~ ✅ removida (Fase 4)

### 6.2 Funções exportadas nunca chamadas

- ~~`syncAllLocalDataToSupabase`~~ ✅ removida
- ~~`testSupabaseConnection`~~ ✅ removida
- ~~`saveCustomSupabaseCredentials`~~ ✅ removida
- ~~`fetchUsersFromSupabase`~~ ✅ removida
- ~~`saveUserToSupabase`~~ ✅ removida
- ~~`fetchQuotesFromSupabase` / `fetchClientsFromSupabase`, `DIRECT_MARK_LOGO_URL`, `DEFAULT_REAL_LOGO_URL`, handlers de classificação não usados em `NewQuoteView`~~ ✅ removidos (Fase 4)

### 6.3 Lógica duplicada

- ~~Filtros para remover o usuário "Carlos Eduardo" espalhados em `auth.ts` e `responsibles.ts`.~~ ✅ Centralizado em `sanitizeResponsibles()` (Fase 4).
- ~~Lista padrão de responsáveis repetida em `auth.ts`, `responsibles.ts`, `classification-data.ts` e no SQL.~~ ✅ Fonte única `DEFAULT_RESPONSIBLES`; filtros usam a lista cadastrada (Fase 4).
- ~~Bloco de opções do `html2pdf` copiado 3× em `lib/pdf-generator.ts` (linhas ~338, ~381, ~424).~~ ✅ `buildQuotePdfOptions()` (Fase 4).
- ~~Lógica "próximo número de orçamento" repetida 3× em `app/page.tsx`.~~ ✅ Unificada (Fase 3).
- ~~Toast duplicado em `app/page.tsx` (tela de login e tela principal).~~ ✅ Unificado (Fase 3).
- ~~Tags `<link rel="icon">` duplicadas manualmente em `layout.tsx` além de `metadata.icons`.~~ ✅ Removidas (Fase 4).

### 6.4 Assets duplicados (mesmo hash MD5)

| Arquivo | Duplicata de |
|---|---|
| `public/logo-consentra.png` | `public/logo-consentra-horizontal.png` |
| `public/logo-consentra-transparent.png` | `public/logo-consentra-clean.png` |
| `src/assets/images/consentra_logo_real_1789050726678.jpg` | `public/logo-consentra-real.jpg` |

Além disso, há vários logos possivelmente não usados (`extracted_logo.png`, `test-logo.svg`,
`logo-shield.svg`, SVGs de 300–400 KB com bitmap embutido, etc.).

✅ **Fase 4:** removidos todos os duplicados e não usados; `public/` ficou só com `favicon.ico`,
`favicon-32x32.png`, `favicon-192.png` e `logo-consentra-horizontal.png` (~3,6 MB → ~0,3 MB).

---

## 7. Pontos positivos

- TypeScript **strict sem erros**; tipos de domínio (`Quote`, `QuoteItem`, `ClientData`, `CatalogService`) bem definidos.
- UI consistente, com design tokens próprios no Tailwind v4 (`@theme` em `globals.css`).
- Linguagem e regras de negócio adequadas ao mercado brasileiro de SST (NRs, eSocial, ART/CREA).
- Recursos úteis já prontos: máscaras BR, cálculo de validade, exportação CSV com BOM (compatível com Excel),
  PDF fiel à tela, envio por WhatsApp (`wa.me`), classificação em cascata (macro/subcategoria/status).
- Tratamento de hidratação do Next.js com `useSyncExternalStore`.
- Schema SQL com índices e triggers de `updated_at`.

---

## 8. Roadmap de melhorias (checklist)

### Fase 1 — Tornar o projeto executável ✅ concluída

- [x] Adicionar `package.json` com versões atuais (Next.js 16.4, React 19.3, Tailwind 4.3) e lockfile
- [x] Adicionar `tsconfig.json` com alias `@/*`
- [x] Adicionar `next.config.ts` (com `ALLOWED_DEV_ORIGINS` opcional para previews/túneis) e `postcss.config.mjs` (Tailwind v4)
- [x] Adicionar `.gitignore` (`node_modules`, `.next`, `.env*`, etc.)
- [x] Adicionar `.env.example` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] Remover os arquivos-lixo de 1 byte
- [x] Escrever README (descrição, setup, variáveis de ambiente, como aplicar o schema)
- [x] Configurar ESLint (flat config `eslint-config-next`) e scripts `lint` / `typecheck`
- [x] Corrigir os 18 erros de lint (tipos `any` em `lib/supabase.ts`, `lib/pdf-generator.ts` e componentes; `setState` em efeito no `ServiceOrderModal`)
- [x] CI no GitHub Actions rodando `lint` + `typecheck` + `build` (`.github/workflows/ci.yml`)
- [ ] Prettier (opcional)
- [ ] Zerar os 53 *warnings* restantes de lint (variáveis não usadas, `<img>` em vez de `next/image`) → tratado na Fase 4

> ESLint mantido na v9: os plugins usados pelo `eslint-config-next` (`react`, `import`, `jsx-a11y`)
> ainda não declaram suporte oficial ao ESLint 10.

### Fase 2 — Segurança ✅

- [x] Migrar login para Supabase Auth (bcrypt no servidor; mesmos usuários e senhas de antes)
- [x] Remover senha-coringa `123`, código `123456`/qualquer 6 dígitos e `admin` como senha atual
- [x] Remover criação automática de contas no login e na recuperação de senha
- [x] Remover coluna `password` e transformar `users` em `profiles` ligada a `auth.users`
- [x] Reescrever políticas RLS por `auth.uid()` e role (anon bloqueado; Auditor SST só leitura; `app_settings` só admin; troca de perfil/e-mail só por admin, via gatilho)
- [x] Remover leitura de credenciais do Supabase via `localStorage`
- [x] Gestão de usuários (criar/editar/redefinir senha/excluir) pela Edge Function `admin-users`, com a service role apenas no servidor
- [x] Cadastro público removido (signup desativado no Auth); recuperação de senha por link de e-mail
- [x] Modo local endurecido: sem atalhos, senhas com hash SHA-256 + salt (migração automática)
- [ ] Trocar as senhas padrão (expostas no repositório público), quando o cliente decidir
- [ ] Configurar SMTP próprio e o domínio de produção nas Redirect URLs do Supabase

### Fase 3 — Dados e persistência ✅

- [x] Adicionar ao schema: `custom_texts JSONB`, `header_config JSONB`, `payment_notes TEXT` (+ `created_by` / `updated_by`)
- [x] Converter `issue_date` / `validity_date` para `DATE` (o app continua exibindo `dd/mm/aaaa`; a conversão fica em `lib/supabase.ts`)
- [x] Criar `SEQUENCE` + RPC `next_quote_number()` (começa em 319); ids padronizados sem `#` (constraint no banco); `number_only` único
- [x] Gravar orçamento + itens em uma única função RPC `save_quote()` (transação; RLS continua valendo)
- [x] Persistir catálogo de serviços (`catalog_services`) e configurações (`app_settings`: empresa, textos do PDF, responsáveis, logotipo)
- [x] Sincronizar usuários/perfis (feito na Fase 2 com Supabase Auth + `profiles`)
- [x] "Zerar sistema" apaga no Supabase via RPC `clear_all_quotes('ZERAR')`: somente administradores, exige digitar ZERAR
- [x] Exibir erro ao usuário quando a gravação remota falhar (toast vermelho + recarga dos dados do servidor)
- [x] Unificar seeds do SQL com os padrões do código (catálogo = 12 serviços de `lib/mock-data.ts`; empresa/textos usam o padrão do código quando não há registro)
- [x] Mover logo customizado para Supabase Storage (bucket público `branding`, escrita só admin, máx. 2 MB); no modo local, limite de 1 MB
- [x] Importação dos dados que estavam só no navegador (orçamentos, clientes e configurações) em Configurações

### Fase 4 — Arquitetura e qualidade de código ✅

- [x] Quebrar `app/page.tsx` (846 → ~110 linhas): store em **Context** (`lib/store/AppDataContext.tsx`, hook `useAppData`) + `components/Workspace.tsx` (abas e modais). Escolhido Context em vez de rotas por ser menor o risco (estado compartilhado entre abas e fila de salvamento); rotas podem vir depois sobre o mesmo store
- [x] Dividir componentes grandes: `SettingsView` (1385 → ~450; seções Usuários, Responsáveis e Logotipo em `components/settings/`), `NewQuoteView` (modal de catálogo em `components/quote/`, cálculos em `lib/quote-calc.ts`), `ServicesView` (drawer em `components/services/`), `DashboardView` (filtros em `components/dashboard/`, indicadores em `lib/dashboard-metrics.ts`)
- [x] Camada de repositório única (`lib/repository`: interface + implementações local e Supabase); as telas não testam mais o modo
- [x] Opções do `html2pdf` em `buildQuotePdfOptions()` (+ `quotePdfFileName()`)
- [x] `ToastProvider` (`useToast`) e `DialogProvider` (`useDialog().confirm`) substituem os 10 `alert`/`confirm` e os toasts próprios de cada tela
- [x] Código morto (seção 6) e assets duplicados/não usados removidos; `clsx`/`tailwind-merge` desinstalados
- [x] Imagens: `public/` de ~3,6 MB para ~0,3 MB (sem SVGs com bitmap). Logotipo centralizado em `BrandLogo` com `<img>` justificado (logo dinâmico + html2canvas — `next/image` exigiria `unoptimized` sem ganho)
- [x] Testes Vitest (48): máscaras/datas, totais/parcelas, mapeamentos do Supabase, repositório local/numeração, importação local/responsáveis, indicadores do dashboard e busca no catálogo. `npm test` no CI
- [x] Lint com zero avisos (`--max-warnings=0`)

### Fase 5 — Funcionalidades reais

- [ ] Envio de e-mail real com PDF anexo (Resend / SMTP via Supabase Edge Function ou API Route)
- [ ] Notificações calculadas a partir dos dados (orçamentos vencendo, aguardando retorno, etc.)
- [ ] Indicador real de status da conexão com o Supabase
- [ ] Histórico/auditoria de alterações de status do orçamento
