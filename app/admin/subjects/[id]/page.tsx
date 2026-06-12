import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { subjects } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/lib/notification-actions';
import SubjectForm from '@/components/admin/SubjectForm';
import DeleteButton from '@/components/ui/DeleteButton';
import { parseDbError } from '@/lib/db-errors';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SubjectEditPage({ params }: Props) {
  await requireRole('admin');

  const { id } = await params;
  const subjectId = Number(id);
  const subjectRows = await db
    .select()
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .limit(1);

  const subject = subjectRows[0];
  if (!subject) {
    return <div className="p-8 text-white">Subject not found.</div>;
  }

  async function updateSubject(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '').trim();
    const code = String(formData.get('code') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const maxMarksValue = formData.get('maxMarks');
    const passingMarksValue = formData.get('passingMarks');
    const maxMarks = maxMarksValue ? Number(maxMarksValue) : null;
    const passingMarks = passingMarksValue ? Number(passingMarksValue) : null;

    if (!name || !code) {
      throw new Error('Name and code are required.');
    }

    try {
      await db.update(subjects).set({
        name,
        code,
        description: description || null,
        maxMarks: maxMarks !== null ? String(maxMarks) : null,
        passingMarks: passingMarks !== null ? String(passingMarks) : null,
      }).where(eq(subjects.id, subjectId));
    } catch (err) {
      throw new Error(parseDbError(err));
    }

    await createNotification('Subject Updated', `Subject "${name}" details have been updated.`, 'info', 'medium');
    revalidatePath('/admin/subjects');
  }

  async function deleteSubject(formData: FormData) {
    'use server';
    try {
      await db.delete(subjects).where(eq(subjects.id, subjectId));
    } catch (err) {
      throw new Error(parseDbError(err));
    }
    await createNotification('Subject Deleted', `Subject "${subject.name}" was deleted.`, 'info', 'medium');
    revalidatePath('/admin/subjects');
  }

  const initial = {
    id: subject.id,
    name: subject.name,
    code: subject.code || '',
    description: subject.description || '',
    maxMarks: subject.maxMarks ? Number(subject.maxMarks) : undefined,
    passingMarks: subject.passingMarks ? Number(subject.passingMarks) : undefined,
  };

  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <a
            href="/admin/subjects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition mb-3"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Subjects
          </a>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{subject.name}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Code: {subject.code} &bull; Max Marks: {subject.maxMarks ?? '100'} &bull; Passing Marks: {subject.passingMarks ?? '40'}
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-2xl space-y-6">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-5">Edit Subject</h2>
          <SubjectForm action={updateSubject} initial={initial} submitLabel="Update Subject" />
        </section>

        <section className="rounded-2xl border border-red-500/20 bg-red-950/10 p-6 shadow-xl shadow-black/20">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">Danger Zone</h2>
          <p className="text-xs text-slate-400 mb-4">
            Deleting a subject removes it from the course catalog. This action cannot be undone.
          </p>
          <input type="hidden" name="id" value={String(subject.id)} />
          <DeleteButton action={deleteSubject} label="Delete Subject" />
        </section>
      </div>
    </main>
  );
}
