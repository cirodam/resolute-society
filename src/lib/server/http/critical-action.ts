import { fail, isHttpError } from '@sveltejs/kit';
import type { ActionFailure } from '@sveltejs/kit';

export type CriticalErrorCategory = 'permission' | 'validation' | 'infrastructure';

type CriticalActionFailureData = Record<string, unknown> & {
	actionError?: {
		code?: string;
		category?: CriticalErrorCategory;
		message?: string;
	};
	errorCode?: string;
	errorCategory?: CriticalErrorCategory;
	errorMessage?: string;
};

function categoryFromStatus(status: number): CriticalErrorCategory {
	if (status === 401 || status === 403) return 'permission';
	if (status >= 500) return 'infrastructure';
	return 'validation';
}

function defaultCodeFromStatus(status: number): string {
	if (status === 401) return 'AUTH_REQUIRED';
	if (status === 403) return 'PERMISSION_DENIED';
	if (status === 404) return 'NOT_FOUND';
	if (status === 409) return 'CONFLICT';
	if (status >= 500) return 'INTERNAL_ERROR';
	return 'VALIDATION_FAILED';
}

function extractLegacyMessage(data: Record<string, unknown>): string | null {
	if (typeof data.errorMessage === 'string') return data.errorMessage;
	if (typeof data.error === 'string') return data.error;
	if (typeof data.message === 'string') return data.message;

	for (const [key, value] of Object.entries(data)) {
		if (key.endsWith('Error') && typeof value === 'string') return value;
	}

	return null;
}

function extractLegacyCode(data: Record<string, unknown>): string | null {
	for (const [key, value] of Object.entries(data)) {
		if (key.endsWith('Code') && typeof value === 'string') return value;
	}

	return null;
}

function normalizeFailureData(status: number, data: CriticalActionFailureData): CriticalActionFailureData {
	const category = data.actionError?.category ?? data.errorCategory ?? categoryFromStatus(status);
	const code =
		data.actionError?.code ??
		data.errorCode ??
		extractLegacyCode(data) ??
		defaultCodeFromStatus(status);
	const message =
		data.actionError?.message ??
		data.errorMessage ??
		extractLegacyMessage(data) ??
		'Action failed';

	return {
		...data,
		actionError: { code, category, message },
		errorCode: code,
		errorCategory: category,
		errorMessage: message
	};
}

function isActionFailure(value: unknown): value is ActionFailure<CriticalActionFailureData> {
	return !!value && typeof value === 'object' && 'status' in value && 'data' in value;
}

export function failCritical(params: {
	status: number;
	category: CriticalErrorCategory;
	code: string;
	message: string;
	legacyKey?: string;
	extra?: Record<string, unknown>;
}): ActionFailure<CriticalActionFailureData> {
	const payload: CriticalActionFailureData = {
		actionError: {
			category: params.category,
			code: params.code,
			message: params.message
		},
		errorCode: params.code,
		errorCategory: params.category,
		errorMessage: params.message,
		...(params.extra ?? {})
	};

	if (params.legacyKey) payload[params.legacyKey] = params.message;

	return fail(params.status, payload);
}

export function failFromException(params: {
	error: unknown;
	legacyKey?: string;
	fallbackCode: string;
	fallbackMessage: string;
	extra?: Record<string, unknown>;
}): ActionFailure<CriticalActionFailureData> {
	if (isHttpError(params.error)) {
		const status = params.error.status;
		const body = params.error.body as { message?: string } | string | undefined;
		const message =
			typeof body === 'string'
				? body
				: body && typeof body.message === 'string'
					? body.message
					: 'Request failed';

		if (status === 401 || status === 403) {
			return failCritical({
				status,
				category: 'permission',
				code: defaultCodeFromStatus(status),
				message,
				legacyKey: params.legacyKey,
				extra: params.extra
			});
		}

		if (status >= 400 && status < 500) {
			return failCritical({
				status,
				category: 'validation',
				code: defaultCodeFromStatus(status),
				message,
				legacyKey: params.legacyKey,
				extra: params.extra
			});
		}
	}

	return failCritical({
		status: 500,
		category: 'infrastructure',
		code: params.fallbackCode,
		message: params.fallbackMessage,
		legacyKey: params.legacyKey,
		extra: params.extra
	});
}

export function normalizeCriticalFailure(
	failure: ActionFailure<CriticalActionFailureData>
): ActionFailure<CriticalActionFailureData> {
	return fail(failure.status, normalizeFailureData(failure.status, failure.data));
}

export function withCriticalAction<T extends (...args: any[]) => Promise<any>>(
	action: T,
	options?: {
		legacyKey?: string;
		fallbackCode?: string;
		fallbackMessage?: string;
	}
): T {
	return (async (...args: Parameters<T>) => {
		try {
			const result = await action(...args);
			if (isActionFailure(result)) return normalizeCriticalFailure(result);
			return result;
		} catch (error) {
			return failFromException({
				error,
				legacyKey: options?.legacyKey,
				fallbackCode: options?.fallbackCode ?? 'INTERNAL_ERROR',
				fallbackMessage: options?.fallbackMessage ?? 'Unexpected infrastructure failure'
			});
		}
	}) as T;
}
