export interface ActivityEvent {
  id: string;
  type: 'learner_added' | 'attendance_finalized' | 'exam_created';
  message: string;
  timestamp: string;
  user: string;
}

export { COLORS } from './constants/colors';

