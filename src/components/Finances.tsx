import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Receipt, 
  Wallet, 
  PieChart, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Printer, 
  Download, 
  Edit3, 
  Trash2, 
  Eye, 
  User, 
  Building, 
  Calendar, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  FileText,
  MessageSquare,
  Sparkles,
  Layers,
  Copy,
  Share2,
  Lock,
  X
} from 'lucide-react';
import { 
  getLearners, 
  getFeeStructures, 
  saveFeeStructures, 
  getFeePayments, 
  saveFeePayments, 
  getCurrentUser, 
  getSystemSettings, 
  getSchoolProfile,
  Learner, 
  FeeStructure, 
  FeePayment 
} from '../utils/db';

export default function Finances() {
  const [activeTab, setActiveTab] = useState<'balances' | 'record' | 'structures' | 'transactions'>('balances');
  const [learners, setLearners] = useState<Learner[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  
  // Filter states
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [streamFilter, setStreamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1 2026');

  // Record payment form state
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'MPESA' | 'Bank Deposit' | 'Cash' | 'Cheque' | 'Direct Transfer'>('MPESA');
  const [payReference, setPayReference] = useState<string>('');
  const [payRemarks, setPayRemarks] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modal / Receipt state
  const [receiptModalPayment, setReceiptModalPayment] = useState<FeePayment | null>(null);
  const [copiedReceiptText, setCopiedReceiptText] = useState<boolean>(false);
  const [editStructureModal, setEditStructureModal] = useState<FeeStructure | null>(null);

  const currentUser = getCurrentUser();
  const systemSettings = getSystemSettings();
  const schoolProfile = getSchoolProfile();
  const schoolName = systemSettings.schoolName || schoolProfile.name || 'St Augustine School';

  useEffect(() => {
    setLearners(getLearners());
    setStructures(getFeeStructures());
    setPayments(getFeePayments());
  }, []);

  // Compute fee map per grade
  const structureMap = useMemo(() => {
    const map: Record<string, number> = {};
    structures.forEach(s => {
      map[s.gradeLabel] = s.totalFee;
    });
    return map;
  }, [structures]);

  // Compute total paid per student ID
  const studentPaidMap = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach(p => {
      map[p.studentId] = (map[p.studentId] || 0) + p.amountPaid;
    });
    return map;
  }, [payments]);

  // Available grades and streams
  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    learners.forEach(l => {
      const g = l.gradeLabel || (l.grade ? `Grade ${l.grade}` : '');
      if (g) set.add(g);
    });
    if (set.size === 0) {
      ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'].forEach(g => set.add(g));
    }
    return Array.from(set).sort();
  }, [learners]);

  const availableStreams = useMemo(() => {
    const set = new Set<string>();
    learners.forEach(l => {
      if (l.stream) set.add(l.stream);
    });
    if (set.size === 0) {
      ['Alpha', 'Beta', 'Gamma', 'East', 'West', 'North', 'South'].forEach(s => set.add(s));
    }
    return Array.from(set).sort();
  }, [learners]);

  // Combined learner ledgers
  const learnerLedgers = useMemo(() => {
    return learners.map(l => {
      const gradeLabel = l.gradeLabel || (l.grade ? `Grade ${l.grade}` : 'Grade 1');
      const totalFee = structureMap[gradeLabel] || 16000;
      const totalPaid = studentPaidMap[l.id] || 0;
      const balance = Math.max(0, totalFee - totalPaid);
      const name = l.fullName || `${l.firstName || ''} ${l.secondName || ''} ${l.otherName || ''}`.trim() || l.name || 'Student';
      const adm = l.admNo || l.admissionNumber || l.id;

      let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      if (totalPaid >= totalFee) status = 'paid';
      else if (totalPaid > 0) status = 'partial';

      return {
        learner: l,
        id: l.id,
        name,
        adm,
        gradeLabel,
        stream: l.stream || 'N/A',
        phone: l.parentPhone || '',
        totalFee,
        totalPaid,
        balance,
        status,
      };
    });
  }, [learners, structureMap, studentPaidMap]);

  // Filtered ledgers
  const filteredLedgers = useMemo(() => {
    return learnerLedgers.filter(item => {
      const matchesGrade = gradeFilter === 'all' || item.gradeLabel === gradeFilter;
      const matchesStream = streamFilter === 'all' || item.stream.toLowerCase() === streamFilter.toLowerCase();
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.adm.toLowerCase().includes(q);

      return matchesGrade && matchesStream && matchesStatus && matchesSearch;
    });
  }, [learnerLedgers, gradeFilter, streamFilter, statusFilter, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalInvoiced = learnerLedgers.reduce((acc, curr) => acc + curr.totalFee, 0);
    const totalCollected = learnerLedgers.reduce((acc, curr) => acc + curr.totalPaid, 0);
    const totalOutstanding = learnerLedgers.reduce((acc, curr) => acc + curr.balance, 0);
    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

    return { totalInvoiced, totalCollected, totalOutstanding, collectionRate };
  }, [learnerLedgers]);

  // Handle Record Payment Submission
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      alert('Please select a student.');
      return;
    }
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const studentLedger = learnerLedgers.find(l => l.id === selectedStudentId);
    if (!studentLedger) return;

    const newPayment: FeePayment = {
      id: `PAY-${Date.now().toString().slice(-6)}`,
      studentId: studentLedger.id,
      studentName: studentLedger.name,
      admNo: studentLedger.adm,
      grade: studentLedger.gradeLabel,
      stream: studentLedger.stream,
      amountPaid: amt,
      paymentMethod: payMethod,
      referenceNo: payReference.trim() || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      date: payDate,
      term: selectedTerm,
      recordedBy: currentUser?.fullName || currentUser?.username || 'Finance Officer',
      remarks: payRemarks.trim() || undefined,
    };

    const nextPayments = [newPayment, ...payments];
    setPayments(nextPayments);
    saveFeePayments(nextPayments);

    // Reset form & show receipt
    setPayAmount('');
    setPayReference('');
    setPayRemarks('');
    setReceiptModalPayment(newPayment);
  };

  // WhatsApp Fee Reminder Generator
  const getWhatsAppReminderText = (ledger: typeof learnerLedgers[0]) => {
    return `💳 ${schoolName} — FEE BALANCE STATEMENT\n📚 Student: ${ledger.name}\n📝 Adm No: ${ledger.adm} | Class: ${ledger.gradeLabel} (${ledger.stream})\n\n💵 Term Fee: KES ${ledger.totalFee.toLocaleString()}\n✅ Paid Amount: KES ${ledger.totalPaid.toLocaleString()}\n⚠️ Outstanding Balance: KES ${ledger.balance.toLocaleString()}\n\nDear Parent/Guardian, kindly settle the balance at your earliest convenience via M-PESA or Bank.\nThank you for your support!\n— Finance Office, ${schoolName}`;
  };

  const handleSendWhatsAppReminder = (ledger: typeof learnerLedgers[0]) => {
    if (!ledger.phone) {
      alert(`No parent phone number recorded for ${ledger.name}. Please add parent phone in Learners directory.`);
      return;
    }
    let cleanPhone = ledger.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.slice(1);
    else if (cleanPhone.length === 9) cleanPhone = '254' + cleanPhone;

    const msg = getWhatsAppReminderText(ledger);
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // WhatsApp Receipt Text
  const getReceiptWhatsAppText = (p: FeePayment) => {
    return `🧾 ${schoolName} — PAYMENT RECEIPT\nReceipt No: ${p.id}\nDate: ${p.date}\n📚 Student: ${p.studentName} (Adm: ${p.admNo})\nClass: ${p.grade} (${p.stream})\n\n💵 Amount Received: KES ${p.amountPaid.toLocaleString()}\n💳 Method: ${p.paymentMethod}\n📌 Ref No: ${p.referenceNo}\n\nThank you for your payment!\n— Finance Office, ${schoolName}`;
  };

  // Save Structure Edits
  const handleSaveStructure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStructureModal) return;

    const total = editStructureModal.tuitionFee + editStructureModal.activityFee + editStructureModal.examFee;
    const updated = structures.map(s => s.id === editStructureModal.id ? { ...editStructureModal, totalFee: total } : s);
    setStructures(updated);
    saveFeeStructures(updated);
    setEditStructureModal(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-3 sm:p-5 md:p-6 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 🚀 PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <DollarSign className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Financial Management
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border border-emerald-200">
                  {selectedTerm}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Manage student fee structures, record collections, inspect balances, and issue digital receipts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('record')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Fee Payment</span>
            </button>
          </div>
        </div>

        {/* 📊 ANALYTICAL SUMMARY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Total Invoiced</span>
              <Receipt className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono">
              KES {metrics.totalInvoiced.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold text-slate-400">
              Across {learnerLedgers.length} registered learners
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-2xs space-y-2 bg-emerald-50/20">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-xs font-bold uppercase tracking-wider">Total Collected</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-emerald-800 font-mono">
              KES {metrics.totalCollected.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {metrics.collectionRate}% Collection Efficiency
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-2xs space-y-2 bg-rose-50/20">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-xs font-bold uppercase tracking-wider">Pending Balances</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-rose-800 font-mono">
              KES {metrics.totalOutstanding.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold text-rose-600">
              Outstanding fee obligations
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Total Transactions</span>
              <CreditCard className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-indigo-900 font-mono">
              {payments.length} Payments
            </div>
            <div className="text-[10px] font-bold text-indigo-600">
              Recorded in system ledger
            </div>
          </div>
        </div>

        {/* 🗂️ NAVIGATION SUB-TABS */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('balances')}
            className={`py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'balances'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Student Fee Ledgers & Balances</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'balances' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {filteredLedgers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('record')}
            className={`py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'record'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>

          <button
            onClick={() => setActiveTab('structures')}
            className={`py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'structures'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Grade Fee Structures</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Transaction Logs</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'transactions' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {payments.length}
            </span>
          </button>
        </div>

        {/* TAB 1: STUDENT BALANCES & LEDGER */}
        {activeTab === 'balances' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Grade / Class</label>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-800 cursor-pointer"
                >
                  <option value="all">🏫 All Grades</option>
                  {availableGrades.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Stream</label>
                <select
                  value={streamFilter}
                  onChange={(e) => setStreamFilter(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-800 cursor-pointer"
                >
                  <option value="all">🌊 All Streams</option>
                  {availableStreams.map(s => (
                    <option key={s} value={s}>Stream {s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Payment Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full text-xs font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-800 cursor-pointer"
                >
                  <option value="all">📌 All Statuses</option>
                  <option value="paid">✅ Fully Paid</option>
                  <option value="partial">⏳ Partial Payment</option>
                  <option value="unpaid">⚠️ Unpaid / Full Balance</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Search Student</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name or adm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs font-medium pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Ledgers Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="p-3.5 pl-5">Learner Details</th>
                    <th className="p-3.5">Class / Stream</th>
                    <th className="p-3.5 text-right">Term Fee</th>
                    <th className="p-3.5 text-right">Amount Paid</th>
                    <th className="p-3.5 text-right">Balance Due</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {filteredLedgers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                        No student ledgers match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLedgers.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 pl-5">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">Adm: {item.adm}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-800">{item.gradeLabel}</span>
                          <span className="text-[10px] text-slate-500 font-mono block">{item.stream}</span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-700">
                          KES {item.totalFee.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                          KES {item.totalPaid.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-rose-600">
                          KES {item.balance.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            item.status === 'paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            item.status === 'partial' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {item.status === 'paid' ? 'Cleared' : item.status === 'partial' ? 'Partial' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedStudentId(item.id);
                                setActiveTab('record');
                              }}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Record Payment for this student"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Pay</span>
                            </button>

                            <button
                              onClick={() => handleSendWhatsAppReminder(item)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Send WhatsApp Fee Statement"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: RECORD PAYMENT */}
        {activeTab === 'record' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 max-w-2xl mx-auto space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Record New Student Fee Payment
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Enter payment details to update student fee ledger and generate an official receipt.
              </p>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              {/* Select Student */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Learner *</label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full text-xs font-semibold p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 cursor-pointer"
                >
                  <option value="">-- Choose Learner from List --</option>
                  {learnerLedgers.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} (Adm: {l.adm}) — {l.gradeLabel} ({l.stream}) | Bal: KES {l.balance.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Amount Paid (KES) *</label>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    required
                    placeholder="e.g. 10000"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full text-xs font-mono font-bold p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Method *</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 cursor-pointer"
                  >
                    <option value="MPESA">📱 M-PESA</option>
                    <option value="Bank Deposit">🏦 Bank Deposit</option>
                    <option value="Cash">💵 Cash</option>
                    <option value="Cheque">📄 Cheque</option>
                    <option value="Direct Transfer">🌐 Direct Transfer</option>
                  </select>
                </div>
              </div>

              {/* Reference & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">M-PESA / Bank Ref Code</label>
                  <input
                    type="text"
                    placeholder="e.g. QX89LK2390"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Remarks / Notes</label>
                <input
                  type="text"
                  placeholder="Optional remarks e.g. Paid via Equity Bank deposit"
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs transition shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Payment & Generate Receipt</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: FEE STRUCTURES */}
        {activeTab === 'structures' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Grade Fee Structures ({selectedTerm})</h3>
                <p className="text-xs text-slate-500">Configure tuition, activity, and exam fees per grade level.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {structures.map((struct) => (
                <div key={struct.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 relative">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-black text-sm text-slate-900">{struct.gradeLabel}</span>
                    <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                      {struct.term}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Tuition Fee:</span>
                      <span className="font-mono font-bold">KES {struct.tuitionFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Activity & Sports:</span>
                      <span className="font-mono font-bold">KES {struct.activityFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Exams & Assessments:</span>
                      <span className="font-mono font-bold">KES {struct.examFee.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Term Fee</span>
                      <span className="text-sm font-black text-blue-900 font-mono">KES {struct.totalFee.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => setEditStructureModal(struct)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: TRANSACTION LOGS */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Payment Audit Logs</h3>
                <p className="text-xs text-slate-500">History of all fee payments recorded in system database.</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="p-3.5 pl-5">Receipt ID</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Learner</th>
                    <th className="p-3.5">Class</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5">Ref No</th>
                    <th className="p-3.5 pr-5 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                        No payments recorded yet. Click "Record Fee Payment" above to add one!
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 pl-5 font-mono font-bold text-blue-700">{p.id}</td>
                        <td className="p-3.5 text-slate-600">{p.date}</td>
                        <td className="p-3.5 font-bold text-slate-900">{p.studentName}</td>
                        <td className="p-3.5 text-slate-600">{p.grade} ({p.stream})</td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-700">KES {p.amountPaid.toLocaleString()}</td>
                        <td className="p-3.5 font-bold text-slate-700">{p.paymentMethod}</td>
                        <td className="p-3.5 font-mono text-slate-500">{p.referenceNo}</td>
                        <td className="p-3.5 pr-5 text-right">
                          <button
                            onClick={() => setReceiptModalPayment(p)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* RECEIPT MODAL */}
      {receiptModalPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-emerald-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                <h3 className="font-black text-sm">Official School Fee Receipt</h3>
              </div>
              <button onClick={() => setReceiptModalPayment(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="text-center border-b border-slate-200 pb-3 space-y-1">
                <h4 className="font-black text-slate-900 text-base">{schoolName}</h4>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Official Finance Receipt</p>
                <div className="text-[11px] font-mono font-bold text-emerald-700">{receiptModalPayment.id} • {receiptModalPayment.date}</div>
              </div>

              <div className="space-y-2 font-mono bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student:</span>
                  <span className="font-bold text-slate-900">{receiptModalPayment.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Adm No:</span>
                  <span className="font-bold text-slate-800">{receiptModalPayment.admNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Class:</span>
                  <span className="font-bold text-slate-800">{receiptModalPayment.grade} ({receiptModalPayment.stream})</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
                  <span className="font-bold text-slate-900">Amount Received:</span>
                  <span className="font-black text-emerald-700">KES {receiptModalPayment.amountPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Method:</span>
                  <span className="font-bold text-slate-800">{receiptModalPayment.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Ref Code:</span>
                  <span className="font-bold text-slate-800">{receiptModalPayment.referenceNo}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getReceiptWhatsAppText(receiptModalPayment));
                    setCopiedReceiptText(true);
                    setTimeout(() => setCopiedReceiptText(false), 2000);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedReceiptText ? 'Copied!' : 'Copy Text'}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(getReceiptWhatsAppText(receiptModalPayment))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Receipt</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT FEE STRUCTURE MODAL */}
      {editStructureModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">Edit {editStructureModal.gradeLabel} Fee Structure</h3>
              <button onClick={() => setEditStructureModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStructure} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tuition Fee (KES)</label>
                <input
                  type="number"
                  required
                  value={editStructureModal.tuitionFee}
                  onChange={(e) => setEditStructureModal({ ...editStructureModal, tuitionFee: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Activity Fee (KES)</label>
                <input
                  type="number"
                  required
                  value={editStructureModal.activityFee}
                  onChange={(e) => setEditStructureModal({ ...editStructureModal, activityFee: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Exam Fee (KES)</label>
                <input
                  type="number"
                  required
                  value={editStructureModal.examFee}
                  onChange={(e) => setEditStructureModal({ ...editStructureModal, examFee: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditStructureModal(null)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                >
                  Save Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
