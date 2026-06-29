import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { students, results, exams, subjects, classes } from "@/lib/schema";
import { eq, desc, inArray } from "drizzle-orm";
import StudentResultsClient from "@/components/student/StudentResultsClient";

export const dynamic = "force-dynamic";

export default async function StudentResultsPage() {
  const user = await requireRole("student");

  const [student] = await db
    .select({ id: students.id, classId: students.classId })
    .from(students)
    .where(eq(students.userId, user.id))
    .limit(1);

  if (!student) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center text-muted">
        Student profile not found.
      </div>
    );
  }

  // 1. Get all classmate student records to compute class rank and denominator
  const classmates = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.classId, student.classId));

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
  const rankIndex = classmatesScores.findIndex((s) => s.id === student.id);
  const classRank = rankIndex !== -1 ? rankIndex + 1 : 1;
  const classSize = classmatesScores.length;

  // 2. Fetch student results
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
    .where(eq(results.studentId, student.id))
    .orderBy(desc(results.recordedDate));

  const formattedList = list.map(r => ({
    ...r,
    recordedDate: r.recordedDate instanceof Date ? r.recordedDate.toISOString().split('T')[0] : String(r.recordedDate)
  }));

  // 3. Fetch class subject averages for comparison
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

  list.forEach(r => {
    if (r.subjectId && r.subjectName) {
      const key = String(r.subjectId);
      if (!subjectAverages[key]) {
        subjectAverages[key] = { subjectName: r.subjectName, studentAvg: 0, classAvg: 0 };
      }
    }
  });

  Object.keys(subjectAverages).forEach(subjIdStr => {
    const subjId = Number(subjIdStr);
    
    // Student average in this subject
    const studentSubjRows = list.filter(r => r.subjectId === subjId);
    let studObtained = 0, studMax = 0;
    studentSubjRows.forEach(r => {
      if (r.marks !== null) {
        studObtained += Number(r.marks);
        studMax += Number(r.maxMarks || 100);
      }
    });
    const studentAvg = studMax > 0 ? Math.round((studObtained / studMax) * 100) : 0;

    // Class average in this subject
    const classSubjRows = classResults.filter(r => r.subjectId === subjId);
    let classObtained = 0, classMax = 0;
    classSubjRows.forEach(r => {
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

  // Compute GPA (4.0 scale mapped from average percentage)
  let totalStudObtained = 0;
  let totalStudMax = 0;
  list.forEach(r => {
    if (r.marks !== null) {
      totalStudObtained += Number(r.marks);
      totalStudMax += Number(r.maxMarks || 100);
    }
  });
  const overallAvg = totalStudMax > 0 ? (totalStudObtained / totalStudMax) * 100 : 0;
  const gpa = Math.round((overallAvg / 25) * 100) / 100;

  return (
    <StudentResultsClient
      initialResults={formattedList}
      classRank={classRank}
      classSize={classSize}
      subjectMetrics={subjectMetrics}
      gpa={gpa}
    />
  );
}
