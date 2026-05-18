# CHANGE | Venda completa (21 campos, tab no modal) + mascaras de input

> Falcao | 2026-05-19 1000 | v1.0
> Tipo: feature + refactor
> Estimativa: 11 tasks, ~110 min

## Contexto

O modal atual de "Registrar venda" tem so 5 campos. Bethel quer um
formulario completo de contrato com 21 campos cobrindo identificacao,
endereco, contato e dados comerciais. Mudancas:

1. **Vendas reformuladas**: substituir esquema da tabela `vendas` por 21
   campos (produto, nome_completo, nacionalidade, estado_civil, cpf, rg,
   cnpj, endereco, bairro, cidade, cep, instagram, email, whatsapp,
   data_nascimento, valor, forma_pagamento, vigencia, data, funil_id,
   sdr_id). Decidido pelo Bethel: tudo na `vendas` como snapshot do
   contrato.
2. **UI nova**: trocar o modal Dialog "Registrar venda" por um TAB
   `Venda` no sidebar do KanbanCardModal. O botao do header desaparece.
   Tab mostra lista de vendas existentes + form de nova venda.
3. **Estado Civil**: lista fixa de 5 opcoes (Solteiro(a), Casado(a),
   Divorciado(a), Viuvo(a), Uniao estavel).
4. **Funil e SDR**: selecao manual obrigatoria (sem prefill do contexto).
   SDR aceita role `sdr` OU `social_selling`.
5. **Mascaras**: implementar formatadores em `lib/utils/formatters.ts`
   (telefone BR + internacional, CPF, CNPJ, CEP, valor R$, Instagram com
   @). Aplicar no form de lead e form de venda.

## Analise

### Campos novos da `vendas` (21)

| Coluna | Tipo | Notas |
|--------|------|-------|
| produto | TEXT | CHECK contra PRODUTO_OFERTADO_OPTIONS (6) |
| nome_completo | TEXT NOT NULL | |
| nacionalidade | TEXT | default opcional "Brasileira" no front |
| estado_civil | TEXT | CHECK lista fixa |
| cpf | TEXT | armazena so digitos, formatado na UI |
| rg | TEXT | livre |
| cnpj | TEXT | armazena so digitos, formatado na UI |
| endereco | TEXT | rua + numero + complemento, texto livre |
| bairro | TEXT | |
| cidade | TEXT | |
| cep | TEXT | so digitos |
| instagram | TEXT | sem @ no storage, com @ na UI |
| email | TEXT | |
| whatsapp | TEXT | DDI + numero, so digitos |
| data_nascimento | DATE | |
| valor | NUMERIC(14,2) NOT NULL | renomeacao de valor_venda |
| forma_pagamento | TEXT | textarea longa |
| vigencia | TEXT | renomeacao de vigencia_contrato |
| data_venda | DATE | data oficial da venda (distinta de created_at) |
| funil_id | UUID FK funis(id) ON DELETE SET NULL | |
| sdr_id | UUID FK users(id) ON DELETE SET NULL | filtra role IN (sdr, social_selling) |

### Campos atuais que saem
- `valor_entrada` (nao esta na lista nova)
- `negociacao` (substituido por forma_pagamento)
- `notas` (nao esta na lista nova)
- `vigencia_contrato` → renomeia pra `vigencia`
- `valor_venda` → renomeia pra `valor`

### EDITAR
- `lib/database.types.ts` — shape da tabela `vendas` atualizada.
- `lib/schemas/venda.ts` — schema novo com 21 campos.
- `app/api/leads/[id]/vendas/route.ts` — POST aceita todos campos
  novos + validacao.
- `components/kanban/kanban-card-modal-sidebar.tsx` — adicionar pane
  `venda`.
- `components/kanban/kanban-card-modal.tsx` — remove botao "Registrar
  venda" do header; renderiza nova pane `<KanbanCardModalVenda />`.
- `components/kanban/lead-form-fields.tsx` — aplicar mascaras em
  telefone e instagram.
- `types/domain.ts` — VendaWithUser atualizado.

### CRIAR
- `supabase/migrations/0017_vendas_campos_completos.sql` — DROP colunas
  obsoletas, ADD novas, RENAME, CHECK constraints.
- `lib/constants/estado-civil.ts` — `ESTADO_CIVIL_OPTIONS`.
- `lib/utils/formatters.ts` — funcoes `formatPhone`, `formatCPF`,
  `formatCNPJ`, `formatCEP`, `formatCurrencyBR`, `formatInstagram`,
  `unmask` (extrai so digitos).
- `components/kanban/venda-form-fields.tsx` — 21 inputs com mascaras
  apropriadas. <= 250 linhas, se exceder divide em sub-componentes.
- `components/kanban/kanban-card-modal-venda.tsx` — pane que lista
  vendas existentes do lead + form de nova venda.

### DELETAR
- `components/kanban/registrar-venda-modal.tsx` (botao do header e
  pane substituem o modal isolado).

### NAO TOCAR
- Schemas funil/card/lead.
- Automation engine.
- API de leads (so o GET continua igual).
- audit_log structure.

### Riscos
- DROP de colunas em `vendas` perde dados ja gravados. Como a feature de
  venda subiu agora e nao tem dados em prod, OK.
- Botao "Registrar venda" do header desaparece. Acesso passa a ser via
  tab no sidebar do modal. UX muda. Esperado pelo Bethel.
- Mascaras telefone: heuristica DDI. Numeros que comecam com `+` ou
  tem 13+ digitos sao tratados como internacionais (sem mascara BR).
  Caso edge: numeros muito antigos sem 9 digito (8 digitos no celular)
  vao formatar `(99) 9999-9999`. Aceitavel.
- Mascara CPF/CNPJ valida apenas formato, NAO valida digito verificador.
  Se Bethel quiser validacao de DV, fazemos depois.

## Tasks

### CHANGE-1 Migration 0017
**CRIAR**: `supabase/migrations/0017_vendas_campos_completos.sql`
**Steps**:
1. `ALTER TABLE vendas DROP COLUMN valor_entrada, negociacao, notas;`
2. `ALTER TABLE vendas RENAME COLUMN valor_venda TO valor;`
3. `ALTER TABLE vendas RENAME COLUMN vigencia_contrato TO vigencia;`
4. `ALTER TABLE vendas ADD COLUMN produto TEXT, nome_completo TEXT NOT
   NULL DEFAULT '', nacionalidade TEXT, estado_civil TEXT, cpf TEXT, rg
   TEXT, cnpj TEXT, endereco TEXT, bairro TEXT, cidade TEXT, cep TEXT,
   instagram TEXT, email TEXT, whatsapp TEXT, data_nascimento DATE,
   forma_pagamento TEXT, data_venda DATE, funil_id UUID REFERENCES
   funis(id) ON DELETE SET NULL, sdr_id UUID REFERENCES users(id) ON
   DELETE SET NULL;`
5. `ALTER TABLE vendas ALTER COLUMN nome_completo DROP DEFAULT;` (depois
   do ADD, pra nao quebrar — DEFAULT '' usado so para tabela vazia).
6. CHECK produto contra lista fixa + CHECK estado_civil.
7. Indexes funil_id, sdr_id, data_venda.
**Criterio**: SQL roda sem erro.

### CHANGE-2 lib/database.types.ts + types/domain.ts
**EDITAR**: `lib/database.types.ts`, `types/domain.ts`
**Steps**: atualizar tabela vendas shape (DROP valor_entrada, negociacao,
notas + RENAME valor_venda→valor + RENAME vigencia_contrato→vigencia +
ADD 17 colunas novas). Adicionar FK relationships funil_id/sdr_id.
**Criterio**: typecheck.

### CHANGE-3 lib/constants/estado-civil.ts
**CRIAR**: `lib/constants/estado-civil.ts`
**Steps**: exporta `ESTADO_CIVIL_OPTIONS = ["solteiro", "casado",
"divorciado", "viuvo", "uniao_estavel"] as const` + labels para UI
(map `solteiro` -> "Solteiro(a)" etc).
**Criterio**: importavel.

### CHANGE-4 lib/utils/formatters.ts
**CRIAR**: `lib/utils/formatters.ts`
**Steps**: funcoes puras:
- `onlyDigits(s)` extrai digitos
- `formatPhoneBR(digits)` aplica `(99) 9 9999-9999` ou `(99) 9999-9999`
- `formatPhoneIntl(digits)` retorna `+DDI ...`. Heuristica: 11+ digitos
  na origem ou comecando com `+` na entrada -> internacional
- `formatPhone(input)` decide entre BR e intl
- `formatCPF(digits)` -> `000.000.000-00`
- `formatCNPJ(digits)` -> `00.000.000/0000-00`
- `formatCEP(digits)` -> `00000-000`
- `formatCurrencyBR(cents|number)` -> `R$ 1.234,56`
- `formatInstagram(s)` -> garante prefixo `@` (sem espaco)
- `parseCurrencyBR(masked)` -> number
**Criterio**: cobre os formatos pedidos.

### CHANGE-5 lib/schemas/venda.ts (reescrever)
**EDITAR**: `lib/schemas/venda.ts`
**Steps**: substituir `createVendaSchema` antigo. Novo schema com 21
campos. `valor` obrigatorio > 0. `nome_completo` obrigatorio. Demais
opcionais/nullable. produto e estado_civil sao z.enum.
**Criterio**: typecheck.

### CHANGE-6 API POST /api/leads/[id]/vendas
**EDITAR**: `app/api/leads/[id]/vendas/route.ts`
**Steps**: GET ja retorna `*`, OK. POST aceita todos campos novos.
**Criterio**: insert no banco com todos campos.

### CHANGE-7 KanbanCardModalSidebar pane "venda"
**EDITAR**: `components/kanban/kanban-card-modal-sidebar.tsx`
**Steps**:
1. Adicionar `"venda"` em `CardModalPane`.
2. Adicionar item NAV com icone `CircleDollarSign` ou `Banknote`.
3. Item visivel so se `canRegisterVenda` (prop nova). Apenas admin OU
   closer.
**Criterio**: sidebar mostra novo tab pra admin/closer.

### CHANGE-8 Componentes venda-form-fields + kanban-card-modal-venda
**CRIAR**: `components/kanban/venda-form-fields.tsx`,
`components/kanban/kanban-card-modal-venda.tsx`
**Steps**:
1. `venda-form-fields.tsx`: 21 campos divididos em 4 secoes (Produto,
   Identificacao, Endereco, Contato/Venda). Aplicar mascaras nos
   relevantes (CPF, CNPJ, CEP, whatsapp, valor, instagram). Selects
   para produto, estado_civil, funil_id (via /api/funis), sdr_id (via
   /api/users/sdrs + role social_selling, precisa adicionar endpoint
   ou estender existente).
2. `kanban-card-modal-venda.tsx`: pane do modal. Lista vendas
   existentes (via `useQuery /api/leads/{leadId}/vendas`) + botao "+
   Nova venda" que abre o form inline. Submit chama `POST /api/leads/
   {leadId}/vendas`, invalida e reseta form.
3. Limite 250 linhas cada. Se exceder, dividir secoes em sub-arquivos.
**Criterio**: criar venda completa pela UI funciona.

### CHANGE-9 KanbanCardModal: integra tab e remove botao header
**EDITAR**: `components/kanban/kanban-card-modal.tsx`
**Steps**:
1. Remover `RegistrarVendaModal` do header (botao + import).
2. Renderizar `<KanbanCardModalVenda card={card} />` quando `pane ===
   "venda"`.
3. Passar `canRegisterVenda` para Sidebar.
**Criterio**: ao clicar no novo item do sidebar, abre o tab Venda.

### CHANGE-10 Apagar registrar-venda-modal.tsx
**DELETAR**: `components/kanban/registrar-venda-modal.tsx`
**Criterio**: arquivo removido, sem imports orfaos.

### CHANGE-11 Aplicar mascaras no lead-form-fields.tsx
**EDITAR**: `components/kanban/lead-form-fields.tsx`
**Steps**:
1. Input telefone: usa `formatPhone(value)` no display, `unmask` no
   payload (mas como guarda como TEXT, podemos guardar formatado).
   Decisao: armazena formatado pra simplicidade. Search por telefone
   ja funciona com ilike.
2. Input instagram: usa `formatInstagram`.
**Criterio**: campos mostram mascara enquanto digita.

### CHANGE-12 Endpoint /api/users/sdrs incluir social_selling
**EDITAR**: `app/api/users/sdrs/route.ts`
**Steps**: trocar filtro `.eq("role", "sdr")` por
`.in("role", ["sdr", "social_selling"])`.
**Criterio**: GET inclui ambos os roles.

### CHANGE-13 Validacao + commit + push
**Steps**:
1. `npx tsc --noEmit`.
2. `npm run build`.
3. `grep -r "registrar-venda-modal"` zero refs.
4. Commit + push.

## Validacao final
- [ ] tsc passa
- [ ] build passa
- [ ] Migration 0017 roda no Supabase sem erro
- [ ] Smoke: abrir card, tab Venda visivel pra admin/closer, criar
  venda preenchendo todos campos, ve aparecer na lista
