export type FederationMessageType = 'person_joined' | 'society_heartbeat' | 'society_join' | 'slip_presented' | 'transfer_requested';

export interface PersonJoinedPayload {
	personHandle: string;
	personId: string;
	age: number;
	publicKey: string | null;
}

export interface SocietyHeartbeatPayload {
	societyId: string;
	name: string;
	handle: string;
	address: string | null;
	lat: number | null;
	lng: number | null;
	memberCount: number;
}

export interface SocietyJoinPayload {
	societyId: string;
	name: string;
	inviteToken: string;
	publicKey: string;   // base64 DER (spki)
	signature: string;   // base64 Ed25519 signature over canonical join data
}

export interface SlipPresentedPayload {
	fromPrincipal: string;
	toPrincipal: string;
	amount: number;
}

export interface TransferRequestedPayload {
	fromPrincipal: string;
	toPrincipal: string;
	amount: number;
	timestamp: string;
	signature: string;
}

export type FederationMessagePayloadMap = {
	person_joined: PersonJoinedPayload;
	society_heartbeat: SocietyHeartbeatPayload;
	society_join: SocietyJoinPayload;
	slip_presented: SlipPresentedPayload;
	transfer_requested: TransferRequestedPayload;
};

export interface FederationMessageEnvelope<T extends FederationMessageType = FederationMessageType> {
	id: string;
	type: T;
	societyHandle: string;
	payload: FederationMessagePayloadMap[T];
	timestamp: string;
}
