-- ============================================================
-- Migration: 020 — Dedicated Bookings Table + Service Menus
-- Created:   2025-05-13
-- Description:
--   1. service_menus — admin-managed service catalogue
--   2. service_packages — packages within each service
--   3. bookings — dedicated table replacing author_submissions workaround
-- ============================================================

-- ============================================================
-- 1. service_menus
-- ============================================================
CREATE TABLE IF NOT EXISTS public.service_menus (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  icon         TEXT        NOT NULL DEFAULT '🎤',
  title        TEXT        NOT NULL,
  color        TEXT        NOT NULL DEFAULT '#0EA5E9',
  gradient     TEXT        NOT NULL DEFAULT 'linear-gradient(135deg, #0EA5E922, #06B6D412)',
  tagline      TEXT        NOT NULL DEFAULT '',
  has_submenu  BOOLEAN     NOT NULL DEFAULT false,
  active       BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_menus_sort ON public.service_menus (sort_order);

-- ============================================================
-- 2. service_packages (sub-services + packages flattened)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.service_packages (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id         UUID        NOT NULL REFERENCES public.service_menus(id) ON DELETE CASCADE,
  -- Sub-service grouping (for menus with has_submenu = true)
  sub_id          TEXT        NOT NULL,   -- e.g. 'whole-school', 'agm'
  sub_icon        TEXT        NOT NULL DEFAULT '🎤',
  sub_title       TEXT        NOT NULL,
  sub_audience    TEXT        NOT NULL DEFAULT '',
  sub_duration    TEXT        NOT NULL DEFAULT '',
  sub_color       TEXT        NOT NULL DEFAULT '#0EA5E9',
  currency        TEXT        NOT NULL DEFAULT 'KES' CHECK (currency IN ('KES','USD')),
  includes        JSONB       NOT NULL DEFAULT '[]'::jsonb,
  -- Package within the sub-service
  pkg_id          TEXT        NOT NULL,   -- e.g. 'ws-std', 'agm-b'
  pkg_label       TEXT        NOT NULL,
  pkg_fee         INTEGER     NOT NULL CHECK (pkg_fee >= 0),
  pkg_highlight   TEXT,
  pkg_description TEXT        NOT NULL DEFAULT '',
  pkg_recommended BOOLEAN     NOT NULL DEFAULT false,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  active          BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_packages_menu_sub_pkg_unique UNIQUE (menu_id, sub_id, pkg_id)
);

CREATE INDEX IF NOT EXISTS idx_service_packages_menu ON public.service_packages (menu_id, sort_order);

-- ============================================================
-- 3. bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Service info (denormalised for history)
  service_menu_id     UUID        REFERENCES public.service_menus(id) ON DELETE SET NULL,
  service_name        TEXT        NOT NULL,
  sub_service_id      TEXT        NOT NULL DEFAULT '',
  sub_service_name    TEXT        NOT NULL DEFAULT '',
  package_id          TEXT        NOT NULL DEFAULT '',
  package_label       TEXT        NOT NULL DEFAULT '',
  fee                 INTEGER     NOT NULL DEFAULT 0,
  currency            TEXT        NOT NULL DEFAULT 'KES',
  -- Event details
  event_date          DATE,
  event_time          TEXT,
  school              TEXT        NOT NULL DEFAULT '',
  county              TEXT        NOT NULL DEFAULT '',
  contact_name        TEXT        NOT NULL DEFAULT '',
  contact_phone       TEXT        NOT NULL DEFAULT '',
  contact_email       TEXT        NOT NULL DEFAULT '',
  attendees           TEXT        NOT NULL DEFAULT '',
  description         TEXT        NOT NULL DEFAULT '',
  -- Status lifecycle
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','confirmed','deposit_paid','completed','cancelled','rejected')),
  admin_notes         TEXT,
  -- Payment
  deposit_amount      INTEGER,
  deposit_paid_at     TIMESTAMPTZ,
  mpesa_checkout_id   TEXT,
  mpesa_receipt       TEXT,
  payment_method      TEXT        CHECK (payment_method IS NULL OR payment_method IN ('mpesa','bank','card')),
  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user      ON public.bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status    ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_created   ON public.bookings (created_at DESC);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_service_menus_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.set_service_packages_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.set_bookings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS service_menus_set_updated_at ON public.service_menus;
CREATE TRIGGER service_menus_set_updated_at
  BEFORE UPDATE ON public.service_menus FOR EACH ROW
  EXECUTE FUNCTION public.set_service_menus_updated_at();

DROP TRIGGER IF EXISTS service_packages_set_updated_at ON public.service_packages;
CREATE TRIGGER service_packages_set_updated_at
  BEFORE UPDATE ON public.service_packages FOR EACH ROW
  EXECUTE FUNCTION public.set_service_packages_updated_at();

DROP TRIGGER IF EXISTS bookings_set_updated_at ON public.bookings;
CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON public.bookings FOR EACH ROW
  EXECUTE FUNCTION public.set_bookings_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.service_menus    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings         ENABLE ROW LEVEL SECURITY;

-- Service menus: public read
CREATE POLICY "service_menus_select_all"    ON public.service_menus    FOR SELECT USING (true);
CREATE POLICY "service_packages_select_all" ON public.service_packages FOR SELECT USING (true);

-- Bookings: users see their own
CREATE POLICY "bookings_select_own"
  ON public.bookings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "bookings_insert_own"
  ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================
-- SEED: Service Menus
-- ============================================================

-- Insert menus
WITH m AS (
  INSERT INTO public.service_menus (id, sort_order, icon, title, color, gradient, tagline, has_submenu, active)
  VALUES
    ('00000000-0001-0000-0000-000000000001', 1, '🎤', 'Motivational Talks',  '#0EA5E9', 'linear-gradient(135deg, #0EA5E922, #06B6D412)', 'Ignite potential across your school community',          true,  true),
    ('00000000-0002-0000-0000-000000000001', 2, '🌟', 'Leadership Training', '#FBBF24', 'linear-gradient(135deg, #FBBF2422, #F5A62312)', 'Equip student leaders to lead with purpose',             false, true),
    ('00000000-0003-0000-0000-000000000001', 3, '⚡', 'Capacity Building',   '#10B981', 'linear-gradient(135deg, #10B98122, #06B6D412)', 'Transform your school''s staff culture from within',     false, true),
    ('00000000-0004-0000-0000-000000000001', 4, '🇰🇪','KESSHA Conference',   '#EF4444', 'linear-gradient(135deg, #EF444422, #F5A62312)', 'Keynote excellence for Kenya''s school heads',           false, true),
    ('00000000-0005-0000-0000-000000000001', 5, '🏢', 'Corporate Events',    '#38BDF8', 'linear-gradient(135deg, #38BDF822, #0EA5E912)', 'World-class engagement for teams & organisations',       false, true)
  ON CONFLICT DO NOTHING
  RETURNING id, title
)
SELECT * FROM m;

-- ============================================================
-- SEED: Service Packages
-- ============================================================

-- Motivational Talks — Whole School
INSERT INTO public.service_packages
  (menu_id, sub_id, sub_icon, sub_title, sub_audience, sub_duration, sub_color, currency, includes, pkg_id, pkg_label, pkg_fee, pkg_description, pkg_recommended, sort_order)
VALUES
  ('00000000-0001-0000-0000-000000000001',
   'whole-school','🏫','Motivational Talk — Whole School','All students','2–3 hours','#0EA5E9','KES',
   '["Tom Charles as lead speaker","Branded materials & handouts","Post-session student workbook","Certificate of participation","Photo highlights"]'::jsonb,
   'ws-std','Standard Session',25000,
   'High-energy motivational session for the entire student body. Covers goal-setting, resilience, CBC alignment, and personal excellence with full audience participation.',
   false, 1)
ON CONFLICT (menu_id, sub_id, pkg_id) DO NOTHING;

-- Motivational Talks — Specific Class
INSERT INTO public.service_packages
  (menu_id, sub_id, sub_icon, sub_title, sub_audience, sub_duration, sub_color, currency, includes, pkg_id, pkg_label, pkg_fee, pkg_description, pkg_recommended, sort_order)
VALUES
  ('00000000-0001-0000-0000-000000000001',
   'specific-class','📚','Motivational Talk — Specific Class','Targeted class or stream','2–3 hours','#06B6D4','KES',
   '["Dedicated facilitator","Class-specific messaging","Student commitment cards","Virtual follow-up check-in"]'::jsonb,
   'sc-std','Class Session',20000,
   'Focused, intimate motivational session for a specific class — ideal for Form 4s facing KCSE, Form 1 transitions, or any class needing targeted intervention on behaviour, focus or performance.',
   false, 2)
ON CONFLICT (menu_id, sub_id, pkg_id) DO NOTHING;

-- Motivational Talks — AGM Package A
INSERT INTO public.service_packages
  (menu_id, sub_id, sub_icon, sub_title, sub_audience, sub_duration, sub_color, currency, includes, pkg_id, pkg_label, pkg_fee, pkg_highlight, pkg_description, pkg_recommended, sort_order)
VALUES
  ('00000000-0001-0000-0000-000000000001',
   'agm','🏛️','Motivational Talk — AGM / Academic Day / Parents Day','Parents, teachers & students','1–3 hours','#F5A623','KES',
   '["Tom Charles keynote address","Separate student session (Package B)","Parent Q&A facilitation","Branded event programme","Professional MC services"]'::jsonb,
   'agm-a','Package A',25000,'Parents & Teachers · 1–1.5 hrs',
   'A powerful 1–1.5 hour keynote session with parents and teachers covering CBC understanding, student support strategies, and building a strong school-home partnership.',
   false, 3)
ON CONFLICT (menu_id, sub_id, pkg_id) DO NOTHING;

-- Motivational Talks — AGM Package B
INSERT INTO public.service_packages
  (menu_id, sub_id, sub_icon, sub_title, sub_audience, sub_duration, sub_color, currency, includes, pkg_id, pkg_label, pkg_fee, pkg_highlight, pkg_description, pkg_recommended, sort_order)
VALUES
  ('00000000-0001-0000-0000-000000000001',
   'agm','🏛️','Motivational Talk — AGM / Academic Day / Parents Day','Parents, teachers & students','1–3 hours','#F5A623','KES',
   '["Tom Charles keynote address","Separate student session (Package B)","Parent Q&A facilitation","Branded event programme","Professional MC services"]'::jsonb,
   'agm-b','Package B',35000,'Parents & Teachers + Students · ~3 hrs',
   '1–1.5 hour session with parents and teachers PLUS a separate dedicated 1.5-hour session with students. Maximum impact across the entire school community in one event.',
   true, 4)
ON CONFLICT (menu_id, sub_id, pkg_id) DO NOTHING;

-- Leadership Training — Half Day
INSERT INTO public.service_packages
  (menu_id, sub_id, sub_icon, sub_title, sub_audience, sub_duration, sub_color, currency, includes, pkg_id, pkg_label, pkg_fee, pkg_highlight, pkg_description, pkg_recommended, sort_order)
VALUES
  ('00000000-0002-0000-0000-000000000001',
   'leadership-main','🌟','Leadership Training — Student Council','Student Council & Prefects','Half day or Full day','#FBBF24','KES',
   '["Tom Charles + co-facilitator","Student leadership manual","Individual leadership assessment","Certificate of leadership training","School leadership action plan","30-day accountability follow-up"]'::jsonb,
   'lt-half','Half Day Training',25000,'~4 hours',
   'Intensive half-day leadership development session covering servant leadership, public speaking fundamentals, running effective meetings, and crafting a school vision.',
   false, 1)
ON CONFLICT (menu_id, sub_id, pkg_id) DO NOTHING;

-- Leadership Training — Full Day
INSERT INTO public.service_packages
  (menu_id, sub_id, sub_icon, sub_title, sub_audience, sub_duration, sub_color, currency, includes, pkg_id, pkg_label, pkg_fee, pkg_highlight, pkg_description, pkg_recommended, sort_order)
VALUES
  ('00000000-0002-0000-0000-000000000001',
   'leadership-main','🌟','Leadership Training — Student Council','Student Council & Prefects','Half day or Full day','#FBBF24','KES',
   '["Tom Charles + co-facilitator","Student leadership manual","Individual leadership assessment","Certificate of leadership training","School leadership action plan","30-day accountability follow-up"]'::jsonb,
   'lt-full','Full Day Training',35000,'~7–8 hours',
   'Comprehensive full-day programme adding conflict resolution, team dynamics, communication mastery, and a personal leadership action plan for each participant.',
   true, 2)
ON CONFLICT (menu_id, sub_id, pkg_id) DO NOTHING;

-- Capacity Building — Half Day
INSERT INTO public.service_packages
  (menu_id, sub_id, sub_icon, sub_title, sub_audience, sub_duration, sub_color, currency, includes, pkg_id, pkg_label, pkg_fee, pkg_highlight, pkg_description, pkg_recommended, sort_order)
VALUES
  ('00000000-0003-0000-0000-000000000001',
   'capacity-main','⚡','Capacity Building — Teaching & Non-Teaching Staff','All school staff','Half day or Full day','#10B981','KES',
   '["Tom Charles + senior facilitator","Staff training workbooks","TSC CPD hours certificate","Individual goal-setting toolkit","School culture assessment report","90-day follow-up check-in"]'::jsonb,
   'cb-half','Half Day Training',25000,'~4 hours · TSC CPD hours',
   'High-impact half-day session covering work productivity, CBC implementation best practices, and professional growth. Counts toward TSC CPD hours.',
   false, 1)
ON CONFLICT (menu_id, sub_id, pkg_id) DO NOTHING;

-- Capacity Building — Full Day
INSERT INTO public.service_packages
  (menu_id, sub_id, sub_icon, sub_title, sub_audience, sub_duration, sub_color, currency, includes, pkg_id, pkg_label, pkg_fee, pkg_highlight, pkg_description, pkg_recommended, sort_order)
VALUES
  ('00000000-0003-0000-0000-000000000001',
   'capacity-main','⚡','Capacity Building — Teaching & Non-Teaching Staff','All school staff','Half day or Full day','#10B981','KES',
   '["Tom Charles + senior facilitator","Staff training workbooks","TSC CPD hours certificate","Individual goal-setting toolkit","School culture assessment report","90-day follow-up check-in"]'::jsonb,
   'cb-full','Full Day Training',40000,'~7–8 hours · Full TSC CPD certificate',
   'Full-day transformation programme: productivity systems, classroom management, financial wellness, and building a thriving school culture. Full TSC CPD certificate issued.',
   true, 2)
ON CONFLICT (menu_id, sub_id, pkg_id) DO NOTHING;

-- KESSHA — Principals
INSERT INTO public.service_packages
  (menu_id, sub_id, sub_icon, sub_title, sub_audience, sub_duration, sub_color, currency, includes, pkg_id, pkg_label, pkg_fee, pkg_highlight, pkg_description, pkg_recommended, sort_order)
VALUES
  ('00000000-0004-0000-0000-000000000001',
   'kessha-main','🇰🇪','KESSHA Conference — Keynote & Workshop','School heads & education leaders','Conference schedule','#EF4444','KES',
   '["Executive keynote (45–60 min)","Workshop facilitation","Leadership resource pack","Branded conference materials","Panel participation","Post-conference report"]'::jsonb,
   'k-principals','Principals'' Conference',30000,'For Principals',
   'Premium keynote and facilitated workshop for KESSHA Principals'' Conferences. Covers education leadership, school transformation, CBC implementation strategy, and a live Q&A.',
   false, 1)
ON CONFLICT (menu_id, sub_id, pkg_id) DO NOTHING;

-- KESSHA — Deputies
INSERT INTO public.service_packages
  (menu_id, sub_id, sub_icon, sub_title, sub_audience, sub_duration, sub_color, currency, includes, pkg_id, pkg_label, pkg_fee, pkg_highlight, pkg_description, pkg_recommended, sort_order)
VALUES
  ('00000000-0004-0000-0000-000000000001',
   'kessha-main','🇰🇪','KESSHA Conference — Keynote & Workshop','School heads & education leaders','Conference schedule','#EF4444','KES',
   '["Executive keynote (45–60 min)","Workshop facilitation","Leadership resource pack","Branded conference materials","Panel participation","Post-conference report"]'::jsonb,
   'k-deputies','Deputy Principals'' Conference',25000,'For Deputy Principals',
   'Focused keynote and workshop for Deputy Principals'' Conferences. Covers operational leadership, staff motivation, academic performance strategies, and building school identity.',
   false, 2)
ON CONFLICT (menu_id, sub_id, pkg_id) DO NOTHING;

-- Corporate — Keynote
INSERT INTO public.service_packages
  (menu_id, sub_id, sub_icon, sub_title, sub_audience, sub_duration, sub_color, currency, includes, pkg_id, pkg_label, pkg_fee, pkg_highlight, pkg_description, pkg_recommended, sort_order)
VALUES
  ('00000000-0005-0000-0000-000000000001',
   'corporate-main','🏢','Corporate Engagement — Tom Charles','Corporate teams, NGOs & organisations','45 min – 3 days','#38BDF8','USD',
   '["Tom Charles as lead speaker/facilitator","Custom corporate content design","Team assessment tools","Culture transformation roadmap","Executive coaching session","90-day impact report"]'::jsonb,
   'corp-keynote','Keynote / Motivational Talk',700,'45 min – 1.5 hrs',
   '45-minute to 1.5-hour keynote or motivational address for corporate events, annual conferences, and organisational gatherings. Customised to your company theme.',
   false, 1)
ON CONFLICT (menu_id, sub_id, pkg_id) DO NOTHING;

-- Corporate — Half Day
INSERT INTO public.service_packages
  (menu_id, sub_id, sub_icon, sub_title, sub_audience, sub_duration, sub_color, currency, includes, pkg_id, pkg_label, pkg_fee, pkg_highlight, pkg_description, pkg_recommended, sort_order)
VALUES
  ('00000000-0005-0000-0000-000000000001',
   'corporate-main','🏢','Corporate Engagement — Tom Charles','Corporate teams, NGOs & organisations','45 min – 3 days','#38BDF8','USD',
   '["Tom Charles as lead speaker/facilitator","Custom corporate content design","Team assessment tools","Culture transformation roadmap","Executive coaching session","90-day impact report"]'::jsonb,
   'corp-halfday','Half Day Engagement',850,'~4 hours',
   'Half-day facilitated engagement combining keynote, interactive team workshop, and group reflection. Ideal for offsites, strategy days, and culture sessions.',
   false, 2)
ON CONFLICT (menu_id, sub_id, pkg_id) DO NOTHING;

-- Corporate — Full Day
INSERT INTO public.service_packages
  (menu_id, sub_id, sub_icon, sub_title, sub_audience, sub_duration, sub_color, currency, includes, pkg_id, pkg_label, pkg_fee, pkg_highlight, pkg_description, pkg_recommended, sort_order)
VALUES
  ('00000000-0005-0000-0000-000000000001',
   'corporate-main','🏢','Corporate Engagement — Tom Charles','Corporate teams, NGOs & organisations','45 min – 3 days','#38BDF8','USD',
   '["Tom Charles as lead speaker/facilitator","Custom corporate content design","Team assessment tools","Culture transformation roadmap","Executive coaching session","90-day impact report"]'::jsonb,
   'corp-fullday','Full Day Engagement / Training',1000,'~8 hours',
   'Full-day corporate training or facilitation. Custom programme covering team motivation, productivity systems, leadership development, or culture transformation.',
   true, 3)
ON CONFLICT (menu_id, sub_id, pkg_id) DO NOTHING;

-- Corporate — Workshop
INSERT INTO public.service_packages
  (menu_id, sub_id, sub_icon, sub_title, sub_audience, sub_duration, sub_color, currency, includes, pkg_id, pkg_label, pkg_fee, pkg_highlight, pkg_description, pkg_recommended, sort_order)
VALUES
  ('00000000-0005-0000-0000-000000000001',
   'corporate-main','🏢','Corporate Engagement — Tom Charles','Corporate teams, NGOs & organisations','45 min – 3 days','#38BDF8','USD',
   '["Tom Charles as lead speaker/facilitator","Custom corporate content design","Team assessment tools","Culture transformation roadmap","Executive coaching session","90-day impact report"]'::jsonb,
   'corp-workshop','2–3 Day Workshop',1200,'$1,200 per day · 2–3 days',
   'Intensive multi-day workshop for deep organisational transformation. Includes pre-workshop assessment, custom content design, and a post-workshop action plan. Fee is per day.',
   false, 4)
ON CONFLICT (menu_id, sub_id, pkg_id) DO NOTHING;
