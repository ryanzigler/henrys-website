import { describe, it, expect, beforeEach, vi } from 'vitest';

const { fakeKv } = await vi.hoisted(async () => {
  const { FakeKV } =
    await vi.importActual<typeof import('@/lib/kv')>('@/lib/kv');
  return { fakeKv: new FakeKV() };
});
vi.mock('@/lib/kv', async () => {
  const actual = await vi.importActual<typeof import('@/lib/kv')>('@/lib/kv');
  return { ...actual, kv: fakeKv };
});

import { createUser } from '@/lib/auth/users';
import { GET } from './route';

function resetKv() {
  (
    fakeKv as unknown as {
      store: Map<string, unknown>;
      sets: Map<string, Set<string>>;
    }
  ).store.clear();
  (fakeKv as unknown as { sets: Map<string, Set<string>> }).sets.clear();
}

describe('GET /api/users', () => {
  beforeEach(() => resetKv());

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
