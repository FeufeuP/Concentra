# Consentra · Gestão de SST

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
- Envio por **WhatsApp** e e-mail (o envio de e-mail ainda é simulado)
- **Configurações**: perfil da empresa, logo, textos da proposta, responsáveis e usuários

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) + React 19 |
| Linguagem | TypeScript (strict) |
| Estilos | Tailwind CSS v4 |
| Banco (opcional) | [Supabase](https://supabase.com) (PostgreSQL) |
| PDF | `html2pdf.js` + `jspdf` |

## Requisitos

- **Node.js 20.9+** (recomendado 22 LTS)
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

| Usuário | Perfil | Senha |
|---|---|---|
| `assis.sul@gmail.com` (Washington Assis) | Responsável Técnico e Administrador | `123` |
| `admin@consentra.com.br` (Administrador Geral) | Administrador | `admin` |
| `mariana@consentra.com.br` | Responsável Técnico | `123` |
| `roberto@consentra.com.br` | Responsável Técnico | `123` |
| `amanda@consentra.com.br` | Comercial | `123` |

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
| `npm run start` | Servidor de produção (após o build) |
| `npm run lint` | ESLint (regras do Next.js + TypeScript) |
| `npm run typecheck` | Checagem de tipos com `tsc` |

> Para abrir o servidor de desenvolvimento por um domínio de preview/túnel, defina
> `ALLOWED_DEV_ORIGINS` (ex.: `ALLOWED_DEV_ORIGINS="*.ngrok.app" npm run dev`).

## Banco de dados (Supabase)

1. Crie um projeto em <https://supabase.com/dashboard>.
2. **SQL Editor → New query**: execute [`supabase/schema.sql`](./supabase/schema.sql) (tabelas,
   funções, gatilhos e políticas RLS) e depois [`supabase/seed_users.sql`](./supabase/seed_users.sql)
   (cria os usuários padrão no Supabase Auth com as senhas da tabela acima).
3. Publique a Edge Function de gestão de usuários (usa a *service role key*, que nunca vai para o
   navegador):

   ```bash
   npx supabase login
   npx supabase functions deploy admin-users --project-ref <ref-do-projeto> --no-verify-jwt
   ```

   O JWT do usuário é validado dentro da função (`auth.getUser`), e ela só executa as ações se quem
   chama for administrador.
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

**Tabelas:** `profiles` (ligada a `auth.users`), `clients`, `catalog_services`, `quotes`,
`quote_items`, `app_settings`.

**Recuperação de senha:** o usuário recebe um link por e-mail e define a nova senha no próprio
sistema. O SMTP padrão do Supabase só envia para membros da equipe do projeto e tem limite baixo
de envios. Para uso real, configure um SMTP próprio em **Authentication → Emails → SMTP Settings**.

## Estrutura

```
app/            layout e página principal (SPA com navegação por abas)
components/     telas e modais (Dashboard, Orçamentos, Novo Orçamento, PDF, Clientes, Serviços, Relatórios, Configurações…)
hooks/          hooks React
lib/            regras de negócio: auth, acesso ao Supabase, gerador de PDF, máscaras, tipos, dados padrão
public/         logos e favicons
supabase/       schema SQL, políticas RLS, seed de usuários e Edge Function admin-users
```

## Roadmap

O diagnóstico completo do projeto e o plano de evolução (segurança, persistência, arquitetura e
funcionalidades) estão em [`MELHORIAS.md`](./MELHORIAS.md).

## Licença

[MIT](./LICENSE)
