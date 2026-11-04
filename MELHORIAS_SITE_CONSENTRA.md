# Melhorias sugeridas para o site da Consentra (consentra.com.br)

> Documento de recomendações, baseado na análise de 04/11/2026 (ver `ANALISE_CONSENTRA.md`).
> Refere-se ao **site institucional da Consentra**, não ao sistema deste repositório (`MELHORIAS.md`).
> As sugestões não foram aplicadas: o site não é editado por este repositório.

---

## Sumário

1. [Como ler esta lista](#1-como-ler-esta-lista)
2. [Prioridade 1: confiança, conformidade e erros visíveis](#2-prioridade-1-confiança-conformidade-e-erros-visíveis)
3. [Prioridade 2: experiência no celular e acessibilidade](#3-prioridade-2-experiência-no-celular-e-acessibilidade)
4. [Prioridade 3: conteúdo, SEO e prova social](#4-prioridade-3-conteúdo-seo-e-prova-social)
5. [Prioridade 4: desempenho, segurança e manutenção](#5-prioridade-4-desempenho-segurança-e-manutenção)
6. [Movimento e animações](#6-movimento-e-animações)
7. [Plano de execução sugerido](#7-plano-de-execução-sugerido)
8. [Itens a confirmar com a empresa](#8-itens-a-confirmar-com-a-empresa)

---

## 1. Como ler esta lista

- **Prioridade 1 (P1):** afeta confiança, conformidade legal ou gera erro visível. Corrigir primeiro.
- **Prioridade 2 (P2):** afeta a experiência no celular e a acessibilidade.
- **Prioridade 3 (P3):** afeta conteúdo, SEO e prova social.
- **Prioridade 4 (P4):** afeta desempenho, segurança e manutenção.
- **Esforço:** B (baixo, até 1 dia), M (médio, até 1 semana), A (alto, mais de 1 semana).
- **Evidência:** referência à seção de `ANALISE_CONSENTRA.md` onde o problema foi documentado.

---

## 2. Prioridade 1: confiança, conformidade e erros visíveis

| # | Problema | Evidência | Correção sugerida | Esforço |
|---|---|---|---|---|
| 1.1 | **Dois telefones diferentes** no site: (41) 99694-3025 no hero e (41) 98485-9144 no contato, banner e artigos. | §3, §15.5 | Definir um número oficial de WhatsApp e usá-lo em todos os pontos. Se houver dois setores, identificar cada um (comercial e atendimento). | B |
| 1.2 | **Marco histórico inconsistente:** "16+ anos", "Desde 2008", "CONSENTRA há 16 anos" (conta de 2024) e CNPJ aberto em 2017. | §2, §5, §14.5 | Confirmar a data de fundação com documentos da empresa. Escrever uma data fixa ("Desde AAAA") em vez de uma contagem de anos, que fica desatualizada. | B |
| 1.3 | **Responsável técnico não identificado:** laudos e PGR não trazem nome, formação nem registro (CREA ou equivalente). | §4.2, §11 | Criar uma seção "Equipe técnica" com nome, cargo, formação e registro profissional de quem assina os laudos. Substituir a imagem gerada por IA por fotos reais da equipe. | M |
| 1.4 | **Política de privacidade ausente** em um site com formulário que coleta nome, telefone e mensagem. | §8, §14.9 | Publicar política de privacidade (LGPD) com a finalidade do uso dos dados. Adicionar checkbox de consentimento no formulário. | M |
| 1.5 | **Copyright desatualizado:** "© Copyright 2024". | §15.5 | Usar ano dinâmico no rodapé (o próprio tema do WordPress costuma oferecer essa opção). | B |
| 1.6 | **Links quebrados:** `/sobre` e `/contato` retornam 404. O link "Endereço" da home aponta para `#`. | §8, §3 | Criar redirecionamentos 301: `/sobre` e `/contato` para `/quem-somos/` e `/#contato`. Trocar o link "Endereço" por um link para o Google Maps. | B |
| 1.7 | **Formulário sem rótulos visíveis.** Os campos têm só o texto de exemplo, que desaparece ao digitar. Não se sabe para onde o formulário envia. | §15.5 | Adicionar rótulos visíveis acima de cada campo, mantendo o placeholder como exemplo. Confirmar o destino da mensagem e enviar uma confirmação ao visitante. | B |
| 1.8 | **E-mails cortados** nos cards de contato no celular ("comercial@consentra.c..."). | §15.5 | Permitir quebra de linha no texto (`overflow-wrap: anywhere`) ou reduzir o tamanho da fonte nesse bloco. | B |
| 1.9 | **Vídeo com reprodução automática e som:** o pop-up usa `autoplay=1` e `mute=0`. Navegadores costumam bloquear autoplay com som, e o visitante pode se assustar. | §3, §14.8 | Remover o autoplay. Manter a miniatura com botão de play. | B |

---

## 3. Prioridade 2: experiência no celular e acessibilidade

| # | Problema | Evidência | Correção sugerida | Esforço |
|---|---|---|---|---|
| 2.1 | **Serviços em três colunas no celular:** textos pequenos e títulos quebrados ("Laudos / Técnicos"). | §15.5 | Usar uma coluna no celular, ou duas no máximo. Aumentar o texto de apoio para pelo menos 16 px. | M |
| 2.2 | **Quatro cards de diferencial lado a lado** no celular, com texto apertado. | §15.5 | Empilhar os cards em uma coluna no celular, ou transformá-los em carrossel com indicadores. | B |
| 2.3 | **Títulos em caixa alta** ("SOMOS A CONSENTRA", "QUEM SOMOS NÓS", títulos de acordeão). | §14.9 | Usar caixa de frase (primeira letra maiúscula). Manter a caixa alta só em siglas. | B |
| 2.4 | **Textos pequenos e de baixo contraste** sobre teal e sobre a foto do hero. | §15.5, §15.6 | Medir o contraste com ferramenta (meta: 4,5:1 para texto normal, conforme WCAG AA). Adicionar uma camada escura sobre a foto do hero. | M |
| 2.5 | **Textos alternativos ruins:** "Manter", "manter", "Manter Home" e nomes de arquivo como `19-THA-1-1024x671`. Logotipo do cabeçalho sem texto alternativo. | §14.9 | Descrever cada imagem (ex.: "Equipe da Consentra em frente a galpão"). Logotipo com `alt="Consentra Segurança do Trabalho"`. Imagens decorativas com `alt=""`. | B |
| 2.6 | **Quatro rótulos diferentes para o mesmo destino** (WhatsApp): "Fale conosco", "SAIBA MAIS!", "Saiba mais", "Solicite um orçamento" e "Quero Pedir um Orçamento". | §14.8 | Padronizar em dois rótulos: "Falar no WhatsApp" (contato) e "Solicitar orçamento" (venda). | B |
| 2.7 | **Carrossel de clientes com cerca de 20 indicadores** e logotipos de tamanhos e recortes diferentes. | §15.5 | Padronizar altura e fundo dos logotipos. Reduzir os indicadores. Oferecer botão de pausa e controles de teclado. | M |
| 2.8 | **Banner de contato com foto de banco de imagens** e logotipo sobre branco, fora do estilo teal. | §15.5 | Substituir por foto real da equipe ou usar o estilo do restante do site. | M |
| 2.9 | **Mapa com pino e informações pouco acessíveis** no celular. | §15.2 | Manter o mapa e adicionar link "Como chegar" com o endereço em texto. | B |
| 2.10 | **Menu hambúrguer** recolhido, com itens do menu não visíveis na análise. | §14.2 | Verificar se o menu tem todos os itens esperados (Início, Serviços, Quem somos, Blog e Contato) e se a navegação funciona com teclado. | B |

---

## 4. Prioridade 3: conteúdo, SEO e prova social

| # | Problema | Evidência | Correção sugerida | Esforço |
|---|---|---|---|---|
| 3.1 | **Conteúdo repetido entre páginas:** cards de diferencial, clientes, depoimentos e contato aparecem idênticos na home e em "Quem somos". | §14.5, §14.6 | Manter o diferencial na home e, em "Quem somos", trazer a história, a equipe e os valores. | M |
| 3.2 | **"Projetos que apoiamos":** seis miniaturas, com só duas imagens distintas repetidas. | §14.5 | Usar fotos diferentes de projetos reais, com legenda (cliente, local, ano). | M |
| 3.3 | **Blog com quatro artigos quase iguais sobre CIPA** e três sobre ancoragem. | §7.2 | Consolidar em um artigo principal por tema, com artigos complementares que tratem de dúvidas específicas. Manter links internos entre eles. | A |
| 3.4 | **Artigo de CIPA sem a tabela da NR-05** no "dimensionamento". | §7.2 | Incluir a tabela de dimensionamento da NR-05 e exemplos práticos. Citar a norma com o número do item. | M |
| 3.5 | **Tema urgente sem a data-chave:** riscos psicossociais no GRO, com fiscalização possível desde 26/05/2026. | §7.2 | Escrever um artigo atualizado com o cronograma da Portaria MTE nº 1.419/2024 e o que a empresa deve fazer agora. | M |
| 3.6 | **Multas do eSocial com faixas diferentes** e sem fonte. | §7.2 | Citar a base legal de cada multa ou remover as faixas. Indicar que os valores podem mudar. | M |
| 3.7 | **Textos sem citação legal** (quase nenhuma lei, portaria ou fonte). | §7.2 | Citar a norma em cada artigo (número da NR, item, portaria). | M |
| 3.8 | **Blog sem publicações desde abril de 2026.** | §7 | Criar um calendário editorial, com ritmo fixo (por exemplo, dois artigos por mês). | A |
| 3.9 | **Métricas sem metodologia:** "5000+ vidas treinadas", "700+ projetos", "3000+ clientes". | §3 | Confirmar os números com registros internos. Se não for possível comprovar, usar valores verificáveis ou remover. | B |
| 3.10 | **Serviços sem preço nem prazo** e sem cases de clientes. | §11 | Publicar faixas de prazo por serviço e um caso de estudo por área (com autorização do cliente). | A |
| 3.11 | **Exames ocupacionais não declarados** no site, embora o PCMSO dependa deles. | §4.3, §10 | Declarar se a empresa oferece exames diretamente ou por clínica parceira, com o nome da parceira. | B |
| 3.12 | **Avaliações do Google sem link de acesso.** Os cartões mostram cinco estrelas, mas não levam ao perfil. | §15.7 | Adicionar "Ver todas as avaliações" e um botão "Avalie-nos no Google", com o link do perfil. | B |
| 3.13 | **Estrutura de dados para buscadores não verificada.** | §8 | Verificar se o site tem marcação de negócio local (schema LocalBusiness) com nome, endereço, telefone e horário. | M |

---

## 5. Prioridade 4: desempenho, segurança e manutenção

| # | Problema | Evidência | Correção sugerida | Esforço |
|---|---|---|---|---|
| 4.1 | **Imagens grandes em miniaturas:** arquivos de 1024 px exibidos em 300 px ou menos. | §14.10 | Usar formatos modernos (WebP), tamanhos adequados e carregamento preguiçoso (lazy load). | M |
| 4.2 | **Imagens duplicadas** na mesma página. | §14.5, §14.10 | Remover duplicatas e reutilizar a mesma mídia com referência, em vez de enviar o arquivo de novo. | B |
| 4.3 | **Vídeo carregado com a página:** o iframe do YouTube é carregado mesmo sem ser usado. | §14.3 | Carregar o vídeo apenas ao clicar (miniatura com play). | B |
| 4.4 | **Muitos plugins** de terceiros, sem verificação de versões ou atualizações. | §14.1, §14.10 | Inventariar os plugins, remover os que não são usados (como bibliotecas de templates) e manter todos atualizados. | M |
| 4.5 | **API pública do WordPress expõe a lista de plugins.** | §14.10 | Restringir os endpoints públicos que não são necessários, ou usar plugin de segurança para limitar o acesso. | M |
| 4.6 | **Slug de autor exposto** ("jovineconsentra-com-br") no sitemap. | §8 | Desativar a listagem pública de autores e trocar o slug por um nome neutro. | B |
| 4.7 | **Não foi possível medir desempenho nem responsividade** nesta análise. | §14 | Medir com ferramentas públicas (PageSpeed Insights, Lighthouse) e acompanhar os indicadores Core Web Vitals. | B |
| 4.8 | **Painel de administração**, com senhas e acessos não verificados. | §8 | Usar autenticação em dois fatores, senhas fortes e acesso restrito ao painel. | B |

---

## 6. Movimento e animações

As animações não puderam ser confirmadas nas capturas estáticas (ver §15.3 de `ANALISE_CONSENTRA.md`). As recomendações abaixo valem para qualquer animação que exista ou seja criada.

| # | Recomendação | Motivo |
|---|---|---|
| 6.1 | Respeitar a preferência de movimento reduzido do sistema (`prefers-reduced-motion`). | Pessoas sensíveis a movimento podem sentir desconforto. |
| 6.2 | Limitar as entradas ao rolar a efeitos sutis (fade, deslocamento curto de até 20 px), sem repetir a animação a cada rolagem. | Evita a sensação de página instável. |
| 6.3 | Pausar o carrossel de clientes e de depoimentos com um botão visível, e não iniciar a rotação com movimento rápido. | Atende a WCAG 2.2.2 (pausar, parar ou ocultar). |
| 6.4 | Não usar reprodução automática com som (ver 1.9). | Navegadores bloqueiam e o efeito é intrusivo. |
| 6.5 | Confirmar os contadores 5000+, 700+ e 3000+ com dados verificáveis antes de animá-los (ver 3.9). | Contadores animados dão peso a números que não foram comprovados. |
| 6.6 | Usar o mesmo tempo de transição em todo o site (por exemplo, 200 a 300 ms). | Dá consistência ao movimento. |

---

## 7. Plano de execução sugerido

**Semana 1 (P1, correções rápidas):**
- Unificar o telefone (1.1).
- Ajustar o marco histórico (1.2).
- Ano dinâmico no rodapé (1.5) e redirecionamentos (1.6).
- Rótulos do formulário e destino confirmado (1.7).
- Quebra de linha dos e-mails (1.8) e remoção do autoplay (1.9).

**Semanas 2 a 4 (P1 de conteúdo e P2):**
- Política de privacidade e consentimento (1.4).
- Seção de equipe técnica com registros (1.3).
- Ajustes de responsividade (2.1 a 2.4).
- Textos alternativos e rótulos de CTA (2.5 e 2.6).

**Mês 2 em diante (P3 e P4):**
- Reorganização do blog (3.3 a 3.8).
- Casos de estudo e prazos (3.10).
- Desempenho e limpeza de plugins (4.1 a 4.6).

---

## 8. Itens a confirmar com a empresa

- Data de fundação oficial: 2008 ou 2017 (ver 1.2).
- Qual número de WhatsApp é o oficial (ver 1.1).
- Para onde o formulário envia as mensagens (ver 1.7).
- Se os exames ocupacionais são feitos diretamente ou por clínica parceira (ver 3.11).
- Nomes e registros profissionais da equipe técnica (ver 1.3).
- Se os números de 5000+, 700+ e 3000+ podem ser comprovados (ver 3.9).
- Se o site tem política de privacidade publicada em outra página (ver 1.4).
