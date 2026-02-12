# UI → Backend Mapping

## Route Structure (Existing, No v0 Migration Needed)

| UI Route | Type | Backend APIs | Data Shape | Status |
|----------|------|--------------|------------|--------|
| `/` | Landing | None | Static | ✓ |
| `/deals` | List | `GET /api/deals?limit=100` | `{ deals: Deal[], pagination }` | Needs review |
| `/deals/new` | Create | `POST /api/deals` | `{ title, description, parties[] }` | Needs review |
| `/deals/[id]` | Detail | `GET /api/deals/{id}` | `Deal + contracts + milestones + evidence + custody + disputes` | Needs field fixes |
| `/admin` | Dashboard | `GET /api/deals?limit=100` (derive stats) | Stats derived from deals | ✓ |
| `/admin/deals` | Admin List | `GET /api/deals?limit=100` | `{ deals: Deal[] }` | Needs review |
| `/admin/deals/[id]` | Admin Detail | `GET /api/deals/{id}` | Full deal data | Needs field fixes |
| `/admin/evidence` | Evidence Queue | `GET /api/evidence/quarantined` | `EvidenceItem[]` | Needs wiring |
| `/admin/custody` | Custody Queue | `GET /api/custody/deal/{dealId}` | `CustodyRecord[]` | Needs wiring |
| `/portal` | User Dashboard | `GET /api/deals?limit=100` | User deals | ✓ |
| `/portal/deals/[id]` | Portal Detail | `GET /api/deals/{id}` | Deal data | Needs field fixes |
| `/portal/evidence` | Evidence List | `GET /api/evidence/deal/{dealId}` | `EvidenceItem[]` | Needs wiring |
| `/portal/evidence/submit` | Upload | `POST /api/evidence` | Form submission | Needs implementation |

## Entity Mapping

**"Deal" = Backend Deal entity**
- No "Order" terminology exists in codebase
- Deal encompasses: Contract, Milestones, Evidence, Custody, Disputes, Parties

## Field Mismatches to Fix

| UI Field | Backend Field | Location |
|----------|---------------|----------|
| `milestone.title` | `milestone.name` | All deal detail pages |
| `milestone.sequence` | `milestone.order` | All milestone displays |

## API Client Coverage (All Phase 2 endpoints present)

✓ dealsApi: list, getById, create, updateStatus, getAudit
✓ milestonesApi: complete (Phase 2)
✓ kycApi: complete (Phase 2)
✓ disputesApi: complete (Phase 2)
✓ quarantineApi: complete (Phase 2)
✓ evidenceApi: listByDeal, getById, review, requestMapping
✓ custodyApi: listByDeal, verify, authorize
✓ contractsApi: getById, getAcceptanceStatus
✓ blockchainApi: listByDeal, getById, verify
✓ usersApi: me

## Implementation Plan

**B) Routing**: Already unified - no changes needed
**C) API Wrappers**: Already complete - verified
**D) Data Binding**: Fix field mismatches in display components
**E) Actions**: Wire existing create/submit flows
**F) Rendering**: Add dynamic exports where needed
**G) Verification**: Create smoke test script
