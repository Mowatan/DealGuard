# Railway Production Deployment Guide

## ✅ Production-Ready Backend

The DealGuard backend is now fully configured for production deployment on Railway.

---

## Required Environment Variables

Configure these in Railway's Variables section:

### 🔐 Authentication (Clerk)
```bash
CLERK_SECRET_KEY=sk_live_...                    # From Clerk Dashboard
CLERK_PUBLISHABLE_KEY=pk_live_...               # From Clerk Dashboard
CLERK_JWKS_URL=https://clerk.dealguard.org/.well-known/jwks.json
```

### 📧 Email Service (Mailgun)
```bash
MAILGUN_API_KEY=key-...                         # From Mailgun Dashboard
MAILGUN_DOMAIN=mg.dealguard.org                 # Your Mailgun domain
EMAIL_FROM=DealGuard <noreply@dealguard.org>    # Sender email
```

### ☁️ File Storage (Cloudflare R2 or AWS S3)
```bash
S3_ENDPOINT=https://...r2.cloudflarestorage.com # R2 endpoint
S3_ACCESS_KEY_ID=...                            # R2 Access Key
S3_SECRET_ACCESS_KEY=...                        # R2 Secret Key
S3_BUCKET_EVIDENCE=dealguard-evidence           # Evidence bucket
S3_BUCKET_DOCUMENTS=dealguard-documents         # Documents bucket
S3_REGION=auto                                  # For R2, use 'auto'
```

### 🌐 CORS & Frontend
```bash
CORS_ORIGIN=https://dealguard.org,https://*.vercel.app
FRONTEND_URL=https://dealguard.org
```

### 🔧 Server Configuration
```bash
NODE_ENV=production
PORT=4000
LOG_LEVEL=info
```

### 🗄️ Database & Redis (Auto-provided by Railway)
These are automatically set by Railway:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection

---

## Production Features

### ✅ Automatic Failover
- **Primary**: Cloudflare R2 / AWS S3
- **Fallback**: Local storage (if enabled)
- Automatic provider switching on failure

### ✅ Email Sending
- Uses Mailgun HTTP API (Railway-compatible)
- SMTP ports blocked by Railway? No problem!
- Queue-based email processing with BullMQ

### ✅ Environment Validation
- Validates required variables on startup
- Fails fast if critical config missing
- Clear error messages in logs

### ✅ Health Checks
- `/health` endpoint for monitoring
- Storage provider health checks
- Database connection validation

### ✅ Error Handling
- Graceful degradation on service failures
- Comprehensive logging
- No crashes on single email failure

### ✅ Security
- CORS properly configured
- No localhost defaults in production
- Clerk JWT verification
- Role-based access control

---

## Deployment Steps

### 1. Create Railway Project
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link
```

### 2. Configure Environment Variables
Add all required variables in Railway Dashboard under "Variables"

### 3. Deploy
```bash
git push origin master
```

Railway will automatically:
1. Build the Docker image
2. Run database migrations
3. Start the server
4. Expose at `api.dealguard.org`

---

## Monitoring

### Health Check
```bash
curl https://api.dealguard.org/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "storage": {
    "current": "S3",
    "providers": {
      "s3": true,
      "local": true
    }
  },
  "timestamp": "2024-..."
}
```

### Logs
```bash
# View logs in Railway CLI
railway logs

# Or in Railway Dashboard
# https://railway.app > Your Project > Logs
```

---

## Common Issues & Solutions

### ❌ "CORS blocked"
**Solution**: Add your domain to `CORS_ORIGIN`
```bash
CORS_ORIGIN=https://yourdomain.com,https://*.vercel.app
```

### ❌ "Emails not sending"
**Solution**: Verify Mailgun configuration
```bash
# Check these variables are set:
MAILGUN_API_KEY=key-...
MAILGUN_DOMAIN=mg.dealguard.org
EMAIL_FROM=DealGuard <noreply@dealguard.org>
```

### ❌ "File uploads failing"
**Solution**: Configure S3/R2 storage
```bash
S3_ENDPOINT=https://...r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET_EVIDENCE=dealguard-evidence
S3_BUCKET_DOCUMENTS=dealguard-documents
```

### ❌ "Redis connection failed"
**Solution**: Railway provides `REDIS_URL` automatically. Ensure Redis service is added to your project.

### ❌ "Database connection failed"
**Solution**: Railway provides `DATABASE_URL` automatically. Ensure PostgreSQL service is added to your project.

---

## Production Checklist

Before going live, verify:

- [ ] All environment variables configured
- [ ] `NODE_ENV=production` is set
- [ ] Clerk production keys configured (sk_live_*, pk_live_*)
- [ ] Mailgun domain verified and active
- [ ] S3/R2 buckets created and accessible
- [ ] CORS origins include production domain
- [ ] Database migrations applied successfully
- [ ] Health check returns 200 OK
- [ ] Test deal creation works end-to-end
- [ ] Emails are being delivered
- [ ] File uploads work correctly

---

## Performance Optimization

### Recommendations:
1. **Enable Railway CDN** for static files
2. **Configure Redis persistence** for queue durability
3. **Set up monitoring** (Sentry, LogRocket, etc.)
4. **Enable automatic backups** for PostgreSQL
5. **Scale horizontally** if needed (Railway Pro)

---

## Support

### Railway Issues
- https://railway.app/help
- Discord: https://discord.gg/railway

### DealGuard Issues
- Check logs: `railway logs`
- Review `/health` endpoint
- Verify environment variables

---

## Architecture

```
┌─────────────────┐
│  Railway.app    │
├─────────────────┤
│                 │
│  ┌───────────┐  │
│  │  Backend  │  │ ← You are here
│  │  (Node)   │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────┴─────┐  │
│  │PostgreSQL │  │ ← Auto-provided
│  └───────────┘  │
│        │        │
│  ┌─────┴─────┐  │
│  │  Redis    │  │ ← Auto-provided
│  └───────────┘  │
│                 │
└────────┬────────┘
         │
    ┌────┴────┐
    │ R2/S3   │ ← External
    └─────────┘
         │
    ┌────┴────┐
    │ Mailgun │ ← External
    └─────────┘
```

---

## Security Notes

### ⚠️ Never commit:
- `.env` files
- Secret keys
- API credentials
- Database URLs

### ✅ Always use:
- Environment variables
- Railway's secret management
- Clerk production keys in production
- HTTPS only (enforced by Railway)

---

## Next Steps

After deployment:
1. Test all endpoints
2. Monitor logs for errors
3. Set up alerts (Railway Notifications)
4. Configure custom domain
5. Enable automatic deployments

Your backend is now production-ready! 🚀
