# Fix Clerk JWK Verification Error in Backend

## Problem
Backend returns error: **"Failed to resolve JWK during verification"**

This happens when:
- Backend tries to verify Clerk JWT tokens
- Cannot fetch JWK (JSON Web Keys) from Clerk
- Missing or incorrect Clerk configuration

---

## ✅ SOLUTION - Add Clerk Keys to Railway

### Step 1: Get Clerk Keys

1. Go to: https://dashboard.clerk.com
2. Navigate to: **API Keys** (left sidebar)
3. Copy **BOTH** keys:
   - **Secret Key**: `sk_live_...` (for production) or `sk_test_...` (for dev)
   - **Publishable Key**: `pk_live_...` (for production) or `pk_test_...` (for dev)

⚠️ **IMPORTANT**: For production, use **LIVE** keys (pk_live_... / sk_live_...)

---

### Step 2: Add Keys to Railway

1. Go to: https://railway.app → Your Backend Service
2. Click: **Variables** tab
3. Add these two variables:

   ```bash
   CLERK_SECRET_KEY=sk_live_your_key_here_xxxxxxxxxxxxxxxxxxxx
   CLERK_PUBLISHABLE_KEY=pk_live_your_key_here_xxxxxxxxxxxxxxxxxxxx
   ```

4. Click **Deploy** (or it will auto-deploy)

---

### Step 3: Verify Configuration (Optional)

Run this script locally to verify your .env is correct:

```bash
cd fouad-ai/backend
npx tsx scripts/verify-clerk-config.ts
```

**Expected output**:
```
✅ Environment Variables:
  CLERK_SECRET_KEY: ✅ Set
  CLERK_PUBLISHABLE_KEY: ✅ Set
  Secret Key Type: 🔴 Live
  Publishable Key Type: 🔴 Live

✅ Clerk configuration looks good!
```

---

### Step 4: Test Backend Authentication

After deployment, test the backend:

```bash
# Get a token from frontend (sign in and check Network tab)
# Copy the Authorization header value

curl https://api.dealguard.org/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected**: Returns user data (200 OK)
**If still error**: Check Railway logs for specific error message

---

## What Changed in Code

### 1. Enhanced Auth Middleware

**File**: `backend/src/middleware/auth.ts`

**Changes**:
- ✅ Added validation that `CLERK_SECRET_KEY` is set
- ✅ Added `publishableKey` option to help JWK resolution
- ✅ Enhanced error logging with JWK-specific messages
- ✅ Added debug logging for troubleshooting

**Before**:
```typescript
clerkPayload = await verifyClerkToken(token, {
  secretKey: process.env.CLERK_SECRET_KEY,
});
```

**After**:
```typescript
clerkPayload = await verifyClerkToken(token, {
  secretKey: process.env.CLERK_SECRET_KEY,
  ...(process.env.CLERK_PUBLISHABLE_KEY && {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  }),
});
```

### 2. Updated .env.example

**File**: `backend/.env.example`

**Added**:
```bash
# Clerk Authentication
CLERK_SECRET_KEY="sk_test_or_sk_live_your_key_here"
CLERK_PUBLISHABLE_KEY="pk_test_or_pk_live_your_key_here"
```

### 3. Created Verification Script

**File**: `backend/scripts/verify-clerk-config.ts`

**Purpose**: Check Clerk configuration before deployment

---

## Why This Happens

### Root Cause

When the backend receives a JWT token from Clerk:
1. Token header contains a `kid` (key ID)
2. Backend needs to fetch the corresponding public key from Clerk's JWKS endpoint
3. If `CLERK_SECRET_KEY` is not set, verification fails
4. If keys are mismatched (test vs live), verification fails

### JWKS Endpoint

Clerk provides public keys at:
```
https://<your-instance>.clerk.accounts.dev/.well-known/jwks.json
```

Or with custom domain:
```
https://clerk.your-domain.com/.well-known/jwks.json
```

The `@clerk/backend` SDK automatically fetches these keys.

---

## 🚨 Troubleshooting

### Error: "Failed to resolve JWK during verification"

**Causes**:
1. ❌ `CLERK_SECRET_KEY` not set in Railway
2. ❌ Using test keys with live tokens (or vice versa)
3. ❌ Old/invalid Clerk keys
4. ❌ Network issues accessing Clerk JWKS endpoint

**Fix**:
1. Verify keys are set in Railway → Variables
2. Verify key types match (both test or both live)
3. Copy fresh keys from Clerk dashboard
4. Check Railway logs for specific error

---

### Error: "Token expired"

**Cause**: JWT token has expired (usually 1 hour lifetime)

**Fix**: Sign out and sign in again to get fresh token

---

### Error: "Configuration Error: Authentication service not configured"

**Cause**: `CLERK_SECRET_KEY` environment variable is missing

**Fix**: Add `CLERK_SECRET_KEY` to Railway environment variables

---

### Error: "Invalid token"

**Causes**:
1. Token is malformed
2. Token is for wrong Clerk instance
3. Using test token with live keys (or vice versa)

**Fix**:
1. Check Authorization header format: `Bearer <token>`
2. Verify frontend is using correct Clerk publishable key
3. Verify backend is using matching secret key (test with test, live with live)

---

## Environment Variables Reference

### Backend (Railway)

```bash
# Required for Clerk authentication
CLERK_SECRET_KEY=sk_live_...  # or sk_test_... for development
CLERK_PUBLISHABLE_KEY=pk_live_...  # or pk_test_... for development

# Other required variables
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
FRONTEND_URL=https://dealguard.org,https://www.dealguard.org
# ... (see .env.example for complete list)
```

### Frontend (Vercel)

```bash
# Required for Clerk authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...  # or pk_test_...
CLERK_SECRET_KEY=sk_live_...  # or sk_test_...

# Required for API connection
NEXT_PUBLIC_API_URL=https://api.dealguard.org
```

⚠️ **IMPORTANT**: Backend and frontend must use **matching** Clerk keys (both test or both live)!

---

## Testing Checklist

After adding Clerk keys to Railway:

- [ ] Railway deployed successfully (check Deployments tab)
- [ ] Backend health check works: `curl https://api.dealguard.org/health`
- [ ] Run verify script locally: `npx tsx scripts/verify-clerk-config.ts`
- [ ] Sign in on frontend (https://dealguard.org)
- [ ] Check browser console - no auth errors
- [ ] API calls succeed (create deal, fetch deals, etc.)
- [ ] Check Railway logs - no JWK errors

---

## Key Matching Matrix

| Frontend Key Type | Backend Key Type | Result |
|-------------------|------------------|--------|
| pk_test_...       | sk_test_...      | ✅ Works |
| pk_live_...       | sk_live_...      | ✅ Works |
| pk_test_...       | sk_live_...      | ❌ Fails |
| pk_live_...       | sk_test_...      | ❌ Fails |

**Rule**: Test keys work with test keys, live keys work with live keys. **Never mix!**

---

## Quick Reference Commands

```bash
# Verify local Clerk config
cd fouad-ai/backend
npx tsx scripts/verify-clerk-config.ts

# Test backend health
curl https://api.dealguard.org/health

# Test authenticated endpoint (get token from frontend first)
curl https://api.dealguard.org/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check Railway logs
# Go to: Railway Dashboard → Your Service → Logs
# Look for: "Clerk token verification failed" or "JWK" errors
```

---

## Summary

**Problem**: Backend can't verify Clerk tokens → JWK error

**Root Cause**: Missing `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` in Railway

**Solution**:
1. Get keys from Clerk dashboard
2. Add to Railway environment variables
3. Redeploy backend
4. Test authentication

**Success Criteria**: Frontend can sign in → Backend verifies token → API calls work
