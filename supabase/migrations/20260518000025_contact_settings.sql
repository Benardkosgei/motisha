-- ============================================================
-- Migration: 025 — Contact Info & Bank Details in system_settings
-- Created:   2026-05-18
-- Description: Seeds configurable contact info, bank details,
--              and hero content into system_settings so they
--              can be managed from the admin dashboard instead
--              of being hardcoded in the frontend.
-- ============================================================

INSERT INTO public.system_settings (key, value)
VALUES
  (
    'contact_info',
    '{
      "owner_name": "Tom Charles",
      "whatsapp": "+254768205511",
      "email": "info@motisha.co.ke",
      "support_email": "support@motisha.co.ke",
      "response_hours": 3
    }'::jsonb
  ),
  (
    'bank_details',
    '{
      "bank_name": "National Bank of Kenya (NBK)",
      "account_name": "Motisha Speaking & Training Services",
      "account_number": "01521",
      "branch": ""
    }'::jsonb
  ),
  (
    'hero_slides',
    '[
      {
        "title": "Opening Term Assembly Speech",
        "tag": "WEEK 1 · NEW",
        "sub": "Powerful opening address welcoming students back — ready to deliver",
        "icon": "🎤",
        "accent": "#0EA5E9",
        "nav": "calendar"
      },
      {
        "title": "Financial Freedom for Teachers",
        "tag": "PREMIUM COURSE",
        "sub": "10 modules · 4.5 hrs · TSC CPD hours included",
        "icon": "💰",
        "accent": "#10B981",
        "nav": "courses"
      },
      {
        "title": "Student Council Leadership Pack",
        "tag": "THIS WEEK",
        "sub": "Full training guide + meeting scripts + templates",
        "icon": "🌟",
        "accent": "#F5A623",
        "nav": "calendar"
      }
    ]'::jsonb
  )
ON CONFLICT (key) DO NOTHING;
