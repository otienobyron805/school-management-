import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  Database, 
  Save, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Info,
  UserCheck,
  Building2,
  GraduationCap
} from 'lucide-react';
import { 
  getKJSEAClassification, 
  saveClassification, 
  getAllClassifications, 
  LearnerClassificationRecord, 
  KJSEAClassification 
} from '../utils/kjsea';
import { getLearners, Learner } from '../utils/db';

export default function KJSEAClassificationComponent() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedAdmNo, setSelectedAdmNo] = useState<string>('');
  const [learnerName, setLearnerName] = useState<string>('');
  const [totalPoints, setTotalPoints] = useState<number | ''>(45);
  const [savedRecords, setSavedRecords] = useState<LearnerClassificationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Load registered learners
  useEffect(() => {
    const list = getLearners();
    setLearners(list);
  }, []);

  // Fetch saved classifications from MongoDB
  const loadSavedClassifications = async () => {
    setLoading(true);
    const records = await getAllClassifications();
    setSavedRecords(records);
    setLoading(false);
  };

  useEffect(() => {
    loadSavedClassifications();
  }, []);

  // Auto-fill learner name when admission number changes
  const handleSelectLearner = (admNo: string) => {
    setSelectedAdmNo(admNo);
    const found = learners.find(l => l.admNo === admNo);
    if (found) {
      setLearnerName(found.name);
    }
  };

  // Calculate live classification
  const ptsNumber = typeof totalPoints === 'number' ? totalPoints : 0;
  const currentClassification: KJSEAClassification = useMemo(() => {
    return getKJSEAClassification(ptsNumber);
  }, [ptsNumber]);

  // Handle Save to MongoDB
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmNo.trim()) {
      setStatusMsg({ type: 'error', text: 'Please select or enter an Admission Number.' });
      return;
    }
    if (totalPoints === '' || isNaN(Number(totalPoints))) {
      setStatusMsg({ type: 'error', text: 'Please enter valid total points.' });
      return;
    }

    setSaving(true);
    setStatusMsg(null);
    const saved = await saveClassification(selectedAdmNo.trim(), Number(totalPoints), learnerName.trim());
    setSaving(false);

    if (saved) {
      setStatusMsg({ 
        type: 'success', 
        text: `Classification saved to MongoDB for Adm #${saved.admissionNumber} (${saved.code} — ${saved.category})` 
      });
      loadSavedClassifications();
    } else {
      setStatusMsg({ type: 'error', text: 'Failed to save classification record.' });
    }
  };

  // Filtered saved records
  const filteredRecords = useMemo(() => {
    return savedRecords.filter(r => {
      const matchesSearch = 
        (r.admissionNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.learnerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.code || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'ALL' || r.category.includes(categoryFilter);
      return matchesSearch && matchesCategory;
    });
  }, [savedRecords, searchTerm, categoryFilter]);

  // Badge colors based on classification code
  const getBadgeStyle = (code: string) => {
    switch (code) {
      case 'EE1':
      case 'EE2':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'ME1':
      case 'ME2':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'AE1':
      case 'AE2':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'BE1':
      case 'BE2':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold tracking-wide uppercase">
              <Award className="w-4 h-4 text-indigo-300" />
              <span>Assessment & Placement Engine</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">KJSEA Total Point Classification</h1>
            <p className="text-indigo-200 text-sm max-w-2xl font-medium">
              Calculate, classify, and persist Kenya Junior School Education Assessment (KJSEA) learner total points directly to MongoDB with official national school placement categories.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <Database className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Storage Target</div>
              <div className="text-sm font-black text-white">MongoDB Collection</div>
              <div className="text-[11px] text-emerald-300 font-semibold font-mono">learner_classification</div>
            </div>
          </div>
        </div>
      </div>

      {/* TWO COLUMN SECTION: FORM & SCALE REFERENCE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: CALCULATOR FORM */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Learner Point Classifier</h2>
                <p className="text-xs text-slate-500 font-medium">Select a learner or enter details manually</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* LEARNER SELECTOR DROPDOWN */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                Select Registered Learner (Optional)
              </label>
              <select
                value={selectedAdmNo}
                onChange={e => handleSelectLearner(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Choose Learner from System --</option>
                {learners.map(l => (
                  <option key={l.id || l.admNo} value={l.admNo}>
                    {l.admNo} - {l.name} ({l.gradeStream || l.gradeLabel || `Grade ${l.grade} ${l.stream}`})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ADMISSION NUMBER */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                  Admission Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={selectedAdmNo}
                  onChange={e => setSelectedAdmNo(e.target.value)}
                  placeholder="e.g. ADM-2026-042"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* LEARNER NAME */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">Learner Full Name</label>
                <input
                  type="text"
                  value={learnerName}
                  onChange={e => setLearnerName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* TOTAL POINTS INPUT */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex justify-between">
                <span>KJSEA Total Points (9 – 72 Points)</span>
                <span className="text-indigo-600 font-bold">{ptsNumber} Points</span>
              </label>
              <div className="flex gap-4 items-center">
                <input
                  type="number"
                  min={0}
                  max={72}
                  required
                  value={totalPoints}
                  onChange={e => setTotalPoints(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Enter total points (e.g. 58)"
                  className="w-32 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-black text-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center"
                />
                <input
                  type="range"
                  min={0}
                  max={72}
                  value={ptsNumber}
                  onChange={e => setTotalPoints(Number(e.target.value))}
                  className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* LIVE RESULT CLASSIFICATION CARD */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4 shadow-lg border border-slate-800">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                <span>Real-Time Classification Result</span>
                <span className="text-emerald-400 font-mono text-[11px]">Auto-Calculated</span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Code</div>
                  <div className="text-2xl font-black text-indigo-400 mt-1">{currentClassification.code}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 col-span-2 text-left px-4">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Performance Level</div>
                  <div className="text-base font-black text-white mt-0.5">{currentClassification.performance}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-indigo-300 font-bold uppercase">Target Category</div>
                    <div className="text-sm font-black text-white">{currentClassification.category}</div>
                  </div>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 font-bold border border-indigo-400/30">
                  Points: {ptsNumber}
                </div>
              </div>
            </div>

            {/* STATUS FEEDBACK */}
            {statusMsg && (
              <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 ${
                statusMsg.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-wider p-4 rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving to MongoDB...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Classification to MongoDB</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: CLASSIFICATION REFERENCE SCALE TABLE */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-7 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 font-black">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">KJSEA Official Scale</h2>
              <p className="text-xs text-slate-500 font-medium">8-Band Points & Category Thresholds</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { range: '68 – 72 Pts', code: 'EE1', performance: 'Exceeding Expectations 1', category: 'C1 — National', color: 'border-l-4 border-l-emerald-500 bg-emerald-50/50' },
              { range: '60 – 67 Pts', code: 'EE2', performance: 'Exceeding Expectations 2', category: 'C1 — National', color: 'border-l-4 border-l-emerald-400 bg-emerald-50/30' },
              { range: '52 – 59 Pts', code: 'ME1', performance: 'Meeting Expectations 1', category: 'C2 — Extra-County', color: 'border-l-4 border-l-blue-500 bg-blue-50/50' },
              { range: '43 – 51 Pts', code: 'ME2', performance: 'Meeting Expectations 2', category: 'C2 — Extra-County', color: 'border-l-4 border-l-blue-400 bg-blue-50/30' },
              { range: '34 – 42 Pts', code: 'AE1', performance: 'Approaching Expectations 1', category: 'C3 — County', color: 'border-l-4 border-l-amber-500 bg-amber-50/50' },
              { range: '25 – 33 Pts', code: 'AE2', performance: 'Approaching Expectations 2', category: 'C3 — County', color: 'border-l-4 border-l-amber-400 bg-amber-50/30' },
              { range: '16 – 24 Pts', code: 'BE1', performance: 'Below Expectations 1', category: 'C4 — Sub-County', color: 'border-l-4 border-l-rose-400 bg-rose-50/30' },
              { range: '< 16 Pts', code: 'BE2', performance: 'Below Expectations 2', category: 'C4 — Sub-County', color: 'border-l-4 border-l-rose-500 bg-rose-50/50' },
            ].map((band, idx) => (
              <div key={idx} className={`p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-2 ${band.color}`}>
                <div className="font-mono font-bold text-slate-700 text-[11px] w-20 shrink-0">{band.range}</div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900 text-[11px]">{band.performance}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{band.category}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono bg-white shadow-xs border border-slate-200 text-slate-800">
                  {band.code}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SAVED CLASSIFICATIONS TABLE FROM MONGODB */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {/* TABLE HEADER & CONTROLS */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Saved Learner Classifications in MongoDB
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live records synchronized with MongoDB collection <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-mono">learner_classification</code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* SEARCH */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search name, adm no..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 md:w-56"
              />
            </div>

            {/* CATEGORY FILTER */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Categories</option>
              <option value="C1">C1 — National</option>
              <option value="C2">C2 — Extra-County</option>
              <option value="C3">C3 — County</option>
              <option value="C4">C4 — Sub-County</option>
            </select>

            {/* REFRESH */}
            <button
              onClick={loadSavedClassifications}
              disabled={loading}
              className="p-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              title="Refresh from MongoDB"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* TABLE BODY */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-4 pl-6">Admission No</th>
                <th className="p-4">Learner Name</th>
                <th className="p-4 text-center">Total Points</th>
                <th className="p-4">Classification Code</th>
                <th className="p-4">Performance Standard</th>
                <th className="p-4">Placement Category</th>
                <th className="p-4 pr-6">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600">No KJSEA classification records found.</p>
                    <p className="text-[11px] text-slate-400">Use the form above to compute and save learner classifications.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => (
                  <tr key={rec.admissionNumber || idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 pl-6 font-mono font-bold text-indigo-600">{rec.admissionNumber}</td>
                    <td className="p-4 font-bold text-slate-900">{rec.learnerName || '—'}</td>
                    <td className="p-4 text-center">
                      <span className="font-black text-sm text-slate-900 font-mono bg-slate-100 px-2.5 py-1 rounded-lg">
                        {rec.totalPoints}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${getBadgeStyle(rec.code)}`}>
                        {rec.code}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{rec.performance}</td>
                    <td className="p-4 font-medium text-slate-600">{rec.category}</td>
                    <td className="p-4 pr-6 text-[11px] font-mono text-slate-400">
                      {rec.updatedAt ? new Date(rec.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
