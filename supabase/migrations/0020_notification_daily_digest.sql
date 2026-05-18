-- 0020_notification_daily_digest.sql
-- Adiciona o valor `daily_digest` no enum notification_type. ALTER TYPE
-- ADD VALUE nao pode rodar dentro de BEGIN/COMMIT no Postgres, por isso
-- sem transaction explicit aqui.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'daily_digest';
