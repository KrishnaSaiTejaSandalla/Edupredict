
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, students, classes, parents, studentParents } from '@/lib/schema';
import { asc, desc, eq, like, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import StudentsClient from '@/components/admin/StudentsClient';
import { createNotification } from '@/lib/notification-actions';
import { parseDbError } from '@/lib/db-errors';
import { alias } from 'drizzle-orm/mysql-core';

type SearchParams = {
  q?: string;
  page?: string;
  sort?: string;
  dir?: string;
};

type Props = {
  searchParams?: Promise<SearchParams>;
};

export default async function StudentsPage({ searchParams }: Props) {
  await requireRole('admin');

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const q = resolvedSearchParams?.q || '';
  const page = Number(resolvedSearchParams?.page || '1');
  const sort = resolvedSearchParams?.sort || 'id';
  const dir = resolvedSearchParams?.dir === 'desc' ? 'desc' : 'asc';
  const parentUsers = alias(users, 'parentUsers');

  const limit = 10;
  const offset = (page - 1) * limit;

  const orderBy =
    sort === 'name'
      ? users.name
      : sort === 'rollNumber'
        ? students.rollNumber
        : sort === 'classId'
          ? students.classId
          : students.id;



  const baseQuery = db
    .select({
      u: users,
      s: students,
      c: classes,

      parentName: parentUsers.name,
      parentPhone: parents.phoneNumber,
      parentEmail: parents.parentEmail,
      parentAddress: parents.address,
    })
    .from(students)

    .innerJoin(
      users,
      eq(users.id, students.userId)
    )

    .leftJoin(
      classes,
      eq(classes.id, students.classId)
    )

    .leftJoin(
      studentParents,
      eq(studentParents.studentId, students.id)
    )

    .leftJoin(
      parents,
      eq(parents.id, studentParents.parentId)
    )

    .leftJoin(
      parentUsers,
      eq(parentUsers.id, parents.userId)
    );

  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId));

  const finalQuery = q ? baseQuery.where(like(users.name, `%${q}%`)) : baseQuery;
  const finalCountQuery = q ? countQuery.where(like(users.name, `%${q}%`)) : countQuery;

  const [studentRows, countResult] = await Promise.all([
    finalQuery
      .orderBy(dir === 'desc' ? desc(orderBy) : asc(orderBy))
      .limit(limit)
      .offset(offset),
    finalCountQuery,
  ]);

  const totalCount = Number(countResult[0]?.count ?? 0);

  // ── Server Actions ────────────────────────────────────────────────────────

  async function createStudent(formData: FormData) {
    'use server';

    const fullName = String(formData.get('fullName') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const rollNumber = String(formData.get('rollNumber') || '').trim();
    const classId = Number(formData.get('classId') || 1);
    const gender = String(formData.get('gender') || '').trim();
    const dateOfBirth = String(formData.get('dateOfBirth') || '').trim();
    const parentName = String(formData.get('parentName') || '').trim();
    const parentPhone = String(formData.get('parentPhone') || '').trim();
    const parentEmail = String(formData.get('parentEmail') || '').trim();
    const parentAddress = String(formData.get('parentAddress') || '').trim();
    const schoolId = 1;

    // Validate parent email format if provided
    if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      throw new Error('Please enter a valid parent email address.');
    }

    if (!fullName || !email) {
      throw new Error('Full name and email are required.');
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
          role: 'student',
          schoolId,
        })
        .$returningId();

      if (!inserted?.id) throw new Error('Failed to create student account.');
      userId = inserted.id;
    } catch (err) {
      throw new Error(parseDbError(err));
    }

    try {
      await db.insert(students).values({
        userId,
        schoolId,
        classId,
        rollNumber: rollNumber || null,
        gender: gender || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      });
    } catch (err) {
      // Clean up orphan user if student insert fails
      await db.delete(users).where(eq(users.id, userId)).catch(() => { });
      throw new Error(parseDbError(err));
    }

    if (parentName) {
      try {
        const parentUserEmail = `parent-${userId}@parents.local`;
        const parentRaw = Math.random().toString(36).slice(2, 10) + 'Pp1!';
        const parentHashed = await bcrypt.hash(parentRaw, 12);

        const [parentInserted] = await db
          .insert(users)
          .values({
            name: parentName,
            email: parentUserEmail,
            password: parentHashed,
            role: 'parent',
            schoolId,
          })
          .$returningId();

        if (parentInserted?.id) {
          const [parentRow] = await db
            .insert(parents)
            .values({
              userId: parentInserted.id,
              phoneNumber: parentPhone || undefined,
              parentEmail: parentEmail || undefined,
              address: parentAddress || undefined,
            })
            .$returningId();

          if (parentRow?.id) {
            const [newStudent] = await db
              .select()
              .from(students)
              .where(eq(students.userId, userId))
              .limit(1);

            if (newStudent) {
              await db.insert(studentParents).values({
                studentId: newStudent.id,
                parentId: parentRow.id,
                relation: 'parent',
              });
            }
          }
        }
      } catch (err) {
        // Parent creation failure is non-fatal — student was still created
        console.error('Parent creation failed (non-fatal):', err);
      }
    }

    await createNotification(
      'Student Created',
      `New student "${fullName}" has been added to the system.`,
      'success',
      'medium'
    );

    revalidatePath('/admin/students');
    revalidatePath('/admin');
  }

  async function updateStudent(
    id: number,
    data: {
      fullName: string;
      email: string;
      rollNumber: string;
      classId: string;
      gender: string;
      dateOfBirth: string;
      parentName: string;
      parentPhone: string;
      parentEmail: string;
      parentAddress: string;
    }
  ) {
    'use server';
    // Validate parent email format if provided
    if (data.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.parentEmail)) {
      throw new Error('Please enter a valid parent email address.');
    }

    const [s] = await db.select().from(students).where(eq(students.id, id)).limit(1);
    if (!s) throw new Error('Student not found.');

    try {
      // Update user name
      await db.update(users).set({ name: data.fullName }).where(eq(users.id, s.userId));

      // Update student record
      await db.update(students).set({
        classId: data.classId ? Number(data.classId) : undefined,
        rollNumber: data.rollNumber || undefined,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender || undefined,
      }).where(eq(students.id, id));
    } catch (err) {
      throw new Error(parseDbError(err));
    }

    // Parent handling
    try {
      const mappings = await db.select().from(studentParents).where(eq(studentParents.studentId, id));
      if (mappings.length) {
        const [parentRow] = await db.select().from(parents).where(eq(parents.id, mappings[0].parentId)).limit(1);
        if (parentRow) {
          if (data.parentName) {
            await db.update(users).set({ name: data.parentName }).where(eq(users.id, parentRow.userId));
          }
          await db.update(parents).set({
            ...(data.parentPhone ? { phoneNumber: data.parentPhone } : {}),
            ...(data.parentEmail !== undefined ? { parentEmail: data.parentEmail || null } : {}),
            ...(data.parentAddress !== undefined ? { address: data.parentAddress || null } : {}),
          }).where(eq(parents.id, parentRow.id));
        }
      } else if (data.parentName) {
        const parentUserEmail = `parent-${s.userId}@parents.local`;
        const parentRaw = Math.random().toString(36).slice(2, 10) + 'Pp1!';
        const parentHashed = await bcrypt.hash(parentRaw, 12);
        const [parentInserted] = await db
          .insert(users)
          .values({ name: data.parentName, email: parentUserEmail, password: parentHashed, role: 'parent' })
          .$returningId();

        if (parentInserted?.id) {
          const [parentRow] = await db
          .insert(parents)
          .values({
            userId: parentInserted.id,
            phoneNumber: data.parentPhone || undefined,
            parentEmail: data.parentEmail || undefined,
            address: data.parentAddress || undefined,
          })
          .$returningId();

          if (parentRow?.id) {
            await db.insert(studentParents).values({ studentId: id, parentId: parentRow.id, relation: 'parent' });
          }
        }
      }
    } catch (err) {
      console.error('Parent update failed (non-fatal):', err);
    }

    await createNotification(
      'Student Updated',
      `Student "${data.fullName}" record has been updated.`,
      'info',
      'low'
    );

    revalidatePath('/admin/students');
    revalidatePath('/admin');
  }

  async function deleteStudent(id: number, name: string) {
    'use server';

    // Delete parent mappings
    const mappings = await db.select().from(studentParents).where(eq(studentParents.studentId, id));
    for (const m of mappings) {
      const [p] = await db.select().from(parents).where(eq(parents.id, m.parentId)).limit(1);
      await db.delete(studentParents).where(eq(studentParents.id, m.id));
      if (p) {
        await db.delete(parents).where(eq(parents.id, p.id));
        await db.delete(users).where(eq(users.id, p.userId));
      }
    }

    // Delete student record and user
    const [studentRow] = await db.select().from(students).where(eq(students.id, id)).limit(1);
    if (studentRow) {
      await db.delete(students).where(eq(students.id, id));
      await db.delete(users).where(eq(users.id, studentRow.userId));
    }

    await createNotification(
      'Student Deleted',
      `Student "${name}" has been removed from the system.`,
      'warning',
      'high'
    );

    revalidatePath('/admin/students');
    revalidatePath('/admin');
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <StudentsClient
        studentRows={studentRows as any}
        page={page}
        q={q}
        sort={sort}
        dir={dir}
        totalCount={totalCount}
        createStudent={createStudent}
        updateStudent={updateStudent as any}
        deleteStudent={deleteStudent}
      />
    </main>
  );
}