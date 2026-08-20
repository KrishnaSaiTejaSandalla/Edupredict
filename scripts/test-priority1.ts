import 'dotenv/config';
import { db, closeDB } from '../lib/db';
import { users, students, classes, buses, studentTransportAssignments } from '../lib/schema';
import {
  getClassesForAdmitCards,
  getStudentsForAdmitCards,
  getStudentAdmitCard,
  verifyStudentQr,
} from '../lib/admit-card-actions';
import {
  validateMessagePermission,
  getChatRecipients,
} from '../lib/message-actions';
import { eq } from 'drizzle-orm';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PRIORITY 1 COMPREHENSIVE VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------
    // PART 1: ADMIT CARDS VERIFICATION
    // ---------------------------------------------------------
    console.log('--- PART 1: ADMIT CARDS ---');

    // 1. Fetch real classes
    const classesList = await getClassesForAdmitCards();
    assert(classesList.length > 0, `Classes loaded from DB (Found: ${classesList.length} classes)`);

    // 2. Fetch all students
    const allStudents = await getStudentsForAdmitCards({});
    assert(allStudents.length >= 2, `Students retrieved from DB (Found: ${allStudents.length} students)`);

    if (allStudents.length >= 2) {
      const studentA = allStudents[0];
      const studentB = allStudents[1];

      // Test 1: Class filtering
      const classFiltered = await getStudentsForAdmitCards({ classId: studentA.classId });
      const allBelongToClass = classFiltered.every((s) => s.classId === studentA.classId);
      assert(
        classFiltered.length > 0 && allBelongToClass,
        `Class filter for classId=${studentA.classId} (${studentA.classDisplayName}) returned only matching students (${classFiltered.length})`
      );

      // Test 2: Search
      const searchResults = await getStudentsForAdmitCards({ search: studentA.studentName.slice(0, 4) });
      const searchMatches = searchResults.some((s) => s.id === studentA.id);
      assert(searchResults.length > 0 && searchMatches, `Search for "${studentA.studentName.slice(0, 4)}" found Student A`);

      // Test 3 & 4: Distinct QR Tokens
      const cardA = await getStudentAdmitCard(studentA.id);
      const cardB = await getStudentAdmitCard(studentB.id);

      assert(!!cardA?.student.qrToken, `Student A has valid QR token: ${cardA?.student.qrToken}`);
      assert(!!cardB?.student.qrToken, `Student B has valid QR token: ${cardB?.student.qrToken}`);
      assert(
        cardA?.student.qrToken !== cardB?.student.qrToken,
        'Student A and Student B have distinct, unique QR codes'
      );

      // Test 5: Verify Student A QR
      const verifySuccess = await verifyStudentQr(cardA!.student.qrToken);
      assert(
        verifySuccess.isValid && verifySuccess.student?.name === studentA.studentName,
        `QR verification of Student A returned verified DB identity (${verifySuccess.student?.name})`
      );

      // Test 6: Verify Invalid QR
      const verifyFail = await verifyStudentQr('INVALID-FAKE-QR-TOKEN-123');
      assert(
        Boolean(!verifyFail.isValid && verifyFail.message?.includes('Invalid or unrecognized')),
        `Invalid QR token failed verification safely with error: "${verifyFail.message}"`
      );
    }

    // ---------------------------------------------------------
    // PART 2: SECURE MESSAGE PERMISSION SYSTEM VERIFICATION
    // ---------------------------------------------------------
    console.log('\n--- PART 2: SECURE MESSAGE PERMISSIONS ---');

    // Fetch users for each role
    const [adminUser] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
    const [teacherUser] = await db.select().from(users).where(eq(users.role, 'teacher')).limit(1);
    const [parentUser] = await db.select().from(users).where(eq(users.role, 'parent')).limit(1);
    const studentUsers = await db.select().from(users).where(eq(users.role, 'student')).limit(2);
    const [driverUser] = await db.select().from(users).where(eq(users.role, 'driver')).limit(1);

    const student1 = studentUsers[0];
    const student2 = studentUsers[1];

    console.log('Sample Users for Test Matrix:');
    console.log(`- Admin: ID ${adminUser?.id} (${adminUser?.name})`);
    console.log(`- Teacher: ID ${teacherUser?.id} (${teacherUser?.name})`);
    console.log(`- Parent: ID ${parentUser?.id} (${parentUser?.name})`);
    console.log(`- Student 1: ID ${student1?.id} (${student1?.name})`);
    console.log(`- Student 2: ID ${student2?.id} (${student2?.name})`);
    console.log(`- Driver: ID ${driverUser?.id} (${driverUser?.name})`);
    console.log('');

    // Test 1: Admin <-> Teacher (ALLOWED)
    if (adminUser && teacherUser) {
      const a2t = await validateMessagePermission(adminUser.id, teacherUser.id);
      const t2a = await validateMessagePermission(teacherUser.id, adminUser.id);
      assert(a2t.allowed && t2a.allowed, 'Admin ↔ Teacher communication is ALLOWED');
    }

    // Test 2: Teacher <-> Parent (ALLOWED)
    if (teacherUser && parentUser) {
      const t2p = await validateMessagePermission(teacherUser.id, parentUser.id);
      const p2t = await validateMessagePermission(parentUser.id, teacherUser.id);
      assert(t2p.allowed && p2t.allowed, 'Teacher ↔ Parent communication is ALLOWED');
    }

    // Test 3: Student <-> Student (ALLOWED)
    if (student1 && student2) {
      const s2s = await validateMessagePermission(student1.id, student2.id);
      assert(s2s.allowed, 'Student ↔ Student communication is ALLOWED');
    }

    // Test 4: Student ↔ Parent (BLOCKED)
    if (student1 && parentUser) {
      const s2p = await validateMessagePermission(student1.id, parentUser.id);
      const p2s = await validateMessagePermission(parentUser.id, student1.id);
      assert(!s2p.allowed && !p2s.allowed, 'Student ↔ Parent communication is BLOCKED');
    }

    // Test 5: Driver ↔ Parent (BLOCKED)
    if (driverUser && parentUser) {
      const d2p = await validateMessagePermission(driverUser.id, parentUser.id);
      assert(!d2p.allowed, 'Driver ↔ Parent communication is BLOCKED');
    }

    // Test 6: Teacher ↔ Student (BLOCKED)
    if (teacherUser && student1) {
      const t2s = await validateMessagePermission(teacherUser.id, student1.id);
      assert(!t2s.allowed, 'Teacher ↔ Student communication is BLOCKED');
    }

    // Test 7: Admin ↔ Parent (BLOCKED)
    if (adminUser && parentUser) {
      const a2p = await validateMessagePermission(adminUser.id, parentUser.id);
      assert(!a2p.allowed, 'Admin ↔ Parent communication is BLOCKED');
    }

    // Test 8: Admin ↔ Student (BLOCKED)
    if (adminUser && student1) {
      const a2s = await validateMessagePermission(adminUser.id, student1.id);
      assert(!a2s.allowed, 'Admin ↔ Student communication is BLOCKED');
    }

    // Test 9: Driver ↔ Anyone (BLOCKED)
    if (driverUser && adminUser) {
      const d2a = await validateMessagePermission(driverUser.id, adminUser.id);
      assert(!d2a.allowed, 'Driver ↔ Admin communication is BLOCKED');
    }

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await closeDB();
  }

  console.log('\n====================================================');
  console.log(`📊 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
