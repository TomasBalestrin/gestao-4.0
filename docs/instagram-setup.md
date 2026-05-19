> 📸 Instagram | Setup Meta Developer | v1.0

# Guia Meta Developer pra Instagram Messaging

Esse documento é o checklist do que você (Bruno) precisa fazer no painel do
Meta pra liberar a integração de Instagram DMs na Gestão 4.0. Pode ir
fazendo em paralelo ao desenvolvimento. Sem isso pronto, a integração
funciona no máximo com contas teste.

Cada bloco abaixo tem um critério de conclusão claro. Quando todas as caixas
estiverem marcadas, me avisa "instagram setup completo" que eu termino o
restante (webhook URL, token, configurações no .env).

---

## 1. Pré-requisitos (1x por funil que vai usar IG)

Cada conta IG que você for conectar à plataforma precisa atender:

- [ ] É uma conta **Instagram Business** ou **Creator** (não funciona em
      conta pessoal). Pra converter: app do IG → Configurações → Conta →
      Mudar para conta profissional → escolher Business ou Creator.
- [ ] Está vinculada a uma **Página do Facebook** que você administra. Sem
      isso a Messaging API não libera. Vincular: app do IG → Configurações
      → Conta → Conectar conta do Facebook → conectar a uma Página
      (não ao perfil pessoal).
- [ ] Você está logado no Facebook como **admin** dessa Página.

Repete pra cada funil que for ter Instagram.

---

## 2. Conta Meta Developer (1x na vida)

- [ ] Acessa https://developers.facebook.com
- [ ] Login com o Facebook pessoal que administra a Página
- [ ] Clica em "Get Started" se for a primeira vez. Aceita os termos.
- [ ] Confirma email e telefone. Sem isso não consegue criar apps.

---

## 3. Meta Business Suite (Business Manager)

Recomendo conectar tudo via Business Manager pra organizar (não obrigatório,
mas evita dor de cabeça depois):

- [ ] Acessa https://business.facebook.com
- [ ] Cria um Business novo: "Bethel Educação" (ou o nome que preferir)
- [ ] Em Configurações do Business → Contas → Páginas → adiciona a(s)
      Página(s) do Facebook que estão ligadas às contas IG
- [ ] Em Configurações do Business → Contas → Contas do Instagram → adiciona
      as contas IG empresariais

---

## 4. Criar o App no Meta for Developers

- [ ] No painel Meta Developers, clica em "Create App"
- [ ] Escolhe o tipo: **Business** (NÃO escolher Consumer ou Gaming)
- [ ] Nome do app: `Gestão 4.0 - Bethel` (vai aparecer pros usuários no
      OAuth, então usa algo institucional)
- [ ] Email de contato: o seu
- [ ] Vincula ao Business Manager que você criou no passo 3
- [ ] Clica "Create App", confirma senha do Facebook

**Anote**: o **App ID** e o **App Secret** que aparecem em Configurações →
Básico. Esses vão pro `.env` da plataforma quando chegar a hora.

---

## 5. Adicionar produto "Instagram" no App

- [ ] No painel do app, painel esquerdo → "Add Product"
- [ ] Localiza "Instagram" (não confundir com "Instagram Basic Display" que
      é outra coisa antiga). O ícone correto leva pra "Instagram Messaging
      / Instagram API"
- [ ] Clica em "Set Up"

---

## 6. Permissões necessárias

Na seção do produto Instagram, vai aparecer uma lista de permissões. As que
precisamos:

- [ ] `instagram_basic` — info básica da conta
- [ ] `instagram_manage_messages` — receber e enviar DMs
- [ ] `pages_manage_metadata` — confirmar identidade da Página vinculada
- [ ] `pages_read_engagement` — ler comentários (útil pra automação futura)
- [ ] `pages_show_list` — listar páginas do user no OAuth flow
- [ ] `business_management` — gerenciar conta business (opcional)

Em modo de desenvolvimento essas permissões funcionam pra **até 25 test
users**. Não precisa fazer App Review pra desenvolver e testar.

---

## 7. Test Users (pra testar antes do App Review)

Pra testar antes de submeter Review:

- [ ] Painel do app → Roles → Test Users → Add
- [ ] Adiciona o seu próprio Facebook e o de quem mais vai testar (max 25)
- [ ] Esses users precisam aceitar o convite (chega notificação no FB deles)
- [ ] Só com test users a gente consegue conectar contas IG no fluxo OAuth

---

## 8. Configurar Webhooks (a gente preenche depois)

Esse passo é cooperativo, mas vai aqui pra você ver o que vai acontecer:

- [ ] No painel do produto Instagram → Configuration → Webhooks
- [ ] Vai pedir uma **Callback URL** — eu te passo quando o deploy estiver
      pronto. Algo como `https://gestao4.bethel.com.br/api/instagram/webhook`
- [ ] Vai pedir um **Verify Token** — string aleatória que a gente define.
      Pode gerar uma com `openssl rand -hex 32`. Anota essa string, ela
      vai pro `.env` também
- [ ] Subscriptions: marca **messages** e **messaging_postbacks**. Outros
      (reactions, message_reads) opcionais

---

## 9. Política de Privacidade pública

Pré-requisito pra App Review (e bom prático antes disso):

- [ ] Você precisa de uma URL pública com política de privacidade que
      mencione o uso de dados do Instagram
- [ ] Pode ser uma página simples em `https://bethel.com.br/privacidade`
      ou similar
- [ ] Tem que dizer claramente: (a) quais dados coletamos, (b) por quanto
      tempo, (c) como o usuário solicita exclusão, (d) contato (email)
- [ ] Cola essa URL em Configurações → Básico → Política de privacidade

---

## 10. App Review (só quando tudo tiver funcionando com test users)

Quando os testes com test users estiverem 100% ok e a plataforma estiver em
produção, submete App Review:

- [ ] Painel do app → App Review → Permissions and Features
- [ ] Pra cada permissão da seção 6, clica "Request"
- [ ] **Vídeo demo** (3-5 min): grava a tela mostrando o fluxo completo:
      1. User clica em "Conectar Instagram" no funil
      2. Aparece OAuth do Facebook, autoriza
      3. Volta pra plataforma, status muda pra "Conectado"
      4. Lead manda DM no Instagram
      5. Aparece notificação na plataforma
      6. Operador responde pela plataforma
      7. Lead recebe a resposta no IG
- [ ] **Descrição do uso**: copia algo como:
      > "Plataforma interna de CRM da Bethel Educação. Cada funil de vendas
      > tem uma conta Instagram empresarial vinculada para receber e
      > responder DMs de potenciais clientes. A equipe comercial usa a
      > plataforma para gerenciar conversas. Os dados são usados apenas
      > internamente, não compartilhados com terceiros."
- [ ] **URL da política de privacidade**: cola
- [ ] Submete. Resposta em 2-5 dias úteis. Se reprovar, eles dizem o que
      ajustar.

---

## 11. Variáveis de ambiente que você vai me passar

Quando você terminar até o passo 7 (test users), vou precisar:

| Variável | Onde achar |
|---|---|
| `META_APP_ID` | App → Configurações → Básico |
| `META_APP_SECRET` | App → Configurações → Básico (clique "Show") |
| `META_WEBHOOK_VERIFY_TOKEN` | Que VOCÊ gera (passo 8) |
| `META_GRAPH_API_VERSION` | A gente define (provavelmente `v21.0`, vou confirmar na hora) |

Esses ficam em `.env.local` (já no `.gitignore`). NUNCA commitar.

---

## 12. Checklist final antes de começar a usar

- [ ] App criado em modo Live (não mais Development)
- [ ] App Review aprovado pras 6 permissões da seção 6
- [ ] Política de privacidade no ar
- [ ] Webhook configurado e validado (a gente vê isso juntos)
- [ ] 1 conta IG teste conectada com sucesso
- [ ] DM teste enviado e recebido

Quando tudo isso estiver verde, oficialmente o IG está produtivo na
plataforma.

---

## Erros comuns que vão aparecer

- **"Permission not granted"** ao tentar conectar: o user não é test user e
  o app está em modo Development. Solução: adicionar como test user OU
  rodar App Review.
- **"Instagram account is not a business account"**: a conta IG ainda é
  pessoal. Converter pra Business no app do IG.
- **"This Instagram account is not connected to a Facebook Page"**:
  vincular IG → FB Page nas configurações do IG.
- **Webhook callback URL não verifica**: o `verify_token` no painel não
  bate com o `.env`. Conferir os 2.
- **Token expirado depois de 60 dias**: a gente implementa um job de
  refresh automático, mas se passar a janela sem renovar, é necessário
  refazer o OAuth.

---

## Por que tabelas separadas (`ig_*` em vez de reusar `chat_*`)

Decisão técnica que tomei pra estrutura, registrada aqui pra contexto:

1. **Identificadores diferentes**: WhatsApp usa JID (`5511...@s.whatsapp.net`,
   universal), Instagram usa PSID (opaco, único por app). Misturar na mesma
   coluna obriga a sempre saber qual canal pra interpretar o valor.
2. **Ciclo de vida diferente**: instância WPP é uma sessão (pareada via
   QR, NextTrack mantém viva). Instância IG é um OAuth com token que
   expira em 60 dias e precisa refresh.
3. **Webhook payload diferente**: NextTrack tem um formato, Meta tem outro
   (`{object, entry, messaging}`). Handlers separados são mais simples
   que um genérico com switch.
4. **RLS independente**: querer dar acesso a IG sem mexer em WPP fica
   trivial com tabelas separadas.
5. **Pode unificar depois se precisar**: começar separado e juntar é
   barato. O contrário é caro.

A UI vai ter componentes que aceitam um "GenericMessage" e funcionam pros
dois canais (`<MessageBubble>` por exemplo já é genérico). A separação é
só no banco e nos handlers.
