import { db } from './db';
import {
  teachers,
  teacherResources,
  schools,
  resourceBookmarks,
  resourceViews,
  resourceDownloads,
  studentLearningProgress,
  aiRecommendations,
} from './schema';
import { eq, and, desc, sql, like, or } from 'drizzle-orm';
import { join } from 'path';
import { unlink } from 'fs/promises';

// ==================== TEACHER RESOURCES SERVICE ====================

export type ResourceFilter = {
  search?: string;
  subject?: string;
  resourceType?: string;
  page?: number;
  pageSize?: number;
};

export async function getTeacherResources(teacherId: number, filter: ResourceFilter = {}) {
  const { page = 1, pageSize = 12, search, subject, resourceType } = filter;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(teacherResources.teacherId, teacherId)];
  if (subject) conditions.push(eq(teacherResources.subject, subject));
  if (resourceType) conditions.push(eq(teacherResources.resourceType, resourceType));

  const rows = await db
    .select()
    .from(teacherResources)
    .where(and(...conditions))
    .orderBy(desc(teacherResources.createdAt));

  let filtered = rows;
  if (search) {
    const q = search.toLowerCase();
    filtered = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.subject ?? '').toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const items = filtered.slice(offset, offset + pageSize).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? '',
    subject: r.subject ?? '',
    classLevel: r.classLevel ?? '',
    resourceType: r.resourceType,
    fileUrl: r.fileUrl ?? null,
    isAIGenerated: r.isAIGenerated,
    aiContent: r.aiContent ?? null,
    downloadCount: r.downloadCount,
    viewCount: r.viewCount ?? 0,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
  }));

  return { items, total, pages: Math.ceil(total / pageSize) };
}

export async function createResource(
  teacherId: number,
  schoolId: number,
  data: {
    title: string;
    description?: string;
    subject?: string;
    classLevel?: string;
    resourceType: string;
    fileUrl?: string;
    isAIGenerated?: boolean;
    aiPrompt?: string;
    aiContent?: string;
  }
) {
  const result = await db.insert(teacherResources).values({
    teacherId,
    schoolId,
    title: data.title,
    description: data.description || null,
    subject: data.subject || null,
    classLevel: data.classLevel || null,
    resourceType: data.resourceType,
    fileUrl: data.fileUrl || null,
    isAIGenerated: data.isAIGenerated ?? false,
    aiPrompt: data.aiPrompt || null,
    aiContent: data.aiContent || null,
    downloadCount: 0,
    viewCount: 0,
    updatedAt: new Date(),
  });
  return result;
}

export async function deleteResource(id: number, teacherId: number) {
  const [existing] = await db
    .select()
    .from(teacherResources)
    .where(and(eq(teacherResources.id, id), eq(teacherResources.teacherId, teacherId)))
    .limit(1);
  if (!existing) throw new Error('Resource not found');

  // Cascade delete inside a transaction
  await db.transaction(async (tx) => {
    await tx.delete(resourceBookmarks).where(eq(resourceBookmarks.resourceId, id));
    await tx.delete(resourceViews).where(eq(resourceViews.resourceId, id));
    await tx.delete(resourceDownloads).where(eq(resourceDownloads.resourceId, id));
    await tx.delete(studentLearningProgress).where(eq(studentLearningProgress.resourceId, id));
    await tx.delete(aiRecommendations).where(eq(aiRecommendations.resourceId, id));
    await tx.delete(teacherResources).where(eq(teacherResources.id, id));
  });

  // Physical file cleanup if uploaded locally
  const fileUrl = existing.fileUrl;
  if (fileUrl && fileUrl.startsWith('/uploads/resources/')) {
    const filePath = join(process.cwd(), 'public', fileUrl);
    try {
      await unlink(filePath);
    } catch (err) {
      console.warn('Could not delete physical file:', (err as Error).message);
    }
  }
}

export async function incrementDownload(id: number) {
  await db
    .update(teacherResources)
    .set({ downloadCount: sql`${teacherResources.downloadCount} + 1` })
    .where(eq(teacherResources.id, id));
}

export async function incrementView(id: number) {
  await db
    .update(teacherResources)
    .set({ viewCount: sql`${teacherResources.viewCount} + 1` })
    .where(eq(teacherResources.id, id));
}

export async function getResourceSubjects(teacherId: number) {
  const rows = await db
    .select({ subject: teacherResources.subject })
    .from(teacherResources)
    .where(and(eq(teacherResources.teacherId, teacherId)))
    .groupBy(teacherResources.subject);

  return rows.map((r) => r.subject).filter(Boolean) as string[];
}
