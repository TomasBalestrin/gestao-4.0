> 🟢 Hulk | 2026-05-09 | v1.0

# Gestão 4.0 — Schema

## 1. Diagrama (Relacionamentos)

```
roles                1──N    users
users                1──N    cards (assigned_to, created_by)
users                1──N    calls (scheduled_by)
users                1──N    calls (closer_id)
users                1──N    closer_horarios
users                1──N    audit_log
users                1──N    notifications
users                1──N    user_funis (M:N → funis)

funis                1──N    etapas
funis                1──N    cards
funis                1──N    user_funis

etapas               1──N    cards
etapas               1──N    automacoes

leads                1──N    cards

cards                1──N    cards (parent_card_id, self-ref)
cards                1──N    calls
cards                1──N    automation_errors

automacoes           1──N    automation_errors
```

## 2. Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- busca textual em leads
```

## 3. Enums

```sql
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
```

## 4. Functions

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 5. Tabelas

### users
Estende `auth.users` do Supabase.

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  foto_url TEXT,
  role user_role NOT NULL DEFAULT 'social_selling',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  theme_preference TEXT NOT NULL DEFAULT 'dark' CHECK (theme_preference IN ('dark','light','system')),
  numero_status TEXT,  -- placeholder para integração futura WA/IG
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON public.users(role) WHERE is_active = TRUE;
CREATE INDEX idx_users_active ON public.users(is_active);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### funis

```sql
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
```

### etapas

```sql
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
```

### user_funis (M:N)

```sql
CREATE TABLE public.user_funis (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  funil_id UUID NOT NULL REFERENCES public.funis(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, funil_id)
);

CREATE INDEX idx_user_funis_funil ON public.user_funis(funil_id);
```

### leads

```sql
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
```

### cards

```sql
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
```

### automacoes

```sql
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
```

### automation_errors

```sql
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
```

### closer_horarios

```sql
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
```

### calls

```sql
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
  -- trava de slot: nenhum closer pode ter 2 calls scheduled no mesmo slot_start
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
```

> **Nota:** A constraint `EXCLUDE USING gist` exige `CREATE EXTENSION btree_gist;`. Adicionar nas extensions.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

### audit_log

```sql
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
```

> **Append-only:** sem UPDATE, sem DELETE. Garantido via RLS (policies abaixo).

### notifications

```sql
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
```

### configuracoes_globais

```sql
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
```

## 6. RLS Policies

```sql
-- Habilitar RLS em TODAS as tabelas de negócio
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_funis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closer_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_globais ENABLE ROW LEVEL SECURITY;

-- Helper function: pega role do usuário atual
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT auth_user_role() = 'admin';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ===== users =====
CREATE POLICY users_select_own_or_admin ON public.users
  FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.users WHERE id = auth.uid()));
  -- usuário não pode mudar própria role

CREATE POLICY users_admin_full ON public.users
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ===== funis =====
CREATE POLICY funis_select ON public.funis
  FOR SELECT USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM public.user_funis WHERE funil_id = funis.id AND user_id = auth.uid())
  );

CREATE POLICY funis_admin_full ON public.funis
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ===== etapas =====
CREATE POLICY etapas_select ON public.etapas
  FOR SELECT USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM public.user_funis WHERE funil_id = etapas.funil_id AND user_id = auth.uid())
  );

CREATE POLICY etapas_admin_full ON public.etapas
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ===== user_funis =====
CREATE POLICY user_funis_select ON public.user_funis
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY user_funis_admin_full ON public.user_funis
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ===== leads =====
-- Lead é visível se o usuário tem ao menos 1 card relacionado OU é admin
CREATE POLICY leads_select ON public.leads
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.cards
      WHERE cards.lead_id = leads.id
        AND (cards.assigned_to = auth.uid() OR cards.created_by = auth.uid())
    )
  );

CREATE POLICY leads_insert ON public.leads
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY leads_update ON public.leads
  FOR UPDATE USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.cards
      WHERE cards.lead_id = leads.id
        AND (cards.assigned_to = auth.uid() OR cards.created_by = auth.uid())
    )
  );

-- ===== cards =====
CREATE POLICY cards_select_owner_or_admin ON public.cards
  FOR SELECT USING (
    is_admin()
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY cards_insert_authenticated ON public.cards
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (created_by = auth.uid() OR is_admin())
    AND EXISTS (
      SELECT 1 FROM public.user_funis
      WHERE funil_id = cards.funil_id AND user_id = auth.uid()
    )
  );

CREATE POLICY cards_update_owner_or_admin ON public.cards
  FOR UPDATE USING (
    is_admin()
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY cards_delete_owner_or_admin ON public.cards
  FOR DELETE USING (
    is_admin()
    OR created_by = auth.uid()
  );

-- ===== automacoes =====
CREATE POLICY automacoes_select ON public.automacoes
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.etapas
      JOIN public.user_funis ON user_funis.funil_id = etapas.funil_id
      WHERE etapas.id = automacoes.etapa_id AND user_funis.user_id = auth.uid()
    )
  );

CREATE POLICY automacoes_admin_full ON public.automacoes
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ===== automation_errors =====
CREATE POLICY automation_errors_select ON public.automation_errors
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.cards
      WHERE cards.id = automation_errors.card_id
        AND (cards.assigned_to = auth.uid() OR cards.created_by = auth.uid())
    )
  );

CREATE POLICY automation_errors_insert ON public.automation_errors
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY automation_errors_update ON public.automation_errors
  FOR UPDATE USING (is_admin());

-- ===== closer_horarios =====
CREATE POLICY horarios_select ON public.closer_horarios
  FOR SELECT USING (
    closer_id = auth.uid()
    OR is_admin()
    OR auth_user_role() IN ('social_selling', 'lider')
  );

CREATE POLICY horarios_admin_full ON public.closer_horarios
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());

-- ===== calls =====
CREATE POLICY calls_select ON public.calls
  FOR SELECT USING (
    is_admin()
    OR closer_id = auth.uid()
    OR scheduled_by = auth.uid()
  );

CREATE POLICY calls_insert ON public.calls
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND scheduled_by = auth.uid()
  );

CREATE POLICY calls_update ON public.calls
  FOR UPDATE USING (
    is_admin()
    OR scheduled_by = auth.uid()
    OR closer_id = auth.uid()
  );

-- ===== audit_log =====
-- SELECT: admin vê tudo. Usuário vê eventos de cards/leads que ele opera.
CREATE POLICY audit_select ON public.audit_log
  FOR SELECT USING (
    is_admin()
    OR (
      entity_type = 'card'
      AND EXISTS (
        SELECT 1 FROM public.cards
        WHERE cards.id = audit_log.entity_id
          AND (cards.assigned_to = auth.uid() OR cards.created_by = auth.uid())
      )
    )
  );

-- INSERT: qualquer autenticado (chamado via lib/audit/logger.ts)
CREATE POLICY audit_insert ON public.audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE/DELETE: nunca. Append-only.
-- (Sem policies de UPDATE/DELETE = bloqueado por RLS)

-- ===== notifications =====
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_insert_authenticated ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===== configuracoes_globais =====
CREATE POLICY config_select ON public.configuracoes_globais
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY config_admin_full ON public.configuracoes_globais
  FOR ALL USING (is_admin())
  WITH CHECK (is_admin());
```

## 7. Views

### v_cards_with_lead

```sql
CREATE OR REPLACE VIEW v_cards_with_lead AS
SELECT
  c.id,
  c.funil_id,
  c.etapa_id,
  c.assigned_to,
  c.created_by,
  c.parent_card_id,
  c.custom_fields,
  c.ordem_na_etapa,
  c.created_at,
  c.updated_at,
  l.id AS lead_id,
  l.nome AS lead_nome,
  l.email AS lead_email,
  l.telefone AS lead_telefone,
  l.origem AS lead_origem,
  e.nome AS etapa_nome,
  e.cor AS etapa_cor,
  u.nome AS assigned_nome,
  u.foto_url AS assigned_foto
FROM public.cards c
JOIN public.leads l ON l.id = c.lead_id
JOIN public.etapas e ON e.id = c.etapa_id
LEFT JOIN public.users u ON u.id = c.assigned_to
WHERE c.deleted_at IS NULL AND l.deleted_at IS NULL;
```

### v_calls_with_context

```sql
CREATE OR REPLACE VIEW v_calls_with_context AS
SELECT
  ca.id,
  ca.slot_start,
  ca.slot_end,
  ca.status,
  ca.notes,
  ca.created_at,
  c.id AS card_id,
  l.nome AS lead_nome,
  l.telefone AS lead_telefone,
  closer.id AS closer_id,
  closer.nome AS closer_nome,
  scheduler.id AS scheduled_by_id,
  scheduler.nome AS scheduled_by_nome
FROM public.calls ca
JOIN public.cards c ON c.id = ca.card_id
JOIN public.leads l ON l.id = c.lead_id
JOIN public.users closer ON closer.id = ca.closer_id
JOIN public.users scheduler ON scheduler.id = ca.scheduled_by;
```

## 8. Storage Buckets

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- RLS em avatars
CREATE POLICY avatars_select_public ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY avatars_insert_own ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY avatars_update_own ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY avatars_delete_own ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

## 9. Seed (Dev)

```sql
-- Usuário admin inicial
-- (Criar via Supabase Auth UI ou via script com createAdminClient)
-- Após criar auth.users, popular public.users:

INSERT INTO public.users (id, email, nome, role, must_change_password, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',  -- substituir pelo UUID real do auth.users
  'admin@gestao40.local',
  'Admin',
  'admin',
  FALSE,
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- Configuração inicial
INSERT INTO public.configuracoes_globais (key, value, description)
VALUES
  ('inbound_default_funil_id', 'null'::jsonb, 'Funil padrão para leads inbound (preencher depois)'),
  ('default_theme', '"dark"'::jsonb, 'Tema padrão da plataforma')
ON CONFLICT (key) DO NOTHING;

-- Funil de exemplo
INSERT INTO public.funis (id, nome, cor, role_alvo, custom_fields_schema, created_by)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Social Selling',
  '#A1A1A1',
  'social_selling',
  '[
    {"id":"valor","nome":"Valor estimado","tipo":"currency","obrigatorio":false},
    {"id":"origem_detalhada","nome":"Origem detalhada","tipo":"select","obrigatorio":false,"opcoes":["Indicação","Instagram","Anúncio","Outro"]},
    {"id":"observacoes","nome":"Observações","tipo":"textarea","obrigatorio":false}
  ]'::jsonb,
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- Etapas do funil
INSERT INTO public.etapas (id, funil_id, nome, cor, ordem)
VALUES
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Novo lead', '#525252', 1),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Em conversa', '#A1A1A1', 2),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Call agendada', '#D4D4D4', 3),
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', 'Fechado', '#10B981', 4),
  ('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111', 'Perdido', '#EF4444', 5)
ON CONFLICT (id) DO NOTHING;
```

## 10. Migration Order

1. `0001_init.sql` — Extensions, enums, function `update_updated_at`, helper functions `auth_user_role`/`is_admin`, table `users`.
2. `0002_funnels.sql` — `funis`, `etapas`, `user_funis`.
3. `0003_cards_leads.sql` — `leads`, `cards`.
4. `0004_automations.sql` — `automacoes`, `automation_errors`.
5. `0005_horarios_calls.sql` — `closer_horarios`, `calls` (com `btree_gist`).
6. `0006_audit_notifications.sql` — `audit_log`, `notifications`, `configuracoes_globais`.
7. `0007_rls_policies.sql` — Habilita RLS + todas as policies.
8. `0008_views.sql` — `v_cards_with_lead`, `v_calls_with_context`.
9. `0009_storage.sql` — Bucket `avatars` + policies.
10. `seed.sql` — Dados de dev (executar manualmente).
