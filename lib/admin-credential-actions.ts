'use server';

import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { requireRole } from './auth';

export async function adminResetUserPassword(userId: number, passwordVal: string) {
  await requireRole('admin');
  
  if (!passwordVal || passwordVal.trim().length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const hashedPassword = await bcrypt.hash(passwordVal, 12);
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
  
  return { success: true, message: 'Password reset successfully.' };
}
