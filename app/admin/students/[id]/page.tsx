import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, students, parents, studentParents, classes } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import StudentForm from '@/components/admin/StudentForm';
import DeleteButton from '@/components/ui/DeleteButton';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/lib/notification-actions';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StudentEditPage({ params }: Props) {
  await requireRole('admin');

  const { id } = await params;
  const studentId = Number(id);
  const [s] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  if (!s) return <div className="p-8 text-white">Student not found</div>;

  const [u] = await db.select().from(users).where(eq(users.id, s.userId)).limit(1);
  const [cls] = await db.select().from(classes).where(eq(classes.id, s.classId)).limit(1);

  // Fetch parent info for prefill
  const spRows = await db.select().from(studentParents).where(eq(studentParents.studentId, studentId));
  let parentName = '';
  let parentPhone = '';
  if (spRows.length) {
    const [parentRow] = await db.select().from(parents).where(eq(parents.id, spRows[0].parentId)).limit(1);
    if (parentRow) {
      const [parentUser] = await db.select().from(users).where(eq(users.id, parentRow.userId)).limit(1);
      parentName = parentUser?.name || '';
      parentPhone = parentRow.phoneNumber || '';
    }
  }

  async function updateStudent(formData: FormData) {
    'use server';
    const sid = Number(formData.get('id'));
    const fullName = String(formData.get('fullName') || '');
    const admissionNumber = String(formData.get('admissionNumber') || '');
    const rollNumber = String(formData.get('rollNumber') || '');
    const classId = formData.get('classId') ? Number(formData.get('classId')) : null;
    const dateOfBirth = String(formData.get('dateOfBirth') || '');
    const gender = String(formData.get('gender') || '');
    const parentNameInput = String(formData.get('parentName') || '');
    const parentPhone = String(formData.get('parentPhone') || '');

    // Update user name
    await db.update(users).set({ name: fullName }).where(eq(users.id, s.userId));

    // Update student record
    await db.update(students).set({
      classId: classId ?? undefined,
      rollNumber: rollNumber || undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender: gender || undefined,
    }).where(eq(students.id, sid));

    // Parent handling
    const mappings = await db.select().from(studentParents).where(eq(studentParents.studentId, sid));
    if (mappings.length) {
      const [parentRow] = await db.select().from(parents).where(eq(parents.id, mappings[0].parentId)).limit(1);
      if (parentRow) {
        await db.update(users).set({ name: parentNameInput }).where(eq(users.id, parentRow.userId));
        await db.update(parents).set({ phoneNumber: parentPhone || parentRow.phoneNumber }).where(eq(parents.id, parentRow.id));
      }
    } else if (parentNameInput) {
      const parentEmail = `parent-${s.userId}@parents.local`;
      const parentRaw = Math.random().toString(36).slice(2, 10) + 'Pp1!';
      const parentHashed = await bcrypt.hash(parentRaw, 12);
      const [parentInserted] = await db
        .insert(users)
        .values({ name: parentNameInput, email: parentEmail, password: parentHashed, role: 'parent' })
        .$returningId();

      if (parentInserted?.id) {
        const [parentRow] = await db
          .insert(parents)
          .values({ userId: parentInserted.id, phoneNumber: parentPhone || undefined })
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

    // Delete parent mappings
    const mappings = await db.select().from(studentParents).where(eq(studentParents.studentId, sid));
    for (const m of mappings) {
      const [p] = await db.select().from(parents).where(eq(parents.id, m.parentId)).limit(1);
      await db.delete(studentParents).where(eq(studentParents.id, m.id));
      if (p) {
        await db.delete(parents).where(eq(parents.id, p.id));
        await db.delete(users).where(eq(users.id, p.userId));
      }
    }

    // Delete student record and user
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
    rollNumber: s.rollNumber || '',
    classId: s.classId || undefined,
    dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().slice(0, 10) : undefined,
    gender: s.gender || '',
    parentName,
    parentPhone,
  };

  const className = cls ? `${cls.name}${cls.section ? ' – ' + cls.section : ''}` : `Class ${s.classId}`;

  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <a
            href="/admin/students"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition mb-3"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Students
          </a>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{u?.name}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {className} &bull; Roll No: {s.rollNumber || '—'}
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-2xl space-y-6">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-5">Edit Student</h2>
          <StudentForm action={updateStudent} initial={initial} submitLabel="Update Student" />
        </section>

        <section className="rounded-2xl border border-red-500/20 bg-red-950/10 p-6 shadow-xl shadow-black/20">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">Danger Zone</h2>
          <p className="text-xs text-slate-400 mb-4">
            Permanently delete this student along with their parent mapping. This action cannot be undone.
          </p>
          <input type="hidden" name="id" value={String(s.id)} />
          <DeleteButton action={deleteStudent} label="Delete Student" />
        </section>
      </div>
    </main>
  );
}
