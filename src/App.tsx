/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Menu, 
  X,
  Building, 
  Users, 
  BookOpen, 
  ClipboardList, 
  LogOut, 
  GraduationCap, 
  ShieldCheck, 
  Settings, 
  User, 
  UserCheck,
  ChevronRight,
  Sun,
  Moon,
  Database,
  Lock,
  BarChart3,
  Clock,
  Calendar,
  MessageSquare,
  Award,
  UserPlus,
  DollarSign,
  CreditCard,
  Receipt,
  Wallet
} from 'lucide-react';
import PerformanceReport from './components/PerformanceReport';
import Exams from './components/Exams';
import DataManagement, { exportAllData } from './components/DataManagement';
import CreateExam from './components/CreateExam';
import ExamSetup from './components/ExamSetup';
import Trash from './components/Trash';
import ClassPromotion from './components/ClassPromotion';
import SchoolProfileForm from './components/SchoolProfileForm';
import ManageStaff from './components/ManageStaff';
import SubjectAssignments from './components/SubjectAssignments';
import MarkSubmissions from './components/MarkSubmissions';
import GradesAndStreams from './components/GradesAndStreams';
import TermReport from './components/TermReport';
import CombinedReport from './components/CombinedReport';
import GenerateReport from './components/GenerateReport';
import Subjects from './components/Subjects';
import Learners from './components/Learners';
import Grading from './components/Grading';
import Login from './components/Login';
import HomeDashboard from './components/HomeDashboard';
import SettingsComponent from './components/Settings';
import AttendanceSettingsPanel from './components/AttendanceSettingsPanel';
import AttendanceAnalytics from './components/AttendanceAnalytics';
import StaffAttendance from './components/StaffAttendance';
import AttendanceDashboard from './components/AttendanceDashboard';
import AttendanceRoll from './components/AttendanceRoll';
import NotificationBell from './components/NotificationBell';
import { getCurrentUser, setCurrentUser, getSchoolProfile, UserAccount, getUsers, getLearners, synchronizeWithCloudSQL, getMessages } from './utils/db';
import ParentPortal from './components/ParentPortal';
import ParentAccountManager from './components/ParentAccountManager';
import GateCheckin from './components/GateCheckin';
import TeachersOnDuty from './components/TeachersOnDuty';
import WhatsAppAlerts from './components/WhatsAppAlerts';
import Finances from './components/Finances';
import { COLORS } from './constants/colors';

export default function App() {
  const [user, setUser] = useState<UserAccount | null>(() => getCurrentUser());
  const [activeView, setActiveView] = useState(() => {
    const currUser = getCurrentUser();
    return currUser?.role === 'Parent' ? 'Parent Portal' : 'Home';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : false;
  });

  const selectView = (viewName: string) => {
    setActiveView(viewName);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };
  const [schoolProfile, setSchoolProfile] = useState(() => getSchoolProfile());
  const [parentTab, setParentTab] = useState<'academics' | 'attendance' | 'messages' | 'profile'>('academics');

  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const calculateUnread = () => {
      if (!user) return;
      const allMsgs = getMessages();
      
      if (user.role === 'Parent') {
        // Parents see unread messages from teachers
        const parentUnread = allMsgs.filter(m => 
          m.senderRole === 'Teacher' && 
          !m.read && 
          (m.receiverId === user.id || m.receiverId === null)
        ).length;
        setUnreadMessages(parentUnread);
      } else {
        // Admin/Teachers see unread messages from parents
        const staffUnread = allMsgs.filter(m => 
          m.senderRole === 'Parent' && 
          !m.read
        ).length;
        setUnreadMessages(staffUnread);
      }
    };

    calculateUnread();
    window.addEventListener('storage', calculateUnread);
    // Also listen for a custom event we'll trigger when messages change
    window.addEventListener('messagesUpdated', calculateUnread);
    
    return () => {
      window.removeEventListener('storage', calculateUnread);
      window.removeEventListener('messagesUpdated', calculateUnread);
    };
  }, [user]);

  useEffect(() => {
    // Initial sync with Cloud SQL database
    synchronizeWithCloudSQL();
  }, []);

  useEffect(() => {
    // High-security session check: prevent role spoofing and enforce deactivation in real-time
    if (user) {
      if (user.role === 'Parent') {
        const learnersList = getLearners();
        const learnerId = user.id.replace('parent_', '');
        const child = learnersList.find(l => l.id === learnerId);
        if (!child || child.status === 'Inactive') {
          handleLogout();
        }
      } else {
        const allUsers = getUsers();
        const verified = allUsers.find(u => 
          u.id === user.id && 
          u.username === user.username && 
          u.role === user.role && 
          u.status === 'Active'
        );
        if (!verified) {
          // Tamper detected or user deactivated - terminate session instantly
          handleLogout();
        }
      }
    }
  }, [user, activeView]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  useEffect(() => {
    // Sync school profile updates
    const handleStorageChange = () => {
      setSchoolProfile(getSchoolProfile());
      setUser(getCurrentUser());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const titleText = schoolProfile.name 
      ? `${schoolProfile.name} - CBC Academic Portal` 
      : 'School Admin Suite - CBC Academic Portal';
    document.title = titleText;
  }, [schoolProfile.name]);

  const handleLoginSuccess = (loggedInUser: UserAccount) => {
    setUser(loggedInUser);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
    }
    
    // Choose appropriate default view based on user role
    if (loggedInUser.role === 'Parent') {
      setActiveView('Parent Portal');
    } else if (loggedInUser.role === 'Super Admin' || loggedInUser.role === 'Admin' || loggedInUser.role === 'Headteacher') {
      setActiveView('Home');
    } else {
      setActiveView('Marks Submissions');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUser(null);
  };

  // If no user is logged in, show the brand login page
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Define role permission helpers
  const isSuperAdmin = user.role === 'Super Admin';
  const isAdminOrHead = isSuperAdmin || user.role === 'Admin' || user.role === 'Headteacher' || user.role === 'Deputy Headteacher';
  const isAuthorizedRole = ['Super Admin', 'Admin', 'Headteacher', 'Deputy Headteacher', 'Senior Teacher', 'Class Teacher'].includes(user.role);
  const isParent = user.role === 'Parent';

  const adminMenuItems = [
    { name: 'Home', icon: <Home className="w-5 h-5" />, visible: true },
    { name: 'School Profile', icon: <Building className="w-4 h-4" />, visible: isAdminOrHead || isParent },
    { name: 'Manage Staff', icon: <Users className="w-4 h-4" />, visible: user.role === 'Admin' || isSuperAdmin },
    { name: 'Subject Assignments', icon: <BookOpen className="w-4 h-4" />, visible: !isParent || isSuperAdmin },
    { name: 'Marks Submissions', icon: <ClipboardList className="w-4 h-4" />, visible: !isParent || isSuperAdmin },
    { name: 'Data Management', icon: <Database className="w-4 h-4" />, visible: isSuperAdmin },
  ];

  const financeMenuItems = [
    { name: 'Finances', icon: <DollarSign className="w-4 h-4 text-emerald-400" />, visible: !isParent },
    { name: 'Fee Collections & Balances', icon: <Wallet className="w-4 h-4 text-emerald-400" />, visible: !isParent },
    { name: 'Grade Fee Structures', icon: <Receipt className="w-4 h-4 text-blue-400" />, visible: isAdminOrHead },
  ];

  const attendanceMenuItems = [
    { name: 'Teachers On Duty (TOD)', icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />, visible: !isParent },
    { name: 'Gate Check-in', icon: <UserCheck className="w-4 h-4 text-emerald-500" />, visible: !isParent },
    { name: 'Attendance Roll', icon: <UserCheck className="w-4 h-4 text-blue-500" />, visible: isSuperAdmin || (localStorage.getItem('allow_attendance_roll') === 'true' && isAuthorizedRole) || !isParent },
    { name: 'Attendance Dashboard', icon: <BarChart3 className="w-4 h-4 text-emerald-500" />, visible: !isParent },
    { name: 'Attendance Analytics', icon: <BarChart3 className="w-4 h-4 text-blue-500" />, visible: isSuperAdmin || (localStorage.getItem('allow_attendance_analytics') === 'true' && isAuthorizedRole) },
    { name: 'Staff Attendance', icon: <Users className="w-4 h-4" />, visible: isSuperAdmin || isAuthorizedRole },
    { name: 'WhatsApp Alerts', icon: <MessageSquare className="w-4 h-4 text-emerald-600" />, visible: !isParent },
  ];

  const reportsMenuItems = [
    { name: 'Performance Report', icon: <BarChart3 className="w-4 h-4" />, visible: isSuperAdmin || isAuthorizedRole },
    { name: 'Term Report', icon: <ClipboardList className="w-4 h-4" />, visible: isSuperAdmin || (localStorage.getItem('allow_term_report') === 'true' && isAuthorizedRole) },
    { name: 'Combined Report', icon: <ClipboardList className="w-4 h-4" />, visible: isSuperAdmin || (localStorage.getItem('allow_combined_report') === 'true' && isAuthorizedRole) },
    { name: 'Generate Report', icon: <ClipboardList className="w-4 h-4" />, visible: isSuperAdmin || (localStorage.getItem('allow_generate_report') === 'true' && isAuthorizedRole) },
  ];

  const academicMenuItems = [
    { name: 'Grades and Streams', icon: '📚', visible: isAdminOrHead },
    { name: 'Subjects', icon: '📖', visible: isAdminOrHead },
    { name: 'Learners', icon: '👨‍🎓', visible: !isParent },
    { name: 'Grading', icon: '📊', visible: !isParent },
    { name: 'Class Promotion', icon: '🚀', visible: !isParent },
  ];

  const examMenuItems = [
    { name: 'All Exams', icon: '📝', visible: !isParent },
    { name: 'New Exam', icon: '➕', visible: !isParent },
    { name: 'Exam Setup', icon: '⚙️', visible: !isParent },
    { name: 'Trash', icon: '🗑️', visible: !isParent },
  ];

  const settingsMenuItems = [
    { name: 'Parent Portal', icon: <Users className="w-4 h-4 text-rose-500" />, visible: true },
    { name: 'Parent Accounts', icon: <UserPlus className="w-4 h-4 text-indigo-500" />, visible: isAdminOrHead },
    { name: 'Settings', icon: <Settings className="w-4 h-4" />, visible: isSuperAdmin },
    { name: 'Check-in/out Settings', icon: <Clock className="w-4 h-4" />, visible: isSuperAdmin },
  ];

  const visibleAdminItems = adminMenuItems.filter(item => item.visible);
  const visibleFinanceItems = financeMenuItems.filter(item => item.visible);
  const visibleAttendanceItems = attendanceMenuItems.filter(item => item.visible);
  const visibleAcademicItems = academicMenuItems.filter(item => item.visible);
  const visibleExamItems = examMenuItems.filter(item => item.visible);
  const visibleReportsItems = reportsMenuItems.filter(item => item.visible);
  const visibleSettingsItems = settingsMenuItems.filter(item => item.visible);

  const renderContent = () => {
    switch (activeView) {
      case 'Home': return isParent ? <ParentPortal user={user} activeTab={parentTab} onTabChange={setParentTab} /> : <HomeDashboard setActiveView={setActiveView} />;
      case 'Finances':
      case 'Fee Collections & Balances':
      case 'Grade Fee Structures':
        return <Finances />;
      case 'Parent Portal': return <ParentPortal user={user} activeTab={parentTab} onTabChange={setParentTab} />;
      case 'Parent Accounts': return isAdminOrHead ? <ParentAccountManager /> : <div className="p-6 text-slate-500 font-bold">Access Denied.</div>;
      case 'Settings': return isSuperAdmin ? <SettingsComponent /> : <div className="p-6 text-slate-500 font-bold">Access Denied.</div>;
      case 'Check-in/out Settings': return isSuperAdmin ? <AttendanceSettingsPanel /> : <div className="p-6 text-slate-500 font-bold">Access Denied.</div>;
      case 'School Profile': return <SchoolProfileForm />;
      case 'Teachers On Duty (TOD)': return <TeachersOnDuty onNavigate={(v) => setActiveView(v)} />;
      case 'Manage Staff': return <ManageStaff />;
      case 'Performance Report': return <PerformanceReport />;
      case 'Gate Check-in': return <GateCheckin currentUser={user} />;
      case 'WhatsApp Alerts': return <WhatsAppAlerts />;
      case 'Attendance Roll': return <AttendanceRoll />;
      case 'Attendance Dashboard': return <AttendanceDashboard />;
      case 'Attendance Analytics': return (isSuperAdmin || (localStorage.getItem('allow_attendance_analytics') === 'true' && isAuthorizedRole)) ? <AttendanceAnalytics /> : <div className="p-6 text-slate-500 font-bold">Access Denied. Please contact the Super Admin for access.</div>;
      case 'Staff Attendance': return <StaffAttendance />;
      case 'Subject Assignments': return <SubjectAssignments />;
      case 'Marks Submissions': return <MarkSubmissions />;
      case 'Term Report': return (isSuperAdmin || (localStorage.getItem('allow_term_report') === 'true' && isAuthorizedRole)) ? <TermReport /> : <div className="p-6 text-slate-500 font-bold">Access Denied. Please contact the Super Admin for access.</div>;
      case 'Combined Report': return (isSuperAdmin || (localStorage.getItem('allow_combined_report') === 'true' && isAuthorizedRole)) ? <CombinedReport /> : <div className="p-6 text-slate-500 font-bold">Access Denied. Please contact the Super Admin for access.</div>;
      case 'Generate Report': return (isSuperAdmin || (localStorage.getItem('allow_generate_report') === 'true' && isAuthorizedRole)) ? <GenerateReport /> : <div className="p-6 text-slate-500 font-bold">Access Denied. Please contact the Super Admin for access.</div>;
      case 'Data Management': return isSuperAdmin ? <DataManagement /> : <div className="p-6 text-slate-500 font-bold">Access Denied.</div>;
      case 'New Exam': return <CreateExam />;
      case 'Exam Setup': return <ExamSetup />;
      case 'Trash': return <Trash setActiveView={setActiveView} />;
      case 'Grades and Streams': return <GradesAndStreams />;
      case 'Subjects': return <Subjects />;
      case 'Learners': return <Learners />;
      case 'Grading': return <Grading />;
      case 'Class Promotion': return <ClassPromotion />;
      case 'All Exams': return <Exams setActiveView={setActiveView} />;
      default: return <div className="text-gray-500 p-6 font-medium">View for {activeView} is not yet implemented.</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-20 lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 180, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ backgroundColor: COLORS.sidebarBg, color: COLORS.sidebarText, borderColor: COLORS.sidebarBorder }}
            className="sidebar flex-shrink-0 flex flex-col z-30 shadow-2xl border-r"
          >
            <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-[11px] font-black text-white leading-tight uppercase tracking-wider truncate max-w-[90px]">
                    {schoolProfile.name || "School Admin"}
                  </h1>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                    Portal
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition"
                title="Close Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-4">
              {isParent ? (
                <div className="space-y-1.5">
                  <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">My Portal</p>
                    <button
                    onClick={() => { selectView('Parent Portal'); setParentTab('academics'); }}
                    className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-xs font-bold transition ${activeView === 'Parent Portal' && parentTab === 'academics' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Academic Scores</span>
                  </button>
                  <button
                    onClick={() => { selectView('Parent Portal'); setParentTab('attendance'); }}
                    className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-xs font-bold transition ${activeView === 'Parent Portal' && parentTab === 'attendance' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>Attendance Log</span>
                  </button>
                  <button
                    onClick={() => { selectView('Parent Portal'); setParentTab('messages'); }}
                    className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-xs font-bold transition ${activeView === 'Parent Portal' && parentTab === 'messages' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <span>Messages</span>
                    {unreadMessages > 0 && (
                      <span className="ml-auto bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {unreadMessages}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => { selectView('Parent Portal'); setParentTab('profile'); }}
                    className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-xs font-bold transition ${activeView === 'Parent Portal' && parentTab === 'profile' ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>Profile</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Administrative</p>
                        {visibleAdminItems.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => selectView(item.name)}
                        className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-xs font-bold transition ${activeView === item.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                      >
                        {item.icon}
                        <span>{item.name}</span>
                      </button>
                    ))}
                  </div>

                  {visibleFinanceItems.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Finances</p>
                      {visibleFinanceItems.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => selectView(item.name)}
                          className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-xs font-bold transition ${activeView === item.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                          {item.icon}
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {visibleAttendanceItems.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Attendance</p>
                      {visibleAttendanceItems.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => selectView(item.name)}
                          className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-xs font-bold transition ${activeView === item.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                          {item.icon}
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {visibleAcademicItems.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Academic</p>
                      {visibleAcademicItems.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => selectView(item.name)}
                          className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-xs font-bold transition ${activeView === item.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {visibleExamItems.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Exams</p>
                      {visibleExamItems.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => selectView(item.name)}
                          className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-xs font-bold transition ${activeView === item.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {visibleReportsItems.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Reports</p>
                      {visibleReportsItems.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => selectView(item.name)}
                          className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-xs font-bold transition ${activeView === item.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                          {item.icon}
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {visibleSettingsItems.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">System</p>
                      {visibleSettingsItems.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => selectView(item.name)}
                          className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-xs font-bold transition ${activeView === item.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                          {item.icon}
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 space-y-2">
              {isSuperAdmin && (
                <button onClick={exportAllData} className="w-full py-2.5 px-3 rounded-xl flex items-center gap-2.5 text-xs font-bold transition bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white">
                  <Lock className="w-4 h-4" />
                  <span>Universal Save</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-3 rounded-xl flex items-center gap-2.5 text-xs font-bold transition text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Dynamic Header */}
        <header className="bg-white text-slate-900 p-4 px-6 flex items-center justify-between border-b border-slate-200 z-20 shadow-sm relative">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 bg-slate-900 text-white rounded-xl shadow-sm hover:bg-slate-800 transition flex items-center justify-center"
                title="Open Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="hidden sm:block">
              <h1 className="text-sm font-black tracking-wide uppercase text-slate-900 line-clamp-1">
                {schoolProfile.name}
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Academic Portal
              </p>
            </div>
          </div>

          {/* Centered Logo */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            {schoolProfile.logoUrl ? (
              <img 
                src={schoolProfile.logoUrl} 
                alt="School logo" 
                className="w-14 h-14 object-contain bg-white rounded-xl p-1 border border-slate-100 shadow-sm" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-sm">
                <GraduationCap className="w-7 h-7" />
              </div>
            )}
          </div>

          {/* User Identity Details & Quick Actions */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-black text-slate-900">
                {user.fullName}
              </span>
              {user.role === 'Super Admin' ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                  <ShieldCheck className="w-2.5 h-2.5 inline text-amber-600" />
                  Super Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {user.role}
                </span>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <NotificationBell />
          </div>
        </header>

        {/* Primary View Render Stage */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto bg-slate-50 no-scrollbar">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <span className="text-[12px] font-black text-blue-600 uppercase tracking-widest bg-blue-100 px-3 py-1.5 rounded-md border border-blue-200 inline-block mb-2">
                  Active Module: {activeView}
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
                  {activeView}
                </h2>
              </div>
              
              {!isParent && (
                <div className="flex items-center gap-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                  <div className="flex flex-col items-center px-4">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Learners</span>
                    <span className="text-lg font-black text-slate-900">{getLearners().length}</span>
                  </div>
                  <div className="w-px h-10 bg-slate-100"></div>
                  <div className="flex flex-col items-center px-4">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Staff</span>
                    <span className="text-lg font-black text-slate-900">{getUsers().filter(u => u.role !== 'Parent').length}</span>
                  </div>
                  <div className="w-px h-10 bg-slate-100"></div>
                  <div className="flex flex-col items-center px-4">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</span>
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      <span className="text-sm font-black text-emerald-600 uppercase">Live Now</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4">
              <motion.div 
                key={activeView}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderContent()}
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
