function formatWithOptions(
	date: Date | string | null,
	options: Intl.DateTimeFormatOptions,
	fallback = 'Unknown'
): string {
	if (!date) {
		return fallback;
	}

	const d = date instanceof Date ? date : new Date(date);
	return d.toLocaleDateString('en-US', options);
}

export function formatShortDate(date: Date | string | null, fallback?: string): string {
	return formatWithOptions(
		date,
		{
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		},
		fallback
	);
}

export function formatLongDate(date: Date | string | null, fallback?: string): string {
	return formatWithOptions(
		date,
		{
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		},
		fallback
	);
}

export function formatWeekdayDate(date: Date | string | null, fallback?: string): string {
	return formatWithOptions(
		date,
		{
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		},
		fallback
	);
}

export function formatDateTime(date: Date | string | null, fallback?: string): string {
	return formatWithOptions(
		date,
		{
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		},
		fallback
	);
}

export function formatTime(date: Date | string | null, fallback?: string): string {
	if (!date) {
		return fallback ?? 'Unknown';
	}

	const d = date instanceof Date ? date : new Date(date);
	return d.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit'
	});
}

export function formatDateRange(
	start: Date | string | null,
	end: Date | string | null,
	formatter: (date: Date | string | null) => string = formatShortDate
): string {
	return `${formatter(start)} — ${formatter(end)}`;
}