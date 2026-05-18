# CHANGE | Fix dropdown bugado + remove dark mode + performance polish

> Falcao | 2026-05-18 1500 | v1.0
> Tipo: bug + refactor + performance
> Estimativa: 3 tasks, ~30 min

## Contexto

Apos o redesign Apple/iOS (commit `30e0765`) o sistema:
1. **Dropdown bugado**: opcoes do `<Select>` nao aparecem (ficam cortadas).
2. **Lentidao perceptivel**: sensacao geral de travamento.
3. **Dark mode**: nao queremos mais. Sistema light-only.

Diagnostico do dropdown: `components/ui/select.tsx` linha 89 aplica
`h-[var(--radix-select-trigger-height)]` no `<SelectPrimitive.Viewport>`, o
que forca a altura do viewport scrollavel a ser igual a altura do TRIGGER
(~40px), cortando os items. Bug copy/paste de versao antiga do shadcn.
`popover.tsx` e `dropdown-menu.tsx` foram auditados e nao tem o mesmo bug.

Diagnostico da lentidao (sem area especifica reportada):
- `.glass` em `app/globals.css` usa `backdrop-filter: blur(40px) saturate(180%)`,
  caro em qualquer composicao com muitos elementos atras.
- Keyframe `ring-pulse` anima `box-shadow` infinitamente — `box-shadow` forca
  repaint a cada frame.
- Animations principais (fade-up 420ms, slide-up 360ms, scale-in 260ms) sao
  longas demais pra UI utilitaria.
- `font-feature-settings: "ss01", "cv11", "ss03"` aplicado no body sem
  necessidade real (features de Inter especificas).
- Animations em primitivos shadcn (`data-[state=open]:animate-in...` em select,
  popover, dropdown-menu) tem multiplas transformacoes encadeadas (fade + zoom
  + slide). Mantemos por padronizacao, mas reduzimos a duracao base.

Diagnostico do dark mode no estado atual:
- `ThemeProvider` (next-themes) montado em `components/shared/providers.tsx`
  com `defaultTheme="dark"`, `enableSystem`.
- `app/layout.tsx` tem `suppressHydrationWarning` (necessario por causa do
  next-themes).
- `tailwind.config.ts` com `darkMode: "class"`.
- `app/globals.css` tem `:root` (light) + `.dark { ... }` (dark) + variants
  `.dark .glass / .dark .brand-mark / .dark .squircle`.
- 9 `dark:` variants espalhadas em 9 arquivos (badges/labels verdes).
- `components/layout/header.tsx` linha 43 renderiza `<ThemeToggle />`.
- `components/layout/theme-toggle.tsx` componente isolado.
- `package.json` tem `next-themes`.

## Analise

### EDITAR
- `components/ui/select.tsx` (CHANGE-1) — fix Viewport.
- `app/globals.css` (CHANGE-2 + CHANGE-3) — apagar bloco `.dark`, simplificar
  `.glass`, remover `ring-pulse`, remover `font-feature-settings`.
- `tailwind.config.ts` (CHANGE-2 + CHANGE-3) — remover `darkMode: "class"`,
  reduzir durations, remover keyframe `ring-pulse`.
- `components/shared/providers.tsx` (CHANGE-2) — remover ThemeProvider.
- `app/layout.tsx` (CHANGE-2) — remover `suppressHydrationWarning`.
- `components/layout/header.tsx` (CHANGE-2) — remover import e uso de
  ThemeToggle.
- `package.json` (CHANGE-2) — remover `next-themes`.
- 9 arquivos com `dark:` variant (CHANGE-2):
  - `app/(dashboard)/layout.tsx:42`
  - `app/(dashboard)/closer/page.tsx:204`
  - `components/horarios/horario-config-view.tsx:60`
  - `components/horarios/closer-card.tsx:31`
  - `components/horarios/horario-slot-picker-modal.tsx:487`
  - `components/profile/profile-sheet.tsx:230`
  - `components/users/edit-user-modal.tsx:230`
  - `components/users/whatsapp-section.tsx:12`
  - `lib/utils/format-call.ts:12`

### DELETAR
- `components/layout/theme-toggle.tsx`

### NAO TOCAR
- Schemas, API routes, hooks, lib/automation, lib/audit. Mudanca e puramente
  visual/UI/config.
- Paleta Apple/iOS atual mantida intacta.

### Riscos
- Build pode quebrar se alguma referencia a next-themes ficou esquecida.
  Mitigacao: grep + tsc.
- npm install com `next-themes` removido precisa rodar.
- Visual no light mode pode ter sido testado pouco (defaultTheme="dark"). Pode
  expor inconsistencias antes ocultas no dark.

## Tasks

### CHANGE-1 Fix bug do Select Viewport
**EDITAR**: `components/ui/select.tsx`
**Steps**:
1. Na `SelectContent`, na classe da `SelectPrimitive.Viewport` (linha 88-89),
   remover `h-[var(--radix-select-trigger-height)]`. Manter
   `w-full min-w-[var(--radix-select-trigger-width)]`.
**Criterio**: abrir um Select, todas as opcoes aparecem (nao cortadas).

### CHANGE-2 Remover dark mode
**EDITAR**: `app/globals.css`, `tailwind.config.ts`,
`components/shared/providers.tsx`, `app/layout.tsx`,
`components/layout/header.tsx`, `package.json`, 9 arquivos com `dark:`.
**DELETAR**: `components/layout/theme-toggle.tsx`
**Steps**:
1. `app/globals.css`: apagar bloco `.dark { ... }` (linhas 54-98). Apagar
   `.dark .glass`, `.dark .brand-mark`, `.dark .squircle`.
2. `tailwind.config.ts`: remover `darkMode: "class"`.
3. `components/shared/providers.tsx`: remover import e wrapper
   `<ThemeProvider>`. Retornar apenas `<QueryClientProvider>`.
4. `app/layout.tsx`: remover `suppressHydrationWarning` do `<html>`.
5. `components/layout/header.tsx`: remover `import { ThemeToggle }` e o uso
   na linha 43.
6. Deletar `components/layout/theme-toggle.tsx`.
7. Apagar `dark:` variant nas 9 ocorrencias (substitui por nada, mantendo
   classes light que ja existem antes do `dark:`).
8. `package.json`: remover `"next-themes": "..."` da seccao `dependencies`.
9. Rodar `npm install` para sincronizar `package-lock.json`.
**Criterio**: build passa; nao ha import de next-themes; visual identico ao
light mode atual em todas as telas.

### CHANGE-3 Performance polish (sem mudar visual)
**EDITAR**: `app/globals.css`, `tailwind.config.ts`
**Steps**:
1. `app/globals.css`: simplificar `.glass` — `backdrop-filter: blur(40px)
   saturate(180%)` -> `backdrop-filter: blur(12px) saturate(140%)`.
2. `app/globals.css`: remover `font-feature-settings: "ss01", "cv11", "ss03"`
   do body (mantem antialiased + letter-spacing).
3. `tailwind.config.ts`: remover keyframe `ring-pulse` e animation
   `ring-pulse` (nao tem uso registrado).
4. `tailwind.config.ts`: reduzir durations:
   - `fade-up` 420ms -> 220ms
   - `slide-up` 360ms -> 200ms
   - `scale-in` 260ms -> 160ms
**Criterio**: build passa; abrir modais e dropdowns sente responsivo (sem
visual mudado).

## Validacao final
- [ ] `npx tsc --noEmit` passa.
- [ ] `npm run build` passa.
- [ ] `grep -r "next-themes\|useTheme\|ThemeProvider\|ThemeToggle\|dark:"` nao
  retorna nada relevante.
- [ ] Manual smoke: abrir Select (campos do form de Lead), todas as opcoes
  aparecem. Abrir Popover (notification bell), abre normal. Sistema em light
  mode em todas as paginas. Theme toggle removido do header.

## Ordem de execucao

Sequencial:
1. CHANGE-1 (5 min, trivial).
2. CHANGE-2 (15 min, sweep amplo).
3. CHANGE-3 (5 min).
4. Validacao + commit + push.
