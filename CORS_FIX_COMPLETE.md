# CORS Fix Complete ✅

## Problem
Frontend (https://dealguard.org on Vercel) could not reach backend API (https://api.dealguard.org on Railway) due to CORS errors.

**Error Message:**
```
Network error: Cannot reach API at https://api.dealguard.org.
Check: (1) API is running, (2) CORS configured, (3) URL is correct.
```

## Root Causes

1. **Environment Variable Mismatch**: Backend was looking for `FRONTEND_URL` but Railway had `CORS_ORIGIN` set
2. **Missing CORS Methods/Headers**: Not all HTTP methods and headers were explicitly allowed
3. **No credentials support**: Frontend wasn't sending `credentials: 'include'` for CORS requests
4. **Insufficient debugging**: No way to test CORS configuration

## Solutions Implemented

### 1. Updated Backend CORS Configuration

**File:** `fouad-ai/backend/src/server.ts`

**Changes:**
- ✅ Now checks both `CORS_ORIGIN` (Railway) and `FRONTEND_URL` (legacy) environment variables
- ✅ Added explicit CORS methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- ✅ Added explicit allowed headers: `Content-Type, Authorization, X-Requested-With`
- ✅ Added exposed headers: `Content-Length, X-Request-Id`
- ✅ Set `maxAge: 86400` to cache preflight requests for 24 hours
- ✅ Added detailed logging for CORS requests (allowed/blocked)
- ✅ Logs CORS configuration on server startup

**Code:**
```typescript
// Check both CORS_ORIGIN (Railway) and FRONTEND_URL (legacy)
const corsEnv = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = corsEnv
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0);

await server.register(cors, {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true); // Allow requests with no origin
      return;
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      server.log.info(`✅ CORS: Allowed request from origin: ${origin}`);
      callback(null, true);
    } else {
      server.log.warn(`❌ CORS: Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
});
```

### 2. Added CORS Test Endpoint

**File:** `fouad-ai/backend/src/modules/test/test-cors.routes.ts` (NEW)

**Purpose:** Debug and verify CORS configuration

**Endpoints:**
- `GET /api/test-cors` - Returns CORS configuration and request details
- `POST /api/test-cors` - Test POST requests with CORS
- `OPTIONS /api/test-cors` - Test preflight requests

**Usage:**
```bash
# From browser console on https://dealguard.org
fetch('https://api.dealguard.org/api/test-cors')
  .then(r => r.json())
  .then(console.log)

# Or visit directly:
https://api.dealguard.org/api/test-cors
```

**Response Example:**
```json
{
  "success": true,
  "message": "CORS is working! ✅",
  "timestamp": "2025-02-16T...",
  "debug": {
    "requestOrigin": "https://dealguard.org",
    "allowedOrigins": [
      "https://dealguard.org",
      "https://www.dealguard.org",
      "https://deal-guard-git-master-mohamedelwatan1-4978s-projects.vercel.app"
    ],
    "corsEnvVar": "CORS_ORIGIN",
    "method": "GET",
    "isOriginAllowed": true
  }
}
```

### 3. Updated Frontend API Client

**File:** `fouad-ai/frontend/lib/api-client.ts`

**Changes:**
- ✅ Added `credentials: 'include'` to all fetch requests
- ✅ Updated `fetchApi` function
- ✅ Updated all `apiClient` methods (get, post, patch, delete)
- ✅ Updated file upload methods (evidence, contracts, KYC)

**Code:**
```typescript
const response = await fetch(url, {
  ...fetchOptions,
  headers,
  credentials: 'include', // Important for CORS with cookies/auth
});
```

## Railway Environment Variables

**REQUIRED:** Set this environment variable in Railway:

```bash
CORS_ORIGIN=https://dealguard.org,https://www.dealguard.org,https://deal-guard-git-master-mohamedelwatan1-4978s-projects.vercel.app,https://deal-guard-kn0w2s1u-mohamedelwatan1-4978s-projects.vercel.app
```

**Important Notes:**
- Include ALL Vercel deployment URLs (custom domain + preview URLs)
- Comma-separated, NO spaces
- Include both `https://dealguard.org` and `https://www.dealguard.org`
- Add new Vercel preview URLs as needed

**To update on Railway:**
1. Go to Railway dashboard
2. Select your backend service
3. Go to Variables tab
4. Add/update `CORS_ORIGIN` variable
5. Redeploy the service

## Testing Steps

### Step 1: Verify Railway Environment Variable
```bash
# Check Railway logs to see what CORS_ORIGIN is set to
# Should see on startup:
🔐 CORS Configuration: {
  allowedOrigins: ['https://dealguard.org', 'https://www.dealguard.org', ...],
  env: 'production',
  corsEnvVar: 'CORS_ORIGIN'
}
```

### Step 2: Test Health Endpoint
```bash
curl https://api.dealguard.org/health
# Should return: {"status":"ok","database":"connected"}
```

### Step 3: Test CORS Endpoint
```bash
# From browser console on https://dealguard.org
fetch('https://api.dealguard.org/api/test-cors')
  .then(r => r.json())
  .then(console.log)

# Should return success with CORS debug info
```

### Step 4: Test Deal Creation
1. Go to https://dealguard.org/deals/new
2. Fill out the form
3. Submit
4. Check browser console for any CORS errors
5. Verify the deal is created successfully

### Step 5: Check Railway Logs
```bash
# Look for CORS log messages:
✅ CORS: Allowed request from origin: https://dealguard.org
# Or if blocked:
❌ CORS: Blocked request from origin: <origin>
```

## Common Issues & Solutions

### Issue 1: Still getting CORS errors

**Solution:** Verify ALL Vercel URLs are in `CORS_ORIGIN`:
```bash
# Check your Vercel deployment URLs
# Include all of these in CORS_ORIGIN:
- https://dealguard.org (production)
- https://www.dealguard.org (www subdomain)
- https://deal-guard-git-master-mohamedelwatan1-4978s-projects.vercel.app (git branch)
- https://deal-guard-kn0w2s1u-mohamedelwatan1-4978s-projects.vercel.app (preview)
```

### Issue 2: Preflight OPTIONS request failing

**Solution:** Check Railway logs for OPTIONS request errors. The CORS plugin should handle OPTIONS automatically, but verify it's registered correctly.

### Issue 3: CORS works on some endpoints but not others

**Solution:** Ensure all routes are registered AFTER the CORS plugin registration in `server.ts`.

### Issue 4: "Not allowed by CORS" in Railway logs

**Solution:** The origin making the request is not in `CORS_ORIGIN`. Check the logs to see which origin is being blocked and add it.

## Deployment Checklist

- [x] Update backend CORS configuration (server.ts)
- [x] Add CORS test endpoint (test-cors.routes.ts)
- [x] Update frontend API client (api-client.ts)
- [ ] Set CORS_ORIGIN in Railway environment variables
- [ ] Redeploy backend on Railway
- [ ] Redeploy frontend on Vercel
- [ ] Test /api/test-cors endpoint
- [ ] Test deal creation from frontend
- [ ] Verify Railway logs show allowed CORS requests

## Next Steps

1. **Deploy Backend to Railway:**
   ```bash
   git add .
   git commit -m "Fix CORS configuration for production deployment"
   git push origin master
   ```

2. **Set CORS_ORIGIN on Railway:**
   - Go to Railway dashboard
   - Add `CORS_ORIGIN` variable with all Vercel URLs
   - Trigger redeploy

3. **Deploy Frontend to Vercel:**
   - Vercel will auto-deploy from git push
   - Or manually trigger deployment in Vercel dashboard

4. **Verify:**
   - Visit https://api.dealguard.org/api/test-cors
   - Try creating a deal at https://dealguard.org/deals/new
   - Check Railway logs for CORS messages

## Files Modified

1. `fouad-ai/backend/src/server.ts` - Enhanced CORS configuration
2. `fouad-ai/backend/src/modules/test/test-cors.routes.ts` - NEW test endpoint
3. `fouad-ai/frontend/lib/api-client.ts` - Added credentials to all requests

## Summary

The CORS issue was caused by:
1. Environment variable mismatch (FRONTEND_URL vs CORS_ORIGIN)
2. Missing CORS configuration details
3. No credentials in frontend requests

All issues are now resolved with:
1. ✅ Backend checks both environment variables
2. ✅ Comprehensive CORS configuration with all methods/headers
3. ✅ Frontend sends credentials with all requests
4. ✅ Test endpoint for debugging
5. ✅ Detailed logging for troubleshooting

**Status:** Ready for deployment! 🚀
