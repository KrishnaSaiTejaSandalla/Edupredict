import { db } from './db';
import {
  teachers,
  teacherFeedback,
  assignmentSubmissions,
  assignments,
  attendance,
  results,
  exams,
  students,
  classSubjects,
  classes,
  subjects,
} from './schema';
import { eq, and, desc, sql, gte, avg, inArray } from 'drizzle-orm';

// ==================== TEACHER PERFORMANCE SERVICE ====================

export type TeacherPerformanceData = {
  kpis: {
    teacherRating: number;         // avg from teacher_feedback (0 if none)
    attendanceCompletionRate: number;  // % of days attendance was marked
    gradingRate: number;           // % of submissions that are graded
    studentSatisfaction: number;   // % positive feedback (rating >= 4)
  };
  teachingEffectiveness: {
    month: string;
    avgScore: number;
  }[];
  classOutcomes: {
    className: string;
    avgScore: number;
    totalStudents: number;
  }[];
  aiInsights: {
    noticing: string;
    contributing: string;
    tryAction: string;
    recheck: string;
  } | null;
  feedbackStats: {
    averageRating: number;
    feedbackCount: number;
    recentFeedback: string[];
  };
};

export async function getTeacherPerformance(teacherId: number, userId: number): Promise<TeacherPerformanceData> {
  try {
    // 1. Teacher Rating from feedback
    let teacherRating = 0;
    try {
      const [ratingRow] = await db
        .select({ avg: sql<number>`AVG(${teacherFeedback.rating})` })
        .from(teacherFeedback)
        .where(eq(teacherFeedback.teacherId, teacherId));
      teacherRating = ratingRow?.avg ? Math.round(Number(ratingRow.avg) * 10) / 10 : 0;
    } catch (error) {
      console.error('Error fetching teacher rating:', error);
      teacherRating = 0;
    }

    // 2. Student Satisfaction (% ratings >= 4)
    let studentSatisfaction = 0;
    let feedbackCount = 0;
    try {
      const [totalFbRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(teacherFeedback)
        .where(eq(teacherFeedback.teacherId, teacherId));
      const [positiveFbRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(teacherFeedback)
        .where(and(eq(teacherFeedback.teacherId, teacherId), sql`${teacherFeedback.rating} >= 4`));
      const totalFb = Number(totalFbRow?.count || 0);
      feedbackCount = totalFb;
      const positiveFb = Number(positiveFbRow?.count || 0);
      studentSatisfaction = totalFb > 0 ? Math.round((positiveFb / totalFb) * 100) : 0;
    } catch (error) {
      console.error('Error fetching student satisfaction:', error);
      studentSatisfaction = 0;
    }

    // Recent feedback comments
    let recentFeedback: string[] = [];
    try {
      const fbRows = await db
        .select({ comment: teacherFeedback.comment })
        .from(teacherFeedback)
        .where(eq(teacherFeedback.teacherId, teacherId))
        .orderBy(desc(teacherFeedback.createdAt))
        .limit(5);
      recentFeedback = fbRows
        .map((r) => r.comment)
        .filter((c): c is string => !!c);
    } catch (error) {
      console.error('Error fetching recent feedback:', error);
    }

    // 3. Attendance Completion Rate (days marked / expected days in last 30 days)
    let classRows: Array<{ classId: number }> = [];
    try {
      classRows = await db
        .select({ classId: classSubjects.classId })
        .from(classSubjects)
        .where(eq(classSubjects.teacherId, teacherId))
        .groupBy(classSubjects.classId);
    } catch (error) {
      console.error('Error fetching class assignments:', error);
      classRows = [];
    }
    
    const classIds = classRows.map((r) => r.classId);

    let attendanceCompletionRate = 0;
    if (classIds.length > 0) {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Count unique (classId, date) pairs where attendance was marked
        const [markedRow] = await db
          .select({ count: sql<number>`COUNT(DISTINCT CONCAT(${attendance.classId}, '_', DATE(${attendance.attendanceDate})))` })
          .from(attendance)
          .where(
            and(
              inArray(attendance.classId, classIds),
              gte(attendance.attendanceDate, thirtyDaysAgo)
            )
          );

        // Expected: classIds.length * 22 working days (rough estimate for 30 days)
        const expectedDays = classIds.length * 22;
        const markedDays = Number(markedRow?.count || 0);
        attendanceCompletionRate = expectedDays > 0 ? Math.min(100, Math.round((markedDays / expectedDays) * 100)) : 0;
      } catch (error) {
        console.error('Error fetching attendance completion rate:', error);
        attendanceCompletionRate = 0;
      }
    }

    // 4. Grading Rate
    let gradingRate = 100;
    try {
      const [totalSubsRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(assignmentSubmissions)
        .leftJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
        .where(eq(assignments.teacherId, teacherId));
      const [gradedSubsRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(assignmentSubmissions)
        .leftJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
        .where(
          and(
            eq(assignments.teacherId, teacherId),
            sql`${assignmentSubmissions.grade} IS NOT NULL`
          )
        );
      const totalSubs = Number(totalSubsRow?.count || 0);
      const gradedSubs = Number(gradedSubsRow?.count || 0);
      gradingRate = totalSubs > 0 ? Math.round((gradedSubs / totalSubs) * 100) : 100;
    } catch (error) {
      console.error('Error fetching grading rate:', error);
      gradingRate = 100;
    }

    // 5. Teaching Effectiveness (avg results by month, last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const teachingEffectiveness: TeacherPerformanceData['teachingEffectiveness'] = [];
    if (classIds.length > 0) {
      try {
        const effectivenessRows = await db
          .select({
            month: sql<string>`DATE_FORMAT(${results.recordedDate}, '%Y-%m')`,
            avg: sql<number>`AVG((CAST(${results.marks} AS DECIMAL(5,2)) / NULLIF(CAST(${exams.maxMarks} AS DECIMAL(5,2)), 0)) * 100)`,
          })
          .from(results)
          .leftJoin(students, eq(results.studentId, students.id))
          .leftJoin(exams, eq(results.examId, exams.id))
          .where(
            and(
              inArray(students.classId, classIds),
              gte(results.recordedDate, sixMonthsAgo)
            )
          )
          .groupBy(sql`DATE_FORMAT(${results.recordedDate}, '%Y-%m')`)
          .orderBy(sql`DATE_FORMAT(${results.recordedDate}, '%Y-%m')`);

        for (const row of effectivenessRows) {
          const [year, month] = (row.month || '').split('-');
          const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleString('default', { month: 'short' });
          teachingEffectiveness.push({
            month: `${monthName} ${year}`,
            avgScore: Math.round(Number(row.avg || 0)),
          });
        }
      } catch (error) {
        console.error('Error fetching teaching effectiveness:', error);
        // Return empty array on error
      }
    }

    // 6. Class Outcomes — avg score per class
    const classOutcomes: TeacherPerformanceData['classOutcomes'] = [];
    for (const classId of classIds.slice(0, 6)) {
      try {
        const [classRow] = await db
          .select({ name: classes.name, section: classes.section })
          .from(classes)
          .where(eq(classes.id, classId))
          .limit(1);

        const [avgRow] = await db
          .select({
            avg: sql<number>`AVG((CAST(${results.marks} AS DECIMAL(5,2)) / NULLIF(CAST(${exams.maxMarks} AS DECIMAL(5,2)), 0)) * 100)`,
          })
          .from(results)
          .leftJoin(students, eq(results.studentId, students.id))
          .leftJoin(exams, eq(results.examId, exams.id))
          .where(eq(students.classId, classId));

        const [studentsRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(students)
          .where(eq(students.classId, classId));

        classOutcomes.push({
          className: classRow
            ? `${classRow.name}${classRow.section ? ` ${classRow.section}` : ''}`
            : 'Class',
          avgScore: Math.round(Number(avgRow?.avg || 0)),
          totalStudents: Number(studentsRow?.count || 0),
        });
      } catch (error) {
        console.error(`Error fetching class outcome for classId ${classId}:`, error);
        // Continue to next class on error
      }
    }

    // 7. AI Insights — only generate if enough data exists
    let aiInsights: TeacherPerformanceData['aiInsights'] = null;

    if (teachingEffectiveness.length >= 2 && classOutcomes.length > 0) {
      try {
        const lastTwo = teachingEffectiveness.slice(-2);
        const diff = lastTwo[1].avgScore - lastTwo[0].avgScore;
        const lowestClass = classOutcomes.reduce((a, b) => (a.avgScore < b.avgScore ? a : b));

        if (diff < -5) {
          aiInsights = {
            noticing: `Average scores dropped by ${Math.abs(diff).toFixed(1)}% this month. ${lowestClass.className} has the lowest average at ${lowestClass.avgScore}%.`,
            contributing: `${lowestClass.className} recent test scores were lower, which pulled down the overall average. This usually happens when a recent topic was harder or attendance dropped during key lessons.`,
            tryAction: `1. Conduct a quick 10-minute revision on recent weak topics for ${lowestClass.className}.\n2. Share a 5-question practice sheet from the Resources tab.\n3. Pair students who scored below 60% with a study partner.`,
            recheck: `Re-evaluate ${lowestClass.className} test scores after 2 weeks to target an improvement of at least 5%.`,
          };
        } else if (lowestClass.avgScore < 50) {
          aiInsights = {
            noticing: `${lowestClass.className} needs help — current class average is ${lowestClass.avgScore}%, which is below the passing goal.`,
            contributing: `Students in ${lowestClass.className} are struggling with foundational concepts from earlier chapters.`,
            tryAction: `1. Run a low-stakes 5-question diagnostic quiz to find exact weak spots.\n2. Use the AI Material Builder in Resources to generate remedial practice sets.\n3. Review basic formulas and rules before introducing new topics.`,
            recheck: `Give a brief follow-up quiz in 10 days to confirm student scores cross 60%.`,
          };
        } else if (gradingRate < 70) {
          aiInsights = {
            noticing: `${(100 - gradingRate).toFixed(0)}% of submitted student assignments are still pending your grades.`,
            contributing: `Delayed grading feedback makes it harder for students to learn from recent mistakes before their next test.`,
            tryAction: `1. Set aside 30 minutes today to grade pending submissions.\n2. Use quick rubric grading for routine homework assignments.\n3. Return graded work promptly so students can review before the weekend.`,
            recheck: `Aim to clear all pending grading within 3 days to keep student feedback on track.`,
          };
        } else {
          aiInsights = {
            noticing: `Your classes are performing well with a strong overall average of ${classOutcomes.length > 0 ? (classOutcomes.reduce((sum, c) => sum + c.avgScore, 0) / classOutcomes.length).toFixed(1) : 'N/A'}% and a ${gradingRate}% grading completion rate.`,
            contributing: `Consistent attendance and regular assessment habits are maintaining strong classroom performance.`,
            tryAction: `1. Prepare optional challenge questions for fast-finishing students.\n2. Maintain your current teaching rhythm and attendance tracking.\n3. Generate advance revision guides for upcoming mid-term topics using the AI Builder.`,
            recheck: `Check back after your next upcoming test to monitor continued class progress.`,
          };
        }

      } catch (error) {
        console.error('Error generating AI insights:', error);
        aiInsights = null;
      }
    }

    return {
      kpis: {
        teacherRating,
        attendanceCompletionRate,
        gradingRate,
        studentSatisfaction,
      },
      teachingEffectiveness,
      classOutcomes,
      aiInsights,
      feedbackStats: {
        averageRating: teacherRating,
        feedbackCount,
        recentFeedback,
      },
    };
  } catch (error) {
    console.error('Critical error in getTeacherPerformance:', error);
    // Return safe defaults if anything fails
    return {
      kpis: {
        teacherRating: 0,
        attendanceCompletionRate: 0,
        gradingRate: 100,
        studentSatisfaction: 0,
      },
      teachingEffectiveness: [],
      classOutcomes: [],
      aiInsights: null,
      feedbackStats: {
        averageRating: 0,
        feedbackCount: 0,
        recentFeedback: [],
      },
    };
  }
}
