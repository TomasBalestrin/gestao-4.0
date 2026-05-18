-- Adds 'user_deleted' to audit_event_type enum so hard deletes can be logged.

ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'user_deleted';
