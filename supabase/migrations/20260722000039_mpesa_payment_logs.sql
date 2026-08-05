-- ============================================================
-- Migration: 039 — M-Pesa Payment Logs Table
-- Created:   2026-07-22
-- Description:
--   Persistent log of every M-Pesa STK push attempt and
--   callback received. Used for debugging payment failures.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mpesa_logs (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event            TEXT        NOT NULL,
  -- 'stk_push_initiated' | 'stk_push_failed' | 'callback_received'
  -- | 'callback_success' | 'callback_failed' | 'callback_ip_rejected'
  -- | 'amount_mismatch' | 'no_pending_record' | 'idempotent_skip'
  checkout_id      TEXT,
  user_id          UUID,
  phone            TEXT,
  amount           INTEGER,
  package          TEXT,
  billing          TEXT,
  mpesa_receipt    TEXT,
  result_code      INTEGER,
  result_desc      TEXT,
  error_message    TEXT,
  raw_payload      JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mpesa_logs_checkout  ON public.mpesa_logs (checkout_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_logs_user      ON public.mpesa_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_logs_event     ON public.mpesa_logs (event);
CREATE INDEX IF NOT EXISTS idx_mpesa_logs_created   ON public.mpesa_logs (created_at DESC);

-- Admins can read all logs; no one can write from the client (server-only via service role)
ALTER TABLE public.mpesa_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mpesa_logs_admin_read"
  ON public.mpesa_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-purge logs older than 90 days (keep table lean)
CREATE OR REPLACE FUNCTION public.purge_old_mpesa_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_deleted INTEGER;
BEGIN
  DELETE FROM public.mpesa_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Schedule via pg_cron if available (weekly cleanup)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'purge-old-mpesa-logs',
      '0 2 * * 0',
      $cron$SELECT public.purge_old_mpesa_logs()$cron$
    );
  END IF;
END;
$$;
