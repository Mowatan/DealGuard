# fouad.ai - Project Overview & Architecture

## System Understanding (Restated)

fouad.ai is a **digital escrow governance platform** that reduces counterparty risk in transactions where payment and performance/ownership transfer are asynchronous. Unlike traditional escrow services that automate fund movement, fouad.ai provides:

1. **Structured Process Layer**: Milestone-based workflows with evidence requirements
2. **Verification & Proof System**: Human-verified evidence tied to contract milestones
3. **Audit Trail**: Blockchain-anchored hashes for tamper-evident history
4. **AI Assistance**: Suggestions for contract structure and evidence mapping (human approval required)

### Key Differentiators

- **Physical contract primacy**: Wet-ink/e-signed PDF is authoritative; digital twin is operational
- **Manual custody**: Funds move offline; platform tracks proof and authorizes disbursement
- **Email-native evidence**: Each deal gets dedicated inbox (deal-{id}@fouad.ai)
- **AI suggests, humans decide**: Frontier model proposes; admin approves
- **Hash-only blockchain**: Notarization without PII or enforcement logic

---

## Data Model

### Core Entities

```
┌─────────────┐
│    User     │
├─────────────┤
│ id          │
│ email       │
│ passwordHash│
│ name        │
│ role        │──┐
└─────────────┘  │
                 │
┌────────────────┼──────────────┐
│ Organization   │              │
├────────────────┤              │
│ id             │              │
│ name           │              │
│ registrationNo │              │
└────────────────┘              │
                                │
┌───────────────────────────────┴─────┐
│           Deal                      │
├─────────────────────────────────────┤
│ id                                  │
│ dealNumber (DEAL-2024-0001)         │
│ title                               │
│ status (enum)                       │
│ emailAddress (deal-{id}@fouad.ai)   │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┬──────────┬──────────┬──────────┐
        │             │          │          │          │
  ┌─────▼────┐  ┌────▼─────┐ ┌──▼──────┐ ┌─▼────────┐ ┌▼────────────┐
  │  Party   │  │ Contract │ │Evidence │ │ Custody  │ │ Blockchain  │
  ├──────────┤  ├──────────┤ ├─────────┤ ├──────────┤ │  Anchor     │
  │ role     │  │ version  │ │ subject │ │ amount   │ ├─────────────┤
  │ name     │  │ termsJson│ │ source  │ │ status   │ │ eventType   │
  │ contact  │  │ effective│ │ attach. │ │ proofs   │ │ dataHash    │
  └────┬─────┘  └────┬─────┘ └─────────┘ └──────────┘ │ txHash      │
       │             │                                 └─────────────┘
       │        ┌────▼──────┐
       │        │ Milestone │
       │        ├───────────┤
       │        │ sequence  │
       │        │ status    │
       │        │ evidence  │
       │        │ amounts   │
       │        └───────────┘
       │
  ┌────▼────────┐
  │ Obligation  │
  ├─────────────┤
  │ description │
  │ isCompleted │
  └─────────────┘
```

### Database Tables (39 Total)

**User Management**:
- `User` - System users with roles (SuperAdmin, Admin, CaseOfficer, PartyUser)
- `Organization` - Business entities
- `PartyMember` - Links users to deal parties

**Deal Management**:
- `Deal` - Core deal entity with unique email inbox
- `Party` - Participants in a deal (buyer/seller/payer/etc.)

**Contract & Versioning**:
- `Contract` - Versioned contracts with digital twin of terms
- `ContractAcceptance` - Party acceptance records
- `Milestone` - Conditional checkpoints in a contract
- `Obligation` - Party-specific tasks per milestone

**Evidence**:
- `EvidenceItem` - Submitted proof documents
- `Attachment` - Files attached to evidence

**Custody**:
- `CustodyRecord` - Tracks funding, verification, authorization, confirmation

**Disputes**:
- `Dispute` - Dispute records with resolution workflow

**AI & Audit**:
- `AISuggestion` - AI proposals (pending human review)
- `AuditEvent` - Append-only event log
- `BlockchainAnchor` - On-chain hash anchors

---

## State Machines

### Deal Status States

```
DRAFT
  │
  ↓
PROPOSED ────────────┐
  │                  │
  ↓                  │
ACCEPTED_BY_ALL      │
  │                  │
  ↓                  │
SIGNED_RECORDED      │
  │                  │
  ↓                  │
FUNDED_VERIFIED      │
  │                  │
  ↓                  │
IN_VERIFICATION ─────┤
  │                  │
  ├→ RELEASE_AUTHORIZED
  │     │
  │     ↓
  │  RELEASE_CONFIRMED
  │     │
  ├→ RETURN_AUTHORIZED
  │     │
  │     ↓
  │  RETURN_CONFIRMED
  │     │
  ↓     ↓
CLOSED

CANCELLED ←──────────┘
```

### Milestone Status States

```
PENDING
  │
  ↓
EVIDENCE_SUBMITTED
  │
  ↓
UNDER_REVIEW
  │
  ├→ ACCEPTED ────────┐
  │                   │
  ├→ DISPUTED         │
  │     │             │
  │     ↓             │
  │  [Dispute Flow]   │
  │     │             │
  │     ↓             │
  ↓     ↓             │
RELEASE_AUTHORIZED ←──┘
  │
  ↓
RELEASE_CONFIRMED
  │
  ↓
COMPLETED

OR

RETURN_AUTHORIZED
  │
  ↓
RETURN_CONFIRMED
  │
  ↓
COMPLETED
```

### Custody Record States

```
FUNDING_SUBMITTED
  │
  ↓
FUNDING_VERIFIED
  │
  ├→ RELEASE_AUTHORIZED ──→ RELEASE_CONFIRMED
  │
  └→ RETURN_AUTHORIZED ───→ RETURN_CONFIRMED
```

### Dispute States

```
OPENED
  │
  ↓
EVIDENCE_COLLECTION
  │
  ↓
SETTLEMENT_PROPOSED
  │
  ├→ ADMIN_REVIEW
  │     │
  │     ↓
  │  RESOLVED
  │
  └→ REJECTED
```

### AI Suggestion States

```
PENDING
  │
  ├→ ACCEPTED
  │
  ├→ REJECTED
  │
  └→ MODIFIED (with finalJson)
```

---

## API Architecture

### REST Endpoints

**Base URL**: `http://localhost:4000/api`

#### Deals (`/deals`)
- `POST /` - Create new deal
- `GET /` - List deals (with pagination)
- `GET /:id` - Get deal details
- `PATCH /:id/status` - Update deal status
- `GET /:id/audit` - Audit trail

#### Contracts (`/contracts`)
- `POST /` - Create contract version
- `GET /:id` - Get contract
- `POST /:id/document` - Upload physical PDF
- `POST /:id/accept` - Party acceptance
- `GET /:id/acceptance-status` - Check acceptance

#### Evidence (`/evidence`)
- `POST /` - Submit evidence (multipart/form-data)
- `GET /deal/:dealId` - List evidence
- `GET /:id` - Get evidence details
- `PATCH /:id/review` - Admin review/approve
- `POST /:id/suggest-mapping` - Request AI mapping

#### Custody (`/custody`)
- `POST /funding` - Submit funding proof
- `POST /:id/verify` - Verify funding (admin)
- `POST /:id/authorize` - Authorize release/return (admin)
- `POST /:id/disbursement` - Submit disbursement proof
- `GET /deal/:dealId` - List custody records

#### Blockchain (`/blockchain`)
- `GET /deal/:dealId` - Get anchors
- `GET /:id` - Get anchor details
- `GET /:id/verify` - Verify on-chain

#### Webhooks (`/webhooks`)
- `POST /email/inbound` - Inbound email webhook

#### Users (`/users`)
- `POST /register` - Create user
- `POST /login` - Authenticate
- `GET /me` - Current user

---

## Background Jobs (BullMQ)

### Queue: `email-processing`
- Processes inbound emails
- Creates EvidenceItem records
- Stores attachments in MinIO
- Queues AI mapping suggestion

### Queue: `blockchain-anchor`
- Submits event hashes to smart contract
- Updates anchor status (pending → confirmed)
- Handles retry on failure

### Queue: `ai-suggestion`
- Generates AI suggestions for:
  - Contract structure
  - Evidence-to-milestone mapping
  - Risk flags
  - Missing evidence

---

## Storage Architecture

### S3-Compatible Storage (MinIO)

**Buckets**:
- `fouad-documents` - Contract PDFs, signed agreements
- `fouad-evidence` - Evidence attachments from email/uploads

**File Naming**: `{timestamp}-{hash8}-{filename}`

**Security**: Pre-signed URLs with expiration

---

## Blockchain Integration

### Smart Contract: `AnchorRegistry.sol`

**Purpose**: Immutable event notarization

**Functions**:
- `anchorEvent(dealId, eventType, dataHash)` - Record event
- `getAnchor(anchorId)` - Retrieve anchor
- `verifyAnchor(anchorId, dataHash)` - Verify integrity

**Events Anchored**:
- `contract_effective` - When all parties accept
- `funding_verified` - Admin confirms funds held
- `milestone_accepted` - Milestone completion
- `release_authorized` - Release approved
- `return_authorized` - Return approved
- `release_confirmed` / `return_confirmed` - Execution confirmed

**Network**: Sepolia testnet (dev), Ethereum mainnet (prod)

---

## Security Model

### Authentication
- JWT-based auth (TODO: implement middleware)
- Role-based access control (RBAC)
- Roles: SuperAdmin > Admin > CaseOfficer > PartyUser

### Authorization Matrix

| Action | Party User | Case Officer | Admin | Super Admin |
|--------|-----------|--------------|-------|-------------|
| Create deal | ✓ | ✓ | ✓ | ✓ |
| Upload evidence | ✓ | ✓ | ✓ | ✓ |
| Review evidence | ✗ | ✓ | ✓ | ✓ |
| Verify funding | ✗ | ✗ | ✓ | ✓ |
| Authorize release | ✗ | ✗ | ✓ | ✓ |
| Resolve disputes | ✗ | ✗ | ✓ | ✓ |
| Manage users | ✗ | ✗ | ✗ | ✓ |

### Data Integrity
- Append-only audit log
- SHA256 hashing of all documents
- Blockchain anchoring for critical events
- Version control for contracts

---

## AI Integration (Stub)

### Current Implementation
- Simple keyword matching
- Stubbed for development
- Returns mock suggestions

### Production Integration Plan
1. Call Claude API with:
   - Contract terms
   - Evidence content
   - Business context
2. Parse structured JSON response (Zod validation)
3. Store suggestion with confidence score
4. Await admin review
5. Log suggestion vs final decision for training

### Use Cases
- **Contract Structure**: Suggest milestones, evidence requirements, risk mitigations
- **Evidence Mapping**: Match emails/documents to milestones
- **Amendment Drafting**: Redline contract changes for clarity
- **Risk Flagging**: Identify potential issues in deal structure

---

## Deployment Architecture

### Development (Current)
```
Docker Compose
  ├── PostgreSQL
  ├── Redis
  └── MinIO

Separate Processes
  ├── Backend (Node.js + Fastify)
  └── Frontend (Next.js)
```

### Production (Recommended)
```
Frontend (Vercel/Netlify)
  │
  ↓
Backend (Container - AWS ECS/GCP Cloud Run)
  │
  ├→ PostgreSQL (RDS/Cloud SQL)
  ├→ Redis (ElastiCache/MemoryStore)
  ├→ S3 (AWS S3/GCS)
  ├→ Email Provider (Mailgun/SendGrid)
  └→ Blockchain RPC (Infura/Alchemy)
```

---

## File Structure Summary

```
fouad-ai/
├── README.md                    # Project overview
├── SETUP.md                     # Detailed setup instructions
├── docker-compose.yml           # Infrastructure services
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema (39 tables)
│   │   └── seed.ts              # Sample data
│   └── src/
│       ├── server.ts            # Fastify server
│       ├── lib/
│       │   ├── prisma.ts
│       │   ├── storage.ts       # MinIO client
│       │   ├── queue.ts         # BullMQ workers
│       │   └── audit.ts         # Audit logging
│       └── modules/
│           ├── deals/           # Deal management
│           ├── contracts/       # Contract versioning
│           ├── evidence/        # Evidence + email processing
│           ├── custody/         # Funding & disbursement
│           ├── blockchain/      # Anchoring service
│           ├── ai/              # AI suggestions
│           ├── users/           # Auth
│           └── webhooks/        # Email webhook
│
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Home
│   │   ├── globals.css
│   │   └── deals/
│   │       ├── page.tsx         # Deals list
│   │       └── [id]/page.tsx    # Deal detail
│   └── components/              # (TODO: UI components)
│
└── contracts/
    ├── package.json
    ├── hardhat.config.js
    ├── AnchorRegistry.sol       # Smart contract
    └── scripts/
        └── deploy.js
```

---

## Next Steps for Production

### Phase 1: Core Functionality
- [x] Data model and API
- [x] Email ingestion (stubbed)
- [x] Blockchain anchoring (stubbed)
- [ ] Full authentication middleware
- [ ] Admin UI for case management
- [ ] Party portal with evidence upload
- [ ] Real email provider integration
- [ ] Real AI integration (Claude API)

### Phase 2: Operations
- [ ] Monitoring & alerting
- [ ] Error tracking (Sentry)
- [ ] Rate limiting
- [ ] API documentation (Swagger)
- [ ] Automated testing
- [ ] CI/CD pipeline

### Phase 3: Advanced Features
- [ ] Real-time notifications (WebSockets)
- [ ] Document preview in-app
- [ ] Advanced dispute resolution
- [ ] Multi-currency support
- [ ] Payment provider integrations
- [ ] Analytics dashboard

### Phase 4: Scale
- [ ] Internal SLM training pipeline
- [ ] Mobile apps (iOS/Android)
- [ ] Multi-region deployment
- [ ] Compliance certifications

---

## Key Implementation Notes

1. **No Automatic Releases**: Every disbursement requires explicit admin authorization. This is by design for legal compliance and risk management.

2. **Email is Critical**: The dedicated inbox per deal (`deal-{id}@fouad.ai`) is core UX. Parties submit evidence as they would normally - via email.

3. **Blockchain = Notary, Not Enforcer**: We anchor hashes for audit purposes, not to automate execution. This keeps costs low and avoids smart contract complexity/risk.

4. **AI Trust Boundary**: AI suggestions are always flagged as such. Humans must explicitly accept, reject, or modify. We log diffs to train better models over time.

5. **Physical Contract Primacy**: The signed PDF is legally authoritative. The digital twin (JSON) is operational convenience. In disputes, the PDF wins.

---

## Support & Maintenance

- **Database Migrations**: Always review migrations before production
- **Backup Strategy**: Daily automated backups of PostgreSQL + S3
- **Monitoring**: Track API latency, queue depth, blockchain confirmations
- **Incidents**: Audit log provides forensics for any issue

---

**Project Status**: MVP Complete ✅  
**Next Milestone**: Production deployment with real integrations  
**Estimated Timeline**: 2-3 months to production-ready
