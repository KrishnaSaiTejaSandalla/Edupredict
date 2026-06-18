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
    notificationPreferences: text('notification_preferences'),
    appearancePreferences: text('appearance_preferences'),
    // Extended profile fields
    bio: text('bio'),
    profileImageUrl: varchar('profile_image_url', { length: 512 }),
    designation: varchar('designation', { length: 128 }),
    phoneNumber: varchar('phone_number', { length: 20 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
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
    // Extended school identity
    motto: varchar('motto', { length: 256 }),
    website: varchar('website', { length: 256 }),
    registrationNumber: varchar('registration_number', { length: 128 }),
    affiliationBoard: varchar('affiliation_board', { length: 128 }),
    udiseCode: varchar('udise_code', { length: 64 }),
    // Branding
    logoUrl: varchar('logo_url', { length: 512 }),
    primaryColor: varchar('primary_color', { length: 16 }).default('#06b6d4'),
    accentColor: varchar('accent_color', { length: 16 }).default('#a78bfa'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow().notNull(),
  },
  (school) => ({
    nameIndex: index('schools_name_index').on(school.name),
  })
);

// ==================== User Preferences ====================
export const userPreferences = mysqlTable(
  'user_preferences',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: int('user_id').notNull().unique(),
    theme: varchar('theme', { length: 32 }).default('dark').notNull(),
    density: varchar('density', { length: 32 }).default('comfortable').notNull(),
    sidebarCollapsed: boolean('sidebar_collapsed').default(false).notNull(),
    language: varchar('language', { length: 16 }).default('en').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').onUpdateNow().notNull(),
  },
  (pref) => ({
    userIdIndex: index('user_preferences_user_id_index').on(pref.userId),
    fk_pref_user: foreignKey({
      columns: [pref.userId],
      foreignColumns: [users.id],
    }),
  })
);

// ==================== User Avatars ====================
export const userAvatars = mysqlTable(
  'user_avatars',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: int('user_id').notNull(),
    imageUrl: varchar('image_url', { length: 512 }).notNull(),
    style: varchar('style', { length: 64 }).notNull(),
    isSelected: boolean('is_selected').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (av) => ({
    userIdIndex: index('user_avatars_user_id_index').on(av.userId),
    fk_avatar_user: foreignKey({
      columns: [av.userId],
      foreignColumns: [users.id],
    }),
  })
);

// ==================== AI Generations ====================
export const aiGenerations = mysqlTable(
  'ai_generations',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: int('user_id').notNull(),
    type: varchar('type', { length: 64 }).notNull(), // AVATAR, PERFORMANCE_PREDICTION, REPORT_GENERATION, etc.
    prompt: text('prompt'),
    status: varchar('status', { length: 32 }).default('completed').notNull(), // pending, completed, failed
    resultUrl: varchar('result_url', { length: 512 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (gen) => ({
    userIdIndex: index('ai_generations_user_id_index').on(gen.userId),
    typeIndex: index('ai_generations_type_index').on(gen.type),
    statusIndex: index('ai_generations_status_index').on(gen.status),
    fk_gen_user: foreignKey({
      columns: [gen.userId],
      foreignColumns: [users.id],
    }),
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
    performanceRating: int('performance_rating'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
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
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
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
    parentEmail: varchar('parent_email', { length: 256 }),
    occupation: varchar('occupation', { length: 128 }),
    address: text('address'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
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
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
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
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
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
    subjectId: int('subject_id'),
    attendanceDate: date('attendance_date').notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    remarks: text('remarks'),
    markedBy: int('marked_by'),
    topicTaught: varchar('topic_taught', { length: 255 }),
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
    fk_attendance_subject: foreignKey({
      columns: [att.subjectId],
      foreignColumns: [subjects.id],
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
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
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
    isArchived: boolean('is_archived').default(false).notNull(),
    type: varchar('type', { length: 64 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
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
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
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
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
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
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
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

// ==================== Timetables ====================
export const timetables = mysqlTable(
  'timetables',
  {
    id: int('id').autoincrement().primaryKey(),
    schoolId: int('school_id').notNull(),
    classId: int('class_id').notNull(),
    subjectId: int('subject_id').notNull(),
    teacherId: int('teacher_id').notNull(),
    dayOfWeek: varchar('day_of_week', { length: 20 }).notNull(), // 'Monday', 'Tuesday', etc.
    startTime: varchar('start_time', { length: 10 }).notNull(),   // '09:00'
    endTime: varchar('end_time', { length: 10 }).notNull(),       // '09:45'
    roomNumber: varchar('room_number', { length: 64 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    schoolIdIdx: index('timetables_school_id_idx').on(table.schoolId),
    classIdIdx: index('timetables_class_id_idx').on(table.classId),
    teacherIdIdx: index('timetables_teacher_id_idx').on(table.teacherId),
    fk_timetable_school: foreignKey({ columns: [table.schoolId], foreignColumns: [schools.id] }),
    fk_timetable_class: foreignKey({ columns: [table.classId], foreignColumns: [classes.id] }),
    fk_timetable_subject: foreignKey({ columns: [table.subjectId], foreignColumns: [subjects.id] }),
    fk_timetable_teacher: foreignKey({ columns: [table.teacherId], foreignColumns: [teachers.id] }),
  })
);

// ==================== Leave Requests ====================
export const leaveRequests = mysqlTable(
  'leave_requests',
  {
    id: int('id').autoincrement().primaryKey(),
    schoolId: int('school_id').notNull(),
    userId: int('user_id').notNull(),              // Requester (parent or teacher)
    studentId: int('student_id'),                  // Set if student leave requested by parent
    leaveType: varchar('leave_type', { length: 64 }).notNull(), // 'Sick', 'Casual', etc.
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    reason: text('reason').notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending', 'approved', 'rejected'
    remarks: text('remarks'),                      // Approval/rejection reason
    actionedBy: int('actioned_by'),                // Admin who approved/rejected
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    schoolIdIdx: index('leave_requests_school_id_idx').on(table.schoolId),
    userIdIdx: index('leave_requests_user_id_idx').on(table.userId),
    statusIdx: index('leave_requests_status_idx').on(table.status),
    fk_leave_school: foreignKey({ columns: [table.schoolId], foreignColumns: [schools.id] }),
    fk_leave_user: foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
    fk_leave_student: foreignKey({ columns: [table.studentId], foreignColumns: [students.id] }),
    fk_leave_actioned: foreignKey({ columns: [table.actionedBy], foreignColumns: [users.id] }),
  })
);

// ==================== Feedback ====================
export const feedback = mysqlTable(
  'feedback',
  {
    id: int('id').autoincrement().primaryKey(),
    schoolId: int('school_id').notNull(),
    userId: int('user_id').notNull(),              // Parent or Student
    title: varchar('title', { length: 256 }).notNull(),
    message: text('message').notNull(),
    category: varchar('category', { length: 64 }).notNull(), // 'Academic', 'Facilities', 'Transport', etc.
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    schoolIdIdx: index('feedback_school_id_idx').on(table.schoolId),
    userIdIdx: index('feedback_user_id_idx').on(table.userId),
    fk_feedback_school: foreignKey({ columns: [table.schoolId], foreignColumns: [schools.id] }),
    fk_feedback_user: foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
  })
);

// ==================== Audit Logs ====================
export const auditLogs = mysqlTable(
  'audit_logs',
  {
    id: int('id').autoincrement().primaryKey(),
    schoolId: int('school_id').notNull(),
    userId: int('user_id').notNull(),              // Actor who made changes
    action: varchar('action', { length: 128 }).notNull(), // 'CREATE_TIMETABLE', 'APPROVE_LEAVE', etc.
    entityType: varchar('entity_type', { length: 64 }).notNull(), // 'timetable', 'leave_request', etc.
    entityId: int('entity_id').notNull(),
    details: text('details').notNull(),             // Description of actions/changes
    priority: varchar('priority', { length: 20 }),  // 'high' | 'medium' | 'low'
    module: varchar('module', { length: 64 }),      // 'Academic' | 'Staff' | 'Timetable' | etc.
    userRole: varchar('user_role', { length: 32 }), // Denormalized role for fast display
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    schoolIdIdx: index('audit_logs_school_id_idx').on(table.schoolId),
    userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
    priorityIdx: index('audit_logs_priority_idx').on(table.priority),
    moduleIdx: index('audit_logs_module_idx').on(table.module),
    fk_audit_school: foreignKey({ columns: [table.schoolId], foreignColumns: [schools.id] }),
    fk_audit_user: foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
  })
);

// ==================== Audit Logs Archive ====================
export const auditLogsArchive = mysqlTable(
  'audit_logs_archive',
  {
    id: int('id').autoincrement().primaryKey(),
    originalId: int('original_id').notNull(),       // Original audit_logs.id before archive
    schoolId: int('school_id').notNull(),
    userId: int('user_id').notNull(),
    action: varchar('action', { length: 128 }).notNull(),
    entityType: varchar('entity_type', { length: 64 }).notNull(),
    entityId: int('entity_id').notNull(),
    details: text('details').notNull(),
    priority: varchar('priority', { length: 20 }),
    module: varchar('module', { length: 64 }),
    userRole: varchar('user_role', { length: 32 }),
    createdAt: timestamp('created_at').notNull(),   // Preserved original timestamp
    archivedAt: timestamp('archived_at').defaultNow().notNull(),
  },
  (table) => ({
    schoolIdIdx: index('audit_archive_school_id_idx').on(table.schoolId),
    createdAtIdx: index('audit_archive_created_at_idx').on(table.createdAt),
    originalIdIdx: index('audit_archive_original_id_idx').on(table.originalId),
    priorityIdx: index('audit_archive_priority_idx').on(table.priority),
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

// ==================== Assignment Submissions ====================
export const assignmentSubmissions = mysqlTable(
  'assignment_submissions',
  {
    id: int('id').autoincrement().primaryKey(),
    assignmentId: int('assignment_id').notNull(),
    studentId: int('student_id').notNull(),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
    fileUrl: varchar('file_url', { length: 512 }),
    content: text('content'),
    grade: decimal('grade', { precision: 5, scale: 2 }),
    feedback: text('feedback'),
    gradedAt: timestamp('graded_at'),
    gradedBy: int('graded_by'),                 // teacher user id
    isLate: boolean('is_late').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (sub) => ({
    assignmentIdIndex: index('assignment_submissions_assignment_id_idx').on(sub.assignmentId),
    studentIdIndex: index('assignment_submissions_student_id_idx').on(sub.studentId),
    gradedByIndex: index('assignment_submissions_graded_by_idx').on(sub.gradedBy),
    uniqueStudentAssignment: uniqueIndex('assignment_submissions_student_assignment_unique').on(
      sub.assignmentId,
      sub.studentId
    ),
    fk_submission_assignment: foreignKey({
      columns: [sub.assignmentId],
      foreignColumns: [assignments.id],
    }),
    fk_submission_student: foreignKey({
      columns: [sub.studentId],
      foreignColumns: [students.id],
    }),
  })
);

// ==================== Teacher Resources ====================
export const teacherResources = mysqlTable(
  'teacher_resources',
  {
    id: int('id').autoincrement().primaryKey(),
    teacherId: int('teacher_id').notNull(),
    schoolId: int('school_id').notNull(),
    title: varchar('title', { length: 256 }).notNull(),
    description: text('description'),
    subject: varchar('subject', { length: 128 }),
    classLevel: varchar('class_level', { length: 64 }),   // e.g. "Class 8A", "Grade 10"
    resourceType: varchar('resource_type', { length: 64 }).notNull(), // 'notes','quiz','worksheet','lesson_plan','other'
    fileUrl: varchar('file_url', { length: 512 }),
    isAIGenerated: boolean('is_ai_generated').default(false).notNull(),
    aiPrompt: text('ai_prompt'),                // the prompt used to generate it
    aiContent: text('ai_content'),              // the actual AI-generated text content
    downloadCount: int('download_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (res) => ({
    teacherIdIndex: index('teacher_resources_teacher_id_idx').on(res.teacherId),
    schoolIdIndex: index('teacher_resources_school_id_idx').on(res.schoolId),
    subjectIndex: index('teacher_resources_subject_idx').on(res.subject),
    resourceTypeIndex: index('teacher_resources_type_idx').on(res.resourceType),
    fk_resource_teacher: foreignKey({
      columns: [res.teacherId],
      foreignColumns: [teachers.id],
    }),
    fk_resource_school: foreignKey({
      columns: [res.schoolId],
      foreignColumns: [schools.id],
    }),
  })
);

// ==================== Teacher Feedback (Student Satisfaction) ====================
export const teacherFeedback = mysqlTable(
  'teacher_feedback',
  {
    id: int('id').autoincrement().primaryKey(),
    teacherId: int('teacher_id').notNull(),
    studentId: int('student_id').notNull(),
    classId: int('class_id').notNull(),
    rating: int('rating').notNull(),            // 1-5
    comment: text('comment'),
    category: varchar('category', { length: 64 }).notNull(), // 'teaching_clarity','engagement','support','overall'
    academicYear: varchar('academic_year', { length: 64 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (fb) => ({
    teacherIdIndex: index('teacher_feedback_teacher_id_idx').on(fb.teacherId),
    studentIdIndex: index('teacher_feedback_student_id_idx').on(fb.studentId),
    classIdIndex: index('teacher_feedback_class_id_idx').on(fb.classId),
    fk_feedback_teacher: foreignKey({
      columns: [fb.teacherId],
      foreignColumns: [teachers.id],
    }),
    fk_feedback_student: foreignKey({
      columns: [fb.studentId],
      foreignColumns: [students.id],
    }),
    fk_feedback_class: foreignKey({
      columns: [fb.classId],
      foreignColumns: [classes.id],
    }),
  })
);

// ==================== Teacher Subject Assignments ====================
export const teacherSubjectAssignments = mysqlTable(
  'teacher_subject_assignments',
  {
    id: int('id').autoincrement().primaryKey(),
    teacherId: int('teacher_id').notNull(),
    subjectId: int('subject_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (tsa) => ({
    teacherIdIdx: index('tsa_teacher_id_idx').on(tsa.teacherId),
    subjectIdIdx: index('tsa_subject_id_idx').on(tsa.subjectId),
    fk_tsa_teacher: foreignKey({ columns: [tsa.teacherId], foreignColumns: [teachers.id] }),
    fk_tsa_subject: foreignKey({ columns: [tsa.subjectId], foreignColumns: [subjects.id] }),
  })
);

// ==================== Teacher Class Assignments ====================
export const teacherClassAssignments = mysqlTable(
  'teacher_class_assignments',
  {
    id: int('id').autoincrement().primaryKey(),
    teacherId: int('teacher_id').notNull(),
    classId: int('class_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (tca) => ({
    teacherIdIdx: index('tca_teacher_id_idx').on(tca.teacherId),
    classIdIdx: index('tca_class_id_idx').on(tca.classId),
    fk_tca_teacher: foreignKey({ columns: [tca.teacherId], foreignColumns: [teachers.id] }),
    fk_tca_class: foreignKey({ columns: [tca.classId], foreignColumns: [classes.id] }),
  })
);

// ==================== Class Teacher Assignments ====================
export const classTeacherAssignments = mysqlTable(
  'class_teacher_assignments',
  {
    id: int('id').autoincrement().primaryKey(),
    teacherId: int('teacher_id').notNull(),
    classId: int('class_id').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (cta) => ({
    teacherIdIdx: index('cta_teacher_id_idx').on(cta.teacherId),
    classIdIdx: index('cta_class_id_idx').on(cta.classId),
    fk_cta_teacher: foreignKey({ columns: [cta.teacherId], foreignColumns: [teachers.id] }),
    fk_cta_class: foreignKey({ columns: [cta.classId], foreignColumns: [classes.id] }),
  })
);

