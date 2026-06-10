import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/register', '/role-selection', '/api', '/_next', '/public', '/favicon.ico'];

function isPublic(path: string) {
  return publicPaths.some((p) => path === p || path.startsWith(p));
}

function requiredRoleForPath(path: string): string | null {
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/teacher')) return 'teacher';
  if (path.startsWith('/parent')) return 'parent';
  if (path.startsWith('/student')) return 'student';
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  // Forward cookies to our auth API to validate session and role
  const origin = req.nextUrl.origin;
  const resp = await fetch(origin + '/api/auth/me', { headers: { cookie: req.headers.get('cookie') || '' } });
  if (!resp.ok) return NextResponse.redirect(new URL('/login', req.url));
  const data = await resp.json();
  const user = data.user;
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  const required = requiredRoleForPath(pathname);
  if (required && user.role !== required) {
    return NextResponse.redirect(new URL('/role-selection', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
