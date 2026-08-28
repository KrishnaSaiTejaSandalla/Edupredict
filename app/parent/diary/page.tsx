import { requireRole } from "@/lib/auth";
import { getParentChildren } from "@/lib/parent-actions";
import { db } from "@/lib/db";
import { studentDiaries, subjects, teachers, users } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import ParentDiaryClient from "@/components/parent/ParentDiaryClient";

export const dynamic = "force-dynamic";

export default async function ParentDiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await requireRole("parent");
  const childrenList = await getParentChildren(user.id);

  if (childrenList.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center text-muted">
        <div className="max-w-md mx-auto rounded-2xl border border-theme bg-surface p-8 space-y-4">
          <h2 className="text-lg font-bold text-primary">No Linked Profiles</h2>
          <p className="text-xs text-secondary leading-relaxed">
            No student profiles are currently linked to your parent account. Please contact the school administration to map your children.
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const studentIdParam = params?.studentId;
  const selectedStudent = studentIdParam
    ? childrenList.find((c) => c.studentId === Number(studentIdParam)) || childrenList[0]
    : childrenList[0];

  const classId = selectedStudent.classId;

  // Fetch diary entries for this class
  const list = await db
    .select({
      id: studentDiaries.id,
      date: studentDiaries.date,
      topicTaught: studentDiaries.topicTaught,
      homework: studentDiaries.homework,
      subjectName: subjects.name,
      teacherName: users.name,
    })
    .from(studentDiaries)
    .leftJoin(subjects, eq(subjects.id, studentDiaries.subjectId))
    .leftJoin(teachers, eq(teachers.id, studentDiaries.teacherId))
    .leftJoin(users, eq(users.id, teachers.userId))
    .where(eq(studentDiaries.classId, classId))
    .orderBy(desc(studentDiaries.date));

  const formattedEntries = list.map((r) => ({
    id: r.id,
    date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date),
    topicTaught: r.topicTaught,
    homework: r.homework,
    subjectName: r.subjectName ?? "Unknown Subject",
    teacherName: r.teacherName ?? "Teacher",
  }));

  const subjectsList = Array.from(new Set(formattedEntries.map((x) => x.subjectName)));
  const teachersList = Array.from(new Set(formattedEntries.map((x) => x.teacherName)));

  return (
    <ParentDiaryClient
      initialEntries={formattedEntries}
      subjectsList={subjectsList}
      teachersList={teachersList}
    />
  );
}
