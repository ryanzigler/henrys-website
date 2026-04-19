import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifyCookieValue } from '@/lib/auth/sessions';

const PUBLIC_PATHS = new Set(['/login', '/register', '/api/users']);

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.has(pathname) || pathname.startsWith('/api/auth/');

export const proxy = (request: NextRequest) => {
  if (isPublic(request.nextUrl.pathname)) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!verifyCookieValue(cookie)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
};

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
