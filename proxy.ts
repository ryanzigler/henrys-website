import { NextResponse, type NextRequest } from 'next/server';
import { getSession, SESSION_COOKIE_NAME } from '@/lib/auth/sessions';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/users',
  '/api/auth/login/options',
  '/api/auth/login/verify',
  '/api/auth/register/options',
  '/api/auth/register/verify',
  '/api/auth/logout',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const record = sessionId ? await getSession(sessionId) : null;

  if (!record) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except Next static assets and the favicon
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
