-- 0014_leads_rls_creator_visibility.sql
-- Conserta as policies leads_select/leads_update para incluir o criador.
--
-- Bug original: o criador do lead só conseguia enxergar o lead se já existisse
-- um card associado (assigned_to/created_by self). Como o fluxo padrão do CRM
-- cria primeiro o lead e DEPOIS o card, o INSERT...RETURNING usado em
-- POST /api/funis/[id]/cards quebrava para todo não-admin: o INSERT passava,
-- mas o RETURNING (passa por SELECT) retornava 0 rows -> .single() falhava.
-- O mesmo afetava soft delete de lead, que é UPDATE de deleted_at.

DROP POLICY IF EXISTS leads_select ON public.leads;
CREATE POLICY leads_select ON public.leads
  FOR SELECT USING (
    is_admin()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.cards
      WHERE cards.lead_id = leads.id
        AND (cards.assigned_to = auth.uid() OR cards.created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS leads_update ON public.leads;
CREATE POLICY leads_update ON public.leads
  FOR UPDATE USING (
    is_admin()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.cards
      WHERE cards.lead_id = leads.id
        AND (cards.assigned_to = auth.uid() OR cards.created_by = auth.uid())
    )
  );
