export const CORE_SCHEMA = `
CREATE TABLE IF NOT EXISTS society_config (
	key        TEXT PRIMARY KEY,
	value      TEXT NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS location_category (
	id         TEXT PRIMARY KEY,
	society_id TEXT NOT NULL,
	name       TEXT NOT NULL,
	color      TEXT NOT NULL DEFAULT '#7a5c1a',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (society_id, name)
);

CREATE INDEX IF NOT EXISTS idx_location_category_society ON location_category(society_id);

CREATE TABLE IF NOT EXISTS location (
	id          TEXT PRIMARY KEY,
	society_id  TEXT NOT NULL,
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
	society_id        TEXT NOT NULL,
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
	society_id   TEXT NOT NULL,
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
	society_id  TEXT NOT NULL,
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

DROP TABLE IF EXISTS position_permission;
DROP TABLE IF EXISTS position;
DROP TABLE IF EXISTS unit;

CREATE TABLE IF NOT EXISTS unit (
	id             TEXT PRIMARY KEY,
	parent_unit_id TEXT REFERENCES unit(id),
	name           TEXT NOT NULL UNIQUE,
	description    TEXT,
	created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unit_parent ON unit(parent_unit_id);

CREATE TABLE IF NOT EXISTS position (
	id                            TEXT PRIMARY KEY,
	unit_id                       TEXT NOT NULL REFERENCES unit(id),
	name                          TEXT NOT NULL,
	is_unit_leader                BOOLEAN NOT NULL DEFAULT FALSE,
	description                   TEXT,
	term_limit_years              INTEGER NOT NULL DEFAULT 2,
	current_person_id             TEXT REFERENCES person(id),
	appointed_at                  TIMESTAMPTZ,
	term_expires_at               TIMESTAMPTZ,
	default_allowance             REAL NOT NULL DEFAULT 0,
	current_allowance             REAL NOT NULL DEFAULT 0,
	allowance_modification_reason TEXT,
	created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (unit_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_position_unit_leader ON position(unit_id) WHERE is_unit_leader = TRUE;
CREATE INDEX IF NOT EXISTS idx_position_unit   ON position(unit_id);
CREATE INDEX IF NOT EXISTS idx_position_person ON position(current_person_id) WHERE current_person_id IS NOT NULL;

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
	society_id     TEXT NOT NULL,
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
	expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
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
	society_id TEXT NOT NULL,
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
	id                       TEXT PRIMARY KEY,
	sender_id                TEXT NOT NULL REFERENCES person(id),
	sender_association_id    TEXT REFERENCES association(id),
	recipient_id             TEXT REFERENCES person(id),
	recipient_association_id TEXT REFERENCES association(id),
	subject                  TEXT NOT NULL,
	body                     TEXT NOT NULL,
	read_at                  TIMESTAMPTZ,
	archived_at              TIMESTAMPTZ,
	created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_recipient ON message(recipient_id, archived_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_sender    ON message(sender_id, archived_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_recipient_assoc ON message(recipient_association_id, archived_at, created_at DESC) WHERE recipient_association_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_sender_assoc    ON message(sender_association_id, archived_at, created_at DESC) WHERE sender_association_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS item_listing (
	id                       TEXT PRIMARY KEY,
	society_id               TEXT NOT NULL,
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
	society_id              TEXT NOT NULL,
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
	society_id        TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_position_permission_position ON position_permission(position_id);
`;