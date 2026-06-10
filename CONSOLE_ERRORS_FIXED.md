# Console Errors Fixed

## Issues Found in Console

### 1. Missing API Route: `/api/auth/session-token/verify` (404)

**Problem**: The device fingerprinting feature for single-device login was calling an API endpoint that didn't exist.

**Fix**: Created `src/app/api/auth/session-token/verify/route.ts`

This endpoint:
- Accepts POST requests with Authorization header and X-Device-Fingerprint header
- Verifies the JWT token to get the user
- Compares device fingerprint with stored fingerprint in database
- Returns `{ valid: true/false }` to indicate if session is valid
- Logs out user if device fingerprint doesn't match

**Files**:
- ✅ Created: `src/app/api/auth/session-token/verify/route.ts`

---

### 2. Supabase 406 Error on Contents Query

**Problem**: 
```
GET https://...supabase.co/rest/v1/contents?select=title%2Ctype%2Cweek%2Cpremium&status=eq.published... 406 (Not Acceptable)
```

The query in `UploadPopup.tsx` was:
1. Using `.single()` which fails with 406 when no rows match
2. Not filtering by `access_tier`, causing RLS policy to block the query for unauthenticated users

**Fix**: Modified `src/components/UploadPopup.tsx` to:
1. Remove `.single()` and use `.limit(1)` instead
2. Add `.eq('access_tier', 'free')` filter to only fetch free content (accessible to all users including anonymous)
3. Access result with `.data[0]` instead of expecting single row
4. Added console.debug for better error visibility in development

**Files**:
- ✅ Modified: `src/components/UploadPopup.tsx`

---

## Why These Errors Occurred

### Device Fingerprint Route
From the context transfer summary, single-device login was implemented in TASK 6, including:
- `src/lib/device-fingerprint.ts` ✅ Created
- `src/lib/auth-context.tsx` ✅ Modified to call verification endpoint
- **But** `src/app/api/auth/session-token/verify/route.ts` ❌ Was never created

The auth-context was calling the API but the route didn't exist.

### Supabase 406 Error
In TASK 7, we added RLS policy `contents_select_by_tier` (migration `20260603000032_contents_rls_access_tier.sql`) which:
- Allows free-tier content to all users
- Requires authentication for pro/school content
- Checks user's subscription tier

The `UploadPopup` component was querying ALL published content without specifying `access_tier`, and:
- If the latest content was `pro` or `school` tier
- And the user was not authenticated or had insufficient tier
- RLS policy blocked the query → 406 error

**Additional Issue**: Using `.single()` expects exactly one row. If zero rows match (due to RLS), Supabase returns 406 "Not Acceptable" instead of an empty result.

---

## Testing

### Test Device Fingerprint Verification

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Check console** - should NO LONGER see:
   ```
   GET http://localhost:3000/api/auth/session-token/verify 404 (Not Found)
   [auth] Session verification error: ...
   ```

3. **Login as a user** - fingerprint should be stored and verified every 30s

4. **Test on different device** (or use incognito + different screen resolution):
   - Should see: `[auth] Device fingerprint invalid — logging out`
   - User should be logged out automatically

### Test Supabase Query Fix

1. **Clear browser cache** and reload

2. **Check console** - should NO LONGER see:
   ```
   GET https://...supabase.co/rest/v1/contents?... 406 (Not Acceptable)
   ```

3. **Check popup** - After 2.5 seconds, should see notification popup with latest free content

---

## Deployment Notes

When deploying to production:

1. **Migration already applied**: `20260603000033_single_session_enforcement.sql` adds `active_device_fingerprint` column

2. **Verify RLS is active**: 
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'contents' AND policyname = 'contents_select_by_tier';
   ```

3. **Test both fixes in production**:
   - Device fingerprint verification should work
   - Content popup should appear without errors

---

## Summary

| Error | Status | Files Changed |
|-------|--------|---------------|
| 404 on `/api/auth/session-token/verify` | ✅ Fixed | `src/app/api/auth/session-token/verify/route.ts` (created) |
| 406 on contents query | ✅ Fixed | `src/components/UploadPopup.tsx` (modified) |

Both errors were:
- **Non-critical** (app continued to work)
- **Noisy** (filled console with errors)
- **Performance impact** (repeated failed API calls)

Now fixed! Console should be clean.
