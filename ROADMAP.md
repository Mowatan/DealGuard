# DealGuard — Roadmap & Standing Context

> **Purpose of this file:** persistent context for Claude Code. Read it at the
> start of every session. It holds the whole arc so the agent makes
> locally-correct choices, but each session acts inside **one phase only**.

---

## What DealGuard is

A multi-party escrow and governance platform for complex B2B / B2C / C2C
transactions, focused on Egypt and the MENA region. It exists so parties who
don't fully trust each other can transact anyway: money sits somewhere safe,
terms are agreed explicitly and on the record, and value releases only when the
**required parties** agree the condition was met. The promise: *neither of us
can get burned.*

**"Seamless" has a specific meaning here:** not visual polish — it's that the
scary moments (depositing real money, agreeing what "done" means, handling
disputes) stop feeling scary. Everything serves that.

### Hard constraints / inherited principles
- **N-party with roles** (buyer, seller, broker/agent, co-signer). Two-party is
  a case, not the constraint.
- **No automatic disbursement.** The system may clear or hold; it never moves
  money or creates agreement on its own.
- **AI suggests, humans decide.** Pre-agreed rules over autonomous action.
- **Physical-contract primacy** and a complete audit trail.
- **Build against state-only holds** so Phase 2 isn't gated on Phase 3.

### The seven capabilities
1. **Identity** — who am I dealing with (KYC/verification)
2. **Deal structure** — what we're agreeing to
3. **Fund custody** — where money safely sits
4. **Negotiation** — how parties agree on terms and milestones
5. **Release / settlement** — money moves on conditions met
6. **Dispute & governance** — the safety net + admin oversight
7. **Seamlessness layer** — status, notifications, onboarding over all of it

### Open question that defines the center of gravity
Does real money move through the system today, or is it tracking deal state
while funds settle out-of-band? **Assumed: state-tracking**, with real custody
as a deliberate later gate (Phase 3).

---

## Build sequence

| Phase | Goal | Done when |
|---|---|---|
| **0 — Stabilize** | Finish in-flight bug remediation: green build, Clerk import fixed, defunct blockchain gracefully degraded, hardcoded admin URLs fixed, null-safety across services | Clean build, app boots without placeholder-key failures, deploys reliably on Railway |
| **1 — Core deal lifecycle** | Create deal, invite counterparties, define milestones, drive open->settled with auto-approval still standing in | A deal can be created and driven to completion by test accounts without manual DB surgery |
| **2 — Milestone negotiation** | Replace auto-approval with real multi-party agreement (full spec below) | Required parties reach a locked, mutually-agreed milestone; auto-approval survives only as explicit opt-out |
| **3 — Real fund custody** | Payment rails (Paymob/Fawry/Kashier) + legal escrow wrapper. Regulated, hard, the moat | Funds genuinely deposit, hold against locked milestones, release on agreement |
| **4 — Identity & compliance** | KYC/verification + audit trails; gates real money | Parties verifiable to rail/regulator standard; every state change auditable |
| **5 — Dispute & governance** | Admin adjudication, evidence, freeze/split/release | A contested milestone has a defined, admin-mediated resolution path that can't lose or double-spend funds |
| **6 — Seamlessness & hardening** | Design polish, a11y/UX audits, security passes, e2e, real beta users | A stranger completes a real deal unaided; you'd trust it with your own money |

---

## LOCKED — Phase 2 milestone negotiation (full agreed spec)

### Data model
- **New `MilestoneProposal`** — { milestoneId, proposedByPartyId, supersedesId?,
  amount, deadline, deliverable (term snapshot), status:
  STANDING | SUPERSEDED | ACCEPTED | WITHDRAWN, expiresAt? }. Acceptance is a
  **child of the proposal**.
- **New `MilestoneProposalAcceptance`** — { proposalId, partyId, acceptedAt },
  `@@unique([proposalId, partyId])`. Supersession => acceptances reset for free.
- **New `MilestoneLock`** — append-only **immutable** record of agreed terms,
  written on lock. `supersedesId` nullable (null in Phase 2, wired Phase 5).
  Allocation amount derives from THIS, not the live milestone/proposal.
- **New `MilestoneAllocation`** — per-milestone hold ledger: { milestoneId
  (unique), payerPartyId, receiverPartyId, amount, currency, fundingState:
  UNFUNDED | BACKED, status: HELD | RELEASED | RETURNED | SPLIT | FROZEN,
  custodyRecordId? }.
- **Modified `Milestone`** — add `requiredPartyIds String[]`.
- **Dropped `MilestonePartyResponse`** — clean replace (pending confirmation no
  live negotiation rows on non-test deals; run a row count before the migration).

Because acceptance is a child of the proposal, supersession, competing counters,
and acceptance-reset all fall out of the model instead of being maintained logic.

### Required-party set (lock predicate)
`requiredPartyIds` defaults to `unique(payer, receiver, deliverer)`, overridable
at creation. **Lock predicate:** every party in `requiredPartyIds` has a standing
acceptance on the current standing proposal. **Guards:** subset of deal parties;
must include payer + receiver; reject creation if empty; MVP requires a money leg
so it's never empty by construction. A broker/agent is "required" iff in the set,
else read-only like admin — no separate broker concept.

### Authoring & roles
**Designated structurer** (deal-level, role-agnostic, defaults to creator) authors
milestones and sets/edits `requiredPartyIds` (before lock only; audit-logged;
every change visible). Not a trust hole — allocates only among already-consented
deal members, payer+receiver guard-protected; "consent to change the consent set"
deferred post-MVP. **Terms** (propose/counter) open to any required party.
**Admin/officer observe only** — never author/edit terms. Editing
`requiredPartyIds` does **not** reset acceptances (milestone field, not a term);
the predicate re-evaluates; an unhappy party counters.

### Proposal / counter / supersession + concurrency
Counter = new proposal superseding the standing one (P -> B -> C, last-write-wins).
**Linear supersession, DB-enforced:** partial unique index (one STANDING per
milestone); supersede = read-current-standing + create-pointing-at-it in one
transaction; a racing counter fails the constraint, retries against the
now-standing one. UI surfaces "standing proposal changed while you were drafting."

### Lock (atomic, one transaction)
proposal -> ACCEPTED, milestone -> LOCKED, write immutable `MilestoneLock`,
`custodyPort.allocateHold(...)` creates `MilestoneAllocation{ UNFUNDED, HELD }`.
All-or-nothing. **Lock allocates; never releases.**

### Custody seam (Phase 2 -> 3)
**`CustodyPort` interface** (allocateHold / releaseHold / returnHold / splitHold /
freeze / unfreeze / getDealBalance). Phase 2 = `StateOnlyCustodyAdapter`; Phase 3 =
`RealCustodyAdapter` (rails + deal-level CustodyRecord). **Enforced boundaries:**
- `allocateHold` returns void/opaque — lock can't branch on funds.
- CI import rule: negotiation imports `CustodyPort` ONLY — never CustodyRecord, a
  rail, or MilestoneAllocation directly.
- `allocateHold` runs **inside** the lock txn (atomicity test: kill mid-lock =>
  no LOCKED milestone without its HELD allocation).
- Funding-order policy (lock-then-fund vs fund-then-lock) lives ONLY in the
  Phase 3 adapter via `fundingState`. Never in the lock path.

### Immutability & dispute seam (Phase 2 <-> 5)
LOCKED is **non-terminal**; exits are privileged only: LOCKED -> DISPUTED (freeze)
+ admin-authorized RELEASED/RETURNED/SPLIT, always audit-logged, never
auto/negotiation-driven. Post-lock renegotiation = **milestone-level supersession**
(new `MilestoneLock` via `supersedesId`), NOT DealAmendment's vote-model
(reconciled/retired post-MVP). **Enforced now:** negative tests proving no
negotiation/party endpoint can drive a milestone out of LOCKED or move an
allocation to FROZEN/RELEASED/RETURNED/SPLIT (ops ship caller-less + tested);
post-lock negotiation block is **service guard AND DB guard** (DB refuses a new
STANDING proposal when milestone.status in {LOCKED, DISPUTED, COMPLETED}).

### Stale / timeout handling
`expiresAt` is **opt-in** proposal state; null = stands until superseded (no
system-default expiry — a default would inject policy into human agreements and
risk silent-lapse surprise). **Never auto-accept.** Enforce expiry
**in-transaction, not via scheduler:** the accept endpoint and lock predicate
validate `expiresAt > now` in the same transaction, so the safety guarantee never
depends on a sweep having run. `status -> WITHDRAWN` is cosmetic cleanup (lazy /
deferred sweep) — Phase 2 needs no background-job runner. Expiry notifies required
parties + structurer (never admin authoring). No-expiry stalls surface in the
structurer's view; **no auto-cancel** (cancellation is a consented act).
Expiring a proposal with partial acceptances discards them (correct) — provide a
one-click "re-offer identical terms". Negotiation `expiresAt` is distinct from the
milestone's **performance deadline**; never conflate them.

### State distinction
The new **LOCKED** state ends the *terms* lifecycle — distinct from
APPROVED/COMPLETED (the *completion* lifecycle). Legacy two-party
MilestoneApprovalRequirement / MilestoneApproval (completion gate) noted for
N-party rework later, out of Phase 2 scope.

### Money-leg boundary
Every MVP milestone has payer + receiver + amount > 0. Asset transfers =
performance trigger + evidence requirement on a money milestone (first-class).
Non-gating items = Obligations. Money-less PERFORMANCE milestones expressible but
rejected at creation. Deal-level: pure-barter (zero-cash) deals out of MVP;
mixed-consideration in (matches the founder's flagship $100M+ cash+RE exit).

---

## Still open (genuine deferrals, decided in their phase)
- **Migration safety** — row count on `MilestonePartyResponse` for non-test deals
  before the destructive drop.
- **Allocation currency vs rail settlement currency** (Phase 3) — reconciliation
  Sigma BACKED <= verified balance is currency-scoped; define the FX basis then.
- **Pure-barter / non-monetary value exchange** — Phase 3+ custody-model expansion
  (holding/verifying assets), not a milestone tweak.
- **DealAmendment retirement** — reconcile/retire the legacy vote-model post-MVP.
- **"Consent to change the consent set"** — full governance over requiredPartyIds
  edits, post-MVP.
- **Structurer transferability** — defaults to creator; assignable for broker-led
  M&A? Confirm.
- **Redis-TLS (ELEVATED)** — PII (party emails/names) + money-adjacent data
  (milestone amounts) flow through BullMQ on cleartext `redis://` today
  (`lib/queue.ts`). Hard gate **before any beta with real personal data and
  before Phase 3 real money**: switch the Railway Redis link to `rediss://`.
- **npm audit: 9 vulns** (1 moderate, 6 high, 2 critical) in the frontend
  eslint dev-toolchain (added Phase 0). Phase 6 hardening. Currently dev-only —
  **re-check that claim** if any of those packages ever move to a build/runtime
  path.

---

## Skill deployment

**Ambient (every session)**
- **Karpathy's Guidelines** — engineering constitution; always on.
- **code-simplifier** — readability pass at the end of each work chunk.
- **Context Mode** — filter shell noise, restore state on reset.
- **Handoff** — end each session by compressing state back into this doc.
- **Caveman** — ON during execution-heavy coding; OFF during alignment/Grill Me
  sessions where the reasoning is the point.

**By phase**
- **0 Stabilize:** Trail of Bits (baseline scan), Webapp Testing / Playwright.
- **1 Lifecycle:** Superpowers (earns its place now), Playwright e2e on open->settled.
- **2 Negotiation:** Frontend Design + Vercel Composition Patterns (proposal
  thread + role-contextual action bar) + Vercel React Best Practices + Grill Me
  (live) + Playwright.
- **3 Custody:** Trail of Bits (mandatory before real money), Document Skills.
- **4 Identity/compliance:** Firecrawl (KYC + CBE/FRA research), Document Skills.
- **5 Disputes:** Document Skills (evidence packets, PDF dispute records).
- **6 Hardening:** Vercel Web Design Guidelines (a11y/UX audit), Frontend Design
  polish, full Trail of Bits pass, full Playwright suite, React perf sweep.

**Cross-cutting**
- **Document Skills** also covers pitch deck / investor materials (with pptxgenjs).
- **Skill Creator** — codify these Grill Me rulings into a DealGuard-specific
  skill so the agent re-applies your decisions automatically.

**Holstered / not forced**
- **Remotion** — no role in the escrow build; park for a marketing demo if ever.
- **Superpowers in Phase 0** — its subagent/TDD orchestration reintroduces the
  scope-bloat that burned the blockchain-crash fix. Hold until Phase 1.

---

## Using this with Claude Code
1. Keep this file at the repo root; point the agent at it at session start.
2. Each session, name the **single phase** in scope and frame it "this phase, not
   the next."
3. End each session with the **Handoff** skill -> update the relevant sections here.
