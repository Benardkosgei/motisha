-- Enable RLS on site_visits so regular users cannot read visitor data directly.
-- The table is written exclusively via the service-role key (supabaseAdmin)
-- from the /api/analytics/track route, so no user-facing policies are needed.

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Admins (service role) bypass RLS automatically.
-- No SELECT policy = no user can query this table via the anon/user key.
-- This prevents exposure of IP addresses, paths, and user-agent strings.
