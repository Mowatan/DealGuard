# fouad.ai - Setup & Run Instructions

## Prerequisites

- **Docker** and **Docker Compose** installed
- **Node.js** 18+ and **pnpm** (or npm) installed
- (Optional) Ethereum wallet with testnet ETH for blockchain deployment

## Quick Start (Local Development)

### 1. Start Infrastructure Services

```bash
# From project root
docker-compose up -d

# Verify services are running
docker-compose ps

# Services:
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
# - MinIO: localhost:9000 (API), localhost:9001 (Console)
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Seed database with sample data
pnpm prisma:seed

# Start development server
pnpm dev
```

Backend will start on **http://localhost:4000**

### 3. Frontend Setup

```bash
# In a new terminal
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Frontend will start on **http://localhost:3000**

### 4. Deploy Blockchain Contract (Optional)

If you want to enable real blockchain anchoring:

```bash
cd contracts

# Install dependencies
pnpm install

# Option A: Deploy to local Hardhat network
# In terminal 1:
npx hardhat node

# In terminal 2:
pnpm deploy:local

# Option B: Deploy to Sepolia testnet
# 1. Get Sepolia ETH from faucet
# 2. Add your RPC URL and private key to backend/.env
pnpm deploy:sepolia

# Copy the deployed contract address to backend/.env:
# ANCHOR_CONTRACT_ADDRESS=0x...
```

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Health**: http://localhost:4000/health
- **MinIO Console**: http://localhost:9001 (admin/adminpassword)
- **Prisma Studio**: `cd backend && pnpm prisma:studio`

## Test Credentials

After running the seed script, you can log in with:

- **Admin**: admin@fouad.ai / admin123
- **Case Officer**: officer@fouad.ai / admin123
- **Buyer (Party)**: buyer@example.com / user123
- **Seller (Party)**: seller@example.com / user123

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL="postgresql://fouad:fouad_dev_pass@localhost:5432/fouad_ai"

# Redis
REDIS_URL="redis://localhost:6379"

# MinIO
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="admin"
MINIO_SECRET_KEY="adminpassword"

# Email (configure for production)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="noreply@fouad.ai"
SMTP_PASSWORD="your-smtp-password"
INBOUND_EMAIL_DOMAIN="fouad.ai"

# JWT
JWT_SECRET="your-secret-key-change-in-production"

# Blockchain (optional - will simulate if not configured)
ETHEREUM_RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_KEY"
ETHEREUM_PRIVATE_KEY="your-private-key"
ANCHOR_CONTRACT_ADDRESS="0x..."

# AI (for production)
ANTHROPIC_API_KEY="sk-ant-..."

# Server
PORT=4000
NODE_ENV="development"
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

## Core API Endpoints

### Deals
- `POST /api/deals` - Create deal
- `GET /api/deals` - List deals
- `GET /api/deals/:id` - Get deal details
- `PATCH /api/deals/:id/status` - Update status

### Contracts
- `POST /api/contracts` - Create contract version
- `POST /api/contracts/:id/document` - Upload physical contract
- `POST /api/contracts/:id/accept` - Party acceptance

### Evidence
- `POST /api/evidence` - Submit evidence (multipart)
- `GET /api/evidence/deal/:dealId` - List evidence
- `PATCH /api/evidence/:id/review` - Admin review

### Custody
- `POST /api/custody/funding` - Submit funding proof
- `POST /api/custody/:id/verify` - Admin verify funding
- `POST /api/custody/:id/authorize` - Authorize release/return
- `POST /api/custody/:id/disbursement` - Confirm disbursement

### Blockchain
- `GET /api/blockchain/deal/:dealId` - Get anchors for deal
- `GET /api/blockchain/:id/verify` - Verify anchor

### Webhooks
- `POST /webhooks/email/inbound` - Inbound email webhook

## Testing Email Ingestion

To test the email ingestion feature:

1. Send a POST request to the webhook endpoint with email data:

```bash
curl -X POST http://localhost:4000/webhooks/email/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "deal-sample-001@fouad.ai",
    "sender": "buyer@example.com",
    "subject": "Payment Receipt",
    "body-plain": "Please find attached proof of down payment",
    "attachments": "[]"
  }'
```

2. The system will:
   - Parse the email
   - Create an EvidenceItem
   - Store attachments in MinIO
   - Queue AI suggestion for milestone mapping

## Troubleshooting

### Database Connection Issues

```bash
# Restart PostgreSQL container
docker-compose restart postgres

# Check logs
docker-compose logs postgres

# Reset database (WARNING: deletes all data)
cd backend
pnpm prisma migrate reset
```

### Redis Connection Issues

```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping
# Should respond: PONG
```

### MinIO Access Issues

```bash
# Check MinIO is running
docker-compose ps minio

# Access console at http://localhost:9001
# Login: admin / adminpassword
# Verify buckets exist: fouad-documents, fouad-evidence
```

### Port Conflicts

If ports are already in use:

```bash
# Check what's using the port
lsof -i :4000  # Backend
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :9000  # MinIO

# Either stop the conflicting service or change ports in:
# - docker-compose.yml
# - backend/.env
# - frontend/.env.local
```

## Development Workflow

### 1. Database Changes

```bash
cd backend

# Edit schema in prisma/schema.prisma

# Create migration
pnpm prisma migrate dev --name your_migration_name

# Generate Prisma client
pnpm prisma:generate
```

### 2. API Changes

- Edit routes in `src/modules/*/routes.ts`
- Edit services in `src/modules/*/service.ts`
- Test using curl or Postman

### 3. Frontend Changes

- Edit pages in `app/**/*.tsx`
- Components in `components/**/*.tsx`
- Hot reload is automatic

## Production Deployment Checklist

- [ ] Change all default passwords and secrets
- [ ] Configure real SMTP provider (Mailgun/SendGrid)
- [ ] Set up inbound email routing
- [ ] Deploy blockchain contract to mainnet
- [ ] Configure S3 or production-grade object storage
- [ ] Set up database backups
- [ ] Enable SSL/TLS certificates
- [ ] Configure rate limiting and DDoS protection
- [ ] Set up monitoring and logging (e.g., Sentry, DataDog)
- [ ] Configure Claude API for AI suggestions
- [ ] Implement proper authentication middleware
- [ ] Set up CI/CD pipeline

## Architecture Decisions

### Why Manual Fund Movement?
- Legal compliance: automated transfers require financial licenses
- Risk mitigation: human verification reduces fraud
- Flexibility: works with any payment method (cash, crypto, etc.)

### Why Email for Evidence?
- Natural user behavior: people already email documents
- Low friction: no new tools to learn
- Audit trail: email headers provide metadata

### Why Hash-Only Blockchain?
- Privacy: no PII on public blockchain
- Cost: minimal gas fees vs storing data
- Purpose: notarization, not enforcement

### Why AI Suggests, Human Decides?
- Accuracy: AI can make mistakes
- Liability: humans accountable for decisions
- Training data: human edits improve future models

## Next Steps

1. Implement full authentication/authorization middleware
2. Add real-time notifications (WebSockets)
3. Build admin dashboard for case management
4. Integrate real Claude API for AI suggestions
5. Add document preview capabilities
6. Implement advanced dispute resolution workflow
7. Add analytics and reporting
8. Mobile app development

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review API responses in browser DevTools
- Examine database with `pnpm prisma:studio`

## License

Proprietary - All rights reserved
