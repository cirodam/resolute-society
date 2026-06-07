export interface RandomPersonProfile {
	givenName: string;
	surname: string;
	handle: string;
	dob: string;
	age: number;
}

const GIVEN_NAMES = [
	'Avery',
	'Jordan',
	'Taylor',
	'Rowan',
	'Morgan',
	'Casey',
	'Riley',
	'Parker',
	'Quinn',
	'Hayden',
	'Alex',
	'Jamie',
	'Skyler',
	'Drew',
	'Kendall',
	'Emerson',
	'Finley',
	'Reese',
	'Harper',
	'Charlie',
	'Logan',
	'Blake',
	'Kai',
	'Sage',
	'River',
	'Cameron',
	'Peyton',
	'Sam',
	'Lane',
	'Robin',
	'Elliot',
	'Ash',
	'Noel',
	'Shawn',
	'Devon',
	'Marlow'
] as const;

const SURNAMES = [
	'Bennett',
	'Carver',
	'Dawson',
	'Ellis',
	'Foster',
	'Harper',
	'Kendall',
	'Mercer',
	'Perry',
	'Sawyer',
	'Alden',
	'Bailey',
	'Calloway',
	'Delaney',
	'Easton',
	'Fletcher',
	'Griffin',
	'Holloway',
	'Irwin',
	'Jensen',
	'Keegan',
	'Landry',
	'Maddox',
	'Nolan',
	'Osborne',
	'Prescott',
	'Quade',
	'Remnick',
	'Sterling',
	'Thompson',
	'Underwood',
	'Vance',
	'Whitaker',
	'York',
	'Zimmer',
	'Bishop'
] as const;

function pick<T>(items: readonly T[]): T {
	return items[Math.floor(Math.random() * items.length)];
}

function calculateAge(dob: string): number {
	const birthDate = new Date(dob);
	const today = new Date();
	return Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function randomDob(minAge = 18, maxAge = 80): string {
	const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
	const dayOffset = Math.floor(Math.random() * 365);
	const birthDate = new Date();
	birthDate.setFullYear(birthDate.getFullYear() - age);
	birthDate.setDate(birthDate.getDate() - dayOffset);
	return birthDate.toISOString().slice(0, 10);
}

function createUniqueHandle(baseHandle: string, handleExists: (handle: string) => boolean): string {
	let handle = baseHandle;
	let attempt = 1;
	while (handleExists(handle)) {
		handle = `${baseHandle}-${attempt}`;
		attempt += 1;
	}
	return handle;
}

export function generateRandomPersonProfile(
	handleExists: (handle: string) => boolean,
	minAge = 18,
	maxAge = 80
): RandomPersonProfile {
	const givenName = pick(GIVEN_NAMES);
	const surname = pick(SURNAMES);
	const baseHandle = `${givenName.toLowerCase()}-${surname.toLowerCase()}`;
	const handle = createUniqueHandle(baseHandle, handleExists);
	const dob = randomDob(minAge, maxAge);

	return {
		givenName,
		surname,
		handle,
		dob,
		age: calculateAge(dob)
	};
}
