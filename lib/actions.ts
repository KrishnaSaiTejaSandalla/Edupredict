'use server';

import { db } from './db';
import { exams, results, students, subjects, classes, users } from './schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// ==================== EXAMS ====================
export async function createExam(data: {
    classId: number;
    subjectId: number;
    name: string;
    examDate: Date;
    duration: number;
    maxMarks: number;
}) {
    if (!data.name) throw new Error('Exam name required');
    if (!data.classId) throw new Error('Class required');
    if (!data.subjectId) throw new Error('Subject required');
    if (data.maxMarks <= 0) throw new Error('Max marks must be > 0');

    await db.insert(exams).values({
        classId: data.classId,
        subjectId: data.subjectId,
        name: data.name,
        examDate: data.examDate,
        duration: data.duration,
        maxMarks: data.maxMarks.toString() as any,
    });

    revalidatePath('/admin/exams');
    revalidatePath('/admin');

}

export async function updateExam(
    id: number,
    data: {
        classId: number;
        subjectId: number;
        name: string;
        examDate: Date;
        duration: number;
        maxMarks: number;
    }
) {
    if (!data.name) throw new Error('Exam name required');
    if (!data.classId) throw new Error('Class required');
    if (!data.subjectId) throw new Error('Subject required');
    if (data.maxMarks <= 0) throw new Error('Max marks must be > 0');

    await db
        .update(exams)
        .set({
            classId: data.classId,
            subjectId: data.subjectId,
            name: data.name,
            examDate: data.examDate,
            duration: data.duration,
            maxMarks: data.maxMarks.toString() as any,
            updatedAt: new Date(),
        })
        .where(eq(exams.id, id));

    revalidatePath('/admin/exams');
    revalidatePath('/admin');

}

export async function deleteExam(id: number) {
    const existingResults = await db
        .select()
        .from(results)
        .where(eq(results.examId, id))
        .limit(1);

    if (existingResults.length > 0) {
        throw new Error(
            "Cannot delete exam because marks have already been recorded."
        );
    }

    await db.delete(exams).where(eq(exams.id, id));

    revalidatePath("/admin/exams");
    revalidatePath('/admin');
}

export async function getAllExams() {
    const rows = await db
        .select({
            exam: exams,
            className: classes.name,
            subjectName: subjects.name,
        })
        .from(exams)
        .leftJoin(classes, eq(exams.classId, classes.id))
        .leftJoin(subjects, eq(exams.subjectId, subjects.id));

    return rows.map((r: any) => ({
        ...r.exam,
        className: r.className || 'N/A',
        subjectName: r.subjectName || 'N/A',
    }));
}

// ==================== MARKS ENTRY ====================
export async function getStudentsByClass(classId: number) {
    const rows = await db
        .select({
            student: students,
            user: users,
        })
        .from(students)
        .leftJoin(users, eq(users.id, students.userId))
        .where(eq(students.classId, classId));

    return rows
        .map((r: any) => ({
            id: r.student.id,
            userId: r.student.userId,
            name: r.user?.name || 'Unknown',
            rollNumber: r.student.rollNumber || '',
        }))
        .sort((a, b) => {
            const aRoll = parseInt(a.rollNumber || '999', 10);
            const bRoll = parseInt(b.rollNumber || '999', 10);
            return aRoll - bRoll;
        });
}

export async function saveMarks(data: {
    examId: number;
    studentMarks: Array<{ studentId: number; marks: number }>;
}) {
    const exam = await db.select().from(exams).where(eq(exams.id, data.examId)).limit(1);
    if (!exam.length) throw new Error('Exam not found');

    const e = exam[0] as any;
    const subjectId = e.subjectId;

    for (const sm of data.studentMarks) {
        // Check if result exists
        const existing = await db
            .select()
            .from(results)
            .where(
                and(
                    eq(results.studentId, sm.studentId),
                    eq(results.examId, data.examId),
                    eq(results.subjectId, subjectId)
                )
            )
            .limit(1);

        if (existing.length) {
            // UPDATE
            await db
                .update(results)
                .set({
                    marks: sm.marks.toString() as any,
                    recordedDate: new Date(),
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(results.studentId, sm.studentId),
                        eq(results.examId, data.examId),
                        eq(results.subjectId, subjectId)
                    )
                );
        } else {
            // INSERT
            await db.insert(results).values({
                studentId: sm.studentId,
                examId: data.examId,
                subjectId: subjectId,
                marks: sm.marks.toString() as any,
                recordedDate: new Date(),
            });
        }
    }

    revalidatePath('/admin/marks');
    revalidatePath('/admin');
}

export async function getMarksByExam(examId: number) {
    const rows = await db
        .select()
        .from(results)
        .where(eq(results.examId, examId));

    const marksMap: { [key: number]: number } = {};
    rows.forEach((r: any) => {
        marksMap[r.studentId] = Number(r.marks || 0);
    });

    return marksMap;
}

// ==================== REPORT CARDS ====================
export async function getStudentReportByClass(classId: number) {
    const [stdRows, resultRows] = await Promise.all([
        db
            .select({
                student: students,
                user: users,
            })
            .from(students)
            .leftJoin(users, eq(users.id, students.userId))
            .where(eq(students.classId, classId)),
        db
            .select({
                studentId: results.studentId,
                marks: results.marks,
                subjectId: results.subjectId,
                examId: results.examId,
            })
            .from(results)
            .leftJoin(students, eq(results.studentId, students.id))
            .where(eq(students.classId, classId)),
    ]);

    const examIds = Array.from(
        new Set(resultRows.map((r: any) => Number(r.examId)).filter(Boolean))
    );

    const examRows =
        examIds.length > 0
            ? await db
                  .select({ id: exams.id, maxMarks: exams.maxMarks })
                  .from(exams)
                  .where(
                      sql`${exams.id} in (${sql.join(
                          examIds.map((id) => sql`${id}`),
                          sql`, `
                      )})`
                  )
            : [];

    const examMap: Record<number, number> = {};
    examRows.forEach((e: any) => {
        examMap[e.id] = Number(e.maxMarks);
    });

    const resultsByStudent: { [key: number]: any[] } = {};
    resultRows.forEach((r: any) => {
        if (!resultsByStudent[r.studentId]) resultsByStudent[r.studentId] = [];
        resultsByStudent[r.studentId].push({
            marks: Number(r.marks || 0),
            subjectId: r.subjectId,
            examId: r.examId,
        });
    });

    return stdRows
        .map((r: any) => {
            const sMarks = resultsByStudent[r.student.id] || [];
            const total = sMarks.reduce((sum, m) => sum + m.marks, 0);
            const totalPossibleMarks = sMarks.reduce(
                (sum, m) => sum + (examMap[m.examId] || 0),
                0
            );
            const percentage =
                totalPossibleMarks > 0
                    ? Math.round((total / totalPossibleMarks) * 100)
                    : 0;

            let grade = 'F';
            if (percentage >= 90) grade = 'A+';
            else if (percentage >= 80) grade = 'A';
            else if (percentage >= 70) grade = 'B+';
            else if (percentage >= 60) grade = 'B';
            else if (percentage >= 50) grade = 'C';
            else if (percentage >= 40) grade = 'D';

            return {
                studentId: r.student.id,
                name: r.user?.name || 'Unknown',
                rollNumber: r.student.rollNumber || '',
                total,
                percentage,
                grade,
            };
        })
        .sort((a, b) => {
            const aRoll = parseInt(a.rollNumber || '999', 10);
            const bRoll = parseInt(b.rollNumber || '999', 10);
            return aRoll - bRoll;
        });
}

export async function getStudentReport(studentId: number) {
    const stdData = await db
        .select({
            student: students,
            user: users,
        })
        .from(students)
        .leftJoin(users, eq(users.id, students.userId))
        .where(eq(students.id, studentId))
        .limit(1);

    if (!stdData.length) throw new Error('Student not found');

    const s = stdData[0] as any;
    const studentUser = s.user;
    const studentRec = s.student;

    const resultRows = await db
        .select({
            marks: results.marks,
            subjectId: results.subjectId,
            examId: results.examId,
            recordedDate: results.recordedDate,
        })
        .from(results)
        .where(eq(results.studentId, studentId));

    const subjectIds = [...new Set(resultRows.map((r: any) => Number(r.subjectId)))].filter(Boolean);
    const subjectsRows = await db
        .select({ id: subjects.id, name: subjects.name })
        .from(subjects);

    const subjectMap: { [key: number]: any } = {};
    subjectsRows.forEach((row: any) => {
        subjectMap[row.id] = row;
    });

    const bySubject: { [key: number]: number[] } = {};
    resultRows.forEach((r: any) => {
        if (!bySubject[r.subjectId]) bySubject[r.subjectId] = [];
        bySubject[r.subjectId].push(Number(r.marks || 0));
    });

    const subjectScores = Object.entries(bySubject).map(([sid, marks]: [string, number[]]) => {
        const avg = marks.reduce((a, b) => a + b, 0) / marks.length;
        return {
            subjectId: Number(sid),
            subjectName: subjectMap[Number(sid)]?.name || `Subject ${sid}`,
            marks: marks,
            average: Math.round(avg),
        };
    });

    const examRows = await db
        .select({ id: exams.id, maxMarks: exams.maxMarks })
        .from(exams);

    const examMap: Record<number, number> = {};
    examRows.forEach((e: any) => {
        examMap[e.id] = Number(e.maxMarks);
    });

    const totalMarks = resultRows.reduce((sum, r: any) => sum + Number(r.marks || 0), 0);
    const totalPossibleMarks = resultRows.reduce(
        (sum, r: any) => sum + (examMap[r.examId] || 0),
        0
    );

    const percentage =
        totalPossibleMarks > 0
            ? Math.round((totalMarks / totalPossibleMarks) * 100)
            : 0;

    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 40) grade = 'D';

    return {
        student: {
            id: studentRec.id,
            name: studentUser?.name || 'Unknown',
            rollNumber: studentRec.rollNumber,
            classId: studentRec.classId,
        },
        subjectScores,
        total: totalMarks,
        percentage,
        grade,
    };
}

export async function getExamsByClass(classId: number) {
    const rows = await db
        .select()
        .from(exams)
        .where(eq(exams.classId, classId));
    return rows;
}

export async function getSubjectsByClass(classId: number) {
    const rows = await db
        .select({ id: subjects.id, name: subjects.name })
        .from(subjects)
        .where(eq(subjects.schoolId, 1)); // Assuming schoolId = 1 for now

    return rows;
}

export async function getAllClasses() {
    const rows = await db.select().from(classes);
    return rows;
}

export async function getExamPerformanceTrend() {
    const rows = await db
        .select({
            id: exams.id,
            name: exams.name,
            maxMarks: exams.maxMarks,
            avgMarks: sql<number>`avg(${results.marks})`,
        })
        .from(exams)
        .leftJoin(results, eq(results.examId, exams.id))
        .groupBy(exams.id, exams.name, exams.maxMarks);

    return rows.map((exam) => {
        const avgMarks = Number(exam.avgMarks || 0);
        const avgPercentage =
            Number(exam.maxMarks) > 0
                ? (avgMarks / Number(exam.maxMarks)) * 100
                : 0;

        return {
            exam: `${exam.name}`,
            percentage: Math.round(avgPercentage),
        };
    });
}

export async function getAnalyticsData() {
    const [examCount, marksSummary, studentTotals] = await Promise.all([
        db.select({ count: sql`count(*)` }).from(exams),
        db.select({ totalMarks: sql<number>`sum(${results.marks})`, count: sql<number>`count(*)` }).from(results),
        db
            .select({
                studentId: results.studentId,
                totalMarks: sql<number>`sum(${results.marks})`,
            })
            .from(results)
            .groupBy(results.studentId),
    ]);

    const totalExams = Number((examCount[0] as any)?.count ?? 0);
    const totalMarks = Number((marksSummary[0] as any)?.totalMarks ?? 0);
    const countMarks = Number((marksSummary[0] as any)?.count ?? 0);
    const avgPercentage = countMarks > 0 ? Math.round((totalMarks / (countMarks * 100)) * 100) : 0;

    const topStudentRecord = studentTotals.reduce(
        (max: any, curr: any) =>
            Number(curr.totalMarks || 0) > Number(max.totalMarks || 0) ? curr : max,
        { studentId: 0, totalMarks: 0 }
    );
    const lowestStudentRecord = studentTotals.reduce(
        (min: any, curr: any) =>
            Number(curr.totalMarks || 0) < Number(min.totalMarks || 0) ? curr : min,
        { studentId: 0, totalMarks: Number.MAX_SAFE_INTEGER }
    );

    const studentIds = [topStudentRecord.studentId, lowestStudentRecord.studentId].filter(Boolean);
    const studentRows =
        studentIds.length > 0
            ? await db
                  .select({ id: students.id, name: users.name })
                  .from(students)
                  .leftJoin(users, eq(users.id, students.userId))
                  .where(
                      or(
                          ...(studentIds.map((id) => eq(students.id, id)) as any[])
                      )
                  )
            : [];

    const getName = (studentId: number) =>
        studentRows.find((row: any) => row.id === studentId)?.name || 'N/A';

    return {
        totalExams,
        avgPercentage,
        topStudentName: getName(topStudentRecord.studentId),
        lowestStudentName: getName(lowestStudentRecord.studentId),
    };
}