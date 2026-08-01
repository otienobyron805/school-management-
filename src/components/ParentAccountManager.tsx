import React, { useState, useEffect } from 'react';
import { 
  getLearners, getGrades, getUsers, saveUsers, saveLearners,
  Learner, Grade, UserAccount 
} from '../utils/db';
import { 
  Users, UserPlus, Search, Phone, ShieldCheck, 
  CheckCircle2, AlertCircle, Trash2, ArrowRight,
  GraduationCap, LayoutGrid, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ParentAccountManager({ setActiveView }: { setActiveView: (view: string) => void }) {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedLearnerId, setSelectedLearnerId] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLearners(getLearners());
    setGrades(getGrades());
    setUsers(getUsers());
  }, []);

  const [showAllLearners, setShowAllLearners] = useState(false);
  const streams = grades.find(g => g.id === selectedGradeId)?.streams || [];
  
  const filteredLearners = learners.filter(l => {
    if (showAllLearners) return true;

    const selectedGrade = grades.find(g => g.id === selectedGradeId);
    const gradeName = selectedGrade?.name?.trim().toLowerCase();
    
    // Grade matching
    let gradeMatch = true;
    if (selectedGradeId && gradeName) {
      const lLabel = (l.gradeLabel || '').trim().toLowerCase();
      const lGradeNum = l.grade;
      const gNum = parseInt(gradeName.replace(/[^0-9]/g, '') || '-999');

      gradeMatch = 
        (lLabel === gradeName) || 
        (lLabel.includes(gradeName)) || 
        (gradeName.includes(lLabel) && lLabel.length > 2) ||
        (gNum !== -999 && lGradeNum === gNum) ||
        (l.grade.toString() === selectedGradeId); // Fallback if grade is stored as ID string
    }
    
    // Stream matching
    const streamMatch = !selectedStream || 
      (l.stream || '').trim().toLowerCase() === selectedStream.trim().toLowerCase();
    
    return gradeMatch && streamMatch;
  });

  const selectedLearner = learners.find(l => l.id === selectedLearnerId);

  useEffect(() => {
    if (selectedLearnerId) {
      const learner = learners.find(l => l.id === selectedLearnerId);
      if (learner?.parentPhone) {
        setParentPhone(learner.parentPhone);
      }
    }
  }, [selectedLearnerId, learners]);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedLearner) {
      setError('Please select a learner.');
      return;
    }

    const cleanPhone = parentPhone.replace(/\s+/g, '');
    if (!cleanPhone.match(/^(07\d{8}|01\d{8}|\+254\d{9})$/)) {
      setError('Please provide a valid phone number (e.g. 0712345678).');
      return;
    }

    // Check if account already exists for this phone
    const existing = users.find(u => u.username === cleanPhone);
    if (existing) {
      setError('An account with this phone number already exists.');
      return;
    }

    const newAccount: UserAccount = {
      id: `u_p_${Date.now()}`,
      username: cleanPhone,
      fullName: `Parent of ${selectedLearner.name}`,
      role: 'Parent',
      created: new Date().toISOString().split('T')[0],
      status: 'Active',
      password: selectedLearner.admNo, // Password is admission number
      phone: cleanPhone,
      permissions: ['perm_own_marks'] // Basic permissions
    };

    const updatedUsers = [...users, newAccount];
    setUsers(updatedUsers);
    saveUsers(updatedUsers);

    // Update learner with parent phone if not already there
    const updatedLearners = learners.map(l => 
      l.id === selectedLearner.id ? { ...l, parentPhone: cleanPhone } : l
    );
    setLearners(updatedLearners);
    saveLearners(updatedLearners); 

    setSuccess(`Parent portal created! Username: ${cleanPhone}, Password: ${selectedLearner.admNo}`);
    
    // Reset form partially
    setSelectedLearnerId('');
    setParentPhone('');
    setActiveView('Parent Accounts');
  };

  const [searchTerm, setSearchTerm] = useState('');
  
  const parentAccounts = users.filter(u => 
    u.role === 'Parent' && 
    (u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-600">
          <Users className="w-4 h-4" />
          <span>Parent Account Portal</span>
        </div>
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Creation Form */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">Link Parent Account</h2>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${showAllLearners ? 'bg-rose-500' : 'bg-slate-200'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showAllLearners ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={showAllLearners} 
                    onChange={(e) => setShowAllLearners(e.target.checked)} 
                  />
                  <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-slate-600 transition-colors">Show All</span>
                </label>

                {(selectedGradeId || selectedStream) && (
                  <button 
                    onClick={() => {
                      setSelectedGradeId('');
                      setSelectedStream('');
                      setSelectedLearnerId('');
                      setShowAllLearners(false);
                    }}
                    className="text-[10px] font-black text-rose-500 uppercase hover:underline cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">Select a learner to create their parent's login credentials.</p>
          </div>

          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Grade</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select 
                    value={selectedGradeId}
                    onChange={(e) => {
                      setSelectedGradeId(e.target.value);
                      setSelectedStream('');
                      setSelectedLearnerId('');
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none transition appearance-none cursor-pointer"
                  >
                    <option value="">Select Grade</option>
                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Stream</label>
                <div className="relative">
                  <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select 
                    value={selectedStream}
                    onChange={(e) => {
                      setSelectedStream(e.target.value);
                      setSelectedLearnerId('');
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none transition appearance-none cursor-pointer"
                    disabled={!selectedGradeId}
                  >
                    <option value="">Select Stream</option>
                    {streams.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Select Learner</label>
            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {learners.length} total in system
            </span>
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select 
              value={selectedLearnerId}
              onChange={(e) => setSelectedLearnerId(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none transition appearance-none cursor-pointer"
            >
              <option value="">{learners.length === 0 ? 'No learners found - please add some first' : `Select Learner (${filteredLearners.length} matching filters)`}</option>
              {filteredLearners.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.admNo}) - {l.gradeLabel} {l.stream}</option>
              ))}
            </select>
          </div>

            {selectedLearner && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 border border-rose-100 p-4 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-rose-400 uppercase">Account Preview</span>
                  <div className="px-2 py-0.5 bg-rose-200 text-rose-700 text-[9px] font-black rounded-full uppercase tracking-widest">Parent Portal</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Linked Learner</p>
                    <p className="text-sm font-black text-slate-700 tracking-tight">{selectedLearner.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Grade & Stream</p>
                    <p className="text-sm font-black text-slate-700 tracking-tight">{selectedLearner.gradeLabel} {selectedLearner.stream}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Auto-Password</p>
                    <p className="text-sm font-black text-slate-700 tracking-tight">{selectedLearner.admNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Role</p>
                    <p className="text-sm font-black text-slate-700 tracking-tight">Parent Account</p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Parent Phone Number (Username)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="e.g. 0722000000"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none transition"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={!selectedLearnerId || !parentPhone}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition shadow-lg shadow-slate-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Generate Account Portal
            </button>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-[10px] font-bold">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-600 text-[10px] font-bold">
                <CheckCircle2 className="w-4 h-4" />
                {success}
              </div>
            )}
          </form>
        </div>

        {/* Existing Accounts List */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Managed Parent Portals</h2>
              <p className="text-xs text-slate-500 mt-1">Existing accounts linked to learners.</p>
            </div>
            <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-wider">
              {parentAccounts.length} Total
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by phone or child name..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {parentAccounts.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-400">No parent accounts created yet.</p>
              </div>
            ) : (
              parentAccounts.map(u => {
                const linkedLearners = learners.filter(l => l.parentPhone === u.username);
                return (
                  <div key={u.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:bg-white hover:border-slate-200 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-rose-50 group-hover:border-rose-100 group-hover:text-rose-500 transition">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 tracking-tight">{u.username}</h4>
                        <div className="flex flex-wrap gap-x-2 gap-y-1 mt-0.5">
                          {linkedLearners.length > 0 ? linkedLearners.map(l => (
                            <div key={l.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-tight text-slate-500">
                              <User className="w-2.5 h-2.5" />
                              {l.name} • {l.gradeLabel} {l.stream}
                            </div>
                          )) : (
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{u.fullName}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button 
                        onClick={() => {
                          const updated = users.filter(usr => usr.id !== u.id);
                          setUsers(updated);
                          saveUsers(updated);
                        }}
                        className="p-2 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
