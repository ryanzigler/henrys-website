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

vi.mock('next/headers', () => {
  const store = new Map<string, string>();
  return {
    cookies: async () => ({
      get: (name: string) => {
        const v = store.get(name);
        return v ? { name, value: v } : undefined;
      },
      set: (
        nameOrObj: string | { name: string; value: string },
        value?: string,
      ) => {
        if (typeof nameOrObj === 'string') store.set(nameOrObj, value ?? '');
        else store.set(nameOrObj.name, nameOrObj.value);
      },
      delete: (name: string) => store.delete(name),
      _store: store,
    }),
  };
});

describe('session cookie helpers', () => {
  it('setSessionCookie writes the session id', async () => {
    const { setSessionCookie, getSessionFromCookie, createSession } =
      await import('./sessions');
    const { sessionId } = await createSession('user-2');
    await setSessionCookie(sessionId);
    const record = await getSessionFromCookie();
    expect(record?.userId).toBe('user-2');
  });

  it('clearSessionCookie removes it', async () => {
    const { clearSessionCookie, getSessionFromCookie } =
      await import('./sessions');
    await clearSessionCookie();
    expect(await getSessionFromCookie()).toBeNull();
  });
});
