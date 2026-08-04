import React, { useState, useEffect } from 'react';
import { secureGet, secureSet, sortSubjects } from '../utils/db';

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
  mark: number | null;
}

// ===== FULL MARK ENTRY COMPONENT =====
const MarkEntry: React.FC = () => {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [registeredLearners, setRegisteredLearners] = useState<Learner[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('MATHEMATICS');
  const [marks, setMarks] = useState<Record<string, MarkEntryRecord>>({});
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState('');

  // ✅ CHRONOLOGICAL SUBJECT ORDERING:
  // 1. Mathematics, 2. English, 3. Kiswahili, 4. Science and Technology,
  // 5. Integrated Science, 6. Agriculture and Nutrition, 7. Creative Art and Sports,
  // 8. Pretechnical Studies, 9. CRE, 10. Social Studies, 11. French
  const SUBJECTS = [
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

  // ✅ LOAD FROM MONGODB / CLOUD + FILTER REGISTERED LEARNERS
  useEffect(() => {
    loadFromCloud();
  }, [selectedSubject]);

  const loadFromCloud = async () => {
    setLoading(true);
    setSavedMsg('');
    try {
      // ✅ READ ALL LEARNERS FROM CLOUD
      const rawLearners = secureGet('learners');
      const allLearners: Learner[] = rawLearners ? JSON.parse(rawLearners) : [];

      // ✅ READ SAVED MARKS FROM CLOUD
      const rawMarks = secureGet('marks');
      const savedMarksData: Record<string, MarkEntryRecord> = rawMarks ? JSON.parse(rawMarks) : {};

      setLearners(allLearners);
      setMarks(savedMarksData);

      // ✅ SHOW ONLY LEARNERS REGISTERED FOR THIS SUBJECT OR ALL LEARNERS IF UNFILTERED
      const currentSubjectObj = SUBJECTS.find(s => s.code === selectedSubject);
      const subjectNameLower = currentSubjectObj ? currentSubjectObj.name.toLowerCase() : '';

      const onlyRegistered = allLearners.filter((learner: Learner) => {
        if (!learner.linkedSubjects || !Array.isArray(learner.linkedSubjects) || learner.linkedSubjects.length === 0) {
          return true; // default include learner if no specific linked filter configured
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

  // ✅ UPDATE MARK AS USER TYPES
  const handleMarkChange = (learnerId: string, inputValue: string) => {
    const value = inputValue.trim() === '' ? null : Math.min(100, Math.max(0, Number(inputValue)));
    const markKey = `${learnerId}-${selectedSubject}`;

    setMarks(prev => ({
      ...prev,
      [markKey]: {
        learnerId,
        subject: selectedSubject,
        mark: value,
      },
    }));
  };

  // ✅ SAVE ALL MARKS TO MONGODB / CLOUD
  const saveAllToCloud = async () => {
    try {
      secureSet('marks', JSON.stringify(marks));
      setSavedMsg('✅ All marks saved to Cloud!');
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
              {SUBJECTS.find(s => s.code === selectedSubject)?.name}
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
                  <th className="px-5 py-3.5 text-center">Mark / 100</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registeredLearners.map((learner: Learner) => {
                  const markKey = `${learner.id}-${selectedSubject}`;
                  const currentMark = marks[markKey]?.mark ?? '';

                  return (
                    <tr key={learner.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-5 py-3 font-semibold text-slate-900">{learner.name}</td>
                      <td className="px-5 py-3 text-slate-600 font-mono text-xs">{learner.admNo}</td>
                      <td className="px-5 py-3 text-slate-600 font-medium">{learner.stream || 'A'}</td>
                      <td className="px-5 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={currentMark}
                          onChange={(e) => handleMarkChange(learner.id, e.target.value)}
                          className="w-24 px-3 py-1.5 border-2 border-slate-200 focus:border-blue-600 rounded-xl text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                          placeholder="—"
                        />
                      </td>
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
          <p className="font-bold">No registered learners found for {SUBJECTS.find(s => s.code === selectedSubject)?.name}.</p>
          <p className="text-xs">Add or link learners to this subject in the Subjects / Learners section.</p>
        </div>
      )}
    </div>
  );
};

export default MarkEntry;
