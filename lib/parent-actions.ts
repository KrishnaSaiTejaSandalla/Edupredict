"use server";

import { db } from "./db";
import { parents, studentParents, students, users, classes, userAvatars } from "./schema";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { parseDbError } from "./db-errors";
import { buildDiceBearUrl, AVATAR_STYLE_MAP } from "./ai/providers/dicebear";
import { trackAIGeneration } from "./ai/shared/tracker";

/**
 * Fetches all student records (children) linked to the given parent user ID.
 */
export async function getParentChildren(parentUserId: number) {
  const [parentRecord] = await db
    .select({ id: parents.id })
    .from(parents)
    .where(eq(parents.userId, parentUserId))
    .limit(1);

  if (!parentRecord) return [];

  const children = await db
    .select({
      studentId: students.id,
      studentUserId: students.userId,
      rollNumber: students.rollNumber,
      gender: students.gender,
      name: users.name,
      email: users.email,
      classId: classes.id,
      className: classes.name,
      classSection: classes.section,
      profileImageUrl: users.profileImageUrl,
      isActive: users.isActive,
      relation: studentParents.relation,
      admissionDate: students.admissionDate,
    })
    .from(studentParents)
    .innerJoin(students, eq(students.id, studentParents.studentId))
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(classes, eq(classes.id, students.classId))
    .where(eq(studentParents.parentId, parentRecord.id));

  return children.map((c) => ({
    ...c,
    displayClass: c.className + (c.classSection ? ` ${c.classSection}` : ""),
  }));
}

/**
 * Updates the Parent profile details across both users and parents tables.
 */
export async function updateParentProfile(
  userId: number,
  data: {
    name: string;
    email: string;
    phoneNumber: string;
    address: string;
  }
) {
  if (!data.name || !data.email) {
    throw new Error("Name and email are required");
  }

  try {
    await db.transaction(async (tx) => {
      // 1. Check if email already exists for another user
      const [existingUser] = await tx
        .select()
        .from(users)
        .where(and(eq(users.email, data.email), ne(users.id, userId)))
        .limit(1);
      if (existingUser) {
        throw new Error('Email already exists.');
      }

      // 2. Update user record
      await tx
        .update(users)
        .set({
          name: data.name,
          email: data.email,
          phoneNumber: data.phoneNumber,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // 3. Update parent record
      await tx
        .update(parents)
        .set({
          phoneNumber: data.phoneNumber,
          parentEmail: data.email,
          address: data.address,
          updatedAt: new Date(),
        })
        .where(eq(parents.userId, userId));
    });
  } catch (err: any) {
    throw new Error(err.message || parseDbError(err));
  }

  revalidatePath("/parent/settings");
  revalidatePath("/parent");
  return { success: true };
}

/**
 * Deletes the Parent's profile image (sets it to null).
 */
export async function deleteUserProfileImage(userId: number) {
  try {
    await db
      .update(users)
      .set({ profileImageUrl: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  revalidatePath("/parent/settings");
  revalidatePath("/parent");
  return { success: true };
}

/**
 * Updates a child's basic information (limited only to name and email).
 */
export async function updateStudentBasicInfo(
  studentId: number,
  data: { name: string; email: string }
) {
  if (!data.name || !data.email) {
    throw new Error("Name and email are required");
  }

  const [student] = await db
    .select({ userId: students.userId })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  if (!student) {
    throw new Error("Student not found");
  }

  try {
    await db
      .update(users)
      .set({
        name: data.name,
        email: data.email,
        updatedAt: new Date(),
      })
      .where(eq(users.id, student.userId));
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  revalidatePath("/parent/settings");
  revalidatePath("/parent");
  return { success: true };
}

/**
 * Generates 15 AI avatars for the parent (3 variations for each of the 5 styles).
 * Replaces any existing avatars in the database.
 */
export async function generateParentAvatars(userId: number) {
  // Delete all existing avatars for this user
  await db.delete(userAvatars).where(eq(userAvatars.userId, userId));

  const sessionSeed = `${userId}-${Date.now()}`;
  const avatarsToInsert: { userId: number; imageUrl: string; style: string; isSelected: boolean; createdAt: Date }[] = [];

  // Generate 3 variations of the 5 styles (total 15)
  for (let varIdx = 1; varIdx <= 3; varIdx++) {
    for (const s of AVATAR_STYLE_MAP) {
      const url = buildDiceBearUrl({
        seed: `${sessionSeed}-${s.key}-${varIdx}`,
        style: s.style,
        size: 256,
      });

      avatarsToInsert.push({
        userId,
        imageUrl: url,
        style: `${s.key}-${varIdx}`,
        isSelected: false,
        createdAt: new Date(),
      });
    }
  }

  try {
    await db.insert(userAvatars).values(avatarsToInsert);

    // Track AI Generation
    await trackAIGeneration({
      userId,
      type: "AVATAR",
      prompt: `Generated 15 parent avatars: 3 variations of ${AVATAR_STYLE_MAP.map((s) => s.label).join(", ")}`,
      status: "completed",
      resultUrl: avatarsToInsert[0].imageUrl,
    });
  } catch (err) {
    throw new Error(parseDbError(err));
  }

  revalidatePath("/parent/settings");
  return { success: true };
}

/**
 * Updates the Parent notification toggle preferences in the users table.
 */
export async function updateParentNotificationPreferences(
  userId: number,
  preferences: {
    attendance: boolean;
    marks: boolean;
    assignments: boolean;
    diary: boolean;
    transport: boolean;
    announcements: boolean;
    feedback: boolean;
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

  revalidatePath("/parent/settings");
  return { success: true };
}
