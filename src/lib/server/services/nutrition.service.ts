import { getRepositories } from '$lib/server/infra/repositories';
import { calculateAgeYears } from '$lib/server/economy/endowment';
import type { DriProfileRow, DriValueRow } from '$lib/server/infra/repositories/nutrition.repository';

export interface PopulationRequirement {
	nutrient_id: string;
	name: string;
	unit: string;
	sort_order: number;
	total: number;
}

export interface DemographicGroup {
	profile_id: string;
	label: string;
	count: number;
}

type PersonEntry = { dob: string | null; sex: 'male' | 'female' | 'other' | null };

function resolveProfileIds(age: number, sex: PersonEntry['sex'], profiles: DriProfileRow[]): string[] {
	const byAge = profiles.filter((p) => age >= p.age_min && age <= p.age_max);

	if (sex === 'male' || sex === 'female') {
		const exact = byAge.find((p) => p.sex === sex);
		const any   = byAge.find((p) => p.sex === 'any');
		return exact ? [exact.id] : any ? [any.id] : [];
	}

	// 'other' or null: use 'any' if available, else average male+female
	const any = byAge.find((p) => p.sex === 'any');
	if (any) return [any.id];
	return byAge.filter((p) => p.sex === 'male' || p.sex === 'female').map((p) => p.id);
}

function accumulateRequirements(
	totals: Map<string, number>,
	profileIds: string[],
	driValues: DriValueRow[]
): void {
	if (profileIds.length === 0) return;
	const divisor = profileIds.length; // average when male+female both returned
	for (const profileId of profileIds) {
		for (const dv of driValues) {
			if (dv.profile_id !== profileId) continue;
			totals.set(dv.nutrient_id, (totals.get(dv.nutrient_id) ?? 0) + dv.amount / divisor);
		}
	}
}

function buildPopulation(societyId: string): PersonEntry[] {
	const repos = getRepositories();
	return [
		...repos.people.listForNutrition(societyId),
		...repos.dependants.listBySociety(societyId)
	];
}

export function calculatePopulationRequirements(societyId: string): PopulationRequirement[] {
	const repos   = getRepositories();
	const nutrients  = repos.nutrition.listNutrients(societyId);
	const profiles   = repos.nutrition.listDriProfiles(societyId);
	const driValues  = repos.nutrition.listAllDriValues(societyId);
	const population = buildPopulation(societyId);

	const totals = new Map<string, number>();
	for (const person of population) {
		const age = calculateAgeYears(person.dob);
		accumulateRequirements(totals, resolveProfileIds(age, person.sex, profiles), driValues);
	}

	return nutrients.map((n) => ({
		nutrient_id: n.id,
		name: n.name,
		unit: n.unit,
		sort_order: n.sort_order,
		total: Math.round(totals.get(n.id) ?? 0)
	}));
}

export function getPopulationDemographics(societyId: string): DemographicGroup[] {
	const repos      = getRepositories();
	const profiles   = repos.nutrition.listDriProfiles(societyId);
	const population = buildPopulation(societyId);

	const counts = new Map<string, number>();
	for (const person of population) {
		const age = calculateAgeYears(person.dob);
		const ids = resolveProfileIds(age, person.sex, profiles);
		if (ids.length === 0) continue;
		const key = ids[0]; // assign to primary profile
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	return profiles
		.map((p) => ({ profile_id: p.id, label: p.label, count: counts.get(p.id) ?? 0 }))
		.filter((g) => g.count > 0);
}
