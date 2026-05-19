-- 0021_funil_financeiro.sql
-- Habilita o painel /financeiro: usuario com role 'financeiro' precisa
-- enxergar e editar cards/leads/vendas em funis com role_alvo='financeiro'.
-- A copia automatica de cards quando o closer fecha venda e feita pelas
-- automacoes existentes (action 'duplicate_to') configuradas no funil de
-- origem.

-- Helper: usuario atual e financeiro?
CREATE OR REPLACE FUNCTION is_financeiro()
RETURNS BOOLEAN AS $$
  SELECT auth_user_role() = 'financeiro';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ===== RLS cards: financeiro ve todos os cards de funis com role_alvo='financeiro' =====
-- A policy de SELECT existente (cards_select_owner_or_admin) NAO e alterada.
-- Esta adiciona um caminho extra: financeiro le qualquer card cujo funil
-- tem role_alvo='financeiro'. Cards do closer (com assigned_to filtrado)
-- seguem invisiveis para o financeiro, como esperado.
CREATE POLICY cards_select_financeiro ON public.cards
  FOR SELECT USING (
    is_financeiro()
    AND EXISTS (
      SELECT 1 FROM public.funis
      WHERE funis.id = cards.funil_id
        AND funis.role_alvo = 'financeiro'
    )
  );

-- Financeiro pode mover/editar cards do funil financeiro (seu kanban).
CREATE POLICY cards_update_financeiro ON public.cards
  FOR UPDATE USING (
    is_financeiro()
    AND EXISTS (
      SELECT 1 FROM public.funis
      WHERE funis.id = cards.funil_id
        AND funis.role_alvo = 'financeiro'
    )
  );

-- Leads associados a cards do funil financeiro ficam visiveis (pra exibir
-- nome/telefone/email no kanban). Reaproveita o EXISTS via cards.
CREATE POLICY leads_select_financeiro ON public.leads
  FOR SELECT USING (
    is_financeiro()
    AND EXISTS (
      SELECT 1 FROM public.cards c
      JOIN public.funis f ON f.id = c.funil_id
      WHERE c.lead_id = leads.id
        AND f.role_alvo = 'financeiro'
    )
  );

-- Vendas: financeiro precisa ver vendas dos leads que enxerga.
CREATE POLICY vendas_select_financeiro ON public.vendas
  FOR SELECT USING (
    is_financeiro()
    AND EXISTS (
      SELECT 1 FROM public.cards c
      JOIN public.funis f ON f.id = c.funil_id
      WHERE c.lead_id = vendas.lead_id
        AND f.role_alvo = 'financeiro'
    )
  );
