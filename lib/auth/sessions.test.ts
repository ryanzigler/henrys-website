import { describe, it, expect, beforeEach, vi } from 'vitest';

const { fakeKv } = await vi.hoisted(async () => {
  const { FakeKV } = await vi.importActual<typeof import('../kv')>('../kv');
  return { fakeKv: new FakeKV() };
});
vi.mock('../kv', async () => {
  const actual = await vi.importActual<typeof import('../kv')>('../kv');
  return { ...actual, kv: fakeKv };
});

import {
  createSession,
  getSession,
  destroySession,
  SESSION_TTL_SECONDS,
} from './sessions';

describe('sessions', () => {
  beforeEach(async () => {
    await fakeKv.del(...['session:dummy']);
    // clear everything in-memory by creating a new store
    (fakeKv as unknown as { store: Map<string, unknown> }).store.clear();
  });

  it('createSession stores a record and returns an ID', async () => {
    const { sessionId, userId } = await createSession('user-1');
    expect(sessionId).toMatch(/^[0-9a-f]{64}$/);
    expect(userId).toBe('user-1');

    const rec = await getSession(sessionId);
    expect(rec).toEqual({ userId: 'user-1', expiresAt: expect.any(Number) });
  });

  it('getSession returns null for an unknown id', async () => {
    expect(await getSession('nope')).toBeNull();
  });

  it('destroySession removes the record', async () => {
    const { sessionId } = await createSession('user-1');
    await destroySession(sessionId);
    expect(await getSession(sessionId)).toBeNull();
  });

  it('session TTL is 30 days', () => {
    expect(SESSION_TTL_SECONDS).toBe(60 * 60 * 24 * 30);
  });
});
