# Gestão 4.0

SaaS interno single-tenant da Bethel Educação para Social Selling (kanban com automações) e Closer scheduling.

## Stack

Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · shadcn/ui · Supabase (`@supabase/ssr`) · TanStack Query · Zustand · React Hook Form + Zod · dnd-kit · react-big-calendar · sonner · next-themes.

## Setup local

```bash
npm install
cp .env.local.example .env.local   # preencher URL + anon key + service role do Supabase
npm run dev                         # http://localhost:3000
```

Antes do primeiro `dev` útil, provisione o banco:

```bash
# com o projeto Supabase criado e linkado:
npx supabase db push                                   # aplica supabase/migrations/0001..0009
# crie o usuário admin em Authentication → Users, copie o UUID e ajuste supabase/seed.sql
# rode o seed (SQL Editor ou psql) com o UUID real
npx supabase gen types typescript --linked > lib/database.types.ts
```

Habilite o Realtime para notificações: Database → Replication → adicione `public.notifications`.

## Scripts

```bash
npm run dev       # dev server :3000
npm run build     # build de produção
npm run start     # serve o build
npm run lint      # ESLint
npx tsc --noEmit  # type check
```

## Estrutura

```
app/(auth)/        # login, setup, forgot/reset password
app/(dashboard)/   # crm, agenda, perfil, admin/{funis,usuarios,horarios,historico,configuracoes}
app/api/           # route handlers ({data}/{error,code})
components/         # ui/ (shadcn) · layout/ · kanban/ · funis/ · horarios/ · agenda/ · audit/ · notifications/ · forms/ · users/ · configuracoes/ · shared/
hooks/             # TanStack Query hooks (useFunis, useCards, useMoveCard, useNotifications, ...)
lib/               # supabase/{client,server,admin,middleware} · automation/{engine,actions,notifications} · audit/logger · schemas/ · stores/ · utils/
server/            # auth (requireAuth/requireAdmin/requireRole) · api-helpers (ApiError, ok, badRequest, ...)
types/domain.ts    # tipos de domínio compostos
supabase/          # migrations/ + seed.sql
middleware.ts      # refresh de sessão + guards de rota + rate limiting
```

Docs do projeto: `architecture.md`, `tech-stack.md`, `schema.md`, `security.md`, `PRD.md`, `ux-flows.md`.
Release/QA: [`docs/CHECKLIST.md`](docs/CHECKLIST.md) — checklist de deploy + roteiro de smoke.

## Convenções

- **Server Component por default.** `"use client"` só com state/eventos/hooks de browser.
- **TS strict + `noUncheckedIndexedAccess`.** Sem `any`.
- **Tailwind only.** Dark mode via `class` (next-themes); paleta ElevenLabs (neutros).
- **TanStack Query** para server state · **Zustand** para UI state · **RHF + Zod** para forms (schemas compartilhados em `lib/schemas/`).
- Padrão de API em `architecture.md` §4; toda mutation relevante chama `lib/audit/logger.ts` (best-effort).
- Engine de automação roda síncrono no `POST /api/cards/[id]/move`: profundidade máx. 5, timeout 5s; falhas → `automation_errors` + UI de retry.
- RBAC em 3 camadas: middleware (rota) → `requireAuth`/`requireAdmin` (route handler) → RLS (banco).

## Deploy

`git push origin main` → Vercel auto-deploy. Configurar `NEXT_PUBLIC_*` e `SUPABASE_SERVICE_ROLE_KEY` em Project Settings → Environment Variables. Conferir `docs/CHECKLIST.md` antes de promover.
