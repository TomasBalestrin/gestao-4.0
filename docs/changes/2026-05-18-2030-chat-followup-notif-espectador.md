# CHANGE | Chat direto, Follow-up, Notificação diária, Modo espectador

> Falcão | 2026-05-18 | v1.0
> Tipo: feature
> Estimativa: 8 tasks, ~75 min

## Contexto

Quatro ajustes:

1. **Chat icon do card**: hoje seta `useChatStore.openChat(leadId)` mas o modal do card abre sempre em "dados". Precisa abrir direto em "chat".
2. **Follow-up**: trazer de volta. Campo `follow_up_at` em `cards` (date) + tabela `follow_ups` (id, card_id, user_id, due_date, done_at). Aparece na agenda do responsável junto com calls.
3. **Notificação diária**: digest "X calls e Y follow-ups hoje" criado ao abrir o sistema, idempotente por user+data. Sino já existe (`NotificationBell`).
4. **Modo espectador**: coluna `is_spectator` em `user_funis`. Toggle no form de acessos. Spectator vê todos os cards do funil (RLS estendido) mas não pode mover/editar/alterar funil.

## Análise

### Arquivos afetados
- `lib/stores/kanbanStore.ts`
- `components/kanban/kanban-card.tsx`
- `components/chat/chat-trigger-icon.tsx`
- `components/kanban/kanban-card-modal.tsx`
- `components/kanban/kanban-card-modal-dados.tsx`
- `lib/database.types.ts`
- `types/domain.ts`
- `lib/schemas/lead.ts` (ou novo `lib/schemas/card.ts`)
- `app/api/cards/[id]/route.ts`
- `app/api/cards/[id]/move/route.ts`
- `app/api/funis/[funilId]/usuarios/route.ts`
- `app/api/funis/[funilId]/route.ts`
- `components/funis/funil-acessos.tsx`
- `components/agenda/agenda-view.tsx`
- `components/providers/current-user-provider.tsx`
- `hooks/useCards.ts`
- `lib/utils/permissions.ts`
- `components/kanban/kanban-board.tsx` (drag disabled)

### Novos arquivos
- `supabase/migrations/0018_followups.sql`
- `supabase/migrations/0019_spectator_mode.sql`
- `app/api/notifications/daily-digest/route.ts`
- `app/api/follow-ups/route.ts`
- `app/api/follow-ups/[id]/route.ts`
- `app/api/funis/[funilId]/me/route.ts`
- `lib/schemas/follow-up.ts`
- `lib/notifications/daily-digest.ts`
- `lib/utils/spectator.ts`
- `components/agenda/follow-up-item.tsx`

### Dependências
Nenhuma lib nova.

### Riscos
- Mexer em RLS de `cards` (estender SELECT) pode interferir em visibilidade. Mitigação: SQL **adiciona** policy, não remove.
- `kanbanStore.selectedPane` muda contrato. Verificar callers de `openCard()`.
- `current-user-provider` no client; deduplicar disparo do digest (fire-and-forget, 1 por mount).

## Tasks

### CHANGE-1 ⬜ 🟢 Chat icon abre modal no pane "chat"
**CRIAR**: nenhum
**EDITAR**: `lib/stores/kanbanStore.ts`, `components/kanban/kanban-card.tsx`, `components/chat/chat-trigger-icon.tsx`, `components/kanban/kanban-card-modal.tsx`
**LER**: arquivos acima atuais
**NÃO TOCAR**: lógica WhatsApp adapter
**Depende de**: nenhuma
**Paralelo com**: CHANGE-2
**Steps**:
1. `kanbanStore`: adicionar `selectedPane: "dados"|"venda"|"chat"|"historico"|null`. Action `openCard(cardId, pane?)`. `closeCard()` limpa pane.
2. `kanban-card.tsx`: passar `cardId={card.id}` pro `ChatTriggerIcon`.
3. `chat-trigger-icon.tsx`: ao clicar, `useKanbanStore.openCard(cardId, "chat")`. Manter `useChatStore.openChat` se ainda é consumido em outro lugar.
4. `kanban-card-modal.tsx`: pane vem do store via `selectedPane ?? "dados"`. Remover useState local. useEffect que reset pra "dados" só roda se `selectedPane === null`.
**Critério**: clicar ícone chat abre modal em Chat; fechar e reabrir pelo card volta em Dados.

### CHANGE-2 ⬜ 🟢 Migration 0018: follow_up_at + tabela follow_ups
**CRIAR**: `supabase/migrations/0018_followups.sql`
**EDITAR**: nenhum
**LER**: `supabase/migrations/0007_rls_policies.sql`, `supabase/migrations/0005_horarios_calls.sql`
**NÃO TOCAR**: migrations anteriores
**Depende de**: nenhuma
**Paralelo com**: CHANGE-1
**Steps**:
1. `BEGIN`.
2. `ALTER TABLE cards ADD COLUMN follow_up_at date;`
3. `CREATE TABLE follow_ups (id uuid PK default gen_random_uuid(), card_id uuid REFERENCES cards ON DELETE CASCADE, user_id uuid REFERENCES users ON DELETE CASCADE, due_date date NOT NULL, done_at timestamptz, created_at timestamptz default now())`.
4. Índices: `(user_id, due_date) WHERE done_at IS NULL`, `(card_id)`.
5. Enable RLS. Policies:
   - SELECT: `user_id = auth.uid()` OU admin OU `EXISTS (user_funis uf WHERE uf.user_id=auth.uid() AND uf.funil_id=(SELECT funil_id FROM cards WHERE id=follow_ups.card_id))`
   - INSERT/UPDATE/DELETE: `user_id = auth.uid()` OU admin
6. `COMMIT`.
**Critério**: SQL roda sem erro; RLS bloqueia user errado.

### CHANGE-3 ⬜ 🟢 Schema, types e API de follow_up
**CRIAR**: `lib/schemas/follow-up.ts`, `app/api/follow-ups/route.ts`, `app/api/follow-ups/[id]/route.ts`
**EDITAR**: `lib/database.types.ts`, `types/domain.ts`, `app/api/cards/[id]/route.ts`, `hooks/useCards.ts`
**LER**: `app/api/cards/[id]/route.ts`, `app/api/leads/[id]/vendas/route.ts`, `lib/schemas/lead.ts`
**NÃO TOCAR**: outros routes
**Depende de**: CHANGE-2
**Paralelo com**: nenhuma
**Steps**:
1. `lib/schemas/follow-up.ts`: `createFollowUpSchema`, `updateFollowUpSchema` (due_date opcional, done_at opcional).
2. `database.types.ts`: adicionar Row/Insert/Update de `follow_ups` + `cards.follow_up_at: string | null`.
3. `types/domain.ts`: type `FollowUp`.
4. PATCH `/api/cards/[id]`: aceitar `follow_up_at`. Quando preenchido: UPSERT em `follow_ups` (find por card_id+user_id+done_at IS NULL; senão INSERT). Quando null: DELETE ativos.
5. GET `/api/follow-ups`: lista do user (admin pode `?user_id=`). Join cards (nome lead via leads, funil_id). Filtra `done_at IS NULL` por default.
6. PATCH `/api/follow-ups/[id]`: marca `done_at = now()`.
7. `useCards.ts`: `KanbanCardData` ganha `follow_up_at: string | null`.
**Critério**: PATCH card com follow_up_at cria row; PATCH null deleta; PATCH /follow-ups/[id] marca feito.

### CHANGE-4 ⬜ 🟢 Campo follow-up no modal Dados + agenda renderiza
**CRIAR**: `components/agenda/follow-up-item.tsx`
**EDITAR**: `components/kanban/kanban-card-modal-dados.tsx`, `components/agenda/agenda-view.tsx`
**LER**: ambos atuais
**NÃO TOCAR**: outros panes do modal
**Depende de**: CHANGE-3
**Paralelo com**: nenhuma
**Steps**:
1. Modal Dados: adicionar `<Input type="date">` "Follow-up" antes de Observações. onChange dispara mutation PATCH card.
2. Agenda: `useQuery /api/follow-ups`. Mesclar com calls do dia. Ordenar por data.
3. `FollowUpItem`: lead.nome, due_date formatada, botão "Marcar feito" (PATCH /follow-ups/[id]). Click no item abre modal do card.
**Critério**: setar data no modal Dados aparece na agenda; marcar feito esconde.

### CHANGE-5 ⬜ 🟡 Daily digest: API + dispatch on-load
**CRIAR**: `app/api/notifications/daily-digest/route.ts`, `lib/notifications/daily-digest.ts`
**EDITAR**: `components/providers/current-user-provider.tsx`
**LER**: `app/api/notifications/route.ts`, `supabase/migrations/0006_audit_notifications.sql`, `lib/audit/logger.ts`
**NÃO TOCAR**: schema notifications (verificar enum tem `daily_digest` ou similar; se faltar, NÍVEL 2 = reusar `info` genérico)
**Depende de**: CHANGE-3
**Paralelo com**: CHANGE-6
**Steps**:
1. Verificar enum `notification_type`. Se não tiver `daily_digest`, usar tipo genérico já existente (registrar NÍVEL 2).
2. `lib/notifications/daily-digest.ts`: `generateDailyDigest(supabase, userId)` conta calls scheduled de hoje + follow_ups pendentes de hoje. Retorna `{ titulo, descricao, link, counts }`.
3. POST `/api/notifications/daily-digest`: requireAuth. Dedup: SELECT em notifications WHERE user_id AND tipo=X AND date_trunc('day', created_at)=current_date. Se existe: `{ skipped: true }`. Senão: INSERT.
4. `current-user-provider`: useEffect que dispara fetch POST 1x por mount. Fire-and-forget (sem await visível).
**Critério**: abrir app cria 1 notif "Você tem N calls e M follow-ups hoje" link /agenda. Reload não duplica.

### CHANGE-6 ⬜ 🟢 Migration 0019: is_spectator em user_funis + RLS cards
**CRIAR**: `supabase/migrations/0019_spectator_mode.sql`
**EDITAR**: nenhum
**LER**: `supabase/migrations/0002_funnels.sql`, `supabase/migrations/0007_rls_policies.sql`
**NÃO TOCAR**: outras tabelas
**Depende de**: nenhuma
**Paralelo com**: CHANGE-5
**Steps**:
1. `BEGIN`.
2. `ALTER TABLE user_funis ADD COLUMN is_spectator boolean NOT NULL DEFAULT false;`
3. Estender RLS de `cards` SELECT: `OR EXISTS (SELECT 1 FROM user_funis uf WHERE uf.user_id = auth.uid() AND uf.funil_id = cards.funil_id AND uf.is_spectator = true)`. Não remover policies existentes.
4. Comment no SQL: spectator não tem write — bloqueado naturalmente pelas policies de UPDATE/DELETE/INSERT existentes.
5. `COMMIT`.
**Critério**: roda sem erro; spectator passa a aparecer em SELECT de cards do funil; write segue bloqueado.

### CHANGE-7 ⬜ 🟢 UI funil-acessos: toggle spectator + API
**CRIAR**: nenhum
**EDITAR**: `components/funis/funil-acessos.tsx`, `app/api/funis/[funilId]/usuarios/route.ts`, `lib/database.types.ts`
**LER**: arquivos acima atuais
**NÃO TOCAR**: outras rotas de funil
**Depende de**: CHANGE-6
**Paralelo com**: CHANGE-8
**Steps**:
1. `database.types.ts`: `user_funis` Row/Insert/Update ganha `is_spectator: boolean`.
2. API POST `/api/funis/[funilId]/usuarios`: aceitar `{ user_id, is_spectator?: boolean }`. UPSERT.
3. API PATCH (mesma rota OU /[userId]): alternar `is_spectator`. Decisão NÍVEL 2: estender POST como UPSERT.
4. UI: ao lado de cada user vinculado, Switch pequeno "Espectador" + tooltip "Vê todos os cards mas não move/edita". onChange faz POST com `is_spectator` atualizado.
**Critério**: toggle salva; reload mantém; admin vê tudo.

### CHANGE-8 ⬜ 🟡 Bloquear move/edit de spectator + UI desabilita drag
**CRIAR**: `lib/utils/spectator.ts`, `app/api/funis/[funilId]/me/route.ts`
**EDITAR**: `app/api/cards/[id]/move/route.ts`, `app/api/cards/[id]/route.ts`, `app/api/funis/[funilId]/route.ts`, `components/kanban/kanban-card-modal.tsx`, `components/kanban/kanban-board.tsx` (ou onde DndContext mora), `lib/utils/permissions.ts`
**LER**: `app/api/cards/[id]/move/route.ts`, `components/kanban/kanban-board.tsx`, `lib/utils/permissions.ts`
**NÃO TOCAR**: lógica de automation engine
**Depende de**: CHANGE-7
**Paralelo com**: nenhuma
**Steps**:
1. `lib/utils/spectator.ts`: `isSpectatorOfFunil(supabase, userId, funilId): Promise<boolean>`.
2. Move/PATCH/DELETE de cards: checar spectator do funil_id do card. Se sim: 403 FORBIDDEN.
3. PATCH funil: idem.
4. GET `/api/funis/[funilId]/me`: retorna `{ is_spectator: boolean }` pro client.
5. `kanban-board.tsx`: `useQuery /api/funis/[funilId]/me`. Se spectator, passar `disabled` no useDraggable de cards e nos drop zones.
6. `kanban-card-modal.tsx`: prop/calc `readOnly = isCloser(role) || isSpectator`.
**Critério**: spectator não arrasta, não edita; outras roles intactas.

## Validação final
- [ ] Build passa (`npm run build`)
- [ ] Typecheck passa (`npx tsc --noEmit`)
- [ ] Lint passa (`npm run lint`)
- [ ] Migration 0018 e 0019 rodadas no Supabase
- [ ] Chat icon abre modal no pane chat
- [ ] Follow-up no modal aparece na agenda; marcar feito remove
- [ ] Daily digest cria notif ao logar; reload não duplica
- [ ] Spectator vê todos cards mas não move/edita; outros roles intactos
