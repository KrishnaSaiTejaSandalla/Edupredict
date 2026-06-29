import { db, closeDB } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import {
  users,
  schools,
  teachers,
  students,
  parents,
  classes,
  subjects,
  classSubjects,
  studentParents,
  buses,
  teacherClassAssignments,
  teacherSubjectAssignments,
} from '@/lib/schema';

async function seed() {
  console.log('Seeding database...');

  try {
    console.log('Cleaning database tables...');
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
    const tables = [
      'class_subjects', 'teacher_class_assignments', 'teacher_subject_assignments',
      'student_parents', 'parents', 'students', 'teachers', 'classes', 'subjects',
      'users', 'schools', 'buses', 'attendance', 'assignments', 'assignment_submissions',
      'results', 'exams', 'predictions', 'notifications', 'diaries', 'user_preferences',
      'ai_generated_notes', 'teacher_feedback', 'feedback'
    ];
    for (const table of tables) {
      try {
        await db.execute(sql.raw(`TRUNCATE TABLE \`${table}\``));
      } catch {
        try {
          await db.execute(sql.raw(`DELETE FROM \`${table}\``));
        } catch (e) {
          // ignore
        }
      }
    }
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
    console.log('✓ Database cleaned');

    // Create a school
    await db.insert(schools).values({
      name: 'St. Mary Public School',
      email: 'info@stmary.edu',
      phone: '+91-9876543210',
      address: '123 Educational Street',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      principalName: 'Dr. John Smith',
      establishedYear: 2000,
    });

    console.log('✓ School created');

    // Fetch the school
    const schoolResult = await db.select().from(schools).limit(1);
    const school = schoolResult[0];
    const schoolId = school.id;

    // Create users: 1 admin, 2 teachers, 3 students, 2 parents
    await db.insert(users).values({
      email: 'admin@stmary.edu',
      name: 'Admin User',
      password: 'hashed_password_here',
      role: 'admin',
      schoolId,
    });

    await db.insert(users).values({
      email: 'teacher1@stmary.edu',
      name: 'Mrs. Sarah Johnson',
      password: 'hashed_password_here',
      role: 'teacher',
      schoolId,
    });

    await db.insert(users).values({
      email: 'teacher2@stmary.edu',
      name: 'Mr. Michael Brown',
      password: 'hashed_password_here',
      role: 'teacher',
      schoolId,
    });

    await db.insert(users).values({
      email: 'student1@stmary.edu',
      name: 'Raj Kumar',
      password: 'hashed_password_here',
      role: 'student',
      schoolId,
    });

    await db.insert(users).values({
      email: 'student2@stmary.edu',
      name: 'Priya Sharma',
      password: 'hashed_password_here',
      role: 'student',
      schoolId,
    });

    await db.insert(users).values({
      email: 'student3@stmary.edu',
      name: 'Arjun Reddy',
      password: 'hashed_password_here',
      role: 'student',
      schoolId,
    });

    await db.insert(users).values({
      email: 'parent1@email.com',
      name: 'Ramesh Kumar',
      password: 'hashed_password_here',
      role: 'parent',
      schoolId,
    });

    await db.insert(users).values({
      email: 'parent2@email.com',
      name: 'Anjali Sharma',
      password: 'hashed_password_here',
      role: 'parent',
      schoolId,
    });

    console.log('✓ Users created');

    // Fetch all users for reference
    const allUsers = await db.select().from(users).where(eq(users.schoolId, schoolId));
    const teacherUser1 = allUsers.find((u) => u.email === 'teacher1@stmary.edu')!;
    const teacherUser2 = allUsers.find((u) => u.email === 'teacher2@stmary.edu')!;
    const studentUser1 = allUsers.find((u) => u.email === 'student1@stmary.edu')!;
    const studentUser2 = allUsers.find((u) => u.email === 'student2@stmary.edu')!;
    const studentUser3 = allUsers.find((u) => u.email === 'student3@stmary.edu')!;
    const parentUser1 = allUsers.find((u) => u.email === 'parent1@email.com')!;
    const parentUser2 = allUsers.find((u) => u.email === 'parent2@email.com')!;

    // Create teachers records
    await db.insert(teachers).values([
      {
        userId: teacherUser1.id,
        schoolId,
        employeeId: 'TID001',
        phoneNumber: '+91-9876543211',
        qualification: 'M.A. English, B.Ed',
        experience: 8,
        joinDate: new Date('2016-06-15'),
        department: 'Languages',
      },
      {
        userId: teacherUser2.id,
        schoolId,
        employeeId: 'TID002',
        phoneNumber: '+91-9876543212',
        qualification: 'M.Sc. Physics, B.Ed',
        experience: 12,
        joinDate: new Date('2012-07-01'),
        department: 'Science',
      },
    ]);

    console.log('✓ Teachers created');

    // Fetch teachers
    const allTeachers = await db.select().from(teachers).where(eq(teachers.schoolId, schoolId));
    const teacher1 = allTeachers.find((t) => t.employeeId === 'TID001')!;
    const teacher2 = allTeachers.find((t) => t.employeeId === 'TID002')!;

    // Create classes
    await db.insert(classes).values([
      {
        schoolId,
        name: '10',
        section: 'A',
        classTeacherId: teacher1.id,
        academicYear: '2026',
      },
      {
        schoolId,
        name: '10',
        section: 'B',
        classTeacherId: teacher2.id,
        academicYear: '2026',
      },
    ]);

    console.log('✓ Classes created');

    // Fetch classes
    const allClasses = await db.select().from(classes).where(eq(classes.schoolId, schoolId));
    const class10A = allClasses.find((c) => c.section === 'A')!;
    const class10B = allClasses.find((c) => c.section === 'B')!;

    // Create subjects
    await db.insert(subjects).values([
      {
        schoolId,
        name: 'English',
        code: 'ENG101',
        description: 'English Language and Literature',
        maxMarks: '100',
        passingMarks: '40',
      },
      {
        schoolId,
        name: 'Mathematics',
        code: 'MAT101',
        description: 'Mathematics',
        maxMarks: '100',
        passingMarks: '40',
      },
      {
        schoolId,
        name: 'Science',
        code: 'SCI101',
        description: 'Physics, Chemistry, Biology',
        maxMarks: '100',
        passingMarks: '40',
      },
    ]);

    console.log('✓ Subjects created');

    // Fetch subjects
    const allSubjects = await db.select().from(subjects).where(eq(subjects.schoolId, schoolId));
    const subjectEnglish = allSubjects.find((s) => s.code === 'ENG101')!;
    const subjectMath = allSubjects.find((s) => s.code === 'MAT101')!;
    const subjectScience = allSubjects.find((s) => s.code === 'SCI101')!;

    // Map classes to subjects
    await db.insert(classSubjects).values([
      {
        classId: class10A.id,
        subjectId: subjectEnglish.id,
        teacherId: teacher1.id,
      },
      {
        classId: class10A.id,
        subjectId: subjectMath.id,
        teacherId: teacher2.id,
      },
      {
        classId: class10A.id,
        subjectId: subjectScience.id,
        teacherId: teacher2.id,
      },
      {
        classId: class10B.id,
        subjectId: subjectEnglish.id,
        teacherId: teacher1.id,
      },
      {
        classId: class10B.id,
        subjectId: subjectMath.id,
        teacherId: teacher2.id,
      },
      {
        classId: class10B.id,
        subjectId: subjectScience.id,
        teacherId: teacher2.id,
      },
    ]);

    console.log('✓ Class-Subject mappings created');

    // Create legacy teacher assignments to support fallback queries
    await db.insert(teacherClassAssignments).values([
      { teacherId: teacher1.id, classId: class10A.id },
      { teacherId: teacher1.id, classId: class10B.id },
      { teacherId: teacher2.id, classId: class10A.id },
      { teacherId: teacher2.id, classId: class10B.id },
    ]);

    await db.insert(teacherSubjectAssignments).values([
      { teacherId: teacher1.id, subjectId: subjectEnglish.id },
      { teacherId: teacher2.id, subjectId: subjectMath.id },
      { teacherId: teacher2.id, subjectId: subjectScience.id },
    ]);

    console.log('✓ Legacy teacher assignments created');

    // Create students
    await db.insert(students).values([
      {
        userId: studentUser1.id,
        schoolId,
        classId: class10A.id,
        rollNumber: 'RAJ001',
        dateOfBirth: new Date('2010-05-15'),
        gender: 'male',
        phoneNumber: '+91-9876543220',
        address: '456 Student Street, Bangalore',
        admissionDate: new Date('2024-06-01'),
      },
      {
        userId: studentUser2.id,
        schoolId,
        classId: class10A.id,
        rollNumber: 'PRI002',
        dateOfBirth: new Date('2010-08-22'),
        gender: 'female',
        phoneNumber: '+91-9876543221',
        address: '789 Scholar Lane, Bangalore',
        admissionDate: new Date('2024-06-01'),
      },
      {
        userId: studentUser3.id,
        schoolId,
        classId: class10B.id,
        rollNumber: 'ARJ003',
        dateOfBirth: new Date('2010-03-10'),
        gender: 'male',
        phoneNumber: '+91-9876543222',
        address: '321 Academy Road, Bangalore',
        admissionDate: new Date('2024-06-01'),
      },
    ]);

    console.log('✓ Students created');

    // Fetch students
    const allStudents = await db.select().from(students).where(eq(students.schoolId, schoolId));
    const student1 = allStudents.find((s) => s.rollNumber === 'RAJ001')!;
    const student2 = allStudents.find((s) => s.rollNumber === 'PRI002')!;

    // Create parents
    await db.insert(parents).values([
      {
        userId: parentUser1.id,
        phoneNumber: '+91-9876543230',
        occupation: 'Software Engineer',
        address: '456 Student Street, Bangalore',
      },
      {
        userId: parentUser2.id,
        phoneNumber: '+91-9876543231',
        occupation: 'Doctor',
        address: '789 Scholar Lane, Bangalore',
      },
    ]);

    console.log('✓ Parents created');

    // Fetch parents
    const allParents = await db.select().from(parents);
    const parent1 = allParents.find((p) => p.phoneNumber === '+91-9876543230')!;
    const parent2 = allParents.find((p) => p.phoneNumber === '+91-9876543231')!;

    // Link students to parents
    await db.insert(studentParents).values([
      {
        studentId: student1.id,
        parentId: parent1.id,
        relation: 'Father',
      },
      {
        studentId: student2.id,
        parentId: parent2.id,
        relation: 'Mother',
      },
    ]);

    console.log('✓ Student-Parent relationships created');

    // Create buses
    await db.insert(buses).values([
      {
        schoolId,
        registrationNumber: 'KA-51-AB-1234',
        routeName: 'Route A - North',
        driverName: 'Mr. Vijay',
        driverPhone: '+91-9876543240',
        capacity: 50,
      },
      {
        schoolId,
        registrationNumber: 'KA-51-AB-5678',
        routeName: 'Route B - South',
        driverName: 'Mr. Ramakrishna',
        driverPhone: '+91-9876543241',
        capacity: 45,
      },
    ]);

    console.log('✓ Buses created');

    console.log('\n✓ Database seeded successfully!');
    await closeDB();
    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    await closeDB();
    process.exit(1);
  }
}

seed();

