# Server Architecture Guide

This directory is split into three layers.

## 1) Domain (`economy/`)

Domain logic for money behavior:

- principal addressing and resolution
- disbursement and transfer rules
- demurrage planning and execution
- endowment and supply reconciliation calculations

Keep economic rules here so routes and schedulers can share idempotent behavior.

## 2) Application (`services/`)

Application orchestration and cross-cutting flows:

- auth and permission guards
- scheduler execution
- high-level ledger helpers
- society member resolution adapters

Use this layer to coordinate domain and repositories.

## 3) Infrastructure (`infra/`)

Persistence and wiring:

- `db.ts`: SQLite connection
- `schema.ts`: schema and additive migrations
- `repositories/`: SQL-backed repositories

## Rule of Thumb

Routes should stay thin and call domain/application helpers.
