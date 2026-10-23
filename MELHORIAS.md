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
| B1 | Campos `customTexts`, `headerConfig` e `paymentNotes` existem em `Quote`, mas **não estão no schema nem no mapeamento** do Supabase | `lib/types.ts`, `lib/supabase.ts`, `supabase/schema.sql` | Perda de dados ao usar Supabase |
| B2 | "Zerar sistema" (`handleClearAllQuotes`) limpa apenas o estado local; ao recarregar, os orçamentos **voltam do Supabase** | `app/page.tsx:260` | Comportamento enganoso |
| B3 | `saveQuoteToSupabase` apaga os itens e reinsere **sem transação**; se o insert falhar, os itens somem (erro só no console) | `lib/supabase.ts:265` | Perda de dados |
| B4 | Numeração de orçamentos parte de `318` fixo, com regra especial para `#319`; ids antigos com `#`, novos sem; não há sequência no banco | `app/page.tsx:183, 232, 340` | Números duplicados entre navegadores/usuários |
| B5 | `handleSelectServiceForNewQuote` não persiste no Supabase | `app/page.tsx:365` | Alterações perdidas |
| B6 | Catálogo de serviços existe só em memória (`useState(CATALOG_SERVICES)`); edições somem ao recarregar. A tabela `catalog_services` nunca é usada | `components/ServicesView.tsx:13` | Funcionalidade incompleta |
| B7 | Carga do Supabase só substitui os dados locais se o remoto **não estiver vazio**; não há merge nem tratamento de conflito | `app/page.tsx` | Divergência silenciosa local × remoto |
| B8 | Erros de gravação no Supabase são ignorados (`.catch(() => {})`) e o toast de sucesso aparece mesmo assim | `app/page.tsx` | Usuário não sabe que falhou |
| B9 | Datas armazenadas como texto `dd/mm/aaaa` (`issue_date`, `validity_date`) | `supabase/schema.sql` | Ordenação/filtros incorretos no banco |
| B10 | Seeds do SQL divergem do código (`user_washington` × `user-washington`; "Mariana Souza" × "Dra. Mariana Rios"; lista de responsáveis diferente de `lib/responsibles.ts`); dados da empresa também divergem (`app_settings` × `COMPANY_PROFILE`) | `supabase/schema.sql`, `lib/auth.ts`, `lib/mock-data.ts` | Inconsistência de dados |
| B11 | Envio de e-mail é **simulado** (`setTimeout` + toast de "enviado") | `components/EmailModal.tsx:29` | Funcionalidade falsa |
| B12 | Notificações fixas no código, incluindo "Sistema Conectado ao Supabase — Ativo" mesmo sem conexão | `components/Header.tsx:103` | Informação enganosa |
| B13 | Logo customizado salvo como base64 no `localStorage` (limite ~5 MB) | `lib/logo.ts` | Pode estourar a cota e quebrar outras gravações |
| B14 | Usuários nunca são sincronizados com o Supabase (funções existem mas não são chamadas) | `lib/supabase.ts` | Usuários existem só no navegador |
| B15 | `process.env.VITE_*` não é exposto ao cliente no Next.js (apenas `NEXT_PUBLIC_*`) | `lib/supabase.ts:13-14` | Configuração confusa |
| B16 | `alert()` / `confirm()` nativos misturados com toasts customizados | vários componentes | UX inconsistente |

---

## 6. Código morto e duplicação

### 6.1 Arquivos nunca importados

- `lib/supabaseClient.ts`
- `lib/supabase-schema-text.ts` (cópia literal de `supabase/schema.sql` em string)
- `lib/utils.ts` (função `cn`)
- `hooks/use-mobile.ts`
- `src/assets/` (pasta inteira)

### 6.2 Funções exportadas nunca chamadas

- `syncAllLocalDataToSupabase`
- `testSupabaseConnection`
- `saveCustomSupabaseCredentials`
- `fetchUsersFromSupabase`
- `saveUserToSupabase`

### 6.3 Lógica duplicada

- Filtros para remover o usuário "Carlos Eduardo" espalhados em `auth.ts` e `responsibles.ts`.
- Lista padrão de responsáveis repetida em `auth.ts`, `responsibles.ts`, `classification-data.ts` e no SQL.
- Bloco de opções do `html2pdf` copiado 3× em `lib/pdf-generator.ts` (linhas ~338, ~381, ~424).
- Lógica "próximo número de orçamento" repetida 3× em `app/page.tsx`.
- Toast duplicado em `app/page.tsx` (tela de login e tela principal).
- Tags `<link rel="icon">` duplicadas manualmente em `layout.tsx` além de `metadata.icons`.

### 6.4 Assets duplicados (mesmo hash MD5)

| Arquivo | Duplicata de |
|---|---|
| `public/logo-consentra.png` | `public/logo-consentra-horizontal.png` |
| `public/logo-consentra-transparent.png` | `public/logo-consentra-clean.png` |
| `src/assets/images/consentra_logo_real_1789050726678.jpg` | `public/logo-consentra-real.jpg` |

Além disso, há vários logos possivelmente não usados (`extracted_logo.png`, `test-logo.svg`,
`logo-shield.svg`, SVGs de 300–400 KB com bitmap embutido, etc.).

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

### Fase 2 — Segurança

- [ ] Migrar login para Supabase Auth
- [ ] Remover senha-coringa `123`, código `123456`/qualquer 6 dígitos e `admin` como senha atual
- [ ] Remover criação automática de contas no login e na recuperação de senha
- [ ] Remover coluna `password` e transformar `users` em `profiles` ligada a `auth.users`
- [ ] Reescrever políticas RLS por `auth.uid()` e role
- [ ] Remover leitura de credenciais do Supabase via `localStorage`

### Fase 3 — Dados e persistência

- [ ] Adicionar ao schema: `custom_texts JSONB`, `header_config JSONB`, `payment_notes TEXT`
- [ ] Converter `issue_date` / `validity_date` para `DATE`
- [ ] Criar `SEQUENCE` (ou função RPC) para numeração de orçamentos; padronizar ids (sem `#`)
- [ ] Gravar orçamento + itens em uma única função RPC (transação)
- [ ] Persistir catálogo de serviços (`catalog_services`) e configurações (`app_settings`)
- [ ] Sincronizar usuários/perfis
- [ ] Fazer "Zerar sistema" também apagar no Supabase (com confirmação forte)
- [ ] Exibir erro ao usuário quando a gravação remota falhar
- [ ] Unificar seeds do SQL com os padrões do código
- [ ] Mover logo customizado para Supabase Storage

### Fase 4 — Arquitetura e qualidade de código

- [ ] Quebrar `app/page.tsx` em rotas reais do App Router (`/orcamentos`, `/clientes`, …) ou em um store (Zustand/Context)
- [ ] Dividir componentes grandes (`NewQuoteView`, `SettingsView`, `ServicesView`, `DashboardView`)
- [ ] Criar camada de repositório única (local × Supabase) em vez de chamadas espalhadas
- [ ] Extrair opções do `html2pdf` para uma constante/função única
- [ ] Extrair componente `Toast` e substituir `alert`/`confirm` por modais próprios
- [ ] Remover código morto (seção 6) e assets duplicados/não usados
- [ ] Otimizar imagens (usar `next/image`, remover SVGs com bitmap embutido)
- [ ] Adicionar testes (ex.: Vitest) para `masks.ts`, cálculo de totais/parcelas e mapeamentos do Supabase

### Fase 5 — Funcionalidades reais

- [ ] Envio de e-mail real com PDF anexo (Resend / SMTP via Supabase Edge Function ou API Route)
- [ ] Notificações calculadas a partir dos dados (orçamentos vencendo, aguardando retorno, etc.)
- [ ] Indicador real de status da conexão com o Supabase
- [ ] Histórico/auditoria de alterações de status do orçamento
