import 'dotenv/config';
import { db, closeDB } from '../lib/db';
import {
  attendance,
  attendanceHolidays,
  students,
  users,
  classes,
  classTeacherAssignments,
  teachers,
} from '../lib/schema';
import { and, eq, sql } from 'drizzle-orm';

// Deterministic pseudo-random based on seed so results are reproducible
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

async function markAttendance() {
  console.log('Starting attendance marking process from June 22, 2026 to August 26, 2026...');

  // 1. Add known holidays in the date range if not present
  const holidaysToAdd = [
    { dateStr: '2026-06-27', reason: 'Muharram (Ashura)' },
    { dateStr: '2026-08-15', reason: 'Independence Day' },
  ];

  for (const h of holidaysToAdd) {
    const [exists] = await db
      .select()
      .from(attendanceHolidays)
      .where(sql`DATE(holiday_date) = ${h.dateStr}`)
      .limit(1);

    if (!exists) {
      await db.insert(attendanceHolidays).values({
        schoolId: 1,
        holidayDate: new Date(`${h.dateStr}T00:00:00.000Z`) as any,
        reason: h.reason,
        createdBy: 2,
      });
      console.log(`Added holiday: ${h.dateStr} (${h.reason})`);
    }
  }

  // Fetch all holidays
  const allHolidays = await db.select().from(attendanceHolidays);
  const holidaySet = new Set<string>();
  for (const h of allHolidays) {
    const dStr = new Date(h.holidayDate).toISOString().slice(0, 10);
    holidaySet.add(dStr);
  }
  console.log('Active school holidays in DB:', Array.from(holidaySet));

  // 2. Build list of teaching dates (Mon-Sat, skipping Sundays and Holidays)
  const startDate = new Date('2026-06-22T00:00:00Z');
  const endDate = new Date('2026-08-26T00:00:00Z');

  const schoolDays: string[] = [];
  const curr = new Date(startDate);

  while (curr <= endDate) {
    const dayOfWeek = curr.getUTCDay(); // 0 = Sunday
    const dateStr = curr.toISOString().slice(0, 10);

    if (dayOfWeek !== 0 && !holidaySet.has(dateStr)) {
      schoolDays.push(dateStr);
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  console.log(`Total school working days between June 22 and Aug 26: ${schoolDays.length} days`);

  // 3. Fetch all students
  const studentList = await db
    .select({
      studentId: students.id,
      userId: students.userId,
      name: users.name,
      classId: students.classId,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id));

  console.log(`Fetched ${studentList.length} students across all classes.`);

  // 4. Fetch class teachers for each class to set markedBy
  const classTeachers = await db
    .select({
      classId: classTeacherAssignments.classId,
      teacherUserId: teachers.userId,
    })
    .from(classTeacherAssignments)
    .innerJoin(teachers, eq(classTeacherAssignments.teacherId, teachers.id));

  const classTeacherUserMap = new Map<number, number>();
  for (const ct of classTeachers) {
    classTeacherUserMap.set(ct.classId, ct.teacherUserId);
  }

  // 5. Fetch existing attendance (to never overwrite / duplicate)
  const existingAtt = await db
    .select({
      studentId: attendance.studentId,
      attendanceDate: attendance.attendanceDate,
    })
    .from(attendance);

  const existingSet = new Set<string>();
  for (const ea of existingAtt) {
    const dStr = new Date(ea.attendanceDate).toISOString().slice(0, 10);
    existingSet.add(`${ea.studentId}_${dStr}`);
  }
  console.log(`Existing attendance entries: ${existingSet.size} (will be preserved).`);

  // 6. Assign attendance tiers to students
  // - Good (92-98% present)
  // - Balanced (83-90% present)
  // - Moderate (72-80% present)
  // - Poor (50-65% present)
  const rowsToInsert: Array<{
    studentId: number;
    classId: number;
    subjectId: number | null;
    attendanceDate: any;
    status: string;
    remarks: string | null;
    markedBy: number;
    topicTaught: string;
  }> = [];

  let goodCount = 0;
  let balancedCount = 0;
  let moderateCount = 0;
  let poorCount = 0;

  for (let i = 0; i < studentList.length; i++) {
    const student = studentList[i];
    const markerUserId = classTeacherUserMap.get(student.classId) || 2;

    // Distribute tiers deterministically by student index
    // e.g. ~40% Good, ~35% Balanced, ~18% Moderate, ~7% Poor
    const mod = i % 14;
    let targetPresentRate: number;

    if (student.name.toLowerCase().includes('krishna')) {
      targetPresentRate = 0.96; // Good for primary demo user
      goodCount++;
    } else if (mod === 0) {
      targetPresentRate = 0.58; // Poor (~7%)
      poorCount++;
    } else if (mod === 1 || mod === 2) {
      targetPresentRate = 0.76; // Moderate (~14%)
      moderateCount++;
    } else if (mod >= 3 && mod <= 7) {
      targetPresentRate = 0.86; // Balanced (~36%)
      balancedCount++;
    } else {
      targetPresentRate = 0.94; // Good (~43%)
      goodCount++;
    }

    // Iterate through all school days
    for (let dIdx = 0; dIdx < schoolDays.length; dIdx++) {
      const dateStr = schoolDays[dIdx];
      const key = `${student.studentId}_${dateStr}`;

      if (existingSet.has(key)) {
        // Skip existing attendance to avoid altering existing data
        continue;
      }

      // Generate status based on deterministic seed
      const randVal = seededRandom(student.studentId * 1000 + dIdx * 7 + 42);

      let status = 'present';
      let remarks: string | null = null;

      if (randVal > targetPresentRate) {
        // Decide between absent, leave, late
        const subRand = seededRandom(student.studentId * 500 + dIdx * 13 + 9);
        if (subRand < 0.55) {
          status = 'absent';
          remarks = 'Unexcused Absence';
        } else if (subRand < 0.85) {
          status = 'leave';
          remarks = 'Parent Applied Medical/Casual Leave';
        } else {
          status = 'late';
          remarks = 'Late Arrival (Morning Assembly)';
        }
      }

      rowsToInsert.push({
        studentId: student.studentId,
        classId: student.classId,
        subjectId: null,
        attendanceDate: new Date(`${dateStr}T00:00:00.000Z`) as any,
        status,
        remarks: status === 'present' ? null : remarks,
        markedBy: markerUserId,
        topicTaught: 'General Class Attendance',
      });
    }
  }

  console.log(`\nAttendance Tier Breakdown across ${studentList.length} students:`);
  console.log(`- Good Attendance (>92%): ${goodCount} students`);
  console.log(`- Balanced Attendance (83-90%): ${balancedCount} students`);
  console.log(`- Moderate Attendance (72-80%): ${moderateCount} students`);
  console.log(`- Poor Attendance (50-65%): ${poorCount} students`);
  console.log(`\nTotal new attendance records to insert: ${rowsToInsert.length}`);

  // 7. Batch insert in chunks of 500
  const CHUNK_SIZE = 500;
  for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
    const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
    await db.insert(attendance).values(chunk);
    if ((i / CHUNK_SIZE) % 5 === 0 || i + CHUNK_SIZE >= rowsToInsert.length) {
      console.log(`Inserted ${Math.min(i + CHUNK_SIZE, rowsToInsert.length)} / ${rowsToInsert.length}...`);
    }
  }

  const finalTotal = await db.select().from(attendance);
  console.log(`\n✓ Attendance marking complete! Total attendance records in DB: ${finalTotal.length}`);
}

markAttendance()
  .catch((e) => {
    console.error('Attendance marking failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await closeDB();
  });
