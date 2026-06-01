-- Create site visit analytics table to capture public traffic for admin reporting.
CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  page_title text NULL,
  referrer text NULL,
  user_agent text NOT NULL,
  ip_address text NULL,
  device text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.site_visits IS 'Stores public site visit events for admin analytics.';
COMMENT ON COLUMN public.site_visits.path IS 'The requested page path, including search when available.';
COMMENT ON COLUMN public.site_visits.page_title IS 'Optional page title captured from the client.';
COMMENT ON COLUMN public.site_visits.referrer IS 'Referrer URL, if available.';
COMMENT ON COLUMN public.site_visits.user_agent IS 'User agent string from the visitor.';
COMMENT ON COLUMN public.site_visits.ip_address IS 'IP address value forwarded by the client, if present.';
COMMENT ON COLUMN public.site_visits.device IS 'Derived device category, either Desktop or Mobile.';
COMMENT ON COLUMN public.site_visits.created_at IS 'Timestamp when the visit was recorded.';
