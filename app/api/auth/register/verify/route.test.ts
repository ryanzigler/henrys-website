import { POST } from '@/app/api/auth/register/verify/route';
import { saveChallenge } from '@/lib/auth/challenges';
import { getCredential } from '@/lib/auth/credentials';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fakeKv } = await vi.hoisted(async () => {
  const { FakeKV } =
    await vi.importActual<typeof import('@/lib/kv.fake')>('@/lib/kv.fake');
  return { fakeKv: new FakeKV() };
});

vi.mock('@/lib/kv', () => ({ kv: fakeKv }));

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock('@simplewebauthn/server', async () => {
  const actual = await vi.importActual<typeof import('@simplewebauthn/server')>(
    '@simplewebauthn/server',
  );
  return { ...actual, verifyRegistrationResponse: verifyMock };
});

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'test-admin-secret';
const NEW_CREDENTIAL_ID = 'new-cred';

const adminRequest = (body: unknown) =>
  new Request(`http://t/api/auth/register/verify?secret=${ADMIN_SECRET}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

const stubResponse = { id: NEW_CREDENTIAL_ID } as never;

describe('POST /api/auth/register/verify', () => {
  beforeEach(() => {
    fakeKv.reset();
    verifyMock.mockReset();
  });

  it('403 when the admin secret is missing', async () => {
    const response = await POST(
      new Request('http://t/api/auth/register/verify', {
        method: 'POST',
        body: JSON.stringify({ challengeId: 'x', response: stubResponse }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it('400 when challengeId or response is missing', async () => {
    const response = await POST(adminRequest({}));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'challengeId and response required',
    });
  });

  it('400 when the challenge is not found', async () => {
    const response = await POST(
      adminRequest({ challengeId: 'nope', response: stubResponse }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'challenge not found or expired',
    });
  });

  it('400 when the stored challenge is for login, not register', async () => {
    const { challengeId } = await saveChallenge({
      challenge: 'x',
      userId: 'u_1',
      kind: 'login',
    });

    const response = await POST(
      adminRequest({ challengeId, response: stubResponse }),
    );
    expect(response.status).toBe(400);
  });

  it('400 when the registration is not verified', async () => {
    const { challengeId } = await saveChallenge({
      challenge: 'x',
      userId: 'u_1',
      kind: 'register',
    });
    verifyMock.mockResolvedValueOnce({ verified: false });

    const response = await POST(
      adminRequest({ challengeId, response: stubResponse }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'registration not verified',
    });
  });

  it('200 persists the credential on a successful verification', async () => {
    const { challengeId } = await saveChallenge({
      challenge: 'x',
      userId: 'u_new',
      kind: 'register',
    });
    verifyMock.mockResolvedValueOnce({
      verified: true,
      registrationInfo: {
        credential: {
          id: NEW_CREDENTIAL_ID,
          publicKey: new Uint8Array([7, 8, 9]),
          counter: 0,
          transports: ['internal'],
        },
      },
    });

    const response = await POST(
      adminRequest({ challengeId, response: stubResponse }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, userId: 'u_new' });

    const stored = await getCredential(NEW_CREDENTIAL_ID);
    expect(stored).not.toBeNull();
    expect(stored?.userId).toBe('u_new');
    expect(stored?.counter).toBe(0);
    expect(Array.from(stored?.publicKey ?? [])).toEqual([7, 8, 9]);
    expect(stored?.transports).toEqual(['internal']);
  });
});
