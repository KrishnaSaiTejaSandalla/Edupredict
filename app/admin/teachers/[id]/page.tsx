import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, teachers } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/lib/notification-actions';
import TeacherForm from '@/components/admin/TeacherForm';
import DeleteButton from '@/components/ui/DeleteButton';
import { parseDbError } from '@/lib/db-errors';

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

    try {
      await db.update(users).set({ name: fullName, email }).where(eq(users.id, teacher.userId));
      await db.update(teachers).set({
        phoneNumber: phoneNumber || null,
        qualification: qualification || null,
        experience: Number.isNaN(experience) ? null : experience,
        department: department || null,
        employeeId,
        joinDate: joinDate ? new Date(joinDate) : null,
        schoolId,
      }).where(eq(teachers.id, teacherId));
    } catch (err) {
      throw new Error(parseDbError(err));
    }

    await createNotification('Teacher Updated', `Teacher profile for "${fullName}" was updated.`, 'info', 'medium');
    revalidatePath('/admin/teachers');
  }

  async function deleteTeacher(formData: FormData) {
    'use server';
    try {
      await db.delete(teachers).where(eq(teachers.id, teacherId));
      await db.delete(users).where(eq(users.id, teacher.userId));
    } catch (err) {
      throw new Error(parseDbError(err));
    }
    await createNotification('Teacher Deleted', `Teacher "${user?.name || 'Unknown'}" was deleted.`, 'info', 'medium');
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
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <a
            href="/admin/teachers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition mb-3"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Teachers
          </a>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{user?.name}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {teacher.department || 'General Department'} &bull; Employee ID: {teacher.employeeId || '—'}
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-2xl space-y-6">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-5">Edit Teacher</h2>
          <TeacherForm action={updateTeacher} initial={initial} submitLabel="Update Teacher" />
        </section>

        <section className="rounded-2xl border border-red-500/20 bg-red-950/10 p-6 shadow-xl shadow-black/20">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">Danger Zone</h2>
          <p className="text-xs text-slate-400 mb-4">
            Permanently delete this teacher along with their linked user record. This action cannot be undone.
          </p>
          <input type="hidden" name="id" value={String(teacher.id)} />
          <DeleteButton action={deleteTeacher} label="Delete Teacher" />
        </section>
      </div>
    </main>
  );
}
