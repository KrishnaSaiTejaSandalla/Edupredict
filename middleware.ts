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
 *   2. Protected paths → check `edupredict_session` cookie for *existence*
 *      (presence = has ever logged in; actual validity checked by the layout's requireRole()).
 *   3. Role mismatch → check `ep-role` cookie (set at login/register, cleared at logout).
 *      This is a non-sensitive hint cookie — real role enforcement is in requireRole().
 *
 * Why this is safe:
 *   - The httpOnly `edupredict_session` token is still validated against the DB in every
 *     server component via `requireRole()`. Middleware only does a coarse pre-check to
 *     avoid redundant redirects to /login for clearly-unauthenticated requests.
 *   - `ep-role` is a hint, not a grant. Even if tampered, the page-level `requireRole`
 *     will catch the mismatch before any data is returned.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    // No session cookie at all → redirect to login immediately
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const requiredRole = requiredRoleForPath(pathname);
  if (requiredRole) {
    const roleHint = req.cookies.get('ep-role')?.value;
    if (roleHint && roleHint !== requiredRole) {
      // Role mismatch detected by fast-path hint → redirect to role selection
      return NextResponse.redirect(new URL('/role-selection', req.url));
    }
    // No role hint (legacy session before this change) → let the layout handle it
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
