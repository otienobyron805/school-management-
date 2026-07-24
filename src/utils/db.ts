import { ActivityEvent } from '../types';
export interface Stream {
  id: string;
  name: string;
}

export interface Grade {
  id: string;
  name: string;
  streams: Stream[];
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  grades: number[]; // e.g. [1, 2, 3, 4, 5, 6, 7, 8, 9]
}

export interface Learner {
  id: string;
  name: string;
  admNo: string;
  grade: number; // e.g., 1 to 9 (or parsed number)
  stream: string; // e.g., "East", "West", "North", "South"
  firstName?: string;
  secondName?: string;
  otherName?: string;
  assessNo?: string;
  gradeLabel?: string;
  gender?: 'Male' | 'Female';
  type?: 'Day Scholar' | 'Boarder';
  status?: 'Active' | 'Inactive';
  parentPhone?: string;
  avatarUrl?: string;
}

export interface SubjectPaper {
  id: string;
  subjectId: string;
  name: string;
  weight: number;
}

// Default initial database seed
const DEFAULT_GRADES: Grade[] = [];

const DEFAULT_SUBJECTS: Subject[] = [];

const DEFAULT_LEARNERS: Learner[] = [];

// Seed enrollments for default subject: empty by default
const DEFAULT_ENROLLMENTS: Record<string, string[]> = {};

// --- CRYPTOGRAPHIC STORAGE SCRAMBLER & FAST IN-MEMORY CACHE SECTION ---
const SEC_KEY = "school_admin_secret_key_987654321_cbc_auth";
const memCache: Record<string, string> = {};
let isBackendUnavailable = false;

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key) {
      delete memCache[e.key];
    } else {
      Object.keys(memCache).forEach(k => delete memCache[k]);
    }
  });
}

function scramble(text: string): string {
  try {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    const keyLen = SEC_KEY.length;
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] ^= SEC_KEY.charCodeAt(i % keyLen);
    }
    let binString = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binString += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as unknown as number[]);
    }
    return btoa(binString);
  } catch (e) {
    return text;
  }
}

function unscramble(encoded: string): string {
  try {
    const binString = atob(encoded);
    const bytes = new Uint8Array(binString.length);
    const keyLen = SEC_KEY.length;
    for (let i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i) ^ SEC_KEY.charCodeAt(i % keyLen);
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  } catch (e) {
    return "";
  }
}

export function secureGet(key: string): string | null {
  if (memCache[key] !== undefined) {
    return memCache[key];
  }
  const data = localStorage.getItem(key);
  if (!data) return null;
  // Handle / auto-secure legacy unencrypted data if present
  if (data.trim().startsWith('[') || data.trim().startsWith('{')) {
    const scrambled = scramble(data);
    localStorage.setItem(key, scrambled);
    memCache[key] = data;
    return data;
  }
  const decrypted = unscramble(data);
  const result = decrypted || data;
  memCache[key] = result;
  return result;
}

let isSyncingFromServer = false;

export function secureSet(key: string, value: string): void {
  if (memCache[key] === value) {
    // Skip redundant writes completely
    return;
  }
  memCache[key] = value;
  const scrambled = scramble(value);
  localStorage.setItem(key, scrambled);

  if (!isSyncingFromServer && !isBackendUnavailable) {
    try {
      const parsed = JSON.parse(value);
      let tableName: string | null = null;
      if (key === 'school_grades') tableName = 'grades';
      else if (key === 'school_subjects') tableName = 'subjects';
      else if (key === 'school_learners') tableName = 'learners';
      else if (key === 'subject_enrollments') tableName = 'subject_enrollments';
      else if (key === 'school_grading_rules') tableName = 'grading_rules';
      else if (key === 'school_users') tableName = 'users';
      else if (key === 'subject_assignments_list') tableName = 'subject_assignments';
      else if (key === 'class_teacher_assignments_list') tableName = 'class_teacher_assignments';
      else if (key === 'school_profile') tableName = 'school_profile';
      else if (key === 'school_holidays') tableName = 'holidays';
      else if (key === 'school_terms') tableName = 'terms';
      else if (key === 'school_attendance_sheets') tableName = 'attendance_sheets';
      else if (key === 'school_messages') tableName = 'messages';
      else if (key === 'exams') tableName = 'exams';
      else if (key === 'school_exam_marks') tableName = 'school_exam_marks';
      else if (key === 'school_subject_papers') tableName = 'subject_papers';

      if (tableName) {
        saveToBackend(tableName, parsed);
      }
    } catch (err) {
      // Ignore non-JSON
    }
  }
}

export function secureRemove(key: string): void {
  delete memCache[key];
  localStorage.removeItem(key);
}
// -----------------------------------------------

export function getGrades(): Grade[] {
  const data = secureGet('school_grades');
  if (!data) {
    secureSet('school_grades', JSON.stringify(DEFAULT_GRADES));
    return DEFAULT_GRADES;
  }
  
  let parsed = JSON.parse(data);
  // Auto-clear legacy demo grades if present
  if (Array.isArray(parsed) && parsed.some((g: Grade) => ['g7', 'g8', 'g9', 'grade-7', 'grade-8', 'grade-9'].includes(g.id))) {
      parsed = parsed.filter((g: Grade) => !['g7', 'g8', 'g9', 'grade-7', 'grade-8', 'grade-9'].includes(g.id));
      secureSet('school_grades', JSON.stringify(parsed));
  }
  return parsed;
}

export function saveGrades(grades: Grade[]): void {
  secureSet('school_grades', JSON.stringify(grades));
}

export function getSubjects(): Subject[] {
  const data = secureGet('school_subjects');
  if (!data) {
    secureSet('school_subjects', JSON.stringify(DEFAULT_SUBJECTS));
    return DEFAULT_SUBJECTS;
  }
  let parsed = JSON.parse(data);
  const demoSubIds = ['sub-eng', 'sub-mat', 'sub-sci', 'sub-kis', 'sub-hist', 'sub-math', 'sub-kisw', 'sub-sst'];
  if (Array.isArray(parsed) && parsed.some((s: Subject) => demoSubIds.includes(s.id))) {
    parsed = parsed.filter((s: Subject) => !demoSubIds.includes(s.id));
    secureSet('school_subjects', JSON.stringify(parsed));
  }
  return parsed;
}

export function saveSubjects(subjects: Subject[]): void {
  secureSet('school_subjects', JSON.stringify(subjects));
}

export function getLearners(): Learner[] {
  const data = secureGet('school_learners');
  if (!data) {
    return [];
  }
  let parsed = JSON.parse(data);
  if (!Array.isArray(parsed)) {
    return [];
  }

  // Explicitly remove demo learners by name/admNo or legacy demo IDs if any remaining
  const demoAdmNos = ['9101', '9102', '9103', '9104', '9105', '1001', '1002', '1003', '1004', '1005', '1006', '1007'];
  const demoIds = ['l_byron', 'l_alice', 'l_charles', 'l_david', 'l_emily', 'l_fiona', 'l_george'];
  
  const originalLength = parsed.length;
  parsed = parsed.filter((l: Learner) => 
    l && l.admNo && 
    !demoAdmNos.includes(l.admNo) && 
    !demoIds.includes(l.id) &&
    !(l.id.startsWith('l') && !l.id.startsWith('l_') && l.id.length < 5)
  );

  if (parsed.length !== originalLength) {
    secureSet('school_learners', JSON.stringify(parsed));
  }
  return parsed;
}

export function saveLearners(learners: Learner[]): void {
  secureSet('school_learners', JSON.stringify(learners));
}

export function getSubjectEnrollments(): Record<string, string[]> {
  const data = secureGet('subject_enrollments');
  if (!data) {
    secureSet('subject_enrollments', JSON.stringify(DEFAULT_ENROLLMENTS));
    return DEFAULT_ENROLLMENTS;
  }
  const parsed = JSON.parse(data);
  // Clear legacy enrollments that refer to old demo learner IDs starting with 'l1', 'l2', etc.
  const hasLegacy = Object.values(parsed).some((arr: any) => arr.some((id: string) => id.startsWith('l') && !id.startsWith('l_')));
  if (hasLegacy) {
    secureSet('subject_enrollments', JSON.stringify({}));
    return {};
  }
  return parsed;
}

export function saveSubjectEnrollments(enrollments: Record<string, string[]>): void {
  secureSet('subject_enrollments', JSON.stringify(enrollments));
}

export interface GradingRule {
  id: string;
  code: string;
  min: number;
  max: number;
  points: number;
  category: 'ee' | 'me' | 'ae' | 'be' | 'custom';
}

const DEFAULT_GRADING_RULES: GradingRule[] = [
  { id: 'gr1', code: 'EE1', min: 90, max: 100, points: 8, category: 'ee' },
  { id: 'gr2', code: 'EE2', min: 75, max: 89, points: 7, category: 'ee' },
  { id: 'gr3', code: 'ME1', min: 58, max: 74, points: 6, category: 'me' },
  { id: 'gr4', code: 'ME2', min: 41, max: 57, points: 5, category: 'me' },
  { id: 'gr5', code: 'AE1', min: 31, max: 40, points: 4, category: 'ae' },
  { id: 'gr6', code: 'AE2', min: 21, max: 30, points: 3, category: 'ae' },
  { id: 'gr7', code: 'BE1', min: 11, max: 20, points: 2, category: 'be' },
  { id: 'gr8', code: 'BE2', min: 0, max: 10, points: 1, category: 'be' }
];

export function getGradingRules(): GradingRule[] {
  const data = secureGet('school_grading_rules');
  if (!data) {
    secureSet('school_grading_rules', JSON.stringify(DEFAULT_GRADING_RULES));
    return DEFAULT_GRADING_RULES;
  }
  return JSON.parse(data);
}

export function saveGradingRules(rules: GradingRule[]): void {
  secureSet('school_grading_rules', JSON.stringify(rules));
}

export function getSubjectPapers(): SubjectPaper[] {
  const data = secureGet('school_subject_papers');
  return data ? JSON.parse(data) : [];
}

export function saveSubjectPapers(papers: SubjectPaper[]): void {
  secureSet('school_subject_papers', JSON.stringify(papers));
}

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  role: 'Super Admin' | 'Admin' | 'Subject Teacher' | 'Class Teacher' | 'Headteacher' | 'Senior Teacher' | 'Deputy Headteacher' | 'Parent';
  created: string;
  status: 'Active' | 'Inactive';
  password?: string;
  staffNo?: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  empDate?: string;
  designatedRole?: string;
  department?: string;
  systemRole?: 'super_admin' | 'admin' | 'teacher';
  adminOverride?: boolean;
  permissions?: string[];
  avatarUrl?: string;
}

const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'u1',
    username: 'otienobyron805@gmail.com',
    fullName: 'Byron Gondi',
    role: 'Super Admin',
    created: '2026-01-10',
    status: 'Active',
    password: '805679'
  }
];

export function getUsers(): UserAccount[] {
  const data = secureGet('school_users');
  if (!data) {
    secureSet('school_users', JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  let parsed: UserAccount[] = JSON.parse(data);
  
  // Clean up and update the default users' names to remove legacy demo/placeholder values
  parsed = parsed.map(u => {
    if (u.id === 'u1' || u.username === 'admin' || u.username === 'otienobyron805@gmail.com') {
      return { 
        ...u, 
        id: 'u1',
        username: 'otienobyron805@gmail.com',
        fullName: 'Byron Gondi',
        role: 'Super Admin',
        password: '805679'
      };
    }
    return u;
  });
  
  // Explicitly remove any John Kamau and Nancy Wambua users from existing records
  parsed = parsed.filter(u => 
    u.username !== 'john_kamau' && 
    u.fullName !== 'John Kamau' && 
    u.username !== 'teacher' && 
    u.fullName !== 'Nancy Wambua' &&
    u.username !== 'parents'
  );
  
  // Dedup and sanitize any duplicated IDs and usernames (such as legacy 'u3' entries)
  const uniqueUsers: UserAccount[] = [];
  const observedIds = new Set<string>();
  const observedUsernames = new Set<string>();
  
  for (const u of parsed) {
    if (!u.username) continue;
    const lowerUsername = u.username.toLowerCase().trim();
    if (observedUsernames.has(lowerUsername)) {
      continue;
    }
    
    let finalId = u.id;
    if (observedIds.has(finalId)) {
      finalId = `${u.id}_${Math.random().toString(36).substring(2, 7)}`;
    }
    
    observedIds.add(finalId);
    observedUsernames.add(lowerUsername);
    
    uniqueUsers.push({
      ...u,
      id: finalId,
      username: u.username.trim()
    });
  }

  secureSet('school_users', JSON.stringify(uniqueUsers));

  // If current active user was John Kamau, auto-switch them to the main admin (Byron Gondi)
  const current = getCurrentUser();
  if (current && (current.username === 'john_kamau' || current.fullName === 'John Kamau')) {
    const mainAdmin = uniqueUsers.find(u => u.username === 'otienobyron805@gmail.com') || DEFAULT_USERS[0];
    setCurrentUser(mainAdmin);
  } else if (current) {
    // Sync current active admin user attributes
    const isCurrentAdmin = current.role === 'Admin' || current.role === 'Super Admin';
    const matchedUser = uniqueUsers.find(u => u.username === current.username);
    if (matchedUser && (matchedUser.fullName !== current.fullName || matchedUser.username !== current.username || matchedUser.role !== current.role)) {
      setCurrentUser(matchedUser);
    }
  }

  return uniqueUsers;
}


export function saveUsers(users: UserAccount[]): void {
  secureSet('school_users', JSON.stringify(users));
}

export function getSubjectAssignments(): any[] {
  const data = secureGet('subject_assignments_list');
  return data ? JSON.parse(data) : [];
}

export function saveSubjectAssignments(assignments: any[]): void {
  secureSet('subject_assignments_list', JSON.stringify(assignments));
}

export function getClassTeacherAssignments(): any[] {
  const data = secureGet('class_teacher_assignments_list');
  return data ? JSON.parse(data) : [];
}

export function saveClassTeacherAssignments(assignments: any[]): void {
  secureSet('class_teacher_assignments_list', JSON.stringify(assignments));
}

export function getCurrentUser(): UserAccount | null {
  const data = secureGet('school_current_user');
  if (!data) return null;
  return JSON.parse(data);
}

export function setCurrentUser(user: UserAccount | null): void {
  if (user === null) {
    secureRemove('school_current_user');
  } else {
    secureSet('school_current_user', JSON.stringify(user));
  }
}

export interface SchoolProfile {
  name: string;
  code: string;
  regNumber: string;
  county: string;
  subCounty: string;
  ward: string;
  village: string;
  pobox: string;
  postalCode: string;
  location: string;
  ownership: string;
  level: string;
  genderCategory: string;
  accommodationType: string;
  landArea: string;
  email: string;
  mobileAdmin: string;
  mobileBursar: string;
  mobilePrincipal: string;
  officeTel: string;
  website: string;
  socials: string;
  bankName: string;
  bankAccount: string;
  mission: string;
  vision: string;
  motto: string;
  values: string;
  termDates: string;
  academicCalendar: string;
  principalName: string;
  appointmentDate: string;
  logoUrl?: string;
}

const DEFAULT_SCHOOL_PROFILE: SchoolProfile = {
  name: '',
  code: '',
  regNumber: '',
  county: '',
  subCounty: '',
  ward: '',
  village: '',
  pobox: '',
  postalCode: '',
  location: '',
  ownership: '',
  level: '',
  genderCategory: '',
  accommodationType: '',
  landArea: '',
  email: '',
  mobileAdmin: '',
  mobileBursar: '',
  mobilePrincipal: '',
  officeTel: '',
  website: '',
  socials: '',
  bankName: '',
  bankAccount: '',
  mission: '',
  vision: '',
  motto: '',
  values: '',
  termDates: '',
  academicCalendar: '',
  principalName: '',
  appointmentDate: '',
  logoUrl: ''
};

export function getSchoolProfile(): SchoolProfile {
  const data = secureGet('school_profile');
  if (!data) {
    secureSet('school_profile', JSON.stringify(DEFAULT_SCHOOL_PROFILE));
    return DEFAULT_SCHOOL_PROFILE;
  }
  const parsed = JSON.parse(data);
  if (parsed && (parsed.name === 'Elgon View Heights High School' || parsed.email === 'info@elgonviewheights.ac.ke')) {
    secureSet('school_profile', JSON.stringify(DEFAULT_SCHOOL_PROFILE));
    return DEFAULT_SCHOOL_PROFILE;
  }
  return parsed;
}

export function saveSchoolProfile(profile: SchoolProfile): void {
  secureSet('school_profile', JSON.stringify(profile));
}

export interface AttendanceSheet {
  date: string; // YYYY-MM-DD
  gradeId: string;
  streamId: string;
  records: Record<string, 'AM' | 'PM' | 'Full' | 'Absent'>; // learnerId -> status
  reasons?: Record<string, string>; // learnerId -> reason for absence
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId?: string;
  learnerId: string;
  text: string;
  senderRole: 'Parent' | 'Teacher';
  timestamp: string;
  read?: boolean;
}

export interface StaffAttendanceRecord {
  userId: string;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'On Leave';
  checkInTime?: string;
  checkOutTime?: string;
}

export interface StaffAttendanceSheet {
  date: string; // YYYY-MM-DD
  records: Record<string, StaffAttendanceRecord>; // userId -> StaffAttendanceRecord
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

export function getStaffAttendanceSheets(): StaffAttendanceSheet[] {
  const data = secureGet('school_staff_attendance_sheets');
  return data ? JSON.parse(data) : [];
}

export function saveStaffAttendanceSheets(sheets: StaffAttendanceSheet[]): void {
  secureSet('school_staff_attendance_sheets', JSON.stringify(sheets));
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface Term {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export function getHolidays(): Holiday[] {
  const data = secureGet('school_holidays');
  return data ? JSON.parse(data) : [];
}

export function saveHolidays(holidays: Holiday[]): void {
  secureSet('school_holidays', JSON.stringify(holidays));
}

export function getTerms(): Term[] {
  const data = secureGet('school_terms');
  return data ? JSON.parse(data) : [];
}

export function saveTerms(terms: Term[]): void {
  secureSet('school_terms', JSON.stringify(terms));
}

export function getMessages(): Message[] {
  const data = secureGet('school_messages');
  return data ? JSON.parse(data) : [];
}

export function saveMessages(messages: Message[]): void {
  secureSet('school_messages', JSON.stringify(messages));
}

export function getAttendanceSheets(): AttendanceSheet[] {
  const data = secureGet('school_attendance_sheets');
  return data ? JSON.parse(data) : [];
}

export function saveAttendanceSheets(sheets: AttendanceSheet[]): void {
  secureSet('school_attendance_sheets', JSON.stringify(sheets));
}

// Background sync helpers and Cloud SQL synchronization engine
function saveToBackend(table: string, data: any) {
  if (isBackendUnavailable) return;
  fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, data }),
  }).then(res => {
    if (res.status === 503) {
      isBackendUnavailable = true;
    }
  }).catch(() => {
    isBackendUnavailable = true;
  });
}

export async function pushLocalStorageToCloudSQL(): Promise<boolean> {
  try {
    console.log("Starting full push of local storage tables to Cloud SQL...");
    const getExamsLocal = () => {
      const d = secureGet('exams');
      return d ? JSON.parse(d) : [];
    };
    const getExamMarksLocal = () => {
      const d = secureGet('school_exam_marks');
      return d ? JSON.parse(d) : [];
    };

    const payloads = [
      { table: 'grades', data: getGrades() },
      { table: 'subjects', data: getSubjects() },
      { table: 'learners', data: getLearners() },
      { table: 'subject_enrollments', data: getSubjectEnrollments() },
      { table: 'grading_rules', data: getGradingRules() },
      { table: 'users', data: getUsers() },
      { table: 'subject_assignments', data: getSubjectAssignments() },
      { table: 'class_teacher_assignments', data: getClassTeacherAssignments() },
      { table: 'school_profile', data: getSchoolProfile() },
      { table: 'holidays', data: getHolidays() },
      { table: 'terms', data: getTerms() },
      { table: 'attendance_sheets', data: getAttendanceSheets() },
      { table: 'messages', data: getMessages() },
      { table: 'staff_attendance_sheets', data: getStaffAttendanceSheets() },
      { table: 'exams', data: getExamsLocal() },
      { table: 'school_exam_marks', data: getExamMarksLocal() },
      { table: 'subject_papers', data: getSubjectPapers() },
    ];

    for (const p of payloads) {
      if (p.data && (Array.isArray(p.data) ? p.data.length > 0 : Object.keys(p.data).length > 0)) {
        await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: p.table, data: p.data }),
        });
      }
    }
    console.log("Full push of local storage to Cloud SQL completed successfully.");
    return true;
  } catch (err) {
    console.error("Failed to push local storage to Cloud SQL:", err);
    return false;
  }
}

export async function synchronizeWithCloudSQL(): Promise<boolean> {
  try {
    // Check server health first to avoid "Failed to fetch" errors if server is down or unconfigured
    const healthRes = await fetch('/api/health').catch(() => null);
    if (!healthRes || !healthRes.ok) {
      console.warn("Backend server not responding or unconfigured. Operating in local mode.");
      return false;
    }
    
    const health = await healthRes.json().catch(() => null);
    if (!health || health.database === 'missing') {
      console.info("Database not configured on server. Operating in local-only mode.");
      return false;
    }

    const res = await fetch('/api/sync').catch(() => null);
    if (!res || !res.ok) {
      console.warn("Cloud SQL sync endpoint unreachable or returned non-ok status.");
      return false;
    }

    const json = await res.json().catch(() => null);
    if (json && json.success && json.data) {
      const d = json.data;

      // Enable the sync lock to prevent secureSet from calling saveToBackend
      isSyncingFromServer = true;

      const getExamsLocal = () => {
        const d_local = secureGet('exams');
        return d_local ? JSON.parse(d_local) : [];
      };
      const getExamMarksLocal = () => {
        const d_local = secureGet('school_exam_marks');
        return d_local ? JSON.parse(d_local) : [];
      };

      // Bidirectional sync helper per table
      const syncTable = async (
        tableName: string,
        cloudData: any,
        localDataGetter: () => any,
        storageKey: string
      ) => {
        const hasCloud = cloudData && (Array.isArray(cloudData) ? cloudData.length > 0 : Object.keys(cloudData).length > 0);
        const local = localDataGetter();
        const hasLocal = local && (Array.isArray(local) ? local.length > 0 : Object.keys(local).length > 0);

        if (hasCloud) {
          // Cloud has data: cache it to local storage
          secureSet(storageKey, JSON.stringify(cloudData));
        } else if (hasLocal) {
          // Cloud is empty for this table, but browser local storage has data: push to Cloud!
          console.log(`Cloud table '${tableName}' is empty, auto-pushing local data...`);
          await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: tableName, data: local }),
          }).catch(err => console.warn(`Failed auto-push for ${tableName}:`, err));
        }
      };

      await syncTable('grades', d.grades, getGrades, 'school_grades');
      await syncTable('subjects', d.subjects, getSubjects, 'school_subjects');
      await syncTable('learners', d.learners, getLearners, 'school_learners');
      await syncTable('grading_rules', d.gradingRules, getGradingRules, 'school_grading_rules');
      await syncTable('users', d.users, getUsers, 'school_users');
      await syncTable('holidays', d.holidays, getHolidays, 'school_holidays');
      await syncTable('terms', d.terms, getTerms, 'school_terms');
      await syncTable('attendance_sheets', d.attendanceSheets, getAttendanceSheets, 'school_attendance_sheets');
      await syncTable('messages', d.messages, getMessages, 'school_messages');
      await syncTable('staff_attendance_sheets', d.staffAttendanceSheets, getStaffAttendanceSheets, 'school_staff_attendance_sheets');
      await syncTable('school_profile', d.schoolProfile, getSchoolProfile, 'school_profile');
      await syncTable('subject_enrollments', d.subjectEnrollments, getSubjectEnrollments, 'subject_enrollments');
      await syncTable('subject_assignments', d.subjectAssignments, getSubjectAssignments, 'subject_assignments_list');
      await syncTable('class_teacher_assignments', d.classTeacherAssignments, getClassTeacherAssignments, 'class_teacher_assignments_list');
      await syncTable('exams', d.exams, getExamsLocal, 'exams');
      await syncTable('school_exam_marks', d.examMarks, getExamMarksLocal, 'school_exam_marks');
      await syncTable('subject_papers', d.subjectPapers, getSubjectPapers, 'school_subject_papers');

      // Disable the sync lock
      isSyncingFromServer = false;

      // Dispatch storage event so everything in the active view updates instantly
      window.dispatchEvent(new Event('storage'));
      return true;
    }
    return false;
  } catch (err) {
    isSyncingFromServer = false;
    console.warn("Cloud SQL sync not available:", err);
    return false;
  }
}

export interface GateLog {
  id: string;
  admNo: string;
  learnerId: string;
  logDate: string; // YYYY-MM-DD
  checkIn?: string; // HH:MM
  checkOut?: string; // HH:MM
  status: 'Checked In' | 'Checked Out' | 'Late' | 'Absent';
  location: string; // e.g. "Main School Gate"
  remarks?: string;
  markedBy: string;
  markedAt: string; // ISO
  ipAddress?: string;
}

export interface SystemSettings {
  lockTime: string; // default "19:00"
  saturdayStartTime: string; // default "09:00"
  schoolName: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export function getGateLogs(): GateLog[] {
  const data = secureGet('school_gate_logs');
  return data ? JSON.parse(data) : [];
}

export function saveGateLogs(logs: GateLog[]): void {
  secureSet('school_gate_logs', JSON.stringify(logs));
}

export function getSystemSettings(): SystemSettings {
  const data = secureGet('school_system_settings');
  if (!data) {
    const defaultSettings: SystemSettings = {
      lockTime: '19:00',
      saturdayStartTime: '09:00',
      schoolName: 'St Augustine School'
    };
    secureSet('school_system_settings', JSON.stringify(defaultSettings));
    return defaultSettings;
  }
  return JSON.parse(data);
}

export function saveSystemSettings(settings: SystemSettings): void {
  secureSet('school_system_settings', JSON.stringify(settings));
}

export function getAuditLogs(): AuditLog[] {
  const data = secureGet('school_audit_trail');
  return data ? JSON.parse(data) : [];
}

export function logAudit(userId: string, userName: string, action: string, details: string): void {
  const logs = getAuditLogs();
  const newAudit: AuditLog = {
    id: Math.random().toString(36).substring(2, 9),
    userId,
    userName,
    action,
    details,
    timestamp: new Date().toISOString(),
    ipAddress: '192.168.1.50'
  };
  secureSet('school_audit_trail', JSON.stringify([newAudit, ...logs].slice(0, 100)));
}

export function getActivityLogs(): ActivityEvent[] {
  const data = secureGet('school_activity_logs');
  return data ? JSON.parse(data) : [];
}

export function logActivity(type: ActivityEvent['type'], message: string, user: string) {
  const logs = getActivityLogs();
  const newLog: ActivityEvent = {
    id: Math.random().toString(36).substring(2, 9),
    type,
    message,
    timestamp: new Date().toISOString(),
    user
  };
  secureSet('school_activity_logs', JSON.stringify([newLog, ...logs].slice(0, 50)));
}

// --- FINANCE & FEE MANAGEMENT TYPES AND STORAGE ---
export interface FeeStructure {
  id: string;
  gradeLabel: string; // e.g., "Grade 1", "Grade 7"
  term: string; // "Term 1 2026"
  tuitionFee: number;
  activityFee: number;
  examFee: number;
  totalFee: number;
}

export interface FeePayment {
  id: string;
  studentId: string;
  studentName: string;
  admNo: string;
  grade: string;
  stream: string;
  amountPaid: number;
  paymentMethod: 'MPESA' | 'Bank Deposit' | 'Cash' | 'Cheque' | 'Direct Transfer';
  referenceNo: string;
  date: string; // YYYY-MM-DD
  term: string;
  recordedBy: string;
  remarks?: string;
}

const DEFAULT_FEE_STRUCTURES: FeeStructure[] = [
  { id: 'fs-g1', gradeLabel: 'Grade 1', term: 'Term 1 2026', tuitionFee: 12000, activityFee: 2500, examFee: 1500, totalFee: 16000 },
  { id: 'fs-g2', gradeLabel: 'Grade 2', term: 'Term 1 2026', tuitionFee: 12000, activityFee: 2500, examFee: 1500, totalFee: 16000 },
  { id: 'fs-g3', gradeLabel: 'Grade 3', term: 'Term 1 2026', tuitionFee: 12500, activityFee: 2500, examFee: 1500, totalFee: 16500 },
  { id: 'fs-g4', gradeLabel: 'Grade 4', term: 'Term 1 2026', tuitionFee: 14000, activityFee: 3000, examFee: 2000, totalFee: 19000 },
  { id: 'fs-g5', gradeLabel: 'Grade 5', term: 'Term 1 2026', tuitionFee: 14000, activityFee: 3000, examFee: 2000, totalFee: 19000 },
  { id: 'fs-g6', gradeLabel: 'Grade 6', term: 'Term 1 2026', tuitionFee: 15000, activityFee: 3000, examFee: 2000, totalFee: 20000 },
  { id: 'fs-g7', gradeLabel: 'Grade 7', term: 'Term 1 2026', tuitionFee: 18000, activityFee: 3500, examFee: 2500, totalFee: 24000 },
  { id: 'fs-g8', gradeLabel: 'Grade 8', term: 'Term 1 2026', tuitionFee: 18000, activityFee: 3500, examFee: 2500, totalFee: 24000 },
  { id: 'fs-g9', gradeLabel: 'Grade 9', term: 'Term 1 2026', tuitionFee: 20000, activityFee: 4000, examFee: 3000, totalFee: 27000 },
];

export function getFeeStructures(): FeeStructure[] {
  const data = secureGet('school_fee_structures');
  if (!data) {
    secureSet('school_fee_structures', JSON.stringify(DEFAULT_FEE_STRUCTURES));
    return DEFAULT_FEE_STRUCTURES;
  }
  return JSON.parse(data);
}

export function saveFeeStructures(structures: FeeStructure[]): void {
  secureSet('school_fee_structures', JSON.stringify(structures));
}

export function getFeePayments(): FeePayment[] {
  const data = secureGet('school_fee_payments');
  return data ? JSON.parse(data) : [];
}

export function saveFeePayments(payments: FeePayment[]): void {
  secureSet('school_fee_payments', JSON.stringify(payments));
  // Optionally sync to MongoDB
  syncCollectionToMongo('fee_payments', payments).catch(() => {});
}

// --- MONGODB CLIENT UTILITIES ---
export interface MongoStatusResponse {
  connected: boolean;
  message: string;
  dbName?: string;
  collectionsCount?: number;
}

export async function fetchMongoStatus(): Promise<MongoStatusResponse> {
  try {
    const res = await fetch('/api/mongo/status');
    return await res.json();
  } catch (err: any) {
    return { connected: false, message: err.message || 'Server connection failed' };
  }
}

export async function syncCollectionToMongo(collectionName: string, data: any): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/mongo/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionName, data }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Network request failed' };
  }
}

export async function fetchMongoCollections(): Promise<{ success: boolean; collections?: { name: string; count: number }[]; dbName?: string; error?: string }> {
  try {
    const res = await fetch('/api/mongo/collections');
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Network request failed' };
  }
}





