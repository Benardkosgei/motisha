# Hero Slider Issue - Solution & Next Steps

## Problem Analysis

You reported that content items with `slide_enabled = true` are being added to the content table but hero sliders are not showing on the HomeTab.

## Root Cause Investigation

I investigated the system and found that the slider system is correctly implemented:

1. ✅ **Database schema** - `slide_enabled` column exists on `contents` table
2. ✅ **Admin UI** - All admin forms (Course, Speech, Article, Newsletter) have "Feature on home slider" checkbox
3. ✅ **API endpoint** - `/api/public/settings` correctly queries for slides
4. ✅ **Frontend** - `HomeTab` correctly renders slides from API

The issue is likely one of these:

### Common Causes:
1. **Content status is "draft"** instead of "published"
2. **publish_at date is in the future**
3. **Missing required fields** (title, icon, etc.)
4. **API cache** - Changes take 60 seconds to appear

## Solution Provided

I created TWO diagnostic tools to help you identify and fix the issue:

### Tool 1: Debug API Endpoint
**URL**: `GET /api/admin/debug-slides`

This endpoint returns:
- Total count of content with `slide_enabled = true`
- Count of visible slides (meet all criteria)
- Detailed analysis of each slide with specific issues
- The exact query being used

**Usage**: 
```bash
curl http://localhost:3000/api/admin/debug-slides
```

Or visit in browser: `http://localhost:3000/api/admin/debug-slides`

### Tool 2: Admin Dashboard Page
**URL**: `/admin/debug-slides`

A visual dashboard that shows:
- Summary stats (total slides, visible slides, issues)
- Each slide with visual status (VISIBLE ✓ or HIDDEN ✗)
- Specific issues for each slide
- Step-by-step fix instructions
- Live JSON of what the API returns

**Usage**: Navigate to this page in your admin panel

## Files Created

1. **`src/app/api/admin/debug-slides/route.ts`** - Diagnostic API endpoint
2. **`src/app/admin/(dashboard)/debug-slides/page.tsx`** - Visual diagnostic page
3. **`SLIDER_DEBUG_GUIDE.md`** - Comprehensive debugging guide
4. **`SLIDER_ISSUE_SOLUTION.md`** - This file

## Files Fixed

1. **`src/app/api/public/settings/route.ts`** - Fixed operator precedence issue that was causing build error

## Next Steps

### Step 1: Build and run the project
```bash
npm run build
# Fix any errors that appear
npm run dev
```

### Step 2: Access the diagnostic page
Navigate to: `http://localhost:3000/admin/debug-slides`

### Step 3: Review the analysis
The page will show you:
- How many content items have `slide_enabled = true`
- Which ones are visible vs hidden
- Specific issues for each hidden slide

### Step 4: Fix the issues
For each hidden slide:
1. Note the content ID and issues
2. Go to the admin panel
3. Edit that content item
4. Fix the issues:
   - **If status is "draft"**: Click "Publish Now" button
   - **If publish_at is in future**: Change date to today or earlier  
   - **If missing fields**: Add title, icon, description

### Step 5: Verify the fix
1. Wait 60 seconds (API cache expires)
   - OR restart `npm run dev` to clear cache immediately
2. Refresh `/admin/debug-slides` page
3. Check that slides now show as "VISIBLE ✓"
4. Navigate to HomeTab
5. Slides should now appear in the hero section

## Understanding the Slider Query

The API queries for slides using these criteria:
```sql
SELECT * FROM contents 
WHERE slide_enabled = true 
  AND status = 'published' 
  AND publish_at <= NOW()
ORDER BY publish_at DESC
LIMIT 6
```

**All three conditions must be met** for a slide to appear:
- ✅ `slide_enabled = true`
- ✅ `status = 'published'` (not 'draft')
- ✅ `publish_at <= NOW()` (not in the future)

## Cache Behavior

The `/api/public/settings` endpoint has a 60-second cache:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=30
```

This means:
- Changes take up to 60 seconds to appear
- In production, this improves performance
- In development, restart server to clear cache immediately

## If Slides Still Don't Show

After fixing all issues, if slides still don't appear:

1. **Check browser console** (F12) for JavaScript errors
2. **Check Network tab** - Look for `/api/public/settings` request
3. **Verify response** - Click the request → Preview → Check `hero_slides` array
4. **Check Supabase** - Verify data exists in database:
   ```sql
   SELECT id, title, slide_enabled, status, publish_at 
   FROM contents 
   WHERE slide_enabled = true;
   ```
5. **Verify RLS** - The endpoint uses `supabaseAdmin` which bypasses RLS, but check the `contents_select_by_tier` policy if needed

## Fallback Behavior

If NO content has `slide_enabled = true`, the HomeTab shows 3 default slides:
1. Opening Term Assembly Speech
2. Financial Freedom for Teachers
3. Student Council Leadership Pack

These are hardcoded fallbacks to ensure the hero section is never empty.

## Additional Notes

- **Slide fields are optional** - If you don't fill in `slide_title`, `slide_tag`, etc., the system falls back to regular content fields
- **Icon is required** - Make sure content has an emoji icon
- **Type matters** - Different content types get different default colors and badges
- **Deep linking works** - Clicking "Open Now" on a slide navigates directly to that content item

## Support

If you need more help:
1. Share the output from `/api/admin/debug-slides`
2. Share screenshots from the admin diagnostic page
3. Check `SLIDER_DEBUG_GUIDE.md` for more detailed information

---

**Created**: June 4, 2026
**Author**: Kiro AI Assistant
**Related Files**: See "Files Created" section above
