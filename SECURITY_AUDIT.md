# Security Audit — Fouad / dealguard backend

**Date:** 2026-06-07
**Scope:** `fouad-ai/backend` (Fastify + Prisma API) and `fouad-ai/frontend` (Next.js), four surfaces: auth & access control, business logic, injection & input, secrets & config.
**Method:** Static code review using web-application pentest methodology (OWASP WSTG–style), every high-severity claim verified against source, then the top findings reproduced at runtime against a locally-run instance using the in-repo `ENABLE_CONTRACT_TEST_AUTH` harness.
**Authorization:** Performed at the request of the repository owner against a local instance only.

---

## Executive summary

The audit found **one systemic, high-impact issue**: broken access control (IDOR) across several resource routes. Multiple endpoints attached only `[authenticate]` and called service functions that received no `userId`, so nothing scoped queries to the caller. Any authenticated party user could read or mutate data on deals they had no relationship to — including another party's KYC PII / document URLs, disputes, approval requests, and the deal progress state machine.

This was **confirmed at runtime**, not just inferred from code: an "outsider" user with no membership on the target deal received `200 OK` on these endpoints, while control requests (wrong / missing test secret) returned `401`, proving authentication itself was working and the gap was authorization.

All identified IDORs have been **fixed and re-verified** (see Remediation). A handful of lower-severity items remain as follow-ups. Notably, **no secrets were ever committed to git** — the real keys exist only in local, git-ignored `.env` files.

| Severity | Count | Status |
|----------|-------|--------|
| High | 4 | Fixed |
| Medium | 2 | Fixed |
| Low | 4 | Open (follow-up) |

---

## Confirmed findings

### Broken access control / IDOR (systemic) — HIGH

Root cause: routes guarded only by `[authenticate]` (proves identity) with no resource-ownership check (proves authorization), and service functions that took no `userId` and therefore could not scope the query.

| ID | Severity | Endpoint | File | Impact |
|----|----------|----------|------|--------|
| IDOR-1 | High | `GET /api/kyc/parties/:partyId` and `…/documents` | `modules/kyc/kyc.routes.ts:64-94` | Any authenticated user reads any party's KYC status and presigned **ID-document URLs** (PII). |
| IDOR-2 | High | `GET /api/disputes/:id`, `GET /api/disputes/deal/:dealId` | `modules/disputes/disputes.routes.ts:46-76` | Read any dispute / all disputes for any deal. |
| IDOR-3 | High | `GET /api/approvals/:id` | `modules/approvals/approval.routes.ts:35-58` | Read any approval request — amounts, officer decisions, full audit log. |
| IDOR-4 | High | `POST …/progress/initialize`, `/advance`, `PATCH …/:stageKey`, `GET /progress/stages/:stageKey/deals` | `modules/progress/progress.routes.ts:10-82` | Drive **any** deal's progress state machine (write) and enumerate all deals per stage. |
| IDOR-5 | Medium | `GET /custody-documents/deal/:dealId` | `modules/custody-documents/custody-documents.routes.ts:171` | List any deal's custody documents. |

### Audit / non-repudiation — MEDIUM

| ID | Severity | Location | Impact |
|----|----------|----------|--------|
| AUDIT-1 | Medium | `modules/custody/custody.routes.ts:61,75` | `verifiedBy` / `authorizedBy` were taken from the **request body** instead of `request.user.id`. Routes are `requireAdmin`-gated (so not privilege escalation), but one admin could attribute a fund-verification / release-authorization to a *different* officer, undermining the append-only audit trail central to the product. |

### Runtime reproduction (before fix)

Harness: `ENABLE_CONTRACT_TEST_AUTH=true`, localhost, `x-test-user-id` + `x-test-secret`. Actor = `outsider@example.com` (PARTY_USER, **not** a member of the seeded deal).

```
CONTROL  outsider id + WRONG secret  -> GET /api/kyc/parties/{buyerParty}      401   (auth enforced)
CONTROL  no auth headers             -> GET /api/kyc/parties/{buyerParty}      401   (auth enforced)
IDOR-1   outsider + valid secret     -> GET /api/kyc/parties/{buyerParty}      200   {"name":"Ahmed Hassan","contactEmail":"buyer@example.com","kycStatus":...}
IDOR-1   outsider                    -> GET /api/kyc/parties/{buyerParty}/documents  200
IDOR-2   outsider                    -> GET /api/disputes/deal/{deal}          200
IDOR-4   outsider                    -> POST /api/deals/{deal}/progress/initialize   200   (persisted 8 DealProgressEvent rows on a stranger's deal)
```

The `401` controls are the proof: authentication was on, so the `200`s were genuine missing authorization, not unauthenticated endpoints.

---

## Remediation (implemented)

Branch `security/fix-idor-resource-routes`, PR #2 (base `master`), commit `80315d7` — 8 files, +131/-8.

- Added resolver helpers to `lib/authorization.ts`: `canUserAccessParty`, `canUserAccessDispute`, `canUserAccessApproval` (each resolves the owning `dealId` and delegates to the existing `canUserAccessDeal`, which already permits staff + deal creator + party members).
- Guarded the flagged kyc / disputes / approvals / custody-documents routes and the progress service (`initialize`/`advance`/`update`) with resource-ownership checks returning **403**.
- Restricted cross-deal stage enumeration (`GET /progress/stages/:stageKey/deals`) to `CASE_OFFICER`+.
- Changed custody `verifiedBy`/`authorizedBy` to `request.user.id`.

### Runtime re-verification (after fix)

| Endpoint | Outsider before → after | Legit party | Staff |
|----------|------------------------|-------------|-------|
| KYC party read | 200 → **403** | 200 | — |
| KYC documents | 200 → **403** | 200 | — |
| Disputes list | 200 → **403** | 200 | — |
| Progress write | 200 → **403** | 200 | — |
| Stage enumeration | (party) **403** | — | officer 200 |

Typecheck clean on edited files; 25/25 `authorization.test.ts` pass.

---

## Open follow-ups (lower severity, deferred)

| ID | Severity | Item | Location |
|----|----------|------|----------|
| HARDEN-1 | Low/Med | No `@fastify/helmet` — missing HSTS / X-Content-Type-Options / X-Frame-Options / CSP | `server.ts` |
| HARDEN-2 | Low | CORS origin callback allows `'*'` if `CORS_ORIGIN` is ever set to it, with `credentials:true` — no guardrail | `server.ts:81-106` |
| HARDEN-3 | Low | Funding amount is `z.number().positive()` with no upper bound | `modules/custody/custody.routes.ts:9` |
| SECRET-1 | Low | Local `.env`/`.env.local` hold a real `sk_test_` Clerk key + Mailgun key; Clerk secret present in frontend env files. **Never committed to git** — rotation is precautionary. `.env.backup` deleted. | local files only |

---

## Verified false positives (rejected during the audit)

Subagent reconnaissance over-reported four items; each was checked against source and **rejected** with the reason below. Recorded here so they are not re-raised.

| Claimed finding | Claimed severity | Verdict | Why rejected |
|-----------------|------------------|---------|--------------|
| "Committed secrets in repository" | Critical | **False** | `.env` / `.env.local` / `.env.backup` are git-ignored (`fouad-ai/.gitignore`, repo-root `.gitignore`); only `*.env.example` are tracked. `git log --all --full-history` shows the real `.env` files and `.env.backup` were **never** committed in any branch. The keys exist only on the local disk. |
| "Any authenticated user can authorize a fund release" | Critical | **False** | The `/:id/verify` and `/:id/authorize` routes carry `preHandler: [authenticate, requireAdmin]`, and the service re-checks `isAdmin(verifiedBy)` / `isAdminOrCaseOfficer(authorizedBy)`. A non-admin cannot reach the action. The real (lesser) issue is body-supplied actor attribution — captured as AUDIT-1. |
| "HIGH stored XSS in evidence review emails" | High | **False** | `reviewNotes` is interpolated into a pre-built HTML fragment, but the template renders it via double-brace `{{reviewNotesSection}}` and `Handlebars.compile(templateSource)` is called with **no options** (default `noEscape:false`), so Handlebars HTML-escapes the value. Injection is neutralized; the only effect is a cosmetic bug (the boxes render as literal text). `email.service.ts:111`, `templates/emails/evidence-reviewed.html:82`. |
| "Milestone auto-approval violates the no-automatic-disbursement invariant" | Critical | **False** | `CLAUDE.md` documents that milestones are intentionally auto-approved in the MVP flow. Auto-approval is a deliberate product decision, not a control gap; it also does not itself release funds (disbursement remains a separate, admin-only, manual step). |

---

## Controls confirmed working (not vulnerabilities)

Clerk JWT verification via `@clerk/backend`; the 4-gate `ENABLE_CONTRACT_TEST_AUTH` override with constant-time secret compare (inert in production); Mailgun webhook HMAC verification with a 15-minute replay window and constant-time compare; file-serving bucket whitelist + path-traversal guard; Prisma parameterization (only one raw query, a `SELECT 1` health check); `env-validator.ts` fail-fast on missing prod env; rate limiting (global + tighter webhook limit); production error handler hides stack traces.
