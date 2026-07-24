import { pgTable, text, integer, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';

// 1. Grades table
export const dbGrades = pgTable('db_grades', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  streams: jsonb('streams').notNull(), // Stream[] as JSON
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Subjects table
export const dbSubjects = pgTable('db_subjects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  grades: jsonb('grades').notNull(), // number[] as JSON
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Learners table
export const dbLearners = pgTable('db_learners', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  admNo: text('adm_no').notNull(),
  grade: integer('grade').notNull(),
  stream: text('stream').notNull(),
  firstName: text('first_name'),
  secondName: text('second_name'),
  otherName: text('other_name'),
  assessNo: text('assess_no'),
  gradeLabel: text('grade_label'),
  gender: text('gender'), // 'Male' | 'Female'
  type: text('type'), // 'Day Scholar' | 'Boarder'
  status: text('status'), // 'Active' | 'Inactive'
  parentPhone: text('parent_phone'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Subject Enrollments
export const dbSubjectEnrollments = pgTable('db_subject_enrollments', {
  key: text('key').primaryKey(), // 'subject_enrollments'
  data: jsonb('data').notNull(), // Record<string, string[]> as JSON
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 5. Grading Rules
export const dbGradingRules = pgTable('db_grading_rules', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  min: integer('min').notNull(),
  max: integer('max').notNull(),
  points: integer('points').notNull(),
  category: text('category').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Users (Staff and Admin)
export const dbUsers = pgTable('db_users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull(),
  created: text('created').notNull(),
  status: text('status').notNull(),
  password: text('password'),
  staffNo: text('staff_no'),
  nationalId: text('national_id'),
  phone: text('phone'),
  email: text('email'),
  empDate: text('emp_date'),
  designatedRole: text('designated_role'),
  department: text('department'),
  systemRole: text('system_role'),
  adminOverride: boolean('admin_override'),
  permissions: jsonb('permissions'), // string[] as JSON
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Subject Assignments
export const dbSubjectAssignments = pgTable('db_subject_assignments', {
  key: text('key').primaryKey(), // 'subject_assignments_list'
  data: jsonb('data').notNull(), // any[]
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 8. Class Teacher Assignments
export const dbClassTeacherAssignments = pgTable('db_class_teacher_assignments', {
  key: text('key').primaryKey(), // 'class_teacher_assignments_list'
  data: jsonb('data').notNull(), // any[]
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 9. School Profile
export const dbSchoolProfile = pgTable('db_school_profile', {
  key: text('key').primaryKey(), // 'school_profile'
  data: jsonb('data').notNull(), // SchoolProfile
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 10. Holidays
export const dbHolidays = pgTable('db_holidays', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 11. Terms
export const dbTerms = pgTable('db_terms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 12. Attendance Sheets
export const dbAttendanceSheets = pgTable('db_attendance_sheets', {
  id: text('id').primaryKey(), // e.g. `${date}_${gradeId}_${streamId}`
  date: text('date').notNull(),
  gradeId: text('grade_id').notNull(),
  streamId: text('stream_id').notNull(),
  records: jsonb('records').notNull(), // Record<string, string>
  lastUpdatedBy: text('last_updated_by'),
  lastUpdatedAt: text('last_updated_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 13. Exams table
export const dbExams = pgTable('db_exams', {
  key: text('key').primaryKey(), // 'exams'
  data: jsonb('data').notNull(), // Exam[]
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 14. Exam Marks table
export const dbExamMarks = pgTable('db_exam_marks', {
  key: text('key').primaryKey(), // 'school_exam_marks'
  data: jsonb('data').notNull(), // Mark[]
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 15. Staff Attendance Sheets table
export const dbStaffAttendanceSheets = pgTable('db_staff_attendance_sheets', {
  id: text('id').primaryKey(), // e.g. `${date}`
  date: text('date').notNull(),
  records: jsonb('records').notNull(), // Record<string, StaffAttendanceRecord>
  lastUpdatedBy: text('last_updated_by'),
  lastUpdatedAt: text('last_updated_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 16. Messages table for Parent-Teacher communication
export const dbMessages = pgTable('db_messages', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').notNull(),
  receiverId: text('receiver_id'), // null for broad announcements
  learnerId: text('learner_id').notNull(), // associated learner
  text: text('text').notNull(),
  senderRole: text('sender_role').notNull(), // 'Parent' | 'Teacher'
  timestamp: timestamp('timestamp').defaultNow(),
  read: boolean('read').default(false),
});

// 17. Subject Papers table
export const dbSubjectPapers = pgTable('db_subject_papers', {
  key: text('key').primaryKey(), // 'school_subject_papers'
  data: jsonb('data').notNull(), // SubjectPaper[]
  updatedAt: timestamp('updated_at').defaultNow(),
});
