import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { createSession } from '@/lib/session';
import { SESSION_COOKIE_NAME } from '@/lib/env';
import { verifyPassword } from '@better-auth/utils/password';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!EMAIL_RE.test(email) || password.length === 0 || password.length > 256) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.isActive) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  let valid = false;
  if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
    valid = await bcrypt.compare(password, user.password);
  } else {
    try {
      valid = await verifyPassword(user.password, password);
    } catch {
      valid = false;
    }
  }

  if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const { token, expiresAt } = await createSession(user.id);

  const role = user.role ?? 'student';
  const userId = user.id;

  // Per-user session cookie: edupredict_session_{role}_{userId}
  // This ensures two students (or two teachers etc.) logged in different tabs
  // never share or overwrite each other's session cookies.
  const sessionCookieName = `${SESSION_COOKIE_NAME}_${role}_${userId}`;

  const res = NextResponse.json({ ok: true, user: { id: userId, name: user.name, email: user.email, role }, cookieUserId: userId });
  const cookieOpts = { path: '/', expires: expiresAt, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const };

  res.cookies.set({ name: sessionCookieName, value: token, httpOnly: true, ...cookieOpts });
  // Non-httpOnly hint: "role:userId" — lets the browser / middleware know which session cookie to look up
  res.cookies.set({ name: `ep-active-user`, value: `${role}:${userId}`, httpOnly: false, ...cookieOpts });

  return res;
}
