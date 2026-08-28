import 'dotenv/config';
import { db, closeDB } from '../lib/db';
import {
  timetables,
  teacherSubjectAssignments,
  teacherClassAssignments,
  classSubjects,
  classes,
  subjects,
  teachers,
  users,
} from '../lib/schema';
import { and, eq, sql } from 'drizzle-orm';

interface ScheduleEntry {
  className: string; // '6', '7', '8', '9-A', '9-B', '10-A', '10-B'
  day: string; // 'Monday', 'Tuesday', ...
  period: string; // 'P1', 'P2', 'P3', 'P4', 'P5'
  subject: string;
  teacher: string;
}

const rawSchedule: Record<string, Record<string, string[]>> = {
  '6': {
    Monday: ['Science — Aditi Rao', 'Social Studies — Harsh Desai', 'English — Tanvi Nair', 'Mathematics — Pranav Joshi', 'Hindi — Ishita Reddy'],
    Tuesday: ['Computer Science — Rudra Patel', 'English — Tanvi Nair', 'Sanskrit — Shaurya Yadav', 'Music — Devansh Reddy', 'Science — Sara Kumar'],
    Wednesday: ['PE — Swati Bhatt', 'English — Tanvi Nair', 'Mathematics — Pranav Joshi', 'Hindi — Ishita Reddy', 'Sanskrit — Shaurya Yadav'],
    Thursday: ['Music — Devansh Reddy', 'Mathematics — Aishwarya', 'Science — Anika Trivedi', 'Computer Science — Rudra Patel', 'English — Tanvi Nair'],
    Friday: ['Sanskrit — Arjun Bhatt', 'English — Tanvi Nair', 'Science — Aditi Rao', 'Social Studies — Harsh Desai', 'PE — Devansh Menon'],
    Saturday: ['Hindi — Ishita Reddy', 'Mathematics — Pranav Joshi', 'English — Tanvi Nair', 'Social Studies — Harsh Desai', 'Science — Sara Kumar'],
  },
  '7': {
    Monday: ['Hindi — Ishita Reddy', 'Mathematics — Yamini Mehta', 'Science — Aditi Rao', 'English — Shaurya Chatterjee', 'Sanskrit — Arjun Bhatt'],
    Tuesday: ['Social Studies — Harsh Desai', 'Mathematics — Yamini Mehta', 'Computer Science — Rudra Patel', 'Science — Aditi Rao', 'PE — Swati Bhatt'],
    Wednesday: ['PE — Devansh Menon', 'Science — Anika Trivedi', 'Mathematics — Yamini Mehta', 'English — Aarav Menon', 'Sanskrit — Arjun Bhatt'],
    Thursday: ['Hindi — Ishita Reddy', 'Social Studies — Harsh Desai', 'Mathematics — Yamini Mehta', 'Music — Devansh Reddy', 'Science — Aditi Rao'],
    Friday: ['English — Pooja Chatterjee', 'Science — Anika Trivedi', 'Mathematics — Yamini Mehta', 'Computer Science — Rudra Patel', 'Social Studies — Harsh Desai'],
    Saturday: ['Music — Devansh Reddy', 'English — Shaurya Chatterjee', 'Sanskrit — Arjun Bhatt', 'Hindi — Ishita Reddy', 'Mathematics — Yamini Mehta'],
  },
  '8': {
    Monday: ['Science — Sara Kumar', 'Mathematics — Simran Kapoor', 'English — Pooja Chatterjee', 'Computer Science — Rudra Patel', 'Social Studies — Harsh Desai'],
    Tuesday: ['PE — Devansh Menon', 'Mathematics — Simran Kapoor', 'Science — Sara Kumar', 'Sanskrit — Arjun Bhatt', 'Social Studies — Harsh Desai'],
    Wednesday: ['English — Pooja Chatterjee', 'Hindi — Ishita Reddy', 'Mathematics — Simran Kapoor', 'Music — Devansh Reddy', 'Science — Sara Kumar'],
    Thursday: ['Social Studies — Harsh Desai', 'Science — Sara Kumar', 'Sanskrit — Siddharth Shah', 'English — Aarav Menon', 'Mathematics — Pranav Joshi'],
    Friday: ['PE — Devansh Menon', 'Music — Devansh Reddy', 'Science — Sara Kumar', 'Sanskrit — Arjun Bhatt', 'Hindi — Ishita Reddy'],
    Saturday: ['Science — Sara Kumar', 'Computer Science — Rudra Patel', 'Hindi — Ishita Reddy', 'Mathematics — Simran Kapoor', 'English — Aarav Menon'],
  },
  '9-A': {
    Monday: ['Music — Devansh Reddy', 'Sanskrit — Shaurya Yadav', 'Hindi — Dhruv Nair', 'Social Studies — Harsh Desai', 'Science — Anika Trivedi'],
    Tuesday: ['PE — Swati Bhatt', 'Science — Aditi Rao', 'Hindi — Dhruv Nair', 'Social Studies — Harsh Desai', 'Mathematics — Simran Kapoor'],
    Wednesday: ['Science — Anika Trivedi', 'Music — Devansh Reddy', 'Mathematics — Aishwarya', 'English — Shaurya Chatterjee', 'Hindi — Dhruv Nair'],
    Thursday: ['Sanskrit — Shaurya Yadav', 'English — Shaurya Chatterjee', 'Computer Science — Rudra Patel', 'Hindi — Dhruv Nair', 'Mathematics — Aishwarya'],
    Friday: ['Science — Aditi Rao', 'Social Studies — Harsh Desai', 'Hindi — Dhruv Nair', 'Sanskrit — Siddharth Shah', 'Mathematics — Aishwarya'],
    Saturday: ['Hindi — Dhruv Nair', 'Science — Anika Trivedi', 'Mathematics — Yamini Mehta', 'Computer Science — Rudra Patel', 'PE — Devansh Menon'],
  },
  '9-B': {
    Monday: ['Mathematics — Aishwarya', 'Science — Anika Trivedi', 'Social Studies — Harsh Desai', 'Music — Devansh Reddy', 'Sanskrit — Siddharth Shah'],
    Tuesday: ['Science — Sara Kumar', 'Mathematics — Pranav Joshi', 'Sanskrit — Siddharth Shah', 'Hindi — Ishita Reddy', 'PE — Devansh Menon'],
    Wednesday: ['Computer Science — Rudra Patel', 'Hindi — Dhruv Nair', 'Music — Devansh Reddy', 'Science — Sara Kumar', 'Sanskrit — Siddharth Shah'],
    Thursday: ['Sanskrit — Siddharth Shah', 'English — Pooja Chatterjee', 'Hindi — Ishita Reddy', 'Mathematics — Pranav Joshi', 'Social Studies — Harsh Desai'],
    Friday: ['Sanskrit — Siddharth Shah', 'Mathematics — Yamini Mehta', 'PE — Swati Bhatt', 'Science — Aditi Rao', 'Computer Science — Rudra Patel'],
    Saturday: ['Sanskrit — Siddharth Shah', 'Science — Aditi Rao', 'Mathematics — Pranav Joshi', 'English — Pooja Chatterjee', 'Social Studies — Harsh Desai'],
  },
  '10-A': {
    Monday: ['English — Rohit', 'Mathematics — Aishwarya', 'English — Rohit', 'Hindi — Dhruv Nair', 'Science — Sara Kumar'],
    Tuesday: ['English — Rohit', 'Science — Anika Trivedi', 'Music — Devansh Reddy', 'PE — Devansh Menon', 'Sanskrit — Shaurya Yadav'],
    Wednesday: ['Hindi — Ishita Reddy', 'PE — Swati Bhatt', 'Science — Sara Kumar', 'Computer Science — Rudra Patel', 'English — Rohit'],
    Thursday: ['Hindi — Dhruv Nair', 'English — Rohit', 'Social Studies — Harsh Desai', 'Mathematics — Simran Kapoor', 'Science — Anika Trivedi'],
    Friday: ['Social Studies — Harsh Desai', 'Computer Science — Rudra Patel', 'Science — Anika Trivedi', 'Sanskrit — Shaurya Yadav', 'English — Rohit'],
    Saturday: ['Social Studies — Harsh Desai', 'Mathematics — Simran Kapoor', 'English — Rohit', 'Music — Devansh Reddy', 'Sanskrit — Shaurya Yadav'],
  },
  '10-B': {
    Monday: ['Social Studies — Harsh Desai', 'Music — Devansh Reddy', 'Mathematics — Aishwarya', 'English — Rohit', 'Science — Aditi Rao'],
    Tuesday: ['Science — Anika Trivedi', 'Mathematics — Aishwarya', 'Social Studies — Harsh Desai', 'Hindi — Dhruv Nair', 'Music — Devansh Reddy'],
    Wednesday: ['Hindi — Dhruv Nair', 'Sanskrit — Arjun Bhatt', 'Science — Aditi Rao', 'Mathematics — Yamini Mehta', 'Social Studies — Harsh Desai'],
    Thursday: ['Sanskrit — Arjun Bhatt', 'English — Aarav Menon', 'Mathematics — Simran Kapoor', 'Social Studies — Harsh Desai', 'PE — Swati Bhatt'],
    Friday: ['Computer Science — Rudra Patel', 'Sanskrit — Shaurya Yadav', 'Social Studies — Harsh Desai', 'English — Shaurya Chatterjee', 'Hindi — Dhruv Nair'],
    Saturday: ['Computer Science — Rudra Patel', 'Social Studies — Harsh Desai', 'Mathematics — Aishwarya', 'Science — Anika Trivedi', 'PE — Swati Bhatt'],
  },
};

const PERIOD_TIMES = [
  { period: 'P1', start: '09:30:00', end: '10:30:00' },
  { period: 'P2', start: '10:30:00', end: '11:30:00' },
  { period: 'P3', start: '11:30:00', end: '12:30:00' },
  { period: 'P4', start: '13:30:00', end: '14:30:00' },
  { period: 'P5', start: '14:30:00', end: '15:30:00' },
];

const ROOM_MAP: Record<string, string> = {
  '6': 'A101',
  '7': 'A102',
  '8': 'A201',
  '9-A': 'A202',
  '9-B': 'B201',
  '10-A': 'A301',
  '10-B': 'A304',
};

async function main() {
  console.log('Starting timetable and teacher assignment synchronization...');

  // 1. Fetch classes, subjects, teachers
  const classRows = await db.select().from(classes);
  const subjectRows = await db.select().from(subjects);
  const teacherRows = await db
    .select({
      id: teachers.id,
      userId: teachers.userId,
      name: users.name,
    })
    .from(teachers)
    .innerJoin(users, eq(users.id, teachers.userId));

  const classMap = new Map<string, number>();
  for (const c of classRows) {
    if (c.section) {
      classMap.set(`${c.name}-${c.section}`, c.id);
      classMap.set(`${c.name}${c.section}`, c.id);
    } else {
      classMap.set(c.name, c.id);
    }
  }

  const subjectMap = new Map<string, number>();
  for (const s of subjectRows) {
    subjectMap.set(s.name.trim().toLowerCase(), s.id);
    if (s.name.trim().toLowerCase() === 'physical education') {
      subjectMap.set('pe', s.id);
    }
  }

  const teacherMap = new Map<string, number>();
  for (const t of teacherRows) {
    teacherMap.set(t.name.trim().toLowerCase(), t.id);
  }

  console.log('Mapped classes:', Object.fromEntries(classMap));
  console.log('Mapped subjects:', Object.fromEntries(subjectMap));
  console.log('Mapped teachers count:', teacherMap.size);

  // 2. Parse all entries and check conflict
  const teacherSubjectPairs = new Set<string>(); // "teacherId:subjectId"
  const teacherClassPairs = new Set<string>(); // "teacherId:classId"
  const entriesToInsert: Array<{
    schoolId: number;
    classId: number;
    subjectId: number;
    teacherId: number;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    roomNumber: string;
  }> = [];

  // Conflict tracker: key = `${day}_${periodIndex}_${teacherId}` -> className
  const teacherScheduleMap = new Map<string, string>();

  for (const [classKey, daysObj] of Object.entries(rawSchedule)) {
    const classId = classMap.get(classKey);
    if (!classId) {
      throw new Error(`Class key "${classKey}" not found in DB!`);
    }
    const roomNumber = ROOM_MAP[classKey] || 'A101';

    for (const [day, periods] of Object.entries(daysObj)) {
      if (periods.length !== 5) {
        throw new Error(`Class ${classKey} on ${day} has ${periods.length} periods, expected 5`);
      }

      for (let pIdx = 0; pIdx < 5; pIdx++) {
        const item = periods[pIdx];
        const [subNameRaw, teacherNameRaw] = item.split('—').map((s) => s.trim());
        const subjectId = subjectMap.get(subNameRaw.toLowerCase());
        const teacherId = teacherMap.get(teacherNameRaw.toLowerCase());

        if (!subjectId) {
          throw new Error(`Subject "${subNameRaw}" for item "${item}" not found in DB!`);
        }
        if (!teacherId) {
          throw new Error(`Teacher "${teacherNameRaw}" for item "${item}" not found in DB!`);
        }

        // Check teacher clash
        const clashKey = `${day}_${pIdx}_${teacherId}`;
        if (teacherScheduleMap.has(clashKey)) {
          const conflictingClass = teacherScheduleMap.get(clashKey);
          throw new Error(
            `Teacher CLASH detected! ${teacherNameRaw} is scheduled for both Class ${conflictingClass} and Class ${classKey} on ${day} Period ${pIdx + 1} (${PERIOD_TIMES[pIdx].start})`
          );
        }
        teacherScheduleMap.set(clashKey, classKey);

        teacherSubjectPairs.add(`${teacherId}:${subjectId}`);
        teacherClassPairs.add(`${teacherId}:${classId}`);

        entriesToInsert.push({
          schoolId: 1,
          classId,
          subjectId,
          teacherId,
          dayOfWeek: day,
          startTime: PERIOD_TIMES[pIdx].start,
          endTime: PERIOD_TIMES[pIdx].end,
          roomNumber,
        });
      }
    }
  }

  console.log(`Validated schedule: ${entriesToInsert.length} periods with ZERO teacher clashes!`);

  // 3. Insert / update teacherSubjectAssignments
  console.log('Syncing teacherSubjectAssignments...');
  let newSubjectsAdded = 0;
  for (const pair of teacherSubjectPairs) {
    const [tIdStr, sIdStr] = pair.split(':');
    const teacherId = Number(tIdStr);
    const subjectId = Number(sIdStr);

    const [existing] = await db
      .select()
      .from(teacherSubjectAssignments)
      .where(
        and(
          eq(teacherSubjectAssignments.teacherId, teacherId),
          eq(teacherSubjectAssignments.subjectId, subjectId)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(teacherSubjectAssignments).values({
        teacherId,
        subjectId,
      });
      newSubjectsAdded++;
    }
  }
  console.log(`Added ${newSubjectsAdded} new teacherSubjectAssignments.`);

  // 4. Insert / update teacherClassAssignments
  console.log('Syncing teacherClassAssignments...');
  let newClassesAdded = 0;
  for (const pair of teacherClassPairs) {
    const [tIdStr, cIdStr] = pair.split(':');
    const teacherId = Number(tIdStr);
    const classId = Number(cIdStr);

    const [existing] = await db
      .select()
      .from(teacherClassAssignments)
      .where(
        and(
          eq(teacherClassAssignments.teacherId, teacherId),
          eq(teacherClassAssignments.classId, classId)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(teacherClassAssignments).values({
        teacherId,
        classId,
      });
      newClassesAdded++;
    }
  }
  console.log(`Added ${newClassesAdded} new teacherClassAssignments.`);

  // 4b. Sync classSubjects mapping (classId, subjectId, teacherId)
  console.log('Syncing classSubjects...');
  const classSubjectTeacherTriples = new Set<string>();
  for (const entry of entriesToInsert) {
    classSubjectTeacherTriples.add(`${entry.classId}:${entry.subjectId}:${entry.teacherId}`);
  }

  let newClassSubjectsAdded = 0;
  for (const triple of classSubjectTeacherTriples) {
    const [cIdStr, sIdStr, tIdStr] = triple.split(':');
    const classId = Number(cIdStr);
    const subjectId = Number(sIdStr);
    const teacherId = Number(tIdStr);

    const [existing] = await db
      .select()
      .from(classSubjects)
      .where(
        and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.subjectId, subjectId),
          eq(classSubjects.teacherId, teacherId)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(classSubjects).values({
        classId,
        subjectId,
        teacherId,
      });
      newClassSubjectsAdded++;
    }
  }
  console.log(`Added ${newClassSubjectsAdded} new classSubjects mappings.`);

  // 5. Replace timetable entries
  console.log('Clearing old timetables table...');
  await db.execute(sql`DELETE FROM timetables`);

  console.log(`Inserting ${entriesToInsert.length} timetable entries...`);
  // Insert in batches of 50
  for (let i = 0; i < entriesToInsert.length; i += 50) {
    const chunk = entriesToInsert.slice(i, i + 50);
    await db.insert(timetables).values(chunk);
  }
  console.log('All timetable entries inserted successfully!');

  // Verify counts
  const finalTimetableCount = await db.select().from(timetables);
  console.log(`Final timetable count in DB: ${finalTimetableCount.length}`);

  const finalTsaCount = await db.select().from(teacherSubjectAssignments);
  console.log(`Final teacher-subject assignments count in DB: ${finalTsaCount.length}`);

  const finalTcaCount = await db.select().from(teacherClassAssignments);
  console.log(`Final teacher-class assignments count in DB: ${finalTcaCount.length}`);

  const finalCsCount = await db.select().from(classSubjects);
  console.log(`Final classSubjects count in DB: ${finalCsCount.length}`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await closeDB();
  });
