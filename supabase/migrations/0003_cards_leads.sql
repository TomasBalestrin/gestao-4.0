-- 0003_cards_leads.sql
-- Tables: leads, cards.

-- ===== leads =====
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  origem TEXT,  -- 'manual', 'wa_inbound', 'ig_inbound', etc
  observacoes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_leads_telefone ON public.leads(telefone) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_email ON public.leads(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_nome_trgm ON public.leads USING gin (nome gin_trgm_ops);
CREATE INDEX idx_leads_deleted ON public.leads(deleted_at);

CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== cards =====
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  funil_id UUID NOT NULL REFERENCES public.funis(id) ON DELETE CASCADE,
  etapa_id UUID NOT NULL REFERENCES public.etapas(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  parent_card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,  -- para 'duplicate_to'
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  ordem_na_etapa INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_cards_funil_etapa ON public.cards(funil_id, etapa_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cards_assigned ON public.cards(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_cards_lead ON public.cards(lead_id);
CREATE INDEX idx_cards_created_at ON public.cards(created_at DESC);
CREATE INDEX idx_cards_parent ON public.cards(parent_card_id) WHERE parent_card_id IS NOT NULL;
CREATE INDEX idx_cards_custom_fields_gin ON public.cards USING gin (custom_fields);
CREATE INDEX idx_cards_deleted ON public.cards(deleted_at);

CREATE TRIGGER trg_cards_updated_at
BEFORE UPDATE ON public.cards
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
