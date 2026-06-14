import { generateKeyPairSync, sign, verify } from 'node:crypto';

export function generateFederationKeypair(): { publicKey: string; privateKey: string } {
	const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
		publicKeyEncoding: { type: 'spki', format: 'der' },
		privateKeyEncoding: { type: 'pkcs8', format: 'der' }
	});
	return {
		publicKey: (publicKey as Buffer).toString('base64'),
		privateKey: (privateKey as Buffer).toString('base64')
	};
}

// The canonical form that both sides sign and verify.
export function canonicalJoinData(params: {
	id: string;
	type: string;
	societyHandle: string;
	timestamp: string;
	societyId: string;
	name: string;
	inviteToken: string;
	publicKey: string;
	networkAddress: string;
}): string {
	return [params.id, params.type, params.societyHandle, params.timestamp, params.societyId, params.name, params.inviteToken, params.publicKey, params.networkAddress].join('\n');
}

export function canonicalTransferData(transfer: {
	id: string;
	fromPrincipal: string;
	toPrincipal: string;
	amount: number;
	timestamp: string;
}): string {
	return [
		transfer.id,
		transfer.fromPrincipal,
		transfer.toPrincipal,
		'federation_credits',
		transfer.amount.toString(),
		transfer.timestamp
	].join('\n');
}

export function signData(data: string, privateKeyB64: string): string {
	const sig = sign(null, Buffer.from(data), {
		key: Buffer.from(privateKeyB64, 'base64'),
		format: 'der',
		type: 'pkcs8'
	});
	return (sig as Buffer).toString('base64');
}

export function signJoinMessage(canonical: string, privateKeyB64: string): string {
	const sig = sign(null, Buffer.from(canonical), {
		key: Buffer.from(privateKeyB64, 'base64'),
		format: 'der',
		type: 'pkcs8'
	});
	return (sig as Buffer).toString('base64');
}

export function verifyJoinMessage(canonical: string, publicKeyB64: string, signatureB64: string): boolean {
	return verify(
		null,
		Buffer.from(canonical),
		{ key: Buffer.from(publicKeyB64, 'base64'), format: 'der', type: 'spki' },
		Buffer.from(signatureB64, 'base64')
	);
}

export function signSocietyRequest(
	canonical: string,
	privateKeyB64: string
): { timestamp: string; signature: string } {
	const timestamp = new Date().toISOString();
	const signature = (
		sign(null, Buffer.from(`${canonical}\n${timestamp}`), {
			key: Buffer.from(privateKeyB64, 'base64'),
			format: 'der',
			type: 'pkcs8'
		}) as Buffer
	).toString('base64');
	return { timestamp, signature };
}

export function verifyFederationRequest(
	body: string,
	timestamp: string,
	signature: string,
	federationPublicKeyB64: string
): boolean {
	const ts = new Date(timestamp).getTime();
	if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) return false;

	try {
		const canonical = `${body}\n${timestamp}`;
		return verify(
			null,
			Buffer.from(canonical),
			{ key: Buffer.from(federationPublicKeyB64, 'base64'), format: 'der', type: 'spki' },
			Buffer.from(signature, 'base64')
		);
	} catch {
		return false;
	}
}
