> 🐜 Homem-Formiga | 2026-05-09 | v1.0

# Gestão 4.0 — TASKS

Backlog ordenado para Claude Code. **1 task = 1 sessão.** Execute na ordem. Marque ⬜→✅ ao concluir.

---

## Bloco A — Setup

### A1 ⬜ 🟢 Inicializar projeto Next.js + TS strict
**CRIAR:** `package.json`, `tsconfig.json`, `next.config.js`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`, `.env.local.example`, `README.md`.
**EDITAR:** —
**LER:** `docs/architecture.md`, `docs/tech-stack.md`.
**NÃO TOCAR:** demais arquivos.
**Steps:**
1. `npx create-next-app@latest gestao-4-0 --typescript --app --tailwind --src-dir=false --import-alias="@/*"`
2. Habilitar TS strict + `noUncheckedIndexedAccess` em `tsconfig.json`.
3. Configurar path aliases (`@/components`, `@/lib`, `@/hooks`, `@/server`, `@/types`).
4. Adicionar `.env.local.example` com vars do `docs/security.md` seção 5.
5. `.gitignore` cobrindo `.env*`, `.next/`, `node_modules/`, `.vercel/`.
6. `npm run build`.

**Critério:** `npm run build` passa. `npm run dev` sobe em :3000 com tela "Hello World" (App Router).

---

### A2 ⬜ 🟢 Configurar Tailwind + shadcn/ui base
**CRIAR:** `tailwind.config.ts`, `lib/utils/cn.ts`, `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`.
**EDITAR:** `app/globals.css`, `app/layout.tsx`.
**LER:** `docs/tech-stack.md` (seção 3, design system).
**NÃO TOCAR:** rotas, componentes de domínio.
**Steps:**
1. `npx shadcn-ui@latest init` com config: tailwind, slate base color, css vars.
2. Sobrescrever cores em `globals.css` para palette ElevenLabs (`docs/tech-stack.md`):
   - Background dark `#0A0A0A`, light `#FFFFFF`.
   - Surface dark `#141414`, light `#F5F5F5`.
   - Border dark `#262626`, light `#E5E5E5`.
3. Configurar Inter via `next/font/google` em `app/layout.tsx`.
4. `darkMode: 'class'` em `tailwind.config.ts`.
5. `npx shadcn-ui add button dialog input label`.
6. Util `cn()` em `lib/utils/cn.ts` (clsx + tailwind-merge).
7. `npm run build`.

**Critério:** Página inicial usa Inter, dark mode toggleável manualmente via classe `dark` no `<html>`.

---

### A3 ⬜ 🟢 Instalar dependências core e shadcn extras
**CRIAR:** —
**EDITAR:** `package.json`.
**LER:** `docs/tech-stack.md` seção 4.
**NÃO TOCAR:** código.
**Steps:**
1. Instalar: `@supabase/ssr @supabase/supabase-js @tanstack/react-query @tanstack/react-query-devtools zustand react-hook-form @hookform/resolvers zod next-themes sonner @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-big-calendar date-fns framer-motion lucide-react cmdk class-variance-authority`.
2. `npx shadcn-ui add dropdown-menu select textarea tabs popover sheet form table badge avatar separator alert-dialog calendar toast skeleton`.
3. `npm run build`.

**Critério:** `package.json` lista todas as deps acima. Build passa.

---

### A4 ⬜ 🟡 ⚙️ MANUAL Criar projeto Supabase + aplicar migrations
**CRIAR:** `supabase/migrations/0001_init.sql` até `0009_storage.sql`, `supabase/seed.sql`.
**EDITAR:** `.env.local`.
**LER:** `docs/schema.md`.
**NÃO TOCAR:** —
**Steps:**
1. **Manual:** criar projeto no Supabase (plano Pro), copiar URL e anon key.
2. Preencher `.env.local` com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Criar arquivos de migration na ordem do `docs/schema.md` seção 10.
4. **Manual:** aplicar via SQL Editor do Supabase OU `npx supabase db push`.
5. **Manual:** criar usuário admin via Auth UI Supabase, copiar UUID, atualizar `seed.sql` e rodar.
6. Gerar tipos: `npx supabase gen types typescript --linked > lib/database.types.ts`.

**Critério:** Tabelas criadas, RLS ativo, usuário admin consegue logar via Supabase Auth UI. `lib/database.types.ts` populado.

---

### A5 ⬜ 🟢 Configurar clients Supabase (browser + server + middleware)
**CRIAR:** `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `lib/supabase/middleware.ts`, `middleware.ts` (raiz).
**EDITAR:** —
**LER:** `docs/architecture.md` seção 5, `docs/security.md` seção 1.
**NÃO TOCAR:** demais arquivos.
**Steps:**
1. `lib/supabase/client.ts`: `createBrowserClient` com env vars.
2. `lib/supabase/server.ts`: `createServerClient` com `cookies()` do Next.
3. `lib/supabase/admin.ts`: `createClient` com service role. Comentário "// SERVER ONLY".
4. `lib/supabase/middleware.ts`: helper `updateSession` para refresh JWT.
5. `middleware.ts` na raiz: chama `updateSession` + matcher do `docs/architecture.md`.
6. `npm run build`.

**Critério:** Build passa. Middleware roda em todas as rotas exceto static. `admin.ts` tem comentário de aviso.

---

## Bloco B — Auth

### B1 ⬜ 🟡 Páginas de auth (login, forgot, reset, setup)
**CRIAR:** `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx`, `app/(auth)/setup/page.tsx`.
**EDITAR:** —
**LER:** `docs/ux-flows.md` seção 3, `components/ui/button.tsx`, `components/ui/input.tsx`.
**NÃO TOCAR:** dashboard, API.
**Steps:**
1. Layout auth: centralizado, dark default, logo no topo.
2. Login: form RHF+Zod (email, senha), submit `signInWithPassword`, redirect baseado em `must_change_password` e role.
3. Forgot: form RHF (email), submit `resetPasswordForEmail`, mensagem genérica.
4. Reset: form RHF (nova senha + confirmação), submit `updateUser`.
5. Setup: form RHF (nova senha + confirmação), submit `POST /api/auth/setup-password` (criar route na próxima task).
6. Validação senha: min 8, 1 letra + 1 número.
7. `npm run build`.

**Critério:** As 4 telas renderizam. Login funciona com credenciais válidas (redirect manual no console por enquanto, sem `must_change_password` check ainda).

---

### B2 ⬜ 🟡 Helpers de auth no servidor + route setup-password
**CRIAR:** `server/auth.ts`, `server/api-helpers.ts`, `app/api/auth/setup-password/route.ts`, `lib/schemas/user.ts`.
**EDITAR:** `app/(auth)/setup/page.tsx` (conectar ao endpoint).
**LER:** `docs/architecture.md` seção 4, `docs/security.md` seção 2.
**NÃO TOCAR:** demais.
**Steps:**
1. `server/auth.ts`: `requireAuth()`, `requireAdmin()`, `requireRole(role)`. Usa `lib/supabase/server.ts`. Lança `ApiError`.
2. `server/api-helpers.ts`: `okResponse`, `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `internalError`.
3. `lib/schemas/user.ts`: schema Zod de senha (min 8, 1 letra, 1 num).
4. `app/api/auth/setup-password/route.ts`: POST. Auth via `requireAuth`. Zod valida body. Atualiza senha via `supabase.auth.updateUser`. Atualiza `users.must_change_password=false`. Retorna `{ data: { ok: true } }`.
5. Conectar form de setup ao endpoint via `useMutation`.
6. `npm run build`.

**Critério:** Usuário com `must_change_password=true` consegue trocar senha pela tela e flag vira `false` no banco.

---

### B3 ⬜ 🟡 Proteção de rotas (middleware role-aware) + páginas de erro
**CRIAR:** `app/error.tsx`, `app/not-found.tsx`, `lib/utils/permissions.ts`.
**EDITAR:** `lib/supabase/middleware.ts`, `middleware.ts`.
**LER:** `docs/security.md` seção 2, `docs/ux-flows.md` seção 1.
**NÃO TOCAR:** páginas de domínio.
**Steps:**
1. Middleware: ler `users.role` após autenticar. Bloquear `/admin/*` se role≠admin (redirect `/dashboard`). Redirect `/login` se sem sessão em rota privada.
2. Detectar `must_change_password=true` em `/dashboard/*` → redirect `/auth/setup`.
3. `app/error.tsx`: error boundary global com botão "Recarregar".
4. `app/not-found.tsx`: 404 com link para dashboard.
5. `lib/utils/permissions.ts`: helpers client-side (`canAccessFunil`, `isAdmin`).
6. `npm run build`.

**Critério:** Social Selling tentando acessar `/admin/usuarios` é redirecionado para `/dashboard`. Setup forçado funciona.

---

## Bloco C — Layout Dashboard

### C1 ⬜ 🟡 Layout dashboard com sidebar e header
**CRIAR:** `app/(dashboard)/layout.tsx`, `app/(dashboard)/page.tsx`, `components/layout/sidebar.tsx`, `components/layout/header.tsx`, `components/layout/user-menu.tsx`, `components/layout/theme-toggle.tsx`, `lib/stores/uiStore.ts`.
**EDITAR:** `app/layout.tsx` (ThemeProvider + QueryProvider).
**LER:** `docs/ux-flows.md` seção 2.
**NÃO TOCAR:** páginas internas.
**Steps:**
1. `lib/stores/uiStore.ts`: Zustand com `sidebarCollapsed`, `theme`.
2. `app/layout.tsx`: envolver com `ThemeProvider` (next-themes), `QueryProvider` (TanStack), `Toaster` (sonner).
3. `components/layout/sidebar.tsx`: client. Itens condicionais por role. Collapse toggle. Lucide icons.
4. `components/layout/header.tsx`: server. Slot para breadcrumb. Inclui sino, theme toggle, user menu.
5. `components/layout/theme-toggle.tsx`: client. Sol/lua via next-themes.
6. `components/layout/user-menu.tsx`: client. Avatar + dropdown com Perfil + Sair.
7. `app/(dashboard)/layout.tsx`: combina sidebar + header + slot.
8. `app/(dashboard)/page.tsx`: redirect server-side baseado em role (Admin → `/admin/funis`, Social Selling → `/crm`).
9. `npm run build`.

**Critério:** Após login, usuário vê layout com sidebar/header. Theme toggle persiste. Sair funciona. Mobile mostra aviso "Use desktop".

---

## Bloco D — Features Core (P0)

### D1 ⬜ 🟡 Schemas Zod compartilhados (funil, etapa, lead, card, call, horario, automacao)
**CRIAR:** `lib/schemas/funil.ts`, `lib/schemas/etapa.ts`, `lib/schemas/lead.ts`, `lib/schemas/card.ts`, `lib/schemas/call.ts`, `lib/schemas/horario.ts`, `lib/schemas/automacao.ts`, `lib/schemas/custom-fields.ts`, `types/domain.ts`.
**EDITAR:** —
**LER:** `docs/schema.md`, `docs/PRD.md` seção 2, `lib/database.types.ts`.
**NÃO TOCAR:** —
**Steps:**
1. Cada schema reflete tabela do banco + regras do PRD.
2. `custom-fields.ts`: builder dinâmico `buildCustomFieldsSchema(config)`.
3. `types/domain.ts`: tipos compostos (`FunilWithEtapas`, `CardWithLead`, `CallWithContext`).
4. Reutilizar tipos de `lib/database.types.ts` via `Database['public']['Tables']`.
5. `npm run build`.

**Critério:** Build passa. Schemas exportados com tipo inferido (`z.infer<typeof X>`).

---

### D2.1 ⬜ 🟡 Funis: API CRUD + listagem admin
**CRIAR:** `app/api/funis/route.ts`, `app/api/funis/[id]/route.ts`, `app/(dashboard)/admin/funis/page.tsx`, `components/funis/funis-table.tsx`, `hooks/useFunis.ts`.
**EDITAR:** —
**LER:** `lib/schemas/funil.ts`, `server/auth.ts`, `app/api/auth/setup-password/route.ts`.
**NÃO TOCAR:** —
**Steps:**
1. `app/api/funis/route.ts`: GET (lista por RLS), POST (admin only).
2. `app/api/funis/[id]/route.ts`: GET, PATCH, DELETE (soft).
3. `hooks/useFunis.ts`: TanStack Query hook.
4. `components/funis/funis-table.tsx`: tabela com nome, role_alvo, status, ações.
5. `app/(dashboard)/admin/funis/page.tsx`: server component, lista funis, botão "Novo funil" (link `/admin/funis/novo`).
6. Empty state.
7. `npm run build`.

**Critério:** Admin lista funis. CRUD pelo painel ainda só GET; POST via Postman/curl OK.

---

### D2.2 ⬜ 🟡 Funis: form de criação + edição
**CRIAR:** `app/(dashboard)/admin/funis/novo/page.tsx`, `app/(dashboard)/admin/funis/[id]/page.tsx`, `components/funis/funil-form.tsx`, `components/funis/etapa-list.tsx`, `components/funis/custom-fields-builder.tsx`, `components/forms/role-select.tsx`.
**EDITAR:** —
**LER:** `components/funis/funis-table.tsx`, `lib/schemas/funil.ts`, `docs/ux-flows.md` seção 5 (F-02).
**NÃO TOCAR:** API.
**Steps:**
1. `funil-form.tsx`: RHF+Zod, campos nome/cor/role_alvo/descricao + sub-componentes etapas e custom fields.
2. `etapa-list.tsx`: lista editável com dnd-kit sortable.
3. `custom-fields-builder.tsx`: adicionar/remover/editar campo dinâmico.
4. `role-select.tsx`: select reutilizável.
5. Page novo: render form com submit POST.
6. Page edit: prefill via Server Component.
7. `npm run build`.

**Critério:** Admin cria funil completo (com etapas e custom fields). Edição prefill funciona.

---

### D2.3 ⬜ 🟢 Funis: API etapas (criar, editar, reordenar, deletar)
**CRIAR:** `app/api/funis/[id]/etapas/route.ts`, `app/api/funis/[id]/etapas/reorder/route.ts`, `app/api/funis/[id]/etapas/[etapaId]/route.ts`, `lib/audit/logger.ts`.
**EDITAR:** —
**LER:** `lib/schemas/etapa.ts`, `app/api/funis/route.ts`.
**NÃO TOCAR:** front.
**Steps:**
1. `lib/audit/logger.ts`: `logEvent({ entityType, entityId, eventType, userId, before, after })` usando admin client.
2. POST etapa, PATCH, DELETE (bloqueia se houver cards), reorder (atomic).
3. Audit log em todas as mutations.
4. `npm run build`.

**Critério:** Reordenar etapas atualiza ordem no banco e registra audit log.

---

### D3.1 ⬜ 🟡 Leads + Cards: API CRUD
**CRIAR:** `app/api/leads/route.ts`, `app/api/leads/[id]/route.ts`, `app/api/funis/[id]/cards/route.ts`, `app/api/cards/[id]/route.ts`.
**EDITAR:** —
**LER:** `lib/schemas/lead.ts`, `lib/schemas/card.ts`, `lib/audit/logger.ts`.
**NÃO TOCAR:** front.
**Steps:**
1. Leads CRUD com soft delete e busca textual (`q` param).
2. Cards: GET (RBAC by-owner-or-admin), POST (cria lead se não existir + card).
3. Custom fields validados via schema dinâmico de `custom-fields.ts`.
4. Audit log em todas as mutations.
5. `npm run build`.

**Critério:** Curl/Postman cria lead+card. Social Selling vê só seus cards.

---

### D3.2 ⬜ 🔴 CRM Kanban: board, colunas, cards (sem drag ainda)
**CRIAR:** `app/(dashboard)/crm/page.tsx`, `app/(dashboard)/crm/[funilId]/page.tsx`, `components/kanban/kanban-board.tsx`, `components/kanban/kanban-column.tsx`, `components/kanban/kanban-card.tsx`, `components/kanban/new-card-button.tsx`, `hooks/useCards.ts`, `lib/stores/kanbanStore.ts`.
**EDITAR:** —
**LER:** `app/api/cards/route.ts`, `lib/schemas/card.ts`, `docs/ux-flows.md` seção 5 (F-05).
**NÃO TOCAR:** —
**Steps:**
1. `/crm/page.tsx`: lista funis acessíveis ao usuário.
2. `/crm/[funilId]/page.tsx`: Server Component prefetch + HydrationBoundary → KanbanBoard.
3. `kanban-board.tsx`: client. Recebe etapas + cards. Render KanbanColumn por etapa.
4. `kanban-column.tsx`: header com nome/cor/contagem. Lista de KanbanCard.
5. `kanban-card.tsx`: nome do lead + tags + assigned avatar. Click abre drawer (próxima task).
6. `new-card-button.tsx`: botão "+" abre modal (próxima task).
7. Empty state.
8. `npm run build`.

**Critério:** Kanban renderiza colunas e cards do funil. Sem drag ainda.

---

### D3.3 ⬜ 🔴 Kanban: drag-and-drop + endpoint move
**CRIAR:** `app/api/cards/[id]/move/route.ts`, `hooks/useMoveCard.ts`, `lib/automation/engine.ts` (stub vazio que retorna sucesso).
**EDITAR:** `components/kanban/kanban-board.tsx`.
**LER:** `app/api/cards/[id]/route.ts`, `docs/architecture.md` seção 9.
**NÃO TOCAR:** outros componentes.
**Steps:**
1. `lib/automation/engine.ts`: função `runAutomation` que por enquanto só atualiza `etapa_id` e retorna `{ success: true, executions: [] }`.
2. `POST /api/cards/[id]/move`: auth + Zod + chama `runAutomation` + audit log.
3. `useMoveCard`: useMutation com optimistic update.
4. `kanban-board.tsx`: DndContext + onDragEnd + revert no erro.
5. Toast de sucesso e erro.
6. `npm run build`.

**Critério:** Drag de card move e persiste. Erro reverte UI.

---

### D3.4 ⬜ 🟡 Modal de novo card + drawer de detalhe
**CRIAR:** `components/kanban/kanban-card-modal.tsx`, `components/kanban/new-card-modal.tsx`, `components/forms/custom-field-input.tsx`.
**EDITAR:** `components/kanban/kanban-card.tsx`, `components/kanban/new-card-button.tsx`.
**LER:** `lib/schemas/custom-fields.ts`, `lib/schemas/lead.ts`, `docs/ux-flows.md` seção 5.
**NÃO TOCAR:** API.
**Steps:**
1. `custom-field-input.tsx`: render dinâmico por tipo (text, number, date, select, multi-select, currency, phone, email, textarea).
2. `new-card-modal.tsx`: combobox de leads + "Novo lead" + custom fields.
3. `kanban-card-modal.tsx`: drawer (Sheet) com tabs Detalhes / Calls / Histórico.
4. Tab Detalhes funcional. Calls e Histórico podem ter placeholder.
5. `npm run build`.

**Critério:** Criar card via modal funciona. Drawer abre com dados ao clicar.

---

### D4.1 ⬜ 🔴 Engine de automação real (move_to + duplicate_to + notificações in-app)
**CRIAR:** `lib/automation/actions.ts`, `lib/automation/notifications.ts`, `app/api/etapas/[id]/automacoes/route.ts`, `app/api/automacoes/[id]/route.ts`.
**EDITAR:** `lib/automation/engine.ts`.
**LER:** `docs/architecture.md` seção 9, `docs/PRD.md` F-06, `lib/audit/logger.ts`.
**NÃO TOCAR:** front.
**Steps:**
1. `actions.ts`: `executeMoveTo`, `executeDuplicateTo` (cria N filhos com `parent_card_id`).
2. `notifications.ts`: adapter `sendInAppNotification` (insert em `notifications`), stubs para WA/IG (log "not implemented").
3. `engine.ts`: carrega automações da etapa, executa em ordem (depth max 5, timeout 5s, idempotência por hash). Insere `automation_errors` em falha.
4. APIs CRUD de automações (admin).
5. `npm run build`.

**Critério:** Mover card para etapa com `move_to` configurado movimenta automaticamente em cascata. Notificação in-app aparece no banco.

---

### D4.2 ⬜ 🟡 UI de automações no funil (modal + lista)
**CRIAR:** `app/(dashboard)/admin/funis/[id]/automacoes/page.tsx`, `components/funis/automacao-modal.tsx`, `components/funis/automacao-list.tsx`.
**EDITAR:** `app/(dashboard)/admin/funis/[id]/page.tsx` (adicionar botão bot por etapa).
**LER:** `app/api/etapas/[id]/automacoes/route.ts`, `docs/ux-flows.md` F-02.
**NÃO TOCAR:** API.
**Steps:**
1. Botão bot icon ao lado de cada etapa abre modal.
2. Modal lista automações da etapa. Botão "Nova automação".
3. Form: nome, action (move_to/duplicate_to), targets (select funil+etapa), notificações (in-app/WA/IG com targets).
4. `npm run build`.

**Critério:** Admin configura automação de etapa via UI. Refresh do kanban mostra que move dispara automação.

---

### D4.3 ⬜ 🟡 Retry de automação + UI de erro
**CRIAR:** `app/api/automation-errors/[id]/retry/route.ts`, `components/kanban/automation-error-banner.tsx`.
**EDITAR:** `components/kanban/kanban-card.tsx` (badge se houver erro pendente), `components/kanban/kanban-card-modal.tsx` (mostra erro + botão retry).
**LER:** `lib/automation/engine.ts`, `app/api/cards/[id]/move/route.ts`.
**NÃO TOCAR:** —
**Steps:**
1. POST retry executa engine novamente, atualiza `automation_errors.resolved_at`.
2. Badge no card se `automation_errors` não resolvidos para o card.
3. Modal mostra erro com botão Retry.
4. `npm run build`.

**Critério:** Card com automação falha mostra badge. Retry funciona.

---

### D5.1 ⬜ 🟡 Usuários: API CRUD + criação com senha temporária
**CRIAR:** `app/api/users/route.ts`, `app/api/users/[id]/route.ts`, `app/api/users/[id]/deactivate/route.ts`, `lib/utils/password-generator.ts`.
**EDITAR:** —
**LER:** `lib/schemas/user.ts`, `lib/supabase/admin.ts`, `docs/security.md` seção 1.
**NÃO TOCAR:** front.
**Steps:**
1. POST: gera senha temporária, cria via `admin.auth.admin.createUser`, insere `public.users` com `must_change_password=true`. Envia email (Supabase Auth invite OU resetPasswordForEmail).
2. PATCH: edição. Próprio usuário só edita nome/foto/theme. Admin edita tudo.
3. POST deactivate: `is_active=false`. Bloqueia login.
4. Audit log.
5. `npm run build`.

**Critério:** Admin cria usuário, recebe email com senha temporária, faz login, é forçado a trocar senha.

---

### D5.2 ⬜ 🟡 Usuários: telas admin (lista, novo, editar)
**CRIAR:** `app/(dashboard)/admin/usuarios/page.tsx`, `app/(dashboard)/admin/usuarios/novo/page.tsx`, `app/(dashboard)/admin/usuarios/[id]/page.tsx`, `components/users/users-table.tsx`, `components/users/user-form.tsx`.
**EDITAR:** —
**LER:** `app/api/users/route.ts`, `components/funis/funil-form.tsx` (referência de form).
**NÃO TOCAR:** —
**Steps:**
1. Lista com filtros (role, ativo).
2. Form de criação: email, nome, role, foto upload.
3. Form de edição: idem + toggle is_active.
4. Confirmação destrutiva ao desativar.
5. `npm run build`.

**Critério:** Admin gerencia usuários pela UI completamente.

---

### D5.3 ⬜ 🟢 Página Perfil
**CRIAR:** `app/(dashboard)/perfil/page.tsx`, `components/users/profile-form.tsx`, `components/users/avatar-upload.tsx`.
**EDITAR:** —
**LER:** `app/api/users/[id]/route.ts`, `lib/supabase/client.ts`.
**NÃO TOCAR:** —
**Steps:**
1. Form com nome, foto, theme_preference.
2. Avatar upload com validação (MIME + 2MB max + compressão).
3. Storage path: `<user_id>/avatar.<ext>`.
4. Atualiza via PATCH /api/users/[id].
5. `npm run build`.

**Critério:** Usuário edita próprio perfil. Foto sobe no Storage.

---

### D6.1 ⬜ 🟡 Horários: API config + slots derivados
**CRIAR:** `app/api/closer-horarios/[userId]/route.ts`, `app/api/closer-horarios/[userId]/slots/route.ts`, `lib/utils/slot-generator.ts`, `lib/schemas/horario.ts` (se ainda não criado).
**EDITAR:** —
**LER:** `docs/schema.md` (closer_horarios), `docs/PRD.md` F-04.
**NÃO TOCAR:** front.
**Steps:**
1. PUT substitui config (delete antigos + insert novos por dia).
2. GET retorna config atual.
3. `slot-generator.ts`: gera slots a partir de blocos + duração + buffer, exclui slots já agendados.
4. GET slots: retorna disponíveis em range.
5. `npm run build`.

**Critério:** Curl GET /api/closer-horarios/[id]/slots?date_start retorna lista correta.

---

### D6.2 ⬜ 🟡 Horários: tela admin (lista de closers + modal config)
**CRIAR:** `app/(dashboard)/admin/horarios/page.tsx`, `app/(dashboard)/admin/horarios/[closerId]/page.tsx`, `components/horarios/closer-card.tsx`, `components/horarios/horario-config-modal.tsx`, `components/horarios/dia-tab.tsx`, `components/horarios/bloco-editor.tsx`.
**EDITAR:** —
**LER:** `app/api/closer-horarios/[userId]/route.ts`, `docs/ux-flows.md` F-04.
**NÃO TOCAR:** API.
**Steps:**
1. Lista cards de closers com status (configurado/pendente).
2. Modal/page com tabs por dia da semana.
3. `bloco-editor.tsx`: input HH:mm início/fim + botão remover.
4. Validação de sobreposição.
5. Botão "Aplicar template padrão" preenche seg-sex.
6. `npm run build`.

**Critério:** Admin configura horários de closer e PUT persiste.

---

### D7.1 ⬜ 🟡 Calls: API agendamento + cancelamento + presença
**CRIAR:** `app/api/calls/route.ts`, `app/api/calls/[id]/cancel/route.ts`, `app/api/calls/[id]/attendance/route.ts`.
**EDITAR:** —
**LER:** `lib/schemas/call.ts`, `lib/utils/slot-generator.ts`, `docs/ux-flows.md` F-08.
**NÃO TOCAR:** front.
**Steps:**
1. POST: valida slot disponível, insert atomico (constraint EXCLUDE pega conflito → 409).
2. PATCH cancel: status=cancelled. Auth: scheduled_by ou admin.
3. PATCH attendance: status=completed/no_show. Auth: closer ou admin.
4. Audit log + notificação in-app para closer ao agendar.
5. `npm run build`.

**Critério:** POST agenda call. POST concorrente no mesmo slot retorna 409.

---

### D7.2 ⬜ 🟡 Modal de agendamento de call no card
**CRIAR:** `components/agenda/agendar-call-modal.tsx`, `hooks/useAvailableSlots.ts`, `hooks/useAgendarCall.ts`.
**EDITAR:** `components/kanban/kanban-card-modal.tsx` (tab Calls funcional + botão "Agendar call").
**LER:** `app/api/closer-horarios/[userId]/slots/route.ts`, `app/api/calls/route.ts`.
**NÃO TOCAR:** —
**Steps:**
1. Modal com radio "Por data" / "Por closer".
2. Por data: date picker → lista slots agrupada por closer.
3. Por closer: select closer → lista próximos 14d.
4. Notas opcionais.
5. Tratamento 409 com refetch.
6. `npm run build`.

**Critério:** Social Selling agenda call pelo card.

---

### D7.3 ⬜ 🟡 Agenda: calendário react-big-calendar
**CRIAR:** `app/(dashboard)/agenda/page.tsx`, `components/agenda/agenda-calendar.tsx`, `components/agenda/call-detail-modal.tsx`, `hooks/useCalls.ts`.
**EDITAR:** `app/globals.css` (overrides do react-big-calendar para tema dark).
**LER:** `app/api/calls/route.ts`, `docs/ux-flows.md` F-07.
**NÃO TOCAR:** —
**Steps:**
1. Page: filtros (closer, status, range).
2. `agenda-calendar.tsx`: dynamic import (next/dynamic) do react-big-calendar.
3. Visões mês/semana/dia.
4. Click no evento abre `call-detail-modal.tsx` com botões Ir para card / Cancelar / Marcar presença.
5. Estilização ElevenLabs no globals.css.
6. `npm run build`.

**Critério:** Agenda renderiza calls. Cancelamento e marcação de presença funcionam.

---

### D8 ⬜ 🟢 Audit Log: API + UI admin
**CRIAR:** `app/api/audit-log/route.ts`, `app/api/audit-log/card/[id]/route.ts`, `app/(dashboard)/admin/historico/page.tsx`, `components/audit/historico-table.tsx`, `components/audit/historico-filters.tsx`, `components/audit/card-history-timeline.tsx`, `hooks/useAuditLog.ts`.
**EDITAR:** `components/kanban/kanban-card-modal.tsx` (tab Histórico funcional usando timeline).
**LER:** `lib/audit/logger.ts`, `docs/ux-flows.md` F-09.
**NÃO TOCAR:** —
**Steps:**
1. API com filtros: entity_type, entity_id, event_type, user_id, from, to. Paginação 50/page.
2. API por card: lista timeline.
3. Tabela com colunas timestamp, usuário, evento, entidade, ver diff (expand).
4. Timeline para tab Histórico do card.
5. `npm run build`.

**Critério:** Admin filtra histórico. Card mostra timeline em tempo real.

---

### D9 ⬜ 🟡 Notificações: API + sino + realtime
**CRIAR:** `app/api/notifications/route.ts`, `app/api/notifications/mark-read/route.ts`, `components/layout/notification-bell.tsx`, `components/notifications/notification-dropdown.tsx`, `components/notifications/notification-item.tsx`, `hooks/useNotifications.ts`, `hooks/useRealtimeNotifications.ts`, `lib/stores/notificationStore.ts`.
**EDITAR:** `components/layout/header.tsx` (incluir sino).
**LER:** `docs/PRD.md` F-10, `lib/automation/notifications.ts`.
**NÃO TOCAR:** —
**Steps:**
1. GET notifications (paginado).
2. POST mark-read (lista de ids ou all).
3. Sino com badge contador.
4. Dropdown com lista + "Marcar todas como lidas".
5. Realtime: subscribe em `notifications:user_id=eq.<uid>`. Toast + atualiza store.
6. Click navega + marca lida.
7. `npm run build`.

**Critério:** Notificação inserida via SQL aparece em tempo real no sino com toast.

---

### D10 ⬜ 🟢 Configurações Globais
**CRIAR:** `app/api/configuracoes/route.ts`, `app/api/configuracoes/[key]/route.ts`, `app/(dashboard)/admin/configuracoes/page.tsx`, `components/configuracoes/config-form.tsx`.
**EDITAR:** —
**LER:** `docs/PRD.md` F-11.
**NÃO TOCAR:** —
**Steps:**
1. API GET (todas) e PATCH (uma key).
2. Form com seleção do funil de inbound padrão e tema padrão.
3. `npm run build`.

**Critério:** Admin configura funil de inbound default e persiste.

---

## Bloco F — Polish

### F1 ⬜ 🟢 Empty states + loading skeletons em todas as listas
**CRIAR:** `components/shared/empty-state.tsx`, `components/shared/loading-spinner.tsx`, `components/shared/data-table.tsx`.
**EDITAR:** todos os components que listam dados (kanban, funis-table, users-table, agenda, historico).
**LER:** `docs/ux-flows.md` seção 6.
**NÃO TOCAR:** API.
**Steps:**
1. Empty state genérico com prop `title`, `description`, `action`.
2. Skeletons por contexto (tabela, kanban, calendar).
3. Substituir todos os "loading..." por skeletons reais.
4. Aplicar empty states.
5. `npm run build`.

**Critério:** Toda lista vazia mostra empty state. Toda carga mostra skeleton.

---

### F2 ⬜ 🟢 Confirmações destrutivas + toasts unificados
**CRIAR:** `components/shared/confirm-dialog.tsx`.
**EDITAR:** todos os botões delete/cancel.
**LER:** `docs/ux-flows.md` seção 6.
**NÃO TOCAR:** API.
**Steps:**
1. Wrapper AlertDialog com props title, description, confirmLabel, onConfirm.
2. Aplicar em delete de usuário, funil archive, cancel call, retry, delete card.
3. Padronizar toast success (verde 3s) e erro (vermelho persistente).
4. `npm run build`.

**Critério:** Toda ação destrutiva passa por confirm. Toasts uniformes.

---

### F3 ⬜ 🟢 Acessibilidade
**CRIAR:** —
**EDITAR:** components com ícone-only, header, sidebar, modals.
**LER:** `docs/ux-flows.md` seção 8.
**NÃO TOCAR:** API.
**Steps:**
1. ARIA labels em ícones (sino, theme toggle, avatar, bot, +, ⋯).
2. Skip-to-content no header.
3. Focus visible (ring) em todos os interativos.
4. Validar contraste 4.5:1 nas paletas.
5. Testar keyboard nav completo.
6. `npm run build`.

**Critério:** Tab navega tudo. Lighthouse a11y > 95.

---

### F4 ⬜ 🟡 Rate limiting + security headers
**CRIAR:** —
**EDITAR:** `next.config.js`, `middleware.ts`.
**LER:** `docs/security.md` seção 4.
**NÃO TOCAR:** —
**Steps:**
1. Adicionar `@upstash/ratelimit` + Redis (ou implementação em memória se single-instance).
2. Aplicar nos endpoints sensíveis (auth, calls, cards/move).
3. Security headers no `next.config.js` (XFO, CSP, HSTS, etc).
4. CORS restrito ao SITE_URL.
5. `npm run build`.

**Critério:** Headers presentes em response. Excesso de requests retorna 429.

---

### F5 ⬜ 🟢 Checklist pré-deploy + smoke test
**CRIAR:** `docs/CHECKLIST.md` (cópia da seção 11 do security.md com checkboxes).
**EDITAR:** README.md.
**LER:** `docs/security.md` seção 11.
**NÃO TOCAR:** —
**Steps:**
1. README.md com setup local, comandos, link para docs.
2. CHECKLIST.md com todos os itens.
3. Smoke manual: login admin, criar funil completo, criar usuário social_selling, criar card, mover, agendar call, cancelar call, ver histórico.
4. `npm run build`.

**Critério:** Checklist 100% verde. Smoke test sem erros.

---

### F6 ⬜ 🟡 ⚙️ MANUAL Deploy Vercel
**CRIAR:** —
**EDITAR:** —
**LER:** `docs/security.md` seção 5.
**NÃO TOCAR:** —
**Steps:**
1. Conectar repo no Vercel.
2. Configurar env vars (Production scope): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN.
3. Push to main → preview → promote.
4. Validar URL `gestao-4-0.vercel.app`.
5. Smoke test em prod.

**Critério:** App acessível em prod. Login funciona. Kanban opera.

---

## Tabela Resumo

| Bloco | Tasks | Complexidade | Dependência |
|-------|-------|:------------:|-------------|
| A — Setup | A1, A2, A3, A4, A5 | 🟢🟢🟢🟡🟢 | — |
| B — Auth | B1, B2, B3 | 🟡🟡🟡 | A |
| C — Layout | C1 | 🟡 | A, B |
| D — Schemas | D1 | 🟡 | A4 |
| D — Funis | D2.1, D2.2, D2.3 | 🟡🟡🟢 | D1 |
| D — Cards/Kanban | D3.1, D3.2, D3.3, D3.4 | 🟡🔴🔴🟡 | D2 |
| D — Automações | D4.1, D4.2, D4.3 | 🔴🟡🟡 | D3 |
| D — Usuários | D5.1, D5.2, D5.3 | 🟡🟡🟢 | A4 |
| D — Horários | D6.1, D6.2 | 🟡🟡 | D5 |
| D — Calls | D7.1, D7.2, D7.3 | 🟡🟡🟡 | D6 |
| D — Audit/Notif/Config | D8, D9, D10 | 🟢🟡🟢 | D2-D7 |
| F — Polish | F1, F2, F3, F4, F5, F6 | 🟢🟢🟢🟡🟢🟡 | tudo |

**Total:** 30 tasks. **Complexidade média:** 🟡. **Tasks 🔴 críticas:** D3.2, D3.3, D4.1.

**Caminho crítico:** A → B → C → D1 → D2 → D3 → D4 → D5 → D6 → D7 → D8/D9/D10 → F.
