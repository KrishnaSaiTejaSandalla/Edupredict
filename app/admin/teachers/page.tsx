import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, teachers } from '@/lib/schema';
import { asc, desc, eq, like } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import TeacherForm from '@/components/admin/TeacherForm';
import AdminSearch from '@/components/admin/AdminSearch';

type SearchParams = {
  q?: string;
  page?: string;
  sort?: string;
  dir?: string;
};

type Props = {
  searchParams?: Promise<SearchParams>;
};

export default async function TeachersPage({ searchParams }: Props) {
  await requireRole('admin');

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const q = resolvedSearchParams?.q || '';
  const page = Number(resolvedSearchParams?.page || '1');
  const sort = resolvedSearchParams?.sort || 'id';
  const dir = resolvedSearchParams?.dir === 'desc' ? 'desc' : 'asc';
  const limit = 10;
  const offset = (page - 1) * limit;
  const orderBy =
    sort === 'name'
      ? users.name
      : sort === 'employeeId'
        ? teachers.employeeId
        : sort === 'department'
          ? teachers.department
          : teachers.id;

  const query = db
    .select({ t: teachers, u: users })
    .from(teachers)
    .innerJoin(users, eq(users.id, teachers.userId));

  if (q) {
    query.where(like(users.name, `%${q}%`));
  }

  const teacherRows = await query.orderBy(dir === 'desc' ? desc(orderBy) : asc(orderBy)).limit(limit).offset(offset);

  async function createTeacher(formData: FormData) {
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

    const rawPassword = Math.random().toString(36).slice(2, 10) + 'Aa1!';
    const hashed = await bcrypt.hash(rawPassword, 12);

    await db.insert(users).values({
      name: fullName,
      email,
      password: hashed,
      role: 'teacher',
      schoolId,
    });

    const [fallbackUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const userId = fallbackUser?.id;
    if (!userId) {
      throw new Error('Failed to create teacher user.');
    }

    await db.insert(teachers).values({
      userId,
      schoolId,
      phoneNumber: phoneNumber || null,
      qualification: qualification || null,
      experience: Number.isNaN(experience) ? null : experience,
      department: department || null,
      employeeId,
      joinDate: joinDate ? new Date(joinDate) : null,
    });
    revalidatePath('/admin/teachers');
    revalidatePath("/admin");
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
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Teachers</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Manage teacher accounts, credentials, and department assignments.</p>
        </div>
        <div className="w-full sm:w-auto">
          <AdminSearch placeholder="Search teachers..." />
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
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Employee ID</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {teacherRows.map((row) => (
                    <tr key={row.t.id} className="hover:bg-white/[0.02] transition duration-150 text-white">
                      <td className="px-6 py-4 text-xs font-semibold text-slate-500">#{row.t.id}</td>
                      <td className="px-6 py-4 font-semibold">{row.u.name}</td>
                      <td className="px-6 py-4 text-slate-300">{row.u.email}</td>
                      <td className="px-6 py-4 text-slate-300 font-mono text-xs">{row.t.employeeId}</td>
                      <td className="px-6 py-4">
                        {row.t.department ? (
                          <span className="inline-flex rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider border border-cyan-400/10">
                            {row.t.department}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <a
                            href={`/admin/teachers/${row.t.id}`}
                            title="View Profile"
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-slate-400 border border-white/5 hover:text-cyan-400 hover:border-cyan-400/30 transition duration-150"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </a>
                          <a
                            href={`/admin/teachers/${row.t.id}`}
                            title="Edit Teacher"
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

                  {teacherRows.length === 0 && (
                    <tr>
                      <td className="px-6 py-12 text-center" colSpan={6}>
                        <div className="flex flex-col items-center justify-center gap-2">
                          <svg viewBox="0 0 24 24" className="h-10 w-10 text-slate-600 fill-current">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z" />
                          </svg>
                          <p className="text-sm font-semibold text-slate-500">No teachers found</p>
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
              href={`/admin/teachers${baseQuery}${sortParam}&page=${prevPage}`}
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 hover:bg-slate-800 transition duration-150"
            >
              Previous
            </a>
            <a
              href={`/admin/teachers${baseQuery}${sortParam}&page=${nextPage}`}
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 hover:bg-slate-800 transition duration-150"
            >
              Next
            </a>
          </div>
        </div>

        {/* FORM SIDEBAR */}
        <aside className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20 self-start">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Create Teacher</h2>
          <TeacherForm action={createTeacher} submitLabel="Create Teacher" />
        </aside>
      </div>

    </main>
  );
}
