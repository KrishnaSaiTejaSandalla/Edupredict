import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers, classTeacherAssignments, classes as dbClasses } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  getAttendanceKPIs,
} from "@/lib/teacher-attendance.service";
import AttendanceClient from "@/components/teacher/AttendanceClient";

export const dynamic = "force-dynamic";

function sortClasses(classes: { classId: number; className: string }[]): { classId: number; className: string }[] {
  return [...classes].sort((a, b) => {
    const parseClass = (name: string) => {
      const match = name.match(/^(\d+)([A-Za-z]*)$/);
      return match ? { num: parseInt(match[1]), letter: match[2] || "" } : { num: 0, letter: name };
    };
    const pa = parseClass(a.className);
    const pb = parseClass(b.className);
    if (pa.num !== pb.num) return pa.num - pb.num;
    return pa.letter.localeCompare(pb.letter);
  });
}

export default async function TeacherAttendancePage() {
  const user = await requireRole("teacher");

  const [teacher] = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.userId, user.id))
    .limit(1);

  if (!teacher) {
    return (
      <main className="min-h-screen bg-base p-4 sm:p-6 lg:p-8 text-primary flex items-center justify-center">
        <div className="text-center bg-card border border-border rounded-2xl p-8 max-w-md shadow-md">
          <h2 className="text-xl font-bold text-rose-500 mb-2">Access Denied</h2>
          <p className="text-sm text-secondary">Teacher record not found.</p>
        </div>
      </main>
    );
  }

  const classTeacherAssignmentsList = await db
    .select({
      classId: classTeacherAssignments.classId,
      className: dbClasses.name,
      classSection: dbClasses.section,
    })
    .from(classTeacherAssignments)
    .leftJoin(dbClasses, eq(classTeacherAssignments.classId, dbClasses.id))
    .where(eq(classTeacherAssignments.teacherId, teacher.id));

  const classTeacherClassIds = classTeacherAssignmentsList
    .map((a) => a.classId)
    .filter((id): id is number => id !== null);

  if (classTeacherClassIds.length === 0) {
    return (
      <main className="min-h-screen bg-base p-4 sm:p-6 lg:p-8 text-primary flex items-center justify-center">
        <div className="text-center bg-card border border-border rounded-2xl p-8 max-w-md shadow-md">
          <h2 className="text-xl font-bold text-rose-500 mb-2">Access Denied</h2>
          <p className="text-sm text-secondary">Only Class Teachers can access the Attendance page.</p>
        </div>
      </main>
    );
  }

  const classes = sortClasses(
    classTeacherAssignmentsList
      .filter((c): c is typeof c & { classId: number } => c.classId !== null)
      .map((c) => ({
        classId: c.classId,
        className: c.className
          ? `${c.className}${c.classSection ? ` ${c.classSection}` : ""}`
          : "N/A",
      }))
  );

  const kpis = await getAttendanceKPIs(teacher.id);

  const formattedClasses = classes.map(c => ({
    classId: c.classId,
    className: c.className,
  }));

  return (
    <AttendanceClient
      teacherId={teacher.id}
      teacherUserId={user.id}
      classes={formattedClasses}
      subjects={[]}
      kpis={kpis}
      classTeacherClassIds={classTeacherClassIds}
    />
  );
}