# 🔧 Railway Database Connection Fix

## Issue Identified

The backend deployment is failing because it cannot connect to the PostgreSQL database.

**Error**: `Can't reach database server at postgres-tq0k.railway.internal:5432`

## Root Cause

Railway's internal networking may not be properly configured between the backend service and PostgreSQL service. This typically happens when:

1. Services are not properly linked
2. The DATABASE_URL uses an outdated internal hostname
3. The PostgreSQL service is not running

## Solution: Link Services in Railway Dashboard

### Option 1: Use Railway Dashboard (Recommended)

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/project/d2460633-73da-45c2-8140-bd3629f53c35

2. **Check PostgreSQL Service**
   - Click on the PostgreSQL service (postgres-tq0k)
   - Verify it's running (green status)
   - If stopped, click "Deploy" to start it

3. **Link Services Properly**
   - Click on your backend service ("DealGuard")
   - Go to "Variables" tab
   - Look for DATABASE_URL
   - Click the three dots (...) next to DATABASE_URL
   - Select "Add Reference"
   - Choose the PostgreSQL service
   - Select the DATABASE_URL variable from Postgres

4. **Redeploy Backend**
   - After linking, click "Deploy" on the backend service
   - Railway will use the correct internal connection string

### Option 2: Update DATABASE_URL Manually

If the PostgreSQL service is running but connection still fails:

```bash
# Check current DATABASE_URL
cd fouad-ai/backend
railway variables --kv | grep DATABASE_URL

# If it shows an old internal address, get the new one from Postgres service
# Go to Railway Dashboard > PostgreSQL service > Variables > Copy DATABASE_URL

# Update it (replace with actual URL from Postgres service)
railway variables --set DATABASE_URL="postgresql://postgres:PASSWORD@postgres-tq0k.railway.internal:5432/railway"

# Redeploy
railway up --detach
```

### Option 3: Use Railway CLI to Link

```bash
cd fouad-ai/backend

# List all services in the project
railway service list

# Link to PostgreSQL (if available)
railway link postgres-tq0k

# Redeploy
railway up --detach
```

## Verification Steps

After fixing, verify the connection:

1. **Check Deployment Logs**
   ```bash
   railway logs
   ```
   Should see: "10 migrations found... No pending migrations to apply"

2. **Test Health Endpoint**
   ```bash
   curl https://api.dealguard.org/health
   ```
   Should return: `{"database": "connected"}`

3. **Test API**
   ```bash
   curl https://api.dealguard.org/
   ```
   Should return API metadata

## Current Status

```
✅ Server: Running
✅ Redis: Connected
❌ Database: Connection Failed
⚠️  Storage: Local fallback active
```

## What's Working vs Not Working

### ✅ Working
- Basic HTTP server
- Health check endpoint (returns cached status)
- API root endpoint
- CORS configuration

### ❌ Not Working
- Database queries (all API endpoints that need data)
- Deal creation
- User authentication (needs database)
- Any endpoint that queries data

## Quick Fix Summary

**The fastest way to fix this:**

1. Open Railway Dashboard: https://railway.app/project/d2460633-73da-45c2-8140-bd3629f53c35
2. Click on PostgreSQL service
3. Verify it's running (start if needed)
4. Click on DealGuard backend service
5. Go to Variables > DATABASE_URL
6. Delete the current DATABASE_URL variable
7. Add new reference from PostgreSQL service
8. Click "Deploy" to redeploy

## After Fix

Once database is connected, you'll be able to:
- ✅ Create deals
- ✅ Authenticate users
- ✅ Store data
- ✅ Send emails
- ✅ Full API functionality

## Need Help?

If the issue persists:
1. Check Railway Service Status (all services should be green)
2. Review logs: `railway logs`
3. Verify PostgreSQL is in the same project
4. Check Railway community: https://discord.gg/railway
