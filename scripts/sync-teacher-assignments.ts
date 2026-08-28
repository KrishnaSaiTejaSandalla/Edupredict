import { db, closeDB } from '../lib/db';
import { classSubjects, teacherClassAssignments, teacherSubjectAssignments } from '../lib/schema';

async function sync() {
  console.log('Syncing teacher assignments from classSubjects...');

  const mappings = await db.select().from(classSubjects);
  const sch = await db.select().from(require('../lib/schema').schools);
  const usr = await db.select().from(require('../lib/schema').users);
  const tch = await db.select().from(require('../lib/schema').teachers);
  console.log('Mappings count:', mappings.length);
  console.log('Schools count:', sch.length);
  console.log('Users count:', usr.length);
  console.log('Teachers count:', tch.length);
  
  // Clear old assignments to avoid duplicates
  await db.delete(teacherClassAssignments);
  await db.delete(teacherSubjectAssignments);

  const schoolId = 1; // Default school ID

  const teacherClasses = new Set<string>();
  const classRows: any[] = [];

  const teacherSubjectsSet = new Set<string>();
  const subjectRows: any[] = [];

  for (const m of mappings) {
    if (m.teacherId && m.classId) {
      const tcKey = `${m.teacherId}-${m.classId}`;
      if (!teacherClasses.has(tcKey)) {
        teacherClasses.add(tcKey);
        classRows.push({ teacherId: m.teacherId, classId: m.classId });
      }
    }
    if (m.teacherId && m.subjectId) {
      const tsKey = `${m.teacherId}-${m.subjectId}`;
      if (!teacherSubjectsSet.has(tsKey)) {
        teacherSubjectsSet.add(tsKey);
        subjectRows.push({ teacherId: m.teacherId, subjectId: m.subjectId });
      }
    }
  }

  if (classRows.length > 0) {
    await db.insert(teacherClassAssignments).values(classRows);
    console.log(`✓ Seeded ${classRows.length} teacher class assignments`);
  }

  if (subjectRows.length > 0) {
    await db.insert(teacherSubjectAssignments).values(subjectRows);
    console.log(`✓ Seeded ${subjectRows.length} teacher subject assignments`);
  }

  await closeDB();
  console.log('Sync complete!');
  process.exit(0);
}

sync().catch(e => {
  console.error(e);
  process.exit(1);
});
