> 🦅 Falcão | 2026-05-17 | v1.0
> Tipo: refactor (design system)
> Estimativa: 14 tasks, ~6-8h de execução

# CHANGE | Migração do design system para Navy DS

## Contexto

O sistema atual usa um design Apple/iOS (SF Pro, iOS blue #007AFF, superfícies opacas).
O arquivo `design-system.html` define um novo DS chamado **Navy DS**:
- Tipografia **Geist + Geist Mono**.
- Accent **navy** (#2f55d4 dark / #1e3a8a light).
- **Glassmorphism**: superfícies translúcidas com backdrop-blur, sem shadows.
- Tokens em CSS vars (não HSL apenas).
- Componentes novos: segmented control, sliding nav pill, window chrome com traffic lights, pet companion (eye tracker).

### Decisões fechadas com o Bethel (2026-05-17)
1. **Manter Tailwind v3** e adaptar tokens (não migrar para v4).
2. **Dark default** + toggle funcional via next-themes (mudar `defaultTheme` para `"dark"`).
3. Adotar **todos** os elementos opcionais: Geist, glassmorphism em header/sidebar/modais, segmented + nav pill, window chrome + traffic lights + pet companion.

## Análise

### Arquivos a EDITAR
- `app/globals.css` — substituir tokens HSL pelos do Navy DS, manter compat com shadcn via aliases.
- `tailwind.config.ts` — adicionar spacing, radii, easings, durations, animations do Navy DS.
- `app/layout.tsx` — trocar Inter→Geist, JetBrains Mono→Geist Mono, defaultTheme="dark".
- `components/shared/providers.tsx` — passar `defaultTheme="dark"` em ThemeProvider se aplicável.
- `components/ui/button.tsx` — variants alinhadas (primary/secondary/ghost/destructive + sm/lg/icon).
- `components/ui/input.tsx`, `textarea.tsx`, `select.tsx` — altura 40px, focus accent, error state.
- `components/ui/badge.tsx` — variants default/success/warning/danger/accent/solid-accent/outline + bolinha antes.
- `components/ui/dialog.tsx`, `sheet.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `alert-dialog.tsx` — glass surface + 18px radius + scale-in.
- `components/ui/tabs.tsx` — accent underline pill.
- `components/ui/avatar.tsx` — accent bg, white text, status dot.
- `components/ui/switch.tsx` — track 38x22, thumb 18x18.
- `components/ui/separator.tsx` — usar hairline.
- `components/ui/skeleton.tsx` — superfície translúcida.
- `components/ui/toast.tsx` (Sonner override em layout.tsx) — alinhar com `.toast--success/error/info`.
- `components/layout/header.tsx` — glass + sticky + brand mark navy + brand tag mono.
- `components/layout/sidebar.tsx` — 220px, sidebar-item com barra accent à esquerda no ativo.
- `components/layout/theme-toggle.tsx` — sol/lua, animação spring.
- `components/shared/empty-state.tsx`, `loading-spinner.tsx`, `data-table.tsx` — apenas re-skin de tokens.
- Domínio (apenas onde tokens forçarem ajuste visível):
  - `components/kanban/kanban-card.tsx`, `kanban-column.tsx`, `kanban-board.tsx`
  - `components/agenda/*` — overrides do react-big-calendar em globals.css
  - `components/funis/*`, `components/horarios/*`, `components/users/*`, `components/notifications/*`, `components/audit/*`

### Arquivos a CRIAR
- `components/ui/segmented.tsx` — segmented control macOS-style.
- `components/ui/nav-pill.tsx` — navbar com sliding indicator (Framer Motion `layoutId`).
- `components/ui/window.tsx` — chrome com traffic lights (decorativo, opcional em modais).
- `components/ui/stat.tsx` — KPI card (label uppercase + value tnum + trend up/down).
- `components/shared/pet-companion.tsx` — eye tracker (fixed bottom-right, states: tracking/greeting/happy/bored/sleeping/suspicious).
- `lib/utils/copy-token.ts` — helper opcional para devtools de design (skip se fora de escopo).
- `docs/design-system.md` — referência viva dos tokens + componentes (snapshot do Navy DS adaptado).

### Arquivos a NÃO TOCAR
- `app/api/**`, `server/**`, `lib/supabase/**`, `lib/automation/**`, `lib/audit/**`, `lib/schemas/**`, `supabase/migrations/**`, `middleware.ts`, `next.config.js`, todos os hooks de dados.
- Lógica de negócio em geral. Só visual.

### Dependências novas
- `geist` (npm) — fornece `geist/font/sans` e `geist/font/mono` para Next.js sem fetch externo.

### Dependências removíveis (avaliar ao final)
- `@types/react-big-calendar` permanece (calendar segue).
- Inter via `next/font/google` sai de uso (mas pode ficar caso queiramos fallback).

### Riscos
- **Quebra visual em massa**: 100% das telas mudam. Cada feature precisa de smoke test visual.
- **Contraste em focus/hover** com novas cores translúcidas — validar a11y (4.5:1).
- **Shadcn primitives** assumem `bg-background` / `text-foreground` em hsl. Se trocarmos para rgba puro, várias classes quebram. **Mitigação:** mapear os tokens HSL existentes para hex/rgba equivalente do Navy DS dentro de `:root` e `.dark`, mantendo o nome das CSS vars.
- **Glass com backdrop-filter** tem custo de paint — testar performance em kanban com 100+ cards.
- **Pet companion** com SVG + mousemove pode atrapalhar em telas densas (kanban, agenda). Escondê-lo nessas rotas via flag.
- **Calendar (react-big-calendar)** já tem overrides — refazer mantendo paridade.

## Tasks

### NAVY-1 ⬜ Foundation: tokens, fonts, base styles
**CRIAR:** `docs/design-system.md` (referência viva)
**EDITAR:** `app/globals.css`, `tailwind.config.ts`, `app/layout.tsx`, `package.json`
**LER:** `design-system.html`, `app/globals.css` (atual), `tailwind.config.ts` (atual)
**NÃO TOCAR:** components, api, lib
**Steps:**
1. `npm install geist` (já configurado para Tailwind v3).
2. Em `app/globals.css`:
   - Manter `@tailwind base/components/utilities`.
   - Substituir todos os tokens dentro de `:root` e `.dark` mapeando para os do Navy DS. Estratégia: manter os nomes das vars do shadcn (`--background`, `--foreground`, `--primary`, etc) apontando para os valores correspondentes do Navy DS, e adicionar as vars novas do Navy DS em paralelo (`--surface`, `--surface-elevated`, `--surface-glass`, `--hairline`, `--accent-soft`, `--accent-glow`, `--accent-tint`, `--success-soft`, `--warning-soft`, `--danger-soft`, `--text-secondary`, `--text-muted`, `--inner-light`, `--window-tint`, `--ease`, `--ease-spring`, `--ease-out-expo`, `--dur-fast`, `--dur`, `--dur-slow`, `--dur-spring`, `--z-*`).
   - `--background` dark = `#060812` (Navy bg-solid).
   - `--primary` (e `--accent`, `--ring`) = navy `#2f55d4` em dark, `#1e3a8a` em light.
   - `--card`, `--popover`, `--secondary`, `--muted` apontam para `surface-elevated`/`surface`.
   - `--destructive`, `--success`, `--warning` (novo) usam tokens Navy.
   - `--border` = `rgba(255,255,255,0.08)` dark / `rgba(10,14,30,0.08)` light. (Atenção: shadcn usa `hsl(var(--border))`. Mantemos compat usando `--border-rgb` ou convertendo Navy borders para HSL aproximado.)
   - **Subdecisão:** para evitar quebra de `hsl(var(--x))` em shadcn, manter os shadcn tokens em HSL (já compatíveis) mas com valores Navy. Vars rgba/translúcidas extras (`--surface`, `--surface-glass`, `--hairline`, etc) ficam separadas em rgba puro e são consumidas via Tailwind arbitrary values (`bg-[hsl(var(--surface))]` não — usar `bg-[var(--surface)]`).
   - Reset/base: scrollbar Navy, `:focus-visible` accent 2px, reduced-motion.
3. Em `tailwind.config.ts`:
   - Adicionar `colors.surface`, `colors.surface-elevated`, `colors.surface-glass`, `colors.hairline`, `colors.success-soft`, `colors.warning-soft`, `colors.danger-soft`, `colors.accent-soft`, `colors.accent-glow`, `colors.accent-tint` referenciando `var(--surface)` etc. (não hsl).
   - `borderRadius` atualizar: sm=8, md=12, lg=16, xl=22, pill="999px".
   - `transitionTimingFunction`: `ease: cubic-bezier(0.2,0.8,0.2,1)`, `ease-spring`, `ease-out-expo`.
   - `transitionDuration`: `fast: 120ms`, `DEFAULT: 200ms`, `slow: 320ms`, `spring: 420ms`.
   - `letterSpacing`: manter wider/widest atuais (Navy usa 0.08em uppercase, igual).
   - `fontFamily.sans`: `["var(--font-geist-sans)", "system-ui", "sans-serif"]`.
   - `fontFamily.mono`: `["var(--font-geist-mono)", "ui-monospace", "monospace"]`.
   - Manter keyframes existentes + adicionar `pet-nod`, `toast-in`, `toast-out`, `zzz-float`.
4. Em `app/layout.tsx`:
   - Trocar `Inter`/`JetBrains_Mono` de `next/font/google` por `import { GeistSans } from "geist/font/sans"; import { GeistMono } from "geist/font/mono";`.
   - `<html className={`${GeistSans.variable} ${GeistMono.variable}`}>`.
   - `<body className="min-h-screen bg-background font-sans text-foreground antialiased">`.
   - Toaster mantém `richColors closeButton position="bottom-right"`.
5. Em `components/shared/providers.tsx`: garantir `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>`.
6. `npm run build`.

**Critério:** Build passa. Página inicial carrega com fundo `#060812`, texto `#f3f5fb`, fonte Geist. Toggle dark/light troca via classe `.dark` em `<html>`.

---

### NAVY-2 ⬜ shadcn primitivos — Button, Input, Textarea, Select, Label
**CRIAR:** —
**EDITAR:** `components/ui/button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `label.tsx`
**LER:** `design-system.html` (seções Buttons, Forms), `components/ui/button.tsx` atual
**NÃO TOCAR:** consumidores.
**Steps:**
1. `button.tsx`: variants `primary` (accent solid), `secondary` (surface-elevated + border-strong), `ghost`, `destructive` (danger-soft), `outline`, `link`. Size `sm` (28px), `default` (36px), `lg` (44px), `icon` (square = size). `:active` aplica `scale-[0.96] transition-transform duration-[70ms]`. Radius `rounded-[9px]` no default; `rounded-[7px]` sm; `rounded-[11px]` lg.
2. `input.tsx`: altura 40px, font 14px, border `border-strong`, focus `border-accent ring-2 ring-accent/20 outline-none`, error state via prop `aria-invalid` que aplica `border-danger`.
3. `textarea.tsx`: idem input com min-h-[88px] e resize-y.
4. `select.tsx`: trigger igual ao input; conteúdo glassmorphism (ver NAVY-4).
5. `label.tsx`: 12px, font-medium, text-secondary.

**Critério:** Storybook visual (login form): inputs e botões batem com o HTML reference. Active state encolhe 4%.

---

### NAVY-3 ⬜ shadcn primitivos — Badge, Avatar, Switch, Separator, Skeleton, Tabs
**CRIAR:** —
**EDITAR:** `components/ui/badge.tsx`, `avatar.tsx`, `switch.tsx`, `separator.tsx`, `skeleton.tsx`, `tabs.tsx`
**LER:** `design-system.html`
**Steps:**
1. `badge.tsx`: 7 variants (`default`, `success`, `warning`, `danger`, `accent`, `solid-accent`, `outline`). Cada uma com background `*-soft`, text `*`. Bolinha 5×5 `currentColor` antes do conteúdo via pseudo (`::before` não dá em React — usar `<span aria-hidden className="size-1.5 rounded-full bg-current"/>` interno). Pill radius, mono font 11px.
2. `avatar.tsx`: variants sm/md/lg; fallback bg accent + text white; opcional `status` prop (online/offline → dot success na borda).
3. `switch.tsx`: track 38×22 `border-strong`, thumb 18×18 branco, translate-x-[16px] no checked, bg `accent` no checked.
4. `separator.tsx`: usar `hairline` token.
5. `skeleton.tsx`: bg `surface-elevated`, animação shimmer leve.
6. `tabs.tsx`: TabsList sem bg; TabsTrigger 13px secondary text + `data-[state=active]:text-foreground` + after underline accent 2px pill.

**Critério:** Visualmente bate com o HTML. A11y mantida (focus visible).

---

### NAVY-4 ⬜ Overlays glassmorphism — Dialog, Sheet, Popover, Dropdown, AlertDialog
**CRIAR:** —
**EDITAR:** `components/ui/dialog.tsx`, `sheet.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `alert-dialog.tsx`
**LER:** `design-system.html` (Modal, Dropdown sections)
**Steps:**
1. Overlay: `bg-[#000]/55 backdrop-blur-[8px]`.
2. Content surfaces: `bg-[var(--surface-elevated)] backdrop-blur-[24px] saturate-[160%] border border-[var(--border-strong)] rounded-[18px]`.
3. Modal padding 28px; Sheet sem mudar largura padrão; Popover/Dropdown min-w-[220px], radius 12px, padding 5px, items 8px 10px 13px secondary→primary on hover.
4. Animações: scale-in 260ms ease-out-expo; sheet slide-in side-aware.
5. Trocar shadows existentes do shadcn por `border border-[var(--border-strong)]` apenas.

**Critério:** Modal abre com scale spring; dropdown tem glass blur; nenhum shadow visível.

---

### NAVY-5 ⬜ Componentes novos — Segmented + NavPill + Window + Stat
**CRIAR:** `components/ui/segmented.tsx`, `nav-pill.tsx`, `window.tsx`, `stat.tsx`
**LER:** `design-system.html` (Segmented, Navbar, Window sections)
**Steps:**
1. `segmented.tsx`: API `<Segmented options={[{label, value}]} value onValueChange>`. Track 3px padding, items 6px 14px 12.5px, active = `bg-[var(--surface-solid)] border-[var(--border-strong)] text-foreground`. Headless via Radix `RadioGroup` por baixo.
2. `nav-pill.tsx`: lista de links com `<NavPillItem>`. Indicador animado via Framer Motion `motion.div` com `layoutId="nav-pill-indicator"` (sem mexer em rect manual). Active gets accent-soft bg + accent text + dot abaixo. Suporta `useSelectedLayoutSegment()` para destacar rota atual.
3. `window.tsx`: wrapper com chrome (traffic lights opcionais via prop `chrome`). Usado em landing/showcase, opcional em modais.
4. `stat.tsx`: `<Stat label value trend="up|down" trendValue />`. `tabular-nums` no valor (font-feature-settings ou Tailwind `tabular-nums`).

**Critério:** Renderiza standalone; segmented troca estado; nav-pill anima entre itens com spring.

---

### NAVY-6 ⬜ Layout shell — Header, Sidebar, ThemeToggle, NotificationBell, UserMenu
**CRIAR:** —
**EDITAR:** `components/layout/header.tsx`, `sidebar.tsx`, `theme-toggle.tsx`, `notification-bell.tsx`, `sidebar-user-card.tsx`
**LER:** `design-system.html` (Header, Sidebar sections)
**NÃO TOCAR:** roteamento.
**Steps:**
1. Header: `sticky top-0 z-50 backdrop-blur-[10px] bg-[var(--surface)] border-b border-[var(--hairline)]`. Max-w 1440 inner. Brand mark 32×32 squircle accent + título + tag mono opcional.
2. Sidebar: largura 220 (collapse 64), bg `var(--surface-elevated)`, border `var(--border)`, radius 14, padding 12. SidebarTitle uppercase 11px 0.1em muted. SidebarItem: 8x10 padding, 13px, secondary→primary hover, ativo `bg-[var(--accent-soft)] text-accent` + barra 3×18 accent à esquerda (`relative` + `before`).
3. ThemeToggle: sol/lua com animação spring; usa `useTheme()` do next-themes; aria-label correto.
4. NotificationBell: badge contador via tokens accent.
5. UserCard no rodapé sidebar: avatar + nome + dropdown.

**Critério:** Layout fiel ao showcase. Glass do header funciona em scroll.

---

### NAVY-7 ⬜ Sonner Toaster customizado
**CRIAR:** —
**EDITAR:** `app/layout.tsx` (Toaster opts), opcional `components/shared/sonner-overrides.css`
**Steps:**
1. Toaster com `toastOptions={{ className: "...", style: { ... } }}` mapeando para `--surface-elevated` + `--border-strong` + radius 12. Ícones por tipo (success/error/info) com `--success-soft` etc.
2. Substituir `richColors` pelo override próprio se a paleta default brigar com Navy.

**Critério:** `toast.success("ok")` aparece com card glass + ícone verde-soft + slide-in da direita.

---

### NAVY-8 ⬜ Kanban — board, column, card, modal
**CRIAR:** —
**EDITAR:** `components/kanban/*.tsx`, `components/kanban/automation-error-banner.tsx`
**LER:** `components/kanban/kanban-board.tsx` atual
**NÃO TOCAR:** `hooks/useCards.ts`, `useMoveCard.ts`, lógica dnd.
**Steps:**
1. Column header: nome + count badge (`badge--default`) + cor da etapa (bolinha 6×6).
2. Card: bg `surface-elevated`, border `border` → hover `border-strong`, radius 12, padding 14, label do lead 14px 500, custom fields em mono small.
3. Drag state: `is-dragging` → opacity 0.6 + scale-[0.98].
4. Card modal: usar Sheet glass (NAVY-4); tabs internos com NAVY-3 tabs.
5. AutomationErrorBanner: bg `danger-soft`, border `danger`, ícone alerta, botão retry `btn--ghost`.

**Critério:** Kanban com 50+ cards mantém 60fps em scroll. Drag dispara automação como antes.

---

### NAVY-9 ⬜ Agenda — calendar overrides
**CRIAR:** —
**EDITAR:** `app/globals.css` (bloco `.rbc-*`), `components/agenda/agenda-calendar.tsx`, `agendar-call-modal.tsx`, `call-detail-modal.tsx`
**Steps:**
1. Reescrever overrides do react-big-calendar usando tokens Navy: borders `hairline`, header uppercase muted 11px, today `accent-soft`, event `accent` solid pill com radius 8.
2. Toolbar buttons → mapear para `btn--secondary`.
3. Toggle de visão (month/week/day) usar `Segmented` (NAVY-5).
4. Modais usam Sheet glass.

**Critério:** Calendário renderiza com paleta Navy, sem cores vibrantes vazadas.

---

### NAVY-10 ⬜ Forms de domínio — Funis, Usuários, Horários, Configurações, Perfil
**CRIAR:** —
**EDITAR:** `components/funis/*`, `components/users/*`, `components/horarios/*`, `components/configuracoes/*`, `components/profile/*`, `components/forms/*`
**Steps:**
1. Substituir bordas/backgrounds inline por classes que consomem tokens novos (não tocar lógica de RHF/Zod).
2. CustomFieldInput: usar inputs NAVY-2; selects glass.
3. Etapa list e custom fields builder: cards `surface-elevated` com dnd indicador `border-accent`.
4. AvatarUpload: dropzone com `border-dashed border-strong`.

**Critério:** Cada form abre e salva como antes; visual coerente.

---

### NAVY-11 ⬜ Listagens secundárias — Notifications, Audit, Empty/Loading, DataTable
**CRIAR:** —
**EDITAR:** `components/notifications/*`, `components/audit/*`, `components/shared/empty-state.tsx`, `loading-spinner.tsx`, `data-table.tsx`
**Steps:**
1. NotificationBell já feito em NAVY-6. NotificationDropdown: lista glass, item hover surface-glass, unread dot accent.
2. AuditTable / HistoricoTable: usar `<Table>` NAVY (já em components/ui? se não existir, criar) com header uppercase 11px, cell 13, hover row `surface-glass`.
3. EmptyState: ícone Lucide grande muted + título 18 + descrição secondary + CTA `btn--primary`.
4. LoadingSpinner: `border-2 border-accent border-t-transparent` 16×16.
5. DataTable: paginação `btn--secondary sm`.

**Critério:** Histórico filtrável e dropdown de notificações alinhados com Navy.

---

### NAVY-12 ⬜ Telas de auth — Login, Setup, Forgot, Reset
**CRIAR:** —
**EDITAR:** `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `setup/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`
**Steps:**
1. Layout: gradient bg via `bg-gradient-to-br from-[var(--bg-grad-1)] to-[var(--bg-grad-2)]`. Centralizado, card central glass max-w-[420px] radius-[18px] padding 28.
2. Brand mark no topo.
3. Inputs NAVY-2 com floating label opcional (decoração).
4. Botão submit `btn--primary` lg full-width.

**Critério:** Login com Navy fica bonito em dark + light.

---

### NAVY-13 ⬜ Pet companion + Window chrome (decorações)
**CRIAR:** `components/shared/pet-companion.tsx`, `components/ui/window.tsx` (já listado NAVY-5; se ainda não criado, criar aqui)
**EDITAR:** `app/(dashboard)/layout.tsx` (renderizar pet apenas em rotas leves)
**Steps:**
1. PetCompanion: SVG fixo bottom-right `pointer-events-none`. Estado: tracking/greeting/happy/bored/sleeping/suspicious. `mousemove` no window → ajusta pupilas via `requestAnimationFrame`. Timers idle (1s bored, 3s sleeping). Ouve clicks em `button` → happy + nod animation. Esconder em `/crm/[funilId]` e `/agenda` via condicional `usePathname`.
2. Window chrome: usado em telas decorativas (ex.: empty state ilustrativo). Opcional.

**Critério:** Pet aparece em /dashboard, /perfil, /admin/*; some no kanban e agenda.

---

### NAVY-14 ⬜ Docs + smoke + cleanup
**CRIAR:** `docs/design-system.md` (se não criado em NAVY-1)
**EDITAR:** `README.md` (link para design-system.md), `docs/tech-stack.md` (atualizar fonte/tokens), `docs/architecture.md` se necessário, remover Inter/JetBrains imports se ainda houver.
**Steps:**
1. `docs/design-system.md`: lista de tokens, screenshot/print do showcase, mapeamento componentes Navy → arquivos do projeto.
2. README: mencionar Geist + Navy + dark default.
3. Tech-stack: atualizar seção 3 (paleta) e ADR-010 (Geist substitui Inter).
4. Manter `design-system.html` no repo como referência viva (em `docs/`).
5. `npm run lint && npx tsc --noEmit && npm run build`.
6. Smoke manual (mesmo roteiro do `docs/CHECKLIST.md` §2).

**Critério:** Build limpo, smoke OK, docs atualizados.

---

## Validação final

- [ ] `npm run build` passa.
- [ ] `npx tsc --noEmit` passa.
- [ ] `npm run lint` passa.
- [ ] Login carrega com gradient bg + card glass + inputs Navy.
- [ ] Dashboard mostra sidebar com barra accent no ativo + header glass.
- [ ] Kanban renderiza 30+ cards sem jank; drag funciona; modal abre em sheet glass.
- [ ] Agenda renderiza eventos com paleta Navy; toggle de visão via segmented.
- [ ] Modal de novo funil + criação de etapa OK; custom fields builder funciona.
- [ ] Toggle dark/light alterna toda a UI sem flash de cor errada.
- [ ] Toast success/error/info aparece com cores e blur certos.
- [ ] Notificações em tempo real seguem aparecendo (Realtime Supabase).
- [ ] Pet companion segue cursor em rotas permitidas; some em kanban/agenda.
- [ ] A11y: tab navega em todos os interativos, focus ring accent visível, contraste 4.5:1 em texto principal.

## Pós-execução: Git

Esta pasta NÃO é um repositório git ainda. Pós aprovação do plano:
1. `git init` na raiz.
2. Confirmar `.gitignore` cobre `.env*`, `node_modules/`, `.next/`, `.vercel/`, `.DS_Store`.
3. Commit inicial em `main` com o estado pré-mudança (snapshot).
4. Criar branch `feat/navy-ds-redesign`.
5. Executar as 14 tasks.
6. Commit por bloco lógico (1 commit por task ou agrupado por wave).
7. `git remote add origin https://github.com/TomasBalestrin/gestao-4.0.git`.
8. `git push -u origin main` (snapshot).
9. `git push -u origin feat/navy-ds-redesign` (PR alvo).
10. Bethel abre PR no GitHub manualmente OU usamos `gh pr create` se `gh` estiver autenticado.

**Atenção credenciais**: se push pedir auth, parar e pedir token ao Bethel — não usar `.env` ou métodos inseguros.
