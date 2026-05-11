-- 0004_automations.sql
-- Tables: automacoes, automation_errors.

-- ===== automacoes =====
CREATE TABLE public.automacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etapa_id UUID NOT NULL REFERENCES public.etapas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  action automacao_action NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- move_to: { target_etapa_id, target_funil_id }
  -- duplicate_to: { targets: [{ etapa_id, funil_id }] }
  notificacoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ tipo: 'in_app'|'whatsapp'|'instagram', target_role?: user_role, target_user_id?: uuid, mensagem?: string }]
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automacoes_etapa ON public.automacoes(etapa_id) WHERE ativo = TRUE;

CREATE TRIGGER trg_automacoes_updated_at
BEFORE UPDATE ON public.automacoes
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== automation_errors =====
CREATE TABLE public.automation_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automacao_id UUID REFERENCES public.automacoes(id) ON DELETE SET NULL,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  error_message TEXT NOT NULL,
  error_code TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_errors_unresolved ON public.automation_errors(card_id) WHERE resolved_at IS NULL;
CREATE INDEX idx_automation_errors_created ON public.automation_errors(created_at DESC);
