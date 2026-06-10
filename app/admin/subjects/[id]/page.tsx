import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { subjects } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import SubjectForm from '@/components/admin/SubjectForm';
import DeleteButton from '@/components/ui/DeleteButton';

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

    await db.update(subjects).set({
      name,
      code,
      description: description || null,
      maxMarks: maxMarks !== null ? String(maxMarks) : null,
passingMarks: passingMarks !== null ? String(passingMarks) : null,
    }).where(eq(subjects.id, subjectId));

    revalidatePath('/admin/subjects');
  }

  async function deleteSubject(formData: FormData) {
    'use server';
    await db.delete(subjects).where(eq(subjects.id, subjectId));
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
    <main className="p-8 min-h-screen">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Edit Subject</h1>
          <p className="text-slate-400">Update this subject or delete it from the catalog.</p>
        </div>

        <SubjectForm action={updateSubject} initial={initial} submitLabel="Update Subject" />

        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
          <p className="mb-4 text-slate-300">Deleting a subject removes it from the course catalog.</p>
          <DeleteButton action={deleteSubject} label="Delete Subject" />
        </div>
      </div>
    </main>
  );
}
