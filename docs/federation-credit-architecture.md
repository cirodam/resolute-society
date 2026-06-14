# Federation Credit Architecture

## Philosophy

Federation credits represent living human presence in the federation — no more and no less. The supply is anchored to a single objective unit: the **person-year**, one year of life lived by one member. This makes the currency's value derivable from verifiable facts about real people, with no discretionary authority required to determine what the supply should be at any point in time.

The system is designed for maximum resilience. The federation is a high-value attack target. Daily operations must survive extended federation outages, extended peer society outages, and in degraded scenarios must fall back to physical processes. No single point of failure should be able to halt the economy of a functioning society.

---

## The Person-Year

One person-year = one year of life lived by one member of the federation.

**Target supply** at any moment:

```
T_target = Σ(current age of every living member across all societies) × minting_rate
```

This number:
- Grows every day as members age
- Increases when a new member joins, by their full current age × minting_rate
- Decreases when a member dies, by their age at death × minting_rate

The supply should track this figure. Divergence between current supply and target supply drives minting and burn events.

---

## Minting

Minting is executed by the society node, not the federation. When a member joins:

```
mint amount = member age at join × minting_rate
```

Credits are minted to the society's own treasury. The federation is notified but does not authorize — the formula is a protocol rule that any participant can verify independently.

The federation's central bank service records minting events in its own ledger for reconciliation purposes and to track total supply.

---

## Burning

Burning is triggered and mandated by the federation when current supply exceeds target supply. The burn is distributed progressively across societies — wealthier societies bear a disproportionately larger share.

**Inputs** (all publicly reported by each society):
- Current federation credit holdings per society
- Current population per society
- Total person-years per society

**Formula structure:**
1. Calculate total burn needed: `B = T_current - T_target`
2. Normalize each society's holdings between the poorest and wealthiest society (0 to 1)
3. Apply a progressivity exponent to each society's normalized position
4. Weight each society's share of B by that progressive score

The progressivity exponent is a federation policy parameter. At 1, burns are proportional to holdings. Higher values shift the burden increasingly toward wealthier societies, compressing wealth inequality across the network over time.

The formula is fully deterministic given public inputs. Any society — or any member — can independently verify their burn mandate by running the same calculation. The federation cannot corrupt the process because the math is auditable by everyone.

**Burn execution**: societies execute their mandated burn on the next ledger day close and report completion to the federation.

---

## Demurrage

Demurrage provides continuous passive supply contraction. Credits decay at a calibrated rate so that the supply naturally trends toward the target even between explicit burn events. The demurrage rate is set by the federation as monetary policy.

Demurrage also handles the death scenario gracefully: when a member dies, their person-years leave the target supply. The credits already in circulation do not need to be explicitly recovered — demurrage gradually retires the excess.

---

## Death and Departure

**Death**: The deceased's personal balance passes to their dependants or designated heirs within the society. If none, it passes to the society treasury. Credits already circulated remain in the economy and are retired gradually by demurrage. No surgical burning is required or attempted.

**Departure**: Credits are portable. A member's balance follows them to their new society. Double-minting is prevented by the federation's admission record — a person who has already been minted for is not minted for again on joining a second society.

---

## Ledger Architecture

Each society holds its own ledger for federation credits. The federation does not hold balances for individual persons or society treasuries.

**Society ledger contains:**
- All federation credit transactions involving its own members
- Its own treasury balance
- Both legs of cross-society transactions it participates in

**Federation ledger contains:**
- Minting events (central bank → society treasury)
- Transactions involving federation-native principals (federation services, society compacts)
- Escrow holdings for undeliverable cross-society transfers
- Reconciliation records

This means every society can answer balance questions from its own database with no external connectivity required. The federation going down does not affect a society's ability to operate or know its members' balances.

---

## Cross-Society Transfer Protocol

### Happy Path (destination society online)

```
Society A                          Society B
─────────────────────────────────────────────
write pending debit (nonce N)
POST /api/p2p ──────────────────→  validate signature + nonce
                                   write credit
                ←────────────────  200 OK
mark debit settled
```

The HTTP 200 is the confirmation. No separate callback is needed. If Society B returns 200, both legs of the transaction exist.

**Nonce**: each transaction carries a unique ID. If the connection drops after B writes the credit but before A receives the 200, A retries. B detects the duplicate nonce and returns 200 without double-crediting.

**Rule**: A writes the pending debit before sending. A only settles after receiving 200. A pending debit is never unilaterally cancelled — it stays pending until confirmed or escalated.

### Destination Society Offline

1. A retries P2P for a defined period
2. A hands the transaction to the federation as an escrow holding and marks its debit as settled
3. A is done — money has definitively left the sender
4. Federation holds the escrow until B returns
5. When B comes back online, it collects held transactions from the federation, writes the credits, and confirms to the federation
6. Federation closes the escrow

### Destination Society Goes Defunct

The federation marks the society as defunct. All pending escrow holdings addressed to that society are closed. The federation decides whether to destroy the escrowed credits or retain them in a federation reserve. This is a policy decision made at the federation level.

### Physical Fallback

When no digital connectivity exists between societies, cross-society transfers use physical documents:

- A printable signed transaction document containing: sender, recipient, amount, nonce, timestamp, and a cryptographic signature from the sending society
- The receiving society verifies the signature against the sender's known public key
- The receiving society records a pending credit and issues a paper receipt
- When connectivity is restored, both societies reconcile digitally using the nonce as the shared reference

The same nonce-based idempotency applies — if the same physical document is presented twice, the second presentation is rejected.

---

## Future: Net Settlement

Interbank settlement systems (ACH, correspondent banking) batch transactions and settle only the net position between two parties at end of day. This is significantly more efficient when two societies transact in both directions regularly — if A sends 225 to B and B sends 200 to A, only 25 needs to move.

The per-transaction nonce model is compatible with net settlement. Individual transactions would accumulate in a pending outbound queue per peer society and be exchanged as a signed manifest at settlement time, with only the net amount transferred as a final settlement transaction.

This is deferred in favor of immediate per-transaction settlement for now. The individual transaction records and nonce structure do not need to change to support it later.

---

## End-of-Day Reconciliation

At ledger day close, societies bilaterally reconcile cross-society transactions with each peer they transacted with during the day. Each society sends the list of settled transaction IDs it believes exist between them. The peer confirms which ones match.

Mismatches are flagged for administrator review. The federation receives reconciliation reports and maintains a global view when connectivity permits.

Reconciliation is best-effort — if a peer is unreachable at close of day, reconciliation is retried the next time connectivity is available.

---

## Federation's Role

The federation is **directory, admission, monetary authority, and escrow**. It is not a transaction processor.

| Responsibility | Federation | Society |
|---|---|---|
| Peer discovery | ✓ | cached locally |
| Society admission | ✓ | |
| Minting authorization | protocol rule | executes locally |
| Burn mandate calculation | ✓ | |
| Burn execution | | ✓ |
| Demurrage rate | sets policy | executes locally |
| Transaction processing | | ✓ |
| Balance tracking | | ✓ |
| Escrow for offline peers | ✓ | |
| Reconciliation witness | ✓ | initiates |
| Federation service ledger | ✓ | |
| Society compact ledger | ✓ | |

---

## Resilience Properties

| Scenario | Impact |
|---|---|
| Federation offline | No new admissions, no minting, no escrow. All existing transactions and balances unaffected. P2P transfers between reachable societies continue normally. |
| Peer society offline | Transfers to that society queue and retry P2P, then hand off to federation escrow. Sender is not blocked. |
| Both federation and peer offline | Pending debits to that peer remain on A's side until either the peer or federation is reachable. Money is reserved, not lost. |
| Internet down entirely | Societies operate internally without any interruption. Cross-society transfers fall back to physical documents. |
| Society loses its data | Society's backup is the recovery path. Federation reconciliation records assist reconstruction. More critical than in the centralized model — backups are essential. |
| Federation is attacked or seized | Daily operations across all societies continue unaffected. Monetary policy updates pause until federation is restored or rebuilt. |

---

## What Needs to Be Built

### Federation
- `ip_address` added to `GET /api/societies` response
- Escrow table and endpoint for holding undeliverable transfers
- Burn mandate calculation and distribution endpoint
- Reconciliation report ingestion
- Central bank service as a federation-native principal

### Society
- `ip_address` added to `peer_society` table and sync
- Federation credit transactions in society ledger with pending/settled state
- Inbound `/api/p2p` endpoint — validates peer signature, writes credit, returns 200
- Outbound P2P message queue with retry sweep
- Escrow handoff when P2P retries are exhausted
- Physical transaction document generation and verification
- End-of-day bilateral reconciliation with peer societies
- Minting executed locally on member join
- Demurrage execution against federation credit balances
- Burn mandate execution on ledger day close
