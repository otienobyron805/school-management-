import React, { useState } from 'react';
import { secureGet, secureSet, getCurrentUser, logActivity } from '../utils/db';

export default function CreateExam() {
  const [examName, setExamName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [examDate, setExamDate] = useState('');
  const [openingDate, setOpeningDate] = useState('');
  const [closingDate, setClosingDate] = useState('');

  const handleSave = () => {
    if (!examName || !academicYear) {
      alert('Please fill in required fields (Exam Name and Academic Year)');
      return;
    }

    const newExam = {
      id: Date.now().toString(),
      examName,
      academicYear,
      term,
      examDate,
      openingDate,
      closingDate
    };

    const storedExams = secureGet('exams');
    const exams = storedExams ? JSON.parse(storedExams) : [];
    exams.push(newExam);
    secureSet('exams', JSON.stringify(exams));

    const user = getCurrentUser();
    if (user) logActivity('exam_created', `New exam "${examName}" created for academic year ${academicYear}.`, user.fullName);

    alert(`Exam "${examName}" saved successfully!`);
    
    // Clear fields
    setExamName('');
    setAcademicYear('');
    setTerm('Term 1');
    setExamDate('');
    setOpeningDate('');
    setClosingDate('');
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm max-w-2xl mx-auto">
      <div className="p-5 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
        Create Exam
      </div>
      <div className="p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Exam Name</label>
          <input 
            type="text" 
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
            placeholder="e.g. End of Term 1 2025" 
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Academic Year</label>
          <input 
            type="text" 
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
            placeholder="e.g. 2025" 
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Term</label>
          <select 
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
          >
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Exam Date (optional)</label>
          <input 
            type="date" 
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Term Opening Date</label>
            <input 
              type="date" 
              value={openingDate}
              onChange={(e) => setOpeningDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Term Closing Date</label>
            <input 
              type="date" 
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition"
          >
            Save Exam
          </button>
          <button className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancel</button>
        </div>
      </div>
    </div>
  );
}
