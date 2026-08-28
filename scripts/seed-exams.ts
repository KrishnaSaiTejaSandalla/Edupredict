import 'dotenv/config';
import { db, closeDB } from '../lib/db';
import { exams, results, classes, subjects, students, attendance } from '../lib/schema';
import { eq, sql } from 'drizzle-orm';

function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

interface ExamDef {
  name: string;
  type: 'Weekly Test' | 'Summative' | 'Midterm' | 'Final';
  dateStr: string;
  subjectName: string;
  maxMarks: number;
  duration: number;
}

const ALL_EXAMS: ExamDef[] = [
  // 1. Weekly Test 1 (July 6–8, 2026)
  { name: 'Weekly Test 1 - English', type: 'Weekly Test', dateStr: '2026-07-06', subjectName: 'English', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 1 - Mathematics', type: 'Weekly Test', dateStr: '2026-07-07', subjectName: 'Mathematics', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 1 - Science', type: 'Weekly Test', dateStr: '2026-07-08', subjectName: 'Science', maxMarks: 20, duration: 45 },

  // 2. Weekly Test 2 (July 20–22, 2026)
  { name: 'Weekly Test 2 - Hindi', type: 'Weekly Test', dateStr: '2026-07-20', subjectName: 'Hindi', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 2 - Social Studies', type: 'Weekly Test', dateStr: '2026-07-21', subjectName: 'Social Studies', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 2 - Computer Science', type: 'Weekly Test', dateStr: '2026-07-22', subjectName: 'Computer Science', maxMarks: 20, duration: 45 },

  // 3. Weekly Test 3 (August 3–5, 2026)
  { name: 'Weekly Test 3 - English', type: 'Weekly Test', dateStr: '2026-08-03', subjectName: 'English', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 3 - Mathematics', type: 'Weekly Test', dateStr: '2026-08-04', subjectName: 'Mathematics', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 3 - Sanskrit', type: 'Weekly Test', dateStr: '2026-08-05', subjectName: 'Sanskrit', maxMarks: 20, duration: 45 },

  // 4. Weekly Test 4 (August 17–19, 2026)
  { name: 'Weekly Test 4 - Science', type: 'Weekly Test', dateStr: '2026-08-17', subjectName: 'Science', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 4 - Social Studies', type: 'Weekly Test', dateStr: '2026-08-18', subjectName: 'Social Studies', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 4 - Computer Science', type: 'Weekly Test', dateStr: '2026-08-19', subjectName: 'Computer Science', maxMarks: 20, duration: 45 },

  // 5. Weekly Test 5 (September 7–9, 2026)
  { name: 'Weekly Test 5 - English', type: 'Weekly Test', dateStr: '2026-09-07', subjectName: 'English', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 5 - Mathematics', type: 'Weekly Test', dateStr: '2026-09-08', subjectName: 'Mathematics', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 5 - Science', type: 'Weekly Test', dateStr: '2026-09-09', subjectName: 'Science', maxMarks: 20, duration: 45 },

  // 6. Summative Assessment 1 (September 21–28, 2026)
  { name: 'Summative Assessment 1 - English', type: 'Summative', dateStr: '2026-09-21', subjectName: 'English', maxMarks: 50, duration: 90 },
  { name: 'Summative Assessment 1 - Mathematics', type: 'Summative', dateStr: '2026-09-22', subjectName: 'Mathematics', maxMarks: 50, duration: 90 },
  { name: 'Summative Assessment 1 - Science', type: 'Summative', dateStr: '2026-09-23', subjectName: 'Science', maxMarks: 50, duration: 90 },
  { name: 'Summative Assessment 1 - Social Studies', type: 'Summative', dateStr: '2026-09-24', subjectName: 'Social Studies', maxMarks: 50, duration: 90 },
  { name: 'Summative Assessment 1 - Hindi', type: 'Summative', dateStr: '2026-09-26', subjectName: 'Hindi', maxMarks: 50, duration: 90 },
  { name: 'Summative Assessment 1 - Sanskrit', type: 'Summative', dateStr: '2026-09-26', subjectName: 'Sanskrit', maxMarks: 50, duration: 90 },
  { name: 'Summative Assessment 1 - Computer Science', type: 'Summative', dateStr: '2026-09-28', subjectName: 'Computer Science', maxMarks: 50, duration: 90 },

  // 7. Weekly Test 6 (October 5–7, 2026)
  { name: 'Weekly Test 6 - English', type: 'Weekly Test', dateStr: '2026-10-05', subjectName: 'English', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 6 - Mathematics', type: 'Weekly Test', dateStr: '2026-10-06', subjectName: 'Mathematics', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 6 - Science', type: 'Weekly Test', dateStr: '2026-10-07', subjectName: 'Science', maxMarks: 20, duration: 45 },

  // 8. Midterm Examination (November 30 – December 5, 2026)
  { name: 'Midterm Examination - English', type: 'Midterm', dateStr: '2026-11-30', subjectName: 'English', maxMarks: 100, duration: 180 },
  { name: 'Midterm Examination - Mathematics', type: 'Midterm', dateStr: '2026-12-01', subjectName: 'Mathematics', maxMarks: 100, duration: 180 },
  { name: 'Midterm Examination - Science', type: 'Midterm', dateStr: '2026-12-02', subjectName: 'Science', maxMarks: 100, duration: 180 },
  { name: 'Midterm Examination - Social Studies', type: 'Midterm', dateStr: '2026-12-03', subjectName: 'Social Studies', maxMarks: 100, duration: 180 },
  { name: 'Midterm Examination - Hindi', type: 'Midterm', dateStr: '2026-12-04', subjectName: 'Hindi', maxMarks: 100, duration: 180 },
  { name: 'Midterm Examination - Sanskrit', type: 'Midterm', dateStr: '2026-12-04', subjectName: 'Sanskrit', maxMarks: 100, duration: 180 },
  { name: 'Midterm Examination - Computer Science', type: 'Midterm', dateStr: '2026-12-05', subjectName: 'Computer Science', maxMarks: 100, duration: 180 },

  // 9. Weekly Test 7 (December 14–16, 2026)
  { name: 'Weekly Test 7 - English', type: 'Weekly Test', dateStr: '2026-12-14', subjectName: 'English', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 7 - Mathematics', type: 'Weekly Test', dateStr: '2026-12-15', subjectName: 'Mathematics', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 7 - Science', type: 'Weekly Test', dateStr: '2026-12-16', subjectName: 'Science', maxMarks: 20, duration: 45 },

  // 10. Weekly Test 8 (January 11–13, 2027)
  { name: 'Weekly Test 8 - Hindi', type: 'Weekly Test', dateStr: '2027-01-11', subjectName: 'Hindi', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 8 - Social Studies', type: 'Weekly Test', dateStr: '2027-01-12', subjectName: 'Social Studies', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 8 - Computer Science', type: 'Weekly Test', dateStr: '2027-01-13', subjectName: 'Computer Science', maxMarks: 20, duration: 45 },

  // 11. Weekly Test 9 (February 1–3, 2027)
  { name: 'Weekly Test 9 - English', type: 'Weekly Test', dateStr: '2027-02-01', subjectName: 'English', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 9 - Mathematics', type: 'Weekly Test', dateStr: '2027-02-02', subjectName: 'Mathematics', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 9 - Science', type: 'Weekly Test', dateStr: '2027-02-03', subjectName: 'Science', maxMarks: 20, duration: 45 },

  // 12. Summative Assessment 2 (February 8–13, 2027)
  { name: 'Summative Assessment 2 - English', type: 'Summative', dateStr: '2027-02-08', subjectName: 'English', maxMarks: 50, duration: 90 },
  { name: 'Summative Assessment 2 - Mathematics', type: 'Summative', dateStr: '2027-02-09', subjectName: 'Mathematics', maxMarks: 50, duration: 90 },
  { name: 'Summative Assessment 2 - Science', type: 'Summative', dateStr: '2027-02-10', subjectName: 'Science', maxMarks: 50, duration: 90 },
  { name: 'Summative Assessment 2 - Social Studies', type: 'Summative', dateStr: '2027-02-11', subjectName: 'Social Studies', maxMarks: 50, duration: 90 },
  { name: 'Summative Assessment 2 - Hindi', type: 'Summative', dateStr: '2027-02-12', subjectName: 'Hindi', maxMarks: 50, duration: 90 },
  { name: 'Summative Assessment 2 - Sanskrit', type: 'Summative', dateStr: '2027-02-12', subjectName: 'Sanskrit', maxMarks: 50, duration: 90 },
  { name: 'Summative Assessment 2 - Computer Science', type: 'Summative', dateStr: '2027-02-13', subjectName: 'Computer Science', maxMarks: 50, duration: 90 },

  // 13. Weekly Test 10 (March 1–3, 2027)
  { name: 'Weekly Test 10 - English', type: 'Weekly Test', dateStr: '2027-03-01', subjectName: 'English', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 10 - Mathematics', type: 'Weekly Test', dateStr: '2027-03-02', subjectName: 'Mathematics', maxMarks: 20, duration: 45 },
  { name: 'Weekly Test 10 - Science', type: 'Weekly Test', dateStr: '2027-03-03', subjectName: 'Science', maxMarks: 20, duration: 45 },

  // 14. Final Examination (April 1–12, 2027)
  { name: 'Final Examination - English', type: 'Final', dateStr: '2027-04-01', subjectName: 'English', maxMarks: 100, duration: 180 },
  { name: 'Final Examination - Mathematics', type: 'Final', dateStr: '2027-04-02', subjectName: 'Mathematics', maxMarks: 100, duration: 180 },
  { name: 'Final Examination - Science', type: 'Final', dateStr: '2027-04-03', subjectName: 'Science', maxMarks: 100, duration: 180 },
  { name: 'Final Examination - Social Studies', type: 'Final', dateStr: '2027-04-05', subjectName: 'Social Studies', maxMarks: 100, duration: 180 },
  { name: 'Final Examination - Hindi', type: 'Final', dateStr: '2027-04-06', subjectName: 'Hindi', maxMarks: 100, duration: 180 },
  { name: 'Final Examination - Sanskrit', type: 'Final', dateStr: '2027-04-07', subjectName: 'Sanskrit', maxMarks: 100, duration: 180 },
  { name: 'Final Examination - Computer Science', type: 'Final', dateStr: '2027-04-09', subjectName: 'Computer Science', maxMarks: 100, duration: 180 },
  { name: 'Final Examination - Music', type: 'Final', dateStr: '2027-04-10', subjectName: 'Music', maxMarks: 100, duration: 180 },
  { name: 'Final Examination - Physical Education', type: 'Final', dateStr: '2027-04-12', subjectName: 'Physical Education', maxMarks: 100, duration: 180 },
];

async function seedExamsAndResults() {
  console.log('Starting full exam calendar and results generation...');

  // 1. Delete previous exams and test marks
  console.log('Deleting existing exam results and exams...');
  await db.execute(sql`DELETE FROM results WHERE exam_id IS NOT NULL`);
  await db.execute(sql`DELETE FROM exams`);
  console.log('Cleared previous exam records.');

  // 2. Fetch classes and subjects
  const classRows = await db.select().from(classes);
  const subjectRows = await db.select().from(subjects);

  const subjectMap = new Map<string, number>();
  for (const s of subjectRows) {
    subjectMap.set(s.name.trim().toLowerCase(), s.id);
  }

  // 3. Fetch all students and their attendance rates
  const studentRows = await db.select().from(students);
  console.log(`Fetched ${studentRows.length} students across ${classRows.length} classes.`);

  // Calculate attendance rate for each student
  const attendanceRateMap = new Map<number, number>();
  for (const s of studentRows) {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        present: sql<number>`sum(case when status = 'present' then 1 else 0 end)`,
      })
      .from(attendance)
      .where(eq(attendance.studentId, s.id));

    const total = Number(stats?.total || 0);
    const present = Number(stats?.present || 0);
    const rate = total > 0 ? present / total : 0.85;
    attendanceRateMap.set(s.id, rate);
  }

  // 4. Create Exam rows for each class
  const createdExams: Array<{
    id: number;
    classId: number;
    subjectId: number;
    name: string;
    type: string;
    dateStr: string;
    maxMarks: number;
  }> = [];

  const TODAY_STR = '2026-08-26';

  for (const cls of classRows) {
    for (const def of ALL_EXAMS) {
      const subjectId = subjectMap.get(def.subjectName.toLowerCase());
      if (!subjectId) {
        console.warn(`Subject ${def.subjectName} not found!`);
        continue;
      }

      const res = await db.insert(exams).values({
        classId: cls.id,
        subjectId,
        name: def.name,
        examDate: new Date(`${def.dateStr}T00:00:00.000Z`) as any,
        duration: def.duration,
        maxMarks: def.maxMarks.toFixed(2),
        type: def.type,
        isArchived: false,
      });

      const insertedId = Number(res[0].insertId);
      createdExams.push({
        id: insertedId,
        classId: cls.id,
        subjectId,
        name: def.name,
        type: def.type,
        dateStr: def.dateStr,
        maxMarks: def.maxMarks,
      });
    }
  }

  console.log(`Created ${createdExams.length} exam definitions across all classes.`);

  // 5. Generate Results for exams whose date is finished (date <= 2026-08-26)
  const pastExams = createdExams.filter((e) => e.dateStr <= TODAY_STR);
  console.log(`Found ${pastExams.length} past exams (<= ${TODAY_STR}) to generate marks for.`);

  // Cohort target averages (75% to 95% distribution)
  const COHORT_BASELINES: Record<string, Record<string, number>> = {
    '10-A': { English: 0.92, Mathematics: 0.95, Science: 0.88, 'Social Studies': 0.85, Hindi: 0.91, Sanskrit: 0.89, 'Computer Science': 0.94 },
    '10-B': { English: 0.77, Mathematics: 0.82, Science: 0.75, 'Social Studies': 0.84, Hindi: 0.78, Sanskrit: 0.81, 'Computer Science': 0.87 },
    '9-A':  { English: 0.84, Mathematics: 0.76, Science: 0.89, 'Social Studies': 0.83, Hindi: 0.88, Sanskrit: 0.75, 'Computer Science': 0.92 },
    '9-B':  { English: 0.89, Mathematics: 0.93, Science: 0.84, 'Social Studies': 0.90, Hindi: 0.86, Sanskrit: 0.95, 'Computer Science': 0.87 },
    '8':    { English: 0.86, Mathematics: 0.78, Science: 0.91, 'Social Studies': 0.76, Hindi: 0.84, Sanskrit: 0.88, 'Computer Science': 0.95 },
    '7':    { English: 0.93, Mathematics: 0.85, Science: 0.79, 'Social Studies': 0.89, Hindi: 0.94, Sanskrit: 0.82, 'Computer Science': 0.86 },
    '6':    { English: 0.88, Mathematics: 0.94, Science: 0.82, 'Social Studies': 0.79, Hindi: 0.87, Sanskrit: 0.80, 'Computer Science': 0.91 },
  };

  const classKeyMap = new Map<number, string>();
  for (const c of classRows) {
    classKeyMap.set(c.id, c.section ? `${c.name}-${c.section}` : c.name);
  }

  const subjectNameMap = new Map<number, string>();
  for (const s of subjectRows) {
    subjectNameMap.set(s.id, s.name);
  }

  const resultsToInsert: Array<{
    studentId: number;
    examId: number;
    subjectId: number;
    marks: string;
    remarks: string;
    recordedDate: any;
  }> = [];

  for (const exam of pastExams) {
    const studentsInClass = studentRows.filter((s) => s.classId === exam.classId);
    const classKey = classKeyMap.get(exam.classId) || '10-A';
    const subjName = subjectNameMap.get(exam.subjectId) || 'English';
    const cohortBase = COHORT_BASELINES[classKey]?.[subjName] ?? 0.85;

    for (const student of studentsInClass) {
      const attRate = attendanceRateMap.get(student.id) ?? 0.85;

      // Base percentage scaled by cohort baseline + student attendance factor
      const seed = student.id * 1000 + exam.id * 31 + 17;
      const noise = (seededRandom(seed) - 0.5) * 0.08; // +/- 4%
      const attDiff = attRate - 0.85;
      let scorePct = cohortBase + (attDiff * 0.40) + noise;

      // Bound score between 30% and 99%
      scorePct = Math.max(0.30, Math.min(0.99, scorePct));

      // Calculate raw marks
      let marksVal = scorePct * exam.maxMarks;
      // Round to 1 decimal / half mark (e.g. 17.5, 18.0)
      marksVal = Math.round(marksVal * 2) / 2;
      if (marksVal > exam.maxMarks) marksVal = exam.maxMarks;

      let remarks = 'Good effort';
      const pct = (marksVal / exam.maxMarks) * 100;
      if (pct >= 90) remarks = 'Outstanding conceptual clarity';
      else if (pct >= 80) remarks = 'Very good understanding of topics';
      else if (pct >= 70) remarks = 'Satisfactory performance';
      else if (pct >= 60) remarks = 'Average, scope for improvement';
      else remarks = 'Needs dedicated revision and practice';

      resultsToInsert.push({
        studentId: student.id,
        examId: exam.id,
        subjectId: exam.subjectId,
        marks: marksVal.toFixed(2),
        remarks,
        recordedDate: new Date(`${exam.dateStr}T00:00:00.000Z`) as any,
      });
    }
  }

  console.log(`Inserting ${resultsToInsert.length} student marks for completed exams...`);
  const CHUNK_SIZE = 500;
  for (let i = 0; i < resultsToInsert.length; i += CHUNK_SIZE) {
    const chunk = resultsToInsert.slice(i, i + CHUNK_SIZE);
    await db.insert(results).values(chunk);
  }

  console.log('✓ Seeding completed successfully!');
  const totalExams = await db.select().from(exams);
  const totalResults = await db.select().from(results);
  console.log(`Final totals in DB: ${totalExams.length} exams, ${totalResults.length} marks entries.`);
}

seedExamsAndResults()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await closeDB();
  });
