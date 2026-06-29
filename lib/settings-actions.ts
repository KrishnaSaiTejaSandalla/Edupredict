'use server';

import { db } from './db';
import { users, schools, userPreferences } from './schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { parseDbError } from './db-errors';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// ==================== User Profile ====================

export async function updateUserProfile(
  userId: number,
  data: {
    name: string;
    email: string;
    bio?: string | null;
    designation?: string | null;
    phoneNumber?: string | null;
  }
) {
  if (!data.name || !data.email) {
    throw new Error('Name and email are required');
  }

  try {
    await db
      .update(users)
      .set({
        name: data.name,
        email: data.email,
        bio: data.bio ?? null,
        designation: data.designation ?? null,
        phoneNumber: data.phoneNumber ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  revalidatePath('/admin/settings');
  revalidatePath('/admin');
  return { success: true };
}

// ==================== User Password ====================

export async function updateUserPassword(
  userId: number,
  data: { currentPassword: string; newPassword: string }
) {
  if (!data.currentPassword || !data.newPassword) {
    throw new Error('All password fields are required');
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error('User not found');

  const isValid = await bcrypt.compare(data.currentPassword, user.password);
  if (!isValid) throw new Error('Incorrect current password');

  const hashedNewPassword = await bcrypt.hash(data.newPassword, 10);
  try {
    await db
      .update(users)
      .set({ password: hashedNewPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  revalidatePath('/admin/settings');
  return { success: true };
}

// ==================== School Profile ====================

export async function updateSchoolProfile(
  schoolId: number,
  data: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    principalName?: string | null;
    establishedYear?: number | null;
    motto?: string | null;
    website?: string | null;
    registrationNumber?: string | null;
    affiliationBoard?: string | null;
    udiseCode?: string | null;
  }
) {
  if (!data.name) throw new Error('School name is required');

  try {
    await db
      .update(schools)
      .set({
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        pincode: data.pincode ?? null,
        principalName: data.principalName ?? null,
        establishedYear: data.establishedYear ?? null,
        motto: data.motto ?? null,
        website: data.website ?? null,
        registrationNumber: data.registrationNumber ?? null,
        affiliationBoard: data.affiliationBoard ?? null,
        udiseCode: data.udiseCode ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schools.id, schoolId));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  revalidatePath('/admin/settings');
  return { success: true };
}

// ==================== School Branding ====================

export async function updateSchoolBranding(
  schoolId: number,
  data: {
    primaryColor?: string | null;
    accentColor?: string | null;
    logoUrl?: string | null;
  }
) {
  try {
    await db
      .update(schools)
      .set({
        primaryColor: data.primaryColor ?? null,
        accentColor: data.accentColor ?? null,
        logoUrl: data.logoUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schools.id, schoolId));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  revalidatePath('/admin/settings');
  revalidatePath('/admin');
  return { success: true };
}

export async function uploadSchoolLogo(schoolId: number, formData: FormData) {
  const file = formData.get('logo') as File | null;
  if (!file || file.size === 0) throw new Error('No file provided');

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only PNG, JPG, and WEBP files are allowed');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be under 5MB');
  }

  const uploadsDir = join(process.cwd(), 'public', 'uploads', 'logos');
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const fileName = `school-${schoolId}-${Date.now()}.${ext}`;
  const filePath = join(uploadsDir, fileName);
  const publicUrl = `/uploads/logos/${fileName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  await db
    .update(schools)
    .set({ logoUrl: publicUrl, updatedAt: new Date() })
    .where(eq(schools.id, schoolId));

  revalidatePath('/admin/settings');
  return { success: true, logoUrl: publicUrl };
}

export async function uploadUserProfileImage(userId: number, formData: FormData) {
  const file = formData.get('image') as File | null;
  if (!file || file.size === 0) throw new Error('No file provided');

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only PNG, JPG, and WEBP files are allowed');
  }

  if (file.size > 3 * 1024 * 1024) {
    throw new Error('File size must be under 3MB');
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

  revalidatePath('/admin/settings');
  revalidatePath('/admin');
  return { success: true, profileImageUrl: publicUrl };
}

// ==================== Notifications ====================

export async function updateUserNotificationPreferences(
  userId: number,
  preferences: {
    email: boolean;
    inApp: boolean;
    attendance: boolean;
    exams: boolean;
  }
) {
  try {
    await db
      .update(users)
      .set({
        notificationPreferences: JSON.stringify(preferences),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  revalidatePath('/admin/settings');
  return { success: true };
}

// ==================== User Preferences (theme + density) ====================

export async function upsertUserPreferences(
  userId: number,
  data: {
    theme?: string;
    density?: string;
    sidebarCollapsed?: boolean;
    language?: string;
  }
) {
  try {
    // Check if preferences row exists
    const [existing] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (existing) {
      await db
        .update(userPreferences)
        .set({
          ...(data.theme !== undefined && { theme: data.theme }),
          ...(data.density !== undefined && { density: data.density }),
          ...(data.sidebarCollapsed !== undefined && { sidebarCollapsed: data.sidebarCollapsed }),
          ...(data.language !== undefined && { language: data.language }),
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId));
    } else {
      await db.insert(userPreferences).values({
        userId,
        theme: data.theme ?? 'dark',
        density: data.density ?? 'comfortable',
        sidebarCollapsed: data.sidebarCollapsed ?? false,
        language: data.language ?? 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  revalidatePath('/admin/settings');
  revalidatePath('/admin');
  return { success: true };
}

export async function getUserPreferences(userId: number) {
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  return prefs ?? {
    theme: 'dark',
    density: 'comfortable',
    sidebarCollapsed: false,
    language: 'en',
  };
}

// ==================== School Feedback / Survey Toggles ====================

export async function updateSchoolFeedbackSettings(
  schoolId: number,
  data: {
    monthlyFeedbackOpen: boolean;
    teacherFeedbackOpen: boolean;
    schoolSurveyOpen: boolean;
  }
) {
  try {
    await db
      .update(schools)
      .set({
        monthlyFeedbackOpen: data.monthlyFeedbackOpen,
        teacherFeedbackOpen: data.teacherFeedbackOpen,
        schoolSurveyOpen: data.schoolSurveyOpen,
        updatedAt: new Date(),
      })
      .where(eq(schools.id, schoolId));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  revalidatePath('/admin/settings');
  revalidatePath('/admin/feedback');
  revalidatePath('/student/feedback');
  revalidatePath('/teacher');
  return { success: true };
}

// ==================== Legacy appearance preferences (kept for compatibility) ====================

export async function updateUserAppearancePreferences(
  userId: number,
  preferences: { theme: string; density: string }
) {
  // Also persist to userPreferences table for proper persistence
  await upsertUserPreferences(userId, preferences);

  try {
    await db
      .update(users)
      .set({
        appearancePreferences: JSON.stringify(preferences),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  revalidatePath('/admin/settings');
  return { success: true };
}
