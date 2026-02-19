# Docker Build - TypeScript Errors to Fix

## Status
❌ Docker build currently fails due to TypeScript compilation errors.
✅ Code runs fine in development mode (tsx watch doesn't strict-check types).

## Errors Found

### 1. Missing Milestone 'name' field
**Files:**
- `src/modules/contracts/contracts.service.ts`
- `src/modules/ai/ai.service.ts`
- `src/modules/milestones/milestones.service.ts`

**Issue:** Milestone schema requires 'name' field but code uses 'title'.

**Fix:** Either:
- Update schema to use 'title' instead of 'name'
- Update code to use 'name' instead of 'title'

### 2. ServiceTier Type Mismatch
**File:** `src/modules/deals/deals.routes.ts`

**Issue:** String literals not matching ServiceTier enum type.

**Fix:** Cast to ServiceTier type:
```typescript
serviceTier: body.serviceTier as ServiceTier
```

### 3. Nullable clerkId
**File:** `src/middleware/auth.ts`

**Issue:** `clerkId` can be null but TypeScript expects non-null.

**Fix:** Update User interface to allow null:
```typescript
interface User {
  clerkId: string | null;
}
```

### 4. JSON Type Issues
**File:** `src/lib/audit.ts`

**Issue:** Null not assignable to JsonValue.

**Fix:** Use Prisma.JsonNull:
```typescript
import { Prisma } from '@prisma/client';
newState: oldState === null ? Prisma.JsonNull : oldState
```

### 5. sourceType Enum
**File:** `src/modules/evidence/evidence.routes.ts`

**Issue:** String not assignable to enum.

**Fix:** Cast or validate:
```typescript
sourceType: body.sourceType as EvidenceSourceType
```

## Workaround for Testing

### Option 1: Skip Type Checking (NOT RECOMMENDED FOR PRODUCTION)
Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "noEmit": false
  }
}
```

### Option 2: Build Without Type Checking
Update Dockerfile to use tsx instead of tsc:
```dockerfile
# Replace:
RUN npm run build

# With:
RUN npx tsx --tsconfig tsconfig.json src/**/*.ts --outDir dist
```

### Option 3: Fix All Type Errors (RECOMMENDED)
Run through each error and fix the type mismatches properly.

## Testing Docker Build

Once errors are fixed:
```bash
# Build image
cd fouad-ai/backend
docker build -t dealguard-backend:test .

# Run container
docker run -p 4000:4000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  -e CLERK_SECRET_KEY="sk_test_..." \
  dealguard-backend:test

# Test health endpoint
curl http://localhost:4000/health
```

## Priority

🔴 **HIGH PRIORITY** - These must be fixed before production deployment.

The TypeScript errors indicate potential runtime bugs that could cause issues in production.
