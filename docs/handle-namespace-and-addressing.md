# Handle Namespace And Addressing

## Handle Namespace Policy

Society handles and compact handles share one global namespace.

Rules:
- A society handle must not match any compact handle.
- A compact handle must not match any society handle.
- Violations abort writes at the database level.

Enforcement:
- Migration [002_handle_namespace_guards.sql](../src/lib/server/migrations/002_handle_namespace_guards.sql) creates cross-entity triggers.
- Runtime migration verification in [schema.ts](../src/lib/server/schema.ts) asserts those required triggers exist.

## Principal Address Formats

Federation economy disbursements support these address forms:

1. Treasury address:
- Format: treasury@<outer-handle>
- Example: treasury@test-society
- Example: treasury@great-lakes-compact
- Example: treasury@federation-service-handle

2. Member address:
- Format: <principal-handle>@<society-handle>
- Example: alice@test-society
- Works for people and associations.

3. Federation endpoint address:
- Format: mail@<outer-handle>
- Example: mail@great-lakes-compact
- Example: mail@federation-service-handle

4. Society-local shorthand (non-federation context only):
- Format: <principal-handle>
- Example: alice
- Only valid when the caller already supplies a specific society context.

Resolution logic lives in [addressing.ts](../src/lib/server/economy/addressing.ts).

## Notes

- Address parsing is strict and rejects malformed values.
- Treasury is a reserved local part for treasury routing.
- Federation-level resolution requires qualified inner@outer addresses.
- Federation-scope principals (compacts and federation services) appear only on the outer side.
- Handle uniqueness checks and address resolution are separate concerns:
  - Namespace enforcement happens in SQLite triggers.
  - Address resolution happens in server-side economy helpers.
