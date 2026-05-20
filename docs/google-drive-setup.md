> 📂 Google Drive | Setup Google Cloud Console | v1.0

# Guia Google Cloud pra Análise de Calls

Esse documento é o checklist do que precisa ser feito no Google Cloud Console pra
liberar a integração de Análise de Calls (Google Drive + OpenAI) na Gestão 4.0.

Cada bloco abaixo tem um critério de conclusão claro. Quando todas as caixas
estiverem marcadas, me avisa "google drive setup completo" que eu termino o
restante.

---

## 1. Projeto no Google Cloud Console

- [ ] Acessa https://console.cloud.google.com
- [ ] Cria novo projeto OU reutiliza um existente (recomendado: criar
      `gestao-bethel-calls` separado pra isolar quotas)
- [ ] Anota o **Project ID** (não o nome legivel, o ID)

## 2. Habilitar APIs

No projeto, vai em **APIs e Serviços** > **Biblioteca**:

- [ ] Habilita **Google Drive API**
- [ ] Habilita **Google Docs API** (necessária pra exportar transcrição como
      texto plano)

## 3. Configurar OAuth Consent Screen

Em **APIs e Serviços** > **Tela de permissão OAuth**:

- [ ] Tipo de usuário: **Externo** (qualquer Google account)
- [ ] Nome do app: "Gestão 4.0 Análise de Calls"
- [ ] Email de suporte: contato@mv4digital.com.br
- [ ] Logotipo: (opcional)
- [ ] Domínio autorizado: o domínio de produção da Vercel (sem https, ex:
      `gestao-bethel.vercel.app`)
- [ ] Escopos: adicione manualmente os escopos abaixo (search em "Add or remove scopes"):
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.metadata.readonly`
  - `https://www.googleapis.com/auth/userinfo.email`
  - `openid`
- [ ] Usuários de teste: **adicione o email de cada closer que vai usar**
      enquanto o app estiver em "Em teste" (publicar exige verificação Google,
      que demora). Pode adicionar até 100 usuários teste sem publicar.

## 4. Criar OAuth Client ID

Em **APIs e Serviços** > **Credenciais** > **Criar Credenciais** > **ID do
cliente OAuth**:

- [ ] Tipo: **Aplicativo da Web**
- [ ] Nome: "Gestão 4.0 Web"
- [ ] **Origens JavaScript autorizadas**:
  - `http://localhost:3000`
  - `https://<seu-dominio-prod>` (ex: `https://gestao-bethel.vercel.app`)
- [ ] **URIs de redirecionamento autorizados**:
  - `http://localhost:3000/api/google/oauth/callback`
  - `https://<seu-dominio-prod>/api/google/oauth/callback`
- [ ] Clica **Criar**
- [ ] Anota o **Client ID** e o **Client Secret** (vai usar nas env vars)

## 5. OpenAI API Key

- [ ] Acessa https://platform.openai.com/api-keys
- [ ] Cria nova API key com nome "Gestão 4.0"
- [ ] Anota a key (começa com `sk-...`)
- [ ] Sugerido: configura **limite de gasto mensal** em Settings > Limits
      (ex: $50/mês) pra evitar surpresas

## 6. Variáveis de ambiente

Adicione em `.env.local` (dev) e na Vercel (Settings > Environment Variables):

```bash
# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=                  # do passo 4
GOOGLE_OAUTH_CLIENT_SECRET=              # do passo 4
GOOGLE_OAUTH_REDIRECT_URI=               # ex: https://<dominio>/api/google/oauth/callback

# OpenAI
OPENAI_API_KEY=                          # do passo 5

# Já existem (Instagram), só conferir
NEXT_PUBLIC_APP_URL=                     # ex: https://gestao-bethel.vercel.app
CRON_SECRET=                             # mesmo CRON_SECRET usado no Instagram
```

## 7. Vercel Cron Jobs

Após o deploy, no Dashboard da Vercel (Project > Settings > Cron Jobs), adicione:

- [ ] `GET /api/cron/google-drive-sync` com schedule `0 9,14,19 * * *` (3x/dia BRT)
- [ ] `GET /api/cron/google-drive-refresh-tokens` com schedule `0 4 * * *` (4h
      da manhã, refresh proativo de tokens próximos a expirar)

Ambos exigem header `Authorization: Bearer ${CRON_SECRET}` (Vercel injeta auto
nos cron jobs do projeto).

## 8. Publicação do App (futuro)

Enquanto o app estiver em "Em teste", apenas os usuários adicionados em "Test
users" conseguem conectar. Pra publicar pro mundo:

- Submeter pra **Verificação Google** (necessário pra escopos sensíveis tipo
  drive.readonly). Pode demorar 1-6 semanas.
- Documentar privacy policy e termos de uso público.

Pra uso interno na Bethel, "em teste" + lista de usuários funciona perfeitamente.

---

## Critérios de conclusão

- [ ] Projeto Google Cloud criado
- [ ] Drive API + Docs API habilitadas
- [ ] OAuth consent screen configurada com escopos e usuários teste
- [ ] OAuth Client ID criado (web app, com redirect URIs corretos)
- [ ] OpenAI API key gerada
- [ ] Env vars adicionadas em `.env.local` e Vercel
- [ ] Cron jobs cadastrados na Vercel após deploy

Quando estiver tudo pronto, comande "google drive setup completo".
