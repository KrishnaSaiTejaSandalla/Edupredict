import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { classes, students } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/lib/notification-actions';
import DeleteButton from '@/components/ui/DeleteButton';
import ClassForm from '@/components/admin/ClassForm';
import { parseDbError } from '@/lib/db-errors';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClassEditPage({ params }: Props) {
  await requireRole('admin');

  const { id } = await params;
  const classId = Number(id);
  const [cls] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
  if (!cls) {
    return <div className="p-8 text-white">Class not found.</div>;
  }

  async function updateClass(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '').trim();
    const section = String(formData.get('section') || '').trim();
    const academicYear = String(formData.get('academicYear') || '').trim();

    if (!name) throw new Error('Class name is required.');

    try {
      await db.update(classes).set({
        name,
        section: section || null,
        academicYear: academicYear || null,
      }).where(eq(classes.id, classId));
    } catch (err) {
      throw new Error(parseDbError(err));
    }

    await createNotification('Class Updated', `Class "${name} ${section}" details were updated.`, 'info', 'medium');
    revalidatePath('/admin/classes');
  }

  async function deleteClass(formData: FormData) {
    'use server';
    const studentExists = await db.select().from(students).where(eq(students.classId, classId)).limit(1);
    if (studentExists.length > 0) {
      throw new Error('Cannot delete class while students are assigned. Remove or reassign students first.');
    }

    try {
      await db.delete(classes).where(eq(classes.id, classId));
    } catch (err) {
      throw new Error(parseDbError(err));
    }
    await createNotification('Class Deleted', `Class "${cls.name} ${cls.section || ''}" was deleted.`, 'info', 'medium');
    revalidatePath('/admin/classes');
  }

  const initial = {
    id: cls.id,
    name: cls.name,
    section: cls.section || '',
    academicYear: cls.academicYear || '',
  };

  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <a
            href="/admin/classes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition mb-3"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Classes
          </a>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Class {cls.name}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {cls.section ? `Section: ${cls.section}` : 'General Section'} &bull; Academic Year: {cls.academicYear || '—'}
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-2xl space-y-6">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-5">Edit Class</h2>
          <ClassForm action={updateClass} initial={initial} submitLabel="Update Class" />
        </section>

        <section className="rounded-2xl border border-red-500/20 bg-red-950/10 p-6 shadow-xl shadow-black/20">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">Danger Zone</h2>
          <p className="text-xs text-slate-400 mb-4">
            Deleting this class is only allowed if no students are assigned.
          </p>
          <input type="hidden" name="id" value={String(cls.id)} />
          <DeleteButton action={deleteClass} label="Delete Class" />
        </section>
      </div>
    </main>
  );
}
