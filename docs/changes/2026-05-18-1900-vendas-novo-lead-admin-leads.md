# CHANGE | Vendas + botao unico Novo lead + admin Leads + header card modal

> Falcao | 2026-05-18 1900 | v1.0
> Tipo: feature
> Estimativa: 14 tasks, ~120 min

## Contexto

4 ajustes solicitados:

1. **Kanban**: substituir o botao "Novo card" repetido em cada etapa por
   UM unico "Novo lead" no topo do kanban. Novo lead cai sempre na 1a
   etapa do funil.
2. **Modal do card**: remover "Data de Follow-up" do form de lead. Adicionar
   2 botoes no header do modal: "Agendar call" (condicional a
   `funil.agenda_call_enabled`) e "Registrar venda" (sempre, gated por
   permissao admin/closer).
3. **Registrar venda**: nova tabela `vendas` (N por lead) com campos: valor
   da venda, valor de entrada, vigencia do contrato, descricao da
   negociacao, notas. Permissoes: admin OU closer.
4. **Admin > Leads**: nova rota `/admin/leads` com grid filtravel + busca
   + delete. Delete e HARD delete real (CASCADE em cards, calls, vendas,
   audit_log preserva o evento). So admin pode acessar.

## Analise

### Decisoes confirmadas com Bethel
- 1 lead pode ter N vendas (tabela `vendas` com FK 1:N).
- Apagar lead = HARD delete real (DELETE FROM leads + CASCADE).
- Registrar venda: admin OU closer; Apagar lead: so admin.
- Agendar call no header: condicional. Registrar venda no header: sempre.

### EDITAR
- `components/kanban/kanban-column.tsx` — remover `<NewCardButton>` rodape.
- `components/kanban/kanban-board.tsx` — adicionar 1 botao "Novo lead" topo.
- `components/kanban/new-card-modal.tsx` — `etapaId` agora opcional (null =
  primeira etapa, ja resolvido pelo server).
- `components/kanban/kanban-card-modal.tsx` — adicionar header com botoes
  Agendar call (condicional) e Registrar venda.
- `components/kanban/kanban-card-modal-dados.tsx` — remover botao
  AgendarCallModal do rodape (foi pro header).
- `components/kanban/lead-form-fields.tsx` — remover campo "Data de
  Follow-up" da UI (so esconde, mantem coluna no banco).
- `lib/database.types.ts` — adicionar `vendas` table + nova entity/event
  types.
- `lib/schemas/lead.ts` — remover `data_followup` do schema (mantem coluna
  no banco, mas nao envia mais).
- `app/api/leads/route.ts` — limit 30 → paginacao + filtros (q,
  funil_origem, sdr_id, produto_ofertado).
- `app/api/leads/[id]/route.ts` — DELETE atual e soft. Adicionar
  `?hard=true` so para admin: faz DELETE real.
- `components/layout/sidebar.tsx` — adicionar item "Leads" no adminItems.

### CRIAR
- `supabase/migrations/0016_vendas_e_audit.sql` — tabela `vendas` + RLS
  + 2 novos values em audit_event_type + 1 em audit_entity_type.
- `lib/schemas/venda.ts` — Zod schema.
- `types/domain.ts` add `Venda` + `VendaWithUser`.
- `app/api/leads/[id]/vendas/route.ts` — GET (lista vendas do lead),
  POST (cria).
- `app/api/vendas/[id]/route.ts` — DELETE (admin).
- `components/kanban/registrar-venda-modal.tsx` — modal com 5 campos.
- `app/(dashboard)/admin/leads/page.tsx` — server component da pagina.
- `components/admin/leads-table.tsx` — client component com grid +
  filtros + delete confirmation.

### NAO TOCAR
- `app/api/funis/[id]/cards/route.ts` — POST ja resolve 1a etapa quando
  etapa_id omitido, nao precisa mudar.
- Schemas funil/card, automation engine.
- Migration 0015 ja aplicada.

### Riscos
- HARD DELETE em leads cascateia em cards, calls, vendas, automation_errors.
  Esperado mas destrutivo. Mitigacao: ConfirmDialog forte na UI ("Esta acao
  e irreversivel...").
- Audit log usa `entity_id` UUID. Quando deletamos o lead em hard, o
  registro do audit fica com FK orfa (mas a coluna nao tem FK propriamente,
  e UUID livre). Esperado, audit log preserva historico.
- Tela admin/leads pode listar muitos registros. Paginar (limit 50 + cursor)
  no MVP.

## Tasks

### CHANGE-1 Migration 0016: vendas + audit enums
**CRIAR**: `supabase/migrations/0016_vendas_e_audit.sql`
**Steps**:
1. `ALTER TYPE audit_event_type ADD VALUE 'venda_created';`
2. `ALTER TYPE audit_event_type ADD VALUE 'venda_updated';`
3. `ALTER TYPE audit_event_type ADD VALUE 'venda_deleted';`
4. `ALTER TYPE audit_entity_type ADD VALUE 'venda';`
5. `CREATE TABLE vendas (id uuid PK, lead_id uuid NOT NULL FK
   leads(id) ON DELETE CASCADE, card_id uuid NULL FK cards(id) ON DELETE
   SET NULL, valor_venda numeric(14,2) NOT NULL, valor_entrada numeric(14,2),
   vigencia_contrato text, negociacao text, notas text, registered_by uuid
   FK users(id) ON DELETE SET NULL, created_at timestamptz, updated_at
   timestamptz)`.
6. Indexes lead_id, registered_by, created_at.
7. Trigger updated_at.
8. `ALTER TABLE vendas ENABLE ROW LEVEL SECURITY`.
9. RLS policies:
   - `vendas_select`: usuarios com role admin OU closer OU social_selling
     OU lider OU financeiro (todos que tem read no CRM).
   - `vendas_insert`: admin OU closer.
   - `vendas_update`: admin OU registered_by = auth.uid().
   - `vendas_delete`: admin.
**Criterio**: SQL roda sem erro. Tabela `vendas` existe e RLS ativa.

### CHANGE-2 types/domain.ts + database.types.ts
**EDITAR**: `lib/database.types.ts`, `types/domain.ts`
**Steps**: adicionar `vendas` table types + atualizar enums
audit_event_type/audit_entity_type. Em domain.ts: `Venda =
Tables['vendas']['Row']`, `VendaWithUser` composto.
**Criterio**: typecheck.

### CHANGE-3 Schema Zod venda
**CRIAR**: `lib/schemas/venda.ts`
**Steps**: `createVendaSchema` com 5 campos. `valor_venda` obrigatorio e
> 0. Resto opcional/nullable. `updateVendaSchema = partial`.
**Criterio**: typecheck.

### CHANGE-4 API /api/leads/[id]/vendas
**CRIAR**: `app/api/leads/[id]/vendas/route.ts`
**Steps**:
1. `GET`: requireAuth, lista vendas do lead, order by created_at desc.
2. `POST`: requireCrmWrite + verificar role admin OU closer. Valida com
   `createVendaSchema`. INSERT em vendas com registered_by=user.id, card_id
   opcional (vem do body). logEvent venda_created.
**Criterio**: criar venda via API funciona.

### CHANGE-5 API /api/vendas/[id]
**CRIAR**: `app/api/vendas/[id]/route.ts`
**Steps**: `DELETE`: requireAdmin. DELETE FROM vendas. logEvent
venda_deleted.
**Criterio**: admin consegue deletar venda.

### CHANGE-6 Componente RegistrarVendaModal
**CRIAR**: `components/kanban/registrar-venda-modal.tsx`
**Steps**:
1. Dialog com trigger custom (caller passa).
2. Form com: valor_venda (number), valor_entrada (number), vigencia (text),
   negociacao (textarea), notas (textarea).
3. Mutation `POST /api/leads/{leadId}/vendas` com card_id opcional.
4. Toast success, fechar.
**Criterio**: modal funcional. Limite 200 linhas.

### CHANGE-7 Atualizar KanbanCardModal (header)
**EDITAR**: `components/kanban/kanban-card-modal.tsx` (ou
sidebar/dados conforme estrutura atual)
**LER**: `kanban-card-modal-sidebar.tsx` pra entender estrutura.
**Steps**:
1. Header do modal ganha 2 botoes: Agendar call (gated por
   funil.agenda_call_enabled) e Registrar venda (gated por
   profile.role IN ['admin','closer']).
2. Wire dos triggers para `AgendarCallModal` e `RegistrarVendaModal`.
3. Em `kanban-card-modal-dados.tsx` remove o `AgendarCallModal` do
   rodape (movido pro header).
**Criterio**: abrir card -> header tem botoes. Click abre cada modal.

### CHANGE-8 Remover Data de Follow-up do form
**EDITAR**: `components/kanban/lead-form-fields.tsx`,
`lib/schemas/lead.ts`
**Steps**:
1. Remover o Input "Data de Follow-up" e a chave do `LeadFormState` e
   `EMPTY_LEAD` e do `leadStateToPayload`/`leadToFormState`.
2. Em `lead.ts`, remover `data_followup` do `leadBaseSchema`.
3. Manter a coluna no banco (sem migration).
**Criterio**: form nao mostra mais o campo. Backend ignora
`data_followup` em payload.

### CHANGE-9 Botao unico Novo lead no kanban
**EDITAR**: `components/kanban/kanban-board.tsx`,
`components/kanban/kanban-column.tsx`,
`components/kanban/new-card-modal.tsx`
**Steps**:
1. Em `kanban-column.tsx`: remover `<NewCardButton etapaId={...}>` do
   rodape de cada coluna.
2. Em `kanban-board.tsx`: adicionar 1 botao "Novo lead" no topo
   (header da tela do kanban) que abre o NewCardModal sem etapaId
   especifico (o server cai na 1a etapa automaticamente).
3. `NewCardModal`: torna `etapaId` opcional. Quando nao passa, envia
   payload sem `etapa_id` e o server escolhe.
4. Atualizar `kanban-store` se necessario.
**Criterio**: kanban tem 1 botao "Novo lead" no topo. Criar lead via
ele -> card cai na 1a etapa.

### CHANGE-10 API /api/leads (paginacao + filtros)
**EDITAR**: `app/api/leads/route.ts`
**Steps**:
1. Adicionar query params: `q` (existe), `funil_origem`, `sdr_id`,
   `produto_ofertado`, `limit` (default 50, max 200), `offset`.
2. Aplicar filtros no query supabase.
3. Retorna `{ data: [...], total: number }` (count exact).
**Criterio**: GET /api/leads?q=joao&funil_origem=MPM responde filtrado.

### CHANGE-11 API DELETE /api/leads/[id] hard option
**EDITAR**: `app/api/leads/[id]/route.ts`
**Steps**:
1. No DELETE, ler `req.nextUrl.searchParams.get("hard")`.
2. Se `hard === "true"`: requireAdmin (forca admin) + `DELETE FROM leads`
   (hard).
3. Default permanece soft delete (compat com codigo existente).
4. logEvent lead_deleted com metadata `{ hard: true }` quando aplicavel.
**Criterio**: admin consegue chamar
DELETE /api/leads/{id}?hard=true e o lead desaparece (CASCADE em
cards/calls/vendas).

### CHANGE-12 Admin > Leads page + components
**CRIAR**: `app/(dashboard)/admin/leads/page.tsx`,
`components/admin/leads-table.tsx`
**Steps**:
1. `page.tsx`: server component que faz auth/admin guard (requireAdmin) e
   renderiza um header + `<LeadsTable />`.
2. `leads-table.tsx` (client): TanStack Query consumindo `/api/leads`
   com inputs de filtro (search, funil_origem select, sdr_id select,
   produto_ofertado select). Grid com colunas: Nome, Email, Telefone,
   Funil Origem, SDR, Produto, Criado em, Acoes.
3. Coluna Acoes: botao "Excluir" que dispara `ConfirmDialog` destrutivo,
   chama `DELETE /api/leads/{id}?hard=true`, invalida query.
4. Limite 200 linhas — se exceder extrair filtros em
   `leads-table-filters.tsx`.
**Criterio**: navegar /admin/leads mostra grid, filtros funcionam,
delete remove o lead.

### CHANGE-13 Sidebar item "Leads"
**EDITAR**: `components/layout/sidebar.tsx`
**Steps**: adicionar
`{ href: "/admin/leads", label: "Leads", icon: UserSearch ou similar,
visible: true }` em `adminItems`. Posicionar entre "Funis" e "Usuarios"
ou no topo do admin section, gosto.
**Criterio**: sidebar mostra "Leads" so quando role=admin (o `visible`
ja gated pelo current user role no componente).

### CHANGE-14 Validacao final
**Steps**:
1. `npx tsc --noEmit` passa.
2. `npm run build` passa.
3. Smoke manual: criar lead via novo botao -> cai na 1a etapa; abrir card
   -> header tem Agendar call (se enabled) e Registrar venda; criar venda
   -> aparece no historico; ir em /admin/leads -> ver grid + filtrar +
   apagar -> lead some + cards/calls/vendas somem.

## Validacao final
- [ ] `npx tsc --noEmit` passa.
- [ ] `npm run build` passa.
- [ ] Migration 0016 roda no Supabase sem erro.
- [ ] Manual smoke (CHANGE-14).

## Ordem de execucao
Sequencial:
1. CHANGE-1 (migration) → Bethel aplica antes do resto compilar.
2. CHANGE-2, 3 (types/schemas) paralelo.
3. CHANGE-4, 5 (APIs).
4. CHANGE-6, 8, 9 (UI base).
5. CHANGE-7 (header card modal — depende de 6).
6. CHANGE-10, 11 (APIs admin).
7. CHANGE-12, 13 (Admin > Leads).
8. CHANGE-14 (validacao).
