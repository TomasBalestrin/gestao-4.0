-- 0015_lead_fixed_schema.sql
-- Substitui o sistema de custom fields dinamicos por um schema fixo de lead.
-- - leads ganha colunas tipadas (instagram, empresa, nicho, faturamento_mensal,
--   tem_socio, sdr_id, produto_ofertado, dor_principal, data_followup).
-- - leads.origem renomeia para leads.funil_origem (texto livre vira lista fixa
--   validada por CHECK constraint contra a lista de 22 origens).
-- - DROP cards.custom_fields e funis.custom_fields_schema (sem dados em prod).
-- - View v_cards_with_lead recriada sem custom_fields e exibindo novos campos.

BEGIN;

-- 1) A view referencia c.custom_fields e l.origem. Dropar antes de ALTERar.
DROP VIEW IF EXISTS public.v_cards_with_lead;

-- 2) Novas colunas em leads.
ALTER TABLE public.leads
  ADD COLUMN instagram TEXT,
  ADD COLUMN empresa TEXT,
  ADD COLUMN nicho TEXT,
  ADD COLUMN faturamento_mensal NUMERIC(14, 2),
  ADD COLUMN tem_socio BOOLEAN,
  ADD COLUMN sdr_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN produto_ofertado TEXT,
  ADD COLUMN dor_principal TEXT,
  ADD COLUMN data_followup DATE;

-- 3) Rename origem -> funil_origem.
ALTER TABLE public.leads RENAME COLUMN origem TO funil_origem;

-- 4) CHECK constraints contra listas fixas (22 origens, 6 produtos).
ALTER TABLE public.leads
  ADD CONSTRAINT leads_funil_origem_valid CHECK (
    funil_origem IS NULL OR funil_origem IN (
      '50 scripts',
      'Teste dos Arquetipos',
      'MPM',
      'Implementacao de IA da Julia',
      'Social Selling Julia',
      'Social Selling Cleiton',
      'Social Selling Bethel',
      'Social Selling Kennedy',
      'Formulario Instagram Cleiton',
      'Formulario Instagram Julia',
      'Formulario Instagram Bethel',
      'Formulario Instagram Kennedy',
      'Formulario Youtube',
      'Indicacao de Aluno',
      'Indicacao de Mentorado',
      'Indicacao de Vendedor',
      'Indicacao Elite Premium',
      'Implementacao Comercial',
      'Implementacao Personalizada IA',
      'Mentoria Julia',
      'Elite Premium',
      'Bethel Club'
    )
  );

ALTER TABLE public.leads
  ADD CONSTRAINT leads_produto_ofertado_valid CHECK (
    produto_ofertado IS NULL OR produto_ofertado IN (
      'Mentoria Premium',
      'Mentoria Elite Premium',
      'Implementacao Comercial',
      'Bethel Club',
      'Intensivo da Alta Performance',
      'Implementacao de IA'
    )
  );

-- 5) Indices para os campos consultaveis.
CREATE INDEX idx_leads_sdr ON public.leads(sdr_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_funil_origem ON public.leads(funil_origem) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_data_followup ON public.leads(data_followup) WHERE deleted_at IS NULL;

-- 6) Remover sistema legacy de custom fields.
DROP INDEX IF EXISTS public.idx_cards_custom_fields_gin;
ALTER TABLE public.cards DROP COLUMN IF EXISTS custom_fields;
ALTER TABLE public.funis DROP COLUMN IF EXISTS custom_fields_schema;
DROP TYPE IF EXISTS public.custom_field_type;

-- 7) Recriar a view com a nova shape (sem custom_fields, com funil_origem e
--    novos campos uteis do lead).
CREATE OR REPLACE VIEW public.v_cards_with_lead AS
SELECT
  c.id,
  c.funil_id,
  c.etapa_id,
  c.assigned_to,
  c.created_by,
  c.parent_card_id,
  c.ordem_na_etapa,
  c.created_at,
  c.updated_at,
  l.id AS lead_id,
  l.nome AS lead_nome,
  l.email AS lead_email,
  l.telefone AS lead_telefone,
  l.instagram AS lead_instagram,
  l.empresa AS lead_empresa,
  l.nicho AS lead_nicho,
  l.faturamento_mensal AS lead_faturamento_mensal,
  l.tem_socio AS lead_tem_socio,
  l.funil_origem AS lead_funil_origem,
  l.sdr_id AS lead_sdr_id,
  l.produto_ofertado AS lead_produto_ofertado,
  l.dor_principal AS lead_dor_principal,
  l.observacoes AS lead_observacoes,
  l.data_followup AS lead_data_followup,
  e.nome AS etapa_nome,
  e.cor AS etapa_cor,
  u.nome AS assigned_nome,
  u.foto_url AS assigned_foto
FROM public.cards c
JOIN public.leads l ON l.id = c.lead_id
JOIN public.etapas e ON e.id = c.etapa_id
LEFT JOIN public.users u ON u.id = c.assigned_to
WHERE c.deleted_at IS NULL AND l.deleted_at IS NULL;

COMMIT;
