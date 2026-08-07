import React, { useState, useEffect, useMemo } from 'react';
import { secureGet, secureSet, getSubjectPapers, getSubjects, getGrades, logActivity, getCurrentUser, getGradingRules, SubjectPaper, Subject, Grade, GradingRule, isGradeMatch } from '../utils/db';

// ===== DATA TYPES =====
interface Learner {
  id: string;
  name: string;
  admNo: string;
  grade: string;
  stream: string;
  linkedSubjects: string[]; // Must have subject code/name here to appear
}

interface MarkEntryRecord {
  learnerId: string;
  subject: string;
  paperId?: string;
  mark: number | null;
  rawInput: string;
}

// ===== FULL MARK ENTRY COMPONENT =====
const MarkEntry: React.FC = () => {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [registeredLearners, setRegisteredLearners] = useState<Learner[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('ENGLISH');
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  const [marks, setMarks] = useState<Record<string, MarkEntryRecord>>({});
  const [subjectPapers, setSubjectPapers] = useState<SubjectPaper[]>([]);
  const [dbSubjects, setDbSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState('');
  
  const [gradingRules, setGradingRules] = useState<GradingRule[]>(() => getGradingRules());

  useEffect(() => {
    const handleUpdate = () => {
      setGradingRules(getGradingRules());
    };
    window.addEventListener('db_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('db_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const getScoreStyles = (score: number | null) => {
    if (score === null) return 'border-slate-200 bg-white';
    const rule = gradingRules.find(r => score >= r.min && score <= r.max);
    if (!rule) return 'border-slate-200 bg-white';
    
    switch (rule.category) {
      case 'ee': return 'border-emerald-500 bg-emerald-50 text-emerald-900';
      case 'me': return 'border-blue-500 bg-blue-50 text-blue-900';
      case 'ae': return 'border-amber-500 bg-amber-50 text-amber-900';
      case 'be': return 'border-rose-500 bg-rose-50 text-rose-900';
      default: return 'border-slate-500 bg-slate-50 text-slate-900';
    }
  };

  // Fallback default subject list
  const DEFAULT_SUBJECTS: Array<{ code: string; name: string; id: string }> = [
    { code: 'MATHEMATICS', name: 'Mathematics', id: 'def_mat' },
    { code: 'ENGLISH', name: 'English', id: 'def_eng' },
    { code: 'KISWAHILI', name: 'Kiswahili', id: 'def_kis' },
    { code: 'SCIENCE', name: 'Science and Technology', id: 'def_sci' },
    { code: 'INTEGRATED', name: 'Integrated Science', id: 'def_int' },
    { code: 'AGRICULTURE', name: 'Agriculture and Nutrition', id: 'def_agr' },
    { code: 'CREATIVE', name: 'Creative Art and Sports', id: 'def_cre' },
    { code: 'PRETECH', name: 'Pretechnical Studies', id: 'def_pre' },
    { code: 'CRE', name: 'CRE', id: 'def_cre2' },
    { code: 'SOCIAL', name: 'Social Studies', id: 'def_soc' },
    { code: 'FRENCH', name: 'French', id: 'def_fre' },
  ];

  // Combined subject list from db and defaults
  const SUBJECTS = useMemo(() => {
    if (dbSubjects.length > 0) {
      const list = dbSubjects.map(s => ({ code: s.code || s.name.toUpperCase(), name: s.name, id: s.id }));
      // ensure English and Mathematics are included
      DEFAULT_SUBJECTS.forEach(def => {
        if (!list.some(s => s.code.toUpperCase() === def.code.toUpperCase() || s.name.toLowerCase() === def.name.toLowerCase())) {
          list.push(def);
        }
      });
      return list;
    }
    return DEFAULT_SUBJECTS;
  }, [dbSubjects]);

  // Listen for real-time DB changes (e.g. paper setup changes in Exam Setup)
  useEffect(() => {
    const handleDbUpdated = () => {
      setSubjectPapers(getSubjectPapers());
    };
    window.addEventListener('db_updated', handleDbUpdated);
    window.addEventListener('storage', handleDbUpdated);
    return () => {
      window.removeEventListener('db_updated', handleDbUpdated);
      window.removeEventListener('storage', handleDbUpdated);
    };
  }, []);

  // Load baseline DB values
  useEffect(() => {
    loadFromCloud();
  }, [selectedSubject, selectedExamId]);

  const loadFromCloud = async () => {
    setLoading(true);
    setSavedMsg('');
    try {
      const rawLearners = secureGet('learners');
      const allLearners: Learner[] = rawLearners ? JSON.parse(rawLearners) : [];

      const rawExams = secureGet('exams');
      const loadedExams = rawExams ? JSON.parse(rawExams) : [];
      setExams(loadedExams);

      if (loadedExams.length > 0 && selectedExamId === 'all') {
        setSelectedExamId(loadedExams[0].id);
      }

      const rawMarks = secureGet('marks');
      const savedMarksData: Record<string, MarkEntryRecord> = rawMarks ? JSON.parse(rawMarks) : {};

      const loadedPapers = getSubjectPapers();
      const loadedDbSubjects = getSubjects();
      const loadedGrades = getGrades();

      setLearners(allLearners);
      setMarks(savedMarksData);
      setSubjectPapers(loadedPapers);
      setDbSubjects(loadedDbSubjects);
      setGrades(loadedGrades);

      const currentSubjectObj = SUBJECTS.find(s => s.code === selectedSubject || s.name.toLowerCase() === selectedSubject.toLowerCase());
      const subjectNameLower = currentSubjectObj ? currentSubjectObj.name.toLowerCase() : selectedSubject.toLowerCase();

      const onlyRegistered = allLearners.filter((learner: Learner) => {
        if (!learner.linkedSubjects || !Array.isArray(learner.linkedSubjects) || learner.linkedSubjects.length === 0) {
          return true;
        }
        return learner.linkedSubjects.some(sub => 
          sub === selectedSubject || 
          sub.toLowerCase().includes(selectedSubject.toLowerCase()) ||
          (subjectNameLower && sub.toLowerCase().includes(subjectNameLower))
        );
      });

      setRegisteredLearners(onlyRegistered);
    } catch (err) {
      console.error('❌ Load error:', err);
    }
    setLoading(false);
  };

  // Filter displayed learners by selected Grade
  const displayedLearners = useMemo(() => {
    if (selectedGrade === 'all') return registeredLearners;
    const selLower = selectedGrade.toLowerCase();
    return registeredLearners.filter(l => {
      const lGradeStr = (l.grade || '').toString().toLowerCase();
      return lGradeStr === selLower || 
             `grade ${lGradeStr}` === selLower || 
             selLower === `grade ${lGradeStr}` ||
             selLower.includes(lGradeStr);
    });
  }, [registeredLearners, selectedGrade]);

  // Find subject papers matching the currently selected subject and grade
  const activeSubjectPapers = useMemo(() => {
    const selectedSubLower = selectedSubject.trim().toLowerCase();
    
    const matchedSubjectObj = dbSubjects.find(s => 
      s.code?.toLowerCase() === selectedSubLower || 
      s.name?.toLowerCase() === selectedSubLower ||
      (s as any).id?.toLowerCase() === selectedSubLower
    ) || SUBJECTS.find(s => s.code.toLowerCase() === selectedSubLower || s.name.toLowerCase() === selectedSubLower);

    return subjectPapers.filter(paper => {
      const pSubId = (paper.subjectId || '').toLowerCase();
      const pSubName = ((paper as any).subjectName || '').toLowerCase();
      const pSubCode = ((paper as any).subjectCode || '').toLowerCase();

      let matchesSub = false;
      if (pSubId === selectedSubLower || pSubName === selectedSubLower || pSubCode === selectedSubLower) {
        matchesSub = true;
      } else if (matchedSubjectObj) {
        const mId = (matchedSubjectObj.id || '').toLowerCase();
        const mName = (matchedSubjectObj.name || '').toLowerCase();
        const mCode = ((matchedSubjectObj as any).code || '').toLowerCase();

        if (mId && pSubId === mId) matchesSub = true;
        if (mName && (pSubId === mName || pSubName === mName)) matchesSub = true;
        if (mCode && (pSubId === mCode || pSubCode === mCode)) matchesSub = true;
      }

      if (!matchesSub) return false;

      // Grade check
      if (selectedGrade !== 'all') {
        return paper.grade ? isGradeMatch(paper.grade, selectedGrade) : false;
      }

      if (paper.grade && displayedLearners.length > 0) {
        return displayedLearners.some(l => isGradeMatch(paper.grade, l.grade));
      }

      return false;
    });
  }, [subjectPapers, selectedSubject, dbSubjects, SUBJECTS, selectedGrade, displayedLearners]);

  // Handle single paper mark change and re-calculate subject total automatically
  const handlePaperMarkChange = (learnerId: string, paperId: string, inputValue: string) => {
    const numValue = Number(inputValue);
    const isNumeric = inputValue.trim() !== '' && !isNaN(numValue);
    const isValidRange = isNumeric && numValue >= 0 && numValue <= 100;

    const paperMarkKey = `${learnerId}-${selectedSubject}-paper-${paperId}`;

    setMarks(prev => {
      const updated = {
        ...prev,
        [paperMarkKey]: {
          learnerId,
          subject: selectedSubject,
          paperId,
          mark: isNumeric && isValidRange ? numValue : null,
          rawInput: inputValue
        }
      };

      // Auto-compute total score from direct sum of all active papers for this subject
      let computedTotal = 0;
      let hasAnyPaperMark = false;

      activeSubjectPapers.forEach(paper => {
        const key = `${learnerId}-${selectedSubject}-paper-${paper.id}`;
        const pRecord = updated[key];
        if (pRecord && pRecord.mark !== null && !isNaN(pRecord.mark)) {
          hasAnyPaperMark = true;
          computedTotal += pRecord.mark;
        }
      });

      const totalMarkKey = `${learnerId}-${selectedSubject}`;
      const finalTotalScore = hasAnyPaperMark ? Math.round(computedTotal) : null;

      updated[totalMarkKey] = {
        learnerId,
        subject: selectedSubject,
        mark: finalTotalScore,
        rawInput: finalTotalScore !== null ? String(finalTotalScore) : ''
      };

      return updated;
    });
  };

  // Handle direct subject mark change (when subject has no papers)
  const handleMarkChange = (learnerId: string, inputValue: string) => {
    const numValue = Number(inputValue);
    const isNumeric = inputValue.trim() !== '' && !isNaN(numValue);
    const isValidRange = isNumeric && numValue >= 0 && numValue <= 100;
    
    const markKey = `${learnerId}-${selectedSubject}`;

    setMarks(prev => ({
      ...prev,
      [markKey]: {
        learnerId,
        subject: selectedSubject,
        mark: isNumeric && isValidRange ? numValue : null,
        rawInput: inputValue
      },
    }));
  };

  // Save all marks to Cloud
  const saveAllToCloud = async () => {
    try {
      secureSet('marks', JSON.stringify(marks));
      
      // Convert marks to school_exam_marks format for full-system integration
      const activeExam = selectedExamId === 'all' ? (exams[0]?.id || 'exam_1') : selectedExamId;
      const existingExamMarksStr = secureGet('school_exam_marks');
      const existingExamMarks: any[] = existingExamMarksStr ? JSON.parse(existingExamMarksStr) : [];
      
      const otherExamMarks = existingExamMarks.filter(m => m.examId !== activeExam);
      const convertedMarks: any[] = [];

      Object.entries(marks).forEach(([key, record]) => {
        if (record.mark !== null && !isNaN(record.mark)) {
          const subCode = selectedSubjectObj?.code || selectedSubject;
          convertedMarks.push({
            examId: activeExam,
            learnerId: record.learnerId,
            subjectCode: subCode,
            paperId: record.paperId,
            score: record.mark
          });
        }
      });

      const updatedSchoolExamMarks = [...otherExamMarks, ...convertedMarks];
      secureSet('school_exam_marks', JSON.stringify(updatedSchoolExamMarks));

      const currentUser = getCurrentUser();
      await logActivity('general_change', `Saved ${convertedMarks.length} subject/paper mark records`, currentUser?.fullName || 'Teacher');

      setSavedMsg('✅ All paper & subject marks saved to Cloud!');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) {
      alert('❌ Save failed! Try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-600 font-semibold flex flex-col items-center justify-center gap-2">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading Cloud Marks Database...</span>
      </div>
    );
  }

  const selectedSubjectObj = SUBJECTS.find(s => s.code === selectedSubject || s.name.toLowerCase() === selectedSubject.toLowerCase());

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      {/* ===== PAGE HEADER ===== */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>📝</span> Enter Marks
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Selected Learning Area / Subject:{' '}
              <strong className="text-blue-600 font-bold">
                {selectedSubjectObj?.name || selectedSubject}
              </strong>
            </p>
          </div>

          {/* Grade & Exam Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {grades.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider pl-2">Grade / Class:</span>
                <select 
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="bg-white text-xs font-bold text-slate-800 p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Grades / Classes</option>
                  {grades.map(g => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}

            {exams.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider pl-2">Exam:</span>
                <select 
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="bg-white text-xs font-bold text-slate-800 p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.id}>
                      {ex.examName || ex.name} ({ex.term || 'Term 1'} {ex.academicYear || ex.year || '2026'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ===== CHRONOLOGICAL SUBJECT SELECTOR TABS ===== */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {SUBJECTS.map((subj, idx) => (
            <button
              key={subj.code}
              onClick={() => setSelectedSubject(subj.code)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedSubject === subj.code
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-102'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/60'
              }`}
            >
              <span className="opacity-60 font-mono text-[10px]">{idx + 1}.</span>
              <span>{subj.name}</span>
            </button>
          ))}
        </div>

        {/* ===== PAPER BREAKDOWN BANNER ===== */}
        {activeSubjectPapers.length > 0 ? (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900 font-medium">
            <div className="flex items-center gap-2">
              <span className="font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] uppercase">
                {activeSubjectPapers.length} Papers Configured
              </span>
              <span>
                {activeSubjectPapers.map(p => `${p.name}${p.grade ? ` (${p.grade})` : ''}`).join(' + ')}
              </span>
            </div>
            <span className="text-[11px] text-blue-700 font-semibold italic">
              ✨ Enter marks per paper — total subject mark auto-calculates as direct sum (Paper 1 + Paper 2).
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 font-medium italic">
            Single-paper evaluation configured for this learning area.
          </div>
        )}

        {/* ===== STATUS MESSAGE ===== */}
        <div className="text-xs font-semibold pt-1 flex items-center justify-between flex-wrap gap-2">
          {displayedLearners.length > 0 ? (
            <p className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
              ✅ <strong>{displayedLearners.length}</strong> learner(s) registered for this subject — ready for mark entry
            </p>
          ) : (
            <p className="text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
              ⚠️ No registered learners found for this subject/grade selection.
            </p>
          )}
          {savedMsg && (
            <p className="text-emerald-700 bg-emerald-100 font-bold px-3 py-1.5 rounded-lg animate-pulse">
              {savedMsg}
            </p>
          )}
        </div>
      </div>

      {/* ===== MARK ENTRY TABLE ===== */}
      {displayedLearners.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-900 text-white text-xs font-black uppercase tracking-wider">
                  <th className="px-5 py-3.5">Learner Name</th>
                  <th className="px-5 py-3.5">Adm No</th>
                  <th className="px-5 py-3.5">Stream</th>

                  {/* Render Columns for Papers if configured */}
                  {activeSubjectPapers.length > 0 ? (
                    <>
                      {activeSubjectPapers.map(paper => (
                        <th key={paper.id} className="px-5 py-3.5 text-center bg-blue-950 text-blue-200 border-x border-blue-900/50">
                          {paper.name}
                        </th>
                      ))}
                      <th className="px-5 py-3.5 text-center bg-indigo-950 text-amber-300 font-black">
                        Total / 100
                      </th>
                    </>
                  ) : (
                    <th className="px-5 py-3.5 text-center">Mark / 100</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedLearners.map((learner: Learner) => {
                  const mainMarkKey = `${learner.id}-${selectedSubject}`;
                  const mainRecord = marks[mainMarkKey];

                  const learnerPapers = activeSubjectPapers.filter(p => !p.grade || isGradeMatch(p.grade, learner.grade));
                  const hasPapers = learnerPapers.length > 0;

                  return (
                    <tr key={learner.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-slate-900">{learner.name}</td>
                      <td className="px-5 py-3 text-slate-600 font-mono text-xs">{learner.admNo}</td>
                      <td className="px-5 py-3 text-slate-600 font-medium">{learner.stream || 'A'}</td>

                      {/* If papers are configured for this learner's grade, render an input for each paper */}
                      {hasPapers ? (
                        <>
                          {learnerPapers.map(paper => {
                            const pKey = `${learner.id}-${selectedSubject}-paper-${paper.id}`;
                            const pRecord = marks[pKey];
                            const pRaw = pRecord?.rawInput ?? '';

                            const pNum = Number(pRaw);
                            const isInvalid = pRaw !== '' && (isNaN(pNum) || pNum < 0 || pNum > 100);

                            return (
                              <td key={paper.id} className="px-4 py-3 text-center border-x border-slate-100 bg-blue-50/20">
                                <input
                                  type="text"
                                  value={pRaw}
                                  onChange={(e) => handlePaperMarkChange(learner.id, paper.id, e.target.value)}
                                  className={`w-24 px-3 py-1.5 border-2 rounded-xl text-center font-bold transition-all ${
                                    isInvalid 
                                      ? 'border-red-500 bg-red-50 ring-2 ring-red-500/20' 
                                      : `${getScoreStyles(pNum)} focus:ring-2 focus:ring-blue-500/20`
                                  }`}
                                  placeholder="—"
                                />
                              </td>
                            );
                          })}

                          {/* Calculated Total Column */}
                          <td className="px-5 py-3 text-center bg-indigo-50/40">
                            {mainRecord?.mark !== null && mainRecord?.mark !== undefined ? (
                              <span className="px-3 py-1.5 bg-indigo-600 text-white font-extrabold rounded-xl text-xs shadow-xs inline-block">
                                {mainRecord.mark}%
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium text-xs">—</span>
                            )}
                          </td>
                        </>
                      ) : (
                        /* Single subject mark input when no papers exist */
                        <td className="px-5 py-3 text-center">
                          <input
                            type="text"
                            value={mainRecord?.rawInput ?? ''}
                            onChange={(e) => handleMarkChange(learner.id, e.target.value)}
                            className={`w-24 px-3 py-1.5 border-2 rounded-xl text-center font-bold transition-all ${
                              mainRecord?.rawInput && (isNaN(Number(mainRecord.rawInput)) || Number(mainRecord.rawInput) < 0 || Number(mainRecord.rawInput) > 100)
                                ? 'border-red-500 bg-red-50 ring-2 ring-red-500/20' 
                                : `${getScoreStyles(mainRecord?.mark ?? null)} focus:ring-2 focus:ring-blue-500/20`
                            }`}
                            placeholder="—"
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ===== ACTION BUTTONS ===== */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-3">
            <button
              onClick={saveAllToCloud}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-2"
            >
              <span>💾</span> Save All Marks to Cloud
            </button>
            <button
              onClick={loadFromCloud}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold transition cursor-pointer flex items-center gap-2"
            >
              <span>🔄</span> Refresh from Cloud
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 space-y-2">
          <p className="font-bold">No registered learners found for {selectedSubjectObj?.name || selectedSubject}.</p>
          <p className="text-xs">Add or link learners to this subject in the Subjects / Learners section.</p>
        </div>
      )}
    </div>
  );
};

export default MarkEntry;

