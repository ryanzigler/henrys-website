import { POST } from '@/app/api/auth/login/options/route';
import { saveCredential } from '@/lib/auth/credentials';
import { createUser } from '@/lib/auth/users';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fakeKv } = await vi.hoisted(async () => {
  const { FakeKV } =
    await vi.importActual<typeof import('@/lib/kv.fake')>('@/lib/kv.fake');
  return { fakeKv: new FakeKV() };
});

vi.mock('@/lib/kv', () => ({ kv: fakeKv }));

const jsonRequest = (body: unknown) =>
  new Request('http://t/api/auth/login/options', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('POST /api/auth/login/options', () => {
  beforeEach(() => fakeKv.reset());

  it('400 when userId is missing', async () => {
    const response = await POST(
      new Request('http://t/api/auth/login/options', { method: 'POST' }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'userId required' });
  });

  it('404 when user does not exist', async () => {
    const response = await POST(jsonRequest({ userId: 'u_missing' }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'unknown user' });
  });

  it('409 when the user has no registered credentials', async () => {
    const user = await createUser({
      username: 'nora',
      displayName: 'Nora',
      emoji: '🐙',
    });

    const response = await POST(jsonRequest({ userId: user.id }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'no passkeys registered for this user',
    });
  });

  it('200 with challengeId and options when the user has credentials', async () => {
    const user = await createUser({
      username: 'henry',
      displayName: 'Henry',
      emoji: '🦖',
    });
    await saveCredential({
      id: 'cred-1',
      userId: user.id,
      publicKey: new Uint8Array([1, 2, 3]),
      counter: 0,
      transports: ['internal'],
    });

    const response = await POST(jsonRequest({ userId: user.id }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.challengeId).toMatch(/^[0-9a-f]{32}$/);
    expect(typeof body.options.challenge).toBe('string');
    expect(body.options.allowCredentials).toMatchObject([
      { id: 'cred-1', transports: ['internal'] },
    ]);
  });
});
