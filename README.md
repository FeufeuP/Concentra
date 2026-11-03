# Consentra · Gestão de SST

[![Site](https://img.shields.io/badge/site-consentra--sst--psi.vercel.app-000000?logo=vercel&logoColor=white)](https://consentra-sst-psi.vercel.app)
[![Release](https://img.shields.io/github/v/release/FeufeuP/Concentra?label=release&color=2ea043)](https://github.com/FeufeuP/Concentra/releases/latest)
[![CI](https://github.com/FeufeuP/Concentra/actions/workflows/ci.yml/badge.svg)](https://github.com/FeufeuP/Concentra/actions/workflows/ci.yml)
[![Deploy](https://github.com/FeufeuP/Concentra/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/FeufeuP/Concentra/actions/workflows/deploy-pages.yml)
[![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-3fb950)](./LICENSE)

**🌐 Site (Vercel):** <https://consentra-sst-psi.vercel.app> · **📦 Última versão:** [v2.4.0](https://github.com/FeufeuP/Concentra/releases/latest)

Sistema web para **emissão de orçamentos e propostas técnicas de Saúde e Segurança do Trabalho (SST)**,
com pipeline comercial, cadastro de clientes, catálogo de serviços (NRs, laudos, treinamentos, eSocial),
relatórios e geração de PDF.

> 🔐 **Segurança.** Com o Supabase configurado, o login usa **Supabase Auth** (senhas com bcrypt no
> servidor) e o banco é protegido por **RLS** por usuário/perfil. Sem Supabase, o sistema roda em
> **modo local** (dados no navegador), que serve apenas para demonstração.
>
> ⚠️ As senhas padrão abaixo são públicas (estão neste repositório). **Troque-as antes de usar com
> dados reais** (Configurações → Usuários → Redefinir Senha, ou "Alterar Minha Senha").

---

## Funcionalidades

- **Dashboard** com indicadores comerciais e pipeline de orçamentos
- **Orçamentos**: criação, edição, duplicação, status em cascata (macro/subcategoria, prioridade, origem da demanda)
- **Proposta técnica em PDF** (A4) fiel ao layout da tela, impressão e download
- **Ordem de Serviço** a partir do orçamento
- **Clientes**: cadastro com CNPJ, IE, grau de risco/CNAE e contato
- **Catálogo de serviços** SST (PGR, PCMSO, LTCAT, NR-10, NR-35, eSocial…)
- **Relatórios** mensais com exportação em PDF e CSV (compatível com Excel)
- Envio por **WhatsApp** e **e-mail com o PDF anexo** (Resend via Edge Function, ou envio manual pelo app de e-mail)
- **Histórico do orçamento** (criação, mudanças de status, e-mails enviados, exclusão) gravado pelo servidor
- **Notificações** de propostas vencendo, vencidas, sem retorno e rascunhos parados, e **status real da conexão**
- **Configurações**: perfil da empresa, logo, textos da proposta, responsáveis e usuários

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) + React 19 |
| Linguagem | TypeScript (strict) |
| Estilos | Tailwind CSS v4 |
| Banco (opcional) | [Supabase](https://supabase.com) (PostgreSQL) |
| PDF | `html2pdf.js` + `jspdf` |
| Testes | [Vitest](https://vitest.dev) |

## Requisitos

- **Node.js 22 LTS** (22.12+ para os testes com Vitest 5). A mesma versão principal é usada no CI e na Vercel
- npm 10+

## Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. (Recomendado) Configurar o Supabase — veja a seção "Banco de dados"
cp .env.example .env.local
#    edite .env.local com a URL e a anon key do seu projeto

# 3. Ambiente de desenvolvimento
npm run dev
# acesse http://localhost:3000
```

Sem o arquivo `.env.local`, o sistema funciona em **modo local**: todos os dados ficam salvos no
`localStorage` do navegador (senhas com hash SHA-256 + salt, mas sem proteção real — qualquer um com
acesso ao navegador pode alterar os dados).

### Usuários padrão

Os mesmos usuários existem no modo local (`lib/auth.ts`) e no Supabase (`supabase/seed_users.sql`):

| Usuário | Perfil |
|---|---|
| `assis.sul@gmail.com` (Washington Assis) | Responsável Técnico e Administrador |
| `admin@consentra.com.br` (Administrador Geral) | Administrador |
| `mariana@consentra.com.br` | Responsável Técnico |
| `roberto@consentra.com.br` | Responsável Técnico |
| `amanda@consentra.com.br` | Comercial |

As senhas não ficam documentadas aqui. Peça a um administrador, que pode redefini-las em
**Configurações → Usuários → Redefinir Senha**. Cada usuário troca a própria senha pelo menu do
seu nome (canto superior direito) → **Alterar Minha Senha**.

O login aceita o e-mail, o nome completo, o prefixo do e-mail (ex.: `admin`) ou um nome único
(ex.: `amanda`). Novas senhas precisam ter **no mínimo 6 caracteres**.

**Perfis de acesso**

| Perfil | Permissões |
|---|---|
| Administrador / Responsável Técnico e Administrador | Tudo, inclusive gerenciar usuários e configurações globais |
| Responsável Técnico / Comercial | Criar e editar orçamentos, clientes e serviços |
| Auditor SST | Somente leitura |

Não existe cadastro público: novos acessos são criados por um administrador em
**Configurações → Usuários**.

### Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 3000, escuta em `0.0.0.0`) |
| `npm run build` | Build de produção |
| `npm run build:pages` | Build estático para o GitHub Pages (saída em `out/`) |
| `npm run start` | Servidor de produção (após o build) |
| `npm run lint` | ESLint (regras do Next.js + TypeScript), sem tolerância a avisos |
| `npm run typecheck` | Checagem de tipos com `tsc` |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:watch` | Testes em modo watch |

O CI (`.github/workflows/ci.yml`) roda lint, typecheck, testes e build em cada push/PR.

> Para abrir o servidor de desenvolvimento por um domínio de preview/túnel, defina
> `ALLOWED_DEV_ORIGINS` (ex.: `ALLOWED_DEV_ORIGINS="*.ngrok.app" npm run dev`).

## Publicar na Vercel

**Endereço:** <https://consentra-sst-psi.vercel.app> · **Projeto:** `consentra-sst` (equipe `FVLP`).

O projeto está vinculado ao repositório `FeufeuP/Concentra`. A branch de produção da integração é
`main`: novos pushes nela geram deploys de produção; outras branches geram previews. Uma publicação
manual de outra branch não altera essa configuração. Alterações feitas nesta sessão estão em
`arena/86d03fa8-concentra`; integre-as por pull request para que continuem nos próximos deploys da `main`.

Configuração do projeto (também em [`vercel.json`](./vercel.json)):

| Opção | Valor |
|---|---|
| Framework | Next.js |
| Root Directory | raiz do repositório |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | padrão do Next.js (não definir `out`) |
| Node.js | `22.x`, definido em `package.json` |

**Não defina `GITHUB_PAGES=true` nem `NEXT_PUBLIC_BASE_PATH=/Concentra` na Vercel.** O app é servido
na raiz do domínio, sem `/Concentra`. O deploy do GitHub Pages continua disponível separadamente.

### Banco e autenticação no site publicado

Sem as variáveis abaixo, o site funciona em **modo local de demonstração**: dados ficam apenas no
navegador, não são compartilhados entre usuários/dispositivos e o login local não protege dados reais.
Publicar em outro domínio **não transfere** o `localStorage` do site anterior.

Para usar o banco existente, primeiro confirme que o projeto Supabase está **ativo**, com esquema e
políticas RLS configurados. Depois, em **Vercel → Settings → Environment Variables**, adicione:

- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave pública anon/publishable (nunca a `service_role`).

Aplique em **Production** e faça um novo deploy: variáveis `NEXT_PUBLIC_*` são incorporadas no build.
Para previews com dados reais, use um ambiente de homologação em vez do banco de produção.
No Supabase, em **Authentication → URL Configuration**, configure o *Site URL* de produção e acrescente
`https://consentra-sst-psi.vercel.app/**` às *Redirect URLs*, preservando os endereços ainda utilizados.

### Usar um domínio próprio depois

O endereço `.vercel.app` é gratuito e não exige registro nem alterações manuais no DNS. Para trocar
por um domínio próprio já registrado, abra **Vercel → Settings → Domains → Add Domain**, informe o
domínio exato e copie os registros DNS indicados pela Vercel para o provedor do domínio. Não altere
registros de e-mail (MX/SPF/DKIM). Aguarde a verificação e a emissão do certificado HTTPS; depois
atualize também as URLs de autenticação no Supabase. O registro de um domínio próprio é separado da
hospedagem na Vercel.

## Publicar no GitHub Pages

O site publicado em **<https://feufeup.github.io/Concentra/>** é gerado a partir do app (não é mais o
README renderizado). O workflow [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml)
faz o build estático (`next build` com `output: 'export'`) e publica a pasta `out/` a cada push na `main`.

**Configuração necessária (uma única vez), no GitHub:**

1. **Settings → Pages → Build and deployment → Source:** selecione **GitHub Actions**
   (se ficar em *Deploy from a branch*, o Pages publica o conteúdo do repositório e o navegador
   mostra o README em vez do sistema).
2. Faça o merge desta alteração na `main`: o workflow roda sozinho e o link passa a abrir o sistema.
3. (Opcional) Para usar o Supabase no site publicado — sem isso ele sobe em **modo local**, com os
   dados no navegador — crie os secrets `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   em **Settings → Secrets and variables → Actions**, e inclua o domínio do Pages em
   *Supabase → Authentication → URL Configuration → Redirect URLs* (`https://feufeup.github.io/Concentra/**`).

O app é servido em uma subpasta (`/Concentra`), então o build do Pages define
`NEXT_PUBLIC_BASE_PATH=/Concentra` (veja [`lib/base-path.ts`](./lib/base-path.ts)). O deploy normal
(Vercel, servidor próprio, `npm run dev`) continua na raiz, sem esse prefixo.

> Para testar localmente o resultado do Pages: `npm run build:pages` e depois sirva a pasta `out/`
> (ex.: `npx serve out`). Em qualquer outro deploy, use `npm run build`.

## Banco de dados (Supabase)

1. Crie um projeto em <https://supabase.com/dashboard>.
2. **SQL Editor → New query**: execute [`supabase/schema.sql`](./supabase/schema.sql) (tabelas,
   funções, gatilhos e políticas RLS) e depois [`supabase/seed_users.sql`](./supabase/seed_users.sql)
   (cria os usuários padrão no Supabase Auth; troque as senhas iniciais definidas no arquivo antes de usar em produção).
3. Publique a Edge Function de gestão de usuários (usa a *service role key*, que nunca vai para o
   navegador):

   ```bash
   npx supabase login
   npx supabase functions deploy admin-users --project-ref <ref-do-projeto> --no-verify-jwt
   ```

   O JWT do usuário é validado dentro da função (`auth.getUser`), e ela só executa as ações se quem
   chama for administrador.

   Publique também a função de envio de propostas por e-mail:

   ```bash
   npx supabase functions deploy send-quote-email --project-ref <ref-do-projeto> --no-verify-jwt
   ```
4. **Authentication → Sign In / Providers**: desative *Allow new users to sign up*.
5. **Authentication → URL Configuration**: defina o *Site URL* com o domínio de produção e inclua
   em *Redirect URLs* `https://seu-dominio/**` e `http://localhost:3000/**` (link de recuperação de senha).
6. Copie **Project URL** e **anon public key** (Project Settings → API) para o `.env.local` (e para as
   variáveis de ambiente da hospedagem):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> A anon key é pública por natureza; a segurança vem das políticas RLS. **Nunca** coloque a
> `service_role` key em variáveis `NEXT_PUBLIC_*`.

### E-mail das propostas (Resend)

> 📘 **Passo a passo completo, para quem nunca configurou e-mail:** [`CONFIGURAR_EMAIL.md`](./CONFIGURAR_EMAIL.md)
> (inclui DNS no Registro.br/hospedagens, testes, recuperação de senha e solução de problemas).

O botão **Enviar por E-mail** usa a Edge Function `send-quote-email` e o serviço
[Resend](https://resend.com) (plano gratuito: 3.000 e-mails/mês).

1. Crie a conta no Resend e, em **Domains**, adicione e verifique o domínio da empresa (registros DNS
   SPF/DKIM). Sem domínio verificado, o Resend só envia para o e-mail do dono da conta.
2. Em **API Keys**, crie uma chave com permissão *Sending access*.
3. No Supabase: **Edge Functions → Secrets**, adicione:

   | Segredo | Exemplo |
   |---|---|
   | `RESEND_API_KEY` | `re_xxxxxxxx` |
   | `EMAIL_FROM` | `Consentra SST <propostas@seudominio.com.br>` |

O PDF é gerado no navegador e enviado como anexo (até 8 MB). As respostas do cliente vão para o
e-mail de quem enviou (*reply-to*). O envio fica no histórico do orçamento. **Sem esses segredos (ou
no modo local), o sistema faz o envio manual:** baixa o PDF e abre o aplicativo de e-mail com
destinatários, assunto e mensagem preenchidos.

> **Banco criado antes da Fase 3?** Execute [`supabase/upgrade_fase3.sql`](./supabase/upgrade_fase3.sql)
> (idempotente) e depois [`supabase/upgrade_fase5.sql`](./supabase/upgrade_fase5.sql) (histórico).
> **Criado na Fase 3 ou 4?** Execute só o `upgrade_fase5.sql`. O `schema.sql` já contém tudo para instalações novas.

**Tabelas:** `profiles` (ligada a `auth.users`), `clients`, `catalog_services`, `quotes`,
`quote_items`, `app_settings`, `quote_events` (histórico, gravado só pelo servidor). **Storage:** bucket público `branding` (logotipo; escrita só admin).

**Como os dados são gravados (modo Supabase):**

| O quê | Onde | Quem pode alterar |
|---|---|---|
| Orçamentos e itens | `quotes` + `quote_items`, sempre juntos pela RPC `save_quote` (transação) | todos, exceto Auditor SST |
| Número do orçamento | sequência `quote_number_seq` via RPC `next_quote_number()`, gerado no 1º salvamento (começa em 319) | todos, exceto Auditor SST |
| "Zerar sistema" | RPC `clear_all_quotes('ZERAR')`, que não reinicia a numeração | só administradores |
| Clientes e catálogo de serviços | `clients`, `catalog_services` | todos, exceto Auditor SST |
| Dados da empresa, textos do PDF e logotipo | `app_settings` (`company_profile`, `quote_texts`, `logo_url`) + Storage | só administradores |
| Responsáveis pelo orçamento | `app_settings.responsible_persons` | todos, exceto Auditor SST |
| Histórico do orçamento | `quote_events`: trigger em `quotes` (criação, status, exclusão) + Edge Function de e-mail | ninguém (somente leitura) |

O banco é a fonte da verdade: ao entrar, o app carrega tudo do servidor e não guarda orçamentos ou
clientes no navegador. Toda gravação é confirmada pelo servidor; se falhar (sem permissão, sem
conexão…), aparece um aviso vermelho e os dados são recarregados. Sem registro em `app_settings`,
valem os padrões do código (`lib/mock-data.ts`, `lib/company.ts`).

**Dados antigos do navegador:** se o sistema foi usado no modo local antes de conectar o Supabase,
**Configurações** mostra o cartão *"Dados salvos somente neste navegador"* para importar orçamentos,
clientes e configurações. Números já usados no servidor são renumerados, e é seguro repetir a importação.

**Recuperação de senha:** o usuário recebe um link por e-mail e define a nova senha no próprio
sistema. O SMTP padrão do Supabase só envia para membros da equipe do projeto e tem limite baixo
de envios. Para uso real, configure um SMTP próprio em **Authentication → Emails → SMTP Settings**.

## Estrutura

```
app/                    layout (providers globais) e página: valida a sessão → login ou área de trabalho
components/
  Workspace.tsx         área autenticada: abas, orçamento em edição e modais
  *View.tsx             telas (Dashboard, Orçamentos, Novo Orçamento, PDF, Clientes, Serviços, Relatórios, Configurações)
  settings/ services/ dashboard/ quote/ header/   partes extraídas das telas (inclui histórico e notificações)
  ui/                   Toast, diálogo de confirmação e logotipo (BrandLogo)
  providers/            AppProviders (Toast + diálogos)
lib/
  store/                AppDataContext — estado e operações de dados (useAppData)
  repository/           camada de dados única: local (localStorage) × Supabase + regra de numeração
  quote-calc.ts         cálculo de itens, subtotal, desconto e parcelas
  dashboard-metrics.ts  filtros e indicadores do dashboard
  notifications.ts      notificações calculadas dos orçamentos
  quote-events.ts       histórico (eventos) dos orçamentos
  email.ts              envio de e-mail (Edge Function) e envio manual (mailto)
  connection-status.ts  verificação real da conexão com o servidor
  supabase.ts auth.ts   acesso ao Supabase e autenticação
  pdf-generator.ts …    PDF, máscaras, tipos, dados padrão, configurações
tests/                  testes Vitest
public/                 logo e favicons
supabase/               schema SQL (+ upgrades das fases 3 e 5), políticas RLS, seed de usuários e Edge Functions (admin-users, send-quote-email)
```

### Arquitetura

- **Dados:** as telas usam `useAppData()` (`lib/store/AppDataContext.tsx`), que grava sempre pelo
  repositório (`lib/repository`). O repositório é escolhido pela configuração: com as variáveis do
  Supabase → `createSupabaseRepository()`; sem elas → `createLocalRepository()` (localStorage).
  Nenhuma tela precisa saber em qual modo está.
- **Context em vez de rotas:** o sistema é uma SPA autenticada com estado compartilhado entre as
  abas (orçamento em edição, fila de salvamento que evita números duplicados). O Context oferece
  o desacoplamento necessário com risco menor que migrar para rotas do App Router — que podem vir
  depois, reutilizando o mesmo store.
- **Avisos e confirmações:** `useToast()` e `useDialog().confirm()` (`components/ui`); não há
  `alert()`/`confirm()` nativos.
- **Logotipo:** `BrandLogo` usa `<img>` de propósito (logo dinâmico em data URL/Storage e captura
  pelo html2canvas no PDF); é a única exceção à regra `no-img-element`.

## Roadmap

O diagnóstico completo do projeto e o plano de evolução (segurança, persistência, arquitetura e
funcionalidades) estão em [`MELHORIAS.md`](./MELHORIAS.md).

## Licença

[MIT](./LICENSE)
