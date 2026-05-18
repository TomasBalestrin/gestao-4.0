# Padrões Descobertos

> Gotchas e aprendizados durante execução. Preservado entre sessões.

---

## 2026-05-18 17:00 | RLS implícita pode silenciar DELETE

Tabelas com RLS ativo mas SEM policy de DELETE definida fazem o DELETE
retornar 200 com 0 linhas afetadas (silencioso). Sintoma: UI esconde mas
DB mantém o registro.

Solução adotada: usar `createAdminClient()` (service role) em endpoints
admin de hard delete + checar role no app layer.

Detectado em: tarefa de exclusão de lead no /admin/leads.

---

## 2026-05-18 15:00 | Z-index dropdown vs Radix Dialog

Radix Select Portal renderiza no body. Se o dropdown vai dentro de Dialog,
o z-index do Select precisa estar ACIMA do z-index do Dialog (que é alto).

Valores adotados:
- modal (Dialog overlay/content): 900
- dropdown (Select/Combobox content): 950

Detectado em: bug de dropdowns "invisíveis" em forms dentro de modais.

---

## 2026-05-18 18:00 | ALTER TYPE não roda em BEGIN/COMMIT

Em Postgres, `ALTER TYPE ... ADD VALUE` não pode rodar dentro de uma
transaction explicit (BEGIN/COMMIT). Migrations que tocam enums precisam
do statement fora de transaction.

Detectado em: migration 0016 (audit_event_type adicionando venda_*).

---

## 2026-05-18 19:00 | CHECK constraint exige UPDATE prévio em colunas existentes

Ao adicionar CHECK constraint em coluna com dados, valores que não passam
no CHECK travam a migration. Fix: UPDATE prévio setando NULL nos valores
inválidos antes do `ADD CONSTRAINT`.

Detectado em: migration 0015 (funil_origem 22 valores válidos).
