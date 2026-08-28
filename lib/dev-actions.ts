'use server';

import { db } from './db';
import { users, sessions } from './schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@better-auth/utils/password';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from './env';

export async function devResetAdminPassword(prevState: any, formData: FormData) {
  // Ensure development mode only
  if (process.env.NODE_ENV !== 'development') {
    return { error: 'This action is only available in development mode.' };
  }

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  if (password.length < 8) {
    return { error: 'Password must contain at least 8 characters.' };
  }

  try {
    // Find admin user
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.role !== 'admin') {
      return { error: 'Admin account not found.' };
    }

    // Hash password using Better Auth
    const hashedPassword = await hashPassword(password);

    // Update password in database
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));

    // Delete all sessions for the admin user
    await db.delete(sessions).where(eq(sessions.userId, user.id));

    // Clear cookies
    const cookieStore = await cookies();
    const expiredOpts = { path: '/', maxAge: 0, secure: (process.env.NODE_ENV as string) === 'production' } as const;
    cookieStore.set(`${SESSION_COOKIE_NAME}_admin`, '', expiredOpts);
    cookieStore.set(`ep-role_admin`, '', expiredOpts);

    return { success: true, message: 'Password updated successfully.' };
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred.' };
  }
}
