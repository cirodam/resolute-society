# Economy Domain

This module centralizes economic behavior shared across federation and society routes.

## Modules

- `addressing.ts`: parse and resolve principal addresses.
- `transactions.ts`: ledger transaction insertion helper.
- `demurrage.ts`: reusable demurrage planning and collection logic.
- `disbursement.ts`: reusable one-time disbursement and balance validation.
- `policy.ts`: reusable permission guards for economy actions.

## Tests

- `addressing.test.ts`
- `demurrage.test.ts`
- `policy.test.ts`

## Invariants

- No transfer posts when source balance is insufficient.
- Demurrage charges only principals with positive balances.
- Address resolution is deterministic and unambiguous.
- Federation and society money actions enforce explicit permissions.
