-- Notification System Diagnostic Query
-- Run this in Supabase SQL Editor to check if notifications are working

-- ============================================================
-- 1. Check if trigger exists and is enabled
-- ============================================================
SELECT 
  '1. TRIGGER STATUS' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Trigger exists'
    ELSE '❌ Trigger missing'
  END as result,
  COUNT(*) as trigger_count
FROM pg_trigger
WHERE tgname = 'on_content_published';

-- ============================================================
-- 2. Check recently published content
-- ============================================================
SELECT 
  '2. RECENT PUBLISHES' as check_name,
  COUNT(*) as count,
  STRING_AGG(title, ', ') as titles
FROM public.contents
WHERE status = 'published'
  AND published_at > NOW() - INTERVAL '24 hours';

-- ============================================================
-- 3. Check notifications created in last 24 hours
-- ============================================================
SELECT 
  '3. RECENT NOTIFICATIONS' as check_name,
  COUNT(*) as count,
  STRING_AGG(DISTINCT title, ', ') as notification_titles
FROM public.notifications
WHERE created_at > NOW() - INTERVAL '24 hours';

-- ============================================================
-- 4. Check active user count
-- ============================================================
SELECT 
  '4. ACTIVE USERS' as check_name,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE status = 'active') as active_status_users,
  COUNT(*) FILTER (WHERE status IS NULL) as null_status_users,
  COUNT(*) FILTER (WHERE status = 'active' OR status IS NULL) as notifiable_users
FROM public.profiles;

-- ============================================================
-- 5. Detailed recent notifications with content info
-- ============================================================
SELECT 
  '5. NOTIFICATION DETAILS' as section,
  n.created_at,
  n.title as notification_title,
  n.body as notification_body,
  n.content_type,
  c.title as content_title,
  c.status as content_status,
  c.published_at as content_published_at,
  (SELECT COUNT(*) FROM notifications WHERE content_id = c.id) as notification_count_for_content
FROM public.notifications n
LEFT JOIN public.contents c ON n.content_id = c.id
WHERE n.created_at > NOW() - INTERVAL '24 hours'
ORDER BY n.created_at DESC
LIMIT 10;

-- ============================================================
-- 6. Test if you can insert a notification manually
-- ============================================================
-- Uncomment and run this separately to test INSERT permissions:
/*
INSERT INTO public.notifications (user_id, title, body, icon, color)
SELECT 
  p.id,
  'TEST NOTIFICATION',
  'Testing notification system manually',
  '🔔',
  '#0EA5E9'
FROM public.profiles p
LIMIT 1
RETURNING id, user_id, title;
*/

-- ============================================================
-- 7. Clean up test notification (run after test above)
-- ============================================================
/*
DELETE FROM public.notifications 
WHERE title = 'TEST NOTIFICATION';
*/

-- ============================================================
-- INTERPRETATION:
-- ============================================================
-- ✅ Trigger exists: Check #1 should show trigger_count = 1
-- ✅ Content published: Check #2 should show count > 0 if you published recently
-- ✅ Notifications created: Check #3 should match Check #2 * number of users
-- ✅ Users exist: Check #4 should show notifiable_users > 0
-- ✅ Details match: Check #5 should show notifications linked to content
