-- ============================================================
-- Migration: 009 — Admin Audit Log Table
-- Created:   2025-01-01
-- Description: Creates the admin_audit_log table for security
--              logging of all destructive admin operations.
-- Requirements: 13.5
-- ============================================================

-- ============================================================
-- admin_audit_log: records destructive admin actions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id    UUID        NOT NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  action_type      TEXT        NOT NULL,
  target_record_id UUID        NULL,
  target_table     TEXT        NULL,
  details          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user_id
  ON public.admin_audit_log (admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON public.admin_audit_log (created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit log entries
CREATE POLICY "admin_audit_log_admin_select"
  ON public.admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can insert audit log entries
CREATE POLICY "admin_audit_log_admin_insert"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
