# Phase 1 Prisma Schema Changes

## Summary of Changes

### 1. DealStatus Enum - COMPLETE REPLACEMENT
```prisma
// OLD (remove all)
enum DealStatus {
  DRAFT
  PROPOSED
  ACCEPTED_BY_ALL
  SIGNED_RECORDED
  FUNDED_VERIFIED
  IN_VERIFICATION
  RELEASE_AUTHORIZED
  RETURN_AUTHORIZED
  RELEASE_CONFIRMED
  RETURN_CONFIRMED
  CLOSED
  CANCELLED
}

// NEW (Phase 1 state machine)
enum DealStatus {
  CREATED
  INVITED
  ACCEPTED
  FUNDED
  IN_PROGRESS
  READY_TO_RELEASE
  RELEASED
  COMPLETED
  DISPUTED
  CANCELLED
}
```

### 2. Deal Model - ADD FIELDS
```prisma
model Deal {
  // ... existing fields

  // NEW: Transaction details
  assetType         AssetType?        // shares/real_estate/goods/services
  jurisdiction      String            @default("EG")
  currency          String            @default("EGP")
  totalAmount       Decimal?          @db.Decimal(15, 2)
  settlementMethod  SettlementMethod?
  feesPaidBy        FeesPaidBy?

  // ... rest of existing fields
}
```

### 3. NEW ENUMS for Deal
```prisma
enum AssetType {
  SHARES
  REAL_ESTATE
  GOODS
  SERVICES
  OTHER
}

enum SettlementMethod {
  BANK_TRANSFER
  INSTAPAY
  CASH
  CHEQUE
  OTHER
}

enum FeesPaidBy {
  BUYER
  SELLER
  SPLIT
}
```

### 4. Party Model - ADD FIELDS
```prisma
model Party {
  // ... existing fields

  // NEW: KYC and identity
  partyType         PartyType         @default(INDIVIDUAL)
  idType            IDType?
  idNumber          String?
  poaRequired       Boolean           @default(false)
  kycStatus         KYCStatus         @default(NONE)
  kycDocumentUrls   String[]          @default([])

  // ... rest of existing fields
}
```

### 5. NEW ENUMS for Party
```prisma
enum PartyType {
  INDIVIDUAL
  BUSINESS
}

enum IDType {
  PASSPORT
  NATIONAL_ID
  BUSINESS_REGISTRY
  OTHER
}

enum KYCStatus {
  NONE
  PENDING
  VERIFIED
  REJECTED
}
```

### 6. EvidenceItem Model - ADD FIELDS & RESTRUCTURE
```prisma
model EvidenceItem {
  // ... existing fields

  // MODIFY: sourceType from String to Enum
  sourceType      EvidenceSourceType @default(UPLOAD)

  // NEW: Tracking fields
  submittedByUserId   String?
  submittedBy         User?          @relation("SubmittedEvidence", fields: [submittedByUserId], references: [id])
  verifiedByUserId    String?
  verifiedBy          User?          @relation("VerifiedEvidence", fields: [verifiedByUserId], references: [id])
  verificationNotes   String?

  // ... rest of existing fields
}
```

### 7. NEW ENUM for EvidenceItem
```prisma
enum EvidenceSourceType {
  UPLOAD
  EMAIL
  API
}
```

### 8. Attachment Model - ADD hashSha256
```prisma
model Attachment {
  // ... existing fields (already has sha256Hash)
  // NO CHANGES NEEDED - already has sha256Hash field
}
```

### 9. Dispute Model - ADD FIELDS
```prisma
model Dispute {
  // ... existing fields

  // RENAME/RESTRUCTURE
  issueType       String?           // NEW: Type of issue
  narrative       String            // RENAME from 'description'

  // relatedMilestoneId already exists as milestoneId

  // ... rest of existing fields
}
```

### 10. Milestone Model - ADD/MODIFY FIELDS
```prisma
model Milestone {
  // ... existing fields

  // RENAME: sequence -> order (for consistency)
  // RENAME: title -> name
  // RENAME: description -> conditionText

  order               Int             // Order: 1, 2, 3...
  name                String
  conditionText       String?

  // NEW: Structured evidence requirements
  requiredEvidenceTypes String[]      @default([])

  // NEW: Payout type
  payoutType          PayoutType?

  // Keep existing: releaseAmount, returnAmount, deadline, gracePeriodDays, currency

  // ... rest of existing fields
}
```

### 11. NEW ENUM for Milestone
```prisma
enum PayoutType {
  RELEASE
  REFUND
  PARTIAL
}
```

### 12. MilestoneStatus Enum - SIMPLIFY
```prisma
// OLD (complex)
enum MilestoneStatus {
  PENDING
  EVIDENCE_SUBMITTED
  UNDER_REVIEW
  ACCEPTED
  DISPUTED
  RELEASE_AUTHORIZED
  RETURN_AUTHORIZED
  RELEASE_CONFIRMED
  RETURN_CONFIRMED
  COMPLETED
}

// NEW (simplified for Phase 1)
enum MilestoneStatus {
  PENDING
  IN_PROGRESS
  READY_FOR_REVIEW
  APPROVED
  REJECTED
  COMPLETED
  DISPUTED
}
```

### 13. AuditEvent - STANDARDIZE eventType
```prisma
// NO MODEL CHANGES, but eventType should use standardized strings:
// CASE_CREATED, PARTY_INVITED, PARTY_ACCEPTED, FUNDING_PROOF_SUBMITTED,
// FUNDING_VERIFIED, MILESTONE_EVIDENCE_RECEIVED, MILESTONE_APPROVED,
// RELEASE_INSTRUCTION_ISSUED, DISPUTE_RAISED, CASE_COMPLETED
```

### 14. User Model - ADD RELATIONS for Evidence
```prisma
model User {
  // ... existing fields

  // NEW: Evidence relations
  submittedEvidence   EvidenceItem[]   @relation("SubmittedEvidence")
  verifiedEvidence    EvidenceItem[]   @relation("VerifiedEvidence")

  // ... rest of existing fields
}
```

### 15. NEW: DealDraft Model (for wizard)
```prisma
model DealDraft {
  id                String   @id @default(cuid())
  userId            String

  // Wizard progress
  currentStep       Int      @default(1)

  // Step data (JSON for flexibility)
  step1Data         Json?    // Basics
  step2Data         Json?    // Parties
  step3Data         Json?    // Amount & fees
  step4Data         Json?    // Milestones
  step5Data         Json?    // Documents

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  expiresAt         DateTime // Auto-delete after 7 days

  @@index([userId])
  @@index([expiresAt])
}
```

## Breaking Changes Warning

⚠️ **BREAKING CHANGES:**
1. DealStatus enum values completely changed - existing data will need migration
2. Milestone fields renamed (sequence -> order, title -> name, description -> conditionText)
3. EvidenceItem.sourceType changed from String to Enum

## Migration Strategy

1. Create backup of current database
2. Add new enums and fields first (non-breaking)
3. Add new columns with defaults
4. Migrate existing data (script needed)
5. Rename columns
6. Drop old columns

Would you like me to proceed with these changes?
