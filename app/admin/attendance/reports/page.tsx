import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { classes, students, users, attendance } from '@/lib/schema';
import { sql, and, eq, desc } from 'drizzle-orm';

type Props = {
  searchParams?: Promise<{
    classId?: string;
  }>;
};

export default async function AttendanceReportsPage({
  searchParams,
}: Props) {
  await requireRole('admin');

  const sp = await searchParams;
  const classId = sp?.classId ? Number(sp.classId) : null;

  const classList = await db.select().from(classes);

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const studentsList = classId
    ? await db
        .select({
          student: students,
          user: users,
        })
        .from(students)
        .innerJoin(users, eq(users.id, students.userId))
        .where(eq(students.classId, classId))
    : [];

  const attendanceRows = classId
    ? await db
        .select({
          studentId: attendance.studentId,
          status: attendance.status,
          attendanceDate: attendance.attendanceDate,
        })
        .from(attendance)
        .where(
          and(
            eq(attendance.classId, classId),
            sql`${attendance.attendanceDate} >= ${since}`
          )
        )
        .orderBy(desc(attendance.attendanceDate))
    : [];

  const summaryMap = new Map<
    number,
    {
      present: number;
      total: number;
    }
  >();

  for (const row of attendanceRows) {
    const current = summaryMap.get(row.studentId) ?? {
      present: 0,
      total: 0,
    };

    if (row.status === 'present') {
      current.present++;
    }

    current.total++;

    summaryMap.set(row.studentId, current);
  }

  const report = studentsList.map((row) => {
    const stats = summaryMap.get(row.student.id) ?? {
      present: 0,
      total: 0,
    };

    return {
      id: row.student.id,
      name: row.user.name,
      present: stats.present,
      total: stats.total,
      percentage:
        stats.total > 0
          ? Math.round((stats.present / stats.total) * 100)
          : 0,
    };
  });

  return (
    <main className="p-8 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Attendance Reports (Last 30 Days)
        </h1>
      </div>

      <form
        action="/admin/attendance/reports"
        method="get"
        className="mb-6"
      >
        <select
          name="classId"
          defaultValue={classId ?? ''}
          className="border rounded px-3 py-2"
        >
          <option value="">Select Class</option>

          {classList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.section ? ` - ${c.section}` : ''}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="ml-3 rounded bg-cyan-600 px-4 py-2 text-white"
        >
          Load Report
        </button>
      </form>

      {classId ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 text-left">Student</th>
                <th className="border p-2 text-left">Present</th>
                <th className="border p-2 text-left">Total Days</th>
                <th className="border p-2 text-left">Attendance %</th>
              </tr>
            </thead>

            <tbody>
              {report.map((student) => (
                <tr key={student.id}>
                  <td className="border p-2">{student.name}</td>
                  <td className="border p-2">{student.present}</td>
                  <td className="border p-2">{student.total}</td>
                  <td className="border p-2">
                    {student.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {report.length === 0 && (
            <div className="mt-4 text-slate-500">
              No attendance data found.
            </div>
          )}
        </div>
      ) : (
        <div className="text-slate-500">
          Select a class to view attendance reports.
        </div>
      )}
    </main>
  );
}