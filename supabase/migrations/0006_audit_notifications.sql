-- 0006_audit_notifications.sql
-- Tables: audit_log, notifications, configuracoes_globais.

-- ===== audit_log (append-only) =====
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type audit_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  event_type audit_event_type NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  before JSONB,
  after JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_event_type ON public.audit_log(event_type);
CREATE INDEX idx_audit_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);

-- ===== notifications =====
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tipo notification_type NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  link TEXT,
  metadata JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_all ON public.notifications(user_id, created_at DESC);

-- ===== configuracoes_globais =====
CREATE TABLE public.configuracoes_globais (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_config_updated_at
BEFORE UPDATE ON public.configuracoes_globais
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
