import { describe, it, expect, afterEach } from 'vitest';
import { getWebAuthnConfig } from '@/lib/auth/webauthn-config';

describe('webauthn-config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns config read from environment variables', () => {
    process.env.WEBAUTHN_RP_ID = 'henrys.example.com';
    process.env.WEBAUTHN_ORIGIN = 'https://henrys.example.com';
    process.env.WEBAUTHN_RP_NAME = "Henry's Site";
    expect(getWebAuthnConfig()).toEqual({
      rpID: 'henrys.example.com',
      origin: 'https://henrys.example.com',
      rpName: "Henry's Site",
    });
  });

  it('throws when required vars are missing', () => {
    delete process.env.WEBAUTHN_RP_ID;
    delete process.env.WEBAUTHN_ORIGIN;
    delete process.env.WEBAUTHN_RP_NAME;
    expect(() => getWebAuthnConfig()).toThrow(/WEBAUTHN_RP_ID/);
  });
});
