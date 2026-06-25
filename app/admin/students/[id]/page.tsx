import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, students, parents, studentParents, classes } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import StudentForm from '@/components/admin/StudentForm';
import DeleteButton from '@/components/ui/DeleteButton';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/lib/notification-actions';
import CredentialsManager from '@/components/admin/CredentialsManager';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function StudentEditPage({ params }: Props) {
  await requireRole('admin');

  const { id } = await params;
  const studentId = Number(id);
  const [s] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  if (!s) return <div className="p-8 text-white">Student not found</div>;

  const [u] = await db.select().from(users).where(eq(users.id, s.userId)).limit(1);
  const [cls] = await db.select().from(classes).where(eq(classes.id, s.classId)).limit(1);

  const spRows = await db.select().from(studentParents).where(eq(studentParents.studentId, studentId));
  let parentName = '';
  let parentPhone = '';
  let parentEmail = '';
  let parentAddress = '';
  let parentUserId: number | undefined;

  if (spRows.length) {
    const [parentRow] = await db.select().from(parents).where(eq(parents.id, spRows[0].parentId)).limit(1);
    if (parentRow) {
      const [parentUser] = await db.select().from(users).where(eq(users.id, parentRow.userId)).limit(1);
      parentName = parentUser?.name || '';
      parentPhone = parentRow.phoneNumber || '';
      parentEmail = parentRow.parentEmail || '';
      parentAddress = parentRow.address || '';
      parentUserId = parentUser?.id;
    }
  }

  async function updateStudent(formData: FormData) {
    'use server';
    const sid = Number(formData.get('id'));
    const fullName = String(formData.get('fullName') || '');
    const rollNumber = String(formData.get('rollNumber') || '');
    const classId = formData.get('classId') ? Number(formData.get('classId')) : null;
    const dateOfBirth = String(formData.get('dateOfBirth') || '');
    const gender = String(formData.get('gender') || '');
    const parentNameInput = String(formData.get('parentName') || '');
    const parentPhoneInput = String(formData.get('parentPhone') || '');
    const parentEmailInput = String(formData.get('parentEmail') || '');
    const parentAddressInput = String(formData.get('parentAddress') || '');

    await db.update(users).set({ name: fullName }).where(eq(users.id, s.userId));

    await db.update(students).set({
      classId: classId ?? undefined,
      rollNumber: rollNumber || undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender: gender || undefined,
    }).where(eq(students.id, sid));

    const mappings = await db.select().from(studentParents).where(eq(studentParents.studentId, sid));

    if (mappings.length) {
      const [parentRow] = await db.select().from(parents).where(eq(parents.id, mappings[0].parentId)).limit(1);
      if (parentRow) {
        if (parentNameInput) {
          await db.update(users).set({ name: parentNameInput }).where(eq(users.id, parentRow.userId));
        }

        await db.update(parents).set({
          phoneNumber: parentPhoneInput || parentRow.phoneNumber,
          parentEmail: parentEmailInput || parentRow.parentEmail,
          address: parentAddressInput || null,
        }).where(eq(parents.id, parentRow.id));
      }
    } else if (parentNameInput) {
      const parentEmailAccount = `parent-${s.userId}@parents.local`;
      const parentRaw = Math.random().toString(36).slice(2, 10) + 'Pp1!';
      const parentHashed = await bcrypt.hash(parentRaw, 12);
      const [parentInserted] = await db
        .insert(users)
        .values({ name: parentNameInput, email: parentEmailAccount, password: parentHashed, role: 'parent' })
        .$returningId();

      if (parentInserted?.id) {
        const [parentRow] = await db
          .insert(parents)
          .values({
            userId: parentInserted.id,
            phoneNumber: parentPhoneInput || undefined,
            parentEmail: parentEmailInput || undefined,
            address: parentAddressInput || undefined,
          })
          .$returningId();

        if (parentRow?.id) {
          await db.insert(studentParents).values({ studentId: sid, parentId: parentRow.id, relation: 'parent' });
        }
      }
    }

    await createNotification(
      'Student Updated',
      `Student "${fullName}" record has been updated.`,
      'info',
      'low'
    );

    revalidatePath('/admin/students');
    revalidatePath('/admin');
  }

  async function deleteStudent(formData: FormData) {
    'use server';
    const sid = Number(formData.get('id'));
    const studentName = u?.name || `Student #${sid}`;

    const mappings = await db.select().from(studentParents).where(eq(studentParents.studentId, sid));
    for (const m of mappings) {
      const [p] = await db.select().from(parents).where(eq(parents.id, m.parentId)).limit(1);
      await db.delete(studentParents).where(eq(studentParents.id, m.id));
      if (p) {
        await db.delete(parents).where(eq(parents.id, p.id));
        await db.delete(users).where(eq(users.id, p.userId));
      }
    }

    const [studentRow] = await db.select().from(students).where(eq(students.id, sid)).limit(1);
    if (studentRow) {
      await db.delete(students).where(eq(students.id, sid));
      await db.delete(users).where(eq(users.id, studentRow.userId));
    }

    await createNotification(
      'Student Deleted',
      `Student "${studentName}" has been removed from the system.`,
      'warning',
      'high'
    );

    revalidatePath('/admin/students');
    revalidatePath('/admin');
  }

  const initial = {
    id: s.id,
    fullName: u?.name || '',
    email: u?.email || '',
    rollNumber: s.rollNumber || '',
    classId: s.classId || undefined,
    dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().slice(0, 10) : undefined,
    gender: s.gender || '',
    parentName,
    parentPhone,
    parentEmail,
    parentAddress,
  };

  const className = cls ? `${cls.name}${cls.section ? ' – ' + cls.section : ''}` : `Class ${s.classId}`;
  const displayDate = formatDate(s.dateOfBirth);
  const displayGender = s.gender ? s.gender[0].toUpperCase() + s.gender.slice(1) : '—';

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <a
              href="/admin/students"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition hover:text-cyan-400"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Students
            </a>

            <div className="mt-5 flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-xl font-bold text-white shadow-lg shadow-cyan-500/20">
                {(u?.name || 'S')[0]}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{u?.name}</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Class {className}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-500 dark:text-cyan-300">
                    Roll No: {s.rollNumber || '—'}
                  </span>
                  <span className="rounded-xl border border-border bg-hover px-3 py-1.5 text-xs font-semibold text-foreground">
                    DOB: {displayDate}
                  </span>
                  <span className="rounded-xl border border-border bg-hover px-3 py-1.5 text-xs font-semibold text-foreground capitalize">
                    {displayGender}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-md transition-colors duration-200 sm:p-6">
          <div className="border-b border-border pb-5 mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
              Edit Record
            </p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">Student Details</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Update profile, enrollment, and guardian information in one clean layout.
            </p>
          </div>
          <StudentForm action={updateStudent} initial={initial} submitLabel="Update Student" />
        </section>

        <div className="space-y-6">
          <div className={`grid gap-6 ${parentUserId ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
            {u && <CredentialsManager userId={u.id} label="Student Account Credentials" />}
            {parentUserId && <CredentialsManager userId={parentUserId} label="Parent Account Credentials" />}
          </div>

          <section className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 shadow-md transition-colors duration-200 md:max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 dark:text-red-400">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-red-500 dark:text-red-400">
                  Danger Zone
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Remove the student record and linked account.
                </p>
              </div>
            </div>
            <p className="mb-5 text-sm leading-6 text-muted-foreground">
              Permanently delete this student, their linked guardian mapping, and student login account. This action cannot be undone.
            </p>
            <DeleteButton action={deleteStudent} label="Delete Student" id={s.id} />
          </section>
        </div>
      </div>
    </main>
  );
}
