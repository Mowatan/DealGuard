# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **digital escrow / conditional-settlement governance platform**. It does **not** move money automatically. It provides a structured, milestone-based process with human-verified evidence, an append-only audit trail, and (optionally) hash-only blockchain notarization. Core principles baked into the design:

- **No automatic disbursement** — every fund release/return requires explicit admin authorization. This is intentional; do not "automate" it.
- **AI suggests, humans decide** — AI proposals are always stored as suggestions pending admin accept/reject/modify.
- **Physical contract primacy** — the signed PDF is authoritative; the structured JSON ("digital twin") is operational only.

Read `fouad-ai/PROJECT_OVERVIEW.md` for the full data model, state machines, and authorization matrix before doing substantial work.

## Naming: dealguard vs fouad

The product was renamed **dealguard.ai → fouad.ai**, but the rename is incomplete. You will see both names everywhere and this is expected, not a bug:
- npm package names are still `dealguard-backend` / `dealguard-frontend`.
- Storage buckets and deal email inboxes use `fouad-` / `@fouad.ai`.
- In **development**, admin email / frontend URLs default to `dealguard.org` / `localhost`. In **production** these are **required** — `env-validator.ts` fails fast at boot if `FRONTEND_URL` or `ADMIN_EMAIL` is unset, so there is **no silent `dealguard.org` fallback in prod**.

Match the existing name in whatever file you're editing rather than mass-renaming.

## Repository layout

The actual application lives in **`fouad-ai/`**. The repo root is mostly `*.md` session/status reports and screenshots — these are historical notes, not authoritative; trust the code over them.

```
fouad-ai/
  backend/    Fastify + TypeScript + Prisma API (the bulk of the logic)
  frontend/   Next.js 16 (App Router) + React 19 + Tailwind + shadcn/ui + Clerk
  contracts/  Hardhat / Solidity (AnchorRegistry.sol) — blockchain anchoring
```

## Commands

**Package manager is npm** (each subproject has its own `package-lock.json`). The docs mention `pnpm`/`yarn` — ignore that; use `npm`.

Infrastructure (Postgres, Redis, MinIO) via Docker from `fouad-ai/`:
```bash
docker-compose up -d
```

Backend (`fouad-ai/backend/`):
```bash
npm install
npm run prisma:generate          # regenerate Prisma client (also runs on postinstall)
npm run prisma:migrate           # apply migrations in dev (prisma migrate dev)
npm run prisma:seed              # seed sample deal + test users
npm run dev                      # tsx watch on src/server.ts → http://localhost:4000
npm run build                    # tsc → dist/
npm test                         # jest
npm run test:watch
npm run test:coverage            # enforces 70% coverage threshold (see jest.config.js)
npm test -- path/to/file.test.ts # run a single test file
npm test -- -t "name of test"    # run tests matching a name
npm run prisma:studio            # browse the DB
```

Frontend (`fouad-ai/frontend/`):
```bash
npm install
npm run dev                      # http://localhost:3000
npm run build
npm run lint                     # next lint
```

Contracts (`fouad-ai/contracts/`):
```bash
npm run compile
npm test                         # hardhat test
npm run deploy:sepolia
```

Quick repo-wide sanity scan: `scripts/bug-check.sh` (validates the Prisma schema, greps for common mistakes).

## Backend architecture

Fastify server (`src/server.ts`) registers per-domain route modules under `/api/*`. The layering convention inside `src/modules/<domain>/`:

- `<domain>.routes.ts` — Fastify route definitions, attach `preHandler: [authenticate, authorize([...])]`.
- `<domain>.service.ts` — business logic / state-machine transitions.
- `__tests__/` — jest unit tests for the service (mock Prisma; see existing tests for the pattern).

Cross-cutting pieces:
- `src/repositories/` — a thin data-access layer (deal/milestone/party) used by some services. Not every module uses it; follow the conventions of the module you're editing.
- `src/lib/` — shared infra: `prisma.ts`, `storage.ts` (+ `storage/` fallback impl), `queue.ts` (BullMQ), `audit.ts`, `email.service.ts`, `authorization.ts` (resource-access checks), `env-validator.ts` (fails fast on missing required env at boot).
- `src/middleware/` — `auth.ts` (authentication), `authorize.ts` (RBAC + resource authorization), `error-handler.ts` (centralized; registered **after** all routes).

### Auth & RBAC (important)

- Frontend authenticates with **Clerk**; it sends the Clerk JWT as a Bearer token. The backend `authenticate` middleware verifies it via `@clerk/backend` and lazily creates a `User` row (default role `PARTY_USER`) on first sight.
- RBAC uses a role **hierarchy** (`ROLE_HIERARCHY` in `middleware/authorize.ts`), not exact-match. `authorize(['CASE_OFFICER'])` admits that role **and above**. The enum mixes new roles (`USER`, `ESCROW_OFFICER`, `SENIOR_ESCROW_OFFICER`, `SUPER_ADMIN`) with legacy aliases (`PARTY_USER`, `CASE_OFFICER`, `ADMIN`) — when adding a role, update the hierarchy map or comparisons silently break.
- Resource-level access (can this user touch *this* deal/milestone/evidence?) goes through `authorize*` helpers backed by `lib/authorization.ts`.
- **Test auth override**: in non-production with `ENABLE_CONTRACT_TEST_AUTH=true`, requests from localhost with no `Authorization` header may authenticate via `x-test-user-id` + `x-test-secret` (constant-time compared against `CONTRACT_TEST_SECRET`). Four hard gates make it inert in production. Used by the `contract:test` scripts for deterministic RBAC testing — don't weaken these gates.

### Background jobs, storage, integrations

- **BullMQ + Redis** (`lib/queue.ts`) for email processing, AI suggestions, and outbound email sending.
- **Storage** is S3-compatible **MinIO** with a **local-filesystem fallback** (`STORAGE_FALLBACK_ENABLED`, served via `GET /files/:bucket/:key` with a bucket whitelist). Buckets: `fouad-documents`, `fouad-evidence`.
- **Email**: inbound webhook (`/webhooks/email/inbound`) ingests evidence sent to `deal-{id}@fouad.ai`; outbound via Mailgun (`email.service.ts`, Handlebars templates).
- **AI**: `@anthropic-ai/sdk` (`ANTHROPIC_API_KEY`); suggestions are stored pending review.
- Required env is validated at startup by `env-validator.ts`; key vars include `DATABASE_URL`, `REDIS_URL`, `MINIO_*`, `CLERK_SECRET_KEY`/`CLERK_PUBLISHABLE_KEY`, `MAILGUN_*`, `ANTHROPIC_API_KEY`, `CORS_ORIGIN`/`FRONTEND_URL` (CORS is strict and **required** in production).

### Disabled / MVP-scoped features

Some things are intentionally turned off for the MVP and should stay off unless asked:
- **Blockchain routes are disabled** (commented out in `server.ts`; removed from the frontend) — the `contracts/` package and `blockchain` module still exist.
- `src/modules/approvals.disabled` / `approvals.disabled2` are superseded; the live one is `src/modules/approvals/` (hierarchical approval governance with spend limits).
- Milestones are auto-approved in the MVP flow (recent change) — check the milestone service before assuming a manual approval step exists.

## Frontend architecture

Next.js **App Router** under `fouad-ai/frontend/app/`, split by audience:
- `app/admin/*` — staff console (deals, custody, evidence, disputes, KYC, amendments, settings).
- `app/portal/*` — party-facing portal (their deals, evidence submission).
- `app/deals/*`, `app/invitations/[token]`, plus `sign-in`/`sign-up` (Clerk).

Route protection is in `middleware.ts` via Clerk `createRouteMatcher` (public vs protected vs admin). All backend calls go through `lib/api-client.ts`, which attaches the Clerk token (server components fetch it via `@clerk/nextjs/server`; **client components must pass the token from `useAuth()` explicitly**). Base URL comes from `NEXT_PUBLIC_API_URL`. UI is shadcn/ui (Radix) + Tailwind.

## Database

Single Prisma schema: `fouad-ai/backend/prisma/schema.prisma` (~39 tables). Core entities: `User`/`Organization`/`PartyMember`, `Deal`/`Party`, `Contract`/`ContractAcceptance`/`Milestone`/`Obligation`, `EvidenceItem`/`Attachment`, `CustodyRecord`, `Dispute`, `AISuggestion`, `AuditEvent`, `BlockchainAnchor`. After changing the schema, run `prisma:generate` (and `prisma:migrate` for a dev migration). When deleting records, respect FK order (delete referencing rows before referenced entities).

## Deployment

Backend deploys to **Railway** (`railway.json`/`railway.toml`); the `start` script runs `prisma migrate deploy` before booting. Docker images exist for backend/frontend (`docker-compose.yml` is dev infra + app). Frontend is intended for Vercel-style hosting.
