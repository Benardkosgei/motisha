-- Add index on site_visits.created_at to speed up the range queries
-- used by the admin analytics API (last 7 / 30 / 90 day counts + trend fetch).
CREATE INDEX IF NOT EXISTS idx_site_visits_created_at ON public.site_visits (created_at DESC);
