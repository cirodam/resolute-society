# Audit Log Implementation Plan

Date: 2026-06-09
Status: Ready to execute
Scope: In-application audit/event log with first UI surface in Society Settings

## Goal

Introduce a durable, queryable audit log that records significant actions with actor, target, event type, timestamp, and structured metadata, starting with Society Settings actions.

## Why This Matters

1. Accountability: who changed what, and when.
2. Safety: supports incident investigation and rollback decisions.
3. Governance: provides traceability for society-level administrative actions.
4. Foundation: reusable event stream for future observability and compliance workflows.

## Phase 1 Scope (Settings-first)

In scope:
1. Database table for audit events.
2. Repository API to append and list events.
3. Event writes for settings update actions.
4. Audit Log section on Society Settings page showing recent entries.
5. Basic filters (event type and date window optional in this phase).

Out of scope for phase 1:
1. Full cross-application event coverage.
2. Export/download APIs.
3. Tamper-proof signatures.
4. Fine-grained RBAC partitioning beyond existing settings permissions.

## Event Contract

Each audit row should include:
1. id: unique event id.
2. society_id: owning society.
3. actor_person_id: authenticated person who initiated action (nullable for system actions).
4. actor_display: snapshot display name/handle for easier reading.
5. event_type: stable code (for example SETTINGS_SOCIETY_UPDATED).
6. target_type: resource type (for example society_config).
7. target_id: resource id.
8. summary: human-readable short sentence.
9. metadata_json: structured payload with changed fields and context.
10. occurred_at: event timestamp.
11. request_id: optional correlation id for future observability phases.

### Metadata Guidelines

1. Include changed fields only.
2. Avoid secrets (passwords/private keys/tokens).
3. Prefer before/after snapshots for key settings fields.
4. Keep payloads compact; avoid large blobs.

## Data Model (Proposed)

Table: audit_event

Columns:
1. id TEXT PRIMARY KEY
2. society_id TEXT NOT NULL REFERENCES society_config(id)
3. actor_person_id TEXT REFERENCES person(id)
4. actor_display TEXT
5. event_type TEXT NOT NULL
6. target_type TEXT NOT NULL
7. target_id TEXT NOT NULL
8. summary TEXT NOT NULL
9. metadata_json TEXT NOT NULL
10. request_id TEXT
11. occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
1. idx_audit_event_society_time (society_id, occurred_at DESC)
2. idx_audit_event_type_time (event_type, occurred_at DESC)
3. idx_audit_event_target (target_type, target_id, occurred_at DESC)

## Application Components

1. Migration/schema update
- File: src/lib/server/infra/schema.ts
- Add table and indexes with migration-safe guards.

2. Repository
- New file: src/lib/server/infra/repositories/audit-event.repository.ts
- Methods:
  - append(event)
  - listRecentBySociety(societyId, limit)
  - listByFilters(...)

3. Repository wiring
- File: src/lib/server/infra/repositories/index.ts
- Register repository in Repositories interface and createRepositories.

4. Settings route write-path
- File: src/routes/society/settings/+page.server.ts
- On successful settings update, append audit event including changed fields.

5. Settings route load-path
- File: src/routes/society/settings/+page.server.ts
- Return recent audit events for UI rendering.

6. Settings page UI
- File: src/routes/society/settings/+page.svelte
- Add Audit Log section showing:
  - timestamp
  - actor
  - summary
  - event type
  - optional metadata preview

## Initial Event Types (Phase 1)

1. SETTINGS_SOCIETY_UPDATED
2. SETTINGS_FEDERATION_IP_UPDATED
3. SETTINGS_LOCATION_UPDATED

Note: these may be emitted as one consolidated event or multiple specific events per save; choose one strategy and keep it consistent.

## UX Requirements

1. Most recent first.
2. Clear time format and actor attribution.
3. Empty state: no events recorded yet.
4. Metadata toggle (show details) for readability.

## Validation and Tests

Unit tests:
1. Repository append/list behaviors.
2. Metadata serialization and field constraints.

Route tests:
1. Successful settings update writes one audit event.
2. Failed validation does not write audit event.
3. UI load returns recent audit entries in descending time order.

Safety tests:
1. Ensure sensitive fields are not logged.
2. Ensure unknown actor (system path) is handled gracefully.

## Rollout Steps

1. Add schema and repository.
2. Integrate write path in settings action.
3. Integrate read path and UI section.
4. Add tests.
5. Verify in local stack and capture screenshots for docs.

## Acceptance Criteria

1. Settings updates create audit events with actor and changed field metadata.
2. Society Settings page displays recent audit entries.
3. Validation failures do not create audit entries.
4. Test suite and check pass.

## Future Expansion (Phase 2+)

1. Extend audit coverage to treasury, ledger close-day, permission changes, and profile updates.
2. Add server-side filtering and pagination APIs.
3. Add export (CSV/JSON) for governance reporting.
4. Attach request correlation ids after Phase 3 logging work.
5. Optional immutability hardening (append-only constraints and integrity checks).
