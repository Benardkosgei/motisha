# Device Restriction - Quick Reference Card

## Status: ✅ ENABLED

---

## 🎯 What It Does

**Enforces single-device login**: Only ONE device can be active per account at a time.

- ✅ Same device, different browsers → **ALLOWED**
- ❌ Different devices → **BLOCKED** (auto-logout)

---

## ⏱️ How Fast

- **Verification interval**: 30 seconds
- **Max time until logout**: 30 seconds after other device logs in
- **Fingerprint generation**: Instant (~50ms)

---

## 🔍 Quick Debug

### Check if it's working:

1. Open DevTools Console (F12)
2. Look for these messages:

```
✅ Working:
[auth] Device fingerprint stored successfully

❌ Not working:
404 on /api/auth/session-token/verify
→ Restart dev server: npm run dev
```

### Monitor verification:

1. DevTools → Network tab
2. Filter: "verify"
3. Should see POST request every 30 seconds

---

## 🧪 Quick Test

```
1. Log in on Device A (laptop)
2. Log in on Device B (phone) - same account
3. Wait 30-60 seconds
4. Device A → Logged out ✅
5. Device B → Still logged in ✅
```

---

## 🛠️ Quick Fixes

### Problem: 404 on verify endpoint
```bash
# Stop server (Ctrl+C), then:
npm run dev
```

### Problem: Users logged out on same device
- Check for VirtualBox/VMware
- Check for browser extensions
- Check console for which component changed

### Problem: Verification not running
- Check console for errors
- Verify user is logged in
- Check Network tab for periodic requests

---

## 📁 Key Files

```
Backend:
├── src/app/api/auth/session-token/route.ts          (Store)
└── src/app/api/auth/session-token/verify/route.ts   (Verify)

Frontend:
├── src/lib/auth-context.tsx           (Main logic)
└── src/lib/device-fingerprint.ts      (Fingerprint gen)

Database:
└── profiles.active_device_fingerprint (TEXT column)
```

---

## 🔧 Configuration

### Change interval (src/lib/auth-context.tsx ~line 112):
```typescript
setInterval(verifySession, 30000); // ← milliseconds

15s = 15000
30s = 30000  ← current
60s = 60000
```

### Disable temporarily:
```typescript
// Comment out lines 69-118 in auth-context.tsx
```

---

## 📊 Console Log Cheat Sheet

| Message | Meaning |
|---------|---------|
| `Device fingerprint stored successfully` | ✅ Login successful, fingerprint saved |
| `Device fingerprint mismatch detected` | ⚠️ Other device active, logging out |
| `Session verification failed: 404` | ❌ Restart server needed |
| `Invalid token` | ℹ️ Token expired (normal) |

---

## 🔐 What's Tracked

Device fingerprint includes:
- Screen resolution (1920x1080)
- Timezone offset (+3)
- Language (en-US)
- Platform (Win32, MacIntel)
- CPU cores (8)

**Hashed with SHA-256 before storage**

---

## 📞 Support Quick Answers

**Q: Why was I logged out?**
A: Your account was accessed from another device. For security, only one device can be active at a time.

**Q: Can I use multiple devices?**
A: One at a time. Logging in on Device B logs out Device A.

**Q: Can I use Chrome and Firefox?**
A: Yes! Multiple browsers on the same computer are allowed.

**Q: How do I log back in?**
A: Just log in normally. It will log out the other device.

---

## 📈 Monitoring Checklist

- [ ] Check error rate on verify endpoint (should be <1%)
- [ ] Monitor device mismatch frequency
- [ ] Track user complaints about logouts
- [ ] Verify 200 OK status on both endpoints
- [ ] Check database query performance

---

## 🚀 Production Deployment

1. Verify migration applied: `20260603000033_single_session_enforcement.sql`
2. Test on staging with real devices
3. Monitor logs for 24 hours
4. Set up alerts for high error rates
5. Document for support team

---

## 📚 Full Documentation

- **DEVICE_RESTRICTION_GUIDE.md** - Complete technical guide
- **test-device-restriction.md** - Testing instructions
- **DEVICE_RESTRICTION_ENABLED.md** - Implementation summary

---

**Last Updated**: June 6, 2026
**Version**: 1.0
**Status**: PRODUCTION READY ✅
