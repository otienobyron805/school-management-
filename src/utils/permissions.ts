import { getCurrentUser } from './db';

export const PERMISSION_RULES = {
  get currentUser() {
    return getCurrentUser();
  },
  get dutySchedules() {
    try {
      const saved = localStorage.getItem('tod_duty_roster_v1') || localStorage.getItem('dutySchedules');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }
};

export function getActiveDutyTeacher() {
  const user = getCurrentUser();
  if (!user) return null;

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const schedules = PERMISSION_RULES.dutySchedules;

  return schedules.find((d: any) => {
    const isUser = (d.teacherName && d.teacherName.toLowerCase() === user.fullName?.toLowerCase()) ||
                   (d.teacher && d.teacher.toLowerCase() === user.fullName?.toLowerCase()) ||
                   (d.teacherId && d.teacherId === user.id);
    if (!isUser) return false;
    if (d.status === 'On Duty') return true;
    if (d.startDate && d.endDate) {
      const now = new Date();
      const start = new Date(d.startDate);
      const end = new Date(d.endDate);
      return now >= start && now <= end;
    }
    if (d.start && d.end) {
      const now = new Date();
      const start = new Date(d.start);
      const end = new Date(d.end);
      return now >= start && now <= end;
    }
    return d.day === todayName;
  });
}

export function getViewAccess(): 'FULL' | 'FULL_TOD' | 'RESTRICTED' {
  const user = getCurrentUser();
  if (!user) return 'RESTRICTED';

  const userRole = (user.role || '').toLowerCase();
  const ADMIN_ROLES = ['admin', 'headteacher', 'deputy', 'senior', 'administrator', 'principal', 'deputy principal', 'senior teacher', 'super admin', 'head teacher'];

  if (ADMIN_ROLES.some(r => userRole.includes(r))) return 'FULL';
  
  const activeDuty = getActiveDutyTeacher();
  if (activeDuty) return 'FULL_TOD';

  return 'RESTRICTED';
}

export function canDelete(): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  const permissions = user.permissions || [];
  if (permissions.includes('perm_cannot_delete')) {
    return false;
  }
  
  // Explicit permission check
  if (permissions.includes('perm_can_delete')) {
    return true;
  }

  // Role check: ONLY Super Admin
  const userRole = (user.role || '').toLowerCase();
  if (userRole === 'super admin') {
    return true;
  }
  
  return false;
}

