import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { students, users, attendance, classes } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StudentAttendanceReport({
  params,
}: Props) {
  await requireRole('admin');

  const { id } = await params;
  const studentId = Number(id);

  const [studentRow] = await db
    .select({
      s: students,
      u: users,
      c: classes,
    })
    .from(students)
    .leftJoin(users, eq(users.id, students.userId))
    .leftJoin(classes, eq(classes.id, students.classId))
    .where(eq(students.id, studentId))
    .limit(1);

  if (!studentRow) {
    return (
      <main className="p-8 min-h-screen">
        <div className="text-slate-400">Student not found.</div>
      </main>
    );
  }

  const rows = await db
    .select()
    .from(attendance)
    .where(eq(attendance.studentId, studentId))
    .orderBy(desc(attendance.attendanceDate));

  const total = rows.length;
  const present = rows.filter((r) => r.status === 'present').length;
  const absent = rows.filter((r) => r.status === 'absent').length;
  const percentage = total
    ? Math.round((present / total) * 100)
    : 0;

  return (
    <main className="p-8 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {studentRow.u?.name ?? 'Student'} — Attendance Report
          </h1>

          <p className="text-sm text-slate-400">
            Class: {studentRow.c?.name ?? '—'}
          </p>
        </div>

        <div className="space-y-1 text-right">
          <div className="text-sm text-slate-400">Present</div>
          <div className="text-2xl font-semibold text-emerald-400">
            {present}
          </div>

          <div className="text-sm text-slate-400">Absent</div>
          <div className="text-2xl font-semibold text-rose-400">
            {absent}
          </div>

          <div className="text-sm text-slate-400">Attendance %</div>
          <div className="text-2xl font-semibold">
            {percentage}%
          </div>
        </div>
      </div>

      <section className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/70">
        <table className="min-w-full border-collapse text-left text-white">
          <thead className="bg-slate-950/80 text-slate-300">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Status</th>
              <th className="p-3">Remarks</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-slate-800"
              >
                <td className="p-3">
                  {new Date(r.attendanceDate)
                    .toISOString()
                    .slice(0, 10)}
                </td>

                <td
                  className={`p-3 font-medium ${
                    r.status === 'present'
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {r.status}
                </td>

                <td className="p-3">
                  {r.remarks ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="p-4 text-slate-400">
            No attendance records for this student.
          </div>
        )}
      </section>
    </main>
  );
}