# Addressing

This document defines canonical address forms, deterministic resolution rules, and the split between mutable handles and immutable UUID identifiers.

## Core Model

- Society principal = person or association that exists inside one society.
- Federation principal = principal that exists at federation scope (for example compact or federation service).
- Every principal has:
	- immutable UUID (permanent identity)
	- mutable handle (human-readable routing alias)
- Society handle has a dual role:
	- federation-level principal identity for that society
	- namespace/container key for society principals when used on the right side of `@`
- Address delimiter = `@`.

Interpretation:

- Left side of `@` = local principal handle.
- Right side of `@` = society handle.

Position determines meaning:

- In `local@society`, `society` is the container/namespace.
- As a bare handle `society`, it is the society federation principal.

## Canonical Address Forms

Two forms are supported:

- Handle Address (user-facing): mutable and human-readable
- Principal Reference (system-facing): immutable UUID-based

### Society Principals

- Handle Address:
	- Person: `personHandle@societyHandle`
	- Association: `associationHandle@societyHandle`
- Principal Reference:
	- Person: `personUuid@societyUuid`
	- Association: `associationUuid@societyUuid`

Examples:

- `tylerdteague@athensga`
- `firstbaptistchurch@athensga`

### Society Address

- Handle Address: `societyHandle`
- Principal Reference: `societyUuid`

Example:

- `athensga`

### Federation Principals

- Federation principals are referenced by bare handle in Handle Address form.
- Society handle is one federation principal type.
- Federation principals use UUID in Principal Reference form.

Examples:

- Society compact: `northgaalliance`
- Federation service: `healthservice`

## Single Handle Resolution

Given a single handle like `tylerdteague`:

### In Society Context

Resolution order is:

1. Match society person handle.
2. Match society association handle.
3. Match current society handle.
4. Otherwise treat as federation principal handle.

### Outside Society Context

Resolution order is:

1. Match society handle as a federation principal.
2. Match other federation principal handle.

No society principal (person or association) can be resolved from a bare handle outside society context.

## Handle-to-UUID Resolution

Resolution pipeline:

1. Parse input as Handle Address.
2. Resolve each handle to UUID by scope:
	- left side: principal in target society namespace
	- right side: society UUID
3. Produce Principal Reference (`principalUuid@societyUuid` for society principals).
4. Execute authorization, persistence, and routing using Principal Reference only.

Persistence rule:

- Ledger and transfer records MUST store Principal References, not Handle Addresses.

Display rule:

- UI may render Handle Addresses, resolved from UUID at read time.

Handle update rule:

- Changing a handle MUST NOT change balances, ownership, or historical linkage.
- History remains attached to UUID identity.

## Cross-Society Requirement

To address a society principal outside your current society, both parts are required:

- `localHandle@targetSocietyHandle`

Examples:

- `alice@athensga`
- `treasury@athensga`

Bare `alice` is never sufficient for cross-society routing.

## Validation Rules

- Exactly zero or one `@` is allowed depending on address form.
- Empty left or right side around `@` is invalid.
- Multiple `@` symbols are invalid.
- Handle comparison is case-insensitive after normalization to lowercase.
- `treasury` is a reserved local handle keyword and maps to the society treasury principal.
- Reserved keywords/identifiers cannot be registered as person or association handles.
- UUID parsing and handle parsing are distinct validation paths.
- If input is a Handle Address, it MUST be resolved to UUID before side effects.

## Collision Rules

- Society handles MUST be globally unique.
- Federation principal handles (other than societies) MUST NOT collide with society handles.
- If a collision exists due to legacy data, resolvers MUST return an ambiguous-handle error and never guess.

## Determinism Guarantee

- Handle Addresses are for lookup and UX.
- Principal References are the canonical identity.
- All side-effecting operations are deterministic because they run on immutable UUID references.

## Error Semantics

- Malformed address: parsing/format failure.
- Unknown principal: parsed correctly but no matching principal exists.
- Ambiguous handle: more than one match at same precedence level.
- Out-of-scope handle: bare handle used where fully-qualified society principal is required.