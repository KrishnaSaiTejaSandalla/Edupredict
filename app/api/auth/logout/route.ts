import { NextResponse } from 'next/server';
import { deleteSessionByToken } from '@/lib/session';
import { SESSION_COOKIE_NAME } from '@/lib/env';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const role: string | undefined = body?.role;
  const userId: string | number | undefined = body?.userId;

  const expiredOpts = { path: '/', maxAge: 0, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const };

  const res = NextResponse.json({ ok: true });

  const cookie = req.headers.get('cookie') || '';

  if (role && userId) {
    // New format: per-user cookie
    const sessionCookieName = `${SESSION_COOKIE_NAME}_${role}_${userId}`;
    const match = cookie.match(new RegExp(`${sessionCookieName}=([^;]+)`));
    const token = match ? match[1] : null;
    if (token) await deleteSessionByToken(token);

    res.cookies.set({ name: sessionCookieName, value: '', httpOnly: true, ...expiredOpts });
    res.cookies.set({ name: `ep-active-user`, value: '', httpOnly: false, ...expiredOpts });
  } else if (role) {
    // Try per-user cookie (scan)
    const rolePrefix = `${SESSION_COOKIE_NAME}_${role}_`;
    const re = new RegExp(`(${rolePrefix}\\d+)=([^;]+)`, 'g');
    let m;
    while ((m = re.exec(cookie)) !== null) {
      await deleteSessionByToken(m[2]);
      res.cookies.set({ name: m[1], value: '', httpOnly: true, ...expiredOpts });
    }
    // Legacy: old format without userId
    const legacyName = `${SESSION_COOKIE_NAME}_${role}`;
    const legacyMatch = cookie.match(new RegExp(`${legacyName}=([^;]+)`));
    if (legacyMatch) await deleteSessionByToken(legacyMatch[1]);
    res.cookies.set({ name: legacyName, value: '', httpOnly: true, ...expiredOpts });
    res.cookies.set({ name: `ep-role_${role}`, value: '', httpOnly: false, ...expiredOpts });
    res.cookies.set({ name: `ep-active-user`, value: '', httpOnly: false, ...expiredOpts });
  } else {
    // Clear all — scan all role cookies
    const allRoles = ['admin', 'teacher', 'student', 'parent'];
    const re = new RegExp(`(${SESSION_COOKIE_NAME}_(?:${allRoles.join('|')})_?\\d*)=([^;]+)`, 'g');
    let m;
    while ((m = re.exec(cookie)) !== null) {
      await deleteSessionByToken(m[2]);
      res.cookies.set({ name: m[1], value: '', httpOnly: true, ...expiredOpts });
    }
    for (const r of allRoles) {
      res.cookies.set({ name: `ep-role_${r}`, value: '', httpOnly: false, ...expiredOpts });
    }
    res.cookies.set({ name: SESSION_COOKIE_NAME, value: '', httpOnly: true, ...expiredOpts });
    res.cookies.set({ name: 'ep-role', value: '', httpOnly: false, ...expiredOpts });
    res.cookies.set({ name: 'ep-active-user', value: '', httpOnly: false, ...expiredOpts });
  }

  return res;
}
