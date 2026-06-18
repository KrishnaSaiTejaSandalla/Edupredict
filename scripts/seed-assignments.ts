import 'dotenv/config';
import { db, closeDB } from '../lib/db';
import { timetables, teacherSubjectAssignments, teacherClassAssignments } from '../lib/schema';
import { and, eq } from 'drizzle-orm';

async function main() {
  console.log('Seeding teacher assignments based on existing timetables...');
  try {
    const list = await db.select().from(timetables);
    console.log(`Found ${list.length} timetable entries.`);

    let subjectCount = 0;
    let classCount = 0;

    for (const entry of list) {
      const { teacherId, subjectId, classId } = entry;

      // 1. Seed Subject Assignment
      const [existingSub] = await db
        .select()
        .from(teacherSubjectAssignments)
        .where(
          and(
            eq(teacherSubjectAssignments.teacherId, teacherId),
            eq(teacherSubjectAssignments.subjectId, subjectId)
          )
        )
        .limit(1);

      if (!existingSub) {
        await db.insert(teacherSubjectAssignments).values({
          teacherId,
          subjectId,
        });
        subjectCount++;
        console.log(`Assigned subject ${subjectId} to teacher ${teacherId}`);
      }

      // 2. Seed Class Assignment
      const [existingClass] = await db
        .select()
        .from(teacherClassAssignments)
        .where(
          and(
            eq(teacherClassAssignments.teacherId, teacherId),
            eq(teacherClassAssignments.classId, classId)
          )
        )
        .limit(1);

      if (!existingClass) {
        await db.insert(teacherClassAssignments).values({
          teacherId,
          classId,
        });
        classCount++;
        console.log(`Assigned class ${classId} to teacher ${teacherId}`);
      }
    }

    console.log(`Seeded ${subjectCount} subject assignments and ${classCount} class assignments.`);
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await closeDB();
  }
  process.exit(0);
}

main();
