import React, { useState, useEffect, useMemo } from 'react';
import { getUsers, saveUsers, UserAccount, getSchoolProfile, secureGet } from '../utils/db';
import { canDelete } from '../utils/permissions';
import { confirmAction } from './ConfirmDialog';
import { useAccessControl } from '../hooks/useAccessControl';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Plus, 
  Trash2, 
  Search, 
  User, 
  Users,
  Shield, 
  Check, 
  X, 
  ArrowLeft, 
  ShieldAlert, 
  Edit2, 
  Sparkles,
  Share2,
  Copy,
  ExternalLink,
  Info,
  KeyRound,
  Send,
  Lock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  PieChart as PieChartIcon
} from 'lucide-react';

const PERMISSIONS = [
  { id: 'perm_view_all', label: '👁️ View all staff/student data' },
  { id: 'perm_manage_admins', label: '🛡️ Create/Edit Admins' },
  { id: 'perm_manage_staff', label: '👥 Add/Edit Teachers & Staff' },
  { id: 'perm_assign_roles', label: '🏷️ Assign Admin roles' },
  { id: 'perm_del_staff', label: '🗑️ Delete staff permanently' },
  { id: 'perm_cannot_delete', label: '🚫 Cannot delete anything in the software' },
  { id: 'perm_edit_closed', label: '📅 Edit closed terms/exams' },
  { id: 'perm_all_marks', label: '📝 Enter marks for ALL subjects' },
  { id: 'perm_own_marks', label: '✅ Enter marks ONLY for assigned subjects' },
  { id: 'perm_view_others', label: '🔍 View other teachers’ marks/data' },
  { id: 'perm_system_settings', label: '⚙️ Access system settings' }
];

export default function ManageStaff() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Invite Modal & RBAC Guide State
  const [inviteUserModal, setInviteUserModal] = useState<UserAccount | null>(null);
  const [copiedInviteText, setCopiedInviteText] = useState<boolean>(false);
  const [showRbacGuide, setShowRbacGuide] = useState<boolean>(false);

  // Bulk Selection & Permission Update State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState<boolean>(false);
  const [bulkTargetPerm, setBulkTargetPerm] = useState<string>('perm_cannot_delete');
  const [bulkAction, setBulkAction] = useState<'add' | 'remove'>('add');

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleToggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleApplyBulkPermissions = async () => {
    if (selectedUserIds.length === 0) return;
    const nextUsers = users.map(u => {
      if (selectedUserIds.includes(u.id)) {
        let perms = u.permissions || [];
        if (bulkAction === 'add') {
          if (!perms.includes(bulkTargetPerm)) perms = [...perms, bulkTargetPerm];
        } else {
          perms = perms.filter(p => p !== bulkTargetPerm);
        }
        return { ...u, permissions: perms };
      }
      return u;
    });
    setUsers(nextUsers);
    await saveUsers(nextUsers);
    setBulkModalOpen(false);
    setSelectedUserIds([]);
    alert(`✅ Successfully updated permissions for ${selectedUserIds.length} staff member(s).`);
  };

  const toggleCannotDelete = async (userId: string) => {
    const nextUsers = users.map(u => {
      if (u.id === userId) {
        let perms = u.permissions || [];
        if (perms.includes('perm_cannot_delete')) {
          perms = perms.filter(p => p !== 'perm_cannot_delete');
        } else {
          perms = [...perms, 'perm_cannot_delete'];
        }
        return { ...u, permissions: perms };
      }
      return u;
    });
    setUsers(nextUsers);
    await saveUsers(nextUsers);
  };

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-eminjib435kcerpe6jkt5k-121258194951.europe-west2.run.app';

  const getInviteMessage = (u: UserAccount) => {
    const profile = getSchoolProfile();
    const schoolName = profile.name || "St Augustine School";
    return `🏫 Welcome to ${schoolName} System!

Here are your official credentials to access the platform:
🔗 Portal URL: ${appUrl}
👤 Username: ${u.username}
🔑 Password PIN: ${u.password || '1234'}
🛡️ Assigned Role: ${u.role}

📌 Steps to log in:
1. Click the link above to open the platform in your browser.
2. Enter your username and password PIN to log in.
3. Keep your credentials secure. If you face any access restrictions, please contact the Super Admin.`;
  };

  const handleCopyInvite = (u: UserAccount) => {
    const text = getInviteMessage(u);
    navigator.clipboard.writeText(text);
    setCopiedInviteText(true);
    setTimeout(() => setCopiedInviteText(false), 2500);
  };

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Form Fields State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [staffNo, setStaffNo] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [empDate, setEmpDate] = useState('');
  const [designatedRole, setDesignatedRole] = useState('teacher');
  const [department, setDepartment] = useState('');
  const [systemRole, setSystemRole] = useState('teacher');
  const [adminOverride, setAdminOverride] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [avatarUrl, setAvatarUrl] = useState('');

  const { checkAccess, showAccessDenied, setShowAccessDenied } = useAccessControl(selectedPermissions);

  // Form Errors State
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const getRolePermissions = (role: string) => {
    try {
      const saved = secureGet('school_role_permissions_matrix_v1');
      if (!saved) return [];
      const matrix = JSON.parse(saved);
      const perms = matrix[role] || {};
      // Map the object-based permissions (from Settings.tsx) 
      // to the array of strings used in ManageStaff
      return Object.entries(perms)
        .filter(([_, enabled]) => enabled)
        .map(([key, _]) => `perm_${key}`);
    } catch {
      return [];
    }
  };

  const permissionConflicts = React.useMemo(() => {
    const conflicts: string[] = [];
    if (selectedPermissions.includes('perm_del_staff') && selectedPermissions.includes('perm_cannot_delete')) {
      conflicts.push('Conflict: "Delete staff" and "Cannot delete anything" are mutually exclusive.');
    }
    if (selectedPermissions.includes('perm_all_marks') && selectedPermissions.includes('perm_own_marks')) {
      conflicts.push('Conflict: "Enter marks for ALL subjects" and "Enter marks ONLY for assigned subjects" conflict.');
    }
    return conflicts;
  }, [selectedPermissions]);

  useEffect(() => {
    const refreshUsers = () => {
      setUsers(getUsers());
    };
    refreshUsers();
    window.addEventListener('storage', refreshUsers);
    window.addEventListener('db_updated', refreshUsers);
    return () => {
      window.removeEventListener('storage', refreshUsers);
      window.removeEventListener('db_updated', refreshUsers);
    };
  }, []);

  useEffect(() => {
    const handleBack = (e: any) => {
      if (inviteUserModal || bulkModalOpen || showRbacGuide) {
        setInviteUserModal(null);
        setBulkModalOpen(false);
        setShowRbacGuide(false);
        if (e.detail) e.detail.handled = true;
        return;
      }
      if (view !== 'list') {
        setView('list');
        if (e.detail) e.detail.handled = true;
        return;
      }
    };
    window.addEventListener('app_request_go_back', handleBack);
    return () => window.removeEventListener('app_request_go_back', handleBack);
  }, [view, inviteUserModal, bulkModalOpen, showRbacGuide]);

  // Sync permissions when system role changes (if no override)
  useEffect(() => {
    if (!adminOverride) {
      if (systemRole === 'super_admin') {
        setSelectedPermissions(PERMISSIONS.map(p => p.id));
      } else if (systemRole === 'admin') {
        setSelectedPermissions([
          'perm_view_all',
          'perm_manage_staff',
          'perm_all_marks',
          'perm_view_others',
          'perm_system_settings'
        ]);
      } else {
        // Default teacher
        setSelectedPermissions([
          'perm_own_marks',
          'perm_view_others'
        ]);
      }
    }
  }, [systemRole, adminOverride]);

  const handleOpenAddForm = () => {
    setEditingUserId(null);
    setUsername('');
    setFullName('');
    setStaffNo('');
    setNationalId('');
    setPhone('');
    setEmail('');
    setEmpDate('');
    setDesignatedRole('teacher');
    setDepartment('');
    setSystemRole('teacher');
    setAdminOverride(false);
    setPassword('');
    setStatus('Active');
    setAvatarUrl('');
    setErrors({});
    setView('add');
  };

  const handleOpenEditForm = (user: UserAccount) => {
    setEditingUserId(user.id);
    setUsername(user.username);
    setFullName(user.fullName);
    setStaffNo(user.staffNo || '');
    setNationalId(user.nationalId || '');
    setPhone(user.phone || '');
    setEmail(user.email || '');
    setEmpDate(user.empDate || '');
    setDesignatedRole(user.designatedRole || 'teacher');
    setDepartment(user.department || '');
    setAvatarUrl(user.avatarUrl || '');
    
    // Map system role string safely
    const sysRole = user.systemRole || (user.role === 'Super Admin' ? 'super_admin' : user.role === 'Admin' ? 'admin' : 'teacher');
    setSystemRole(sysRole);
    setAdminOverride(user.adminOverride || false);
    setSelectedPermissions(user.permissions || []);
    setPassword(user.password || '');
    setStatus(user.status);
    setErrors({});
    setView('edit');
  };

  useEffect(() => {
    if (editingUserId) {
        const user = users.find(u => u.id === editingUserId);
        if (user) {
            const rolePerms = getRolePermissions(user.role);
            setSelectedPermissions(prev => Array.from(new Set([...prev, ...rolePerms])));
        }
    }
  }, [editingUserId]);

  const togglePermission = (permId: string) => {
    if (!adminOverride) return; // Locked unless override is active
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Username: Alphanumeric and standard separators
    const usernameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!username.trim()) {
      newErrors.username = '🔑 Login Identifier (Username) is required.';
    } else if (!usernameRegex.test(username.trim())) {
      newErrors.username = 'Username can only contain letters, numbers, dots, dashes, or underscores.';
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    }

    // Check unique username excluding currently edited user
    const exists = users.some(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.id !== editingUserId);
    if (exists) {
      newErrors.username = '⚠️ This username is already registered to another staff account.';
    }

    // Full Name
    if (!fullName.trim()) {
      newErrors.fullName = '👤 Full name is required.';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters.';
    }

    // Phone Number (Optional but validated if provided)
    if (phone.trim()) {
      const phoneRegex = /^(07\d{8}|\+254\d{9})$/;
      if (!phoneRegex.test(phone.trim().replace(/\s+/g, ''))) {
        newErrors.phone = 'Phone number must be in format 07xxxxxxxx or +254xxxxxxxxx.';
      }
    }

    // Email (Optional but validated if provided)
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please provide a valid email address.';
      }
    }

    // Date of Employment
    if (empDate) {
      const chosenDate = new Date(empDate);
      const today = new Date();
      if (chosenDate > today) {
        newErrors.empDate = 'Date of employment cannot be in the future.';
      }
    }

    // Password
    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (!/^\d{4}$/.test(password)) {
      newErrors.password = 'Password must be a 4-digit numeric PIN (e.g. 1234).';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    // Map system role to DB role representation
    let dbRole: UserAccount['role'] = 'Subject Teacher';
    if (systemRole === 'super_admin') {
      dbRole = 'Super Admin';
    } else if (systemRole === 'admin') {
      dbRole = 'Admin';
    } else {
      // Mapping from designated role radios
      if (designatedRole === 'headteacher') dbRole = 'Headteacher';
      else if (designatedRole === 'deputy_headteacher') dbRole = 'Deputy Headteacher';
      else if (designatedRole === 'senior_teacher') dbRole = 'Senior Teacher';
      else if (designatedRole === 'class_teacher') dbRole = 'Class Teacher';
    }

    const rawUsername = username.trim() || staffNo.trim() || email.trim() || phone.trim() || fullName.trim().replace(/\s+/g, '_');
    const cleanUsername = rawUsername.toLowerCase().replace(/[^\x20-\x7E]/g, '');
    const finalStaffNo = staffNo.trim() || `ST-${Math.floor(100 + Math.random() * 900)}`;

    const savedUser: UserAccount = {
      id: editingUserId || 'u_' + Date.now(),
      username: cleanUsername,
      fullName: fullName.trim(),
      role: dbRole,
      created: editingUserId ? (users.find(u => u.id === editingUserId)?.created || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
      status: status,
      password: password,
      staffNo: finalStaffNo,
      nationalId: nationalId.trim(),
      phone: phone.trim(),
      email: email.trim(),
      empDate: empDate,
      designatedRole: designatedRole,
      department: department,
      systemRole: systemRole as 'super_admin' | 'admin' | 'teacher',
      adminOverride: adminOverride,
      permissions: selectedPermissions,
      avatarUrl: avatarUrl
    };

    let nextUsers: UserAccount[];
    if (editingUserId) {
      nextUsers = users.map(u => u.id === editingUserId ? savedUser : u);
    } else {
      nextUsers = [...users, savedUser];
    }

    setUsers(nextUsers);
    await saveUsers(nextUsers);
    setView('list');
    setInviteUserModal(savedUser);
    setCopiedInviteText(false);
    setToast({
      message: editingUserId
        ? `Staff member "${savedUser.fullName}" updated successfully!`
        : `Staff member "${savedUser.fullName}" successfully added to staff directory!`,
      type: 'success'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteUser = (id: string, name: string) => {
    checkAccess('perm_del_staff', async () => {
      if (name === 'admin' || name === 'otienobyron805@gmail.com') {
        confirmAction({
          title: 'Protected Account',
          message: 'Your Super Admin account is the owner account and cannot be deleted.',
          confirmText: 'OK',
          variant: 'warning',
          onConfirm: () => {}
        });
        return;
      }
      const target = users.find(u => u.id === id);
      if (target?.role === 'Super Admin') {
        confirmAction({
          title: 'Protected Account',
          message: 'Super Admin accounts cannot be deleted.',
          confirmText: 'OK',
          variant: 'warning',
          onConfirm: () => {}
        });
        return;
      }

      confirmAction({
        title: 'Delete Staff Account',
        message: `Are you sure you want to permanently delete user "${name}"? This will revoke their access to the system.`,
        confirmText: 'Delete Account',
        variant: 'danger',
        onConfirm: async () => {
          const nextUsers = users.filter(u => u.id !== id);
          setUsers(nextUsers);
          await saveUsers(nextUsers);
          setToast({ message: `Staff member "${name}" deleted.`, type: 'success' });
        }
      });
    });
  };

  const toggleUserStatus = async (id: string, name: string) => {
    if (name === 'admin' || name === 'otienobyron805@gmail.com') {
      alert('⚠️ Cannot deactivate the primary Super Admin account.');
      return;
    }
    const target = users.find(u => u.id === id);
    if (target?.role === 'Super Admin') {
      alert('⚠️ Super Admin accounts cannot be deactivated.');
      return;
    }

    const nextUsers = users.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' as 'Active' | 'Inactive' };
      }
      return u;
    });
    setUsers(nextUsers);
    await saveUsers(nextUsers);
  };

  const roleOrder: Record<string, number> = {
    'Super Admin': 1,
    'Admin': 2,
    'Headteacher': 3,
    'Deputy Headteacher': 4,
    'Senior Teacher': 5,
    'Class Teacher': 6,
    'Subject Teacher': 7,
    'Parent': 8
  };

  const filteredUsers = users
    .filter(u => 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.staffNo && u.staffNo.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const orderA = roleOrder[a.role] || 99;
      const orderB = roleOrder[b.role] || 99;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.fullName.localeCompare(b.fullName);
    });

  const staffMembers = useMemo(() => {
    return users.filter(u => u.role !== 'Parent');
  }, [users]);

  const activeStaffCount = useMemo(() => {
    return staffMembers.filter(u => u.status === 'Active').length;
  }, [staffMembers]);

  const inactiveStaffCount = useMemo(() => {
    return staffMembers.filter(u => u.status === 'Inactive').length;
  }, [staffMembers]);

  const roleDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};

    staffMembers.forEach(u => {
      let roleName = u.role || 'Support Staff';
      if (roleName.toLowerCase().includes('admin') || roleName.toLowerCase().includes('headteacher')) {
        roleName = 'Admin & Leadership';
      } else if (roleName.toLowerCase().includes('teacher')) {
        roleName = 'Teachers';
      } else if (
        roleName.toLowerCase().includes('support') || 
        roleName.toLowerCase().includes('accountant') || 
        roleName.toLowerCase().includes('clerk') || 
        roleName.toLowerCase().includes('bursar') || 
        roleName.toLowerCase().includes('secretary') ||
        roleName.toLowerCase().includes('staff')
      ) {
        roleName = 'Support & Operations';
      } else {
        roleName = u.role;
      }
      counts[roleName] = (counts[roleName] || 0) + 1;
    });

    const ROLE_COLORS: Record<string, string> = {
      'Admin & Leadership': '#2563eb',
      'Teachers': '#10b981',
      'Support & Operations': '#f59e0b',
      'Super Admin': '#1d4ed8',
      'Admin': '#3b82f6',
      'Class Teacher': '#059669',
      'Subject Teacher': '#34d399',
      'Support Staff': '#f59e0b',
    };

    const PALETTE = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

    return Object.entries(counts).map(([name, value], idx) => ({
      name,
      value,
      color: ROLE_COLORS[name] || PALETTE[idx % PALETTE.length]
    }));
  }, [staffMembers]);

  return (
    <div className="space-y-6 relative">
      
      {/* SUCCESS / FEEDBACK TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-md w-full sm:w-auto animate-bounce-in flex items-center gap-3 bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl border border-slate-700/60 transition-all">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 text-sm font-semibold pr-2">
            {toast.message}
          </div>
          <button
            onClick={() => setToast(null)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER SECTION BAR */}
      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-600">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span>Active Module: Manage Staff</span>
        </div>
        <div className="text-slate-400 text-sm">🏫</div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
        
        {/* VIEW: STAFF LIST & SEARCH TABLE */}
        {view === 'list' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff Account Management</h1>
                <p className="text-xs text-slate-500">Add, edit, deactivate or remove authorized staff and admin accounts.</p>
              </div>
              <button 
                onClick={handleOpenAddForm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition cursor-pointer min-h-[44px] shadow-sm shadow-blue-500/10"
              >
                <Plus className="w-4 h-4" /> Add Staff Member
              </button>
            </div>

            {/* STAFF ROLE DISTRIBUTION DONUT CHART & ANALYTICS HEADER */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-xl border border-slate-700/60">
              
              {/* Left: Summary Metrics */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4 border-b lg:border-b-0 lg:border-r border-slate-700/70 pb-5 lg:pb-0 lg:pr-6">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                    <PieChartIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Staff Analytics</span>
                  </div>
                  <h2 className="text-lg font-black text-white tracking-tight">Role Distribution</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Live breakdown of staff account designations, access levels, and active personnel across departments.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</span>
                    <div className="text-xl font-black text-white">{staffMembers.length}</div>
                    <span className="text-[10px] text-blue-400 font-semibold">Registered Accounts</span>
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Status</span>
                    <div className="text-xl font-black text-emerald-400">{activeStaffCount}</div>
                    <span className="text-[10px] text-emerald-300 font-semibold">
                      {staffMembers.length > 0 ? `${Math.round((activeStaffCount / staffMembers.length) * 100)}% Active` : '0%'}
                    </span>
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inactive</span>
                    <div className="text-xl font-black text-amber-400">{inactiveStaffCount}</div>
                    <span className="text-[10px] text-amber-300 font-semibold">Deactivated Staff</span>
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role Groups</span>
                    <div className="text-xl font-black text-indigo-400">{roleDistributionData.length}</div>
                    <span className="text-[10px] text-indigo-300 font-semibold">Designations</span>
                  </div>
                </div>
              </div>

              {/* Right: Recharts Donut Chart */}
              <div className="lg:col-span-7 flex flex-col sm:flex-row items-center justify-center gap-6 min-h-[200px]">
                {roleDistributionData.length > 0 ? (
                  <>
                    {/* Donut Canvas */}
                    <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={roleDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="#0f172a"
                            strokeWidth={2}
                          >
                            {roleDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }: any) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const total = staffMembers.length || 1;
                                const pct = Math.round((data.value / total) * 100);
                                return (
                                  <div className="bg-slate-950 text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-2xl border border-slate-700">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                      <span className="font-bold">{data.name}:</span>
                                    </div>
                                    <div className="text-blue-400 font-black mt-0.5 text-sm">
                                      {data.value} member{data.value > 1 ? 's' : ''} ({pct}%)
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Donut Center text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <span className="text-2xl font-black text-white leading-none">{staffMembers.length}</span>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mt-0.5">Staff</span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="flex-1 space-y-2 w-full">
                      <div className="text-xs font-bold text-slate-300 border-b border-slate-700/80 pb-1.5 flex justify-between items-center">
                        <span>Role Breakdown</span>
                        <span className="text-[11px] text-slate-400 font-normal">{staffMembers.length} Total</span>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {roleDistributionData.map((item) => {
                          const total = staffMembers.length || 1;
                          const percentage = Math.round((item.value / total) * 100);
                          return (
                            <div key={item.name} className="flex items-center justify-between text-xs bg-slate-800/50 p-2 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-all">
                              <div className="flex items-center gap-2 truncate">
                                <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                                <span className="font-semibold text-slate-200 truncate">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className="text-slate-300 font-bold">{item.value}</span>
                                <span className="font-black text-[11px] px-2 py-0.5 rounded-md bg-slate-700/70 text-blue-300">
                                  {percentage}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No staff records found.
                  </div>
                )}
              </div>

            </div>

            {/* RBAC EXPLANATION BANNER */}
            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-xs space-y-2">
              <div 
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setShowRbacGuide(!showRbacGuide)}
              >
                <div className="flex items-center gap-2 text-blue-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Role-Based Access Control (RBAC) & Invite Guide</span>
                </div>
                <button type="button" className="text-blue-600 font-extrabold flex items-center gap-1 text-[11px] hover:underline">
                  {showRbacGuide ? 'Hide Guide' : 'Why colleagues face access restrictions?'}
                  {showRbacGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showRbacGuide && (
                <div className="pt-2 text-slate-600 space-y-2 border-t border-blue-100/80">
                  <p>
                    Colleagues accessing the app link without a registered account will be restricted. Super Admins can add accounts and assign exact roles:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] font-medium text-slate-700">
                    <li><strong className="text-slate-900">Super Admin / Admin:</strong> Full access to manage staff, set exams, view school analytics, and system settings.</li>
                    <li><strong className="text-slate-900">Headteacher & Senior Teachers:</strong> Academic oversight and whole-school register access.</li>
                    <li><strong className="text-slate-900">Subject / Class Teachers:</strong> Access restricted to assigned subjects/classes (or full school access if Teacher on Duty is active).</li>
                    <li><strong className="text-slate-900">Inactive Accounts:</strong> Setting account status to <em>Inactive</em> instantly terminates sessions.</li>
                  </ul>
                  <p className="text-[11px] text-blue-800 font-semibold pt-1">
                    💡 Click <strong>"Share Credentials"</strong> on any user row below to generate a shareable login message for WhatsApp or Email!
                  </p>
                </div>
              )}
            </div>

            {/* SEARCH & BULK ACTION BAR */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400" />
                </span>
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search staff accounts by name, username, or role..." 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white min-h-[48px]"
                />
              </div>

              {selectedUserIds.length > 0 && (
                <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl flex items-center justify-between sm:justify-start gap-4 text-xs font-bold shadow-md animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="bg-white text-blue-700 w-6 h-6 rounded-full font-black flex items-center justify-center text-xs">{selectedUserIds.length}</span>
                    <span>Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBulkModalOpen(true)}
                      className="bg-white text-blue-700 hover:bg-blue-50 px-3.5 py-2 rounded-xl font-black transition shadow-xs cursor-pointer"
                    >
                      ⚡ Bulk Permission Update
                    </button>
                    <button
                      onClick={() => setSelectedUserIds([])}
                      className="text-blue-100 hover:text-white px-2 py-1 text-xs cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TABLE */}
            <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="p-4 pl-6 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-4">Username / ID</th>
                      <th className="p-4">Full Name & Restrictions</th>
                      <th className="p-4">Assigned Role</th>
                      <th className="p-4">Staff No.</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400 font-medium">
                          No staff accounts registered. Click "Add Staff Member" to register one.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className={`hover:bg-slate-50/40 transition ${selectedUserIds.includes(user.id) ? 'bg-blue-50/40' : ''}`}>
                          <td className="p-4 pl-6 text-center">
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(user.id)}
                              onChange={() => handleToggleSelectUser(user.id)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-4">
                            <span className="font-mono bg-slate-100 text-slate-800 px-2 py-1 rounded-md font-bold">
                              {user.username}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-900">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                                {user.avatarUrl ? (
                                  <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{user.fullName}</span>
                                  {user.permissions?.includes('perm_cannot_delete') && (
                                    <span className="text-[9px] font-black px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md border border-rose-200 inline-flex items-center gap-1">
                                      🚫 Cannot Delete
                                    </span>
                                  )}
                                  {user.permissions?.includes('perm_own_marks') && !user.permissions?.includes('perm_all_marks') && (
                                    <span className="text-[9px] font-black px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                                      📝 Assigned Marks Only
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-normal block">{user.email || user.phone || 'No contact specified'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                              user.role === 'Super Admin' ? 'bg-amber-150 text-amber-800 border border-amber-200' :
                              user.role === 'Admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                              'bg-slate-50 text-slate-600'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-medium text-slate-500">
                            {user.staffNo || '—'}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => toggleUserStatus(user.id, user.username)}
                              className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full transition inline-flex items-center gap-1 cursor-pointer ${
                                user.status === 'Active' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}
                            >
                              {user.status === 'Active' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              <span>{user.status}</span>
                            </button>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setInviteUserModal(user);
                                  setCopiedInviteText(false);
                                }}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition cursor-pointer text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                                title="Invite & Share Login Credentials"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Share</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditForm(user)}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                title="Edit staff account"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {canDelete() && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUser(user.id, user.username);
                                  }}
                                  disabled={user.username === 'admin' || user.username === 'otienobyron805@gmail.com' || user.role === 'Super Admin'}
                                  className={`p-2 rounded-lg transition ${
                                    (user.username === 'admin' || user.username === 'otienobyron805@gmail.com' || user.role === 'Super Admin')
                                      ? 'text-slate-200 cursor-not-allowed opacity-40'
                                      : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer active:scale-90'
                                  }`}
                                  title="Delete account"
                                >
                                  <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          
          /* VIEW: ADD OR EDIT FORM CONTAINER */
          <div className="space-y-6">
            
            {/* Form Title Header bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>{view === 'add' ? '👤 Add New Staff Member' : '📝 Edit Staff Account'}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  You create 4‑digit PINs — same password allowed for different users; users change after login
                </p>
              </div>
              <button 
                onClick={() => setView('list')}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to List
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>

              {/* TOP-LEVEL ALERT - FOR RESTRICTION */}
              {(showAccessDenied || selectedPermissions.includes('perm_cannot_delete')) && (
                <div className="fixed top-0 left-0 right-0 p-4 bg-rose-600 text-white text-center font-bold text-xs z-[60] shadow-xl">
                  ⚠️ ACTION BLOCKED: Role-Based Restriction Active. Please contact the administrators.
                </div>
              )}

              {/* RESTRICTION WARNINGS */}
              {selectedPermissions.includes('perm_cannot_delete') && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-rose-900">Restriction Active: Cannot Delete Anything</h4>
                    <p className="text-[11px] text-rose-700 mt-0.5">This staff member is currently restricted from performing any permanent delete actions, as defined by their assigned role group.</p>
                  </div>
                </div>
              )}

              {permissionConflicts.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-amber-900">Permission Conflicts Detected</h4>
                    <ul className="text-[11px] text-amber-700 mt-0.5 list-disc list-inside">
                      {permissionConflicts.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              {/* SECTION: PROFILE PICTURE */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center gap-5">
                <div className="w-20 h-20 rounded-full border-2 border-slate-250 bg-white shadow-xs overflow-hidden flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-8 h-8 text-slate-350" />
                  )}
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Profile Photograph</h4>
                  <p className="text-[11px] text-slate-500">Upload a crisp square headshot (.png, .jpg or .webp) under 500KB.</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <label className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[36px]">
                      📁 Choose Image File
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 500 * 1024) {
                              alert('⚠️ Image is too large. Please select an image under 500KB.');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setAvatarUrl(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }} 
                        className="hidden" 
                      />
                    </label>
                    {avatarUrl && (
                      <button 
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer min-h-[36px]"
                      >
                        🗑️ Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* SECTION: PERSONAL & OFFICIAL DETAILS */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-2">
                  <span>📋 Personal & Official Details</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Login Identifier (Username) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      🔑 Login Identifier (Username) * 
                      <span className="text-[10px] text-slate-400 font-normal ml-1">Letters, numbers, . _ - only</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-slate-400 uppercase select-none">
                        OT
                      </span>
                      <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. kelvin.ndegwa" 
                        disabled={view === 'edit' && (username === 'admin' || username === 'otienobyron805@gmail.com')}
                        className={`w-full pl-9 pr-4 py-3 rounded-xl border text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] ${
                          errors.username ? 'border-rose-500 ring-1 ring-rose-500/25' : 'border-slate-200'
                        }`}
                        required
                      />
                    </div>
                    {errors.username && <span className="block text-[11px] font-semibold text-rose-500">{errors.username}</span>}
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">👤 Full Name *</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Kelvin Ndegwa" 
                      className={`w-full px-4 py-3 rounded-xl border text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] ${
                        errors.fullName ? 'border-rose-500 ring-1 ring-rose-500/25' : 'border-slate-200'
                      }`}
                      required
                    />
                    {errors.fullName && <span className="block text-[11px] font-semibold text-rose-500">{errors.fullName}</span>}
                  </div>

                  {/* Staff Number */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      🆔 Staff Number * 
                      <span className="text-[10px] text-slate-400 font-normal ml-1">Unique alphanumeric</span>
                    </label>
                    <input 
                      type="text" 
                      value={staffNo}
                      onChange={(e) => setStaffNo(e.target.value)}
                      placeholder="e.g. ST-042" 
                      className={`w-full px-4 py-3 rounded-xl border text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] ${
                        errors.staffNo ? 'border-rose-500 ring-1 ring-rose-500/25' : 'border-slate-200'
                      }`}
                      required
                    />
                    {errors.staffNo && <span className="block text-[11px] font-semibold text-rose-500">{errors.staffNo}</span>}
                  </div>

                  {/* TSC / National ID */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      📝 National ID / TSC Number 
                      <span className="text-[10px] text-slate-400 font-normal ml-1">(Optional)</span>
                    </label>
                    <input 
                      type="text" 
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="e.g. TSC-9876543" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      📞 Phone Number 
                      <span className="text-[10px] text-slate-400 font-normal ml-1">(Optional) 07xx xxx xxx or +254...</span>
                    </label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0712345678" 
                      className={`w-full px-4 py-3 rounded-xl border text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] ${
                        errors.phone ? 'border-rose-500 ring-1 ring-rose-500/25' : 'border-slate-200'
                      }`}
                    />
                    {errors.phone && <span className="block text-[11px] font-semibold text-rose-500">{errors.phone}</span>}
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      📧 Email Address 
                      <span className="text-[10px] text-slate-400 font-normal ml-1">(Optional)</span>
                    </label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. teacher@school.com" 
                      className={`w-full px-4 py-3 rounded-xl border text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] ${
                        errors.email ? 'border-rose-500 ring-1 ring-rose-500/25' : 'border-slate-200'
                      }`}
                    />
                    {errors.email && <span className="block text-[11px] font-semibold text-rose-500">{errors.email}</span>}
                  </div>

                  {/* Employment Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      📅 Date of Employment 
                      <span className="text-[10px] text-slate-400 font-normal ml-1">(Optional) Cannot be future</span>
                    </label>
                    <input 
                      type="date" 
                      value={empDate}
                      onChange={(e) => setEmpDate(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] ${
                        errors.empDate ? 'border-rose-500 ring-1 ring-rose-500/25' : 'border-slate-200'
                      }`}
                    />
                    {errors.empDate && <span className="block text-[11px] font-semibold text-rose-500">{errors.empDate}</span>}
                  </div>

                  {/* Department */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      🏢 Department 
                      <span className="text-[10px] text-slate-400 font-normal ml-1">(Optional)</span>
                    </label>
                    <select 
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] cursor-pointer"
                    >
                      <option value="">— Select Department —</option>
                      <option value="Academic">Academic</option>
                      <option value="Administration">Administration</option>
                      <option value="Support">Support</option>
                    </select>
                  </div>
                </div>

                {/* Designated Role radio-toggles */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">🏷️ Designated System Role *</label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { val: 'super_admin', label: '🟣 Super Admin' },
                      { val: 'admin', label: '🔵 Admin' },
                      { val: 'headteacher', label: '🎓 Headteacher' },
                      { val: 'deputy_headteacher', label: '🏛️ Deputy Headteacher' },
                      { val: 'senior_teacher', label: '📚 Senior Teacher' },
                      { val: 'class_teacher', label: '🏫 Class Teacher' },
                      { val: 'teacher', label: '👨‍🏫 Teacher' }
                    ].map((roleOption) => (
                      <label key={roleOption.val} className="flex-1 min-w-[140px] cursor-pointer relative group">
                        <input 
                          type="radio" 
                          name="designated_role" 
                          value={roleOption.val}
                          checked={designatedRole === roleOption.val}
                          onChange={(e) => setDesignatedRole(e.target.value)}
                          className="absolute opacity-0 w-0 h-0"
                        />
                        <div className={`text-center py-3 px-2 text-xs font-bold rounded-xl border-2 transition-all duration-200 ${
                          designatedRole === roleOption.val 
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-black shadow-xs' 
                            : 'border-slate-200 bg-slate-50/50 text-slate-500 group-hover:border-slate-300'
                        }`}>
                          {roleOption.label}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION: SYSTEM ROLE & OVERRIDE */}
              <div className="p-5 rounded-2xl bg-blue-50/50 border-l-4 border-blue-600 border-y border-r border-slate-100 space-y-4">
                <h3 className="text-xs font-black uppercase text-blue-700 tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span>🔐 System Access Level & Permissions</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">System Role *</label>
                    <select 
                      value={systemRole}
                      onChange={(e) => setSystemRole(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] cursor-pointer"
                      required
                    >
                      <option value="super_admin">🟣 Super Admin</option>
                      <option value="admin">🔵 Admin</option>
                      <option value="teacher">🟢 Teacher</option>
                    </select>
                  </div>

                  {/* Manual Override switch banner */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <label className="flex items-center gap-2.5 text-xs font-extrabold text-amber-800 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={adminOverride}
                        onChange={(e) => setAdminOverride(e.target.checked)}
                        className="w-4.5 h-4.5 accent-amber-500 rounded cursor-pointer"
                      />
                      <span>🛡️ Super Admin Manual Override (Unlock All)</span>
                    </label>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  {adminOverride ? '🔓 Manual override is active! You can check or uncheck individual actions below.' : '🔒 Standard restrictions applied based on System Role. Toggle Override to customize.'}
                </p>
              </div>

              {/* SECTION: ALLOWED ACTIONS & RESTRICTIONS */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-2">
                  <span>✅ Allowed Actions & Restrictions</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {PERMISSIONS.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.id);
                    return (
                      <label 
                        key={perm.id} 
                        onClick={() => togglePermission(perm.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition select-none ${
                          adminOverride ? 'cursor-pointer hover:bg-slate-100' : 'cursor-not-allowed opacity-70'
                        } ${
                          isChecked 
                            ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900 font-semibold' 
                            : 'bg-white border-slate-150 text-slate-500'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {}} // handled by click
                          disabled={!adminOverride}
                          className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                        />
                        <span className="text-xs">{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-rose-500 font-medium">
                  🔒 Grayed checkboxes are restricted. Enable Super Admin Override above to customize permissions for this specific account.
                </p>
              </div>

              {/* SECTION: LOGIN SECURITY */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-blue-600 tracking-wider">
                  <span>🔑 Login Security</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Password PIN */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Password * 
                      <span className="text-[10px] text-slate-400 font-normal ml-1">Enter 4‑digit PIN</span>
                    </label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      maxLength={4}
                      inputMode="numeric"
                      placeholder="e.g. 1234" 
                      className={`w-full px-4 py-3 rounded-xl border text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] ${
                        errors.password ? 'border-rose-500 ring-1 ring-rose-500/25' : 'border-slate-200'
                      }`}
                      required
                    />
                    {errors.password && <span className="block text-[11px] font-semibold text-rose-500">{errors.password}</span>}
                  </div>

                  {/* Account Status */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Account Status</label>
                    <select 
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] cursor-pointer"
                    >
                      <option value="Active">✅ Active</option>
                      <option value="Inactive">⏸️ Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ACTION ACTIONS BAR */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setView('list')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl text-xs font-black transition cursor-pointer min-h-[44px]"
                >
                  ↩️ Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-xs font-black transition cursor-pointer min-h-[44px] shadow-sm shadow-blue-500/10"
                >
                  💾 Save Staff Member
                </button>
              </div>

            </form>
          </div>
        )}

      </div>

      {/* INVITE & CREDENTIALS MODAL */}
      {inviteUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-bold text-lg border border-white/20">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">Staff Access Credentials</h3>
                  <p className="text-xs text-blue-100/90 font-medium">Share login details with your colleague</p>
                </div>
              </div>
              <button 
                onClick={() => setInviteUserModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* User Identity Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">User Account</span>
                    <h4 className="text-sm font-black text-slate-900">{inviteUserModal.fullName}</h4>
                  </div>
                  <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                    inviteUserModal.role === 'Super Admin' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    inviteUserModal.role === 'Admin' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {inviteUserModal.role}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Username / Email</span>
                    <span className="font-mono font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 inline-block mt-0.5 break-all">
                      {inviteUserModal.username}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Password PIN</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 inline-block mt-0.5">
                      {inviteUserModal.password || '1234'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Message Preview Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Formatted Shareable Invite Message</label>
                <div className="bg-slate-900 text-slate-200 font-mono text-[11px] p-3.5 rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {getInviteMessage(inviteUserModal)}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  onClick={() => handleCopyInvite(inviteUserModal)}
                  className={`w-full py-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                    copiedInviteText 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {copiedInviteText ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedInviteText ? 'Copied to Clipboard!' : 'Copy Invite Message'}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(getInviteMessage(inviteUserModal))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={`mailto:${inviteUserModal.email || ''}?subject=${encodeURIComponent("St Augustine School Portal Access Credentials")}&body=${encodeURIComponent(getInviteMessage(inviteUserModal))}`}
                  className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Email</span>
                </a>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />
                <span>Account permissions are synced live</span>
              </span>
              <button
                onClick={() => setInviteUserModal(null)}
                className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK PERMISSION UPDATE MODAL */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 animate-scale-up">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">Bulk Permission & Restriction Update</h3>
                  <p className="text-xs text-blue-100">Applying changes to {selectedUserIds.length} selected staff member(s)</p>
                </div>
              </div>
              <button 
                onClick={() => setBulkModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Select Action</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBulkAction('add')}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      bulkAction === 'add'
                        ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>➕ Grant / Apply Permission</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkAction('remove')}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      bulkAction === 'remove'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>➖ Revoke / Remove Permission</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Target Permission / Restriction Rule</label>
                <select
                  value={bulkTargetPerm}
                  onChange={(e) => setBulkTargetPerm(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                >
                  {PERMISSIONS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  This will instantly update the permission settings for all {selectedUserIds.length} checked staff accounts.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkPermissions}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer"
                >
                  Confirm & Apply Bulk Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
