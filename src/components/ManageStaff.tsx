import React, { useState, useEffect } from 'react';
import { getUsers, saveUsers, UserAccount, getSchoolProfile } from '../utils/db';
import { canDelete } from '../utils/permissions';
import { useAccessControl } from '../hooks/useAccessControl';
import { 
  Plus, 
  Trash2, 
  Search, 
  User, 
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
  ShieldCheck
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
      const saved = localStorage.getItem('school_role_permissions_matrix_v1');
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
    return () => window.removeEventListener('storage', refreshUsers);
  }, []);

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
    if (!username) {
      newErrors.username = '🔑 Login Identifier (Username) is required.';
    } else if (!usernameRegex.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, dots, dashes, or underscores.';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    }

    // Check unique username excluding currently edited user
    const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== editingUserId);
    if (exists) {
      newErrors.username = '⚠️ This username is already registered to another staff account.';
    }

    // Full Name
    if (!fullName.trim()) {
      newErrors.fullName = '👤 Full name is required.';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters.';
    }

    // Staff Number
    if (!staffNo.trim()) {
      newErrors.staffNo = '🆔 Staff number is required.';
    }

    // Phone Number (Optional but validated if provided)
    if (phone) {
      const phoneRegex = /^(07\d{8}|\+254\d{9})$/;
      if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
        newErrors.phone = 'Phone number must be in format 07xxxxxxxx or +254xxxxxxxxx.';
      }
    }

    // Email (Optional but validated if provided)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
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
      newErrors.password = 'Password must be a 4-digit numeric PIN.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      // Scroll to top of form container if needed
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

    const savedUser: UserAccount = {
      id: editingUserId || 'u_' + Date.now(),
      username: cleanUsername,
      fullName: fullName.trim(),
      role: dbRole,
      created: editingUserId ? (users.find(u => u.id === editingUserId)?.created || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
      status: status,
      password: password,
      staffNo: staffNo.trim(),
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
  };

  const handleDeleteUser = (id: string, name: string) => {
    checkAccess('perm_del_staff', async () => {
      if (name === 'admin' || name === 'otienobyron805@gmail.com') {
        alert('⚠️ Your Super Admin account is the owner account and cannot be deleted.');
        return;
      }
      const target = users.find(u => u.id === id);
      if (target?.role === 'Super Admin') {
        alert('⚠️ Super Admin accounts cannot be deleted.');
        return;
      }

      if (window.confirm(`🗑️ Are you sure you want to permanently delete user "${name}"?`)) {
        const nextUsers = users.filter(u => u.id !== id);
        setUsers(nextUsers);
        await saveUsers(nextUsers);
      }
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

  return (
    <div className="space-y-6">
      
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
                                  onClick={() => handleDeleteUser(user.id, user.username)}
                                  disabled={user.username === 'admin' || user.username === 'otienobyron805@gmail.com' || user.role === 'Super Admin'}
                                  className={`p-2 rounded-lg transition ${
                                    (user.username === 'admin' || user.username === 'otienobyron805@gmail.com' || user.role === 'Super Admin')
                                      ? 'text-slate-200 cursor-not-allowed opacity-40'
                                      : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer'
                                  }`}
                                  title="Delete account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
