// Date-only strings (YYYY-MM-DD) are parsed as UTC midnight by spec.
// Reparsing as local midnight prevents a day-shift for UTC− timezones.
function toDate(input: Date | string): Date | null {
	if (input instanceof Date) {
		return isNaN(input.getTime()) ? null : input;
	}
	if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
		const [y, m, d] = input.split('-').map(Number);
		return new Date(y, m - 1, d);
	}
	const d = new Date(input);
	return isNaN(d.getTime()) ? null : d;
}

function formatWithOptions(
	date: Date | string | null,
	options: Intl.DateTimeFormatOptions,
	fallback = 'Unknown'
): string {
	if (!date) return fallback;
	const d = toDate(date);
	if (!d) return fallback;
	return d.toLocaleDateString('en-US', options);
}

export function formatShortDate(date: Date | string | null, fallback?: string): string {
	return formatWithOptions(date, { year: 'numeric', month: 'short', day: 'numeric' }, fallback);
}

export function formatLongDate(date: Date | string | null, fallback?: string): string {
	return formatWithOptions(date, { year: 'numeric', month: 'long', day: 'numeric' }, fallback);
}

export function formatWeekdayDate(date: Date | string | null, fallback?: string): string {
	return formatWithOptions(
		date,
		{ weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' },
		fallback
	);
}

export function formatDateTime(date: Date | string | null, fallback?: string): string {
	return formatWithOptions(
		date,
		{ year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
		fallback
	);
}

export function formatTime(date: Date | string | null, fallback?: string): string {
	if (!date) return fallback ?? 'Unknown';
	const d = toDate(date);
	if (!d) return fallback ?? 'Unknown';
	return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatDateRange(
	start: Date | string | null,
	end: Date | string | null,
	formatter: (date: Date | string | null) => string = formatShortDate
): string {
	return `${formatter(start)} — ${formatter(end)}`;
}
