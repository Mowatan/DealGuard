# Fix "Authentication service not configured" Error

## Error
```json
{
  "error": "Configuration Error",
  "message": "Authentication service not configured"
}
```

**HTTP Status**: 500 Internal Server Error

---

## Root Cause

This error occurs when `CLERK_SECRET_KEY` is **missing** from Railway environment variables.

**Code location** (`backend/src/middleware/auth.ts:189-195`):
```typescript
if (!process.env.CLERK_SECRET_KEY) {
  request.log.error('CLERK_SECRET_KEY not configured');
  return reply.code(500).send({
    error: 'Configuration Error',
    message: 'Authentication service not configured',
  });
}
```

---

## ✅ SOLUTION: Add Clerk Keys to Railway

### Step 1: Get Your Clerk Keys

1. Go to: https://dashboard.clerk.com
2. Navigate to: **API Keys** (left sidebar)
3. **IMPORTANT**: Make sure you're in **Production** mode (toggle at top)
4. Copy **BOTH** keys:
   ```
   Secret Key (sk_live_...)
   Publishable Key (pk_live_...)
   ```

### Step 2: Add to Railway Environment Variables

1. Go to: https://railway.app
2. Select: Your **Backend** service (not frontend!)
3. Click: **Variables** tab
4. Click: **+ New Variable**

**Add these TWO variables**:

```bash
# Variable 1
Name: CLERK_SECRET_KEY
Value: sk_live_your_actual_key_here_xxxxxxxxxxxx

# Variable 2
Name: CLERK_PUBLISHABLE_KEY
Value: pk_live_your_actual_key_here_xxxxxxxxxxxx
```

5. Railway will **automatically redeploy** (takes ~2 minutes)

### Step 3: Wait for Deployment

- Check: Railway → **Deployments** tab
- Wait for: Green checkmark ✅ "Success"
- Duration: Usually 2-3 minutes

### Step 4: Verify Fix

```bash
# This should now work (will return 401 instead of 500)
curl https://api.dealguard.org/api/users/me

# Expected: {"error":"Unauthorized","message":"No authentication token provided"}
# (401 is correct - means auth is configured, just no token provided)
```

---

## ⚠️ Important Notes

### We're Using Fastify, Not Express

**Note**: The backend uses **Fastify**, not Express. The current implementation is correct:

```typescript
// ✅ CORRECT (what we have) - Fastify
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractTokenFromHeader(request.headers.authorization);
  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
  });
}
```

```typescript
// ❌ WRONG (Express approach) - Don't use this!
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
app.use(ClerkExpressWithAuth({ ... }));
```

**Our implementation is correct.** We just need the environment variables!

---

## 🔍 How to Check if Variables Are Set

### Check Railway Dashboard

1. Go to: Railway → Your Backend Service
2. Click: **Variables** tab
3. Look for:
   - `CLERK_SECRET_KEY`
   - `CLERK_PUBLISHABLE_KEY`

**If missing**: Add them (see Step 2 above)
**If present**: Check the values are correct (should start with `sk_live_` and `pk_live_`)

### Check Railway Logs

1. Go to: Railway → Your Backend Service
2. Click: **Logs** tab
3. Look for: `CLERK_SECRET_KEY not configured`

**If you see this**: Environment variable is missing or not loaded

---

## 🧪 Testing After Fix

### 1. Test Without Token (Should Get 401)

```bash
curl https://api.dealguard.org/api/users/me
```

**Expected (GOOD)**:
```json
{"error":"Unauthorized","message":"No authentication token provided"}
```

**Before fix (BAD)**:
```json
{"error":"Configuration Error","message":"Authentication service not configured"}
```

### 2. Test With Valid Token

1. Sign in on frontend: https://dealguard.org
2. Open DevTools → Network tab
3. Find any API request
4. Copy the `Authorization` header value
5. Test:

```bash
curl https://api.dealguard.org/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected**: Returns user data (200 OK)

---

## 🚨 Troubleshooting

### Issue: Still getting "Authentication service not configured" after adding keys

**Possible causes**:
1. ❌ Railway didn't redeploy after adding variables
2. ❌ Wrong service (added to frontend instead of backend)
3. ❌ Typo in variable names (must be exact)
4. ❌ Variables added to wrong environment (Preview vs Production)

**Fix**:

**1. Force redeploy**:
- Railway → Deployments → Click "Redeploy" on latest deployment

**2. Verify correct service**:
- Make sure you're in the **backend** service
- Check URL should be: `railway.app/project/.../service/backend/variables`

**3. Verify variable names**:
```bash
# Must be EXACTLY these names (case-sensitive)
CLERK_SECRET_KEY          ✅ Correct
clerk_secret_key          ❌ Wrong (lowercase)
CLERK_SECRET              ❌ Wrong (missing _KEY)
```

**4. Check deployment logs**:
- Railway → Logs tab
- Look for startup messages
- Should NOT see: "CLERK_SECRET_KEY not configured"

---

### Issue: Variables are set but still not working

**Check variable values**:

1. Go to: Railway → Variables
2. Click: Eye icon to reveal values
3. Verify:
   - `CLERK_SECRET_KEY` starts with `sk_live_` (not `sk_test_`)
   - `CLERK_PUBLISHABLE_KEY` starts with `pk_live_` (not `pk_test_`)
   - No extra spaces before/after
   - No quotes around the values

**Re-copy from Clerk**:
1. Go to: https://dashboard.clerk.com → API Keys
2. Make sure in **Production** mode (not Test)
3. Copy fresh keys
4. Update in Railway
5. Redeploy

---

### Issue: Backend logs show "Failed to resolve JWK"

**This is a different error** - means keys are set but token verification fails.

**See**: `CLERK_BACKEND_JWK_FIX.md` for JWK troubleshooting

---

## 📋 Environment Variables Checklist

### Required in Railway (Backend Service)

- [ ] `CLERK_SECRET_KEY=sk_live_...`
- [ ] `CLERK_PUBLISHABLE_KEY=pk_live_...`
- [ ] `DATABASE_URL=postgresql://...` (should already exist)
- [ ] `FRONTEND_URL=https://dealguard.org,...`

### Optional in Railway (for custom domain)

- [ ] `CLERK_API_URL=https://clerk.dealguard.org` (only if using custom domain)
- [ ] `CLERK_JWKS_URL=https://clerk.dealguard.org/.well-known/jwks.json` (rarely needed)

---

## 🎯 Expected Behavior After Fix

### Before Fix
```bash
$ curl https://api.dealguard.org/api/users/me
{"error":"Configuration Error","message":"Authentication service not configured"}
# HTTP 500 ❌
```

### After Fix
```bash
$ curl https://api.dealguard.org/api/users/me
{"error":"Unauthorized","message":"No authentication token provided"}
# HTTP 401 ✅ (correct - means auth IS configured, just no token)
```

### With Valid Token
```bash
$ curl https://api.dealguard.org/api/users/me \
  -H "Authorization: Bearer valid_token"
{
  "id": "user_...",
  "email": "user@example.com",
  "name": "User Name",
  "role": "PARTY_USER"
}
# HTTP 200 ✅
```

---

## 📖 Related Documentation

- **CLERK_BACKEND_JWK_FIX.md** - JWK verification errors
- **CLERK_CUSTOM_DOMAIN_JWKS.md** - Custom domain setup
- **PRODUCTION_DEPLOYMENT_DEBUG_CHECKLIST.md** - Complete deployment guide

---

## Quick Reference Commands

```bash
# Test backend health (should always work)
curl https://api.dealguard.org/health

# Test auth endpoint (should return 401 after fix, not 500)
curl https://api.dealguard.org/api/users/me

# Check Railway logs
# Go to: Railway Dashboard → Service → Logs

# Verify local config (if testing locally)
cd fouad-ai/backend
npx tsx scripts/verify-clerk-config.ts
```

---

## Summary

**Error**: "Authentication service not configured"

**Cause**: `CLERK_SECRET_KEY` not set in Railway environment variables

**Solution**: Add both Clerk keys to Railway → Backend Service → Variables

**Steps**:
1. Get keys from Clerk dashboard (Production mode)
2. Add to Railway (Variables tab)
3. Wait for auto-redeploy (~2 mins)
4. Test: `curl https://api.dealguard.org/api/users/me`
5. Should now get 401 instead of 500

**Success Criteria**: Error changes from 500 "Authentication service not configured" to 401 "No authentication token provided"
