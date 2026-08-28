import { db } from './db';
import {
  students, attendance, results, exams, assignments, assignmentSubmissions,
  classSubjects, subjects, teachers, users, studentDiaries,
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
  aiStudyBuddy?: {
    tier: "high" | "mid" | "needs_boost";
    stars: number;
    starLabel: string;
    badge: string;
    headline: string;
    quote: string;
    actionPoints: { icon: string; title: string; detail: string; tag?: string }[];
    quickTips: string[];
  };
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
  const allClassAssignments = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(and(eq(assignments.classId, classId), gte(assignments.dueDate, todayDate)));

  const submittedIds = allClassAssignments.length > 0
    ? (
        await db
          .select({ assignmentId: assignmentSubmissions.assignmentId })
          .from(assignmentSubmissions)
          .where(
            and(
              eq(assignmentSubmissions.studentId, studentId),
              inArray(
                assignmentSubmissions.assignmentId,
                allClassAssignments.map((a) => a.id)
              )
            )
          )
      ).map((s) => s.assignmentId)
    : [];
  const pendingAssignments = allClassAssignments.filter((a) => !submittedIds.includes(a.id)).length;

  // --- KPI 4: Upcoming Exams (next 35 days for this student's class) ---
  const thirtyFiveDaysLater = new Date(todayDate);
  thirtyFiveDaysLater.setDate(thirtyFiveDaysLater.getDate() + 35);
  const [upcomingRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(exams)
    .where(
      and(
        eq(exams.classId, classId),
        gte(exams.examDate, todayDate),
        lte(exams.examDate, thirtyFiveDaysLater)
      )
    );
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

  const recentResults = recentResultsRows.map((r) => ({
    subjectName: r.subjectName || 'Unknown',
    examName: r.examName || 'Assessment',
    marks: Number(r.marks),
    maxMarks: Number(r.maxMarks) || 100,
    date: r.recordedDate instanceof Date ? r.recordedDate.toISOString().split('T')[0] : String(r.recordedDate),
  }));

  // --- Today's Diary ---
  // The dashboard must show teacher-posted diary entries only. Timetable rows
  // are deliberately not used here because they are scheduled classes, not diary posts.
  const diaries = await db
    .select({
      id: studentDiaries.id,
      topicTaught: studentDiaries.topicTaught,
      homework: studentDiaries.homework,
      subjectId: studentDiaries.subjectId,
      subjectName: subjects.name,
      teacherName: users.name,
    })
    .from(studentDiaries)
    .leftJoin(subjects, eq(subjects.id, studentDiaries.subjectId))
    .leftJoin(teachers, eq(teachers.id, studentDiaries.teacherId))
    .leftJoin(users, eq(users.id, teachers.userId))
    .where(and(eq(studentDiaries.classId, classId), eq(studentDiaries.date, todayDate)))
    .orderBy(desc(studentDiaries.id));

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
  const todaysClasses = diaries.map((diary) => ({
    subjectName: diary.subjectName || 'Unknown',
    topicTaught: diary.topicTaught || null,
    homework: diary.homework || null,
    teacherName: diary.teacherName || 'Teacher',
    startTime: '',
    endTime: '',
    diaryId: diary.id,
    isHomeworkCompleted: progressesMap.get(diary.id) ?? false,
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

  // --- AI Study Tips & Persona Buddy ---
  const aiBuddy = generateStudyBuddy({
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
    aiStudyTips: aiBuddy.quickTips,
    aiStudyBuddy: aiBuddy,
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

export type AIStudyBuddy = {
  tier: "high" | "mid" | "needs_boost";
  stars: number;
  starLabel: string;
  badge: string;
  headline: string;
  quote: string;
  actionPoints: { icon: string; title: string; detail: string; tag?: string }[];
  quickTips: string[];
};

function generateStudyBuddy({ attendancePercent, averageScore, pendingAssignments, recentResults, predictions }: {
  attendancePercent: number;
  averageScore: number;
  pendingAssignments: number;
  recentResults: any[];
  predictions?: { subjectName: string; predictedScore: number; riskLevel: string; confidence: number }[];
}): AIStudyBuddy {
  // Determine highest and lowest subjects
  let strongestSubject = "";
  let weakestSubject = "";
  if (recentResults.length > 0) {
    const sorted = [...recentResults].sort((a, b) => (b.marks / b.maxMarks) - (a.marks / a.maxMarks));
    strongestSubject = sorted[0]?.subjectName || "";
    weakestSubject = sorted[sorted.length - 1]?.subjectName || "";
  } else if (predictions && predictions.length > 0) {
    const sorted = [...predictions].sort((a, b) => b.predictedScore - a.predictedScore);
    strongestSubject = sorted[0]?.subjectName || "";
    weakestSubject = sorted[sorted.length - 1]?.subjectName || "";
  }

  // Tier 1: High Performing Student (Score >= 80% or (>= 75% & Attendance >= 90%))
  if (averageScore >= 80 || (averageScore >= 75 && attendancePercent >= 90)) {
    const actionPoints = [
      {
        icon: "👑",
        title: "Mastery & Extra Practice",
        detail: strongestSubject
          ? `You're doing fantastic in ${strongestSubject}! Try solving 2 extra practice questions or writing a quick summary note to stay ahead in class.`
          : "Try solving 2 bonus practice problems this week to strengthen your concepts even further.",
        tag: "High Mastery",
      },
      {
        icon: "🧠",
        title: "Active Recall & Teaching",
        detail: "Explaining difficult concepts to a classmate or writing one-page cheat sheets locks in 90% retention for upcoming finals.",
        tag: "Retention Hack",
      },
    ];

    if (weakestSubject && weakestSubject !== strongestSubject) {
      actionPoints.push({
        icon: "🎯",
        title: `Fine-Tune ${weakestSubject}`,
        detail: `Even champions have a blindspot. Spend just 20 minutes reviewing ${weakestSubject} formulas to make your scorecard 100% bulletproof!`,
        tag: "Targeted Boost",
      });
    }

    if (pendingAssignments > 0) {
      actionPoints.push({
        icon: "⚡",
        title: "Lock In Formative Marks",
        detail: `You have ${pendingAssignments} pending assignment(s). Clear them early so your grade points stay at the absolute peak!`,
        tag: "Quick Win",
      });
    }

    return {
      tier: "high",
      stars: 5,
      starLabel: "⭐⭐⭐⭐⭐ Top Tier Champion",
      badge: "Champion Mode 🏆",
      headline: "Well done buddy! You're dominating the leaderboard!",
      quote: "Champions aren't born in comfort zones — you're proving what discipline and focus look like every single day. Let's keep this momentum unstoppable!",
      actionPoints,
      quickTips: [
        `🌟 Stellar performance (${averageScore}% avg). You're in the top tier!`,
        attendancePercent >= 90 ? `🎉 Fantastic ${attendancePercent}% attendance keeps you ahead of the curve.` : `📅 Keep attendance above 90% to maintain your top rank.`,
        strongestSubject ? `🚀 ${strongestSubject} is your powerhouse subject.` : "Keep up your daily revision habits.",
        `💡 Try teaching tough topics to a peer to solidify your mastery.`,
      ],
    };
  }

  // Tier 2: Mid-Range Student (55% - 79%)
  if (averageScore >= 55) {
    const actionPoints = [
      {
        icon: "🚀",
        title: "The +10% Breakthrough",
        detail: weakestSubject
          ? `You are right on the verge of the top bracket! Focus on ${weakestSubject} by solving 5 targeted problems daily — that alone can jump your overall score by 10%.`
          : "Identify your lowest scoring topic and dedicate 25 focused minutes to it today. You're closer to the top tier than you think!",
        tag: "High Impact",
      },
      {
        icon: "📅",
        title: "Class Attendance Multiplier",
        detail: attendancePercent >= 85
          ? `Your attendance (${attendancePercent}%) is solid! Actively raising your hand during class will convert good grades into great ones.`
          : `Your attendance is ${attendancePercent}%. Bringing it to 90%+ gives an immediate +5% boost in exam familiarity.`,
        tag: "Daily Anchor",
      },
    ];

    if (pendingAssignments > 0) {
      actionPoints.push({
        icon: "📝",
        title: "Turn in Pending Work",
        detail: `Submit your ${pendingAssignments} pending assignment(s) this week. These are easy guaranteed marks waiting for you!`,
        tag: "Grade Booster",
      });
    } else {
      actionPoints.push({
        icon: "⚡",
        title: "Formula / Keyword Drills",
        detail: "Create quick 5-minute flashcards for key definitions before bed. Small consistent habits beat all-night cramming every time.",
        tag: "Memory Hack",
      });
    }

    return {
      tier: "mid",
      stars: 4,
      starLabel: "⭐⭐⭐⭐ Rising Star",
      badge: "Rising Star 🚀",
      headline: "You're on the edge of greatness, champ! Let's unlock the top tier!",
      quote: "Confidence is your superpower. Believe in yourself like your teachers and parents do — you have every tool needed to jump straight into the top tier. Let's conquer it together!",
      actionPoints,
      quickTips: [
        `📈 Solid performance (${averageScore}% avg). A small push will get you to 85%+!`,
        weakestSubject ? `🎯 Focus extra revision time on ${weakestSubject}.` : "Review your weekly class notes.",
        attendancePercent < 80 ? `⚠️ Boost your attendance from ${attendancePercent}% to 85%+ for an instant grade lift.` : `👍 Good attendance (${attendancePercent}%). Stay consistent!`,
        `🧠 Use the 25-5 Pomodoro technique for frictionless study sessions.`,
      ],
    };
  }

  // Tier 3: Struggling / Needs Motivation & Structure (< 55% or No Data)
  const actionPoints = [
    {
      icon: "💖",
      title: "Zero Pressure, 15-Minute Micro Wins",
      detail: "Don't worry about the whole syllabus right now. Pick just ONE chapter today and spend 15 focused minutes understanding 2 key concepts.",
      tag: "Start Here",
    },
    {
      icon: "🤝",
      title: "Your Teachers Want You To Win",
      detail: "Never feel shy or hesitant to ask questions in class. Teachers love students who want to improve — ask them to clarify just 1 doubt tomorrow.",
      tag: "Secret Weapon",
    },
  ];

  if (attendancePercent < 75) {
    actionPoints.push({
      icon: "📅",
      title: "Step 1: Just Show Up",
      detail: `Your attendance is ${attendancePercent}%. Just being in the classroom every day and listening to discussions handles 70% of the exam prep automatically.`,
      tag: "Crucial Step",
    });
  } else {
    actionPoints.push({
      icon: "📝",
      title: "Practice 3 Sample Questions",
      detail: weakestSubject
        ? `Solve 3 simple textbook problems in ${weakestSubject} today. Getting small right answers builds unstoppable confidence.`
        : "Solve 3 practice questions with answer keys today. Seeing quick progress transforms your mindset!",
      tag: "Confidence Builder",
    });
  }

  return {
    tier: "needs_boost",
    stars: 3,
    starLabel: "⭐⭐⭐ Bound For Greatness",
    badge: "Bound For Greatness 💖",
    headline: "Hey buddy! Remember: where you are now is never your limit — you have tremendous potential to top!",
    quote: "Last is never an option, it's just a temporary choice. Every master was once a beginner who refused to give up. You have immense potential inside you — we are going to build this step by step, together!",
    actionPoints,
    quickTips: [
      "💪 You have enormous potential. Take it one day, one topic at a time!",
      attendancePercent < 75 ? "📅 Attending class regularly is your fastest shortcut to higher marks." : "👍 Great job showing up to classes!",
      weakestSubject ? `🌱 Review foundational concepts in ${weakestSubject}.` : "Start with 15-minute daily study habits.",
      "✨ Never hesitate to ask your teachers for help — they're in your corner.",
    ],
  };
}

