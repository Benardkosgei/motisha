-- ============================================================
-- Migration: 027 — Trial expiry notification
-- Sends an in-app notification when a user's trial expires.
-- Uses a scheduled approach: a function that can be called by
-- a cron job (pg_cron) or Supabase Edge Function scheduler.
-- ============================================================

-- Function: notify users whose trial expired in the last hour
-- Call this on a schedule (e.g. every hour via pg_cron or Edge Function).
CREATE OR REPLACE FUNCTION public.notify_trial_expired_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, icon, color)
  SELECT
    p.id,
    'Your Free Trial Has Ended',
    'Your 7-day free trial has expired. Subscribe to keep accessing speeches, newsletters, and unlock the full course library.',
    '🔒',
    '#EF4444'
  FROM public.profiles p
  WHERE
    -- Trial ended within the last hour (avoids duplicate notifications on re-runs)
    p.trial_ends_at IS NOT NULL
    AND p.trial_ends_at >= NOW() - INTERVAL '1 hour'
    AND p.trial_ends_at < NOW()
    -- Still on free tier (hasn't subscribed)
    AND p.subscription_tier = 'free'
    -- Don't notify if they already have a trial-expired notification from today
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = p.id
        AND n.title = 'Your Free Trial Has Ended'
        AND n.created_at >= NOW() - INTERVAL '24 hours'
    );
END;
$$;

-- ============================================================
-- Optional: if pg_cron is available, schedule hourly checks.
-- Uncomment the block below if your Supabase project has pg_cron.
-- ============================================================
-- SELECT cron.schedule(
--   'notify-trial-expired',
--   '0 * * * *',   -- every hour on the hour
--   $$ SELECT public.notify_trial_expired_users(); $$
-- );
