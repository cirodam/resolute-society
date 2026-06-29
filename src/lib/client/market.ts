export function formatPrice(
	societyPrice: number | null,
	federationPrice: number | null,
	short = false
): string {
	if (societyPrice === null && federationPrice === null) return 'Free / Trade';
	const sc = short ? 'SC' : 'society credits';
	const fc = short ? 'FC' : 'federation credits';
	const parts: string[] = [];
	if (societyPrice !== null) parts.push(`${societyPrice.toFixed(0)} ${sc}`);
	if (federationPrice !== null) parts.push(`${federationPrice.toFixed(0)} ${fc}`);
	return parts.join(' + ');
}

export function formatDollarEquivalent(credits: number, dollarPerCredit: number): string {
	return `~$${(credits * dollarPerCredit).toFixed(2)}`;
}

export function formatRate(
	societyRate: number | null,
	federationRate: number | null,
	rateUnit: string | null,
	short = false
): string {
	if (societyRate === null && federationRate === null) return 'Rate negotiable';
	const sc = short ? 'SC' : 'society credits';
	const fc = short ? 'FC' : 'federation credits';
	const parts: string[] = [];
	if (societyRate !== null) parts.push(`${societyRate.toFixed(0)} ${sc}`);
	if (federationRate !== null) parts.push(`${federationRate.toFixed(0)} ${fc}`);
	const unitStr = rateUnit ? `/${rateUnit}` : '';
	return parts.join(' + ') + unitStr;
}
