/**
 * Script to add teacher, student, and parent data from Excel files
 * WITHOUT altering existing data. Skips any record whose email / employee ID
 * already exists in the database.
 *
 * Excel files:
 *  - public/Mock-Data/teacher_data.xlsx        (Sheet: Teachers)
 *  - public/Mock-Data/student_parent_data.xlsx (Sheet: Students & Parents)
 *
 * Default password for all new accounts: Password@123
 */

import 'dotenv/config';
import { db, closeDB } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import {
  users,
  schools,
  teachers,
  students,
  parents,
  studentParents,
} from '@/lib/schema';
import * as XLSX from 'xlsx';
import path from 'path';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDate(raw: string): Date {
  // Handles "DD-MM-YYYY"
  const parts = raw.split('-');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return new Date(raw);
}

/** Map Excel class label → DB class id */
const CLASS_MAP: Record<string, number> = {
  '6': 9,
  '7': 8,
  '8': 7,
  '9-A': 5,
  '9-B': 6,
  '10-A': 1,
  '10-B': 2,
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n📥 Starting Excel data import (additive only)...\n');

  // Fetch school
  const schoolResult = await db.select().from(schools).limit(1);
  if (!schoolResult.length) throw new Error('No school found in DB');
  const schoolId = schoolResult[0].id;
  console.log(`✓ Using school: "${schoolResult[0].name}" (id=${schoolId})`);

  // Default password for all new accounts
  const defaultPassword = await bcrypt.hash('Password@123', 10);

  // ─── 1. Teachers ──────────────────────────────────────────────────────────

  console.log('\n👩‍🏫 Processing teachers...');

  const teacherWb = XLSX.readFile(
    path.join(process.cwd(), 'public/Mock-Data/teacher_data.xlsx')
  );
  const teacherWs = teacherWb.Sheets['Teachers'];
  const teacherRows = XLSX.utils.sheet_to_json<{
    'Full Name': string;
    Email: string;
    'Phone Number': string;
    'Employee ID': string;
    Qualification: string;
    Department: string;
    'Experience (Years)': number;
    'Join Date': string;
  }>(teacherWs);

  let teachersAdded = 0;
  let teachersSkipped = 0;

  for (const row of teacherRows) {
    // Skip if email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, row['Email']))
      .limit(1);

    if (existingUser.length > 0) {
      console.log(`  ⏭  Skipping (email exists): ${row['Email']}`);
      teachersSkipped++;
      continue;
    }

    // Skip if employee ID already taken
    const existingTeacher = await db
      .select()
      .from(teachers)
      .where(eq(teachers.employeeId, row['Employee ID']))
      .limit(1);

    if (existingTeacher.length > 0) {
      console.log(`  ⏭  Skipping (empId exists): ${row['Employee ID']}`);
      teachersSkipped++;
      continue;
    }

    // Insert user
    await db.insert(users).values({
      email: row['Email'],
      name: row['Full Name'],
      password: defaultPassword,
      role: 'teacher',
      schoolId,
    });

    const newUser = await db
      .select()
      .from(users)
      .where(eq(users.email, row['Email']))
      .limit(1);

    // Insert teacher profile
    await db.insert(teachers).values({
      userId: newUser[0].id,
      schoolId,
      employeeId: row['Employee ID'],
      phoneNumber: row['Phone Number'],
      qualification: row['Qualification'],
      experience: row['Experience (Years)'],
      joinDate: parseDate(row['Join Date']),
      department: row['Department'],
    });

    console.log(`  ✓  Added teacher: ${row['Full Name']} (${row['Employee ID']})`);
    teachersAdded++;
  }

  console.log(`\n  Teachers added: ${teachersAdded}, skipped: ${teachersSkipped}`);

  // ─── 2. Students & Parents ────────────────────────────────────────────────

  console.log('\n🎓 Processing students & parents...');

  const studentWb = XLSX.readFile(
    path.join(process.cwd(), 'public/Mock-Data/student_parent_data.xlsx')
  );
  const studentWs = studentWb.Sheets['Students & Parents'];
  const studentRows = XLSX.utils.sheet_to_json<{
    'Full Name': string;
    Email: string;
    'Roll Number': string;
    'Class ID': string;
    Gender: string;
    'Date of Birth': string;
    'Parent Name': string;
    'Parent Phone': string;
    'Parent Email': string;
    'Parent Address': string;
  }>(studentWs);

  let studentsAdded = 0;
  let studentsSkipped = 0;
  let parentsAdded = 0;
  let parentsSkipped = 0;

  for (const row of studentRows) {
    const classLabel = String(row['Class ID']).trim();
    const classId = CLASS_MAP[classLabel];

    if (!classId) {
      console.log(
        `  ⚠  Unknown class label "${classLabel}" for ${row['Full Name']} — skipping`
      );
      studentsSkipped++;
      continue;
    }

    // ── Student ──────────────────────────────────────────────────────────────

    const existingStudentUser = await db
      .select()
      .from(users)
      .where(eq(users.email, row['Email']))
      .limit(1);

    let studentId: number | null = null;

    if (existingStudentUser.length > 0) {
      // Grab existing student record to still attempt parent link
      const existingStudent = await db
        .select()
        .from(students)
        .where(eq(students.userId, existingStudentUser[0].id))
        .limit(1);
      if (existingStudent.length > 0) studentId = existingStudent[0].id;
      console.log(`  ⏭  Skipping student (email exists): ${row['Email']}`);
      studentsSkipped++;
    } else {
      // Insert student user
      await db.insert(users).values({
        email: row['Email'],
        name: row['Full Name'],
        password: defaultPassword,
        role: 'student',
        schoolId,
      });

      const newStudentUser = await db
        .select()
        .from(users)
        .where(eq(users.email, row['Email']))
        .limit(1);

      const rollNumber = String(row['Roll Number']).trim().padStart(2, '0');

      await db.insert(students).values({
        userId: newStudentUser[0].id,
        schoolId,
        classId,
        rollNumber,
        dateOfBirth: parseDate(row['Date of Birth']),
        gender: row['Gender'].toLowerCase(),
        admissionDate: new Date('2024-06-01'),
        address: row['Parent Address'],
      });

      const newStudent = await db
        .select()
        .from(students)
        .where(eq(students.userId, newStudentUser[0].id))
        .limit(1);

      studentId = newStudent[0].id;
      console.log(
        `  ✓  Added student: ${row['Full Name']} (Roll: ${rollNumber}, Class: ${classLabel})`
      );
      studentsAdded++;
    }

    // ── Parent ───────────────────────────────────────────────────────────────

    if (!studentId) continue;

    const existingParentUser = await db
      .select()
      .from(users)
      .where(eq(users.email, row['Parent Email']))
      .limit(1);

    let parentId: number | null = null;

    if (existingParentUser.length > 0) {
      const existingParent = await db
        .select()
        .from(parents)
        .where(eq(parents.userId, existingParentUser[0].id))
        .limit(1);
      if (existingParent.length > 0) parentId = existingParent[0].id;
      console.log(`  ⏭  Skipping parent (email exists): ${row['Parent Email']}`);
      parentsSkipped++;
    } else {
      await db.insert(users).values({
        email: row['Parent Email'],
        name: row['Parent Name'],
        password: defaultPassword,
        role: 'parent',
        schoolId,
      });

      const newParentUser = await db
        .select()
        .from(users)
        .where(eq(users.email, row['Parent Email']))
        .limit(1);

      await db.insert(parents).values({
        userId: newParentUser[0].id,
        phoneNumber: row['Parent Phone'],
        parentEmail: row['Parent Email'],
        address: row['Parent Address'],
      });

      const newParent = await db
        .select()
        .from(parents)
        .where(eq(parents.userId, newParentUser[0].id))
        .limit(1);

      parentId = newParent[0].id;
      console.log(`  ✓  Added parent: ${row['Parent Name']} (${row['Parent Email']})`);
      parentsAdded++;
    }

    // ── Student-Parent link ───────────────────────────────────────────────────

    if (studentId && parentId) {
      const existingLink = await db
        .select()
        .from(studentParents)
        .where(
          sql`${studentParents.studentId} = ${studentId} AND ${studentParents.parentId} = ${parentId}`
        )
        .limit(1);

      if (existingLink.length === 0) {
        await db.insert(studentParents).values({
          studentId,
          parentId,
          relation: 'Parent',
        });
      }
    }
  }

  console.log(`\n  Students added: ${studentsAdded}, skipped: ${studentsSkipped}`);
  console.log(`  Parents added:  ${parentsAdded}, skipped: ${parentsSkipped}`);

  // ─── Summary ──────────────────────────────────────────────────────────────

  const [totalTeachers] = await db
    .select({ count: sql<number>`count(*)` })
    .from(teachers);
  const [totalStudents] = await db
    .select({ count: sql<number>`count(*)` })
    .from(students);
  const [totalParents] = await db
    .select({ count: sql<number>`count(*)` })
    .from(parents);

  console.log('\n✅ Import complete!');
  console.log(`   Total teachers in DB: ${totalTeachers.count}`);
  console.log(`   Total students in DB: ${totalStudents.count}`);
  console.log(`   Total parents in DB:  ${totalParents.count}`);
  console.log('\n   Default password for all new accounts: Password@123\n');

  await closeDB();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌ Import failed:', err);
  await closeDB();
  process.exit(1);
});
