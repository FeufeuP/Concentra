# Análise do site da Consentra e melhorias para um novo site

> **Este documento é independente.** Não é preciso acessar o repositório, outros arquivos nem conversas anteriores para usá-lo.
>
> **O que é:** uma análise do site institucional atual da **Consentra Soluções em Segurança do Trabalho** (consentra.com.br), feita em **04/11/2026**, seguida de melhorias.
> **Para que serve:** as melhorias listadas servem de exemplo e de base para criar **um novo site, melhor e melhorado**, em outro chat ou projeto. A seção 9 traz um briefing pronto para colar nesse novo chat.
> **O que não é:** não é um projeto de software, não altera o site atual e não é uma auditoria jurídica ou técnica da empresa.

---

## Sumário

1. [Resumo](#1-resumo)
2. [Contexto da empresa](#2-contexto-da-empresa)
3. [Como o site atual é estruturado](#3-como-o-site-atual-é-estruturado)
4. [Design e apresentação visual](#4-design-e-apresentação-visual)
5. [Melhorias para o novo site](#5-melhorias-para-o-novo-site)
6. [Diretrizes para o novo site](#6-diretrizes-para-o-novo-site)
7. [Plano de criação sugerido](#7-plano-de-criação-sugerido)
8. [Checklist de aceitação](#8-checklist-de-aceitação)
9. [Briefing para o novo chat](#9-briefing-para-o-novo-chat)
10. [Limitações da análise e itens a confirmar](#10-limitações-da-análise-e-itens-a-confirmar)
11. [Glossário](#11-glossário)
12. [Fontes](#12-fontes)

---

## 1. Resumo

- A Consentra é uma empresa de **segurança e saúde do trabalho (SST)** em **Araucária (PR)**, na região metropolitana de Curitiba. Oferece laudos técnicos, gestão de SST, treinamentos de NRs, locação de equipamentos, projetos de ancoragem e apoio ao eSocial.
- O site atual é funcional e tem uma estrutura clara, com boa presença de WhatsApp e um blog extenso. Mas tem problemas de **confiança** (datas e contatos divergentes, equipe não identificada), de **conformidade** (sem política de privacidade), de **experiência no celular** (textos pequenos, e-mails cortados) e de **conteúdo** (repetição e falta de fontes).
- As avaliações públicas existem: o site exibe avaliações do Google com cinco estrelas, e o mapa mostra nota 4,9. Não foi possível analisar o conjunto completo de avaliações.
- **Prioridade para o novo site:** demonstrar confiança (equipe com registros, datas e contatos corretos, avaliações verificáveis), cumprir a LGPD e oferecer uma experiência boa no celular.

---

## 2. Contexto da empresa

### 2.1 Identificação
| Item | Dado | Origem |
|---|---|---|
| Nome comercial | Consentra Soluções em Segurança do Trabalho | Site |
| Razão social | Consentra Solucoes em Seguranca do Trabalho Ltda | Cadastro público (Econodata, Solutudo) |
| CNPJ principal | 28.231.228/0001-01 | Cadastro público |
| Abertura do CNPJ | 20/07/2017 | Cadastro público |
| Porte | Microempresa | Cadastro público |
| Capital social | R$ 100 mil | Cadastro público |
| Atividade principal | Perícia técnica em segurança do trabalho (CNAE M-7119-7/04) | Cadastro público |
| Sócio-administrador | Washington Feliciano Fontes de Assis | Cadastro público |
| Sede | Praça Dr. Vicente Machado, 92, Centro, Araucária-PR, CEP 83702-310 | Site e cadastro |
| Segundo CNPJ (não confirmado) | 15.499.834/0001-60, "Consentra Seguranca do Trabalho", Campina da Barra, Araucária | Diretório de empresas. Não confirmado na Receita Federal |

### 2.2 O que o site afirma sobre a empresa
- "16+ anos de experiência" (selo da home) e "Desde 2008" (página Quem somos e vídeo).
- "5000+ vidas treinadas", "700+ projetos", "3000+ clientes" (sem metodologia declarada).
- Atende empresas de petroquímica, refinaria, metalúrgica, celulose, automotiva e obras pesadas (descrição do vídeo).
- Atendimento em Araucária e na região metropolitana de Curitiba.
- Patrocina o futsal feminino de Quatro Barras (PR), com "média de 50 meninas" treinando.

### 2.3 Inconsistências encontradas
| Assunto | O que aparece | Problema |
|---|---|---|
| Marco histórico | "16+ anos" (home), "Desde 2008" (Quem somos e vídeo), CNPJ aberto em 2017 | Três datas diferentes. A página Quem somos diz "Desde 2008" e "há 16 anos" ao mesmo tempo |
| Telefone | (41) 99694-3025 no hero; (41) 98485-9144 no contato, no banner e nos artigos | Dois números para o mesmo atendimento |
| Copyright | "© Copyright 2024" (rodapé) | Ano desatualizado |
| Nome de serviço | "Gestão em SST" (home) e "Gestão em GRO" (página de serviços) | Nomes diferentes para o mesmo serviço |

### 2.4 Canais
- **Telefone/WhatsApp:** ver 2.3 (dois números).
- **E-mails:** comercial@consentra.com.br e contato@consentra.com.br.
- **Redes:** Facebook, YouTube (@consentra) e Instagram (@cons.entra).
- **Formulário:** campos Nome, Telefone, Serviço de interesse (lista, com "Treinamentos" por padrão), Mensagem e forma preferida de contato.

---

## 3. Como o site atual é estruturado

### 3.1 Tecnologia
- Site em **WordPress**, com construtor visual **Elementor** (versão Pro), tema Hello Elementor e complementos para cabeçalho e rodapé e componentes extras.
- Plugins identificados: cache (WP Super Cache), integração com o Google (Google Site Kit), widget de avaliações (Trustindex) e biblioteca de templates (Envato Elements).
- Sitemap XML ativo.

### 3.2 Páginas
| Página | Conteúdo |
|---|---|
| Início (home) | Apresentação, indicadores, diferenciais, resumo dos serviços, clientes, depoimentos, vídeo e contato |
| Serviços | Catálogo em blocos por área, com itens recolhíveis e botões de orçamento |
| Quem somos | História, compromisso, equipe, patrocínio, clientes, depoimentos e contato |
| Blog | 29 artigos educativos, com paginação de 8 por página |
| Artigos | Texto educativo com links para artigos relacionados e botão de orçamento |
| Não existem | `/sobre` e `/contato` (retornam erro 404) |

### 3.3 Home, de cima para baixo
1. **Cabeçalho:** logotipo e menu hambúrguer no celular.
2. **Hero:** rótulo "Segurança e Saúde do Trabalho", título "SOMOS A CONSENTRA", frase "Oferecemos TODOS os serviços de saúde e segurança do trabalho para sua empresa!" e botão "Fale conosco (41) 99694-3025".
3. **Indicadores:** 5000+, 700+ e 3000+, com ícones.
4. **Imagens com selo** "16+ Anos de Experiência" e o rótulo "Protegendo o que mais importa".
5. **Apresentação:** título "Proteja sua equipe com soluções completas em segurança do trabalho", dois parágrafos, lista de seis áreas e botão "SAIBA MAIS!".
6. **Diferencial:** "Nosso Diferencial", com três cards numerados (01, 02 e 03).
7. **Nossos serviços:** seis cards, cada um com "Saiba mais" levando a uma âncora da página de serviços.
8. **Clientes:** grade de logotipos com repetição.
9. **Depoimentos:** oito avaliações do Google, em carrossel.
10. **Vídeo:** "Bem-Vindo(a) A CONSENTRA!", em pop-up, com reprodução automática.
11. **Contato:** endereço, telefone, dois e-mails e um mapa.
12. **Widget flutuante** de WhatsApp, no canto inferior direito.

### 3.4 Serviços oferecidos
**Treinamentos:** brigada de emergência; NRs 05, 06, 10, 11, 12, 13, 17, 18, 20, 23, 33 e 35; conscientização de riscos; montagem de andaimes; direção defensiva; percepção de riscos.

**Laudos técnicos:** LTCAT (laudo técnico das condições do ambiente de trabalho), laudo de periculosidade, laudo de insalubridade e laudo de conformidade de pontos de ancoragem.

**Gestão em SST:** PGR, PPR, APR, PCMSO, GRO, investigação de acidentes e envio de eventos ao eSocial (S-2210, S-2220 e S-2240).

**Locação de equipamentos:** dosímetro de ruído, linha de vida, tábua e boneco de primeiros socorros.

**Projetos de engenharia:** projeto, instalação e laudo de pontos de ancoragem; adequação de SST; auditoria; adequação de máquinas (NR-12); projetos de incêndio e sinalização; desembargo de obras.

**Consultoria especializada:** apoio contínuo em conformidade e gestão.

### 3.5 Blog
- **29 artigos**, publicados entre dezembro de 2025 e abril de 2026, sem publicações depois dessa data.
- **Temas:** eSocial SST (3), acidentes e prevenção (7), NR-01, GRO e riscos psicossociais (6), altura e ancoragem (5), CIPA e SIPAT (4) e outros (4).
- **Estrutura de texto:** quase sempre igual (introdução, "Para que serve", "Consequências", "Como a Consentra pode ajudar", conclusão e botão de orçamento).

**Artigos que se repetem ou se sobrepõem:**
- Quatro sobre CIPA e SIPAT.
- Quatro sobre NR-01 e riscos psicossociais.
- Três sobre pontos de ancoragem.
- Dois sobre EPI e dois sobre o técnico em segurança do trabalho.

**Problemas de conteúdo observados:**
- Quase nenhuma citação de lei, portaria ou número de item.
- O artigo sobre dimensionamento da CIPA diz que segue a tabela da NR-05, mas não apresenta a tabela.
- Os riscos psicossociais passaram a integrar o GRO pela Portaria MTE nº 1.419/2024. A fiscalização pode autuar desde 26/05/2026. Os artigos lidos não mencionam essa data.
- As faixas de multa do eSocial não têm fonte, e sites do setor divergem entre si.

### 3.6 Vídeo de apresentação
- Título: "Bem Vindo à Consentra!". Duração: 1 minuto e 26 segundos. Publicado em 18/01/2023, como não listado. Tem 106 visualizações.
- O apresentador, identificado como Assis, diz que a empresa reduz custos e acidentes com SST, faz projetos (incluindo pontos de ancoragem) e trabalha com locação de equipamentos.
- Afirma que a empresa atende normas e legislações e mantém banco de dados atualizado. Pede contato por WhatsApp ou e-mail, sem falar um número.
- Não há nomes de equipe, registros profissionais nem clientes citados no vídeo.

### 3.7 Reputação pública
- **Google:** o site exibe avaliações de cinco estrelas, com o ícone do Google. O mapa mostra nota 4,9. O total de avaliações e as críticas não foram analisados.
- **Indeed (avaliações de funcionários):** a página existe, mas não tem nenhuma avaliação.
- **Reclame Aqui:** nenhum perfil encontrado.
- **Facebook e Instagram:** não puderam ser consultados.
- **Processos judiciais:** nenhum encontrado nas buscas públicas, que foram gerais.

### 3.8 Concorrentes locais (referência)
| Empresa | Diferencial observado | Observação |
|---|---|---|
| Arauclin | Oferece exames, ambulatório e SST em um só lugar | Usa o termo PPRA, substituído pelo PGR |
| Araucária Saúde Ocupacional | Combina saúde ocupacional e segurança do trabalho | Blog com post padrão ("Hello world") |
| Medicina Ocupacional Curitiba | Unidade móvel para exames dentro da empresa | Página de captação com textos de SEO |
| PSEG | Higiene ocupacional com medições quantitativas | Site não pôde ser aberto na análise |

**Diferencial da Consentra na amostra:** locação de linha de vida e dosímetro e projeto completo de ancoragem (projeto, instalação e laudo). Nenhum dos concorrentes lidos menciona esses serviços.

---

## 4. Design e apresentação visual

> Análise feita a partir de cinco capturas de tela do site em celular (Chrome Android, 04/11/2026), que cobrem a página do topo ao rodapé. Não foi possível analisar a versão de computador, o código CSS nem as animações em movimento.

### 4.1 Cor, tipografia e identidade
- **Cor principal:** verde-azulado (teal), em faixas de destaque, botões, cards e no logotipo. O fundo é branco, com texto em cinza escuro.
- **Tipografia:** sans-serif. Títulos grandes e em negrito. Textos de apoio em peso leve. Rótulo pequeno acima de cada título (eyebrow).
- **Logotipo:** "CONSENTRA" em teal, com o subtítulo "Segurança do Trabalho".
- **Ícones:** de linha fina, em teal.
- **Imagens:** fotos reais de equipe e de obra (trabalhadores com coletes vermelhos em frente a um galpão, treinamento com fumaça, obra com capacete amarelo). Também há foto de banco de imagens e a foto do presidente no vídeo.

### 4.2 Layout no celular
- Blocos alternados entre faixas teal e fundo branco.
- Seção de serviços em três colunas, com textos pequenos.
- Diferencial em quatro cards lado a lado, com texto apertado.
- Cards de contato alternados (branco e teal), com e-mails cortados.
- Botão flutuante de WhatsApp fixo.

### 4.3 Movimento e animações (confirmados e prováveis)
**Confirmados nas capturas:**
- Botão flutuante de WhatsApp fixo durante a rolagem.
- Carrossel de clientes com cerca de 20 indicadores (sugere rotação automática).
- Carrossel horizontal de depoimentos (o último cartão aparece cortado).
- Vídeo em pop-up com botão de play.
- Mapa interativo.
- Menu hambúrguer recolhido no celular.

**Prováveis, mas não confirmados:**
- Entrada das seções com efeito ao rolar (fade ou deslocamento).
- Contadores animados nos indicadores.
- Efeito de hover em botões e cards.
- Abertura de acordeões nas páginas de serviços (confirmada na estrutura, não nas capturas).

### 4.4 Pontos fortes do design atual
- Hierarquia visual clara e repetida (rótulo, título, texto e botão).
- Uma cor principal, que dá identidade.
- Fotos reais de equipe e obra, que transmitem autenticidade.
- Botões grandes e com contraste.
- Vários canais de contato visíveis, formulário completo e mapa.

### 4.5 Problemas de design e de celular
- Serviços em três colunas no celular, com textos pequenos e títulos quebrados.
- Diferencial em quatro cards lado a lado, com leitura difícil.
- E-mails cortados nos cards de contato.
- Formulário com campos que só têm texto de exemplo, sem rótulo visível. Botões de rádio com aparência padrão do navegador.
- Banner de contato com foto de banco de imagens e logotipo sobre fundo branco, fora do estilo teal.
- Carrossel de clientes com cerca de 20 indicadores e logotipos de tamanhos diferentes.
- Títulos em caixa alta, o que dificulta a leitura.
- Texto de apoio sobre a foto do hero, com contraste possivelmente baixo.
- Copyright de 2024 em 2026.

---

## 5. Melhorias para o novo site

**Como ler esta seção**
- **Prioridade:** P1 (confiança, conformidade ou erro visível), P2 (celular e acessibilidade), P3 (conteúdo, SEO e prova social) ou P4 (desempenho, segurança e manutenção).
- **Esforço:** B (baixo, até 1 dia), M (médio, até 1 semana) ou A (alto, mais de 1 semana).
- **Melhoria:** o que o novo site deve fazer. Cada linha descreve o padrão desejado, e não apenas a correção do site atual.

### 5.1 Prioridade 1: confiança, conformidade e erros visíveis
| ID | Problema observado | Melhoria para o novo site | Esforço |
|---|---|---|---|
| P1.1 | Dois telefones para o mesmo atendimento (ver 2.3). | Um número oficial de WhatsApp, usado em todos os pontos, com identificação de origem (parâmetro na URL do botão). | B |
| P1.2 | Três datas de fundação diferentes e uma contagem de anos que fica desatualizada. | Data fixa ("Desde AAAA"), confirmada com documentos da empresa. Nada de "X anos" escrito à mão. | B |
| P1.3 | Equipe técnica não identificada. Imagem de equipe gerada por IA. | Seção "Equipe técnica" com foto real, nome, formação e registro profissional (CREA ou equivalente) de quem assina laudos e PGR. | M |
| P1.4 | Sem política de privacidade, embora haja formulário que coleta dados pessoais. | Política de privacidade (LGPD) publicada no rodapé, com finalidade do uso dos dados. Checkbox de consentimento no formulário. | M |
| P1.5 | Links quebrados: `/sobre` e `/contato` dão erro 404. O link de endereço não leva a lugar nenhum. | Menu com apenas páginas que existem. Endereço com link para o Google Maps. Redirecionamentos para páginas antigas, se houver. | B |
| P1.6 | Formulário com campos que só têm texto de exemplo. Destino da mensagem não documentado. Botões de rádio padrão. | Rótulos visíveis acima de cada campo. Mensagem de confirmação após o envio. Destino documentado e testado. Botões de rádio estilizados. | B |
| P1.7 | Vídeo abre com reprodução automática e som, o que navegadores costumam bloquear e pode assustar o visitante. | Miniatura com botão de play. Carregamento do vídeo só ao clicar, sem autoplay. | B |
| P1.8 | Ano de copyright fixo em 2024. | Ano atualizado automaticamente no rodapé. | B |
| P1.9 | Números de impacto sem metodologia ("5000+ vidas treinadas", "700+ projetos", "3000+ clientes"). | Usar apenas números comprováveis, com a data de referência. Se não houver registro, remover. | B |

### 5.2 Prioridade 2: celular e acessibilidade
| ID | Problema observado | Melhoria para o novo site | Esforço |
|---|---|---|---|
| P2.1 | Serviços em três colunas no celular, com texto pequeno e títulos quebrados. | Uma coluna até 640 px. Texto do corpo com pelo menos 16 px. | M |
| P2.2 | Quatro cards de diferencial lado a lado no celular. | Empilhar os cards em uma coluna no celular. | B |
| P2.3 | E-mails cortados nos cards de contato. | Quebra de linha no texto, sem cortar o endereço. | B |
| P2.4 | Títulos em caixa alta, o que dificulta a leitura. | Caixa de frase (primeira letra maiúscula). Caixa alta só em siglas. | B |
| P2.5 | Textos pequenos e de baixo contraste, especialmente sobre o teal e sobre fotos. | Contraste mínimo de 4,5:1 para texto normal (WCAG AA). Camada escura sobre fotos de fundo. Verificar com ferramenta. | M |
| P2.6 | Textos alternativos inúteis ("Manter", "manter", nomes de arquivo). Logotipo sem texto alternativo. | Texto alternativo descritivo em cada imagem (ex.: "Equipe da Consentra em frente a galpão"). Logotipo com `alt="Consentra Segurança do Trabalho"`. Imagens decorativas com alt vazio. | B |
| P2.7 | Cinco rótulos diferentes para o mesmo destino (WhatsApp): "Fale conosco", "SAIBA MAIS!", "Saiba mais", "Solicite um orçamento" e "Quero Pedir um Orçamento". | Dois rótulos padronizados: "Falar no WhatsApp" (contato) e "Solicitar orçamento" (venda). | B |
| P2.8 | Carrossel de clientes com cerca de 20 indicadores e logotipos desiguais. | Grade uniforme de logotipos, com altura e fundo padronizados. Se houver carrossel, botão de pausa e controle por teclado. | M |
| P2.9 | Banner de contato com foto de banco de imagens e logotipo sobre branco. | Foto real da equipe ou estilo visual do restante do site. | M |
| P2.10 | Itens do menu não verificados na análise. | Menu com Início, Serviços, Quem somos, Blog, Avaliações e Contato. Navegável por teclado. | B |

### 5.3 Prioridade 3: conteúdo, SEO e prova social
| ID | Problema observado | Melhoria para o novo site | Esforço |
|---|---|---|---|
| P3.1 | Home e "Quem somos" repetem os mesmos blocos (diferencial, clientes, depoimentos e contato). | Cada página com conteúdo próprio. "Quem somos" com história, equipe e valores. | M |
| P3.2 | "Projetos que apoiamos": seis miniaturas, com só duas imagens repetidas. | Projetos reais, com foto e legenda (cliente, local e ano), com autorização dos clientes. | M |
| P3.3 | Serviços apresentados só em acordeões de uma página, com âncoras. | Uma página por serviço, com: o que é, quando é obrigatório, como funciona, prazo, o que o cliente recebe, quem assina e perguntas frequentes. Melhora a busca e a compreensão. | A |
| P3.4 | Sem preço, sem prazo e sem casos de cliente. | Faixa de prazo por serviço (quando possível, sem preço fixo) e pelo menos um caso de estudo por área, com autorização. | A |
| P3.5 | Blog com artigos repetidos (quatro sobre CIPA, quatro sobre NR-01, três sobre ancoragem). | Um artigo pilar por tema, com artigos complementares que tratem de dúvidas específicas e links internos entre eles. | A |
| P3.6 | Artigos sem citação de norma (quase nenhum número de NR, item ou portaria). | Cada afirmação técnica com a norma citada (número da NR, item e portaria). | M |
| P3.7 | Dimensionamento da CIPA sem a tabela da NR-05. | Incluir a tabela, exemplos práticos e a citação do item da norma. | M |
| P3.8 | Riscos psicossociais no GRO sem o cronograma (fiscalização possível desde 26/05/2026). | Artigo atualizado com o cronograma da Portaria MTE nº 1.419/2024 e o que a empresa deve fazer. | M |
| P3.9 | Faixas de multa do eSocial sem fonte e divergentes entre sites. | Citar a base legal de cada multa ou não publicar faixas. Indicar que os valores podem mudar. | M |
| P3.10 | Blog sem publicações desde abril de 2026. | Calendário editorial com ritmo fixo (por exemplo, dois artigos por mês). | A |
| P3.11 | Avaliações do Google exibidas, mas sem link para o perfil. | Botão "Ver todas as avaliações" e botão "Avaliar no Google", com nota e total. | B |
| P3.12 | Exames ocupacionais não declarados, embora o PCMSO dependa deles. | Declarar se os exames são feitos diretamente ou por clínica parceira, com o nome da parceira. | B |
| P3.13 | Dados estruturados para buscadores não verificados. | Marcação de negócio local (schema LocalBusiness) com nome, endereço, telefone e horário, e marcação de serviço por página. | M |

### 5.4 Prioridade 4: desempenho, segurança e manutenção
| ID | Problema observado | Melhoria para o novo site | Esforço |
|---|---|---|---|
| P4.1 | Imagens de 1024 px exibidas em miniaturas de 300 px ou menos. Imagens duplicadas. | Formato WebP, tamanhos adequados por tela, carregamento sob demanda (lazy load) e remoção de duplicatas. | M |
| P4.2 | Vídeo do YouTube carregado junto com a página, mesmo sem ser usado. | Miniatura que só carrega o vídeo ao clicar. | B |
| P4.3 | Muitos plugins de terceiros, incluindo bibliotecas de templates que não são necessárias. Versões não verificadas. | Conjunto mínimo de componentes, todos atualizados. Remover o que não é usado. | M |
| P4.4 | A API pública do WordPress lista os plugins instalados. O slug de autor aparece no sitemap. | Restringir endpoints públicos desnecessários. Usar autor com nome neutro ou sem página de autor. | M |
| P4.5 | Painel de administração e acessos não verificados. | Autenticação em dois fatores, senhas fortes e acesso restrito. | B |
| P4.6 | Desempenho não medido. | Metas de Core Web Vitals (ver seção 6.6) e medição periódica com PageSpeed Insights ou Lighthouse. | B |

---

## 6. Diretrizes para o novo site

### 6.1 Arquitetura de páginas sugerida
1. **Início:** proposta de valor, indicadores comprováveis, serviços principais, avaliações, equipe resumida e chamada para contato.
2. **Serviços:** página principal com as áreas e uma página por serviço.
3. **Quem somos:** história com data fixa, missão, equipe técnica com registros, clientes e patrocínios.
4. **Equipe técnica:** pode ser uma seção de "Quem somos" ou uma página própria.
5. **Avaliações:** página com as avaliações do Google, nota e link para o perfil.
6. **Blog:** páginas de pilar por tema, com artigos complementares.
7. **Contato:** formulário, WhatsApp, telefone, e-mail, endereço com mapa e horário de atendimento.
8. **Institucional:** política de privacidade, termos de uso e página de cookies, se houver cookies.

### 6.2 Conteúdo
- Todo número de impacto precisa de data de referência e fonte interna.
- Todo nome de profissional precisa de cargo, formação e registro.
- Toda afirmação técnica precisa de norma citada (número da NR, item e portaria).
- Textos de serviço devem explicar: o que é, quando é obrigatório, como funciona, prazo e o que o cliente recebe.
- Usar a mesma linguagem em todo o site, por exemplo sempre "PGR" (e não PPRA), e sempre o mesmo nome de serviço.

### 6.3 Design
- **Cor principal:** pode manter o teal da marca ou revisar. Definir também uma cor de apoio para destaques e uma cor neutra para textos.
- **Tipografia:** uma família sans-serif com três pesos. Corpo com 16 px ou mais. Títulos sem caixa alta.
- **Espaçamento:** grade de 8 px, com margens generosas no celular.
- **Componentes padronizados:** botão primário, botão secundário, card de serviço, card de avaliação, indicador numérico, formulário com rótulos e bloco de contato.
- **Fotos:** priorizar fotos reais de equipe, obra e treinamento. Evitar imagens geradas por IA na equipe e fotos de banco de imagens em locais de destaque.
- **Ícones:** um único conjunto de linha, na mesma espessura.

### 6.4 Acessibilidade
- Conformidade com WCAG 2.2 nível AA: contraste, texto alternativo, navegação por teclado, foco visível, rótulos em formulários e títulos hierárquicos (H1 a H3).
- Movimento reduzido respeitado pela preferência do sistema (`prefers-reduced-motion`).

### 6.5 Movimento e animações
- Entradas sutis ao rolar (fade ou deslocamento de até 20 px), sem repetir a animação a cada rolagem.
- Carrosséis com botão de pausa e sem movimento automático rápido.
- Nenhuma reprodução automática de vídeo com som.
- Contadores animados somente com números comprovados.
- Tempo de transição padronizado no site inteiro (por exemplo, 200 a 300 ms).

### 6.6 Desempenho e tecnologia
- Metas de Core Web Vitals no nível "bom": LCP até 2,5 s, INP até 200 ms e CLS até 0,1.
- Imagens em WebP, com tamanhos adequados e carregamento sob demanda.
- Vídeo carregado somente ao clicar.
- Poucos plugins, todos atualizados. Preferir um tema e componentes próprios a bibliotecas de templates.
- Dados estruturados de negócio local e de serviço.
- Analytics com eventos nos cliques de WhatsApp, envio de formulário e clique em telefone.

### 6.7 SEO local
- Título e descrição de cada página com o serviço e a cidade (Araucária e região).
- Páginas de serviço com conteúdo próprio, não apenas um resumo.
- Blog com links internos entre artigos relacionados.
- Perfil do Google Meu Negócio com o mesmo nome, endereço e telefone do site.

---

## 7. Plano de criação sugerido

**Fase 1: fundamentos (semana 1)**
- Definir o número oficial de WhatsApp, a data de fundação e o destino do formulário.
- Confirmar nomes, formação e registros da equipe técnica.
- Definir a arquitetura de páginas e os componentes do design.
- Redigir a política de privacidade.

**Fase 2: páginas principais (semanas 2 a 3)**
- Início, Quem somos, Serviços e Contato, com todos os itens das prioridades P1 e P2.
- Formulário com rótulos, consentimento e confirmação.
- Textos alternativos, contraste e teste de navegação por teclado.

**Fase 3: serviços e prova social (semanas 4 a 5)**
- Uma página por serviço.
- Página de avaliações, com link para o Google.
- Casos de estudo, com autorização dos clientes.

**Fase 4: blog e SEO (semanas 6 a 8)**
- Plano editorial com pilares e artigos complementares.
- Artigos com citação de norma e atualização sobre riscos psicossociais.
- Dados estruturados, sitemap e metadados.

**Fase 5: desempenho e manutenção (contínuo)**
- Medição de Core Web Vitals e ajustes.
- Atualização de conteúdo e de plugins ou componentes.
- Revisão trimestral de números e datas.

---

## 8. Checklist de aceitação

Use esta lista para avaliar o novo site antes de publicá-lo.

**Confiança e conteúdo**
- [ ] Um único número de WhatsApp em todo o site.
- [ ] Data de fundação fixa e confirmada.
- [ ] Equipe técnica com nome, formação e registro.
- [ ] Todo número de impacto tem data e fonte.
- [ ] Toda norma citada tem número e item.
- [ ] Nenhum link quebrado (teste com ferramenta de verificação de links).
- [ ] Ano do rodapé atualizado automaticamente.

**Conformidade**
- [ ] Política de privacidade publicada e linkada no rodapé.
- [ ] Checkbox de consentimento no formulário.
- [ ] Destino do formulário documentado e testado.

**Celular e acessibilidade**
- [ ] Layout legível em tela de 360 px, sem colunas apertadas.
- [ ] E-mails e textos longos não são cortados.
- [ ] Texto do corpo com 16 px ou mais.
- [ ] Contraste de 4,5:1 ou mais em textos normais.
- [ ] Todas as imagens com texto alternativo adequado.
- [ ] Formulário com rótulos visíveis.
- [ ] Navegação completa por teclado, com foco visível.
- [ ] Movimento reduzido respeitado.

**Movimento**
- [ ] Nenhum vídeo com reprodução automática e som.
- [ ] Carrosséis com botão de pausa.
- [ ] Contadores apenas com números comprovados.

**Desempenho e SEO**
- [ ] Core Web Vitals no nível "bom" em celular e computador.
- [ ] Imagens em WebP, com carregamento sob demanda.
- [ ] Título, descrição e dados estruturados em todas as páginas.
- [ ] Sitemap enviado ao Google Search Console.

**Prova social**
- [ ] Avaliações com link para o perfil do Google.
- [ ] Casos de estudo com autorização dos clientes.
- [ ] Nenhuma imagem gerada por IA apresentada como foto da equipe.

---

## 9. Briefing para o novo chat

Copie o texto abaixo para iniciar a criação do novo site em outro chat:

> Quero criar um site institucional novo e melhor para a **Consentra Soluções em Segurança do Trabalho**, empresa de SST em Araucária (PR), região metropolitana de Curitiba. Serviços: laudos técnicos (LTCAT, periculosidade, insalubridade e conformidade de pontos de ancoragem), gestão de SST (PGR, PPR, APR, PCMSO, GRO e eSocial S-2210, S-2220 e S-2240), treinamentos de NRs, locação de equipamentos (dosímetro, linha de vida) e projetos de engenharia (pontos de ancoragem, adequação de máquinas NR-12, incêndio e sinalização). O site atual tem problemas: duas datas de fundação diferentes (2008 e 2017 no CNPJ), dois telefones, equipe sem nomes ou registros, formulário sem rótulos, sem política de privacidade, textos pequenos e e-mails cortados no celular, blog com artigos repetidos e sem fontes. Quero um site com: páginas próprias por serviço; equipe técnica identificada; avaliações do Google com link; formulário com LGPD; blog em pilares com citação de normas; layout que funcione bem no celular; acessibilidade WCAG AA; desempenho bom em Core Web Vitals. Use a seção 5 e a seção 8 deste documento como requisitos e checklist de aceitação. Pergunte antes de criar qualquer texto com nomes, registros ou números que eu ainda não tenha confirmado.

---

## 10. Limitações da análise e itens a confirmar

### 10.1 Limitações da análise
- **Movimento e animações:** não foram confirmados. Só as capturas estáticas foram analisadas.
- **Versão de computador:** não foi analisada. As observações são da versão de celular, exceto onde indicado.
- **Cores e tamanhos exatos:** não foram medidos. As descrições são visuais.
- **Desempenho:** não foi medido com ferramenta.
- **Menu e rodapé:** nem todos os itens apareceram nas capturas ou no conteúdo lido.
- **Avaliações do Google:** o total e as críticas não foram analisados.
- **Vídeo:** foi lido pela transcrição automática e pela descrição, sem análise de imagem.
- **Conteúdo do blog:** foram lidos os textos principais. Não foi feita revisão técnica completa de cada artigo.
- **Concorrentes:** a amostra é pequena e baseada em presença online encontrada em buscas.

### 10.2 Itens a confirmar com a empresa
- Data de fundação oficial: 2008 ou 2017?
- Qual número de WhatsApp é o oficial?
- Para onde o formulário envia as mensagens?
- Os exames ocupacionais são feitos diretamente ou por clínica parceira?
- Nomes, formação e registros da equipe técnica.
- Os números de 5000+ vidas treinadas, 700+ projetos e 3000+ clientes podem ser comprovados?
- Qual é a relação entre o CNPJ 15.499.834/0001-60 e a empresa principal?
- A empresa tem política de privacidade publicada em outro endereço?
- Autorização para usar nomes de clientes e fotos de projetos em casos de estudo.

---

## 11. Glossário

- **APR:** Análise Preliminar de Risco.
- **AET:** Análise Ergonômica do Trabalho.
- **CIPA:** Comissão Interna de Prevenção de Acidentes.
- **CNAE:** Classificação Nacional de Atividades Econômicas.
- **Core Web Vitals:** métricas de desempenho do Google (LCP, INP e CLS).
- **CREA:** Conselho Regional de Engenharia e Agronomia, onde profissionais registram sua habilitação.
- **ART:** Anotação de Responsabilidade Técnica, documento que registra o responsável por um serviço técnico.
- **DDS:** Diálogo Diário de Segurança.
- **eSocial SST:** módulo de saúde e segurança do eSocial. S-2210 é a comunicação de acidente (CAT), S-2220 é o monitoramento da saúde e S-2240 são as condições ambientais de trabalho.
- **GRO:** Gerenciamento de Riscos Ocupacionais.
- **LGPD:** Lei Geral de Proteção de Dados (Lei 13.709/2018).
- **LTCAT:** Laudo Técnico das Condições do Ambiente de Trabalho.
- **NR:** Norma Regulamentadora do Ministério do Trabalho e Emprego.
- **PCMSO:** Programa de Controle Médico de Saúde Ocupacional.
- **PGR:** Programa de Gerenciamento de Riscos, que substituiu o PPRA.
- **PPR:** Programa de Proteção Respiratória.
- **PPRA:** Programa de Prevenção de Riscos Ambientais, substituído pelo PGR.
- **SST:** Saúde e Segurança do Trabalho.
- **WCAG:** Diretrizes de Acessibilidade para Conteúdo Web.

---

## 12. Fontes

**Site analisado**
- https://consentra.com.br/ (página inicial)
- https://consentra.com.br/servicos
- https://consentra.com.br/quem-somos/
- https://consentra.com.br/blog
- https://consentra.com.br/wp-sitemap-posts-post-1.xml (lista de artigos)
- Vídeo "Bem Vindo à Consentra!" no YouTube (ID HI49lxjmuZg), canal @consentra
- Capturas de tela da página em celular (Chrome Android, 04/11/2026), enviadas pelo usuário

**Dados cadastrais e reputação**
- Econodata e Solutudo (CNPJ 28.231.228/0001-01)
- Diretório empresadois.com.br (CNPJ 15.499.834/0001-60)
- Indeed (Consentra e Arauclin)

**Concorrentes**
- https://arauclin.com.br/servicos/
- https://araucaria.agenciaadon.com.br/
- Página de Araucária do site medicinaocupacional.curitiba.br
- psegseguranca.com.br
- https://consegassessoria.com.br/

**Normas e notícias**
- Portaria MTE nº 1.419/2024 (riscos psicossociais no GRO, NR-01)
- [Seconci-SP: NR-1, riscos psicossociais começarão em caráter educativo](https://www.seconci-sp.org.br/nr-1-riscos-psicossociais-comecarao-em-carater-educativo.html)
- [Avanti Contábil: inclusão dos riscos psicossociais no GRO](https://www.avanticontabil.com.br/noticias/contabil/inclusao-dos-fatores-de-risco-psicossociais-no-gro-passa-a-valer-dia-26-deste-mes-em-carater-educativo/c4b74552-1edb-4c30-98c9-78488b264762)
- [Rolmyjun: multas do eSocial 2026](https://rolmyjuncontabilidade.com.br/financas/obrigacoes-trabalhistas/multas-esocial/)
- [Servimet: multas do eSocial 2023](https://servimet.com.br/detalhes-noticia.php?id=599)
- [Ponte Aérea Segurança: multas de SST no eSocial](https://ponteaereaseguranca.com.br/o-guia-definitivo-sobre-as-novas-multas-de-sst/)
