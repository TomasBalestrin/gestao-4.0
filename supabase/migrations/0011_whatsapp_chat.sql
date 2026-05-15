-- 0011_whatsapp_chat.sql
-- Tables: wa_instances, chat_threads, chat_messages + storage bucket chat-media.

-- ===== Enum extensions =====
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'wa_instance_connected';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'wa_instance_disconnected';
ALTER TYPE public.audit_entity_type ADD VALUE IF NOT EXISTS 'wa_instance';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'chat_message_received';

-- ===== New enums =====
CREATE TYPE wa_instance_status AS ENUM (
  'pending',
  'qr_pending',
  'connected',
  'disconnected'
);

CREATE TYPE chat_direction AS ENUM (
  'inbound',
  'outbound'
);

CREATE TYPE chat_content_type AS ENUM (
  'text',
  'image',
  'audio',
  'video',
  'document',
  'sticker',
  'location',
  'unsupported'
);

-- ===== wa_instances =====
CREATE TABLE public.wa_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  nextapi_instance_id TEXT NOT NULL UNIQUE,
  -- Opcional: o NextTrack auth é por email/senha da conta (token compartilhado).
  -- Esta coluna fica disponível caso o provider passe a expor token por instância.
  nextapi_instance_token TEXT,
  phone_number TEXT,
  status wa_instance_status NOT NULL DEFAULT 'pending',
  last_qr_code TEXT,
  last_qr_at TIMESTAMPTZ,
  last_connected_at TIMESTAMPTZ,
  last_disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_instances_user ON public.wa_instances(user_id);
CREATE INDEX idx_wa_instances_status ON public.wa_instances(status);

CREATE TRIGGER trg_wa_instances_updated_at
BEFORE UPDATE ON public.wa_instances
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== chat_threads =====
CREATE TABLE public.chat_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  wa_instance_id UUID NOT NULL REFERENCES public.wa_instances(id) ON DELETE CASCADE,
  remote_jid TEXT NOT NULL,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lead_id, wa_instance_id)
);

CREATE INDEX idx_chat_threads_instance_last_msg
  ON public.chat_threads(wa_instance_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_chat_threads_remote_jid ON public.chat_threads(remote_jid);
CREATE INDEX idx_chat_threads_lead ON public.chat_threads(lead_id);

CREATE TRIGGER trg_chat_threads_updated_at
BEFORE UPDATE ON public.chat_threads
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== chat_messages =====
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  nextapi_message_id TEXT,
  direction chat_direction NOT NULL,
  from_me BOOLEAN NOT NULL,
  content_type chat_content_type NOT NULL,
  text TEXT,
  media_path TEXT,
  media_mime_type TEXT,
  media_size_bytes INT,
  metadata JSONB,
  wa_timestamp TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_chat_messages_nextapi_id
  ON public.chat_messages(nextapi_message_id)
  WHERE nextapi_message_id IS NOT NULL;
CREATE INDEX idx_chat_messages_thread_ts
  ON public.chat_messages(thread_id, wa_timestamp DESC);

-- ===== RLS: estilo WhatsApp pessoal. =====
-- User normal vê só o próprio número. Admin vê tudo (auditoria).
ALTER TABLE public.wa_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY wa_instances_select_own_or_admin ON public.wa_instances
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY wa_instances_insert_own ON public.wa_instances
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY wa_instances_update_own_or_admin ON public.wa_instances
  FOR UPDATE USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY wa_instances_delete_own_or_admin ON public.wa_instances
  FOR DELETE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY chat_threads_select ON public.chat_threads
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.wa_instances
      WHERE wa_instances.id = chat_threads.wa_instance_id
        AND wa_instances.user_id = auth.uid()
    )
  );

CREATE POLICY chat_threads_insert_authenticated ON public.chat_threads
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY chat_threads_update_own_or_admin ON public.chat_threads
  FOR UPDATE USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.wa_instances
      WHERE wa_instances.id = chat_threads.wa_instance_id
        AND wa_instances.user_id = auth.uid()
    )
  );

CREATE POLICY chat_messages_select ON public.chat_messages
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.chat_threads t
      JOIN public.wa_instances w ON w.id = t.wa_instance_id
      WHERE t.id = chat_messages.thread_id
        AND w.user_id = auth.uid()
    )
  );

CREATE POLICY chat_messages_insert_authenticated ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===== Storage bucket: chat-media =====
-- Path: chat-media/{wa_instance_id}/{message_id}.{ext}
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY chat_media_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-media'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM public.wa_instances
        WHERE wa_instances.id::text = (storage.foldername(name))[1]
          AND wa_instances.user_id = auth.uid()
      )
    )
  );

CREATE POLICY chat_media_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-media'
    AND EXISTS (
      SELECT 1 FROM public.wa_instances
      WHERE wa_instances.id::text = (storage.foldername(name))[1]
        AND wa_instances.user_id = auth.uid()
    )
  );

CREATE POLICY chat_media_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat-media'
    AND EXISTS (
      SELECT 1 FROM public.wa_instances
      WHERE wa_instances.id::text = (storage.foldername(name))[1]
          AND wa_instances.user_id = auth.uid()
    )
  );
