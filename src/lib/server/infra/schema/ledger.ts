export const LEDGER_SCHEMA = `
CREATE TABLE IF NOT EXISTS ledger_day (
	id                TEXT PRIMARY KEY,
	society_id        TEXT NOT NULL,
	date              TEXT NOT NULL,
	page_number       INTEGER NOT NULL,
	opening_balance   REAL NOT NULL DEFAULT 0,
	closing_balance   REAL NOT NULL DEFAULT 0,
	total_supply      REAL NOT NULL DEFAULT 0,
	transaction_count INTEGER NOT NULL DEFAULT 0,
	status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
	closed_at         TIMESTAMPTZ,
	closed_by_id      TEXT REFERENCES person(id),
	witnessed_by_id   TEXT REFERENCES person(id),
	printed_at        TIMESTAMPTZ,
	archived_at       TIMESTAMPTZ,
	created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (society_id, date),
	UNIQUE (society_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_ledger_day_society ON ledger_day(society_id, date DESC);

CREATE TABLE IF NOT EXISTS balance_checkpoint (
	id          TEXT PRIMARY KEY,
	society_id  TEXT NOT NULL,
	entity_type TEXT NOT NULL,
	entity_id   TEXT NOT NULL,
	balance     REAL NOT NULL,
	as_of_date  TEXT NOT NULL,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (society_id, entity_type, entity_id, as_of_date)
);

CREATE INDEX IF NOT EXISTS idx_balance_checkpoint_lookup
	ON balance_checkpoint(entity_type, entity_id, as_of_date DESC);

CREATE TABLE IF NOT EXISTS ledger_prune_cursor (
	id                INTEGER PRIMARY KEY CHECK (id = 1),
	pruned_before     TEXT    NOT NULL,
	chain_anchor_hash TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS scheduled_job_state (
	job_name           TEXT PRIMARY KEY,
	last_started_at    TIMESTAMPTZ,
	last_success_at    TIMESTAMPTZ,
	last_error_at      TIMESTAMPTZ,
	last_error_message TEXT,
	lock_until         TIMESTAMPTZ,
	updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;