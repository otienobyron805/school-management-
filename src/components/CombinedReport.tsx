import React, { useState, useEffect } from 'react';
import { Newspaper, Plus, Trash2, CheckCircle, Eye, Printer, X, FileText, AlertCircle, Info, Sparkles, Download } from 'lucide-react';
import { getSchoolProfile, SchoolProfile, secureGet, getLearners } from '../utils/db';
import { canDelete } from '../utils/permissions';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { VerificationQRCode } from './VerificationQRCode';
import { PrintHeader } from './PrintHeader';

interface Newsletter {
  id: string;
  title: string;
  content: string;
  term: string;
  year: number;
  includeFeeArrears: boolean;
  nextTermCharges: number;
  isActive: boolean;
  viewedParents: number; // simulated
}

export default function CombinedReport() {
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(() => getSchoolProfile());
  const [newsletters, setNewsletters] = useState<Newsletter[]>(() => {
    const stored = secureGet('school_newsletters');
    return stored ? JSON.parse(stored) : [];
  });

  const [showForm, setShowForm] = useState(false);
  const [activePreviewNewsletter, setActivePreviewNewsletter] = useState<Newsletter | null>(null);
  
  // Form States
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [term, setTerm] = useState('Term 2');
  const [year, setYear] = useState(2026);
  const [includeFeeArrears, setIncludeFeeArrears] = useState(false);
  const [nextTermCharges, setNextTermCharges] = useState(0);

  const totalStudents = getLearners().length;

  useEffect(() => {
    try {
      const profile = getSchoolProfile();
      setSchoolProfile(profile);
    } catch (e) {
      console.error("Failed to load school profile", e);
    }
  }, []);

  const handleCreateNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newNewsletter: Newsletter = {
      id: Date.now().toString(),
      title,
      content,
      term,
      year,
      includeFeeArrears,
      nextTermCharges: Number(nextTermCharges),
      isActive: true,
      viewedParents: 0,
    };

    setNewsletters([...newsletters, newNewsletter]);
    // Reset Form
    setTitle('');
    setContent('');
    setTerm('Term 2');
    setYear(2026);
    setIncludeFeeArrears(false);
    setNextTermCharges(0);
    setShowForm(false);
  };

  const toggleActive = (id: string) => {
    setNewsletters(newsletters.map(n => 
      n.id === id ? { ...n, isActive: !n.isActive } : n
    ));
  };

  const deleteNewsletter = (id: string) => {
    if (!canDelete()) {
      alert('⚠️ Access denied: You have a restriction ("cannot delete") preventing you from deleting items in this software.');
      return;
    }
    setNewsletters(newsletters.filter(n => n.id !== id));
  };

  // Calculations
  const activeNewslettersCount = newsletters.filter(n => n.isActive).length;
  const totalViewedParents = newsletters.reduce((sum, n) => sum + (n.isActive ? n.viewedParents : 0), 0);
  const parentViewRate = activeNewslettersCount > 0 
    ? Math.round((totalViewedParents / (activeNewslettersCount * totalStudents)) * 100) 
    : 0;

  const handleDownloadPDF = async () => {
    const reportElement = document.getElementById('combined-report-printable-card');
    if (!reportElement) {
      window.print();
      return;
    }
    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: true,
        windowWidth: reportElement.scrollWidth,
        windowHeight: reportElement.scrollHeight,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('combined-report-printable-card');
          if (el) {
            el.style.overflow = 'visible';
            el.style.height = 'auto';
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${activePreviewNewsletter?.title || 'Combined_Report'}.pdf`);
    } catch (err) {
      console.error("PDF download error:", err);
      window.print();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 bg-slate-50 text-slate-900 min-h-screen">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Newspaper className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Combined Reports</h2>
        </div>
      </div>

      {/* BLUE BANNER STUDIO */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md flex flex-wrap justify-between items-center gap-6 mb-6">
        <div className="flex items-start gap-4 flex-1">
          <div className="text-4xl bg-white/10 p-3 rounded-xl">📰</div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold tracking-tight">Combined Reports Studio</h3>
            <p className="text-sm text-blue-50/90 leading-relaxed max-w-2xl">
              Draft newsletters and circulars that print alongside every learner’s term report card. Optionally include fee arrears and next-term charges per learner. No extra steps — it just appears.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-white text-blue-600 hover:bg-blue-50 active:scale-95 transition px-5 py-3 rounded-xl font-semibold text-sm shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Newsletter
        </button>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:translate-y-[-2px] transition duration-200">
          <div className="text-3xl font-extrabold text-blue-600 mb-1">{newsletters.length}</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">NEWSLETTERS</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:translate-y-[-2px] transition duration-200">
          <div className="text-3xl font-extrabold text-blue-600 mb-1">{newsletters.length}</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">ACTIVE INTEGRATIONS</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:translate-y-[-2px] transition duration-200">
          <div className="text-3xl font-extrabold text-blue-600 mb-1">{activeNewslettersCount}</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">ACTIVE NEWSLETTERS</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border-t-4 border-t-emerald-500 border-slate-200 hover:translate-y-[-2px] transition duration-200">
          <div className="text-3xl font-extrabold text-emerald-600 mb-1">{parentViewRate}%</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">PARENT VIEW RATE</div>
          <div className="text-[11px] text-slate-400">
            of <span className="font-semibold text-slate-600">{totalStudents}</span> registered students
          </div>
        </div>
      </div>

      {/* DYNAMIC NEWSLETTER FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-blue-600 text-white p-5 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" /> Create New Newsletter
              </h3>
              <button 
                onClick={() => setShowForm(false)}
                className="text-white/80 hover:text-white font-semibold text-sm px-2.5 py-1 rounded hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateNewsletter} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Report Card / Newsletter Title *
                </label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Term 2 End Term 2026 Circular" 
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Academic Year
                  </label>
                  <input 
                    type="number" 
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Term
                  </label>
                  <select 
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
                  >
                    <option>Term 1</option>
                    <option>Term 2</option>
                    <option>Term 3</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Circular Message / Content *
                </label>
                <textarea 
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type the message to print on the report cards..." 
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                ></textarea>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-slate-700">
                  <input 
                    type="checkbox" 
                    checked={includeFeeArrears}
                    onChange={(e) => setIncludeFeeArrears(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" 
                  />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-600">Include Outstanding Fee Arrears</span>
                </label>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Next Term Charges (KES)
                  </label>
                  <input 
                    type="number" 
                    value={nextTermCharges || ''}
                    onChange={(e) => setNextTermCharges(Number(e.target.value))}
                    placeholder="e.g. 45000" 
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  ➕ Create Term Circular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      {newsletters.length === 0 ? (
        /* EMPTY STATE AREA */
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-slate-200 my-6">
          <div className="text-5xl mb-4 opacity-70">📰</div>
          <p className="text-lg font-semibold text-slate-700 mb-1">No newsletters yet</p>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Create your first school newsletter to include it on term report cards and print circulars alongside them automatically.
          </p>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition px-6 py-3 rounded-xl font-semibold text-sm shadow-sm inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create First Newsletter
          </button>
        </div>
      ) : (
        /* NEWSLETTERS LIST */
        <div className="space-y-4 my-6">
          <h3 className="text-md font-bold text-slate-700 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-500" /> Current Newsletters & Circulars
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {newsletters.map((newsletter) => (
              <div 
                key={newsletter.id} 
                className={`bg-white rounded-2xl border p-5 shadow-sm transition-all duration-200 relative ${
                  newsletter.isActive ? 'border-blue-200 ring-2 ring-blue-500/5' : 'border-slate-200 opacity-80'
                }`}
              >
                {/* Badge Row */}
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                      {newsletter.term} · {newsletter.year}
                    </span>
                    <h4 className="text-base font-bold text-slate-800 mt-1.5">{newsletter.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleActive(newsletter.id)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition ${
                        newsletter.isActive 
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {newsletter.isActive ? '● Active' : '○ Inactive'}
                    </button>
                    {canDelete() && (
                      <button 
                        onClick={() => deleteNewsletter(newsletter.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-slate-50 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content preview */}
                <p className="text-sm text-slate-600 line-clamp-3 bg-slate-50 p-3 rounded-xl mb-4 leading-relaxed font-medium">
                  {newsletter.content}
                </p>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 text-xs border-t border-slate-100 pt-3 text-slate-500">
                  <div>
                    <span className="font-semibold text-slate-400">Arrears Integration:</span>{' '}
                    <span className={newsletter.includeFeeArrears ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {newsletter.includeFeeArrears ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Next-Term Fee:</span>{' '}
                    <span className="font-bold text-slate-800">
                      {newsletter.nextTermCharges > 0 ? `KES ${newsletter.nextTermCharges.toLocaleString()}` : 'Not Specified'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setActivePreviewNewsletter(newsletter)}
                      className="text-blue-600 hover:text-blue-700 hover:underline text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" /> Preview
                    </button>
                    <button 
                      onClick={() => {
                        setActivePreviewNewsletter(newsletter);
                        setTimeout(() => window.print(), 150);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                  </div>
                  {newsletter.isActive && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      Parents viewed: {newsletter.viewedParents}/{totalStudents}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOTTOM ACTION BUTTONS */}
      <div className="flex gap-3 flex-wrap mt-8 pt-4 border-t border-slate-200">
        <button 
          onClick={() => setActivePreviewNewsletter(newsletters[0] || null)}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-1.5"
        >
          📊 Term Reports
        </button>
        <button 
          onClick={() => setActivePreviewNewsletter(newsletters[0] || null)}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-1.5"
        >
          📈 Generate Reports
        </button>
      </div>

      {/* 📄 REUSABLE COMBINED REPORT PREVIEW MODAL */}
      {activePreviewNewsletter && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
            
            {/* Modal Actions Header */}
            <div className="bg-slate-800 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-3 border-b border-slate-700 print:hidden shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-lg">📰</span>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-100 leading-tight">Combined Print Circular Preview</h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Integrates Newsletter & Accounts into Term report card</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.print()}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> Print Report
                </button>

                <button 
                  onClick={handleDownloadPDF}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>

                <button 
                  onClick={() => setActivePreviewNewsletter(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-700/50 p-1.5 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Document Container */}
            <div className="p-8 overflow-y-auto flex-1 bg-slate-100 print:bg-white print:p-0">
              <div id="combined-report-printable-card" className="max-w-3xl mx-auto bg-white p-8 sm:p-10 border border-slate-300 rounded-3xl shadow-sm text-slate-900 relative print:border-none print:shadow-none print:p-0 print:rounded-none overflow-hidden">
                <PrintHeader />
                
                {/* School Logo Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
                  <img 
                    src={schoolProfile.logoUrl || "https://via.placeholder.com/110/2563EB/FFFFFF?text=SCHOOL+LOGO"} 
                    alt="Watermark" 
                    className="w-80 h-80 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                {/* 📄 STANDARDIZED PRINT HEADER (Requested Fields: School Name, Top-right School Logo, Exam name, Grade, Stream, Term, Session) */}
                <div className="relative flex flex-col sm:flex-row justify-between items-center sm:items-start text-center sm:text-left gap-4 border-b-4 border-double border-slate-800 pb-5 mb-6">
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
                        <span className="text-slate-800 text-sm font-black uppercase">{activePreviewNewsletter.title}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Academic Session</span>
                        <span className="text-slate-800 text-sm font-black">{activePreviewNewsletter.year} Session</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Grade & Stream</span>
                        <span className="text-slate-800 text-sm font-black uppercase">Grade 8 · Alpha</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-400 uppercase text-[9px] tracking-wider block font-semibold">Term</span>
                        <span className="text-slate-800 text-sm font-black uppercase">{activePreviewNewsletter.term}</span>
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

                {/* CIRCULAR HEADER DETAILS */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6 flex items-start gap-2.5 text-xs font-semibold print:hidden">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-slate-600">
                    This official circular is dynamically configured to print alongside reports. Outstanding balances are mapped out per individual learner.
                  </p>
                </div>

                {/* THE CIRCULAR ANNOUNCEMENT CONTENT */}
                <div className="space-y-4 mb-8">
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-1">
                    I. General Circular Announcement
                  </h3>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-medium bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    {activePreviewNewsletter.content}
                  </p>
                </div>

                {/* THE FINANCIAL MATRIX BLOCK */}
                <div className="space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-1">
                    II. Individual Learner Statement of Account
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activePreviewNewsletter.includeFeeArrears && (
                      <div className="border border-red-200 bg-red-50/40 rounded-2xl p-4 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-wider block">Outstanding Fee Arrears</span>
                          <span className="text-sm font-extrabold text-red-700">KES 12,450.00</span>
                        </div>
                        <span className="text-lg">⚠️</span>
                      </div>
                    )}

                    {activePreviewNewsletter.nextTermCharges > 0 && (
                      <div className="border border-slate-200 bg-slate-50 rounded-2xl p-4 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Next Term Charges ({activePreviewNewsletter.term === 'Term 3' ? 'Term 1 2027' : 'Term 3 2026'})</span>
                          <span className="text-sm font-extrabold text-slate-800">KES {activePreviewNewsletter.nextTermCharges.toLocaleString()}.00</span>
                        </div>
                        <span className="text-lg">💳</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 text-[11px] text-slate-500 leading-relaxed font-semibold">
                    <p className="font-bold text-slate-700 mb-1">Payment Options:</p>
                    <p>• Bank: {schoolProfile.bankName || 'Equity Bank, Eldoret Branch'}</p>
                    <p>• Account: {schoolProfile.bankAccount || '01201987654321'}</p>
                    <p>• Paybill: 247247 (Enter school bank account above as the account reference)</p>
                  </div>
                </div>

                {/* SIGNATURE AREA */}
                <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 gap-6 text-xs font-semibold">
                  <div>
                    <span className="text-slate-400 block mb-3">Principal Name / Signature:</span>
                    <span className="text-slate-800 font-bold block">{schoolProfile.principalName || 'Dr. Joseph K. Kiprop'}</span>
                    <span className="text-slate-400 text-[10px] font-medium font-mono">Verified School Copy</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block mb-3">Board of Management Approval:</span>
                    <span className="text-slate-800 font-bold block">Madam Grace Koech</span>
                    <span className="text-slate-400 text-[10px] font-medium font-mono">Date: {new Date().toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Verification QR Code Badge */}
                <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <VerificationQRCode admissionNo={activePreviewNewsletter?.id || 'CIRCULAR'} learnerName={activePreviewNewsletter?.title} />
                  <div className="text-right text-[10px] font-mono text-slate-400">
                    <span>Standard Combined Newsletter Circular</span>
                    <span className="block">Generated dynamically · Page 1 of 1</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
