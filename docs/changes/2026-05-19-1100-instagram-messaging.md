# CHANGE | Instagram Messaging (DMs)

> 🦅 Falcão | 2026-05-19 | v1.0
> Tipo: feature
> Estimativa: 13 tasks, ~3h30

## Contexto

Adicionar chat de Instagram Direct na plataforma, similar ao WhatsApp já
existente, mas com modelo de vínculo diferente: 1 funil = 1 instância IG
(vs. 1 user = 1 instância WPP). Conta IG é da empresa, qualquer membro do
funil pode ler e enviar.

Restrições do canal:
- Passivo: só responde, lead precisa iniciar
- Janela de 24h após última msg do lead (countdown visível na UI)
- 200 DMs/hora, token expira em 60 dias
- Provider direto Meta Graph API (sem NextTrack)

Setup Meta Developer documentado em `docs/instagram-setup.md`. App Review
é bloqueante pra prod, mas dev funciona com test users.

## Análise

**Arquivos afetados (edição):**
- `lib/database.types.ts` (novos tipos)
- `components/kanban/kanban-card-modal.tsx` (adicionar pane IG)
- `components/kanban/kanban-card-modal-sidebar.tsx` (ícone IG)
- `components/kanban/kanban-card.tsx` (ícone IG no card, similar ao WPP)
- `app/(dashboard)/admin/funis/[id]/page.tsx` (passar instância IG)
- `components/funis/funil-form.tsx` (nova tab "Instagram")

**Novos arquivos:**
- `supabase/migrations/0022_instagram_messaging.sql`
- `lib/instagram/env.ts`
- `lib/instagram/graph-client.ts`
- `lib/instagram/oauth.ts`
- `lib/instagram/webhook-handlers.ts`
- `app/api/instagram/webhook/route.ts`
- `app/api/instagram/oauth/start/route.ts`
- `app/api/instagram/oauth/callback/route.ts`
- `app/api/instagram/instances/[funilId]/route.ts` (DELETE)
- `app/api/chats/instagram/leads/[leadId]/messages/route.ts`
- `app/api/chats/instagram/leads/[leadId]/send/route.ts`
- `app/api/cron/instagram-refresh-tokens/route.ts`
- `hooks/useInstagramChat.ts`
- `hooks/useRealtimeInstagram.ts`
- `components/chat/instagram-pane.tsx`
- `components/chat/instagram-trigger-icon.tsx`
- `components/funis/funil-instagram-section.tsx`

**Dependências:** nenhuma nova (Meta Graph é REST puro)

**Riscos:**
- Tabela e RLS novas: testar com user financeiro/closer/admin antes de prod
- Webhook precisa URL pública; em dev usar ngrok ou similar
- Sem META_APP_ID em env: feature desativada silenciosamente (não quebra app)

## Tasks

### CHANGE-1 [migration: tabelas ig_*]
**CRIAR**: `supabase/migrations/0022_instagram_messaging.sql`
**Steps**:
1. Enums: `ig_instance_status`, `ig_direction`, `ig_content_type`
2. Tabela `ig_instances` (1 por funil, OAuth long-lived token, status)
3. Tabela `ig_threads` (lead × instância, com `window_expires_at`)
4. Tabela `ig_messages` (mensagens, idempotência via meta_message_id)
5. Indexes e RLS:
   - Membros do funil leem instances/threads/messages
   - Admin vê tudo
   - Inserts pelo webhook usam admin client (RLS bypass via service role)
6. Novo `audit_event_type`: `ig_instance_connected`, `ig_instance_disconnected`, `ig_token_refreshed`

**Critério**: roda no Supabase sem erro, idempotente (DROP IF EXISTS).

### CHANGE-2 [database.types]
**EDITAR**: `lib/database.types.ts`
**Steps**: adicionar manualmente tipos `ig_instances`, `ig_threads`, `ig_messages` + enums + valores audit_event_type novos.
**Critério**: `npx tsc --noEmit` passa.

### CHANGE-3 [env validation]
**CRIAR**: `lib/instagram/env.ts`
**Steps**: helper `getInstagramEnv()` que valida META_APP_ID, META_APP_SECRET, META_WEBHOOK_VERIFY_TOKEN, META_GRAPH_API_VERSION (default v21.0), NEXT_PUBLIC_APP_URL. Retorna `null` se faltar (feature desativada).
**Critério**: build OK; sem env, rotas IG retornam 503.

### CHANGE-4 [graph client]
**CRIAR**: `lib/instagram/graph-client.ts`
**Steps**: fetch wrappers tipados:
- `sendTextMessage(igUserId, accessToken, recipientPsid, text)`
- `getUserProfile(igUserId, accessToken, psid)`
- `subscribeWebhook(pageId, accessToken)`
- `getInstagramBusinessAccountId(pageId, accessToken)`
**Critério**: tipado, sem any, errors capturados.

### CHANGE-5 [oauth]
**CRIAR**: `lib/instagram/oauth.ts`
**Steps**:
- `buildAuthUrl(state)`: gera URL Facebook OAuth com scope correto
- `exchangeCodeForToken(code)`: troca code por short-lived
- `exchangeForLongLivedToken(shortLived)`: troca por long-lived (60 dias)
- `refreshLongLivedToken(token)`: refresh quando faltar <7 dias
- `revokeToken(token)`: desconectar

### CHANGE-6 [webhook]
**CRIAR**: `app/api/instagram/webhook/route.ts`
**Steps**:
- GET: validação `hub.challenge` (compara `hub.verify_token` com env)
- POST: parse evento Meta, normalizar, chamar handler
**CRIAR**: `lib/instagram/webhook-handlers.ts`
**Steps**:
- Por evento `messaging.message`: resolver instância por `recipient.id`, get-or-create lead/card no funil, get-or-create thread, salvar mensagem, atualizar `window_expires_at = now + 24h`, notificar membros do funil
- Idempotência via `meta_message_id`

### CHANGE-7 [oauth start + callback]
**CRIAR**: `app/api/instagram/oauth/start/route.ts`
**Steps**: GET com `?funilId=`. Gera state (csrf), salva em cookie, redireciona pra buildAuthUrl.
**CRIAR**: `app/api/instagram/oauth/callback/route.ts`
**Steps**: GET com `?code=&state=`. Valida state, troca code→long-lived token, busca page/IG account, cria ou atualiza `ig_instances` no funil. Redireciona pra `/admin/funis/[id]?tab=instagram`.

### CHANGE-8 [send + receive messages API]
**CRIAR**: `app/api/chats/instagram/leads/[leadId]/messages/route.ts` (GET)
**Steps**: similar a WPP messages route. Resolve thread, lista msgs ordenadas, retorna `can_send` baseado em `window_expires_at > now`.
**CRIAR**: `app/api/chats/instagram/leads/[leadId]/send/route.ts` (POST)
**Steps**: valida janela 24h server-side (bloqueia se expirada). Resolve instância via funil do card. Chama `sendTextMessage()`. Persiste com `meta_message_id`.

### CHANGE-9 [disconnect instance]
**CRIAR**: `app/api/instagram/instances/[funilId]/route.ts` (DELETE)
**Steps**: admin only. Revoga token no Meta. Marca instância como `disconnected`.

### CHANGE-10 [refresh token cron]
**CRIAR**: `app/api/cron/instagram-refresh-tokens/route.ts`
**Steps**: protegido por header `Authorization: Bearer ${CRON_SECRET}`. Lista instâncias com `token_expires_at` < now + 7 dias e status `connected`. Chama `refreshLongLivedToken`. Audit log.

### CHANGE-11 [hooks UI]
**CRIAR**: `hooks/useInstagramChat.ts`
**Steps**: `useInstagramMessages(leadId)`, `useSendInstagramMessage(leadId)`, `useInstagramThread(leadId)` (retorna `window_expires_at`).
**CRIAR**: `hooks/useRealtimeInstagram.ts`
**Steps**: similar useRealtimeChat (subscription `ig_messages`, debounce 300ms).

### CHANGE-12 [UI pane + icone]
**CRIAR**: `components/chat/instagram-pane.tsx`
**Steps**: similar `kanban-card-modal-chat.tsx` mas pra IG. Mostra countdown da janela. Bloqueia composer se expirada.
**CRIAR**: `components/chat/instagram-trigger-icon.tsx`
**Steps**: ícone IG no kanban-card. Click abre modal no pane "instagram".
**EDITAR**: `components/kanban/kanban-card-modal-sidebar.tsx` (novo item "instagram")
**EDITAR**: `components/kanban/kanban-card-modal.tsx` (renderizar pane)
**EDITAR**: `components/kanban/kanban-card.tsx` (adicionar trigger icon)
**EDITAR**: `lib/stores/kanbanStore.ts` (novo CardModalPane "instagram")

### CHANGE-13 [admin: conectar IG no funil]
**CRIAR**: `components/funis/funil-instagram-section.tsx`
**Steps**: status atual + botão "Conectar Instagram" (start OAuth) ou "Desconectar". Visível apenas pra admin.
**EDITAR**: `components/funis/funil-form.tsx` (nova tab "Instagram")
**EDITAR**: `app/(dashboard)/admin/funis/[id]/page.tsx` (carregar instância IG existente)

## Validação final
- [ ] Build passa (`npm run build`)
- [ ] Typecheck passa (`npx tsc --noEmit`)
- [ ] Sem META_APP_ID em env: app sobe normal, rotas IG retornam 503
- [ ] Endpoints documentados manualmente testáveis (curl/Insomnia)
- [ ] UI: ícone IG aparece no kanban-card só se a instância do funil está conectada
- [ ] Countdown 24h visível e bloqueio funcionando

## Pós-deploy (manual pelo Bruno)
- Rodar migration 0022 no SQL Editor do Supabase
- Adicionar vars em `.env.local`: META_APP_ID, META_APP_SECRET, META_WEBHOOK_VERIFY_TOKEN, META_GRAPH_API_VERSION=v21.0
- Em prod, configurar URL do webhook no painel Meta (passo 8 do `docs/instagram-setup.md`)
- Conectar primeira conta IG via /admin/funis/[id] tab Instagram
