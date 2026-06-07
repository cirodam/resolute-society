function formatWithOptions(
	dateString: string | null,
	options: Intl.DateTimeFormatOptions,
	fallback = 'Unknown'
): string {
	if (!dateString) {
		return fallback;
	}

	return new Date(dateString).toLocaleDateString('en-US', options);
}

export function formatShortDate(dateString: string | null, fallback?: string): string {
	return formatWithOptions(
		dateString,
		{
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		},
		fallback
	);
}

export function formatLongDate(dateString: string | null, fallback?: string): string {
	return formatWithOptions(
		dateString,
		{
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		},
		fallback
	);
}

export function formatWeekdayDate(dateString: string | null, fallback?: string): string {
	return formatWithOptions(
		dateString,
		{
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		},
		fallback
	);
}

export function formatDateTime(dateString: string | null, fallback?: string): string {
	return formatWithOptions(
		dateString,
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

export function formatTime(dateString: string | null, fallback?: string): string {
	if (!dateString) {
		return fallback ?? 'Unknown';
	}

	return new Date(dateString).toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit'
	});
}

export function formatDateRange(
	start: string | null,
	end: string | null,
	formatter: (dateString: string | null) => string = formatShortDate
): string {
	return `${formatter(start)} — ${formatter(end)}`;
}