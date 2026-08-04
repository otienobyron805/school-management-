import React, { useState, useEffect } from 'react';
import { getCurrentUser, getSchoolProfile, UserAccount, SchoolProfile, saveUsers, getUsers, setCurrentUser, getLearners, getAttendanceSheets, getStaffAttendanceSheets, saveStaffAttendanceSheets, StaffAttendanceSheet, StaffAttendanceRecord, secureGet, secureSet } from '../utils/db';
import { getAttendanceSettings } from '../utils/attendance';
import { Calendar, Clock, GraduationCap, ShieldCheck, User, Camera, Upload, X, Link, Check, AlertCircle, Trash2, ArrowRight, LogIn, LogOut, Lock, Pencil, Zap, UserPlus, FileText, Settings, BookOpen, TrendingUp, PieChart, Bell, Megaphone, CheckCircle2, ListTodo, Plus, Activity, ChevronRight, UserCheck } from 'lucide-react';
import CurrentLocationDisplay from './CurrentLocationDisplay';
import ActivityFeed from './ActivityFeed';
import CloudStorageCard from './CloudStorageCard';

export interface HomeDashboardProps {
  setActiveView?: (view: string) => void;
}

export default function HomeDashboard({ setActiveView }: HomeDashboardProps) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Live clock and attendance states
  const [liveTime, setLiveTime] = useState(new Date());
  const [myAttendance, setMyAttendance] = useState<StaffAttendanceRecord | null>(null);
  const [myHistory, setMyHistory] = useState<{ date: string; record: StaffAttendanceRecord }[]>([]);
  const [attendanceSettings, setAttendanceSettings] = useState(() => getAttendanceSettings());
  const [exams, setExams] = useState<any[]>([]);
  const [userDistance, setUserDistance] = useState<number | null>(null);
  const [isOutOfRange, setIsOutOfRange] = useState(false);

  // Announcements & Bulletin Board State
  const [announcements, setAnnouncements] = useState<any[]>(() => {
    try {
      const saved = secureGet('school_announcements_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  const [isAddNoticeOpen, setIsAddNoticeOpen] = useState(false);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [newNoticeCategory, setNewNoticeCategory] = useState('General');

  const handleSaveNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeContent.trim()) return;
    const item = {
      id: 'ann-' + Date.now(),
      title: newNoticeTitle.trim(),
      content: newNoticeContent.trim(),
      category: newNoticeCategory,
      date: 'Just now',
      author: user?.fullName || 'Admin'
    };
    const updated = [item, ...announcements];
    setAnnouncements(updated);
    try {
      secureSet('school_announcements_v1', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    setNewNoticeTitle('');
    setNewNoticeContent('');
    setIsAddNoticeOpen(false);
  };

  const handleDeleteNotice = (id: string) => {
    const updated = announcements.filter(a => a.id !== id);
    setAnnouncements(updated);
    try {
      secureSet('school_announcements_v1', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const refreshExams = () => {
    const stored = secureGet('exams');
    if (stored) {
      const parsed = JSON.parse(stored);
      const userExams = Array.isArray(parsed) ? parsed.filter((e: any) => !['exam-1', 'exam-2', 'exam-3'].includes(e.id)) : [];
      setExams(userExams);
    } else {
      setExams([]);
    }
  };

  useEffect(() => {
    refreshExams();
    window.addEventListener('storage', refreshExams);
    return () => window.removeEventListener('storage', refreshExams);
  }, []);

  // Convert Check-In Start Time (scheduled time) to opening time (offset earlier)
  const checkInStartStr = attendanceSettings.checkInStart || '07:00';
  const checkInOpeningOffset = (Number(attendanceSettings.checkInOpeningOffset) || 2) * 60;
  const checkInAllowance = Number(attendanceSettings.checkInAllowance) || 5;
  const [startH, startM] = checkInStartStr.split(':').map(Number);
  const startMinutes = (isNaN(startH) ? 7 : startH) * 60 + (isNaN(startM) ? 0 : startM);
  const openMinutes = (startMinutes - checkInOpeningOffset + 1440) % 1440;
  
  const currentMinutes = liveTime.getHours() * 60 + liveTime.getMinutes();
  const isCheckInOpen = currentMinutes >= openMinutes && currentMinutes <= (startMinutes + checkInAllowance);
  
  // Check-out logic (Opens at scheduled checkOutTime e.g. 16:30 and stays open until midnight)
  const checkOutStr = attendanceSettings.checkOutTime || '16:30';
  const [outH, outM] = checkOutStr.split(':').map(Number);
  const checkOutMinutes = (isNaN(outH) ? 16 : outH) * 60 + (isNaN(outM) ? 30 : outM);
  const isCheckOutOpen = currentMinutes >= checkOutMinutes;

  const openHStr = String(Math.floor(openMinutes / 60)).padStart(2, '0');
  const openMStr = String(openMinutes % 60).padStart(2, '0');
  const openTimeStr = `${openHStr}:${openMStr}`;

  // Live calculated states
  const [stats, setStats] = useState({
    totalStudents: 0,
    maleStudents: 0,
    femaleStudents: 0,
    staffActive: 0,
    staffTotal: 0,
    absentsCount: 0,
    presentStudentsCount: 0,
    isSheetMarked: false,
    hasStaffSheet: false
  });

  const getNow = () => {
    let now = new Date();
    if (attendanceSettings.timezone) {
      try {
        now = new Date(now.toLocaleString('en-US', { timeZone: attendanceSettings.timezone }));
      } catch (e) {
        // invalid timezone, fallback to local
      }
    }
    return now;
  };

  // Live time ticker
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(getNow()), 1000);
    return () => clearInterval(timer);
  }, [attendanceSettings.timezone]);

  // Attendance loaders & handlers
  const loadMyAttendance = (currentUser: UserAccount) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const sheets = getStaffAttendanceSheets();
    const todaySheet = sheets.find(s => s.date === todayStr);
    if (todaySheet && todaySheet.records[currentUser.id]) {
      setMyAttendance(todaySheet.records[currentUser.id]);
    } else {
      setMyAttendance({
        userId: currentUser.id,
        status: 'Absent'
      });
    }

    // Load history
    const sorted = [...sheets].sort((a, b) => b.date.localeCompare(a.date));
    const history: { date: string; record: StaffAttendanceRecord }[] = [];
    for (const s of sorted) {
      if (s.records[currentUser.id]) {
        history.push({
          date: s.date,
          record: s.records[currentUser.id]
        });
      }
      if (history.length >= 5) break;
    }
    setMyHistory(history);
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Range monitoring logic
  useEffect(() => {
    if (!navigator.geolocation) return;

    const checkRange = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const sysLat = parseFloat(attendanceSettings.latitude);
          const sysLon = parseFloat(attendanceSettings.longitude);
          const sysRad = parseFloat(attendanceSettings.radius);

          if (!isNaN(sysLat) && !isNaN(sysLon)) {
            const distance = getDistance(pos.coords.latitude, pos.coords.longitude, sysLat, sysLon);
            setUserDistance(distance);
            setIsOutOfRange(distance > sysRad);
          }
        },
        () => {
          console.warn('Geolocation failed for range check');
        },
        { enableHighAccuracy: true }
      );
    };

    checkRange();
    const interval = setInterval(checkRange, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [attendanceSettings.latitude, attendanceSettings.longitude, attendanceSettings.radius]);

  const handleSelfCheckIn = (status: 'Present' | 'Late') => {
    if (!user) return;

    const now = getNow();
    const curMinutes = now.getHours() * 60 + now.getMinutes();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Scheduled Check-In Time Check (Cannot clock in after scheduled time)
    if (curMinutes > startMinutes) {
      alert(`⛔ Clock-In Restricted!\n\nYou cannot clock in after the scheduled check-in time (${checkInStartStr}). Current time is ${timeString}.`);
      return;
    }

    // 2. Opening Window Check
    if (curMinutes < openMinutes) {
      alert(`Clock In is not open yet. It opens at ${openTimeStr} (${attendanceSettings.checkInOpeningOffset || 2} hours before the scheduled check-in time of ${checkInStartStr}).`);
      return;
    }

    const processCheckIn = () => {
      const todayStr = now.toISOString().split('T')[0];
      
      // Determine status based on time & late threshold
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [lateH, lateM] = (attendanceSettings.lateThreshold || '08:00').split(':').map(Number);
      const lateThresholdMinutes = (isNaN(lateH) ? 8 : lateH) * 60 + (isNaN(lateM) ? 0 : lateM);
      
      const finalStatus = currentTime > lateThresholdMinutes ? 'Late' : 'Present';

      const sheets = getStaffAttendanceSheets();
      const updatedSheets = [...sheets];
      let todaySheetIndex = updatedSheets.findIndex(s => s.date === todayStr);

      let todaySheet: StaffAttendanceSheet;
      if (todaySheetIndex >= 0) {
        todaySheet = { ...updatedSheets[todaySheetIndex] };
      } else {
        todaySheet = {
          date: todayStr,
          records: {}
        };
        updatedSheets.push(todaySheet);
        todaySheetIndex = updatedSheets.length - 1;
      }

      const records = { ...todaySheet.records };
      const existing = records[user.id] || { userId: user.id, status: 'Absent' };

      records[user.id] = {
        ...existing,
        userId: user.id,
        status: finalStatus,
        checkInTime: timeString
      };

      todaySheet.records = records;
      todaySheet.lastUpdatedAt = new Date().toISOString();
      todaySheet.lastUpdatedBy = user.fullName;

      updatedSheets[todaySheetIndex] = todaySheet;
      saveStaffAttendanceSheets(updatedSheets);
      
      setMyAttendance(records[user.id]);
      loadMyAttendance(user);

      // Update live stats count
      const activeCount = Object.values(records).filter(r => ['Present', 'Late', 'Half Day'].includes(r.status)).length;
      setStats(prev => ({ ...prev, staffActive: activeCount }));
      alert(`✅ Clock-in recorded successfully at ${timeString}! Status: ${finalStatus}`);
    };

    // 3. Geolocation Range Check
    const sysLat = parseFloat(attendanceSettings.latitude);
    const sysLon = parseFloat(attendanceSettings.longitude);
    const sysRad = parseFloat(attendanceSettings.radius);

    if (!isNaN(sysLat) && !isNaN(sysLon) && !isNaN(sysRad) && sysRad > 0 && navigator.geolocation) {
      let handled = false;
      const timer = setTimeout(() => {
        if (!handled) {
          handled = true;
          const force = confirm(`Location check took too long.\n\nDo you want to submit your clock-in anyway?`);
          if (force) processCheckIn();
        }
      }, 3000);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (handled) return;
          handled = true;
          clearTimeout(timer);
          const distance = getDistance(pos.coords.latitude, pos.coords.longitude, sysLat, sysLon);
          if (distance <= sysRad) {
            processCheckIn();
          } else {
            const force = confirm(`Out of range! You are ${Math.round(distance)}m away from campus (Allowed radius: ${sysRad}m).\n\nDo you want to submit your clock-in anyway?`);
            if (force) processCheckIn();
          }
        },
        (err) => {
          if (handled) return;
          handled = true;
          clearTimeout(timer);
          const force = confirm(`Location check unavailable (${err.message || 'Denied'}).\n\nSubmit clock-in anyway?`);
          if (force) processCheckIn();
        },
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 30000 }
      );
    } else {
      processCheckIn();
    }
  };

  const handleSelfCheckOut = () => {
    if (!user) return;
    
    const now = getNow();
    const curMinutes = now.getHours() * 60 + now.getMinutes();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Scheduled Check-Out Time Check (Cannot clock out before scheduled time)
    if (curMinutes < checkOutMinutes) {
      alert(`⛔ Clock-Out Restricted!\n\nYou cannot clock out before the scheduled check-out time (${checkOutStr}). Current time is ${timeString}.`);
      return;
    }

    // 2. Missing Clock-In Check
    if (!myAttendance?.checkInTime) {
      const confirmNoCheckIn = confirm(`You have not recorded a clock-in for today yet.\n\nWould you like to clock out anyway?`);
      if (!confirmNoCheckIn) return;
    }

    const processCheckOut = () => {
      const todayStr = now.toISOString().split('T')[0];
      const sheets = getStaffAttendanceSheets();
      const updatedSheets = [...sheets];
      let todaySheetIndex = updatedSheets.findIndex(s => s.date === todayStr);

      let todaySheet: StaffAttendanceSheet;
      if (todaySheetIndex >= 0) {
        todaySheet = { ...updatedSheets[todaySheetIndex] };
      } else {
        todaySheet = {
          date: todayStr,
          records: {}
        };
        updatedSheets.push(todaySheet);
        todaySheetIndex = updatedSheets.length - 1;
      }

      const records = { ...todaySheet.records };
      const existing: StaffAttendanceRecord = records[user.id] || { userId: user.id, status: 'Present' };

      records[user.id] = {
        ...existing,
        userId: user.id,
        status: existing.status || 'Present',
        checkInTime: existing.checkInTime,
        checkOutTime: timeString
      };

      todaySheet.records = records;
      todaySheet.lastUpdatedAt = new Date().toISOString();
      todaySheet.lastUpdatedBy = user.fullName;

      updatedSheets[todaySheetIndex] = todaySheet;
      saveStaffAttendanceSheets(updatedSheets);

      setMyAttendance(records[user.id]);
      loadMyAttendance(user);
      alert(`✅ Clock-out recorded successfully at ${timeString}!`);
    };

    // 3. Geolocation Range Check
    const sysLat = parseFloat(attendanceSettings.latitude);
    const sysLon = parseFloat(attendanceSettings.longitude);
    const sysRad = parseFloat(attendanceSettings.radius);

    if (!isNaN(sysLat) && !isNaN(sysLon) && !isNaN(sysRad) && sysRad > 0 && navigator.geolocation) {
      let handled = false;
      const timer = setTimeout(() => {
        if (!handled) {
          handled = true;
          const force = confirm(`Location check took too long.\n\nDo you want to submit your clock-out anyway?`);
          if (force) processCheckOut();
        }
      }, 3000);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (handled) return;
          handled = true;
          clearTimeout(timer);
          const distance = getDistance(pos.coords.latitude, pos.coords.longitude, sysLat, sysLon);
          if (distance <= sysRad) {
            processCheckOut();
          } else {
            const force = confirm(`Out of range! You are ${Math.round(distance)}m away from campus (Allowed radius: ${sysRad}m).\n\nDo you want to submit your clock-out anyway?`);
            if (force) processCheckOut();
          }
        },
        (err) => {
          if (handled) return;
          handled = true;
          clearTimeout(timer);
          const force = confirm(`Location check unavailable (${err.message || 'Denied'}).\n\nSubmit clock-out anyway?`);
          if (force) processCheckOut();
        },
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 30000 }
      );
    } else {
      processCheckOut();
    }
  };

  useEffect(() => {
    const activeUser = getCurrentUser();
    setUser(activeUser);
    if (activeUser) {
      loadMyAttendance(activeUser);
    }
    
    const profile = getSchoolProfile();
    setSchoolProfile(profile);

    // Calculate live stats
    const learners = getLearners();
    const totalStudents = learners.length;
    const maleStudents = learners.filter(l => l.gender?.toLowerCase() === 'male').length;
    const femaleStudents = learners.filter(l => l.gender?.toLowerCase() === 'female').length;

    const staffUsers = getUsers().filter(u => u.role !== 'Parent');
    const staffTotal = staffUsers.filter(u => u.status === 'Active').length;

    const staffSheets = getStaffAttendanceSheets();
    const todayStr = new Date().toISOString().split('T')[0];
    const todayStaffSheet = staffSheets.find(s => s.date === todayStr);
    
    let staffActive = 0;
    let hasStaffSheet = false;
    if (todayStaffSheet && todayStaffSheet.records && Object.keys(todayStaffSheet.records).length > 0) {
      hasStaffSheet = true;
      staffActive = Object.values(todayStaffSheet.records).filter(r => ['Present', 'Late', 'Half Day'].includes(r.status)).length;
    }

    const sheets = getAttendanceSheets();
    let latestSheet = sheets.find(s => s.date === todayStr);
    
    let absentsCount = 0;
    let presentStudentsCount = 0;
    let isSheetMarked = false;
    if (latestSheet && latestSheet.records && Object.keys(latestSheet.records).length > 0) {
      isSheetMarked = true;
      absentsCount = Object.values(latestSheet.records).filter(status => status === 'Absent').length;
      presentStudentsCount = Object.values(latestSheet.records).filter(status => ['AM', 'PM', 'Full', 'Present'].includes(status)).length;
    }

    setStats({
      totalStudents,
      maleStudents,
      femaleStudents,
      staffActive,
      staffTotal,
      absentsCount,
      presentStudentsCount,
      isSheetMarked,
      hasStaffSheet
    });
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Auto day/status logic
  const today = new Date();
  const day = today.getDay();
  const isWeekend = day === 0 || day === 6; // Sunday is 0, Saturday is 6
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleSaveAvatar = (newAvatarUrl: string) => {
    const updatedUser = { ...user, avatarUrl: newAvatarUrl };
    
    // 1. Set current user in state & DB
    setCurrentUser(updatedUser);
    setUser(updatedUser);
    
    // 2. Update in user list
    const allUsers = getUsers();
    const updatedUsers = allUsers.map(u => u.id === user.id ? updatedUser : u);
    saveUsers(updatedUsers);
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }
    // Limit to 2MB to keep base64 storage healthy
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image size must be less than 2MB.');
      return;
    }

    setUploadError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSave = () => {
    if (!imageUrl.trim()) {
      setUploadError('Please select a file or enter an image URL.');
      return;
    }
    handleSaveAvatar(imageUrl);
    setIsUploadModalOpen(false);
    setImageUrl('');
    setUploadError('');
  };

  const handleRemove = () => {
    handleSaveAvatar('');
    setIsUploadModalOpen(false);
    setImageUrl('');
    setUploadError('');
  };

  // Safe navigation handler
  const navigateTo = (view: string) => {
    if (setActiveView) {
      setActiveView(view);
    }
  };

  // Calculated widget metrics
  const isLearnerAttendanceMarked = stats.isSheetMarked;
  const presentStudents = isLearnerAttendanceMarked ? stats.presentStudentsCount : 0;
  const presentPercentage = (stats.totalStudents > 0 && isLearnerAttendanceMarked) 
    ? Math.round((presentStudents / stats.totalStudents) * 100) 
    : 0;
  const absentPercentage = (stats.totalStudents > 0 && isLearnerAttendanceMarked) 
    ? Math.round((stats.absentsCount / stats.totalStudents) * 100) 
    : 0;
  const studentStaffRatio = stats.staffTotal > 0 ? (stats.totalStudents / stats.staffTotal).toFixed(1) : '0';
  const isStaffAttendanceMarked = stats.hasStaffSheet;
  const staffPresentPercentage = (stats.staffTotal > 0 && isStaffAttendanceMarked) 
    ? Math.round((stats.staffActive / stats.staffTotal) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/40 p-3 sm:p-5 md:p-6 animate-fadeIn">
      <div className="max-w-7xl mx-auto 2xl:max-w-[1440px] space-y-4 sm:space-y-5">
        
        {/* Top Status Bar - Added fallback */}
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-xs border border-slate-100 flex items-center justify-between gap-2">
          <div className="text-center sm:text-left">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">LEARNERS</div>
            <div className="text-lg font-extrabold text-slate-900">{stats.totalStudents || 0}</div>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">STAFF</div>
            <div className="text-lg font-extrabold text-slate-900">{stats.staffTotal || 0}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">STATUS</div>
            <div className="text-xs font-bold inline-flex items-center gap-1.5 mt-0.5 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {myAttendance?.checkInTime ? 'ACTIVE' : 'ONLINE'}
            </div>
          </div>
        </div>

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-5 text-center shadow-md relative overflow-hidden">
          <div className="relative mx-auto mb-2 w-14 h-14 rounded-full bg-white text-blue-600 font-black text-xl flex items-center justify-center shadow-md">
            {user.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={user.fullName} 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              getInitials(user.fullName)
            )}
            <button 
              onClick={() => {
                setImageUrl(user.avatarUrl || '');
                setIsUploadModalOpen(true);
              }}
              className="absolute bottom-0 right-0 bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-xs cursor-pointer border border-blue-100 hover:scale-110 transition"
              title="Change Photo"
            >
              <Camera className="w-3 h-3" />
            </button>
          </div>
          <div className="text-base font-bold">👋 Welcome, <span>{user.fullName}</span></div>
          <div className="text-xs opacity-90 font-medium mt-1 inline-flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> {user.role}
          </div>
        </div>

        {/* School Day Banner */}
        <div className="bg-gradient-to-r from-sky-600 to-teal-600 text-white p-4 rounded-xl text-center shadow-md">
          <h3 className="text-base font-bold flex items-center justify-center gap-2">
            <GraduationCap className="w-4 h-4" /> School Day
          </h3>
          <div className="text-xs opacity-95 font-medium mt-1 flex items-center justify-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> {dayName}, {formattedDate}
          </div>
        </div>

        {/* School Name Title */}
        <div className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 px-1">
          <span className="text-blue-600">📂</span> {schoolProfile?.name || "Your School Name"}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          <div 
            onClick={() => navigateTo('Learners')}
            className="bg-blue-50 text-blue-900 p-3.5 rounded-xl text-center shadow-xs flex flex-col gap-1 hover:shadow-md transition cursor-pointer"
          >
            <div className="text-xs font-semibold flex items-center justify-center gap-1">
              <User className="w-3.5 h-3.5" /> Students
            </div>
            <div className="text-xl font-black">{stats.totalStudents}</div>
          </div>

          <div 
            onClick={() => navigateTo('Learners')}
            className="bg-cyan-50 text-cyan-900 p-3.5 rounded-xl text-center shadow-xs flex flex-col gap-1 hover:shadow-md transition cursor-pointer"
          >
            <div className="text-xs font-semibold flex items-center justify-center gap-1">
              <User className="w-3.5 h-3.5" /> Male
            </div>
            <div className="text-xl font-black">{stats.maleStudents}</div>
          </div>

          <div 
            onClick={() => navigateTo('Learners')}
            className="bg-pink-50 text-pink-900 p-3.5 rounded-xl text-center shadow-xs flex flex-col gap-1 hover:shadow-md transition cursor-pointer"
          >
            <div className="text-xs font-semibold flex items-center justify-center gap-1">
              <User className="w-3.5 h-3.5" /> Female
            </div>
            <div className="text-xl font-black">{stats.femaleStudents}</div>
          </div>

          <div 
            onClick={() => navigateTo('Staff Attendance')}
            className="bg-amber-50 text-amber-900 p-3.5 rounded-xl text-center shadow-xs flex flex-col gap-1 hover:shadow-md transition cursor-pointer"
          >
            <div className="text-xs font-semibold flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Staff
            </div>
            <div className="text-xl font-black">{stats.staffActive}/{stats.staffTotal}</div>
          </div>

          <div 
            onClick={() => navigateTo('Attendance Analytics')}
            className="bg-rose-50 text-rose-900 p-3.5 rounded-xl text-center shadow-xs flex flex-col gap-1 hover:shadow-md transition cursor-pointer"
          >
            <div className="text-xs font-semibold flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Absentees
            </div>
            <div className="text-xl font-black">{stats.absentsCount}</div>
          </div>

          <div 
            onClick={() => navigateTo('School Profile')}
            className="bg-emerald-50 text-emerald-900 p-3.5 rounded-xl text-center shadow-xs flex flex-col gap-1 hover:shadow-md transition cursor-pointer"
          >
            <div className="text-xs font-semibold flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Session
            </div>
            <div className="text-sm font-black truncate">
              {schoolProfile?.currentTerm || `Term 1 ${new Date().getFullYear()}`}
            </div>
          </div>
        </div>

        {/* Circular Clock Buttons Area */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-100 max-w-md mx-auto text-center space-y-4">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">CHECKING IN AS</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {user.fullName} <span className="font-normal text-slate-500 text-xs ml-1">ID: {user.staffNo || user.id}</span>
            </div>
            <div className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5 mt-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{liveTime.toLocaleTimeString()}</span>
            </div>
            {isOutOfRange && (
              <div className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md inline-block mt-1">
                Out of range ({userDistance?.toFixed(0)}m away)
              </div>
            )}
          </div>

          <div className="flex justify-center items-center gap-6 pt-2">
            <button
              onClick={() => handleSelfCheckIn('Present')}
              disabled={!!myAttendance?.checkInTime}
              className="w-[110px] h-[110px] rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              <span>{myAttendance?.checkInTime ? `IN: ${myAttendance.checkInTime}` : 'CLOCK IN'}</span>
            </button>

            <button
              onClick={handleSelfCheckOut}
              disabled={!!myAttendance?.checkOutTime}
              className="w-[110px] h-[110px] rounded-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              <span>{myAttendance?.checkOutTime ? `OUT: ${myAttendance.checkOutTime}` : 'CLOCK OUT'}</span>
            </button>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> Quick Actions
            </h3>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fast Shortcuts</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => setActiveView?.('Learners')}
              className="flex items-center gap-2.5 p-3 bg-slate-50 hover:bg-blue-50/80 hover:border-blue-200 border border-slate-100 rounded-xl transition cursor-pointer text-left group"
            >
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg group-hover:scale-105 transition">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Add Learner</div>
                <div className="text-[10px] text-slate-500 font-medium">New student record</div>
              </div>
            </button>

            <button
              onClick={() => setActiveView?.('Marks Submissions')}
              className="flex items-center gap-2.5 p-3 bg-slate-50 hover:bg-emerald-50/80 hover:border-emerald-200 border border-slate-100 rounded-xl transition cursor-pointer text-left group"
            >
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:scale-105 transition">
                <Pencil className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Enter Marks</div>
                <div className="text-[10px] text-slate-500 font-medium">Exam score entry</div>
              </div>
            </button>

            <button
              onClick={() => setActiveView?.('Attendance Roll')}
              className="flex items-center gap-2.5 p-3 bg-slate-50 hover:bg-purple-50/80 hover:border-purple-200 border border-slate-100 rounded-xl transition cursor-pointer text-left group"
            >
              <div className="p-2 bg-purple-100 text-purple-700 rounded-lg group-hover:scale-105 transition">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Take Roll Call</div>
                <div className="text-[10px] text-slate-500 font-medium">Class attendance</div>
              </div>
            </button>

            <button
              onClick={() => setActiveView?.('Generate Report')}
              className="flex items-center gap-2.5 p-3 bg-slate-50 hover:bg-amber-50/80 hover:border-amber-200 border border-slate-100 rounded-xl transition cursor-pointer text-left group"
            >
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg group-hover:scale-105 transition">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Report Cards</div>
                <div className="text-[10px] text-slate-500 font-medium">Generate term reports</div>
              </div>
            </button>

            <button
              onClick={() => setActiveView?.('Subjects')}
              className="flex items-center gap-2.5 p-3 bg-slate-50 hover:bg-teal-50/80 hover:border-teal-200 border border-slate-100 rounded-xl transition cursor-pointer text-left group"
            >
              <div className="p-2 bg-teal-100 text-teal-700 rounded-lg group-hover:scale-105 transition">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Subjects</div>
                <div className="text-[10px] text-slate-500 font-medium">Curriculum management</div>
              </div>
            </button>

            <button
              onClick={() => setActiveView?.('Teachers On Duty (TOD)')}
              className="flex items-center gap-2.5 p-3 bg-slate-50 hover:bg-emerald-50/80 hover:border-emerald-200 border border-slate-100 rounded-xl transition cursor-pointer text-left group"
            >
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:scale-105 transition">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Teachers On Duty</div>
                <div className="text-[10px] text-slate-500 font-medium">TOD campus supervision</div>
              </div>
            </button>

            <button
              onClick={() => setActiveView?.('Gate Check-in')}
              className="flex items-center gap-2.5 p-3 bg-slate-50 hover:bg-sky-50/80 hover:border-sky-200 border border-slate-100 rounded-xl transition cursor-pointer text-left group"
            >
              <div className="p-2 bg-sky-100 text-sky-700 rounded-lg group-hover:scale-105 transition">
                <LogIn className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Gate Scanner</div>
                <div className="text-[10px] text-slate-500 font-medium">Student arrival check-in</div>
              </div>
            </button>
          </div>
        </div>

        {/* 5. QUICK STATS HIGHLIGHTS & GROWTH METRICS */}
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" /> Key Growth Metrics
            </h3>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Campus Ratios</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 rounded-xl">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Student : Staff</div>
              <div className="text-lg font-black text-blue-900 mt-0.5">{studentStaffRatio} : 1</div>
              <div className="text-[9px] text-blue-600 font-semibold mt-0.5">Learners per staff</div>
            </div>

            <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100 rounded-xl">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Attendance Rate</div>
              <div className="text-lg font-black text-emerald-900 mt-0.5">
                {isLearnerAttendanceMarked ? `${presentPercentage}%` : <span className="text-slate-400 italic text-sm font-semibold">Pending</span>}
              </div>
              <div className="text-[9px] text-emerald-600 font-semibold mt-0.5">
                {isLearnerAttendanceMarked ? 'Daily presence' : 'Roll pending'}
              </div>
            </div>

            <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50/50 border border-purple-100 rounded-xl">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Gender Ratio</div>
              <div className="text-lg font-black text-purple-900 mt-0.5">
                {stats.totalStudents > 0 ? Math.round((stats.maleStudents / stats.totalStudents) * 100) : 0}% / {stats.totalStudents > 0 ? Math.round((stats.femaleStudents / stats.totalStudents) * 100) : 0}%
              </div>
              <div className="text-[9px] text-purple-600 font-semibold mt-0.5">Male / Female</div>
            </div>

            <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100 rounded-xl">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Staff Active</div>
              <div className="text-lg font-black text-amber-900 mt-0.5">
                {isStaffAttendanceMarked ? `${staffPresentPercentage}%` : <span className="text-slate-400 italic text-sm font-semibold">Pending</span>}
              </div>
              <div className="text-[9px] text-amber-600 font-semibold mt-0.5">
                {isStaffAttendanceMarked ? `${stats.staffActive} of ${stats.staffTotal} staff` : 'Staff log pending'}
              </div>
            </div>
          </div>
        </div>

        {/* TWO COLUMN WIDGETS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* LEFT COLUMN: Attendance Quick Chart & Pending Tasks */}
          <div className="space-y-4">
            
            {/* 1. ATTENDANCE QUICK CHART WIDGET */}
            <div className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-600" /> Today's Attendance Overview
                </h3>
                <button 
                  onClick={() => setActiveView?.('Attendance Analytics')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  Analytics <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600">Student Attendance Rate</span>
                  <span className="text-emerald-700 font-bold">
                    {isLearnerAttendanceMarked ? `${presentPercentage}% Present` : <span className="text-slate-400 italic font-normal">Pending (Roll Unmarked)</span>}
                  </span>
                </div>

                {/* Stacked Progress Bar */}
                <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  <div 
                    style={{ width: `${isLearnerAttendanceMarked ? presentPercentage : 0}%` }} 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    title={`Present: ${presentStudents}`} 
                  />
                  <div 
                    style={{ width: `${isLearnerAttendanceMarked ? absentPercentage : 0}%` }} 
                    className="bg-rose-500 h-full transition-all duration-500" 
                    title={`Absent: ${stats.absentsCount}`} 
                  />
                </div>

                {/* Breakdown Chips */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-lg text-center">
                    <div className="text-[10px] uppercase font-semibold text-emerald-700">Present</div>
                    <div className="text-xs font-black text-emerald-900">
                      {isLearnerAttendanceMarked ? `${presentStudents} (${presentPercentage}%)` : <span className="text-slate-400 italic">Pending</span>}
                    </div>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 p-2 rounded-lg text-center">
                    <div className="text-[10px] uppercase font-semibold text-rose-700">Absentees</div>
                    <div className="text-xs font-black text-rose-900">
                      {isLearnerAttendanceMarked ? `${stats.absentsCount} (${absentPercentage}%)` : <span className="text-slate-400 italic">Pending</span>}
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 p-2 rounded-lg text-center">
                    <div className="text-[10px] uppercase font-semibold text-blue-700">Staff Active</div>
                    <div className="text-xs font-black text-blue-900">
                      {isStaffAttendanceMarked ? `${stats.staffActive}/${stats.staffTotal}` : <span className="text-slate-400 italic">Pending</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. PENDING TASKS & REMINDERS WIDGET */}
            <div className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-purple-600" /> Pending Tasks & Reminders
                </h3>
                <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full font-bold">
                  Action Required
                </span>
              </div>

              <div className="space-y-2">
                {/* Staff Clock-in status */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100/70 transition">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-md ${myAttendance?.checkInTime ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Staff Attendance Status</div>
                      <div className="text-[10px] text-slate-500">
                        {myAttendance?.checkInTime ? `Clocked in at ${myAttendance.checkInTime}` : 'Daily attendance check-in pending'}
                      </div>
                    </div>
                  </div>
                  {!myAttendance?.checkInTime && (
                    <button 
                      onClick={() => handleSelfCheckIn('Present')}
                      className="text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-md transition cursor-pointer"
                    >
                      Clock In
                    </button>
                  )}
                  {myAttendance?.checkInTime && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </span>
                  )}
                </div>

                {/* Exam Marks Entry */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100/70 transition">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-blue-100 text-blue-700">
                      <Pencil className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Exam Marks Entry</div>
                      <div className="text-[10px] text-slate-500">
                        {exams.length > 0 ? `${exams.length} active exam record(s) ready` : 'No active exam entries'}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveView?.('Marks Submissions')}
                    className="text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md transition cursor-pointer"
                  >
                    Open
                  </button>
                </div>

                {/* Class Roll Call */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100/70 transition">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-purple-100 text-purple-700">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Daily Class Roll Call</div>
                      <div className="text-[10px] text-slate-500">Verify & record learner attendance</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveView?.('Attendance Roll')}
                    className="text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 px-2.5 py-1 rounded-md transition cursor-pointer"
                  >
                    Take Roll
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: 4. School Announcements Bulletin */}
          <div className="space-y-4">
            
            <div className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-slate-100 space-y-3 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-blue-600" /> School Notice Board
                  </h3>
                  <button 
                    onClick={() => setIsAddNoticeOpen(true)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Post Notice
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {announcements.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No school announcements posted yet.
                    </div>
                  ) : (
                    announcements.map((ann) => (
                      <div key={ann.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 relative group hover:border-blue-100 transition">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                            {ann.category}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">{ann.date}</span>
                            <button 
                              onClick={() => handleDeleteNotice(ann.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-0.5 transition cursor-pointer"
                              title="Delete Announcement"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800">{ann.title}</h4>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{ann.content}</p>
                        <div className="text-[9px] text-slate-400 font-medium pt-0.5">Posted by {ann.author}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* 📊 CLOUD STORAGE METRICS WIDGET (Super Admin Only) */}
        {(user?.role === 'Super Admin' || user?.systemRole === 'super_admin') && (
          <div className="max-w-md mx-auto sm:max-w-none">
            <CloudStorageCard />
          </div>
        )}

        <ActivityFeed />

        {/* Recent Exams Card */}
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600" /> Recent Exams
            </h3>
            <button 
              onClick={() => setActiveView?.('New Exam')} 
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1"
            >
              + New Exam
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-2">EXAM NAME</th>
                  <th className="py-2.5 px-2">YEAR</th>
                  <th className="py-2.5 px-2">TERM</th>
                  <th className="py-2.5 px-2 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 font-medium">
                      No exams found.
                    </td>
                  </tr>
                ) : (
                  exams.slice(0, 5).map((exam: any) => (
                    <tr key={exam.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-2 font-bold text-slate-800">{exam.examName || exam.name}</td>
                      <td className="py-2.5 px-2 text-slate-600">{exam.academicYear || exam.year}</td>
                      <td className="py-2.5 px-2 text-slate-600">{exam.term}</td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => {
                            secureSet('selected_exam_id_for_marks', exam.id);
                            setActiveView?.('Marks Submissions');
                          }}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md font-bold text-[11px] transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" /> Enter
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 📢 POST ANNOUNCEMENT MODAL */}
      {isAddNoticeOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-150 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-blue-400" /> Post New Announcement
              </h3>
              <button 
                onClick={() => setIsAddNoticeOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNotice} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notice Category</label>
                <select 
                  value={newNoticeCategory}
                  onChange={(e) => setNewNoticeCategory(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                >
                  <option value="General">General Notice</option>
                  <option value="Exams">Exams & Assessment</option>
                  <option value="Staff Notice">Staff Notice</option>
                  <option value="Event">School Event</option>
                  <option value="Urgent">Urgent Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Title</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. End of Term Staff Briefing"
                  value={newNoticeTitle}
                  onChange={(e) => setNewNoticeTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Message Content</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Enter announcement details..."
                  value={newNoticeContent}
                  onChange={(e) => setNewNoticeContent(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddNoticeOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition cursor-pointer shadow-sm"
                >
                  Post Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🖼️ INTERACTIVE PROFILE PICTURE UPLOADER MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-150 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" /> Update Profile Picture
              </h3>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              
              {/* Image Preview Container */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-sm relative">
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-slate-300" />
                  )}
                </div>
              </div>

              {/* URL Input Form */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/photo.jpg"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setUploadError('');
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm font-medium"
                />
              </div>

              {/* Or File Upload Form */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-slate-500 font-medium">Or upload a file</span>
                </div>
              </div>

              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:bg-slate-50'}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('avatar-upload-input')?.click()}
              >
                <input 
                  id="avatar-upload-input"
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <Upload className={`w-8 h-8 mx-auto mb-2 ${dragActive ? 'text-blue-500' : 'text-slate-400'}`} />
                <p className="text-sm font-medium text-slate-700">
                  {dragActive ? 'Drop image here...' : 'Click or drag image here'}
                </p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 2MB</p>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {uploadError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleRemove}
                  className="px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  Remove
                </button>
                <div className="flex-1"></div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
                >
                  Save Profile
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};


