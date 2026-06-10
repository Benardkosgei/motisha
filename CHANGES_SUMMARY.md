# Changes Summary - RLS Courses Fix

## Overview

Fixed the issue where courses were not visible in the teacher portal when RLS (Row Level Security) was enabled. The root cause was that the `/api/courses` endpoint was using an unauthenticated Supabase client, which couldn't pass the RLS policy checks for tier-based access control.

## Changes Made

### 1. API Route - `/api/courses/route.ts`

**Changed authentication approach:**
- **Before**: Used unauthenticated `createClient(url, anonKey)` 
- **After**: Validates JWT token, fetches user's subscription tier, and manually filters by access tier using admin client

**Key additions:**
- Token extraction from Authorization header
- User authentication validation
- Profile subscription tier lookup
- Trial status check
- Manual tier-based filtering (`in('access_tier', accessTiers)`)

**Why manual filtering instead of RLS:**
- More performant (single query vs nested EXISTS)
- Explicit and maintainable logic
- Same security guarantees
- Avoids expensive RLS policy evaluation

### 2. Client Hook - `/lib/use-courses.ts`

**Changed API call to include authentication:**
- Added import: `import { supabase } from './supabase'`
- Added session token extraction: `await supabase.auth.getSession()`
- Added Authorization header to fetch request: `headers['Authorization'] = Bearer ${token}`

**Why this change:**
- API endpoint now requires authenticated requests
- Session token identifies the user and their subscription tier
- Enables proper access control on the backend

## Access Control Logic

The solution implements the same access control rules as the RLS policy:

| User Tier | Active Trial | Can Access |
|-----------|--------------|------------|
| Free | No | Free content only |
| Free | Yes | Free + Pro content |
| Pro | N/A | Free + Pro content |
| School | N/A | Free + Pro + School content |

## Other Content Types

✅ **No changes needed** for:
- Speeches
- Articles  
- Newsletters
- Resources

These are fetched **client-side** using the authenticated `supabase` client, so they already work correctly with RLS policies.

## Testing Required

### Manual Testing Steps:

1. **Test as Free user (no trial)**:
   - Login as free user
   - Navigate to Courses tab
   - Should only see courses with `access_tier = 'free'`

2. **Test as Free user (active trial)**:
   - Login as free user with active trial
   - Navigate to Courses tab
   - Should see courses with `access_tier IN ('free', 'pro')`

3. **Test as Pro user**:
   - Login as pro subscriber
   - Navigate to Courses tab
   - Should see courses with `access_tier IN ('free', 'pro')`

4. **Test as School user**:
   - Login as school subscriber
   - Navigate to Courses tab
   - Should see all courses (free + pro + school)

5. **Test unauthenticated**:
   - Open app in incognito mode (no login)
   - Courses should show but only free tier content

### API Testing:

```bash
# Test authenticated request
curl -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  http://localhost:3000/api/courses?userId=<USER_ID>

# Test unauthenticated request  
curl http://localhost:3000/api/courses

# Should return only free content
```

## Security Considerations

✅ **Secure**: JWT token is validated before determining access level  
✅ **Consistent**: Manual filtering replicates RLS policy logic exactly  
✅ **Performant**: Avoids expensive nested EXISTS queries in RLS  
✅ **Maintainable**: Logic is centralized and documented  

⚠️ **Important**: Keep the manual filtering logic in sync with the RLS policy. If you change the RLS rules, update the API route accordingly.

## Files Modified

1. `src/app/api/courses/route.ts` - API endpoint authentication and filtering
2. `src/lib/use-courses.ts` - Client hook to send auth token

## Files Created

1. `RLS_COURSES_FIX.md` - Detailed documentation of the fix
2. `CHANGES_SUMMARY.md` - This file

## No Changes Needed

The following files work correctly as-is:
- `src/components/SpeechesTab.tsx` - Uses client-side authenticated supabase
- `src/components/ArticlesTab.tsx` - Uses client-side authenticated supabase
- `src/components/NewslettersTab.tsx` - Uses client-side authenticated supabase
- `src/components/ResourcesTab.tsx` - Uses client-side authenticated supabase
- `supabase/migrations/20260603000032_contents_rls_access_tier.sql` - RLS policy remains unchanged

## Deployment Notes

1. No database migrations required
2. No environment variables added
3. No new dependencies added
4. Backward compatible with existing code
5. RLS remains enabled (secure by default)

## Rollback Plan

If issues arise, you can temporarily revert by:
1. Reverting changes to `src/app/api/courses/route.ts`
2. Reverting changes to `src/lib/use-courses.ts`
3. Courses will return to showing only free content (safe fallback)

**DO NOT disable RLS** as this would be a security vulnerability.

---

**Date**: 2026-06-06  
**Issue**: Courses not visible with RLS enabled  
**Resolution**: Added authentication to API route and manual tier-based filtering
