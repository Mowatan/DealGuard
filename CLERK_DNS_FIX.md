# Clerk Authentication DNS Fix

## Problem
Clicking "Sign In" redirects to `accounts.dealguard.org` which returns **DNS_PROBE_FINISHED_NXDOMAIN** error because DNS hasn't propagated yet.

---

## ✅ IMMEDIATE FIX (Choose One)

### Option A: Remove Custom Domain from Clerk (RECOMMENDED)

**This is the fastest fix while DNS propagates.**

1. Go to: https://dashboard.clerk.com
2. Navigate to: **Domains** section
3. **Remove** the custom domain `accounts.dealguard.org`
4. Keep only the default Clerk domain (e.g., `usable-panther-33.clerk.accounts.dev`)
5. Click **Save**

**Result**: Authentication will work immediately using Clerk's hosted domain.

**When to revert**: Once DNS propagates (24-48 hours), add the custom domain back.

---

### Option B: Wait for DNS Propagation

If you've already added the CNAME record in Namecheap:

```
Type: CNAME
Host: accounts
Value: accounts.clerk.services
TTL: Automatic
```

**Timeline**: DNS can take 5 minutes to 48 hours to propagate globally.

**Check propagation**:
```bash
# Windows - check if DNS resolved
nslookup accounts.dealguard.org

# Should return CNAME to accounts.clerk.services
# If it returns NXDOMAIN, DNS not propagated yet
```

**While waiting**, use Option A or C.

---

### Option C: Use Clerk's Frontend API Override

**Temporary environment variable to bypass custom domain.**

#### Step 1: Get Frontend API from Clerk

1. Go to: https://dashboard.clerk.com → **API Keys**
2. Find: **Frontend API** (NOT publishable key)
3. Copy the value (looks like: `clerk.your-app.12345.lcl.dev`)

#### Step 2: Add to Vercel Environment Variables

1. Go to: Vercel → Your Project → **Settings** → **Environment Variables**
2. Add new variable for **Production**:
   ```
   Name: NEXT_PUBLIC_CLERK_FRONTEND_API
   Value: <paste-frontend-api-from-clerk>
   Environment: Production
   ```
3. Click **Save**
4. **Redeploy** the frontend

**Result**: Clerk will use its hosted domain instead of accounts.dealguard.org.

**When to remove**: Once DNS propagates and Option A is no longer needed.

---

## 🔍 Verify DNS Propagation

### Windows Command
```powershell
# Flush local DNS cache first
ipconfig /flushdns

# Check DNS resolution
nslookup accounts.dealguard.org

# Expected result when propagated:
# accounts.dealguard.org
# canonical name = accounts.clerk.services
```

### Online Tools
- https://dnschecker.org - Check global DNS propagation
- Enter: `accounts.dealguard.org`
- Should show CNAME to `accounts.clerk.services`

### Browser Test
```
https://accounts.dealguard.org
```

**Expected**: Redirect to Clerk sign-in page (not DNS error)

---

## 🛠️ Verify Namecheap DNS Configuration

### Correct Configuration

In Namecheap → Domain List → Manage → Advanced DNS:

| Type  | Host     | Value                    | TTL       |
|-------|----------|--------------------------|-----------|
| CNAME | accounts | accounts.clerk.services  | Automatic |

### Common Mistakes ❌

1. **Trailing dot**: `accounts.clerk.services.` ❌ (Remove the dot!)
2. **Full domain in Host**: `accounts.dealguard.org` ❌ (Use just `accounts`)
3. **Wrong value**: `clerk.services` ❌ (Must be `accounts.clerk.services`)
4. **A record instead**: Don't use an A record, must be CNAME
5. **Record not saved**: Check the record is actually saved and active

---

## 🧪 Testing After Fix

### 1. Clear All Caches
```powershell
# Clear Windows DNS cache
ipconfig /flushdns

# Clear browser cache (or use Incognito)
# Chrome: Ctrl+Shift+Delete → Clear cached images and files
```

### 2. Test Sign In
1. Go to: https://dealguard.org
2. Click **Sign In**
3. Should see Clerk sign-in page (not DNS error)

### 3. Check Browser Console
- Open DevTools → Console
- Should **NOT** see:
  - `DNS_PROBE_FINISHED_NXDOMAIN`
  - `ERR_NAME_NOT_RESOLVED`
  - `Failed to fetch`

---

## 📋 Complete Environment Variables

### Vercel Production Environment

```bash
# Clerk Authentication - PRODUCTION
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
CLERK_SECRET_KEY=<your-clerk-secret-key>

# Clerk Routes
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/deals
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/deals

# TEMPORARY: While DNS propagates (Option C)
# Remove this once accounts.dealguard.org resolves correctly
NEXT_PUBLIC_CLERK_FRONTEND_API=<your-frontend-api-from-clerk>

# Backend API
NEXT_PUBLIC_API_URL=https://api.dealguard.org
```

---

## 🔄 Workflow: DNS Not Propagated Yet

**Current state**: DNS record added to Namecheap but not propagated globally

**Choose one approach**:

### Approach 1: Remove Custom Domain (Fastest)
1. ✅ Remove `accounts.dealguard.org` from Clerk dashboard → Domains
2. ✅ Works immediately with Clerk's default domain
3. ⏳ Wait 24-48 hours for DNS to propagate
4. ✅ Add custom domain back to Clerk once `nslookup accounts.dealguard.org` succeeds

### Approach 2: Use Frontend API Override
1. ✅ Add `NEXT_PUBLIC_CLERK_FRONTEND_API` to Vercel (see Option C above)
2. ✅ Redeploy Vercel
3. ✅ Works immediately
4. ⏳ Wait 24-48 hours for DNS to propagate
5. ✅ Remove env var once DNS propagates

### Approach 3: Just Wait
1. ⏳ Wait 24-48 hours for DNS to propagate
2. ❌ Authentication doesn't work during this time
3. ✅ Works automatically once DNS propagates

**Recommendation**: Use **Approach 1** (remove custom domain temporarily) - it's the cleanest and fastest.

---

## 🚨 Troubleshooting

### Issue: "accounts.dealguard.org" still shows DNS error after 48 hours

**Possible causes**:
1. DNS record not saved correctly in Namecheap
2. Typo in CNAME value
3. Nameservers not pointing to Namecheap

**Fix**:
```bash
# Check nameservers
nslookup -type=NS dealguard.org

# Should show Namecheap nameservers:
# dns1.registrar-servers.com
# dns2.registrar-servers.com
```

If nameservers are wrong, update them in domain registrar.

---

### Issue: Clerk still redirects to accounts.dealguard.org even after removing custom domain

**Cause**: Clerk dashboard changes not applied or cached

**Fix**:
1. In Clerk dashboard → Domains
2. Verify custom domain is **completely removed**
3. Clear browser cache (or use Incognito)
4. Try again

---

### Issue: Frontend API override not working

**Cause**: Environment variable not set correctly or deployment not updated

**Fix**:
1. Verify in Vercel → Settings → Environment Variables
2. Check **Production** environment is selected (not Preview/Development)
3. **Redeploy** the frontend (Deployments → Redeploy)
4. Wait for deployment to complete
5. Hard refresh browser (Ctrl+Shift+R)

---

## ✅ Success Criteria

Authentication is working when:

- [ ] Visit https://dealguard.org
- [ ] Click "Sign In"
- [ ] Clerk sign-in page loads (NO DNS error)
- [ ] Can sign in with credentials
- [ ] Redirects to /deals after successful sign-in
- [ ] No console errors related to Clerk

---

## 📞 When to Remove Temporary Fixes

### Remove Custom Domain from Clerk (Option A)
**When**: DNS propagated successfully

**How to verify**:
```bash
nslookup accounts.dealguard.org
# Should return: canonical name = accounts.clerk.services
```

**Then**:
1. Go to Clerk dashboard → Domains
2. Add back `accounts.dealguard.org`
3. Test authentication still works

---

### Remove Frontend API Override (Option C)
**When**: DNS propagated AND custom domain re-added to Clerk

**How**:
1. Verify `nslookup accounts.dealguard.org` succeeds
2. Verify custom domain is in Clerk dashboard
3. Go to Vercel → Settings → Environment Variables
4. **Delete** `NEXT_PUBLIC_CLERK_FRONTEND_API`
5. Redeploy
6. Test authentication

---

## Summary

**Problem**: `accounts.dealguard.org` DNS not propagated → Clerk auth fails

**Quick Fix**: Remove custom domain from Clerk dashboard (Option A)

**Permanent Fix**: Wait for DNS to propagate, then add custom domain back

**Timeline**: DNS propagation takes 5 minutes to 48 hours

**Current Status**: Check with `nslookup accounts.dealguard.org`
