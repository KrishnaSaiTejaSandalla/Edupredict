'use server';

import { db } from './db';
import { users, schools } from './schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function updateUserProfile(userId: number, data: { name: string; email: string }) {
  if (!data.name || !data.email) {
    throw new Error('Name and email are required');
  }

  await db
    .update(users)
    .set({
      name: data.name,
      email: data.email,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath('/admin/settings');
  revalidatePath('/admin');
  return { success: true };
}

export async function updateUserPassword(userId: number, data: { currentPassword: string; newPassword: string }) {
  if (!data.currentPassword || !data.newPassword) {
    throw new Error('All password fields are required');
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new Error('User not found');
  }

  const isValid = await bcrypt.compare(data.currentPassword, user.password);
  if (!isValid) {
    throw new Error('Incorrect current password');
  }

  const hashedNewPassword = await bcrypt.hash(data.newPassword, 10);
  await db
    .update(users)
    .set({
      password: hashedNewPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath('/admin/settings');
  return { success: true };
}

export async function updateSchoolProfile(schoolId: number, data: {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  principalName: string | null;
}) {
  if (!data.name) {
    throw new Error('School name is required');
  }

  await db
    .update(schools)
    .set({
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      principalName: data.principalName,
      updatedAt: new Date(),
    })
    .where(eq(schools.id, schoolId));

  revalidatePath('/admin/settings');
  return { success: true };
}
