import { secureGet, secureSet } from './db';

export interface AttendanceSettings {
  checkInStart: string;
  lateThreshold: string;
  checkOutTime: string;
  latitude: string;
  longitude: string;
  timezone: string;
  radius: string;
  checkInOpeningOffset: number;
  checkInAllowance: number;
  restrictLateCheckIn?: boolean;
}

const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  checkInStart: '07:00',
  lateThreshold: '08:00',
  checkOutTime: '16:30',
  latitude: '',
  longitude: '',
  timezone: '',
  radius: '',
  checkInOpeningOffset: 2,
  checkInAllowance: 5,
  restrictLateCheckIn: true,
};

export function getAttendanceSettings(): AttendanceSettings {
  const data = secureGet('attendance_settings');
  return data ? JSON.parse(data) : DEFAULT_ATTENDANCE_SETTINGS;
}

export function saveAttendanceSettings(settings: AttendanceSettings): void {
  secureSet('attendance_settings', JSON.stringify(settings));
}

/**
 * Global rule for attendance percentage calculation:
 * - Returns "—" if total is 0
 * - Returns "Pending" if present is 0
 * - Returns formatted percentage string otherwise
 */
export function calculateAttendancePercent(present: number, total: number): { percent: number; label: string; color: string; isPending: boolean; isEmpty: boolean } {
  if (total === 0) {
    return { percent: 0, label: '—', color: '#94a3b8', isPending: false, isEmpty: true };
  }
  if (present === 0) {
    return { percent: 0, label: 'Pending', color: '#94a3b8', isPending: true, isEmpty: false };
  }
  const pct = Number(((present / total) * 100).toFixed(1));
  let color = "#22c55e";
  if (pct < 80) color = "#f59e0b";
  if (pct < 50) color = "#ef4444";
  return { percent: pct, label: `${pct}%`, color, isPending: false, isEmpty: false };
}

if (typeof window !== 'undefined') {
  (window as any).calculateAttendancePercent = function(present: number, total: number) {
    if (total === 0) return '<span style="color:#94a3b8;">—</span>';
    if (present === 0) return '<span style="color:#94a3b8; font-style:italic;">Pending</span>';
    
    const percent = ((present / total) * 100).toFixed(1);
    let color = "#22c55e";
    if (parseFloat(percent) < 80) color = "#f59e0b";
    if (parseFloat(percent) < 50) color = "#ef4444";
    return `<strong style="color:${color}">${percent}%</strong>`;
  };
}
