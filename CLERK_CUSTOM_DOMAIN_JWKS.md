# Clerk Custom Domain & JWKS Configuration

## Overview

This guide explains how to configure the backend to use Clerk's JWKS (JSON Web Key Set) endpoint for JWT token verification, especially when using custom Clerk domains.

---

## Default Configuration (Recommended)

**By default, you DON'T need to configure JWKS URL manually.**

The Clerk SDK (`@clerk/backend`) automatically:
1. Extracts your Clerk instance from `CLERK_SECRET_KEY`
2. Resolves the correct JWKS URL
3. Fetches public keys for token verification

**Default JWKS URL pattern**:
```
https://<your-instance>.clerk.accounts.dev/.well-known/jwks.json
```

**Required environment variables** (Railway):
```bash
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
```

✅ **This works for 99% of cases!**

---

## Custom Clerk Domain Configuration

### When Do You Need This?

Only configure custom domain if you have:
1. ✅ Set up a custom domain in Clerk dashboard (e.g., `clerk.dealguard.org`)
2. ✅ Configured DNS CNAME records for the custom domain
3. ✅ Verified the custom domain in Clerk dashboard

### Custom Domain JWKS URL

If using a custom Clerk domain, the JWKS URL becomes:
```
https://clerk.yourdomain.com/.well-known/jwks.json
```

Example for DealGuard:
```
https://clerk.dealguard.org/.well-known/jwks.json
```

---

## Configuration Options

### Option 1: Automatic (Recommended)

**Just set the required keys** - Clerk SDK handles everything:

```bash
# Railway Environment Variables
CLERK_SECRET_KEY=sk_live_your_key_here
CLERK_PUBLISHABLE_KEY=pk_live_your_key_here
```

✅ **Use this unless you have a custom Clerk domain**

---

### Option 2: Custom Domain with API URL

If you have a custom Clerk domain, add:

```bash
# Railway Environment Variables
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...

# Custom domain (optional)
CLERK_API_URL=https://clerk.dealguard.org
```

The SDK will automatically append `/.well-known/jwks.json` to fetch keys.

---

### Option 3: Explicit JWKS URL

If you need full control, specify the JWKS URL directly:

```bash
# Railway Environment Variables
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...

# Explicit JWKS URL (optional)
CLERK_JWKS_URL=https://clerk.dealguard.org/.well-known/jwks.json
```

⚠️ **Only use this if Option 1 or 2 doesn't work**

---

## How It Works

### Backend Token Verification Flow

1. **User signs in** on frontend → Gets JWT token from Clerk
2. **Frontend sends request** to backend with `Authorization: Bearer <token>`
3. **Backend extracts token** from Authorization header
4. **Backend calls `verifyToken`** from `@clerk/backend`:
   ```typescript
   const payload = await verifyToken(token, {
     secretKey: process.env.CLERK_SECRET_KEY,
     publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
     // Optional custom domain config
     apiUrl: process.env.CLERK_API_URL,
     jwksUrl: process.env.CLERK_JWKS_URL,
   });
   ```
5. **Clerk SDK fetches JWKS** from Clerk's endpoint (cached)
6. **Verifies token signature** using public key from JWKS
7. **Returns decoded payload** with user info

### What Changed in Code

**File**: `backend/src/middleware/auth.ts`

**Before**:
```typescript
clerkPayload = await verifyClerkToken(token, {
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
});
```

**After**:
```typescript
const verifyOptions: any = {
  secretKey: process.env.CLERK_SECRET_KEY,
};

if (process.env.CLERK_PUBLISHABLE_KEY) {
  verifyOptions.publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
}

// Support custom Clerk domain
if (process.env.CLERK_API_URL) {
  verifyOptions.apiUrl = process.env.CLERK_API_URL;
}

// Alternative: Direct JWKS URL
if (process.env.CLERK_JWKS_URL) {
  verifyOptions.jwksUrl = process.env.CLERK_JWKS_URL;
}

clerkPayload = await verifyClerkToken(token, verifyOptions);
```

**Benefits**:
- ✅ Supports custom Clerk domains
- ✅ Allows explicit JWKS URL configuration
- ✅ Backward compatible (works without custom domain)
- ✅ Better debugging with detailed logs

---

## Setting Up Custom Clerk Domain (Optional)

### Step 1: Configure in Clerk Dashboard

1. Go to: https://dashboard.clerk.com
2. Navigate to: **Domains** section
3. Click: **Add Domain**
4. Enter: `clerk.dealguard.org`
5. Clerk provides CNAME record details

### Step 2: Configure DNS

Add CNAME record in your DNS provider (Namecheap):

```
Type: CNAME
Host: clerk
Value: <value-provided-by-clerk>
TTL: Automatic
```

### Step 3: Verify Domain in Clerk

Wait for DNS propagation (5 mins to 48 hours), then:
1. Return to Clerk dashboard → Domains
2. Click: **Verify** next to your domain
3. Status should change to ✅ **Verified**

### Step 4: Add to Backend (Railway)

Once domain is verified, add to Railway:

```bash
CLERK_API_URL=https://clerk.dealguard.org
```

Or use explicit JWKS URL:

```bash
CLERK_JWKS_URL=https://clerk.dealguard.org/.well-known/jwks.json
```

### Step 5: Redeploy Backend

Railway will auto-redeploy after variable changes.

---

## Testing JWKS Configuration

### 1. Test JWKS Endpoint Directly

```bash
# For default Clerk domain (find your instance in publishable key)
curl https://your-instance.clerk.accounts.dev/.well-known/jwks.json

# For custom domain
curl https://clerk.dealguard.org/.well-known/jwks.json
```

**Expected response**:
```json
{
  "keys": [
    {
      "use": "sig",
      "kty": "RSA",
      "kid": "ins_...",
      "alg": "RS256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

### 2. Verify Backend Configuration

Run the verification script:

```bash
cd fouad-ai/backend
npx tsx scripts/verify-clerk-config.ts
```

**Expected output with custom domain**:
```
✅ Environment Variables:
  CLERK_SECRET_KEY: ✅ Set
  CLERK_PUBLISHABLE_KEY: ✅ Set

Custom Domain Configuration:
  CLERK_API_URL: https://clerk.dealguard.org
  Note: Custom domain configuration detected.

✅ Clerk configuration looks good!
```

### 3. Test Authentication

```bash
# Sign in on frontend, copy token from Network tab
curl https://api.dealguard.org/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected**: Returns user data (200 OK)

### 4. Check Backend Logs

In Railway logs, look for:
```
DEBUG: Verifying Clerk token {
  hasSecretKey: true,
  hasPublishableKey: true,
  hasApiUrl: true,
  hasJwksUrl: false
}
```

---

## Troubleshooting

### Error: "Failed to resolve JWK during verification"

**Causes**:
1. ❌ JWKS endpoint unreachable
2. ❌ Custom domain not properly configured
3. ❌ DNS not propagated for custom domain
4. ❌ Firewall blocking JWKS requests

**Fix**:

**1. Test JWKS endpoint**:
```bash
curl https://clerk.dealguard.org/.well-known/jwks.json
```

If this fails, the domain isn't properly set up.

**2. Verify DNS resolution**:
```bash
nslookup clerk.dealguard.org
```

Should return IP address.

**3. Remove custom domain temporarily**:
Remove `CLERK_API_URL` and `CLERK_JWKS_URL` from Railway to use default Clerk domain.

**4. Check Clerk dashboard**:
Ensure custom domain is verified (green checkmark).

---

### Error: "Token has invalid signature"

**Causes**:
1. ❌ Wrong JWKS URL (mismatched keys)
2. ❌ Token signed with different instance
3. ❌ Using test token with live keys (or vice versa)

**Fix**:

**1. Verify key types match**:
```bash
# Frontend .env (Vercel)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...  # LIVE
CLERK_SECRET_KEY=sk_live_...                    # LIVE

# Backend .env (Railway)
CLERK_SECRET_KEY=sk_live_...                    # LIVE (must match)
CLERK_PUBLISHABLE_KEY=pk_live_...               # LIVE (must match)
```

**2. Check token source**:
Ensure frontend is using same Clerk instance as backend.

---

### Error: "Network error fetching JWKS"

**Cause**: Backend cannot reach JWKS endpoint (network/firewall issue)

**Fix**:

**1. Test from Railway environment**:
SSH into Railway container and test:
```bash
curl https://clerk.dealguard.org/.well-known/jwks.json
```

**2. Check Railway network settings**:
Ensure outbound HTTPS is allowed.

**3. Use default domain**:
Remove custom domain config to use Clerk's default domain (more reliable).

---

## Environment Variables Reference

### Minimum Required (Railway)

```bash
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
```

### With Custom Domain (Optional)

```bash
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_API_URL=https://clerk.dealguard.org
```

### With Explicit JWKS URL (Optional)

```bash
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_JWKS_URL=https://clerk.dealguard.org/.well-known/jwks.json
```

---

## When to Use Each Configuration

| Scenario | Configuration | Variables Needed |
|----------|---------------|------------------|
| Standard setup | Automatic | `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` |
| Custom Clerk domain | API URL | Above + `CLERK_API_URL` |
| Full control | Explicit JWKS | Above + `CLERK_JWKS_URL` |
| Debugging | Explicit JWKS | Test with specific JWKS URL |

---

## Summary

**Default (Recommended)**:
- ✅ Just set `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY`
- ✅ Clerk SDK handles JWKS URL automatically
- ✅ Works for standard Clerk setup

**Custom Domain** (Optional):
- ✅ Add `CLERK_API_URL=https://clerk.yourdomain.com`
- ✅ Use only if you have custom Clerk domain configured
- ✅ Requires DNS setup and domain verification in Clerk

**Explicit JWKS** (Advanced):
- ✅ Add `CLERK_JWKS_URL=https://clerk.yourdomain.com/.well-known/jwks.json`
- ✅ Use for debugging or specific edge cases
- ✅ Most users won't need this

**Current Status for DealGuard**:
- Use **default configuration** for now
- Only add custom domain config if you've set up `clerk.dealguard.org` in Clerk dashboard
- Test with default first, then add custom domain if needed
