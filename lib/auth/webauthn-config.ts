import { env } from '@/lib/env';

export const getWebAuthnConfig = () => {
  const isPreviewEnv = env.VERCEL_ENV === 'preview';

  const rpID = isPreviewEnv ? env.VERCEL_BRANCH_URL : env.WEBAUTHN_RP_ID;
  const origin =
    isPreviewEnv ? `https://${env.VERCEL_BRANCH_URL}` : env.WEBAUTHN_ORIGIN;

  if (!origin || !rpID) {
    throw new Error(
      'WebAuthn origin/RP ID not configured. Set WEBAUTHN_ORIGIN and WEBAUTHN_RP_ID, or deploy a Vercel Preview build.',
    );
  }

  return {
    origin,
    rpID,
    rpName: env.WEBAUTHN_RP_NAME,
  };
};
