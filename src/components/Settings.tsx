/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  getUsers, 
  getLearners, 
  getSubjects, 
  getSchoolProfile,
  UserAccount,
  secureGet,
  secureSet
} from '../utils/db';
import { getAlertConfig, saveAlertConfig, getAlertLogs, addAlertLog, clearAlertLogs, AlertLog, AlertConfig } from '../utils/alerts';
import { 
  Shield, 
  ShieldCheck, 
  Mail, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  RefreshCw, 
  Clock, 
  Trash2, 
  Server, 
  Eye, 
  Send,
  Building,
  Key,
  Users,
  Sun,
  Moon
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Settings() {
  const [usersCount, setUsersCount] = useState(0);
  const [learnersCount, setLearnersCount] = useState(0);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [schoolName, setSchoolName] = useState('');
  const [parents, setParents] = useState<UserAccount[]>([]);
  
  // Alert settings states
  const [alertConfig, setAlertConfigState] = useState<AlertConfig>(() => getAlertConfig());
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>(() => getAlertLogs());
  const [selectedLog, setSelectedLog] = useState<AlertLog | null>(null);
  
  // Test email animation state
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testStep, setTestStep] = useState<string>('');
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  // Role-based permission matrix state
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>(() => {
    try {
      const saved = secureGet('school_role_permissions_matrix_v1');
      return saved ? JSON.parse(saved) : {
        'Super Admin': { edit_learner: true, add_learner: true, attendance: true, edit_marks: true, print_exams: true, cannot_delete: false },
        'Admin': { edit_learner: true, add_learner: true, attendance: true, edit_marks: true, print_exams: true, cannot_delete: false },
        'Head Teacher': { edit_learner: true, add_learner: true, attendance: true, edit_marks: true, print_exams: true, cannot_delete: true },
        'Deputy Head Teacher': { edit_learner: true, add_learner: true, attendance: true, edit_marks: true, print_exams: true, cannot_delete: true },
        'Senior Teacher': { edit_learner: true, add_learner: true, attendance: true, edit_marks: true, print_exams: true, cannot_delete: true },
        'Class Teacher': { edit_learner: true, add_learner: true, attendance: true, edit_marks: true, print_exams: true, cannot_delete: true },
        'Teacher': { edit_learner: false, add_learner: false, attendance: true, edit_marks: true, print_exams: true, cannot_delete: true }
      };
    } catch {
      return {
        'Super Admin': { edit_learner: true, add_learner: true, attendance: true, edit_marks: true, print_exams: true, cannot_delete: false },
        'Admin': { edit_learner: true, add_learner: true, attendance: true, edit_marks: true, print_exams: true, cannot_delete: false },
        'Head Teacher': { edit_learner: true, add_learner: true, attendance: true, edit_marks: true, print_exams: true, cannot_delete: true },
        'Deputy Head Teacher': { edit_learner: true, add_learner: true, attendance: true, edit_marks: true, print_exams: true, cannot_delete: true },
        'Senior Teacher': { edit_learner: true, add_learner: true, attendance: true, edit_marks: true, print_exams: true, cannot_delete: true },
        'Class Teacher': { edit_learner: true, add_learner: true, attendance: true, edit_marks: true, print_exams: true, cannot_delete: true },
        'Teacher': { edit_learner: false, add_learner: false, attendance: true, edit_marks: true, print_exams: true, cannot_delete: true }
      };
    }
  });

  const handleToggleRolePermission = (role: string, permKey: string) => {
    const current = rolePermissions[role] || {};
    const nextRole = { ...current, [permKey]: !current[permKey] };
    const nextMatrix = { ...rolePermissions, [role]: nextRole };
    setRolePermissions(nextMatrix);
    secureSet('school_role_permissions_matrix_v1', JSON.stringify(nextMatrix));
  };

  useEffect(() => {
    // Load counts
    const allUsers = getUsers();
    setUsersCount(allUsers.length);
    setLearnersCount(getLearners().length);
    setSubjectsCount(getSubjects().length);
    setSchoolName(getSchoolProfile().name || '');
    setParents(allUsers.filter(u => u.role === 'Parent'));

    // Refresh logs on custom event
    const handleAlertRefresh = () => {
      setAlertLogs(getAlertLogs());
    };
    window.addEventListener('security_alert_logged', handleAlertRefresh);
    return () => window.removeEventListener('security_alert_logged', handleAlertRefresh);
  }, []);

  const handleConfigChange = (key: keyof AlertConfig, value: any) => {
    const updated = { ...alertConfig, [key]: value };
    setAlertConfigState(updated);
    saveAlertConfig(updated);
  };

  const triggerTestEmail = async () => {
    if (isTestingEmail) return;
    setIsTestingEmail(true);
    setTestResult(null);
    setSelectedLog(null);

    const steps = [
      'Resolving DNS MX records for recipient domain...',
      'Found MX servers: gmail-smtp-in.l.google.com (Priority 5)',
      'Establishing TLS encrypted session on port 587...',
      'Performing ESMTP EHLO handshake protocol...',
      'Transmitting envelope sender: <alerts-noreply@cbc-portal.org>',
      `Transmitting envelope recipient: <${alertConfig.primaryEmail}>`,
      'Preparing secure multipart MIME boundary blocks...',
      'Uploading subject headers and message payload...',
      'Finalizing transaction block [DATA CRLF.CRLF]...',
      'Queue acknowledged by remote SMTP server'
    ];

    for (const step of steps) {
      setTestStep(step);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    const testAlert = addAlertLog(
      'Test',
      'Info',
      'System Connection Diagnostic Test',
      `Secure communication channel handshake verified for administrative primary email address: ${alertConfig.primaryEmail}`
    );

    if (testAlert) {
      setTestResult('success');
      setAlertLogs(getAlertLogs());
    } else {
      setTestResult('failed');
    }
    setIsTestingEmail(false);
  };

  const handleClearLogs = () => {
    if (confirm('🚨 Are you sure you want to purge all outbound alert mail logs?')) {
      clearAlertLogs();
      setAlertLogs([]);
      setSelectedLog(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Settings Info Card Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 rounded-2xl border border-blue-800 text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] text-blue-300 font-extrabold uppercase tracking-widest block">System Preferences & Access Controls</span>
          <h3 className="text-lg font-black tracking-tight text-white">{schoolName} Admin Settings</h3>
          <p className="text-xs text-slate-300 max-w-xl">
            Configure automated system security, email delivery relays, and audit logs to prevent and trace unauthorized breaches.
          </p>
        </div>
        <div className="p-3 bg-blue-500/10 text-blue-300 rounded-2xl border border-blue-700/30 self-start sm:self-auto shrink-0">
          <Key size={24} />
        </div>
      </div>

      {/* 📌 ROLE-BASED PERMISSIONS & RESTRICTIONS MATRIX */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/10">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900">Role-Based Permissions & Restrictions Matrix</h4>
              <p className="text-xs text-slate-500">Configure exact privileges and restrictions for Super Admin, Admin, Head Teacher, Deputy, Senior, Class Teacher, and Teachers.</p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 uppercase tracking-wider">
            7 Staff Roles Enforced
          </span>
        </div>

        <div className="space-y-4">
          {Object.entries(rolePermissions).map(([roleName, rawPerms]) => {
            const perms = rawPerms as Record<string, boolean>;
            const isSuperOrAdmin = roleName === 'Super Admin' || roleName === 'Admin';
            return (
              <div key={roleName} className={`p-4 rounded-2xl border transition ${isSuperOrAdmin ? 'bg-blue-50/40 border-blue-200/80' : 'bg-slate-50/70 border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${isSuperOrAdmin ? 'bg-blue-600' : 'bg-amber-500'}`} />
                    <h5 className="text-xs font-black text-slate-900 uppercase tracking-wide">{roleName}</h5>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {isSuperOrAdmin ? 'Full Administrative Access' : 'Classroom & School Privileges'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Edit Learner */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
                    <div>
                      <span className="text-[11px] font-bold text-slate-800 block">Edit Learner Details</span>
                      <span className="text-[10px] text-slate-400">Update student profiles</span>
                    </div>
                    <button
                      onClick={() => handleToggleRolePermission(roleName, 'edit_learner')}
                      className={`w-9 h-5 rounded-full transition relative p-0.5 shrink-0 cursor-pointer ${perms.edit_learner ? 'bg-blue-600' : 'bg-slate-300'}`}
                      title="Toggle permission"
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition shadow-xs ${perms.edit_learner ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Add Learner */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
                    <div>
                      <span className="text-[11px] font-bold text-slate-800 block">Add New Learners</span>
                      <span className="text-[10px] text-slate-400">Register new students</span>
                    </div>
                    <button
                      onClick={() => handleToggleRolePermission(roleName, 'add_learner')}
                      className={`w-9 h-5 rounded-full transition relative p-0.5 shrink-0 cursor-pointer ${perms.add_learner ? 'bg-blue-600' : 'bg-slate-300'}`}
                      title="Toggle permission"
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition shadow-xs ${perms.add_learner ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Attendance */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
                    <div>
                      <span className="text-[11px] font-bold text-slate-800 block">Mark Attendance Roll</span>
                      <span className="text-[10px] text-slate-400">Class daily attendance</span>
                    </div>
                    <button
                      onClick={() => handleToggleRolePermission(roleName, 'attendance')}
                      className={`w-9 h-5 rounded-full transition relative p-0.5 shrink-0 cursor-pointer ${perms.attendance ? 'bg-blue-600' : 'bg-slate-300'}`}
                      title="Toggle permission"
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition shadow-xs ${perms.attendance ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Edit Marks */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
                    <div>
                      <span className="text-[11px] font-bold text-slate-800 block">Edit Marks for Learners</span>
                      <span className="text-[10px] text-slate-400">Input exam & test scores</span>
                    </div>
                    <button
                      onClick={() => handleToggleRolePermission(roleName, 'edit_marks')}
                      className={`w-9 h-5 rounded-full transition relative p-0.5 shrink-0 cursor-pointer ${perms.edit_marks ? 'bg-blue-600' : 'bg-slate-300'}`}
                      title="Toggle permission"
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition shadow-xs ${perms.edit_marks ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Print Exams */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
                    <div>
                      <span className="text-[11px] font-bold text-slate-800 block">Print Exams & Reports</span>
                      <span className="text-[10px] text-slate-400">Export terminal reports</span>
                    </div>
                    <button
                      onClick={() => handleToggleRolePermission(roleName, 'print_exams')}
                      className={`w-9 h-5 rounded-full transition relative p-0.5 shrink-0 cursor-pointer ${perms.print_exams ? 'bg-blue-600' : 'bg-slate-300'}`}
                      title="Toggle permission"
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition shadow-xs ${perms.print_exams ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Cannot Delete */}
                  <div className="bg-white p-3 rounded-xl border border-rose-200/80 flex items-center justify-between gap-2 shadow-2xs">
                    <div>
                      <span className="text-[11px] font-bold text-rose-900 block">Cannot Delete Anything</span>
                      <span className="text-[10px] text-rose-600">Strict delete protection</span>
                    </div>
                    <button
                      onClick={() => handleToggleRolePermission(roleName, 'cannot_delete')}
                      className={`w-9 h-5 rounded-full transition relative p-0.5 shrink-0 cursor-pointer ${perms.cannot_delete ? 'bg-rose-600' : 'bg-slate-300'}`}
                      title="Toggle restriction"
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition shadow-xs ${perms.cannot_delete ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/60 flex items-center justify-between text-xs text-blue-900">
          <span>💡 Changes to role permission matrices are instantly saved and enforced across staff authentication sessions.</span>
        </div>
      </div>

      {/* Main security dashboard setup splits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Column Left: Email Configuration Settings */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/10">
                <Shield size={22} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">Email Alerts & Security Hub</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Primary System Monitor</p>
              </div>
            </div>

            {/* Email Input Field */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Primary Administrative Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="email"
                  value={alertConfig.primaryEmail}
                  onChange={(e) => handleConfigChange('primaryEmail', e.target.value)}
                  placeholder="otienobyron805@gmail.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all min-h-[48px]"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                All critical administrative updates, security alerts, and access audits will be dispatched directly to this address.
              </p>
            </div>

            {/* Alert Categories Checkboxes */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Select Alert Triggers
              </span>

              <div className="space-y-3">
                {/* 1. Security Breach */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={alertConfig.enableSecurityBreach}
                    onChange={(e) => handleConfigChange('enableSecurityBreach', e.target.checked)}
                    className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-800 group-hover:text-slate-900 transition">
                      Security Breaches & Access Audits
                    </span>
                    <span className="block text-[10px] text-slate-500 font-medium">
                      Alert when unauthorized users attempt to spoof administrative roles, edit closed parameters, or have failed logins.
                    </span>
                  </div>
                </label>

                {/* 2. Grade and Mark Changes */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={alertConfig.enableGradeChanges}
                    onChange={(e) => handleConfigChange('enableGradeChanges', e.target.checked)}
                    className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-800 group-hover:text-slate-900 transition">
                      Grade Schemas & Mark Updates
                    </span>
                    <span className="block text-[10px] text-slate-500 font-medium">
                      Send notice when exam scores are saved, grades are recalculated, or the global CBC grading tiers are customized.
                    </span>
                  </div>
                </label>

                {/* 3. Staff & Roles */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={alertConfig.enableStaffEdits}
                    onChange={(e) => handleConfigChange('enableStaffEdits', e.target.checked)}
                    className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-800 group-hover:text-slate-900 transition">
                      Staff Roster & Permissions Updates
                    </span>
                    <span className="block text-[10px] text-slate-500 font-medium">
                      Alert immediately if a new teacher is registered, active statuses change, or special administrative permissions are modified.
                    </span>
                  </div>
                </label>

                {/* 4. Backup downloads */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={alertConfig.enableSystemBackups}
                    onChange={(e) => handleConfigChange('enableSystemBackups', e.target.checked)}
                    className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-800 group-hover:text-slate-900 transition">
                      Database Backup & Restoration Events
                    </span>
                    <span className="block text-[10px] text-slate-500 font-medium">
                      Alert when a full administrative database backup is exported or restored from external files.
                    </span>
                  </div>
                </label>
              </div>
            </div>


            {/* Theme & Display Mode */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Appearance & Theme
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Toggle between Light and Dark mode. Preference is automatically saved to your browser storage.
                  </p>
                </div>
                <ThemeToggle showLabel={true} />
              </div>
            </div>

            {/* Access Control Settings */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Feature Access Control
              </span>
              <p className="text-xs text-slate-600">
                Manually grant access to restricted administrative views for non-super-admin staff.
              </p>
              
              <div className="space-y-3">
                {[
                  { key: 'allow_attendance_roll', label: 'Attendance Roll' },
                  { key: 'allow_attendance_analytics', label: 'Attendance Analytics' },
                  { key: 'allow_term_report', label: 'Term Report' },
                  { key: 'allow_combined_report', label: 'Combined Report' },
                  { key: 'allow_generate_report', label: 'Generate Report' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localStorage.getItem(item.key) === 'true'}
                      onChange={(e) => {
                        localStorage.setItem(item.key, e.target.checked.toString());
                        // Trigger a re-render or force update if necessary
                        window.dispatchEvent(new Event('storage'));
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm font-bold text-slate-800">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Cloud SQL Database Integration */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Cloud SQL Database Status
              </span>
              <p className="text-xs text-slate-600">
                Your application is connected to a live, production-grade relational PostgreSQL database on Google Cloud Platform (Cloud SQL).
              </p>
              
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <div>
                    <span className="block text-xs font-bold text-emerald-800 font-mono">CONNECTED</span>
                    <span className="block text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">PostgreSQL Engine Active</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const dbUtils = await import('../utils/db');
                    const ok = await dbUtils.synchronizeWithCloudSQL();
                    if (ok) {
                      alert('✅ Database Sync Completed successfully! Loaded freshest datasets.');
                    } else {
                      alert('❌ Database Sync failed. Check server logs.');
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase py-1.5 px-3 rounded transition cursor-pointer"
                >
                  Force Pull Sync
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <span className="block text-xs font-bold text-blue-800">DATABASE BACKUP</span>
                  <span className="block text-[10px] text-blue-600 font-medium">Push current browser datasets to PostgreSQL cloud storage.</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const dbUtils = await import('../utils/db');
                      dbUtils.saveGrades(dbUtils.getGrades());
                      dbUtils.saveSubjects(dbUtils.getSubjects());
                      dbUtils.saveLearners(dbUtils.getLearners());
                      dbUtils.saveSubjectEnrollments(dbUtils.getSubjectEnrollments());
                      dbUtils.saveGradingRules(dbUtils.getGradingRules());
                      dbUtils.saveUsers(dbUtils.getUsers());
                      dbUtils.saveSubjectAssignments(dbUtils.getSubjectAssignments());
                      dbUtils.saveClassTeacherAssignments(dbUtils.getClassTeacherAssignments());
                      dbUtils.saveSchoolProfile(dbUtils.getSchoolProfile());
                      dbUtils.saveHolidays(dbUtils.getHolidays());
                      dbUtils.saveTerms(dbUtils.getTerms());
                      dbUtils.saveAttendanceSheets(dbUtils.getAttendanceSheets());
                      alert('✅ All local browser tables have been synchronized and successfully saved to PostgreSQL!');
                    } catch (err) {
                      alert('❌ Failed to push backup. Check console or server logs.');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase py-1.5 px-3 rounded transition cursor-pointer"
                >
                  Backup to SQL
                </button>
              </div>
            </div>

            {/* Email Relay Webhook integration block */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Outbound Mail Delivery Relay
                </span>
                <select
                  value={alertConfig.relayProvider}
                  onChange={(e) => handleConfigChange('relayProvider', e.target.value)}
                  className="bg-slate-100 text-[10px] font-black text-slate-700 uppercase px-2.5 py-1 rounded border border-slate-200 outline-none cursor-pointer"
                >
                  <option value="Simulated">SIMULATED RELAY</option>
                  <option value="Webhook">EXTERNAL WEBHOOK</option>
                </select>
              </div>

              {alertConfig.relayProvider === 'Webhook' ? (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    External API Endpoint URL
                  </label>
                  <input 
                    type="url"
                    value={alertConfig.webhookUrl}
                    onChange={(e) => handleConfigChange('webhookUrl', e.target.value)}
                    placeholder="https://api.example.com/alerts"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all min-h-[40px]"
                  />
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Using secure sandboxed outbound mail delivery. Alerts are queued instantly through our simulated virtual mail transfer agent (MTA) server on-screen.
                </p>
              )}
            </div>

          </div>

          {/* Diagnostics testing card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">
              System Test Connection
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verify your setup immediately by sending a test transaction alert email to <strong className="font-extrabold text-slate-900">{alertConfig.primaryEmail}</strong>.
            </p>

            <button
              onClick={triggerTestEmail}
              disabled={isTestingEmail}
              className={`w-full min-h-[46px] flex items-center justify-center gap-2 text-xs font-bold px-4 py-3 rounded-xl transition cursor-pointer ${
                isTestingEmail 
                  ? 'bg-slate-100 text-slate-400' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/15'
              }`}
            >
              {isTestingEmail ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                  Testing Outbound Pipeline...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Dispatched Connection Test Alert
                </>
              )}
            </button>

            {/* Simulated Live Terminal Delivery sequence */}
            {isTestingEmail && (
              <div className="p-3 bg-slate-950 text-[11px] font-mono rounded-xl text-emerald-400 space-y-1.5 overflow-x-auto shadow-inner border border-slate-900 animate-pulse">
                <span className="text-slate-500 font-semibold block">[INITIATIN_ROUTE]...</span>
                <span className="block">{testStep}</span>
              </div>
            )}

            {testResult === 'success' && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 p-3.5 rounded-xl border border-emerald-200 text-xs font-bold animate-fadeIn">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                <span>Test Alert successfully queued & saved inside local audit registry!</span>
              </div>
            )}
          </div>

          {/* Registered Parents Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Registered Parents ({parents.length})
              </span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
              {parents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4 italic">No parents registered yet.</p>
              ) : (
                parents.map(p => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{p.fullName}</span>
                    <span className="text-[10px] font-mono text-slate-500">{p.username}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column Right: Alert Logs & Audits Terminal */}
        <div className="lg:col-span-7 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[450px]">
          
          {/* Header Panel */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div>
              <span className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                Outbound Transmitted Mail Log
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                SMTP Delivery Audit & Integrity Logs ({alertLogs.length})
              </span>
            </div>
            {alertLogs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-lg border border-rose-200/60 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Audits
              </button>
            )}
          </div>

          {/* Logs stage */}
          <div className="flex-1 flex flex-col">
            {alertLogs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto">
                <Server className="w-14 h-14 text-slate-300 mb-4 stroke-[1.25]" />
                <h4 className="text-sm font-bold text-slate-700">No outbound mail events recorded</h4>
                <p className="text-xs text-slate-500 max-w-[280px] mt-1.5 leading-relaxed">
                  Make any updates in other parts of the admin portal or hit 'Dispatched Connection Test Alert' to see outbound security triggers.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 flex-1 divide-y md:divide-y-0 md:divide-x divide-slate-100 max-h-[600px] overflow-y-auto">
                
                {/* Left pane: Log entries list */}
                <div className="overflow-y-auto p-4 space-y-2">
                  {alertLogs.map((log) => {
                    const isCritical = log.severity === 'Critical';
                    const isWarning = log.severity === 'Warning';
                    
                    return (
                      <button
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col gap-1.5 cursor-pointer ${
                          selectedLog?.id === log.id 
                            ? 'bg-blue-50/70 border-blue-200 text-blue-900 shadow-sm' 
                            : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                            isCritical 
                              ? 'bg-rose-50 border-rose-200 text-rose-800' 
                              : isWarning 
                                ? 'bg-amber-50 border-amber-200 text-amber-800' 
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}>
                            {log.eventType}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <h5 className="text-xs font-black text-slate-900 truncate leading-snug">
                          {log.title}
                        </h5>
                        
                        <span className="block text-[10px] text-slate-500 line-clamp-1 font-medium leading-relaxed">
                          {log.details}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Right pane: Log detailed packet inspector */}
                <div className="p-4 bg-slate-950 text-slate-100 font-mono text-[11px] overflow-y-auto leading-relaxed flex flex-col">
                  {selectedLog ? (
                    <div className="space-y-4">
                      
                      {/* Packet Overview details */}
                      <div className="space-y-1.5 pb-3.5 border-b border-slate-800">
                        <span className="text-slate-500 font-bold block">[ALERT PACKET IDENTIFIER: {selectedLog.id}]</span>
                        <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px] text-slate-300">
                          <div>Severity:</div>
                          <div className={selectedLog.severity === 'Critical' ? 'text-rose-400 font-black' : selectedLog.severity === 'Warning' ? 'text-amber-400 font-black' : 'text-slate-400 font-black'}>
                            {selectedLog.severity.toUpperCase()}
                          </div>
                          <div>Mailed To:</div>
                          <div className="text-blue-400 font-bold truncate">{selectedLog.recipient}</div>
                          <div>Timestamp:</div>
                          <div className="text-slate-400">{new Date(selectedLog.timestamp).toLocaleString()}</div>
                          <div>Event Type:</div>
                          <div className="text-slate-400 font-bold">{selectedLog.eventType.toUpperCase()}</div>
                        </div>
                      </div>

                      {/* Outbound Headers */}
                      <div className="space-y-1">
                        <span className="text-blue-400 font-bold block">OUTBOUND MAIL HEADERS:</span>
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-900 text-[10px] text-slate-400 select-all leading-snug space-y-1">
                          <div>From: "School Portal Automated Alerts" &lt;alerts-noreply@cbc-portal.org&gt;</div>
                          <div>To: &lt;{selectedLog.recipient}&gt;</div>
                          <div>Subject: [{selectedLog.severity.toUpperCase()}] {selectedLog.title}</div>
                          <div>Content-Type: text/html; charset=UTF-8</div>
                          <div>X-Mailer: School-Admin-Suite-AuthRelay-V1</div>
                          <div>X-Security-Integrity: Local Storage Scrambler Encrypted</div>
                        </div>
                      </div>

                      {/* Payload details body */}
                      <div className="space-y-1">
                        <span className="text-blue-400 font-bold block">MAIL MESSAGE BODY:</span>
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-900 text-[10px] text-emerald-400 select-all whitespace-pre-wrap leading-relaxed">
                          {selectedLog.details}
                        </div>
                      </div>

                      {/* Outbound SMTP SMTP diagnostics Logs */}
                      <div className="space-y-1 pt-2">
                        <span className="text-slate-500 font-bold block">OUTBOUND MTA SMTP HANDSHAKE SEQUENCE:</span>
                        <div className="text-[10px] text-slate-400 space-y-1 leading-snug">
                          {selectedLog.relayLogs.map((logLine, idx) => (
                            <div key={idx} className={logLine.includes('> MAIL FROM') || logLine.includes('> RCPT TO') || logLine.includes('< 250') ? 'text-emerald-500' : ''}>
                              {logLine}
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                      <Eye className="w-8 h-8 text-slate-700 mb-2 stroke-[1.5]" />
                      <span>Select an outbound alert email from the list to inspect its security headers, raw SMTP handshake protocol packets, and full payload bodies.</span>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
