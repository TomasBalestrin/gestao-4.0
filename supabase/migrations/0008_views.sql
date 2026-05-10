-- 0008_views.sql
-- Views: v_cards_with_lead, v_calls_with_context.

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
