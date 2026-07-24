import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserCheck, Clock, ShieldCheck, Search, Filter, Printer, 
  Download, AlertTriangle, CheckCircle2, XCircle, Send, ArrowRight, 
  Building, Calendar, Lock, Unlock, Phone, MapPin, CheckSquare, Square, RefreshCw
} from 'lucide-react';
import { 
  getLearners, getGrades, getGateLogs, saveGateLogs, GateLog, 
  getSystemSettings, saveSystemSettings, logAudit, UserAccount, Learner, 
  getMessages, saveMessages, Message
} from '../utils/db';

interface GateCheckinProps {
  currentUser: UserAccount;
}

export default function GateCheckin({ currentUser }: GateCheckinProps) {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [gateLogs, setGateLogs] = useState<GateLog[]>([]);
  const [systemSettings, setSystemSettings] = useState(getSystemSettings());

  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedStream, setSelectedStream] = useState<string>('all');
  const [studentTypeFilter, setStudentTypeFilter] = useState<'all' | 'Day Scholar' | 'Boarder'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<string[]>([]);
  const [remarksInput, setRemarksInput] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'gate' | 'logs' | 'settings'>('gate');
  const [toast, setToast] = useState<string | null>(null);

  // Settings form state for Super Admin
  const [lockTimeInput, setLockTimeInput] = useState(systemSettings.lockTime);
  const [schoolNameInput, setSchoolNameInput] = useState(systemSettings.schoolName);

  useEffect(() => {
    setLearners(getLearners());
    setGrades(getGrades());
    setGateLogs(getGateLogs());
    setSystemSettings(getSystemSettings());
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Check Kenyan Calendar Rules & Day / Boarder status for active date
  const dateObj = new Date(selectedDate);
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;

  // Streams for selected grade
  const availableStreams = useMemo(() => {
    if (selectedGrade === 'all') {
      const configStreams = grades.flatMap(g => g.streams || []).map((s: any) => s.name.trim());
      const registeredStreams = Array.from(new Set(learners.map(l => (l.stream || '').trim()).filter(Boolean)));
      return Array.from(new Set([...configStreams, ...registeredStreams]));
    }
    const gObj = grades.find(g => g.id === selectedGrade || g.name === selectedGrade);
    const configStreams = (gObj?.streams || []).map((s: any) => s.name.trim());
    
    const gradeLearners = learners.filter(l => {
      const lGradeStr = l.grade ? l.grade.toString() : '';
      const gName = gObj ? gObj.name : selectedGrade;
      const gNum = gName.replace(/\D/g, '');
      const matchesGrade = (gNum !== '' && lGradeStr === gNum) || l.gradeLabel === gName || lGradeStr === selectedGrade || gName.toLowerCase().includes(lGradeStr.toLowerCase());
      return matchesGrade;
    });
    const registeredStreams = Array.from(new Set(gradeLearners.map(l => (l.stream || '').trim()).filter(Boolean)));
    return Array.from(new Set([...configStreams, ...registeredStreams]));
  }, [selectedGrade, grades, learners]);

  // Filtered learners
  const filteredLearners = useMemo(() => {
    return learners.filter(l => {
      // Grade filter
      if (selectedGrade !== 'all') {
        const gObj = grades.find(g => g.id === selectedGrade || g.name === selectedGrade);
        const gName = gObj ? gObj.name : selectedGrade;
        const gNum = gName.replace(/\D/g, '');
        const lGrade = l.grade ? l.grade.toString() : '';
        const matchesGrade = (gNum !== '' && lGrade === gNum) || l.gradeLabel === gName || lGrade === selectedGrade || gName.toLowerCase().includes(lGrade.toLowerCase());
        if (!matchesGrade) return false;
      }
      // Stream filter
      if (selectedStream !== 'all') {
        const lStream = (l.stream || 'Main').trim().toLowerCase();
        const selStream = selectedStream.trim().toLowerCase();
        if (lStream !== selStream) return false;
      }
      // Student Type filter (Day Scholar vs Boarder)
      if (studentTypeFilter !== 'all') {
        if ((l.type || 'Day Scholar') !== studentTypeFilter) return false;
      }
      // Sunday holiday rule for day scholars
      if (isSunday && (l.type || 'Day Scholar') === 'Day Scholar') {
        return false; // Sunday full holiday for day scholars
      }
      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const nameMatch = l.name.toLowerCase().includes(q);
        const admMatch = l.admNo.toLowerCase().includes(q);
        if (!nameMatch && !admMatch) return false;
      }
      return true;
    });
  }, [learners, selectedGrade, selectedStream, studentTypeFilter, isSunday, searchTerm, grades]);

  // Today's logs map (admNo -> GateLog)
  const todayLogsMap = useMemo(() => {
    const map = new Map<string, GateLog>();
    gateLogs.filter(log => log.logDate === selectedDate).forEach(log => {
      map.set(log.admNo, log);
    });
    return map;
  }, [gateLogs, selectedDate]);

  // Check if time is locked (after configured lockTime, e.g. 19:00)
  const isTimeLocked = useMemo(() => {
    if (currentUser.role === 'Super Admin') return false; // Super Admin can override
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (selectedDate !== todayStr) return false; // past/future dates checked by rule

    const [lockHour, lockMin] = systemSettings.lockTime.split(':').map(Number);
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    return (currentHour > lockHour) || (currentHour === lockHour && currentMin >= lockMin);
  }, [selectedDate, systemSettings.lockTime, currentUser.role]);

  // Handle Check In
  const handleCheckIn = (learner: Learner) => {
    if (isTimeLocked) {
      triggerToast(`❌ Error: Daily gate entry is locked after ${systemSettings.lockTime}. Contact Super Admin.`);
      return;
    }

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const existing = todayLogsMap.get(learner.admNo);

    if (existing && existing.checkIn) {
      triggerToast(`⚠️ Learner ${learner.name} is already checked in for today!`);
      return;
    }

    const remarks = remarksInput[learner.id] || '';
    // Check if late (e.g. after 8:00 AM)
    const isLate = currentTime > '08:15';
    const status = isLate ? 'Late' : 'Checked In';

    const newLog: GateLog = existing ? {
      ...existing,
      checkIn: currentTime,
      status: existing.checkOut ? 'Checked Out' : status,
      remarks: remarks || existing.remarks,
      markedBy: currentUser.fullName || currentUser.username,
      markedAt: new Date().toISOString(),
      ipAddress: '192.168.1.105'
    } : {
      id: Math.random().toString(36).substring(2, 9),
      admNo: learner.admNo,
      learnerId: learner.id,
      logDate: selectedDate,
      checkIn: currentTime,
      status: status,
      location: 'Main School Gate',
      remarks: remarks,
      markedBy: currentUser.fullName || currentUser.username,
      markedAt: new Date().toISOString(),
      ipAddress: '192.168.1.105'
    };

    const updatedLogs = [newLog, ...gateLogs.filter(l => !(l.admNo === learner.admNo && l.logDate === selectedDate))];
    saveGateLogs(updatedLogs);
    setGateLogs(updatedLogs);

    // Send WhatsApp Alert & Portal Inbox Notification
    if (learner.parentPhone) {
      const msgText = `✅ ${systemSettings.schoolName.toUpperCase()} ALERT: ${learner.name} (Adm: ${learner.admNo}) has ARRIVED safely at school. Time: ${currentTime}. — Admin`;
      const allMsgs = getMessages();
      const newMsg: Message = {
        id: `gate_in_${learner.id}_${Date.now()}`,
        senderId: 'system_gate',
        receiverId: `parent_${learner.id}`,
        learnerId: learner.id,
        text: msgText,
        senderRole: 'Teacher',
        timestamp: new Date().toISOString(),
        read: false
      };
      saveMessages([newMsg, ...allMsgs]);
      window.dispatchEvent(new Event('messagesUpdated'));
    }

    logAudit(currentUser.id, currentUser.fullName || currentUser.username, 'GATE_CHECK_IN', `Checked in ${learner.name} (${learner.admNo}) at ${currentTime}`);
    triggerToast(`✅ Successfully checked in ${learner.name}`);
  };

  // Handle Check Out
  const handleCheckOut = (learner: Learner) => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const todayStr = now.toISOString().split('T')[0];
    
    // Check-out opens at exactly 1:00 PM (13:00) for today unless Super Admin
    const currentHour = now.getHours();
    const isBefore1PM = currentHour < 13;
    const isToday = selectedDate === todayStr;

    if (isToday && isBefore1PM && currentUser.role !== 'Super Admin') {
      triggerToast(`❌ Check-out opens at exactly 1:00 PM. You cannot check out before the scheduled time.`);
      return;
    }

    const existing = todayLogsMap.get(learner.admNo);

    if (!existing || !existing.checkIn) {
      triggerToast(`❌ Cannot check out: Learner has not checked in today!`);
      return;
    }

    if (existing.checkOut) {
      triggerToast(`⚠️ Learner ${learner.name} is already checked out.`);
      return;
    }

    const remarks = remarksInput[learner.id] || existing.remarks || '';
    const updatedLog: GateLog = {
      ...existing,
      checkOut: currentTime,
      status: 'Checked Out',
      remarks: remarks,
      markedBy: currentUser.fullName || currentUser.username,
      markedAt: new Date().toISOString()
    };

    const updatedLogs = [updatedLog, ...gateLogs.filter(l => !(l.admNo === learner.admNo && l.logDate === selectedDate))];
    saveGateLogs(updatedLogs);
    setGateLogs(updatedLogs);

    // Send WhatsApp Alert & Portal Inbox Notification
    if (learner.parentPhone) {
      const msgText = `🔴 ${systemSettings.schoolName.toUpperCase()} ALERT: ${learner.name} (Adm: ${learner.admNo}) has DEPARTED school. Time: ${currentTime}. — Admin`;
      const allMsgs = getMessages();
      const newMsg: Message = {
        id: `gate_out_${learner.id}_${Date.now()}`,
        senderId: 'system_gate',
        receiverId: `parent_${learner.id}`,
        learnerId: learner.id,
        text: msgText,
        senderRole: 'Teacher',
        timestamp: new Date().toISOString(),
        read: false
      };
      saveMessages([newMsg, ...allMsgs]);
      window.dispatchEvent(new Event('messagesUpdated'));
    }

    logAudit(currentUser.id, currentUser.fullName || currentUser.username, 'GATE_CHECK_OUT', `Checked out ${learner.name} (${learner.admNo}) at ${currentTime}`);
    triggerToast(`🔴 Successfully checked out ${learner.name}`);
  };

  // Bulk Check-in
  const handleBulkCheckIn = () => {
    if (isTimeLocked) {
      triggerToast(`❌ Error: Daily gate entry is locked after ${systemSettings.lockTime}.`);
      return;
    }
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    let count = 0;
    const newLogsMap = new Map<string, GateLog>();
    gateLogs.forEach(l => newLogsMap.set(`${l.admNo}_${l.logDate}`, l));

    filteredLearners.forEach(learner => {
      const key = `${learner.admNo}_${selectedDate}`;
      const existing = newLogsMap.get(key);
      if (!existing || !existing.checkIn) {
        const log: GateLog = {
          id: Math.random().toString(36).substring(2, 9),
          admNo: learner.admNo,
          learnerId: learner.id,
          logDate: selectedDate,
          checkIn: currentTime,
          status: 'Checked In',
          location: 'Main School Gate',
          markedBy: currentUser.fullName || currentUser.username,
          markedAt: new Date().toISOString()
        };
        newLogsMap.set(key, log);
        count++;

        // Send Notification
        if (learner.parentPhone) {
          const msgText = `✅ ${systemSettings.schoolName.toUpperCase()} ALERT: ${learner.name} has ARRIVED safely at school. Time: ${currentTime}.`;
          const allMsgs = getMessages();
          saveMessages([{
            id: `bulk_in_${learner.id}_${Date.now()}`,
            senderId: 'system_gate',
            receiverId: `parent_${learner.id}`,
            learnerId: learner.id,
            text: msgText,
            senderRole: 'Teacher',
            timestamp: new Date().toISOString(),
            read: false
          }, ...allMsgs]);
        }
      }
    });

    const updatedLogs = Array.from(newLogsMap.values());
    saveGateLogs(updatedLogs);
    setGateLogs(updatedLogs);
    logAudit(currentUser.id, currentUser.fullName || currentUser.username, 'BULK_CHECK_IN', `Bulk checked in ${count} learners for ${selectedDate}`);
    triggerToast(`✅ Bulk checked in ${count} learners successfully!`);
  };

  // Mark All Absent
  const handleMarkAllAbsent = () => {
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    let count = 0;
    const newLogsMap = new Map<string, GateLog>();
    gateLogs.forEach(l => newLogsMap.set(`${l.admNo}_${l.logDate}`, l));

    filteredLearners.forEach(learner => {
      const key = `${learner.admNo}_${selectedDate}`;
      const existing = newLogsMap.get(key);
      if (!existing || (!existing.checkIn && !existing.status)) {
        const log: GateLog = {
          id: Math.random().toString(36).substring(2, 9),
          admNo: learner.admNo,
          learnerId: learner.id,
          logDate: selectedDate,
          status: 'Absent',
          location: 'Main School Gate',
          remarks: 'Marked Absent at Gate',
          markedBy: currentUser.fullName || currentUser.username,
          markedAt: new Date().toISOString()
        };
        newLogsMap.set(key, log);
        count++;
      }
    });

    const updatedLogs = Array.from(newLogsMap.values());
    saveGateLogs(updatedLogs);
    setGateLogs(updatedLogs);
    triggerToast(`⚪ Marked ${count} learners as absent.`);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'Super Admin') {
      triggerToast('❌ Only Super Admin can modify system lock settings.');
      return;
    }
    const updated = {
      ...systemSettings,
      lockTime: lockTimeInput,
      schoolName: schoolNameInput
    };
    saveSystemSettings(updated);
    setSystemSettings(updated);
    logAudit(currentUser.id, currentUser.fullName || currentUser.username, 'UPDATE_SETTINGS', `Updated lock time to ${lockTimeInput}`);
    triggerToast('✅ System settings saved successfully!');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-extrabold flex items-center gap-3 animate-bounce">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-xl text-xs font-black uppercase tracking-wider">
              Gate Security & Parent Alert
            </span>
            <span className="px-3 py-1 bg-emerald-500/30 text-emerald-200 rounded-xl text-xs font-black flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Gate System
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Student Check‑in / Check‑out & WhatsApp Alerts</h1>
          <p className="text-blue-100 text-xs md:text-sm font-medium max-w-2xl">
            Real-time arrival and departure tracking at the school gate with automated WhatsApp notifications and parent portal inbox dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
          <Clock className="w-6 h-6 text-blue-200" />
          <div>
            <div className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">System Lock Time</div>
            <div className="text-sm font-black text-white flex items-center gap-2">
              {systemSettings.lockTime} 
              {isTimeLocked ? <Lock className="w-4 h-4 text-rose-300" /> : <Unlock className="w-4 h-4 text-emerald-300" />}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('gate')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 ${
            activeTab === 'gate' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Gate Operations & Roll
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 ${
            activeTab === 'logs' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" /> Full Gate & Audit Logs
        </button>
        {currentUser.role === 'Super Admin' && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Lock className="w-4 h-4" /> Gate Security Settings
          </button>
        )}
      </div>

      {activeTab === 'gate' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">Select Grade</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => { setSelectedGrade(e.target.value); setSelectedStream('all'); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">All Grades (1 - 8)</option>
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">Select Stream</label>
                <select
                  value={selectedStream}
                  onChange={(e) => setSelectedStream(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">All Streams</option>
                  {availableStreams.map((streamName: string) => (
                    <option key={streamName} value={streamName}>{streamName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">Student Type</label>
                <select
                  value={studentTypeFilter}
                  onChange={(e: any) => setStudentTypeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">All Types (Boarders & Day)</option>
                  <option value="Day Scholar">🏠 Day Scholar</option>
                  <option value="Boarder">🛏️ Boarder</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">Attendance Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">Search Learner</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Adm No. or Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Kenyan Calendar Rule Banner */}
            {isSunday && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-xs font-bold">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  <strong>Sunday Holiday Notice:</strong> Day Scholars are off today. Only Boarder learners are active for check-in.
                </span>
              </div>
            )}

            {/* Quick Bulk Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-600">Showing {filteredLearners.length} Learners</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBulkCheckIn}
                  disabled={isTimeLocked}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition"
                >
                  <UserCheck className="w-4 h-4" /> Bulk Check-in Filtered
                </button>
                <button
                  onClick={handleMarkAllAbsent}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-extrabold flex items-center gap-2 transition"
                >
                  <XCircle className="w-4 h-4" /> Mark All Absent
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-extrabold flex items-center gap-2 transition"
                >
                  <Printer className="w-4 h-4" /> Print Sheet (A4 Landscape)
                </button>
              </div>
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-200">
                    <th className="py-3.5 px-4">Adm No.</th>
                    <th className="py-3.5 px-4">Full Name</th>
                    <th className="py-3.5 px-4">Student Type</th>
                    <th className="py-3.5 px-4">Grade & Stream</th>
                    <th className="py-3.5 px-4">Check‑in Time</th>
                    <th className="py-3.5 px-4">Check‑out Time</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Remarks</th>
                    <th className="py-3.5 px-4 text-right">Gate Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLearners.map(learner => {
                    const log = todayLogsMap.get(learner.admNo);
                    const status = log ? log.status : 'Absent';
                    const checkIn = log?.checkIn || '-';
                    const checkOut = log?.checkOut || '-';

                    return (
                      <tr key={learner.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-black text-slate-700">{learner.admNo}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{learner.name}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${
                            (learner.type || 'Day Scholar') === 'Boarder' 
                              ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                              : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {(learner.type || 'Day Scholar') === 'Boarder' ? '🛏️ Boarder' : '🏠 Day Scholar'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          {learner.gradeLabel || `Grade ${learner.grade}`} ({learner.stream || 'Main'})
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{checkIn}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{checkOut}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                            status === 'Checked In' ? 'bg-emerald-100 text-emerald-800' :
                            status === 'Checked Out' ? 'bg-rose-100 text-rose-800' :
                            status === 'Late' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              status === 'Checked In' ? 'bg-emerald-600' :
                              status === 'Checked Out' ? 'bg-rose-600' :
                              status === 'Late' ? 'bg-amber-600' :
                              'bg-slate-400'
                            }`} />
                            {status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            placeholder="Add remark..."
                            defaultValue={log?.remarks || ''}
                            onBlur={(e) => {
                              setRemarksInput(prev => ({ ...prev, [learner.id]: e.target.value }));
                            }}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 w-32"
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleCheckIn(learner)}
                            disabled={isTimeLocked || !!(log && log.checkIn)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-[10px] font-black shadow-xs transition"
                          >
                            Check In
                          </button>
                          <button
                            onClick={() => handleCheckOut(learner)}
                            disabled={!log || !log.checkIn || !!log.checkOut}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-[10px] font-black shadow-xs transition"
                          >
                            Check Out
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLearners.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                        No learners found matching the selected grade/stream or search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Complete Gate Check‑in & Check‑out History</h3>
              <p className="text-xs text-slate-500 font-medium">Audit trail of all recorded arrivals, departures, and WhatsApp parent alerts</p>
            </div>
            <button
              onClick={() => {
                const csvContent = "data:text/csv;charset=utf-8," + 
                  ["Adm No,Date,Check-In,Check-Out,Status,Location,Marked By"].join(",") + "\n" +
                  gateLogs.map(l => [l.admNo, l.logDate, l.checkIn || '', l.checkOut || '', l.status, l.location, l.markedBy].join(",")).join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `gate_attendance_logs_${selectedDate}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition"
            >
              <Download className="w-4 h-4" /> Export CSV Logs
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-200">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Adm No.</th>
                  <th className="py-3 px-4">Check‑In</th>
                  <th className="py-3 px-4">Check‑Out</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Marked By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gateLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-bold text-slate-700">{log.logDate}</td>
                    <td className="py-3 px-4 font-black text-slate-900">{log.admNo}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600">{log.checkIn || '-'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-600">{log.checkOut || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-bold text-[10px]">
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">{log.location}</td>
                    <td className="py-3 px-4 font-bold text-slate-700">{log.markedBy}</td>
                  </tr>
                ))}
                {gateLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                      No gate logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && currentUser.role === 'Super Admin' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900">Gate Security & Time Lock Configuration</h3>
            <p className="text-xs text-slate-500 font-medium">Manage auto-lock timing and institutional parameters stored securely in database</p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">School Name</label>
              <input
                type="text"
                value={schoolNameInput}
                onChange={(e) => setSchoolNameInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">Daily Attendance Auto‑Lock Time (HH:MM 24hr)</label>
              <input
                type="text"
                value={lockTimeInput}
                onChange={(e) => setLockTimeInput(e.target.value)}
                placeholder="19:00"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                Entries are automatically locked after this time to prevent unauthorized late modifications.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition"
            >
              Save Gate & Lock Settings
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
