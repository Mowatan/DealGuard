# fouad.ai - Digital Escrow & Conditional Settlement Platform

## System Architecture

### Core Concept
A **governance + proof layer** for asynchronous transactions. We don't automate bank transfers - we provide a verifiable audit trail and structured milestone-based process that reduces counterparty risk.

### Key Components

1. **Contract Management**
   - Physical contract (PDF) is authoritative
   - Digital twin stores structured terms (parties, milestones, conditions)
   - Version control with explicit party acceptance

2. **Custody Layer** (Manual)
   - Parties transfer funds offline (bank/Instapay)
   - Submit proof of funding
   - Admin verifies "Funds Held"
   - Admin authorizes Release/Return per milestone
   - Parties submit proof of actual disbursement

3. **Evidence Intake**
   - Each deal has dedicated email inbox (deal-{id}@fouad.ai)
   - Parties email evidence (receipts, documents, proofs)
   - System ingests attachments, creates EvidenceItems
   - AI suggests milestone mapping

4. **AI Assistance** (Suggest Only)
   - Frontier model proposes contract structure, amendments, evidence mapping
   - ALL suggestions require human Admin approval
   - Training data logged (suggestion vs final)

5. **Blockchain Anchoring**
   - Hash-only notarization (NO PII on-chain)
   - Anchors: contract_effective, funding_verified, milestone_accepted, release_authorized, etc.
   - Tamper-evident audit trail

### Tech Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind + shadcn/ui
- **Backend**: Node.js + Fastify + TypeScript + Prisma
- **Database**: PostgreSQL
- **Storage**: MinIO (S3-compatible)
- **Queue**: BullMQ + Redis
- **Email**: Mailgun/Sendgrid webhook + SMTP
- **Blockchain**: Ethereum-compatible (Sepolia testnet for dev)

## Project Structure

```
fouad-ai/
├── backend/               # Node.js backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── deals/
│   │   │   ├── contracts/
│   │   │   ├── evidence/
│   │   │   ├── custody/
│   │   │   ├── blockchain/
│   │   │   └── ai/
│   │   ├── prisma/
│   │   ├── jobs/
│   │   └── server.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/              # Next.js frontend
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
├── contracts/             # Solidity contracts
│   └── AnchorRegistry.sol
├── docker-compose.yml
└── README.md
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- pnpm (or npm)

### Local Development

```bash
# Start infrastructure
docker-compose up -d

# Backend setup
cd backend
pnpm install
pnpm prisma migrate dev
pnpm dev

# Frontend setup (new terminal)
cd frontend
pnpm install
pnpm dev
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- MinIO Console: http://localhost:9001 (admin/adminpassword)
- Postgres: localhost:5432

## Core State Machine

```
DEAL STATES:
Draft → Proposed → AcceptedByAll → SignedRecorded → 
Funded(Verified) → InVerification → ReleaseAuthorized/ReturnAuthorized → 
ReleaseConfirmed/ReturnConfirmed → Closed

MILESTONE STATES:
Pending → EvidenceSubmitted → UnderReview → 
Accepted/Disputed → ReleaseAuthorized/ReturnAuthorized → 
ReleaseConfirmed/ReturnConfirmed → Completed

DISPUTE STATES:
Opened → EvidenceCollection → SettlementProposed → 
AdminReview → Resolved
```

## Governance Roles

- **SuperAdmin**: System owner, policy control
- **Admin**: Final approver for state transitions
- **CaseOfficer**: Deal preparation, evidence review
- **PartyUser**: Submit evidence, accept versions, dispute milestones

## Development Roadmap

### Phase 1 (Current - MVP)
- [x] Core data model
- [x] Deal & contract management
- [x] Evidence ingestion via email
- [x] Manual custody workflow
- [x] AI suggestion framework (stubbed)
- [x] Blockchain anchoring
- [ ] Full admin UI
- [ ] Party portal UI

### Phase 2
- [ ] Production email provider integration
- [ ] Real AI model integration (Claude API)
- [ ] Advanced dispute resolution
- [ ] Reporting & analytics

### Phase 3
- [ ] Multi-currency support
- [ ] Integration with payment providers
- [ ] Mobile app
- [ ] Internal SLM training pipeline

## Security Considerations

1. **No automatic disbursement** - Admin gate for all releases
2. **Append-only audit log** - Every action recorded immutably
3. **Version control** - All contract changes tracked
4. **Evidence integrity** - SHA256 hashes + blockchain anchoring
5. **Role-based access control** - Strict permission boundaries

## License

Proprietary - All rights reserved
