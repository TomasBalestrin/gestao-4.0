# Gestão 4.0

SaaS interno single-tenant da Bethel Educação para Social Selling (kanban com automações) e Closer scheduling.

## Stack

Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · shadcn/ui · Supabase · TanStack Query · Zustand · React Hook Form + Zod · dnd-kit · react-big-calendar.

## Setup

```bash
npm install
cp .env.local.example .env.local   # preencher chaves Supabase
npm run dev                         # http://localhost:3000
```

## Scripts

```bash
npm run dev       # dev server
npm run build     # build de produção
npm run start     # serve build
npm run lint      # ESLint
npx tsc --noEmit  # type check
```

## Estrutura

```
app/         # App Router (rotas, layouts, route handlers)
components/  # ui/, layout/, kanban/, funis/, agenda/, ...
hooks/       # TanStack Query hooks
lib/         # supabase/, automation/, schemas/, stores/, utils/
server/      # auth, api-helpers, automation-runner
types/       # tipos de domínio
supabase/    # migrations, seed
```

Detalhes em `architecture.md`, `tech-stack.md`, `schema.md`, `security.md`.

## Convenções

- **Server Component por default.** `"use client"` apenas com state/eventos/hooks de browser.
- **TS strict + `noUncheckedIndexedAccess`.** Sem `any`.
- **Tailwind only.** Dark mode via `class` (next-themes).
- **TanStack Query** para server state. **Zustand** para UI state. **RHF + Zod** para forms.
- Padrão de API em `architecture.md` §4. Toda mutation passa por `lib/audit/logger.ts`.

## Deploy

`git push origin main` → Vercel auto-deploy.
