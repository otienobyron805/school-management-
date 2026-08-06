import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Calendar, MessageSquare, Phone, ShieldCheck, 
  User, Users, BookOpen, Award, Clock, ArrowUpRight, CheckCircle, 
  XCircle, Send, School, ChevronRight, Info, Search, FileText, 
  Sparkles, RefreshCw, Star, ArrowRight, UserCheck, TrendingUp, BarChart3, MapPin
} from 'lucide-react';
import { 
  secureGet, secureSet, getLearners, getGrades, getSubjects, 
  getGradingRules, getAttendanceSheets, UserAccount, Learner, Grade, Subject, 
  GradingRule, AttendanceSheet, getMessages, saveMessages, Message, getClassTeacherAssignments, getUsers,
  getGateLogs, GateLog
} from '../utils/db';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import ParentTeacherChat from './ParentTeacherChat';

interface ParentPortalProps {
  user: UserAccount;
  activeTab?: 'academics' | 'attendance' | 'messages' | 'profile';
  onTabChange?: (tab: 'academics' | 'attendance' | 'messages' | 'profile') => void;
}

export default function ParentPortal({ user, activeTab, onTabChange }: ParentPortalProps) {
  // DB States
  const [learners, setLearners] = useState<Learner[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradingRules, setGradingRules] = useState<GradingRule[]>([]);
  const [attendanceSheets, setAttendanceSheets] = useState<AttendanceSheet[]>([]);
  const [classTeacherAssignments, setClassTeacherAssignments] = useState<any[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [savedMarks, setSavedMarks] = useState<any[]>([]);
  const [gateLogs, setGateLogs] = useState<GateLog[]>([]);

  // Parent specific states
  const [myChildren, setMyChildren] = useState<Learner[]>([]);
  const [selectedChild, setSelectedChild] = useState<Learner | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'academics' | 'attendance' | 'messages' | 'profile'>('academics');

  useEffect(() => {
    if (activeTab) {
      setActiveSubTab(activeTab);
    }
  }, [activeTab]);

  const handleTabChange = (tab: 'academics' | 'attendance' | 'messages' | 'profile') => {
    setActiveSubTab(tab);
    onTabChange?.(tab);
  };

  // UI triggers
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load database
    const loadedLearners = getLearners();
    const loadedGrades = getGrades();
    const loadedSubjects = getSubjects();
    const loadedRules = getGradingRules();
    const loadedAttendance = getAttendanceSheets();
    
    setLearners(loadedLearners);
    setGrades(loadedGrades);
    setSubjects(loadedSubjects);
    setGradingRules(loadedRules);
    setAttendanceSheets(loadedAttendance);
    setClassTeacherAssignments(getClassTeacherAssignments());
    setUsers(getUsers());
    setGateLogs(getGateLogs());

    const storedExams = secureGet('exams');
    setExams(storedExams ? JSON.parse(storedExams) : []);

    const storedMarks = secureGet('school_exam_marks');
    setSavedMarks(storedMarks ? JSON.parse(storedMarks) : []);
  }, []);

  const normalizePhone = (phone: string) => {
    let clean = phone.trim().replace(/\D/g, '');
    // If it starts with 254 and has 12 digits, remove 254
    if (clean.startsWith('254') && clean.length === 12) {
      clean = clean.slice(3);
    }
    // If it starts with 0 and has 10 digits, remove 0
    if (clean.startsWith('0') && clean.length === 10) {
      clean = clean.slice(1);
    }
    return clean;
  };

  // Filter children linked to parent's logged-in phone number (or show all learners if logged in as Admin/Teacher for previewing!)
  useEffect(() => {
    if (learners.length === 0) return;

    const loginIdentifier = user.phone || user.username;
    const parentPhone = normalizePhone(loginIdentifier);
    
    const matched = learners.filter(l => {
      if (!l.parentPhone) {
        console.log('DEBUG: ParentPortal - learner has no parentPhone:', l.name);
        return false;
      }
      const childPhone = normalizePhone(l.parentPhone);
      console.log('DEBUG: ParentPortal - checking:', l.name, 'l.parentPhone (raw):', l.parentPhone, 'childPhone (normalized):', childPhone, 'userPhone (normalized):', parentPhone);
      
      return childPhone === parentPhone;
    });

    setMyChildren(matched);
    if (matched.length > 0) {
      const storedPref = secureGet(`parent_active_child_${user.id}`);
      const foundPref = matched.find(c => c.id === storedPref);
      setSelectedChild(foundPref || matched[0]);
    } else {
      setSelectedChild(null);
    }
  }, [learners, user]);

  const handleSelectChild = (child: Learner) => {
    setSelectedChild(child);
    secureSet(`parent_active_child_${user.id}`, child.id);
    triggerToast(`Switched view to ${child.name}`);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Get active child details
  const childGrade = selectedChild ? grades.find(g => g.name === selectedChild.gradeLabel || `Grade ${g.id.replace(/\D/g, '')}` === selectedChild.gradeLabel || parseInt(g.name.replace(/\D/g, ''), 10) === selectedChild.grade) : null;
  const childGradeNum = selectedChild ? selectedChild.grade : 8;
  const childSubjects = subjects.filter(sub => sub.grades.includes(childGradeNum));

  // Calculate Attendance Stats for Active Child
  const childAttendanceRecords = selectedChild 
    ? attendanceSheets.map(sheet => {
        const record = sheet.records[selectedChild.id];
        return {
          date: sheet.date,
          status: record || 'Not Marked'
        };
      }).filter(r => r.status !== 'Not Marked')
    : [];

  const totalSchoolDays = childAttendanceRecords.length;
  const presentDays = childAttendanceRecords.filter(r => ['AM', 'PM', 'Full'].includes(r.status)).length;
  const absentDays = childAttendanceRecords.filter(r => r.status === 'Absent').length;
  const attendancePercentage = totalSchoolDays > 0 ? Math.round((presentDays / totalSchoolDays) * 100) : 0;

  // Calculate Marks and Exam progress
  const childMarks = selectedChild 
    ? savedMarks.filter(m => m.learnerId === selectedChild.id)
    : [];

  // Helper to get grade code based on score
  const getScoreGrade = (score: number): { code: string; label: string; category: string; bg: string; text: string } => {
    const matched = gradingRules.find(r => score >= r.min && score <= r.max);
    if (matched) {
      let bg = 'bg-slate-100';
      let text = 'text-slate-700';
      let label = 'Meeting Expectation';
      if (matched.category === 'ee') {
        bg = 'bg-emerald-50 border border-emerald-100';
        text = 'text-emerald-700';
        label = 'Exceeding Expectations';
      } else if (matched.category === 'me') {
        bg = 'bg-blue-50 border border-blue-100';
        text = 'text-blue-700';
        label = 'Meeting Expectations';
      } else if (matched.category === 'ae') {
        bg = 'bg-amber-50 border border-amber-100';
        text = 'text-amber-700';
        label = 'Approaching Expectations';
      } else if (matched.category === 'be') {
        bg = 'bg-rose-50 border border-rose-100';
        text = 'text-rose-700';
        label = 'Below Expectations';
      }
      return {
        code: matched.code,
        label,
        category: matched.category,
        bg,
        text
      };
    }
    return { code: '—', label: 'Unassigned', category: 'custom', bg: 'bg-slate-100', text: 'text-slate-500' };
  };

  // Group academic scores by Exam period
  const academicByExam = exams.map(exam => {
    const marksForExam = childMarks.filter(m => m.examId === exam.id);
    const subjectScores = childSubjects.map(sub => {
      const match = marksForExam.find(m => m.subjectCode === sub.code);
      const score = match ? match.score : null;
      return {
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        score
      };
    });

    const scoresEntered = subjectScores.filter(s => s.score !== null);
    const averageScore = scoresEntered.length > 0 
      ? Math.round(scoresEntered.reduce((sum, s) => sum + (s.score || 0), 0) / scoresEntered.length)
      : null;

    return {
      examId: exam.id,
      examName: exam.examName || exam.name,
      term: exam.term || 'Term 1',
      academicYear: exam.academicYear || exam.year || '2026',
      subjectScores,
      averageScore,
      scoresEnteredCount: scoresEntered.length
    };
  }).filter(e => e.scoresEnteredCount > 0);

  // Prepare chart data (chronological)
  const chartData = [...academicByExam].reverse().map(e => ({
    name: e.examName.split(' ')[0],
    average: e.averageScore,
    fullLabel: e.examName
  }));

  if (myChildren.length === 0) {
    const loginIdentifier = user.phone || user.username;
    const normalizedUserPhone = normalizePhone(loginIdentifier);
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6 text-slate-800 animate-fadeIn">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-150 text-center space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl text-xs text-left max-w-lg mx-auto border border-slate-200 text-slate-600 leading-relaxed">
            <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              DEBUG: No matches found
            </h4>
            <p>Logged in as: {loginIdentifier}</p>
            <p>Normalized phone: {normalizedUserPhone}</p>
            <p>Total learners loaded: {learners.length}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl text-xs text-left max-w-lg mx-auto border border-slate-200 text-slate-600 leading-relaxed">
            <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              How to register your parent portal access:
            </h4>
            1. Ask the School Admin or Class Teacher to update your child's student card.<br />
            2. Enforce that the <strong className="text-slate-800">"Parent Phone Number"</strong> field matches exactly your sign-in phone format.<br />
            3. Once saved by the admin, refresh this page to access full child analytics.
          </div>
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100">
            <Users className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Child Records Not Found</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            There are currently no active student records registered under your phone number: <strong className="text-slate-800">"{user.username}"</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 text-slate-800 animate-fadeIn">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl z-50 text-sm font-semibold flex items-center gap-2"
          >
            ✨ {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parent Welcome Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-[-30%] right-[-10%] w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
            <Users className="w-8 h-8 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-widest font-mono">
              <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Parent Portal Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">Hello, {user.fullName}</h1>
            <p className="text-xs text-indigo-200 font-semibold mt-1">
              <span>Currently tracking analytics and school reports for your <span className="text-white font-bold">{myChildren.length} child/children</span>.</span>
            </p>
          </div>
        </div>

        {/* Children Quick Switcher Tabs */}
        <div className="space-y-2 self-start md:self-auto">
          <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block">Switch Student View:</span>
          <div className="flex gap-2 flex-wrap bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
            {myChildren.map(c => {
              const isActive = selectedChild?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectChild(c)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20' 
                      : 'text-indigo-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {c.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Child Overview Card */}
      {selectedChild && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Student Quick Facts Card */}
          <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-8">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-4xl shadow-inner border border-slate-200">
                {selectedChild.gender === 'Female' ? '👧' : '👦'}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">{selectedChild.name}</h3>
                <span className="text-[11px] font-bold text-slate-400 font-mono tracking-wider uppercase block mt-1.5">
                  ADM: {selectedChild.admNo}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
                  {selectedChild.gradeLabel || `Grade ${selectedChild.grade}`}
                </span>
                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
                  Stream: {selectedChild.stream}
                </span>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Attendance</span>
                <span className={`text-sm font-black ${attendancePercentage < 80 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {attendancePercentage}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Subjects</span>
                <span className="text-sm font-black text-slate-900">
                  {childSubjects.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Term Average</span>
                <span className="text-sm font-black text-slate-900">
                  {academicByExam.length > 0 && academicByExam[0].averageScore 
                    ? `${academicByExam[0].averageScore}%` 
                    : '—'}
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Class Teacher</h4>
              <div className="bg-slate-50 p-4 rounded-2xl">
                {(() => {
                  const teacherAssignment = classTeacherAssignments.find(a => 
                    a.grade === selectedChild?.gradeLabel && a.stream === selectedChild?.stream
                  );
                  const teacher = teacherAssignment ? users.find(u => u.id === teacherAssignment.teacherId) : null;
                  return (
                    <>
                      <p className="text-sm font-black text-slate-900">{teacher ? teacher.fullName : 'Not Assigned'}</p>
                      <p className="text-xs text-slate-500 font-semibold mt-1">Contact: {teacher ? teacher.phone || 'N/A' : 'N/A'}</p>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Right Area: Interactive Tabs stage */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-8">
            
            {/* Custom Tab selectors */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-1">
              <button
                onClick={() => handleTabChange('academics')}
                className={`flex-1 min-w-[140px] py-4 rounded-xl text-xs font-black uppercase tracking-wider text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeSubTab === 'academics'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Academics</span>
              </button>

              <button
                onClick={() => handleTabChange('attendance')}
                className={`flex-1 min-w-[120px] py-3 rounded-xl text-xs font-black uppercase tracking-wider text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeSubTab === 'attendance'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Attendance Log</span>
              </button>

              <button
                onClick={() => handleTabChange('messages')}
                className={`flex-1 min-w-[120px] py-3 rounded-xl text-xs font-black uppercase tracking-wider text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeSubTab === 'messages'
                    ? 'bg-purple-50 text-purple-700 border border-purple-100'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message Teacher</span>
              </button>

              <button
                onClick={() => handleTabChange('profile')}
                className={`flex-1 min-w-[120px] py-3 rounded-xl text-xs font-black uppercase tracking-wider text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeSubTab === 'profile'
                    ? 'bg-sky-50 text-sky-700 border border-sky-100'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Contact Details</span>
              </button>
            </div>

            {/* Active Sub View rendering */}
            <div>
              {activeSubTab === 'academics' && (
                <div className="space-y-6">
                  {/* Academic Progress Trend Chart */}
                  {chartData.length > 1 && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2">
                          <TrendingUp className="w-4 h-4 text-indigo-500" />
                          Academic Performance Trend
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Average Score %</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                              dy={10}
                            />
                            <YAxis 
                              domain={[0, 100]}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                              dx={-10}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1e293b', 
                                border: 'none', 
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                              }}
                              itemStyle={{ color: '#818cf8' }}
                              labelStyle={{ color: '#fff', marginBottom: '4px' }}
                              labelFormatter={(label) => `Exam: ${label}`}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="average" 
                              stroke="#6366f1" 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#colorAvg)" 
                              animationDuration={2000}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {academicByExam.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-black text-slate-700 uppercase">No Academic Marks Entered</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                        Class teachers have not yet submitted scores for {selectedChild.name} for the ongoing academic term exams. Once entered, they will propagate here live.
                      </p>
                    </div>
                  ) : (
                    academicByExam.map(examGroup => (
                      <div key={examGroup.examId} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        
                        {/* Exam Card Header */}
                        <div className="p-5 bg-slate-50/50 border-b border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <span className="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider block w-fit mb-1">
                              {examGroup.term} · {examGroup.academicYear}
                            </span>
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                              {examGroup.examName} Report
                            </h3>
                          </div>
                          
                          <div className="text-center sm:text-right bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 px-4 py-2 rounded-2xl">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">OVERALL AVERAGE</span>
                            <span className="text-lg font-black text-indigo-700 mt-1 block">
                              {examGroup.averageScore}%
                            </span>
                          </div>
                        </div>

                        {/* Subject Progress list */}
                        <div className="p-6 space-y-5">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-blue-500" />
                            CBC SUBJECT PERFORMANCE BREAKDOWN
                          </h4>
                          
                          <div className="space-y-6">
                            {examGroup.subjectScores.map(subScore => {
                              const scoreVal = subScore.score !== null ? subScore.score : 0;
                              const gradeInfo = subScore.score !== null ? getScoreGrade(scoreVal) : null;
                              
                              return (
                                <div key={subScore.subjectId} className="space-y-2">
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                                    <div className="space-y-0.5">
                                      <span className="text-sm font-black text-slate-800">{subScore.subjectName}</span>
                                      <span className="text-[10px] text-slate-400 font-bold block">Subject Code: {subScore.subjectCode}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {subScore.score !== null ? (
                                        <>
                                          <span className="text-sm font-extrabold text-slate-900">{subScore.score} / 100</span>
                                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${gradeInfo?.bg} ${gradeInfo?.text}`}>
                                            {gradeInfo?.code} · {gradeInfo?.label}
                                          </span>
                                        </>
                                      ) : (
                                        <span className="text-xs text-slate-400 italic font-semibold">Mark entry pending</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Beautiful animated linear progress bar */}
                                  {subScore.score !== null && (
                                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/30">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${
                                          scoreVal >= 75 
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                                            : scoreVal >= 50 
                                              ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
                                              : scoreVal >= 40 
                                                ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                                                : 'bg-gradient-to-r from-rose-500 to-pink-500'
                                        }`}
                                        style={{ width: `${scoreVal}%` }}
                                      ></div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    ))
                  )}

                  {/* CBC Grading Guide Card */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Info className="w-4 h-4 text-purple-500" />
                      COMPETENCY-BASED CURRICULUM (CBC) CRITERIA GUIDE
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/60 space-y-1">
                        <span className="text-xs font-black text-emerald-700">Exceeding Expectations (EE)</span>
                        <p className="text-[11px] text-slate-500 leading-relaxed">The learner consistently exhibits outstanding performance and mastery beyond current grade milestones.</p>
                      </div>
                      <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100/60 space-y-1">
                        <span className="text-xs font-black text-blue-700">Meeting Expectations (ME)</span>
                        <p className="text-[11px] text-slate-500 leading-relaxed">The learner has met standard educational objectives with solid competency across all assessment fields.</p>
                      </div>
                      <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100/60 space-y-1">
                        <span className="text-xs font-black text-amber-700">Approaching Expectations (AE)</span>
                        <p className="text-[11px] text-slate-500 leading-relaxed">The learner is on path to meeting milestones but requires incremental study and localized teacher tracking.</p>
                      </div>
                      <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-100/60 space-y-1">
                        <span className="text-xs font-black text-rose-700">Below Expectations (BE)</span>
                        <p className="text-[11px] text-slate-500 leading-relaxed">The learner needs personalized tutoring support and close monitoring to close critical academic skill gaps.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab === 'attendance' && (
                <div className="space-y-6">
                  {/* Live Gate Status Banner */}
                  {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const childGateLogs = selectedChild ? gateLogs.filter(l => l.admNo === selectedChild.admNo) : [];
                    const todayLog = childGateLogs.find(l => l.logDate === todayStr);
                    const isAtSchool = todayLog && todayLog.checkIn && !todayLog.checkOut;
                    const hasDeparted = todayLog && todayLog.checkOut;

                    return (
                      <div className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        isAtSchool ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                        hasDeparted ? 'bg-rose-50 border-rose-200 text-rose-900' :
                        'bg-slate-50 border-slate-200 text-slate-800'
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${
                            isAtSchool ? 'bg-emerald-500 text-white' :
                            hasDeparted ? 'bg-rose-500 text-white' :
                            'bg-slate-300 text-slate-700'
                          }`}>
                            {isAtSchool ? '🏫' : hasDeparted ? '🚪' : '⏳'}
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                              Live Gate Status for {selectedChild?.name}
                            </span>
                            <h3 className="text-xl font-black">
                              {isAtSchool ? `🟢 Currently At School (Arrived at ${todayLog?.checkIn})` :
                               hasDeparted ? `🔴 Left School at ${todayLog?.checkOut}` :
                               '⚪ Not Checked In Today Yet'}
                            </h3>
                            <p className="text-xs font-medium text-slate-600 mt-1 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-blue-600" />
                              Location: {todayLog?.location || 'Main School Gate'} · Date: {todayStr}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200/60 text-xs font-bold space-y-1">
                          <div className="text-slate-400 text-[10px] uppercase">WhatsApp SMS Alerts</div>
                          <div className="text-emerald-700 flex items-center gap-1 font-black">
                            <CheckCircle className="w-3.5 h-3.5" /> Instant Parent Notify Active
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Attendance Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-sm">
                      <span className="block text-2xl font-black text-slate-800">{totalSchoolDays}</span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Monitored Days</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-sm">
                      <span className="block text-2xl font-black text-emerald-600">{presentDays}</span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-emerald-500">Days Present</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center space-y-1 shadow-sm">
                      <span className="block text-2xl font-black text-rose-600">{absentDays}</span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-rose-500">Days Absent</span>
                    </div>
                  </div>

                  {/* Gate Check-in & Check-out History Table (Last 30 Days) */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        Gate Check‑in & Check‑out History (Last 30 Days)
                      </h3>
                      <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-bold">
                        {selectedChild?.admNo}
                      </span>
                    </div>

                    {(() => {
                      const childGateLogs = selectedChild ? gateLogs.filter(l => l.admNo === selectedChild.admNo) : [];
                      if (childGateLogs.length === 0) {
                        return (
                          <div className="p-10 text-center text-slate-400 space-y-2">
                            <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                            <p className="font-bold text-slate-600 text-xs uppercase">No Gate Logs Recorded Yet</p>
                            <p className="text-[11px] text-slate-400">Arrival and departure timestamps scanned at the school gate will appear here in real-time.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-200">
                                <th className="py-3 px-4">Date</th>
                                <th className="py-3 px-4">Check‑In Time</th>
                                <th className="py-3 px-4">Check‑Out Time</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Gate Location</th>
                                <th className="py-3 px-4">Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {childGateLogs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition">
                                  <td className="py-3 px-4 font-bold text-slate-800">{log.logDate}</td>
                                  <td className="py-3 px-4 font-mono font-bold text-emerald-600">{log.checkIn || '—'}</td>
                                  <td className="py-3 px-4 font-mono font-bold text-rose-600">{log.checkOut || '—'}</td>
                                  <td className="py-3 px-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                                      log.status === 'Checked In' ? 'bg-emerald-100 text-emerald-800' :
                                      log.status === 'Checked Out' ? 'bg-rose-100 text-rose-800' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {log.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-medium text-slate-600">{log.location}</td>
                                  <td className="py-3 px-4 font-medium text-slate-500">{log.remarks || 'None'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Calendar/Attendance Sheet details */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        Classroom Daily Attendance Roll Logs
                      </h3>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-xs font-bold">
                        Average: {attendancePercentage}%
                      </span>
                    </div>

                    {childAttendanceRecords.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 space-y-2">
                        <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="font-bold text-slate-600 text-xs uppercase">No Attendance Data Marked</p>
                        <p className="text-[11px] text-slate-400">Daily registration data will propagate here once teachers call the register.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-2">
                        {childAttendanceRecords.map((rec, i) => {
                          const isPresent = ['AM', 'PM', 'Full'].includes(rec.status);
                          return (
                            <div key={i} className="py-3 flex justify-between items-center text-sm">
                              <div className="flex items-center gap-3">
                                {isPresent ? (
                                  <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs">✓</div>
                                ) : (
                                  <div className="w-5 h-5 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-xs">✗</div>
                                )}
                                <span className="font-black text-slate-700">
                                  {new Date(rec.date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isPresent ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {rec.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSubTab === 'messages' && (
                <ParentTeacherChat 
                  user={user} 
                  selectedChild={selectedChild} 
                  onToast={triggerToast} 
                />
              )}

              {activeSubTab === 'profile' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
                  
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                      <User className="w-4 h-4 text-sky-500" />
                      Parent/Guardian Contact Directory
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Phone</span>
                      <p className="font-extrabold text-slate-800 font-mono flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-indigo-500" />
                        {user.username}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Relationship Status</span>
                      <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Guardian / Parent of {selectedChild.name}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Child Stream Placement</span>
                      <p className="font-extrabold text-slate-800">
                        {selectedChild.gradeLabel || `Grade ${selectedChild.grade}`} · Stream {selectedChild.stream}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Access Privileges</span>
                      <p className="font-extrabold text-emerald-700 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        Read-Only Student Cards Sync
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-2xl text-xs text-amber-800 border border-amber-100 flex items-start gap-2 leading-relaxed font-semibold">
                    <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>To update your telephone number, registered email, or correct parent name spellings, please request the School Administrative Officer to perform a student record update inside the Learners database suite.</span>
                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
