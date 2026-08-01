import React, { useState, useEffect } from 'react';
import { 
  FileText, CalendarCheck, Edit2, List, RefreshCw, PlusCircle, 
  GraduationCap, BookOpen, Scale, Plus, Settings, ListChecks, 
  Edit3, X, Trash2, Save
} from 'lucide-react';
import { getGrades, getSubjects, Grade, Subject, getSubjectPapers, saveSubjectPapers, SubjectPaper } from '../utils/db';
import { canDelete } from '../utils/permissions';

export default function ExamSetup() {
  const [addedSubjects, setAddedSubjects] = useState<{id: string, grade: string, subject: string, maxMarks: number}[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [showPaperSetup, setShowPaperSetup] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Paper Management State
  const [papers, setPapers] = useState<SubjectPaper[]>([]);
  const [paperName, setPaperName] = useState('');
  const [paperWeight, setPaperWeight] = useState<number>(0);
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);

  useEffect(() => {
    setGrades(getGrades());
    setSubjects(getSubjects());
  }, []);

  const togglePaperSetup = (subjectName?: string) => {
    setSelectedSubject(subjectName || null);
    setShowPaperSetup(!showPaperSetup);
    
    if (subjectName && !showPaperSetup) {
      const subject = subjects.find(s => s.name === subjectName);
      if (subject) {
        const allPapers = getSubjectPapers();
        const subjectPapers = allPapers.filter(p => p.subjectId === subject.id);
        setPapers(subjectPapers);
      }
    } else if (!showPaperSetup) {
      setPapers([]);
    }
    
    setPaperName('');
    setPaperWeight(0);
    setEditingPaperId(null);
  };

  const handleAddSubject = () => {
    if (!selectedGradeId || !selectedSubjectId) return;
    const gradeName = grades.find(g => g.id === selectedGradeId)?.name || 'Unknown';
    const subjectName = subjects.find(s => s.id === selectedSubjectId)?.name || 'Unknown';
    setAddedSubjects([...addedSubjects, { id: Date.now().toString(), grade: gradeName, subject: subjectName, maxMarks }]);
    setSelectedGradeId('');
    setSelectedSubjectId('');
  };

  const removeSubject = (id: string) => {
    setAddedSubjects(addedSubjects.filter(s => s.id !== id));
  };

  // Paper Handlers
  const handleSavePaper = () => {
    if (!paperName || paperWeight <= 0 || !selectedSubject) return;

    const subject = subjects.find(s => s.name === selectedSubject);
    if (!subject) return;

    let updatedPapers: SubjectPaper[];

    if (editingPaperId) {
      updatedPapers = papers.map(p => p.id === editingPaperId ? { ...p, name: paperName, weight: paperWeight } : p);
    } else {
      updatedPapers = [...papers, { 
        id: Date.now().toString(), 
        subjectId: subject.id,
        name: paperName, 
        weight: paperWeight 
      }];
    }
    
    setPapers(updatedPapers);

    // Save to global storage
    const allPapers = getSubjectPapers();
    const otherSubjectsPapers = allPapers.filter(p => p.subjectId !== subject.id);
    saveSubjectPapers([...otherSubjectsPapers, ...updatedPapers]);

    setEditingPaperId(null);
    setPaperName('');
    setPaperWeight(0);
  };

  const startEditPaper = (paper: SubjectPaper) => {
    setPaperName(paper.name);
    setPaperWeight(paper.weight);
    setEditingPaperId(paper.id);
  };

  const deletePaper = (id: string) => {
    if (!canDelete()) {
      alert('⚠️ Access denied: You have a restriction ("cannot delete") preventing you from deleting items in this software.');
      return;
    }
    const updatedPapers = papers.filter(p => p.id !== id);
    setPapers(updatedPapers);

    const subject = subjects.find(s => s.name === selectedSubject);
    if (subject) {
      const allPapers = getSubjectPapers();
      const otherSubjectsPapers = allPapers.filter(p => p.subjectId !== subject.id);
      saveSubjectPapers([...otherSubjectsPapers, ...updatedPapers]);
    }

    if (editingPaperId === id) {
      setEditingPaperId(null);
      setPaperName('');
      setPaperWeight(0);
    }
  };

  const totalWeight = papers.reduce((sum, p) => sum + p.weight, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-8">
      {/* Header */}
      <header className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-blue-50 rounded-2xl">
            <FileText className="w-9 h-9 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Exam Manager</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">Configure examination parameters and settings.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-6 py-3 rounded-full font-bold text-sm shadow-inner">
            <CalendarCheck className="w-5 h-5" />
            <span>2026 Term 2</span>
          </div>
          <div className="flex gap-2">
            <button className="p-3 bg-slate-100 rounded-xl text-slate-600 hover:bg-blue-600 hover:text-white transition"><Edit2 className="w-5 h-5" /></button>
            <button className="p-3 bg-slate-100 rounded-xl text-slate-600 hover:bg-blue-600 hover:text-white transition"><List className="w-5 h-5" /></button>
            <button className="p-3 bg-slate-100 rounded-xl text-slate-600 hover:bg-blue-600 hover:text-white transition"><RefreshCw className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      {!showPaperSetup ? (
        <>
          {/* Add Subject Panel */}
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
              <div className="p-4 bg-slate-900 rounded-2xl text-white"><PlusCircle className="w-7 h-7" /></div>
              <h2 className="text-2xl font-black text-slate-900">Add Subject</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col gap-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2"><GraduationCap className="w-4 h-4 text-blue-600" /> Grade</label>
                <select 
                  value={selectedGradeId} 
                  onChange={(e) => setSelectedGradeId(e.target.value)}
                  className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 focus:border-blue-600 transition"
                >
                  <option value="">-- Select Grade --</option>
                  {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-600" /> Subject</label>
                <select 
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 focus:border-blue-600 transition"
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2"><Scale className="w-4 h-4 text-blue-600" /> Max Marks</label>
                <input 
                  type="number" 
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(Number(e.target.value))}
                  className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 focus:border-blue-600 transition" 
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={handleAddSubject}
                  className="w-full p-4 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                >
                  <Plus className="w-5 h-5" /> Add Subject
                </button>
              </div>
            </div>
          </section>

          {/* Configured Subjects */}
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-600 rounded-2xl text-white"><ListChecks className="w-7 h-7" /></div>
                <h2 className="text-2xl font-black text-slate-900">Configured Subjects</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-xs font-black uppercase tracking-widest">
                    <th className="p-4 border-b border-slate-100">Grade</th>
                    <th className="p-4 border-b border-slate-100">Subject Name</th>
                    <th className="p-4 border-b border-slate-100">Max Score</th>
                    <th className="p-4 border-b border-slate-100">Paper Setup</th>
                    <th className="p-4 border-b border-slate-100">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {addedSubjects.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-5 font-black text-slate-700">{s.grade}</td>
                      <td className="p-5 font-black text-slate-900">{s.subject}</td>
                      <td className="p-5 font-bold text-slate-600">{s.maxMarks}</td>
                      <td className="p-5">
                        <button onClick={() => togglePaperSetup(s.subject)} className="text-blue-600 font-black text-sm hover:text-blue-800 transition underline decoration-2 underline-offset-4">Setup Papers</button>
                      </td>
                      <td className="p-5">
                        <button onClick={() => removeSubject(s.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"><Trash2 className="w-5 h-5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        /* Paper Setup Area */
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Paper List */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
              <h3 className="text-2xl font-black text-slate-900">Papers for {selectedSubject}</h3>
              <button onClick={() => togglePaperSetup()} className="p-3 bg-slate-100 rounded-2xl text-slate-600 hover:bg-slate-200 transition"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="space-y-6 mb-8">
              <div className="flex justify-between text-xs font-black text-slate-500 uppercase tracking-widest">
                <span>Weight Distribution</span>
                <span className={`${totalWeight > 100 ? 'text-rose-600' : 'text-amber-600'}`}>
                  {totalWeight}% setup
                </span>
              </div>
              <div className="h-5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full transition-all duration-500 ${totalWeight > 100 ? 'bg-rose-500' : 'bg-blue-600'}`} 
                  style={{ width: `${Math.min(totalWeight, 100)}%` }}
                ></div>
              </div>
              {totalWeight > 100 && (
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse">
                  Warning: Total weight exceeds 100%
                </p>
              )}
            </div>

            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-xs font-black uppercase tracking-widest">
                  <th className="p-3">#</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Weight</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {papers.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-black text-blue-600">{idx + 1}</td>
                    <td className="p-4 font-black text-slate-900">{p.name}</td>
                    <td className="p-4 font-black text-slate-600">{p.weight}%</td>
                    <td className="p-4 flex gap-3">
                      <button 
                        onClick={() => startEditPaper(p)}
                        className="p-3 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      {canDelete() && (
                        <button 
                          onClick={() => deletePaper(p.id)}
                          className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {papers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 font-bold italic">
                      No papers added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Right: Add/Edit Paper */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 mb-8 pb-6 border-b border-slate-100">
              {editingPaperId ? 'Edit Paper' : 'Add New Paper'}
            </h3>
            <div className="space-y-6">
              <div className="flex flex-col gap-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Paper Name</label>
                <input 
                  value={paperName}
                  onChange={(e) => setPaperName(e.target.value)}
                  className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 focus:border-blue-600 transition" 
                  placeholder="e.g. Paper 1" 
                />
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Weight (%)</label>
                <input 
                  type="number" 
                  value={paperWeight || ''}
                  onChange={(e) => setPaperWeight(Number(e.target.value))}
                  className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 focus:border-blue-600 transition" 
                  placeholder="e.g. 50" 
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleSavePaper}
                  className="flex-1 p-4 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20 active:scale-[0.98]"
                >
                  <Save className="w-5 h-5" /> {editingPaperId ? 'Update Paper' : 'Save Paper'}
                </button>
                {editingPaperId && (
                  <button 
                    onClick={() => {
                      setEditingPaperId(null);
                      setPaperName('');
                      setPaperWeight(0);
                    }}
                    className="p-4 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
