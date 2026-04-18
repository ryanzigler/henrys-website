export type WebAuthnConfig = {
  rpID: string;
  origin: string;
  rpName: string;
};

export function getWebAuthnConfig(): WebAuthnConfig {
  const rpID = process.env.WEBAUTHN_RP_ID;
  const origin = process.env.WEBAUTHN_ORIGIN;
  const rpName = process.env.WEBAUTHN_RP_NAME;
  if (!rpID) throw new Error('WEBAUTHN_RP_ID is not set');
  if (!origin) throw new Error('WEBAUTHN_ORIGIN is not set');
  if (!rpName) throw new Error('WEBAUTHN_RP_NAME is not set');
  return { rpID, origin, rpName };
}
