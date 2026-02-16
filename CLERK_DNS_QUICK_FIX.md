# 🚨 QUICK FIX: Clerk DNS Error

## The Problem
Sign-in button redirects to `accounts.dealguard.org` → **DNS error** (site can't be reached)

---

## ⚡ IMMEDIATE SOLUTION (2 minutes)

### Go to Clerk Dashboard and Remove Custom Domain

1. **Open**: https://dashboard.clerk.com
2. **Navigate to**: Domains (left sidebar)
3. **Find**: `accounts.dealguard.org`
4. **Click**: Remove/Delete
5. **Save**

✅ **Done!** Authentication works immediately.

---

## Why This Works

- Clerk tries to use custom domain `accounts.dealguard.org`
- DNS record not propagated yet (can take 24-48 hours)
- Removing custom domain → Clerk uses its default hosted domain instead
- Default domain works instantly

---

## When to Add It Back

**Wait until DNS propagates**, then add the custom domain back:

### Check if DNS propagated:
```bash
nslookup accounts.dealguard.org
```

**Expected result when ready**:
```
accounts.dealguard.org
canonical name = accounts.clerk.services
```

**If you see**: `NXDOMAIN` or `can't find` → DNS not ready yet

---

## Alternative If You Don't Want to Remove Domain

Add this to **Vercel** → **Environment Variables** → **Production**:

```
NEXT_PUBLIC_CLERK_FRONTEND_API=<get-from-clerk-dashboard-api-keys>
```

Then **redeploy** Vercel.

---

## Full Details

See: `CLERK_DNS_FIX.md` for complete troubleshooting guide.
