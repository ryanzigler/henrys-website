import { POST } from '@/app/api/auth/register/options/route';
import { saveCredential } from '@/lib/auth/credentials';
import { createUser } from '@/lib/auth/users';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fakeKv } = await vi.hoisted(async () => {
  const { FakeKV } =
    await vi.importActual<typeof import('@/lib/kv.fake')>('@/lib/kv.fake');
  return { fakeKv: new FakeKV() };
});

vi.mock('@/lib/kv', () => ({ kv: fakeKv }));

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'test-admin-secret';

const adminRequest = (body: unknown) =>
  new Request(`http://t/api/auth/register/options?secret=${ADMIN_SECRET}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('POST /api/auth/register/options', () => {
  beforeEach(() => fakeKv.reset());

  it('403 when the admin secret is missing', async () => {
    const response = await POST(
      new Request('http://t/api/auth/register/options', {
        method: 'POST',
        body: JSON.stringify({ userId: 'u_1' }),
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'forbidden' });
  });

  it('400 when the body has neither userId nor signup fields', async () => {
    const response = await POST(adminRequest({}));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'must include { userId } or { username, displayName, emoji }',
    });
  });

  it('404 when userId references a user that does not exist', async () => {
    const response = await POST(adminRequest({ userId: 'u_missing' }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'unknown user' });
  });

  it('200 with challengeId + userId when a userId is provided', async () => {
    const user = await createUser({
      username: 'henry',
      displayName: 'Henry',
      emoji: '🦖',
    });

    const response = await POST(adminRequest({ userId: user.id }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.userId).toBe(user.id);
    expect(body.challengeId).toMatch(/^[0-9a-f]{32}$/);
    expect(typeof body.options.challenge).toBe('string');
  });

  it('200 creates a new user when signup fields are provided', async () => {
    const response = await POST(
      adminRequest({ username: 'nora', displayName: 'Nora', emoji: '🐙' }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.userId).toMatch(/^u_[0-9a-f]{16}$/);
  });

  it('excludes already-registered credentials from the options', async () => {
    const user = await createUser({
      username: 'henry',
      displayName: 'Henry',
      emoji: '🦖',
    });
    await saveCredential({
      id: 'existing-cred',
      userId: user.id,
      publicKey: new Uint8Array([9]),
      counter: 0,
      transports: ['internal'],
    });

    const response = await POST(adminRequest({ userId: user.id }));
    const body = await response.json();
    expect(body.options.excludeCredentials).toMatchObject([
      { id: 'existing-cred', transports: ['internal'] },
    ]);
  });
});
