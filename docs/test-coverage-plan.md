# Test Coverage Plan

Tests that exist are marked ✓. Remaining gaps need a real database (integration tests) or further work.

---

## Economy — Inner Society

### Transactions (ledger writes)

- ✓ System transaction path rejects non-system source
- ✓ Repository transaction executor rolls back on failure
- ✓ Repository transaction executor commits on success
- ✓ Ledger amount validation (non-positive, non-finite)
- ✓ Balance guard (insufficient balance, exact-match passes)
- ✓ person → person transfer
- ✓ person → association transfer
- ✓ person → society (treasury) transfer
- ✓ association → person transfer
- ✓ association → association transfer
- ✓ association → society (treasury) transfer
- ✓ society → person transfer
- ✓ society → association transfer
- ✓ Transfer is conserved — sender loss equals receiver gain
- ✓ Insufficient balance rejected before any write
- ✓ Zero amount rejected before any write
- ✓ Negative amount rejected before any write
- ✓ System principal rejected via regular transfer path
- ✓ Exact-balance transfer accepted (boundary)
- ✓ Person demurrage burn (person → system)
- ✓ Association demurrage burn (association → system)
- ✓ Mint to society treasury (system → society)
- ✓ Mint to person (system → person)
- ✓ System mint rejects zero amount
- ✓ System mint rejects non-system fromType

Remaining gaps (require DB or disbursement-system integration):
- Payroll: correct per-member amount, skips members with no sortition number
- Allowance group: distributes to correct group members only, respects group amount
- Universal: distributes equal share to all admitted members

---

## Economy — Demurrage

- ✓ `calculateDemurrageAmount`: percent of positive balance
- ✓ `calculateDemurrageAmount`: flat capped at balance
- ✓ `calculateDemurrageAmount`: returns zero for zero balance or zero rate
- ✓ `planDemurrageDeductions`: all supported principal types receive deductions
- ✓ `planDemurrageDeductions`: skips zero and negative balances

Remaining gaps (require DB):
- Demurrage run applied to a multi-principal ledger produces correct net state
- Re-running demurrage on the same day is idempotent (or correctly rejected)

---

## Economy — Endowment & Supply

- ✓ `calculateAgeYears`: null, invalid, floor, edge cases
- ✓ `calculateEndowmentTarget`: null DOB returns 0, equals age × rate
- ✓ `calculateExpectedSupply`: empty list, null DOB treated as 0
- ✓ `planProportionalBurn`: no positive balances, zero target, cap at available, proportional split, rounding invariant

Remaining gaps (require DB):
- Endowment run mints correct shortfall amount to treasury
- Supply reconciliation does not double-mint on consecutive runs with no new members

---

## Economy — Addressing & Authorization

- ✓ `parsePrincipalAddress`: deterministic, treasury special-case, malformed rejected
- ✓ `parsePrincipalRef`: valid parse, all malformed patterns rejected
- ✓ `authorizeFromPrincipal`: unauthenticated, person mismatch, treasury without permission, treasury with permission, self-principal
- ✓ `isValidPositiveAmount`: positive, zero, negative, NaN, Infinity
- ✓ `resolveLocalEntity`: treasury keyword, person by handle, association by handle (person fallback), person preferred over association on handle collision, unknown returns null
- ✓ `resolveLocalEntityById`: treasury keyword, person in correct society, person in wrong society rejected, association in correct society, association in wrong society rejected, unknown returns null

---

## Economy — Policy Guards

- ✓ `requireSocietyTreasuryPermission`: propagates denied, passes when granted
- ✓ `requireFederationEconomyPermission`: propagates denied and uses correct societyId, passes when granted

---

## Federation

- ✓ Degraded mode — timeout, network, upstream failure semantics
- ✓ Principal-not-found detection (non-degraded zero condition)
- ✓ Federation queue retry delay schedule (exponential growth, cooldown cap)

Remaining gaps (require network/DB):
- Transfer signing produces deterministic canonical form
- Signature verification rejects tampered payload
- Queue drains in order; failed delivery does not advance the pointer

---

## Messages

Remaining gaps (require DB — all methods issue SQL):
- `findMessageRecipient`: resolves person handle, resolves association handle, null for unknown, person takes precedence over association on handle collision
- `sendMessage`: person → person (recipient_id set, recipient_association_id null)
- `sendMessage`: person → association (recipient_association_id set, recipient_id null)
- `sendMessage`: on behalf of association (sender_association_id set)
- `listInboxForAssociation`: only returns messages addressed to that association
- `listSentForAssociation`: only returns messages sent on behalf of that association
- `listInboxMessages` / `listSentMessages`: null recipient_id rows not included in person inbox

---

## Membership — Associations

Remaining gaps (require DB):
- `isMember`: returns true for member, false for non-member
- `addMember`: idempotent (ON CONFLICT DO NOTHING)
- `removeMember`: removes existing membership, no-ops on non-member
- Founding member handle that does not resolve is rejected before DB write
- Send credits from association: rejected for non-members, accepted for members
- Send message on behalf of association: rejected for non-members, accepted for members

---

## Audit Log

Remaining gaps (require DB):
- `audit()` with a real actor produces correct `actor_display` format (`Name (handle)`)
- `audit()` with null actor produces `"system"` as display
- `listBySociety`: returns events in descending time order
- Events within the same request share the same `request_id`

---

## Authentication & Permissions

Remaining gaps (require DB — `hasPermission` queries roles table):
- `hasPermission`: returns true when role grants the code, false otherwise
- `requirePermission`: throws 401 when unauthenticated, 403 when denied, passes when allowed
- Permission check uses the provided societyId, not the person's home society

---

## HTTP Layer

- ✓ `withCriticalAction`: normalizes validation failures, permission exceptions, unknown exceptions
- ✓ `failCritical`: preserves explicit code and category
- ✓ `external-fetch`: retry behaviour, timeout, network errors

---

## Scheduler

- ✓ `requiredRunAnchor`: returns today 08:00 after cutover, yesterday 08:00 before cutover, exact boundary (08:00:00), always zeroes seconds and ms

Remaining gaps (require DB — `isJobDue` / `acquireLease` use `db()` directly):
- Job is skipped when `last_success_at` is after the current anchor
- Job runs when `last_success_at` is before the current anchor
- Lease prevents concurrent runs (second runner sees occupied lock)
- Failed job records error and releases lock so next tick can retry

---

## Nutrition

- ✓ `resolveProfileIds`: sex-specific profile, female profile, any-sex fallback, sex=other with any-sex, sex=null with any-sex, male+female returned when no any-sex, empty for out-of-range age
- ✓ `accumulateRequirements`: single profile sums, population accumulation across calls, male+female averaging, empty profileIds no-ops, non-matching profiles ignored

Remaining gaps (require DB):
- `calculatePopulationRequirements`: sums members + dependants, rounds to integer
- `getPopulationDemographics`: correct counts per profile, excludes zero-count profiles

---

## Invariants (cross-cutting)

- ✓ Address parsing is deterministic and unambiguous
- ✓ Positive amount validation is consistent across the economy layer
- ✓ Demurrage deductions sum does not exceed total available balance at planning time
- ✓ Transfer conservation: sender loss equals receiver gain

Remaining:
- Total money supply is conserved across all non-mint/burn transactions (integration)
- Balance of any principal never goes below zero after any valid transaction sequence (integration)
