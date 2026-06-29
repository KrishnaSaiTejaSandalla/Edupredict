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
  const [totalAttRows] = await db.select({ count: sql<number>`count(*)` }).from(attendance).where(eq(attendance.studentId, studentId));
  const [presentRows] = await db.select({ count: sql<number>`count(*)` }).from(attendance).where(and(eq(attendance.studentId, studentId), eq(attendance.status, 'present')));
  const totalDays = Number(totalAttRows?.count || 0);
  const presentDays = Number(presentRows?.count || 0);
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
  const recentResultRows = await db
    .select({ marks: results.marks, recordedDate: results.recordedDate, subjectId: results.subjectId, examId: results.examId })
    .from(results).where(eq(results.studentId, studentId)).orderBy(desc(results.recordedDate)).limit(5);

  const recentResults = await Promise.all(recentResultRows.map(async r => {
    const [subj] = await db.select({ name: subjects.name }).from(subjects).where(eq(subjects.id, r.subjectId)).limit(1);
    let examName = 'Assessment'; let maxMarks = 100;
    if (r.examId) {
      const [ex] = await db.select({ name: exams.name, maxMarks: exams.maxMarks }).from(exams).where(eq(exams.id, r.examId)).limit(1);
      if (ex) { examName = ex.name; maxMarks = Number(ex.maxMarks) || 100; }
    }
    return { subjectName: subj?.name || 'Unknown', examName, marks: Number(r.marks), maxMarks, date: String(r.recordedDate) };
  }));

  // --- Today's Classes ---
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const ttRows = await db
    .select({ subjectId: timetables.subjectId, teacherId: timetables.teacherId, startTime: timetables.startTime, endTime: timetables.endTime })
    .from(timetables).where(and(eq(timetables.classId, classId), eq(timetables.dayOfWeek, dayOfWeek)));

  const todaysClasses = await Promise.all(ttRows.map(async row => {
    const [subj] = await db.select({ name: subjects.name }).from(subjects).where(eq(subjects.id, row.subjectId)).limit(1);
    const [teacher] = await db.select({ name: users.name }).from(users).leftJoin(teachers, eq(teachers.userId, users.id)).where(eq(teachers.id, row.teacherId)).limit(1);
    const [diary] = await db.select({ id: studentDiaries.id, topicTaught: studentDiaries.topicTaught, homework: studentDiaries.homework })
      .from(studentDiaries).where(and(eq(studentDiaries.classId, classId), eq(studentDiaries.subjectId, row.subjectId), eq(studentDiaries.date, todayDate))).limit(1);
    let isHomeworkCompleted = false;
    if (diary) {
      const [prog] = await db.select({ isCompleted: studentDiaryProgress.isCompleted }).from(studentDiaryProgress)
        .where(and(eq(studentDiaryProgress.studentId, studentId), eq(studentDiaryProgress.diaryId, diary.id))).limit(1);
      isHomeworkCompleted = prog?.isCompleted ?? false;
    }
    return {
      subjectName: subj?.name || 'Unknown', topicTaught: diary?.topicTaught || null,
      homework: diary?.homework || null, teacherName: teacher?.name || 'Teacher',
      startTime: row.startTime, endTime: row.endTime,
      diaryId: diary?.id || null, isHomeworkCompleted,
    };
  }));

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
    present: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)`,
    total: sql<number>`count(*)`,
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
