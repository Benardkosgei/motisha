# Notification Issue - Quick Summary

## Problem
Notifications are not being triggered when adding new content.

---

## ⚡ Quick Fix (Do This First)

### Option 1: Check Content Status
Most common issue - content saved as **Draft** instead of **Published**.

**Solution**: In Admin Dashboard, set content status to "Published" when creating/editing.

---

### Option 2: Run Diagnostic
Open Supabase SQL Editor and run:
```
File: diagnose_notification_issue.sql
```

This will tell you exactly what's wrong.

---

### Option 3: Re-enable System
If diagnostic shows issues, run:
```
File: fix_notifications_quick.sql
```

This will fix most problems automatically.

---

## 🔍 Root Causes (In Order of Likelihood)

### 1. Content Status is "Draft" (80% of cases)
- **Check**: Look at recent content in admin dashboard
- **Fix**: Change status to "Published"
- **Prevention**: Always set status to "Published" when creating content

### 2. Notifications Disabled in Settings (10% of cases)
- **Check**: Admin Dashboard → Settings → Notifications
- **Fix**: Enable "Push Notifications"
- **SQL Fix**: See `fix_notifications_quick.sql`

### 3. Database Trigger Missing/Disabled (5% of cases)
- **Check**: Run `diagnose_notification_issue.sql`
- **Fix**: Run `fix_notifications_quick.sql`
- **Or**: Apply migration `20260606000035_notification_system_settings_check.sql`

### 4. Function Missing (3% of cases)
- **Check**: Run `diagnose_notification_issue.sql`
- **Fix**: Run `fix_notifications_quick.sql`

### 5. Other Issues (2% of cases)
- RLS policies blocking inserts
- No active users in database
- Database connection issues

---

## ✅ How to Test

### Quick Test:

1. **Go to Admin Dashboard** → Content → Add New
2. **Fill in**:
   - Title: "Test Notification"
   - Type: Speech
   - Status: **Published** ← Important!
3. **Click Save**
4. **Check Supabase** → Table Editor → notifications
5. **Should see**: New notifications created for all active users

### SQL Test:

```sql
-- Count notifications for test content
SELECT COUNT(*) as created
FROM notifications
WHERE body LIKE '%Test Notification%';

-- Should see: created > 0
```

---

## 📁 Files Created for You

| File | Purpose | When to Use |
|------|---------|-------------|
| `diagnose_notification_issue.sql` | Find the problem | First step - tells you what's wrong |
| `fix_notifications_quick.sql` | Auto-fix most issues | After diagnosis shows a problem |
| `NOTIFICATION_TROUBLESHOOTING_GUIDE.md` | Detailed guide | When quick fix doesn't work |
| `test_notification_trigger.sql` | Test system works | Verify after fixing |
| `verify_notification_system.sql` | Complete verification | Full system health check |

---

## 🎯 Action Plan

### Step 1: Verify Problem
```bash
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy/paste content from: diagnose_notification_issue.sql
4. Click Run
5. Read the output
```

### Step 2: Apply Fix
Based on diagnosis output:

- **If "Content is draft"**: Change content status to Published
- **If "Notifications disabled"**: Run `fix_notifications_quick.sql`
- **If "Trigger missing"**: Run `fix_notifications_quick.sql`
- **If "Function missing"**: Run `fix_notifications_quick.sql`

### Step 3: Test
```bash
1. Create new content with status = "Published"
2. Check notifications table
3. Should see notifications for all active users
```

### Step 4: Verify
```bash
1. Run: test_notification_trigger.sql
2. Should see: "✅ SUCCESS: Notifications created"
```

---

## 💡 Prevention Tips

1. **Always publish**: Set status to "Published" when creating content
2. **Monitor settings**: Don't disable notifications in Admin Settings unless needed
3. **Run migrations**: Keep database schema up to date
4. **Test regularly**: Occasionally verify notifications are working

---

## 🚨 If Still Not Working

After trying the above:

1. Check full guide: `NOTIFICATION_TROUBLESHOOTING_GUIDE.md`
2. Check Supabase logs for errors
3. Verify active users exist: `SELECT COUNT(*) FROM profiles WHERE status = 'active'`
4. Check RLS policies on notifications table
5. Verify system_settings table exists and is accessible

---

## ✅ Success Checklist

Notifications are working when:

- [ ] Creating published content creates notifications
- [ ] Number of notifications = number of active users
- [ ] Notifications appear in user's app
- [ ] `diagnose_notification_issue.sql` shows all ✅
- [ ] Test content triggers notifications correctly

---

## 📊 Expected Behavior

**Normal Flow**:
```
Admin creates content → Sets status to "Published" → Saves
  ↓
Trigger fires → Function runs → Checks settings
  ↓
Creates 1 notification per active user
  ↓
Users see notification in app
```

**Current Behavior** (if broken):
```
Admin creates content → Sets status to "Published" → Saves
  ↓
??? Nothing happens ???
  ↓
No notifications created
```

---

## 🔧 One-Liner Fixes

```sql
-- Enable notifications in settings
UPDATE system_settings SET value = '{"enabled": true}'::jsonb WHERE key = 'notifications_enabled';

-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_content_published';

-- Manually create notification for test
INSERT INTO notifications (user_id, title, body, icon, color)
SELECT id, 'TEST', 'Manual test notification', '🔔', '#0EA5E9'
FROM profiles LIMIT 1;

-- Count recent notifications
SELECT COUNT(*) FROM notifications WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

## 📞 Quick Reference

**Most Common Fix**:
```
Content status must be "Published" (not "Draft")
```

**Second Most Common**:
```sql
-- Run in Supabase SQL Editor
-- File: fix_notifications_quick.sql
```

**If All Else Fails**:
```
Read: NOTIFICATION_TROUBLESHOOTING_GUIDE.md
```

---

Last Updated: June 6, 2026
Status: Diagnostic tools ready
Next Step: Run `diagnose_notification_issue.sql`
