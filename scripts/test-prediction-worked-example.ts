import 'dotenv/config';
import { db } from '../lib/db';
import { students, users, results, exams, subjects, attendance, assignmentSubmissions, assignments, aiPredictions, aiRecommendations } from '../lib/schema';
import { eq } from 'drizzle-orm';
import { generateAIPredictionsForStudent } from '../lib/prediction-engine.service';

async function main() {
  const [student] = await db
    .select({
      id: students.id,
      name: users.name,
    })
    .from(students)
    .leftJoin(users, eq(users.id, students.userId))
    .limit(1);

  if (!student) {
    console.log('No student found in DB.');
    return;
  }

  console.log(`=== RUNNING PREDICTION FOR STUDENT ID: ${student.id} (${student.name}) ===`);
  
  // Run real engine
  const res = await generateAIPredictionsForStudent(student.id);
  console.log('Engine Result:', res);

  // Fetch student raw inputs
  const studentExams = await db
    .select({
      subjectId: results.subjectId,
      subjectName: subjects.name,
      marks: results.marks,
      maxMarks: exams.maxMarks,
      examDate: exams.examDate,
    })
    .from(results)
    .leftJoin(exams, eq(exams.id, results.examId))
    .leftJoin(subjects, eq(subjects.id, results.subjectId))
    .where(eq(results.studentId, student.id));

  const studentAtt = await db
    .select({
      subjectId: attendance.subjectId,
      subjectName: subjects.name,
      status: attendance.status,
    })
    .from(attendance)
    .leftJoin(subjects, eq(subjects.id, attendance.subjectId))
    .where(eq(attendance.studentId, student.id));

  const studentAss = await db
    .select({
      subjectId: assignments.subjectId,
      subjectName: subjects.name,
      grade: assignmentSubmissions.grade,
      maxMarks: assignments.maxMarks,
    })
    .from(assignmentSubmissions)
    .leftJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
    .leftJoin(subjects, eq(subjects.id, assignments.subjectId))
    .where(eq(assignmentSubmissions.studentId, student.id));

  console.log('\n--- RAW INPUT METRICS ---');
  console.log('Exams count:', studentExams.length);
  console.log('Sample Exams:', studentExams.slice(0, 5));
  console.log('Attendance records count:', studentAtt.length);
  console.log('Assignments count:', studentAss.length);

  // Fetch computed predictions from ai_predictions table
  const computedPreds = await db
    .select({
      subjectName: subjects.name,
      currentScore: aiPredictions.currentScore,
      predictedMin: aiPredictions.predictedScoreMin,
      predictedMax: aiPredictions.predictedScoreMax,
      riskLevel: aiPredictions.riskLevel,
      confidence: aiPredictions.confidence,
      academicHealthScore: aiPredictions.academicHealthScore,
      attendanceImpact: aiPredictions.attendanceImpact,
      assignmentImpact: aiPredictions.assignmentImpact,
    })
    .from(aiPredictions)
    .leftJoin(subjects, eq(subjects.id, aiPredictions.subjectId))
    .where(eq(aiPredictions.studentId, student.id));

  console.log('\n--- COMPUTED AI PREDICTIONS ---');
  console.log(JSON.stringify(computedPreds, null, 2));

  // Fetch recommendations
  const computedRecs = await db
    .select()
    .from(aiRecommendations)
    .where(eq(aiRecommendations.studentId, student.id));

  console.log('\n--- GENERATED RECOMMENDATIONS ---');
  console.log(JSON.stringify(computedRecs, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
