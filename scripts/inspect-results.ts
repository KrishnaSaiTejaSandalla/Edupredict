import 'dotenv/config';
import { db } from '../lib/db';
import { exams, results, classes, subjects, classSubjects, students, users } from '../lib/schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('--- Inspecting DB ---');
  
  const allExams = await db.select().from(exams).limit(10);
  console.log('Exams found (up to 10):', allExams.map(e => ({
    id: e.id,
    name: e.name,
    classId: e.classId,
    subjectId: e.subjectId,
    type: e.type,
    examDate: e.examDate,
    maxMarks: e.maxMarks
  })));

  const totalResults = await db.select({ count: sql<number>`count(*)` }).from(results);
  console.log('Total Results:', totalResults[0].count);

  const sampleResults = await db.select().from(results).limit(5);
  console.log('Sample Results:', sampleResults);

  const distinctMonths = await db
    .selectDistinct({ month: sql<string>`DATE_FORMAT(${exams.examDate}, '%Y-%m')` })
    .from(exams);
  console.log('Distinct Months:', distinctMonths);

  const distinctMonthsRaw = await db
    .selectDistinct({ date: exams.examDate })
    .from(exams);
  console.log('Distinct Dates:', distinctMonthsRaw);

  const allClassSubjects = await db.select().from(classSubjects).limit(10);
  console.log('classSubjects mappings:', allClassSubjects);

  const allSubjects = await db.select().from(subjects);
  console.log('Subjects:', allSubjects.map(s => ({ id: s.id, name: s.name })));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
