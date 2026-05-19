-- 0023_financeiro_visao_global.sql
-- Ajuste: financeiro nao tem mais painel proprio, ele usa o /crm normal
-- com visao read-only de TODOS os cards/leads/vendas de TODOS os funis.
-- As policies anteriores (0021) que limitavam o financeiro a funis com
-- role_alvo='financeiro' deixam de existir; entram policies amplas.
--
-- Idempotente: DROP IF EXISTS antes de CREATE.

-- ===== Cards =====
DROP POLICY IF EXISTS cards_select_financeiro ON public.cards;
DROP POLICY IF EXISTS cards_update_financeiro ON public.cards;

-- Financeiro le todos os cards. Sem UPDATE policy: financeiro e read-only
-- no kanban (mutations bloqueadas em requireCrmWrite no server).
CREATE POLICY cards_select_financeiro_all ON public.cards
  FOR SELECT USING (is_financeiro());

-- ===== Leads =====
DROP POLICY IF EXISTS leads_select_financeiro ON public.leads;

CREATE POLICY leads_select_financeiro_all ON public.leads
  FOR SELECT USING (is_financeiro());

-- ===== Vendas =====
DROP POLICY IF EXISTS vendas_select_financeiro ON public.vendas;

CREATE POLICY vendas_select_financeiro_all ON public.vendas
  FOR SELECT USING (is_financeiro());

-- Funis e etapas: ja sao visiveis pra todos os autenticados (policies
-- funis_select / etapas_select em 0007). Nao precisa de policy extra.

-- Notas: as policies antigas eram restritivas (so funis financeiro). Como
-- nao havia funis com role_alvo='financeiro' criados, isso so estendeu o
-- escopo, sem expor dados que ja deveriam estar visiveis pra essa role.
