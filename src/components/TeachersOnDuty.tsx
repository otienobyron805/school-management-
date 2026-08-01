import React, { useState, useEffect } from 'react';
import { getUsers, UserAccount, getCurrentUser, secureGet, secureSet } from '../utils/db';
import { 
  ShieldCheck, 
  Calendar, 
  Clock, 
  User, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Users, 
  X,
  Phone,
  Building,
  Check,
  Megaphone,
  Lock,
  ExternalLink,
  Info,
  BarChart3,
  ClipboardList,
  UserCheck,
  MessageCircle
} from 'lucide-react';

export interface DutyAssignment {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  teacherId: string;
  teacherName: string;
  role: 'Senior Duty Teacher' | 'Assistant Duty Teacher' | 'Gate & Compound Supervisor';
  shift: 'Morning (06:30 - 13:00)' | 'Afternoon (13:00 - 18:00)' | 'Full Day (06:30 - 18:00)';
  contactPhone?: string;
  status: 'Scheduled' | 'On Duty' | 'Completed' | 'Substituted';
  startDate?: string;
  endDate?: string;
}

export interface DutyLog {
  id: string;
  date: string;
  teacherName: string;
  category: 'General Observation' | 'Late Arrivals' | 'Medical / First Aid' | 'Compound Inspection';
  note: string;
  timestamp: string;
}

interface TeachersOnDutyProps {
  onNavigate?: (view: string) => void;
}

const STORAGE_KEY_ROSTER = 'tod_duty_roster_v1';
const STORAGE_KEY_LOGS = 'tod_duty_logs_v1';

const TeachersOnDuty: React.FC<TeachersOnDutyProps> = ({ onNavigate }) => {
  const currentUser = getCurrentUser();
  const [teachers, setTeachers] = useState<UserAccount[]>([]);
  const [roster, setRoster] = useState<DutyAssignment[]>([]);
  const [dutyLogs, setDutyLogs] = useState<DutyLog[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Form states
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formDay, setFormDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'>('Monday');
  const [formRole, setFormRole] = useState<'Senior Duty Teacher' | 'Assistant Duty Teacher' | 'Gate & Compound Supervisor'>('Senior Duty Teacher');
  const [formShift, setFormShift] = useState<'Morning (06:30 - 13:00)' | 'Afternoon (13:00 - 18:00)' | 'Full Day (06:30 - 18:00)'>('Full Day (06:30 - 18:00)');
  const [formPhone, setFormPhone] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  // Log Form state
  const [logCategory, setLogCategory] = useState<'General Observation' | 'Late Arrivals' | 'Medical / First Aid' | 'Compound Inspection'>('General Observation');
  const [logNote, setLogNote] = useState('');

  // Determine today's day name
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Calculate user access level
  const userRole = (currentUser?.role || '').toLowerCase();
  const isAdminRole = ['admin', 'headteacher', 'deputy', 'senior', 'administrator', 'principal', 'deputy principal', 'senior teacher', 'super admin', 'head teacher'].includes(userRole);

  const isActiveTOD = roster.some(r => {
    const isUser = r.teacherName.toLowerCase() === currentUser?.fullName?.toLowerCase() || r.teacherId === currentUser?.id;
    if (!isUser) return false;
    if (r.status === 'On Duty') return true;
    if (r.startDate && r.endDate) {
      const now = new Date();
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      return now >= start && now <= end;
    }
    return r.day === todayName;
  });

  const accessMode: 'FULL' | 'FULL_TOD' | 'RESTRICTED' = isAdminRole ? 'FULL' : isActiveTOD ? 'FULL_TOD' : 'RESTRICTED';

  useEffect(() => {
    // Load staff users
    const allUsers = getUsers().filter(u => u.role !== 'Parent');
    setTeachers(allUsers);

    // Set selected day to current weekday if applicable
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (validDays.includes(todayName)) {
      setSelectedDay(todayName);
    }

    // Load initial roster
    try {
      const savedRoster = secureGet(STORAGE_KEY_ROSTER);
      if (savedRoster) {
        setRoster(JSON.parse(savedRoster));
      } else if (allUsers.length > 0) {
        // Seed default initial roster
        const seedRoster: DutyAssignment[] = [
          {
            id: 'tod-1',
            day: 'Monday',
            teacherId: allUsers[0]?.id || '1',
            teacherName: allUsers[0]?.fullName || 'Senior Teacher',
            role: 'Senior Duty Teacher',
            shift: 'Full Day (06:30 - 18:00)',
            contactPhone: allUsers[0]?.phone || '0700000000',
            status: 'On Duty'
          },
          ...(allUsers.length > 1 ? [{
            id: 'tod-2',
            day: 'Tuesday' as const,
            teacherId: allUsers[1]?.id || '2',
            teacherName: allUsers[1]?.fullName || 'Deputy Teacher',
            role: 'Assistant Duty Teacher' as const,
            shift: 'Full Day (06:30 - 18:00)' as const,
            contactPhone: allUsers[1]?.phone || '0711111111',
            status: 'Scheduled' as const
          }] : [])
        ];
        setRoster(seedRoster);
        secureSet(STORAGE_KEY_ROSTER, JSON.stringify(seedRoster));
      }
    } catch (e) {
      console.error('Error loading TOD roster:', e);
    }

    // Load duty logs
    try {
      const savedLogs = secureGet(STORAGE_KEY_LOGS);
      if (savedLogs) {
        setDutyLogs(JSON.parse(savedLogs));
      }
    } catch (e) {
      console.error('Error loading TOD logs:', e);
    }
  }, []);

  const saveRoster = (newRoster: DutyAssignment[]) => {
    setRoster(newRoster);
    try {
      secureSet(STORAGE_KEY_ROSTER, JSON.stringify(newRoster));
    } catch (e) {
      console.error(e);
    }
  };

  const saveLogs = (newLogs: DutyLog[]) => {
    setDutyLogs(newLogs);
    try {
      secureSet(STORAGE_KEY_LOGS, JSON.stringify(newLogs));
    } catch (e) {
      console.error(e);
    }
  };

  const getWhatsAppNotifyUrl = (assignment: DutyAssignment) => {
    const rawPhone = assignment.contactPhone && assignment.contactPhone !== 'N/A' ? assignment.contactPhone : '';
    const phoneDigits = rawPhone.replace(/\D/g, '');
    
    let template = `Hello ${assignment.teacherName},\n\n`;
    template += `You have been assigned as Teacher On Duty (${assignment.role}) for ${assignment.day}.\n`;
    template += `Shift: ${assignment.shift}\n`;
    if (assignment.startDate && assignment.endDate) {
      template += `Duty Period: ${assignment.startDate} to ${assignment.endDate}\n`;
    }
    template += `Status: ${assignment.status}\n\n`;
    template += `Please check the TOD Supervision Portal for details.\nThank you!`;

    const encodedMsg = encodeURIComponent(template);

    if (phoneDigits) {
      return `https://web.whatsapp.com/send?phone=${phoneDigits}&text=${encodedMsg}`;
    }
    return `https://web.whatsapp.com/send?text=${encodedMsg}`;
  };

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTeacherId) return;

    const teacher = teachers.find(t => t.id === formTeacherId);
    if (!teacher) return;

    const newAssignment: DutyAssignment = {
      id: 'tod-' + Date.now(),
      day: formDay,
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      role: formRole,
      shift: formShift,
      contactPhone: formPhone || teacher.phone || 'N/A',
      status: formDay === todayName ? 'On Duty' : 'Scheduled',
      startDate: formStartDate || undefined,
      endDate: formEndDate || undefined
    };

    const updated = [...roster, newAssignment];
    saveRoster(updated);
    setIsAddModalOpen(false);
    setFormTeacherId('');
    setFormPhone('');
    setFormStartDate('');
    setFormEndDate('');
  };

  const handleDeleteAssignment = (id: string) => {
    const updated = roster.filter(r => r.id !== id);
    saveRoster(updated);
  };

  const handleToggleStatus = (id: string) => {
    const updated = roster.map(item => {
      if (item.id === id) {
        const nextStatus: DutyAssignment['status'] = 
          item.status === 'Scheduled' ? 'On Duty' : 
          item.status === 'On Duty' ? 'Completed' : 'Scheduled';
        return { ...item, status: nextStatus };
      }
      return item;
    });
    saveRoster(updated);
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logNote.trim()) return;

    const newLog: DutyLog = {
      id: 'log-' + Date.now(),
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      teacherName: currentUser?.fullName || 'Teacher on Duty',
      category: logCategory,
      note: logNote.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [newLog, ...dutyLogs];
    saveLogs(updated);
    setLogNote('');
    setIsLogModalOpen(false);
  };

  const handleDeleteLog = (id: string) => {
    const updated = dutyLogs.filter(l => l.id !== id);
    saveLogs(updated);
  };

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayAssignments = roster.filter(r => r.day === (todayName === 'Sunday' ? 'Monday' : todayName));
  const activeDayAssignments = roster.filter(r => r.day === selectedDay);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 p-3 sm:p-5 md:p-6 space-y-5 animate-fadeIn">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* 🔗 QUICK NAVIGATION BAR FOR LINKED MODULES */}
        <div className="flex items-center justify-between flex-wrap gap-2 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Attendance & Duty Control Center</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onNavigate?.('Teachers On Duty (TOD)')}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Teachers On Duty (TOD)
            </button>
            <button
              onClick={() => onNavigate?.('Attendance Roll')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <ClipboardList className="w-3.5 h-3.5 text-blue-500" /> Attendance Roll Call
            </button>
            <button
              onClick={() => onNavigate?.('Attendance Dashboard')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-500" /> Attendance Analytics
            </button>
            <button
              onClick={() => onNavigate?.('Gate Check-in')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-sky-500" /> Gate Check-in
            </button>
          </div>
        </div>

        {/* 🛡️ HERO BANNER WITH ACCESS BADGE */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-emerald-900/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl shadow-inner">
                  <ShieldCheck className="w-6 h-6" />
                </span>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-900/60 px-2.5 py-0.5 rounded-full border border-emerald-700/50">
                  Campus Supervision
                </span>

                {/* 🏷️ SYSTEM ACCESS BADGE */}
                {accessMode === 'FULL' && (
                  <span className="text-xs font-bold bg-emerald-500 text-slate-950 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ✅ FULL SYSTEM ACCESS
                  </span>
                )}
                {accessMode === 'FULL_TOD' && (
                  <span className="text-xs font-bold bg-emerald-400 text-slate-950 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ✅ ACTIVE TOD — WHOLE SCHOOL VIEW
                  </span>
                )}
                {accessMode === 'RESTRICTED' && (
                  <span className="text-xs font-bold bg-amber-400 text-slate-950 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                    <AlertCircle className="w-3.5 h-3.5" /> ⚠️ RESTRICTED — MY CLASS ONLY
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Teachers On Duty (TOD) Control
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                System linked with your existing Attendance Roll Call & Analytics modules. Duty schedules run weekly (Sat 00:00 → Next Sat 00:00).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsLogModalOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold px-3.5 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer backdrop-blur-xs"
              >
                <FileText className="w-4 h-4 text-emerald-300" /> Log Duty Note
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Assign Duty Teacher
              </button>
            </div>
          </div>
        </div>

        {/* 🔒 READ-ONLY SYSTEM RULE BANNER */}
        <div className="bg-amber-50/90 border-l-4 border-amber-500 p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 text-xs font-semibold shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <strong>System Rule:</strong> All Attendance & Analytics records are <strong>VIEW-ONLY</strong> for all staff — no unauthorized edits permitted.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button onClick={() => onNavigate?.('Attendance Roll')} className="px-3 py-1 bg-amber-200/80 hover:bg-amber-300/80 text-amber-950 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1">
              Roll Call <ExternalLink className="w-3 h-3" />
            </button>
            <button onClick={() => onNavigate?.('Attendance Dashboard')} className="px-3 py-1 bg-amber-200/80 hover:bg-amber-300/80 text-amber-950 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1">
              Analytics <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 📌 PERMISSIONS EXPLANATION CARD */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-2xs">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600" /> How TOD Permissions & Linkage Work:
          </h4>
          <ul className="text-xs text-slate-600 space-y-1.5 pl-5 list-disc leading-relaxed font-medium">
            <li><strong>Admin / Head / Deputy / Senior Staff:</strong> Full access to all system pages permanently.</li>
            <li><strong>Active TOD Officers:</strong> Auto-granted <em>FULL SCHOOL VIEW</em> across Attendance Roll Call & Analytics during their duty shift.</li>
            <li><strong>Class Teachers:</strong> Default: ONLY their assigned class visible; automatically upgraded to full school view while on active TOD duty.</li>
            <li><strong>Auto-Revert:</strong> When duty period ends, permissions instantly revert back to restricted class view.</li>
          </ul>
        </div>

        {/* 🌟 TODAY'S ACTIVE TOD HIGHLIGHT CARDS */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Active Teachers On Duty Today</h3>
                <p className="text-[11px] text-slate-500 font-medium">Duty officers stationed on campus today ({todayName})</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              {todayAssignments.length} Officer(s) Active
            </span>
          </div>

          {todayAssignments.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-600">No Teacher assigned on duty for {todayName} yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click "Assign Duty Teacher" above to schedule staff for today.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayAssignments.map((duty) => (
                <div 
                  key={duty.id} 
                  className={`p-3.5 rounded-xl border transition relative space-y-2 ${
                    duty.status === 'On Duty' 
                      ? 'bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border-emerald-200 shadow-xs' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                        {duty.teacherName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{duty.teacherName}</h4>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">{duty.role}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      duty.status === 'On Duty' 
                        ? 'bg-emerald-500 text-white border-emerald-600' 
                        : duty.status === 'Completed'
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {duty.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{duty.shift}</span>
                    </div>
                    {duty.contactPhone && (
                      <div className="flex items-center justify-between gap-1.5 font-medium text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{duty.contactPhone}</span>
                        </div>
                        <a 
                          href={`https://wa.me/${duty.contactPhone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-md hover:bg-emerald-700 transition flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 📅 WEEKLY DUTY ROSTER & TABS */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" /> Weekly Duty Roster Schedule
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Select a day to review or update assigned teachers on duty</p>
            </div>

            {/* Day Selector Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {daysList.map((day) => {
                const count = roster.filter(r => r.day === day).length;
                const isToday = day === todayName;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      selectedDay === day
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/10'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{day}</span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Today" />
                    )}
                    {count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        selectedDay === day ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3.5 font-bold">Teacher / Duty Officer</th>
                  <th className="p-3.5 font-bold">Duty Role</th>
                  <th className="p-3.5 font-bold">Shift Period</th>
                  <th className="p-3.5 font-bold">Contact</th>
                  <th className="p-3.5 font-bold">Status</th>
                  <th className="p-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {activeDayAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No duty assignments created for <span className="font-bold text-slate-700">{selectedDay}</span>.
                    </td>
                  </tr>
                ) : (
                  activeDayAssignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{assignment.teacherName}</span>
                            <span className="text-[10px] text-slate-400">ID: {assignment.teacherId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-[11px] font-bold border border-slate-200">
                          {assignment.role}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-semibold">
                        {assignment.shift}
                        {assignment.startDate && (
                          <span className="block text-[10px] text-slate-400">{assignment.startDate} to {assignment.endDate}</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        <div className="flex items-center gap-2">
                          <span>{assignment.contactPhone || 'N/A'}</span>
                          {assignment.contactPhone && assignment.contactPhone !== 'N/A' && (
                            <a 
                              href={`https://wa.me/${assignment.contactPhone.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 font-bold text-[10px] underline"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleStatus(assignment.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer flex items-center gap-1 border ${
                            assignment.status === 'On Duty'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : assignment.status === 'Completed'
                              ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                          title="Click to toggle status"
                        >
                          {assignment.status === 'On Duty' && <Check className="w-3 h-3 text-emerald-600" />}
                          {assignment.status}
                        </button>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={getWhatsAppNotifyUrl(assignment)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                            title="Notify Teacher via WhatsApp Web with template message"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Notify via WhatsApp</span>
                            <span className="sm:hidden">Notify</span>
                          </a>
                          <button
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Assignment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 📝 TOD OBSERVATION & INCIDENT LOG */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">TOD Observation & Shift Log</h3>
                <p className="text-[11px] text-slate-500 font-medium">Daily notes, gate observations, and campus reports submitted by duty officers</p>
              </div>
            </div>
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-lg transition cursor-pointer"
            >
              + Add Note
            </button>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {dutyLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No shift notes logged yet today. Click "Log Duty Note" to submit an observation.
              </div>
            ) : (
              dutyLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 relative group hover:border-blue-200 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                      {log.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">{log.date} at {log.timestamp}</span>
                      <button 
                        onClick={() => handleDeleteLog(log.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed">{log.note}</p>
                  <div className="text-[10px] text-slate-400 font-bold">Logged by {log.teacherName}</div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ➕ ASSIGN DUTY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Assign Teacher on Duty
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAssignment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Staff Member</label>
                <select 
                  required
                  value={formTeacherId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setFormTeacherId(id);
                    const selected = teachers.find(t => t.id === id);
                    if (selected?.phone) setFormPhone(selected.phone);
                  }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                >
                  <option value="">-- Choose Teacher --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.fullName} ({t.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Phone / WhatsApp</label>
                <input 
                  type="text"
                  placeholder="e.g. 254712345678"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Start Date (Sat 00:00)</label>
                  <input 
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">End Date (Sat 00:00)</label>
                  <input 
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Duty Day</label>
                <select 
                  value={formDay}
                  onChange={(e) => setFormDay(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                >
                  {daysList.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Duty Responsibility Role</label>
                <select 
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                >
                  <option value="Senior Duty Teacher">Senior Duty Teacher</option>
                  <option value="Assistant Duty Teacher">Assistant Duty Teacher</option>
                  <option value="Gate & Compound Supervisor">Gate & Compound Supervisor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Shift Period</label>
                <select 
                  value={formShift}
                  onChange={(e) => setFormShift(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                >
                  <option value="Full Day (06:30 - 18:00)">Full Day (06:30 - 18:00)</option>
                  <option value="Morning (06:30 - 13:00)">Morning (06:30 - 13:00)</option>
                  <option value="Afternoon (13:00 - 18:00)">Afternoon (13:00 - 18:00)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer shadow-sm"
                >
                  Save Duty Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📝 LOG DUTY NOTE MODAL */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Log TOD Shift Note
              </h3>
              <button 
                onClick={() => setIsLogModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddLog} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                <select 
                  value={logCategory}
                  onChange={(e) => setLogCategory(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                >
                  <option value="General Observation">General Observation</option>
                  <option value="Late Arrivals">Late Arrivals</option>
                  <option value="Medical / First Aid">Medical / First Aid</option>
                  <option value="Compound Inspection">Compound Inspection</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Shift Observation / Note</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Describe duty observations, gate activity, or issues noted..."
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition cursor-pointer shadow-sm"
                >
                  Submit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeachersOnDuty;

