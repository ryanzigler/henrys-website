import { describe, it, expect } from 'vitest';
import { getWebAuthnConfig } from '@/lib/auth/webauthn-config';
import { env } from '@/lib/env';

describe('webauthn-config', () => {
  it('returns config read from the validated env', () => {
    expect(getWebAuthnConfig()).toEqual({
      rpID: env.WEBAUTHN_RP_ID,
      origin: env.WEBAUTHN_ORIGIN,
      rpName: env.WEBAUTHN_RP_NAME,
    });
  });
});
