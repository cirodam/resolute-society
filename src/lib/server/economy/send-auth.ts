export interface PrincipalRef {
	id: string;
	societyId: string;
}

export type SenderAuthorizationResult =
	| {
			ok: true;
			effectiveFromPrincipal: string;
			fromId: string;
			fromSocietyId: string;
		}
	| {
			ok: false;
			status: 400 | 401 | 403;
			sendError: string;
		};

export function parsePrincipalRef(principal: string | null | undefined): PrincipalRef | null {
	if (!principal) {
		return null;
	}

	const trimmed = principal.trim();
	const parts = trimmed.split('@');
	if (parts.length !== 2) {
		return null;
	}

	const [id, societyId] = parts;
	if (!id || !societyId) {
		return null;
	}

	return { id, societyId };
}

export function authorizeFromPrincipal(params: {
	requestedFromPrincipal: string | null | undefined;
	authenticatedPersonId: string | undefined;
	societyId: string;
	canTransferFromTreasury: boolean;
}): SenderAuthorizationResult {
	if (!params.authenticatedPersonId) {
		return {
			ok: false,
			status: 401,
			sendError: 'Not authenticated'
		};
	}

	if (!params.requestedFromPrincipal) {
		return {
			ok: false,
			status: 400,
			sendError: 'From principal is required'
		};
	}

	const from = parsePrincipalRef(params.requestedFromPrincipal);
	if (!from) {
		return {
			ok: false,
			status: 400,
			sendError: 'From principal is invalid'
		};
	}

	if (from.societyId !== params.societyId) {
		return {
			ok: false,
			status: 400,
			sendError: 'Can only send from this society'
		};
	}

	if (from.id === 'treasury') {
		if (!params.canTransferFromTreasury) {
			return {
				ok: false,
				status: 403,
				sendError: 'Permission denied: treasury.transfer'
			};
		}

		return {
			ok: true,
			effectiveFromPrincipal: `treasury@${params.societyId}`,
			fromId: 'treasury',
			fromSocietyId: params.societyId
		};
	}

	if (from.id !== params.authenticatedPersonId) {
		return {
			ok: false,
			status: 403,
			sendError: 'Cannot send on behalf of another principal'
		};
	}

	return {
		ok: true,
		effectiveFromPrincipal: `${params.authenticatedPersonId}@${params.societyId}`,
		fromId: params.authenticatedPersonId,
		fromSocietyId: params.societyId
	};
}
