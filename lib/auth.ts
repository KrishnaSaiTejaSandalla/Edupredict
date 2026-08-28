import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { roles, type Role } from '@/types/roles';
import { getUserBySessionToken } from './session';
import { SESSION_COOKIE_NAME } from './env';

export const authConfig = {
  roles,
  defaultRole: 'student' as Role,
};

export function getDefaultUser() {
  return {
    id: 'guest',
    name: 'Guest',
    role: authConfig.defaultRole,
  };
}

type CurrentUser = {
  id: number;
  name: string;
  email?: string;
  role: Role | string;
  profileImageUrl?: string | null;
  school?: {
    id: number;
    name: string;
    logoUrl?: string | null;
  } | null;
};

/**
 * Derives the active user ID from the ep-active-user hint cookie.
 * Format: "role:userId"
 */
function parseActiveUserHint(cookieHeader: string): { role: string; userId: string } | null {
  const match = cookieHeader.match(/ep-active-user=([^;]+)/);
  if (!match) return null;
  const parts = match[1].split(':');
  if (parts.length !== 2) return null;
  return { role: parts[0], userId: parts[1] };
}

export async function getCurrentUser(req?: Request, expectedRole?: Role | string): Promise<CurrentUser | null> {
  let token: string | null = null;
  let role: string | null = expectedRole || null;

  // --- Determine role from request path if not explicitly provided ---
  if (req) {
    if (!role) {
      const url = new URL(req.url);
      const pathname = url.pathname;
      if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) role = 'admin';
      else if (pathname.startsWith('/teacher') || pathname.startsWith('/api/teacher')) role = 'teacher';
      else if (pathname.startsWith('/parent') || pathname.startsWith('/api/parent')) role = 'parent';
      else if (pathname.startsWith('/student') || pathname.startsWith('/api/student')) role = 'student';
    }
  } else if (!role) {
    try {
      const { headers } = await import('next/headers');
      const reqHeaders = await headers();
      const pathname = reqHeaders.get('x-pathname') || '';
      if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) role = 'admin';
      else if (pathname.startsWith('/teacher') || pathname.startsWith('/api/teacher')) role = 'teacher';
      else if (pathname.startsWith('/parent') || pathname.startsWith('/api/parent')) role = 'parent';
      else if (pathname.startsWith('/student') || pathname.startsWith('/api/student')) role = 'student';
    } catch {
      // ignore headers retrieval error outside request contexts
    }
  }

  // --- Resolve session token ---
  if (req) {
    const cookieHeader = req.headers.get('cookie') || '';
    const hint = parseActiveUserHint(cookieHeader);

    // Try the per-user cookie first (new format: edupredict_session_{role}_{userId})
    if (hint && role && hint.role === role) {
      const perUserName = `${SESSION_COOKIE_NAME}_${role}_${hint.userId}`;
      const m = cookieHeader.match(new RegExp(`${perUserName}=([^;]+)`));
      if (m) token = m[1];
    }

    // Fallback: scan all per-user cookies for the expected role
    if (!token && role) {
      const rolePrefix = `${SESSION_COOKIE_NAME}_${role}_`;
      const re = new RegExp(`${rolePrefix}(\\d+)=([^;]+)`);
      const m = cookieHeader.match(re);
      if (m) token = m[2];
    }

    // Legacy fallback: old-style cookie edupredict_session_{role} (no userId)
    if (!token) {
      const possibleRoles = role ? [role] : (expectedRole ? [expectedRole] : ['admin', 'teacher', 'student', 'parent']);
      for (const r of possibleRoles) {
        const legacyCookieName = `${SESSION_COOKIE_NAME}_${r}`;
        const m = cookieHeader.match(new RegExp(`${legacyCookieName}=([^;]+)`));
        if (m) { token = m[1]; break; }
      }
    }
  } else {
    const cookieStore = await cookies();

    // Read ep-active-user hint cookie
    const hint = cookieStore.get('ep-active-user')?.value;
    let hintRole: string | null = null;
    let hintUserId: string | null = null;
    if (hint) {
      const parts = hint.split(':');
      if (parts.length === 2) { hintRole = parts[0]; hintUserId = parts[1]; }
    }

    // Try per-user cookie first
    if (hintRole && hintUserId && (!role || hintRole === role)) {
      const perUserName = `${SESSION_COOKIE_NAME}_${hintRole}_${hintUserId}`;
      token = cookieStore.get(perUserName)?.value || null;
      if (token && !role) role = hintRole;
    }

    // Fallback: scan all cookies for role-prefixed per-user cookie
    if (!token && role) {
      const allCookies = cookieStore.getAll();
      const rolePrefix = `${SESSION_COOKIE_NAME}_${role}_`;
      for (const c of allCookies) {
        if (c.name.startsWith(rolePrefix) && c.value) {
          token = c.value;
          break;
        }
      }
    }

    // Legacy fallback: old-style cookie (role only, no userId)
    if (!token) {
      const possibleRoles = role ? [role] : (expectedRole ? [expectedRole] : ['admin', 'teacher', 'student', 'parent']);
      for (const r of possibleRoles) {
        token = cookieStore.get(`${SESSION_COOKIE_NAME}_${r}`)?.value || null;
        if (token) { if (!role) role = r; break; }
      }
    }
  }

  if (!token) return null;

  const row = await getUserBySessionToken(token);
  if (!row) return null;

  // Security: role from path must match the session's actual user role
  if ((role || expectedRole) && row.role !== (role || expectedRole)) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    profileImageUrl: row.profileImageUrl,
    school: row.schoolId
      ? {
        id: row.schoolId,
        name: row.schoolName ?? '',
        logoUrl: row.schoolLogoUrl ?? null,
      }
      : null,
  };
}

export async function requireAuth(req?: Request) {
  const user = await getCurrentUser(req);
  if (!user) redirect('/login');
  return user;
}

export async function requireRole(role: Role | string, req?: Request) {
  const user = await getCurrentUser(req, role);
  if (!user) redirect('/login');
  if (user.role !== role) redirect('/role-selection');
  return user;
}
