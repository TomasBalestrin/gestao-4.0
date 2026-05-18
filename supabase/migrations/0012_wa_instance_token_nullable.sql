-- 0012_wa_instance_token_nullable.sql
-- A coluna nextapi_instance_token virou opcional após a migração para o
-- NextTrack/NextApps (auth é por email/senha da conta, não por token por
-- instância). Linhas existentes ficam intactas; novos inserts não precisam
-- mais informar o token.

ALTER TABLE public.wa_instances
  ALTER COLUMN nextapi_instance_token DROP NOT NULL;
