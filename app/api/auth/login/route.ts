import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { createSession, deleteSessionByToken } from '@/lib/session';
import { SESSION_COOKIE_NAME } from '@/lib/env';
import { verifyPassword } from '@better-auth/utils/password';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

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

  const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role } });
  const cookieOpts = { path: '/', expires: expiresAt, secure: process.env.NODE_ENV === 'production' } as const;

  res.cookies.set({ name: `${SESSION_COOKIE_NAME}_${role}`, value: token, httpOnly: true, ...cookieOpts });
  res.cookies.set({ name: `ep-role_${role}`, value: role, httpOnly: false, ...cookieOpts });

  return res;
}