import { describe, it, expect, beforeEach, vi } from 'vitest';

const { fakeKv } = await vi.hoisted(async () => {
  const { FakeKV } = await vi.importActual<typeof import('../kv')>('../kv');
  return { fakeKv: new FakeKV() };
});
vi.mock('../kv', async () => {
  const actual = await vi.importActual<typeof import('../kv')>('../kv');
  return { ...actual, kv: fakeKv };
});

import { createUser, getUser, listUsers, getPublicUsers } from './users';

function resetKv() {
  (
    fakeKv as unknown as {
      store: Map<string, unknown>;
      sets: Map<string, Set<string>>;
    }
  ).store.clear();
  (fakeKv as unknown as { sets: Map<string, Set<string>> }).sets.clear();
}

describe('users', () => {
  beforeEach(() => resetKv());

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
