import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, teachers } from '@/lib/schema';
import { asc, desc, eq, like, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/lib/notification-actions';
import bcrypt from 'bcryptjs';
import { parseDbError } from '@/lib/db-errors';
import TeachersClient from '@/components/admin/TeachersClient';

type SearchParams = {
  q?: string;
  page?: string;
  sort?: string;
  dir?: string;
};

type Props = {
  searchParams?: Promise<SearchParams>;
};

export default async function TeachersPage({ searchParams }: Props) {
  await requireRole('admin');

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const q = resolvedSearchParams?.q || '';
  const page = Number(resolvedSearchParams?.page || '1');
  const sort = resolvedSearchParams?.sort || 'id';
  const dir = resolvedSearchParams?.dir === 'desc' ? 'desc' : 'asc';
  const limit = 10;
  const offset = (page - 1) * limit;
  const orderBy =
    sort === 'name'
      ? users.name
      : sort === 'employeeId'
        ? teachers.employeeId
        : sort === 'department'
          ? teachers.department
          : teachers.id;

  const baseQuery = db
    .select({ t: teachers, u: users })
    .from(teachers)
    .innerJoin(users, eq(users.id, teachers.userId));

  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(teachers)
    .innerJoin(users, eq(users.id, teachers.userId));

  if (q) {
    baseQuery.where(like(users.name, `%${q}%`));
    countQuery.where(like(users.name, `%${q}%`));
  }

  const [teacherRows, countResult] = await Promise.all([
    baseQuery
      .orderBy(dir === 'desc' ? desc(orderBy) : asc(orderBy))
      .limit(limit)
      .offset(offset),
    countQuery,
  ]);

  const totalCount = Number(countResult[0]?.count ?? 0);

  // ── Server Actions ────────────────────────────────────────────────────────

  async function createTeacher(formData: FormData) {
    'use server';
    const fullName = String(formData.get('fullName') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const phoneNumber = String(formData.get('phoneNumber') || '').trim();
    const qualification = String(formData.get('qualification') || '').trim();
    const experience = Number(formData.get('experience') || 0);
    const department = String(formData.get('department') || '').trim();
    const employeeId = String(formData.get('employeeId') || '').trim();
    const joinDate = String(formData.get('joinDate') || '').trim();
    const performanceRating = formData.get('performanceRating') ? Number(formData.get('performanceRating')) : null;
    const schoolId = 1;

    if (!fullName || !email || !employeeId) {
      throw new Error('Full name, email, and employee ID are required.');
    }

    const rawPassword = Math.random().toString(36).slice(2, 10) + 'Aa1!';
    const hashed = await bcrypt.hash(rawPassword, 12);

    let userId: number;
    try {
      const [inserted] = await db
        .insert(users)
        .values({
          name: fullName,
          email,
          password: hashed,
          role: 'teacher',
          schoolId,
        })
        .$returningId();

      if (!inserted?.id) {
        throw new Error('Failed to create teacher user.');
      }
      userId = inserted.id;
    } catch (err) {
      throw new Error(parseDbError(err));
    }

    try {
      await db.insert(teachers).values({
        userId,
        schoolId,
        phoneNumber: phoneNumber || null,
        qualification: qualification || null,
        experience: Number.isNaN(experience) ? null : experience,
        department: department || null,
        employeeId,
        joinDate: joinDate ? new Date(joinDate) : null,
        performanceRating: Number.isNaN(performanceRating) ? null : performanceRating,
      });
    } catch (err) {
      // Clean up orphan user if teacher insert fails
      await db.delete(users).where(eq(users.id, userId)).catch(() => {});
      throw new Error(parseDbError(err));
    }

    await createNotification('Teacher Created', `Teacher account for "${fullName}" has been created.`, 'info', 'medium');
    revalidatePath('/admin/teachers');
    revalidatePath("/admin");
  }

  async function updateTeacher(
    id: number,
    data: {
      fullName: string;
      email: string;
      phoneNumber: string;
      employeeId: string;
      qualification: string;
      department: string;
      experience: string;
      joinDate: string;
      performanceRating?: string;
    }
  ) {
    'use server';
    const [t] = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1);
    if (!t) throw new Error('Teacher not found.');

    try {
      await db.update(users).set({ name: data.fullName }).where(eq(users.id, t.userId));
      await db.update(teachers).set({
        phoneNumber: data.phoneNumber || null,
        qualification: data.qualification || null,
        experience: data.experience ? Number(data.experience) : null,
        department: data.department || null,
        employeeId: data.employeeId,
        joinDate: data.joinDate ? new Date(data.joinDate) : null,
        performanceRating: data.performanceRating ? Number(data.performanceRating) : null,
      }).where(eq(teachers.id, id));
    } catch (err) {
      throw new Error(parseDbError(err));
    }

    await createNotification('Teacher Updated', `Teacher profile for "${data.fullName}" was updated.`, 'info', 'medium');
    revalidatePath('/admin/teachers');
    revalidatePath('/admin');
  }

  async function deleteTeacher(id: number, name: string) {
    'use server';
    const [t] = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1);
    if (!t) throw new Error('Teacher not found.');

    try {
      await db.delete(teachers).where(eq(teachers.id, id));
      await db.delete(users).where(eq(users.id, t.userId));
    } catch (err) {
      throw new Error(parseDbError(err));
    }

    await createNotification('Teacher Deleted', `Teacher "${name}" was deleted.`, 'info', 'medium');
    revalidatePath('/admin/teachers');
    revalidatePath('/admin');
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <TeachersClient
        teacherRows={teacherRows}
        page={page}
        q={q}
        sort={sort}
        dir={dir}
        totalCount={totalCount}
        createTeacher={createTeacher}
        updateTeacher={updateTeacher}
        deleteTeacher={deleteTeacher}
      />
    </main>
  );
}
