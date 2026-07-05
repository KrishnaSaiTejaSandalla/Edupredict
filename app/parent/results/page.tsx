import { requireRole } from "@/lib/auth";
import { getParentChildren } from "@/lib/parent-actions";
import { db } from "@/lib/db";
import { students, results, exams, subjects, attendance } from "@/lib/schema";
import { eq, desc, inArray } from "drizzle-orm";
import ParentResultsClient from "@/components/parent/ParentResultsClient";

export const dynamic = "force-dynamic";

export default async function ParentResultsPage({
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

  const studentId = selectedStudent.studentId;
  const classId = selectedStudent.classId;

  // 1. Get classmates to compute rank
  const classmates = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.classId, classId));

  const classmatesScores = await Promise.all(
    classmates.map(async (cm) => {
      const resultsRows = await db
        .select({ marks: results.marks, maxMarks: exams.maxMarks })
        .from(results)
        .leftJoin(exams, eq(results.examId, exams.id))
        .where(eq(results.studentId, cm.id));

      let sumObtained = 0;
      let sumMax = 0;
      resultsRows.forEach((r) => {
        if (r.marks !== null) {
          sumObtained += Number(r.marks);
          sumMax += Number(r.maxMarks || 100);
        }
      });

      const avgPercent = sumMax > 0 ? (sumObtained / sumMax) * 100 : 0;
      return { id: cm.id, avgPercent };
    })
  );

  classmatesScores.sort((a, b) => b.avgPercent - a.avgPercent);
  const rankIndex = classmatesScores.findIndex((s) => s.id === studentId);
  const classRank = rankIndex !== -1 ? rankIndex + 1 : 1;
  const classSize = classmatesScores.length;

  // 2. Fetch results for this student
  const list = await db
    .select({
      id: results.id,
      marks: results.marks,
      remarks: results.remarks,
      recordedDate: results.recordedDate,
      examId: results.examId,
      examName: exams.name,
      maxMarks: exams.maxMarks,
      subjectId: results.subjectId,
      subjectName: subjects.name,
    })
    .from(results)
    .leftJoin(exams, eq(exams.id, results.examId))
    .leftJoin(subjects, eq(subjects.id, results.subjectId))
    .where(eq(results.studentId, studentId))
    .orderBy(desc(results.recordedDate));

  const formattedResults = list.map((r) => ({
    id: r.id,
    marks: r.marks,
    maxMarks: Number(r.maxMarks) || 100,
    remarks: r.remarks,
    recordedDate: r.recordedDate instanceof Date ? r.recordedDate.toISOString().split("T")[0] : String(r.recordedDate),
    examName: r.examName ?? "Class Assessment",
    subjectName: r.subjectName ?? "Unknown Subject",
  }));

  // 3. Subject-wise metrics vs Class averages
  const classStudentIds = classmates.map((c) => c.id);
  const classResults = classStudentIds.length > 0
    ? await db
        .select({
          subjectId: results.subjectId,
          marks: results.marks,
          maxMarks: exams.maxMarks,
        })
        .from(results)
        .leftJoin(exams, eq(results.examId, exams.id))
        .where(inArray(results.studentId, classStudentIds))
    : [];

  const subjectAverages: Record<string, { subjectName: string; studentAvg: number; classAvg: number }> = {};

  list.forEach((r) => {
    if (r.subjectId && r.subjectName) {
      const key = String(r.subjectId);
      if (!subjectAverages[key]) {
        subjectAverages[key] = { subjectName: r.subjectName, studentAvg: 0, classAvg: 0 };
      }
    }
  });

  Object.keys(subjectAverages).forEach((subjIdStr) => {
    const subjId = Number(subjIdStr);

    // Student average
    const studentSubjRows = list.filter((r) => r.subjectId === subjId);
    let studObtained = 0,
      studMax = 0;
    studentSubjRows.forEach((r) => {
      if (r.marks !== null) {
        studObtained += Number(r.marks);
        studMax += Number(r.maxMarks || 100);
      }
    });
    const studentAvg = studMax > 0 ? Math.round((studObtained / studMax) * 100) : 0;

    // Class average
    const classSubjRows = classResults.filter((r) => r.subjectId === subjId);
    let classObtained = 0,
      classMax = 0;
    classSubjRows.forEach((r) => {
      if (r.marks !== null) {
        classObtained += Number(r.marks);
        classMax += Number(r.maxMarks || 100);
      }
    });
    const classAvg = classMax > 0 ? Math.round((classObtained / classMax) * 100) : 0;

    subjectAverages[subjIdStr] = {
      subjectName: subjectAverages[subjIdStr].subjectName,
      studentAvg,
      classAvg,
    };
  });

  const subjectMetrics = Object.values(subjectAverages);

  // GPA calculation
  let totalStudObtained = 0;
  let totalStudMax = 0;
  list.forEach((r) => {
    if (r.marks !== null) {
      totalStudObtained += Number(r.marks);
      totalStudMax += Number(r.maxMarks || 100);
    }
  });
  const overallAvg = totalStudMax > 0 ? (totalStudObtained / totalStudMax) * 100 : 0;
  const gpa = Math.round((overallAvg / 25) * 100) / 100;

  // 4. Attendance percentage for report card
  const totalAttRows = await db
    .select({ status: attendance.status })
    .from(attendance)
    .where(eq(attendance.studentId, studentId));
  const totalDays = totalAttRows.length;
  const leaveCount = totalAttRows.filter((r) => r.status === "leave").length;
  const halfDayCount = totalAttRows.filter((r) => r.status === "half_day").length;
  const workingDays = totalDays - leaveCount;
  const presentCount = totalAttRows.filter((r) => r.status === "present").length;
  const presentWeight = presentCount + halfDayCount * 0.5;
  const attendancePercent = workingDays > 0 ? Math.round((presentWeight / workingDays) * 100) : 0;

  return (
    <ParentResultsPageClient
      initialResults={formattedResults}
      classRank={classRank}
      classSize={classSize}
      subjectMetrics={subjectMetrics}
      gpa={gpa}
      studentName={selectedStudent.name}
      displayClass={selectedStudent.displayClass}
      rollNumber={selectedStudent.rollNumber}
      attendancePercent={attendancePercent}
    />
  );
}

// Rename import to avoid conflicts
import ParentResultsPageClient from "@/components/parent/ParentResultsClient";
