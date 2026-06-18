import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers, teacherSubjectAssignments, subjects } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  getTeacherClasses,
  getAttendanceKPIs,
} from "@/lib/teacher-attendance.service";
import AttendanceClient from "@/components/teacher/AttendanceClient";

export const dynamic = "force-dynamic";

export default async function TeacherAttendancePage() {
  const user = await requireRole("teacher");

  const [teacher] = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.userId, user.id))
    .limit(1);

  const classes = teacher ? await getTeacherClasses(teacher.id) : [];
  const kpis = teacher ? await getAttendanceKPIs(teacher.id) : {
    presentPct: 0, absentPct: 0, atRiskPct: 0, totalStudents: 0,
  };

  const assignedSubjects = teacher
    ? await db
        .select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
        })
        .from(teacherSubjectAssignments)
        .leftJoin(subjects, eq(teacherSubjectAssignments.subjectId, subjects.id))
        .where(eq(teacherSubjectAssignments.teacherId, teacher.id))
    : [];

  const formattedSubjects = assignedSubjects
    .map((s) => {
      if (!s.id) return null;
      return {
        id: s.id,
        name: s.name ? `${s.name}${s.code ? ` (${s.code})` : ""}` : "Unknown Subject",
      };
    })
    .filter((s): s is { id: number; name: string } => s !== null);

  return (
    <AttendanceClient
      teacherId={teacher?.id ?? null}
      teacherUserId={user.id}
      classes={classes}
      subjects={formattedSubjects}
      kpis={kpis}
    />
  );
}
