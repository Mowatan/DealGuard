# Clerk Key Mismatch - Frontend Token Verification Failing

## Problem

Frontend logs show:
```
📡 [API] POST /api/deals
📡 [API] Response: 500
Error: Authentication service not configured
Error: Authentication failed
```

**User IS signed in** but backend returns 500 errors when trying to use the API.

---

## Root Cause

**Key Mismatch**: Frontend and backend are using Clerk keys from **different instances** or **different environments** (test vs live).

### How Clerk Works

1. **Frontend** uses `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to sign users in
2. **Clerk** issues a JWT token signed with the **secret key** for that instance
3. **Frontend** sends token to backend in `Authorization` header
4. **Backend** uses `CLERK_SECRET_KEY` to verify the token
5. **If keys don't match**: Token verification fails → 500 error

---

## ✅ SOLUTION: Verify Key Matching

### Step 1: Check Frontend Keys (Vercel)

1. Go to: https://vercel.com → Your Project
2. Navigate to: **Settings** → **Environment Variables**
3. Check **Production** environment
4. Find: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

**Copy the value** (should start with `pk_test_` or `pk_live_`)

### Step 2: Check Backend Keys (Railway)

1. Go to: https://railway.app → Your Backend Service
2. Navigate to: **Variables** tab
3. Find: `CLERK_SECRET_KEY`

**Copy the value** (should start with `sk_test_` or `sk_live_`)

### Step 3: Verify Keys Match

Keys must be from the **SAME Clerk instance**:

| Frontend (Vercel) | Backend (Railway) | Result |
|-------------------|-------------------|---------|
| `pk_test_abc123...` | `sk_test_abc123...` | ✅ Works (same test instance) |
| `pk_live_xyz789...` | `sk_live_xyz789...` | ✅ Works (same live instance) |
| `pk_test_abc123...` | `sk_live_xyz789...` | ❌ FAILS (different instances) |
| `pk_live_xyz789...` | `sk_test_abc123...` | ❌ FAILS (different instances) |

### Step 4: Get Matching Keys from Clerk

1. Go to: https://dashboard.clerk.com
2. Make sure you're in **Production** mode (toggle at top)
3. Navigate to: **API Keys**
4. Copy **BOTH** keys from the **SAME** section:

```
Publishable Key: pk_live_xxxxxxxxxxxxxxxxxxxxxx
Secret Key:      sk_live_xxxxxxxxxxxxxxxxxxxxxx
```

### Step 5: Update Both Services

**Update Vercel (Frontend)**:
1. Settings → Environment Variables → **Production**
2. Update: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`
3. Update: `CLERK_SECRET_KEY=sk_live_...` (if present in frontend)
4. **Redeploy**

**Update Railway (Backend)**:
1. Variables tab
2. Update: `CLERK_SECRET_KEY=sk_live_...`
3. Update: `CLERK_PUBLISHABLE_KEY=pk_live_...`
4. **Redeploy** (automatic)

### Step 6: Test After Redeployment

1. **Clear browser cache** or use Incognito mode
2. Sign out if already signed in
3. Sign in again (gets fresh token from new instance)
4. Try creating a deal

**Expected**: Should work without 500 errors!

---

## 🔍 Debug: Check Your Keys

### Quick Key Check

Run this in your browser console on https://dealguard.org:

```javascript
// Check frontend Clerk key
console.log('Frontend Clerk Key:',
  window.__NEXT_DATA__.props.pageProps.__clerk_ssr_state?.publishableKey ||
  'Not found - check Vercel env vars'
);
```

**Look for**:
- Starts with `pk_test_` → Test mode
- Starts with `pk_live_` → Production mode

### Check Backend Logs (Railway)

1. Go to: Railway → Your Service → **Logs**
2. Look for: Authentication errors
3. Common errors:
   - "Failed to resolve JWK" → Key mismatch or network issue
   - "Invalid token signature" → Definitely key mismatch
   - "Token expired" → User needs to sign in again

---

## 🚨 Common Mistakes

### Mistake 1: Using Different Clerk Accounts

**Problem**: You have multiple Clerk accounts/instances

**Symptoms**:
- Frontend and backend keys look valid
- Both are `pk_live_` and `sk_live_`
- But still failing

**Fix**:
- Make sure both keys are from the **SAME Clerk dashboard**
- Both should have the same instance identifier in the key

### Mistake 2: Test Keys in Production

**Problem**: Using `pk_test_` / `sk_test_` keys on dealguard.org

**Symptoms**:
- Works on localhost
- Fails in production

**Fix**:
- Switch to `pk_live_` / `sk_live_` keys
- Update both Vercel and Railway
- Redeploy both services

### Mistake 3: Frontend Updated, Backend Not

**Problem**: Updated frontend keys but forgot backend

**Symptoms**:
- Sign-in works
- But all API calls fail with 500

**Fix**:
- Update backend keys in Railway to match frontend
- Make sure both are from same Clerk instance

### Mistake 4: Old Token Cached

**Problem**: Browser has old token from previous Clerk instance

**Symptoms**:
- Keys are correct
- Still failing

**Fix**:
1. Sign out completely
2. Clear browser cache (or use Incognito)
3. Sign in again (gets fresh token)

---

## 🧪 Testing Key Matching

### Test 1: Extract Token from Frontend

1. Sign in on https://dealguard.org
2. Open DevTools → **Application** tab
3. Go to: **Cookies** or **Local Storage**
4. Find: Clerk session token
5. Or check Network tab → Find API request → Copy Authorization header

### Test 2: Verify Token Manually

```bash
# Install jwt-cli: npm install -g jwt-cli

# Decode token (replace with your actual token)
jwt decode YOUR_TOKEN_HERE
```

**Check the `iss` (issuer) field**:
- Should match your Clerk instance
- Example: `https://your-instance.clerk.accounts.dev`

### Test 3: Compare with Backend Config

The token's `iss` must match the Clerk instance configured in backend keys.

---

## 🔧 Quick Fix Script

### Check Current Configuration

Create a test file to check token verification:

```typescript
// backend/scripts/test-token-verify.ts
import { verifyToken } from '@clerk/backend';
import { config } from 'dotenv';

config();

async function testToken(token: string) {
  console.log('Testing token verification...\n');
  console.log('Backend Config:');
  console.log('  CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY?.substring(0, 15) + '...');
  console.log('  CLERK_PUBLISHABLE_KEY:', process.env.CLERK_PUBLISHABLE_KEY?.substring(0, 15) + '...');
  console.log('');

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    });

    console.log('✅ Token verified successfully!');
    console.log('User ID:', payload.sub);
    console.log('Issuer:', (payload as any).iss);
  } catch (error) {
    console.error('❌ Token verification failed:');
    console.error(error instanceof Error ? error.message : error);
  }
}

// Get token from command line
const token = process.argv[2];
if (!token) {
  console.error('Usage: npx tsx scripts/test-token-verify.ts YOUR_TOKEN');
  process.exit(1);
}

testToken(token);
```

**Usage**:
```bash
cd fouad-ai/backend

# Get token from frontend (DevTools → Network → Copy Authorization header)
npx tsx scripts/test-token-verify.ts "eyJhbGci..."
```

---

## 📋 Checklist: Fix Key Mismatch

- [ ] Get keys from Clerk dashboard (Production mode, **SAME** keys)
- [ ] Update Vercel frontend:
  - [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`
  - [ ] `CLERK_SECRET_KEY=sk_live_...`
- [ ] Update Railway backend:
  - [ ] `CLERK_SECRET_KEY=sk_live_...`
  - [ ] `CLERK_PUBLISHABLE_KEY=pk_live_...`
- [ ] Verify both use keys from **SAME** Clerk instance
- [ ] Redeploy Vercel (Deployments → Redeploy)
- [ ] Wait for Railway redeploy (automatic)
- [ ] Clear browser cache or use Incognito
- [ ] Sign out and sign in again
- [ ] Test creating a deal

---

## Expected Behavior After Fix

### Before Fix
```
User signs in ✅
Frontend sends API request with token
Backend tries to verify token ❌
Returns 500: "Authentication failed"
```

### After Fix
```
User signs in ✅
Frontend sends API request with token
Backend verifies token ✅
Returns data: 200 OK
```

---

## Summary

**Problem**: Frontend authenticated but backend returns 500 "Authentication failed"

**Root Cause**: Clerk keys don't match between frontend (Vercel) and backend (Railway)

**Solution**:
1. Get matching keys from **SAME** Clerk instance (Production mode)
2. Update **BOTH** Vercel (frontend) and Railway (backend)
3. Redeploy both services
4. Sign out, clear cache, sign in again
5. Test API calls

**Critical**: Both services MUST use keys from the SAME Clerk account/instance!
