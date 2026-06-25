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

export async function getCurrentUser(req?: Request, expectedRole?: Role | string): Promise<CurrentUser | null> {
  let token: string | null = null;
  let role: string | null = expectedRole || null;

  if (req) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) role = 'admin';
    else if (pathname.startsWith('/teacher') || pathname.startsWith('/api/teacher')) role = 'teacher';
    else if (pathname.startsWith('/parent') || pathname.startsWith('/api/parent')) role = 'parent';
    else if (pathname.startsWith('/student') || pathname.startsWith('/api/student')) role = 'student';
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

  const cookieName = role ? `${SESSION_COOKIE_NAME}_${role}` : SESSION_COOKIE_NAME;

  if (req) {
    const cookie = req.headers.get("cookie") || "";
    let match = cookie.match(new RegExp(`${cookieName}=([^;]+)`));
    if (!match && !role) {
      const possibleRoles = expectedRole ? [expectedRole] : ['admin', 'teacher', 'student', 'parent'];
      for (const r of possibleRoles) {
        match = cookie.match(new RegExp(`${SESSION_COOKIE_NAME}_${r}=([^;]+)`));
        if (match) break;
      }
    }
    token = match ? match[1] : null;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(cookieName)?.value || null;
    if (!token && !role) {
      const possibleRoles = expectedRole ? [expectedRole] : ['admin', 'teacher', 'student', 'parent'];
      for (const r of possibleRoles) {
        token = cookieStore.get(`${SESSION_COOKIE_NAME}_${r}`)?.value || null;
        if (token) break;
      }
    }
  }

  if (!token) return null;

  const row = await getUserBySessionToken(token);
  if (!row) return null;

  // Extra security step: if role context was found in request path, prevent mismatched sessions
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
        name: row.schoolName ?? "",
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
