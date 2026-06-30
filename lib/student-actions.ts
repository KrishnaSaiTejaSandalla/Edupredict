'use server';

import { db } from './db';
import {
  students, users, studentDiaryProgress, studentDiaries,
  assignmentSubmissions, studentAvatarSelections, aiGeneratedNotes,
  userPreferences,
} from './schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireRole } from './auth';
import bcrypt from 'bcryptjs';
import { buildDiceBearUrl } from './ai/providers/dicebear';


export async function getStudentDetails(userId: number) {
  const { classes } = await import('./schema');
  const [row] = await db
    .select({
      studentId: students.id, rollNumber: students.rollNumber, gender: students.gender,
      classId: students.classId, className: classes.name, classSection: classes.section,
    })
    .from(students).leftJoin(classes, eq(classes.id, students.classId))
    .where(eq(students.userId, userId)).limit(1);
  if (!row) return null;
  return { ...row, displayClass: row.className + (row.classSection ? ` ${row.classSection}` : '') };
}

export async function toggleHomeworkCompleted(diaryId: number, isCompleted: boolean) {
  const user = await requireRole('student');
  const [studentRow] = await db.select({ id: students.id }).from(students).where(eq(students.userId, user.id)).limit(1);
  if (!studentRow) throw new Error('Student not found');

  const [existing] = await db.select().from(studentDiaryProgress)
    .where(and(eq(studentDiaryProgress.studentId, studentRow.id), eq(studentDiaryProgress.diaryId, diaryId))).limit(1);

  if (existing) {
    await db.update(studentDiaryProgress).set({ isCompleted, completedAt: isCompleted ? new Date() : null, updatedAt: new Date() })
      .where(and(eq(studentDiaryProgress.studentId, studentRow.id), eq(studentDiaryProgress.diaryId, diaryId)));
  } else {
    await db.insert(studentDiaryProgress).values({
      studentId: studentRow.id, diaryId, isCompleted, completedAt: isCompleted ? new Date() : null,
      createdAt: new Date(), updatedAt: new Date(),
    });
  }
  revalidatePath('/student');
  revalidatePath('/student/diary');
  return { success: true };
}

export async function submitAssignmentAction(formData: FormData) {
  const fs = await import('fs');
  const path = await import('path');
  const user = await requireRole('student');

  const assignmentIdStr = formData.get('assignmentId');
  const content = formData.get('content') as string;
  const file = formData.get('file') as File | null;

  if (!assignmentIdStr) throw new Error('Assignment ID is required');
  const assignmentId = Number(assignmentIdStr);

  const [studentRow] = await db.select({ id: students.id }).from(students).where(eq(students.userId, user.id)).limit(1);
  if (!studentRow) throw new Error('Student not found');

  const [existing] = await db.select().from(assignmentSubmissions)
    .where(and(eq(assignmentSubmissions.assignmentId, assignmentId), eq(assignmentSubmissions.studentId, studentRow.id))).limit(1);

  const { assignments } = await import('./schema');
  const [assignment] = await db.select({ dueDate: assignments.dueDate }).from(assignments).where(eq(assignments.id, assignmentId)).limit(1);
  const isLate = assignment?.dueDate ? new Date(String(assignment.dueDate)) < new Date() : false;

  let fileUrl = existing?.fileUrl || null;

  if (file && file.size > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['pdf', 'docx', 'png', 'jpg', 'jpeg', 'zip'];
    if (!extension || !allowed.includes(extension)) {
      throw new Error(`File type not allowed. Allowed types: ${allowed.join(', ')}`);
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds 5MB limit.');
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'submissions');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, uniqueName);
    await fs.promises.writeFile(filePath, buffer);
    fileUrl = `/uploads/submissions/${uniqueName}`;
  }

  const updateData = {
    content: content || null,
    fileUrl,
    submittedAt: new Date(),
    isLate,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(assignmentSubmissions).set(updateData)
      .where(and(eq(assignmentSubmissions.assignmentId, assignmentId), eq(assignmentSubmissions.studentId, studentRow.id)));
  } else {
    await db.insert(assignmentSubmissions).values({
      assignmentId,
      studentId: studentRow.id,
      ...updateData,
      createdAt: new Date(),
    });
  }

  revalidatePath('/student/assignments');
  revalidatePath('/student');
  return { success: true };
}

export async function selectStudentAvatar(avatarType: string, imageUrl: string) {
  const user = await requireRole('student');
  const [studentRow] = await db.select({ id: students.id }).from(students).where(eq(students.userId, user.id)).limit(1);
  if (!studentRow) throw new Error('Student not found');

  // Clear old selections
  await db.update(studentAvatarSelections).set({ isSelected: false }).where(eq(studentAvatarSelections.studentId, studentRow.id));

  // Upsert the new selection
  const [existing] = await db.select().from(studentAvatarSelections)
    .where(and(eq(studentAvatarSelections.studentId, studentRow.id), eq(studentAvatarSelections.avatarType, avatarType))).limit(1);

  if (existing) {
    await db.update(studentAvatarSelections).set({ isSelected: true, imageUrl }).where(eq(studentAvatarSelections.id, existing.id));
  } else {
    await db.insert(studentAvatarSelections).values({ studentId: studentRow.id, avatarType, imageUrl, isSelected: true, createdAt: new Date() });
  }

  // Update profile image
  await db.update(users).set({ profileImageUrl: imageUrl, updatedAt: new Date() }).where(eq(users.id, user.id));
  revalidatePath('/student/settings');
  revalidatePath('/student');
  return { success: true };
}

export async function saveAIGeneratedNote(data: { subjectName: string; topic: string; noteType: string; title: string; content: string }) {
  const user = await requireRole('student');
  const [studentRow] = await db.select({ id: students.id }).from(students).where(eq(students.userId, user.id)).limit(1);
  if (!studentRow) throw new Error('Student not found');

  await db.insert(aiGeneratedNotes).values({ studentId: studentRow.id, ...data, createdAt: new Date() });
  revalidatePath('/student/resources');
  return { success: true };
}

export async function updateStudentProfile(name: string, email: string) {
  const user = await requireRole('student');
  await db.update(users).set({ name, email, updatedAt: new Date() }).where(eq(users.id, user.id));
  revalidatePath('/student/settings');
  return { success: true };
}

export async function updateStudentProfileSettings(
  userId: number,
  data: {
    name: string;
    bio?: string | null;
    phoneNumber?: string | null;
    learningGoal?: string | null;
    interests?: string | null;
  }
) {
  const user = await requireRole('student');
  if (user.id !== userId) throw new Error('Unauthorized');
  if (!data.name?.trim()) throw new Error('Name is required');

  await db
    .update(users)
    .set({
      name: data.name.trim(),
      bio: data.bio?.trim() || null,
      phoneNumber: data.phoneNumber?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await db
    .update(students)
    .set({
      learningGoal: data.learningGoal?.trim() || null,
      interests: data.interests?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(students.userId, userId));

  revalidatePath('/student/settings');
  revalidatePath('/student');
  return { success: true };
}

export async function updateStudentNotificationPrefs(
  userId: number,
  prefs: {
    email: boolean;
    inApp: boolean;
    attendance: boolean;
    assignments: boolean;
    exams: boolean;
  }
) {
  const user = await requireRole('student');
  if (user.id !== userId) throw new Error('Unauthorized');

  await db
    .update(users)
    .set({
      notificationPreferences: JSON.stringify(prefs),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath('/student/settings');
  return { success: true };
}

export async function updateStudentAppearance(
  userId: number,
  data: {
    theme?: string;
    density?: string;
    colorPreset?: string;
  }
) {
  const user = await requireRole('student');
  if (user.id !== userId) throw new Error('Unauthorized');

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

  const preferencesJson = JSON.stringify({
    theme: data.theme || 'dark',
    density: data.density || 'comfortable',
    colorPreset: data.colorPreset || 'royal-purple',
  });

  await db
    .update(users)
    .set({
      appearancePreferences: preferencesJson,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath('/student/settings');
  revalidatePath('/student');
  return { success: true };
}

export async function changeStudentPassword(
  userId: number,
  data: { currentPassword: string; newPassword: string }
) {
  const user = await requireRole('student');
  if (user.id !== userId) throw new Error('Unauthorized');

  if (!data.currentPassword || !data.newPassword) {
    throw new Error('Both current and new password are required');
  }
  if (data.newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters');
  }

  const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!dbUser) throw new Error('User not found');

  const valid = await bcrypt.compare(data.currentPassword, dbUser.password);
  if (!valid) throw new Error('Current password is incorrect');

  const hashed = await bcrypt.hash(data.newPassword, 12);
  await db
    .update(users)
    .set({ password: hashed, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return { success: true };
}

export async function generateStudentAIAvatars(userId: number) {
  const user = await requireRole('student');
  if (user.id !== userId) throw new Error('Unauthorized');

  const [studentRow] = await db.select({ id: students.id }).from(students).where(eq(students.userId, userId)).limit(1);
  if (!studentRow) throw new Error('Student not found');

  // Deletes previous generated studentAvatarSelections for this student entirely (so only latest batch is stored)
  await db.delete(studentAvatarSelections).where(eq(studentAvatarSelections.studentId, studentRow.id));

  const sessionSeed = `${userId}-${Date.now()}`;
  
  // Vibrant background colours — one per persona for a distinct look
  const BG_COLORS = {
    Astronaut:       ['b5c4ff'],   // sky blue
    'Football player': ['a3f4b0'], // mint green
    Scientist:       ['ffd6a5'],   // warm peach
    Gamer:           ['ffadde'],   // hot pink
    Wizard:          ['c4b5fd'],   // lavender
  };

  // Define the 5 student avatars style & seed
  const avatarSpecs = [
    { type: 'Astronaut',        style: 'lorelei' as const, seed: `astronaut-${sessionSeed}` },
    { type: 'Football player',  style: 'lorelei' as const, seed: `football-${sessionSeed}` },
    { type: 'Scientist',        style: 'lorelei' as const, seed: `scientist-${sessionSeed}` },
    { type: 'Gamer',            style: 'lorelei' as const, seed: `gamer-${sessionSeed}` },
    { type: 'Wizard',           style: 'lorelei' as const, seed: `wizard-${sessionSeed}` },
  ];

  const generated = avatarSpecs.map(spec => ({
    avatarType: spec.type,
    imageUrl: buildDiceBearUrl({
      seed: spec.seed,
      style: spec.style,
      size: 256,
      backgroundColor: BG_COLORS[spec.type as keyof typeof BG_COLORS] ?? ['b5c4ff'],
    }),
  }));

  // Store in studentAvatarSelections
  await db.insert(studentAvatarSelections).values(
    generated.map(av => ({
      studentId: studentRow.id,
      avatarType: av.avatarType,
      imageUrl: av.imageUrl,
      isSelected: false,
      createdAt: new Date(),
    }))
  );

  revalidatePath('/student/settings');
  revalidatePath('/student');
  return { success: true };
}

export async function selectStudentAIWebAvatar(userId: number, selectionId: number, imageUrl: string) {
  const user = await requireRole('student');
  if (user.id !== userId) throw new Error('Unauthorized');
  
  const [studentRow] = await db.select({ id: students.id }).from(students).where(eq(students.userId, userId)).limit(1);
  if (!studentRow) throw new Error('Student not found');

  // Unselect all
  await db.update(studentAvatarSelections)
    .set({ isSelected: false })
    .where(eq(studentAvatarSelections.studentId, studentRow.id));

  // Select the selected one
  await db.update(studentAvatarSelections)
    .set({ isSelected: true })
    .where(eq(studentAvatarSelections.id, selectionId));

  // Set users.profileImageUrl
  await db.update(users)
    .set({ profileImageUrl: imageUrl, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath('/student/settings');
  revalidatePath('/student');
  return { success: true };
}

export async function generateAIInsightsAction(subject: string, actionType: string) {
  const user = await requireRole('student');
  
  let insights = "";
  const subjectLabel = subject || "Overall";

  if (actionType === "schedule") {
    insights = `### 📅 AI Customized Study Plan: **${subjectLabel}**\n\n` +
      `- **Focus block (45 mins)**: Review weak concepts identified in your recent quizzes. Avoid passive reading.\n` +
      `- **Active Practice (60 mins)**: Solve 5 high-difficulty questions without looking at the solutions. Triple-check arithmetic.\n` +
      `- **Reflection (15 mins)**: Write down a 3-sentence summary of what you learned. Explain it out loud to verify recall.\n\n` +
      `> ⚡ **AI Tip**: Take a 5-minute movement break every 25 minutes (Pomodoro technique) to maintain peak neural focus.`;
  } else if (actionType === "mistakes") {
    insights = `### 🎯 AI Error Correction Analysis: **${subjectLabel}**\n\n` +
      `- **1. Calculation Rush**: You get the hardest formulas right but lose points on basic calculations. Slow down during the final steps!\n` +
      `- **2. Time Distribution**: You spent too much time on single high-weight questions. Try allocating max 8 minutes per question.\n` +
      `- **3. Formula Blur**: Write down formulas in the margins as soon as you start the exam paper to prevent memory lapses.`;
  } else {
    insights = `### 🧠 AI Cognitive Mnemonics: **${subjectLabel}**\n\n` +
      `Need to lock **${subjectLabel}** topics into long-term memory? Try these techniques:\n` +
      `- **Acronym**: **B.E.S.T.** = *Brainstorm, Execute, Solve, Triple-check.*\n` +
      `- **Visual Mind Palace**: Imagine this subject as a game of Tetris: pieces only fit when you connect them chronologically.\n` +
      `- **Feynman Sprint**: Teach this concept to a friend or record yourself explaining it on your phone. If you stumble, review that section immediately.`;
  }

  await new Promise((resolve) => setTimeout(resolve, 900));
  return { insights };
}
