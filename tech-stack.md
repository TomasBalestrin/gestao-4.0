> 👁️ Visão | 2026-05-09 | v1.0

# Gestão 4.0 — Tech Stack

## 1. Visão Geral

```
[Browser]
   │
   ▼  HTTPS/WSS
[Vercel Edge / Node Runtime]
   │
   ├─→ [Next.js 14 App Router]
   │     ├─ Server Components (default)
   │     ├─ Route Handlers (/api/*)
   │     ├─ Server Actions (forms admin)
   │     └─ Client Components (kanban, agenda, modals)
   │
   ▼  PostgREST + Realtime + Auth
[Supabase]
   ├─ PostgreSQL (dados + RLS)
   ├─ Auth (JWT)
   ├─ Storage (avatares)
   └─ Realtime (notificações + kanban sync)
```

Cliente fala com Next.js. Next.js fala com Supabase via SDK server-side (`@supabase/ssr`). Realtime conecta direto do client via JWT.

## 2. Core Stack

### Next.js 14 App Router (TypeScript strict)
**Por quê:** Server Components reduzem JS no client, RSC streamável melhora LCP, Route Handlers cobrem APIs sem framework adicional.
**Config:**
- `app/` directory.
- `next.config.js` com `experimental.serverActions=true`.
- `tsconfig.json` com `strict: true`, `noUncheckedIndexedAccess: true`.
- Path aliases: `@/components`, `@/lib`, `@/server`.

### TypeScript 5
**Por quê:** Strict mode evita classes inteiras de bugs. Tipos derivados do schema do Supabase via `supabase gen types`.
**Config:** `target: ES2022`, `moduleResolution: bundler`.

### Tailwind CSS 3
**Por quê:** Velocidade, dark mode nativo via `class`, design tokens em `tailwind.config.ts`.
**Regra:** Tailwind only. Zero CSS Modules. Zero styled-components.
**Config:** `darkMode: 'class'`, plugins: `@tailwindcss/forms`, `@tailwindcss/typography`.

### shadcn/ui
**Por quê:** Componentes primitivos copy-paste, customizáveis, sem peso de lib externa. Base Radix.
**Componentes que vamos usar:** Button, Dialog, DropdownMenu, Select, Input, Textarea, Tabs, Toast (Sonner), Calendar, Popover, Sheet, Form, Table, Badge, Avatar, Separator.

### Supabase
**Por quê:** Postgres gerenciado + Auth + Realtime + Storage no mesmo provedor. RLS resolve RBAC declarativamente.
**Config:**
- Plano Pro (single project).
- Conexão via `@supabase/ssr` (App Router).
- RLS habilitado em TODAS as tabelas de negócio.
- Migrations em `supabase/migrations/`.
- Types gerados via `npx supabase gen types typescript` em `lib/database.types.ts`.

### Vercel
**Por quê:** Deploy zero-config para Next.js, Preview Deployments por branch, Edge Functions disponíveis.
**Config:**
- Projeto vinculado ao GitHub.
- Auto-deploy na branch `main` para produção.
- Preview por PR.
- Vars de ambiente em `Project Settings`.

## 3. Frontend

### Estilização
- **Tailwind only.** Sem CSS Modules, sem styled-components, sem emotion.
- **Tokens de design no `tailwind.config.ts`.** Cores, fontes, espaçamentos definidos lá.
- **Dark mode:** classe `dark` no `<html>` controlada por `next-themes`.
- **Tipografia:** Inter via `next/font/google`. Fonte mono opcional (JetBrains Mono) para IDs e timestamps.
- **Identidade ElevenLabs style:**
  - Background dark: `#0A0A0A` (quase preto puro).
  - Background light: `#FFFFFF`.
  - Surface dark: `#141414` / `#1A1A1A`.
  - Surface light: `#F5F5F5`.
  - Text dark: `#EDEDED` / muted `#A1A1A1`.
  - Text light: `#0A0A0A` / muted `#525252`.
  - Border dark: `#262626`.
  - Border light: `#E5E5E5`.
  - Accent: cinza claro `#D4D4D4` (dark) / cinza escuro `#404040` (light). Sem cor primária vibrante.
  - Sucesso: `#10B981` (uso mínimo, apenas em estados críticos).
  - Erro: `#EF4444` (uso mínimo).

### State Management

**Server state → TanStack Query 5**
- Cache de dados do Supabase.
- Invalidação granular após mutations.
- Hooks: `useQuery`, `useMutation`, `useInfiniteQuery`.
- `staleTime` padrão: 30s. Dados kanban: 10s.

**UI state → Zustand**
- Estado do kanban (drag em progresso, modal aberto, filtros locais).
- Theme toggle.
- Sidebar collapsed.
- Notification dropdown open.
- Stores em `lib/stores/*.ts`. Pattern: 1 store por domínio.

**Forms → React Hook Form + Zod**
- Validação client + server (mesmo schema Zod).
- Resolver: `@hookform/resolvers/zod`.

### Validação

**Zod**
- Schemas em `lib/schemas/*.ts`.
- Compartilhados client (RHF) e server (route handlers).
- Custom fields: schema dinâmico construído a partir da config do funil.

### Animações

**Framer Motion**
- Transições de modal, drawer, drag-and-drop feedback.
- Uso parcimonioso. ElevenLabs aesthetic é minimalista.

### Ícones

**Lucide React**
- Único conjunto de ícones.
- Bot icon para automações, Calendar para agenda, Filter, Search, etc.

## 4. Pacotes Extras

| Pacote | Versão | Propósito | Justificativa |
|--------|--------|-----------|---------------|
| `@supabase/ssr` | latest | Cliente Supabase para App Router | Oficial Supabase, gerencia cookies de sessão server-side |
| `@supabase/supabase-js` | latest | Cliente JS base | Dependência transitiva do `@supabase/ssr` |
| `next-themes` | ^0.3 | Theme provider dark/light | Padrão da comunidade, evita FOUC |
| `@tanstack/react-query` | ^5 | Server state | Cache, refetch, invalidação |
| `@tanstack/react-query-devtools` | ^5 | DevTools | Apenas dev, ajuda debug |
| `zustand` | ^4 | Client UI state | Leve, sem boilerplate, suficiente para escopo |
| `react-hook-form` | ^7 | Forms | Performático, integra Zod |
| `@hookform/resolvers` | ^3 | Resolver Zod para RHF | Bridge oficial |
| `zod` | ^3 | Validação de schema | Inferência de tipos, server+client |
| `@dnd-kit/core` | ^6 | Drag-and-drop kanban | Mais leve e acessível que react-dnd |
| `@dnd-kit/sortable` | ^8 | Reordenação de etapas | Complemento dnd-kit |
| `react-big-calendar` | ^1 | Calendário agenda | Maduro, suporta mês/semana/dia |
| `date-fns` | ^3 | Manipulação de datas | Tree-shakeable, melhor que moment |
| `framer-motion` | ^11 | Animações | Transições suaves |
| `lucide-react` | ^0.4 | Ícones | Conjunto consistente |
| `sonner` | ^1 | Toast notifications | Recomendado por shadcn |
| `cmdk` | ^1 | Command palette (futuro) | Já incluído em shadcn |
| `tailwind-merge` | ^2 | Merge classes Tailwind | Util `cn()` |
| `clsx` | ^2 | Conditional classNames | Util `cn()` |
| `class-variance-authority` | ^0.7 | Variantes de componentes | Usado por shadcn |

## 5. Infra

### Ambientes
- **Dev (local):** `.env.local` com Supabase project Dev.
- **Preview (Vercel):** auto-deploy por PR, conecta ao Supabase Dev.
- **Prod (Vercel):** auto-deploy main, conecta ao Supabase Prod.

### Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # apenas server, jamais expor
NEXT_PUBLIC_SITE_URL=         # https://gestao-4-0.vercel.app
```

### CI/CD
- **GitHub → Vercel.** Auto-deploy.
- **Type check + lint + build** em CI antes do merge (Vercel preview já cobre).
- **Migrations Supabase:** aplicadas manualmente via `supabase db push` ou GitHub Action dedicado [INFERIDO].

### Monitoramento
- Vercel Analytics (Web Vitals).
- Vercel Logs.
- Console structured logs (server) com timestamp + level + context.
- Sentry: Fase 2.

## 6. Responsividade

Breakpoints Tailwind padrão. **MVP é desktop-first** conforme briefing. Mobile/PWA é Fase 2.

| Breakpoint | Min width | Uso no MVP |
|-----------|-----------|------------|
| `sm` | 640px | Não suportado (degraded) |
| `md` | 768px | Não suportado (degraded) |
| `lg` | 1024px | Tablet/desktop pequeno (suporte mínimo) |
| `xl` | 1280px | Target principal |
| `2xl` | 1536px | Confortável |

UI abaixo de `lg`: aviso "Use em desktop" no MVP. Layout não quebra mas não é otimizado.

## 7. ADRs (Architecture Decision Records)

### ADR-001: App Router em vez de Pages Router
**Contexto:** Next.js 14 moderno.
**Decisão:** App Router.
**Alternativas:** Pages Router (legado).
**Consequências:** Server Components por padrão, melhor LCP, padrão Next moderno. Curva de aprendizado para devs novos.

### ADR-002: Supabase em vez de stack custom (Postgres + NextAuth + S3)
**Contexto:** Evitar montar autenticação, storage e realtime do zero.
**Decisão:** Supabase.
**Alternativas:** Neon + NextAuth + Cloudflare R2.
**Consequências:** RLS resolve RBAC declarativamente, Realtime out-of-the-box, vendor lock-in moderado (Postgres é portável).

### ADR-003: Engine de automação síncrono no drag (sem fila)
**Contexto:** Briefing aceita risco. MVP interno.
**Decisão:** Automação dispara síncrona na request `POST /api/cards/[id]/move`. Falhas viram log com retry manual.
**Alternativas:** Inngest, BullMQ, Trigger.dev.
**Consequências:** Latência percebida no drag. Risco de timeout em cascatas longas. Mitigação: timeout 5s, contador de profundidade max 5, UI de retry. Migração para fila assíncrona se necessário (mudança limitada à camada `lib/automation-engine`).

### ADR-004: Custom Fields em JSONB em vez de tabela EAV
**Contexto:** Custom fields por funil, sem necessidade de queries complexas em campos individuais no MVP.
**Decisão:** Coluna `custom_fields JSONB` no card. Schema da config no funil.
**Alternativas:** Tabela `card_custom_field_values` (EAV).
**Consequências:** Simples, performance OK para escala MVP. Queries em campos individuais via `->>'campo'` com índices GIN se necessário. Validação via Zod dinâmico.

### ADR-005: Zustand em vez de Redux/Jotai
**Contexto:** UI state (kanban, theme, modais).
**Decisão:** Zustand.
**Alternativas:** Redux Toolkit, Jotai, Context.
**Consequências:** API mínima, boilerplate zero, performance suficiente. Sem time-travel debugging do Redux (não necessário no escopo).

### ADR-006: TanStack Query como única fonte de server state
**Contexto:** Múltiplas telas consomem mesmas listagens (cards, funis).
**Decisão:** TanStack Query gerencia tudo que vem do Supabase.
**Alternativas:** SWR, fetch direto em Server Components.
**Consequências:** Cache compartilhado, invalidação granular. Server Components ainda usados para fetches iniciais com hidratação.

### ADR-007: dnd-kit em vez de react-beautiful-dnd ou react-dnd
**Contexto:** Drag-and-drop no kanban.
**Decisão:** dnd-kit.
**Alternativas:** react-beautiful-dnd (deprecated), react-dnd (mais pesado), Pragmatic DnD.
**Consequências:** Acessibilidade nativa, leve, modular. API tem curva mas resultado é robusto.

### ADR-008: react-big-calendar em vez de FullCalendar
**Contexto:** Visualização mês/semana/dia.
**Decisão:** react-big-calendar.
**Alternativas:** FullCalendar, custom build.
**Consequências:** Free, suficiente para visualização. Estilização requer override CSS (aceito). FullCalendar tem licença comercial em alguns recursos.

### ADR-009: NÃO usar Pages Router, CSS Modules, Redux, Axios, Firebase
- **Pages Router:** legado.
- **CSS Modules:** Tailwind cobre 100% dos casos.
- **Redux:** complexidade desnecessária.
- **Axios:** `fetch` nativo é suficiente, Next.js o estende.
- **Firebase:** redundante com Supabase.

### ADR-010: Inter como fonte única
**Contexto:** ElevenLabs aesthetic.
**Decisão:** Inter via `next/font/google`.
**Alternativas:** Plus Jakarta Sans (usado no Bethel CS), Geist Sans.
**Consequências:** Coerente com referência visual. Variant mono opcional (JetBrains Mono) apenas para IDs e código inline.
