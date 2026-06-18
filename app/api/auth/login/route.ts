import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { createSession } from '@/lib/session';
import { SESSION_COOKIE_NAME } from '@/lib/env';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const { token, expiresAt } = await createSession(user.id);
  const res = NextResponse.json({ ok: true });
  const cookieOpts = { path: '/', expires: expiresAt, secure: process.env.NODE_ENV === 'production' } as const;
  const role = user.role ?? 'student';
  res.cookies.set({ name: `${SESSION_COOKIE_NAME}_${role}`, value: token, httpOnly: true, ...cookieOpts });
  res.cookies.set({ name: `ep-role_${role}`, value: role, httpOnly: false, ...cookieOpts });
  return res;
}

