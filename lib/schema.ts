import {
  mysqlTable,
  serial,
  varchar,
  timestamp,
  uniqueIndex,
  index,
  int,
  decimal,
  text,
  date,
  boolean,
  double,
  foreignKey,
} from "drizzle-orm/mysql-core";

// ==================== Core Users ====================
export const users = mysqlTable(
  'users',
  {
    id: int('id').autoincrement().primaryKey(),
    email: varchar('email', { length: 256 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    password: varchar('password', { length: 256 }).notNull(),
    role: varchar('role', { length: 32 }).notNull(),
    schoolId: int('school_id'),
    isActive: boolean('is_active').default(true).notNull(),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow().notNull(),
  },
  (user) => ({
    emailIndex: uniqueIndex('users_email_unique').on(user.email),
    schoolIdIndex: index('users_school_id_index').on(user.schoolId),
    roleIndex: index('users_role_index').on(user.role),
  })
);

// ==================== Schools ====================
export const schools = mysqlTable(
  'schools',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 256 }).notNull(),
    email: varchar('email', { length: 256 }),
    phone: varchar('phone', { length: 20 }),
    address: text('address'),
    city: varchar('city', { length: 128 }),
    state: varchar('state', { length: 128 }),
    pincode: varchar('pincode', { length: 20 }),
    principalName: varchar('principal_name', { length: 128 }),
    establishedYear: int('established_year'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow().notNull(),
  },
  (school) => ({
    nameIndex: index('schools_name_index').on(school.name),
  })
);

// ==================== Teachers ====================
export const teachers = mysqlTable(
  'teachers',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: int('user_id').notNull().unique(),
    schoolId: int('school_id').notNull(),
    employeeId: varchar('employee_id', { length: 64 }).unique(),
    phoneNumber: varchar('phone_number', { length: 20 }),
    qualification: varchar('qualification', { length: 256 }),
    experience: int('experience'),
    joinDate: date('join_date'),
    department: varchar('department', { length: 128 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow().notNull(),
  },
  (teacher) => ({
    userIdIndex: index('teachers_user_id_index').on(teacher.userId),
    schoolIdIndex: index('teachers_school_id_index').on(teacher.schoolId),
    employeeIdIndex: index('teachers_employee_id_index').on(teacher.employeeId),
    fk_teacher_user: foreignKey({
      columns: [teacher.userId],
      foreignColumns: [users.id],
    }),
    fk_teacher_school: foreignKey({
      columns: [teacher.schoolId],
      foreignColumns: [schools.id],
    }),
  })
);

// ==================== Students ====================
export const students = mysqlTable(
  'students',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: int('user_id').notNull().unique(),
    schoolId: int('school_id').notNull(),
    classId: int('class_id').notNull(),
    rollNumber: varchar('roll_number', { length: 64 }),
    dateOfBirth: date('date_of_birth'),
    gender: varchar('gender', { length: 20 }),
    phoneNumber: varchar('phone_number', { length: 20 }),
    address: text('address'),
    admissionDate: date('admission_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow().notNull(),
  },
  (student) => ({
    userIdIndex: index('students_user_id_index').on(student.userId),
    schoolIdIndex: index('students_school_id_index').on(student.schoolId),
    classIdIndex: index('students_class_id_index').on(student.classId),
    classRollUnique: uniqueIndex('students_class_roll_unique').on(
      student.classId,
      student.rollNumber
    ),
    rollNumberIndex: index('students_roll_number_index').on(student.rollNumber),
    fk_student_user: foreignKey({
      columns: [student.userId],
      foreignColumns: [users.id],
    }),
    fk_student_school: foreignKey({
      columns: [student.schoolId],
      foreignColumns: [schools.id],
    }),
  })
);

// ==================== Parents ====================
export const parents = mysqlTable(
  'parents',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: int('user_id').notNull().unique(),
    phoneNumber: varchar('phone_number', { length: 20 }),
    occupation: varchar('occupation', { length: 128 }),
    address: text('address'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow().notNull(),
  },
  (parent) => ({
    userIdIndex: index('parents_user_id_index').on(parent.userId),
    fk_parent_user: foreignKey({
      columns: [parent.userId],
      foreignColumns: [users.id],
    }),
  })
);

// ==================== Student-Parent Relationship ====================
export const studentParents = mysqlTable(
  'student_parents',
  {
    id: int('id').autoincrement().primaryKey(),
    studentId: int('student_id').notNull(),
    parentId: int('parent_id').notNull(),
    relation: varchar('relation', { length: 64 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (sp) => ({
    studentIdIndex: index('student_parents_student_id_index').on(sp.studentId),
    parentIdIndex: index('student_parents_parent_id_index').on(sp.parentId),
    fk_student_parent_student: foreignKey({
      columns: [sp.studentId],
      foreignColumns: [students.id],
    }),
    fk_student_parent_parent: foreignKey({
      columns: [sp.parentId],
      foreignColumns: [parents.id],
    }),
  })
);

// ==================== Classes ====================
export const classes = mysqlTable(
  'classes',
  {
    id: int('id').autoincrement().primaryKey(),
    schoolId: int('school_id').notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    section: varchar('section', { length: 64 }),
    classTeacherId: int('class_teacher_id'),
    academicYear: varchar('academic_year', { length: 64 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow().notNull(),
  },
  (cls) => ({
    schoolIdIndex: index('classes_school_id_index').on(cls.schoolId),
    classTeacherIdIndex: index('classes_class_teacher_id_index').on(cls.classTeacherId),
    fk_class_school: foreignKey({
      columns: [cls.schoolId],
      foreignColumns: [schools.id],
    }),
  })
);

// ==================== Subjects ====================
export const subjects = mysqlTable(
  'subjects',
  {
    id: int('id').autoincrement().primaryKey(),
    schoolId: int('school_id').notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    code: varchar('code', { length: 64 }).unique(),
    description: text('description'),
    maxMarks: decimal('max_marks', { precision: 5, scale: 2 }),
    passingMarks: decimal('passing_marks', { precision: 5, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow().notNull(),
  },
  (subject) => ({
    schoolIdIndex: index('subjects_school_id_index').on(subject.schoolId),
    codeIndex: index('subjects_code_index').on(subject.code),
    fk_subject_school: foreignKey({
      columns: [subject.schoolId],
      foreignColumns: [schools.id],
    }),
  })
);

// ==================== Class-Subject Mapping ====================
export const classSubjects = mysqlTable(
  'class_subjects',
  {
    id: int('id').autoincrement().primaryKey(),
    classId: int('class_id').notNull(),
    subjectId: int('subject_id').notNull(),
    teacherId: int('teacher_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (cs) => ({
    classIdIndex: index('class_subjects_class_id_index').on(cs.classId),
    subjectIdIndex: index('class_subjects_subject_id_index').on(cs.subjectId),
    teacherIdIndex: index('class_subjects_teacher_id_index').on(cs.teacherId),
    fk_class_subject_class: foreignKey({
      columns: [cs.classId],
      foreignColumns: [classes.id],
    }),
    fk_class_subject_subject: foreignKey({
      columns: [cs.subjectId],
      foreignColumns: [subjects.id],
    }),
    fk_class_subject_teacher: foreignKey({
      columns: [cs.teacherId],
      foreignColumns: [teachers.id],
    }),
  })
);

// ==================== Attendance ====================
export const attendance = mysqlTable(
  'attendance',
  {
    id: int('id').autoincrement().primaryKey(),
    studentId: int('student_id').notNull(),
    classId: int('class_id').notNull(),
    attendanceDate: date('attendance_date').notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    remarks: text('remarks'),
    markedBy: int('marked_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (att) => ({
    studentIdIndex: index('attendance_student_id_index').on(att.studentId),
    classIdIndex: index('attendance_class_id_index').on(att.classId),
    attendanceDateIndex: index('attendance_date_index').on(att.attendanceDate),
    dateRangeIndex: index('attendance_student_date_index').on(att.studentId, att.attendanceDate),
    // enforce one attendance record per student per day
    uniqueStudentDate: uniqueIndex('attendance_student_date_unique').on(att.studentId, att.attendanceDate),
    fk_attendance_student: foreignKey({
      columns: [att.studentId],
      foreignColumns: [students.id],
    }),
    fk_attendance_class: foreignKey({
      columns: [att.classId],
      foreignColumns: [classes.id],
    }),
  })
);

// ==================== Assignments ====================
export const assignments = mysqlTable(
  'assignments',
  {
    id: int('id').autoincrement().primaryKey(),
    classId: int('class_id').notNull(),
    subjectId: int('subject_id').notNull(),
    teacherId: int('teacher_id').notNull(),
    title: varchar('title', { length: 256 }).notNull(),
    description: text('description'),
    dueDate: date('due_date').notNull(),
    maxMarks: decimal('max_marks', { precision: 5, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow().notNull(),
  },
  (assign) => ({
    classIdIndex: index('assignments_class_id_index').on(assign.classId),
    subjectIdIndex: index('assignments_subject_id_index').on(assign.subjectId),
    teacherIdIndex: index('assignments_teacher_id_index').on(assign.teacherId),
    dueDateIndex: index('assignments_due_date_index').on(assign.dueDate),
    fk_assignment_class: foreignKey({
      columns: [assign.classId],
      foreignColumns: [classes.id],
    }),
    fk_assignment_subject: foreignKey({
      columns: [assign.subjectId],
      foreignColumns: [subjects.id],
    }),
    fk_assignment_teacher: foreignKey({
      columns: [assign.teacherId],
      foreignColumns: [teachers.id],
    }),
  })
);

// ==================== Exams ====================
export const exams = mysqlTable(
  'exams',
  {
    id: int('id').autoincrement().primaryKey(),
    classId: int('class_id').notNull(),
    subjectId: int('subject_id').notNull(),
    name: varchar('name', { length: 256 }).notNull(),
    examDate: date('exam_date').notNull(),
    duration: int('duration'),
    maxMarks: decimal('max_marks', { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow().notNull(),
  },
  (exam) => ({
    classIdIndex: index('exams_class_id_index').on(exam.classId),
    subjectIdIndex: index('exams_subject_id_index').on(exam.subjectId),
    examDateIndex: index('exams_exam_date_index').on(exam.examDate),
    fk_exam_class: foreignKey({
      columns: [exam.classId],
      foreignColumns: [classes.id],
    }),
    fk_exam_subject: foreignKey({
      columns: [exam.subjectId],
      foreignColumns: [subjects.id],
    }),
  })
);

// ==================== Results ====================
export const results = mysqlTable(
  'results',
  {
    id: int('id').autoincrement().primaryKey(),
    studentId: int('student_id').notNull(),
    examId: int('exam_id'),
    assignmentId: int('assignment_id'),
    subjectId: int('subject_id').notNull(),
    marks: decimal('marks', { precision: 5, scale: 2 }).notNull(),
    remarks: text('remarks'),
    recordedDate: date('recorded_date').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow().notNull(),
  },
  (result) => ({
    studentIdIndex: index('results_student_id_index').on(result.studentId),
    examIdIndex: index('results_exam_id_index').on(result.examId),
    assignmentIdIndex: index('results_assignment_id_index').on(result.assignmentId),
    subjectIdIndex: index('results_subject_id_index').on(result.subjectId),
    fk_result_student: foreignKey({
      columns: [result.studentId],
      foreignColumns: [students.id],
    }),
    fk_result_exam: foreignKey({
      columns: [result.examId],
      foreignColumns: [exams.id],
    }),
    fk_result_assignment: foreignKey({
      columns: [result.assignmentId],
      foreignColumns: [assignments.id],
    }),
    fk_result_subject: foreignKey({
      columns: [result.subjectId],
      foreignColumns: [subjects.id],
    }),
  })
);

// ==================== Predictions ====================
export const predictions = mysqlTable(
  'predictions',
  {
    id: int('id').autoincrement().primaryKey(),
    studentId: int('student_id').notNull(),
    subjectId: int('subject_id').notNull(),
    predictedScore: decimal('predicted_score', { precision: 5, scale: 2 }),
    riskLevel: varchar('risk_level', { length: 20 }).notNull(),
    confidence: decimal('confidence', { precision: 3, scale: 2 }),
    recommendations: text('recommendations'),
    predictionDate: timestamp('prediction_date').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow().notNull(),
  },
  (pred) => ({
    studentIdIndex: index('predictions_student_id_index').on(pred.studentId),
    subjectIdIndex: index('predictions_subject_id_index').on(pred.subjectId),
    riskLevelIndex: index('predictions_risk_level_index').on(pred.riskLevel),
    fk_prediction_student: foreignKey({
      columns: [pred.studentId],
      foreignColumns: [students.id],
    }),
    fk_prediction_subject: foreignKey({
      columns: [pred.subjectId],
      foreignColumns: [subjects.id],
    }),
  })
);

// ==================== Notifications ====================
export const notifications = mysqlTable(
  'notifications',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: int('user_id').notNull(),
    title: varchar('title', { length: 256 }).notNull(),
    message: text('message').notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    priority: varchar('priority', { length: 20 }).default('medium').notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    actionUrl: varchar('action_url', { length: 512 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    readAt: timestamp('read_at'),
  },
  (notif) => ({
    userIdIndex: index('notifications_user_id_index').on(notif.userId),
    isReadIndex: index('notifications_is_read_index').on(notif.isRead),
    createdAtIndex: index('notifications_created_at_index').on(notif.createdAt),
    fk_notification_user: foreignKey({
      columns: [notif.userId],
      foreignColumns: [users.id],
    }),
  })
);

// ==================== Buses ====================
export const buses = mysqlTable(
  'buses',
  {
    id: int('id').autoincrement().primaryKey(),
    schoolId: int('school_id').notNull(),
    registrationNumber: varchar('registration_number', { length: 64 }).unique().notNull(),
    routeName: varchar('route_name', { length: 128 }),
    driverName: varchar('driver_name', { length: 128 }),
    driverPhone: varchar('driver_phone', { length: 20 }),
    capacity: int('capacity'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow().notNull(),
  },
  (bus) => ({
    schoolIdIndex: index('buses_school_id_index').on(bus.schoolId),
    registrationNumberIndex: index('buses_registration_number_index').on(bus.registrationNumber),
    fk_bus_school: foreignKey({
      columns: [bus.schoolId],
      foreignColumns: [schools.id],
    }),
  })
);

// ==================== Bus Locations ====================
export const busLocations = mysqlTable(
  'bus_locations',
  {
    id: int('id').autoincrement().primaryKey(),
    busId: int('bus_id').notNull(),
    latitude: double('latitude').notNull(),
    longitude: double('longitude').notNull(),
    speed: int('speed'),
    heading: int('heading'),
    accuracy: int('accuracy'),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  (loc) => ({
    busIdIndex: index('bus_locations_bus_id_index').on(loc.busId),
    timestampIndex: index('bus_locations_timestamp_index').on(loc.timestamp),
    fk_bus_location_bus: foreignKey({
      columns: [loc.busId],
      foreignColumns: [buses.id],
    }),
  })
);

// ==================== Auth: Sessions, Accounts, Verification ====================
export const sessions = mysqlTable('sessions', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  sessionToken: varchar('session_token', { length: 128 }).notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (s) => ({
  userIdIndex: index('sessions_user_id_index').on(s.userId),
  fk_session_user: foreignKey({ columns: [s.userId], foreignColumns: [users.id] }),
}));

export const accounts = mysqlTable('accounts', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  provider: varchar('provider', { length: 128 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 256 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (a) => ({
  userIdIndex: index('accounts_user_id_index').on(a.userId),
  providerIndex: index('accounts_provider_index').on(a.provider),
  fk_account_user: foreignKey({ columns: [a.userId], foreignColumns: [users.id] }),
}));

export const verificationTokens = mysqlTable('verification_tokens', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  token: varchar('token', { length: 256 }).notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (v) => ({
  userIdIndex: index('verification_user_id_index').on(v.userId),
  fk_verification_user: foreignKey({ columns: [v.userId], foreignColumns: [users.id] }),
}));
