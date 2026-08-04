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
  Wallet,
  Sparkles,
  FolderOpen,
  Activity,
  Search,
  KeyRound
} from 'lucide-react';
import GlobalSearchModal from './components/GlobalSearchModal';
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
import MyProfile from './components/MyProfile';
import ResetPassword from './components/ResetPassword';
import NotificationBell from './components/NotificationBell';
import { getCurrentUser, setCurrentUser, getSchoolProfile, UserAccount, getUsers, getLearners, synchronizeWithMongoDB, startRealtimeCloudSync, getMessages, secureGet, secureSet } from './utils/db';
import CloudAutoSyncHeaderBar from './components/CloudAutoSyncHeaderBar';
import CloudSyncHealth from './components/CloudSyncHealth';
import ParentPortal from './components/ParentPortal';
import ParentAccountManager from './components/ParentAccountManager';
import GateCheckin from './components/GateCheckin';
import TeachersOnDuty from './components/TeachersOnDuty';
import WhatsAppAlerts from './components/WhatsAppAlerts';
import CloudDataExplorer from './components/CloudDataExplorer';
import Finances from './components/Finances';
import Subscriptions from './components/Subscriptions';
import UpdateNotificationModal from './components/UpdateNotificationModal';
import SchemeOfWorkRepository from './components/SchemeOfWork';
import ThemeToggle from './components/ThemeToggle';
import { initTheme } from './utils/theme';
import { COLORS } from './constants/colors';

export const CURRENT_SYSTEM_VERSION = '2.4.0';

export default function App() {
  const [user, setUser] = useState<UserAccount | null>(() => getCurrentUser());
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const ackVersion = secureGet('system_update_acknowledged_version');
      return ackVersion !== CURRENT_SYSTEM_VERSION;
    }
    return false;
  });

  const handleDismissUpdateModal = () => {
    if (typeof window !== 'undefined') {
      secureSet('system_update_acknowledged_version', CURRENT_SYSTEM_VERSION);
    }
    setShowUpdateModal(false);
  };

  const handleRefreshUpdateModal = async () => {
    if (typeof window !== 'undefined') {
      secureSet('system_update_acknowledged_version', CURRENT_SYSTEM_VERSION);
      setShowUpdateModal(false);
      // Run sync in background so it never holds up the UI
      Promise.race([
        synchronizeWithMongoDB(),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]).then(() => {
        setSchoolProfile(getSchoolProfile());
        const curr = getCurrentUser();
        if (curr) {
          setUser(curr);
        }
      }).catch(() => {});
    } else {
      setShowUpdateModal(false);
    }
  };
  const [activeView, setActiveView] = useState(() => {
    const currUser = getCurrentUser();
    return currUser?.role === 'Parent' ? 'Parent Portal' : 'Home';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : false;
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleGlobalSearchKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F' || e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalSearchKey);
    return () => window.removeEventListener('keydown', handleGlobalSearchKey);
  }, []);

  const selectView = (viewName: string) => {
    setActiveView(viewName);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };
  const [schoolProfile, setSchoolProfile] = useState(() => getSchoolProfile());
  const [parentTab, setParentTab] = useState<'academics' | 'attendance' | 'messages' | 'profile'>('academics');

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [tick, setTick] = useState(0);

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

  const [isSynced, setIsSynced] = useState(true);

  useEffect(() => {
    // Initialize theme preference from localStorage
    initTheme();
    // Start instant real-time MongoDB sync listener
    startRealtimeCloudSync();
    // Initial sync with MongoDB database
    synchronizeWithMongoDB().finally(() => {
      setIsSynced(true);
    });

    // Live multi-device background synchronization interval (10s) and focus handler
    const syncInterval = setInterval(() => {
      synchronizeWithMongoDB();
    }, 10000);

    const handleFocusSync = () => {
      synchronizeWithMongoDB();
    };

    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
    };
  }, []);

  useEffect(() => {
    // Keep React state in sync with stored data across devices
    const handleDataSync = () => {
      // Refresh user session
      const current = getCurrentUser();
      setUser(current);
      
      // Force re-render to fetch latest data from localStorage
      setTick(t => t + 1);
    };

    window.addEventListener('currentUserUpdated', handleDataSync);
    window.addEventListener('db_updated', handleDataSync);
    window.addEventListener('storage', handleDataSync);

    return () => {
      window.removeEventListener('currentUserUpdated', handleDataSync);
      window.removeEventListener('db_updated', handleDataSync);
      window.removeEventListener('storage', handleDataSync);
    };
  }, []);

  useEffect(() => {
    // High-security session check: enforce deactivation ONLY if explicitly set to Inactive
    if (user) {
      if (user.role === 'Parent') {
        const learnersList = getLearners();
        const learnerId = user.id.replace('parent_', '');
        const child = learnersList.find(l => String(l.id) === String(learnerId) || String(l.admNo) === String(learnerId));
        if (child && child.status === 'Inactive') {
          handleLogout();
        }
      } else {
        const allUsers = getUsers();
        const verified = allUsers.find(u => {
          const idMatch = String(u.id) === String(user.id);
          const userMatch = u.username && user.username && u.username.toLowerCase().trim() === user.username.toLowerCase().trim();
          const emailMatch = u.email && user.email && u.email.toLowerCase().trim() === user.email.toLowerCase().trim();
          const staffMatch = u.staffNo && user.staffNo && u.staffNo.toLowerCase().trim() === user.staffNo.toLowerCase().trim();
          
          return idMatch || userMatch || emailMatch || staffMatch;
        });
        if (verified && verified.status === 'Inactive') {
          handleLogout();
        }
      }
    }
  }, [user, activeView]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    secureSet('theme', 'light');
  }, []);

  useEffect(() => {
    // Sync school profile updates
    const handleStorageChange = () => {
      const newProfile = getSchoolProfile();
      setSchoolProfile(prev => JSON.stringify(prev) === JSON.stringify(newProfile) ? prev : newProfile);
      
      const current = getCurrentUser();
      setUser(prev => {
        if (!current) return null;
        if (!prev) return current;
        if (JSON.stringify(prev) !== JSON.stringify(current)) {
          return current;
        }
        return prev;
      });
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
    if (typeof window !== 'undefined') {
      const ackVersion = secureGet('system_update_acknowledged_version');
      if (ackVersion !== CURRENT_SYSTEM_VERSION) {
        setShowUpdateModal(true);
      }
    }
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

  // If session is still initializing on page refresh, show clean cloud connection screen
  if (!isSynced && !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-black tracking-widest uppercase text-slate-300">Connecting to Cloud Database...</p>
        <p className="text-[11px] text-slate-500 mt-1 font-medium">Verifying user authentication session</p>
      </div>
    );
  }

  // If no user is logged in, show the brand login page
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Define role permission helpers
  const isSuperAdmin = user.role === 'Super Admin';
  const isAdminOrHead = isSuperAdmin || user.role === 'Admin' || user.role === 'Headteacher' || user.role === 'Head Teacher' || user.role === 'Deputy Headteacher' || user.role === 'Deputy Head Teacher' || user.role === 'Senior Teacher';
  const isAuthorizedRole = ['Super Admin', 'Admin', 'Headteacher', 'Head Teacher', 'Deputy Headteacher', 'Deputy Head Teacher', 'Senior Teacher', 'Class Teacher'].includes(user.role);
  const isParent = user.role === 'Parent';

  const menuGroups = [
    {
      title: 'Administrative',
      items: [
        { name: 'Home', icon: <Home className="w-4 h-4 text-blue-400" />, visible: true },
        { name: 'School Profile', icon: <Building className="w-4 h-4 text-indigo-400" />, visible: isAdminOrHead || isParent },
        { name: 'Manage Staff', icon: <Users className="w-4 h-4 text-cyan-400" />, visible: user.role === 'Admin' || isSuperAdmin },
        { name: 'Subject Assignments', icon: <BookOpen className="w-4 h-4 text-teal-400" />, visible: !isParent || isSuperAdmin },
        { name: 'Marks Submissions', icon: <ClipboardList className="w-4 h-4 text-emerald-400" />, visible: !isParent || isSuperAdmin },
        { name: 'Data Management', icon: <Database className="w-4 h-4 text-purple-400" />, visible: isSuperAdmin },
        { name: 'Cloud Data Explorer', icon: <Database className="w-4 h-4 text-blue-500" />, visible: isSuperAdmin },
      ],
    },
    {
      title: 'Finances',
      items: [
        { name: 'Finances', icon: <DollarSign className="w-4 h-4 text-emerald-400" />, visible: isAdminOrHead },
        { name: 'Fee Collections & Balances', icon: <Wallet className="w-4 h-4 text-emerald-400" />, visible: isAdminOrHead },
        { name: 'Grade Fee Structures', icon: <Receipt className="w-4 h-4 text-blue-400" />, visible: isAdminOrHead },
      ],
    },
    {
      title: 'Attendance',
      items: [
        { name: 'Teachers On Duty (TOD)', icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />, visible: !isParent },
        { name: 'Gate Check-in', icon: <UserCheck className="w-4 h-4 text-emerald-500" />, visible: !isParent },
        { name: 'Attendance Roll', icon: <UserCheck className="w-4 h-4 text-blue-500" />, visible: isSuperAdmin || (secureGet('allow_attendance_roll') === 'true' && isAuthorizedRole) || !isParent },
        { name: 'Attendance Dashboard', icon: <BarChart3 className="w-4 h-4 text-emerald-500" />, visible: !isParent },
        { name: 'Attendance Analytics', icon: <BarChart3 className="w-4 h-4 text-blue-500" />, visible: isSuperAdmin || (secureGet('allow_attendance_analytics') === 'true' && isAuthorizedRole) },
        { name: 'Staff Attendance', icon: <Users className="w-4 h-4 text-slate-300" />, visible: isSuperAdmin || isAuthorizedRole },
        { name: 'WhatsApp Alerts', icon: <MessageSquare className="w-4 h-4 text-emerald-500" />, visible: !isParent },
      ],
    },
    {
      title: 'Academic',
      items: [
        { name: 'Grades and Streams', icon: <GraduationCap className="w-4 h-4 text-indigo-400" />, visible: isAdminOrHead },
        { name: 'Subjects', icon: <BookOpen className="w-4 h-4 text-blue-400" />, visible: isAdminOrHead },
        { name: 'Learners', icon: <Users className="w-4 h-4 text-amber-400" />, visible: !isParent },
        { name: 'Class Promotion', icon: <Sparkles className="w-4 h-4 text-yellow-400" />, visible: isAdminOrHead },
      ],
    },
    {
      title: 'Resources',
      items: [
        { name: 'Scheme of Work', icon: <FolderOpen className="w-4 h-4 text-cyan-400" />, visible: !isParent },
      ],
    },
    {
      title: 'Exams',
      items: [
        { name: 'All Exams', icon: <ClipboardList className="w-4 h-4 text-sky-400" />, visible: isAdminOrHead },
        { name: 'Grading', icon: <BarChart3 className="w-4 h-4 text-purple-400" />, visible: isAdminOrHead },
        { name: 'KJSEA Classification', icon: <Award className="w-4 h-4 text-purple-400" />, visible: !isParent },
        { name: 'New Exam', icon: <ClipboardList className="w-4 h-4 text-emerald-400" />, visible: !isParent },
        { name: 'Exam Setup', icon: <Settings className="w-4 h-4 text-amber-400" />, visible: isAdminOrHead },
        { name: 'Trash', icon: <X className="w-4 h-4 text-rose-400" />, visible: isAdminOrHead },
      ],
    },
    {
      title: 'Reports',
      items: [
        { name: 'Performance Report', icon: <BarChart3 className="w-4 h-4 text-teal-400" />, visible: isAdminOrHead },
        { name: 'Term Report', icon: <ClipboardList className="w-4 h-4 text-blue-400" />, visible: isAdminOrHead },
        { name: 'Combined Report', icon: <ClipboardList className="w-4 h-4 text-indigo-400" />, visible: isAdminOrHead },
        { name: 'Generate Report', icon: <ClipboardList className="w-4 h-4 text-emerald-400" />, visible: isAdminOrHead },
      ],
    },
    {
      title: 'System',
      items: [
        { name: 'Cloud Sync Health', icon: <Activity className="w-4 h-4 text-blue-400" />, visible: true },
        { name: 'Subscriptions', icon: <CreditCard className="w-4 h-4 text-emerald-400" />, visible: true },
        { name: 'Parent Portal', icon: <Users className="w-4 h-4 text-rose-500" />, visible: true },
        { name: 'Parent Accounts', icon: <UserPlus className="w-4 h-4 text-indigo-500" />, visible: isAdminOrHead },
        { name: 'My Profile', icon: <User className="w-4 h-4 text-slate-400" />, visible: true },
        { name: 'Reset Password', icon: <KeyRound className="w-4 h-4 text-amber-500" />, visible: !isParent },
        { name: 'Settings', icon: <Settings className="w-4 h-4 text-slate-300" />, visible: isSuperAdmin },
        { name: 'Check-in/out Settings', icon: <Clock className="w-4 h-4 text-slate-300" />, visible: isSuperAdmin },
      ],
    },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'Home': return isParent ? <ParentPortal user={user} activeTab={parentTab} onTabChange={setParentTab} /> : <HomeDashboard setActiveView={setActiveView} />;
      case 'Cloud Sync Health': return <CloudSyncHealth />;
      case 'Finances':
      case 'Fee Collections & Balances':
      case 'Grade Fee Structures':
        return isAdminOrHead ? <Finances /> : <div className="p-6 text-slate-500 font-bold">Access Denied. Finance module is restricted to administrative staff.</div>;
      case 'Parent Portal': return <ParentPortal user={user} activeTab={parentTab} onTabChange={setParentTab} />;
      case 'Parent Accounts': return isAdminOrHead ? <ParentAccountManager setActiveView={setActiveView} /> : <div className="p-6 text-slate-500 font-bold">Access Denied.</div>;
      case 'My Profile': return <MyProfile />;
      case 'Reset Password': return <ResetPassword />;
      case 'Settings': return isSuperAdmin ? <SettingsComponent /> : <div className="p-6 text-slate-500 font-bold">Access Denied.</div>;
      case 'Subscriptions': return <Subscriptions />;
      case 'Check-in/out Settings': return isSuperAdmin ? <AttendanceSettingsPanel /> : <div className="p-6 text-slate-500 font-bold">Access Denied.</div>;
      case 'School Profile': return <SchoolProfileForm />;
      case 'Teachers On Duty (TOD)': return <TeachersOnDuty onNavigate={(v) => setActiveView(v)} />;
      case 'Manage Staff': return <ManageStaff />;
      case 'Performance Report': return isAdminOrHead ? <PerformanceReport /> : <div className="p-6 text-slate-500 font-bold">Access Denied. Reports are restricted to administrative staff.</div>;
      case 'Gate Check-in': return <GateCheckin currentUser={user} />;
      case 'WhatsApp Alerts': return <WhatsAppAlerts />;
      case 'Cloud Data Explorer': return isSuperAdmin ? <CloudDataExplorer /> : <div className="p-6 text-slate-500 font-bold">Access Denied.</div>;
      case 'Attendance Roll': return <AttendanceRoll />;
      case 'Attendance Dashboard': return <AttendanceDashboard />;
      case 'Attendance Analytics': return (isSuperAdmin || (secureGet('allow_attendance_analytics') === 'true' && isAuthorizedRole)) ? <AttendanceAnalytics /> : <div className="p-6 text-slate-500 font-bold">Access Denied. Please contact the Super Admin for access.</div>;
      case 'Staff Attendance': return <StaffAttendance />;
      case 'Subject Assignments': return <SubjectAssignments />;
      case 'Marks Submissions': return <MarkSubmissions />;
      case 'Term Report': return isAdminOrHead ? <TermReport /> : <div className="p-6 text-slate-500 font-bold">Access Denied. Reports are restricted to administrative staff.</div>;
      case 'Combined Report': return isAdminOrHead ? <CombinedReport /> : <div className="p-6 text-slate-500 font-bold">Access Denied. Reports are restricted to administrative staff.</div>;
      case 'Generate Report': return isAdminOrHead ? <GenerateReport /> : <div className="p-6 text-slate-500 font-bold">Access Denied. Reports are restricted to administrative staff.</div>;
      case 'Data Management': return isSuperAdmin ? <DataManagement /> : <div className="p-6 text-slate-500 font-bold">Access Denied.</div>;
      case 'New Exam': return <CreateExam />;
      case 'Exam Setup': return isAdminOrHead ? <ExamSetup /> : <div className="p-6 text-slate-500 font-bold">Access Denied. Exam Setup is restricted to administrative staff.</div>;
      case 'Trash': return isAdminOrHead ? <Trash setActiveView={setActiveView} /> : <div className="p-6 text-slate-500 font-bold">Access Denied. Trash is restricted to administrative staff.</div>;
      case 'Grades and Streams': return <GradesAndStreams />;
      case 'Subjects': return <Subjects />;
      case 'Learners': return <Learners />;
      case 'Grading': return isAdminOrHead ? <Grading /> : <div className="p-6 text-slate-500 font-bold">Access Denied. Grading configuration is restricted to administrative staff.</div>;
      case 'Class Promotion': return isAdminOrHead ? <ClassPromotion /> : <div className="p-6 text-slate-500 font-bold">Access Denied. Class Promotion is restricted to administrative staff.</div>;
      case 'Scheme of Work': return <SchemeOfWorkRepository />;
      case 'All Exams': return isAdminOrHead ? <Exams setActiveView={setActiveView} /> : <div className="p-6 text-slate-500 font-bold">Access Denied. All Exams management is restricted to administrative staff.</div>;
      case 'KJSEA Classification': return <Exams setActiveView={setActiveView} initialTab="kjsea" />;
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
                  {menuGroups.map((group) => {
                    const visibleItems = group.items.filter((item) => item.visible);
                    if (visibleItems.length === 0) return null;

                    return (
                      <div key={group.title} className="space-y-1.5 pt-2 first:pt-0">
                        <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                          {group.title}
                        </p>
                        {visibleItems.map((item) => (
                          <button
                            key={item.name}
                            onClick={() => selectView(item.name)}
                            className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-xs font-bold transition ${
                              activeView === item.name
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {typeof item.icon === 'string' ? (
                              <span className="text-lg">{item.icon}</span>
                            ) : (
                              item.icon
                            )}
                            <span>{item.name}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
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
        {/* Persistent Global Cloud Auto-Sync Header Bar */}
        <CloudAutoSyncHeaderBar onOpenSyncHealth={() => selectView('Cloud Sync Health')} />

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

            {/* Active Session / Term Badge in Main Bar */}
            <button
              onClick={() => selectView('School Profile')}
              className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-100 hover:border-emerald-200 transition cursor-pointer text-xs font-bold"
              title="Manage Operational & Academic Details"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{schoolProfile.currentTerm || "Term 1"}</span>
            </button>
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
            
            <button
              onClick={() => setIsSearchOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
              title="Search Learners, Staff, Subjects or Modules (Ctrl + F / ⌘K)"
            >
              <Search className="w-4 h-4 text-slate-600" />
              <span className="hidden md:inline">Search...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white text-slate-500 rounded border border-slate-200">
                Ctrl+F
              </kbd>
            </button>

            <button
              onClick={() => setShowUpdateModal(true)}
              className="px-2.5 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200/80 rounded-xl text-xs font-bold text-blue-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="View Latest System Updates & Version"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span className="hidden sm:inline">Update v2.4</span>
            </button>

            <ThemeToggle />

            <NotificationBell />
          </div>
        </header>

        {/* Global Search Modal */}
        <GlobalSearchModal 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
          onNavigate={(viewName) => selectView(viewName)} 
        />

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
                  <button 
                    onClick={() => selectView('School Profile')}
                    className="flex flex-col items-center px-4 hover:opacity-80 transition cursor-pointer group text-left"
                    title="Click to manage Operational & Academic Details"
                  >
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Session</span>
                    <span className="text-xs font-black text-emerald-900 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1 group-hover:bg-emerald-100 transition">
                      <Calendar className="w-3 h-3" />
                      {schoolProfile.currentTerm || "Term 1"}
                    </span>
                  </button>
                  <div className="w-px h-10 bg-slate-100"></div>
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

      {/* Global System Update Notification Popup Modal */}
      <UpdateNotificationModal
        isOpen={showUpdateModal}
        onClose={handleDismissUpdateModal}
        onRefresh={handleRefreshUpdateModal}
      />
    </div>
  );
}
