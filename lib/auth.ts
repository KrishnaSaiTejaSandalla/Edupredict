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

export async function getCurrentUser(req?: Request): Promise<CurrentUser | null> {
  let token: string | null = null;

  if (req) {
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    token = match ? match[1] : null;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  }

  if (!token) return null;

  const row = await getUserBySessionToken(token);
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    profileImageUrl: row.profileImageUrl,

    // 🔥 FORCE mapping here (DO NOT rely on nested object from session layer)
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
  const user = await getCurrentUser(req);
  if (!user) redirect('/login');
  if (user.role !== role) redirect('/role-selection');
  return user;
}
