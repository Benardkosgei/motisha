-- ============================================================
-- Migration: 038 — Payment & Subscription Gap Fixes
-- Created:   2026-07-15
-- Description:
--   1. Add billing_days to system_settings (Gap 10 — remove hardcoded durations)
--   2. Add subscription_reminder_sent column to profiles (Gap 6 — renewal reminders)
--   3. Add subscription expiry downgrade function + cron (Gap 1)
--   4. Add stale mpesa_pending cleanup function + cron (Gap 3)
--   5. Drop active_subscribers column from plans (Gap 8 — redundant stale column)
-- ============================================================

-- ── 1. Seed billing_days into system_settings ─────────────────────────────────
-- Stores the authoritative day count for each billing period.
-- The callback route reads this instead of using hardcoded values.

INSERT INTO public.system_settings (key, value)
VALUES (
  'billing_days',
  '{"monthly": 30, "termly": 120, "yearly": 365}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ── 2. Add subscription renewal reminder tracking column ─────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_reminder_sent TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.subscription_reminder_sent IS
  'Timestamp when the 7-day subscription renewal reminder email was last sent. Reset to NULL after each renewal.';

-- ── 3. Subscription expiry downgrade ────────────────────────────────────────
-- Function that resets subscription_tier to ''free'' for profiles whose
-- subscription_expires_at has passed. Called daily by pg_cron.

CREATE OR REPLACE FUNCTION public.downgrade_expired_subscriptions()
RETURNS TABLE(
  affected_count  INTEGER,
  user_ids        UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids   UUID[];
  v_count INTEGER := 0;
BEGIN
  -- Collect IDs of expired paid subscribers
  SELECT ARRAY_AGG(id)
  INTO   v_ids
  FROM   public.profiles
  WHERE  subscription_tier IN ('pro', 'school')
    AND  subscription_expires_at IS NOT NULL
    AND  subscription_expires_at < NOW();

  IF v_ids IS NULL OR array_length(v_ids, 1) = 0 THEN
    RETURN QUERY SELECT 0, '{}'::UUID[];
    RETURN;
  END IF;

  -- Reset to free tier, clear subscription metadata, reset download limit
  UPDATE public.profiles
  SET
    subscription_tier           = 'free',
    subscription_package        = NULL,
    subscription_billing        = NULL,
    subscription_expires_at     = NULL,
    subscription_reminder_sent  = NULL,
    downloads_limit             = 10   -- restore free tier default
  WHERE id = ANY(v_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count, v_ids;
END;
$$;

COMMENT ON FUNCTION public.downgrade_expired_subscriptions IS
  'Resets subscription_tier to free for all profiles whose subscription_expires_at is in the past. Call daily via pg_cron.';

-- ── 4. Stale mpesa_pending cleanup ───────────────────────────────────────────
-- Removes mpesa_pending_* keys from system_settings that are older than 2 hours.
-- STK push sessions expire within 60-90 seconds; 2 hours is a safe buffer.

CREATE OR REPLACE FUNCTION public.cleanup_stale_mpesa_pending()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER := 0;
  v_cutoff  TIMESTAMPTZ := NOW() - INTERVAL '2 hours';
  v_key     TEXT;
  v_ts      TIMESTAMPTZ;
BEGIN
  FOR v_key IN
    SELECT key
    FROM   public.system_settings
    WHERE  key LIKE 'mpesa_pending_%'
  LOOP
    BEGIN
      -- value is JSONB with a 'timestamp' field
      SELECT (value->>'timestamp')::TIMESTAMPTZ
      INTO   v_ts
      FROM   public.system_settings
      WHERE  key = v_key;

      IF v_ts IS NOT NULL AND v_ts < v_cutoff THEN
        DELETE FROM public.system_settings WHERE key = v_key;
        v_deleted := v_deleted + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Skip keys with malformed values
      NULL;
    END;
  END LOOP;

  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_stale_mpesa_pending IS
  'Deletes mpesa_pending_* entries from system_settings older than 2 hours. Call hourly via pg_cron.';

-- ── 5. pg_cron scheduling ────────────────────────────────────────────────────
-- These require pg_cron to be enabled in your Supabase project.
-- Enable via: Database > Extensions > pg_cron
-- If pg_cron is not available, call these endpoints from an external cron
-- service (e.g. cPanel cron, GitHub Actions) hitting the scheduler routes.

DO $$
BEGIN
  -- Only schedule if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    -- Run subscription downgrade daily at 00:15 UTC (03:15 EAT)
    PERFORM cron.schedule(
      'downgrade-expired-subscriptions',
      '15 0 * * *',
      $cron$SELECT public.downgrade_expired_subscriptions()$cron$
    );

    -- Clean stale mpesa_pending_* keys every hour
    PERFORM cron.schedule(
      'cleanup-stale-mpesa-pending',
      '0 * * * *',
      $cron$SELECT public.cleanup_stale_mpesa_pending()$cron$
    );

  END IF;
END;
$$;

-- ── 6. Drop stale active_subscribers column from plans ───────────────────────
-- The admin plans API computes live counts from profiles on every request.
-- The column was kept in sync by a trigger but that trigger fired on every
-- profile subscription update — unnecessary overhead.

DROP TRIGGER IF EXISTS profiles_sync_plan_subscribers ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_plan_subscriber_count();
ALTER TABLE public.plans DROP COLUMN IF EXISTS active_subscribers;
