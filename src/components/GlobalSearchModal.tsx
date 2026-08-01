import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Users, 
  GraduationCap, 
  BookOpen, 
  ClipboardList, 
  User, 
  ArrowRight, 
  CornerDownLeft, 
  Activity, 
  DollarSign, 
  FileText, 
  Sparkles,
  Building,
  Layers
} from 'lucide-react';
import { 
  getLearners, 
  getUsers, 
  getSubjects, 
  Learner, 
  UserAccount, 
  Subject 
} from '../utils/db';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (viewName: string) => void;
}

interface ViewItem {
  id: string;
  type: 'view';
  title: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  viewName: string;
}

interface LearnerItem {
  id: string;
  type: 'learner';
  title: string;
  subtitle: string;
  grade: string | number;
  admNo: string;
  icon: React.ReactNode;
  viewName: string;
  raw: Learner;
}

interface StaffItem {
  id: string;
  type: 'staff';
  title: string;
  subtitle: string;
  role: string;
  icon: React.ReactNode;
  viewName: string;
  raw: UserAccount;
}

interface SubjectItem {
  id: string;
  type: 'subject';
  title: string;
  subtitle: string;
  code: string;
  icon: React.ReactNode;
  viewName: string;
  raw: Subject;
}

type SearchResultItem = ViewItem | LearnerItem | StaffItem | SubjectItem;

const NAVIGATION_MODULES: ViewItem[] = [
  { id: 'v-home', type: 'view', title: 'Home Dashboard', category: 'General', description: 'Overview metrics & activity feed', icon: <Building className="w-4 h-4 text-blue-500" />, viewName: 'Home' },
  { id: 'v-learners', type: 'view', title: 'Learners Directory', category: 'Learners', description: 'Student records, profiles & admissions', icon: <Users className="w-4 h-4 text-emerald-500" />, viewName: 'Learners' },
  { id: 'v-roll', type: 'view', title: 'Attendance Roll Call', category: 'Attendance', description: 'Daily student attendance register', icon: <ClipboardList className="w-4 h-4 text-amber-500" />, viewName: 'Attendance Roll' },
  { id: 'v-marks', type: 'view', title: 'Mark Submissions', category: 'Academics', description: 'Enter & approve learner assessment marks', icon: <GraduationCap className="w-4 h-4 text-purple-500" />, viewName: 'Mark Submissions' },
  { id: 'v-term-report', type: 'view', title: 'Term Report Cards', category: 'Reports', description: 'Generate CBC student report forms', icon: <FileText className="w-4 h-4 text-indigo-500" />, viewName: 'Term Report' },
  { id: 'v-sync-health', type: 'view', title: 'Cloud Sync Health', category: 'System', description: 'Database synchronization & conflict resolution', icon: <Activity className="w-4 h-4 text-sky-500" />, viewName: 'Cloud Sync Health' },
  { id: 'v-finances', type: 'view', title: 'Fee Finances & Collections', category: 'Finances', description: 'Student fee payments & balances', icon: <DollarSign className="w-4 h-4 text-emerald-600" />, viewName: 'Finances' },
  { id: 'v-staff', type: 'view', title: 'Manage Staff & Users', category: 'Administration', description: 'User roles, permissions & credentials', icon: <User className="w-4 h-4 text-rose-500" />, viewName: 'Manage Staff' },
  { id: 'v-subjects', type: 'view', title: 'Curriculum Subjects', category: 'Academics', description: 'Manage learning areas & CBC codes', icon: <BookOpen className="w-4 h-4 text-teal-500" />, viewName: 'Subjects' },
  { id: 'v-grades', type: 'view', title: 'Grades & Class Streams', category: 'Academics', description: 'Grade levels, streams & capacity', icon: <Layers className="w-4 h-4 text-cyan-500" />, viewName: 'Grades & Streams' },
  { id: 'v-scheme', type: 'view', title: 'Schemes of Work Repository', category: 'Academics', description: 'Teaching plans & scheme documents', icon: <Sparkles className="w-4 h-4 text-violet-500" />, viewName: 'Schemes of Work' },
  { id: 'v-profile', type: 'view', title: 'School Profile Settings', category: 'Administration', description: 'School name, logo, term & contact details', icon: <Building className="w-4 h-4 text-slate-600" />, viewName: 'School Profile' },
];

export default function GlobalSearchModal({ isOpen, onClose, onNavigate }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'modules' | 'learners' | 'staff' | 'subjects'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global keydown registration for Ctrl+F / Cmd+F / Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F' || e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (!isOpen) {
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Search logic across dataset
  const learners: Learner[] = getLearners?.() || [];
  const users: UserAccount[] = getUsers?.() || [];
  const subjects: Subject[] = getSubjects?.() || [];

  const q = query.trim().toLowerCase();

  // 1. Filter views
  const matchedViews: ViewItem[] = NAVIGATION_MODULES.filter(m => 
    !q || m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
  );

  // 2. Filter learners
  const matchedLearners: LearnerItem[] = learners
    .filter(l => {
      if (!q) return true;
      const nameMatch = l.name ? l.name.toLowerCase().includes(q) : false;
      const admMatch = l.admNo ? l.admNo.toLowerCase().includes(q) : false;
      const gradeMatch = l.grade !== undefined && l.grade !== null ? String(l.grade).toLowerCase().includes(q) : false;
      const labelMatch = l.gradeLabel ? l.gradeLabel.toLowerCase().includes(q) : false;
      const phoneMatch = l.parentPhone ? l.parentPhone.includes(q) : false;
      const assessMatch = l.assessNo ? l.assessNo.toLowerCase().includes(q) : false;
      return nameMatch || admMatch || gradeMatch || labelMatch || phoneMatch || assessMatch;
    })
    .slice(0, 15)
    .map(l => ({
      id: `learner-${l.id}`,
      type: 'learner',
      title: l.name,
      subtitle: `Adm: ${l.admNo} • Grade ${l.gradeLabel || l.grade || 'N/A'} ${l.stream ? ' (' + l.stream + ')' : ''}`,
      grade: l.grade,
      admNo: l.admNo,
      icon: <GraduationCap className="w-4 h-4 text-emerald-600" />,
      viewName: 'Learners',
      raw: l
    }));

  // 3. Filter staff
  const matchedStaff: StaffItem[] = users
    .filter(u => {
      if (!q) return true;
      const nameMatch = u.fullName ? u.fullName.toLowerCase().includes(q) : false;
      const emailMatch = u.email ? u.email.toLowerCase().includes(q) : false;
      const roleMatch = u.role ? u.role.toLowerCase().includes(q) : false;
      const phoneMatch = u.phone ? u.phone.includes(q) : false;
      return nameMatch || emailMatch || roleMatch || phoneMatch;
    })
    .slice(0, 10)
    .map(u => ({
      id: `user-${u.id}`,
      type: 'staff',
      title: u.fullName,
      subtitle: `${u.role} • ${u.email || u.phone || 'No contact'}`,
      role: u.role,
      icon: <User className="w-4 h-4 text-rose-600" />,
      viewName: 'Manage Staff',
      raw: u
    }));

  // 4. Filter subjects
  const matchedSubjects: SubjectItem[] = subjects
    .filter(s => {
      if (!q) return true;
      const nameMatch = s.name ? s.name.toLowerCase().includes(q) : false;
      const codeMatch = s.code ? s.code.toLowerCase().includes(q) : false;
      return nameMatch || codeMatch;
    })
    .slice(0, 8)
    .map(s => ({
      id: `subject-${s.id}`,
      type: 'subject',
      title: s.name,
      subtitle: `Subject Code: ${s.code || 'N/A'}`,
      code: s.code || '',
      icon: <BookOpen className="w-4 h-4 text-teal-600" />,
      viewName: 'Subjects',
      raw: s
    }));

  // Combine results according to tab
  let filteredResults: SearchResultItem[] = [];
  if (activeTab === 'all') {
    filteredResults = [
      ...matchedViews.slice(0, 6),
      ...matchedLearners.slice(0, 8),
      ...matchedStaff.slice(0, 5),
      ...matchedSubjects.slice(0, 5)
    ];
  } else if (activeTab === 'modules') {
    filteredResults = matchedViews;
  } else if (activeTab === 'learners') {
    filteredResults = matchedLearners;
  } else if (activeTab === 'staff') {
    filteredResults = matchedStaff;
  } else if (activeTab === 'subjects') {
    filteredResults = matchedSubjects;
  }

  const handleSelectResult = (item: SearchResultItem) => {
    onNavigate(item.viewName);
    onClose();
  };

  const handleKeyDownInModal = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filteredResults.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (filteredResults.length || 1)) % (filteredResults.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelectResult(filteredResults[selectedIndex]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Search Dialog Box */}
      <div 
        onKeyDown={handleKeyDownInModal}
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
      >
        {/* Search Header Input */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type to search learners, staff, grades, modules... (Ctrl + F)"
            className="w-full bg-transparent text-slate-900 font-medium text-base outline-none placeholder:text-slate-400"
          />
          {query ? (
            <button 
              onClick={() => setQuery('')} 
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-md shadow-2xs">
              ESC
            </kbd>
          )}
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-600 overflow-x-auto no-scrollbar">
          <button
            onClick={() => { setActiveTab('all'); setSelectedIndex(0); }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            All Results ({matchedViews.length + matchedLearners.length + matchedStaff.length + matchedSubjects.length})
          </button>
          <button
            onClick={() => { setActiveTab('modules'); setSelectedIndex(0); }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'modules' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            Modules ({matchedViews.length})
          </button>
          <button
            onClick={() => { setActiveTab('learners'); setSelectedIndex(0); }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'learners' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            Students ({matchedLearners.length})
          </button>
          <button
            onClick={() => { setActiveTab('staff'); setSelectedIndex(0); }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'staff' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            Staff ({matchedStaff.length})
          </button>
          <button
            onClick={() => { setActiveTab('subjects'); setSelectedIndex(0); }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'subjects' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            Subjects ({matchedSubjects.length})
          </button>
        </div>

        {/* Search Results Body */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
          {filteredResults.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Search className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No records found matching "{query}"</p>
              <p className="text-xs text-slate-400">Try searching for student admission numbers, staff names, or system modules.</p>
            </div>
          ) : (
            filteredResults.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectResult(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-xl transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected ? 'bg-blue-50 border border-blue-200 shadow-xs' : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex-shrink-0 shadow-2xs">
                      {item.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 truncate">{item.title}</h4>
                        {'category' in item && (
                          <span className="px-2 py-0.5 text-[10px] font-extrabold bg-slate-100 text-slate-600 rounded-md uppercase tracking-wider">
                            {item.category}
                          </span>
                        )}
                        {'admNo' in item && (
                          <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 rounded-md">
                            ADM: {item.admNo}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                        {'description' in item ? item.description : 'subtitle' in item ? item.subtitle : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      Jump <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    {isSelected && (
                      <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-blue-800 bg-blue-100 rounded-md">
                        <CornerDownLeft className="w-3 h-3" /> Select
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Bar Hints */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold">ESC</kbd>
              Close
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-slate-400 font-bold">
            <Sparkles className="w-3 h-3 text-blue-500" /> Quick Search Active
          </div>
        </div>
      </div>
    </div>
  );
}
