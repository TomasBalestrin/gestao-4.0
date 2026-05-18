-- 0017_vendas_campos_completos.sql
-- Reformula a tabela `vendas` para suportar o formulario completo de venda
-- (21 campos): substitui valor_entrada/negociacao/notas por dados pessoais
-- + endereco + contato + dados comerciais. Renomeia valor_venda -> valor e
-- vigencia_contrato -> vigencia. Sem dados em prod, drops sao seguros.

BEGIN;

-- 1) Drop colunas obsoletas.
ALTER TABLE public.vendas DROP COLUMN IF EXISTS valor_entrada;
ALTER TABLE public.vendas DROP COLUMN IF EXISTS negociacao;
ALTER TABLE public.vendas DROP COLUMN IF EXISTS notas;

-- 2) Renomes.
ALTER TABLE public.vendas RENAME COLUMN valor_venda TO valor;
ALTER TABLE public.vendas RENAME COLUMN vigencia_contrato TO vigencia;

-- 3) Adiciona novas colunas. nome_completo NOT NULL exige default '' so
-- pra criar a coluna se tiver linhas; depois retira o default.
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS produto TEXT,
  ADD COLUMN IF NOT EXISTS nome_completo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nacionalidade TEXT,
  ADD COLUMN IF NOT EXISTS estado_civil TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS data_venda DATE,
  ADD COLUMN IF NOT EXISTS funil_id UUID REFERENCES public.funis(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sdr_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.vendas ALTER COLUMN nome_completo DROP DEFAULT;

-- 4) CHECK constraints (idempotentes via DROP IF EXISTS + ADD).
ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS vendas_produto_valid;
ALTER TABLE public.vendas
  ADD CONSTRAINT vendas_produto_valid CHECK (
    produto IS NULL OR produto IN (
      'Mentoria Premium',
      'Mentoria Elite Premium',
      'Implementacao Comercial',
      'Bethel Club',
      'Intensivo da Alta Performance',
      'Implementacao de IA'
    )
  );

ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS vendas_estado_civil_valid;
ALTER TABLE public.vendas
  ADD CONSTRAINT vendas_estado_civil_valid CHECK (
    estado_civil IS NULL OR estado_civil IN (
      'solteiro',
      'casado',
      'divorciado',
      'viuvo',
      'uniao_estavel'
    )
  );

-- 5) Indexes para os novos FKs/filtros.
CREATE INDEX IF NOT EXISTS idx_vendas_funil ON public.vendas(funil_id);
CREATE INDEX IF NOT EXISTS idx_vendas_sdr ON public.vendas(sdr_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data_venda ON public.vendas(data_venda DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_cpf ON public.vendas(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendas_cnpj ON public.vendas(cnpj) WHERE cnpj IS NOT NULL;

COMMIT;
