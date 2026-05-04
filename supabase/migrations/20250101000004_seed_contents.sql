-- ============================================================
-- Seed Data for Motisha
-- Run this AFTER applying all migrations.
-- Safe to re-run — all inserts use ON CONFLICT DO NOTHING.
-- ============================================================

-- ============================================================
-- CONTENTS — Weekly Content Calendar
-- ============================================================

INSERT INTO public.contents
  (title, type, icon, description, premium, pdf_available, week, modules)
VALUES

  -- Week 1 – Jan 6
  (
    'Opening Term Assembly Speech', 'Speech', '🎤',
    'Powerful opening address welcoming students back for Term 1, CBC-aligned.',
    false, true, 'Week 1 – Jan 6', 0
  ),
  (
    'Parent Newsletter – Term 1 Kickoff', 'Newsletter', '📮',
    'Professional bilingual newsletter covering term calendar and fees schedule.',
    false, true, 'Week 1 – Jan 6', 0
  ),
  (
    'Student Motivation Bulletin', 'Newsletter', '📰',
    'Engaging student bulletin on goal-setting and the new term ahead.',
    false, true, 'Week 1 – Jan 6', 0
  ),

  -- Week 2 – Jan 13
  (
    'Financial Planning for Teachers 2025', 'Course', '💰',
    '10-module course on SACCO wealth, NSSF Tier II, and real estate on a teacher''s salary.',
    true, false, 'Week 2 – Jan 13', 8
  ),
  (
    'Monday Motivation Speech – Resilience', 'Speech', '🌅',
    'Short punchy Monday assembly script on resilience for secondary students.',
    false, true, 'Week 2 – Jan 13', 0
  ),
  (
    'Student Council Leadership Guide', 'Template', '📋',
    'Full training manual for student council members — roles, procedures, meeting scripts.',
    true, true, 'Week 2 – Jan 13', 0
  ),

  -- Week 3 – Jan 20
  (
    'Public Speaking Masterclass', 'Course', '🎓',
    'Build confidence and command in front of any audience.',
    true, false, 'Week 3 – Jan 20', 6
  ),
  (
    'CBC Parent Explainer Newsletter', 'Newsletter', '📮',
    'Clear, jargon-free CBC explainer newsletter for parents.',
    false, true, 'Week 3 – Jan 20', 0
  ),
  (
    'Anti-Bullying Assembly Script', 'Speech', '🤝',
    'Impactful assembly script addressing school bullying with student participation.',
    false, true, 'Week 3 – Jan 20', 0
  ),
  (
    'Budget Template – Teachers Edition', 'Template', '📊',
    'Monthly budgeting spreadsheet template personalised for TSC salary earners.',
    false, true, 'Week 3 – Jan 20', 0
  ),

  -- Week 4 – Jan 27
  (
    'Work Productivity & Culture Talk', 'Course', '⚡',
    'Transform your school''s staff culture with practical productivity systems.',
    true, false, 'Week 4 – Jan 27', 5
  ),
  (
    'Mid-Month Staff Newsletter', 'Newsletter', '📰',
    'Internal staff newsletter covering school achievements and upcoming events.',
    false, true, 'Week 4 – Jan 27', 0
  ),
  (
    'Retirement Planning for Educators', 'Course', '🏖️',
    'Comprehensive retirement planning guide for teachers — pension, investments and legacy.',
    true, false, 'Week 4 – Jan 27', 7
  ),

  -- Week 5 – Feb 3
  (
    'National Day Celebration Speech', 'Speech', '🇰🇪',
    'Patriotic address honouring Kenya''s heritage for school national day events.',
    false, true, 'Week 5 – Feb 3', 0
  ),
  (
    'Leadership Training – Student Council', 'Course', '🌟',
    'Full leadership programme for student council — vision, decision-making, public speaking.',
    true, false, 'Week 5 – Feb 3', 9
  ),
  (
    'Parent-Teacher Meeting Script Kit', 'Template', '🗣️',
    'Complete script and agenda templates for parent-teacher conference meetings.',
    true, true, 'Week 5 – Feb 3', 0
  ),

  -- Week 6 – Feb 10
  (
    'End of Term Report Writing Guide', 'Guide', '📝',
    'Step-by-step guide to writing CBC-aligned end-of-term reports efficiently.',
    false, true, 'Week 6 – Feb 10', 0
  ),
  (
    'Teacher Wellness & Burnout Prevention', 'Course', '🧘',
    'Practical strategies for managing stress, setting boundaries, and sustaining energy.',
    true, false, 'Week 6 – Feb 10', 5
  ),
  (
    'School Fee Reminder Letter Templates', 'Template', '💌',
    'Professional, empathetic fee reminder letters in English and Swahili.',
    false, true, 'Week 6 – Feb 10', 0
  )

ON CONFLICT DO NOTHING;
