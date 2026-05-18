-- 0013_funil_agenda_call.sql
-- Adiciona configuração de "agendar call" no funil de origem:
-- quando uma call é marcada no card, ele migra automaticamente para o
-- funil/etapa configurados (tipicamente o funil do closer).

ALTER TABLE public.funis
  ADD COLUMN agenda_call_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN funil_destino_id UUID REFERENCES public.funis(id) ON DELETE SET NULL,
  ADD COLUMN etapa_destino_id UUID REFERENCES public.etapas(id) ON DELETE SET NULL;

-- Só SDR e Social Selling podem habilitar o recurso. Funis de closer não agendam:
-- são o destino do agendamento, não a origem.
ALTER TABLE public.funis
  ADD CONSTRAINT funis_agenda_call_origem_valida
  CHECK (
    agenda_call_enabled = FALSE
    OR role_alvo IN ('sdr', 'social_selling')
  );

-- Se habilitado, ambos os destinos são obrigatórios. A consistência adicional
-- (funil destino é closer + etapa pertence ao funil destino) é garantida no
-- route handler PATCH /api/funis/[id], pois CHECK não aceita subqueries.
ALTER TABLE public.funis
  ADD CONSTRAINT funis_agenda_call_destino_completo
  CHECK (
    agenda_call_enabled = FALSE
    OR (funil_destino_id IS NOT NULL AND etapa_destino_id IS NOT NULL)
  );

CREATE INDEX idx_funis_destino_funil
  ON public.funis(funil_destino_id)
  WHERE funil_destino_id IS NOT NULL;
