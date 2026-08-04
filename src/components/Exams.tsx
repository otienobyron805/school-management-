import React, { useState, useEffect } from 'react';
import { Trash2, Pencil, Award, ClipboardList } from 'lucide-react';
import { secureGet, secureSet, deleteRecord, saveToBackend } from '../utils/db';
import { canDelete } from '../utils/permissions';
import KJSEAClassificationComponent from './KJSEAClassificationComponent';

interface Exam {
  id: string;
  name?: string;
  examName?: string;
  year?: string;
  academicYear?: string;
  term: string;
  subjects?: number;
  created?: string;
  examDate?: string;
}

interface ExamsProps {
  setActiveView: (view: string) => void;
  initialTab?: 'all' | 'kjsea';
}

const Exams: React.FC<ExamsProps> = ({ setActiveView, initialTab = 'all' }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'kjsea'>(initialTab);
  const [exams, setExams] = useState<Exam[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [newExamYear, setNewExamYear] = useState('2026');
  const [newExamTerm, setNewExamTerm] = useState('Term 1');

  const refreshExams = () => {
    const stored = secureGet('exams');
    if (stored) {
      setExams(JSON.parse(stored));
    } else {
      setExams([]);
    }
  };

  // Load from secure db and listen to live sync updates
  useEffect(() => {
    refreshExams();
    window.addEventListener('storage', refreshExams);
    return () => window.removeEventListener('storage', refreshExams);
  }, []);

  const addExam = () => {
    if (!newExamName) return;
    const newExam: Exam = {
      id: Date.now().toString(),
      examName: newExamName,
      name: newExamName,
      academicYear: newExamYear,
      year: newExamYear,
      term: newExamTerm,
      subjects: 0,
      created: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    const updated = [...exams, newExam];
    setExams(updated);
    secureSet('exams', JSON.stringify(updated));
    saveToBackend('exams', updated);
    setNewExamName('');
    setIsModalOpen(false);
  };

  const deleteExam = (id: string) => {
    if (!canDelete()) {
      alert('⚠️ Access denied: You have a restriction ("cannot delete") preventing you from deleting items in this software.');
      return;
    }
    const updated = deleteRecord<Exam>('exams', id, 'Exam');
    setExams(updated);
  };

  const navigateToTrash = () => {
    // This assumes the Trash component is available and mapped in App.tsx
    // The App component has a 'setActiveView' function. Since Exams is a child of App (rendered via renderContent), 
    // it doesn't have direct access to setActiveView. 
    // However, the menu items use it. Let's see if we can pass it as a prop?
    // Looking at App.tsx, Exams is imported but not passed any props.
    // I will add a prop for it.
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER WITH TABS */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between p-8 border-b border-slate-100 gap-4">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Examinations</h3>
            <p className="text-sm text-slate-500 font-semibold mt-1">Manage assessments and KJSEA learner point classifications.</p>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={() => setActiveView('Trash')} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition cursor-pointer active:scale-95">
              🗑️ Trash
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-sm shadow-blue-600/20 active:scale-95 cursor-pointer"
            >
              ➕ New Exam
            </button>
          </div>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="flex gap-2 p-3 bg-slate-50 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>All Examinations</span>
          </button>
          <button
            onClick={() => setActiveTab('kjsea')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'kjsea'
                ? 'bg-white text-indigo-600 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4 text-indigo-600" />
            <span>KJSEA Total Point Classification</span>
          </button>
        </div>

        {/* TAB CONTENT: ALL EXAMS */}
        {activeTab === 'all' && (
          <div className="p-2 overflow-x-auto">
            {/* TABLE HEADINGS */}
            <div className="grid grid-cols-6 gap-4 p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 min-w-[700px]">
              <div>Exam Name</div>
              <div>Year</div>
              <div>Term</div>
              <div>Subjects</div>
              <div>Created</div>
              <div className="text-center">Actions</div>
            </div>

            {/* EXAM ROWS OR EMPTY STATE */}
            {exams.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <div className="text-6xl mb-4 opacity-20">📝</div>
                <p className="text-sm font-bold text-slate-700 mb-1">No examinations created yet</p>
                <span className="text-xs font-semibold">Click "New Exam" to begin.</span>
              </div>
            ) : (
              exams.map(exam => (
                <div key={exam.id} className="grid grid-cols-6 gap-4 p-4 text-sm text-slate-700 border-b border-slate-50 min-w-[700px] items-center hover:bg-slate-50 transition">
                  <div className="font-bold text-slate-900">{exam.examName || exam.name}</div>
                  <div className="font-mono text-xs text-slate-500">{exam.academicYear || exam.year}</div>
                  <div><span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">{exam.term}</span></div>
                  <div className="text-emerald-600 font-black text-xs">{exam.subjects || 0} subjects</div>
                  <div className="text-xs text-slate-500 font-mono">{exam.examDate || exam.created}</div>
                  <div className="flex justify-center gap-2">
                     <button className="text-xs bg-slate-100 p-2 rounded-lg text-slate-600 hover:bg-slate-200 active:scale-90 transition">
                        <Pencil size={14} />
                     </button>
                     {canDelete() && (
                       <button onClick={() => deleteExam(exam.id)} className="text-xs bg-red-50 p-2 rounded-lg text-red-600 hover:bg-red-100 active:scale-90 transition">
                          <Trash2 size={14} />
                       </button>
                     )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* TAB CONTENT: KJSEA CLASSIFICATION */}
      {activeTab === 'kjsea' && (
        <KJSEAClassificationComponent />
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-4">Create New Exam</h3>
            <input 
              type="text" 
              placeholder="Exam Name" 
              value={newExamName}
              onChange={(e) => setNewExamName(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg mb-3"
            />
            <div className="flex gap-2 mb-4">
               <input type="text" value={newExamYear} onChange={(e) => setNewExamYear(e.target.value)} className="w-1/2 p-2 border border-slate-200 rounded-lg" />
               <input type="text" value={newExamTerm} onChange={(e) => setNewExamTerm(e.target.value)} className="w-1/2 p-2 border border-slate-200 rounded-lg" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 p-2 bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={addExam} className="flex-1 p-2 bg-blue-600 text-white rounded-lg">Create Exam</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;
