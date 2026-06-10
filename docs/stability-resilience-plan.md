# Stability, Resilience, and Code Quality Plan

Date: 2026-06-09
Owner: Resolute Society engineering
Status: Draft

## Purpose

This document defines a practical plan for improving code quality, runtime stability, resilience, and fault tolerance across the application.

The goal is to make the system predictable under load, safe under failure, and easier to operate over time.

## North Star Outcomes

1. Engineering quality gates are trustworthy and enforced.
2. Critical operations (auth, ledger, permissioned writes) are consistent and failure-safe.
3. External dependency failures degrade gracefully instead of cascading.
4. Deployments and recovery procedures are repeatable and validated.
5. Operational behavior is observable with actionable signals.

## Current Baseline

Known immediate issue:
- Type-check currently fails in tile API response body typing.

Known ongoing quality gaps:
- Existing warnings and diagnostics need triage and ownership.
- Reliability expectations are not yet formalized as service-level objectives.
- Fault handling patterns vary by route and subsystem.

## Guiding Principles

1. Prefer correctness and safety over feature velocity on critical paths.
2. Convert implicit behavior into explicit contracts and invariants.
3. Fail fast, fail clearly, and degrade predictably.
4. Make every important state transition testable.
5. Keep runbooks and rollback paths as first-class deliverables.

## Scope

In scope:
- Type and lint health
- Route and domain error handling consistency
- Ledger and permission-sensitive workflow hardening
- External call timeout/retry/fallback policy
- Observability baseline and operational readiness
- Backup, restore, migration, and rollback confidence

Out of scope for initial sprint:
- Broad architectural rewrites
- New feature domains unrelated to reliability
- Premature performance optimization without measurements

## Phase Plan

## Phase 0: Health Gate Recovery (Week 1)

Objectives:
- Restore trust in local and CI quality checks.

Work:
1. Fix current check failure in tile API response typing.
2. Triage all warnings into: fix now, suppress with rationale, or backlog with owner.
3. Enforce check and test pass as merge gate.

Acceptance criteria:
- Local check command passes cleanly or has explicitly approved exceptions.
- CI blocks merges when quality gates fail.

Phase 0 execution status (2026-06-09):
- Completed: fixed tile API type-check blocker in response body typing.
- Completed: added CI quality gate workflow to run `npm run check` and `npm test` on pull requests and pushes to `main`.
- Completed: addressed fix-now warnings (empty CSS ruleset and map label association).
- Current baseline: `npm run check` reports 0 errors and 3 warnings.

Warning triage (2026-06-09):
1. `src/routes/society/ledger/day/[date]/+page.svelte` (empty CSS ruleset)
   - Disposition: fixed
   - Owner: engineering
2. `src/routes/society/locations/+page.svelte` (state_referenced_locally)
   - Disposition: backlog
   - Owner: engineering
3. `src/routes/society/map/+page.svelte` (state_referenced_locally x2)
   - Disposition: backlog
   - Owner: engineering
4. `src/routes/society/map/+page.svelte` (a11y label association x2)
   - Disposition: fixed
   - Owner: engineering

## Phase 1: Critical Path Correctness (Week 1-2)

Detailed execution guide:
- `docs/phase-1-critical-path-correctness-plan.md`

Objectives:
- Harden money movement, auth checks, and permission-sensitive writes.

Work:
1. Identify top critical workflows and define invariants.
2. Add tests for idempotency, atomicity, and rollback behavior.
3. Standardize error responses for critical route actions.
4. Ensure transaction boundaries are explicit and documented.

Acceptance criteria:
- Critical workflows have deterministic behavior under retries and failures.
- Tests cover both happy paths and fault paths.

## Phase 2: Fault Boundaries and Degraded Modes (Week 2-3)

Objectives:
- Prevent external or subsystem failures from propagating system-wide.

Work:
1. Define timeout policy for all remote/external calls.
2. Add bounded retry strategy where safe.
3. Implement graceful fallback/degraded modes for non-critical dependencies.
4. Introduce standardized error wrappers for infrastructure-level failures.

Acceptance criteria:
- Each external integration has documented timeout/retry/fallback policy.
- User-facing failure messages are consistent and actionable.

## Phase 3: Observability and Operations (Week 3-4)

Objectives:
- Make production behavior measurable and diagnosable.

Work:
1. Add structured logs with request correlation IDs.
2. Define key service indicators:
   - request error rate
   - request latency
   - critical operation failure rate
3. Add health and readiness checks for deployment orchestration.
4. Separate business event logs from operational logs.

Acceptance criteria:
- On-call can trace request-to-error using IDs.
- Team has baseline dashboards or query playbooks for key indicators.

## Phase 4: Recovery and Change Safety (Week 4)

Objectives:
- Improve confidence in deployment, migration, and disaster recovery.

Work:
1. Validate backup schedule and restoration process for SQLite.
2. Run restore drill and record measured recovery time.
3. Define migration preflight checks and rollback procedures.
4. Publish release checklist and incident response runbook.

Acceptance criteria:
- Restore drill successfully reconstructs a usable environment.
- Rollback and migration steps are documented and tested.

## Workstreams

### A) Code Cleanup and Consistency

- Standardize error-handling patterns across routes.
- Remove dead code and unused abstractions.
- Improve naming consistency in server domain modules.

### B) Test Strategy

- Add deterministic tests for critical workflows.
- Add failure-injection tests for route/service boundaries.
- Add lightweight smoke tests for high-risk endpoints.

### C) Operational Readiness

- Log schema definition
- Health/readiness endpoints
- Incident template and postmortem format

## Reliability Contracts to Define

For each critical operation, document:
1. Preconditions
2. Side effects
3. Idempotency behavior
4. Failure modes
5. Retry safety
6. Audit/log expectations

## Risk Register (Initial)

1. Quality gate fatigue if many diagnostics are tackled at once.
   - Mitigation: fix by priority tier with ownership.
2. Hidden coupling in legacy route actions.
   - Mitigation: add tests before refactoring high-risk paths.
3. Drift between docs and implementation.
   - Mitigation: treat runbooks as release artifacts.

## Metrics and Targets

Initial targets:
1. Check and test pass rate on main: 100%
2. Critical-path automated test coverage: >= 80% of identified workflows
3. Mean time to identify root cause in incidents: reduce by 50%
4. Backup restore drill success: 100% by end of phase 4

## Governance and Cadence

Weekly reliability review:
1. Re-rank top risks
2. Track phase acceptance criteria
3. Close completed actions and assign next owners

Definition of done for reliability tasks:
1. Code change merged
2. Tests added or updated
3. Operational impact documented
4. Runbook/docs updated where applicable

## Immediate Next Actions

1. Fix current type-check blocker in tile API response typing.
2. Create a critical-path inventory (auth, ledger, permission writes).
3. Add first reliability tests for one money-moving workflow.
4. Add basic request correlation ID in logs.
5. Draft backup and restore drill checklist.

## Document Maintenance

This is a living plan.
Update this file at least once per week with:
- completed items
- changes in priorities
- newly discovered risks
- revised targets
