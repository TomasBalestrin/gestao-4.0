-- 0018_followups.sql
-- Adiciona coluna `follow_up_at` em cards (data simples, sem hora) e cria
-- tabela `follow_ups` com historico de follow-ups (id, card_id, user_id,
-- due_date, done_at). Agenda passa a listar calls + follow_ups juntos.
-- RLS: dono ve seus follow-ups; admin ve tudo; quem tem acesso ao funil
-- do card tambem ve (preparado pra spectator mode da 0019).

BEGIN;

-- 1) Coluna no card (atalho rapido — o follow-up ativo do card).
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS follow_up_at date;

-- 2) Tabela com historico.
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pra agenda do user (so pendentes).
CREATE INDEX IF NOT EXISTS idx_follow_ups_user_due
  ON public.follow_ups(user_id, due_date) WHERE done_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_follow_ups_card
  ON public.follow_ups(card_id);

-- 3) RLS.
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- SELECT: dono, admin, ou quem tem acesso ao funil do card (inclui spectator
-- depois da migration 0019).
CREATE POLICY follow_ups_select ON public.follow_ups
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM public.cards c
      JOIN public.user_funis uf ON uf.funil_id = c.funil_id
      WHERE c.id = follow_ups.card_id
        AND uf.user_id = auth.uid()
    )
  );

CREATE POLICY follow_ups_insert ON public.follow_ups
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR is_admin()
  );

CREATE POLICY follow_ups_update ON public.follow_ups
  FOR UPDATE USING (
    user_id = auth.uid() OR is_admin()
  );

CREATE POLICY follow_ups_delete ON public.follow_ups
  FOR DELETE USING (
    user_id = auth.uid() OR is_admin()
  );

COMMIT;
