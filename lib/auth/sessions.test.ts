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
  verifyCookieValue,
  SESSION_TTL_SECONDS,
} from './sessions';

const TEST_USER = { id: 'user-1', displayName: 'Henry', emoji: '🦖' };

const resetKv = () => {
  (fakeKv as unknown as { store: Map<string, unknown> }).store.clear();
  (fakeKv as unknown as { sets: Map<string, Set<string>> }).sets.clear();
};

describe('sessions', () => {
  beforeEach(resetKv);

  it('createSession stores a denormalized record and returns an ID', async () => {
    const { sessionId, userId } = await createSession(TEST_USER);
    expect(sessionId).toMatch(/^[0-9a-f]{64}$/);
    expect(userId).toBe('user-1');

    expect(await getSession(sessionId)).toEqual({
      userId: 'user-1',
      displayName: 'Henry',
      emoji: '🦖',
    });
  });

  it('getSession returns null for an unknown id', async () => {
    expect(await getSession('nope')).toBeNull();
  });

  it('destroySession removes the record', async () => {
    const { sessionId } = await createSession(TEST_USER);
    await destroySession(sessionId);
    expect(await getSession(sessionId)).toBeNull();
  });

  it('session TTL is 30 days', () => {
    expect(SESSION_TTL_SECONDS).toBe(60 * 60 * 24 * 30);
  });
});

describe('verifyCookieValue', () => {
  it('accepts a cookie signed with the current secret', async () => {
    const { setSessionCookie } = await import('./sessions');
    const { sessionId } = await createSession(TEST_USER);
    await setSessionCookie(sessionId);
    const stored = cookieStore.get('session');
    expect(verifyCookieValue(stored)).toBe(sessionId);
  });

  it('rejects a tampered cookie', () => {
    expect(verifyCookieValue('abc.deadbeef')).toBeNull();
  });

  it('rejects a malformed cookie', () => {
    expect(verifyCookieValue('no-dot-here')).toBeNull();
    expect(verifyCookieValue('')).toBeNull();
    expect(verifyCookieValue(undefined)).toBeNull();
  });
});

const cookieStore = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const v = cookieStore.get(name);
      return v ? { name, value: v } : undefined;
    },
    set: (
      nameOrObj: string | { name: string; value: string },
      value?: string,
    ) => {
      if (typeof nameOrObj === 'string')
        cookieStore.set(nameOrObj, value ?? '');
      else cookieStore.set(nameOrObj.name, nameOrObj.value);
    },
    delete: (name: string) => cookieStore.delete(name),
  }),
}));

describe('session cookie helpers', () => {
  it('setSessionCookie writes a signed session id that getSessionFromCookie can read', async () => {
    const { setSessionCookie, getSessionFromCookie, createSession } =
      await import('./sessions');
    const { sessionId } = await createSession({
      id: 'user-2',
      displayName: 'Two',
      emoji: '🥈',
    });
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
