import { POST } from '@/app/api/auth/logout/route';
import {
  SESSION_COOKIE_NAME,
  createSession,
  getSession,
  setSessionCookie,
} from '@/lib/auth/sessions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fakeKv } = await vi.hoisted(async () => {
  const { FakeKV } =
    await vi.importActual<typeof import('@/lib/kv.fake')>('@/lib/kv.fake');
  return { fakeKv: new FakeKV() };
});

vi.mock('@/lib/kv', () => ({ kv: fakeKv }));

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

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    fakeKv.reset();
    cookieStore.clear();
  });

  it('200 and clears the cookie when no session cookie is set', async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(cookieStore.has(SESSION_COOKIE_NAME)).toBe(false);
  });

  it('destroys the session record and clears the cookie when one exists', async () => {
    const { sessionId } = await createSession({
      id: 'u_1',
      displayName: 'Henry',
      emoji: '🦖',
    });
    await setSessionCookie(sessionId);
    expect(cookieStore.has(SESSION_COOKIE_NAME)).toBe(true);

    const response = await POST();
    expect(response.status).toBe(200);

    expect(cookieStore.has(SESSION_COOKIE_NAME)).toBe(false);
    expect(await getSession(sessionId)).toBeNull();
  });

  it('still succeeds when the cookie is present but tampered', async () => {
    cookieStore.set(SESSION_COOKIE_NAME, 'bogus.signature');

    const response = await POST();

    expect(response.status).toBe(200);
    expect(cookieStore.has(SESSION_COOKIE_NAME)).toBe(false);
  });
});
