# Hero Slider Debugging Guide

## Problem
Content items with `slide_enabled = true` are being added to the `contents` table but hero sliders are not displaying on the HomeTab.

## How Sliders Work

1. **Admin creates content** (Course, Speech, Article, Newsletter, Resource) and checks "Feature on home slider"
2. **Content must be published** with `status = 'published'` and `publish_at <= NOW()`
3. **API fetches slides** from `/api/public/settings` which queries:
   ```sql
   SELECT * FROM contents 
   WHERE slide_enabled = true 
   AND status = 'published' 
   AND publish_at <= NOW()
   ORDER BY publish_at DESC
   LIMIT 6
   ```
4. **HomeTab renders** the slides from the API response

## Diagnostic Steps

### Step 1: Check if content exists with slide_enabled = true

Visit the debug endpoint I created:
```
GET /api/admin/debug-slides
```

This will show you:
- All content with `slide_enabled = true` (regardless of status)
- Which slides are visible (meet all criteria)
- Specific issues with each slide (status not published, future publish_at, etc.)

### Step 2: Common Issues

#### Issue 1: Status is "draft"
**Symptom**: Content saved with slide_enabled = true but status = 'draft'
**Fix**: Edit the content in admin and click "Publish Now" or "Publish" button

#### Issue 2: Future publish_at date
**Symptom**: publish_at is set to a future date
**Fix**: Edit the content and set publish_at to current date or earlier

#### Issue 3: Missing slide fields
**Symptom**: slide_enabled = true but slide_title, slide_tag, slide_sub are all empty
**Fix**: Not actually a blocker - the API will fall back to regular content fields (title, description, type-based defaults)

#### Issue 4: RLS blocking the query
**Symptom**: Query works in Supabase SQL editor but not from API
**Fix**: The `/api/public/settings` endpoint uses `supabaseAdmin` which bypasses RLS, so this shouldn't be an issue. But if you suspect RLS, check the `contents_select_by_tier` policy.

### Step 3: Test the API directly

Open browser console and run:
```javascript
fetch('/api/public/settings')
  .then(r => r.json())
  .then(data => console.log('Hero slides:', data.hero_slides));
```

Expected result:
- If slides exist: Array of slide objects with id, title, tag, sub, icon, accent, nav
- If no slides exist: Fallback to 3 default slides (Opening Term Assembly, Financial Freedom, Student Council)

### Step 4: Check browser console for errors

1. Open HomeTab in the app
2. Open browser DevTools (F12)
3. Check Console tab for any errors
4. Check Network tab → Look for `/api/public/settings` request
5. Click the request → Preview/Response tab → Check if `hero_slides` array is populated

## Quick Fix Checklist

For each content item that should appear as a slide:

- [ ] `slide_enabled` = `true` ✓
- [ ] `status` = `'published'` (not 'draft')
- [ ] `publish_at` is set and <= current date/time
- [ ] At least one of: `slide_title` OR `title` is populated
- [ ] `icon` field has an emoji (optional, falls back to '📄')
- [ ] `access_tier` is set (defaults to 'pro')

## Testing After Fixes

1. Make changes to content in admin
2. Wait 60 seconds (API has 60s cache) OR restart dev server
3. Reload HomeTab
4. Slides should now appear

## Cache Invalidation

The `/api/public/settings` endpoint has this cache header:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=30
```

This means:
- Responses are cached for 60 seconds
- Changes take up to 60 seconds to appear
- In development, restart `npm run dev` to clear cache immediately

## Files Involved

- **API**: `src/app/api/public/settings/route.ts` - Fetches slides from DB
- **Hook**: `src/lib/use-public-settings.ts` - Provides slides to components
- **UI**: `src/components/HomeTab.tsx` - Renders slides
- **Admin Forms**: All forms in `src/components/admin/*Form.tsx` - Set slide_enabled
- **Debug**: `src/app/api/admin/debug-slides/route.ts` - Diagnostic endpoint (I just created this)

## Next Steps

1. **Visit `/api/admin/debug-slides`** to see detailed diagnostics
2. **Identify which slides have issues** from the analysis
3. **Fix the issues** (publish content, fix dates, etc.)
4. **Wait 60s or restart server**
5. **Verify slides appear** on HomeTab

If slides still don't show after fixing all issues, check:
- Supabase connection is working (other content loads fine)
- No JavaScript errors in browser console
- `usePublicSettings()` hook is being called (you'll see network request)
- API response actually contains the slides (check Network tab)
