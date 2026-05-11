-- 0002_funnels.sql
-- Tables: funis, etapas, user_funis.

-- ===== funis =====
CREATE TABLE public.funis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#A1A1A1',
  descricao TEXT,
  role_alvo user_role NOT NULL,
  custom_fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Schema: [{ id, nome, tipo: custom_field_type, obrigatorio, opcoes?: string[], placeholder? }]
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_funis_role_alvo ON public.funis(role_alvo) WHERE is_archived = FALSE;
CREATE INDEX idx_funis_archived ON public.funis(is_archived);

CREATE TRIGGER trg_funis_updated_at
BEFORE UPDATE ON public.funis
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== etapas =====
CREATE TABLE public.etapas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funil_id UUID NOT NULL REFERENCES public.funis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#525252',
  ordem INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (funil_id, ordem)
);

CREATE INDEX idx_etapas_funil ON public.etapas(funil_id, ordem);

CREATE TRIGGER trg_etapas_updated_at
BEFORE UPDATE ON public.etapas
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== user_funis (M:N) =====
CREATE TABLE public.user_funis (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  funil_id UUID NOT NULL REFERENCES public.funis(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, funil_id)
);

CREATE INDEX idx_user_funis_funil ON public.user_funis(funil_id);
