import { db } from './db';
import {
  students, attendance, results, exams, assignments, assignmentSubmissions,
  classSubjects, subjects, timetables, teachers, users, studentDiaries,
  studentDiaryProgress, classes, predictions,
} from './schema';
import { eq, and, gte, lte, desc, sql, lt, inArray } from 'drizzle-orm';

export type StudentDashboardData = {
  student: { id: number; classId: number; rollNumber: string | null; displayClass: string };
  kpis: {
    attendancePercent: number;
    averageScore: number;
    pendingAssignments: number;
    upcomingExams: number;
  };
  recentResults: { subjectName: string; examName: string; marks: number; maxMarks: number; date: string }[];
  todaysClasses: {
    subjectName: string; topicTaught: string | null; homework: string | null;
    teacherName: string; startTime: string; endTime: string; diaryId: number | null;
    isHomeworkCompleted: boolean;
  }[];
  aiStudyTips: string[];
  performanceTrend: { month: string; avgScore: number }[];
  attendanceTrend: { month: string; present: number; total: number }[];
  predictions: {
    subjectName: string;
    predictedScore: number;
    riskLevel: string;
    confidence: number;
  }[];
};

export async function getStudentDashboardData(userId: number): Promise<StudentDashboardData> {
  // Get student record
  const [studentRow] = await db
    .select({ id: students.id, classId: students.classId, rollNumber: students.rollNumber, className: classes.name, classSection: classes.section })
    .from(students)
    .leftJoin(classes, eq(classes.id, students.classId))
    .where(eq(students.userId, userId))
    .limit(1);

  if (!studentRow) throw new Error('Student record not found');

  const studentId = studentRow.id;
  const classId = studentRow.classId;
  const displayClass = (studentRow.className || '') + (studentRow.classSection ? ` ${studentRow.classSection}` : '');

  // --- KPI 1: Attendance % ---
  const [attRows] = await db
    .select({
      total: sql<number>`sum(case when ${attendance.status} != 'leave' then 1 else 0 end)`,
      present: sql<number>`sum(case when ${attendance.status} = 'present' then 1 when ${attendance.status} = 'half_day' then 0.5 else 0 end)`,
    })
    .from(attendance)
    .where(eq(attendance.studentId, studentId));
  const totalDays = Number(attRows?.total || 0);
  const presentDays = Number(attRows?.present || 0);
  const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  // --- KPI 2: Average Score ---
  const [avgRow] = await db
    .select({
      sumObtained: sql<number>`SUM(CAST(${results.marks} AS DECIMAL(5,2)))`,
      sumMax: sql<number>`SUM(CAST(${exams.maxMarks} AS DECIMAL(5,2)))`
    })
    .from(results)
    .leftJoin(exams, eq(results.examId, exams.id))
    .where(eq(results.studentId, studentId));
  const sumObtained = Number(avgRow?.sumObtained || 0);
  const sumMax = Number(avgRow?.sumMax || 0);
  const averageScore = sumMax > 0 ? Math.round((sumObtained / sumMax) * 100) : 0;

  // --- KPI 3: Pending Assignments ---
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const allClassAssignments = await db.select({ id: assignments.id }).from(assignments).where(and(eq(assignments.classId, classId), gte(assignments.dueDate, todayDate)));
  const submittedIds = allClassAssignments.length > 0
    ? (await db.select({ assignmentId: assignmentSubmissions.assignmentId }).from(assignmentSubmissions)
        .where(and(eq(assignmentSubmissions.studentId, studentId), inArray(assignmentSubmissions.assignmentId, allClassAssignments.map(a => a.id)))))
        .map(s => s.assignmentId)
    : [];
  const pendingAssignments = allClassAssignments.filter(a => !submittedIds.includes(a.id)).length;

  // --- KPI 4: Upcoming Exams ---
  const [upcomingRow] = await db.select({ count: sql<number>`count(*)` }).from(exams).where(and(eq(exams.classId, classId), gte(exams.examDate, todayDate)));
  const upcomingExams = Number(upcomingRow?.count || 0);

  // --- Recent Results ---
  const recentResultsRows = await db
    .select({
      marks: results.marks,
      recordedDate: results.recordedDate,
      subjectName: subjects.name,
      examName: exams.name,
      maxMarks: exams.maxMarks,
    })
    .from(results)
    .leftJoin(subjects, eq(subjects.id, results.subjectId))
    .leftJoin(exams, eq(exams.id, results.examId))
    .where(eq(results.studentId, studentId))
    .orderBy(desc(results.recordedDate))
    .limit(5);

  const recentResults = recentResultsRows.map(r => ({
    subjectName: r.subjectName || 'Unknown',
    examName: r.examName || 'Assessment',
    marks: Number(r.marks),
    maxMarks: Number(r.maxMarks) || 100,
    date: r.recordedDate instanceof Date ? r.recordedDate.toISOString().split('T')[0] : String(r.recordedDate),
  }));

  // --- Today's Classes ---
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const ttRows = await db
    .select({
      subjectId: timetables.subjectId,
      teacherId: timetables.teacherId,
      startTime: timetables.startTime,
      endTime: timetables.endTime,
      subjectName: subjects.name,
      teacherName: users.name,
    })
    .from(timetables)
    .leftJoin(subjects, eq(subjects.id, timetables.subjectId))
    .leftJoin(teachers, eq(teachers.id, timetables.teacherId))
    .leftJoin(users, eq(users.id, teachers.userId))
    .where(and(eq(timetables.classId, classId), eq(timetables.dayOfWeek, dayOfWeek)));

  const subjectIds = Array.from(new Set(ttRows.map(r => r.subjectId).filter(Boolean))) as number[];
  const diaries = (subjectIds.length > 0)
    ? await db
        .select({
          id: studentDiaries.id,
          topicTaught: studentDiaries.topicTaught,
          homework: studentDiaries.homework,
          subjectId: studentDiaries.subjectId,
        })
        .from(studentDiaries)
        .where(
          and(
            eq(studentDiaries.classId, classId),
            inArray(studentDiaries.subjectId, subjectIds),
            eq(studentDiaries.date, todayDate)
          )
        )
    : [];

  const diaryIds = diaries.map(d => d.id);
  const progresses = (diaryIds.length > 0 && studentId)
    ? await db
        .select({
          diaryId: studentDiaryProgress.diaryId,
          isCompleted: studentDiaryProgress.isCompleted,
        })
        .from(studentDiaryProgress)
        .where(
          and(
            eq(studentDiaryProgress.studentId, studentId),
            inArray(studentDiaryProgress.diaryId, diaryIds)
          )
        )
    : [];

  const progressesMap = new Map(progresses.map(p => [p.diaryId, p.isCompleted]));
  const diariesMap = new Map(diaries.map(d => [d.subjectId, d]));

  const seenSubjects = new Set<number>();
  const todaysClasses: any[] = [];

  for (const row of ttRows) {
    if (row.subjectId) {
      if (seenSubjects.has(row.subjectId)) {
        continue;
      }
      seenSubjects.add(row.subjectId);
    }

    const diary = row.subjectId ? diariesMap.get(row.subjectId) : null;
    const isHomeworkCompleted = diary ? progressesMap.get(diary.id) ?? false : false;

    todaysClasses.push({
      subjectName: row.subjectName || 'Unknown',
      topicTaught: diary?.topicTaught || null,
      homework: diary?.homework || null,
      teacherName: row.teacherName || 'Teacher',
      startTime: row.startTime || '',
      endTime: row.endTime || '',
      diaryId: diary?.id || null,
      isHomeworkCompleted,
    });
  }

  // --- Performance Trend (last 6 months) ---
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const trendRows = await db.select({
    month: sql<string>`DATE_FORMAT(${results.recordedDate}, '%Y-%m')`,
    avg: sql<number>`AVG(CAST(${results.marks} AS DECIMAL(5,2)))`,
  }).from(results).where(and(eq(results.studentId, studentId), gte(results.recordedDate, sixMonthsAgo)))
    .groupBy(sql`DATE_FORMAT(${results.recordedDate}, '%Y-%m')`).orderBy(sql`DATE_FORMAT(${results.recordedDate}, '%Y-%m')`);
  const performanceTrend = trendRows.map(r => {
    const [year, month] = (r.month || '').split('-');
    const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleString('default', { month: 'short' });
    return { month: `${monthName}`, avgScore: Math.round(Number(r.avg || 0)) };
  });

  // --- Attendance Trend (last 6 months) ---
  const attTrendRows = await db.select({
    month: sql<string>`DATE_FORMAT(${attendance.attendanceDate}, '%Y-%m')`,
    present: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 WHEN ${attendance.status} = 'half_day' THEN 0.5 ELSE 0 END)`,
    total: sql<number>`SUM(CASE WHEN ${attendance.status} != 'leave' THEN 1 ELSE 0 END)`,
  }).from(attendance).where(and(eq(attendance.studentId, studentId), gte(attendance.attendanceDate, sixMonthsAgo)))
    .groupBy(sql`DATE_FORMAT(${attendance.attendanceDate}, '%Y-%m')`).orderBy(sql`DATE_FORMAT(${attendance.attendanceDate}, '%Y-%m')`);
  const attendanceTrend = attTrendRows.map(r => {
    const [year, month] = (r.month || '').split('-');
    const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleString('default', { month: 'short' });
    return { month: monthName, present: Number(r.present || 0), total: Number(r.total || 0) };
  });

  // --- Predictions ---
  const predictionRows = await db
    .select({
      subjectId: predictions.subjectId,
      predictedScore: predictions.predictedScore,
      riskLevel: predictions.riskLevel,
      confidence: predictions.confidence,
      subjectName: subjects.name,
    })
    .from(predictions)
    .leftJoin(subjects, eq(predictions.subjectId, subjects.id))
    .where(eq(predictions.studentId, studentId));

  // --- AI Study Tips ---
  const aiStudyTips = generateStudyTips({
    attendancePercent,
    averageScore,
    pendingAssignments,
    recentResults,
    predictions: predictionRows.map(p => ({
      subjectName: p.subjectName || 'Unknown',
      predictedScore: Number(p.predictedScore || 0),
      riskLevel: p.riskLevel,
      confidence: Number(p.confidence || 0),
    })),
  });

  return {
    student: { id: studentId, classId, rollNumber: studentRow.rollNumber, displayClass },
    kpis: { attendancePercent, averageScore, pendingAssignments, upcomingExams },
    recentResults,
    todaysClasses: todaysClasses.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    aiStudyTips,
    performanceTrend,
    attendanceTrend,
    predictions: predictionRows.map(p => ({
      subjectName: p.subjectName || 'Unknown',
      predictedScore: Number(p.predictedScore || 0),
      riskLevel: p.riskLevel,
      confidence: Number(p.confidence || 0),
    })),
  };
}

function generateStudyTips({ attendancePercent, averageScore, pendingAssignments, recentResults, predictions }: {
  attendancePercent: number;
  averageScore: number;
  pendingAssignments: number;
  recentResults: any[];
  predictions?: { subjectName: string; predictedScore: number; riskLevel: string; confidence: number }[];
}): string[] {
  const tips: string[] = [];
  if (attendancePercent < 75) tips.push('⚠️ Your attendance is below 75%. Try to attend classes more regularly!');
  else if (attendancePercent >= 90) tips.push('🎉 Amazing attendance! You\'re showing great commitment.');
  else tips.push(`📅 You have ${attendancePercent}% attendance. Keep it up!`);

  if (averageScore >= 85) tips.push('🌟 Your scores are excellent! You\'re in the top tier. Keep revising consistently.');
  else if (averageScore >= 70) tips.push('📈 You\'re doing well! Try practicing 5 extra problems per subject daily to push higher.');
  else if (averageScore > 0) tips.push('💪 Focus on your weak subjects. Start with 20-minute daily revision sessions.');
  else tips.push('📝 Start regularly attempting assignments and practice tests to track your progress!');

  if (pendingAssignments > 3) tips.push(`📌 You have ${pendingAssignments} pending assignments. Tackle one each day!`);
  else if (pendingAssignments > 0) tips.push(`✅ Almost there! ${pendingAssignments} more assignment(s) to complete.`);
  else tips.push('🏆 All caught up on assignments! Great work staying on top of things.');

  if (predictions && predictions.length > 0) {
    const highRisk = predictions.find(p => p.riskLevel === 'high' || p.riskLevel === 'medium');
    if (highRisk) {
      tips.push(`🔍 AI predicts risk in ${highRisk.subjectName} (Predicted Score: ${highRisk.predictedScore}%). Spend more time reviewing it.`);
    } else {
      const bestPred = predictions.reduce((a, b) => (a.predictedScore > b.predictedScore ? a : b));
      if (bestPred.predictedScore >= 80) {
        tips.push(`🚀 AI predicts a fantastic ${bestPred.predictedScore}% in ${bestPred.subjectName}!`);
      }
    }
  }

  if (recentResults.length > 0) {
    const best = recentResults.reduce((a, b) => (a.marks / a.maxMarks > b.marks / b.maxMarks ? a : b));
    tips.push(`⭐ Your best recent subject is ${best.subjectName}. Keep that momentum!`);
  }
  tips.push('🧠 Try the Pomodoro technique: 25 mins study, 5 mins break. Repeat 4 times!');
  return tips.slice(0, 5);
}
