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
  const data = localStorage.getItem('attendance_settings');
  return data ? JSON.parse(data) : DEFAULT_ATTENDANCE_SETTINGS;
}

export function saveAttendanceSettings(settings: AttendanceSettings): void {
  localStorage.setItem('attendance_settings', JSON.stringify(settings));
}
