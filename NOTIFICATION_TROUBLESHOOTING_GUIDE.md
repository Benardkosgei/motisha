# Notification System Troubleshooting Guide

## Problem: Notifications Not Triggered When Adding New Content

---

## 🔍 Quick Diagnosis

Run this SQL script in Supabase SQL Editor:

```sql
-- File: diagnose_notification_issue.sql
```

This will show you exactly what's wrong.

---

## ✅ Most Common Causes

### 1. Content Status is "Draft" (Most Common ❗)

**Symptom**: No notifications when you add content

**Cause**: Only content with `status = 'published'` triggers notifications

**Fix**: 
- In Admin Dashboard, make sure you set status to **"Published"**
- Draft content will NOT trigger notifications

**Verify**:
```sql
-- Check recent content status
SELECT id, title, type, status, published_at
FROM contents
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

### 2. Notifications Disabled in System Settings

**Symptom**: System was working, suddenly stopped

**Cause**: Someone disabled notifications in Admin Settings

**Fix**:
1. Go to Admin Dashboard → Settings
2. Enable "Push Notifications"
3. Or run SQL:
```sql
UPDATE system_settings 
SET value = '{"enabled": true}'::jsonb 
WHERE key = 'notifications_enabled';
```

**Verify**:
```sql
-- Check if notifications are enabled
SELECT key, value
FROM system_settings
WHERE key = 'notifications_enabled';

-- Should show: {"enabled": true}
```

---

### 3. Trigger Not Attached or Disabled

**Symptom**: Never worked, or stopped after migration

**Cause**: Database trigger missing or disabled

**Fix**:
Run the quick fix script:
```sql
-- File: fix_notifications_quick.sql
```

Or manually:
```sql
-- Check if trigger exists
SELECT tgname, tgenabled
FROM pg_trigger 
WHERE tgname = 'on_content_published'
  AND tgrelid = 'public.contents'::regclass;

-- If missing, run:
-- File: supabase/migrations/20260606000035_notification_system_settings_check.sql
```

---

### 4. Migration Not Applied

**Symptom**: Fresh database or after restore

**Cause**: Migration `20260606000035_notification_system_settings_check.sql` not run

**Fix**:
```bash
# In your terminal
cd c:\wamp64\www\motisha
supabase db push
```

Or manually run the migration file in Supabase SQL Editor.

---

## 🧪 Testing the Fix

### Step 1: Create Test Content

In Admin Dashboard:
1. Go to Content → Add New
2. Fill in:
   - Title: "🧪 Test Notification"
   - Type: Speech
   - Status: **Published** ← Important!
3. Click Save

### Step 2: Verify Notifications Created

Run this SQL:
```sql
-- Check notifications for test content
SELECT 
  COUNT(*) as notifications_created,
  (SELECT COUNT(*) FROM profiles WHERE status = 'active' OR status IS NULL) as expected_count
FROM notifications
WHERE body LIKE '%Test Notification%';

-- Should see: notifications_created = expected_count
```

### Step 3: View Sample Notifications

```sql
-- Show recent notifications
SELECT 
  user_id,
  title,
  body,
  content_type,
  created_at
FROM notifications
WHERE body LIKE '%Test Notification%'
LIMIT 5;
```

### Step 4: Clean Up Test

```sql
-- Delete test notifications
DELETE FROM notifications WHERE body LIKE '%Test Notification%';

-- Delete test content
DELETE FROM contents WHERE title = '🧪 Test Notification';
```

---

## 📊 Understanding the Notification Flow

### Normal Flow:

```
1. Admin creates content in dashboard
2. Admin sets status = "published"
3. Admin clicks Save
   ↓
4. Database INSERT/UPDATE happens
   ↓
5. Trigger "on_content_published" fires
   ↓
6. Function "notify_users_on_content_publish()" runs
   ↓
7. Function checks:
   - Is status = 'published'? ✅
   - Are notifications enabled? ✅
   - Is this a new publish (not re-publish)? ✅
   ↓
8. Function inserts notifications:
   - One notification per active user
   - With content_id and content_type
   ↓
9. Users see notification in app
```

### When It Fails:

```
❌ Status = "draft" → No trigger
❌ Notifications disabled in settings → Function exits early
❌ Trigger disabled/missing → Function never runs
❌ Content already published before → No re-trigger
```

---

## 🔧 Manual Verification Checklist

Run each SQL query to verify:

### ✅ Trigger Exists and Enabled
```sql
SELECT 
  tgname as trigger_name,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as status
FROM pg_trigger 
WHERE tgname = 'on_content_published'
  AND tgrelid = 'public.contents'::regclass;
```

### ✅ Function Exists
```sql
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_users_on_content_publish')
    THEN '✅ Function exists'
    ELSE '❌ Function missing'
  END as status;
```

### ✅ Notifications Enabled
```sql
SELECT 
  CASE 
    WHEN (value->>'enabled')::boolean = true 
    THEN '✅ Notifications enabled'
    ELSE '❌ Notifications disabled'
  END as status
FROM system_settings
WHERE key = 'notifications_enabled';
```

### ✅ Recent Content Status
```sql
SELECT 
  id,
  title,
  type,
  status,
  CASE 
    WHEN status = 'published' THEN '✅ Should trigger'
    ELSE '❌ Will not trigger'
  END as notification_status
FROM contents
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### ✅ Notifications Created
```sql
SELECT 
  COUNT(*) as total_notifications,
  COUNT(DISTINCT content_id) as content_items,
  COUNT(DISTINCT user_id) as users_notified
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## 🚨 Common Mistakes

### Mistake 1: Saving as Draft

❌ **Wrong**:
- Create content
- Leave status as "Draft"
- Expect notifications
- Wonder why nothing happens

✅ **Correct**:
- Create content
- Set status to "Published"
- Save
- Notifications created

---

### Mistake 2: Re-publishing Content

❌ **Wrong**:
- Content already published
- Edit the content
- Save again
- Expect new notifications

✅ **Correct**:
- Notifications only fire ONCE when status changes to "published"
- Editing published content does NOT re-trigger
- This is by design to prevent spam

---

### Mistake 3: Checking Too Soon

❌ **Wrong**:
- Create content
- Immediately check notifications table
- Don't see anything yet
- Think system is broken

✅ **Correct**:
- Trigger fires within milliseconds
- But wait 1-2 seconds if checking manually
- Or refresh the notifications query

---

## 🔍 Advanced Debugging

### Enable Function Logging

```sql
-- Add RAISE NOTICE to function for debugging
CREATE OR REPLACE FUNCTION public.notify_users_on_content_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_icon TEXT;
  v_color TEXT;
  v_title TEXT;
  v_body TEXT;
  v_premium_text TEXT;
  v_notifications_enabled BOOLEAN;
BEGIN
  RAISE NOTICE 'Trigger fired: TG_OP=%, NEW.status=%, NEW.title=%', TG_OP, NEW.status, NEW.title;
  
  -- Only fire when content becomes published
  IF TG_OP = 'INSERT' THEN
    IF NEW.status != 'published' THEN
      RAISE NOTICE 'Skipping: Status is % (not published)', NEW.status;
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status != 'published' OR (OLD.status = 'published') THEN
      RAISE NOTICE 'Skipping: Status change from % to %', OLD.status, NEW.status;
      RETURN NEW;
    END IF;
  END IF;

  -- Check if notifications are enabled
  SELECT COALESCE((value->>'enabled')::boolean, true)
  INTO v_notifications_enabled
  FROM public.system_settings
  WHERE key = 'notifications_enabled'
  LIMIT 1;

  IF v_notifications_enabled = false THEN
    RAISE NOTICE 'Skipping: Notifications disabled in system settings';
    RETURN NEW;
  END IF;

  RAISE NOTICE 'Creating notifications for content_id=%', NEW.id;

  -- Rest of function...
  -- [Include full function code here]

  RAISE NOTICE 'Notifications created successfully';
  RETURN NEW;
END;
$$;
```

Then check PostgreSQL logs to see the RAISE NOTICE messages.

---

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to **Logs** → **Database**
3. Filter by time when you added content
4. Look for errors or trigger execution

---

## 📝 Notification Behavior Reference

| Scenario | Trigger Fires? | Notifications Created? |
|----------|----------------|------------------------|
| New content, status = "published" | ✅ Yes | ✅ Yes |
| New content, status = "draft" | ❌ No | ❌ No |
| Update draft → published | ✅ Yes | ✅ Yes |
| Update published → published | ❌ No | ❌ No |
| Update published → draft | ❌ No | ❌ No |
| Notifications disabled in settings | ✅ Yes | ❌ No |
| Trigger disabled | ❌ No | ❌ No |

---

## 🎯 Quick Fix Summary

**90% of notification issues are caused by:**

1. ❌ Content status is "draft" → **Set to "published"**
2. ❌ Notifications disabled in settings → **Enable in Admin Settings**
3. ❌ Trigger missing → **Run `fix_notifications_quick.sql`**

**If those don't work:**

4. Run `diagnose_notification_issue.sql` to find the exact problem
5. Check the output for specific error messages
6. Follow the recommended actions

---

## 📞 Still Not Working?

### Final Checklist:

- [ ] Content status is "published" (not draft)
- [ ] Notifications enabled in Admin Settings
- [ ] Trigger exists and enabled (check SQL)
- [ ] Function exists (check SQL)
- [ ] System settings table has notifications_enabled = true
- [ ] Tested with NEW content (not editing existing)
- [ ] Waited 2-3 seconds after saving
- [ ] Checked `diagnose_notification_issue.sql` output

### If All Above Pass:

Check:
1. Are there any active users in the database?
2. Do profiles have status = 'active' or NULL?
3. Are there any RLS policies blocking the INSERT?
4. Check Supabase Dashboard logs for errors

---

## 📚 Related Files

- `diagnose_notification_issue.sql` - Comprehensive diagnosis
- `fix_notifications_quick.sql` - One-click fix
- `test_notification_trigger.sql` - Create test notification
- `verify_notification_system.sql` - Full system verification
- `NOTIFICATION_DEVELOPER_GUIDE.md` - Developer documentation
- `supabase/migrations/20260606000035_notification_system_settings_check.sql` - Latest migration

---

## ✅ Success Indicators

You know it's working when:

✅ Creating published content immediately creates notifications
✅ Number of notifications = number of active users
✅ Each notification has content_id and content_type set
✅ Users see "NEW UPLOAD" notification in their app
✅ Notification body includes content title, type, and premium status

---

Last Updated: June 6, 2026
Status: Comprehensive Troubleshooting Guide
