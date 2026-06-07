import type postgres from 'postgres';
import { randomUUID } from 'node:crypto';

export interface NutrientRow {
	id: string;
	name: string;
	unit: string;
	sort_order: number;
}

export interface DriProfileRow {
	id: string;
	label: string;
	age_min: number;
	age_max: number;
	sex: 'male' | 'female' | 'any';
}

export interface DriValueRow {
	profile_id: string;
	nutrient_id: string;
	amount: number;
}

export interface FoodRow {
	id: string;
	name: string;
}

export interface FoodNutrientRow {
	food_id: string;
	nutrient_id: string;
	per_100g: number;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_NUTRIENTS = [
	{ name: 'Calories',     unit: 'kcal',    sort_order: 0 },
	{ name: 'Protein',      unit: 'g',       sort_order: 1 },
	{ name: 'Total Fat',    unit: 'g',       sort_order: 2 },
	{ name: 'Carbohydrates',unit: 'g',       sort_order: 3 },
	{ name: 'Fiber',        unit: 'g',       sort_order: 4 },
	{ name: 'Vitamin C',    unit: 'mg',      sort_order: 5 },
	{ name: 'Calcium',      unit: 'mg',      sort_order: 6 },
	{ name: 'Iron',         unit: 'mg',      sort_order: 7 },
	{ name: 'Vitamin D',    unit: 'µg',      sort_order: 8 },
	{ name: 'Vitamin A',    unit: 'µg RAE',  sort_order: 9 },
	{ name: 'Vitamin B12',  unit: 'µg',      sort_order: 10 },
] as const;

type NutrientName = typeof SEED_NUTRIENTS[number]['name'];
type NutrientValues = Record<NutrientName, number>;

const SEED_DRI_PROFILES: Array<{
	label: string; age_min: number; age_max: number; sex: 'male' | 'female' | 'any';
	values: NutrientValues;
}> = [
	{ label: 'Infants (0–1)',        age_min: 0,  age_max: 0,   sex: 'any',    values: { 'Calories': 550,  'Protein': 10, 'Total Fat': 31, 'Carbohydrates': 60,  'Fiber': 0,  'Vitamin C': 40, 'Calcium': 200,  'Iron': 0.27, 'Vitamin D': 10, 'Vitamin A': 400, 'Vitamin B12': 0.4 } },
	{ label: 'Children (1–3)',        age_min: 1,  age_max: 3,   sex: 'any',    values: { 'Calories': 1000, 'Protein': 13, 'Total Fat': 30, 'Carbohydrates': 130, 'Fiber': 14, 'Vitamin C': 15, 'Calcium': 700,  'Iron': 7,    'Vitamin D': 15, 'Vitamin A': 300, 'Vitamin B12': 0.9 } },
	{ label: 'Children (4–8)',        age_min: 4,  age_max: 8,   sex: 'any',    values: { 'Calories': 1400, 'Protein': 19, 'Total Fat': 35, 'Carbohydrates': 130, 'Fiber': 20, 'Vitamin C': 25, 'Calcium': 1000, 'Iron': 10,   'Vitamin D': 15, 'Vitamin A': 400, 'Vitamin B12': 1.2 } },
	{ label: 'Children (9–13) — M',   age_min: 9,  age_max: 13,  sex: 'male',   values: { 'Calories': 1800, 'Protein': 34, 'Total Fat': 45, 'Carbohydrates': 130, 'Fiber': 31, 'Vitamin C': 45, 'Calcium': 1300, 'Iron': 8,    'Vitamin D': 15, 'Vitamin A': 600, 'Vitamin B12': 1.8 } },
	{ label: 'Children (9–13) — F',   age_min: 9,  age_max: 13,  sex: 'female', values: { 'Calories': 1600, 'Protein': 34, 'Total Fat': 40, 'Carbohydrates': 130, 'Fiber': 26, 'Vitamin C': 45, 'Calcium': 1300, 'Iron': 8,    'Vitamin D': 15, 'Vitamin A': 600, 'Vitamin B12': 1.8 } },
	{ label: 'Teens (14–18) — M',     age_min: 14, age_max: 18,  sex: 'male',   values: { 'Calories': 2200, 'Protein': 52, 'Total Fat': 55, 'Carbohydrates': 130, 'Fiber': 38, 'Vitamin C': 75, 'Calcium': 1300, 'Iron': 11,   'Vitamin D': 15, 'Vitamin A': 900, 'Vitamin B12': 2.4 } },
	{ label: 'Teens (14–18) — F',     age_min: 14, age_max: 18,  sex: 'female', values: { 'Calories': 1800, 'Protein': 46, 'Total Fat': 45, 'Carbohydrates': 130, 'Fiber': 26, 'Vitamin C': 65, 'Calcium': 1300, 'Iron': 15,   'Vitamin D': 15, 'Vitamin A': 700, 'Vitamin B12': 2.4 } },
	{ label: 'Adults (19–50) — M',    age_min: 19, age_max: 50,  sex: 'male',   values: { 'Calories': 2400, 'Protein': 56, 'Total Fat': 60, 'Carbohydrates': 130, 'Fiber': 38, 'Vitamin C': 90, 'Calcium': 1000, 'Iron': 8,    'Vitamin D': 15, 'Vitamin A': 900, 'Vitamin B12': 2.4 } },
	{ label: 'Adults (19–50) — F',    age_min: 19, age_max: 50,  sex: 'female', values: { 'Calories': 2000, 'Protein': 46, 'Total Fat': 50, 'Carbohydrates': 130, 'Fiber': 25, 'Vitamin C': 75, 'Calcium': 1000, 'Iron': 18,   'Vitamin D': 15, 'Vitamin A': 700, 'Vitamin B12': 2.4 } },
	{ label: 'Adults (51–70) — M',    age_min: 51, age_max: 70,  sex: 'male',   values: { 'Calories': 2200, 'Protein': 56, 'Total Fat': 55, 'Carbohydrates': 130, 'Fiber': 30, 'Vitamin C': 90, 'Calcium': 1000, 'Iron': 8,    'Vitamin D': 20, 'Vitamin A': 900, 'Vitamin B12': 2.4 } },
	{ label: 'Adults (51–70) — F',    age_min: 51, age_max: 70,  sex: 'female', values: { 'Calories': 1800, 'Protein': 46, 'Total Fat': 45, 'Carbohydrates': 130, 'Fiber': 21, 'Vitamin C': 75, 'Calcium': 1200, 'Iron': 8,    'Vitamin D': 20, 'Vitamin A': 700, 'Vitamin B12': 2.4 } },
	{ label: 'Older Adults (71+) — M',age_min: 71, age_max: 999, sex: 'male',   values: { 'Calories': 2000, 'Protein': 56, 'Total Fat': 50, 'Carbohydrates': 130, 'Fiber': 30, 'Vitamin C': 90, 'Calcium': 1200, 'Iron': 8,    'Vitamin D': 20, 'Vitamin A': 900, 'Vitamin B12': 2.4 } },
	{ label: 'Older Adults (71+) — F',age_min: 71, age_max: 999, sex: 'female', values: { 'Calories': 1600, 'Protein': 46, 'Total Fat': 40, 'Carbohydrates': 130, 'Fiber': 21, 'Vitamin C': 75, 'Calcium': 1200, 'Iron': 8,    'Vitamin D': 20, 'Vitamin A': 700, 'Vitamin B12': 2.4 } },
];

const SEED_FOODS: Array<{ name: string; values: NutrientValues }> = [
	{ name: 'Wheat Flour (whole)',   values: { 'Calories': 340,  'Protein': 13,   'Total Fat': 2.5,  'Carbohydrates': 72,  'Fiber': 11,  'Vitamin C': 0,    'Calcium': 34,  'Iron': 3.9,  'Vitamin D': 0,   'Vitamin A': 0,   'Vitamin B12': 0    } },
	{ name: 'White Rice (dry)',      values: { 'Calories': 365,  'Protein': 7,    'Total Fat': 0.7,  'Carbohydrates': 80,  'Fiber': 1.3, 'Vitamin C': 0,    'Calcium': 28,  'Iron': 0.8,  'Vitamin D': 0,   'Vitamin A': 0,   'Vitamin B12': 0    } },
	{ name: 'Dried Black Beans',     values: { 'Calories': 341,  'Protein': 21,   'Total Fat': 1.4,  'Carbohydrates': 62,  'Fiber': 15,  'Vitamin C': 0,    'Calcium': 123, 'Iron': 5,    'Vitamin D': 0,   'Vitamin A': 1,   'Vitamin B12': 0    } },
	{ name: 'Rolled Oats',           values: { 'Calories': 389,  'Protein': 17,   'Total Fat': 7,    'Carbohydrates': 66,  'Fiber': 10,  'Vitamin C': 0,    'Calcium': 54,  'Iron': 4.7,  'Vitamin D': 0,   'Vitamin A': 0,   'Vitamin B12': 0    } },
	{ name: 'Potatoes (raw)',        values: { 'Calories': 77,   'Protein': 2,    'Total Fat': 0.1,  'Carbohydrates': 17,  'Fiber': 2.2, 'Vitamin C': 19.7, 'Calcium': 12,  'Iron': 0.8,  'Vitamin D': 0,   'Vitamin A': 2,   'Vitamin B12': 0    } },
	{ name: 'Eggs (whole)',          values: { 'Calories': 155,  'Protein': 13,   'Total Fat': 11,   'Carbohydrates': 1.1, 'Fiber': 0,   'Vitamin C': 0,    'Calcium': 56,  'Iron': 1.8,  'Vitamin D': 2,   'Vitamin A': 160, 'Vitamin B12': 1.1  } },
	{ name: 'Canned Sardines',       values: { 'Calories': 208,  'Protein': 25,   'Total Fat': 11,   'Carbohydrates': 0,   'Fiber': 0,   'Vitamin C': 0,    'Calcium': 382, 'Iron': 2.9,  'Vitamin D': 4.8, 'Vitamin A': 54,  'Vitamin B12': 8.9  } },
	{ name: 'Beef Jerky',            values: { 'Calories': 280,  'Protein': 33,   'Total Fat': 7,    'Carbohydrates': 11,  'Fiber': 0,   'Vitamin C': 0,    'Calcium': 15,  'Iron': 3.5,  'Vitamin D': 0,   'Vitamin A': 0,   'Vitamin B12': 1.5  } },
	{ name: 'Vegetable Oil',         values: { 'Calories': 884,  'Protein': 0,    'Total Fat': 100,  'Carbohydrates': 0,   'Fiber': 0,   'Vitamin C': 0,    'Calcium': 0,   'Iron': 0,    'Vitamin D': 0,   'Vitamin A': 0,   'Vitamin B12': 0    } },
	{ name: 'Cabbage (raw)',         values: { 'Calories': 25,   'Protein': 1.3,  'Total Fat': 0.1,  'Carbohydrates': 6,   'Fiber': 2.5, 'Vitamin C': 36.6, 'Calcium': 40,  'Iron': 0.5,  'Vitamin D': 0,   'Vitamin A': 5,   'Vitamin B12': 0    } },
	{ name: 'Sweet Potatoes (raw)',  values: { 'Calories': 86,   'Protein': 1.6,  'Total Fat': 0.1,  'Carbohydrates': 20,  'Fiber': 3,   'Vitamin C': 2.4,  'Calcium': 30,  'Iron': 0.6,  'Vitamin D': 0,   'Vitamin A': 961, 'Vitamin B12': 0    } },
	{ name: 'Dried Lentils',         values: { 'Calories': 352,  'Protein': 25,   'Total Fat': 1.1,  'Carbohydrates': 60,  'Fiber': 11,  'Vitamin C': 3.6,  'Calcium': 56,  'Iron': 7.5,  'Vitamin D': 0,   'Vitamin A': 2,   'Vitamin B12': 0    } },
	{ name: 'Whole Milk',            values: { 'Calories': 61,   'Protein': 3.2,  'Total Fat': 3.3,  'Carbohydrates': 4.8, 'Fiber': 0,   'Vitamin C': 0,    'Calcium': 113, 'Iron': 0.03, 'Vitamin D': 1.3, 'Vitamin A': 46,  'Vitamin B12': 0.4  } },
	{ name: 'Cornmeal (whole grain)', values: { 'Calories': 362,  'Protein': 8.1,  'Total Fat': 3.6,  'Carbohydrates': 76,  'Fiber': 7.3, 'Vitamin C': 0,    'Calcium': 7,   'Iron': 3.5,  'Vitamin D': 0,   'Vitamin A': 10,  'Vitamin B12': 0    } },
	{ name: 'Sunflower Seeds',       values: { 'Calories': 584,  'Protein': 21,   'Total Fat': 51,   'Carbohydrates': 20,  'Fiber': 9,   'Vitamin C': 1.4,  'Calcium': 78,  'Iron': 5.3,  'Vitamin D': 0,   'Vitamin A': 3,   'Vitamin B12': 0    } },
];

// ── Repository ────────────────────────────────────────────────────────────────

export class NutritionRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async hasData(societyId: string): Promise<boolean> {
		const [result] = await this.sql<Array<{ count: number }>>`
			SELECT COUNT(*)::int as count FROM nutrient WHERE society_id = ${societyId}`;
		return result.count > 0;
	}

	async listNutrients(societyId: string): Promise<NutrientRow[]> {
		return await this.sql<NutrientRow[]>`
			SELECT id, name, unit, sort_order FROM nutrient WHERE society_id = ${societyId} ORDER BY sort_order`;
	}

	async listDriProfiles(societyId: string): Promise<DriProfileRow[]> {
		return await this.sql<DriProfileRow[]>`
			SELECT id, label, age_min, age_max, sex FROM dri_profile WHERE society_id = ${societyId} ORDER BY age_min, sex`;
	}

	async listAllDriValues(societyId: string): Promise<DriValueRow[]> {
		return await this.sql<DriValueRow[]>`
			SELECT dv.profile_id, dv.nutrient_id, dv.amount
			FROM dri_value dv
			JOIN dri_profile dp ON dp.id = dv.profile_id
			WHERE dp.society_id = ${societyId}`;
	}

	async listFoods(societyId: string): Promise<FoodRow[]> {
		return await this.sql<FoodRow[]>`SELECT id, name FROM food WHERE society_id = ${societyId} ORDER BY name`;
	}

	async findFood(foodId: string): Promise<FoodRow | null> {
		const [row] = await this.sql<FoodRow[]>`SELECT id, name FROM food WHERE id = ${foodId}`;
		return row ?? null;
	}

	async listAllFoodNutrients(societyId: string): Promise<FoodNutrientRow[]> {
		return await this.sql<FoodNutrientRow[]>`
			SELECT fn.food_id, fn.nutrient_id, fn.per_100g
			FROM food_nutrient fn
			JOIN food f ON f.id = fn.food_id
			WHERE f.society_id = ${societyId}`;
	}

	async listFoodNutrients(foodId: string): Promise<FoodNutrientRow[]> {
		return await this.sql<FoodNutrientRow[]>`
			SELECT food_id, nutrient_id, per_100g FROM food_nutrient WHERE food_id = ${foodId}`;
	}

	async createFood(societyId: string, name: string): Promise<string> {
		const id = randomUUID();
		await this.sql`INSERT INTO food (id, society_id, name) VALUES (${id}, ${societyId}, ${name})`;
		return id;
	}

	async deleteFood(foodId: string): Promise<void> {
		await this.sql`DELETE FROM food WHERE id = ${foodId}`;
	}

	async setFoodNutrient(foodId: string, nutrientId: string, per100g: number): Promise<void> {
		await this.sql`
			INSERT INTO food_nutrient (food_id, nutrient_id, per_100g)
			VALUES (${foodId}, ${nutrientId}, ${per100g})
			ON CONFLICT (food_id, nutrient_id) DO UPDATE SET per_100g = excluded.per_100g`;
	}

	async setDriValue(profileId: string, nutrientId: string, amount: number): Promise<void> {
		await this.sql`
			INSERT INTO dri_value (profile_id, nutrient_id, amount)
			VALUES (${profileId}, ${nutrientId}, ${amount})
			ON CONFLICT (profile_id, nutrient_id) DO UPDATE SET amount = excluded.amount`;
	}

	async seedDefaults(societyId: string): Promise<void> {
		await this.sql.begin(async (sql) => {
			// Nutrients
			const nutrientIds = new Map<string, string>();
			for (const n of SEED_NUTRIENTS) {
				const id = randomUUID();
				await sql`INSERT INTO nutrient (id, society_id, name, unit, sort_order) VALUES (${id}, ${societyId}, ${n.name}, ${n.unit}, ${n.sort_order}) ON CONFLICT DO NOTHING`;
				const [row] = await sql<Array<{ id: string }>>`SELECT id FROM nutrient WHERE society_id = ${societyId} AND name = ${n.name}`;
				nutrientIds.set(n.name, row.id);
			}

			// DRI profiles + values
			for (const profile of SEED_DRI_PROFILES) {
				const profileId = randomUUID();
				await sql`INSERT INTO dri_profile (id, society_id, label, age_min, age_max, sex) VALUES (${profileId}, ${societyId}, ${profile.label}, ${profile.age_min}, ${profile.age_max}, ${profile.sex}) ON CONFLICT DO NOTHING`;
				const [row] = await sql<Array<{ id: string }>>`SELECT id FROM dri_profile WHERE society_id = ${societyId} AND age_min = ${profile.age_min} AND age_max = ${profile.age_max} AND sex = ${profile.sex}`;
				for (const [nutrientName, amount] of Object.entries(profile.values)) {
					const nutrientId = nutrientIds.get(nutrientName);
					if (nutrientId) {
						await sql`INSERT INTO dri_value (profile_id, nutrient_id, amount) VALUES (${row.id}, ${nutrientId}, ${amount}) ON CONFLICT DO NOTHING`;
					}
				}
			}

			// Foods + food nutrients
			for (const food of SEED_FOODS) {
				const foodId = randomUUID();
				await sql`INSERT INTO food (id, society_id, name) VALUES (${foodId}, ${societyId}, ${food.name}) ON CONFLICT DO NOTHING`;
				const [row] = await sql<Array<{ id: string }>>`SELECT id FROM food WHERE society_id = ${societyId} AND name = ${food.name}`;
				for (const [nutrientName, per100g] of Object.entries(food.values)) {
					const nutrientId = nutrientIds.get(nutrientName);
					if (nutrientId) {
						await sql`INSERT INTO food_nutrient (food_id, nutrient_id, per_100g) VALUES (${row.id}, ${nutrientId}, ${per100g}) ON CONFLICT DO NOTHING`;
					}
				}
			}
		});
	}
}
