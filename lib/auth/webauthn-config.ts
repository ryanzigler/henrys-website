import { env } from '@/lib/env';

export const getWebAuthnConfig = () => ({
  rpID: env.WEBAUTHN_RP_ID,
  origin: env.WEBAUTHN_ORIGIN,
  rpName: env.WEBAUTHN_RP_NAME,
});
