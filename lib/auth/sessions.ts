import { cookies } from 'next/headers';
import { kv } from '../kv';
import { randomToken } from '../random';

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_COOKIE_NAME = 'session';

export type SessionRecord = {
  userId: string;
  expiresAt: number;
};

function sessionKey(id: string): string {
  return `session:${id}`;
}

export async function createSession(
  userId: string,
): Promise<{ sessionId: string; userId: string }> {
  const sessionId = randomToken(32);
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  await kv.set(
    sessionKey(sessionId),
    { userId, expiresAt } satisfies SessionRecord,
    {
      ex: SESSION_TTL_SECONDS,
    },
  );
  return { sessionId, userId };
}

export async function getSession(
  sessionId: string,
): Promise<SessionRecord | null> {
  if (!sessionId) return null;
  return (await kv.get<SessionRecord>(sessionKey(sessionId))) ?? null;
}

export async function destroySession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  await kv.del(sessionKey(sessionId));
}

export async function extendSession(sessionId: string): Promise<void> {
  const rec = await getSession(sessionId);
  if (!rec) return;
  rec.expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  await kv.set(sessionKey(sessionId), rec, { ex: SESSION_TTL_SECONDS });
}

export async function setSessionCookie(sessionId: string): Promise<void> {
  const jar = await cookies();
  jar.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
}

export async function getSessionFromCookie(): Promise<SessionRecord | null> {
  const jar = await cookies();
  const c = jar.get(SESSION_COOKIE_NAME);
  if (!c?.value) return null;
  return getSession(c.value);
}
