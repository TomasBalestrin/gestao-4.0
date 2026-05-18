> ⚡ Thor | 2026-05-09 | v1.0

# CLAUDE.md — Gestão 4.0

## 1. Sobre

Gestão 4.0 é um SaaS interno single-tenant da Bethel Educação para Social Selling (kanban com automações) e Closer scheduling. Stack: **Next.js 14 App Router + TS strict + Supabase + Tailwind + shadcn/ui + dnd-kit + react-big-calendar + Zustand + TanStack Query + RHF + Zod**.

Antes de qualquer execução, leia `docs/TASKS.md` e siga a task atual ou a próxima não concluída.

## 2. Comandos

```bash
# Dev
npm run dev               # Next.js dev server :3000

# Build / Lint / Types
npm run build             # Build prod
npm run lint              # ESLint
npx tsc --noEmit          # Type check

# Supabase
npx supabase start        # Local stack (opcional)
npx supabase db push      # Aplica migrations
npx supabase gen types typescript --linked > lib/database.types.ts

# Deploy
git push origin main      # Vercel auto-deploy
```

## 3. Estrutura (resumo)

```
app/
  (auth)/login, setup, forgot-password, reset-password
  (dashboard)/
    crm/[funilId]/
    agenda/
    perfil/
    admin/{usuarios,funis,horarios,historico,configuracoes}/
  api/
    funis, cards, leads, etapas, automacoes, automation-errors
    users, closer-horarios, calls, audit-log, notifications, configuracoes
components/
  ui/ (shadcn) | layout/ | kanban/ | funis/ | horarios/ | agenda/
  audit/ | notifications/ | forms/ | shared/
hooks/        # useFunis, useCards, useMoveCard, useNotifications etc
lib/
  supabase/{client,server,admin,middleware}.ts
  automation/{engine,actions,notifications}.ts
  audit/logger.ts
  schemas/   # Zod schemas por domínio
  stores/    # Zustand stores
  utils/     # cn, formatters, slot-generator, permissions
server/      # auth helpers, api-helpers
supabase/migrations/
middleware.ts
```

## 4. Protocolo de Execução (CRÍTICO)

### §1 Pesquisar antes
Antes de criar arquivo, leia 1+ arquivo similar do projeto. Copie o padrão (imports, tipagem, estrutura). NUNCA invente um padrão novo se já existe um equivalente.

### §2 Escopo fechado
Antes de começar, liste explicitamente: arquivos a CRIAR, arquivos a EDITAR. Não toque em nada fora da lista. Se a task exige tocar fora, pare e pergunte.

### §3 Isolamento
- 1 componente = 1 arquivo, ≤ 200 linhas.
- Lógica de negócio em `lib/`, `server/`, `hooks/`. Componente só renderiza.
- Hook só consome `lib/`/`server/`. Não tem regra de negócio.

### §4 Thin client, fat server
- Cliente captura intenção do usuário.
- Validação real, decisões e efeitos no server (route handler ou Server Component).
- Custom fields, automação, RBAC: lógica server-side.

### §5 Não quebrar
- Antes de finalizar, rode `npm run build`.
- Se editar tipo/interface usado em outros arquivos, ache TODOS os consumidores e atualize.
- Se mudar shape de API, atualize cliente correspondente.

## 5. Regras por Camada

### TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`.
- **Sem `any`.** Use `unknown` + narrowing. Se realmente precisar, comente justificativa.
- Path alias: `@/components`, `@/lib`, `@/hooks`, `@/server`, `@/types`.
- Tipos do banco em `lib/database.types.ts` (gerado). Tipos de domínio em `types/domain.ts`.

### React (App Router)
- **Server Component por default.** `"use client"` apenas se houver state, evento, hook de browser.
- **Function declaration** (não arrow function exportada).
- **Named export** (exceto `page.tsx` que precisa default).
- Props tipadas com `interface` no mesmo arquivo.
- Sem `useEffect` para fetch. Use TanStack Query no client OU Server Component.

### Supabase
- `lib/supabase/client.ts` → browser.
- `lib/supabase/server.ts` → Server Components, Route Handlers, Server Actions.
- `lib/supabase/admin.ts` → service role. **NUNCA importar em arquivo client.**
- RLS sempre ativo em produção. Toda nova tabela precisa de RLS antes do merge.

### API Routes
Padrão obrigatório:
```ts
export async function POST(req: NextRequest, { params }) {
  try {
    const ctx = await requireAuth();        // 1. Auth
    const body = await req.json();
    const parsed = schema.safeParse(body);  // 2. Zod
    if (!parsed.success) return badRequest(parsed.error);
    // 3. Business logic
    const result = await ...;
    // 4. Response
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[ROUTE]", err);
    return NextResponse.json({ error: "...", code: "INTERNAL" }, { status: 500 });
  }
}
```

Resposta:
- Sucesso: `{ data: T }`
- Erro: `{ error: string, code: ERR_CODE, details?: object }`

Códigos: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION` (400), `CONFLICT` (409), `BUSINESS_RULE` (422), `AUTOMATION_FAILED` (422), `INTERNAL` (500).

### Estilo
- **Tailwind only.** Zero CSS Modules, zero styled-components.
- **shadcn/ui** para primitivos. Customizar via `components/ui/*.tsx`.
- **Dark mode via `class`** (next-themes). Use `dark:` variants no Tailwind.
- **Identidade ElevenLabs:** preto puro, brancos, cinzas neutros, accent mínimo. Inter como fonte.
- Util `cn()` em `lib/utils/cn.ts` para mesclar classes.

### State Management
- **Server state → TanStack Query 5.** Cache, invalidate após mutation.
- **UI state → Zustand.** Stores em `lib/stores/`. 1 por domínio.
- **Forms → React Hook Form + Zod resolver.** Schema compartilhado client+server.

### Audit Log
Toda mutation relevante chama `logEvent` (`lib/audit/logger.ts`) após sucesso. Falha de log não bloqueia operação principal.

### Engine de Automação
- Roda **síncrono** dentro de `POST /api/cards/[id]/move`.
- Profundidade max 5. Timeout 5s.
- Falhas → `automation_errors` table + UI de retry.
- Adapter de WhatsApp/Instagram é stub no MVP.

## 6. NÃO fazer

- ❌ Usar `any`. Sempre tipar.
- ❌ `useEffect` para fetch. Use TanStack Query.
- ❌ Componente > 200 linhas. Quebre.
- ❌ Commitar `.env.local` ou qualquer secret.
- ❌ `dangerouslySetInnerHTML` salvo render Markdown sanitizado.
- ❌ Imports circulares.
- ❌ `console.log` em prod (apenas `console.error` para erros estruturados).
- ❌ Editar arquivos fora do escopo da task.
- ❌ Refatorar código alheio sem pedir.
- ❌ Inventar padrão se já existe um similar no repo.
- ❌ Lógica de negócio no client.
- ❌ Query complexa via SDK no client (server faz).
- ❌ Mudar tipo público sem atualizar todos os consumidores.
- ❌ Importar `lib/supabase/admin.ts` em arquivo `"use client"`.
- ❌ Expor `SUPABASE_SERVICE_ROLE_KEY` ao browser.
- ❌ UPDATE/DELETE em `audit_log` (RLS bloqueia, mas não tente).

## 7. Padrões de Arquivo

| Tipo | Localização |
|------|-------------|
| Componente de domínio | `components/[domínio]/PascalCase.tsx` |
| Componente UI primitivo | `components/ui/lowercase.tsx` (shadcn convention) |
| Page | `app/(group)/path/page.tsx` |
| Layout | `app/(group)/path/layout.tsx` |
| Route handler | `app/api/[domínio]/route.ts` |
| Hook | `hooks/useCamelCase.ts` |
| Store | `lib/stores/camelCaseStore.ts` |
| Schema Zod | `lib/schemas/dominio.ts` |
| Util | `lib/utils/camelCase.ts` |
| Migration | `supabase/migrations/000N_descricao.sql` |
| Tipo de domínio | `types/domain.ts` (não criar 1 arquivo por tipo) |

## 8. Docs Disponíveis (consultar antes de criar)

- `docs/briefing.md` — escopo do projeto
- `docs/PRD.md` — features, user stories, API routes
- `docs/tech-stack.md` — stack e ADRs
- `docs/architecture.md` — estrutura, patterns, exemplos de código
- `docs/schema.md` — SQL completo (tabelas, RLS, views, seed)
- `docs/security.md` — auth, autorização, validação, checklist pré-deploy
- `docs/ux-flows.md` — rotas, fluxos, padrões de interação
- `docs/TASKS.md` — backlog ordenado, **task atual = próxima não concluída**
- `docs/progress.html` — status visual (gerado, não editar)
- `docs/instrucoes.md` — playbook de uso para o operador
