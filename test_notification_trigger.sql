-- Test Notification Trigger
-- This will create a test content item and check if notifications are generated

-- ============================================================
-- STEP 1: Insert a test speech as PUBLISHED
-- ============================================================
INSERT INTO public.contents (
  title, 
  type, 
  status, 
  icon, 
  description, 
  premium, 
  access_tier,
  week,
  publish_at,
  published_at
) VALUES (
  '🔔 TEST NOTIFICATION - DELETE ME',
  'Speech',
  'published',  -- ← This should trigger the notification function
  '🔔',
  'This is a test to verify notifications are working',
  false,
  'free',
  'Week 1',
  NOW(),
  NOW()
) RETURNING id, title, status;

-- ============================================================
-- STEP 2: Wait 2 seconds for trigger to fire (run separately)
-- ============================================================
SELECT pg_sleep(2);

-- ============================================================
-- STEP 3: Check if notifications were created
-- ============================================================
SELECT 
  '✅ NOTIFICATIONS CREATED' as status,
  COUNT(*) as notification_count,
  '(Should be 31 - one for each active user)' as expected
FROM public.notifications
WHERE body LIKE '%TEST NOTIFICATION - DELETE ME%';

-- ============================================================
-- STEP 4: Show the actual notifications
-- ============================================================
SELECT 
  id,
  user_id,
  title,
  body,
  content_type,
  content_id,
  created_at
FROM public.notifications
WHERE body LIKE '%TEST NOTIFICATION - DELETE ME%'
LIMIT 5;

-- ============================================================
-- STEP 5: Clean up (run this after verifying)
-- ============================================================
-- First, delete the notifications
DELETE FROM public.notifications 
WHERE body LIKE '%TEST NOTIFICATION - DELETE ME%';

-- Then, delete the test content
DELETE FROM public.contents 
WHERE title = '🔔 TEST NOTIFICATION - DELETE ME';

-- Verify cleanup
SELECT 
  '✅ CLEANUP COMPLETE' as status,
  COUNT(*) as remaining_test_notifications
FROM public.notifications
WHERE body LIKE '%TEST NOTIFICATION%';
