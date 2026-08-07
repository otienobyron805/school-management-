import React, { useState, useEffect, useMemo } from 'react';
import { secureGet, secureSet, getSubjectPapers, getSubjects, SubjectPaper, Subject } from '../utils/db';

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
  const [marks, setMarks] = useState<Record<string, MarkEntryRecord>>({});
  const [subjectPapers, setSubjectPapers] = useState<SubjectPaper[]>([]);
  const [dbSubjects, setDbSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState('');

  // Fallback default subject list
  const DEFAULT_SUBJECTS = [
    { code: 'MATHEMATICS', name: 'Mathematics' },
    { code: 'ENGLISH', name: 'English' },
    { code: 'KISWAHILI', name: 'Kiswahili' },
    { code: 'SCIENCE', name: 'Science and Technology' },
    { code: 'INTEGRATED', name: 'Integrated Science' },
    { code: 'AGRICULTURE', name: 'Agriculture and Nutrition' },
    { code: 'CREATIVE', name: 'Creative Art and Sports' },
    { code: 'PRETECH', name: 'Pretechnical Studies' },
    { code: 'CRE', name: 'CRE' },
    { code: 'SOCIAL', name: 'Social Studies' },
    { code: 'FRENCH', name: 'French' },
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

  // Load baseline DB values
  useEffect(() => {
    loadFromCloud();
  }, [selectedSubject]);

  const loadFromCloud = async () => {
    setLoading(true);
    setSavedMsg('');
    try {
      const rawLearners = secureGet('learners');
      const allLearners: Learner[] = rawLearners ? JSON.parse(rawLearners) : [];

      const rawMarks = secureGet('marks');
      const savedMarksData: Record<string, MarkEntryRecord> = rawMarks ? JSON.parse(rawMarks) : {};

      const loadedPapers = getSubjectPapers();
      const loadedDbSubjects = getSubjects();

      setLearners(allLearners);
      setMarks(savedMarksData);
      setSubjectPapers(loadedPapers);
      setDbSubjects(loadedDbSubjects);

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

  // Find subject papers matching the currently selected subject
  const activeSubjectPapers = useMemo(() => {
    const matchedSubjectObj = dbSubjects.find(s => 
      s.code?.toUpperCase() === selectedSubject.toUpperCase() || 
      s.name?.toLowerCase() === selectedSubject.toLowerCase() ||
      (s as any).id === selectedSubject
    );

    return subjectPapers.filter(paper => {
      const pSubId = (paper.subjectId || '').toLowerCase();
      const pSubName = (paper as any).subjectName?.toLowerCase();

      if (matchedSubjectObj) {
        if (pSubId === matchedSubjectObj.id.toLowerCase()) return true;
        if (pSubId === matchedSubjectObj.name.toLowerCase()) return true;
        if (pSubId === matchedSubjectObj.code?.toLowerCase()) return true;
      }
      return pSubId === selectedSubject.toLowerCase() || 
             (pSubName && pSubName === selectedSubject.toLowerCase());
    });
  }, [subjectPapers, selectedSubject, dbSubjects]);

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

      // Auto-compute total score from all active papers for this subject
      const totalWeight = activeSubjectPapers.reduce((acc, p) => acc + (p.weight || 0), 0) || 100;
      let computedTotal = 0;
      let hasAnyPaperMark = false;

      activeSubjectPapers.forEach(paper => {
        const key = `${learnerId}-${selectedSubject}-paper-${paper.id}`;
        const pRecord = updated[key];
        if (pRecord && pRecord.mark !== null && !isNaN(pRecord.mark)) {
          hasAnyPaperMark = true;
          const weightFactor = (paper.weight || (100 / activeSubjectPapers.length)) / totalWeight;
          computedTotal += pRecord.mark * weightFactor;
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
                {activeSubjectPapers.map(p => `${p.name} (${p.weight}%)`).join(' + ')}
              </span>
            </div>
            <span className="text-[11px] text-blue-700 font-semibold italic">
              ✨ Enter marks per paper — total subject mark auto-calculates weighted score.
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 font-medium italic">
            Single-paper evaluation configured for this learning area.
          </div>
        )}

        {/* ===== STATUS MESSAGE ===== */}
        <div className="text-xs font-semibold pt-1 flex items-center justify-between flex-wrap gap-2">
          {registeredLearners.length > 0 ? (
            <p className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
              ✅ <strong>{registeredLearners.length}</strong> learner(s) registered for this subject — ready for mark entry
            </p>
          ) : (
            <p className="text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
              ⚠️ No registered learners found for this subject. Displaying default roster.
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
      {registeredLearners.length > 0 ? (
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
                          {paper.name} ({paper.weight}%)
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
                {registeredLearners.map((learner: Learner) => {
                  const mainMarkKey = `${learner.id}-${selectedSubject}`;
                  const mainRecord = marks[mainMarkKey];

                  return (
                    <tr key={learner.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-slate-900">{learner.name}</td>
                      <td className="px-5 py-3 text-slate-600 font-mono text-xs">{learner.admNo}</td>
                      <td className="px-5 py-3 text-slate-600 font-medium">{learner.stream || 'A'}</td>

                      {/* If papers are configured, render an input for each paper */}
                      {activeSubjectPapers.length > 0 ? (
                        <>
                          {activeSubjectPapers.map(paper => {
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
                                  className={`w-24 px-3 py-1.5 border-2 rounded-xl text-center font-bold text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                                    isInvalid 
                                      ? 'border-red-500 bg-red-50 ring-2 ring-red-500/20' 
                                      : 'border-slate-200 focus:border-blue-600 focus:ring-blue-500/20 bg-white'
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
                            className={`w-24 px-3 py-1.5 border-2 rounded-xl text-center font-bold text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                              mainRecord?.rawInput && (isNaN(Number(mainRecord.rawInput)) || Number(mainRecord.rawInput) < 0 || Number(mainRecord.rawInput) > 100)
                                ? 'border-red-500 bg-red-50 ring-2 ring-red-500/20' 
                                : 'border-slate-200 focus:border-blue-600 focus:ring-blue-500/20'
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

