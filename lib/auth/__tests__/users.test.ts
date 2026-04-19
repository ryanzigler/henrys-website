import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createUser,
  getUser,
  listUsers,
  getPublicUsers,
} from '@/lib/auth/users';

const { fakeKv } = await vi.hoisted(async () => {
  const { FakeKV } =
    await vi.importActual<typeof import('@/lib/kv.fake')>('@/lib/kv.fake');
  return { fakeKv: new FakeKV() };
});

vi.mock('@/lib/kv', async () => {
  const actual = await vi.importActual<typeof import('@/lib/kv')>('@/lib/kv');
  return { ...actual, kv: fakeKv };
});

describe('users', () => {
  beforeEach(() => fakeKv.reset());

  it('createUser persists and can be read back', async () => {
    const u = await createUser({
      username: 'henry',
      displayName: 'Henry',
      emoji: '🦖',
    });
    expect(u.id).toMatch(/^u_[0-9a-f]{16}$/);
    expect(u.username).toBe('henry');
    const got = await getUser(u.id);
    expect(got).toEqual(u);
  });

  it('listUsers returns every created user', async () => {
    await createUser({ username: 'a', displayName: 'A', emoji: '🅰️' });
    await createUser({ username: 'b', displayName: 'B', emoji: '🅱️' });
    const list = await listUsers();
    expect(list).toHaveLength(2);
  });

  it('getPublicUsers omits sensitive fields', async () => {
    const u = await createUser({
      username: 'henry',
      displayName: 'Henry',
      emoji: '🦖',
    });
    const pub = await getPublicUsers();
    expect(pub).toEqual([
      { id: u.id, displayName: 'Henry', emoji: '🦖', hasPasskey: false },
    ]);
  });

  it('createUser rejects duplicate usernames', async () => {
    await createUser({ username: 'henry', displayName: 'Henry', emoji: '🦖' });
    await expect(
      createUser({ username: 'henry', displayName: 'H2', emoji: '🐲' }),
    ).rejects.toThrow(/already exists/);
  });
});
