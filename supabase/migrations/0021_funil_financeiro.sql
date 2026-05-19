-- 0021_funil_financeiro.sql
-- Conecta funil "do closer" a um funil "do financeiro" via configuracao:
-- quando o card chega na etapa_envio_financeiro_id, uma COPIA do card e
-- criada no funil_financeiro_id (na primeira etapa dele). O card original
-- permanece no funil de origem para o closer continuar acompanhando.

-- Novo valor de evento de auditoria para a copia automatica.
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'card_copied_to_financeiro';

ALTER TABLE public.funis
  ADD COLUMN funil_financeiro_id UUID REFERENCES public.funis(id) ON DELETE SET NULL,
  ADD COLUMN etapa_envio_financeiro_id UUID REFERENCES public.etapas(id) ON DELETE SET NULL;

-- Se um dos campos esta setado, o outro tambem precisa estar. A consistencia
-- adicional (etapa pertence ao funil origem; funil destino tem role_alvo=
-- 'financeiro') e validada no route handler PATCH /api/funis/[id], pois
-- CHECK nao aceita subqueries.
ALTER TABLE public.funis
  ADD CONSTRAINT funis_envio_financeiro_completo
  CHECK (
    (funil_financeiro_id IS NULL AND etapa_envio_financeiro_id IS NULL)
    OR (funil_financeiro_id IS NOT NULL AND etapa_envio_financeiro_id IS NOT NULL)
  );

CREATE INDEX idx_funis_funil_financeiro
  ON public.funis(funil_financeiro_id)
  WHERE funil_financeiro_id IS NOT NULL;

-- Helper: usuario atual e financeiro?
CREATE OR REPLACE FUNCTION is_financeiro()
RETURNS BOOLEAN AS $$
  SELECT auth_user_role() = 'financeiro';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ===== RLS cards: financeiro ve todos os cards de funis com role_alvo='financeiro' =====
-- A policy de SELECT existente (cards_select_owner_or_admin) NAO e alterada.
-- Esta adiciona um caminho extra: financeiro le qualquer card cujo funil
-- tem role_alvo='financeiro'. Cards copiados para o funil financeiro caem
-- nesse predicate. Cards do closer (com assigned_to filtrado) seguem
-- invisiveis para o financeiro, como esperado.
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

-- Etapas e funis ja tem policies abertas para todos (etapas_select / funis_select).
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
