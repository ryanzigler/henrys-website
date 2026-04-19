import { NextResponse } from 'next/server';
import {
  clearSessionCookie,
  destroySession,
  getSessionIdFromCookie,
} from '@/lib/auth/sessions';

export const POST = async () => {
  const sessionId = await getSessionIdFromCookie();

  if (sessionId) {
    await destroySession(sessionId);
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
};
