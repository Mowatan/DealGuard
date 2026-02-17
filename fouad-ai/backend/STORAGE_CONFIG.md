# Storage Configuration Guide

DealGuard supports multiple storage backends with automatic failover:

1. **Cloudflare R2** (S3-compatible) - Production
2. **AWS S3** - Alternative cloud storage
3. **MinIO** - Self-hosted development
4. **Local Filesystem** - Development fallback

## Provider Selection Priority

The storage service automatically selects providers in this order:

1. **S3/R2** - If `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` are set
2. **MinIO** - If S3 not configured and MinIO credentials available
3. **Local Storage** - Fallback if neither S3 nor MinIO available

## Environment Variables

### Cloudflare R2 (Production)

```env
# Required
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=<your_r2_access_key>
S3_SECRET_ACCESS_KEY=<your_r2_secret_key>
S3_FORCE_PATH_STYLE=true

# Bucket names
S3_BUCKET_DOCUMENTS=dealguard-documents
S3_BUCKET_EVIDENCE=dealguard-evidence

# Optional
SIGNED_URL_TTL_SECONDS=3600  # Default: 1 hour
```

**Getting R2 Credentials:**
1. Sign up at https://dash.cloudflare.com/
2. Go to R2 → Overview
3. Create API Token with "Object Read & Write" permissions
4. Note your Account ID and endpoint URL

### AWS S3 (Alternative)

```env
# No endpoint needed - uses AWS default
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=<your_aws_access_key>
S3_SECRET_ACCESS_KEY=<your_aws_secret_key>
S3_FORCE_PATH_STYLE=false

# Bucket names
S3_BUCKET_DOCUMENTS=dealguard-documents
S3_BUCKET_EVIDENCE=dealguard-evidence
```

### MinIO (Development)

```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=adminpassword

# Bucket names
MINIO_BUCKET_DOCUMENTS=fouad-documents
MINIO_BUCKET_EVIDENCE=fouad-evidence
```

### Local Storage (Fallback)

```env
STORAGE_FALLBACK_ENABLED=true
STORAGE_LOCAL_PATH=/app/uploads
PUBLIC_URL=http://localhost:4000
```

## Bucket Structure

### dealguard-documents
- KYC documents
- Contract PDFs
- Custody proof documents
- All legal/compliance files

### dealguard-evidence
- Dispute evidence
- Milestone completion proof
- Email attachments
- Case file uploads

## Object Key Format

All files are stored with keys in the format:

```
bucket/timestamp-hash-filename
```

Example:
```
fouad-documents/1708123456789-a3f5b2c1-passport-scan.pdf
fouad-evidence/1708123456790-d9e7f4a2-delivery-receipt.jpg
```

Components:
- **timestamp**: Unix milliseconds (for uniqueness and sorting)
- **hash**: First 8 chars of SHA-256 hash (for integrity)
- **filename**: Sanitized original filename

## Database Storage

**IMPORTANT:** Only object **keys** are stored in the database, never URLs.

### Evidence Attachments
```sql
-- Attachment table
s3Key VARCHAR  -- Format: "bucket/timestamp-hash-filename"
```

### KYC Documents
```sql
-- Party table
kycDocumentUrls TEXT[]  -- Array of keys (despite name)
```

### Retrieving Files

Presigned URLs are generated on-demand:

```typescript
import { storage } from './lib/storage';

// Get presigned URL for a stored key
const [bucket, ...keyParts] = storedKey.split('/');
const key = keyParts.join('/');
const url = await storage.getFileUrl(bucket, key, 3600); // 1 hour expiry
```

## Security

### File Validation

The following MIME types are allowed:
- `application/pdf`
- `image/jpeg`, `image/png`, `image/jpg`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

Maximum file size: **50MB**

### Access Control

- All uploads go through authenticated backend API
- User authorization checked before generating presigned URLs
- Presigned URLs expire (default: 1 hour)
- Object keys are not secrets, but access is gated by authentication

### Integrity Verification

Every uploaded file has its SHA-256 hash stored in the database for:
- Duplicate detection
- Integrity verification
- Audit trails

## Railway Deployment

### Setting Environment Variables

1. Go to your Railway project
2. Click on backend service
3. Go to Variables tab
4. Add R2 credentials:

```
S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=your_key
S3_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_DOCUMENTS=dealguard-documents
S3_BUCKET_EVIDENCE=dealguard-evidence
S3_FORCE_PATH_STYLE=true
```

5. Click "Deploy" to restart with new variables

### Creating R2 Buckets

```bash
# Using wrangler CLI
npx wrangler r2 bucket create dealguard-documents
npx wrangler r2 bucket create dealguard-evidence
```

Or via Cloudflare Dashboard:
1. Go to R2 → Create bucket
2. Name: `dealguard-documents`
3. Location: Automatic
4. Repeat for `dealguard-evidence`

## Health Monitoring

Check storage provider status:

```bash
curl https://api.dealguard.org/health
```

Response:
```json
{
  "status": "ok",
  "storage": {
    "current": "Cloudflare R2",
    "providers": {
      "s3": true,
      "local": true
    }
  }
}
```

## Automatic Failover

The storage service automatically:

1. **On startup**: Selects best available provider
2. **On operation failure**: Tries all providers in order
3. **On health check failure**: Switches to healthy provider

Example flow:
1. Primary R2 fails → tries MinIO
2. MinIO also fails → tries Local storage
3. Local succeeds → switches to Local for future operations

This ensures **maximum uptime** with zero manual intervention.

## Migration from MinIO

If you have existing files in MinIO:

1. Add R2 credentials to environment
2. Deploy - R2 becomes primary
3. New uploads go to R2
4. Old files remain in MinIO
5. Retrieval works for both (keys stored in DB)

**No data loss** - both providers coexist. You can migrate old files manually later.

## Cost Estimates

### Cloudflare R2

- Storage: $0.015/GB/month
- Class A operations (writes): $4.50 per million
- Class B operations (reads): $0.36 per million
- No egress fees! 🎉

Example: 100GB + 100k uploads/month + 1M downloads/month = ~$2/month

### AWS S3

- Storage: $0.023/GB/month (us-east-1)
- PUT requests: $5 per million
- GET requests: $0.40 per million
- Egress: $0.09/GB (after 100GB free)

Same example: ~$10-15/month (depending on egress)

**R2 is 5-10x cheaper for public-facing applications!**

## Troubleshooting

### "No storage provider available"

**Cause:** No credentials configured

**Solution:** Add S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, or enable STORAGE_FALLBACK_ENABLED=true

### "Bucket does not exist"

**Cause:** R2 buckets not created

**Solution:** Create buckets via Cloudflare dashboard or wrangler CLI

### "Access Denied"

**Cause:** Invalid credentials or insufficient permissions

**Solution:**
1. Verify credentials in Railway
2. Check R2 API token has "Object Read & Write" permissions
3. Regenerate token if needed

### Files not persisting in production

**Cause:** Using local storage without persistent volume

**Solution:** Configure R2/S3 - local storage is for development only

## Support

For issues:
1. Check `/health` endpoint for storage status
2. Review Railway logs for storage errors
3. Verify environment variables are set correctly
4. Ensure buckets exist and are accessible
