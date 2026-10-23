# Consentra · Gestão de SST

Sistema web para **emissão de orçamentos e propostas técnicas de Saúde e Segurança do Trabalho (SST)**,
com pipeline comercial, cadastro de clientes, catálogo de serviços (NRs, laudos, treinamentos, eSocial),
relatórios e geração de PDF.

> ⚠️ **Status: protótipo.** A autenticação atual é apenas demonstrativa (dados no navegador) e as
> políticas do banco estão abertas. **Não use em produção com dados reais** antes de concluir a
> Fase 2 (Segurança) descrita em [`MELHORIAS.md`](./MELHORIAS.md).

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

# 2. (Opcional) Configurar o Supabase
cp .env.example .env.local
#    edite .env.local com a URL e a anon key do seu projeto

# 3. Ambiente de desenvolvimento
npm run dev
# acesse http://localhost:3000
```

Sem o arquivo `.env.local`, o sistema funciona em **modo local**: todos os dados ficam salvos no
`localStorage` do navegador.

### Acesso de demonstração

Usuários padrão definidos em `lib/auth.ts` (somente para demonstração):

| Usuário | Senha |
|---|---|
| `admin@consentra.com.br` | `admin` |
| `assis.sul@gmail.com` | `123` |

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
2. Abra **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql) e execute.
3. Copie **Project URL** e **anon public key** (Project Settings → API) para o `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Tabelas: `users`, `clients`, `catalog_services`, `quotes`, `quote_items`, `app_settings`.

## Estrutura

```
app/            layout e página principal (SPA com navegação por abas)
components/     telas e modais (Dashboard, Orçamentos, Novo Orçamento, PDF, Clientes, Serviços, Relatórios, Configurações…)
hooks/          hooks React
lib/            regras de negócio: auth, acesso ao Supabase, gerador de PDF, máscaras, tipos, dados padrão
public/         logos e favicons
supabase/       schema SQL, políticas e seeds
```

## Roadmap

O diagnóstico completo do projeto e o plano de evolução (segurança, persistência, arquitetura e
funcionalidades) estão em [`MELHORIAS.md`](./MELHORIAS.md).

## Licença

[MIT](./LICENSE)
