import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers, classes, students, users, classTeacherAssignments, attendance, results, exams, subjects } from "@/lib/schema";
import { eq, and, gte, sql, isNotNull } from "drizzle-orm";
import MyClassesClient from "@/components/teacher/MyClassesClient";

export const dynamic = "force-dynamic";

function sortClasses(classes: { id: number; name: string; section: string }[]): { id: number; name: string; section: string }[] {
  return [...classes].sort((a, b) => {
    const gradeA = parseInt(a.name) || 0;
    const gradeB = parseInt(b.name) || 0;
    if (gradeA !== gradeB) return gradeA - gradeB;
    return a.section.localeCompare(b.section);
  });
}

export default async function TeacherClassesPage() {
  const user = await requireRole("teacher");

  const [teacher] = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.userId, user.id))
    .limit(1);

  const myClassesRaw = teacher
    ? await db
        .select({
          id: classes.id,
          name: classes.name,
          section: classes.section,
        })
        .from(classTeacherAssignments)
        .innerJoin(classes, eq(classTeacherAssignments.classId, classes.id))
        .where(eq(classTeacherAssignments.teacherId, teacher.id))
    : [];

  const myClasses = sortClasses(myClassesRaw.map((c) => ({ id: c.id, name: c.name ?? "", section: c.section ?? "" })));

  const firstClass = myClasses[0];
  let initialStudents: {
    id: number;
    userId: number;
    name: string;
    rollNumber: string;
    gender: string;
    dateOfBirth: string | null;
    address: string | null;
    profileImageUrl: string | null;
    classId: number;
    className: string;
    attendancePct: number;
    performancePct: number;
    riskLevel: "low" | "medium" | "high" | null;
  }[] = [];

  let initialAnalysis = {
    totalStudents: 0,
    atRiskStudents: 0,
    avgAttendance: 0,
    avgPerformance: 0,
    subjectPerformance: [] as { subjectName: string; avgMarks: number; maxMarks: number }[],
  };

  if (firstClass && teacher) {
    const classId = firstClass.id;

    const studentList = await db
      .select({
        id: students.id,
        userId: students.userId,
        rollNumber: students.rollNumber,
        gender: students.gender,
        dateOfBirth: students.dateOfBirth,
        address: students.address,
        classId: students.classId,
        name: users.name,
        profileImageUrl: users.profileImageUrl,
      })
      .from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .where(eq(students.classId, classId))
      .orderBy(students.rollNumber);

    const className = `${firstClass.name ?? ""}${firstClass.section ? ` ${firstClass.section}` : ""}`;

    const subjectPerf = await db
      .select({
        subjectName: subjects.name,
        avgMarks: sql<number>`AVG(CAST(${results.marks} AS DECIMAL))`,
        maxMarks: sql<number>`MAX(${exams.maxMarks})`,
      })
      .from(results)
      .leftJoin(exams, eq(results.examId, exams.id))
      .leftJoin(subjects, eq(results.subjectId, subjects.id))
      .leftJoin(students, eq(results.studentId, students.id))
      .where(
        and(
          eq(students.classId, classId),
          isNotNull(results.marks)
        )
      )
      .groupBy(subjects.name);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    initialStudents = await Promise.all(
      studentList.map(async (s) => {
        const attendanceRows = await db
          .select({ status: attendance.status })
          .from(attendance)
          .where(
            and(
              eq(attendance.studentId, s.id),
              eq(attendance.classId, classId),
              gte(attendance.attendanceDate, thirtyDaysAgo)
            )
          );

        const presentCount = attendanceRows.filter((a) => a.status === "present").length;
        const totalCount = attendanceRows.length;
        const attendancePct = totalCount > 0 
          ? Math.round((presentCount / totalCount) * 100) 
          : 100;

        const resultRows = await db
          .select({ marks: results.marks, maxMarks: exams.maxMarks })
          .from(results)
          .leftJoin(exams, eq(results.examId, exams.id))
          .where(
            and(
              eq(results.studentId, s.id),
              isNotNull(results.marks)
            )
          );

        const perfSum = resultRows.reduce((sum, r) => sum + (Number(r.marks || 0) / Number(r.maxMarks || 100) * 100), 0);
        const performancePct = resultRows.length > 0 ? Math.round(perfSum / resultRows.length) : 0;

        let riskLevel: "low" | "medium" | "high" | null = null;
        if (attendancePct < 70 || performancePct < 60) {
          riskLevel = "high";
        } else if (attendancePct < 85 || performancePct < 80) {
          riskLevel = "medium";
        } else {
          riskLevel = "low";
        }

        return {
          id: s.id,
          userId: s.userId,
          name: s.name ?? "Unknown",
          rollNumber: s.rollNumber ?? "",
          gender: s.gender ?? "",
          dateOfBirth: s.dateOfBirth ? (s.dateOfBirth instanceof Date ? s.dateOfBirth.toISOString().split("T")[0] : String(s.dateOfBirth)) : null,
          address: s.address ?? null,
          profileImageUrl: s.profileImageUrl ?? null,
          classId: s.classId,
          className,
          attendancePct,
          performancePct,
          riskLevel,
        };
      })
    );

    const totalStudents = initialStudents.length;
    const atRiskStudents = initialStudents.filter((s) => s.riskLevel === "high" || s.riskLevel === "medium").length;
    const avgAttendance = totalStudents > 0
      ? Math.round(initialStudents.reduce((sum, s) => sum + s.attendancePct, 0) / totalStudents)
      : 0;
    const avgPerformance = totalStudents > 0
      ? Math.round(initialStudents.reduce((sum, s) => sum + s.performancePct, 0) / totalStudents)
      : 0;

    initialAnalysis = {
      totalStudents,
      atRiskStudents,
      avgAttendance,
      avgPerformance,
      subjectPerformance: subjectPerf.map((sp) => ({
        subjectName: sp.subjectName ?? "Unknown",
        avgMarks: Math.round(Number(sp.avgMarks || 0) * 10) / 10,
        maxMarks: Number(sp.maxMarks || 100),
      })),
    };
  }

  return (
    <MyClassesClient
      teacherId={teacher?.id ?? null}
      myClasses={myClasses.map((c) => ({
        id: c.id,
        name: c.name ?? "",
        section: c.section ?? "",
      }))}
      initialStudents={initialStudents}
      initialAnalysis={initialAnalysis}
      defaultClassId={firstClass?.id ?? null}
    />
  );
}