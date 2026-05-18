-- 0016_vendas_e_audit.sql
-- Tabela `vendas` (N por lead) + novos values em audit enums.
-- ALTER TYPE ... ADD VALUE nao pode rodar dentro de transacao em Postgres,
-- entao essa migration NAO usa BEGIN/COMMIT global. Os ALTER TYPE rodam
-- isolados; o resto e idempotente.

ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'venda_created';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'venda_updated';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'venda_deleted';
ALTER TYPE audit_entity_type ADD VALUE IF NOT EXISTS 'venda';

CREATE TABLE IF NOT EXISTS public.vendas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  valor_venda NUMERIC(14, 2) NOT NULL CHECK (valor_venda >= 0),
  valor_entrada NUMERIC(14, 2) CHECK (valor_entrada IS NULL OR valor_entrada >= 0),
  vigencia_contrato TEXT,
  negociacao TEXT,
  notas TEXT,
  registered_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendas_lead ON public.vendas(lead_id);
CREATE INDEX IF NOT EXISTS idx_vendas_registered_by ON public.vendas(registered_by);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON public.vendas(created_at DESC);

DROP TRIGGER IF EXISTS trg_vendas_updated_at ON public.vendas;
CREATE TRIGGER trg_vendas_updated_at
BEFORE UPDATE ON public.vendas
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

-- Policies: drop-if-exists pra ser idempotente.
DROP POLICY IF EXISTS vendas_select ON public.vendas;
DROP POLICY IF EXISTS vendas_insert ON public.vendas;
DROP POLICY IF EXISTS vendas_update ON public.vendas;
DROP POLICY IF EXISTS vendas_delete ON public.vendas;

-- SELECT: qualquer autenticado com acesso CRM (segue o padrao das demais).
CREATE POLICY vendas_select ON public.vendas
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND u.is_active = TRUE
      AND u.role IN ('admin', 'closer', 'social_selling', 'sdr', 'financeiro', 'lider')
  )
);

-- INSERT: admin OU closer.
CREATE POLICY vendas_insert ON public.vendas
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND u.is_active = TRUE
      AND u.role IN ('admin', 'closer')
  )
);

-- UPDATE: admin OU quem registrou a venda.
CREATE POLICY vendas_update ON public.vendas
FOR UPDATE TO authenticated
USING (
  registered_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.is_active = TRUE AND u.role = 'admin'
  )
)
WITH CHECK (
  registered_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.is_active = TRUE AND u.role = 'admin'
  )
);

-- DELETE: so admin.
CREATE POLICY vendas_delete ON public.vendas
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.is_active = TRUE AND u.role = 'admin'
  )
);
