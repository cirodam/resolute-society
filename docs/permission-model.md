# Permission Model

## Overview

Permissions control which members can perform sensitive actions within a society. The founder bypasses all permission checks. All other members must hold a position that has been granted the relevant permission.

## Architecture

### Single source of truth

All permission codes are defined as a typed const in `src/lib/permissions.ts`:

```ts
import { PERMISSION } from '$lib/permissions';
```

Every call to `requirePermission` (server) or `hasPermission` / `hasAnyPermission` (client) must use `PERMISSION.*` — never a raw string. TypeScript enforces this via the `PermissionCode` type.

### Enforcement layers

**Server — `requirePermission`** (`src/lib/server/services/auth.service.ts`)  
Called in action handlers before any state mutation. Throws HTTP 401/403 on failure. Must be `await`ed — forgetting the await silently bypasses the check.

**Client — `hasPermission`** (`src/lib/client/permissions.ts`)  
Used in Svelte templates to conditionally render action buttons. This is a UX gate only — it does not replace server enforcement.

### Position-based grants

Permissions are assigned to *positions*, not directly to members. A member has a permission if they currently hold a position that has been granted it.

```
member → holds position → position has permission
```

Positions are seeded at setup time (see `PermissionRepository.seedDefaultPositionPermissions`). The Treasurer position receives all `treasury.*` permissions; the Registrar receives all `membership.*` permissions; the Education Director receives all `education.*` permissions.

Additional grants can be configured via the Units UI.

### Storage

Permissions live in the `permission` table (seeded at boot via `PermissionRepository.seedPermissions`). The join `position_permission` links positions to permissions. The founder's ID is stored in `society_config` and checked first in every permission query, short-circuiting the position lookup.

---

## Permission Codes

### Treasury

| Code | Constant | Description |
|------|----------|-------------|
| `treasury.run_demurrage` | `TREASURY_RUN_DEMURRAGE` | Run demurrage and supply reconciliation (mint/burn) |
| `treasury.transfer` | `TREASURY_TRANSFER` | Transfer credits from treasury to a member or association |
| `treasury.distribute_universal_allowance` | `TREASURY_DISTRIBUTE_UNIVERSAL_ALLOWANCE` | Distribute a flat amount to all members |
| `treasury.run_allowance_group` | `TREASURY_RUN_ALLOWANCE_GROUP` | Disburse an allowance group |
| `treasury.create_allowance_group` | `TREASURY_CREATE_ALLOWANCE_GROUP` | Create a new allowance group |
| `treasury.delete_allowance_group` | `TREASURY_DELETE_ALLOWANCE_GROUP` | Delete an allowance group |
| `treasury.manage_allowance_members` | `TREASURY_MANAGE_ALLOWANCE_MEMBERS` | Add, remove, or update members within an allowance group |
| `treasury.run_position_payroll` | `TREASURY_RUN_POSITION_PAYROLL` | Pay all appointed position holders |
| `treasury.adjust_position_allowance` | `TREASURY_ADJUST_POSITION_ALLOWANCE` | Change the allowance amount for a position |

### Positions

| Code | Constant | Description |
|------|----------|-------------|
| `positions.create_officer` | `POSITIONS_CREATE_OFFICER` | Create a new officer-level position |
| `positions.create_subordinate` | `POSITIONS_CREATE_SUBORDINATE` | Create a subordinate position under an existing one |
| `positions.assign_person` | `POSITIONS_ASSIGN_PERSON` | Appoint a member to a position |
| `positions.remove_person` | `POSITIONS_REMOVE_PERSON` | Remove a member from a position |

### Assembly

| Code | Constant | Description |
|------|----------|-------------|
| `assembly.assign_seat` | `ASSEMBLY_ASSIGN_SEAT` | Assign a member to an assembly seat |
| `assembly.unassign_seat` | `ASSEMBLY_UNASSIGN_SEAT` | Remove a member from an assembly seat |

### Membership

| Code | Constant | Description |
|------|----------|-------------|
| `membership.create_member` | `MEMBERSHIP_CREATE_MEMBER` | Add a new member to the society |
| `membership.remove_member` | `MEMBERSHIP_REMOVE_MEMBER` | Delete a member from the society |
| `membership.run_sortition` | `MEMBERSHIP_RUN_SORTITION` | Run sortition to assign assembly seats |
| `membership.create_association` | `MEMBERSHIP_CREATE_ASSOCIATION` | Create a new association |

### Ledger

| Code | Constant | Description |
|------|----------|-------------|
| `ledger.close_day` | `LEDGER_CLOSE_DAY` | Close the daily ledger |

### Governance

| Code | Constant | Description |
|------|----------|-------------|
| `governance.update_society` | `GOVERNANCE_UPDATE_SOCIETY` | Update society name, handle, and settings |

### Education

| Code | Constant | Description |
|------|----------|-------------|
| `education.approve_course` | `EDUCATION_APPROVE_COURSE` | Approve a submitted course |

---

## Adding a New Permission

1. Add the code string to `PERMISSION` in `src/lib/permissions.ts`
2. Add an entry to `PERMISSION_DEFINITIONS` in `permissions.repository.ts` (name, category)
3. Call `requirePermission(event, PERMISSION.YOUR_CODE, societyId)` in the action handler
4. Use `hasPermission(data.permissions, PERMISSION.YOUR_CODE)` in the Svelte template to gate the UI
5. If the permission should be granted to a default position at setup, update `seedDefaultPositionPermissions`

The `seedPermissions` job runs at application boot and inserts any codes from `PERMISSION_DEFINITIONS` that are not yet in the database, so existing societies pick up new permissions automatically.
