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
const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:19006',
];

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  // Allow any localhost port during development (Expo web dev server can use varying ports)
  try {
    const url = new URL(origin);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function handleCors(req: NextRequest, response: NextResponse) {
  const origin = req.headers.get('origin');
  if (origin && isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    response.headers.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept, Origin, X-App-Version, X-Platform');
  }
  return response;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/mobile')) {
    if (req.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      return handleCors(req, response);
    }
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);

  if (isPublic(pathname)) {
    let response = NextResponse.next({
      request: {
        headers: requestHeaders,
      }
    });
    if (pathname.startsWith('/api/mobile')) {
      response = handleCors(req, response);
    }
    return response;
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
