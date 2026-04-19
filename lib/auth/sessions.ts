import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { kv } from '@/lib/kv';
import { randomToken } from '@/lib/random';

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_COOKIE_NAME = 'session';

export interface SessionRecord {
  userId: string;
  displayName: string;
  emoji: string;
}

const sessionKey = (id: string) => `session:${id}`;

const getSecret = () => {
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) throw new Error('AUTH_COOKIE_SECRET is not set');
  return secret;
};

const sign = (value: string) =>
  createHmac('sha256', getSecret()).update(value).digest('base64url');

const signedCookieValue = (sessionId: string) =>
  `${sessionId}.${sign(sessionId)}`;

export const verifyCookieValue = (cookieValue: string | undefined) => {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf('.');
  if (dot <= 0) return null;

  const sessionId = cookieValue.slice(0, dot);
  const provided = cookieValue.slice(dot + 1);
  const expected = sign(sessionId);

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (
    providedBuffer.length !== expectedBuffer.length
    || !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  return sessionId;
};

export const createSession = async (user: {
  id: string;
  displayName: string;
  emoji: string;
}) => {
  const sessionId = randomToken(32);
  const record: SessionRecord = {
    userId: user.id,
    displayName: user.displayName,
    emoji: user.emoji,
  };
  await kv.set(sessionKey(sessionId), record, { ex: SESSION_TTL_SECONDS });

  return { sessionId, userId: user.id };
};

export const getSession = async (sessionId: string) => {
  if (!sessionId) {
    return null;
  }

  return (await kv.get<SessionRecord>(sessionKey(sessionId))) ?? null;
};

export const destroySession = async (sessionId: string) => {
  if (!sessionId) return;
  await kv.del(sessionKey(sessionId));
};

export const extendSession = async (sessionId: string) => {
  if (!sessionId) return;
  await kv.expire(sessionKey(sessionId), SESSION_TTL_SECONDS);
};

export const setSessionCookie = async (sessionId: string) => {
  const jar = await cookies();

  jar.set({
    name: SESSION_COOKIE_NAME,
    value: signedCookieValue(sessionId),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
};

export const clearSessionCookie = async () => {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
};

export const getSessionIdFromCookie = async () => {
  const jar = await cookies();
  return verifyCookieValue(jar.get(SESSION_COOKIE_NAME)?.value);
};

export const getSessionFromCookie = async () => {
  const sessionId = await getSessionIdFromCookie();
  return sessionId ? getSession(sessionId) : null;
};
