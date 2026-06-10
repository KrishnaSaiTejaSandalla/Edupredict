import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, teachers } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import TeacherForm from '@/components/admin/TeacherForm';
import DeleteButton from '@/components/ui/DeleteButton';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TeacherEditPage({ params }: Props) {
  await requireRole('admin');

  const { id } = await params;
  const teacherId = Number(id);
  const [teacher] = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
  if (!teacher) {
    return <div className="p-8 text-white">Teacher not found.</div>;
  }

  const [user] = await db.select().from(users).where(eq(users.id, teacher.userId)).limit(1);

  async function updateTeacher(formData: FormData) {
    'use server';
    const fullName = String(formData.get('fullName') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const phoneNumber = String(formData.get('phoneNumber') || '').trim();
    const qualification = String(formData.get('qualification') || '').trim();
    const experience = Number(formData.get('experience') || 0);
    const department = String(formData.get('department') || '').trim();
    const employeeId = String(formData.get('employeeId') || '').trim();
    const joinDate = String(formData.get('joinDate') || '').trim();
    const schoolId = 1;

    if (!fullName || !email || !employeeId) {
      throw new Error('Full name, email, and employee ID are required.');
    }

    await db.update(users).set({ name: fullName, email }).where(eq(users.id, teacher.userId));
    await db.update(teachers).set({
      phoneNumber: phoneNumber || null,
      qualification: qualification || null,
      experience: experience || null,
      department: department || null,
      employeeId,
      joinDate: joinDate ? new Date(joinDate) : null,
      schoolId,
    }).where(eq(teachers.id, teacherId));

    revalidatePath('/admin/teachers');
  }

  async function deleteTeacher(formData: FormData) {
    'use server';
    await db.delete(teachers).where(eq(teachers.id, teacherId));
    await db.delete(users).where(eq(users.id, teacher.userId));
    revalidatePath('/admin/teachers');
    revalidatePath("/admin");
  }

  const initial = {
    id: teacher.id,
    fullName: user?.name || '',
    email: user?.email || '',
    phoneNumber: teacher.phoneNumber || '',
    qualification: teacher.qualification || '',
    experience: teacher.experience ?? 0,
    department: teacher.department || '',
    employeeId: teacher.employeeId || '',
    joinDate: teacher.joinDate ? new Date(teacher.joinDate).toISOString().slice(0, 10) : '',
    schoolId: teacher.schoolId || 1,
  };

  return (
    <main className="p-8 min-h-screen">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Edit Teacher</h1>
          <p className="text-slate-400">Update teacher details or delete the record.</p>
        </div>

        <TeacherForm action={updateTeacher} initial={initial} submitLabel="Update Teacher" />

        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
          <p className="mb-4 text-slate-300">Deleting a teacher will remove the linked user record as well.</p>
          <DeleteButton action={deleteTeacher} label="Delete Teacher" />
        </div>
      </div>
    </main>
  );
}
