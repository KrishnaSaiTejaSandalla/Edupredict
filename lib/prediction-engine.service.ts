import { db } from './db';
import {
  students, results, exams, subjects, attendance,
  assignmentSubmissions, assignments, classSubjects,
  teacherResources, aiPredictions, aiRecommendations
} from './schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';

export async function generateAIPredictionsForStudent(studentId: number) {
  // 1. Fetch student's current enrollment
  const [student] = await db
    .select({ id: students.id, classId: students.classId })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  if (!student) throw new Error("Student not found");

  // 2. Fetch all subjects for this class
  const classSubjs = await db
    .select({ subjectId: classSubjects.subjectId, subjectName: subjects.name })
    .from(classSubjects)
    .leftJoin(subjects, eq(subjects.id, classSubjects.subjectId))
    .where(eq(classSubjects.classId, student.classId));

  if (classSubjs.length === 0) {
    return { status: "insufficient_data", message: "Not enough academic data available yet to generate predictions." };
  }

  // 3. Query academic history (Marks + Exam Performance)
  const examResults = await db
    .select({
      subjectId: results.subjectId,
      marks: results.marks,
      maxMarks: exams.maxMarks,
      examDate: exams.examDate,
    })
    .from(results)
    .leftJoin(exams, eq(exams.id, results.examId))
    .where(eq(results.studentId, studentId));

  // Query Assignment Submissions
  const studentSubmissions = await db
    .select({
      subjectId: assignments.subjectId,
      isLate: assignmentSubmissions.isLate,
      grade: assignmentSubmissions.grade,
      maxMarks: assignments.maxMarks,
    })
    .from(assignmentSubmissions)
    .leftJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
    .where(eq(assignmentSubmissions.studentId, studentId));

  // Query Attendance history
  const attendanceRecords = await db
    .select({
      subjectId: attendance.subjectId,
      status: attendance.status,
    })
    .from(attendance)
    .where(eq(attendance.studentId, studentId));

  // 4. Calculate prediction per subject
  let totalScorePercentageSum = 0;
  let totalSubjectCountWithData = 0;

  interface PredictionItemType {
    subjectId: number;
    currentScore: number;
    predictedScoreMin: number;
    predictedScoreMax: number;
    riskLevel: string;
    confidence: string;
    academicHealthScore: number;
    attendanceImpact: string;
    assignmentImpact: string;
  }

  interface RecommendationItemType {
    type: string;
    title: string;
    description: string;
    resourceId: number | null;
  }

  const predictionsList: PredictionItemType[] = [];
  const recommendationsList: RecommendationItemType[] = [];

  for (const cs of classSubjs) {
    const sId = cs.subjectId;
    const sName = cs.subjectName || "Subject";

    // Filter data for this subject
    const subjExams = examResults.filter(r => r.subjectId === sId);
    const subjAssignments = studentSubmissions.filter(a => a.subjectId === sId);
    const subjAttendance = attendanceRecords.filter(a => a.subjectId === sId);

    // If there is no assessment data (no exams and no assignments), we cannot predict this subject
    if (subjExams.length === 0 && subjAssignments.length === 0) {
      continue;
    }

    // Calculate Average Exam Score Percentage
    let examPct = 0;
    if (subjExams.length > 0) {
      let totalObtained = 0;
      let totalMax = 0;
      subjExams.forEach(e => {
        totalObtained += Number(e.marks) || 0;
        totalMax += Number(e.maxMarks) || 100;
      });
      examPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    }

    // Calculate Assignment Completion and Average Grade Percentage
    let assignmentPct = 0;
    if (subjAssignments.length > 0) {
      let totalObtained = 0;
      let totalMax = 0;
      subjAssignments.forEach(a => {
        totalObtained += Number(a.grade) || 0;
        totalMax += Number(a.maxMarks) || 100;
      });
      assignmentPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    }

    // Calculate Attendance Percentage for this subject
    let attendancePct = 100;
    if (subjAttendance.length > 0) {
      const present = subjAttendance.filter(a => a.status.toLowerCase() === 'present').length;
      attendancePct = (present / subjAttendance.length) * 100;
    }

    // Compute Base Score as weighted average: 70% exam score + 30% assignments
    let currentScore = examPct;
    if (subjAssignments.length > 0 && subjExams.length > 0) {
      currentScore = (examPct * 0.7) + (assignmentPct * 0.3);
    } else if (subjAssignments.length > 0) {
      currentScore = assignmentPct;
    }

    // Prediction formula:
    // Attendance factor: if attendance < 75%, deduct up to 10% from prediction. If attendance > 90%, add up to 3% bonus.
    let predictionModifier = 0;
    if (attendancePct < 75) {
      predictionModifier -= (75 - attendancePct) * 0.2; // up to -15%
    } else if (attendancePct > 90) {
      predictionModifier += (attendancePct - 90) * 0.1; // up to +1%
    }

    // Calculate trend from exams (newer vs older)
    let trendModifier = 0;
    if (subjExams.length >= 2) {
      // Sort exams by date safely
      const sortedExams = [...subjExams].sort((a, b) => {
        const dateA = a.examDate ? new Date(a.examDate).getTime() : 0;
        const dateB = b.examDate ? new Date(b.examDate).getTime() : 0;
        return dateA - dateB;
      });
      const firstHalf = sortedExams.slice(0, Math.floor(sortedExams.length / 2));
      const secondHalf = sortedExams.slice(Math.floor(sortedExams.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, x) => sum + ((Number(x.marks) / (Number(x.maxMarks) || 100)) * 100), 0) / (firstHalf.length || 1);
      const secondAvg = secondHalf.reduce((sum, x) => sum + ((Number(x.marks) / (Number(x.maxMarks) || 100)) * 100), 0) / (secondHalf.length || 1);
      
      trendModifier = (secondAvg - firstAvg) * 0.5; // weight the trend
    }

    const predictedScoreMin = Math.max(0, Math.min(100, currentScore + predictionModifier + trendModifier - 3));
    const predictedScoreMax = Math.max(0, Math.min(100, currentScore + predictionModifier + trendModifier + 3));

    // Determine Risk Level
    const avgPredicted = (predictedScoreMin + predictedScoreMax) / 2;
    const riskLevel = avgPredicted < 60 ? 'high' : avgPredicted < 75 ? 'medium' : 'low';
    
    // Confidence Level based on volume of data
    const totalDataPoints = subjExams.length + subjAssignments.length;
    const confidence = totalDataPoints >= 6 ? 'high' : totalDataPoints >= 3 ? 'medium' : 'low';

    // Calculate individual academic health score for this subject
    const academicHealthScore = Math.round(
      (currentScore * 0.6) + (attendancePct * 0.4)
    );

    totalScorePercentageSum += academicHealthScore;
    totalSubjectCountWithData++;

    // Generate Attendance Impact Description
    const attendanceImpact = attendancePct < 75
      ? `Your low attendance of ${Math.round(attendancePct)}% in ${sName} is negatively dragging down your performance projection by ${Math.round(Math.abs(predictionModifier))}%`
      : `Your consistent attendance of ${Math.round(attendancePct)}% in ${sName} keeps your performance projections stable.`;

    const assignmentImpact = subjAssignments.length === 0
      ? `No assignments submitted yet for ${sName}. Completing assignments is vital for practice and grades.`
      : `Your average assignment grade of ${Math.round(assignmentPct)}% contributes positively to your performance.`;

    predictionsList.push({
      subjectId: sId,
      currentScore: Number(currentScore.toFixed(2)),
      predictedScoreMin: Number(predictedScoreMin.toFixed(2)),
      predictedScoreMax: Number(predictedScoreMax.toFixed(2)),
      riskLevel,
      confidence,
      academicHealthScore,
      attendanceImpact,
      assignmentImpact,
    });

    // 5. Generate Recommendations
    if (avgPredicted < 75) {
      // Find a resource in the database for this subject
      const matchingResources = await db
        .select({ id: teacherResources.id, title: teacherResources.title })
        .from(teacherResources)
        .where(eq(teacherResources.subject, sName))
        .limit(1);

      const recResourceId = matchingResources[0]?.id || null;

      recommendationsList.push({
        type: 'academic',
        title: `Improve ${sName} Performance`,
        description: `Your predicted score is ${Math.round(predictedScoreMin)}-${Math.round(predictedScoreMax)}% (${riskLevel} risk). Focus on reviewing previous test mistakes and practice topics.`,
        resourceId: recResourceId,
      });
    }

    if (attendancePct < 80) {
      recommendationsList.push({
        type: 'attendance',
        title: `Boost ${sName} Attendance`,
        description: `Your attendance in ${sName} is currently ${Math.round(attendancePct)}%. Attending more classes will directly improve your grade predictions.`,
        resourceId: null,
      });
    }
  }

  if (totalSubjectCountWithData === 0) {
    return { status: "insufficient_data", message: "Not enough academic data available yet to generate predictions." };
  }

  // Calculate Overall Academic Health Score
  const overallHealth = Math.round(totalScorePercentageSum / totalSubjectCountWithData);

  // Clear previous predictions/recommendations and save new ones
  await db.transaction(async (tx) => {
    await tx.delete(aiPredictions).where(eq(aiPredictions.studentId, studentId));
    await tx.delete(aiRecommendations).where(eq(aiRecommendations.studentId, studentId));

    for (const pred of predictionsList) {
      await tx.insert(aiPredictions).values({
        studentId,
        subjectId: pred.subjectId,
        currentScore: String(pred.currentScore),
        predictedScoreMin: String(pred.predictedScoreMin),
        predictedScoreMax: String(pred.predictedScoreMax),
        riskLevel: pred.riskLevel,
        confidence: pred.confidence,
        academicHealthScore: pred.academicHealthScore,
        attendanceImpact: pred.attendanceImpact,
        assignmentImpact: pred.assignmentImpact,
      });
    }

    for (const rec of recommendationsList) {
      await tx.insert(aiRecommendations).values({
        studentId,
        type: rec.type,
        title: rec.title,
        description: rec.description,
        resourceId: rec.resourceId,
      });
    }
  });

  return { status: "success", overallHealth };
}
