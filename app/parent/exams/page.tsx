import { requireRole } from "@/lib/auth";
import { getParentChildren } from "@/lib/parent-actions";
import { db } from "@/lib/db";
import { exams, subjects } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import ParentExamsClient from "@/components/parent/ParentExamsClient";

export const dynamic = "force-dynamic";

export default async function ParentExamsPage({
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

  // Fetch exams for this class
  const list = await db
    .select({
      id: exams.id,
      name: exams.name,
      examDate: exams.examDate,
      startTime: sql<string>`'09:00'`,
      endTime: sql<string>`'10:30'`,
      roomNumber: sql<string>`'Exam Hall A'`,
      maxMarks: exams.maxMarks,
      syllabus: sql<string>`'All chapters from midterm syllabus.'`,
      instructions: sql<string>`'Bring admit card and standard school supplies. No electronic devices.'`,
      subjectName: subjects.name,
    })
    .from(exams)
    .leftJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(eq(exams.classId, classId))
    .orderBy(desc(exams.examDate));

  const formattedExams = list.map((r) => ({
    id: r.id,
    name: r.name,
    examDate: r.examDate instanceof Date ? r.examDate.toISOString().split("T")[0] : String(r.examDate),
    startTime: r.startTime,
    endTime: r.endTime,
    roomNumber: r.roomNumber,
    maxMarks: Number(r.maxMarks) || 100,
    syllabus: r.syllabus,
    instructions: r.instructions,
    subjectName: r.subjectName ?? "Unknown Subject",
  }));

  const subjectsList = Array.from(new Set(formattedExams.map((x) => x.subjectName)));

  return (
    <ParentExamsClient
      initialExams={formattedExams}
      subjectsList={subjectsList}
      studentName={selectedStudent.name}
    />
  );
}
