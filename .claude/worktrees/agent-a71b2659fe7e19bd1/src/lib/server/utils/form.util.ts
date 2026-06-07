export const BCRYPT_ROUNDS = 12;

const ALLOWED_SEX_VALUES = new Set(['male', 'female', 'other']);

export function parseSex(
	raw: FormDataEntryValue | null
): 'male' | 'female' | 'other' | null | 'invalid' {
	if (!raw) return null;
	const value = raw.toString().trim();
	if (!value) return null;
	if (ALLOWED_SEX_VALUES.has(value)) return value as 'male' | 'female' | 'other';
	return 'invalid';
}
