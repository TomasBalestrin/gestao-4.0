-- 0019_spectator_mode.sql
-- Adiciona coluna `is_spectator` em user_funis. Spectator ve todos os cards
-- do funil mas nao move/edita (write segue bloqueado pelas policies
-- existentes de cards.UPDATE/INSERT/DELETE que exigem assigned_to=auth.uid()
-- OR created_by=auth.uid() OR is_admin()).
-- A unica policy que muda eh a de SELECT de cards: passa a permitir tambem
-- quem eh spectator do funil do card.

BEGIN;

-- 1) Coluna.
ALTER TABLE public.user_funis
  ADD COLUMN IF NOT EXISTS is_spectator BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Index parcial pra acelerar joins de spectator.
CREATE INDEX IF NOT EXISTS idx_user_funis_spectator
  ON public.user_funis(funil_id) WHERE is_spectator = TRUE;

-- 3) Estende RLS de cards.SELECT pra incluir spectator.
DROP POLICY IF EXISTS cards_select_owner_or_admin ON public.cards;
CREATE POLICY cards_select_owner_or_admin ON public.cards
  FOR SELECT USING (
    is_admin()
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_funis uf
      WHERE uf.user_id = auth.uid()
        AND uf.funil_id = cards.funil_id
        AND uf.is_spectator = TRUE
    )
  );

COMMIT;
