import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers, timetables, classes, subjects, teacherClassAssignments, teacherSubjectAssignments } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import TeacherTimetableClient from "@/components/teacher/TeacherTimetableClient";

export const dynamic = "force-dynamic";

type TimetableEntry = {
  id: number;
  subjectId: number;
  classId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  className: string;
  subjectName: string;
  teacherRole: "class_teacher" | "subject_teacher" | null;
};

export default async function TeacherTimetablePage() {
  const user = await requireRole("teacher");

  const [teacher] = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.userId, user.id))
    .limit(1);

  let entries: TimetableEntry[] = [];

  if (teacher) {
    const classRows = await db
      .select({ classId: teacherClassAssignments.classId })
      .from(teacherClassAssignments)
      .where(eq(teacherClassAssignments.teacherId, teacher.id));
    const assignedClassIds = classRows.map((r) => r.classId);

    const subjectRows = await db
      .select({ subjectId: teacherSubjectAssignments.subjectId })
      .from(teacherSubjectAssignments)
      .where(eq(teacherSubjectAssignments.teacherId, teacher.id));
    const assignedSubjectIds = subjectRows.map((r) => r.subjectId);

    if (assignedClassIds.length > 0 && assignedSubjectIds.length > 0) {
      const rows = await db
        .select({
          id: timetables.id,
          subjectId: timetables.subjectId,
          classId: timetables.classId,
          dayOfWeek: timetables.dayOfWeek,
          startTime: timetables.startTime,
          endTime: timetables.endTime,
          roomNumber: timetables.roomNumber,
          className: classes.name,
          classSection: classes.section,
          subjectName: subjects.name,
        })
        .from(timetables)
        .leftJoin(classes, eq(timetables.classId, classes.id))
        .leftJoin(subjects, eq(timetables.subjectId, subjects.id))
        .where(
          and(
            eq(timetables.teacherId, teacher.id),
            inArray(timetables.classId, assignedClassIds),
            inArray(timetables.subjectId, assignedSubjectIds)
          )
        );

      entries = rows.map((r) => ({
        id: r.id,
        subjectId: r.subjectId,
        classId: r.classId,
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        roomNumber: r.roomNumber,
        className: r.className ? `${r.className}${r.classSection ? ` ${r.classSection}` : ''}` : 'N/A',
        subjectName: r.subjectName ?? 'N/A',
        teacherRole: null,
      }));
    }
  }

  return <TeacherTimetableClient entries={entries} />;
}