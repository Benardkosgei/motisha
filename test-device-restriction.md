# Device Restriction Testing Guide

## Quick Test Steps

### Automated Test (Same Device, Different Browsers)

1. **Open the app in Chrome**
   - Navigate to `http://localhost:3000`
   - Open DevTools (F12) → Console tab
   - Log in with test credentials
   - Look for: `[auth] Device fingerprint stored successfully`

2. **Open the app in Firefox (same computer)**
   - Navigate to `http://localhost:3000`
   - Open DevTools (F12) → Console tab
   - Log in with the **same account**
   - Look for: `[auth] Device fingerprint stored successfully`

3. **Wait 30-60 seconds**
   - Watch the console in both browsers
   - Look for: `[auth] Device fingerprint mismatch detected`
   - **Expected**: Both browsers should stay logged in ✅
   - **Reason**: Same physical device = same fingerprint

### Manual Test (Different Devices)

#### Setup
1. Have two physical devices ready (e.g., laptop + phone, or two computers)
2. Make sure both can access your dev server
   - If using `localhost`, expose via ngrok or similar
   - Or deploy to a staging environment

#### Steps

1. **Device 1 (e.g., Laptop)**
   ```
   1. Open browser and navigate to the app
   2. Open DevTools Console
   3. Log in with test account
   4. Note the console message: "[auth] Device fingerprint stored successfully"
   5. Keep this browser window open
   ```

2. **Device 2 (e.g., Phone)**
   ```
   1. Open browser and navigate to the app
   2. Log in with the SAME account
   3. Note the success message
   ```

3. **Wait 30 seconds**

4. **Back to Device 1 (Laptop)**
   ```
   1. Watch the console
   2. Should see: "[auth] Device fingerprint mismatch detected"
   3. Should see: "[auth] This account is now active on another device. Logging out..."
   4. Browser should automatically log out and show login screen
   ```

5. **Verify Device 2 (Phone)**
   ```
   1. Should still be logged in
   2. Should work normally
   ```

---

## Expected Console Messages

### On Login (Both Devices)
```
[auth] Generating device fingerprint for session token...
[auth] Device fingerprint stored successfully
```

### During Verification (Active Device)
```
(No errors - silent operation)
```

### During Verification (Inactive Device)
```
[auth] Device fingerprint mismatch detected. Reason: Device mismatch - account is active on another device
[auth] This account is now active on another device. Logging out...
```

---

## Testing Checklist

- [ ] Device fingerprint generates on page load
- [ ] Device fingerprint stores on login
- [ ] Verification runs every 30 seconds (check Network tab)
- [ ] Multiple browsers on same device stay logged in
- [ ] Second device login kicks out first device
- [ ] Kicked out device shows login screen
- [ ] No errors in console (except expected mismatch logs)
- [ ] API endpoints return 200 status (not 404)

---

## Network Tab Verification

### What to Check

Open DevTools → Network tab:

1. **On Login**:
   ```
   POST /api/auth/session-token
   Status: 200 OK
   Response: { "success": true }
   ```

2. **Every 30 seconds**:
   ```
   POST /api/auth/session-token/verify
   Status: 200 OK
   Response: { "valid": true, "reason": "Match" }
   ```

3. **On Device Mismatch**:
   ```
   POST /api/auth/session-token/verify
   Status: 200 OK
   Response: { "valid": false, "reason": "Device mismatch - account is active on another device" }
   ```

### Red Flags 🚩

- `404 Not Found` on any endpoint → Route not loaded, restart dev server
- `401 Unauthorized` → Auth token expired, normal behavior
- `500 Internal Server Error` → Check server console for errors

---

## Common Issues & Solutions

### Issue: "404 Not Found" on `/api/auth/session-token/verify`

**Solution**: Restart the Next.js dev server
```bash
# Press Ctrl+C to stop
npm run dev
```

### Issue: Both devices stay logged in (mismatch not detected)

**Possible Causes**:
1. Both devices are actually the same (e.g., different browsers on same computer)
2. Verification loop not running (check console for periodic requests)
3. Database not updated (check Supabase dashboard)

**Debug**:
```javascript
// In browser console, check current fingerprint:
// (Paste this in DevTools console)
async function checkFingerprint() {
  // Copy the generateDeviceFingerprint function logic or
  // check the Network tab for the X-Device-Fingerprint header
  console.log('Check Network tab → session-token/verify → Request Headers → X-Device-Fingerprint');
}
```

### Issue: User gets logged out even on same device

**Possible Causes**:
1. Browser extension modifying device characteristics
2. Virtual machine or emulator
3. Screen resolution changed between logins

**Solution**: Check which fingerprint component is unstable by logging each component separately.

---

## Production Testing

Before deploying to production:

1. **Test on staging environment**
   - Use real devices (laptop, phone, tablet)
   - Test with multiple user accounts
   - Verify timing (30-second intervals)

2. **Load test**
   - Simulate 100+ concurrent users
   - Check database performance on `active_device_fingerprint` column
   - Monitor API endpoint response times

3. **User acceptance testing**
   - Have beta users test the feature
   - Collect feedback on logout behavior
   - Verify no false positives (same device logged out)

---

## Monitoring in Production

### Metrics to Track

1. **Device fingerprint storage success rate**
   - Should be close to 100%
   - Low rate indicates API issues

2. **Device mismatch frequency**
   - High rate = users trying to use multiple devices
   - Or potential bug in fingerprinting

3. **User complaints about unexpected logouts**
   - May indicate false positives
   - Review fingerprinting algorithm

### Log Aggregation

Set up alerts for:
- High error rates on session-token endpoints
- Frequent device mismatches for specific users
- 404 errors on device verification endpoint

---

## Test Account Setup

Create test accounts for different scenarios:

```sql
-- Test User 1: Basic user
-- Email: test1@motisha.com
-- Password: Test123!

-- Test User 2: Admin user
-- Email: admin@motisha.com
-- Password: Admin123!

-- Test User 3: Premium user
-- Email: premium@motisha.com
-- Password: Premium123!
```

Test each account type to ensure device restriction works for all user roles.

---

## Summary

✅ Follow the manual test steps above to verify device restriction works
✅ Check console logs for detailed debugging information
✅ Monitor Network tab for API endpoint status
✅ Test with real devices, not just multiple browsers
✅ Verify 30-second verification interval is running
