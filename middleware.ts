import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/env';

const publicPaths = ['/', '/login', '/register', '/role-selection', '/api', '/_next', '/public', '/favicon.ico'];

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
  ...(process.env.CORS_ALLOWED_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean),
];

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  // Expo web development can use varying localhost ports. Never extend this
  // exception to production authenticated APIs.
  if (process.env.NODE_ENV === 'production') return false;
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

function isUnsafeMethod(method: string) {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

function hasTrustedOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  // Non-browser clients without Origin (the authenticated driver API) are
  // authenticated separately with bearer tokens. Browser requests must match.
  if (!origin) return true;
  return origin === req.nextUrl.origin || isAllowedOrigin(origin);
}

type Limit = { max: number; windowSeconds: number };

function limitFor(pathname: string): Limit {
  if (pathname === '/api/auth/login' || pathname === '/api/auth/register' || pathname === '/api/mobile/driver/login') return { max: 5, windowSeconds: 60 };
  if (pathname.includes('/ai/') || pathname === '/api/student/ai-resources') return { max: 10, windowSeconds: 60 };
  if (pathname.includes('/upload') || pathname.includes('/profile/photo')) return { max: 20, windowSeconds: 60 };
  return { max: 120, windowSeconds: 60 };
}

async function isRateLimited(req: NextRequest): Promise<{ limited: boolean; retryAfter?: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  // Upstash is a shared, serverless-safe store. No in-memory fallback is used;
  // deployments must configure it to enforce distributed limits.
  if (!url || !token) return { limited: false };

  const { max, windowSeconds } = limitFor(req.nextUrl.pathname);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const bucket = `${req.nextUrl.pathname}:${ip}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  try {
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', bucket], ['EXPIRE', bucket, String(windowSeconds), 'NX']]),
    });
    if (!response.ok) return { limited: false };
    const data = await response.json() as Array<{ result?: number }>;
    return { limited: Number(data?.[0]?.result ?? 0) > max, retryAfter: windowSeconds };
  } catch {
    // Availability failures must not expose internals or block school workflows.
    return { limited: false };
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);

  if (pathname.startsWith('/api/mobile')) {
    if (req.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      return handleCors(req, response);
    }
  }

  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/mobile') && isUnsafeMethod(req.method) && !hasTrustedOrigin(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  // Middleware is async-capable; this promise is handled below through the
  // request path so all API routes receive the same policy.
  if (pathname.startsWith('/api/')) {
    return applyApiGuards(req, pathname, requestHeaders);
  }

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
    // Read the active-user hint to find which per-user cookie to check
    const activeUserHint = req.cookies.get('ep-active-user')?.value;
    let sessionToken: string | undefined;

    if (activeUserHint) {
      const [hintRole, hintUserId] = activeUserHint.split(':');
      if (hintRole === requiredRole && hintUserId) {
        // New format: edupredict_session_{role}_{userId}
        sessionToken = req.cookies.get(`${SESSION_COOKIE_NAME}_${requiredRole}_${hintUserId}`)?.value;
      }
    }

    // Fallback: scan cookies for any per-user cookie matching this role
    if (!sessionToken) {
      const rolePrefix = `${SESSION_COOKIE_NAME}_${requiredRole}_`;
      const allCookies = req.cookies.getAll();
      for (const c of allCookies) {
        if (c.name.startsWith(rolePrefix) && c.value) {
          sessionToken = c.value;
          break;
        }
      }
    }

    // Legacy fallback: old-style edupredict_session_{role} (no userId)
    if (!sessionToken) {
      sessionToken = req.cookies.get(`${SESSION_COOKIE_NAME}_${requiredRole}`)?.value;
    }

    if (!sessionToken) {
      // No session cookie for this role → redirect to login
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    }
  });
}

async function applyApiGuards(req: NextRequest, pathname: string, requestHeaders: Headers) {
  const rate = await isRateLimited(req);
  if (rate.limited) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter ?? 60) } },
    );
  }
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return pathname.startsWith('/api/mobile') ? handleCors(req, response) : response;
}

export const config = {
  matcher: ['/', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
