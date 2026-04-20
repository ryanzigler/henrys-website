import { POST } from '@/app/api/auth/login/verify/route';
import { saveChallenge } from '@/lib/auth/challenges';
import { getCredential, saveCredential } from '@/lib/auth/credentials';
import { SESSION_COOKIE_NAME, getSessionFromCookie } from '@/lib/auth/sessions';
import { createUser } from '@/lib/auth/users';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fakeKv } = await vi.hoisted(async () => {
  const { FakeKV } =
    await vi.importActual<typeof import('@/lib/kv.fake')>('@/lib/kv.fake');
  return { fakeKv: new FakeKV() };
});

vi.mock('@/lib/kv', () => ({ kv: fakeKv }));

const cookieStore = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    delete: (name: string) => cookieStore.delete(name),
    get: (name: string) => {
      const value = cookieStore.get(name);
      return value ? { name, value } : undefined;
    },
    set: (
      nameOrObj: string | { name: string; value: string },
      value?: string,
    ) => {
      if (typeof nameOrObj === 'string')
        cookieStore.set(nameOrObj, value ?? '');
      else cookieStore.set(nameOrObj.name, nameOrObj.value);
    },
  }),
}));

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock('@simplewebauthn/server', async () => {
  const actual = await vi.importActual<typeof import('@simplewebauthn/server')>(
    '@simplewebauthn/server',
  );
  return { ...actual, verifyAuthenticationResponse: verifyMock };
});

const CREDENTIAL_ID = 'cred-login';

const seedLoginChallenge = async (userId: string) => {
  const { challengeId } = await saveChallenge({
    challenge: 'login-challenge',
    userId,
    kind: 'login',
  });
  return challengeId;
};

const seedUserAndCredential = async () => {
  const user = await createUser({
    username: 'henry',
    displayName: 'Henry',
    emoji: '🦖',
  });
  await saveCredential({
    id: CREDENTIAL_ID,
    userId: user.id,
    publicKey: new Uint8Array([1, 2, 3]),
    counter: 0,
    transports: ['internal'],
  });
  return user;
};

const jsonRequest = (body: unknown) =>
  new Request('http://t/api/auth/login/verify', {
    method: 'POST',
    body: JSON.stringify(body),
  });

const stubResponse = { id: CREDENTIAL_ID } as never;

describe('POST /api/auth/login/verify', () => {
  beforeEach(() => {
    fakeKv.reset();
    cookieStore.clear();
    verifyMock.mockReset();
  });

  it('400 when challengeId or response is missing', async () => {
    const response = await POST(jsonRequest({}));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'challengeId and response required',
    });
  });

  it('400 when the challenge is not found', async () => {
    const response = await POST(
      jsonRequest({ challengeId: 'does-not-exist', response: stubResponse }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'challenge not found or expired',
    });
  });

  it('400 when the stored challenge is for registration, not login', async () => {
    const { challengeId } = await saveChallenge({
      challenge: 'x',
      userId: 'u_1',
      kind: 'register',
    });

    const response = await POST(
      jsonRequest({ challengeId, response: stubResponse }),
    );
    expect(response.status).toBe(400);
  });

  it('400 when the credential id is unknown', async () => {
    const user = await seedUserAndCredential();
    const challengeId = await seedLoginChallenge(user.id);

    const response = await POST(
      jsonRequest({ challengeId, response: { id: 'missing-cred' } }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'unknown credential' });
  });

  it('400 when the credential belongs to another user', async () => {
    await seedUserAndCredential();
    const other = await createUser({
      username: 'nora',
      displayName: 'Nora',
      emoji: '🐙',
    });
    const challengeId = await seedLoginChallenge(other.id);

    const response = await POST(
      jsonRequest({ challengeId, response: stubResponse }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'unknown credential' });
  });

  it('400 when verifyAuthenticationResponse throws', async () => {
    const user = await seedUserAndCredential();
    const challengeId = await seedLoginChallenge(user.id);
    verifyMock.mockRejectedValueOnce(new Error('bad signature'));

    const response = await POST(
      jsonRequest({ challengeId, response: stubResponse }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'verification failed: bad signature',
    });
  });

  it('400 when verification returns verified=false', async () => {
    const user = await seedUserAndCredential();
    const challengeId = await seedLoginChallenge(user.id);
    verifyMock.mockResolvedValueOnce({
      verified: false,
      authenticationInfo: { newCounter: 0 },
    });

    const response = await POST(
      jsonRequest({ challengeId, response: stubResponse }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'not verified' });
  });

  it('200 updates the counter and sets a session cookie on success', async () => {
    const user = await seedUserAndCredential();
    const challengeId = await seedLoginChallenge(user.id);
    verifyMock.mockResolvedValueOnce({
      verified: true,
      authenticationInfo: { newCounter: 42 },
    });

    const response = await POST(
      jsonRequest({ challengeId, response: stubResponse }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const refreshed = await getCredential(CREDENTIAL_ID);
    expect(refreshed?.counter).toBe(42);

    expect(cookieStore.get(SESSION_COOKIE_NAME)).toBeTruthy();

    const session = await getSessionFromCookie();
    expect(session?.userId).toBe(user.id);
  });
});
