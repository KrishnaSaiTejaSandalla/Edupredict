import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { classes, students } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import DeleteButton from '@/components/ui/DeleteButton';
import ClassForm from '@/components/admin/ClassForm';

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

    await db.update(classes).set({
      name,
      section: section || null,
      academicYear: academicYear || null,
    }).where(eq(classes.id, classId));

    revalidatePath('/admin/classes');
  }

  async function deleteClass(formData: FormData) {
    'use server';
    const studentExists = await db.select().from(students).where(eq(students.classId, classId)).limit(1);
    if (studentExists.length > 0) {
      throw new Error('Cannot delete class while students are assigned. Remove or reassign students first.');
    }

    await db.delete(classes).where(eq(classes.id, classId));
    revalidatePath('/admin/classes');
  }

  const initial = {
    id: cls.id,
    name: cls.name,
    section: cls.section || '',
    academicYear: cls.academicYear || '',
  };

  return (
    <main className="p-8 min-h-screen">
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Edit Class</h1>
          <p className="text-slate-400">Update your class information or delete the record.</p>
        </div>

        <ClassForm action={updateClass} initial={initial} submitLabel="Update Class" />

        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
          <p className="mb-4 text-slate-300">Deleting this class is only allowed if no students are assigned.</p>
          {/* DeleteButton calls server action and handles toast/refresh */}
          <DeleteButton action={deleteClass} label="Delete Class" />
        </div>
      </div>
    </main>
  );
}
