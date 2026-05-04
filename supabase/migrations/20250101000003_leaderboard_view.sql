-- ============================================================
-- Migration: 004 — Leaderboard View
-- Created:   2025-01-01
-- Description: Materialised-style view for referral leaderboard
--              so the app can query it with a single SELECT
-- ============================================================

CREATE OR REPLACE VIEW public.referral_leaderboard AS
SELECT
  p.id,
  p.name,
  p.county,
  COUNT(r.id)::INTEGER        AS total_referrals,
  COALESCE(SUM(r.points_earned), 0)::INTEGER AS total_points
FROM public.profiles p
LEFT JOIN public.referrals r ON r.referrer_id = p.id
GROUP BY p.id, p.name, p.county
ORDER BY total_referrals DESC, total_points DESC;

-- Grant read access to authenticated users
GRANT SELECT ON public.referral_leaderboard TO authenticated;
