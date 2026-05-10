-- 0001_init.sql
-- Extensions, enums, shared functions, helper RLS functions, table `users`.

-- ===== Extensions =====
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ===== Enums =====
CREATE TYPE user_role AS ENUM (
  'admin',
  'social_selling',
  'closer',
  'sdr',
  'financeiro',
  'lider'
);

CREATE TYPE custom_field_type AS ENUM (
  'text',
  'number',
  'date',
  'select',
  'multi_select',
  'currency',
  'phone',
  'email',
  'textarea'
);

CREATE TYPE automacao_action AS ENUM (
  'move_to',
  'duplicate_to'
);

CREATE TYPE call_status AS ENUM (
  'scheduled',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE audit_event_type AS ENUM (
  'card_created',
  'card_updated',
  'card_moved',
  'card_deleted',
  'lead_created',
  'lead_updated',
  'lead_deleted',
  'call_scheduled',
  'call_cancelled',
  'call_completed',
  'call_no_show',
  'automation_executed',
  'automation_failed',
  'funil_created',
  'funil_updated',
  'funil_archived',
  'etapa_created',
  'etapa_updated',
  'etapa_deleted',
  'user_created',
  'user_updated',
  'user_deactivated'
);

CREATE TYPE audit_entity_type AS ENUM (
  'card',
  'lead',
  'funil',
  'etapa',
  'user',
  'call',
  'automacao'
);

CREATE TYPE notification_type AS ENUM (
  'card_assigned',
  'card_moved_to_my_funil',
  'call_scheduled',
  'call_cancelled',
  'automation_failed',
  'system'
);

CREATE TYPE dia_semana AS ENUM (
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
);

-- ===== Functions =====
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== users =====
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  foto_url TEXT,
  role user_role NOT NULL DEFAULT 'social_selling',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  theme_preference TEXT NOT NULL DEFAULT 'dark' CHECK (theme_preference IN ('dark','light','system')),
  numero_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON public.users(role) WHERE is_active = TRUE;
CREATE INDEX idx_users_active ON public.users(is_active);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== Helper RLS functions (depend on public.users; LANGUAGE sql is validated at creation) =====
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT auth_user_role() = 'admin';
$$ LANGUAGE sql STABLE SECURITY DEFINER;
