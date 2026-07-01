import 'dotenv/config';
import { db } from '../lib/db';
import { attendance, students, users } from '../lib/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('--- Inspecting Attendance ---');
  const allAtt = await db
    .select({
      id: attendance.id,
      studentId: attendance.studentId,
      classId: attendance.classId,
      attendanceDate: attendance.attendanceDate,
      status: attendance.status,
      name: users.name
    })
    .from(attendance)
    .leftJoin(students, eq(students.id, attendance.studentId))
    .leftJoin(users, eq(users.id, students.userId));

  console.log('All Attendance Records:', allAtt);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
