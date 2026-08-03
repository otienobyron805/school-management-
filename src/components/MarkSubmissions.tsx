import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, CheckCircle, Award, Sparkles, HelpCircle, 
  BookOpen, Users, AlertCircle, RefreshCw, ChevronDown, Check, X, 
  Search, Save, Info, Grid, Trash2, Calendar, FileText, Lock, Unlock, Eye, Bell, Filter, Layers, Clock, CheckSquare, Inbox
} from 'lucide-react';
import { 
  secureGet, secureSet, getLearners, getGrades, getSubjects, getGradingRules, 
  getSubjectAssignments, getSubjectPapers, Learner, Grade, Subject, GradingRule, SubjectPaper,
  getCurrentUser, logTeacherAction
} from '../utils/db';

interface ExamMark {
  examId: string;
  learnerId: string;
  subjectCode: string;
  paperId?: string;
  score: number | '';
}

interface SubmissionStatusRecord {
  examId: string;
  assignmentKey: string; // e.g. "teacher_subject_grade_stream"
  status: 'Submitted' | 'Locked' | 'Pending';
  submittedDate?: string;
  lockedBy?: string;
}

export default function MarkSubmissions() {
  // DB States
  const [exams, setExams] = useState<any[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [gradingRules, setGradingRules] = useState<GradingRule[]>([]);
  const [savedMarks, setSavedMarks] = useState<ExamMark[]>([]);
  const [subjectPapers, setSubjectPapers] = useState<SubjectPaper[]>([]);
  const [subjectAssignments, setSubjectAssignments] = useState<any[]>([]);
  const [submissionStatuses, setSubmissionStatuses] = useState<SubmissionStatusRecord[]>([]);

  // Navigation / View mode: 'overview' | 'grid'
  const [viewMode, setViewMode] = useState<'overview' | 'grid'>('overview');

  // Filter states
  const [selectedExamId, setSelectedExamId] = useState<string>('all'); // 'all' or specific exam ID
  const [examTagFilter, setExamTagFilter] = useState<string>('all');

  // Grid Selection states (when viewing a specific assignment in grid mode)
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');
  const [selectedGradeName, setSelectedGradeName] = useState<string>('');
  const [selectedStreamId, setSelectedStreamId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'adm'>('name');
  const [visibleSubjects, setVisibleSubjects] = useState<string[]>([]);
  const [gridScores, setGridScores] = useState<Record<string, Record<string, number | ''>>>({});

  // Absent scanner states
  const [blankLearners, setBlankLearners] = useState<Learner[]>([]);
  const [scannedBlanks, setScannedBlanks] = useState<boolean>(false);
  const [checkedAbsentLearners, setCheckedAbsentLearners] = useState<Set<string>>(new Set());

  // UI toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load baseline DB values
  useEffect(() => {
    const loadedExams = secureGet('exams') ? JSON.parse(secureGet('exams')!) : [];
    setExams(loadedExams);
    if (loadedExams.length > 0 && selectedExamId === 'all') {
      setSelectedExamId(loadedExams[0].id);
    }

    const loadedGrades = getGrades();
    setGrades(loadedGrades);
    if (loadedGrades.length > 0) {
      setSelectedGradeId(loadedGrades[0].id);
      setSelectedGradeName(loadedGrades[0].name);
    }

    setSubjects(getSubjects());
    setLearners(getLearners());
    setGradingRules(getGradingRules());
    setSubjectPapers(getSubjectPapers());
    setSubjectAssignments(getSubjectAssignments());

    const storedMarks = secureGet('school_exam_marks');
    if (storedMarks) {
      setSavedMarks(JSON.parse(storedMarks));
    }

    const storedSubStatuses = secureGet('exam_submission_statuses');
    if (storedSubStatuses) {
      setSubmissionStatuses(JSON.parse(storedSubStatuses));
    }
  }, []);

  // Sync selectedGradeName when selectedGradeId changes
  useEffect(() => {
    const matched = grades.find(g => g.id === selectedGradeId);
    if (matched) {
      setSelectedGradeName(matched.name);
      setSelectedStreamId('all');
    }
  }, [selectedGradeId, grades]);

  // Determine active grade subjects
  const selectedGradeObj = grades.find(g => g.id === selectedGradeId || g.name === selectedGradeName);
  const gradeNum = selectedGradeObj ? (parseInt(selectedGradeObj.name.replace(/\D/g, ''), 10) || 8) : 8;
  const activeGradeSubjects = subjects.filter(sub => sub.grades.includes(gradeNum));

  useEffect(() => {
    if (activeGradeSubjects.length > 0) {
      setVisibleSubjects(activeGradeSubjects.map(s => s.code));
    } else {
      setVisibleSubjects([]);
    }
    setScannedBlanks(false);
    setBlankLearners([]);
    setCheckedAbsentLearners(new Set());
  }, [selectedGradeId, selectedGradeName, subjects]);

  // Load gridScores state when active exam or marks change
  useEffect(() => {
    const activeExam = selectedExamId === 'all' ? (exams[0]?.id || '') : selectedExamId;
    if (!activeExam) return;

    const scores: Record<string, Record<string, number | ''>> = {};
    savedMarks.forEach(m => {
      if (m.examId === activeExam) {
        if (!scores[m.learnerId]) scores[m.learnerId] = {};
        const key = m.paperId ? `${m.subjectCode}_${m.paperId}` : m.subjectCode;
        scores[m.learnerId][key] = m.score;
      }
    });
    setGridScores(scores);
  }, [selectedExamId, savedMarks, exams]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Compute submissions list combining subjectAssignments and exams
  const computedSubmissionsList = useMemo(() => {
    const list: Array<{
      id: string;
      examId: string;
      examName: string;
      teacher: string;
      subject: string;
      subjectCode: string;
      grade: string;
      stream: string;
      status: 'Submitted' | 'Locked' | 'Pending';
      submittedDate: string;
      lockedBy: string;
    }> = [];

    const activeExamsList = selectedExamId === 'all' 
      ? exams 
      : exams.filter(e => e.id === selectedExamId);

    const assignments = subjectAssignments;

    activeExamsList.forEach(exam => {
      assignments.forEach((asg, idx) => {
        const assignmentKey = `${exam.id}_${asg.teacher}_${asg.subject}_${asg.grade}_${asg.stream}`;
        
        // Check if marks exist for this exam & grade & subject
        const subObj = subjects.find(s => s.name === asg.subject);
        const subCode = subObj?.code || asg.subject.substring(0, 3).toUpperCase();
        
        const gradeObj = grades.find(g => g.name === asg.grade);
        const gradeLevelNum = gradeObj ? (parseInt(gradeObj.name.replace(/\D/g, ''), 10) || 8) : 8;

        const learnersInClass = learners.filter(l => {
          const mGrade = l.grade === gradeLevelNum || l.gradeLabel === asg.grade;
          const mStream = asg.stream === 'All Streams' || !l.stream || l.stream === asg.stream;
          return mGrade && mStream;
        });

        // Count how many learner scores are entered for this exam and subCode
        const enteredCount = learnersInClass.filter(l => {
          return savedMarks.some(m => m.examId === exam.id && m.learnerId === l.id && m.subjectCode === subCode && m.score !== '');
        }).length;

        const hasAnyMarks = learnersInClass.length > 0 && enteredCount > 0;

        // Find status record if exists
        const storedStatusRecord = submissionStatuses.find(s => s.examId === exam.id && s.assignmentKey === assignmentKey);

        let status: 'Submitted' | 'Locked' | 'Pending' = storedStatusRecord ? storedStatusRecord.status : (hasAnyMarks ? 'Submitted' : 'Pending');
        let subDate = storedStatusRecord?.submittedDate || (hasAnyMarks ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
        let lockedBy = storedStatusRecord?.lockedBy || (status === 'Locked' ? 'Admin' : '—');

        list.push({
          id: assignmentKey,
          examId: exam.id,
          examName: exam.examName || exam.name || 'Exam',
          teacher: asg.teacher || 'Unassigned Teacher',
          subject: asg.subject || 'Subject',
          subjectCode: subCode,
          grade: asg.grade || 'Grade 7',
          stream: asg.stream || 'East',
          status,
          submittedDate: subDate,
          lockedBy
        });
      });
    });

    return list;
  }, [exams, subjectAssignments, grades, subjects, learners, savedMarks, submissionStatuses, selectedExamId]);

  // Filter by tag if selected
  const filteredSubmissions = computedSubmissionsList.filter(item => {
    if (examTagFilter === 'all') return true;
    return item.examName.toLowerCase().includes(examTagFilter.toLowerCase()) || item.examId === examTagFilter;
  });

  const submittedCount = filteredSubmissions.filter(i => i.status === 'Submitted' || i.status === 'Locked').length;
  const totalExpected = filteredSubmissions.length;
  const completionPercent = totalExpected > 0 ? Math.round((submittedCount / totalExpected) * 100) : 0;

  // Pending teachers yet to submit marks
  const pendingItems = filteredSubmissions.filter(i => i.status === 'Pending');

  // Toggle Lock/Unlock submission status
  const handleToggleLock = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Locked' ? 'Submitted' : 'Locked';
    const updated = submissionStatuses.filter(s => s.assignmentKey !== id);
    const targetItem = computedSubmissionsList.find(i => i.id === id);
    if (targetItem) {
      updated.push({
        examId: targetItem.examId,
        assignmentKey: id,
        status: nextStatus,
        submittedDate: targetItem.submittedDate,
        lockedBy: nextStatus === 'Locked' ? 'Administrator' : '—'
      });
    }
    setSubmissionStatuses(updated);
    secureSet('exam_submission_statuses', JSON.stringify(updated));
    triggerToast(`Submission status updated to ${nextStatus}`);
  };

  // Open specific assignment in score grid view
  const handleOpenGridView = (item: any) => {
    setSelectedExamId(item.examId);
    const matchedGrade = grades.find(g => g.name === item.grade);
    if (matchedGrade) {
      setSelectedGradeId(matchedGrade.id);
      setSelectedGradeName(matchedGrade.name);
    }
    setSelectedStreamId(item.stream === 'All Streams' ? 'all' : item.stream);
    setViewMode('grid');
    triggerToast(`Opened score grid for ${item.subject} (${item.grade} ${item.stream})`);
  };

  // Save changes to grid marks
  const handleSaveMarks = async () => {
    const activeExam = selectedExamId === 'all' ? (exams[0]?.id || '') : selectedExamId;
    if (!activeExam) {
      alert('⚠️ Please select an exam period first.');
      return;
    }

    const otherMarks = savedMarks.filter(m => m.examId !== activeExam);
    const newRecords: ExamMark[] = [];
    Object.entries(gridScores).forEach(([learnerId, subjectMap]) => {
      Object.entries(subjectMap).forEach(([key, score]) => {
        if (score !== '') {
          const [subjectCode, paperId] = key.split('_');
          newRecords.push({
            examId: activeExam,
            learnerId,
            subjectCode,
            paperId,
            score
          });
        }
      });
    });

    const combined = [...otherMarks, ...newRecords];
    setSavedMarks(combined);
    secureSet('school_exam_marks', JSON.stringify(combined));
    
    // Log audit action
    const user = getCurrentUser();
    await logTeacherAction(
      user?.id || 'unknown',
      user?.fullName || 'Unknown Teacher',
      'Saved Marks',
      { examId: activeExam, gradeId: selectedGradeId, count: newRecords.length }
    );
    
    triggerToast('All class scores saved successfully!');
  };

  const handleSimulateMarks = () => {
    const activeClassLearners = learners.filter(l => {
      const matchesGrade = l.gradeLabel === selectedGradeName || `Grade ${l.grade}` === selectedGradeName || l.grade === gradeNum;
      const matchesStream = selectedStreamId === 'all' || l.stream === selectedStreamId;
      return matchesGrade && matchesStream;
    });

    const updatedScores = { ...gridScores };
    const activeExam = selectedExamId === 'all' ? (exams[0]?.id || '') : selectedExamId;

    activeClassLearners.forEach(l => {
      if (!updatedScores[l.id]) updatedScores[l.id] = {};
      activeGradeSubjects.forEach(sub => {
        let hash = 0;
        const str = `${l.id}_${sub.code}_${activeExam}`;
        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const score = 55 + Math.abs(hash % 42);
        updatedScores[l.id][sub.code] = score;
      });
    });

    setGridScores(updatedScores);
    triggerToast('Generated realistic sample scores for visible subjects!');
  };

  const handleClearMarks = () => {
    if (confirm('⏳ Clear all entered marks for currently loaded learners?')) {
      const updatedScores = { ...gridScores };
      const activeClassLearners = learners.filter(l => {
        const matchesGrade = l.gradeLabel === selectedGradeName || `Grade ${l.grade}` === selectedGradeName || l.grade === gradeNum;
        const matchesStream = selectedStreamId === 'all' || l.stream === selectedStreamId;
        return matchesGrade && matchesStream;
      });
      activeClassLearners.forEach(l => {
        updatedScores[l.id] = {};
      });
      setGridScores(updatedScores);
      triggerToast('Scores cleared in memory. Remember to Save.');
    }
  };

  const handleToggleSubject = (code: string) => {
    if (visibleSubjects.includes(code)) {
      setVisibleSubjects(prev => prev.filter(c => c !== code));
    } else {
      setVisibleSubjects(prev => [...prev, code]);
    }
  };

  const activeClassLearners = learners.filter(l => {
    const matchesGrade = l.gradeLabel === selectedGradeName || `Grade ${l.grade}` === selectedGradeName || l.grade === gradeNum;
    const matchesStream = selectedStreamId === 'all' || l.stream === selectedStreamId;
    return matchesGrade && matchesStream;
  });

  const sortedClassLearners = [...activeClassLearners].sort((a, b) => {
    if (sortBy === 'adm') return a.admNo.localeCompare(b.admNo);
    return a.name.localeCompare(b.name);
  });

  const handleGridScoreChange = (learnerId: string, subjectCode: string, val: string, paperId?: string) => {
    const key = paperId ? `${subjectCode}_${paperId}` : subjectCode;
    if (val === '') {
      setGridScores(prev => ({
        ...prev,
        [learnerId]: { ...(prev[learnerId] || {}), [key]: '' }
      }));
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0 || num > 100) return;
    setGridScores(prev => ({
      ...prev,
      [learnerId]: { ...(prev[learnerId] || {}), [key]: num }
    }));
  };

  const handleScanBlanks = () => {
    const list = sortedClassLearners.filter(l => {
      return activeGradeSubjects
        .filter(sub => visibleSubjects.includes(sub.code))
        .some(sub => {
          const score = gridScores[l.id]?.[sub.code];
          return score === undefined || score === '';
        });
    });
    setBlankLearners(list);
    setScannedBlanks(true);
    setCheckedAbsentLearners(new Set(list.map(l => l.id)));
    triggerToast(`Found ${list.length} learners with missing marks.`);
  };

  const handleSaveAbsent = () => {
    if (checkedAbsentLearners.size === 0) {
      alert('⚠️ No learners selected.');
      return;
    }
    const updatedScores = { ...gridScores };
    let markedCount = 0;
    sortedClassLearners.forEach(l => {
      if (checkedAbsentLearners.has(l.id)) {
        if (!updatedScores[l.id]) updatedScores[l.id] = {};
        activeGradeSubjects
          .filter(sub => visibleSubjects.includes(sub.code))
          .forEach(sub => {
            const current = updatedScores[l.id][sub.code];
            if (current === undefined || current === '') {
              updatedScores[l.id][sub.code] = 0;
              markedCount++;
            }
          });
      }
    });
    setGridScores(updatedScores);
    const activeExam = selectedExamId === 'all' ? (exams[0]?.id || '') : selectedExamId;
    const otherMarks = savedMarks.filter(m => m.examId !== activeExam);
    const newRecords: ExamMark[] = [];
    Object.entries(updatedScores).forEach(([learnerId, subjectMap]) => {
      Object.entries(subjectMap).forEach(([subjectCode, score]) => {
        if (score !== '') {
          newRecords.push({ examId: activeExam, learnerId, subjectCode, score });
        }
      });
    });
    const combined = [...otherMarks, ...newRecords];
    setSavedMarks(combined);
    secureSet('school_exam_marks', JSON.stringify(combined));
    setBlankLearners([]);
    setScannedBlanks(false);
    setCheckedAbsentLearners(new Set());
    triggerToast(`Marked ${markedCount} blank fields as Absent (0) and saved!`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-slate-800">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl z-50 text-sm font-semibold flex items-center gap-2 animate-bounce">
          ✨ {toastMessage}
        </div>
      )}

      {/* Top Header & Navigation Switch */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-sm">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              Mark Submissions Overview
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Monitor teacher mark submissions, lock/unlock grade sheets, track pending entries, and enter scores.
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'overview'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Submissions Dashboard
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" /> Score Entry Grid
          </button>
        </div>
      </div>

      {viewMode === 'overview' ? (
        <div className="space-y-6">
          
          {/* Filter by Exam Tags */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-500" />
              Filter by Exam Period:
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setExamTagFilter('all')}
                className={`px-4 py-2 rounded-full text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  examTagFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Grid className="w-3.5 h-3.5" /> All Exams
              </button>
              {exams.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => setExamTagFilter(ex.id)}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                    examTagFilter === ex.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" /> {ex.examName || ex.name}
                </button>
              ))}
            </div>
          </div>

          {/* Submissions Overview Card with Progress Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Teacher Mark Submissions Status
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {submittedCount} of {totalExpected} submission(s) completed
                </p>
              </div>

              {/* Progress Bar & Percent */}
              <div className="flex items-center gap-4 w-full md:w-80">
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${completionPercent}%` }}
                  ></div>
                </div>
                <div className="text-sm font-black text-emerald-600 flex items-center gap-1 shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  {completionPercent}%
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4"><Users className="w-3.5 h-3.5 inline mr-1" /> Teacher</th>
                    <th className="py-3.5 px-4"><BookOpen className="w-3.5 h-3.5 inline mr-1" /> Subject</th>
                    <th className="py-3.5 px-4"><Award className="w-3.5 h-3.5 inline mr-1" /> Grade</th>
                    <th className="py-3.5 px-4"><Layers className="w-3.5 h-3.5 inline mr-1" /> Stream</th>
                    <th className="py-3.5 px-4"><Info className="w-3.5 h-3.5 inline mr-1" /> Status</th>
                    <th className="py-3.5 px-4"><Clock className="w-3.5 h-3.5 inline mr-1" /> Submitted Date</th>
                    <th className="py-3.5 px-4"><Lock className="w-3.5 h-3.5 inline mr-1" /> Locked By</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-700">No submissions found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">{item.teacher}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">{item.subject}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">{item.grade}</td>
                        <td className="py-3.5 px-4 font-semibold text-blue-700">
                          <span className="bg-blue-50 px-2 py-0.5 rounded-md text-[10px] font-extrabold">{item.stream}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-black inline-flex items-center gap-1.5 ${
                            item.status === 'Submitted' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'Locked'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {item.status === 'Submitted' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                            {item.status === 'Locked' && <Lock className="w-3 h-3 text-indigo-500" />}
                            {item.status === 'Pending' && <Clock className="w-3 h-3 text-amber-500" />}
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-semibold">{item.submittedDate}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-600">{item.lockedBy}</td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenGridView(item)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1"
                              title="View & Enter Marks"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            <button
                              onClick={() => handleToggleLock(item.id, item.status)}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1 ${
                                item.status === 'Locked'
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                              }`}
                              title={item.status === 'Locked' ? 'Unlock Submission' : 'Lock Submission'}
                            >
                              {item.status === 'Locked' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              {item.status === 'Locked' ? 'Unlock' : 'Lock'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Teachers Section */}
          <div className="bg-white rounded-2xl border border-rose-200 overflow-hidden shadow-sm">
            <div className="p-5 bg-gradient-to-r from-rose-50 to-white border-b border-rose-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-rose-800 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Teachers Yet to Submit Marks
              </h3>
              <span className="px-3 py-1 bg-rose-600 text-white rounded-full text-xs font-black shadow-xs">
                {pendingItems.length} Teacher(s) Pending
              </span>
            </div>

            <div className="p-5">
              {pendingItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <CheckSquare className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="font-extrabold text-slate-800 text-sm">All teachers have submitted their marks!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {pendingItems.map(p => (
                    <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-rose-300 transition">
                      <div className="space-y-0.5">
                        <div className="font-extrabold text-slate-900 text-xs">{p.teacher}</div>
                        <div className="text-[11px] text-slate-500 font-semibold">{p.subject} · {p.grade} ({p.stream})</div>
                      </div>
                      <button
                        onClick={() => handleOpenGridView(p)}
                        className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-black transition cursor-pointer shrink-0"
                      >
                        Enter Marks
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        /* Score Entry Grid View */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                Select Grade
              </label>
              <select
                value={selectedGradeId}
                onChange={(e) => setSelectedGradeId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer text-slate-800"
              >
                {grades.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                Select Stream
              </label>
              <select
                value={selectedStreamId}
                onChange={(e) => setSelectedStreamId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer text-slate-800"
              >
                <option value="all">All Streams</option>
                {selectedGradeObj?.streams?.map(stream => (
                  <option key={stream.id} value={stream.name}>{stream.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                Sort Learners By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'adm')}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer text-slate-800"
              >
                <option value="name">Full Name</option>
                <option value="adm">Admission Number</option>
              </select>
            </div>
          </div>

          {/* Subject Show/Hide Bar */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
              <Grid className="w-4 h-4 text-purple-500" />
              SHOW / HIDE SUBJECTS
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {activeGradeSubjects.map(sub => {
                const isVisible = visibleSubjects.includes(sub.code);
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleToggleSubject(sub.code)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                      isVisible
                        ? 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500 opacity-60'
                    }`}
                  >
                    {isVisible ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                    {sub.name}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4">
              <span className="text-xs text-slate-500 font-bold">{sortedClassLearners.length} learner(s) loaded</span>
              <div className="flex gap-2">
                <button
                  onClick={handleSimulateMarks}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Fill Sample Marks
                </button>
                <button
                  onClick={handleClearMarks}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            </div>
          </div>

          {/* Grid Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="p-4 text-left w-1/4">LEARNER NAME</th>
                    <th className="p-4 text-left w-32">ADM NO</th>
                    <th className="p-4 text-left w-32">STREAM</th>
                    {activeGradeSubjects
                      .filter(sub => visibleSubjects.includes(sub.code))
                      .map(sub => (
                        <th key={sub.id} className="p-4 text-center w-32">
                          {sub.name} / 100
                        </th>
                      ))}
                    <th className="p-4 text-center w-36">AVERAGE %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedClassLearners.map(learner => {
                    const visibleActiveSubjects = activeGradeSubjects.filter(sub => visibleSubjects.includes(sub.code));
                    const subjectScores = visibleActiveSubjects.map(sub => {
                      return gridScores[learner.id]?.[sub.code] ?? '';
                    }).filter(s => s !== '');
                    const avg = subjectScores.length > 0
                      ? Math.round(subjectScores.reduce((sum, s) => sum + (s as number), 0) / subjectScores.length)
                      : null;

                    return (
                      <tr key={learner.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 text-sm font-black text-slate-800">{learner.name}</td>
                        <td className="p-4 text-xs font-bold text-slate-500 font-mono">{learner.admNo}</td>
                        <td className="p-4 text-xs font-bold text-slate-500">
                          <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase">
                            {learner.stream || 'Main'}
                          </span>
                        </td>
                        {visibleActiveSubjects.map(sub => {
                          const currentScore = gridScores[learner.id]?.[sub.code] ?? '';
                          return (
                            <td key={sub.id} className="p-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={currentScore}
                                onChange={(e) => handleGridScoreChange(learner.id, sub.code, e.target.value)}
                                placeholder="—"
                                className="w-20 p-2 border border-slate-200 rounded-xl text-center text-sm font-extrabold bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </td>
                          );
                        })}
                        <td className="p-4 text-center">
                          {avg !== null ? (
                            <span className="px-2.5 py-1 rounded-lg font-black text-xs bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {avg}%
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-bold">Remember to save all changes to persistence.</span>
              <button
                onClick={handleSaveMarks}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-extrabold text-sm flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" /> Save All Marks
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
