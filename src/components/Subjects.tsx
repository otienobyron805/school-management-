import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, BookOpen, Users, Filter, Save, ArrowLeft, Search, Check, X, BarChart2, List } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  getSubjects, 
  saveSubjects, 
  getLearners, 
  saveLearners,
  getGrades,
  getSubjectEnrollments, 
  saveSubjectEnrollments, 
  SORT_RULES,
  sortList,
  Subject, 
  Learner,
  Grade,
  logActivity
} from '../utils/db';
import { canDelete } from '../utils/permissions';

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, string[]>>({});
  const [dbGrades, setDbGrades] = useState<Grade[]>([]);

  // Filters for main view
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [selectedStream, setSelectedStream] = useState<string | 'all'>('all');

  // Subjects lists CRUD states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState<{
    name: string;
    code: string;
    selectedGrades: number[];
    selectedStreams: string[];
  }>({
    name: '',
    code: '',
    selectedGrades: [],
    selectedStreams: ['All Streams']
  });
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);

  // Grade & Stream Assignment modal state
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedSubjectForGrades, setSelectedSubjectForGrades] = useState<Subject | null>(null);

  // --- SUBJECT ENROLLMENT STATE ---
  const [activeEnrollmentSubject, setActiveEnrollmentSubject] = useState<Subject | null>(null);
  const [activeGradeTab, setActiveGradeTab] = useState<number | 'all'>('all');
  
  // Filters for enrollment screen
  const [streamFilter, setStreamFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [appliedStreamFilter, setAppliedStreamFilter] = useState<string>('all');
  const [appliedSearchFilter, setAppliedSearchFilter] = useState<string>('');
  const [highlightedLearnerId, setHighlightedLearnerId] = useState<string | null>(null);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setSubjects(getSubjects());
    setLearners(getLearners());
    setDbGrades(getGrades());
    setEnrollments(getSubjectEnrollments());
  }, []);



  // Derive robust system grades list combining getGrades(), SORT_RULES.gradeOrder, and learners
  const allGradeNames = new Map<string, string[]>(); // label -> streams
  
  // 1. Add standard grades from SORT_RULES.gradeOrder
  SORT_RULES.gradeOrder.forEach(gName => {
    allGradeNames.set(gName, []);
  });

  // 2. Add grades from dbGrades
  dbGrades.forEach(g => {
    if (!g || !g.name) return;
    const cleanName = g.name.trim();
    const streams = (g.streams || []).map(s => s.name).filter(Boolean);
    if (allGradeNames.has(cleanName)) {
      const existing = allGradeNames.get(cleanName)!;
      allGradeNames.set(cleanName, Array.from(new Set([...existing, ...streams])));
    } else {
      allGradeNames.set(cleanName, streams);
    }
  });

  // 3. Add grades from learners
  learners.forEach(l => {
    const gLabel = l.gradeLabel || (l.grade ? `Grade ${l.grade}` : '');
    if (gLabel && !allGradeNames.has(gLabel)) {
      allGradeNames.set(gLabel, []);
    }
  });

  // Sort grade names using sortList
  const sortedGradeNames = sortList(Array.from(allGradeNames.keys()), 'grade');

  const systemGradeList = sortedGradeNames.map((name, index) => {
    const num = index + 1;
    return {
      num,
      label: name,
      streams: allGradeNames.get(name) || []
    };
  });

  // Ensure default selected grades for new subjects if not set
  useEffect(() => {
    if (newSubject.selectedGrades.length === 0 && systemGradeList.length > 0) {
      setNewSubject(prev => ({
        ...prev,
        selectedGrades: systemGradeList.map(g => g.num)
      }));
    }
  }, [systemGradeList.length]);

  // Ensure activeGradeTab defaults to first available grade if current is invalid
  useEffect(() => {
    if (systemGradeList.length > 0 && !systemGradeList.some(g => g.num === activeGradeTab)) {
      setActiveGradeTab(systemGradeList[0].num);
    }
  }, [systemGradeList]);

  // Derive all unique streams across grades and learners
  const streamsFromGrades = dbGrades.flatMap(g => (g.streams || []).map(s => s.name));
  const streamsFromLearners = learners.map(l => l.stream);
  const availableStreams = Array.from(
    new Set(['All Streams', ...streamsFromGrades, ...streamsFromLearners])
  ).filter(Boolean);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleAddSubject = () => {
    setEditingSubjectId(null);
    setNewSubject({ 
      name: '', 
      code: '', 
      selectedGrades: systemGradeList.map(g => g.num), 
      selectedStreams: ['All Streams'] 
    });
    setIsModalOpen(true);
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubjectId(subject.id);
    setNewSubject({ 
      name: subject.name, 
      code: subject.code,
      selectedGrades: subject.grades && subject.grades.length > 0 ? subject.grades : systemGradeList.map(g => g.num),
      selectedStreams: subject.streams && subject.streams.length > 0 ? subject.streams : ['All Streams']
    });
    setIsModalOpen(true);
  };

  const saveSubject = () => {
    if (!newSubject.name.trim() || !newSubject.code.trim()) {
      alert('Please fill out Subject Name and Subject Code.');
      return;
    }
    if (newSubject.selectedGrades.length === 0) {
      alert('Please select at least one grade for this subject.');
      return;
    }

    let updated: Subject[];
    if (editingSubjectId) {
      updated = subjects.map(s => 
        s.id === editingSubjectId 
          ? { 
              ...s, 
              name: newSubject.name.trim(), 
              code: newSubject.code.trim().toUpperCase(),
              grades: newSubject.selectedGrades,
              streams: newSubject.selectedStreams.length > 0 ? newSubject.selectedStreams : ['All Streams']
            } 
          : s
      );
      triggerToast(`Subject updated: "${newSubject.name.trim()}"`);
    } else {
      const newSub: Subject = {
        id: 's_' + Date.now(),
        name: newSubject.name.trim(),
        code: newSubject.code.trim().toUpperCase(),
        grades: newSubject.selectedGrades,
        streams: newSubject.selectedStreams.length > 0 ? newSubject.selectedStreams : ['All Streams']
      };
      updated = [...subjects, newSub];
      triggerToast(`Added subject "${newSubject.name.trim()}"`);
    }

    setSubjects(updated);
    saveSubjects(updated);
    setIsModalOpen(false);
  };

  const deleteSubject = (id: string, name: string) => {
    if (!canDelete()) {
      alert('⚠️ Access denied: You have a restriction ("cannot delete") preventing you from deleting items in this software.');
      return;
    }
    if (confirm(`⚠️ Are you sure you want to delete "${name}"?`)) {
      const updated = subjects.filter(s => s.id !== id);
      setSubjects(updated);
      saveSubjects(updated);
      triggerToast(`Deleted "${name}"`);
    }
  };

  const changeGradeAssignment = (subject: Subject) => {
    setSelectedSubjectForGrades(subject);
    setIsGradeModalOpen(true);
  };

  const saveGradeAssignment = (newGrades: number[], newStreams: string[]) => {
    if (selectedSubjectForGrades) {
      const updated = subjects.map(s => 
        s.id === selectedSubjectForGrades.id 
          ? { ...s, grades: newGrades, streams: newStreams.length > 0 ? newStreams : ['All Streams'] } 
          : s
      );
      setSubjects(updated);
      saveSubjects(updated);
      setIsGradeModalOpen(false);
      setSelectedSubjectForGrades(null);
      triggerToast(`Grade & Stream assignments updated`);
    }
  };

  const manageLearners = (subject: Subject) => {
    setActiveEnrollmentSubject(subject);
    setLearners(getLearners());
    // Reset filters for learner view
    setStreamFilter('all');
    setSearchFilter('');
    setAppliedStreamFilter('all');
    setAppliedSearchFilter('');
    // Pick the first grade level assigned to this subject, or default to 'all' or first system grade
    if (subject.grades && subject.grades.length > 0) {
      setActiveGradeTab(subject.grades[0]);
    } else if (systemGradeList.length > 0) {
      setActiveGradeTab(systemGradeList[0].num);
    } else {
      setActiveGradeTab('all');
    }
  };

  const filteredSubjects = subjects.filter(s => {
    const matchesGrade = selectedGrade === 'all' || (s.grades && s.grades.includes(selectedGrade as number));
    const matchesStream = selectedStream === 'all' || 
      !s.streams || 
      s.streams.includes('All Streams') || 
      s.streams.includes(selectedStream as string);
    return matchesGrade && matchesStream;
  });

  // --- ENROLLMENT LOGIC ---
  const saveEnrollmentsAndSyncLearners = (nextEnrollments: Record<string, string[]>) => {
    setEnrollments(nextEnrollments);
    saveSubjectEnrollments(nextEnrollments);

    if (!activeEnrollmentSubject) return;
    const subjectCode = activeEnrollmentSubject.code;
    const subjectName = activeEnrollmentSubject.name;
    const currentSubjectId = activeEnrollmentSubject.id;
    const enrolledIds = nextEnrollments[currentSubjectId] || [];

    const updatedLearners = learners.map(learner => {
      const isEnrolled = enrolledIds.includes(learner.id);
      let linked = Array.isArray(learner.linkedSubjects) ? [...learner.linkedSubjects] : [];
      if (isEnrolled) {
        if (!linked.includes(subjectCode)) linked.push(subjectCode);
        if (subjectName && !linked.includes(subjectName)) linked.push(subjectName);
      } else {
        linked = linked.filter(s => s !== subjectCode && s !== subjectName);
      }
      return { ...learner, linkedSubjects: linked };
    });

    setLearners(updatedLearners);
    saveLearners(updatedLearners);
    logActivity('general_change', `Updated learner registrations for subject ${subjectName || subjectCode} (${enrolledIds.length} registered)`, 'Teacher/Admin');
  };

  const handleToggleEnrollment = (learnerId: string, admNo: string) => {
    if (!activeEnrollmentSubject) return;
    const currentSubjectId = activeEnrollmentSubject.id;
    const subjectEnrolledIds = enrollments[currentSubjectId] || [];

    let updatedEnrolled: string[];
    if (subjectEnrolledIds.includes(learnerId)) {
      updatedEnrolled = subjectEnrolledIds.filter(id => id !== learnerId);
      triggerToast(`Learner ${admNo} removed`);
    } else {
      updatedEnrolled = [...subjectEnrolledIds, learnerId];
      triggerToast(`Learner ${admNo} added`);
    }

    setHighlightedLearnerId(learnerId);
    setTimeout(() => setHighlightedLearnerId(null), 1000);

    const nextEnrollments = { ...enrollments, [currentSubjectId]: updatedEnrolled };
    saveEnrollmentsAndSyncLearners(nextEnrollments);
  };

  // Filter learners for the enrollment screen with robust grade matching
  const activeGradeObj = typeof activeGradeTab === 'number' 
    ? systemGradeList.find(g => g.num === activeGradeTab) 
    : null;
  const activeGradeLabel = activeGradeObj?.label || (typeof activeGradeTab === 'number' ? `Grade ${activeGradeTab}` : '');

  const learnersInActiveGrade = learners.filter(l => {
    if (activeGradeTab === 'all') return true;
    
    // 1. Direct number match
    if (l.grade === activeGradeTab || Number(l.grade) === activeGradeTab) return true;
    
    // 2. Direct label string match (e.g., "Grade 8" === "Grade 8")
    if (l.gradeLabel && activeGradeLabel && l.gradeLabel.toLowerCase().trim() === activeGradeLabel.toLowerCase().trim()) return true;
    if (l.grade && activeGradeLabel && String(l.grade).toLowerCase().trim() === activeGradeLabel.toLowerCase().trim()) return true;

    // 3. Numeric extraction match (e.g. "Grade 8" -> 8 vs activeGradeTab 8)
    const lGradeNum = typeof l.grade === 'number' 
      ? l.grade 
      : parseInt(String(l.gradeLabel || l.grade || '').replace(/\D/g, ''), 10);
    const activeGradeNum = parseInt(activeGradeLabel.replace(/\D/g, ''), 10) || (typeof activeGradeTab === 'number' ? activeGradeTab : NaN);

    if (!isNaN(lGradeNum) && !isNaN(activeGradeNum) && lGradeNum === activeGradeNum) return true;

    return false;
  });

  const shownLearners = learnersInActiveGrade.filter(learner => {
    const matchesStream = appliedStreamFilter === 'all' || learner.stream.toLowerCase() === appliedStreamFilter.toLowerCase();
    const matchesSearch = appliedSearchFilter === '' || 
      learner.name.toLowerCase().includes(appliedSearchFilter.toLowerCase()) || 
      learner.admNo.includes(appliedSearchFilter);
    return matchesStream && matchesSearch;
  });

  const enrolledInActiveGradeAndSubject = learnersInActiveGrade.filter(l => {
    const currentSubjectId = activeEnrollmentSubject?.id || '';
    const subjectEnrolledIds = enrollments[currentSubjectId] || [];
    return subjectEnrolledIds.includes(l.id);
  });

  const handleRegisterAllShown = () => {
    if (!activeEnrollmentSubject) return;
    const currentSubjectId = activeEnrollmentSubject.id;
    const subjectEnrolledIds = enrollments[currentSubjectId] || [];

    const idsToEnroll = shownLearners.map(l => l.id);
    const nextEnrolled = Array.from(new Set([...subjectEnrolledIds, ...idsToEnroll]));
    
    const addedCount = nextEnrolled.length - subjectEnrolledIds.length;

    const nextEnrollments = { ...enrollments, [currentSubjectId]: nextEnrolled };
    saveEnrollmentsAndSyncLearners(nextEnrollments);
    triggerToast(`${addedCount} learners registered`);
  };

  const handleDeregisterAllShown = () => {
    if (!activeEnrollmentSubject) return;
    if (!confirm('Remove all displayed learners from this subject?')) return;
    const currentSubjectId = activeEnrollmentSubject.id;
    const subjectEnrolledIds = enrollments[currentSubjectId] || [];

    const idsToRemove = new Set(shownLearners.map(l => l.id));
    const nextEnrolled = subjectEnrolledIds.filter(id => !idsToRemove.has(id));

    const removedCount = subjectEnrolledIds.length - nextEnrolled.length;

    const nextEnrollments = { ...enrollments, [currentSubjectId]: nextEnrolled };
    saveEnrollmentsAndSyncLearners(nextEnrollments);
    triggerToast(`${removedCount} learners removed`);
  };

  const applyFilters = () => {
    setAppliedStreamFilter(streamFilter);
    setAppliedSearchFilter(searchFilter.trim());
    triggerToast(`Showing ${shownLearners.length} learners`);
  };

  const clearFilters = () => {
    setStreamFilter('all');
    setSearchFilter('');
    setAppliedStreamFilter('all');
    setAppliedSearchFilter('');
    triggerToast('Filters cleared');
  };

  const allAvailableStreams = Array.from(new Set(learners.map(l => l.stream))).filter(Boolean);

  // If in Enrollment Subject Management mode, render enrollment view
  if (activeEnrollmentSubject) {
    const currentSubjectId = activeEnrollmentSubject.id;
    const enrolledIds = enrollments[currentSubjectId] || [];

    return (
      <div className="bg-[#f0f7ff] min-h-screen p-4 md:p-6 space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 left-6 right-6 md:left-auto md:w-80 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-xl z-50 text-sm font-semibold text-center flex items-center justify-center gap-2 animate-slide-up border border-slate-800">
            ✨ {toastMessage}
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={() => setActiveEnrollmentSubject(null)}
            className="bg-white border border-blue-100 hover:border-blue-300 px-4 py-2.5 rounded-xl text-sm font-bold text-blue-700 cursor-pointer hover:-translate-x-0.5 transition-all shadow-sm flex items-center gap-2 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" /> Subjects
          </button>
          <div className="page-title">
            <h1 className="text-xl md:text-2xl font-extrabold text-blue-900">
              Subject Management — {activeEnrollmentSubject.name}
            </h1>
          </div>
        </div>

        {/* INFO BOX */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100/60 border-l-4 border-blue-600 p-4 rounded-xl text-sm leading-relaxed text-blue-800 shadow-sm">
          <strong>How subject enrollment works:</strong><br />
          Once you register learners for this subject, only registered learners will appear on the mark entry sheet.
        </div>

        {/* GRADE TABS CARD */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-indigo-50/80">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">Select Grade:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setActiveGradeTab('all');
                triggerToast('All Grades selected');
              }}
              className={`min-w-[80px] py-2.5 px-4 rounded-xl text-sm font-bold border-2 transition-all min-h-[44px] text-center ${
                activeGradeTab === 'all' 
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-700 shadow-md shadow-blue-500/10' 
                  : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              All Grades
            </button>
            {systemGradeList.map((g) => {
              const isAssigned = activeEnrollmentSubject.grades.includes(g.num);
              const isActive = activeGradeTab === g.num;
              return (
                <button
                  key={g.num}
                  onClick={() => {
                    setActiveGradeTab(g.num);
                    triggerToast(`${g.label} selected`);
                  }}
                  className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-sm font-bold border-2 transition-all min-h-[44px] text-center ${
                    isActive 
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-700 shadow-md shadow-blue-500/10' 
                      : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  {g.label} {!isAssigned && <span className="text-[10px] text-slate-400 block font-normal">(unassigned)</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* COUNT CARD */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-indigo-50/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-8 flex-wrap">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL LEARNERS</span>
                <span className="text-3xl font-extrabold text-slate-800">{learnersInActiveGrade.length}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">REGISTERED</span>
                <span className="text-3xl font-extrabold text-blue-600">{enrolledInActiveGradeAndSubject.length}</span>
              </div>
            </div>
            {typeof activeGradeTab === 'number' && !activeEnrollmentSubject.grades.includes(activeGradeTab) && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3.5 py-2.5 rounded-xl font-semibold flex items-center gap-2">
                ⚠️ This subject is not assigned to Grade {activeGradeTab} yet. Go to Subjects and click "Change Grades & Streams" to assign it.
              </div>
            )}
          </div>
        </div>

        {/* FILTERS CARD */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-indigo-50/80 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Stream Filter:</span>
              <select 
                value={streamFilter}
                onChange={(e) => setStreamFilter(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-slate-100 rounded-xl font-medium text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
              >
                <option value="all">All Streams</option>
                {allAvailableStreams.map(str => (
                  <option key={str} value={str}>Stream {str}</option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Search Input:</span>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input 
                  type="text"
                  placeholder="Name or admission number..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-100 rounded-xl font-medium text-sm focus:outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={applyFilters}
                className="flex-1 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2.5 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                🔍 Filter
              </button>
              <button 
                onClick={clearFilters}
                className="flex-1 bg-slate-100 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-200 transition-all min-h-[44px]"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* LEARNERS LIST TABLE CARD */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-indigo-50/80 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-blue-900">Learners Registry</h3>
              <p className="text-xs text-slate-400">Add or remove learners from {activeEnrollmentSubject.name} below</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button 
                onClick={handleRegisterAllShown}
                disabled={shownLearners.length === 0}
                className="flex-1 md:flex-none bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs hover:from-emerald-600 hover:to-emerald-700 shadow-sm transition-all disabled:opacity-50"
              >
                ✅ Register All Shown
              </button>
              <button 
                onClick={handleDeregisterAllShown}
                disabled={shownLearners.length === 0}
                className="flex-1 md:flex-none bg-gradient-to-br from-red-500 to-red-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs hover:from-red-600 hover:to-red-700 shadow-sm transition-all disabled:opacity-50"
              >
                ❌ Deregister All Shown
              </button>
            </div>
          </div>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left border-collapse min-w-[620px]">
              <thead>
                <tr className="bg-slate-50 border-b border-indigo-100">
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Learner Name</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Adm No</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stream</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Enrollment Status</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
              {shownLearners.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                      No learners match the selected filters for {activeGradeTab === 'all' ? 'All Grades' : `Grade ${activeGradeTab}`}.
                    </td>
                  </tr>
                ) : (
                  shownLearners.map(learner => {
                    const isEnrolled = enrolledIds.includes(learner.id);
                    const isHighlighted = highlightedLearnerId === learner.id;
                    return (
                      <tr key={learner.id} className={`transition-all duration-300 ${isHighlighted ? 'bg-amber-100' : 'hover:bg-blue-50/30'}`}>
                        <td className="py-3.5 px-4 font-bold text-blue-900">{learner.name}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600 font-semibold">{learner.admNo}</td>
                        <td className="py-3.5 px-4 text-sm text-slate-600 font-medium">{learner.stream}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold shadow-sm ${
                            isEnrolled 
                              ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' 
                              : 'bg-red-50 border border-red-100 text-red-700'
                          }`}>
                            {isEnrolled ? '✅ Enrolled' : '❌ Not Enrolled'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleToggleEnrollment(learner.id, learner.admNo)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-all ${
                              isEnrolled 
                                ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white' 
                                : 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white'
                            }`}
                          >
                            {isEnrolled ? '❌ Remove' : '✅ Add'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- STANDARD SUBJECTS VIEW ---
  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen">
      {/* Toast message for general view */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl z-50 text-sm font-semibold flex items-center gap-2">
          ✨ {toastMessage}
        </div>
      )}

      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" /> Subjects
          </h1>
          <p className="text-sm text-slate-500">Manage school subjects and their assigned grades & streams.</p>
        </div>
        <button 
          onClick={handleAddSubject}
          className="w-full sm:w-auto bg-gradient-to-br from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5 pointer-events-none" /> Add / Assign Subject
        </button>
      </div>

      {/* FILTER BAR: GRADE & STREAM */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="space-y-1.5">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Filter by Grade:</span>
            <div className="flex flex-wrap gap-1.5">
              <button 
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${selectedGrade === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-blue-300'}`}
                onClick={() => setSelectedGrade('all')}
              >
                All Grades
              </button>
              {systemGradeList.map(g => (
                <button 
                  key={g.num}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${selectedGrade === g.num ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-blue-300'}`}
                  onClick={() => setSelectedGrade(g.num)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 w-full md:w-auto">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Filter by Stream:</span>
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className="w-full md:w-auto px-4 py-2 rounded-xl font-bold text-xs bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Streams</option>
              {availableStreams.filter(s => s !== 'All Streams').map(str => (
                <option key={str} value={str}>Stream {str}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl space-y-5 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-800">
                {editingSubjectId ? 'Edit Subject Details' : 'Add / Assign New Subject'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Subject Name *
                </label>
                <input 
                  type="text"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  placeholder="e.g., Mathematics, Kiswahili, Agriculture"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Subject Code *
                </label>
                <input 
                  type="text"
                  value={newSubject.code}
                  onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                  placeholder="e.g., MAT-101 or ENG"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                />
              </div>

              {/* LINK GRADES SECTION */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Linked Grades ({newSubject.selectedGrades.length} selected) *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewSubject({ ...newSubject, selectedGrades: systemGradeList.map(g => g.num) })}
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 text-[11px]">|</span>
                    <button
                      type="button"
                      onClick={() => setNewSubject({ ...newSubject, selectedGrades: [] })}
                      className="text-[11px] font-bold text-slate-500 hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">Check all grades where this subject is taught:</p>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                  {systemGradeList.map(g => {
                    const isSelected = newSubject.selectedGrades.includes(g.num);
                    return (
                      <button
                        key={g.num}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? newSubject.selectedGrades.filter(gn => gn !== g.num)
                            : [...newSubject.selectedGrades, g.num];
                          setNewSubject({ ...newSubject, selectedGrades: next });
                        }}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LINK STREAMS SECTION */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Linked Streams ({newSubject.selectedStreams.length} selected)
                </label>
                <p className="text-xs text-slate-500">Select target streams or "All Streams":</p>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                  {availableStreams.map(str => {
                    const isSelected = newSubject.selectedStreams.includes(str);
                    return (
                      <button
                        key={str}
                        type="button"
                        onClick={() => {
                          let next: string[];
                          if (str === 'All Streams') {
                            next = isSelected ? [] : ['All Streams'];
                          } else {
                            const filtered = newSubject.selectedStreams.filter(s => s !== 'All Streams');
                            next = isSelected
                              ? filtered.filter(s => s !== str)
                              : [...filtered, str];
                          }
                          setNewSubject({ ...newSubject, selectedStreams: next });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        {str === 'All Streams' ? '🌐 All Streams' : `Stream ${str}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 px-4 py-2.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={saveSubject} 
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center gap-2 text-sm shadow-md"
              >
                <Save className="w-4 h-4" /> Save Subject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE GRADES & STREAMS MODAL */}
      {isGradeModalOpen && selectedSubjectForGrades && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-800">
                Grades & Streams for {selectedSubjectForGrades.name}
              </h2>
              <button onClick={() => setIsGradeModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Assign Grades:
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                  {systemGradeList.map(g => {
                    const hasGrade = selectedSubjectForGrades.grades.includes(g.num);
                    return (
                      <button
                        key={g.num}
                        type="button"
                        onClick={() => {
                          const newGrades = hasGrade
                            ? selectedSubjectForGrades.grades.filter(gn => gn !== g.num)
                            : [...selectedSubjectForGrades.grades, g.num];
                          setSelectedSubjectForGrades({ ...selectedSubjectForGrades, grades: newGrades });
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1 ${
                          hasGrade ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {hasGrade && <Check className="w-3.5 h-3.5" />}
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Assign Streams:
                </label>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                  {availableStreams.map(str => {
                    const currentStreams = selectedSubjectForGrades.streams || ['All Streams'];
                    const hasStream = currentStreams.includes(str);
                    return (
                      <button
                        key={str}
                        type="button"
                        onClick={() => {
                          let nextStreams: string[];
                          if (str === 'All Streams') {
                            nextStreams = hasStream ? [] : ['All Streams'];
                          } else {
                            const filtered = currentStreams.filter(s => s !== 'All Streams');
                            nextStreams = hasStream
                              ? filtered.filter(s => s !== str)
                              : [...filtered, str];
                          }
                          setSelectedSubjectForGrades({ ...selectedSubjectForGrades, streams: nextStreams });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
                          hasStream ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {hasStream && <Check className="w-3 h-3" />}
                        {str === 'All Streams' ? '🌐 All Streams' : `Stream ${str}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setIsGradeModalOpen(false)} 
                className="flex-1 px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => saveGradeAssignment(selectedSubjectForGrades.grades, selectedSubjectForGrades.streams || ['All Streams'])} 
                className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center gap-2 text-sm shadow-md"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredSubjects.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border-2 border-dashed border-slate-200 shadow-sm">
          <span className="text-5xl mb-4 block opacity-70">📖</span>
          <p className="text-slate-500 font-medium text-lg">No subjects match the selected filters.</p>
          <p className="text-slate-400">Click "Add / Assign Subject" or adjust filter criteria above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSubjects.map(subject => {
            const subjectEnrolledCount = (enrollments[subject.id] || []).length;
            return (
              <div key={subject.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-slate-800">{subject.name}</h3>
                      <span className="inline-block bg-blue-50 text-blue-700 px-3 py-0.5 rounded-lg text-xs font-bold">{subject.code}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditSubject(subject)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Edit Subject"><Edit2 className="w-4 h-4" /></button>
                      {canDelete() && (
                          <button onClick={() => deleteSubject(subject.id, subject.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Delete Subject"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                  
                  {/* LINKED GRADES */}
                  <div className="space-y-1 mb-3">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Linked Grades:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(!subject.grades || subject.grades.length === 0) ? (
                        <span className="text-xs text-slate-400 font-medium italic">No grades assigned</span>
                      ) : (
                        subject.grades.map(gradeNum => {
                          const gInfo = systemGradeList.find(g => g.num === gradeNum);
                          return (
                            <span key={gradeNum} className="bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                              {gInfo ? gInfo.label : `Grade ${gradeNum}`}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* LINKED STREAMS */}
                  <div className="space-y-1 mb-4">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Linked Streams:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(!subject.streams || subject.streams.length === 0 || subject.streams.includes('All Streams')) ? (
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                          🌐 All Streams
                        </span>
                      ) : (
                        subject.streams.map(str => (
                          <span key={str} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                            Stream {str}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4 justify-between items-center mt-4">
                  <button 
                    onClick={() => manageLearners(subject)} 
                    className="text-blue-600 font-bold text-sm flex items-center gap-2 hover:text-blue-700 transition-colors"
                  >
                    <Users className="w-4 h-4" /> Manage Learners
                    <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded-full">{subjectEnrolledCount}</span>
                  </button>
                  <button 
                    onClick={() => changeGradeAssignment(subject)} 
                    className="text-slate-600 font-semibold text-sm flex items-center gap-2 hover:text-slate-700 transition-colors"
                  >
                    <Filter className="w-4 h-4" /> Change Grades & Streams
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
