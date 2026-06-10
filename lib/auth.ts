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
};

export async function getCurrentUser(req?: Request): Promise<CurrentUser | null> {
  let token: string | null = null;
  if (req) {
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    token = match ? match[1] : null;
  } else {
    const cookieStore = await cookies();
    const c = cookieStore.get(SESSION_COOKIE_NAME);
    token = c?.value || null;
  }

  if (!token) return null;
  const user = await getUserBySessionToken(token);
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role } as CurrentUser;
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
