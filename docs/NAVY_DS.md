# Navy DS — Migração v2

> 2026-05-18 · Migração visual do shell Gestão 4.0 para o **Navy Design System** (referência em `design-system.html`).

## Resumo

Substituição da paleta neutra/ElevenLabs por **navy 1e3a8a (light) / 2f55d4 (dark)** sobre fundos escuros com superfícies translúcidas (glassmorphism) e tipografia **Geist Sans/Mono**. Manteve a estrutura de pastas (`components/ui`, `components/layout`, etc.) e o contrato dos componentes shadcn — só re-skin de tokens + alguns novos primitivos.

## O que mudou

### Foundation
- `app/globals.css` — tokens reescritos: HSL para shadcn + variáveis translúcidas (`--surface`, `--accent-soft`, `--hairline`, `--inner-light`, etc.) + motion (`--ease`, `--dur`) + overrides do `react-big-calendar` + animations do pet.
- `tailwind.config.ts` — radius novos (8, 12, 16, 22, pill), `transitionTimingFunction.out-expo / spring`, durations nomeadas (`fast/slow/spring`), cores `navy`, `success`, `warning`, `danger`, `surface`, `text.*`, z-index nomeados, keyframes (`fade-up`, `scale-in`, `pet-nod`, `ring-pulse`).
- `app/layout.tsx` — Geist Sans + Geist Mono via `next/font/google` (variável `--font-geist-sans` / `--font-geist-mono`). Toaster com classes glass.
- `components/shared/providers.tsx` — `enableSystem={false}` (dark é o default puro).

### Primitivos re-skinados (shadcn)
- `components/ui/button.tsx` — variants `default | primary | secondary | ghost | outline | destructive`, sizes `sm | default | lg | icon | icon-sm | icon-lg`, active scale spring.
- `components/ui/input.tsx`, `textarea.tsx`, `select.tsx`, `label.tsx` — bordas Navy, hover/focus tokens, radius 9px, h-10.
- `components/ui/badge.tsx` — variants `default | success | warning | danger | accent | solid-accent | outline`, prop `dot` para bolinha de status.
- `components/ui/avatar.tsx` — `size: sm | md | lg | default`, `<AvatarStatus />` para indicador.
- `components/ui/switch.tsx` — h-22 w-38 com Navy.
- `components/ui/tabs.tsx` — underline-style Apple, indicador de barra animado no `data-state=active`.
- `components/ui/skeleton.tsx`, `separator.tsx` — tokens (`--hairline`, `--surface-elevated`).
- `components/ui/dialog.tsx`, `sheet.tsx`, `alert-dialog.tsx`, `popover.tsx`, `dropdown-menu.tsx` — **glass** (backdrop-blur 24px + saturate 160%), overlay `bg-black/55 backdrop-blur-[8px]`, radius 12-18, z-index nomeados.

### Componentes novos (`components/ui/*`)
- `segmented.tsx` — `<Segmented options value onValueChange />` para filtros mês/semana/dia e por-data/por-closer.
- `nav-pill.tsx` — `<NavPill>` + `<NavPillItem>` com indicador `motion` (springy) para tab bars horizontais.
- `window.tsx` — `<Window title chrome>` com chrome macOS (semáforo). Use em vazios de auth/wizard.
- `stat.tsx` — `<Stat label value trend trendValue hint />` para dashboards admin/closer.

### Layout shell
- `components/layout/header.tsx` — `glass-light` sticky (não usa `bg-card` mais).
- `components/layout/sidebar.tsx` — `bg-[var(--surface-elevated)]`, active state com barra vertical de 3px à esquerda + bg `--accent-soft` + text `text-primary`.
- `components/layout/sidebar-user-card.tsx` — avatar `size=md`, labels com `text-text-secondary`.
- `components/layout/notification-bell.tsx` — badge font-mono navy.

### Domínios
- Kanban (`components/kanban/*`) — colunas com `bg-[var(--surface)]`, headers com texto uppercase tracking-wider, badge count em pill `font-mono`, cards com hover de border `--border-strong` e dados de contato em mono 11px.
- Auth (`app/(auth)/*`) — `<Window>`-like via `glass` wrapper, brand mark squircle navy, gradient radial no layout.
- `app/(dashboard)/layout.tsx` — alerta mobile com tokens `--warning-*`; **PetCompanion** injetado.

### Pet companion (`components/shared/pet-companion.tsx`)
SVG fixo no canto inferior direito (z-600). Estados: `greeting` (intro 2.2s), `tracking` (pupilas seguem cursor), `happy` (anima `pet-nod` 800ms em qualquer click/keyboard), `bored` (idle 1s), `sleeping` (idle 3s, com `z` em loop). **Oculto em `/crm/[funilId]` e `/agenda`** para não atrapalhar drag-and-drop e o calendar.

## Utilidades CSS

```css
.glass           /* surface elevated + blur 24px + saturate 160% + border 0.5px */
.glass-light     /* surface lighter + blur 10px, usar em header sticky */
.brand-mark      /* squircle navy 22.37% radius com texto mono */
.squircle        /* só a forma 22.37% */
```

## Como usar os novos componentes

```tsx
import { Segmented } from "@/components/ui/segmented";
import { NavPill, NavPillItem } from "@/components/ui/nav-pill";
import { Window } from "@/components/ui/window";
import { Stat } from "@/components/ui/stat";

<Segmented
  options={[
    { value: "mes", label: "Mês" },
    { value: "semana", label: "Semana" },
    { value: "dia", label: "Dia" },
  ]}
  value={view}
  onValueChange={setView}
/>

<NavPill aria-label="Tabs do card">
  <NavPillItem href="#detalhes" active>Detalhes</NavPillItem>
  <NavPillItem href="#calls">Calls</NavPillItem>
  <NavPillItem href="#historico">Histórico</NavPillItem>
</NavPill>

<Window title="Novo funil">
  ...form
</Window>

<Stat label="Cards ativos" value="284" trend="up" trendValue="+12%" hint="vs semana anterior" />
```

## Tokens chave (ver `globals.css`)

| Token | Light | Dark |
|-------|-------|------|
| `--navy` | `#1e3a8a` | `#2f55d4` |
| `--surface-elevated` | `rgba(255,255,255,0.92)` | `rgba(28,36,64,0.72)` |
| `--accent-soft` | `rgba(30,58,138,0.10)` | `rgba(47,85,212,0.18)` |
| `--hairline` | `rgba(10,14,30,0.06)` | `rgba(255,255,255,0.06)` |
| `--text-primary` | `#0a0e1e` | `#f3f5fb` |
| `--text-secondary` | `#4a5570` | `#aab3c8` |
| `--text-muted` | `#8a94a8` | `#6b7592` |
| `--ease-out-expo` | `cubic-bezier(0.22, 1, 0.36, 1)` | — |

## Build & Smoke

- `npm run build` — passa ✓ (Next 14 App Router).
- Smoke recomendado: `/login` → dashboard → CRM → arrastar card → abrir card-modal → agenda mês/semana/dia → admin/funis → admin/usuarios → perfil → toggle tema light/dark em cada uma → confirmar pet companion aparece fora de `/crm/*` e `/agenda`.

## O que NÃO mudou

- API routes, hooks, lógica de negócio.
- RLS, migrations.
- Layout responsivo (desktop-first como antes).
- Drag-and-drop dnd-kit, TanStack Query, RHF+Zod, Sonner — nenhuma dep removida.

## Migração manual mínima de telas extras

Telas/componentes não cobertos no sweep automatizado vão herdar a paleta automaticamente porque consomem `bg-card`, `text-foreground`, `border` etc. — apenas tokens HSL trocaram. Para hardcodes restantes, substituir manualmente:

```
text-destructive          → text-[color:var(--danger-color)]
bg-destructive            → bg-[color:var(--danger-color)]
text-sm text-muted-foreground → text-[13px] text-text-secondary
rounded-lg border bg-card → glass / rounded-[12px] bg-[var(--surface-elevated)]
```
