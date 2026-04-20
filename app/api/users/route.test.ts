import { GET } from '@/app/api/users/route';
import { createUser } from '@/lib/auth/users';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fakeKv } = await vi.hoisted(async () => {
  const { FakeKV } =
    await vi.importActual<typeof import('@/lib/kv.fake')>('@/lib/kv.fake');

  return { fakeKv: new FakeKV() };
});

vi.mock('@/lib/kv', async () => {
  const actual = await vi.importActual<typeof import('@/lib/kv')>('@/lib/kv');
  return { ...actual, kv: fakeKv };
});

describe('GET /api/users', () => {
  beforeEach(() => fakeKv.reset());

  it('returns empty array when no users exist', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ users: [] });
  });

  it('returns all users with hasPasskey=false initially', async () => {
    await createUser({ username: 'henry', displayName: 'Henry', emoji: '🦖' });

    const res = await GET();
    const body = await res.json();

    expect(body.users).toHaveLength(1);
    expect(body.users[0]).toMatchObject({
      displayName: 'Henry',
      emoji: '🦖',
      hasPasskey: false,
    });
  });
});
