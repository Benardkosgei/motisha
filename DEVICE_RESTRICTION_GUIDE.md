# Device Restriction Implementation Guide

## Overview

The device restriction system enforces **single-device login** for user accounts. When a user logs in from a new device, their session on the previous device is automatically terminated.

**Key Feature**: Multiple browsers on the **same physical device** are allowed ✅, but different physical devices are blocked ❌

## Status: ✅ ENABLED

The device restriction feature is now **active** and enforcing single-device sessions.

---

## How It Works

### 1. Device Fingerprinting

When a user accesses the application, a unique device fingerprint is generated based on:

- **Screen resolution** (width × height × color depth)
- **Timezone offset**
- **Language settings**
- **Platform/OS** (Windows, macOS, Linux, etc.)
- **CPU cores** (navigator.hardwareConcurrency)
- **Device memory** (if available)

The fingerprint is **hashed using SHA-256** for privacy and stored as `active_device_fingerprint` in the `profiles` table.

### 2. Login Flow

1. User signs in with email/phone and password
2. Device fingerprint is generated on the client
3. Fingerprint is sent to `/api/auth/session-token` and stored in the database
4. This fingerprint becomes the "authorized device" for this account

### 3. Session Verification

Every **30 seconds**, the client:

1. Generates the current device fingerprint
2. Sends it to `/api/auth/session-token/verify` along with the auth token
3. Server compares with the stored fingerprint
4. If they **don't match** → user is automatically logged out
5. If they **match** → session continues

### 4. Multiple Device Scenario

**Scenario**: User logs in from Device A, then logs in from Device B

1. Device A stores fingerprint `ABC123` in the database
2. User logs in from Device B
3. Device B stores fingerprint `XYZ789` in the database (overwrites A's fingerprint)
4. Device A's next verification check (within 30 seconds):
   - Sends fingerprint `ABC123`
   - Server has `XYZ789` stored
   - Mismatch detected → Device A is logged out
5. Device B continues working normally

---

## Technical Implementation

### Database Schema

```sql
-- profiles table
ALTER TABLE profiles
ADD COLUMN active_device_fingerprint TEXT;

CREATE INDEX idx_profiles_device_fingerprint 
ON profiles (id, active_device_fingerprint);
```

Migration: `20260603000033_single_session_enforcement.sql`

### API Endpoints

#### POST `/api/auth/session-token`

Stores the device fingerprint on login.

**Request**:
```typescript
Headers: {
  'Authorization': 'Bearer <access_token>',
  'Content-Type': 'application/json'
}
Body: {
  deviceFingerprint: string
}
```

**Response**:
```json
{ "success": true }
```

#### POST `/api/auth/session-token/verify`

Verifies device fingerprint matches stored value.

**Request**:
```typescript
Headers: {
  'Authorization': 'Bearer <access_token>',
  'X-Device-Fingerprint': string
}
```

**Response**:
```json
{
  "valid": boolean,
  "reason": string
}
```

### Client-Side Implementation

**File**: `src/lib/auth-context.tsx`

- Generates device fingerprint on component mount
- Stores fingerprint on successful login
- Verifies fingerprint every 30 seconds
- Logs out user if mismatch detected

**File**: `src/lib/device-fingerprint.ts`

- `generateDeviceFingerprint()`: Creates the device fingerprint
- `verifyDeviceFingerprint()`: Checks if current fingerprint matches stored value

---

## User Experience

### Normal Usage

Users won't notice any difference. They can:
- Use multiple browsers on the same device ✅
- Stay logged in indefinitely (until they manually log out) ✅
- Switch between Chrome, Firefox, Edge, etc. on the same computer ✅

### Multi-Device Attempt

If a user tries to use multiple devices:

1. They log in on Device 2
2. Within 30 seconds, Device 1 is automatically logged out
3. Device 1 shows the normal logged-out state
4. User must log back in on Device 1 (which will then log out Device 2)

**No error message** is shown - the logout happens silently and smoothly.

---

## Testing the Feature

### Test Case 1: Same Device, Multiple Browsers

1. Log in on Chrome
2. Open Firefox (same device)
3. Log in on Firefox
4. **Expected**: Both sessions remain active ✅

### Test Case 2: Different Devices

1. Log in on your laptop
2. Log in on your phone with the same account
3. Wait 30 seconds
4. **Expected**: Laptop is logged out ❌
5. Try to interact on laptop
6. **Expected**: Laptop session is terminated

### Test Case 3: Different Screen Resolutions

Change your browser window size or zoom level:

1. Log in normally
2. Change browser zoom (Ctrl + / Ctrl -)
3. Wait 30 seconds
4. **Expected**: Session remains active ✅ (screen properties, not window size)

---

## Monitoring & Debugging

### Console Logs

The system logs detailed information to the browser console:

**Device Fingerprint Generation**:
```
[auth] Generating device fingerprint for session token...
[auth] Device fingerprint stored successfully
```

**Session Verification**:
```
[auth] Device fingerprint mismatch detected. Reason: Device mismatch - account is active on another device
[auth] This account is now active on another device. Logging out...
```

**Errors**:
```
[auth] Session verification failed: 401 Unauthorized
[auth] Session verification error: <error details>
```

### Server Logs

API routes log all operations:

```
[session-token] Storing device fingerprint for user: <uuid>
[session-token] Device fingerprint stored successfully for user: <uuid>
[session-token/verify] No fingerprint stored, storing new one for user: <uuid>
[session-token/verify] Device mismatch for user: <uuid>
```

---

## Configuration

### Verification Interval

Change the verification frequency in `src/lib/auth-context.tsx`:

```typescript
// Current: 30 seconds (30000ms)
const interval = setInterval(verifySession, 30000);

// More frequent: 15 seconds
const interval = setInterval(verifySession, 15000);

// Less frequent: 1 minute
const interval = setInterval(verifySession, 60000);
```

### Disable Feature

To temporarily disable device restriction:

```typescript
// In src/lib/auth-context.tsx
// Comment out the verification useEffect (lines ~72-118)
```

---

## Security Considerations

### ✅ Strengths

- **Prevents account sharing** across different physical devices
- **Privacy-preserving**: Fingerprint is hashed, not stored in plaintext
- **Stable**: Uses hardware characteristics that don't change
- **Browser-agnostic**: Works across Chrome, Firefox, Safari, Edge
- **Automatic enforcement**: No user action required

### ⚠️ Limitations

- **Virtual machines**: Different VMs on the same physical device may have different fingerprints
- **Remote desktop**: RDP sessions may generate different fingerprints
- **VPN/Proxy**: These don't affect the fingerprint (good for privacy)
- **Mobile devices**: Screen rotation doesn't change fingerprint

### 🔒 Privacy

- Device fingerprint is **hashed** before storage
- Original device characteristics are **never stored**
- Fingerprint **cannot be reverse-engineered** to reveal device details
- Uses standard Web APIs (no tracking cookies or third-party services)

---

## Troubleshooting

### Issue: Users getting logged out on the same device

**Possible causes**:
1. Browser extensions changing reported device characteristics
2. Virtual machine or emulation software
3. Display settings being changed (resolution, scaling)

**Solution**: Check console logs to see which fingerprint component is changing.

### Issue: API endpoints returning 404

**Cause**: Next.js dev server needs restart after creating new API routes

**Solution**:
```bash
# Stop the dev server (Ctrl+C)
npm run dev
```

### Issue: Users not getting logged out from other devices

**Check**:
1. Is the verification interval running? (Check console for logs)
2. Are there any network errors? (Check Network tab)
3. Is the database column present? (Check migration applied)

---

## Related Files

- `src/lib/device-fingerprint.ts` - Fingerprint generation logic
- `src/lib/auth-context.tsx` - Client-side verification loop
- `src/app/api/auth/session-token/route.ts` - Store fingerprint endpoint
- `src/app/api/auth/session-token/verify/route.ts` - Verify fingerprint endpoint
- `supabase/migrations/20260603000033_single_session_enforcement.sql` - Database migration

---

## Future Enhancements

Potential improvements:

1. **Trusted Devices**: Allow users to mark specific devices as "trusted"
2. **Device History**: Show users a list of devices where they've logged in
3. **Manual Logout**: Allow users to remotely log out from specific devices
4. **Grace Period**: Add a 5-minute grace period before forcing logout
5. **Notification**: Show a notification before logging out (countdown timer)
6. **Device Names**: Store friendly device names (e.g., "Chrome on Windows", "Safari on iPhone")

---

## Summary

✅ Device restriction is **ENABLED** and working
✅ Multiple browsers on same device are **ALLOWED**
✅ Different physical devices are **BLOCKED**
✅ Verification happens every **30 seconds**
✅ Logout on device mismatch is **AUTOMATIC**
