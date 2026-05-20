-- 0024_call_analyses.sql
-- Analise de calls via Google Drive + OpenAI.
-- Closer conecta Drive proprio, sistema baixa transcricoes (Google Docs),
-- AI extrai nome do cliente, gera nota e analise estruturada,
-- vincula a um lead do closer (match exato normalizado) ou marca unmatched.
-- Idempotente (DROP IF EXISTS / IF NOT EXISTS em todos os artefatos).

-- ===== Enums =====
DO $$ BEGIN
  CREATE TYPE google_drive_status AS ENUM (
    'pending',          -- registrado, aguardando OAuth
    'connected',        -- token valido
    'disconnected',     -- desconectado manualmente
    'expired_token'     -- refresh falhou
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE call_analysis_status AS ENUM (
    'pending',          -- arquivo descoberto, ainda nao processado
    'processing',       -- AI rodando
    'unmatched',        -- processada, sem lead vinculado (revisao manual)
    'matched',          -- processada e vinculada a lead
    'failed'            -- erro irrecuperavel
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Audit events novos.
ALTER TYPE audit_entity_type ADD VALUE IF NOT EXISTS 'google_drive_integration';
ALTER TYPE audit_entity_type ADD VALUE IF NOT EXISTS 'call_analysis';

ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'google_drive_connected';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'google_drive_disconnected';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'google_drive_token_refreshed';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'google_drive_config_updated';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'call_analysis_created';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'call_analysis_linked';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'call_analysis_unmatched';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'call_analysis_deleted';

-- ===== google_drive_integrations =====
-- 1 integration por user (UNIQUE em user_id). Tokens em texto plano
-- (criptografia em camada separada ou pgcrypto depois, igual padrao ig_instances).
CREATE TABLE IF NOT EXISTS public.google_drive_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  google_email TEXT,
  -- Tokens OAuth do Google.
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  -- Configuracao da sincronizacao.
  folder_id TEXT,
  folder_name TEXT,
  -- Filtros para identificar arquivos de transcricao corretos.
  file_keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- MIME types aceitos. Default: Google Docs (Meet transcript).
  file_mime_types TEXT[] NOT NULL DEFAULT ARRAY['application/vnd.google-apps.document']::TEXT[],
  status google_drive_status NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gdi_status
  ON public.google_drive_integrations(status);
CREATE INDEX IF NOT EXISTS idx_gdi_token_expires
  ON public.google_drive_integrations(token_expires_at)
  WHERE status = 'connected';

DROP TRIGGER IF EXISTS trg_gdi_updated_at ON public.google_drive_integrations;
CREATE TRIGGER trg_gdi_updated_at
BEFORE UPDATE ON public.google_drive_integrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== call_analyses =====
-- 1 row por (closer, google_file_id). Idempotencia garantida pelo UNIQUE.
CREATE TABLE IF NOT EXISTS public.call_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- lead_id pode ser NULL ate match (status=unmatched) ou se lead for deletado.
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  -- Arquivo no Drive de origem.
  google_file_id TEXT NOT NULL,
  google_file_name TEXT NOT NULL,
  google_file_modified_at TIMESTAMPTZ,
  -- Conteudo + analise.
  transcription_text TEXT,
  client_name_extracted TEXT,
  call_score NUMERIC(3,1),                  -- 0.0 a 10.0
  analysis_json JSONB,                      -- schema flexivel
  -- Estado.
  status call_analysis_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  tokens_used INTEGER,                      -- tracking de custo OpenAI
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (closer_id, google_file_id)
);

CREATE INDEX IF NOT EXISTS idx_ca_closer
  ON public.call_analyses(closer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ca_lead
  ON public.call_analyses(lead_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ca_status
  ON public.call_analyses(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ca_created
  ON public.call_analyses(created_at DESC);

DROP TRIGGER IF EXISTS trg_ca_updated_at ON public.call_analyses;
CREATE TRIGGER trg_ca_updated_at
BEFORE UPDATE ON public.call_analyses
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== RLS =====
ALTER TABLE public.google_drive_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_analyses ENABLE ROW LEVEL SECURITY;

-- google_drive_integrations: dono ve a sua; admin ve todas.
-- INSERT/UPDATE via admin client (callback OAuth + cron); user pode UPDATE
-- de configuracao (folder_id, keywords) via /api/google/integrations/me PATCH.
DROP POLICY IF EXISTS gdi_select_owner_or_admin ON public.google_drive_integrations;
CREATE POLICY gdi_select_owner_or_admin ON public.google_drive_integrations
  FOR SELECT USING (
    is_admin() OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS gdi_update_owner ON public.google_drive_integrations;
CREATE POLICY gdi_update_owner ON public.google_drive_integrations
  FOR UPDATE USING (
    is_admin() OR user_id = auth.uid()
  );

-- INSERT e DELETE somente via admin client (server-side).

-- call_analyses: admin tudo; closer suas proprias; lider ve do closer
-- que compartilha funil com ele.
DROP POLICY IF EXISTS ca_select_admin_owner_lider ON public.call_analyses;
CREATE POLICY ca_select_admin_owner_lider ON public.call_analyses
  FOR SELECT USING (
    is_admin()
    OR closer_id = auth.uid()
    OR (
      (SELECT role FROM public.users WHERE id = auth.uid()) = 'lider'
      AND EXISTS (
        SELECT 1
        FROM public.user_funis uf_lider
        JOIN public.user_funis uf_closer
          ON uf_closer.funil_id = uf_lider.funil_id
        WHERE uf_lider.user_id = auth.uid()
          AND uf_closer.user_id = call_analyses.closer_id
      )
    )
  );

-- INSERT/UPDATE/DELETE de call_analyses somente via admin client (sync engine,
-- api routes server-side com requireAuth). Sem policies de write pra users.
