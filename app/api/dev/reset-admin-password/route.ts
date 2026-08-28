import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, sessions } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@better-auth/utils/password';
import { SESSION_COOKIE_NAME } from '@/lib/env';

export async function POST(req: Request) {
  // 1. Protect for development environment only
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Unauthorized environment' }, { status: 403 });
  }

  try {
    const { email, password } = await req.json();

    // 2. Validate input
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must contain at least 8 characters.' }, { status: 400 });
    }

    // 3. Find user and check if admin
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin account not found.' }, { status: 404 });
    }

    // 4. Hash password with Better Auth's hashing utility
    const hashedPassword = await hashPassword(password);

    // 5. Update user password
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));

    // 6. Delete all sessions of that admin
    await db.delete(sessions).where(eq(sessions.userId, user.id));

    // 7. Clear local cookies for admin session
    const res = NextResponse.json({ message: 'Password updated successfully.' });
    const expiredOpts = { path: '/', maxAge: 0, secure: (process.env.NODE_ENV as string) === 'production' } as const;
    res.cookies.set({ name: `${SESSION_COOKIE_NAME}_admin`, value: '', httpOnly: true, ...expiredOpts });
    res.cookies.set({ name: `ep-role_admin`, value: '', httpOnly: false, ...expiredOpts });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
