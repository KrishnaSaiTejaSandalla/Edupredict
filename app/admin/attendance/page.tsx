import { requireRole, getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { attendance, classes, students, users } from '@/lib/schema';
import { and, eq, like } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import AttendanceForm from '@/components/admin/AttendanceForm';

type SearchParams = {
  classId?: string;
  date?: string;
};

type Props = {
  searchParams: Promise<{
    classId?: string;
    date?: string;
  }>;
};

export default async function AttendancePage({
  searchParams,
}: Props) {
  await requireRole('admin');

  const sp = await searchParams;

  const classId = sp?.classId ? Number(sp.classId) : null;
  const date =
    sp?.date || new Date().toISOString().slice(0, 10);

  const classList = await db
    .select()
    .from(classes);

  const studentsForClass = classId
    ? await db
      .select({ s: students, u: users })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .where(eq(students.classId, classId))
      .orderBy(students.rollNumber)
    : [];

  const attendanceDate = new Date(date);

  const attendanceRows = classId
    ? await db
      .select()
      .from(attendance)
      .where(eq(attendance.classId, classId))
    : [];

  const existingStatus = attendanceRows.reduce((acc, row) => {
    const rowDate = new Date(row.attendanceDate)
      .toISOString()
      .slice(0, 10);

    if (rowDate === date) {
      acc[row.studentId] = row.status;
    }

    return acc;
  }, {} as Record<number, string>);


  const presentCount = Object.values(existingStatus).filter((status) => status === 'present').length;
  const absentCount = Object.values(existingStatus).filter((status) => status === 'absent').length;

  async function saveAttendance(formData: FormData) {
    'use server';

    const classIdValue = Number(formData.get('classId'));
    const dateValue = String(formData.get('date'));
    const attendanceDate = new Date(dateValue);

    const studentIds = formData
      .getAll('studentId')
      .map((value) => Number(value));

    const currentUser = await getCurrentUser();
    const markedBy = currentUser?.id || null;

    if (!classIdValue || !dateValue) {
      throw new Error('Class and date are required.');
    }

    const existing = await db
      .select()
      .from(attendance)
      .where(eq(attendance.classId, classIdValue));

    const existingMap = existing
      .filter(
        (row) =>
          new Date(row.attendanceDate)
            .toISOString()
            .slice(0, 10) === dateValue
      )
      .reduce((acc, row) => {
        acc[row.studentId] = row;
        return acc;
      }, {} as Record<number, (typeof existing)[number]>);

    for (const studentId of studentIds) {
      const status = String(
        formData.get(`status-${studentId}`) || 'absent'
      );

      const record = existingMap[studentId];

      if (record) {
        await db
          .update(attendance)
          .set({
            status,
            remarks: null,
            markedBy,
          })
          .where(eq(attendance.id, record.id));
      } else {
        await db.insert(attendance).values({
          studentId,
          classId: classIdValue,
          attendanceDate,
          status,
          remarks: null,
          markedBy,
        });
      }
    }

    revalidatePath('/admin/attendance');
    revalidatePath('/admin/attendance/history');
    revalidatePath('/admin/attendance/summary');
  }

  return (
    <main className="p-8 min-h-screen">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="text-sm text-slate-400">Select a class and date, then mark students present or absent.</p>
        </div>
        <nav className="flex gap-3 text-sm">
          <a href="/admin/attendance" className="rounded border border-slate-700 px-3 py-2 text-slate-200 hover:bg-slate-800">Take Attendance</a>
          <a href="/admin/attendance/history" className="rounded border border-slate-700 px-3 py-2 text-slate-200 hover:bg-slate-800">History</a>
          <a href="/admin/attendance/summary" className="rounded border border-slate-700 px-3 py-2 text-slate-200 hover:bg-slate-800">Summary</a>
        </nav>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 mb-6">
        <form className="grid gap-4 sm:grid-cols-3" action="/admin/attendance" method="get">
          <div>
            <label className="block text-sm font-medium mb-1">Class</label>
            <select name="classId" defaultValue={classId ?? ''} className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white">
              <option value="">Choose class</option>
              {classList.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name} {cls.section ? `(${cls.section})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              name="date"
              type="date"
              defaultValue={date}
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full rounded bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-500">Load Students</button>
          </div>
        </form>
      </section>

      {classId ? (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-sm text-slate-400">Present</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-400">{presentCount}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-sm text-slate-400">Absent</p>
              <p className="mt-2 text-3xl font-semibold text-rose-400">{absentCount}</p>
            </div>
          </div>

          <AttendanceForm
            students={studentsForClass.map((row) => ({ id: row.s.id, name: row.u.name, rollNumber: row.s.rollNumber }))}
            existingStatus={existingStatus}
            action={saveAttendance}
            classId={classId}
            date={date}
          />
        </section>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-6 text-slate-400">Choose a class and date to load attendance.</div>
      )}
    </main>
  );
}
