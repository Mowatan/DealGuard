# Production Deployment Debug Checklist

## Current Issues

### ❌ Issue 1: Clerk Development Keys in Production
**Error**: "Clerk has been loaded with development keys"
**Impact**: Users cannot authenticate in production

### ❌ Issue 2: Failed to Fetch - API Connection
**Error**: "TypeError: Failed to fetch" when calling `/api/deals`
**Impact**: Frontend cannot communicate with backend

---

## 🔧 Fix Steps - Follow in Order

### Step 1: Update Clerk to Production Keys

#### 1.1 Get Production Keys from Clerk Dashboard

1. Go to: https://dashboard.clerk.com
2. Switch to **PRODUCTION** mode (top bar, not test mode)
3. Navigate to: **API Keys** section
4. Copy these keys:
   ```
   Publishable Key: <your-clerk-publishable-key>
   Secret Key: <your-clerk-secret-key>
   ```

#### 1.2 Update Vercel Environment Variables

1. Go to: https://vercel.com → Your Project → Settings → Environment Variables
2. Update/Add these variables for **Production** environment:

   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-live-publishable-key>
   CLERK_SECRET_KEY=<your-clerk-live-secret-key>
   ```

3. ⚠️ **IMPORTANT**: Select **Production** environment only (uncheck Preview/Development)
4. Click **Save**

#### 1.3 Configure Clerk Domains

⚠️ **IMPORTANT**: Only add custom domain AFTER verifying DNS propagation!

**First, verify DNS is working**:
```bash
# Check if accounts.dealguard.org resolves
nslookup accounts.dealguard.org

# Should return: canonical name = accounts.clerk.services
# If NXDOMAIN error, DNS not propagated yet - SKIP this step for now!
```

**If DNS is working**:
1. In Clerk dashboard → **Domains** section
2. Add your production domains:
   - `dealguard.org`
   - `www.dealguard.org`
3. Remove any test/development domains if present

**If DNS NOT working**:
- SKIP adding custom domain for now
- Clerk will use default hosted domain (works fine)
- Come back to this step in 24-48 hours once DNS propagates
- See `CLERK_DNS_FIX.md` for troubleshooting

#### 1.4 Redeploy Frontend

```bash
# Trigger a new deployment in Vercel
# Option A: From Vercel dashboard → Deployments → click "Redeploy"
# Option B: Push a commit to trigger auto-deploy
git commit --allow-empty -m "Trigger production redeploy with Clerk keys"
git push
```

**Verify**: Visit https://dealguard.org - the Clerk warning should be gone

---

### Step 2: Fix API Connection (CORS & URL)

#### 2.1 Verify Backend API URL in Vercel

1. Go to: Vercel → Settings → Environment Variables
2. Check/Update for **Production**:

   ```bash
   NEXT_PUBLIC_API_URL=https://api.dealguard.org
   ```

3. If custom domain not working yet, use Railway direct URL temporarily:

   ```bash
   NEXT_PUBLIC_API_URL=https://dealguard-production-d52c.up.railway.app
   ```

#### 2.2 Update Backend CORS Settings in Railway

1. Go to: Railway dashboard → Your Backend Service → Variables
2. Update **FRONTEND_URL** to include ALL frontend domains (comma-separated):

   ```bash
   FRONTEND_URL=https://dealguard.org,https://www.dealguard.org,https://deal-guard-1j9kijxer-mohamedelwatan1-4978s-projects.vercel.app
   ```

3. Click **Deploy** to apply changes

#### 2.3 Test API Health Endpoint

Open browser or run:

```bash
curl https://api.dealguard.org/health
```

**Expected response**:
```json
{
  "status": "ok",
  "timestamp": "2024-XX-XXT...",
  "database": "connected"
}
```

If this fails:
- ❌ DNS not configured correctly for api.dealguard.org
- ❌ Railway custom domain not set up
- ✅ Use Railway direct URL instead: `https://dealguard-production-d52c.up.railway.app`

#### 2.4 Test CORS from Frontend

Open browser console on https://dealguard.org and run:

```javascript
fetch('https://api.dealguard.org/api/users/me', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

**Expected**: JSON response or 401 (not CORS error)
**If CORS error**: Backend FRONTEND_URL not configured correctly

---

### Step 3: Verify DNS & Domain Configuration

#### 3.1 Check Frontend Domain (Vercel)

```bash
# Should resolve to Vercel
nslookup dealguard.org
nslookup www.dealguard.org
```

**In Vercel**:
- Go to: Settings → Domains
- Ensure both `dealguard.org` and `www.dealguard.org` are added
- Check DNS configuration matches requirements

#### 3.2 Check Backend Domain (Railway)

```bash
# Should resolve to Railway
nslookup api.dealguard.org
```

**In Railway**:
- Go to: Settings → Networking → Custom Domain
- Ensure `api.dealguard.org` is added
- If not set up yet, use Railway's default URL in frontend

---

## 🧪 Testing Checklist

### Frontend Tests

- [ ] Visit https://dealguard.org - loads without Clerk warning
- [ ] Click "Sign In" - Clerk modal opens and works
- [ ] Sign in with test account - redirects to /deals
- [ ] No console errors about development keys

### API Connection Tests

- [ ] Open browser console on dealguard.org
- [ ] Try to create a deal or fetch deals
- [ ] Check Network tab → No CORS errors
- [ ] Check Network tab → Request goes to correct API URL
- [ ] API returns 200/401/403 (not network error)

### Backend Tests

```bash
# Test health
curl https://api.dealguard.org/health

# Test with auth (get token from browser)
curl https://api.dealguard.org/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🚨 Common Issues & Solutions

### Issue: Clerk still shows development warning

**Solutions**:
1. Clear browser cache and cookies
2. Open in incognito/private window
3. Check Vercel deployment logs for correct env vars
4. Verify you're on https://dealguard.org (not preview URL)

### Issue: "Failed to fetch" persists

**Debug Steps**:
1. Open browser DevTools → Network tab
2. Find the failed request
3. Check:
   - Request URL → Should be api.dealguard.org or Railway URL
   - Status → 0 means CORS, 404 means wrong URL, timeout means network issue
   - Headers → Check if Authorization header is present

**Solutions**:
- CORS error → Fix backend FRONTEND_URL
- 404 error → Check NEXT_PUBLIC_API_URL
- Timeout → API might be down or slow
- Network error → DNS issue or firewall blocking

### Issue: CORS error "No 'Access-Control-Allow-Origin' header"

**Solutions**:
1. Backend FRONTEND_URL must include the EXACT origin (https://dealguard.org)
2. Backend must support multiple origins (comma-separated)
3. Redeploy backend after changing FRONTEND_URL
4. Clear browser cache

### Issue: 401 Unauthorized

This is actually **GOOD** - it means:
- ✅ API is reachable
- ✅ CORS is working
- ❌ Auth token is missing/invalid

**Solutions**:
1. Check if user is signed in to Clerk
2. Check if Authorization header is being sent
3. Verify Clerk webhook is configured (backend knows about Clerk users)

### Issue: Clerk Sign-In Shows DNS Error (accounts.dealguard.org)

**Error**: `DNS_PROBE_FINISHED_NXDOMAIN` when clicking "Sign In"

**Cause**: Clerk custom domain configured but DNS not propagated yet

**QUICK FIX** (choose one):

**Option A - Remove Custom Domain (FASTEST)**:
1. Go to: https://dashboard.clerk.com → Domains
2. Remove `accounts.dealguard.org`
3. Authentication works immediately with Clerk's default domain
4. Add custom domain back once DNS propagates (24-48 hours)

**Option B - Use Frontend API Override**:
1. Get Frontend API from Clerk dashboard → API Keys
2. Add to Vercel → Environment Variables → Production:
   ```
   NEXT_PUBLIC_CLERK_FRONTEND_API=<your-frontend-api>
   ```
3. Redeploy Vercel

**Verify DNS Propagated**:
```bash
nslookup accounts.dealguard.org
# Should return: canonical name = accounts.clerk.services
```

**Full Guide**: See `CLERK_DNS_FIX.md` for detailed troubleshooting

---

## 📋 Environment Variables Reference

### Vercel (Frontend) - Production Only

```bash
# Clerk - PRODUCTION keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
CLERK_SECRET_KEY=<your-clerk-secret-key>

# Clerk Routes
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/deals
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/deals

# Backend API
NEXT_PUBLIC_API_URL=https://api.dealguard.org
# OR if custom domain not ready:
# NEXT_PUBLIC_API_URL=https://dealguard-production-d52c.up.railway.app
```

### Railway (Backend) - Production

```bash
# CORS - Multiple origins comma-separated
FRONTEND_URL=https://dealguard.org,https://www.dealguard.org,https://deal-guard-1j9kijxer-mohamedelwatan1-4978s-projects.vercel.app

# Database (from Railway Postgres service)
DATABASE_URL=postgresql://...

# All other env vars from .env.example
# See: fouad-ai/backend/.env.example
```

---

## 🎯 Quick Verification Script

Run this after completing all steps:

```bash
# 1. Check frontend loads
curl -I https://dealguard.org

# 2. Check API health
curl https://api.dealguard.org/health

# 3. Check CORS (should see Access-Control-Allow-Origin header)
curl -I https://api.dealguard.org/health \
  -H "Origin: https://dealguard.org"

# 4. Check Clerk keys (should NOT see warning in page source)
curl https://dealguard.org | grep -i "development"
```

---

## 📞 Need Help?

If issues persist after following this checklist:

1. **Check browser console** for exact error messages
2. **Check Vercel deployment logs** for build/runtime errors
3. **Check Railway logs** for backend errors
4. **Take screenshots** of error messages
5. **Document** which step failed and exact error message

---

## ✅ Success Criteria

You've successfully deployed when:

- [ ] https://dealguard.org loads without Clerk warning
- [ ] Users can sign in/sign up via Clerk
- [ ] Browser console shows no CORS errors
- [ ] API calls complete successfully (200/401, not network errors)
- [ ] https://api.dealguard.org/health returns `{"status":"ok"}`
- [ ] Deal creation/listing works on production frontend

---

## 📝 Notes

- **Clerk keys**: Never commit to git, only in Vercel env vars
- **API URL**: Must match exactly (https, no trailing slash)
- **CORS**: Frontend origin must match EXACTLY (protocol + domain + port)
- **DNS**: Can take 5-60 minutes to propagate
- **Cache**: Always test in incognito when debugging
