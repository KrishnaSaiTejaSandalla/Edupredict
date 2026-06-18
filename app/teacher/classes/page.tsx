import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers, classes, students, users, classTeacherAssignments } from "@/lib/schema";
import { eq } from "drizzle-orm";
import MyClassesClient from "@/components/teacher/MyClassesClient";

export const dynamic = "force-dynamic";

export default async function TeacherClassesPage() {
  const user = await requireRole("teacher");

  const [teacher] = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.userId, user.id))
    .limit(1);

  // Get all classes this teacher is class teacher of from class_teacher_assignments
  const myClasses = teacher
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

  // Get students for the first class (default) — client can switch
  const firstClass = myClasses[0];
  let initialStudents: {
    id: number;
    name: string;
    rollNumber: string;
    gender: string;
    profileImageUrl: string | null;
    classId: number;
  }[] = [];

  if (firstClass) {
    const rows = await db
      .select({
        id: students.id,
        userId: students.userId,
        rollNumber: students.rollNumber,
        gender: students.gender,
        classId: students.classId,
        name: users.name,
        profileImageUrl: users.profileImageUrl,
      })
      .from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .where(eq(students.classId, firstClass.id))
      .orderBy(students.rollNumber);

    initialStudents = rows.map((r) => ({
      id: r.id,
      name: r.name ?? "Unknown",
      rollNumber: r.rollNumber ?? "",
      gender: r.gender ?? "",
      profileImageUrl: r.profileImageUrl ?? null,
      classId: r.classId,
    }));
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
      defaultClassId={firstClass?.id ?? null}
    />
  );
}
