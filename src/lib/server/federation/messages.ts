export type FederationMessageType = 'society_heartbeat' | 'society_join';

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
	publicKey: string;      // base64 DER (spki)
	signature: string;      // base64 Ed25519 signature over canonical join data
	networkAddress: string; // host:port the society listens on, self-reported
	address: string | null;
	lat: number | null;
	lng: number | null;
}

export type FederationMessagePayloadMap = {
	society_heartbeat: SocietyHeartbeatPayload;
	society_join: SocietyJoinPayload;
};

export interface FederationMessageEnvelope<T extends FederationMessageType = FederationMessageType> {
	id: string;
	type: T;
	societyHandle: string;
	payload: FederationMessagePayloadMap[T];
	timestamp: string;
}
