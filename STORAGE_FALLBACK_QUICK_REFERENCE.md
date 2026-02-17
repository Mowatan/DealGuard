# Storage Fallback System - Quick Reference Card

## 🎯 What It Does

Automatically falls back from MinIO to local filesystem storage when MinIO is unavailable. File uploads never break deal operations.

---

## 📁 Files Changed

### New Files
```
src/lib/storage/types.ts              # Storage interfaces
src/lib/storage/minio-provider.ts     # MinIO provider
src/lib/storage/local-provider.ts     # Local FS provider
scripts/test-storage-fallback.ts      # Integration test
scripts/test-storage-simple.ts        # Quick test
scripts/test-local-file-serving.ts    # File serving test
fouad-ai/backend/.gitignore           # Git ignore rules
```

### Modified Files
```
src/lib/storage.ts                    # Refactored to orchestrator
src/server.ts                         # Added file route + health
.env                                  # Storage config
.env.example                          # Storage config with docs
Dockerfile                            # Create uploads directory
```

### Unchanged (Zero Breaking Changes)
```
src/modules/custody/custody.service.ts
src/modules/contracts/contracts.service.ts
src/modules/evidence/evidence.service.ts
src/modules/kyc/kyc.service.ts
```

---

## ⚙️ Configuration

### Development (.env)
```bash
STORAGE_FALLBACK_ENABLED=true
STORAGE_LOCAL_PATH=C:\path\to\backend\uploads
PUBLIC_URL=http://localhost:4000
```

### Production (Fail Fast)
```bash
STORAGE_FALLBACK_ENABLED=false
```

### Production (High Availability)
```bash
STORAGE_FALLBACK_ENABLED=true
STORAGE_LOCAL_PATH=/mnt/persistent-efs
PUBLIC_URL=https://api.dealguard.com
```

---

## 🧪 Testing

### Quick Test
```bash
cd fouad-ai/backend
npx tsx scripts/test-storage-simple.ts
```

### Full Test
```bash
npm run dev scripts/test-storage-fallback.ts
```

### Local File Serving Test
```bash
npx tsx scripts/test-local-file-serving.ts
```

### Health Check
```bash
curl http://localhost:4000/health | jq .storage
```

---

## 📊 Health Endpoint

### Request
```bash
GET /health
```

### Response
```json
{
  "storage": {
    "current": "MinIO",
    "providers": {
      "primary": "healthy",
      "fallback": "healthy"
    }
  }
}
```

---

## 🔐 File Serving Route

### Endpoint
```
GET /files/:bucket/:key
```

### Valid Buckets
- `fouad-documents`
- `fouad-evidence`

### Security
- ✅ Whitelist validation (prevents path traversal)
- ✅ 403 for invalid buckets
- ✅ 404 for missing files
- ✅ Auto content-type detection

### Example
```bash
curl http://localhost:4000/files/fouad-documents/1771275896866-b11b4bb4-test.txt
```

---

## 📝 Log Messages

### Startup (MinIO Available)
```
✅ Storage: MinIO is healthy
```

### Startup (MinIO Unavailable)
```
⚠️  Storage: MinIO unavailable, checking fallback...
✅ Storage: Now using LocalFileSystem fallback
```

### Runtime Failure
```
Storage operation failed (uploadDocument) with MinIO: [error]
⚠️  Attempting to switch to fallback for operation: uploadDocument
✅ Storage: Switched to fallback (LocalFileSystem). Reason: Operation uploadDocument failed
```

---

## 🏗️ Architecture

```
Storage Service (Orchestrator)
├── Primary: MinIO (production object storage)
└── Fallback: Local FS (development/emergency)
```

### Operation Flow
1. Try operation with current provider (MinIO)
2. On failure → Switch to fallback
3. Retry operation with fallback
4. Continue using fallback (sticky)

---

## 🔄 Provider Features

| Feature | MinIO | Local FS |
|---------|-------|----------|
| Health Check | `listBuckets()` | Write test |
| File Naming | `{ts}-{hash}-{name}` | Same |
| Hash | SHA-256 | SHA-256 |
| URLs | Presigned (24h) | `/files/:bucket/:key` |
| Bucket Creation | Auto | Auto (directories) |

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd fouad-ai/backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and set:
STORAGE_FALLBACK_ENABLED=true
STORAGE_LOCAL_PATH=C:\path\to\backend\uploads
```

### 3. Create Uploads Directory
```bash
mkdir uploads
```

### 4. Start Server
```bash
npm run dev
```

### 5. Verify
```bash
curl http://localhost:4000/health
```

---

## 🐛 Troubleshooting

### Problem: Fallback not working
```bash
# Check config
echo $STORAGE_FALLBACK_ENABLED  # Should be 'true'

# Check logs
# Should see: ✅ Storage: MinIO is healthy
# Or: ⚠️  Storage: Switching to fallback...
```

### Problem: Files not accessible
```bash
# Check provider
curl http://localhost:4000/health | jq .storage.current

# If "MinIO": URLs are presigned (expire after 24h)
# If "LocalFileSystem": Use /files/:bucket/:key route
```

### Problem: Permission denied
```bash
# Check uploads directory permissions
ls -la uploads/  # Should be writable

# Fix permissions (Linux/Mac)
chmod 755 uploads/
```

---

## 📚 Documentation

- **Full Implementation:** `STORAGE_FALLBACK_IMPLEMENTATION_COMPLETE.md`
- **Verification Report:** `STORAGE_FALLBACK_VERIFICATION.md`
- **Summary:** `STORAGE_FALLBACK_SUMMARY.md`
- **This Card:** `STORAGE_FALLBACK_QUICK_REFERENCE.md`

---

## ✅ Verification Status

| Component | Status |
|-----------|--------|
| TypeScript Compilation | ✅ |
| Build | ✅ |
| MinIO Provider | ✅ |
| Local FS Provider | ✅ |
| File Upload | ✅ |
| File Serving | ✅ |
| Health Endpoint | ✅ |
| Security | ✅ |
| Zero Breaking Changes | ✅ |

---

## 🎉 Benefits

✅ **Resilience** - Never breaks on storage failure
✅ **Zero Breaking Changes** - All services work unchanged
✅ **Automatic** - Fallback happens transparently
✅ **Observable** - Clear logging and health checks
✅ **Flexible** - Configurable for dev/prod
✅ **Simple Dev** - No MinIO needed locally
✅ **Extensible** - Easy to add more providers
✅ **Secure** - Path traversal protection

---

**Status:** ✅ Complete and Verified
**Date:** 2026-02-16
**Version:** 1.0.0
