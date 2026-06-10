-- ============================================================
-- Comprehensive Notification System Verification
-- ============================================================
-- This script verifies that the notification system is properly
-- configured and working across all content types.
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ============================================================

\echo '========================================='
\echo 'NOTIFICATION SYSTEM VERIFICATION'
\echo '========================================='
\echo ''

-- ============================================================
-- 1. Check if the notification function exists
-- ============================================================
\echo '1️⃣  Checking notification function...'
SELECT 
  '✅ Function exists' as status,
  proname as function_name,
  pg_get_functiondef(oid) as definition_preview
FROM pg_proc 
WHERE proname = 'notify_users_on_content_publish'
LIMIT 1;

\echo ''

-- ============================================================
-- 2. Check if the trigger is attached to contents table
-- ============================================================
\echo '2️⃣  Checking trigger on contents table...'
SELECT 
  '✅ Trigger exists' as status,
  tgname as trigger_name,
  tgtype as trigger_type,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger 
WHERE tgname = 'on_content_published'
  AND tgrelid = 'public.contents'::regclass;

\echo ''

-- ============================================================
-- 3. Check system settings - notifications_enabled
-- ============================================================
\echo '3️⃣  Checking system settings...'
SELECT 
  CASE 
    WHEN (value->>'enabled')::boolean = true THEN '✅ Notifications ENABLED'
    ELSE '❌ Notifications DISABLED'
  END as status,
  key,
  value,
  updated_at
FROM public.system_settings
WHERE key = 'notifications_enabled';

\echo ''

-- ============================================================
-- 4. Check notifications table structure
-- ============================================================
\echo '4️⃣  Checking notifications table structure...'
SELECT 
  '✅ Notifications table exists' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
ORDER BY ordinal_position;

\echo ''

-- ============================================================
-- 5. Count active users (who should receive notifications)
-- ============================================================
\echo '5️⃣  Counting active users...'
SELECT 
  '📊 Active users' as status,
  COUNT(*) as total_active_users,
  COUNT(*) || ' notifications should be created per published content' as expected_behavior
FROM public.profiles
WHERE status = 'active' OR status IS NULL;

\echo ''

-- ============================================================
-- 6. Check recent published content (last 7 days)
-- ============================================================
\echo '6️⃣  Recent published content (last 7 days)...'
SELECT 
  '📋 Published content' as status,
  id,
  title,
  type,
  status,
  published_at,
  created_at,
  CASE 
    WHEN status = 'published' THEN '✅ Should trigger notifications'
    ELSE '❌ Draft - no notifications'
  END as notification_status
FROM public.contents
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

\echo ''

-- ============================================================
-- 7. Check recent notifications (last 7 days)
-- ============================================================
\echo '7️⃣  Recent notifications (last 7 days)...'
SELECT 
  '🔔 Notifications created' as status,
  COUNT(*) as total_notifications,
  COUNT(DISTINCT user_id) as unique_users_notified,
  COUNT(DISTINCT content_id) as unique_content_items,
  MIN(created_at) as oldest_notification,
  MAX(created_at) as newest_notification
FROM public.notifications
WHERE created_at > NOW() - INTERVAL '7 days';

\echo ''

-- ============================================================
-- 8. Match content to notifications (verification)
-- ============================================================
\echo '8️⃣  Matching content to notifications...'
SELECT 
  c.id as content_id,
  c.title,
  c.type,
  c.status,
  c.published_at,
  COUNT(n.id) as notifications_created,
  CASE 
    WHEN c.status != 'published' THEN '⚪ Draft - no notifications expected'
    WHEN COUNT(n.id) = 0 THEN '❌ ISSUE: Published but NO notifications'
    WHEN COUNT(n.id) < (SELECT COUNT(*) FROM public.profiles WHERE status = 'active' OR status IS NULL) 
      THEN '⚠️  WARNING: Missing some notifications'
    ELSE '✅ All users notified'
  END as verification_status
FROM public.contents c
LEFT JOIN public.notifications n ON n.content_id = c.id
WHERE c.created_at > NOW() - INTERVAL '7 days'
GROUP BY c.id, c.title, c.type, c.status, c.published_at
ORDER BY c.created_at DESC
LIMIT 10;

\echo ''

-- ============================================================
-- 9. Test notification creation (DRY RUN - with test content)
-- ============================================================
\echo '9️⃣  Creating test content to verify notifications...'
\echo 'This will create a test speech and check if notifications are generated.'
\echo ''

-- Start transaction for test
BEGIN;

-- Insert test content
INSERT INTO public.contents (
  title,
  type,
  icon,
  description,
  status,
  premium,
  week,
  published_at
) VALUES (
  '🧪 TEST NOTIFICATION - VERIFICATION SCRIPT',
  'Speech',
  '🔬',
  'This is a test to verify the notification system is working properly',
  'published',  -- ← This should trigger the notification function
  false,
  'Test Week',
  NOW()
)
RETURNING id, title, status;

-- Wait a moment for trigger to fire
SELECT pg_sleep(0.5);

-- Check if notifications were created for the test content
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ SUCCESS: Notifications created for test content'
    ELSE '❌ FAILURE: No notifications created for test content'
  END as test_result,
  COUNT(*) as notifications_created,
  (SELECT COUNT(*) FROM public.profiles WHERE status = 'active' OR status IS NULL) as expected_count
FROM public.notifications
WHERE body LIKE '%TEST NOTIFICATION - VERIFICATION SCRIPT%';

-- Show sample notifications
SELECT 
  '📬 Sample notifications' as info,
  user_id,
  title,
  body,
  icon,
  color,
  content_type,
  content_id,
  created_at
FROM public.notifications
WHERE body LIKE '%TEST NOTIFICATION - VERIFICATION SCRIPT%'
LIMIT 3;

-- Rollback to clean up test data
ROLLBACK;

\echo ''
\echo '✨ Test content and notifications rolled back (no data was saved)'
\echo ''

-- ============================================================
-- 10. Summary and Recommendations
-- ============================================================
\echo '========================================='
\echo '📊 VERIFICATION SUMMARY'
\echo '========================================='
\echo ''
\echo '✅ If all checks passed:'
\echo '   - Notification function exists and is properly configured'
\echo '   - Trigger is attached to contents table'
\echo '   - System settings allow notifications'
\echo '   - Test content successfully triggered notifications'
\echo ''
\echo '❌ If any checks failed:'
\echo '   - Run the migration: 20260606000035_notification_system_settings_check.sql'
\echo '   - Ensure status field is set to "published" when creating content'
\echo '   - Check that published_at field is set for published content'
\echo ''
\echo '📝 Notes:'
\echo '   - Notifications only trigger when status = "published"'
\echo '   - Draft content does NOT trigger notifications'
\echo '   - Updating already published content does NOT re-trigger notifications'
\echo '   - Each content item triggers notifications only once'
\echo ''
\echo '========================================='
