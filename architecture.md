> 🧙 Doutor Estranho | 2026-05-09 | v1.0

# Gestão 4.0 — Architecture

## 1. Estrutura de Diretórios

```
gestao-4-0/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── setup/
│   │   │   └── page.tsx                 # primeiro login, troca senha
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   └── reset-password/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                   # sidebar + header
│   │   ├── page.tsx                     # redirect por role
│   │   ├── crm/
│   │   │   ├── page.tsx                 # lista de funis acessíveis
│   │   │   └── [funilId]/
│   │   │       ├── page.tsx             # kanban
│   │   │       └── cards/[cardId]/
│   │   │           └── page.tsx         # detalhe modal-route ou full
│   │   ├── agenda/
│   │   │   └── page.tsx                 # calendar mês/semana/dia
│   │   ├── perfil/
│   │   │   └── page.tsx
│   │   └── admin/
│   │       ├── layout.tsx               # guard role=admin
│   │       ├── usuarios/
│   │       │   ├── page.tsx
│   │       │   ├── novo/page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── funis/
│   │       │   ├── page.tsx
│   │       │   ├── novo/page.tsx
│   │       │   └── [id]/
│   │       │       ├── page.tsx         # editar funil + etapas + custom fields
│   │       │       └── automacoes/page.tsx
│   │       ├── horarios/
│   │       │   ├── page.tsx             # lista de closers
│   │       │   └── [closerId]/page.tsx  # config de horário
│   │       ├── historico/
│   │       │   └── page.tsx             # audit log filtrável
│   │       └── configuracoes/
│   │           └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── setup-password/route.ts
│   │   ├── funis/
│   │   │   ├── route.ts                 # GET, POST
│   │   │   └── [id]/
│   │   │       ├── route.ts             # GET, PATCH, DELETE
│   │   │       ├── cards/route.ts       # GET, POST
│   │   │       └── etapas/
│   │   │           ├── route.ts         # POST
│   │   │           ├── reorder/route.ts
│   │   │           └── [etapaId]/route.ts
│   │   ├── cards/
│   │   │   └── [id]/
│   │   │       ├── route.ts             # GET, PATCH, DELETE
│   │   │       └── move/route.ts        # POST move + automação
│   │   ├── leads/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── etapas/
│   │   │   └── [id]/automacoes/route.ts
│   │   ├── automacoes/
│   │   │   └── [id]/route.ts
│   │   ├── automation-errors/
│   │   │   └── [id]/retry/route.ts
│   │   ├── users/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── deactivate/route.ts
│   │   ├── closer-horarios/
│   │   │   └── [userId]/
│   │   │       ├── route.ts
│   │   │       └── slots/route.ts
│   │   ├── calls/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── cancel/route.ts
│   │   │       └── attendance/route.ts
│   │   ├── audit-log/
│   │   │   ├── route.ts
│   │   │   └── card/[id]/route.ts
│   │   ├── notifications/
│   │   │   ├── route.ts
│   │   │   └── mark-read/route.ts
│   │   └── configuracoes/
│   │       ├── route.ts
│   │       └── [key]/route.ts
│   ├── error.tsx
│   ├── not-found.tsx
│   ├── layout.tsx                       # root, ThemeProvider, QueryProvider
│   └── globals.css
├── components/
│   ├── ui/                              # shadcn
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── ...
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── notification-bell.tsx
│   │   ├── theme-toggle.tsx
│   │   └── user-menu.tsx
│   ├── kanban/
│   │   ├── kanban-board.tsx             # client
│   │   ├── kanban-column.tsx
│   │   ├── kanban-card.tsx
│   │   ├── kanban-card-modal.tsx
│   │   └── new-card-button.tsx
│   ├── funis/
│   │   ├── funil-form.tsx
│   │   ├── etapa-list.tsx
│   │   ├── custom-fields-builder.tsx
│   │   └── automacao-modal.tsx
│   ├── horarios/
│   │   ├── closer-card.tsx
│   │   ├── horario-config-modal.tsx
│   │   ├── dia-tab.tsx
│   │   └── bloco-editor.tsx
│   ├── agenda/
│   │   ├── agenda-calendar.tsx          # react-big-calendar wrapper
│   │   ├── call-detail-modal.tsx
│   │   └── agendar-call-modal.tsx
│   ├── audit/
│   │   ├── historico-table.tsx
│   │   ├── historico-filters.tsx
│   │   └── card-history-timeline.tsx
│   ├── notifications/
│   │   ├── notification-dropdown.tsx
│   │   └── notification-item.tsx
│   ├── forms/
│   │   ├── custom-field-input.tsx       # render dinâmico por tipo
│   │   └── role-select.tsx
│   └── shared/
│       ├── empty-state.tsx
│       ├── loading-spinner.tsx
│       ├── confirm-dialog.tsx
│       └── data-table.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useCurrentUser.ts
│   ├── useFunis.ts
│   ├── useFunilById.ts
│   ├── useCards.ts
│   ├── useMoveCard.ts
│   ├── useCloserHorarios.ts
│   ├── useAvailableSlots.ts
│   ├── useCalls.ts
│   ├── useAgendarCall.ts
│   ├── useNotifications.ts
│   ├── useRealtimeNotifications.ts
│   ├── useAuditLog.ts
│   └── useDebounce.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    # createBrowserClient
│   │   ├── server.ts                    # createServerClient (cookies)
│   │   ├── middleware.ts                # session refresh
│   │   └── admin.ts                     # service role (server only)
│   ├── automation/
│   │   ├── engine.ts                    # executor síncrono
│   │   ├── actions.ts                   # move_to, duplicate_to
│   │   └── notifications.ts             # adapter (in-app, wa stub, ig stub)
│   ├── audit/
│   │   └── logger.ts                    # registra eventos no audit_log
│   ├── schemas/
│   │   ├── funil.ts
│   │   ├── etapa.ts
│   │   ├── card.ts
│   │   ├── lead.ts
│   │   ├── user.ts
│   │   ├── call.ts
│   │   ├── horario.ts
│   │   ├── automacao.ts
│   │   └── custom-fields.ts             # builder dinâmico
│   ├── stores/
│   │   ├── kanbanStore.ts
│   │   ├── uiStore.ts
│   │   └── notificationStore.ts
│   ├── utils/
│   │   ├── cn.ts                        # tailwind-merge + clsx
│   │   ├── formatters.ts                # data, currency, etc
│   │   ├── slot-generator.ts            # gera slots a partir da config
│   │   └── permissions.ts               # helpers RBAC client-side
│   ├── constants.ts
│   └── database.types.ts                # gerado por supabase gen types
├── server/
│   ├── auth.ts                          # getCurrentUser, requireAuth, requireAdmin
│   ├── api-helpers.ts                   # respond, errorResponse
│   └── automation-runner.ts             # entrypoint do engine
├── types/
│   ├── domain.ts                        # tipos de domínio compostos
│   └── api.ts                           # request/response types
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   ├── 0002_funnels.sql
│   │   ├── 0003_cards_leads.sql
│   │   ├── 0004_automations.sql
│   │   ├── 0005_horarios_calls.sql
│   │   ├── 0006_audit_notifications.sql
│   │   └── 0007_rls_policies.sql
│   └── seed.sql
├── public/
│   └── icons/
├── middleware.ts                        # raiz do projeto
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── .env.local.example
└── README.md
```

## 2. Nomenclatura

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componente React | PascalCase.tsx | `KanbanBoard.tsx` |
| Hook | camelCase com prefix `use` | `useFunis.ts` |
| Util | camelCase.ts | `formatters.ts` |
| Store Zustand | camelCase com sufix `Store` | `kanbanStore.ts` |
| Pasta | kebab-case | `kanban-card-modal/` |
| Variável | camelCase | `currentUser` |
| Type/Interface | PascalCase | `Card`, `FunilWithEtapas` |
| Constante | UPPER_SNAKE_CASE | `MAX_AUTOMATION_DEPTH` |
| Env var | `NEXT_PUBLIC_*` (client) ou plain (server) | `NEXT_PUBLIC_SUPABASE_URL` |
| Tabela DB | snake_case plural | `closer_horarios` |
| Coluna DB | snake_case | `created_at` |

## 3. Componentes

**Padrão:**
- `function declaration` (não arrow function como default).
- `named export` (exceto `page.tsx` que precisa default export).
- `"use client"` apenas quando necessário (interatividade, hooks de estado, eventos).
- Server Component é o default.
- Props tipadas via `interface` declarada no mesmo arquivo.

**Exemplo Server Component:**
```tsx
// components/kanban/kanban-board-server.tsx
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "./kanban-board";

interface Props {
  funilId: string;
}

export async function KanbanBoardServer({ funilId }: Props) {
  const supabase = createClient();
  const { data: cards } = await supabase
    .from("cards")
    .select("*, lead:leads(*), etapa:etapas(*)")
    .eq("funil_id", funilId);

  return <KanbanBoard initialCards={cards ?? []} funilId={funilId} />;
}
```

**Exemplo Client Component:**
```tsx
// components/kanban/kanban-board.tsx
"use client";

import { DndContext } from "@dnd-kit/core";
import { useMoveCard } from "@/hooks/useMoveCard";
import type { Card } from "@/types/domain";

interface Props {
  initialCards: Card[];
  funilId: string;
}

export function KanbanBoard({ initialCards, funilId }: Props) {
  const moveCard = useMoveCard();
  // ...
  return <DndContext onDragEnd={handleDragEnd}>{/* ... */}</DndContext>;
}
```

## 4. API Pattern

Todas as routes seguem o padrão:

```ts
// app/api/cards/[id]/move/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/auth";
import { runAutomation } from "@/server/automation-runner";
import { moveCardSchema } from "@/lib/schemas/card";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth
    const { user, supabase } = await requireAuth();

    // 2. Validate
    const body = await req.json();
    const parsed = moveCardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", code: "VALIDATION", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // 3. Business logic (RLS já protege no banco)
    const { data: card, error } = await supabase
      .from("cards")
      .update({ etapa_id: parsed.data.etapa_id })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("[POST /api/cards/[id]/move] update error", error);
      return NextResponse.json(
        { error: "Falha ao mover card", code: "INTERNAL" },
        { status: 500 }
      );
    }

    // 4. Run automation (synchronous)
    const automationResult = await runAutomation({
      cardId: card.id,
      etapaId: parsed.data.etapa_id,
      userId: user.id,
    });

    // 5. Response
    return NextResponse.json({ data: { card, automationResult } });
  } catch (err) {
    console.error("[POST /api/cards/[id]/move]", err);
    return NextResponse.json(
      { error: "Erro inesperado", code: "INTERNAL" },
      { status: 500 }
    );
  }
}
```

**Formato de resposta:**
- Sucesso: `{ data: T }`
- Erro: `{ error: string, code: ERR_CODE, details?: object }`

**Códigos de erro padrão:**
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `VALIDATION` (400)
- `CONFLICT` (409)
- `BUSINESS_RULE` (422)
- `AUTOMATION_FAILED` (422 com `automation_error_id`)
- `INTERNAL` (500)

## 5. Supabase

### `lib/supabase/client.ts` (browser)
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### `lib/supabase/server.ts` (server)
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set(name, value, options),
        remove: (name, options) => cookieStore.set(name, "", options),
      },
    }
  );
}
```

### `lib/supabase/admin.ts` (server, service role)
Usado apenas para operações que exigem bypass de RLS (criar usuário com senha temporária, gerar links de reset, executar automações como sistema).

```ts
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

**Regra absoluta:** `SUPABASE_SERVICE_ROLE_KEY` nunca exposto ao browser. Nunca importar `admin.ts` em arquivo que tenha `"use client"`.

### Middleware (`middleware.ts` raiz)
Refresh de sessão Supabase + guard de rotas autenticadas.

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(req: NextRequest) {
  return await updateSession(req);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

## 6. Data Fetching

| Cenário | Estratégia |
|---------|-----------|
| Página inicial com dados | Server Component → Supabase server client direto |
| Dados que mudam (kanban) | Client + TanStack Query |
| Mutations | TanStack Query `useMutation` + invalidate |
| Realtime (notificações) | Supabase Realtime channel + Zustand store |
| Forms | React Hook Form + Zod resolver |

**NUNCA** usar `useEffect` para fetch. Sempre TanStack Query no client.

**Hidratação Server → Client:**
```tsx
// app/(dashboard)/crm/[funilId]/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export default async function FunilPage({ params }: { params: { funilId: string } }) {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["funil", params.funilId, "cards"],
    queryFn: () => fetchCardsServer(params.funilId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <KanbanBoard funilId={params.funilId} />
    </HydrationBoundary>
  );
}
```

## 7. Error Handling

| Origem do erro | Status | Onde tratar |
|----------------|--------|-------------|
| Zod parse fail | 400 | Route handler |
| Não autenticado | 401 | Middleware ou `requireAuth` |
| RLS rejeita / role insuficiente | 403 | `requireAdmin` ou retorno do Supabase |
| Recurso não existe | 404 | Route handler após query |
| Conflito (slot ocupado) | 409 | Tratamento de constraint unique |
| Regra de negócio violada | 422 | Validação business explícita |
| Inesperado | 500 | Catch genérico + `console.error` |

**Boundaries:**
- `app/error.tsx` — boundary raiz.
- `app/(dashboard)/admin/error.tsx` — boundary admin.
- `app/(dashboard)/crm/[funilId]/error.tsx` — boundary funil.

**Pattern em todo route:**
```ts
try {
  // ...
} catch (err) {
  console.error("[ROUTE_NAME]", err);
  return NextResponse.json({ error: "...", code: "INTERNAL" }, { status: 500 });
}
```

## 8. Performance

- `next/image` para todos os avatares.
- `next/font` (Inter) com `display: 'swap'`.
- `next/dynamic` para `react-big-calendar` (heavy, só carrega na rota agenda).
- `Suspense` boundaries em listagens grandes (audit log, cards).
- **Parallel fetch** em Server Components: `await Promise.all([...])`.
- **Virtualização** no kanban se >300 cards visíveis (TanStack Virtual).
- **Debounce** em buscas (300ms via `useDebounce`).
- **Static segments** onde possível (`/login`, `/forgot-password`).

## 9. Engine de Automação (`lib/automation/engine.ts`)

```
[POST /api/cards/:id/move]
       │
       ▼
[runAutomation({ cardId, etapaId, userId })]
       │
       ├─ Carrega automacoes da etapa (where etapa_id)
       ├─ Para cada automacao em ordem:
       │   ├─ se action = move_to: update card.etapa_id (target)
       │   ├─ se action = duplicate_to: insert N cards filhos
       │   ├─ se notificacao in-app: insert notifications + Realtime broadcast
       │   ├─ se notificacao WA/IG: chama adapter (stub no MVP, log "not implemented")
       │   └─ falha: insert automation_errors, retorna { success: false, error }
       │
       ├─ Audit log: registra cada execução
       │
       └─ Retorna { success: true, executions: [...] }
```

**Profundidade máxima:** 5. Se `move_to` cascateia além disso, aborta com `AUTOMATION_DEPTH_EXCEEDED`.

**Idempotência:** hash da operação `(card_id, etapa_origem, etapa_destino, timestamp_minute)`. Retry com mesmo hash em janela de 60s não re-executa.

**Timeout:** wrapper `Promise.race` com 5s. Se exceder, marca `automation_errors` e retorna 422.

## 10. Audit Logger (`lib/audit/logger.ts`)

```ts
export async function logEvent({
  entityType,
  entityId,
  eventType,
  userId,
  before,
  after,
}: LogEventParams): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("audit_log").insert({
    entity_type: entityType,
    entity_id: entityId,
    event_type: eventType,
    user_id: userId,
    before: before ?? null,
    after: after ?? null,
  });
}
```

Chamado em todo route handler que muta dados. Falha de logging NÃO bloqueia operação principal (best-effort).
