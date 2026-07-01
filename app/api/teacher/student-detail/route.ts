import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers, students, users, results, exams, subjects, assignmentSubmissions, assignments, classTeacherAssignments, studentParents, parents, predictions, attendance, classes } from "@/lib/schema";
import { eq, and, gte, sql, isNotNull, desc, asc, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireRole("teacher");
    const [teacher] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, user.id))
      .limit(1);

    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const studentId = Number(searchParams.get("studentId"));
    const tab = searchParams.get("tab");

    if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });

    const [student] = await db
      .select({
        id: students.id,
        userId: students.userId,
        rollNumber: students.rollNumber,
        gender: students.gender,
        dateOfBirth: students.dateOfBirth,
        address: students.address,
        classId: students.classId,
        admissionDate: students.admissionDate,
        name: users.name,
        profileImageUrl: users.profileImageUrl,
        phoneNumber: users.phoneNumber,
        email: users.email,
      })
      .from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .where(eq(students.id, studentId))
      .limit(1);

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const [isClassTeacher] = await db
      .select({ id: classTeacherAssignments.id })
      .from(classTeacherAssignments)
      .where(
        and(
          eq(classTeacherAssignments.teacherId, teacher.id),
          eq(classTeacherAssignments.classId, student.classId)
        )
      )
      .limit(1);

    if (!isClassTeacher) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const [classInfo] = await db
      .select({ name: classes.name, section: classes.section })
      .from(classes)
      .where(eq(classes.id, student.classId))
      .limit(1);

    const studentClass = classInfo ? `${classInfo.name}${classInfo.section ? ` ${classInfo.section}` : ""}` : "";

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

if (!tab || tab === "personal") {
      const attendanceRows = await db
        .select({ status: attendance.status })
        .from(attendance)
        .where(
          and(
            eq(attendance.studentId, studentId),
            eq(attendance.classId, student.classId)
          )
        );

      const presentCount = attendanceRows.filter((a) => a.status === "present").length;
      const totalCount = attendanceRows.length;
      const attendancePct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

      const resultRows = await db
        .select({ marks: results.marks, maxMarks: exams.maxMarks })
        .from(results)
        .leftJoin(exams, eq(results.examId, exams.id))
        .where(eq(results.studentId, studentId));

      const perfSum = resultRows.reduce((sum, r) => sum + (Number(r.marks || 0) / Number(r.maxMarks || 100) * 100), 0);
      const performancePct = resultRows.length > 0 ? Math.round(perfSum / resultRows.length) : 0;
      const currentGPA = resultRows.length > 0 ? (perfSum / resultRows.length / 10).toFixed(2) : null;

      const studentList = await db
        .select({ id: students.id })
        .from(students)
        .where(eq(students.classId, student.classId));

      const allPerf = await Promise.all(
        studentList.map(async (s) => {
          const res = await db
            .select({ marks: results.marks, maxMarks: exams.maxMarks })
            .from(results)
            .leftJoin(exams, eq(results.examId, exams.id))
            .where(eq(results.studentId, s.id));
          const avg = res.length > 0 ? res.reduce((sum, r) => sum + (Number(r.marks || 0) / Number(r.maxMarks || 100) * 100), 0) / res.length : 0;
          return { id: s.id, avg };
        })
      );

      const sortedPerf = allPerf.sort((a, b) => b.avg - a.avg);
      const rank = sortedPerf.findIndex((s) => s.id === studentId) + 1;

      let riskLevel: "low" | "medium" | "high" = "low";
      if (attendancePct < 70 || performancePct < 60) {
        riskLevel = "high";
      } else if (attendancePct < 85 || performancePct < 80) {
        riskLevel = "medium";
      }

      const personal = {
        dateOfBirth: student.dateOfBirth ? (student.dateOfBirth instanceof Date ? student.dateOfBirth.toISOString().split("T")[0] : String(student.dateOfBirth)) : null,
        gender: student.gender ?? null,
        address: student.address ?? null,
        phoneNumber: student.phoneNumber ?? null,
        joinDate: student.admissionDate ? (student.admissionDate instanceof Date ? student.admissionDate.toISOString().split("T")[0] : String(student.admissionDate)) : null,
        admissionNumber: student.rollNumber ?? null,
        currentGPA: currentGPA,
        currentRank: rank > 0 ? rank : null,
        attendancePct: attendancePct,
        performancePct: performancePct,
        riskLevel: riskLevel,
        className: studentClass,
      };

      return NextResponse.json({ personal });
    }

    if (tab === "academic") {
      const examResults = await db
        .select({
          examId: exams.id,
          exam: exams.name,
          examDate: exams.examDate,
          maxMarks: exams.maxMarks,
          subjectId: subjects.id,
          subject: subjects.name,
          marks: results.marks,
        })
        .from(results)
        .leftJoin(exams, eq(results.examId, exams.id))
        .leftJoin(subjects, eq(results.subjectId, subjects.id))
        .where(eq(results.studentId, studentId))
        .orderBy(desc(exams.examDate), asc(subjects.name));

      const examMap = new Map<number, { exam: string; date: string; maxMarks: number; subjects: { name: string; marks: number }[] }>();
      examResults.forEach((r) => {
        const date = r.examDate ? (r.examDate instanceof Date ? r.examDate.toISOString().split("T")[0] : String(r.examDate)) : "";
        if (!examMap.has(r.examId!)) {
          examMap.set(r.examId!, { exam: r.exam ?? "Unknown", date, maxMarks: Number(r.maxMarks || 100), subjects: [] });
        }
        const examEntry = examMap.get(r.examId!);
        if (examEntry && r.subject && r.marks !== null && r.marks !== undefined) {
          examEntry.subjects.push({ name: r.subject, marks: Number(r.marks) });
        }
      });

      const examHistory = Array.from(examMap.values()).map((e) => ({
        exam: e.exam,
        date: e.date,
        maxMarks: e.maxMarks,
        subjects: e.subjects,
        average: e.subjects.length > 0 ? Math.round(e.subjects.reduce((sum, s) => sum + (s.marks / e.maxMarks * 100), 0) / e.subjects.length) : 0,
      })).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

      const subjectScores = await db
        .select({
          subject: subjects.name,
          avgMarks: sql<number>`AVG(CAST(${results.marks} AS DECIMAL(5,2)))`,
        })
        .from(results)
        .leftJoin(exams, eq(results.examId, exams.id))
        .leftJoin(subjects, eq(results.subjectId, subjects.id))
        .where(eq(results.studentId, studentId))
        .groupBy(subjects.name);

      return NextResponse.json({
        academic: {
          examHistory,
          subjectScores: subjectScores.map((s) => ({
            subject: s.subject ?? "Unknown",
            avgMarks: Math.round(Number(s.avgMarks) || 0),
          })),
        },
      });
    }

    if (tab === "performance") {
      const attendanceRows = await db
        .select({ status: attendance.status })
        .from(attendance)
        .where(
          and(
            eq(attendance.studentId, studentId),
            eq(attendance.classId, student.classId)
          )
        );

      const presentCount = attendanceRows.filter((a) => a.status === "present").length;
      const totalAtt = attendanceRows.length;
      const attendancePct = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 100;

      const resultRows = await db
        .select({ marks: results.marks, maxMarks: exams.maxMarks })
        .from(results)
        .leftJoin(exams, eq(results.examId, exams.id))
        .where(eq(results.studentId, studentId));

      const perfSum = resultRows.reduce((sum, r) => sum + (Number(r.marks || 0) / Number(r.maxMarks || 100) * 100), 0);
      const examAvg = resultRows.length > 0 ? Math.round(perfSum / resultRows.length) : 0;

      const submissionRows = await db
        .select({ grade: assignmentSubmissions.grade })
        .from(assignmentSubmissions)
        .leftJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
        .where(
          and(
            eq(assignments.classId, student.classId),
            eq(assignmentSubmissions.studentId, studentId)
          )
        );

      const gradedCount = submissionRows.filter((s) => s.grade !== null).length;
      const totalCount = submissionRows.length;
      const assignmentPct = totalCount > 0 ? Math.round((gradedCount / totalCount) * 100) : 0;

      const radarData = [
        { subject: "Attendance", value: Math.min(5, Math.max(1, Math.round((attendancePct / 100) * 5 * 10) / 10)) },
        { subject: "Academics", value: Math.min(5, Math.max(1, Math.round((examAvg / 100) * 5 * 10) / 10)) },
        { subject: "Assignments", value: Math.min(5, Math.max(1, Math.round((assignmentPct / 100) * 5 * 10) / 10)) },
        { subject: "Participation", value: 3.0 },
        { subject: "Behavior", value: Math.min(5, Math.max(1, Math.round((attendancePct / 100) * 2 + 2) * 10) / 10) },
      ];

      const predRows = await db
        .select({ recommendations: predictions.recommendations })
        .from(predictions)
        .where(eq(predictions.studentId, studentId))
        .limit(3);

      const aiInsights = predRows.map((p) => p.recommendations).filter(Boolean) as string[];

      const performanceTrend = await db
        .select({
          examDate: exams.examDate,
          avgMarks: sql<number>`AVG(CAST(${results.marks} AS DECIMAL(5,2)))`,
        })
        .from(results)
        .leftJoin(exams, eq(results.examId, exams.id))
        .where(eq(results.studentId, studentId))
        .groupBy(exams.examDate)
        .orderBy(asc(exams.examDate));

      const lineData = performanceTrend.map((t) => ({
        date: t.examDate ? (t.examDate instanceof Date ? t.examDate.toISOString().split("T")[0] : String(t.examDate)) : "",
        score: Math.round(Number(t.avgMarks) || 0),
      }));

      return NextResponse.json({
        performance: {
          radarData,
          aiInsights,
          lineData,
          kpis: {
            attendancePct,
            examAvg,
            assignmentPct,
            overallRating: examAvg,
          },
        },
      });
    }

    if (tab === "guardian") {
      const parentRows = await db
        .select({
          parentName: users.name,
          parentPhone: parents.phoneNumber,
          parentEmail: parents.parentEmail,
          relation: studentParents.relation,
          occupation: parents.occupation,
          address: parents.address,
        })
        .from(studentParents)
        .leftJoin(parents, eq(studentParents.parentId, parents.id))
        .leftJoin(users, eq(parents.userId, users.id))
        .where(eq(studentParents.studentId, studentId));

      const parent = parentRows[0] || {};
      return NextResponse.json({
        guardian: {
          parentName: parent.parentName || null,
          relationship: parent.relation || null,
          phone: parent.parentPhone || null,
          email: parent.parentEmail || null,
          occupation: parent.occupation || null,
          address: parent.address || null,
        },
      });
    }

    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}