import { db } from './db';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS society_config (
	id                    TEXT PRIMARY KEY,
	handle                TEXT NOT NULL UNIQUE,
	name                  TEXT NOT NULL,
	address               TEXT,
	lat                   REAL,
	lng                   REAL,
	federation_ip_address  TEXT,
	federation_public_key  TEXT,
	founder_person_id     TEXT,
	created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS location_category (
	id         TEXT PRIMARY KEY,
	society_id TEXT NOT NULL REFERENCES society_config(id),
	name       TEXT NOT NULL,
	color      TEXT NOT NULL DEFAULT '#7a5c1a',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (society_id, name)
);

CREATE INDEX IF NOT EXISTS idx_location_category_society ON location_category(society_id);

CREATE TABLE IF NOT EXISTS location (
	id          TEXT PRIMARY KEY,
	society_id  TEXT NOT NULL REFERENCES society_config(id),
	name        TEXT NOT NULL,
	category_id TEXT REFERENCES location_category(id),
	address     TEXT,
	lat         REAL NOT NULL,
	lng         REAL NOT NULL,
	notes       TEXT,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_society ON location(society_id);

CREATE TABLE IF NOT EXISTS person (
	id                TEXT PRIMARY KEY,
	society_id        TEXT NOT NULL REFERENCES society_config(id),
	handle            TEXT NOT NULL UNIQUE,
	given_name        TEXT NOT NULL,
	surname           TEXT NOT NULL,
	password_hash     TEXT NOT NULL,
	dob               TEXT,
	sex               TEXT CHECK (sex IN ('male', 'female', 'other')),
	location_id       TEXT REFERENCES location(id),
	bio               TEXT,
	sortition_number  INTEGER,
	membership_status TEXT NOT NULL DEFAULT 'provisional' CHECK (membership_status IN ('provisional', 'full', 'deleted')),
	public_key        TEXT,
	private_key       TEXT,
	welcome_seen_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS association (
	id           TEXT PRIMARY KEY,
	society_id   TEXT NOT NULL REFERENCES society_config(id),
	handle       TEXT NOT NULL UNIQUE,
	name         TEXT NOT NULL,
	type         TEXT,
	special_type TEXT NOT NULL DEFAULT 'none' CHECK (special_type IN ('none', 'college', 'hub')),
	description  TEXT,
	location_id  TEXT REFERENCES location(id),
	created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS association_member (
	association_id TEXT NOT NULL REFERENCES association(id),
	person_id      TEXT NOT NULL REFERENCES person(id),
	PRIMARY KEY (association_id, person_id)
);

CREATE TABLE IF NOT EXISTS general_assembly (
	id          TEXT PRIMARY KEY,
	society_id  TEXT NOT NULL REFERENCES society_config(id),
	term_number INTEGER NOT NULL,
	term_start  TEXT NOT NULL,
	term_end    TEXT NOT NULL,
	seat_count  INTEGER NOT NULL DEFAULT 9,
	status      TEXT NOT NULL CHECK (status IN ('preceding', 'current', 'following')),
	UNIQUE (society_id, term_number),
	UNIQUE (society_id, status)
);

CREATE TABLE IF NOT EXISTS general_assembly_member (
	assembly_id TEXT NOT NULL REFERENCES general_assembly(id),
	person_id   TEXT NOT NULL REFERENCES person(id),
	seat_number INTEGER NOT NULL CHECK (seat_number >= 1),
	PRIMARY KEY (assembly_id, person_id),
	UNIQUE (assembly_id, seat_number)
);

CREATE TABLE IF NOT EXISTS position (
	id                            TEXT PRIMARY KEY,
	society_id                    TEXT NOT NULL REFERENCES society_config(id),
	parent_position_id            TEXT REFERENCES position(id),
	type                          TEXT NOT NULL CHECK (type IN ('officer', 'section_chief', 'line_worker')),
	name                          TEXT NOT NULL,
	description                   TEXT,
	section                       TEXT,
	term_limit_years              INTEGER NOT NULL DEFAULT 2,
	current_person_id             TEXT REFERENCES person(id),
	appointed_at                  TEXT,
	term_expires_at               TEXT,
	default_allowance             REAL NOT NULL DEFAULT 0,
	current_allowance             REAL NOT NULL DEFAULT 0,
	allowance_modification_reason TEXT,
	created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (society_id, name)
);

CREATE INDEX IF NOT EXISTS idx_position_society ON position(society_id);
CREATE INDEX IF NOT EXISTS idx_position_parent  ON position(parent_position_id);
CREATE INDEX IF NOT EXISTS idx_position_type    ON position(society_id, type);

CREATE TABLE IF NOT EXISTS txn (
	id         TEXT PRIMARY KEY,
	from_type  TEXT NOT NULL,
	from_id    TEXT NOT NULL,
	to_type    TEXT NOT NULL,
	to_id      TEXT NOT NULL,
	amount     REAL NOT NULL,
	note       TEXT,
	chain_hash TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txn_from_entity_created_at ON txn(from_type, from_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_txn_to_entity_created_at   ON txn(to_type, to_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_txn_created_at             ON txn(created_at DESC);

CREATE TABLE IF NOT EXISTS event (
	id             TEXT PRIMARY KEY,
	society_id     TEXT NOT NULL REFERENCES society_config(id),
	association_id TEXT REFERENCES association(id),
	title          TEXT NOT NULL,
	description    TEXT,
	location       TEXT,
	starts_at      TEXT NOT NULL,
	ends_at        TEXT,
	created_by     TEXT NOT NULL REFERENCES person(id),
	created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post (
	id         TEXT PRIMARY KEY,
	board_type TEXT NOT NULL,
	board_id   TEXT NOT NULL,
	author_id  TEXT NOT NULL REFERENCES person(id),
	title      TEXT NOT NULL,
	body       TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS post_reply (
	id         TEXT PRIMARY KEY,
	post_id    TEXT NOT NULL REFERENCES post(id),
	author_id  TEXT NOT NULL REFERENCES person(id),
	body       TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS allowance_group (
	id         TEXT PRIMARY KEY,
	society_id TEXT NOT NULL REFERENCES society_config(id),
	name       TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (society_id, name)
);

CREATE TABLE IF NOT EXISTS allowance_group_member (
	group_id  TEXT NOT NULL REFERENCES allowance_group(id),
	person_id TEXT NOT NULL REFERENCES person(id),
	amount    REAL NOT NULL,
	joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (group_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_allowance_group_member_person ON allowance_group_member(person_id);

CREATE TABLE IF NOT EXISTS message (
	id           TEXT PRIMARY KEY,
	sender_id    TEXT NOT NULL REFERENCES person(id),
	recipient_id TEXT NOT NULL REFERENCES person(id),
	subject      TEXT NOT NULL,
	body         TEXT NOT NULL,
	read_at      TIMESTAMPTZ,
	archived_at  TIMESTAMPTZ,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_recipient ON message(recipient_id, archived_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_sender    ON message(sender_id, archived_at, created_at DESC);

CREATE TABLE IF NOT EXISTS item_listing (
	id                       TEXT PRIMARY KEY,
	society_id               TEXT NOT NULL REFERENCES society_config(id),
	person_id                TEXT NOT NULL REFERENCES person(id),
	type                     TEXT NOT NULL CHECK (type IN ('offer', 'wanted')),
	category                 TEXT,
	title                    TEXT NOT NULL,
	description              TEXT NOT NULL,
	society_credits_price    REAL,
	federation_credits_price REAL,
	status                   TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'closed')),
	created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	closed_at                TIMESTAMPTZ,
	CHECK (federation_credits_price IS NULL OR society_credits_price IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_item_listing_society ON item_listing(society_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS service_listing (
	id                      TEXT PRIMARY KEY,
	society_id              TEXT NOT NULL REFERENCES society_config(id),
	person_id               TEXT NOT NULL REFERENCES person(id),
	category                TEXT,
	title                   TEXT NOT NULL,
	description             TEXT NOT NULL,
	society_credits_rate    REAL,
	federation_credits_rate REAL,
	rate_unit               TEXT CHECK (rate_unit IN ('hour', 'job', 'day')),
	status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
	created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CHECK (federation_credits_rate IS NULL OR society_credits_rate IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_service_listing_society ON service_listing(society_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS course (
	id                TEXT PRIMARY KEY,
	society_id        TEXT NOT NULL REFERENCES society_config(id),
	instructor_id     TEXT NOT NULL REFERENCES person(id),
	title             TEXT NOT NULL,
	description       TEXT NOT NULL,
	learning_outcomes TEXT,
	time_commitment   TEXT,
	prerequisites     TEXT,
	schedule          TEXT NOT NULL,
	type              TEXT NOT NULL CHECK (type IN ('classroom', 'tutoring')),
	max_students      INTEGER,
	location_type     TEXT NOT NULL CHECK (location_type IN ('in_person', 'online')),
	address           TEXT,
	lat               REAL,
	lng               REAL,
	starts_at         TEXT NOT NULL,
	ends_at           TEXT NOT NULL,
	status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
	approval_status   TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
	approved_by       TEXT REFERENCES person(id),
	approved_at       TEXT,
	created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_society ON course(society_id, status, starts_at);

CREATE TABLE IF NOT EXISTS course_enrollment (
	course_id   TEXT NOT NULL REFERENCES course(id),
	student_id  TEXT NOT NULL REFERENCES person(id),
	enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	status      TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'dropped')),
	PRIMARY KEY (course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollment_student ON course_enrollment(student_id, status);

CREATE TABLE IF NOT EXISTS permission (
	id          TEXT PRIMARY KEY,
	code        TEXT NOT NULL UNIQUE,
	name        TEXT NOT NULL,
	description TEXT,
	category    TEXT NOT NULL,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_code     ON permission(code);
CREATE INDEX IF NOT EXISTS idx_permission_category ON permission(category);

CREATE TABLE IF NOT EXISTS position_permission (
	position_id   TEXT NOT NULL REFERENCES position(id) ON DELETE CASCADE,
	permission_id TEXT NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
	granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (position_id, permission_id)
);

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
	society_id TEXT NOT NULL REFERENCES society_config(id),
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

CREATE TABLE IF NOT EXISTS nutrient (
	id         TEXT PRIMARY KEY,
	society_id TEXT NOT NULL REFERENCES society_config(id),
	name       TEXT NOT NULL,
	unit       TEXT NOT NULL,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (society_id, name)
);

CREATE INDEX IF NOT EXISTS idx_nutrient_society ON nutrient(society_id, sort_order);

CREATE TABLE IF NOT EXISTS dri_profile (
	id         TEXT PRIMARY KEY,
	society_id TEXT NOT NULL REFERENCES society_config(id),
	label      TEXT NOT NULL,
	age_min    INTEGER NOT NULL,
	age_max    INTEGER NOT NULL,
	sex        TEXT NOT NULL CHECK (sex IN ('male', 'female', 'any')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (society_id, age_min, age_max, sex)
);

CREATE INDEX IF NOT EXISTS idx_dri_profile_society ON dri_profile(society_id);

CREATE TABLE IF NOT EXISTS dri_value (
	profile_id  TEXT NOT NULL REFERENCES dri_profile(id) ON DELETE CASCADE,
	nutrient_id TEXT NOT NULL REFERENCES nutrient(id) ON DELETE CASCADE,
	amount      REAL NOT NULL,
	PRIMARY KEY (profile_id, nutrient_id)
);

CREATE TABLE IF NOT EXISTS food (
	id         TEXT PRIMARY KEY,
	society_id TEXT NOT NULL REFERENCES society_config(id),
	name       TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (society_id, name)
);

CREATE INDEX IF NOT EXISTS idx_food_society ON food(society_id);

CREATE TABLE IF NOT EXISTS food_nutrient (
	food_id     TEXT NOT NULL REFERENCES food(id) ON DELETE CASCADE,
	nutrient_id TEXT NOT NULL REFERENCES nutrient(id) ON DELETE CASCADE,
	per_100g    REAL NOT NULL DEFAULT 0,
	PRIMARY KEY (food_id, nutrient_id)
);

CREATE TABLE IF NOT EXISTS ledger_day (
	id                TEXT PRIMARY KEY,
	society_id        TEXT NOT NULL REFERENCES society_config(id),
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
	society_id  TEXT NOT NULL REFERENCES society_config(id),
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

CREATE TABLE IF NOT EXISTS road_node (
	id         TEXT PRIMARY KEY,
	society_id TEXT NOT NULL REFERENCES society_config(id),
	lat        REAL NOT NULL,
	lng        REAL NOT NULL,
	label      TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_road_node_society ON road_node(society_id);

CREATE TABLE IF NOT EXISTS road_edge (
	id          TEXT PRIMARY KEY,
	society_id  TEXT NOT NULL REFERENCES society_config(id),
	node_a_id   TEXT NOT NULL REFERENCES road_node(id) ON DELETE CASCADE,
	node_b_id   TEXT NOT NULL REFERENCES road_node(id) ON DELETE CASCADE,
	distance_km REAL NOT NULL,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_road_edge_society ON road_edge(society_id);
`;

export async function migrate(): Promise<void> {
	await db().unsafe(SCHEMA);

	await db().unsafe(`
		ALTER TABLE federation_message
		ADD COLUMN IF NOT EXISTS next_attempted_at TIMESTAMPTZ;
	`);

	await db().unsafe(`
		ALTER TABLE federation_message
		ADD COLUMN IF NOT EXISTS last_error_message TEXT;
	`);

	await db().unsafe(`
		CREATE INDEX IF NOT EXISTS idx_federation_message_next_attempt
		ON federation_message(delivered_at, next_attempted_at)
		WHERE delivered_at IS NULL;
	`);
}
