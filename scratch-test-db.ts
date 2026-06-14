import { db, closeDB } from '@/lib/db';
import { buses, timetables, classes, subjects, teachers } from '@/lib/schema';

async function test() {
  try {
    // 1. Fetch some valid ids for class, subject, teacher
    console.log('Fetching class, subject, teacher...');
    const classRow = await db.select().from(classes).limit(1);
    const subjectRow = await db.select().from(subjects).limit(1);
    const teacherRow = await db.select().from(teachers).limit(1);

    console.log('Class found:', classRow[0]);
    console.log('Subject found:', subjectRow[0]);
    console.log('Teacher found:', teacherRow[0]);

    if (!classRow[0] || !subjectRow[0] || !teacherRow[0]) {
      console.log('Missing seeded class, subject, or teacher. Cannot test timetable insert.');
    } else {
      console.log('Attempting to insert a timetable entry...');
      try {
        const result = await db.insert(timetables).values({
          schoolId: 1,
          classId: classRow[0].id,
          subjectId: subjectRow[0].id,
          teacherId: teacherRow[0].id,
          dayOfWeek: 'Monday',
          startTime: '09:00:00',
          endTime: '09:45:00',
          roomNumber: '101Test',
        });
        console.log('Timetable insert success! Result:', result);
      } catch (e: any) {
        console.error('Timetable insert failed:');
        console.error('Code:', e.code);
        console.error('Message:', e.message);
        console.error(e);
      }
    }

    console.log('Attempting to insert a bus entry...');
    try {
      const result = await db.insert(buses).values({
        schoolId: 1,
        registrationNumber: 'TEST-BUS-999',
        routeName: 'Test Route',
        driverName: 'Test Driver',
        driverPhone: '1234567890',
        capacity: 40,
        isActive: true,
      });
      console.log('Bus insert success! Result:', result);
    } catch (e: any) {
      console.error('Bus insert failed:');
      console.error('Code:', e.code);
      console.error('Message:', e.message);
      console.error(e);
    }

  } catch (err) {
    console.error('Setup failed:', err);
  } finally {
    await closeDB();
  }
}

test();
