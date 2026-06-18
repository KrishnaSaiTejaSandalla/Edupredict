import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/env';

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

/**
 * Fast middleware — zero async I/O on every navigation.
 *
 * Strategy:
 *   1. Public paths → pass through immediately.
 *   2. Protected paths → check role-specific `edupredict_session_[role]` cookie for *existence*
 *      (presence = has ever logged in; actual validity checked by the layout's requireRole()).
 *   3. Role mismatch → check role-specific hint cookie.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);

  if (isPublic(pathname)) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    });
  }

  const requiredRole = requiredRoleForPath(pathname);
  if (requiredRole) {
    const sessionToken = req.cookies.get(`${SESSION_COOKIE_NAME}_${requiredRole}`)?.value;
    if (!sessionToken) {
      // No session cookie for this role -> redirect to login immediately
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const roleHint = req.cookies.get(`ep-role_${requiredRole}`)?.value;
    if (roleHint && roleHint !== requiredRole) {
      // Role mismatch detected by fast-path hint → redirect to role selection
      return NextResponse.redirect(new URL('/role-selection', req.url));
    }
  } else {
    const hasAnySession = ['admin', 'teacher', 'student', 'parent'].some(role => 
      req.cookies.has(`${SESSION_COOKIE_NAME}_${role}`)
    );
    if (!hasAnySession && pathname === '/') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    }
  });
}

export const config = {
  matcher: ['/', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
