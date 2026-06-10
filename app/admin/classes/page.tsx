import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { classes } from '@/lib/schema';
import { eq, like } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import ClassForm from '@/components/admin/ClassForm';
import AdminSearch from '@/components/admin/AdminSearch';

type SearchParams = {
  q?: string;
  page?: string;
  sort?: string;
  dir?: string;
};

type Props = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
};

export default async function ClassesPage({
  searchParams,
}: Props) {
  await requireRole('admin');

  const sp = await searchParams;

  const q = sp?.q ?? '';
  const page = Number(sp?.page ?? '1');
  const sort = sp?.sort ?? 'id';
  const dir = sp?.dir === 'desc' ? 'desc' : 'asc';
  const limit = 10;
  const offset = (page - 1) * limit;

  const classRows = await db
    .select()
    .from(classes)
    .where(q ? like(classes.name, `%${q}%`) : undefined)
    .limit(limit)
    .offset(offset);

  async function createClass(formData: FormData) {
    'use server';
    const name = String(formData.get('name') || '').trim();
    const section = String(formData.get('section') || '').trim();
    const academicYear = String(formData.get('academicYear') || '').trim();

    if (!name) throw new Error('Class name is required.');

    await db.insert(classes).values({
      schoolId: 1,
      name,
      section: section || null,
      academicYear: academicYear || null,
    });
    revalidatePath('/admin/classes');
  }

  const nextPage = page + 1;
  const prevPage = page > 1 ? page - 1 : 1;
  const baseQuery = q ? `?q=${encodeURIComponent(q)}&` : '?';
  const sortParam = `sort=${encodeURIComponent(sort)}&dir=${encodeURIComponent(dir)}`;

  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Database</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Classes</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Manage academic sections, class groupings, and academic years.</p>
        </div>
        <div className="w-full sm:w-auto">
          <AdminSearch placeholder="Search classes..." />
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        
        {/* TABLE CONTAINER */}
        <div className="flex flex-col gap-6">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] shadow-xl shadow-black/20">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse text-slate-300">
                <thead className="bg-slate-950/60 border-b border-white/10 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Class Name</th>
                    <th className="px-6 py-4">Section</th>
                    <th className="px-6 py-4">Academic Year</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {classRows.map((cls) => (
                    <tr key={cls.id} className="hover:bg-white/[0.02] transition duration-150 text-white">
                      <td className="px-6 py-4 text-xs font-semibold text-slate-500">#{cls.id}</td>
                      <td className="px-6 py-4 font-semibold">Class {cls.name}</td>
                      <td className="px-6 py-4">
                        {cls.section ? (
                          <span className="inline-flex rounded-full bg-indigo-400/10 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider border border-indigo-400/10">
                            Section {cls.section}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{cls.academicYear || '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <a
                            href={`/admin/classes/${cls.id}`}
                            title="Edit Class"
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-slate-400 border border-white/5 hover:text-cyan-400 hover:border-cyan-400/30 transition duration-150"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
                            </svg>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {classRows.length === 0 && (
                    <tr>
                      <td className="px-6 py-12 text-center" colSpan={5}>
                        <div className="flex flex-col items-center justify-center gap-2">
                          <svg viewBox="0 0 24 24" className="h-10 w-10 text-slate-600 fill-current">
                            <path d="M4 6h16v2H4zm2 5h12v2H6zm3 5h6v2H9z" />
                          </svg>
                          <p className="text-sm font-semibold text-slate-500">No classes found</p>
                          <p className="text-xs text-slate-600">Try adjusting your search queries.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* PAGINATION */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <a
              href={`/admin/classes${baseQuery}${sortParam}&page=${prevPage}`}
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 hover:bg-slate-800 transition duration-150"
            >
              Previous
            </a>
            <a
              href={`/admin/classes${baseQuery}${sortParam}&page=${nextPage}`}
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 hover:bg-slate-800 transition duration-150"
            >
              Next
            </a>
          </div>
        </div>

        {/* FORM SIDEBAR */}
        <aside className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20 self-start">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Create Class</h2>
          <ClassForm action={createClass} submitLabel="Create Class" />
        </aside>
      </div>

    </main>
  );
}
