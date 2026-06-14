export const INFRASTRUCTURE_SCHEMA = `
CREATE TABLE IF NOT EXISTS road_node (
	id         TEXT PRIMARY KEY,
	society_id TEXT NOT NULL,
	lat        REAL NOT NULL,
	lng        REAL NOT NULL,
	label      TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_road_node_society ON road_node(society_id);

CREATE TABLE IF NOT EXISTS road_edge (
	id          TEXT PRIMARY KEY,
	society_id  TEXT NOT NULL,
	node_a_id   TEXT NOT NULL REFERENCES road_node(id) ON DELETE CASCADE,
	node_b_id   TEXT NOT NULL REFERENCES road_node(id) ON DELETE CASCADE,
	distance_km REAL NOT NULL,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_road_edge_society ON road_edge(society_id);

CREATE TABLE IF NOT EXISTS audit_event (
	id              TEXT PRIMARY KEY,
	society_id      TEXT NOT NULL,
	actor_person_id TEXT REFERENCES person(id),
	actor_display   TEXT NOT NULL,
	event_type      TEXT NOT NULL,
	target_type     TEXT NOT NULL,
	target_id       TEXT NOT NULL,
	summary         TEXT NOT NULL,
	metadata_json   TEXT NOT NULL DEFAULT '{}',
	request_id      TEXT,
	occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_event_society_time ON audit_event(society_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_type_time    ON audit_event(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_target       ON audit_event(target_type, target_id, occurred_at DESC);
`;