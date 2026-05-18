# CHANGE | Schema fixo de Lead (remove custom fields dinamicos)

> Falcao | 2026-05-18 1200 | v1.0
> Tipo: refactor + feature (breaking)
> Estimativa: 13 tasks, ~90 min

## Contexto

O sistema atual permite ao admin definir custom fields por funil (`funis.custom_fields_schema` JSONB) que ficam disponiveis no formulario de criacao de card (preenchidos em `cards.custom_fields` JSONB). O time da Bethel decidiu padronizar o cadastro de leads/clientes em um schema FIXO (Contato / Negocio / Informacoes Adicionais), eliminando a flexibilidade dinamica em favor de consistencia operacional.

Mudancas:
- Remover tab "Campos" da edicao de funil + builder de custom fields.
- Substituir form dinamico de "Novo card" por form fixo com 14 campos novos.
- Mover todos os campos para a tabela `leads` como colunas tipadas (nao JSONB).
- Renomear `leads.origem` (texto livre) -> `leads.funil_origem` (lista fixa de 22).
- DROP `cards.custom_fields` e `funis.custom_fields_schema`.
- Adicionar `leads.sdr_id` (FK users, ON DELETE SET NULL).
- Refletir mesmo schema no modal de detalhe (kanban-card-modal-dados).
- Sem dados em producao, sem necessidade de backfill.

## Especificacao

### Campos do Lead (definitivos)

| Coluna DB | Tipo SQL | Obrigatorio | Origem UI | Secao |
|-----------|----------|-------------|-----------|-------|
| `nome` | TEXT NOT NULL | sim | input texto | Contato |
| `telefone` | TEXT | nao | input texto | Contato |
| `email` | TEXT | nao | input email | Contato |
| `instagram` | TEXT | nao | input texto (@usuario) | Contato |
| `empresa` | TEXT | nao | input texto | Negocio |
| `nicho` | TEXT | nao | input texto | Negocio |
| `faturamento_mensal` | NUMERIC(14,2) | nao | input number | Negocio |
| `tem_socio` | BOOLEAN | nao | switch/checkbox | Negocio |
| `funil_origem` | TEXT | nao (CHECK contra lista) | select 22 opcoes | Negocio |
| `sdr_id` | UUID FK users(id) ON DELETE SET NULL | nao | select users role=sdr | Negocio |
| `produto_ofertado` | TEXT | nao (CHECK contra lista) | select 6 opcoes | Negocio |
| `dor_principal` | TEXT | nao | textarea | Adicionais |
| `observacoes` | TEXT (ja existe) | nao | textarea | Adicionais |
| `data_followup` | DATE | nao | input date | Adicionais |

### Constantes hardcoded

`FUNIL_ORIGEM_OPTIONS` (22): `50 scripts`, `Teste dos Arquetipos`, `MPM`, `Implementacao de IA da Julia`, `Social Selling Julia`, `Social Selling Cleiton`, `Social Selling Bethel`, `Social Selling Kennedy`, `Formulario Instagram Cleiton`, `Formulario Instagram Julia`, `Formulario Instagram Bethel`, `Formulario Instagram Kennedy`, `Formulario Youtube`, `Indicacao de Aluno`, `Indicacao de Mentorado`, `Indicacao de Vendedor`, `Indicacao Elite Premium`, `Implementacao Comercial`, `Implementacao Personalizada IA`, `Mentoria Julia`, `Elite Premium`, `Bethel Club`.

`PRODUTO_OFERTADO_OPTIONS` (6): `Mentoria Premium`, `Mentoria Elite Premium`, `Implementacao Comercial`, `Bethel Club`, `Intensivo da Alta Performance`, `Implementacao de IA`.

CHECK constraint no DB usa essas listas. Validacao tambem na app (Zod enum) e nos selects.

## Analise

### Arquivos afetados (EDITAR)
- `lib/schemas/lead.ts` - schema novo com todos os campos + enums.
- `lib/schemas/funil.ts` - remover `custom_fields_schema` do base/create/update.
- `lib/schemas/card.ts` - remover `custom_fields` (do create e update).
- `lib/database.types.ts` - tipos das tabelas atualizados manualmente (sera regenerado depois).
- `components/funis/funil-form.tsx` - remover tab "Campos", state e payload de custom fields.
- `components/kanban/new-card-modal.tsx` - reescrever com form fixo + 3 secoes.
- `components/kanban/kanban-card-modal-dados.tsx` - mesmas 3 secoes editaveis.
- `components/kanban/kanban-card.tsx` - badge mostra `funil_origem` em vez de `origem`.
- `app/api/funis/[id]/cards/route.ts` - remover validacao buildCustomFieldsSchema; persistir novos campos em `leads`.
- `app/api/leads/route.ts` (POST) - aceitar e gravar novos campos.
- `app/api/leads/[id]/route.ts` (PATCH) - aceitar updates dos novos campos.
- `app/api/cards/[id]/route.ts` (PATCH) - remover branch `custom_fields`.
- `lib/automation/actions.ts` - `executeDuplicateTo` para de copiar custom_fields.
- `supabase/migrations/0008_views.sql` - NAO editar (a nova migration recria a view).

### Arquivos novos (CRIAR)
- `supabase/migrations/0015_lead_fixed_schema.sql` - migration.
- `lib/constants/lead-options.ts` - FUNIL_ORIGEM_OPTIONS, PRODUTO_OFERTADO_OPTIONS.
- `app/api/users/sdrs/route.ts` - lista users ativos com role=sdr (espelha `/api/users/closers`).

### Arquivos a DELETAR
- `components/funis/custom-fields-builder.tsx`
- `components/forms/custom-field-input.tsx`
- `lib/schemas/custom-fields.ts`
- `lib/schemas/universal-fields.ts`

### Nao tocar
- `lib/audit/logger.ts`, `audit_log` (so passa metadata genericos).
- `closer-horarios`, `calls`, `automacoes` (orthogonal).
- Documentacao `docs/PRD.md` etc (atualizacao manual fora desta change).

### Riscos
- BREAKING: codigo que ainda referenciar `custom_fields` ou `custom_fields_schema` quebra. Mitigacao: grep global garante remocao + `npm run build` valida.
- DROP de colunas perde dados existentes (esperado, MVP).
- Migration tem que rodar via SQL Editor do Bethel; codigo nao funciona enquanto migration nao for aplicada.
- View `v_cards_with_lead` referencia `c.custom_fields` e `l.origem`; precisa ser dropada e recriada DENTRO da mesma migration.

## Tasks

### CHANGE-1 Migration SQL
**CRIAR**: `supabase/migrations/0015_lead_fixed_schema.sql`
**Steps**:
1. `DROP VIEW v_cards_with_lead;` (recria no final).
2. `ALTER TABLE leads ADD COLUMN instagram TEXT, empresa TEXT, nicho TEXT, faturamento_mensal NUMERIC(14,2), tem_socio BOOLEAN, sdr_id UUID REFERENCES users(id) ON DELETE SET NULL, produto_ofertado TEXT, dor_principal TEXT, data_followup DATE;`
3. `ALTER TABLE leads RENAME COLUMN origem TO funil_origem;`
4. `ALTER TABLE leads ADD CONSTRAINT leads_funil_origem_valid CHECK (funil_origem IS NULL OR funil_origem IN (...22 strings...));`
5. `ALTER TABLE leads ADD CONSTRAINT leads_produto_ofertado_valid CHECK (produto_ofertado IS NULL OR produto_ofertado IN (...6 strings...));`
6. `CREATE INDEX idx_leads_sdr ON leads(sdr_id) WHERE deleted_at IS NULL;`
7. `CREATE INDEX idx_leads_funil_origem ON leads(funil_origem) WHERE deleted_at IS NULL;`
8. `ALTER TABLE cards DROP COLUMN custom_fields;`
9. `DROP INDEX IF EXISTS idx_cards_custom_fields_gin;`
10. `ALTER TABLE funis DROP COLUMN custom_fields_schema;`
11. `DROP TYPE IF EXISTS custom_field_type;` (se existir o enum legacy).
12. Recriar `v_cards_with_lead` SEM `c.custom_fields` e com `l.funil_origem AS lead_funil_origem` (e adicionar campos novos uteis: empresa, sdr_id, produto_ofertado).
**Criterio de sucesso**: SQL roda no Supabase sem erro; view existe; tabela leads tem as colunas novas.

### CHANGE-2 Constantes
**CRIAR**: `lib/constants/lead-options.ts`
**Steps**: exportar `FUNIL_ORIGEM_OPTIONS` e `PRODUTO_OFERTADO_OPTIONS` como `readonly [string, ...string[]]` (usavel em `z.enum`).
**Criterio**: importavel de qualquer schema/componente.

### CHANGE-3 Reescrever lib/schemas/lead.ts
**EDITAR**: `lib/schemas/lead.ts`
**Steps**:
1. Importar constantes.
2. `funilOrigemSchema = z.enum(FUNIL_ORIGEM_OPTIONS)`.
3. `produtoOfertadoSchema = z.enum(PRODUTO_OFERTADO_OPTIONS)`.
4. `leadBaseSchema` com TODOS os 14 campos. `nome` obrigatorio, demais `.optional().nullable()`.
5. `createLeadSchema = leadBaseSchema`, `updateLeadSchema = leadBaseSchema.partial()`.
6. Manter `leadSearchSchema` como esta.
**Criterio**: typecheck passa; usado pelo POST/PATCH de leads.

### CHANGE-4 Limpar lib/schemas/funil.ts e lib/schemas/card.ts
**EDITAR**: `lib/schemas/funil.ts`, `lib/schemas/card.ts`
**Steps**:
1. `funil.ts`: remover import e uso de `customFieldsSchemaSchema`; remover `custom_fields_schema` de `funilBaseSchema` e `updateFunilSchema`.
2. `card.ts`: remover `customFieldsRecord` e o campo `custom_fields` de `createCardSchema` e `updateCardSchema`.
**Criterio**: typecheck.

### CHANGE-5 Apagar arquivos legacy
**DELETAR**:
- `lib/schemas/custom-fields.ts`
- `lib/schemas/universal-fields.ts`
- `components/funis/custom-fields-builder.tsx`
- `components/forms/custom-field-input.tsx`
**Criterio**: nao restam imports apontando para esses paths (`grep` confirma).

### CHANGE-6 funil-form.tsx
**EDITAR**: `components/funis/funil-form.tsx`
**Steps**:
1. Remover imports de `customFieldsSchemaSchema`, `UNIVERSAL_FIELDS`, `CustomFieldConfig`, `parseCustomFields`.
2. Remover `enabledFieldIds` state, `toggleField`, `camposFields` (linhas 83-86, 174-178, 205-231).
3. Remover `<TabsTrigger value="campos">` e `<TabsContent value="campos">` (linhas 300, 351-353).
4. No `onSubmit`, remover `enabledFields` e `custom_fields_schema` do payload (linhas 138-140, 146, 162).
5. Remover `<section>` "Campos do funil" do modo create (linhas 250-255).
**Criterio**: build passa; abrir /admin/funis/[id] mostra so Geral, Etapas, Agendamento.

### CHANGE-7 lib/automation/actions.ts
**EDITAR**: `lib/automation/actions.ts`
**Steps**: em `executeDuplicateTo`, remover `custom_fields` do select e do insert. Remover import de `Json` se ficar sem uso.
**Criterio**: typecheck; duplicate_to continua funcionando (so nao copia o JSONB que ja nao existe).

### CHANGE-8 Atualizar database.types.ts
**EDITAR**: `lib/database.types.ts`
**Steps**:
1. Em `Tables.leads.Row/Insert/Update`: adicionar `instagram`, `empresa`, `nicho`, `faturamento_mensal`, `tem_socio`, `sdr_id`, `produto_ofertado`, `dor_principal`, `data_followup`. Renomear `origem` -> `funil_origem`.
2. Em `Tables.cards.Row/Insert/Update`: remover `custom_fields`.
3. Em `Tables.funis.Row/Insert/Update`: remover `custom_fields_schema`.
4. Em `Views.v_cards_with_lead.Row`: refletir nova shape (sem custom_fields, com funil_origem etc).
**Criterio**: tsc --noEmit sem erro; queries do supabase-js conhecem novas colunas.

### CHANGE-9 API routes
**EDITAR**: `app/api/leads/route.ts` (POST), `app/api/leads/[id]/route.ts` (PATCH), `app/api/funis/[id]/cards/route.ts` (POST), `app/api/cards/[id]/route.ts` (PATCH)
**Steps**:
1. `POST /api/leads`: persistir todos os campos novos (com `nullify` para strings vazias).
2. `PATCH /api/leads/[id]`: aceitar updates dos novos campos via `parsed.data.<campo> !== undefined`.
3. `POST /api/funis/[id]/cards`: remover bloco de validacao `customFieldsSchemaSchema`/`buildCustomFieldsSchema`/`cfValidation`; remover `custom_fields` do insert; persistir novos campos no insert do lead.
4. `PATCH /api/cards/[id]`: remover branch `custom_fields` e seu `cfValidation`. Manter so `assigned_to` e `ordem_na_etapa`.
**Criterio**: rota POST card cria lead com todos os campos; build passa.

### CHANGE-10 Endpoint SDRs
**CRIAR**: `app/api/users/sdrs/route.ts`
**Steps**: copiar `/api/users/closers/route.ts` trocando `role = 'closer'` por `role = 'sdr'`.
**Criterio**: GET retorna lista filtrada.

### CHANGE-11 Reescrever new-card-modal.tsx
**EDITAR**: `components/kanban/new-card-modal.tsx`
**Steps**:
1. Remover `CustomFieldInput`, `parseCustomFieldsConfig`, `customFields` state, query de `funil-detail`.
2. State `newLead` agora cobre todos os 14 campos.
3. Render em 3 secoes: Contato, Negocio, Adicionais (collapsible opcional, default expandido).
4. Selects: Funil Origem (constante), Produto Ofertado (constante), SDR (query `/api/users/sdrs`).
5. `mutation`: envia `{ lead: { ...todos os campos } }` para `/api/funis/[funilId]/cards`.
6. Manter mode existing vs new (escolha de lead ja cadastrado).
7. Limite 200 linhas - se exceder, extrair secao em `components/kanban/lead-form-fields.tsx`.
**Criterio**: criar card no kanban com todos os campos persiste no banco.

### CHANGE-12 kanban-card-modal-dados.tsx
**EDITAR**: `components/kanban/kanban-card-modal-dados.tsx`
**Steps**:
1. State `form` cobre todos os campos (em vez de 4).
2. UI em 3 secoes (Contato, Negocio, Adicionais).
3. Selects iguais ao new-card-modal.
4. Se exceder 200 linhas, reutilizar `lead-form-fields.tsx` (recomendado).
**Criterio**: detalhe do card mostra/edita todos os campos; salvar via PATCH `/api/leads/[id]`.

### CHANGE-13 kanban-card.tsx (display)
**EDITAR**: `components/kanban/kanban-card.tsx`
**Steps**: substituir `lead.origem` por `lead.funil_origem` na badge (linhas 82-88).
**Criterio**: card no kanban mostra badge correta.

## Validacao final
- [ ] `npx tsc --noEmit` passa.
- [ ] `npm run build` passa.
- [ ] `grep -r "custom_fields\|UNIVERSAL_FIELDS\|customFieldsSchemaSchema\|universal-fields\|custom-fields-builder\|custom-field-input" --include='*.ts' --include='*.tsx'` nao retorna nada.
- [ ] Bethel roda `supabase/migrations/0015_lead_fixed_schema.sql` no SQL Editor.
- [ ] Manual smoke: criar funil sem tab "Campos"; criar card preenchendo todos os campos; editar lead via modal de detalhe; arrastar entre etapas (automacao continua funcionando).

## Ordem de execucao

Sequencial (interdependencias):
1. CHANGE-1 (migration) -> Bethel aplica antes do resto compilar.
2. CHANGE-2, CHANGE-3, CHANGE-4 paralelo (schemas).
3. CHANGE-5 (delete legacy).
4. CHANGE-6, CHANGE-7 (limpa consumidores legacy).
5. CHANGE-8 (database.types).
6. CHANGE-9, CHANGE-10 (server).
7. CHANGE-11, CHANGE-12 (client). 13 junto.
8. Validacao.
