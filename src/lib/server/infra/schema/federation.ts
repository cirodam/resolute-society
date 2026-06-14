export const FEDERATION_SCHEMA = `
CREATE TABLE IF NOT EXISTS federation_message (
	id                TEXT    PRIMARY KEY,
	type              TEXT    NOT NULL,
	society_handle    TEXT    NOT NULL,
	payload           TEXT    NOT NULL,
	created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	last_attempted_at TIMESTAMPTZ,
	next_attempted_at TIMESTAMPTZ,
	attempt_count     INTEGER NOT NULL DEFAULT 0,
	last_error_message TEXT,
	delivered_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_federation_message_pending
	ON federation_message(delivered_at, last_attempted_at)
	WHERE delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_federation_message_next_attempt
	ON federation_message(delivered_at, next_attempted_at)
	WHERE delivered_at IS NULL;

CREATE TABLE IF NOT EXISTS dependant (
	id         TEXT PRIMARY KEY,
	society_id TEXT NOT NULL,
	dob        TEXT NOT NULL,
	sex        TEXT CHECK (sex IN ('male', 'female', 'other')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dependant_society ON dependant(society_id);

CREATE TABLE IF NOT EXISTS dependant_guardian (
	dependant_id TEXT NOT NULL REFERENCES dependant(id) ON DELETE CASCADE,
	guardian_id  TEXT NOT NULL REFERENCES person(id),
	share        REAL NOT NULL DEFAULT 0.5 CHECK (share > 0 AND share <= 1),
	PRIMARY KEY (dependant_id, guardian_id)
);

CREATE INDEX IF NOT EXISTS idx_dependant_guardian_person ON dependant_guardian(guardian_id);

CREATE TABLE IF NOT EXISTS federation_keypair (
	id          INTEGER PRIMARY KEY CHECK (id = 1),
	public_key  TEXT NOT NULL,
	private_key TEXT NOT NULL,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outbound_fed_txn (
	id             TEXT PRIMARY KEY,
	from_principal TEXT NOT NULL,
	to_principal   TEXT NOT NULL,
	amount         REAL NOT NULL CHECK (amount > 0),
	status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'escrowed')),
	created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	settled_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbound_fed_txn_status ON outbound_fed_txn(status, created_at);
CREATE INDEX IF NOT EXISTS idx_outbound_fed_txn_from   ON outbound_fed_txn(from_principal, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbound_fed_txn_to     ON outbound_fed_txn(to_principal, created_at DESC);

CREATE TABLE IF NOT EXISTS inbound_fed_txn (
	id             TEXT PRIMARY KEY,
	from_principal TEXT NOT NULL,
	to_principal   TEXT NOT NULL,
	amount         REAL NOT NULL CHECK (amount > 0),
	received_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_fed_txn_from ON inbound_fed_txn(from_principal, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_fed_txn_to   ON inbound_fed_txn(to_principal, received_at DESC);

CREATE TABLE IF NOT EXISTS fed_mint_event (
	id          TEXT PRIMARY KEY,
	person_id   TEXT NOT NULL REFERENCES person(id),
	person_age  INTEGER NOT NULL,
	amount      REAL NOT NULL CHECK (amount > 0),
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fed_burn_event (
	id              TEXT PRIMARY KEY,
	mandate_ref     TEXT NOT NULL,
	amount          REAL NOT NULL CHECK (amount > 0),
	executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS peer_society (
	id           TEXT PRIMARY KEY,
	handle       TEXT NOT NULL UNIQUE,
	name         TEXT NOT NULL,
	address      TEXT,
	lat          REAL,
	lng          REAL,
	ip_address   TEXT,
	public_key   TEXT,
	standing     TEXT NOT NULL DEFAULT 'forming' CHECK (standing IN ('forming', 'good_standing', 'suspended', 'defunct')),
	member_count INTEGER NOT NULL DEFAULT 0,
	synced_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;