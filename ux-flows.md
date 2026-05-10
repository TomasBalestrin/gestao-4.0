> 🕷️ Viúva Negra | 2026-05-09 | v1.0

# Gestão 4.0 — UX Flows

## 1. Mapa de Rotas

```
/                                         [redirect]
├── /login                                [público]
├── /forgot-password                      [público]
├── /reset-password                       [público, query token]
├── /auth/setup                           [auth, must_change_password=true]
├── /dashboard                            [auth, redirect por role]
│
├── /crm                                  [auth, role≠financeiro]
│   └── /[funilId]                        [auth, autorizado no funil]
│       └── /cards/[cardId]               [auth, owner ou admin]
│
├── /agenda                               [auth, role∈(admin,social,closer,sdr,lider)]
│
├── /perfil                               [auth, qualquer role]
│
└── /admin                                [auth, role=admin]
    ├── /usuarios                         [admin]
    │   ├── /novo                         [admin]
    │   └── /[id]                         [admin]
    ├── /funis                            [admin]
    │   ├── /novo                         [admin]
    │   └── /[id]                         [admin]
    │       └── /automacoes               [admin]
    ├── /horarios                         [admin]
    │   └── /[closerId]                   [admin]
    ├── /historico                        [admin]
    └── /configuracoes                    [admin]
```

## 2. Navegação

### Layout Dashboard
```
┌────────────────────────────────────────────────────────────┐
│ [Header]  Gestão 4.0    [busca]      [🔔3] [☀] [Avatar ▾] │
├──────────┬─────────────────────────────────────────────────┤
│          │                                                 │
│ [Sidebar]│           [Conteúdo da página]                  │
│          │                                                 │
│ • CRM    │                                                 │
│ • Agenda │                                                 │
│ • Perfil │                                                 │
│ ─────    │                                                 │
│ ADMIN    │                                                 │
│ • Funis  │                                                 │
│ • Users  │                                                 │
│ • Horários│                                                │
│ • Histórico│                                               │
│ • Config │                                                 │
│          │                                                 │
└──────────┴─────────────────────────────────────────────────┘
```

### Sidebar
- **Desktop:** fixa, 240px de largura, colapsável para 64px (apenas ícones).
- **Logo + título** no topo.
- **Itens da role atual** (Social Selling vê CRM/Agenda/Perfil).
- **Seção Admin** visível apenas se `role=admin`.
- **Footer:** versão da plataforma + status de build.

### Header
- **Esquerda:** breadcrumb / título da página atual.
- **Centro:** busca global (placeholder no MVP, sem implementação real).
- **Direita:**
  - **Sino com badge** (notificações).
  - **Toggle dark/light** (ícone sol/lua).
  - **Avatar dropdown** (Perfil, Sair).

### Itens do Menu (por role no MVP)

| Item | Admin | Social Selling |
|------|:-----:|:--------------:|
| CRM | ✅ | ✅ |
| Agenda | ✅ | ✅ |
| Perfil | ✅ | ✅ |
| **Admin** | ✅ | ❌ |
| → Usuários | ✅ | — |
| → Funis | ✅ | — |
| → Horários | ✅ | — |
| → Histórico | ✅ | — |
| → Configurações | ✅ | — |

## 3. Auth Flow

### Login
```
[/login]
  └─ Form: email + senha
     ├─ submit → POST supabase.auth.signInWithPassword
     │   ├─ sucesso →
     │   │   ├─ users.must_change_password=true → redirect /auth/setup
     │   │   └─ false → redirect /dashboard (role-based)
     │   └─ erro →
     │       ├─ "Credenciais inválidas" inline (sem revelar se email existe)
     │       └─ "Conta desativada" se is_active=false
     └─ link "Esqueci minha senha" → /forgot-password
```

**Estados:**
- Loading: botão "Entrando..." disabled.
- Erro: mensagem inline abaixo do form, não em toast.
- Empty: campos vazios, botão disabled.

### Forgot Password
```
[/forgot-password]
  └─ Form: email
     └─ submit → supabase.auth.resetPasswordForEmail(email, { redirectTo: /reset-password })
         └─ sempre exibe "Se o email existir, enviamos um link" (não confirma existência)
```

### Reset Password
```
[/reset-password?token=...]
  └─ Form: nova senha + confirmação
     ├─ Zod valida força
     └─ submit → supabase.auth.updateUser({ password })
         ├─ sucesso → redirect /login com toast "Senha redefinida"
         └─ token inválido/expirado → mensagem + link "Solicitar novo"
```

### Setup (primeiro login)
```
[/auth/setup]
  └─ Form: nova senha + confirmação
     ├─ Zod valida força
     └─ submit → POST /api/auth/setup-password
         ├─ Atualiza senha via supabase.auth.updateUser
         ├─ Atualiza users.must_change_password=false
         └─ redirect /dashboard
```

## 4. Onboarding

### Pós-primeiro login (após setup)
1. Toast de boas-vindas: "Bem-vindo ao Gestão 4.0".
2. Redirect para dashboard (sem tour interativo no MVP).
3. **Admin:** dashboard sugere "Crie seu primeiro funil" se nenhum existir.
4. **Social Selling:** dashboard mostra "Você ainda não tem cards" se vazio + atalho "Ir para CRM".

## 5. Fluxos por Feature

### F-02 Funis: Criar Funil

**Persona:** Admin
**Trigger:** Botão "Novo funil" em `/admin/funis`.

```
[/admin/funis]
  → click "Novo funil"
  → [/admin/funis/novo]
       └─ Wizard em uma única tela:
          ├─ Step 1: Nome, descrição, cor, role_alvo
          ├─ Step 2: Etapas (lista editável, adicionar/remover/reordenar)
          ├─ Step 3: Custom Fields (builder)
          │   └─ Para cada campo: nome, tipo (select), obrigatório (checkbox), opções (se select/multi_select)
          └─ Step 4: Usuários autorizados (multi-select de usuários)
       → submit → POST /api/funis
            ├─ sucesso → redirect /admin/funis/[id] + toast "Funil criado"
            └─ erro validação → mensagens inline
```

**Empty state:** Se nenhum funil existe, página mostra ilustração + CTA "Criar primeiro funil".

### F-02 Funis: Configurar Automações

```
[/admin/funis/[id]]
  → vê lista de etapas
  → click ícone bot na etapa
  → [Modal: Automações da etapa "Em conversa"]
       ├─ Lista de automações existentes (cards expansíveis)
       ├─ Botão "Nova automação"
       │   └─ [Modal interno]
       │       ├─ Nome
       │       ├─ Action: select [mover para, duplicar para]
       │       ├─ Targets: select de funil + etapa (multi para duplicate_to)
       │       ├─ Notificações:
       │       │   ├─ + In-app (target: select role)
       │       │   ├─ + WhatsApp [placeholder]
       │       │   └─ + Instagram [placeholder]
       │       └─ submit → POST /api/etapas/[id]/automacoes
       └─ fechar modal → recarrega lista
```

### F-05 CRM Kanban: Mover Card e Disparar Automação

**Persona:** Social Selling
**Trigger:** Drag de card no kanban.

```
[/crm/[funilId]]
  → user arrasta card de Etapa A → Etapa B
  → onDragEnd:
       ├─ UI optimistic: move card visualmente, mostra spinner discreto
       └─ POST /api/cards/[id]/move { etapa_id }
            ├─ sucesso (200) →
            │   ├─ card permanece em B
            │   ├─ se automation_result.executions: toast "Automação executada"
            │   └─ TanStack invalida ['cards', funilId]
            └─ erro (4xx/5xx) →
                ├─ revert UI: card volta para Etapa A
                ├─ toast erro vermelho persistente "Falha ao mover. [Retry]"
                └─ se automation_error_id retornado: log clicável → Modal "Ver erro"
```

**Estados:**
- Loading durante request: spinner no card movido.
- Empty: kanban vazio mostra "Nenhum card. Clique em + para criar."

### F-05 Criar Card

**Persona:** Social Selling

```
[/crm/[funilId]]
  → click "+" em qualquer coluna
  → [Modal: Novo card]
       ├─ Lead: combobox (busca em /api/leads?q=) ou "Novo lead"
       │   └─ se "Novo lead": campos nome*, email, telefone, origem
       ├─ Custom fields: render dinâmico baseado em funis.custom_fields_schema
       └─ submit → POST /api/funis/[id]/cards
            ├─ sucesso → fecha modal, card aparece na coluna inicial
            └─ erro → mensagens inline
```

### F-05 Detalhe e Edição de Card

```
[/crm/[funilId]]
  → click no card
  → [Drawer lateral: Card detail]
       ├─ Header: nome do lead + etapa atual + assigned avatar
       ├─ Tab "Detalhes":
       │   ├─ Lead: nome, email, telefone (editáveis com submit no blur)
       │   └─ Custom fields (editáveis, validados via Zod)
       ├─ Tab "Calls":
       │   ├─ Lista de calls relacionadas
       │   └─ Botão "Agendar call" → modal F-08
       ├─ Tab "Histórico":
       │   └─ Timeline filtrada por entity_id=card_id
       └─ Footer: [Atribuir a...] [Excluir] [Fechar]
```

### F-04 Configurar Horários do Closer

**Persona:** Admin

```
[/admin/horarios]
  → vê lista de cards (1 por closer com role=closer)
       ├─ Status: "Configurado ✓" ou "Pendente"
       └─ Click no card
            → [/admin/horarios/[closerId]]
                ├─ Tabs: Seg | Ter | Qua | Qui | Sex | Sáb | Dom
                ├─ Cada tab:
                │   ├─ Toggle "Disponível neste dia"
                │   ├─ Lista de blocos (Inicio HH:mm, Fim HH:mm) com botão remove
                │   ├─ Botão "+ Adicionar bloco"
                │   ├─ Input "Duração do slot" (select 5/10/15/20/30/45/60)
                │   └─ Input "Buffer entre slots" (select 0/5/10/15)
                ├─ Botão "Aplicar template padrão" (preenche seg-sex)
                └─ submit → PUT /api/closer-horarios/[userId]
                     ├─ sucesso → toast "Horários atualizados"
                     └─ erro: bloco sobreposto → inline
```

**Validação:**
- Início < Fim em todo bloco.
- Blocos do mesmo dia não se sobrepõem.
- Pelo menos 1 bloco por dia ativo.

### F-08 Agendar Call no Card

```
[Drawer: Card detail] → Tab Calls → "Agendar call"
  → [Modal: Agendar call]
       ├─ Tipo: radio
       │   ├─ ○ "Por data" (escolho a data, vejo closers disponíveis)
       │   └─ ○ "Por closer" (escolho o closer, vejo próximos slots)
       │
       ├─ Se "Por data":
       │   ├─ Date picker (apenas datas futuras)
       │   ├─ Lista agrupada por closer com slots disponíveis
       │   │   └─ GET /api/closer-horarios/[id]/slots?date_start=&date_end=
       │   └─ Click slot → confirma seleção
       │
       ├─ Se "Por closer":
       │   ├─ Select de closer (apenas users com horarios configurados)
       │   ├─ Lista próximos 14 dias com slots
       │   └─ Click slot → confirma seleção
       │
       ├─ Notas (textarea opcional)
       └─ Submit → POST /api/calls
            ├─ 201 → fecha modal, atualiza tab Calls + agenda + audit log
            └─ 409 (slot ocupado) → toast "Slot indisponível, tente outro" + recarrega lista
```

### F-07 Agenda

```
[/agenda]
  ├─ Toolbar: [< Hoje >] [Mês | Semana | Dia] [Filtro: closer] [Filtro: status]
  ├─ react-big-calendar render
  └─ Click em evento
       └─ [Modal: Detalhe da call]
            ├─ Lead, closer, scheduled_by, status, notes
            ├─ Botão "Ir para o card"
            ├─ Botão "Cancelar" (visível para scheduled_by ou admin)
            │   └─ Confirma via AlertDialog → PATCH /api/calls/[id]/cancel
            └─ Botão "Marcar presença" (visível para closer ou admin)
                 └─ PATCH /api/calls/[id]/attendance { attended: bool }
```

**Visões:**
- Mês: grid clicável.
- Semana: timeline horizontal por dia.
- Dia: timeline vertical.

**Filtros:**
- Closer (select).
- Status (multi-select: scheduled, completed, cancelled, no_show).
- Default: Social Selling vê apenas calls que ele agendou. Admin vê todas.

### F-09 Histórico

**Persona:** Admin

```
[/admin/historico]
  ├─ Filtros (em sticky bar):
  │   ├─ Tipo de entidade (select: card, lead, funil, etapa, user, call, automacao)
  │   ├─ ID da entidade (input opcional)
  │   ├─ Tipo de evento (multi-select)
  │   ├─ Usuário (select)
  │   └─ Range de data (from / to)
  ├─ Tabela paginada (50 por página):
  │   ├─ Timestamp | Usuário | Evento | Entidade | [ver diff]
  │   └─ "Ver diff" → expande linha mostrando before/after JSON
  └─ Export CSV [INFERIDO, opcional]
```

### F-09 Histórico no Card (subview)

```
[Drawer Card Detail] → Tab Histórico
  └─ Timeline vertical
       ├─ Cada item: timestamp, usuário (avatar+nome), evento legível
       │   ex: "Maria moveu de 'Em conversa' para 'Call agendada'"
       └─ Click expande detalhe (before/after de campos)
```

### F-10 Notificações

```
[Header > Sino com badge]
  → click
  → [Dropdown popover]
       ├─ Header: "Notificações" | "Marcar todas como lidas"
       ├─ Lista (últimas 50):
       │   └─ Cada item: ícone, título, descrição, "há X min"
       │       └─ Click → marca lida + navega para link da notificação
       ├─ Empty state: "Nenhuma notificação"
       └─ Footer: "Ver todas" [INFERIDO, link para tela full]
```

**Realtime:**
- Subscribe em `notifications:user_id=eq.<uid>` ao montar.
- Insert chega via channel → toast Sonner + atualiza badge.

### F-03 Criar Usuário

```
[/admin/usuarios]
  → "Novo usuário"
  → [/admin/usuarios/novo]
       └─ Form:
          ├─ Email* (validação Zod)
          ├─ Nome*
          ├─ Role* (select)
          ├─ Foto (upload opcional)
          └─ submit → POST /api/users
               ├─ Server: createAdminClient cria auth.users + senha gerada + insert public.users com must_change_password=true
               ├─ Server: dispara email com link de primeiro acesso
               ├─ Sucesso → redirect /admin/usuarios + toast "Usuário criado, email enviado"
               └─ Erro: email duplicado → inline
```

### F-12 Toggle Tema

```
[Header > ícone sol/lua]
  → click
  → next-themes alterna class 'dark' no <html>
  → atualiza localStorage
  → debounced PATCH /api/users/[id] { theme_preference }
```

## 6. Padrões de Interação

### Forms
- **Label acima do input.**
- **Validação no blur** + **submit final**.
- **Submit disabled até válido** (`isValid` do RHF).
- **Loading no botão** durante submit ("Salvando...").
- **Mensagens de erro inline**, em vermelho, abaixo do campo.
- **Sucesso:** toast 3s + reset do form OU redirect.

### Tabelas (`components/shared/data-table.tsx`)
- **Busca com debounce 300ms.**
- **Filtros em sidebar collapse OU sticky toolbar.**
- **Sort clicando no header.**
- **Paginação server-side** (50 por página default).
- **Row actions:** botão `[⋯]` à direita com dropdown (Ver, Editar, Excluir).

### Modais vs Drawers
- **Modal centralizado:** ações curtas, < 5 campos (criar lead, confirmar, ver detalhe simples).
- **Drawer lateral (Sheet):** detalhe extenso com tabs (card detail, configuração de horário do closer).
- **Modal fullscreen:** apenas em mobile (Fase 2).

### Feedback
- **Toast success:** verde discreto, 3s, canto inferior direito.
- **Toast erro:** vermelho, persistente até clicar X, com botão "Retry" se aplicável.
- **Confirmação destrutiva:** AlertDialog com botão "Excluir" em vermelho. Sempre pedir confirmação para delete e cancelamento de call.
- **Loading global:** apenas em mudança de rota (Next.js streaming + Suspense).
- **Loading local:** spinner discreto inline ou skeleton.

### Empty States (obrigatórios)
- **Sem cards:** ilustração simples + "Crie seu primeiro card. [+ Novo card]".
- **Sem funis (admin):** "Crie um funil para começar a operar. [+ Novo funil]".
- **Sem usuários:** "Adicione usuários ao sistema. [+ Novo usuário]".
- **Sem notificações:** ícone sino + "Tudo em dia. Nenhuma notificação."
- **Sem histórico:** "Nenhum evento neste filtro."
- **Sem agenda:** "Nenhuma call agendada neste período."

### Loading States (obrigatórios)
- **Tabela:** skeleton de 5 linhas.
- **Kanban:** skeleton de colunas com 3 cards cinza.
- **Drawer detail:** skeleton de campos.
- **Calendário:** spinner central.

### Confirmação destrutiva
Sempre via `<AlertDialog>` com:
- Título: "Tem certeza?"
- Descrição: explica consequência ("Esta ação não pode ser desfeita").
- Botão primário: "Cancelar" (default).
- Botão secundário: "Excluir" / "Cancelar call" em vermelho.

## 7. Responsividade (MVP)

Desktop-first. Mobile/PWA é Fase 2.

| Breakpoint | Comportamento |
|-----------|---------------|
| `xl` (1280+) | Target principal, layout completo |
| `lg` (1024+) | Sidebar colapsada por default, kanban com scroll horizontal |
| `< lg` | **Mostra aviso "Use em desktop para melhor experiência"** + layout degradado funcional |

Quando Fase 2 entrar:
- Sidebar → drawer.
- Kanban → carrossel de colunas com swipe.
- Tabelas → cards verticais.
- Modais → fullscreen.
- Filtros → bottom sheet.

## 8. Acessibilidade

- **Keyboard nav:** Tab navega forms, setas navegam dropdowns, Esc fecha modais.
- **ARIA labels** em todos os ícones-only buttons (sino, toggle tema, avatar).
- **Focus visible:** ring discreto em todos os elementos interativos. `outline-2 outline-offset-2 outline-foreground/20`.
- **Skip to content** no header (link oculto que aparece no Tab).
- **Contraste mínimo 4.5:1** para texto. Validar palette ElevenLabs especialmente em dark mode.
- **Live regions** (`aria-live="polite"`) para toast de notificações.
- **Drag-and-drop acessível:** `dnd-kit` provê alternativa keyboard (setas).

## 9. Estados Especiais

### Erro de automação no drag
1. Card volta visualmente para etapa de origem.
2. Toast vermelho persistente: "Falha ao executar automação. [Ver erro] [Retry]".
3. "Ver erro" abre modal com `automation_errors.error_message` + payload.
4. "Retry" → POST `/api/automation-errors/[id]/retry`.

### Conflito de slot
1. Modal de agendamento mantém aberto.
2. Toast amarelo: "Este horário acabou de ser reservado. Atualizando lista...".
3. Re-fetch automático de slots disponíveis.

### Sessão expirada
1. Middleware detecta JWT inválido → redirect `/login?reason=expired`.
2. Tela login mostra: "Sua sessão expirou. Faça login novamente."

### Usuário desativado mid-session
1. `requireAuth()` detecta `is_active=false` → 403.
2. Client recebe → redirect `/login?reason=deactivated` + toast "Conta desativada".
