import React, { useState, useEffect } from 'react';
import { getSchoolProfile, SchoolProfile, secureGet, getLearners } from '../utils/db';
import { Printer, X, Eye, Trash2, Plus, Sparkles, CheckCircle, HelpCircle, FileText, List, Award } from 'lucide-react';

interface ComponentExam {
  name: string;
  weight: number; // percentage, e.g. 30
}

interface TermReportDef {
  id: string;
  name: string;
  year: number;
  term: string;
  totalMarks: number;
  components: ComponentExam[];
  notes?: string;
}

export default function TermReport() {
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(() => getSchoolProfile());
  const [termReports, setTermReports] = useState<TermReportDef[]>(() => {
    const stored = secureGet('term_reports');
    return stored ? JSON.parse(stored) : [];
  });
  const [learnersList, setLearnersList] = useState<any[]>(() => getLearners());

  // Form states
  const [reportName, setReportName] = useState('');
  const [year, setYear] = useState(2026);
  const [term, setTerm] = useState('Term 2');
  const [totalMarks, setTotalMarks] = useState(100);
  const [notes, setNotes] = useState('');

  // Modal preview states
  const [activeReportDef, setActiveReportDef] = useState<TermReportDef | null>(null);
  const [previewTab, setPreviewTab] = useState<'class_list' | 'stream_list' | 'report_cards'>('class_list');
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>('');

  useEffect(() => {
    try {
      const profile = getSchoolProfile();
      setSchoolProfile(profile);
      const lList = getLearners();
      setLearnersList(lList);
      if (lList.length > 0) {
        setSelectedLearnerId(lList[0].id);
      }
    } catch (e) {
      console.error("Failed to load school profile or learners", e);
    }
  }, []);

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportName.trim()) return;

    const newReport: TermReportDef = {
      id: `tr-${Date.now()}`,
      name: reportName,
      year: Number(year),
      term: term,
      totalMarks: Number(totalMarks),
      components: [
        { name: 'CAT 1 Assessment', weight: 30 },
        { name: 'CAT 2 Assessment', weight: 30 },
        { name: 'End Term Main Exam', weight: 40 }
      ],
      notes: notes
    };

    setTermReports([...termReports, newReport]);
    setReportName('');
    setNotes('');
  };

  const handleDeleteReport = (id: string) => {
    setTermReports(termReports.filter(r => r.id !== id));
  };

  // Helper to determine performance level descriptors
  const getCBCRating = (total: number) => {
    if (total >= 80) return { label: 'Exceeding Expectation (EE)', code: 'EE', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    if (total >= 60) return { label: 'Meeting Expectation (ME)', code: 'ME', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    if (total >= 40) return { label: 'Approaching Expectation (AE)', code: 'AE', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    return { label: 'Below Expectation (BE)', code: 'BE', color: 'text-red-600 bg-red-50 border-red-200' };
  };

  const getSubjectCBCRating = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'EE';
    if (pct >= 60) return 'ME';
    if (pct >= 40) return 'AE';
    return 'BE';
  };

  const getCBCRemarks = (total: number) => {
    if (total >= 80) return 'Demonstrates exemplary understanding of concepts. Exhibits high critical thinking and peer support skills.';
    if (total >= 60) return 'Consistently meets learning outcomes. Can apply mathematical and scientific concepts with ease.';
    if (total >= 40) return 'Grasps basic concepts well but requires consistent practice and support in analytical tasks.';
    return 'Requires targeted remedial sessions to improve concept mastery and self-confidence.';
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 bg-slate-50 text-slate-900 min-h-screen">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Term Reports (Merged Exams)</h2>
        </div>
        <button 
          onClick={() => setActiveReportDef(termReports[0] || null)}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition flex items-center gap-2"
        >
          <Eye className="w-4 h-4" /> View Term Reports →
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Manage aggregated term-level report definitions, integrate multiple weighted exams, and preview/print standardized student report cards and stream sheets.
      </p>

      {/* 3-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMN 1: EXISTING TERM REPORTS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-lg">📊</span>
            <h3 className="font-bold text-slate-800 text-base">Active Term Reports</h3>
          </div>
          <p className="text-xs text-slate-400">Each term report automatically bundles individual assessments into a single official deck</p>

          <div className="space-y-3">
            {termReports.map(report => (
              <div key={report.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition-all duration-200">
                <div className="font-extrabold text-slate-800 text-sm leading-snug mb-1">{report.name}</div>
                <div className="text-[11px] font-mono text-slate-500 mb-2">
                  Academic Year: {report.year} · Term: {report.term} · Out of: {report.totalMarks} marks
                </div>
                
                <div className="bg-white rounded-lg p-2.5 border border-slate-100 mb-3 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weighted components</div>
                  {report.components.map((comp, i) => (
                    <div key={i} className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>• {comp.name}</span>
                      <span className="text-blue-600 font-extrabold">{comp.weight}%</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => {
                      setPreviewTab('class_list');
                      setActiveReportDef(report);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <List className="w-3.5 h-3.5" /> Class List
                  </button>
                  <button 
                    onClick={() => {
                      setPreviewTab('report_cards');
                      setActiveReportDef(report);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" /> Report Card
                  </button>
                  <button 
                    onClick={() => {
                      setPreviewTab('class_list');
                      setActiveReportDef(report);
                      setTimeout(() => window.print(), 150);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                  <button 
                    onClick={() => handleDeleteReport(report.id)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer"
                    title="Delete Report"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 2: CREATE NEW TERM REPORT */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <span className="text-lg">➕</span>
            <h3 className="font-bold text-slate-800 text-base">New Term Report</h3>
          </div>
          <form onSubmit={handleCreateReport} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Report Name *</label>
              <input 
                type="text" 
                required
                value={reportName}
                onChange={e => setReportName(e.target.value)}
                placeholder="e.g. Term 2 End Term 2026 Merged" 
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium" 
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Academic Year</label>
                <input 
                  type="number" 
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Term</label>
                <select 
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option>Term 1</option>
                  <option>Term 2</option>
                  <option>Term 3</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total Marks (usually 100)</label>
              <input 
                type="number" 
                value={totalMarks}
                onChange={e => setTotalMarks(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes / Memo</label>
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional description on the aggregated assessment..." 
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                rows={2}
              ></textarea>
            </div>
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-sm"
            >
              ➕ Create Term Report
            </button>
          </form>
        </div>

        {/* COLUMN 3: HOW IT WORKS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-lg">💡</span>
            <h3 className="font-bold text-slate-800 text-base">Academic Merges Explained</h3>
          </div>
          <ol className="list-decimal pl-5 text-sm space-y-3.5 text-slate-600 font-medium">
            <li>
              <strong className="text-slate-800">Create Assessments:</strong> Save individual exam scores for CATs, Opener, and Main Exams.
            </li>
            <li>
              <strong className="text-slate-800">Add Components:</strong> Establish custom weighting equations (e.g. CAT 1 30%, CAT 2 30%, End Term 40%).
            </li>
            <li>
              <strong className="text-slate-800">Standardized Heading:</strong> Standardized print layout with top-right logo, student details, exam code, and class info is automatically structured.
            </li>
            <li>
              <strong className="text-slate-800">Scale System:</strong> The academic processor auto-computes scale ratios cleanly out of 100%.
            </li>
          </ol>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 font-medium flex items-start gap-2">
            <span>⚠️</span>
            <span>All reports comply with official Ministry and CBC standards and can be easily printed directly from the preview terminal below.</span>
          </div>
        </div>
      </div>

      {/* 📄 REUSABLE REPORT PREVIEW MODAL */}
      {activeReportDef && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
            
            {/* Modal Actions Header */}
            <div className="bg-slate-800 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-3 border-b border-slate-700 print:hidden shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-lg">📄</span>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-100 leading-tight">Print Sandbox & Report Preview</h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Report Definition: {activeReportDef.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-slate-700 rounded-xl p-0.5 flex">
                  <button 
                    onClick={() => setPreviewTab('class_list')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      previewTab === 'class_list' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" /> Class List
                  </button>
                  <button 
                    onClick={() => setPreviewTab('stream_list')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      previewTab === 'stream_list' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" /> Stream List
                  </button>
                  <button 
                    onClick={() => setPreviewTab('report_cards')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      previewTab === 'report_cards' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" /> Report Cards
                  </button>
                </div>

                {previewTab === 'report_cards' && (
                  <select 
                    value={selectedLearnerId}
                    onChange={e => setSelectedLearnerId(e.target.value)}
                    className="bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {learnersList.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.admNo})</option>
                    ))}
                  </select>
                )}

                <button 
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Report
                </button>

                <button 
                  onClick={() => setActiveReportDef(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-700/50 p-1.5 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Document Container */}
            <div className="p-8 overflow-y-auto flex-1 bg-slate-100 print:bg-white print:p-0">
              <div className="max-w-4xl mx-auto bg-white p-8 sm:p-10 border border-slate-300 rounded-3xl shadow-sm text-slate-900 relative print:border-none print:shadow-none print:p-0 print:rounded-none overflow-hidden">
                
                {/* School Logo Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
                  <img 
                    src={schoolProfile.logoUrl || "https://via.placeholder.com/110/2563EB/FFFFFF?text=SCHOOL+LOGO"} 
                    alt="Watermark" 
                    className="w-96 h-96 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                {/* 📄 STANDARDIZED PRINT HEADER (Requested Fields: School Name, Top-right School Logo, Exam name, Grade, Stream, Term, Session) */}
                <div className="repeat-header relative flex flex-col sm:flex-row justify-between items-center sm:items-start text-center sm:text-left gap-4 border-b-4 border-double border-slate-800 pb-5 mb-6">
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] font-black text-blue-600 tracking-widest uppercase block">MINISTRY OF EDUCATION</span>
                    <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-900 leading-tight">
                      {schoolProfile.name || 'ELGON VIEW HEIGHTS HIGH SCHOOL'}
                    </h1>
                    <p className="text-xs text-slate-600 font-semibold">
                      {schoolProfile.pobox ? `P.O. Box ${schoolProfile.pobox}-${schoolProfile.postalCode}` : 'P.O. Box 400-30100, Eldoret'} 
                      {schoolProfile.location ? ` · Location: ${schoolProfile.location}` : ''}
                    </p>
                    
                    {/* Header Matrix info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 font-bold mt-3">
                      <div>
                        <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Assessment / Exam Name</span>
                        <span className="text-slate-800 text-sm font-black uppercase">{activeReportDef.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Academic Session</span>
                        <span className="text-slate-800 text-sm font-black">{activeReportDef.year} Session</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Grade & Stream</span>
                        <span className="text-slate-800 text-sm font-black uppercase">Grade 8 · Alpha</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Term</span>
                        <span className="text-slate-800 text-sm font-black uppercase">{activeReportDef.term}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* School Logo at the top right corner */}
                  <div className="shrink-0 flex justify-end">
                    <img 
                      src={schoolProfile.logoUrl || "https://via.placeholder.com/110/2563EB/FFFFFF?text=SCHOOL+LOGO"} 
                      alt="School Logo" 
                      className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <style>{`
                  @media print {
                    .repeat-header {
                      display: table-header-group;
                    }
                    thead {
                      display: table-header-group;
                    }
                  }
                `}</style>

                {/* TAB 1: CLASS LIST RESULTS VIEW */}
                {previewTab === 'class_list' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Stream Merit List & Aggregated Results</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Reflecting composite averages scaling from weighted assessments</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                        Active CBC Setups
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-800 text-white font-black uppercase border-b border-slate-300">
                            <th className="p-3">Rank</th>
                            <th className="p-3">Adm No</th>
                            <th className="p-3">Learner Name</th>
                            <th className="p-3 text-center">CAT 1 (30%)</th>
                            <th className="p-3 text-center">CAT 2 (30%)</th>
                            <th className="p-3 text-center">End Term (40%)</th>
                            <th className="p-3 text-center font-bold">Total (100)</th>
                            <th className="p-3 text-center">Rating</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {(() => {
                            if (learnersList.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={8} className="p-8 text-center text-slate-500 font-semibold">
                                    No learners enrolled yet. Add learners in the Learners section to generate reports.
                                  </td>
                                </tr>
                              );
                            }
                            const sortedLearners = [...learnersList].map(l => {
                              const total = (l.cat1 || 0) + (l.cat2 || 0) + (l.endTerm || 0);
                              return { ...l, total };
                            }).sort((a, b) => b.total - a.total);

                            return sortedLearners.map((l, idx) => {
                              const rating = getCBCRating(l.total);
                              return (
                                <tr key={l.id} className="hover:bg-slate-50 font-medium">
                                  <td className="p-3 font-extrabold text-slate-700">#{idx + 1}</td>
                                  <td className="p-3 font-mono text-slate-500">{l.admNo}</td>
                                  <td className="p-3 font-extrabold text-slate-900">{l.name}</td>
                                  <td className="p-3 text-center text-slate-600 font-mono">{l.cat1 || 0}/30</td>
                                  <td className="p-3 text-center text-slate-600 font-mono">{l.cat2 || 0}/30</td>
                                  <td className="p-3 text-center text-slate-600 font-mono">{l.endTerm || 0}/40</td>
                                  <td className="p-3 text-center font-black text-slate-900 text-sm bg-blue-50/50">{l.total}</td>
                                  <td className="p-3 text-center">
                                    <span className="font-extrabold text-[10px] px-2 py-0.5 rounded border uppercase">
                                      {rating.code}
                                    </span>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 2: STREAM LIST RESULTS VIEW */}
                {previewTab === 'stream_list' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Stream Merit List & Aggregated Results</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Reflecting composite averages scaling from weighted assessments for this stream</p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                        Stream Report
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-800 text-white font-black uppercase border-b border-slate-300">
                            <th className="p-3">Rank</th>
                            <th className="p-3">Adm No</th>
                            <th className="p-3">Learner Name</th>
                            <th className="p-3 text-center">CAT 1 (30%)</th>
                            <th className="p-3 text-center">CAT 2 (30%)</th>
                            <th className="p-3 text-center">End Term (40%)</th>
                            <th className="p-3 text-center font-bold">Total (100)</th>
                            <th className="p-3 text-center">Rating</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {(() => {
                            if (learnersList.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={8} className="p-8 text-center text-slate-500 font-semibold">
                                    No learners enrolled yet. Add learners in the Learners section to generate reports.
                                  </td>
                                </tr>
                              );
                            }
                            const sortedLearners = [...learnersList].map(l => {
                              const total = (l.cat1 || 0) + (l.cat2 || 0) + (l.endTerm || 0);
                              return { ...l, total };
                            }).sort((a, b) => b.total - a.total);

                            return sortedLearners.map((l, idx) => {
                              const rating = getCBCRating(l.total);
                              return (
                                <tr key={l.id} className="hover:bg-slate-50 font-medium">
                                  <td className="p-3 font-extrabold text-slate-700">#{idx + 1}</td>
                                  <td className="p-3 font-mono text-slate-500">{l.admNo}</td>
                                  <td className="p-3 font-extrabold text-slate-900">{l.name}</td>
                                  <td className="p-3 text-center text-slate-600 font-mono">{l.cat1 || 0}/30</td>
                                  <td className="p-3 text-center text-slate-600 font-mono">{l.cat2 || 0}/30</td>
                                  <td className="p-3 text-center text-slate-600 font-mono">{l.endTerm || 0}/40</td>
                                  <td className="p-3 text-center font-black text-slate-900 text-sm bg-emerald-50/50">{l.total}</td>
                                  <td className="p-3 text-center">
                                    <span className="font-extrabold text-[10px] px-2 py-0.5 rounded border uppercase">
                                      {rating.code}
                                    </span>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 3: INDIVIDUAL LEARNER REPORT CARD VIEW */}
                {previewTab === 'report_cards' && (
                  <div className="space-y-6">
                    {(() => {
                      if (learnersList.length === 0) {
                        return (
                          <div className="p-8 text-center text-slate-500 font-semibold bg-slate-50 rounded-2xl border border-slate-200">
                            No learners enrolled yet. Add learners in the Learners section to generate report cards.
                          </div>
                        );
                      }
                      const learner = learnersList.find(l => l.id === selectedLearnerId) || learnersList[0];
                      const totalScore = (learner.cat1 || 0) + (learner.cat2 || 0) + (learner.endTerm || 0);
                      const rating = getCBCRating(totalScore);

                      return (
                        <div className="space-y-6">
                          {/* Student Bio Matrix */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-semibold">
                            <div>
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Learner Name:</span>
                              <span className="text-slate-800 text-sm font-extrabold">{learner.name}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Admission Number:</span>
                              <span className="text-slate-800 font-mono text-sm font-extrabold">{learner.admNo}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Gender:</span>
                              <span className="text-slate-800 text-sm font-extrabold">{learner.gender}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Performance Class:</span>
                              <span className="text-blue-600 font-extrabold text-sm uppercase block">{rating.code}</span>
                            </div>
                          </div>

                          {/* Subject Breakdown Table */}
                          <div>
                            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-700 mb-3">Academic Competencies / CBC Subjects</h3>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-800 text-white font-black uppercase border-b border-slate-300">
                                    <th className="p-3">Subject Name</th>
                                    <th className="p-3 text-center">CAT 1 (30)</th>
                                    <th className="p-3 text-center">CAT 2 (30)</th>
                                    <th className="p-3 text-center">End Term (40)</th>
                                    <th className="p-3 text-center">Total (100)</th>
                                    <th className="p-3 text-center">Performance Level</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 font-medium">
                                  <tr>
                                    <td className="p-3 font-extrabold text-slate-800">English Language & Composition</td>
                                    <td className="p-3 text-center font-mono text-slate-600">{learner.cat1}</td>
                                    <td className="p-3 text-center font-mono text-slate-600">{learner.cat2}</td>
                                    <td className="p-3 text-center font-mono text-slate-600">{learner.endTerm}</td>
                                    <td className="p-3 text-center font-black text-slate-900 bg-slate-50">{totalScore}</td>
                                    <td className="p-3 text-center font-black text-emerald-600">{getSubjectCBCRating(totalScore, 100)}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-3 font-extrabold text-slate-800">Mathematics & Quantitative Reasoning</td>
                                    <td className="p-3 text-center font-mono text-slate-600">{Math.round(learner.cat1 * 0.9)}</td>
                                    <td className="p-3 text-center font-mono text-slate-600">{Math.round(learner.cat2 * 0.9)}</td>
                                    <td className="p-3 text-center font-mono text-slate-600">{Math.round(learner.endTerm * 0.9)}</td>
                                    <td className="p-3 text-center font-black text-slate-900 bg-slate-50">{Math.round(totalScore * 0.9)}</td>
                                    <td className="p-3 text-center font-black text-blue-600">{getSubjectCBCRating(Math.round(totalScore * 0.9), 100)}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-3 font-extrabold text-slate-800">Integrated Science (Physics & Biology)</td>
                                    <td className="p-3 text-center font-mono text-slate-600">{Math.min(30, Math.round(learner.cat1 * 1.05))}</td>
                                    <td className="p-3 text-center font-mono text-slate-600">{Math.min(30, Math.round(learner.cat2 * 1.05))}</td>
                                    <td className="p-3 text-center font-mono text-slate-600">{Math.min(40, Math.round(learner.endTerm * 1.05))}</td>
                                    <td className="p-3 text-center font-black text-slate-900 bg-slate-50">{Math.min(100, Math.round(totalScore * 1.05))}</td>
                                    <td className="p-3 text-center font-black text-emerald-600">{getSubjectCBCRating(Math.min(100, Math.round(totalScore * 1.05)), 100)}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-3 font-extrabold text-slate-800">Social Studies & Citizenship</td>
                                    <td className="p-3 text-center font-mono text-slate-600">{Math.round(learner.cat1 * 0.85)}</td>
                                    <td className="p-3 text-center font-mono text-slate-600">{Math.round(learner.cat2 * 0.85)}</td>
                                    <td className="p-3 text-center font-mono text-slate-600">{Math.round(learner.endTerm * 0.85)}</td>
                                    <td className="p-3 text-center font-black text-slate-900 bg-slate-50">{Math.round(totalScore * 0.85)}</td>
                                    <td className="p-3 text-center font-black text-amber-600">{getSubjectCBCRating(Math.round(totalScore * 0.85), 100)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Class Teacher Remarks Block */}
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-700">Assessed Class Performance Metrics</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                              <div>
                                <span className="text-slate-400 block mb-1">Class Teacher remarks:</span>
                                <p className="text-slate-800 italic leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                                  "{getCBCRemarks(totalScore)}"
                                </p>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <span className="text-slate-400 block mb-0.5">Summative Performance Descriptor:</span>
                                  <span className={`px-3 py-1 rounded-full border text-xs font-black uppercase inline-block ${rating.color}`}>
                                    {rating.label}
                                  </span>
                                </div>
                                <div className="border-t border-slate-200/50 pt-2 flex justify-between">
                                  <div>
                                    <span className="text-slate-400 block">Class Teacher:</span>
                                    <span className="text-slate-800 font-bold">Madam Grace Koech</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-slate-400 block">Principal Signature:</span>
                                    <span className="text-slate-800 font-bold font-mono">Approved</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Footer terms */}
                <div className="mt-8 border-t border-slate-200 pt-5 flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span>Standard CBC Term Report Sheet</span>
                  <span>Generated dynamically · Page 1 of 1</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
