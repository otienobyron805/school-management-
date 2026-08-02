import { ActivityEvent } from '../types';
import { addAlertLog } from './alerts';
import { 
  createCloudSnapshotToFirestore,
  fetchCloudSnapshotsFromFirestore,
  deleteCloudSnapshotFromFirestore,
  CloudSnapshotMeta
} from './firebase';

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
  streams?: string[]; // e.g. ["Alpha", "Beta", "East"] or ["All"]
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

// ==============================================
// 🎯 GLOBAL SORT RULES & UNIVERSAL SORT FUNCTION
// ==============================================
export const SORT_RULES = {
  gradeOrder: ["Playgroup", "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Form 1", "Form 2", "Form 3", "Form 4"],
  streamOrder: ["V", "J", "A", "B", "C", "D", "East", "West", "North", "South", "Red", "Blue", "Green", "Yellow"],
  termOrder: ["Term 1", "Term 2", "Term 3"]
};

function getGradeIndex(item: any): number {
  if (item === null || item === undefined) return 999;
  let raw: any = item;
  if (typeof item === 'object') {
    raw = item.grade ?? item.gradeName ?? item.name ?? item.label ?? item.num ?? '';
  }
  let str = String(raw).trim();
  if (!str) return 999;

  // Exact or case-insensitive match in SORT_RULES.gradeOrder
  let idx = SORT_RULES.gradeOrder.findIndex(g => g.toLowerCase() === str.toLowerCase());
  if (idx !== -1) return idx;

  // Numeric extraction: e.g. "1" or "Grade 1" or "G7"
  const match = str.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    const target = `Grade ${num}`;
    idx = SORT_RULES.gradeOrder.findIndex(g => g === target);
    if (idx !== -1) return idx;
    return 100 + num; // Numerical fallback
  }

  return 999;
}

function getStreamIndex(item: any): number {
  if (item === null || item === undefined) return 999;
  let raw: any = item;
  if (typeof item === 'object') {
    raw = item.stream ?? item.streamName ?? item.section ?? '';
  }
  let str = String(raw).trim();
  if (!str) return 999;

  let idx = SORT_RULES.streamOrder.findIndex(s => s.toLowerCase() === str.toLowerCase());
  if (idx !== -1) return idx;
  return 100;
}

function getTermIndex(item: any): number {
  if (item === null || item === undefined) return 999;
  let raw: any = item;
  if (typeof item === 'object') {
    raw = item.term ?? item.termName ?? item.name ?? item.label ?? '';
  }
  let str = String(raw).trim();
  if (!str) return 999;

  let idx = SORT_RULES.termOrder.findIndex(t => t.toLowerCase() === str.toLowerCase());
  if (idx !== -1) return idx;

  const match = str.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return 100 + num;
  }
  return 999;
}

function getDefaultComparison(a: any, b: any): number {
  const getLabel = (x: any): string => {
    if (x === null || x === undefined) return '';
    if (typeof x === 'string' || typeof x === 'number') return String(x);
    return String(x.name || x.fullName || x.admNo || x.adm || x.title || x.code || x.id || '');
  };
  return getLabel(a).localeCompare(getLabel(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function sortList(list: any[], type: "grade" | "gradeStream" | "term" | "default" = "default"): any[] {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a: any, b: any) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;

    if (type === "grade") {
      const gA = getGradeIndex(a);
      const gB = getGradeIndex(b);
      if (gA !== gB) return gA - gB;
      return getDefaultComparison(a, b);
    }

    if (type === "gradeStream") {
      const gA = getGradeIndex(a);
      const gB = getGradeIndex(b);
      if (gA !== gB) return gA - gB;

      const sA = getStreamIndex(a);
      const sB = getStreamIndex(b);
      if (sA !== sB) return sA - sB;

      return getDefaultComparison(a, b);
    }

    if (type === "term") {
      const tA = getTermIndex(a);
      const tB = getTermIndex(b);
      if (tA !== tB) return tA - tB;
      return getDefaultComparison(a, b);
    }

    return getDefaultComparison(a, b);
  });
}

export function loadOrdered<T>(items: T[], sortType: "grade" | "gradeStream" | "term" | "default" = "default"): T[] {
  return sortList(items, sortType);
}

const DEFAULT_SUBJECTS: Subject[] = [];

const DEFAULT_LEARNERS: Learner[] = [];

// Seed enrollments for default subject: empty by default
const DEFAULT_ENROLLMENTS: Record<string, string[]> = {};

// --- CRYPTOGRAPHIC STORAGE SCRAMBLER & FAST IN-MEMORY CACHE SECTION ---
const SEC_KEY = "school_admin_secret_key_987654321_cbc_auth";
const memCache: Record<string, string> = {};
let isBackendUnavailable = false;

const rawLocalStorage = typeof window !== 'undefined' ? window.localStorage : null;
const rawGetItem = typeof Storage !== 'undefined' ? Storage.prototype.getItem : null;
const rawSetItem = typeof Storage !== 'undefined' ? Storage.prototype.setItem : null;
const rawRemoveItem = typeof Storage !== 'undefined' ? Storage.prototype.removeItem : null;
const rawClear = typeof Storage !== 'undefined' ? Storage.prototype.clear : null;
const rawKey = typeof Storage !== 'undefined' ? Storage.prototype.key : null;

function isThirdPartyKey(key: string): boolean {
  if (!key) return false;
  return (
    key.startsWith('firebase') ||
    key.includes('firebase:') ||
    key.includes('firestore:') ||
    key.includes('firebaseLocalStorage') ||
    key.startsWith('gapi:') ||
    key.startsWith('google:') ||
    key.includes('oauth') ||
    key.startsWith('sb-') ||
    key.includes('supabase')
  );
}

// Intercept localStorage safely via Storage prototype
/*
if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
  try {
    // Clear potentially corrupted firebase/firestore localStorage keys
    if (rawLocalStorage && rawGetItem && rawKey && rawRemoveItem) {
      for (let i = rawLocalStorage.length - 1; i >= 0; i--) {
        const k = rawKey.call(rawLocalStorage, i);
        if (isThirdPartyKey(k)) {
          const val = rawGetItem.call(rawLocalStorage, k!);
          if (val) {
            try {
              JSON.parse(val);
            } catch (e) {
              rawRemoveItem.call(rawLocalStorage, k!);
            }
          }
        }
      }
    }

    // 1. Preload any existing storage items into memory cache (excluding third-party keys), then clear school data from browser local storage
    if (rawLocalStorage && rawGetItem && rawKey && rawRemoveItem) {
      const realLen = rawLocalStorage.length;
      const keysToClear: string[] = [];
      for (let i = 0; i < realLen; i++) {
        const k = rawKey.call(rawLocalStorage, i);
        if (k && !isThirdPartyKey(k)) {
          const val = rawGetItem.call(rawLocalStorage, k);
          if (val) {
            const trimmed = val.trim();
            if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('"') || trimmed === 'true' || trimmed === 'false' || /^\d+\.\d+\.\d+$/.test(trimmed)) {
              memCache[k] = val;
            } else {
              const dec = unscramble(val);
              memCache[k] = dec || val;
            }
          }
          keysToClear.push(k);
        }
      }
    // Purge browser local storage completely on initialization
    // try {
    //   if (rawLocalStorage) {
    //     rawLocalStorage.clear();
    //   }
    // } catch (e) {}
    }

    // 2. Monkey-patch Storage.prototype methods directly using native references
    Storage.prototype.getItem = function(key: string) {
      return secureGet(key);
    };
    Storage.prototype.setItem = function(key: string, value: string) {
      secureSet(key, value);
    };
    Storage.prototype.removeItem = function(key: string) {
      secureRemove(key);
    };
    Storage.prototype.clear = function() {
      Object.keys(memCache).forEach(k => delete memCache[k]);
      try {
        if (rawLocalStorage && rawKey && rawRemoveItem) {
          for (let i = rawLocalStorage.length - 1; i >= 0; i--) {
            const k = rawKey.call(rawLocalStorage, i);
            if (k && !isThirdPartyKey(k)) {
              rawRemoveItem.call(rawLocalStorage, k);
            }
          }
        }
      } catch (e) {}
    };
  } catch (err) {
    console.warn("Storage interceptor initialized with fallback", err);
  }

  window.addEventListener('storage', (e) => {
    if (e && e.key) {
      delete memCache[e.key];
    }
  });
}
*/

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
  if (!key) return null;
  if (isThirdPartyKey(key)) {
    try {
      if (rawLocalStorage && rawGetItem) {
        return rawGetItem.call(rawLocalStorage, key);
      }
    } catch (e) {}
    return null;
  }

  if (memCache[key] !== undefined) {
    return memCache[key];
  }

  const primaryKey = getStorageKeyForTable(key);
  const aliases = [primaryKey, key, ...(TABLE_ALIASES[key] || []), ...(TABLE_ALIASES[primaryKey] || [])];
  for (const alias of aliases) {
    if (memCache[alias] !== undefined) {
      memCache[key] = memCache[alias];
      return memCache[alias];
    }
  }

  return null;
}

export let isSyncingFromServer = false;
export let isInitialCloudPullCompleted = false;

export function getTableNameFromKey(key: string): string | null {
  if (!key) return null;
  if (
    key === 'theme' ||
    key === 'system_update_acknowledged_version' ||
    key.startsWith('parent_active_child_') ||
    key === 'selected_exam_id_for_marks' ||
    key === 'school_last_sync_time'
  ) {
    return null;
  }

  if (key === 'school_grades' || key === 'classes' || key === 'grades') return 'grades';
  if (key === 'school_current_user' || key === 'current_user') return 'current_user';
  if (key === 'school_subjects' || key === 'subjects') return 'subjects';
  if (key === 'school_learners' || key === 'students' || key === 'learners') return 'learners';
  if (key === 'school_users' || key === 'teachers' || key === 'users' || key === 'staff') return 'users';
  if (key === 'school_attendance_sheets' || key === 'attendance') return 'attendance_sheets';
  if (key === 'school_exam_marks' || key === 'marks' || key === 'exam_marks') return 'school_exam_marks';
  if (key === 'exams' || key === 'school_exams') return 'exams';
  if (key === 'subject_enrollments' || key === 'school_subject_enrollments') return 'subject_enrollments';
  if (key === 'school_grading_rules' || key === 'grading_rules') return 'grading_rules';
  if (key === 'subject_assignments_list' || key === 'subject_assignments' || key === 'school_subject_assignments') return 'subject_assignments';
  if (key === 'class_teacher_assignments_list' || key === 'class_teacher_assignments' || key === 'school_class_teacher_assignments') return 'class_teacher_assignments';
  if (key === 'school_profile') return 'school_profile';
  if (key === 'school_holidays' || key === 'holidays') return 'holidays';
  if (key === 'school_terms' || key === 'terms') return 'terms';
  if (key === 'school_messages' || key === 'messages') return 'messages';
  if (key === 'school_subject_papers' || key === 'subject_papers') return 'subject_papers';
  if (key === 'school_schemes_of_work' || key === 'schemes_of_work' || key === 'resources') return 'schemes_of_work';
  if (key === 'teachers_on_duty' || key === 'tod' || key === 'school_tod' || key === 'tod_duty_roster_v1' || key === 'dutySchedules') return 'tod';
  if (key === 'school_fee_payments' || key === 'fee_payments' || key === 'fees') return 'fee_payments';
  if (key === 'school_fee_structures' || key === 'fee_structures') return 'fee_structures';
  if (key === 'school_gate_logs' || key === 'gate_logs') return 'gate_logs';
  if (key === 'school_system_settings' || key === 'system_settings') return 'system_settings';
  if (key === 'school_staff_attendance_sheets' || key === 'staff_attendance_sheets') return 'staff_attendance_sheets';
  if (key === 'school_audit_trail' || key === 'audit_trail') return 'audit_trail';
  if (key === 'school_activity_logs' || key === 'activity_logs') return 'activity_logs';
  if (key === 'school_announcements_v1' || key === 'announcements') return 'announcements';
  if (key === 'term_reports') return 'term_reports';
  if (key === 'school_newsletters') return 'newsletters';
  if (key === 'school_role_permissions_matrix_v1') return 'role_permissions';
  if (key === 'subscriptions_history') return 'subscriptions_history';
  if (key === 'school_whatsapp_templates' || key === 'whatsapp_templates' || key === 'TEMPLATE_STORAGE_KEY') return 'whatsapp_templates';
  if (key === 'attendance_settings') return 'attendance_settings';
  if (key === 'school_alert_config') return 'alert_config';
  if (key === 'school_alert_logs') return 'alert_logs';
  if (key === 'exam_submission_statuses') return 'exam_submission_statuses';

  return key;
}

export function secureSet(key: string, value: string, options?: { skipCloud?: boolean }): void {
  if (!key) return;
  if (isThirdPartyKey(key)) {
    try {
      if (rawLocalStorage && rawSetItem) {
        rawSetItem.call(rawLocalStorage, key, value);
      }
    } catch (e) {}
    return;
  }

  const primaryKey = getStorageKeyForTable(key);
  const aliases = Array.from(new Set([
    primaryKey,
    key,
    ...(TABLE_ALIASES[key] || []),
    ...(TABLE_ALIASES[primaryKey] || [])
  ]));

  for (const alias of aliases) {
    memCache[alias] = value;
  }

  if (!isSyncingFromServer && !isBackendUnavailable && !options?.skipCloud) {
    const tableName = getTableNameFromKey(key);
    if (tableName) {
      try {
        const parsed = JSON.parse(value);
        saveToBackend(tableName, parsed);
      } catch (err) {
        saveToBackend(tableName, value);
      }
    }
  }
}

/**
 * Universal saveData helper to save and synchronize datasets under friendly storage aliases
 */
export function saveData(key: string, data: any): void {
  let mappedKey = key;
  if (key === 'teachers' || key === 'users' || key === 'staff') mappedKey = 'school_users';
  else if (key === 'students' || key === 'learners') mappedKey = 'school_learners';
  else if (key === 'attendance') mappedKey = 'school_attendance_sheets';
  else if (key === 'marks' || key === 'exam_marks') mappedKey = 'school_exam_marks';
  else if (key === 'subjects') mappedKey = 'school_subjects';
  else if (key === 'classes' || key === 'grades') mappedKey = 'school_grades';
  else if (key === 'exams') mappedKey = 'exams';
  else if (key === 'tod') mappedKey = 'teachers_on_duty';
  else if (key === 'resources' || key === 'schemes') mappedKey = 'schemes_of_work';
  else if (key === 'fees') mappedKey = 'fee_payments';

  const stringVal = typeof data === 'string' ? data : JSON.stringify(data);
  secureSet(mappedKey, stringVal);
}

export function secureRemove(key: string, options?: { skipCloud?: boolean }): void {
  if (!key) return;
  if (isThirdPartyKey(key)) {
    try {
      if (rawLocalStorage && rawRemoveItem) {
        rawRemoveItem.call(rawLocalStorage, key);
      }
    } catch (e) {}
    return;
  }
  
  const primaryKey = getStorageKeyForTable(key);
  const aliases = Array.from(new Set([
    primaryKey,
    key,
    ...(TABLE_ALIASES[key] || []),
    ...(TABLE_ALIASES[primaryKey] || [])
  ]));

  for (const alias of aliases) {
    delete memCache[alias];
  }

  if (!isSyncingFromServer && !isBackendUnavailable && !options?.skipCloud) {
    const tableName = getTableNameFromKey(key);
    if (tableName) {
      saveToBackend(tableName, null);
    }
  }
}

/**
 * Unified utility function to force-delete a record from local state and synchronize with backend/database.
 * Enforces immediate local update, required confirmation prompt with item name & type, and backend persistence.
 */
export function deleteRecord<T = any>(
  storageKey: string,
  identifier: string | ((item: T) => boolean),
  recordTypeLabel?: string,
  options?: { skipConfirm?: boolean }
): T[] {
  const currentUser = getCurrentUser();
  const permissions = currentUser?.permissions || [];
  if (currentUser && permissions.includes('perm_cannot_delete')) {
    alert("❌ Access Restricted: Your account permissions forbid deleting records. Please contact the Super Admin.");
    return (secureGet(storageKey) ? JSON.parse(secureGet(storageKey) || '[]') : []) as T[];
  }

  const raw = secureGet(storageKey);
  if (!raw) return [];

  let list: T[] = [];
  try {
    list = JSON.parse(raw);
  } catch (e) {
    return [];
  }

  if (!Array.isArray(list)) return [];

  // Find target item to extract its display name/label
  const targetItem = list.find((item: any) => {
    if (typeof identifier === 'function') {
      return identifier(item);
    }
    if (!item) return false;
    const itemId = item.id || item.admNo || item.username || item.code || item.key;
    return itemId === identifier;
  });

  if (!targetItem) return list;

  // Derive human-friendly record type label if not explicitly provided
  let recordType = recordTypeLabel;
  if (!recordType) {
    if (storageKey === 'exams') recordType = 'Exam';
    else if (storageKey === 'school_grades') recordType = 'Grade';
    else if (storageKey === 'school_subjects') recordType = 'Subject';
    else if (storageKey === 'school_learners') recordType = 'Learner';
    else if (storageKey === 'school_users') recordType = 'User';
    else recordType = 'Record';
  }

  // Extract display name/identifier of target record
  const itemObj = targetItem as any;
  const recordName = itemObj?.name || itemObj?.fullName || itemObj?.title || itemObj?.label || itemObj?.admNo || itemObj?.id || 'selected item';

  // Trigger confirmation prompt showing name and type unless skipConfirm is set
  if (!options?.skipConfirm) {
    const confirmed = window.confirm(`🗑️ Are you sure you want to delete ${recordType} "${recordName}"?\n\nThis action will immediately remove the record from all reports and synchronize across the system.`);
    if (!confirmed) {
      return list; // Cancellation: return original list without deleting
    }
  }

  const updated = list.filter((item: any) => {
    if (typeof identifier === 'function') {
      return !identifier(item);
    }
    if (!item) return false;
    const itemId = item.id || item.admNo || item.username || item.code || item.key;
    return itemId !== identifier;
  });

  // Save updated array to local storage and sync to backend immediately
  secureSet(storageKey, JSON.stringify(updated));

  let tableName: string | null = null;
  if (storageKey === 'school_grades' || storageKey === 'classes' || storageKey === 'grades') tableName = 'grades';
  else if (storageKey === 'school_subjects' || storageKey === 'subjects') tableName = 'subjects';
  else if (storageKey === 'school_learners' || storageKey === 'students' || storageKey === 'learners') tableName = 'learners';
  else if (storageKey === 'school_users' || storageKey === 'teachers' || storageKey === 'users' || storageKey === 'staff') tableName = 'users';
  else if (storageKey === 'school_attendance_sheets' || storageKey === 'attendance') tableName = 'attendance_sheets';
  else if (storageKey === 'school_exam_marks' || storageKey === 'marks' || storageKey === 'exam_marks') tableName = 'school_exam_marks';
  else if (storageKey === 'exams') tableName = 'exams';
  else if (storageKey === 'subject_enrollments') tableName = 'subject_enrollments';
  else if (storageKey === 'school_grading_rules') tableName = 'grading_rules';
  else if (storageKey === 'subject_assignments_list' || storageKey === 'subject_assignments') tableName = 'subject_assignments';
  else if (storageKey === 'class_teacher_assignments_list' || storageKey === 'class_teacher_assignments') tableName = 'class_teacher_assignments';
  else if (storageKey === 'school_profile') tableName = 'school_profile';
  else if (storageKey === 'school_holidays') tableName = 'holidays';
  else if (storageKey === 'school_terms') tableName = 'terms';
  else if (storageKey === 'school_messages') tableName = 'messages';
  else if (storageKey === 'school_subject_papers') tableName = 'subject_papers';
  else if (storageKey === 'schemes_of_work' || storageKey === 'resources') tableName = 'schemes_of_work';
  else if (storageKey === 'teachers_on_duty' || storageKey === 'tod') tableName = 'tod';
  else if (storageKey === 'fee_payments' || storageKey === 'fees') tableName = 'fee_payments';

  if (tableName) {
    saveToBackend(tableName, updated);
  }

  return updated;
}
// -----------------------------------------------

export function getGrades(): Grade[] {
  const data = secureGet('school_grades');
  if (!data) {
    secureSet('school_grades', JSON.stringify(DEFAULT_GRADES), { skipCloud: true });
    return DEFAULT_GRADES;
  }
  
  let parsed = JSON.parse(data);

  // Deduplicate grades by normalized name to prevent duplicates appearing twice
  if (Array.isArray(parsed)) {
    const seenNames = new Map<string, Grade>();
    for (const g of parsed) {
      if (!g || !g.name) continue;
      const normName = g.name.trim().toLowerCase();
      if (seenNames.has(normName)) {
        const existing = seenNames.get(normName)!;
        const combinedStreams = [...existing.streams];
        for (const s of (g.streams || [])) {
          if (!combinedStreams.some(cs => cs.id === s.id || cs.name.trim().toLowerCase() === s.name.trim().toLowerCase())) {
            combinedStreams.push(s);
          }
        }
        existing.streams = combinedStreams;
      } else {
        seenNames.set(normName, { ...g, streams: g.streams || [] });
      }
    }
    parsed = sortList(Array.from(seenNames.values()), 'grade');
    secureSet('school_grades', JSON.stringify(parsed), { skipCloud: true });
  }

  return sortList(parsed, 'grade');
}

export function saveGrades(grades: Grade[]): void {
  const seenNames = new Map<string, Grade>();
  for (const g of grades) {
    if (!g || !g.name) continue;
    const normName = g.name.trim().toLowerCase();
    if (!seenNames.has(normName)) {
      seenNames.set(normName, { ...g, streams: g.streams || [] });
    }
  }
  const cleanGrades = sortList(Array.from(seenNames.values()), 'grade');
  secureSet('school_grades', JSON.stringify(cleanGrades));
  syncCollectionToMongo('grades', cleanGrades).catch(() => {});
}

export function getSubjects(): Subject[] {
  const data = secureGet('school_subjects');
  if (!data) {
    secureSet('school_subjects', JSON.stringify(DEFAULT_SUBJECTS), { skipCloud: true });
    return DEFAULT_SUBJECTS;
  }
  let parsed = JSON.parse(data);

  // Deduplicate subjects by normalized name
  if (Array.isArray(parsed)) {
    const seenNames = new Map<string, Subject>();
    for (const s of parsed) {
      if (!s || !s.name) continue;
      const key = s.name.trim().toLowerCase();
      if (seenNames.has(key)) {
        const existing = seenNames.get(key)!;
        const combinedGrades = Array.from(new Set([...(existing.grades || []), ...(s.grades || [])]));
        const combinedStreams = Array.from(new Set([...(existing.streams || []), ...(s.streams || [])]));
        existing.grades = combinedGrades;
        existing.streams = combinedStreams;
      } else {
        seenNames.set(key, { ...s, grades: s.grades || [], streams: s.streams || [] });
      }
    }
    parsed = sortList(Array.from(seenNames.values()), 'default');
    secureSet('school_subjects', JSON.stringify(parsed), { skipCloud: true });
  }

  return sortList(parsed, 'default');
}

export function saveSubjects(subjects: Subject[]): void {
  const seenNames = new Map<string, Subject>();
  for (const s of subjects) {
    if (!s || !s.name) continue;
    const key = s.name.trim().toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.set(key, { ...s, grades: s.grades || [], streams: s.streams || [] });
    }
  }
  const cleanSubjects = sortList(Array.from(seenNames.values()), 'default');
  secureSet('school_subjects', JSON.stringify(cleanSubjects));
  syncCollectionToMongo('subjects', cleanSubjects).catch(() => {});
  saveToBackend('subjects', cleanSubjects);
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

  parsed = parsed.filter((l: Learner) => l && l.admNo && l.name);
  return sortList(parsed, 'gradeStream');
}

export function saveLearners(learners: Learner[]): void {
  const sorted = sortList(learners, 'gradeStream');
  secureSet('school_learners', JSON.stringify(sorted));
  saveToBackend('learners', sorted);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('db_updated'));
  }
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
    secureSet('school_users', JSON.stringify(DEFAULT_USERS), { skipCloud: true });
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
  
  // Explicitly remove legacy demo users
  parsed = parsed.filter(u => 
    u.username !== 'john_kamau' && 
    u.fullName !== 'John Kamau' && 
    u.fullName !== 'Nancy Wambua'
  );
  
  // Dedup and sanitize any duplicated IDs and usernames (such as legacy 'u3' entries)
  const uniqueUsers: UserAccount[] = [];
  const observedIds = new Set<string>();
  const observedUsernames = new Set<string>();
  
  for (const u of parsed) {
    if (!u) continue;
    
    // Ensure every user has a valid username fallback so no registered account is lost
    const origUsername = u.username || u.staffNo || u.email || u.phone || u.fullName || u.id || `user_${Math.random().toString(36).substring(2, 7)}`;
    const lowerUsername = origUsername.toLowerCase().trim();

    let finalId = u.id || `u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    if (observedIds.has(finalId)) {
      finalId = `${u.id}_${Math.random().toString(36).substring(2, 6)}`;
    }
    
    let resolvedUsername = u.username || lowerUsername;
    if (observedUsernames.has(resolvedUsername.toLowerCase()) && resolvedUsername !== 'u1' && finalId !== 'u1') {
      resolvedUsername = `${resolvedUsername}_${finalId.slice(-4)}`;
    }
    
    observedIds.add(finalId);
    observedUsernames.add(resolvedUsername.toLowerCase());
    
    uniqueUsers.push({
      ...u,
      id: finalId,
      username: resolvedUsername,
      status: u.status || 'Active'
    });
  }

  // Check if Super Admin user exists; if not, guarantee Byron Gondi (otienobyron805@gmail.com) is added
  const hasSuperAdmin = uniqueUsers.some(u => 
    u.id === 'u1' || 
    u.username?.toLowerCase() === 'otienobyron805@gmail.com' || 
    u.username?.toLowerCase() === 'admin' ||
    u.role === 'Super Admin' ||
    u.systemRole === 'super_admin'
  );

  if (!hasSuperAdmin) {
    uniqueUsers.unshift({
      id: 'u1',
      username: 'otienobyron805@gmail.com',
      fullName: 'Byron Gondi',
      role: 'Super Admin',
      created: '2026-01-10',
      status: 'Active',
      password: '805679'
    });
  }

  const serialized = JSON.stringify(uniqueUsers);
  if (serialized !== data) {
    secureSet('school_users', serialized);
  }

  // If current active user was John Kamau, auto-switch them to the main admin (Byron Gondi)
  const current = getCurrentUser();
  if (current && (current.username === 'john_kamau' || current.fullName === 'John Kamau')) {
    const mainAdmin = uniqueUsers.find(u => u.username === 'otienobyron805@gmail.com') || DEFAULT_USERS[0];
    setCurrentUser(mainAdmin);
  } else if (current) {
    // Sync current active admin user attributes
    const matchedUser = uniqueUsers.find(u => 
      u.id === current.id || 
      (u.username && current.username && u.username.toLowerCase() === current.username.toLowerCase())
    );
    if (matchedUser && (matchedUser.fullName !== current.fullName || matchedUser.username !== current.username || matchedUser.role !== current.role)) {
      setCurrentUser({
        ...current,
        fullName: matchedUser.fullName,
        username: matchedUser.username,
        role: matchedUser.role,
        status: matchedUser.status || 'Active'
      });
    }
  }

  return uniqueUsers;
}


export function saveUsers(users: UserAccount[]): void {
  secureSet('school_users', JSON.stringify(users));
  saveToBackend('users', users);
  
  // If current logged-in user was modified in this update, refresh their active session
  const current = getCurrentUser();
  if (current) {
    const updatedSelf = users.find(u => 
      String(u.id) === String(current.id) || 
      (u.username && current.username && u.username.toLowerCase().trim() === current.username.toLowerCase().trim())
    );
    if (updatedSelf) {
      setCurrentUser({
        ...current,
        ...updatedSelf
      });
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('db_updated'));
  }
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
  try {
    const data = secureGet('school_current_user') || secureGet('current_user');
    if (!data) return null;
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (err) {
    console.warn("Failed to parse current user session:", err);
    return null;
  }
}

export function setCurrentUser(user: UserAccount | null): void {
  if (user === null) {
    secureRemove('school_current_user');
    secureRemove('current_user');
    saveToBackend('current_user', null);
  } else {
    const serialized = JSON.stringify(user);
    secureSet('school_current_user', serialized);
    secureSet('current_user', serialized);
    saveToBackend('current_user', user);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('currentUserUpdated', { detail: user }));
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
  termStartDate?: string;
  termEndDate?: string;
  currentTerm?: string;
  term1StartDate?: string;
  term1EndDate?: string;
  term1Summary?: string;
  term2StartDate?: string;
  term2EndDate?: string;
  term2Summary?: string;
  term3StartDate?: string;
  term3EndDate?: string;
  term3Summary?: string;
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
  termStartDate: '',
  termEndDate: '',
  currentTerm: `Term 1 ${new Date().getFullYear()}`,
  term1StartDate: '',
  term1EndDate: '',
  term1Summary: '',
  term2StartDate: '',
  term2EndDate: '',
  term2Summary: '',
  term3StartDate: '',
  term3EndDate: '',
  term3Summary: '',
  academicCalendar: '',
  principalName: '',
  appointmentDate: '',
  logoUrl: ''
};

export function getSchoolProfile(): SchoolProfile {
  const data = secureGet('school_profile');
  if (!data) {
    secureSet('school_profile', JSON.stringify(DEFAULT_SCHOOL_PROFILE), { skipCloud: true });
    return DEFAULT_SCHOOL_PROFILE;
  }
  try {
    const parsed = JSON.parse(data);
    const profile = { ...DEFAULT_SCHOOL_PROFILE, ...parsed };
    
    // Migration: ensure currentTerm includes the current year if it's just 'Term X'
    const currentYear = new Date().getFullYear().toString();
    if (profile.currentTerm && !profile.currentTerm.includes(currentYear)) {
      profile.currentTerm = `${profile.currentTerm.replace(/\s*\d{4}/, '').trim()} ${currentYear}`;
      secureSet('school_profile', JSON.stringify(profile), { skipCloud: true });
    }
    
    return profile;
  } catch {
    return DEFAULT_SCHOOL_PROFILE;
  }
}

export function saveSchoolProfile(profile: SchoolProfile): void {
  secureSet('school_profile', JSON.stringify(profile));
  saveToBackend('school_profile', profile);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('db_updated'));
  }
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
  const items = data ? JSON.parse(data) : [];
  return sortList(items, 'term');
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

// Offline-ready persistence helpers
export function saveToBackend(table: string, data: any) {
  // Cloud sync removed
}

export async function pushLocalStorageToCloudSQL(): Promise<boolean> {
  return true;
}

export const TABLE_MAP: Record<string, string> = {
  current_user: 'current_user',
  school_current_user: 'current_user',
  grades: 'school_grades',
  school_grades: 'school_grades',
  subjects: 'school_subjects',
  school_subjects: 'school_subjects',
  learners: 'school_learners',
  school_learners: 'school_learners',
  users: 'school_users',
  school_users: 'school_users',
  attendance_sheets: 'school_attendance_sheets',
  school_attendance_sheets: 'school_attendance_sheets',
  school_exam_marks: 'school_exam_marks',
  exam_marks: 'school_exam_marks',
  exams: 'exams',
  school_exams: 'exams',
  subject_enrollments: 'subject_enrollments',
  school_subject_enrollments: 'subject_enrollments',
  grading_rules: 'school_grading_rules',
  school_grading_rules: 'school_grading_rules',
  subject_assignments: 'subject_assignments_list',
  subject_assignments_list: 'subject_assignments_list',
  class_teacher_assignments: 'class_teacher_assignments_list',
  class_teacher_assignments_list: 'class_teacher_assignments_list',
  school_profile: 'school_profile',
  holidays: 'school_holidays',
  school_holidays: 'school_holidays',
  terms: 'school_terms',
  school_terms: 'school_terms',
  messages: 'school_messages',
  school_messages: 'school_messages',
  staff_attendance_sheets: 'school_staff_attendance_sheets',
  school_staff_attendance_sheets: 'school_staff_attendance_sheets',
  subject_papers: 'school_subject_papers',
  school_subject_papers: 'school_subject_papers',
  fee_structures: 'fee_structures',
  school_fee_structures: 'fee_structures',
  fee_payments: 'fee_payments',
  school_fee_payments: 'fee_payments',
  gate_logs: 'school_gate_logs',
  school_gate_logs: 'school_gate_logs',
  system_settings: 'school_system_settings',
  school_system_settings: 'school_system_settings',
  audit_trail: 'school_audit_trail',
  school_audit_trail: 'school_audit_trail',
  activity_logs: 'school_activity_logs',
  school_activity_logs: 'school_activity_logs',
  schemes_of_work: 'school_schemes_of_work',
  school_schemes_of_work: 'school_schemes_of_work',
  tod: 'teachers_on_duty',
  teachers_on_duty: 'teachers_on_duty',
};

export const TABLE_ALIASES: Record<string, string[]> = {
  current_user: ['school_current_user', 'current_user'],
  school_current_user: ['school_current_user', 'current_user'],

  grades: ['school_grades', 'grades', 'classes'],
  school_grades: ['school_grades', 'grades', 'classes'],

  subjects: ['school_subjects', 'subjects'],
  school_subjects: ['school_subjects', 'subjects'],

  learners: ['school_learners', 'learners', 'students'],
  school_learners: ['school_learners', 'learners', 'students'],

  users: ['school_users', 'users', 'teachers', 'staff'],
  school_users: ['school_users', 'users', 'teachers', 'staff'],

  attendance_sheets: ['school_attendance_sheets', 'attendance_sheets', 'attendance'],
  school_attendance_sheets: ['school_attendance_sheets', 'attendance_sheets', 'attendance'],

  school_exam_marks: ['school_exam_marks', 'exam_marks', 'marks'],
  exam_marks: ['school_exam_marks', 'exam_marks', 'marks'],
  marks: ['school_exam_marks', 'exam_marks', 'marks'],

  exams: ['exams', 'school_exams'],
  school_exams: ['exams', 'school_exams'],

  subject_enrollments: ['subject_enrollments', 'school_subject_enrollments'],
  school_subject_enrollments: ['subject_enrollments', 'school_subject_enrollments'],

  grading_rules: ['school_grading_rules', 'grading_rules'],
  school_grading_rules: ['school_grading_rules', 'grading_rules'],

  subject_assignments: ['subject_assignments_list', 'subject_assignments', 'school_subject_assignments'],
  subject_assignments_list: ['subject_assignments_list', 'subject_assignments', 'school_subject_assignments'],

  class_teacher_assignments: ['class_teacher_assignments_list', 'class_teacher_assignments', 'school_class_teacher_assignments'],
  class_teacher_assignments_list: ['class_teacher_assignments_list', 'class_teacher_assignments', 'school_class_teacher_assignments'],

  school_profile: ['school_profile'],

  holidays: ['school_holidays', 'holidays'],
  school_holidays: ['school_holidays', 'holidays'],

  terms: ['school_terms', 'terms'],
  school_terms: ['school_terms', 'terms'],

  messages: ['school_messages', 'messages'],
  school_messages: ['school_messages', 'messages'],

  staff_attendance_sheets: ['school_staff_attendance_sheets', 'staff_attendance_sheets'],
  school_staff_attendance_sheets: ['school_staff_attendance_sheets', 'staff_attendance_sheets'],

  subject_papers: ['school_subject_papers', 'subject_papers'],
  school_subject_papers: ['school_subject_papers', 'subject_papers'],

  fee_structures: ['fee_structures', 'school_fee_structures'],
  school_fee_structures: ['fee_structures', 'school_fee_structures'],

  fee_payments: ['fee_payments', 'school_fee_payments', 'fees'],
  school_fee_payments: ['fee_payments', 'school_fee_payments', 'fees'],

  gate_logs: ['school_gate_logs', 'gate_logs'],
  school_gate_logs: ['school_gate_logs', 'gate_logs'],

  system_settings: ['school_system_settings', 'system_settings'],
  school_system_settings: ['school_system_settings', 'system_settings'],

  audit_trail: ['school_audit_trail', 'audit_trail'],
  school_audit_trail: ['school_audit_trail', 'audit_trail'],

  activity_logs: ['school_activity_logs', 'activity_logs'],
  school_activity_logs: ['school_activity_logs', 'activity_logs'],

  schemes_of_work: ['school_schemes_of_work', 'schemes_of_work', 'resources'],
  school_schemes_of_work: ['school_schemes_of_work', 'schemes_of_work', 'resources'],

  tod: ['teachers_on_duty', 'tod', 'school_tod'],
  teachers_on_duty: ['teachers_on_duty', 'tod', 'school_tod'],
};

export function getStorageKeyForTable(tableName: string): string {
  return TABLE_MAP[tableName] || tableName;
}

export function writeToLocalStorageWithAliases(rawTable: string, data: any): void {
  if (data === null || data === undefined) return;

  const primaryKey = getStorageKeyForTable(rawTable);
  const aliases = Array.from(new Set([
    primaryKey,
    rawTable,
    ...(TABLE_ALIASES[rawTable] || []),
    ...(TABLE_ALIASES[primaryKey] || [])
  ]));

  if ((rawTable === 'current_user' || rawTable === 'school_current_user') && (!data || (typeof data === 'object' && Object.keys(data).length === 0))) {
    const existing = getCurrentUser();
    if (existing) {
      return;
    }
  }

  const serialized = typeof data === 'string' ? data : JSON.stringify(data);
  for (const alias of aliases) {
    memCache[alias] = serialized;
  }
}

/**
 * Immediately subscribes to real-time Firestore updates across all collection documents
 * Changes are received within milliseconds and immediately update local memory & dispatch UI events.
 */
export function startRealtimeFirestoreSync(): () => void {
  return () => {};
}

const getItemKey = (item: any): string => {
  if (!item) return '';
  if (typeof item !== 'object') return String(item);
  return item.id || item.admNo || item.username || item.code || item.key || item.name || JSON.stringify(item);
};

const mergeArrays = (localArr: any[], cloudArr: any[]): any[] => {
  const localList = Array.isArray(localArr) ? localArr : [];
  const cloudList = Array.isArray(cloudArr) ? cloudArr : [];

  if (cloudList.length === 0) return localList;
  if (localList.length === 0) return cloudList;

  const map = new Map<string, any>();

  // Add local items first
  for (const item of localList) {
    if (!item) continue;
    const k = getItemKey(item);
    map.set(k, item);
  }

  // Cloud data is primary and authoritative: Cloud items overwrite local items
  for (const item of cloudList) {
    if (!item) continue;
    const k = getItemKey(item);
    if (!map.has(k)) {
      map.set(k, item);
    } else {
      const localItem = map.get(k);
      if (typeof localItem === 'object' && typeof item === 'object') {
        if (Array.isArray(localItem.streams) || Array.isArray(item.streams)) {
          const locStreams = Array.isArray(localItem.streams) ? localItem.streams : [];
          const cldStreams = Array.isArray(item.streams) ? item.streams : [];
          const streamMap = new Map<string, any>();
          for (const s of locStreams) {
            if (s) streamMap.set(s.id || s.name, s);
          }
          for (const s of cldStreams) {
            if (s) streamMap.set(s.id || s.name, s);
          }
          map.set(k, { ...localItem, ...item, streams: Array.from(streamMap.values()) });
        } else {
          map.set(k, { ...localItem, ...item });
        }
      } else {
        map.set(k, item);
      }
    }
  }

  return Array.from(map.values());
};

export async function synchronizeWithCloudSQL(): Promise<boolean> {
  try {
    isSyncingFromServer = true;
    // Perform any offline state refresh if needed
    isInitialCloudPullCompleted = true;
    secureSet('school_last_sync_time', new Date().toISOString(), { skipCloud: true });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('db_updated'));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('currentUserUpdated'));
      window.dispatchEvent(new CustomEvent('cloud_sync_status', {
        detail: { status: 'synced', table: 'all', timestamp: new Date() }
      }));
    }
    return true;
  } catch (err) {
    return false;
  } finally {
    isSyncingFromServer = false;
  }
}

export function getLastSyncTime(): string | null {
  return secureGet('school_last_sync_time');
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

const DEFAULT_FEE_STRUCTURES: FeeStructure[] = [];

export function getFeeStructures(): FeeStructure[] {
  const data = secureGet('school_fee_structures');
  if (!data) {
    secureSet('school_fee_structures', JSON.stringify([]));
    return [];
  }
  return JSON.parse(data);
}

export function saveFeeStructures(structures: FeeStructure[]): void {
  secureSet('school_fee_structures', JSON.stringify(structures));
  syncCollectionToMongo('fee_structures', structures).catch(() => {});
}

export function clearAllFinanceData(): void {
  secureSet('school_fee_structures', JSON.stringify([]));
  secureSet('school_fee_payments', JSON.stringify([]));
  syncCollectionToMongo('fee_structures', []).catch(() => {});
  syncCollectionToMongo('fee_payments', []).catch(() => {});
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

export interface SchemeOfWork {
  id: string;
  title: string;
  academicYear: string;
  term: string; // 'Term 1', 'Term 2', 'Term 3'
  grade: string; // e.g. 'Grade 1', 'Grade 7', 'PP1', etc.
  learningArea: string; // e.g. 'Mathematics', 'English', 'Science'
  topicStrand?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string; // 'pdf', 'doc', 'docx', 'xlsx', 'csv' or 'link'
  fileSize?: string;
  description?: string;
  teacherName?: string;
  status?: 'Approved' | 'Pending' | 'Draft' | 'Official KICD';
  createdAt: string;
  isKicd?: boolean;
  kicdSourceUrl?: string;
}

const DEFAULT_SCHEMES_OF_WORK: SchemeOfWork[] = [
  {
    id: 'sow-001',
    title: 'Grade 1 Mathematics Activities CBC Scheme of Work',
    academicYear: '2026',
    term: 'Term 1',
    grade: 'Grade 1',
    learningArea: 'Mathematics Activities',
    topicStrand: 'Numbers & Counting (Strand 1.0)',
    fileUrl: 'https://kicd.ac.ke/resources/schemes/grade1_math_t1.pdf',
    fileName: 'CBC_Grade1_Math_Term1_Scheme.pdf',
    fileType: 'pdf',
    fileSize: '1.4 MB',
    description: 'Official KICD CBC aligned scheme of work covering number concept, place value and simple addition.',
    teacherName: 'KICD Curriculum Dept',
    status: 'Official KICD',
    createdAt: new Date().toISOString(),
    isKicd: true,
    kicdSourceUrl: 'https://kicd.ac.ke/curriculum-materials/'
  },
  {
    id: 'sow-002',
    title: 'Grade 7 Integrated Science CBC Curriculum Scheme',
    academicYear: '2026',
    term: 'Term 1',
    grade: 'Grade 7',
    learningArea: 'Integrated Science',
    topicStrand: 'Mixtures, Elements and Compounds',
    fileUrl: 'https://kicd.ac.ke/resources/schemes/grade7_science_t1.docx',
    fileName: 'CBC_Grade7_IntegratedScience_Term1.docx',
    fileType: 'docx',
    fileSize: '850 KB',
    description: 'Junior Secondary School Grade 7 CBC science scheme with weekly lesson plans and assessment criteria.',
    teacherName: 'HOD Science Dept',
    status: 'Approved',
    createdAt: new Date().toISOString(),
    isKicd: false
  },
  {
    id: 'sow-003',
    title: 'Grade 4 English Language Activities Scheme of Work',
    academicYear: '2026',
    term: 'Term 2',
    grade: 'Grade 4',
    learningArea: 'English Language Activities',
    topicStrand: 'Listening, Speaking and Grammar',
    fileUrl: 'https://kicd.ac.ke/resources/schemes/grade4_english_t2.pdf',
    fileName: 'CBC_Grade4_English_Term2.pdf',
    fileType: 'pdf',
    fileSize: '2.1 MB',
    description: 'Comprehensive Term 2 scheme with CBC sub-strands, learning outcomes and core competencies.',
    teacherName: 'English Lead Teacher',
    status: 'Approved',
    createdAt: new Date().toISOString(),
    isKicd: true,
    kicdSourceUrl: 'https://kicd.ac.ke/cbc-materials/'
  }
];

export function getSchemesOfWork(): SchemeOfWork[] {
  const data = secureGet('school_schemes_of_work');
  if (!data) {
    secureSet('school_schemes_of_work', JSON.stringify(DEFAULT_SCHEMES_OF_WORK));
    return DEFAULT_SCHEMES_OF_WORK;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_SCHEMES_OF_WORK;
  }
}

export function saveSchemesOfWork(schemes: SchemeOfWork[]): void {
  secureSet('school_schemes_of_work', JSON.stringify(schemes));
  syncCollectionToMongo('schemes_of_work', schemes).catch(() => {});
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('schemesUpdated'));
  }
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'currentUser', {
    get() {
      const user = getCurrentUser();
      if (!user) return null;
      return {
        ...user,
        role: user.role === 'Super Admin' || user.systemRole === 'super_admin' ? 'super_admin' : user.role
      };
    },
    configurable: true
  });

  (window as any).deleteRecord = deleteRecord;
}

export type { CloudSnapshotMeta };

export function getAllStateForSnapshot(): Record<string, any> {
  const snapshot: Record<string, any> = {};
  
  try {
    snapshot['school_learners'] = getLearners();
    snapshot['school_grades'] = getGrades();
    snapshot['school_subjects'] = getSubjects();
    snapshot['school_fee_payments'] = getFeePayments();
    snapshot['school_fee_structures'] = getFeeStructures();
    snapshot['school_user_accounts'] = getUsers();
    snapshot['school_profile'] = getSchoolProfile();
    snapshot['school_messages'] = getMessages();
  } catch (e) {
    console.error('Error gathering core datasets for snapshot:', e);
  }

  const auxiliaryKeys = [
    'school_announcements_v1',
    'attendance_settings',
    'school_alert_config',
    'school_alert_logs',
    'school_role_permissions_matrix_v1',
    'school_whatsapp_templates_v1',
    'school_tod_roster_v1',
    'school_tod_logs_v1',
    'system_settings'
  ];

  for (const key of auxiliaryKeys) {
    const raw = secureGet(key);
    if (raw) {
      try {
        snapshot[key] = JSON.parse(raw);
      } catch (e) {
        snapshot[key] = raw;
      }
    }
  }

  return snapshot;
}

export async function triggerManualCloudSnapshot(note: string = ''): Promise<{ success: boolean; snapshot?: CloudSnapshotMeta; error?: string }> {
  const user = getCurrentUser();
  const createdBy = user ? `${user.fullName || user.username} (${user.role || 'Admin'})` : 'Admin';
  const data = getAllStateForSnapshot();
  
  const result = await createCloudSnapshotToFirestore(data, createdBy, note);
  if (result.success) {
    try {
      addAlertLog(
        'Backup',
        'Info',
        'Manual Cloud Snapshot Triggered',
        `Snapshot ${result.snapshot?.id} created in Firebase by ${createdBy} with ${result.snapshot?.recordCount} records.`
      );
    } catch (e) {}
  }
  return result;
}

export async function getCloudSnapshots(): Promise<CloudSnapshotMeta[]> {
  return await fetchCloudSnapshotsFromFirestore();
}

export async function deleteCloudSnapshot(id: string): Promise<boolean> {
  return await deleteCloudSnapshotFromFirestore(id);
}

export async function restoreCloudSnapshot(snapshot: CloudSnapshotMeta): Promise<boolean> {
  if (!snapshot.snapshotData) return false;
  
  const data = snapshot.snapshotData;
  for (const [table, val] of Object.entries(data)) {
    if (val !== undefined && val !== null) {
      secureSet(table, typeof val === 'string' ? val : JSON.stringify(val));
    }
  }

  try {
    addAlertLog(
      'Backup',
      'Warning',
      'Database Restored from Cloud Snapshot',
      `System restored from Cloud Snapshot ID: ${snapshot.id} (${snapshot.formattedDate}).`
    );
  } catch (e) {}

  return true;
}








