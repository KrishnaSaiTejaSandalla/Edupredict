import { db } from './db';
import {
  students, results, exams, subjects, attendance, predictions,
  assignmentSubmissions, assignments, classSubjects, classes,
} from './schema';
import { eq, and, desc, sql, gte, inArray } from 'drizzle-orm';

export type SubjectStat = { subject: string; score: number; maxScore: number; percentage: number };

export type StudentPerformanceData = {
  subjectStats: SubjectStat[];
  performanceTrend: { month: string; score: number }[];
  aiAnalysis: {
    paragraph: string;
    predictedGrades: { subject: string; currentGrade: string; predictedGrade: string }[];
    focusSubjects: string[];
    strongSubjects: string[];
    studyTips: string[];
    confidenceScore: number;
    goalGPA: number;
  };
};

function percentToGrade(pct: number): string {
  if (pct >= 95) return 'A+';
  if (pct >= 90) return 'A';
  if (pct >= 85) return 'A-';
  if (pct >= 80) return 'B+';
  if (pct >= 75) return 'B';
  if (pct >= 70) return 'B-';
  if (pct >= 65) return 'C+';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

function predictNextGrade(pct: number, trend: number): string {
  const predicted = Math.min(100, pct + trend);
  return percentToGrade(predicted);
}

export async function getStudentPerformance(userId: number): Promise<StudentPerformanceData> {
  const [studentRow] = await db
    .select({ id: students.id, classId: students.classId })
    .from(students).where(eq(students.userId, userId)).limit(1);
  if (!studentRow) throw new Error('Student record not found');
  const studentId = studentRow.id;

  // Subject-wise average marks
  const rawResults = await db
    .select({
      subjectId: results.subjectId,
      marks: results.marks,
      examMaxMarks: exams.maxMarks,
    })
    .from(results)
    .leftJoin(exams, eq(exams.id, results.examId))
    .where(eq(results.studentId, studentId));

  const subjectGroups: Record<number, { totalObtained: number; totalMax: number }> = {};
  for (const row of rawResults) {
    if (!row.subjectId) continue;
    const obtained = Number(row.marks) || 0;
    const maxMarks = Number(row.examMaxMarks) || 100;
    if (!subjectGroups[row.subjectId]) {
      subjectGroups[row.subjectId] = { totalObtained: 0, totalMax: 0 };
    }
    subjectGroups[row.subjectId].totalObtained += obtained;
    subjectGroups[row.subjectId].totalMax += maxMarks;
  }

  const subjectStats: SubjectStat[] = await Promise.all(
    Object.entries(subjectGroups).map(async ([subjectIdStr, val]) => {
      const sId = Number(subjectIdStr);
      const [subj] = await db
        .select({ name: subjects.name })
        .from(subjects)
        .where(eq(subjects.id, sId))
        .limit(1);
      
      const percentage = val.totalMax > 0 ? Math.round((val.totalObtained / val.totalMax) * 100) : 0;
      
      return {
        subject: subj?.name || "Unknown",
        score: Math.round(val.totalObtained),
        maxScore: Math.round(val.totalMax),
        percentage,
      };
    })
  );

  // Performance trend
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const rawTrendRows = await db
    .select({
      monthStr: sql<string>`DATE_FORMAT(${results.recordedDate}, '%Y-%m')`,
      marks: results.marks,
      examMaxMarks: exams.maxMarks,
    })
    .from(results)
    .leftJoin(exams, eq(exams.id, results.examId))
    .where(and(eq(results.studentId, studentId), gte(results.recordedDate, sixMonthsAgo)));

  const trendGroups: Record<string, { totalObtained: number; totalMax: number }> = {};
  for (const row of rawTrendRows) {
    if (!row.monthStr) continue;
    const obtained = Number(row.marks) || 0;
    const maxMarks = Number(row.examMaxMarks) || 100;
    if (!trendGroups[row.monthStr]) {
      trendGroups[row.monthStr] = { totalObtained: 0, totalMax: 0 };
    }
    trendGroups[row.monthStr].totalObtained += obtained;
    trendGroups[row.monthStr].totalMax += maxMarks;
  }

  const performanceTrend = Object.entries(trendGroups)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monthStr, val]) => {
      const [year, month] = monthStr.split('-');
      const score = val.totalMax > 0 ? Math.round((val.totalObtained / val.totalMax) * 100) : 0;
      return {
        month: new Date(Number(year), Number(month) - 1, 1).toLocaleString('default', { month: 'short' }),
        score,
      };
    });

  // Derive analysis from stats
  const sortedByScore = [...subjectStats].sort((a, b) => b.percentage - a.percentage);
  const strongSubjects = sortedByScore.slice(0, Math.ceil(sortedByScore.length / 2)).map(s => s.subject);
  const focusSubjects = sortedByScore.slice(-Math.ceil(sortedByScore.length / 2)).map(s => s.subject);

  // Trend delta for predictions
  const avgPct = subjectStats.length > 0 ? subjectStats.reduce((s, x) => s + x.percentage, 0) / subjectStats.length : 0;
  const trendDelta = performanceTrend.length >= 2
    ? performanceTrend[performanceTrend.length - 1].score - performanceTrend[0].score
    : 0;
  const trendPerSubject = trendDelta / (performanceTrend.length || 1);

  const predictedGrades = subjectStats.map(s => ({
    subject: s.subject,
    currentGrade: percentToGrade(s.percentage),
    predictedGrade: predictNextGrade(s.percentage, trendPerSubject),
  }));

  const confidenceScore = Math.min(99, Math.max(50, Math.round(avgPct * 0.9 + trendDelta * 0.5)));

  const goalGPA = Math.min(10, Math.round((avgPct / 10) * 10) / 10);

  const paragraph = buildAIParagraph(avgPct, strongSubjects, focusSubjects, trendDelta);

  const studyTips = buildStudyTips(focusSubjects, strongSubjects, avgPct);

  return { subjectStats, performanceTrend, aiAnalysis: { paragraph, predictedGrades, focusSubjects, strongSubjects, studyTips, confidenceScore, goalGPA } };
}

function buildAIParagraph(avgPct: number, strong: string[], focus: string[], trend: number): string {
  const prefix = avgPct >= 85 ? 'You\'re doing an outstanding job!' : avgPct >= 70 ? 'You\'re on a solid track!' : 'You\'re making progress — keep going!';
  const trendMsg = trend > 5 ? 'Your scores are improving rapidly.' : trend > 0 ? 'Your performance is steadily improving.' : trend < -5 ? 'Recent scores have dipped — now\'s a great time to refocus.' : 'Your scores are consistent.';
  const strongMsg = strong.length > 0 ? `You\'re particularly strong in ${strong.slice(0, 2).join(' and ')}.` : '';
  const focusMsg = focus.length > 0 ? `With a little extra attention on ${focus.slice(0, 2).join(' and ')}, you can achieve excellent results.` : '';
  return `${prefix} ${trendMsg} ${strongMsg} ${focusMsg} Your dedication is evident — consistency will take you to the top!`.trim();
}

function buildStudyTips(focus: string[], strong: string[], avgPct: number): string[] {
  const tips: string[] = [];
  if (focus.length > 0) tips.push(`Spend 30 extra minutes daily on ${focus[0]} — it's your biggest growth opportunity.`);
  if (focus.length > 1) tips.push(`Practice 5 problems in ${focus[1]} before bed. Repetition builds mastery!`);
  if (strong.length > 0) tips.push(`Keep up with ${strong[0]} — teach it to a friend to deepen your understanding.`);
  tips.push('Use the Pomodoro Technique: 25 min focus, 5 min break. Your brain will thank you!');
  tips.push('Review your notes within 24 hours of a class — recall retention shoots up by 70%!');
  if (avgPct < 70) tips.push('Visit your teacher during office hours. Getting clarification saves hours of confusion!');
  return tips.slice(0, 5);
}
