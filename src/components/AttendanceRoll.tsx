import React, { useState, useMemo, useEffect } from 'react';
import { 
  getGrades, 
  getLearners, 
  getAttendanceSheets, 
  saveAttendanceSheets, 
  getCurrentUser,
  getClassTeacherAssignments,
  getMessages,
  saveMessages,
  Grade, 
  Learner, 
  AttendanceSheet,
  Message,
  UserAccount
} from '../utils/db';
import { sendNotification } from '../utils/notifications';
import { 
  UserCheck, 
  Calendar, 
  Filter, 
  Search, 
  Check, 
  X, 
  Clock, 
  Save, 
  Printer, 
  Sparkles, 
  History, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Users,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Phone,
  MessageSquare,
  Send,
  User,
  BellRing,
  Info,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { getViewAccess } from '../utils/permissions';

export default function AttendanceRoll() {
  const accessMode = getViewAccess();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');
  const [selectedStream, setSelectedStream] = useState<string>('all');
  const [studentTypeFilter, setStudentTypeFilter] = useState<'all' | 'Day Scholar' | 'Boarder'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'mark' | 'history'>('mark');
  const [onlyAlertsFilter, setOnlyAlertsFilter] = useState<boolean>(false);

  // Modal for individual learner history
  const [selectedLearnerForHistory, setSelectedLearnerForHistory] = useState<Learner | null>(null);

  // Attendance Records State for currently selected date/grade/stream
  const [currentRecords, setCurrentRecords] = useState<Record<string, 'AM' | 'PM' | 'Full' | 'Absent'>>({});
  const [currentReasons, setCurrentReasons] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // DB Data
  const [grades, setGrades] = useState<Grade[]>(() => getGrades());
  const [allLearners, setAllLearners] = useState<Learner[]>(() => getLearners());
  const [allSheets, setAllSheets] = useState<AttendanceSheet[]>(() => getAttendanceSheets());
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentUser());
  const [classTeacherAssignments, setClassTeacherAssignments] = useState<any[]>(() => getClassTeacherAssignments());

  useEffect(() => {
    const handleUpdate = () => {
      setGrades(getGrades());
      setAllLearners(getLearners());
      setAllSheets(getAttendanceSheets());
      setCurrentUser(getCurrentUser());
      setClassTeacherAssignments(getClassTeacherAssignments());
    };
    window.addEventListener('db_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('db_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Default to first grade if none selected
  useEffect(() => {
    if (grades.length > 0 && !selectedGradeId) {
      setSelectedGradeId(grades[0].id);
    }
  }, [grades, selectedGradeId]);

  // Auto-select assigned grade & stream if current user is a Class Teacher
  useEffect(() => {
    if (currentUser && classTeacherAssignments.length > 0) {
      const userAssignment = classTeacherAssignments.find((c: any) => 
        c.teacherId === currentUser.id || 
        (currentUser.fullName && c.teacher && c.teacher.toLowerCase() === currentUser.fullName.toLowerCase())
      );
      if (userAssignment) {
        const matchingGrade = grades.find(g => g.id === userAssignment.gradeId || g.name === userAssignment.grade);
        if (matchingGrade) {
          setSelectedGradeId(matchingGrade.id);
        }
        if (userAssignment.stream && userAssignment.stream !== 'All Streams') {
          setSelectedStream(userAssignment.stream);
        }
      }
    }
  }, [currentUser, classTeacherAssignments, grades]);

  // Selected Grade Object
  const selectedGradeObj = useMemo(() => {
    return grades.find(g => g.id === selectedGradeId);
  }, [grades, selectedGradeId]);

  // Get available streams for selected grade (combining configured grade streams + registered learner streams)
  const availableStreams = useMemo(() => {
    if (!selectedGradeObj) return [];
    
    // Configured streams for this grade
    const configStreams = (selectedGradeObj.streams || []).map(s => s.name.trim());
    
    // Learners in this grade
    const gradeLearners = allLearners.filter(learner => {
      const learnerGradeStr = learner.grade ? learner.grade.toString() : '';
      const gradeObjName = selectedGradeObj.name || '';
      const gradeObjNum = gradeObjName.replace(/\D/g, '');

      const gradeNumMatch = gradeObjNum !== '' && learnerGradeStr === gradeObjNum;
      const gradeNameMatch = learner.gradeLabel === gradeObjName || learnerGradeStr === selectedGradeObj.id;
      return gradeNumMatch || gradeNameMatch || gradeObjName.includes(learnerGradeStr);
    });

    const registeredStreams = Array.from(new Set(gradeLearners.map(l => (l.stream || '').trim()).filter(Boolean)));

    return Array.from(new Set([...configStreams, ...registeredStreams]));
  }, [selectedGradeObj, allLearners]);

  // Lookup assigned class teacher for a learner
  const getClassTeacherForLearner = (learner: Learner) => {
    const learnerGradeName = selectedGradeObj?.name || `Grade ${learner.grade}`;
    const match = classTeacherAssignments.find((c: any) => 
      (c.gradeId === selectedGradeId || c.grade === learnerGradeName) &&
      (c.stream?.toLowerCase() === learner.stream?.toLowerCase() || c.stream === 'All Streams' || !c.stream)
    );
    return match ? { id: match.teacherId, name: match.teacher } : null;
  };

  // Calculate consecutive absence streak for a learner
  const calculateConsecutiveAbsenceStreak = (learnerId: string, currentRecordsMap?: Record<string, string>) => {
    const sheetsCopy = [...allSheets];
    if (selectedGradeId && currentRecordsMap) {
      const existingIdx = sheetsCopy.findIndex(s => s.date === selectedDate && s.gradeId === selectedGradeId && s.streamId === selectedStream);
      const sheetObj: AttendanceSheet = {
        date: selectedDate,
        gradeId: selectedGradeId,
        streamId: selectedStream,
        records: currentRecordsMap as any,
        reasons: currentReasons
      };
      if (existingIdx >= 0) sheetsCopy[existingIdx] = sheetObj;
      else sheetsCopy.push(sheetObj);
    }

    // Sort sheets by date ascending
    const sortedSheets = sheetsCopy.sort((a, b) => a.date.localeCompare(b.date));
    
    // Build array of recorded dates
    const learnerHistory: { date: string; status: string; reason?: string }[] = [];
    sortedSheets.forEach(sheet => {
      if (sheet.records && sheet.records[learnerId]) {
        learnerHistory.push({ 
          date: sheet.date, 
          status: sheet.records[learnerId],
          reason: sheet.reasons?.[learnerId] 
        });
      }
    });

    // Calculate streak backwards from latest sheet
    let streak = 0;
    const absentDates: string[] = [];
    for (let i = learnerHistory.length - 1; i >= 0; i--) {
      if (learnerHistory[i].status === 'Absent') {
        streak++;
        absentDates.unshift(learnerHistory[i].date);
      } else {
        break;
      }
    }

    return { streak, absentDates, fullHistory: learnerHistory };
  };

  // Filter learners by grade, stream, search query & alert filter
  const filteredLearners = useMemo(() => {
    return allLearners.filter(learner => {
      // Grade match
      let gradeMatch = true;
      if (selectedGradeObj) {
        const gradeNumMatch = learner.grade.toString() === selectedGradeObj.name.replace(/\D/g, '');
        const gradeNameMatch = learner.gradeLabel === selectedGradeObj.name || learner.grade.toString() === selectedGradeObj.id;
        gradeMatch = gradeNumMatch || gradeNameMatch || selectedGradeObj.name.includes(learner.grade.toString());
      }

      // Stream match
      let streamMatch = true;
      if (selectedStream !== 'all') {
        streamMatch = learner.stream?.toLowerCase() === selectedStream.toLowerCase();
      }

      // Search match
      let searchMatch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        searchMatch = learner.name.toLowerCase().includes(q) || 
                      learner.admNo.toLowerCase().includes(q) ||
                      (learner.assessNo && learner.assessNo.toLowerCase().includes(q));
      }

      // 3+ Days Absence Alert Filter
      let alertMatch = true;
      if (onlyAlertsFilter) {
        const { streak } = calculateConsecutiveAbsenceStreak(learner.id, currentRecords);
        alertMatch = streak >= 3;
      }

      // Student Type match
      let typeMatch = true;
      if (studentTypeFilter !== 'all') {
        const lType = learner.type || 'Day Scholar';
        typeMatch = lType === studentTypeFilter;
      }

      return gradeMatch && streamMatch && searchMatch && alertMatch && typeMatch;
    });
  }, [allLearners, selectedGradeObj, selectedStream, searchQuery, onlyAlertsFilter, studentTypeFilter, currentRecords, allSheets]);

  // Compute active 3+ consecutive days absence alerts across current selection
  const activeAlerts = useMemo(() => {
    const alerts: Array<{
      learner: Learner;
      streak: number;
      dates: string[];
      classTeacher: { id?: string; name?: string } | null;
    }> = [];

    filteredLearners.forEach(learner => {
      const { streak, absentDates } = calculateConsecutiveAbsenceStreak(learner.id, currentRecords);
      if (streak >= 3) {
        alerts.push({
          learner,
          streak,
          dates: absentDates,
          classTeacher: getClassTeacherForLearner(learner)
        });
      }
    });

    return alerts;
  }, [filteredLearners, currentRecords, allSheets, classTeacherAssignments, selectedGradeId, selectedStream]);

  // Load existing sheet if present for current date, grade, and stream
  useEffect(() => {
    if (!selectedGradeId) return;
    
    const existingSheet = allSheets.find(s => 
      s.date === selectedDate && 
      s.gradeId === selectedGradeId && 
      s.streamId === selectedStream
    );

    if (existingSheet) {
      setCurrentRecords(existingSheet.records || {});
      setCurrentReasons(existingSheet.reasons || {});
      setIsSaved(true);
    } else {
      // Initialize default status to 'Full' for learners who don't have a status set
      const initialRecs: Record<string, 'AM' | 'PM' | 'Full' | 'Absent'> = {};
      filteredLearners.forEach(l => {
        initialRecs[l.id] = 'Full';
      });
      setCurrentRecords(initialRecs);
      setCurrentReasons({});
      setIsSaved(false);
    }
  }, [selectedDate, selectedGradeId, selectedStream, allSheets, filteredLearners.length]);

  // Handle status toggle for a learner
  const handleStatusChange = (learnerId: string, status: 'AM' | 'PM' | 'Full' | 'Absent') => {
    setCurrentRecords(prev => ({
      ...prev,
      [learnerId]: status
    }));
    setIsSaved(false);
  };

  // Handle reason change for an absent learner
  const handleReasonChange = (learnerId: string, reason: string) => {
    setCurrentReasons(prev => ({
      ...prev,
      [learnerId]: reason
    }));
    setIsSaved(false);
  };

  // Bulk actions
  const handleBulkMark = (status: 'AM' | 'PM' | 'Full' | 'Absent') => {
    const updated = { ...currentRecords };
    filteredLearners.forEach(l => {
      updated[l.id] = status;
    });
    setCurrentRecords(updated);
    setIsSaved(false);
  };

  // Manual Trigger Alert for a specific learner
  const handleManualAlertSend = (learner: Learner, streak: number, absentDates: string[]) => {
    const classTeacher = getClassTeacherForLearner(learner);
    const gradeName = selectedGradeObj?.name || `Grade ${learner.grade}`;
    const teacherId = classTeacher?.id || 'ALL_CLASS_TEACHERS';
    const teacherName = classTeacher?.name || 'Assigned Class Teacher';
    const reasonText = currentReasons[learner.id] ? ` (Reason: ${currentReasons[learner.id]})` : '';

    const alertText = `🚨 ABSENCE ALERT: Learner ${learner.name} (Adm No: ${learner.admNo}, ${gradeName} ${learner.stream || ''}) has been ABSENT for ${streak} consecutive days (${absentDates.join(', ')})${reasonText}. Please contact parent/guardian at ${learner.parentPhone || 'No contact'}.`;

    const newMsg: Message = {
      id: `alert_${learner.id}_${Date.now()}`,
      senderId: currentUser?.id || 'SYSTEM_ATTENDANCE_BOT',
      receiverId: teacherId,
      learnerId: learner.id,
      text: alertText,
      senderRole: 'Teacher',
      timestamp: new Date().toISOString(),
      read: false
    };

    const existingMessages = getMessages();
    saveMessages([...existingMessages, newMsg]);

    if (teacherId && teacherId !== 'ALL_CLASS_TEACHERS') {
      sendNotification(teacherId, alertText);
    }

    setSaveToast(`Notification sent to ${teacherName} regarding ${learner.name}!`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Save current roll sheet to storage & dispatch automated notifications
  const handleSaveRoll = () => {
    if (!selectedGradeId) return;

    const newSheets = [...allSheets];
    const sheetIdx = newSheets.findIndex(s => 
      s.date === selectedDate && 
      s.gradeId === selectedGradeId && 
      s.streamId === selectedStream
    );

    const sheetData: AttendanceSheet = {
      date: selectedDate,
      gradeId: selectedGradeId,
      streamId: selectedStream,
      records: currentRecords,
      reasons: currentReasons,
      lastUpdatedBy: currentUser?.fullName || currentUser?.username || 'Administrator',
      lastUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (sheetIdx >= 0) {
      newSheets[sheetIdx] = sheetData;
    } else {
      newSheets.push(sheetData);
    }

    saveAttendanceSheets(newSheets);
    setAllSheets(newSheets);
    setIsSaved(true);

    // Evaluate 3+ consecutive days absence and send automated alert messages to class teachers
    let newNotificationsCount = 0;
    const existingMessages = getMessages();
    const generatedAlerts: Message[] = [];

    filteredLearners.forEach(learner => {
      const { streak, absentDates } = calculateConsecutiveAbsenceStreak(learner.id, currentRecords);
      if (streak >= 3) {
        const classTeacher = getClassTeacherForLearner(learner);
        const gradeName = selectedGradeObj?.name || `Grade ${learner.grade}`;
        const teacherId = classTeacher?.id || 'ALL_CLASS_TEACHERS';
        const teacherName = classTeacher?.name || 'Assigned Class Teacher';

        // Check if an alert message for this streak already exists
        const alreadyNotified = existingMessages.some(
          m => m.learnerId === learner.id && m.text.includes(absentDates[absentDates.length - 1])
        );

        if (!alreadyNotified) {
          newNotificationsCount++;
          const alertMessageText = `🚨 AUTOMATED ABSENCE ALERT: Learner ${learner.name} (Adm No: ${learner.admNo}, ${gradeName} ${learner.stream || ''}) has been recorded ABSENT for ${streak} consecutive days (${absentDates.join(', ')}). Class teacher (${teacherName}) is requested to follow up immediately. Parent Contact: ${learner.parentPhone || 'Not available'}.`;

          const alertMsg: Message = {
            id: `alert_${learner.id}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            senderId: 'SYSTEM_ATTENDANCE_BOT',
            receiverId: teacherId,
            learnerId: learner.id,
            text: alertMessageText,
            senderRole: 'Teacher',
            timestamp: new Date().toISOString(),
            read: false
          };

          generatedAlerts.push(alertMsg);

          if (teacherId && teacherId !== 'ALL_CLASS_TEACHERS') {
            sendNotification(teacherId, alertMessageText);
          }
        }
      }
    });

    if (generatedAlerts.length > 0) {
      saveMessages([...existingMessages, ...generatedAlerts]);
      setSaveToast(`Attendance Roll saved! 🚨 ${generatedAlerts.length} automated teacher alert(s) dispatched!`);
    } else {
      setSaveToast('Attendance Roll saved successfully!');
    }

    setTimeout(() => setSaveToast(null), 4000);
  };

  // Stats calculation for active selection
  const stats = useMemo(() => {
    let total = filteredLearners.length;
    let presentFull = 0;
    let presentAM = 0;
    let presentPM = 0;
    let absent = 0;

    filteredLearners.forEach(l => {
      const st = currentRecords[l.id] || 'Full';
      if (st === 'Full') presentFull++;
      else if (st === 'AM') presentAM++;
      else if (st === 'PM') presentPM++;
      else if (st === 'Absent') absent++;
    });

    let dayScholarTotal = 0;
    let dayScholarPresent = 0;
    let dayScholarAbsent = 0;

    let boarderTotal = 0;
    let boarderPresent = 0;
    let boarderAbsent = 0;

    filteredLearners.forEach(l => {
      const st = currentRecords[l.id] || 'Full';
      const isPresent = st !== 'Absent';
      const isBoarder = (l.type || 'Day Scholar') === 'Boarder';

      if (isBoarder) {
        boarderTotal++;
        if (isPresent) boarderPresent++; else boarderAbsent++;
      } else {
        dayScholarTotal++;
        if (isPresent) dayScholarPresent++; else dayScholarAbsent++;
      }
    });

    const totalPresent = presentFull + presentAM + presentPM;
    const rate = total > 0 ? Math.round((totalPresent / total) * 100) : 0;
    const boarderRate = boarderTotal > 0 ? Math.round((boarderPresent / boarderTotal) * 100) : 0;
    const dayScholarRate = dayScholarTotal > 0 ? Math.round((dayScholarPresent / dayScholarTotal) * 100) : 0;

    return { 
      total, presentFull, presentAM, presentPM, totalPresent, absent, rate,
      dayScholarTotal, dayScholarPresent, dayScholarAbsent, dayScholarRate,
      boarderTotal, boarderPresent, boarderAbsent, boarderRate
    };
  }, [filteredLearners, currentRecords]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Read-only system rule banner */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-xl flex items-center justify-between text-amber-900 text-xs font-semibold shadow-2xs">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span><strong>System Rule:</strong> Attendance & Analytics records are <strong>VIEW-ONLY</strong> for staff — no unauthorized edits permitted.</span>
        </div>
        {accessMode === 'FULL' && (
          <span className="text-[11px] font-bold bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> FULL ACCESS
          </span>
        )}
        {accessMode === 'FULL_TOD' && (
          <span className="text-[11px] font-bold bg-emerald-400 text-slate-950 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> ACTIVE TOD — FULL SCHOOL VIEW
          </span>
        )}
        {accessMode === 'RESTRICTED' && (
          <span className="text-[11px] font-bold bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> RESTRICTED — MY CLASS ONLY
          </span>
        )}
      </div>

      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold text-blue-600 uppercase tracking-widest mb-1">
            <UserCheck className="w-4 h-4 text-blue-500" /> Daily Learner Attendance Register
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Attendance Roll & Automated Alerts</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Mark class registers with automated notifications to class teachers for learners absent &gt; 3 consecutive days.
          </p>
        </div>

        {/* Top Action Controls */}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <button
            onClick={() => setActiveTab(activeTab === 'mark' ? 'history' : 'mark')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer"
          >
            <History className="w-4 h-4 text-slate-600" />
            {activeTab === 'mark' ? 'Roll History Logs' : 'Back to Roll Register'}
          </button>

          <button 
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" /> Print Roll Sheet
          </button>

          <button
            onClick={handleSaveRoll}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Attendance Roll
          </button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {saveToast && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-700 font-bold text-xs flex items-center justify-between transition animate-in fade-in slide-in-from-top-2 print:hidden">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-5 h-5 text-emerald-400 animate-bounce" />
            <span>{saveToast}</span>
          </div>
          <button onClick={() => setSaveToast(null)} className="text-slate-400 hover:text-white text-xs cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Active Consecutive Absences Alert Banner */}
      {activeAlerts.length > 0 && activeTab === 'mark' && (
        <div className="bg-rose-50 border-2 border-rose-200 p-5 rounded-3xl shadow-xs space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-black text-rose-900">
                🚨 AUTOMATED ABSENCE ALERTS ({activeAlerts.length} Learner(s) Absent &gt; 3 Consecutive Days)
              </h3>
            </div>
            <span className="text-[10px] font-extrabold bg-rose-200 text-rose-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Requires Teacher Intervention
            </span>
          </div>

          <p className="text-xs text-rose-800 font-medium">
            The system detected learners with 3 or more consecutive unexcused absences. Automated notifications are sent to their assigned class teachers upon saving.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {activeAlerts.map(({ learner, streak, dates, classTeacher }, idx) => (
              <div key={idx} className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-2xs space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{learner.name}</h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {learner.gradeLabel || `Grade ${learner.grade}`}
                      </span>
                      <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        Stream: {learner.stream || 'Main'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">Adm: {learner.admNo}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-md shrink-0">
                    {streak} Days Absent
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 font-medium space-y-0.5">
                  <p><strong>Dates:</strong> {dates.join(', ')}</p>
                  <p><strong>Class Teacher:</strong> {classTeacher?.name || 'Not assigned'}</p>
                  {learner.parentPhone && (
                    <p className="text-blue-600 font-bold flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" /> <a href={`tel:${learner.parentPhone}`} className="hover:underline">{learner.parentPhone}</a>
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleManualAlertSend(learner, streak, dates)}
                  className="w-full mt-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-3 h-3" /> Send Teacher Notification
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Tabs */}
      {activeTab === 'mark' ? (
        <>
          {/* Roll Control Filter Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Date Selector */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">
                  Attendance Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Grade Selector */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">
                  Grade / Class
                </label>
                <select
                  value={selectedGradeId}
                  onChange={(e) => setSelectedGradeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Stream Selector */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">
                  Stream
                </label>
                <select
                  value={selectedStream}
                  onChange={(e) => setSelectedStream(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">
                    All Streams ({
                      allLearners.filter(l => {
                        const lGrade = l.grade ? l.grade.toString() : '';
                        const gName = selectedGradeObj?.name || '';
                        const gNum = gName.replace(/\D/g, '');
                        return (gNum !== '' && lGrade === gNum) || l.gradeLabel === gName || lGrade === selectedGradeObj?.id;
                      }).length
                    })
                  </option>
                  {availableStreams.map((stName, idx) => {
                    const countInStream = allLearners.filter(l => {
                      const lGrade = l.grade ? l.grade.toString() : '';
                      const gName = selectedGradeObj?.name || '';
                      const gNum = gName.replace(/\D/g, '');
                      const matchGrade = (gNum !== '' && lGrade === gNum) || l.gradeLabel === gName || lGrade === selectedGradeObj?.id;
                      return matchGrade && (l.stream || '').trim().toLowerCase() === stName.toLowerCase();
                    }).length;

                    return (
                      <option key={idx} value={stName}>
                        {stName} ({countInStream} learner{countInStream !== 1 ? 's' : ''})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Student Type Filter */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">
                  Student Type
                </label>
                <select
                  value={studentTypeFilter}
                  onChange={(e: any) => setStudentTypeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types (Day & Boarder)</option>
                  <option value="Day Scholar">🏠 Day Scholars</option>
                  <option value="Boarder">🛏️ Boarders</option>
                </select>
              </div>

              {/* Learner Search */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">
                  Find Learner
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name or adm no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Bulk Action Controls & Filters */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Bulk Actions:</span>
                <button
                  onClick={() => handleBulkMark('Full')}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-extrabold transition cursor-pointer"
                >
                  Mark All Full Day
                </button>
                <button
                  onClick={() => handleBulkMark('AM')}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-extrabold transition cursor-pointer"
                >
                  Mark All AM
                </button>
                <button
                  onClick={() => handleBulkMark('Absent')}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-extrabold transition cursor-pointer"
                >
                  Mark All Absent
                </button>

                <button
                  onClick={() => setOnlyAlertsFilter(!onlyAlertsFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    onlyAlertsFilter 
                      ? 'bg-rose-600 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> 
                  {onlyAlertsFilter ? 'Showing 3+ Days Absent Only' : 'Filter 3+ Days Absent'}
                </button>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {isSaved ? (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-extrabold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Saved to Register
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-extrabold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Unsaved Changes
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Roll Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Total Attendance</span>
              <div className="text-xl font-black text-slate-900">{stats.totalPresent} / {stats.total} <span className="text-xs font-bold text-slate-500">({stats.rate}%)</span></div>
              <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Absent: <strong className="text-rose-600">{stats.absent}</strong></span>
                <span>Alerts: <strong className="text-rose-700">{activeAlerts.length}</strong></span>
              </div>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-widest block">🏠 Day Scholars Status</span>
              <div className="text-xl font-black text-emerald-900">
                {stats.dayScholarPresent} <span className="text-xs font-bold text-slate-600">Present</span> / {stats.dayScholarTotal}
              </div>
              <div className="text-[11px] font-bold text-emerald-700 flex items-center justify-between pt-1 border-t border-emerald-200/60">
                <span>Absent: <strong className="text-rose-700">{stats.dayScholarAbsent}</strong></span>
                <span>Rate: <strong>{stats.dayScholarRate}%</strong></span>
              </div>
            </div>

            <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-indigo-800 tracking-widest block">🛏️ Boarders Status</span>
              <div className="text-xl font-black text-indigo-900">
                {stats.boarderPresent} <span className="text-xs font-bold text-slate-600">Present</span> / {stats.boarderTotal}
              </div>
              <div className="text-[11px] font-bold text-indigo-700 flex items-center justify-between pt-1 border-t border-indigo-200/60">
                <span>Absent: <strong className="text-rose-700">{stats.boarderAbsent}</strong></span>
                <span>Rate: <strong>{stats.boarderRate}%</strong></span>
              </div>
            </div>

            <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-800 tracking-widest block">⚠️ Absence Alerts</span>
              <div className="text-xl font-black text-rose-900">{activeAlerts.length} Learner(s)</div>
              <div className="text-[11px] font-bold text-rose-700 pt-1 border-t border-rose-200/60">
                3+ Consecutive Days Absent
              </div>
            </div>
          </div>

          {/* Learner Roll Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden printable-area">
            {/* Printable Document Header */}
            <div className="hidden print:block p-6 border-b border-slate-200">
              <h2 className="text-xl font-black text-slate-900 uppercase">OFFICIAL CLASS ATTENDANCE ROLL</h2>
              <div className="flex justify-between text-xs font-bold text-slate-600 mt-2">
                <span>Date: {selectedDate}</span>
                <span>Grade: {selectedGradeObj?.name || selectedGradeId} ({selectedStream})</span>
                <span>Present: {stats.totalPresent}/{stats.total} ({stats.rate}%)</span>
              </div>
            </div>

            {filteredLearners.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-extrabold text-slate-700">No Learners Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No learners matching the selected grade ({selectedGradeObj?.name}) or search query were found in the database.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const dayScholars = filteredLearners.filter(l => (l.type || 'Day Scholar') === 'Day Scholar');
                  const boarders = filteredLearners.filter(l => (l.type || 'Day Scholar') === 'Boarder');

                  const renderSection = (title: string, icon: string, badgeColor: string, learnersList: Learner[], startIndex: number) => {
                    if (learnersList.length === 0) return null;
                    return (
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs mb-6">
                        <div className={`px-5 py-3.5 ${badgeColor} border-b border-slate-200 flex items-center justify-between`}>
                          <div className="flex items-center gap-2.5 font-black text-xs uppercase tracking-wider">
                            <span className="text-base">{icon}</span>
                            <span>{title}</span>
                            <span className="px-2.5 py-0.5 bg-white/90 rounded-full text-[11px] text-slate-800 font-black shadow-xs">
                              {learnersList.length} learner{learnersList.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                                <th className="py-3.5 px-4 w-12">#</th>
                                <th className="py-3.5 px-4">Adm No</th>
                                <th className="py-3.5 px-4">Learner & Class Teacher</th>
                                <th className="py-3.5 px-4">Grade & Stream</th>
                                <th className="py-3.5 px-4">Parent Phone</th>
                                <th className="py-3.5 px-4">Absence Streak</th>
                                <th className="py-3.5 px-4 text-center">Attendance Status</th>
                                <th className="py-3.5 px-4 text-center print:hidden">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                              {learnersList.map((learner, idx) => {
                                const currentStatus = currentRecords[learner.id] || 'Full';
                                const classTeacher = getClassTeacherForLearner(learner);
                                const { streak } = calculateConsecutiveAbsenceStreak(learner.id, currentRecords);
                                const hasAlert = streak >= 3;

                                return (
                                  <tr key={learner.id} className={`hover:bg-slate-50/60 transition ${hasAlert ? 'bg-rose-50/40' : ''}`}>
                                    <td className="py-3 px-4 font-bold text-slate-400">{startIndex + idx + 1}</td>
                                    <td className="py-3 px-4 font-black text-slate-700">{learner.admNo}</td>
                                    
                                    {/* Learner Info & Class Teacher Link */}
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-xs shrink-0">
                                          {learner.name.charAt(0)}
                                        </div>
                                        <div>
                                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                            {learner.name}
                                            {hasAlert && (
                                              <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-full animate-pulse flex items-center gap-1">
                                                <AlertTriangle className="w-2.5 h-2.5" /> 3+ Days Alert
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[10px] text-slate-400 font-semibold block">
                                            Class Teacher: {classTeacher?.name || 'Unassigned'}
                                          </span>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Grade & Stream */}
                                    <td className="py-3 px-4">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-black text-slate-800">
                                          {learner.gradeLabel || `Grade ${learner.grade}`}
                                        </span>
                                        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md w-fit">
                                          Stream: {learner.stream || 'Main'}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Parent Phone */}
                                    <td className="py-3 px-4">
                                      {learner.parentPhone ? (
                                        <a href={`tel:${learner.parentPhone}`} className="text-blue-600 font-bold flex items-center gap-1 hover:underline">
                                          <Phone className="w-3 h-3" /> {learner.parentPhone}
                                        </a>
                                      ) : (
                                        <span className="text-slate-400 italic">Not set</span>
                                      )}
                                    </td>

                                    {/* Absence Streak */}
                                    <td className="py-3 px-4">
                                      {streak > 0 ? (
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black inline-flex items-center gap-1 ${
                                          streak >= 3 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-50 text-amber-700'
                                        }`}>
                                          {streak} Day(s) Consecutive
                                        </span>
                                      ) : (
                                        <span className="text-emerald-600 font-bold">On Track</span>
                                      )}
                                    </td>

                                    {/* Attendance Controls */}
                                    <td className="py-3 px-4 text-center">
                                      <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl gap-1 print:hidden">
                                        <button
                                          onClick={() => handleStatusChange(learner.id, 'Full')}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                                            currentStatus === 'Full' 
                                              ? 'bg-emerald-600 text-white shadow-xs' 
                                              : 'text-slate-600 hover:text-slate-900'
                                          }`}
                                        >
                                          Full Day
                                        </button>
                                        <button
                                          onClick={() => handleStatusChange(learner.id, 'AM')}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                                            currentStatus === 'AM' 
                                              ? 'bg-blue-600 text-white shadow-xs' 
                                              : 'text-slate-600 hover:text-slate-900'
                                          }`}
                                        >
                                          AM
                                        </button>
                                        <button
                                          onClick={() => handleStatusChange(learner.id, 'PM')}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                                            currentStatus === 'PM' 
                                              ? 'bg-indigo-600 text-white shadow-xs' 
                                              : 'text-slate-600 hover:text-slate-900'
                                          }`}
                                        >
                                          PM
                                        </button>
                                        <button
                                          onClick={() => handleStatusChange(learner.id, 'Absent')}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                                            currentStatus === 'Absent' 
                                              ? 'bg-rose-600 text-white shadow-xs' 
                                              : 'text-slate-600 hover:text-slate-900'
                                          }`}
                                        >
                                          Absent
                                        </button>
                                      </div>

                                      {currentStatus === 'Absent' && (
                                        <div className="mt-2 text-left print:hidden">
                                          <input
                                            type="text"
                                            placeholder="Reason (e.g., Sick, Unexcused)"
                                            value={currentReasons[learner.id] || ''}
                                            onChange={(e) => handleReasonChange(learner.id, e.target.value)}
                                            className="w-full text-[11px] font-semibold bg-rose-50/90 border border-rose-200 text-rose-900 placeholder-rose-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white transition"
                                          />
                                        </div>
                                      )}

                                      <span className="hidden print:inline-block font-black text-xs uppercase px-2 py-0.5 rounded border">
                                        {currentStatus} {currentReasons[learner.id] ? `(${currentReasons[learner.id]})` : ''}
                                      </span>
                                    </td>

                                    {/* Quick Actions */}
                                    <td className="py-3 px-4 text-center print:hidden">
                                      <button
                                        onClick={() => setSelectedLearnerForHistory(learner)}
                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1 mx-auto"
                                      >
                                        <History className="w-3 h-3 text-slate-500" /> Log History
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  };

                  let runningIndex = 0;
                  const dsElem = renderSection('Day Scholars Section', '🏠', 'bg-emerald-50 text-emerald-900', dayScholars, 0);
                  runningIndex += dayScholars.length;
                  const boardersElem = renderSection('Boarders Section', '🛏️', 'bg-indigo-50 text-indigo-900', boarders, runningIndex);

                  return (
                    <>
                      {dsElem}
                      {boardersElem}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Bottom Save Reminder Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 print:hidden">
              <span className="text-xs text-slate-500 font-medium">
                Showing {filteredLearners.length} learner records for Grade {selectedGradeObj?.name}
              </span>

              <button
                onClick={handleSaveRoll}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Roll & Dispatch Alerts
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Roll History Logs View */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900">Saved Attendance Roll Registers</h3>
            <p className="text-xs text-slate-500 font-medium">Historical register sheets saved across classes and dates</p>
          </div>

          {allSheets.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">
              No historical roll registers recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {allSheets.map((sheet, i) => {
                const gradeName = grades.find(g => g.id === sheet.gradeId)?.name || sheet.gradeId;
                const recordCount = Object.keys(sheet.records || {}).length;
                const presentCount = Object.values(sheet.records || {}).filter(st => ['AM', 'PM', 'Full'].includes(st as string)).length;
                const rate = recordCount > 0 ? Math.round((presentCount / recordCount) * 100) : 0;

                return (
                  <div key={i} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 rounded-xl px-3 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{gradeName}</span>
                        <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                          {sheet.streamId === 'all' ? 'All Streams' : sheet.streamId}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Date: {sheet.date} • Recorded by {sheet.lastUpdatedBy || 'Staff'} at {sheet.lastUpdatedAt || '—'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900">{presentCount}/{recordCount} Present</span>
                        <span className="text-xs font-extrabold text-emerald-600 block">{rate}% Attendance Rate</span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedDate(sheet.date);
                          setSelectedGradeId(sheet.gradeId);
                          setSelectedStream(sheet.streamId);
                          setActiveTab('mark');
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 transition cursor-pointer"
                      >
                        Load Sheet <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Learner Attendance History Modal */}
      {selectedLearnerForHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Learner Attendance Log</span>
                <h3 className="text-lg font-black text-slate-900">{selectedLearnerForHistory.name}</h3>
                <p className="text-xs text-slate-500 font-medium">Adm No: {selectedLearnerForHistory.admNo} • Grade: {selectedLearnerForHistory.gradeLabel || `Grade ${selectedLearnerForHistory.grade}`} • Stream: {selectedLearnerForHistory.stream || 'Main'}</p>
              </div>
              <button 
                onClick={() => setSelectedLearnerForHistory(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const { streak, fullHistory } = calculateConsecutiveAbsenceStreak(selectedLearnerForHistory.id, currentRecords);
              const totalDays = fullHistory.length;
              const presentDays = fullHistory.filter(h => h.status !== 'Absent').length;
              const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold block">Overall Rate</span>
                      <span className="text-sm font-black text-emerald-600">{rate}%</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold block">Present Days</span>
                      <span className="text-sm font-black text-slate-900">{presentDays}/{totalDays}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold block">Absence Streak</span>
                      <span className={`text-sm font-black ${streak >= 3 ? 'text-rose-600' : 'text-slate-900'}`}>{streak} Days</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Date Timeline</h4>
                    {fullHistory.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No historical attendance dates logged yet.</p>
                    ) : (
                      fullHistory.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs font-bold">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-700">{item.date}</span>
                            {item.reason && (
                              <span className="text-[10px] text-rose-600 font-medium italic">
                                Reason: {item.reason}
                              </span>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase ${
                            item.status === 'Full' ? 'bg-emerald-100 text-emerald-800' :
                            item.status === 'AM' ? 'bg-blue-100 text-blue-800' :
                            item.status === 'PM' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedLearnerForHistory(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
