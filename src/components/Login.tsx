import React, { useState, useEffect } from 'react';
import { getUsers, getSchoolProfile, setCurrentUser, getLearners, UserAccount } from '../utils/db';
import { Shield, Key, Sparkles, LogIn, GraduationCap, Users, User, ArrowRight, BookOpen, X, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [schoolProfile, setSchoolProfile] = useState(getSchoolProfile());
  
  // States for role selection flow
  const [selectedTab, setSelectedTab] = useState<'super_admin' | 'admin' | 'teacher' | 'parent'>('super_admin');
  const [greeting, setGreeting] = useState('');

  const selectRoleTab = (tab: 'super_admin' | 'admin' | 'teacher' | 'parent') => {
    setSelectedTab(tab);
    setError(null);
    setUsername('');
    setPassword('');
  };

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting('Good morning');
      } else if (hour >= 12 && hour < 17) {
        setGreeting('Good afternoon');
      } else {
        setGreeting('Good evening');
      }
    };
    updateGreeting();
  }, []);

  useEffect(() => {
    setUsers(getUsers());
    setSchoolProfile(getSchoolProfile());

    // Listen to profile updates
    const handleStorageChange = () => {
      setSchoolProfile(getSchoolProfile());
      setUsers(getUsers());
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

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedTab === 'parent') {
      const cleanPhone = username.trim().replace(/\s+/g, '');
      const cleanAdmNo = password.trim();

      if (!cleanPhone || !cleanAdmNo) {
        setError('⚠️ Please enter both your registered Phone Number and child\'s Admission Number.');
        return;
      }

      const learnersList = getLearners();
      const matchedLearner = learnersList.find(l => {
        const studentPhone = (l.parentPhone || '').trim().replace(/\s+/g, '');
        const studentAdm = (l.admNo || '').trim();
        return studentPhone === cleanPhone && studentAdm === cleanAdmNo;
      });

      if (!matchedLearner) {
        setError('⚠️ Parent login details not found. Please verify your phone number and student admission number.');
        return;
      }

      if (matchedLearner.status === 'Inactive') {
        setError('⚠️ Access denied. This student\'s record is currently marked as Inactive.');
        return;
      }

      // Dynamically log in as parent of this student
      const parentUser: UserAccount = {
        id: `parent_${matchedLearner.id}`,
        username: cleanPhone,
        fullName: `Parent of ${matchedLearner.name}`,
        role: 'Parent',
        created: '2026-07-16',
        status: 'Active'
      };

      setCurrentUser(parentUser);
      onLoginSuccess(parentUser);
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const foundUser = users.find(u => u.username === cleanUsername);

    if (!foundUser) {
      if (selectedTab === 'super_admin') {
        setError(`⚠️ Super Admin username "${username}" not found.`);
      } else if (selectedTab === 'admin') {
        setError(`⚠️ Admin username "${username}" not found. Please contact the Super Admin.`);
      } else {
        setError(`⚠️ Username "${username}" not found.`);
      }
      return;
    }

    if (foundUser.status === 'Inactive') {
      setError('⚠️ This staff account has been deactivated by the administrator.');
      return;
    }

    if (foundUser.role !== 'Parent') {
      if (!foundUser.password) {
        setError('⚠️ This account does not have a password configured. Please contact the Admin.');
        return;
      }
      if (password !== foundUser.password) {
        setError('⚠️ Incorrect password. Please try again.');
        return;
      }
    }

    // Success
    setCurrentUser(foundUser);
    onLoginSuccess(foundUser);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1528] via-[#112240] to-[#080E1C] flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden font-sans text-slate-800">
      
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Large School Logo Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-20 overflow-hidden">
        {schoolProfile.logoUrl ? (
          <img 
            src={schoolProfile.logoUrl} 
            alt="School Logo Watermark" 
            className="w-[380px] h-[380px] sm:w-[680px] sm:h-[680px] object-contain opacity-[0.24] filter brightness-100 contrast-150 saturate-125 transition-all duration-700"
            referrerPolicy="no-referrer"
          />
        ) : (
          <GraduationCap className="w-[380px] h-[380px] sm:w-[680px] sm:h-[680px] text-blue-400 opacity-[0.18] transition-all duration-700" />
        )}
      </div>

      {/* Header Bar as Floating Elegant Pill */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex items-center justify-between max-w-6xl mx-auto w-full py-3 px-4 sm:px-6 rounded-2xl bg-white/70 border border-slate-200/80 backdrop-blur-md mb-6 shadow-sm"
      >
        <div className="flex items-center gap-3">
          {schoolProfile.logoUrl ? (
            <img 
              src={schoolProfile.logoUrl} 
              alt="School Logo" 
              className="w-10 h-10 object-contain bg-white rounded-xl p-1 shadow-sm border border-slate-100 hover:scale-105 transition duration-300"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-extrabold shadow-md shadow-blue-500/30">
              <GraduationCap className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
          )}
          <div>
            <h1 className="text-sm font-black text-slate-800 tracking-wide uppercase">
              {schoolProfile.name}
            </h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              {schoolProfile.code ? `Code: ${schoolProfile.code}` : 'Administrative Portal'}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 bg-slate-100/80 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 text-[10px] font-extrabold uppercase">
          <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-bounce" />
          <span>CBC Academic Manager</span>
        </div>
      </motion.header>

      {/* Main Unified Login Card */}
      <main className="relative z-10 my-auto flex flex-col items-center justify-center max-w-xl mx-auto w-full py-4 px-2 sm:px-0 gap-4">
        {/* Dynamic Bluish Greeting Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white px-5 py-4 rounded-2xl shadow-md border border-blue-500/20 text-center space-y-1.5 relative overflow-hidden"
        >
          <div className="absolute top-[-30%] right-[-10%] w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute bottom-[-30%] left-[-10%] w-24 h-24 bg-indigo-500/30 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-200 font-mono">
            {greeting === 'Good morning' ? (
              <Sun className="w-4 h-4 text-amber-300 animate-pulse" />
            ) : greeting === 'Good afternoon' ? (
              <Sun className="w-4 h-4 text-orange-300 animate-pulse" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-200 animate-pulse" />
            )}
            <span>{greeting}</span>
          </div>
          <h3 className="text-base sm:text-lg font-black tracking-wide leading-snug">
            Welcome to St. Augustine Catholic School Portal
          </h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full bg-white/75 backdrop-blur-md p-6 sm:p-10 rounded-3xl border border-white/30 flex flex-col gap-6 shadow-2xl relative"
        >
          {/* Accent decoration inside the card */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/20 to-transparent rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-100/20 to-transparent rounded-full blur-3xl pointer-events-none"></div>

          {/* Upper Part: Brand Header */}
          <div className="space-y-4 relative z-10 text-center flex flex-col items-center">
            {schoolProfile.logoUrl ? (
              <div className="relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl blur opacity-20 group-hover:opacity-45 transition duration-1000"></div>
                <img 
                  src={schoolProfile.logoUrl} 
                  alt="School Logo" 
                  className="relative w-32 h-32 object-contain bg-white rounded-3xl p-3.5 shadow-md border border-slate-100 group-hover:scale-105 transition duration-300"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-25"></div>
                <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black shadow-lg border border-blue-500/10">
                  <GraduationCap className="w-16 h-16 text-amber-300" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap justify-center gap-2">
                <span className="inline-flex items-center gap-1 bg-amber-50/80 text-amber-800 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-amber-200/60">
                  ⭐️ Official Portal
                </span>
                <span className="inline-flex items-center gap-1 bg-blue-50/80 text-blue-800 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-blue-200/60 font-mono">
                  {schoolProfile.code ? `Code: ${schoolProfile.code}` : 'CBC System'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-tight">
                {schoolProfile.name || 'Integrated School'}
              </h2>
              {schoolProfile.motto && (
                <p className="text-sm font-extrabold text-slate-600 italic">
                  "{schoolProfile.motto}"
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200/50 my-1 relative z-10"></div>

          {/* Lower Part: Authorized Sign In */}
          <div className="space-y-5 relative z-10">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-lg font-black text-slate-800 tracking-wide">Authorized Sign In</h3>
              <p className="text-xs text-slate-500">Select your portal role below to view sign-in instructions.</p>
            </div>

            {/* Role Selection Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-white/40 backdrop-blur-sm p-2 rounded-2xl border border-white/50">
              {/* Top Row: Super Admin & Admin */}
              <button
                type="button"
                onClick={() => selectRoleTab('super_admin')}
                className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-center transition-all duration-300 cursor-pointer ${
                  selectedTab === 'super_admin'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/10'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Shield className={`w-4 h-4 mb-1 ${selectedTab === 'super_admin' ? 'text-amber-200' : 'text-slate-400'}`} />
                <span className="text-[10px] font-extrabold uppercase tracking-wide">Super Admin</span>
              </button>

              <button
                type="button"
                onClick={() => selectRoleTab('admin')}
                className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-center transition-all duration-300 cursor-pointer ${
                  selectedTab === 'admin'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Shield className={`w-4 h-4 mb-1 ${selectedTab === 'admin' ? 'text-indigo-200' : 'text-slate-400'}`} />
                <span className="text-[10px] font-extrabold uppercase tracking-wide">Admin</span>
              </button>

              {/* Bottom Row: Teacher & Parent */}
              <button
                type="button"
                onClick={() => selectRoleTab('teacher')}
                className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-center transition-all duration-300 cursor-pointer ${
                  selectedTab === 'teacher'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/10'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <BookOpen className={`w-4 h-4 mb-1 ${selectedTab === 'teacher' ? 'text-blue-200' : 'text-slate-400'}`} />
                <span className="text-[10px] font-extrabold uppercase tracking-wide">Teacher</span>
              </button>

              <button
                type="button"
                onClick={() => selectRoleTab('parent')}
                className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-center transition-all duration-300 cursor-pointer ${
                  selectedTab === 'parent'
                    ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md shadow-rose-600/10'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Users className={`w-4 h-4 mb-1 ${selectedTab === 'parent' ? 'text-rose-200' : 'text-slate-400'}`} />
                <span className="text-[10px] font-extrabold uppercase tracking-wide">Parent</span>
              </button>
            </div>

            {/* Dynamic Guidelines Box */}
            <div className={`p-3.5 rounded-xl text-xs font-semibold leading-relaxed border transition-all duration-300 ${
              selectedTab === 'teacher'
                ? 'bg-blue-50/70 border-blue-100 text-blue-800'
                : selectedTab === 'parent'
                ? 'bg-rose-50/70 border-rose-100 text-rose-800'
                : selectedTab === 'super_admin'
                ? 'bg-amber-50/70 border-amber-100 text-amber-800'
                : 'bg-indigo-50/70 border-indigo-100 text-indigo-800'
            }`}>
              <span className="font-bold uppercase tracking-wider block text-[9px] mb-1 font-mono">
                {selectedTab === 'teacher' 
                  ? 'Teacher Portal Guide:' 
                  : selectedTab === 'parent' 
                  ? 'Parent Portal Guide:' 
                  : selectedTab === 'super_admin'
                  ? 'Super Admin Portal Guide:' 
                  : 'Admin Portal Guide:'}
              </span>
              {selectedTab === 'teacher' && (
                <span>Fill in your teacher username (e.g., <strong>"teacher"</strong>) and password. New accounts must be created by the Admin first.</span>
              )}
              {selectedTab === 'parent' && (
                <span>Enter your registered <strong>Phone Number</strong> (e.g. <code>0711111111</code>) and your child's <strong>Admission Number</strong> (e.g. <code>9101</code>) as the password.</span>
              )}
              {selectedTab === 'super_admin' && (
                <span>Provide your super administrator email and high-security access PIN to launch database controls.</span>
              )}
              {selectedTab === 'admin' && (
                <span>Provide your registered administrator email or phone number, and access password to log in with administrative privileges.</span>
              )}
            </div>

            {/* Error Alert Box */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span>{error}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {selectedTab === 'teacher' 
                    ? 'Teacher Username' 
                    : selectedTab === 'parent' 
                    ? 'Parent Phone Number' 
                    : selectedTab === 'super_admin'
                    ? 'Super Admin Email'
                    : 'Admin Email or Phone Number'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input 
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={
                      selectedTab === 'teacher' 
                        ? 'e.g. teacher' 
                        : selectedTab === 'parent' 
                        ? 'e.g. 0711111111' 
                        : selectedTab === 'super_admin'
                        ? 'e.g. superadmin@school.com'
                        : 'e.g. admin@school.com or 0712345678'
                    }
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all min-h-[48px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {selectedTab === 'parent' ? 'Child Admission Number (Password)' : 'Access Password'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-4 h-4" />
                  </span>
                  <input 
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={selectedTab === 'parent' ? 'e.g. 9101' : 'Enter access password'}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all min-h-[48px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer min-h-[48px] active:scale-[0.98] shadow-md shadow-blue-600/15 mt-6"
              >
                <span>Sign In to {
                  selectedTab === 'teacher' 
                    ? 'Teachers Portal' 
                    : selectedTab === 'parent' 
                    ? 'Parent Portal' 
                    : selectedTab === 'super_admin'
                    ? 'Super Admin Portal'
                    : 'Admin Portal'
                }</span>
                <LogIn className="w-4 h-4" />
              </button>
            </form>
          </div>
        </motion.div>
      </main>

      {/* Footer System Branding */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto w-full text-slate-400 text-[10px] font-bold border-t border-slate-800/60 pt-4"
      >
        <div>
          <span>© 2026 {schoolProfile.name}. All Rights Reserved.</span>
        </div>
        <div className="flex items-center gap-4 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            PORTAL STATE: ONLINE
          </span>
          <span>•</span>
          <span>SECURE SSL ACTIVE</span>
        </div>
      </motion.footer>
    </div>
  );
}
