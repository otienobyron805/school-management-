import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Expand, 
  X, 
  ChevronRight, 
  Search,
  School,
  Calendar,
  Users,
  Award,
  BookOpen,
  ArrowRightLeft,
  AlertTriangle,
  TrendingDown,
  Flame,
  CheckCircle2,
  ShieldAlert,
  Download
} from 'lucide-react';
import { 
  getLearners, 
  getGrades, 
  getSubjects, 
  getSchoolProfile, 
  getGradingRules, 
  secureGet,
  Learner,
  Grade,
  Subject,
  GradingRule,
  SchoolProfile
} from '../utils/db';

export default function PerformanceReport() {
  // Database States
  const [exams, setExams] = useState<any[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradingRules, setGradingRules] = useState<GradingRule[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(getSchoolProfile());
  const [dbMarks, setDbMarks] = useState<any[]>([]);

  // Selection States
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');
  const [selectedStreamName, setSelectedStreamName] = useState<string>('All Streams');
  
  // Heatmap & Threshold States
  const [threshold, setThreshold] = useState<number>(50);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);

  // UI States
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load Data
  useEffect(() => {
    const storedExams = secureGet('exams');
    setExams(storedExams ? JSON.parse(storedExams) : []);
    
    setGrades(getGrades());
    setLearners(getLearners());
    setSubjects(getSubjects());
    setGradingRules(getGradingRules());
    setSchoolProfile(getSchoolProfile());
    
    const storedMarks = secureGet('school_exam_marks');
    setDbMarks(storedMarks ? JSON.parse(storedMarks) : []);
  }, []);

  // Default selections
  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].id);
    }
    if (grades.length > 0 && !selectedGradeId) {
      setSelectedGradeId(grades[0].id);
    }
  }, [exams, grades]);

  const activeExam = exams.find(e => e.id === selectedExamId) || (exams.length > 0 ? exams[0] : null);
  const activeGrade = grades.find(g => g.id === selectedGradeId) || (grades.length > 0 ? grades[0] : null);

  // Helper: Get score
  const getScore = (learnerId: string, subjectCode: string, examId: string): number | null => {
    const match = dbMarks.find(
      m => m.examId === examId && m.learnerId === learnerId && m.subjectCode === subjectCode
    );
    if (match && match.score !== '' && match.score !== undefined && match.score !== null) {
      return Number(match.score);
    }
    return null;
  };

  // Helper: Get Grade Code
  const getGradeCode = (score: number | null): string => {
    if (score === null || isNaN(score)) return '—';
    const match = gradingRules.find(r => score >= r.min && score <= r.max);
    return match ? match.code : '—';
  };

  // Generate Report Data
  const generateReportData = () => {
    if (!activeExam || !activeGrade) return { headers: [], rows: [] };

    const activeGradeName = activeGrade.name;
    const gradeLearners = learners.filter(l => 
      (l.gradeLabel === activeGradeName || `Grade ${l.grade}` === activeGradeName) &&
      (selectedStreamName === 'All Streams' || l.stream === selectedStreamName)
    );

    // Find active subjects for this grade
    const gradeNum = parseInt(activeGradeName.replace(/\D/g, ''), 10) || 8;
    const activeSubjects = subjects.filter(s => s.grades.includes(gradeNum));

    // Process rows
    const rows = gradeLearners.map(l => {
      let total = 0;
      let count = 0;
      const subjectScores: Record<string, number | '—'> = {};

      activeSubjects.forEach(sub => {
        const score = getScore(l.id, sub.code, activeExam.id);
        if (score !== null) {
          subjectScores[sub.code] = score;
          total += score;
          count++;
        } else {
          subjectScores[sub.code] = '—';
        }
      });

      const mean = count > 0 ? Number((total / count).toFixed(1)) : 0;
      return {
        id: l.id,
        admNo: l.admNo,
        name: l.name,
        stream: l.stream,
        subjectScores,
        total,
        mean,
        grade: getGradeCode(count > 0 ? mean : null)
      };
    });

    // Sort by mean descending to assign ranks
    rows.sort((a, b) => b.mean - a.mean);
    const rankedRows = rows.map((r, idx) => ({
      ...r,
      pos: idx + 1
    }));

    return {
      headers: activeSubjects,
      rows: rankedRows
    };
  };

  const { headers, rows } = generateReportData();

  // Helper: Subject statistics calculation
  const getSubjectStats = (subjectCode: string) => {
    let total = 0;
    let count = 0;
    let belowCount = 0;

    rows.forEach(r => {
      const val = r.subjectScores[subjectCode];
      if (typeof val === 'number') {
        total += val;
        count++;
        if (val < threshold) belowCount++;
      }
    });

    const average = count > 0 ? Number((total / count).toFixed(1)) : 0;
    const isBelowThreshold = count > 0 && average < threshold;

    return {
      average,
      count,
      belowCount,
      isBelowThreshold
    };
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.getElementById('reportWrapper')?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="space-y-6">
      {/* CONTROLS AREA */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Select Exam</label>
              <select 
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {exams.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.examName || ex.name} ({ex.academicYear || ex.year})</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Grade Level</label>
              <select 
                value={selectedGradeId}
                onChange={(e) => setSelectedGradeId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {grades.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Stream</label>
              <select 
                value={selectedStreamName}
                onChange={(e) => setSelectedStreamName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="All Streams">All Streams</option>
                {activeGrade?.streams.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block flex items-center justify-between">
                <span>Alert Threshold</span>
                <span className="text-amber-600 font-extrabold">{threshold}%</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={threshold}
                  onChange={(e) => setThreshold(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="w-16 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                    showHeatmap 
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="Toggle Heatmap visual highlighting"
                >
                  <Flame className="w-3.5 h-3.5" />
                  {showHeatmap ? 'Heatmap ON' : 'Heatmap OFF'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm cursor-pointer active:scale-95"
              title="Download PDF document (via Print)"
            >
              <Download className="w-4 h-4 pointer-events-none" /> Download PDF
            </button>
            <button 
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm cursor-pointer active:scale-95"
              title="Print report"
            >
              <Printer className="w-4 h-4 pointer-events-none" /> Print Report
            </button>
            <button 
              onClick={toggleFullscreen}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm cursor-pointer active:scale-95"
            >
              <Expand className="w-4 h-4 pointer-events-none" /> {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
            </button>
          </div>
        </div>
      </div>

      {/* REPORT CONTAINER */}
      <div 
        id="reportWrapper"
        className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200"
      >
        {/* Header Bar */}
        <div className="bg-[#0f172a] text-white p-6 flex justify-between items-center">
          <div className="text-lg font-bold tracking-tight">
            {activeGrade?.name} Composite Performance Sheet
          </div>
          <div className="text-xs font-medium opacity-70">
            {activeExam?.examName || activeExam?.name} · {activeExam?.term} · {activeExam?.academicYear || activeExam?.year}
          </div>
        </div>

        {/* Meta Info */}
        <div className="text-center p-8 border-b border-slate-100 space-y-4">
          {schoolProfile.logoUrl && (
            <img 
              src={schoolProfile.logoUrl} 
              alt="School Logo" 
              className="w-20 h-20 mx-auto rounded-full object-contain border border-slate-100 p-1 bg-white shadow-sm"
              referrerPolicy="no-referrer"
            />
          )}
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
              {schoolProfile.name}
            </h2>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm font-bold text-slate-500 mt-2">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {activeExam?.examName || activeExam?.name}</span>
              <span className="flex items-center gap-1"><School className="w-4 h-4" /> {activeGrade?.name}</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {selectedStreamName}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            <ArrowRightLeft className="w-3 h-3 inline mr-1" /> Swipe horizontally to view all subjects and analytics
          </p>
        </div>

        {/* ACADEMIC HEATMAP & SUBJECT RISK ANALYSIS PANEL */}
        {headers.length > 0 && rows.length > 0 && showHeatmap && (
          <div className="bg-slate-50 border-b border-slate-200 p-6 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Subject Performance Heatmap & Risk Analysis
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Subjects with class averages below <span className="font-extrabold text-amber-700">{threshold}%</span> are highlighted for academic intervention.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-md text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  Below Threshold (&lt; {threshold}%)
                </span>
                <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Meeting Target (≥ {threshold}%)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
              {headers.map(h => {
                const stats = getSubjectStats(h.code);
                const isCritical = stats.isBelowThreshold;
                return (
                  <div
                    key={h.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isCritical
                        ? 'bg-red-50/90 border-red-200 text-red-900 shadow-sm ring-1 ring-red-300'
                        : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate" title={h.name}>
                        {h.code}
                      </span>
                      {isCritical ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-red-600 text-white animate-pulse">
                          <ShieldAlert className="w-3 h-3" /> ALERT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> PASS
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-black tracking-tight flex items-baseline gap-1">
                      <span>{stats.count > 0 ? `${stats.average}%` : '—'}</span>
                      {isCritical && <TrendingDown className="w-4 h-4 text-red-600 inline" />}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">
                      {h.name}
                    </div>
                    {stats.count > 0 && stats.belowCount > 0 && (
                      <div className="mt-1.5 text-[9px] font-bold text-red-600 bg-red-100/70 px-1.5 py-0.5 rounded">
                        ⚠️ {stats.belowCount} learner{stats.belowCount > 1 ? 's' : ''} &lt; {threshold}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto p-4 sm:p-6 pb-12">
          <table className="w-full border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-blue-800 text-white text-[10px] uppercase font-black tracking-widest">
                <th className="p-3 text-center border-r border-blue-700/50 rounded-tl-xl w-12">POS</th>
                <th className="p-3 text-left border-r border-blue-700/50 w-24">ADM NO</th>
                <th className="p-3 text-left border-r border-blue-700/50 min-w-[200px]">NAME</th>
                <th className="p-3 text-left border-r border-blue-700/50 w-24">STREAM</th>
                {headers.map(h => {
                  const stats = getSubjectStats(h.code);
                  return (
                    <th 
                      key={h.id} 
                      className={`p-3 text-center border-r border-blue-700/50 text-[9px] ${
                        showHeatmap && stats.isBelowThreshold ? 'bg-red-900 text-red-100 font-black' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span>{h.code}</span>
                        {showHeatmap && stats.isBelowThreshold && (
                          <span className="px-1 py-0.2 bg-red-500 text-white text-[8px] rounded font-black tracking-tighter uppercase">
                            LOW
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="p-3 text-center border-r border-blue-700/50 bg-blue-900">TOTAL</th>
                <th className="p-3 text-center border-r border-blue-700/50 bg-blue-900">MEAN</th>
                <th className="p-3 text-center border-r border-blue-700/50 bg-blue-900">GRADE</th>
                <th className="p-3 text-center rounded-tr-xl bg-blue-900">RANK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-center font-black text-slate-400 text-xs">{row.pos}</td>
                  <td className="p-3 text-left font-mono font-bold text-slate-500 text-xs">{row.admNo}</td>
                  <td className="p-3 text-left font-black text-slate-800 text-sm">{row.name}</td>
                  <td className="p-3 text-left font-bold text-slate-500 text-xs uppercase">{row.stream}</td>
                  {headers.map(h => {
                    const score = row.subjectScores[h.code];
                    const isLowScore = showHeatmap && typeof score === 'number' && score < threshold;
                    return (
                      <td 
                        key={h.id} 
                        className={`p-3 text-center font-bold text-xs transition-colors ${
                          isLowScore 
                            ? 'bg-red-100/80 text-red-900 font-extrabold border-red-200' 
                            : 'text-slate-700'
                        }`}
                      >
                        {score}
                      </td>
                    );
                  })}
                  <td className="p-3 text-center font-black text-blue-700 text-sm bg-blue-50/30">{row.total}</td>
                  <td className="p-3 text-center font-black text-blue-700 text-sm bg-blue-50/30">{row.mean}</td>
                  <td className="p-3 text-center font-black text-slate-800 text-xs bg-slate-50/50">{row.grade}</td>
                  <td className="p-3 text-center font-black text-slate-800 text-xs bg-slate-50/50">{row.pos}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={headers.length + 8} className="p-12 text-center text-slate-400 italic">
                    No records found for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
            {/* SUBJECT MEAN / CLASS BENCHMARK FOOTER ROW */}
            {rows.length > 0 && headers.length > 0 && (
              <tfoot>
                <tr className="bg-slate-800 text-white font-black text-xs border-t-2 border-slate-700">
                  <td colSpan={4} className="p-3 text-right uppercase tracking-wider border-r border-slate-700 font-extrabold text-[11px] text-slate-300">
                    Subject Class Mean
                  </td>
                  {headers.map(h => {
                    const stats = getSubjectStats(h.code);
                    return (
                      <td 
                        key={h.id} 
                        className={`p-3 text-center border-r border-slate-700 font-black text-xs ${
                          showHeatmap && stats.isBelowThreshold 
                            ? 'bg-red-700 text-white' 
                            : 'bg-slate-700 text-emerald-300'
                        }`}
                      >
                        {stats.count > 0 ? `${stats.average}%` : '—'}
                      </td>
                    );
                  })}
                  <td colSpan={4} className="p-3 bg-slate-900 text-center text-slate-400 font-bold text-[10px]">
                    Alert Target: &lt;{threshold}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer for print */}
        <div className="p-8 mt-12 grid grid-cols-3 gap-8 border-t border-slate-100 text-center">
          <div className="space-y-4">
            <div className="h-12 border-b border-slate-300"></div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Class Teacher</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="w-32 h-32 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase p-4">
              Official School Stamp
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-12 border-b border-slate-300"></div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Principal's Signature</p>
          </div>
        </div>

        <div className="px-8 pb-8 text-right">
          <p className="text-[10px] font-medium text-slate-400">
            Generated on: {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          #reportWrapper { 
            box-shadow: none !important; 
            border: none !important; 
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          table { width: 100% !important; min-width: 100% !important; }
          th { background: #f1f5f9 !important; color: black !important; -webkit-print-color-adjust: exact; }
          .bg-\\[\\#0f172a\\] { background: #0f172a !important; color: white !important; -webkit-print-color-adjust: exact; }
          .bg-blue-800 { background: #1e40af !important; -webkit-print-color-adjust: exact; }
          .bg-blue-900 { background: #1e3a8a !important; -webkit-print-color-adjust: exact; }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}

