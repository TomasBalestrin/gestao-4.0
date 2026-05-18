-- 0007_rls_policies.sql
-- Enables RLS on all business tables + defines all policies.
-- Helper functions auth_user_role() / is_admin() are created in 0001_init.sql.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_funis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closer_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_globais ENABLE ROW LEVEL SECURITY;

-- ===== users =====
CREATE POLICY users_select_own_or_admin ON public.users
  FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.users WHERE id = auth.uid()));

CREATE POLICY users_admin_full ON public.users
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ===== funis =====
CREATE POLICY funis_select ON public.funis
  FOR SELECT USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM public.user_funis WHERE funil_id = funis.id AND user_id = auth.uid())
  );

CREATE POLICY funis_admin_full ON public.funis
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ===== etapas =====
CREATE POLICY etapas_select ON public.etapas
  FOR SELECT USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM public.user_funis WHERE funil_id = etapas.funil_id AND user_id = auth.uid())
  );

CREATE POLICY etapas_admin_full ON public.etapas
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ===== user_funis =====
CREATE POLICY user_funis_select ON public.user_funis
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY user_funis_admin_full ON public.user_funis
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ===== leads =====
CREATE POLICY leads_select ON public.leads
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.cards
      WHERE cards.lead_id = leads.id
        AND (cards.assigned_to = auth.uid() OR cards.created_by = auth.uid())
    )
  );

CREATE POLICY leads_insert ON public.leads
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY leads_update ON public.leads
  FOR UPDATE USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.cards
      WHERE cards.lead_id = leads.id
        AND (cards.assigned_to = auth.uid() OR cards.created_by = auth.uid())
    )
  );

-- ===== cards =====
CREATE POLICY cards_select_owner_or_admin ON public.cards
  FOR SELECT USING (
    is_admin()
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY cards_insert_authenticated ON public.cards
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (created_by = auth.uid() OR is_admin())
    AND EXISTS (
      SELECT 1 FROM public.user_funis
      WHERE funil_id = cards.funil_id AND user_id = auth.uid()
    )
  );

CREATE POLICY cards_update_owner_or_admin ON public.cards
  FOR UPDATE USING (
    is_admin()
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY cards_delete_owner_or_admin ON public.cards
  FOR DELETE USING (
    is_admin()
    OR created_by = auth.uid()
  );

-- ===== automacoes =====
CREATE POLICY automacoes_select ON public.automacoes
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.etapas
      JOIN public.user_funis ON user_funis.funil_id = etapas.funil_id
      WHERE etapas.id = automacoes.etapa_id AND user_funis.user_id = auth.uid()
    )
  );

CREATE POLICY automacoes_admin_full ON public.automacoes
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ===== automation_errors =====
CREATE POLICY automation_errors_select ON public.automation_errors
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.cards
      WHERE cards.id = automation_errors.card_id
        AND (cards.assigned_to = auth.uid() OR cards.created_by = auth.uid())
    )
  );

CREATE POLICY automation_errors_insert ON public.automation_errors
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY automation_errors_update ON public.automation_errors
  FOR UPDATE USING (is_admin());

-- ===== closer_horarios =====
CREATE POLICY horarios_select ON public.closer_horarios
  FOR SELECT USING (
    closer_id = auth.uid()
    OR is_admin()
    OR auth_user_role() IN ('social_selling', 'lider')
  );

CREATE POLICY horarios_admin_full ON public.closer_horarios
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ===== calls =====
CREATE POLICY calls_select ON public.calls
  FOR SELECT USING (
    is_admin()
    OR closer_id = auth.uid()
    OR scheduled_by = auth.uid()
  );

CREATE POLICY calls_insert ON public.calls
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND scheduled_by = auth.uid()
  );

CREATE POLICY calls_update ON public.calls
  FOR UPDATE USING (
    is_admin()
    OR scheduled_by = auth.uid()
    OR closer_id = auth.uid()
  );

-- ===== audit_log (append-only: only SELECT + INSERT policies) =====
CREATE POLICY audit_select ON public.audit_log
  FOR SELECT USING (
    is_admin()
    OR (
      entity_type = 'card'
      AND EXISTS (
        SELECT 1 FROM public.cards
        WHERE cards.id = audit_log.entity_id
          AND (cards.assigned_to = auth.uid() OR cards.created_by = auth.uid())
      )
    )
  );

CREATE POLICY audit_insert ON public.audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- No UPDATE/DELETE policies = append-only enforced by RLS.

-- ===== notifications =====
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_insert_authenticated ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===== configuracoes_globais =====
CREATE POLICY config_select ON public.configuracoes_globais
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY config_admin_full ON public.configuracoes_globais
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());
