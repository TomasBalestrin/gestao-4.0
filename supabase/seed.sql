-- seed.sql — Dados de desenvolvimento. Executar manualmente.
--
-- Pré-requisito: criar o usuário admin via Supabase Auth UI (Authentication > Users),
-- copiar o UUID gerado em auth.users e substituir o placeholder
-- '00000000-0000-4000-8000-000000000001' abaixo (em TODOS os lugares).
--
-- Os demais IDs são UUIDs v4 válidos (versão 4, variante 8) — apenas com um
-- padrão fácil de reconhecer.

-- ===== Usuário admin =====
INSERT INTO public.users (id, email, nome, role, must_change_password, is_active)
VALUES (
  '00000000-0000-4000-8000-000000000001',  -- substituir pelo UUID real de auth.users
  'admin@gestao40.local',
  'Admin',
  'admin',
  FALSE,
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- ===== Configuração inicial =====
INSERT INTO public.configuracoes_globais (key, value, description)
VALUES
  ('inbound_default_funil_id', 'null'::jsonb, 'Funil padrão para leads inbound (preencher depois)'),
  ('default_theme', '"dark"'::jsonb, 'Tema padrão da plataforma')
ON CONFLICT (key) DO NOTHING;

-- ===== Funil de exemplo =====
INSERT INTO public.funis (id, nome, cor, role_alvo, custom_fields_schema, created_by)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'Social Selling',
  '#A1A1A1',
  'social_selling',
  '[
    {"id":"valor","nome":"Valor estimado","tipo":"currency","obrigatorio":false},
    {"id":"origem_detalhada","nome":"Origem detalhada","tipo":"select","obrigatorio":false,"opcoes":["Indicação","Instagram","Anúncio","Outro"]},
    {"id":"observacoes","nome":"Observações","tipo":"textarea","obrigatorio":false}
  ]'::jsonb,
  '00000000-0000-4000-8000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- ===== Etapas do funil =====
INSERT INTO public.etapas (id, funil_id, nome, cor, ordem)
VALUES
  ('22222222-2222-4222-8222-222222222221', '11111111-1111-4111-8111-111111111111', 'Novo lead', '#525252', 1),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Em conversa', '#A1A1A1', 2),
  ('22222222-2222-4222-8222-222222222223', '11111111-1111-4111-8111-111111111111', 'Call agendada', '#D4D4D4', 3),
  ('22222222-2222-4222-8222-222222222224', '11111111-1111-4111-8111-111111111111', 'Fechado', '#10B981', 4),
  ('22222222-2222-4222-8222-222222222225', '11111111-1111-4111-8111-111111111111', 'Perdido', '#EF4444', 5)
ON CONFLICT (id) DO NOTHING;

-- ===== Vínculo admin <-> funil de exemplo =====
INSERT INTO public.user_funis (user_id, funil_id)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111'
)
ON CONFLICT (user_id, funil_id) DO NOTHING;
