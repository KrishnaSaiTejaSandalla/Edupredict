import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, students, parents, studentParents } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import StudentForm from '@/components/admin/StudentForm';
import DeleteButton from '@/components/ui/DeleteButton';
import { revalidatePath } from 'next/cache';

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
  if (!s) return <div className="p-8">Student not found</div>;
  const [u] = await db.select().from(users).where(eq(users.id, s.userId)).limit(1);

  async function updateStudent(formData: FormData) {
    'use server';
    const sid = Number(formData.get('id'));
    const fullName = String(formData.get('fullName') || '');
    const admissionNumber = String(formData.get('admissionNumber') || '');
    const rollNumber = String(formData.get('rollNumber') || '');
    const classId = formData.get('classId') ? Number(formData.get('classId')) : null;
    const dateOfBirth = String(formData.get('dateOfBirth') || '');
    const gender = String(formData.get('gender') || '');
    const parentName = String(formData.get('parentName') || '');
    const parentPhone = String(formData.get('parentPhone') || '');

    // update user
    await db.update(users).set({ name: fullName }).where(eq(users.id, s.userId));

    // update student record
    await db.update(students).set({
      classId: classId ?? undefined, rollNumber: rollNumber || undefined, dateOfBirth: dateOfBirth
        ? new Date(dateOfBirth)
        : undefined, gender: gender || undefined
    }).where(eq(students.id, sid));

    // parent handling: simple approach - if an existing mapping exists update parent record; otherwise create
    const spRows = await db.select().from(studentParents).where(eq(studentParents.studentId, sid));
    if (spRows.length) {
      const parentRow = await db.select().from(parents).where(eq(parents.id, spRows[0].parentId)).limit(1);
      if (parentRow && parentRow.length) {
        const p = parentRow[0];
        // update parent user
        await db.update(users).set({ name: parentName }).where(eq(users.id, p.userId));
        await db.update(parents).set({ phoneNumber: parentPhone || p.phoneNumber }).where(eq(parents.id, p.id));
      }
    } else if (parentName) {
      // create parent user and mapping
      const parentEmail = `${s.userId}-parent@parents.local`;
      const parentRaw = Math.random().toString(36).slice(2, 10) + 'Pp1!';
      const parentHashed = await bcrypt.hash(parentRaw, 12);
      await db.insert(users).values({ name: parentName, email: parentEmail, password: parentHashed, role: 'parent' });
      const [parentUser] = await db.select().from(users).where(eq(users.email, parentEmail)).limit(1);
      if (parentUser) {
        await db.insert(parents).values({ userId: parentUser.id, phoneNumber: parentPhone || undefined });
        const [parentRow] = await db.select().from(parents).where(eq(parents.userId, parentUser.id)).limit(1);
        if (parentRow) {
          await db.insert(studentParents).values({ studentId: sid, parentId: parentRow.id, relation: 'parent' });
        }
      }
    }

    revalidatePath('/admin/students');
    revalidatePath("/admin");
  }

  async function deleteStudent(formData: FormData) {
    'use server';
    const sid = Number(formData.get('id'));
    // delete mappings
    const mappings = await db.select().from(studentParents).where(eq(studentParents.studentId, sid));
    for (const m of mappings) {
      // delete parent record and user
      const [p] = await db.select().from(parents).where(eq(parents.id, m.parentId)).limit(1);
      await db.delete(studentParents)
        .where(eq(studentParents.id, m.id));

      if (p) {
        await db.delete(parents)
          .where(eq(parents.id, p.id));

        await db.delete(users)
          .where(eq(users.id, p.userId));
      }
    }

    // delete student record and student user
    const [studentRow] = await db.select().from(students).where(eq(students.id, sid)).limit(1);
    if (studentRow) {
      await db.delete(students).where(eq(students.id, sid));
      await db.delete(users).where(eq(users.id, studentRow.userId));
    }

    revalidatePath('/admin/students');
    revalidatePath("/admin");
  }

  const initial = {
    id: s.id,
    fullName: u?.name || '',
    rollNumber: s.rollNumber || '',
    classId: s.classId || undefined,
    dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().slice(0, 10) : undefined,
    gender: s.gender || '',
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Edit Student</h1>
      <div className="max-w-3xl">
        <StudentForm action={updateStudent} initial={initial} submitLabel="Update Student" />

        <div className="mt-4">
          <input type="hidden" name="id" value={String(s.id)} />
          <DeleteButton action={deleteStudent} label="Delete Student" />
        </div>
      </div>
    </main>
  );
}
