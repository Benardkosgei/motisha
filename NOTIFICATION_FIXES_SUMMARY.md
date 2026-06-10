# Notification System Improvements

## Overview
This document summarizes the improvements made to the notification system to ensure all content types properly trigger notifications when published.

## Changes Made

### 1. Fixed Resources Route (`/api/admin/resources`)
**File:** `src/app/api/admin/resources/route.ts`

**Problem:** The resources creation endpoint didn't set `published_at` and `publish_at` fields when creating published content.

**Solution:** Updated to set both `published_at` and `publish_at` timestamps when status is 'published':

```typescript
const finalStatus = status ?? 'draft';
const now = new Date().toISOString();

// In insert data:
status: finalStatus,
publish_at: finalStatus === 'published' ? now : null,
published_at: finalStatus === 'published' ? now : null,
```

### 2. Fixed Resources Update Route (`/api/admin/resources/[id]`)
**File:** `src/app/api/admin/resources/[id]/route.ts`

**Problem:** The resources update endpoint only set `published_at` but not `publish_at` when updating status to published.

**Solution:** Updated to set both timestamps consistently:

```typescript
if (status === 'published') {
  const now = new Date().toISOString();
  updateData.published_at = now;
  updateData.publish_at = now;
}
```

### 3. Added System Settings Check to Notification Trigger
**File:** `supabase/migrations/20260606000035_notification_system_settings_check.sql`

**Problem:** The notification trigger didn't respect the `notifications_enabled` system setting, meaning notifications couldn't be globally disabled.

**Solution:** Updated the `notify_users_on_content_publish()` function to check system settings:

```sql
-- Check if notifications are enabled in system settings
SELECT COALESCE((value->>'enabled')::boolean, true)
INTO v_notifications_enabled
FROM public.system_settings
WHERE key = 'notifications_enabled'
LIMIT 1;

-- If notifications are disabled, skip notification creation
IF v_notifications_enabled = false THEN
  RETURN NEW;
END IF;
```

### 4. Created Comprehensive Verification Script
**File:** `verify_notification_system.sql`

A complete testing script that verifies:
- ✅ Notification function exists
- ✅ Trigger is properly attached
- ✅ System settings configuration
- ✅ Table structure is correct
- ✅ Active user count
- ✅ Recent published content
- ✅ Recent notifications
- ✅ Content-to-notification matching
- ✅ Live test with rollback (safe to run in production)

## How Notifications Work

### Trigger Conditions
Notifications are created when:
1. Content is **INSERT**ed with `status = 'published'`
2. Content is **UPDATE**d and status changes from 'draft' to 'published'

Notifications are **NOT** created when:
- Content is created with `status = 'draft'`
- Content is updated but was already published (`OLD.status = 'published'`)
- System setting `notifications_enabled` is false

### Content Types Supported
- Speech 🎤
- Newsletter 📮
- Course 🎓
- Template 📋
- Resource 📚
- Article 📰
- Guide 🗺️

### Notification Recipients
All users where `status = 'active'` OR `status IS NULL` receive notifications.

## API Route Status Summary

| Endpoint | Status Field | published_at | publish_at | System Settings Check |
|----------|-------------|--------------|------------|---------------------|
| **POST** /api/admin/speeches | ✅ | ✅ | ✅ | ✅ (in trigger) |
| **POST** /api/admin/courses | ✅ | ✅ | ✅ | ✅ (in trigger) |
| **POST** /api/admin/articles | ✅ | ✅ | ✅ | ✅ (in trigger) |
| **POST** /api/admin/newsletters | ✅ | ✅ | ✅ | ✅ (in trigger) |
| **POST** /api/admin/resources | ✅ **FIXED** | ✅ **FIXED** | ✅ **FIXED** | ✅ (in trigger) |
| **PATCH** /api/admin/resources/[id] | ✅ | ✅ **FIXED** | ✅ **FIXED** | ✅ (in trigger) |

## Testing

### Quick Test
Run the verification script in Supabase SQL Editor:

```sql
-- This is safe to run - it uses a transaction with rollback
\i verify_notification_system.sql
```

### Manual Test
1. Create new content via admin panel
2. Set status to "Published"
3. Save the content
4. Check notifications table:
   ```sql
   SELECT COUNT(*), content_id, title 
   FROM notifications 
   WHERE created_at > NOW() - INTERVAL '5 minutes'
   GROUP BY content_id, title;
   ```

### Expected Results
- One notification per active user for each published content item
- Notification includes: title, body, icon, color, content_type, content_id
- Draft content creates 0 notifications

## Deployment

### Database Migration
Run the new migration in your Supabase project:

```bash
# If using Supabase CLI
supabase db push

# Or run manually in SQL editor
-- Copy contents of: supabase/migrations/20260606000035_notification_system_settings_check.sql
```

### Application Code
Deploy the updated TypeScript files:
- `src/app/api/admin/resources/route.ts`
- `src/app/api/admin/resources/[id]/route.ts`

No breaking changes - fully backward compatible.

## Troubleshooting

### No notifications created?
1. Check content status: `SELECT status FROM contents WHERE id = 'xxx'`
2. Check system settings: `SELECT * FROM system_settings WHERE key = 'notifications_enabled'`
3. Check trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_content_published'`
4. Check user count: `SELECT COUNT(*) FROM profiles WHERE status = 'active' OR status IS NULL`

### Duplicate notifications?
- Trigger only fires once per content item when status changes to 'published'
- Updating already published content won't re-trigger

### Partial notifications (not all users)?
- Check profiles table for inactive users: `SELECT COUNT(*), status FROM profiles GROUP BY status`
- Verify no RLS issues on notifications table

## Admin Controls

### Disable Notifications Globally
```sql
UPDATE system_settings 
SET value = '{"enabled": false}'::jsonb 
WHERE key = 'notifications_enabled';
```

### Re-enable Notifications
```sql
UPDATE system_settings 
SET value = '{"enabled": true}'::jsonb 
WHERE key = 'notifications_enabled';
```

### Clear Old Notifications
```sql
-- Delete notifications older than 30 days
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '30 days';
```

## Future Enhancements

Consider adding:
- [ ] Per-user notification preferences (opt-out by content type)
- [ ] Notification channels (email, push, in-app)
- [ ] Digest mode (batch notifications)
- [ ] Read receipts and analytics
- [ ] Admin notification preview before publishing
- [ ] Scheduled notification delivery

## Related Files

- Database: `supabase/migrations/20260606000035_notification_system_settings_check.sql`
- API Routes: `src/app/api/admin/resources/route.ts`, `src/app/api/admin/resources/[id]/route.ts`
- Test Script: `verify_notification_system.sql`
- Test Data: `test_notification_trigger.sql`
- Debugging: `check_notifications.sql`, `check_recent_activity.sql`

## Support

For issues or questions:
1. Run `verify_notification_system.sql` to diagnose
2. Check application logs for API errors
3. Check Supabase logs for trigger errors
4. Review this document for common issues

---

**Last Updated:** 2026-06-06  
**Migration Version:** 20260606000035  
**Status:** ✅ Complete and Tested
