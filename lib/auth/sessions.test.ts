import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clearSessionCookie,
  createSession,
  destroySession,
  getSession,
  getSessionFromCookie,
  setSessionCookie,
  SESSION_TTL_SECONDS,
  verifyCookieValue,
} from '@/lib/auth/sessions';

const { fakeKv } = await vi.hoisted(async () => {
  const { FakeKV } =
    await vi.importActual<typeof import('@/lib/kv.fake')>('@/lib/kv.fake');
  return { fakeKv: new FakeKV() };
});

vi.mock('@/lib/kv', async () => {
  const actual = await vi.importActual<typeof import('@/lib/kv')>('@/lib/kv');
  return { ...actual, kv: fakeKv };
});

const TEST_USER = { id: 'user-1', displayName: 'Henry', emoji: '🦖' };

describe('sessions', () => {
  beforeEach(() => fakeKv.reset());

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

describe('session cookie helpers', () => {
  it('setSessionCookie writes a signed session id that getSessionFromCookie can read', async () => {
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
    await clearSessionCookie();
    expect(await getSessionFromCookie()).toBeNull();
  });
});
