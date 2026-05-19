-- 0022_instagram_messaging.sql
-- Integracao Instagram Direct Messaging via Meta Graph API.
-- Modelo: 1 funil = 1 instancia IG. Qualquer membro do funil le/envia.
-- Token long-lived 60d; webhook recebe DMs e cria lead/card no funil.
-- Idempotente (DROP IF EXISTS em todos os artefatos).

-- ===== Enums =====
DO $$ BEGIN
  CREATE TYPE ig_instance_status AS ENUM (
    'pending',          -- registrado, aguardando OAuth
    'connected',        -- token valido
    'disconnected',     -- desconectado manualmente
    'expired_token'     -- token expirou e refresh falhou
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ig_direction AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ig_content_type AS ENUM (
    'text',
    'image',
    'audio',
    'video',
    'share',         -- post/reel compartilhado
    'story_reply',   -- resposta a story
    'reaction',
    'unsupported'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Audit events novos.
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'ig_instance_connected';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'ig_instance_disconnected';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'ig_token_refreshed';

-- ===== Tabelas =====

CREATE TABLE IF NOT EXISTS public.ig_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funil_id UUID NOT NULL UNIQUE REFERENCES public.funis(id) ON DELETE CASCADE,
  -- IG Business Account ID (recipient_id no webhook). Numerico do Meta.
  ig_user_id TEXT NOT NULL,
  ig_username TEXT,
  -- Page do FB ligada a essa conta IG (necessaria pra subscribe webhook).
  page_id TEXT NOT NULL,
  -- Token long-lived. Em texto plano por enquanto; criptografia em camada
  -- separada (ver lib/instagram/oauth.ts) e/ou usar pgcrypto depois.
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  status ig_instance_status NOT NULL DEFAULT 'pending',
  connected_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  last_connected_at TIMESTAMPTZ,
  last_disconnected_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ig_instances_ig_user_id
  ON public.ig_instances(ig_user_id);
CREATE INDEX IF NOT EXISTS idx_ig_instances_status
  ON public.ig_instances(status);

DROP TRIGGER IF EXISTS trg_ig_instances_updated_at ON public.ig_instances;
CREATE TRIGGER trg_ig_instances_updated_at
BEFORE UPDATE ON public.ig_instances
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.ig_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  ig_instance_id UUID NOT NULL REFERENCES public.ig_instances(id) ON DELETE CASCADE,
  -- PSID do lead (id opaco do Instagram).
  ig_sender_psid TEXT NOT NULL,
  ig_sender_username TEXT,
  -- Janela 24h: timestamp em que a janela expira (last_inbound + 24h).
  -- Quando window_expires_at <= now(), nao podemos mais enviar via API.
  window_expires_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lead_id, ig_instance_id),
  UNIQUE (ig_instance_id, ig_sender_psid)
);

CREATE INDEX IF NOT EXISTS idx_ig_threads_lead ON public.ig_threads(lead_id);
CREATE INDEX IF NOT EXISTS idx_ig_threads_last_msg
  ON public.ig_threads(last_message_at DESC NULLS LAST);

DROP TRIGGER IF EXISTS trg_ig_threads_updated_at ON public.ig_threads;
CREATE TRIGGER trg_ig_threads_updated_at
BEFORE UPDATE ON public.ig_threads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.ig_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ig_threads(id) ON DELETE CASCADE,
  -- ID da mensagem no Meta (mid). UNIQUE quando nao nulo pra idempotencia.
  meta_message_id TEXT,
  direction ig_direction NOT NULL,
  from_me BOOLEAN NOT NULL,
  content_type ig_content_type NOT NULL DEFAULT 'text',
  text TEXT,
  -- Mídia: URL original da CDN do Meta (expira em ~5 dias) ou path no
  -- nosso storage se re-hospedamos.
  media_url TEXT,
  media_path TEXT,
  media_mime_type TEXT,
  -- Para share/reaction/story_reply: payload bruto pra contexto.
  payload JSONB,
  ig_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_reason TEXT,
  sent_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ig_messages_meta_message_id
  ON public.ig_messages(meta_message_id)
  WHERE meta_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ig_messages_thread
  ON public.ig_messages(thread_id, ig_timestamp DESC);

-- ===== RLS =====
ALTER TABLE public.ig_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_messages ENABLE ROW LEVEL SECURITY;

-- ig_instances: membros do funil leem; admin tudo. Insert/update via admin
-- client (OAuth callback + cron refresh), nao via RLS user.
DROP POLICY IF EXISTS ig_instances_select_member ON public.ig_instances;
CREATE POLICY ig_instances_select_member ON public.ig_instances
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_funis uf
      WHERE uf.funil_id = ig_instances.funil_id
        AND uf.user_id = auth.uid()
    )
  );

-- ig_threads: visivel pra membros do funil da instancia.
DROP POLICY IF EXISTS ig_threads_select_member ON public.ig_threads;
CREATE POLICY ig_threads_select_member ON public.ig_threads
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.ig_instances ig
      JOIN public.user_funis uf ON uf.funil_id = ig.funil_id
      WHERE ig.id = ig_threads.ig_instance_id
        AND uf.user_id = auth.uid()
    )
  );

-- ig_threads UPDATE (mark as read): membros do funil.
DROP POLICY IF EXISTS ig_threads_update_member ON public.ig_threads;
CREATE POLICY ig_threads_update_member ON public.ig_threads
  FOR UPDATE USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.ig_instances ig
      JOIN public.user_funis uf ON uf.funil_id = ig.funil_id
      WHERE ig.id = ig_threads.ig_instance_id
        AND uf.user_id = auth.uid()
    )
  );

-- ig_messages: visivel pra membros do funil da instancia (via thread).
DROP POLICY IF EXISTS ig_messages_select_member ON public.ig_messages;
CREATE POLICY ig_messages_select_member ON public.ig_messages
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.ig_threads t
      JOIN public.ig_instances ig ON ig.id = t.ig_instance_id
      JOIN public.user_funis uf ON uf.funil_id = ig.funil_id
      WHERE t.id = ig_messages.thread_id
        AND uf.user_id = auth.uid()
    )
  );

-- Inserts feitos via admin client (webhook server-side e send endpoint).
-- Nao precisa de policy permissiva pra users; admin client ignora RLS.
