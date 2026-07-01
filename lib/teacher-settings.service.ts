'use server';

import { db } from './db';
import {
  users,
  teachers,
  userPreferences,
  userAvatars,
} from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// ==================== TEACHER SETTINGS SERVICE ====================
// COMPLETELY ISOLATED from admin settings actions.
// These actions update only teacher-related data and NEVER touch admin routes.

export async function getTeacherFullProfile(userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [teacher] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.userId, userId))
    .limit(1);
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  const avatarList = await db
    .select()
    .from(userAvatars)
    .where(eq(userAvatars.userId, userId));

  return { user, teacher: teacher || null, prefs: prefs || null, avatars: avatarList };
}

export async function updateTeacherProfile(
  userId: number,
  data: {
    name: string;
    bio?: string;
    designation?: string;
    phoneNumber?: string;
  }
) {
  if (!data.name?.trim()) throw new Error('Name is required');

  await db
    .update(users)
    .set({
      name: data.name.trim(),
      bio: data.bio?.trim() || null,
      designation: data.designation?.trim() || null,
      phoneNumber: data.phoneNumber?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath('/teacher');
  revalidatePath('/teacher/settings');
}

export async function updateTeacherProfessionalInfo(
  teacherRecordId: number,
  data: {
    qualification?: string;
    experience?: number;
    department?: string;
  }
) {
  await db
    .update(teachers)
    .set({
      qualification: data.qualification?.trim() || null,
      experience: data.experience || null,
      department: data.department?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(teachers.id, teacherRecordId));

  revalidatePath('/teacher/settings');
}

export async function updateTeacherNotificationPrefs(
  userId: number,
  prefs: {
    email: boolean;
    inApp: boolean;
    attendance: boolean;
    assignments: boolean;
    marks: boolean;
    announcements: boolean;
  }
) {
  await db
    .update(users)
    .set({
      notificationPreferences: JSON.stringify(prefs),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath('/teacher/settings');
}

export async function updateTeacherAppearance(
  userId: number,
  data: {
    theme?: string;
    density?: string;
    colorPreset?: string;
  }
) {
  const existing = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(userPreferences)
      .set({
        theme: data.theme || 'dark',
        density: data.density || 'comfortable',
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.userId, userId));
  } else {
    await db.insert(userPreferences).values({
      userId,
      theme: data.theme || 'dark',
      density: data.density || 'comfortable',
      sidebarCollapsed: false,
      language: 'en',
      updatedAt: new Date(),
    });
  }

  // Also update appearancePreferences in users table to persist colorPreset
  const preferencesJson = JSON.stringify({
    theme: data.theme || 'dark',
    density: data.density || 'comfortable',
    colorPreset: data.colorPreset || 'ocean-blue',
  });

  await db
    .update(users)
    .set({
      appearancePreferences: preferencesJson,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath('/teacher/settings');
}

export async function changeTeacherPassword(
  userId: number,
  data: { currentPassword: string; newPassword: string }
) {
  if (!data.currentPassword || !data.newPassword) {
    throw new Error('Both current and new password are required');
  }
  if (data.newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters');
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error('User not found');

  const valid = await bcrypt.compare(data.currentPassword, user.password);
  if (!valid) throw new Error('Current password is incorrect');

  const hashed = await bcrypt.hash(data.newPassword, 12);
  await db
    .update(users)
    .set({ password: hashed, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function uploadTeacherProfileImage(userId: number, formData: FormData) {
  const file = formData.get('image') as File | null;
  if (!file || file.size === 0) throw new Error('No file provided');
  if (file.size > 3 * 1024 * 1024) throw new Error('File size must be under 3MB');

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only PNG, JPG, and WEBP files are allowed');
  }

  const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profiles');
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const fileName = `user-${userId}-${Date.now()}.${ext}`;
  const filePath = join(uploadsDir, fileName);
  const publicUrl = `/uploads/profiles/${fileName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  await db
    .update(users)
    .set({ profileImageUrl: publicUrl, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath('/teacher');
  revalidatePath('/teacher/settings');
  return { success: true, profileImageUrl: publicUrl };
}
