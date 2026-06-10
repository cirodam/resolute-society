export type ExternalFailureKind = 'timeout' | 'network' | 'upstream';

export interface ExternalFetchSuccess {
	ok: true;
	response: Response;
	attempts: number;
}

export interface ExternalFetchFailure {
	ok: false;
	kind: ExternalFailureKind;
	attempts: number;
	status?: number;
	response?: Response;
	error?: unknown;
}

export type ExternalFetchResult = ExternalFetchSuccess | ExternalFetchFailure;

export interface ExternalFetchOptions {
	url: string;
	init?: RequestInit;
	timeoutMs: number;
	retries?: number;
	retryOn?: ExternalFailureKind[];
	retryableUpstreamStatuses?: number[];
	fetchImpl?: typeof fetch;
}

function mergeAbortSignals(
	timeoutSignal: AbortSignal,
	upstreamSignal?: AbortSignal | null
): AbortSignal {
	if (!upstreamSignal) return timeoutSignal;
	if (typeof AbortSignal.any === 'function') {
		return AbortSignal.any([timeoutSignal, upstreamSignal]);
	}

	const controller = new AbortController();
	const forwardAbort = () => controller.abort();
	timeoutSignal.addEventListener('abort', forwardAbort, { once: true });
	upstreamSignal.addEventListener('abort', forwardAbort, { once: true });
	return controller.signal;
}

export async function executeExternalFetch(options: ExternalFetchOptions): Promise<ExternalFetchResult> {
	const retries = options.retries ?? 0;
	const maxAttempts = retries + 1;
	const retryOn = options.retryOn ?? ['timeout', 'network'];
	const retryableUpstreamStatuses = options.retryableUpstreamStatuses ?? [500, 502, 503, 504];
	const fetchImpl = options.fetchImpl ?? fetch;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const timeoutController = new AbortController();
		const timeoutHandle = setTimeout(() => timeoutController.abort(), options.timeoutMs);
		let timedOut = false;
		timeoutController.signal.addEventListener('abort', () => {
			timedOut = true;
		}, { once: true });

		const signal = mergeAbortSignals(timeoutController.signal, options.init?.signal ?? null);

		try {
			const response = await fetchImpl(options.url, {
				...options.init,
				signal
			});
			clearTimeout(timeoutHandle);

			if (response.ok) {
				return { ok: true, response, attempts: attempt };
			}

			const shouldRetry =
				retryOn.includes('upstream') &&
				retryableUpstreamStatuses.includes(response.status) &&
				attempt < maxAttempts;

			if (shouldRetry) {
				continue;
			}

			return {
				ok: false,
				kind: 'upstream',
				attempts: attempt,
				status: response.status,
				response
			};
		} catch (error) {
			clearTimeout(timeoutHandle);
			const kind: ExternalFailureKind = timedOut ? 'timeout' : 'network';
			const shouldRetry = retryOn.includes(kind) && attempt < maxAttempts;
			if (shouldRetry) {
				continue;
			}
			return {
				ok: false,
				kind,
				attempts: attempt,
				error
			};
		}
	}

	return {
		ok: false,
		kind: 'network',
		attempts: retries + 1,
		error: new Error('Unreachable external fetch fallback')
	};
}
