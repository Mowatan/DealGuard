# 🎯 Railway Database Fix - Visual Step-by-Step Guide

## What You'll Do

We need to ensure the PostgreSQL database is properly connected to your backend service.

---

## STEP 1: Access Railway Dashboard

1. Open your browser
2. Go to: https://railway.app/project/d2460633-73da-45c2-8140-bd3629f53c35
3. You should see your project dashboard

---

## STEP 2: Identify Your Services

You should see multiple service cards:

```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  DealGuard          │  │  postgres-tq0k      │  │  Redis              │
│  (Backend)          │  │  (PostgreSQL)       │  │  (Redis)            │
│  ● Status           │  │  ● Status           │  │  ● Status           │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

**Check the status dots:**
- 🟢 Green = Running
- 🔴 Red = Stopped/Error
- ⚪ Grey = Deploying

---

## STEP 3: Check PostgreSQL is Running

**Click on the PostgreSQL service card** (postgres-tq0k)

### If PostgreSQL is STOPPED (Red):
1. Click the **"Deploy"** button in the top right
2. Wait 1-2 minutes for it to start
3. Status should turn green
4. Go back to project view (click project name at top)

### If PostgreSQL is RUNNING (Green):
✅ Good! Proceed to next step.

---

## STEP 4: Click on Your Backend Service

1. Click on the **"DealGuard"** service card
2. This opens the service details view

---

## STEP 5: Go to Variables Tab

In the service details view:

```
[ Deployments ] [ Logs ] [ Metrics ] [ Variables ] [ Settings ]
                                         ↑
                                    Click here
```

1. Click the **"Variables"** tab
2. You'll see a list of environment variables

---

## STEP 6: Find or Add DATABASE_URL

Scroll through the variables list and look for `DATABASE_URL`

### CASE A: DATABASE_URL Already Exists

You'll see something like:
```
DATABASE_URL = postgresql://postgres:password@postgres-tq0k.railway.internal...
```

**Actions:**
1. Hover over the DATABASE_URL row
2. Click the three dots **[...]** on the right side
3. You'll see a menu - click **"Remove Variable"**
4. Confirm deletion
5. Now proceed to add it back as a reference (see CASE B)

### CASE B: Add DATABASE_URL as Reference

1. Click the **"+ New Variable"** button (top right)
2. In the "Add Variables" modal:
   - Click **"Add Reference"** (not "Add Variable")
3. You'll see a dropdown to select a service
4. Select **"postgres-tq0k"** from the dropdown
5. Another dropdown appears - select **"DATABASE_URL"**
6. Click **"Add"** button

**What this does:**
- Links your backend to PostgreSQL using internal Railway networking
- Automatically uses the correct connection string
- Updates automatically if PostgreSQL credentials change

---

## STEP 7: Verify Variable is Added

After adding, you should see:
```
DATABASE_URL = ${{postgres-tq0k.DATABASE_URL}}
```

This means it's a **reference** (dynamic link) to the PostgreSQL service, not a hardcoded value.

✅ This is correct!

---

## STEP 8: Redeploy Backend

After adding/updating the variable:

1. Look for the **"Deploy"** button in the top right
2. Click **"Deploy"**
3. Railway will rebuild and redeploy your service

**Wait 2-3 minutes** for deployment to complete.

---

## STEP 9: Watch the Deployment

1. Click the **"Deployments"** tab
2. You'll see the latest deployment with a spinner/progress indicator
3. Click on it to see logs in real-time

**What to look for in logs:**
```
✅ Running database migrations...
✅ 10 migrations found in prisma/migrations
✅ No pending migrations to apply.
✅ Starting server...
✅ Storage: Using LocalStorage as primary provider
✅ Redis: Connected successfully
✅ Server ready at http://localhost:4000
```

**Success indicators:**
- ✅ "No pending migrations to apply" = Database connected!
- ✅ "Server ready" = Backend running!
- ✅ No error messages about database connection

---

## STEP 10: Test the Fix

### Test 1: Check Logs
```bash
# In your terminal
cd fouad-ai/backend
railway logs
```

Should show successful startup with no database errors.

### Test 2: Health Check
```bash
curl https://api.dealguard.org/health
```

Should return:
```json
{
  "status": "ok",
  "database": "connected",  ← Key indicator!
  "timestamp": "...",
  "storage": { ... }
}
```

### Test 3: API Root
```bash
curl https://api.dealguard.org/
```

Should return API metadata (name, version, endpoints).

---

## STEP 11: Test Deal Creation

Now test from your frontend:

1. Go to https://dealguard.org
2. Sign in with Clerk
3. Create a test deal:
   - Title: "Test Property Sale"
   - Add a buyer party
   - Add a seller party
4. Submit the deal

**Expected result:**
- ✅ Deal created successfully
- ✅ You see deal details page
- ✅ Email notifications sent to parties
- ✅ No errors

---

## Common Issues & Solutions

### Issue: "Deploy" button is greyed out
**Solution:** Wait for current deployment to finish first

### Issue: PostgreSQL won't start
**Solution:**
1. Click on PostgreSQL service
2. Go to Settings tab
3. Check if it needs to be restarted
4. Contact Railway support if still failing

### Issue: Still getting database errors after fix
**Solution:**
1. Check DATABASE_URL is a **reference** (shows ${{...}})
2. Verify PostgreSQL is actually running (green status)
3. Try removing and re-adding the reference
4. Redeploy again

### Issue: Health check still fails
**Solution:**
1. Wait 3-5 minutes for DNS propagation
2. Clear browser cache
3. Try incognito/private window
4. Check Railway logs for specific errors

---

## Visual Checklist

Use this to verify each step:

- [ ] Opened Railway Dashboard
- [ ] Found PostgreSQL service (postgres-tq0k)
- [ ] Verified PostgreSQL is running (green status)
- [ ] Clicked on DealGuard backend service
- [ ] Went to Variables tab
- [ ] Removed old DATABASE_URL (if hardcoded)
- [ ] Added DATABASE_URL as reference from PostgreSQL
- [ ] Saw ${{postgres-tq0k.DATABASE_URL}} in variables list
- [ ] Clicked Deploy button
- [ ] Waited for deployment to complete
- [ ] Checked logs - no database errors
- [ ] Tested health endpoint - shows "connected"
- [ ] Tested deal creation from frontend - works!

---

## Success! What Next?

Once database is connected:

### Immediate:
1. ✅ Test deal creation thoroughly
2. ✅ Verify emails are being sent
3. ✅ Check all API endpoints work

### Soon:
1. Configure S3/R2 storage for file persistence
2. Set up monitoring/alerts
3. Configure custom domain (if not already)
4. Review and optimize performance

---

## Need Help?

If you get stuck at any step:
1. Take a screenshot of what you see
2. Share the Railway logs output
3. Describe which step you're on

I'm here to help! 🚀
