import { NextResponse } from 'next/server';
import { deleteSessionByToken } from '@/lib/session';
import { SESSION_COOKIE_NAME } from '@/lib/env';

export async function POST(req: Request) {
  const { role } = await req.json().catch(() => ({}));
  const cookieName = role ? `${SESSION_COOKIE_NAME}_${role}` : SESSION_COOKIE_NAME;
  const roleHintName = role ? `ep-role_${role}` : 'ep-role';

  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`${cookieName}=([^;]+)`));
  const token = match ? match[1] : null;
  if (token) await deleteSessionByToken(token);

  const res = NextResponse.json({ ok: true });
  const expiredOpts = { path: '/', maxAge: 0, secure: process.env.NODE_ENV === 'production' } as const;

  if (role) {
    res.cookies.set({ name: cookieName, value: '', httpOnly: true, ...expiredOpts });
    res.cookies.set({ name: roleHintName, value: '', httpOnly: false, ...expiredOpts });
  } else {
    const roles = ['admin', 'teacher', 'student', 'parent'];
    for (const r of roles) {
      res.cookies.set({ name: `${SESSION_COOKIE_NAME}_${r}`, value: '', httpOnly: true, ...expiredOpts });
      res.cookies.set({ name: `ep-role_${r}`, value: '', httpOnly: false, ...expiredOpts });
    }
    res.cookies.set({ name: SESSION_COOKIE_NAME, value: '', httpOnly: true, ...expiredOpts });
    res.cookies.set({ name: 'ep-role', value: '', httpOnly: false, ...expiredOpts });
  }
  return res;
}

