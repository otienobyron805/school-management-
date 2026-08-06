export interface ActivityEvent {
  id: string;
  type: 'learner_added' | 'attendance_finalized' | 'exam_created' | 'general_change';
  message: string;
  timestamp: string;
  user: string;
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

