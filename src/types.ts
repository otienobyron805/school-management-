export interface ActivityEvent {
  id: string;
  type: 'learner_added' | 'learner_deleted' | 'attendance_finalized' | 'exam_created' | 'general_change' | 'bulk_delete';
  message: string;
  timestamp: string;
  user: string;
}

export interface RemedialSession {
  id: string;
  teacherId: string;
  teacherName: string;
  sessionType: 'Morning' | 'Evening';
  startTime: string; // e.g. "06:30"
  endTime: string;   // e.g. "07:30"
  days: string[];    // e.g. ["Monday", "Tuesday"]
}

export interface RemedialAttendanceLog {
  id: string;
  sessionId: string;
  teacherId: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  date: string;
}

export interface HandoverRequest {
  id: string;
  assignmentId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  status: 'Pending' | 'Approved' | 'Declined';
  timestamp: string;
  assignmentDay: string;
  assignmentShift: string;
}

export { COLORS } from './constants/colors';

