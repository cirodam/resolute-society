export const NUTRITION_SCHEMA = `
CREATE TABLE IF NOT EXISTS nutrient (
	id         TEXT PRIMARY KEY,
	society_id TEXT NOT NULL,
	name       TEXT NOT NULL,
	unit       TEXT NOT NULL,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (society_id, name)
);

CREATE INDEX IF NOT EXISTS idx_nutrient_society ON nutrient(society_id, sort_order);

CREATE TABLE IF NOT EXISTS dri_profile (
	id         TEXT PRIMARY KEY,
	society_id TEXT NOT NULL,
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
	society_id TEXT NOT NULL,
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
`;