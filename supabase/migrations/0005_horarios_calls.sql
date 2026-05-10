-- 0005_horarios_calls.sql
-- Tables: closer_horarios, calls (requires btree_gist, created in 0001).

-- ===== closer_horarios =====
CREATE TABLE public.closer_horarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  closer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  dia_semana dia_semana NOT NULL,
  blocos JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ inicio: 'HH:mm', fim: 'HH:mm' }]
  slot_duration_min INT NOT NULL DEFAULT 30 CHECK (slot_duration_min IN (5,10,15,20,30,45,60)),
  buffer_min INT NOT NULL DEFAULT 10 CHECK (buffer_min IN (0,5,10,15)),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (closer_id, dia_semana)
);

CREATE INDEX idx_horarios_closer ON public.closer_horarios(closer_id) WHERE ativo = TRUE;

CREATE TRIGGER trg_horarios_updated_at
BEFORE UPDATE ON public.closer_horarios
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== calls =====
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  closer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  scheduled_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  status call_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  cancelled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  attended_marked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- trava de slot: nenhum closer pode ter 2 calls scheduled em slots sobrepostos
  CONSTRAINT calls_slot_unique
    EXCLUDE USING gist (
      closer_id WITH =,
      tstzrange(slot_start, slot_end) WITH &&
    ) WHERE (status = 'scheduled')
);

CREATE INDEX idx_calls_closer_start ON public.calls(closer_id, slot_start) WHERE status = 'scheduled';
CREATE INDEX idx_calls_card ON public.calls(card_id);
CREATE INDEX idx_calls_scheduled_by ON public.calls(scheduled_by);
CREATE INDEX idx_calls_status ON public.calls(status);
CREATE INDEX idx_calls_slot_range ON public.calls(slot_start, slot_end);

CREATE TRIGGER trg_calls_updated_at
BEFORE UPDATE ON public.calls
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
