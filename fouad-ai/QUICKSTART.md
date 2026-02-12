# fouad.ai - Quick Start Guide

Get the system running in under 5 minutes.

## Prerequisites

- Docker & Docker Compose
- Node.js 18+
- pnpm (or npm)

## 1. Start Infrastructure (30 seconds)

```bash
cd fouad-ai
docker-compose up -d
```

This starts PostgreSQL, Redis, and MinIO.

## 2. Backend Setup (2 minutes)

```bash
cd backend
pnpm install
cp .env.example .env
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

Backend runs on http://localhost:4000

## 3. Frontend Setup (1 minute)

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend runs on http://localhost:3000

## 4. Verify Setup

Visit http://localhost:3000 - you should see the fouad.ai homepage.

Click "View Deals" to see the seeded sample deal.

## Test Credentials

- **Admin**: admin@fouad.ai / admin123
- **Case Officer**: officer@fouad.ai / admin123  
- **Buyer**: buyer@example.com / user123
- **Seller**: seller@example.com / user123

## API Test

```bash
# Health check
curl http://localhost:4000/health

# List deals
curl http://localhost:4000/api/deals

# Get sample deal
curl http://localhost:4000/api/deals/{DEAL_ID}
```

## What's Included

✅ Complete backend API (Fastify + Prisma + PostgreSQL)  
✅ Frontend UI (Next.js + Tailwind + shadcn/ui)  
✅ Sample deal with parties, contract, and milestones  
✅ Evidence ingestion system  
✅ Custody workflow  
✅ Blockchain anchoring (stubbed)  
✅ AI suggestions (stubbed)  
✅ Queue workers (BullMQ + Redis)  
✅ Object storage (MinIO)

## Common Issues

**Port already in use**: Change ports in `docker-compose.yml` and `.env` files

**Database connection failed**: Run `docker-compose restart postgres`

**MinIO not accessible**: Check http://localhost:9001 (admin/adminpassword)

## Next Steps

1. Read `PROJECT_OVERVIEW.md` for architecture details
2. Read `SETUP.md` for comprehensive setup guide
3. Explore the API endpoints
4. Deploy smart contract: `cd contracts && pnpm deploy:sepolia`
5. Integrate real email provider (Mailgun/SendGrid)
6. Integrate Claude API for AI suggestions

## Project Structure

```
backend/
  ├── src/modules/deals/        # Deal management
  ├── src/modules/contracts/    # Contract versioning
  ├── src/modules/evidence/     # Evidence + email
  ├── src/modules/custody/      # Funding workflow
  ├── src/modules/blockchain/   # Anchoring
  └── src/modules/ai/           # AI suggestions

frontend/
  ├── app/page.tsx              # Homepage
  ├── app/deals/page.tsx        # Deals list
  └── app/deals/[id]/page.tsx   # Deal detail

contracts/
  └── AnchorRegistry.sol        # Smart contract
```

## Key Workflows

### Create a Deal
1. POST `/api/deals` with title, description, parties
2. System generates unique email (deal-{id}@fouad.ai)
3. Creates Draft deal

### Add Contract
1. POST `/api/contracts` with terms and milestones
2. Upload PDF: POST `/api/contracts/:id/document`
3. Parties accept: POST `/api/contracts/:id/accept`
4. When all accept → blockchain anchor

### Submit Evidence
1. Email to deal-{id}@fouad.ai OR POST `/api/evidence`
2. System stores in MinIO, creates EvidenceItem
3. AI suggests milestone mapping
4. Admin reviews and accepts

### Release Funds
1. Payer: POST `/api/custody/funding` with proof
2. Admin: POST `/api/custody/:id/verify`
3. Milestone complete → Admin: POST `/api/custody/:id/authorize`
4. Payee: POST `/api/custody/:id/disbursement` with proof
5. Blockchain anchor confirmation

## Support

For detailed documentation, see:
- `README.md` - Overview
- `PROJECT_OVERVIEW.md` - Architecture & data model
- `SETUP.md` - Comprehensive setup guide

Happy building! 🚀
