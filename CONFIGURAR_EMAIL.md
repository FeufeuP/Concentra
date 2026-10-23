# Como configurar o envio de e-mails do Consentra

Guia passo a passo, escrito para quem **nunca fez isso antes**. Nenhum conhecimento técnico é necessário:
basta seguir as etapas na ordem, com calma. Cada termo novo é explicado quando aparece.

> ⏱️ **Tempo total:** cerca de 1 hora de trabalho seu, mais um tempo de espera (de 15 minutos a
> algumas horas) para a "verificação do domínio" ficar pronta.
>
> 💰 **Custo:** zero, se a empresa já tiver um domínio (ex.: `consentra.com.br`). O serviço de
> e-mail usado (Resend) tem plano gratuito.

---

## Sumário

- [0. Entenda o que vamos fazer (leia antes)](#0-entenda-o-que-vamos-fazer-leia-antes)
- [1. Antes de começar: o que você precisa ter](#1-antes-de-começar-o-que-você-precisa-ter)
- [2. Descobrir onde o DNS do seu domínio é administrado](#2-descobrir-onde-o-dns-do-seu-domínio-é-administrado)
- [3. Criar a conta no Resend](#3-criar-a-conta-no-resend)
- [4. Cadastrar o domínio no Resend](#4-cadastrar-o-domínio-no-resend)
- [5. Copiar os registros DNS para o painel do domínio](#5-copiar-os-registros-dns-para-o-painel-do-domínio)
- [6. Confirmar a verificação no Resend](#6-confirmar-a-verificação-no-resend)
- [7. Criar a chave de API no Resend](#7-criar-a-chave-de-api-no-resend)
- [8. Colocar a chave no Supabase (os "segredos")](#8-colocar-a-chave-no-supabase-os-segredos)
- [9. Testar o envio de propostas no sistema](#9-testar-o-envio-de-propostas-no-sistema)
- [10. (Recomendado) E-mails de recuperação de senha](#10-recomendado-e-mails-de-recuperação-de-senha)
- [11. Problemas comuns e soluções](#11-problemas-comuns-e-soluções)
- [12. Limites, custos e cuidados](#12-limites-custos-e-cuidados)
- [13. Lista de conferência final](#13-lista-de-conferência-final)
- [Glossário](#glossário)

---

## 0. Entenda o que vamos fazer (leia antes)

O Consentra tem **dois tipos de e-mail**:

| Tipo | O que é | Seção deste guia |
|---|---|---|
| **Propostas** | O botão **"Enviar por E-mail"** do orçamento manda a proposta, com o PDF anexo, para o cliente. | Seções 3 a 9 |
| **Recuperação de senha** | O e-mail enviado quando um usuário clica em **"Esqueceu a senha? Recuperar via e-mail"** na tela de login. | Seção 10 |

Hoje, **sem nenhuma configuração**, o botão "Enviar por E-mail" já funciona no **modo manual**: o
sistema baixa o PDF e abre o seu programa de e-mail (Outlook, Gmail etc.) com tudo preenchido, e
você só precisa anexar o PDF e clicar em enviar. Este guia ativa o **modo automático**: o próprio
sistema envia o e-mail com o PDF já anexado, e o envio fica registrado no histórico do orçamento.

### As peças envolvidas (em linguagem simples)

- **Supabase**: o "servidor" do Consentra, onde ficam o banco de dados, os usuários e as funções
  que rodam fora do seu computador. Você já tem essa conta: é a mesma usada para criar o projeto
  **consentra-sst**.
- **Resend**: uma empresa especializada em **enviar e-mails automáticos** em nome de sistemas.
  O Supabase não envia e-mails sozinho, então ele pede ao Resend que envie.
- **Domínio**: o "sobrenome" dos e-mails e sites da empresa, ex.: `consentra.com.br`. Os e-mails
  vão sair com um endereço desse domínio, ex.: `propostas@consentra.com.br`.
- **DNS**: uma espécie de "lista telefônica" pública do domínio. Nela anotamos informações como
  "quem pode enviar e-mails em nome de consentra.com.br". Vamos acrescentar **3 ou 4 linhas**
  nessa lista para provar ao mundo que o Resend tem a sua autorização. Isso é o que faz os e-mails
  **não caírem no spam**.

### O caminho, resumido

```
1. Criar conta no Resend
2. Dizer ao Resend qual é o domínio  ─────►  o Resend mostra 3 ou 4 "registros DNS"
3. Copiar esses registros para o painel onde o domínio é administrado
4. Esperar o Resend confirmar ("Verified")
5. Gerar uma "chave de API" no Resend (uma senha especial para o sistema usar)
6. Guardar essa chave no Supabase, como "segredo"
7. Testar no Consentra
```

### Isso pode estragar o e-mail ou o site atual da empresa?

**Não**, se você seguir o guia. Os registros do Resend ficam num "subendereço" separado
(`send.seudominio.com.br`) e num nome próprio (`resend._domainkey`). Eles **não substituem nem
apagam** nada do que já existe. As únicas regras de ouro são:

> ⚠️ **Nunca apague nem altere registros que já existem** no painel do domínio. Só **adicione** os novos.
>
> ⚠️ **Nunca troque os "servidores DNS"** do domínio (a seção 2 explica o que é isso).

---

## 1. Antes de começar: o que você precisa ter

Marque cada item:

- [ ] **Um computador** com navegador (Chrome, Edge, Firefox…). Um celular serve, mas é mais difícil.
- [ ] **Acesso ao e-mail** que você vai usar para criar a conta no Resend (para clicar no link de confirmação).
- [ ] **O login do Supabase** (a conta onde está o projeto **consentra-sst**).
- [ ] **O domínio da empresa** (ex.: `consentra.com.br`) **e o login do painel onde ele é administrado**.
      A seção 2 ajuda a descobrir qual é esse painel.
- [ ] **Um bloco de notas** (o Bloco de Notas do Windows serve) para guardar temporariamente o que
      for copiando. **Apague esse arquivo no final**, porque ele terá uma chave secreta.

### E se a empresa não tiver domínio?

Sem um domínio próprio, o Resend **só deixa enviar e-mails para o próprio dono da conta**, o que
não serve para mandar propostas a clientes. Nesse caso:

1. Acesse <https://registro.br> e pesquise o nome desejado (ex.: `consentra.com.br`).
2. Se estiver livre, registre em nome da empresa (CNPJ). O custo é de aproximadamente R$ 40 por ano.
3. Depois de registrado e pago, volte a este guia. O DNS ficará no próprio Registro.br (veja o caso **A** da seção 2).

Enquanto isso, o sistema continua funcionando com o **envio manual**.

---

## 2. Descobrir onde o DNS do seu domínio é administrado

Este é o passo que mais confunde, então vá com calma. O domínio foi **comprado** em um lugar
(geralmente o **Registro.br**, para domínios `.com.br`), mas a "lista telefônica" (o DNS) pode
estar sendo **administrada em outro lugar**, normalmente na empresa que hospeda o site ou o e-mail
(Hostinger, Locaweb, HostGator, KingHost, GoDaddy, Cloudflare, Google Workspace…).

Os registros do Resend precisam ser adicionados **no lugar que administra o DNS**. Se você
adicionar no lugar errado, nada acontece (não estraga nada, mas também não funciona).

### Como descobrir (domínios .com.br)

1. Acesse <https://registro.br>.
2. Clique em **"Acessar conta"** (canto superior direito) e entre com o CPF/CNPJ e a senha do titular
   do domínio. Se não souber a senha, use **"Não lembro ou não tenho a senha"**.
3. Em **"Domínios"**, clique no nome do domínio (ex.: `consentra.com.br`).
4. Desça a página até a seção **"DNS"** e observe o que aparece:

| O que você vê | Significa | O que fazer |
|---|---|---|
| **A.** Um botão **"Editar zona"** ou **"Configurar zona DNS"**, ou a mensagem "Você está utilizando os servidores DNS do Registro.br" | O DNS está **no próprio Registro.br** | Use o Registro.br na seção 5 |
| **B.** Uma lista de **"Servidores DNS"** com nomes de outra empresa, ex.: `ns1.dns-parking.com`, `dns1.locaweb.com.br`, `ns1.hostgator.com.br`, `xxx.ns.cloudflare.com` | O DNS está **na empresa desses nomes** (sua hospedagem) | Entre no painel dessa empresa e use-o na seção 5 |

> ⚠️ **Caso B:** **não** clique em "Utilizar DNS do Registro.br", em "Modo avançado" nem em
> "Configurar endereçamento". Isso tiraria o DNS da hospedagem e poderia **derrubar o site e o
> e-mail atuais**. Apenas anote o nome da empresa (Hostinger, Locaweb…) e entre no painel dela.

### Domínios .com (sem .br) ou outros

Pesquise o domínio em <https://lookup.icann.org> e veja o campo **"Name Servers"** (servidores DNS).
O nome que aparecer ali indica a empresa que administra o DNS (mesma lógica do caso B).

### Ainda em dúvida?

Pergunte a quem cuida do site ou do e-mail da empresa: *"Em qual painel eu adiciono registros DNS
(TXT e MX) do domínio?"*. Essa pessoa saberá responder em um minuto.

📝 **Anote:** "O DNS do meu domínio é administrado em: ____________".

---

## 3. Criar a conta no Resend

1. Acesse <https://resend.com/signup>.
2. Crie a conta com um e-mail da empresa (ou entre com a conta Google/GitHub, se preferir).
   - Use um e-mail ao qual **mais de uma pessoa da empresa** tenha acesso, ou guarde bem a senha.
     Essa conta é da empresa, não de um funcionário.
3. Abra a sua caixa de entrada, procure o e-mail do Resend e **clique no link de confirmação**.
4. Entre no painel do Resend. Se ele fizer perguntas iniciais (nome da empresa, para que vai usar),
   responda livremente. Se oferecer um "tutorial de primeiro envio", pode pular.

> O site do Resend é em **inglês**. Este guia indica o nome exato de cada botão, entre aspas, para
> você encontrá-lo.

O plano gratuito é ativado automaticamente: **não precisa cadastrar cartão de crédito**.

---

## 4. Cadastrar o domínio no Resend

1. No menu à esquerda do Resend, clique em **"Domains"** (Domínios).
2. Clique no botão **"Add Domain"** (Adicionar domínio).
3. Preencha:
   - **Name / Domain**: digite **apenas o domínio**, sem `www`, sem `http://` e sem `@`.
     Exemplo correto: `consentra.com.br`.
   - **Region** (Região): escolha **"South America (São Paulo)"**, ou a opção que contenha
     **`sa-east-1`**. É o servidor mais perto dos seus clientes.
   - Se aparecer algum campo opcional (por exemplo, "Custom Return Path"), **deixe como está**.
4. Clique em **"Add"** / **"Add Domain"**.

O Resend vai mostrar uma tela com uma **tabela de registros DNS** (pode aparecer como **"DNS
Records"** ou na aba **"Records"**). **Deixe essa aba aberta**: você vai copiar dela na próxima etapa.

A tabela terá colunas parecidas com:

| Type (Tipo) | Name (Nome) | Content / Value (Conteúdo) | Priority (Prioridade) | TTL |
|---|---|---|---|---|

E normalmente estas linhas (os **valores exatos são diferentes para cada empresa**, por isso
copie sempre do **seu** painel do Resend, nunca deste guia):

| Para que serve | Tipo | Nome | Conteúdo (exemplo, **não copie daqui**) | Prioridade |
|---|---|---|---|---|
| Assinatura digital (DKIM) | **TXT** (ou 3 linhas **CNAME**) | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEB...` (texto longo) | — |
| Autorização de envio (SPF) | **MX** | `send` | `feedback-smtp.sa-east-1.amazonses.com` | `10` |
| Autorização de envio (SPF) | **TXT** | `send` | `v=spf1 include:amazonses.com ~all` | — |

> Se o seu painel mostrar **3 linhas do tipo CNAME** para DKIM (com nomes do tipo
> `xxxxx._domainkey`), tudo bem: é um formato mais novo. Adicione **todas** as linhas que aparecerem.

---

## 5. Copiar os registros DNS para o painel do domínio

Agora você vai abrir **outra aba** do navegador com o painel que administra o DNS (o que você anotou
na seção 2) e criar **uma entrada nova para cada linha** da tabela do Resend.

### Regras importantes (valem para qualquer painel)

1. **Copie e cole**; nunca digite à mão. Um único caractere errado impede a verificação.
   No Resend, há um ícone de **copiar** (dois quadradinhos) ao lado de cada valor.
2. **No campo "Nome"**, cole **só a parte que o Resend mostra** (ex.: `send` ou
   `resend._domainkey`). **Não** acrescente o seu domínio no final. A maioria dos painéis acrescenta
   sozinha. Se você escrever `send.consentra.com.br`, o painel pode transformar em
   `send.consentra.com.br.consentra.com.br`, e não funciona.
3. **Não coloque aspas** a mais no conteúdo do TXT e **não corte** o texto longo do DKIM: ele precisa ir inteiro.
4. **Prioridade** (só no MX): use o número que o Resend mostrar (normalmente `10`).
5. **TTL**: deixe o padrão do painel (ou `3600`). TTL é só o tempo que a informação fica guardada
   em cache; não precisa entender mais que isso.
6. **Não apague nem edite** nenhuma linha que já existia. **Só adicione.**
7. Se o painel tiver um botão **"Salvar alterações"** no final, **clique nele**.

> 💡 **Já existe um registro TXT de SPF no domínio** (começando com `v=spf1`)? Não tem problema: o
> do Resend fica no nome **`send`**, que é diferente do nome do domínio principal. Os dois convivem
> normalmente. Não junte nem altere o que já existia.

### 5.1 Se o DNS está no Registro.br (caso A da seção 2)

1. Em <https://registro.br>, entre na conta, clique em **"Domínios"** e no seu domínio.
2. Na seção **"DNS"**, clique em **"Editar zona"** (ou **"Configurar zona DNS"**).
   - Se só aparecer "Configurar endereçamento" e você **tiver certeza** de que é o caso A (nenhum
     servidor DNS de outra empresa listado), clique em **"Configurar endereçamento"** →
     **"Modo avançado"** → **"Confirmar"**. O Registro.br pode levar de **5 minutos a 2 horas**
     para liberar a edição. Atualize a página até aparecer **"Configurar zona DNS"**.
3. Clique em **"Nova entrada"** e preencha conforme a tabela do Resend. Repita para cada linha:

   **Linha DKIM (TXT):**
   - Tipo: **TXT**
   - Nome: `resend._domainkey`
   - Texto/Conteúdo: cole o valor longo que começa com `p=`
   - Clique em **"Adicionar"**

   **Linha MX:**
   - Tipo: **MX**
   - Nome: `send`
   - Prioridade: `10` (ou o que o Resend indicar)
   - Servidor de e-mail / Conteúdo: cole o valor (ex.: `feedback-smtp.sa-east-1.amazonses.com`)
   - Clique em **"Adicionar"**

   **Linha SPF (TXT):**
   - Tipo: **TXT**
   - Nome: `send`
   - Texto/Conteúdo: `v=spf1 include:amazonses.com ~all` (copie do Resend)
   - Clique em **"Adicionar"**

   **Se o Resend mostrou CNAMEs:** Tipo **CNAME**, Nome e Conteúdo exatamente como no Resend.

4. Ao terminar, clique em **"Salvar alterações"**.

### 5.2 Se o DNS está em uma hospedagem (caso B da seção 2)

O nome dos menus muda um pouco de empresa para empresa, mas a ideia é sempre a mesma: procurar
algo como **"DNS"**, **"Zona DNS"**, **"Gerenciar DNS"**, **"Editor de Zona"** ou
**"Registros DNS"** e clicar em **"Adicionar registro"**.

| Empresa | Onde costuma ficar |
|---|---|
| **Hostinger** | hPanel → **Domínios** → seu domínio → **DNS / Nameservers** → "Gerenciar registros DNS" |
| **Locaweb** | Painel → **Domínios** → seu domínio → **Zona de DNS** / "Editar DNS" |
| **HostGator** | Portal do cliente → **Domínios** → **Gerenciar** → "Zona DNS" (ou cPanel → **Editor de Zona**) |
| **KingHost** | Painel → **Domínios** → seu domínio → **DNS** |
| **GoDaddy** | **Meus produtos** → domínio → **DNS** → "Gerenciar DNS" |
| **Cloudflare** | Selecione o domínio → **DNS** → **Records** → "Add record" (veja a observação abaixo) |

O Resend mantém guias com imagens para vários painéis (em inglês):
<https://resend.com/docs/knowledge-base> (procure o nome da sua empresa, ex.: "Hostinger", "GoDaddy", "Cloudflare").

> **Cloudflare:** ao criar registros **CNAME** (se aparecerem), desligue a "nuvem laranja"
> (*Proxy status* → **DNS only**, nuvem cinza). Para TXT e MX isso não se aplica.
>
> **Painel que pede "Host" em vez de "Nome":** é a mesma coisa. Use `send` ou `resend._domainkey`.
>
> **Painel que mostra o campo "Nome" já com o domínio no final** (ex.: `____.consentra.com.br`):
> digite só `send` ou `resend._domainkey` no espaço.

📝 **Anote:** "Registros adicionados em ___/___ às ___:___".

---

## 6. Confirmar a verificação no Resend

1. Volte à aba do Resend (**Domains** → seu domínio).
2. Clique em **"Verify DNS Records"** / **"Verify"** (Verificar).
3. O status vai ficar como **"Pending"** (pendente) enquanto o Resend confere. Geralmente fica
   pronto **em 15 minutos**, mas pode levar **algumas horas** (em casos raros, até 48 h).
4. Quando cada linha e o domínio mostrarem **"Verified"** (verde), está pronto.

Enquanto espera, pode seguir para a seção 7: ela não depende da verificação.

Se depois de **algumas horas** continuar "Pending" ou aparecer **"Failed"**, veja a seção 11
("O domínio não verifica"). O Resend sublinha em vermelho a linha que está errada.

---

## 7. Criar a chave de API no Resend

A **chave de API** é uma senha especial, que começa com `re_`, que permite ao Consentra pedir ao
Resend para enviar e-mails. **Trate-a como a senha do banco:** quem tiver essa chave pode enviar
e-mails em nome da empresa.

1. No menu à esquerda do Resend, clique em **"API Keys"**.
2. Clique em **"Create API Key"** (Criar chave).
3. Preencha:
   - **Name** (nome): `consentra-propostas`
   - **Permission** (permissão): **"Sending access"** (só envio). **Não** escolha "Full access".
   - **Domain** (se aparecer): escolha o seu domínio (ex.: `consentra.com.br`).
4. Clique em **"Add"** / **"Create"**.
5. A chave aparece **uma única vez**. Clique em copiar e **cole no seu bloco de notas** agora.
   - Se fechar a janela sem copiar, não tem problema: apague essa chave (ícone de lixeira) e crie outra.

> ⚠️ **Nunca** envie essa chave por WhatsApp, e-mail ou grupos, e **nunca** a coloque em arquivos do
> sistema (código, `.env.local`, planilhas compartilhadas). O único lugar dela é o Supabase (seção 8).

---

## 8. Colocar a chave no Supabase (os "segredos")

"Segredos" (*secrets*) são informações confidenciais guardadas **dentro do servidor**. O navegador
dos usuários nunca as vê. A função de envio de propostas (`send-quote-email`), que já está
publicada no seu projeto, lê dois segredos:

| Nome do segredo (exatamente assim) | O que colocar | Exemplo |
|---|---|---|
| `RESEND_API_KEY` | A chave criada na seção 7 | `re_AbC123...` |
| `EMAIL_FROM` | O **remetente**: um nome entre aspas opcionais, seguido de um endereço **do domínio verificado** entre `< >` | `Consentra SST <propostas@consentra.com.br>` |

Sobre o **EMAIL_FROM**:

- O endereço (`propostas@...`) **precisa ser do domínio verificado** no Resend (seção 6).
- Ele **não precisa existir** como caixa de e-mail: serve só como remetente. As **respostas dos
  clientes** não vão para ele: vão automaticamente para o e-mail **do usuário que enviou** a
  proposta (o sistema configura isso sozinho).
- O nome antes do `<` é o que o cliente vê na caixa de entrada. Sugestões:
  `Consentra SST <propostas@consentra.com.br>` ou `Consentra Segurança do Trabalho <contato@consentra.com.br>`.

### Passo a passo

1. Acesse <https://supabase.com/dashboard> e faça login.
2. Clique no projeto **consentra-sst**.
3. No menu à esquerda, clique em **"Edge Functions"** (ícone de raio/função).
4. Clique em **"Secrets"** (pode aparecer como aba ou item de menu dentro de Edge Functions).
   - Link direto: <https://supabase.com/dashboard/project/bdpapewphroxsbrnqpst/functions/secrets>
5. Em **"Add new secret"** (Adicionar segredo), preencha:
   - **Name / Key:** `RESEND_API_KEY`
   - **Value:** cole a chave `re_...` do bloco de notas
6. Clique em **"Add another"** (ou repita o processo) e preencha:
   - **Name / Key:** `EMAIL_FROM`
   - **Value:** `Consentra SST <propostas@consentra.com.br>` (troque pelo seu domínio)
7. Clique em **"Save"** / **"Bulk save"**.
8. Confira na lista que os **dois nomes** aparecem, **escritos exatamente assim**, em maiúsculas e
   com o sublinhado `_`. O valor aparece escondido; isso é normal.

Não é preciso publicar nada de novo: a função passa a usar os segredos automaticamente em instantes.

9. **Apague a chave do bloco de notas** e esvazie a lixeira.

> 🙋 **Prefere que eu faça esta etapa?** Eu consigo cadastrar os segredos no Supabase por você. Mas
> isso exige me passar a chave pela conversa, e o mais seguro é você mesmo colar direto no
> Supabase, como descrito acima.

---

## 9. Testar o envio de propostas no sistema

> Faça o teste **depois** que o domínio estiver **"Verified"** no Resend (seção 6).

1. Abra o Consentra e **recarregue a página** (tecla **F5**). Se já estava aberto, isso faz o
   sistema perceber a nova configuração.
2. Entre com um usuário que **não seja Auditor** (o perfil Auditor SST é somente leitura e sempre
   usa o envio manual).
3. Vá em **Orçamentos** e escolha um orçamento **já salvo**. Para o primeiro teste, use um
   orçamento de teste, não de um cliente real.
4. Na linha do orçamento, clique no botão de **três pontinhos (⋮)** e escolha **"Enviar por E-mail"**.
   (Também dá para usar o botão **"Enviar Diretamente por E-mail"**, dentro do orçamento aberto.)
5. Na janela que abrir, confira:
   - ✅ **Não** deve aparecer o quadro amarelo "Envio manual".
   - ✅ O anexo deve mostrar a etiqueta verde **"Anexo automático"**.
   - ✅ O botão deve dizer **"Enviar Proposta"**.
6. No campo **Destinatário(s)**, coloque **o seu próprio e-mail** (para o teste).
7. Clique em **"Enviar Proposta"**. O botão mostra "Gerando PDF..." e depois "Enviando...".
8. Deve aparecer a mensagem **"Proposta Nº ... enviada para ..."**.
9. Confira:
   - **Sua caixa de entrada**: o e-mail deve chegar em até 1 minuto, com o PDF anexo.
     Olhe também o **spam/lixo eletrônico** na primeira vez.
   - **Resend** → menu **"Emails"** (ou "Logs"): o envio aparece como **"Delivered"** (entregue).
   - **Consentra** → no orçamento, clique no ícone de **histórico** (relógio): deve constar
     **"Proposta enviada por e-mail"**, com destinatários, data, hora e seu nome.
10. Responda ao e-mail recebido: a resposta deve ir para o **e-mail do usuário** que enviou.

🎉 Se tudo isso funcionou, o envio automático de propostas está configurado.

---

## 10. (Recomendado) E-mails de recuperação de senha

Quando alguém clica em **"Esqueceu a senha? Recuperar via e-mail"** na tela de login, quem envia o e-mail é o **Supabase**. O serviço de
e-mail embutido no Supabase é só para testes: **só entrega para membros da equipe do projeto e tem
um limite baixíssimo de envios por hora**. Para os usuários receberem esse e-mail de verdade,
vamos mandar o Supabase usar o **mesmo Resend** (aproveitando o domínio já verificado).

### 10.1 Criar uma segunda chave no Resend (recomendado)

Repita a **seção 7** criando outra chave com o nome `supabase-auth` e permissão **"Sending access"**.
Ter chaves separadas permite cancelar uma sem afetar a outra. Copie a chave para o bloco de notas.

### 10.2 Configurar o SMTP no Supabase

**SMTP** é o "idioma" padrão que sistemas usam para entregar e-mails. Vamos informar ao Supabase o
endereço do "correio" do Resend.

1. No Supabase, projeto **consentra-sst**, clique em **"Authentication"** (ícone de cadeado/usuários) no menu à esquerda.
2. Clique em **"Emails"** e depois na aba **"SMTP Settings"**.
   - Link direto: <https://supabase.com/dashboard/project/bdpapewphroxsbrnqpst/auth/smtp>
3. Ligue a chave **"Enable Custom SMTP"** (Ativar SMTP personalizado).
4. Preencha **exatamente**:

| Campo | O que colocar |
|---|---|
| **Sender email** (e-mail do remetente) | `nao-responda@consentra.com.br` (troque pelo seu domínio verificado) |
| **Sender name** (nome do remetente) | `Consentra SST` |
| **Host** | `smtp.resend.com` |
| **Port number** (porta) | `465` |
| **Username** (usuário) | `resend` (literalmente a palavra **resend**, **não** o seu e-mail) |
| **Password** (senha) | a chave `re_...` criada em 10.1 |
| **Minimum interval between emails** (se aparecer) | deixe o padrão |

5. Clique em **"Save"**.

### 10.3 Aumentar o limite de e-mails por hora

1. Ainda em **Authentication**, clique em **"Rate Limits"** (limites).
   - Link direto: <https://supabase.com/dashboard/project/bdpapewphroxsbrnqpst/auth/rate-limits>
2. No item de **e-mails enviados por hora** (*Rate limit for sending emails*), coloque, por exemplo, `30`.
3. Clique em **"Save"**.

### 10.4 Endereço do sistema (para o link do e-mail abrir o lugar certo)

O e-mail de recuperação traz um link que leva de volta ao sistema. O Supabase só aceita links para
endereços autorizados.

1. Em **Authentication**, clique em **"URL Configuration"**.
   - Link direto: <https://supabase.com/dashboard/project/bdpapewphroxsbrnqpst/auth/url-configuration>
2. **Site URL**: coloque o endereço onde o Consentra fica publicado (ex.: `https://sistema.consentra.com.br`).
   Se o sistema **ainda não está publicado na internet**, deixe como está por enquanto.
3. Em **Redirect URLs**, clique em **"Add URL"** e adicione o endereço publicado seguido de `/**`
   (ex.: `https://sistema.consentra.com.br/**`). **Mantenha** o `http://localhost:3000/**` que já está lá.
4. Salve.

### 10.5 (Opcional) Texto do e-mail em português

1. Em **Authentication → Emails**, aba **"Templates"**, escolha **"Reset Password"** (redefinir senha).
2. **Subject** (assunto): `Redefinição de senha – Consentra SST`
3. No corpo (*Message body*), apague o texto em inglês e cole:

```html
<h2>Redefinição de senha</h2>
<p>Olá!</p>
<p>Recebemos um pedido para redefinir a senha da sua conta no sistema Consentra SST.</p>
<p><a href="{{ .ConfirmationURL }}">Clique aqui para criar uma nova senha</a></p>
<p>Se você não fez esse pedido, ignore este e-mail: sua senha continua a mesma.</p>
<p>Consentra SST</p>
```

> Não altere o trecho `{{ .ConfirmationURL }}`: é onde o Supabase coloca o link.

4. Clique em **"Save"**.

### 10.6 Testar

1. Abra o Consentra em uma **janela anônima** (Ctrl+Shift+N no Chrome).
2. Na tela de login, clique em **"Esqueceu a senha? Recuperar via e-mail"** e informe o e-mail de um usuário cadastrado
   (que você consiga acessar).
3. O e-mail deve chegar em até 1 minuto (olhe o spam na primeira vez), com o remetente `Consentra SST`.
4. **Não é preciso** concluir a troca de senha se não quiser. Basta ver que o e-mail chegou.
   (Lembrete: se trocar, a senha antiga deixa de valer.)
5. No Resend → **"Emails"**, o envio também aparece.

---

## 11. Problemas comuns e soluções

### No Consentra (janela de envio)

| O que aparece | Causa provável | Solução |
|---|---|---|
| Quadro amarelo **"Envio manual — Envio automático ainda não configurado no servidor"** | Segredos ausentes ou com nome errado | Seção 8: confira se os nomes são **exatamente** `RESEND_API_KEY` e `EMAIL_FROM`. Depois recarregue o Consentra (F5) |
| **"Envio de e-mail não configurado no servidor (RESEND_API_KEY / EMAIL_FROM)"** | Mesmo caso acima | Mesmo caso acima |
| **"Não foi possível consultar o servidor de e-mail agora"** | Internet instável ou sessão expirada | Verifique o indicador de conexão no topo; saia e entre de novo no sistema |
| **"O provedor de e-mail recusou o envio (… domain is not verified …)"** | Domínio ainda não verificado, ou o `EMAIL_FROM` usa outro domínio | Seção 6: espere ficar "Verified". Confira se o domínio do `EMAIL_FROM` é **o mesmo** verificado |
| **"O provedor de e-mail recusou o envio (… API key is invalid …)"** | Chave copiada errada (faltando pedaço, espaço extra) ou apagada no Resend | Crie uma nova chave (seção 7) e substitua o valor de `RESEND_API_KEY` (seção 8) |
| **"… You can only send testing emails to your own email address …"** | Domínio não verificado (o Resend está em modo de teste) | Termine as seções 4 a 6 |
| **"… Invalid `from` field …"** | `EMAIL_FROM` em formato errado | Use exatamente o formato `Nome <endereco@seudominio.com.br>`, com os sinais `<` e `>` |
| **"Salve o orçamento antes de enviá-lo por e-mail."** | O orçamento ainda não foi salvo | Clique em salvar no orçamento e tente de novo |
| **"O PDF excede o limite de 8 MB…"** | Proposta muito grande (muitas páginas ou um logotipo pesado) | Use um logotipo menor (Configurações) ou o envio manual |
| **"Perfil Auditor SST possui acesso somente leitura."** | O usuário é Auditor | Envie com outro perfil ou use o envio manual |
| **"Sessão inválida ou expirada."** | Login antigo | Saia do sistema e entre novamente |
| **"… daily sending quota …"** ou **"… rate limit …"** | Limite diário do plano gratuito atingido (seção 12) | Aguarde até as 21h (horário de Brasília), quando o limite renova, ou contrate o plano pago |

### O domínio não verifica (fica "Pending" ou "Failed")

1. **Espere pelo menos 1 hora** depois de adicionar os registros.
2. Confira se adicionou no **painel certo** (seção 2). Esse é o erro mais comum.
3. No Resend, veja qual linha está **sublinhada em vermelho** e compare com o que foi cadastrado:
   - O **Nome** ficou duplicado (`send.consentra.com.br.consentra.com.br`)? Edite e deixe só `send`.
   - O texto longo do DKIM foi **cortado** ou ganhou **aspas/espaços** a mais? Apague essa entrada e cole de novo.
   - O **MX** ficou sem a **prioridade** `10`?
   - No Registro.br, você clicou em **"Salvar alterações"** no final?
4. Para conferir de fora, acesse <https://dnschecker.org>, escolha o tipo (**TXT** ou **MX**) e
   pesquise `send.seudominio.com.br` ou `resend._domainkey.seudominio.com.br`. Se aparecerem os
   valores do Resend, está publicado; é só aguardar ou clicar de novo em "Verify".
5. Guia oficial (em inglês): <https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying>

### O e-mail chega, mas cai no spam

- Confirme que o domínio está **"Verified"** (com DKIM e SPF verdes).
- **(Recomendado) Adicione um registro DMARC**, que é uma "política" que aumenta a confiança dos
  provedores. **Antes**, verifique se já existe um registro com o nome `_dmarc` no seu DNS: só
  pode existir **um**. Se não existir, adicione:
  - Tipo: **TXT**
  - Nome: `_dmarc`
  - Conteúdo: `v=DMARC1; p=none;`
- Evite assuntos "promocionais" (tudo em maiúsculas, muitos "!!!", "GRÁTIS").
- Peça aos primeiros clientes que marquem como "Não é spam": isso ensina o provedor.

### Recuperação de senha não chega

| Situação | Solução |
|---|---|
| Nada chega, e no Resend → "Emails" também não aparece nada | Revise a seção 10.2: **Username** deve ser `resend`; **Password**, a chave `re_...`; **Host**, `smtp.resend.com`; **Port**, `465` (se der erro, tente `587`) |
| Aparece no Resend como "Bounced" | O endereço de destino não existe. Confira o e-mail do usuário |
| Mensagem de limite no login ("rate limit", "too many requests") | Seção 10.3: aumente o limite. Ou espere 1 hora |
| O link do e-mail abre uma página de erro | Seção 10.4: o endereço do sistema não está em **Redirect URLs** |

### Onde ver o "por quê" de um erro

- **Resend** → **"Emails"** / **"Logs"**: mostra cada envio e o motivo de falha.
- **Supabase** → **Edge Functions** → **send-quote-email** → aba **"Logs"**: mostra os erros da
  função de envio de propostas (procure linhas com "Resend error").

---

## 12. Limites, custos e cuidados

**Plano gratuito do Resend:** **100 e-mails por dia** e **3.000 por mês**, sem cartão de crédito.

- **Cada destinatário conta como um e-mail.** Uma proposta enviada para 1 destinatário + 1 cópia (CC) gasta **2**.
- O limite diário **renova à meia-noite no horário UTC**, ou seja, **às 21h no horário de Brasília**.
- Quando o limite acaba, os envios param até renovar; no gratuito não há cobrança extra.
- Se a empresa precisar de mais, o plano **Pro** custa **US$ 20/mês** (50.000 e-mails/mês, sem limite diário).
  Para assinar: Resend → **"Settings"** → **"Billing"**.
- Os e-mails de recuperação de senha (seção 10) também contam nesse limite.

**Limites do próprio Consentra** (proteções do sistema):

- Até **5 destinatários** e **5 cópias (CC)** por envio.
- Assunto de até 200 caracteres; mensagem de até 10.000 caracteres.
- PDF de até **8 MB**.

**Cuidados de segurança:**

- A chave do Resend fica **somente** nos segredos do Supabase (e no SMTP do Supabase, seção 10).
- Se desconfiar que uma chave vazou: no Resend → **"API Keys"**, **apague** a chave (lixeira), crie
  outra e atualize o segredo no Supabase (seção 8) ou o SMTP (seção 10.2).
- Ative a **verificação em duas etapas** nas contas do Resend e do Supabase (menu de conta/perfil →
  "Security" / "Two-factor authentication").
- Se um funcionário que tinha acesso sair da empresa, troque as chaves e as senhas dessas contas.

---

## 13. Lista de conferência final

**Envio de propostas**

- [ ] Descobri onde o DNS do domínio é administrado (seção 2)
- [ ] Criei a conta no Resend e confirmei o e-mail (seção 3)
- [ ] Cadastrei o domínio no Resend, região São Paulo (seção 4)
- [ ] Adicionei **todas** as linhas DNS no painel certo, sem apagar nada (seção 5)
- [ ] O domínio aparece como **"Verified"** no Resend (seção 6)
- [ ] Criei a chave `consentra-propostas` com "Sending access" (seção 7)
- [ ] Cadastrei `RESEND_API_KEY` e `EMAIL_FROM` nos segredos do Supabase (seção 8)
- [ ] Apaguei a chave do bloco de notas
- [ ] Enviei uma proposta de teste para mim e ela chegou com o PDF (seção 9)
- [ ] O envio aparece no histórico do orçamento (seção 9)

**Recuperação de senha (recomendado)**

- [ ] Criei a chave `supabase-auth` (seção 10.1)
- [ ] Configurei o SMTP personalizado no Supabase (seção 10.2)
- [ ] Ajustei o limite de e-mails por hora (seção 10.3)
- [ ] Conferi o Site URL e as Redirect URLs (seção 10.4)
- [ ] (Opcional) Traduzi o modelo do e-mail (seção 10.5)
- [ ] Testei o "Recuperar via e-mail" da tela de login (seção 10.6)

**Segurança**

- [ ] Verificação em duas etapas ativada no Resend e no Supabase
- [ ] (Recomendado) Registro DMARC adicionado (seção 11)

---

## Glossário

| Termo | Significado |
|---|---|
| **API** | Forma de um sistema "conversar" com outro automaticamente. |
| **Chave de API** | Senha especial que um sistema usa para acessar outro (aqui, o Consentra acessando o Resend). Começa com `re_`. |
| **CNAME** | Tipo de registro DNS que funciona como um "apelido" apontando para outro endereço. |
| **DKIM** | Assinatura digital colocada em cada e-mail, que prova que ele saiu mesmo da empresa e não foi alterado. |
| **DMARC** | Regra publicada no DNS que diz aos provedores o que fazer com e-mails que falham no SPF/DKIM. Ajuda contra spam e falsificação. |
| **DNS** | "Lista telefônica" pública de um domínio: diz onde fica o site, quem recebe e quem pode enviar e-mails, etc. |
| **Domínio** | O endereço da empresa na internet, ex.: `consentra.com.br`. |
| **Edge Function** | Pequeno programa que roda no servidor do Supabase. O `send-quote-email` é o que envia as propostas. |
| **MX** | Tipo de registro DNS que indica um servidor de e-mail. |
| **Painel do domínio / DNS** | Site onde se administram os registros DNS (Registro.br, Hostinger, Locaweb…). |
| **Registro DNS** | Cada linha da "lista telefônica" do domínio. |
| **Remetente (From)** | O endereço que aparece como "De:" no e-mail. |
| **Reply-to** | O endereço que recebe as respostas. No Consentra, é o e-mail de quem enviou a proposta. |
| **Resend** | Serviço que envia e-mails automáticos em nome de sistemas. |
| **Segredo (secret)** | Informação confidencial guardada no servidor do Supabase, invisível para os usuários. |
| **Servidores DNS (nameservers)** | Indicam **qual empresa** administra o DNS de um domínio. **Não mexa neles** neste processo. |
| **SMTP** | Protocolo padrão de envio de e-mails, usado aqui para o Supabase enviar a recuperação de senha pelo Resend. |
| **SPF** | Registro DNS que lista quem tem autorização para enviar e-mails em nome do domínio. |
| **Supabase** | Plataforma onde ficam o banco de dados, os logins e as funções do Consentra. |
| **TTL** | Tempo (em segundos) que um registro DNS fica guardado em cache. Pode deixar o padrão. |
| **TXT** | Tipo de registro DNS com texto livre (usado para SPF, DKIM e DMARC). |
| **Verified** | "Verificado": o Resend confirmou que os registros DNS estão corretos. |
