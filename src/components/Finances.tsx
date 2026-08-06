import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
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
  AlertTriangle,
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
  X,
  Bus,
  Building2,
  Save,
  RotateCcw,
  Smartphone,
  HelpCircle,
  Check,
  ShieldCheck,
  KeyRound,
  ShieldAlert,
  EyeOff,
  Unlock
} from 'lucide-react';
import { 
  getLearners, 
  getFeeStructures, 
  saveFeeStructures, 
  getFeePayments, 
  saveFeePayments, 
  clearAllFinanceData,
  getCurrentUser, 
  getSystemSettings, 
  getSchoolProfile,
  secureGet,
  secureSet,
  logActivity,
  Learner, 
  FeeStructure, 
  FeePayment 
} from '../utils/db';
import { canDelete } from '../utils/permissions';
import { confirmAction } from './ConfirmDialog';

// Interfaces for Fully Editable Fee Schedules, Transport & Bank Details
export interface DayScholarFeeRow {
  id: string;
  gradeLabel: string;
  term1: number;
  term2: number;
  term3: number;
  customTotal?: number | null;
}

export interface BoarderFeeRow {
  id: string;
  gradeLabel: string;
  term1: number;
  term2: number;
  term3: number;
  customTotal?: number | null;
}

export interface TransportRoute {
  id: string;
  routeName: string;
  amount: number;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
}

export interface FeeScheduleConfig {
  dayScholarHeaders: {
    grade: string;
    term1: string;
    term2: string;
    term3: string;
    total: string;
  };
  dayScholarRows: DayScholarFeeRow[];
  boarderHeaders: {
    grade: string;
    term1: string;
    term2: string;
    term3: string;
    total: string;
  };
  boarderRows: BoarderFeeRow[];
  transportHeaders: {
    routeName: string;
    amount: string;
  };
  transportRoutes: TransportRoute[];
  bankMpesaDetails: {
    schoolName: string;
    paybillNumber: string;
    accountReference: string;
    instructionText: string;
    banks: BankAccount[];
  };
}

const defaultFeeScheduleConfig: FeeScheduleConfig = {
  dayScholarHeaders: {
    grade: 'Grade / Class Level',
    term1: 'Term 1 Fee (KES)',
    term2: 'Term 2 Fee (KES)',
    term3: 'Term 3 Fee (KES)',
    total: 'Total Per Year (KES)',
  },
  dayScholarRows: [
    { id: 'ds-1', gradeLabel: 'PG-PP2', term1: 12000, term2: 10000, term3: 10000 },
    { id: 'ds-2', gradeLabel: 'Grades 1-3', term1: 14000, term2: 12000, term3: 12000 },
    { id: 'ds-3', gradeLabel: 'Grades 4-6', term1: 16000, term2: 14000, term3: 14000 },
    { id: 'ds-4', gradeLabel: 'Grades 7-9 (JS)', term1: 18000, term2: 16000, term3: 16000 },
  ],
  boarderHeaders: {
    grade: 'Grade / Class Level',
    term1: 'Term 1 Fee (KES)',
    term2: 'Term 2 Fee (KES)',
    term3: 'Term 3 Fee (KES)',
    total: 'Total Per Year (KES)',
  },
  boarderRows: [
    { id: 'bd-1', gradeLabel: 'Grades 3-9', term1: 32000, term2: 28000, term3: 28000 },
  ],
  transportHeaders: {
    routeName: 'Route Name',
    amount: 'Termly Amount (KES)',
  },
  transportRoutes: [
    { id: 'tr-1', routeName: 'Bahati Center', amount: 4500 },
    { id: 'tr-2', routeName: 'Kwa-Ndoro', amount: 5000 },
    { id: 'tr-3', routeName: 'Bahati-Scheme', amount: 5500 },
    { id: 'tr-4', routeName: 'Maili Tatu', amount: 6000 },
  ],
  bankMpesaDetails: {
    schoolName: 'St. Augustine Academy',
    paybillNumber: '247247',
    accountReference: 'Pupil ADM No & Name',
    instructionText: 'Use ADM No / Grade / Pupil\'s Name when depositing or paying via M-PESA',
    banks: [
      { id: 'bk-1', bankName: 'BSA Bank', accountNumber: '0112938475820' },
      { id: 'bk-2', bankName: 'Family Bank', accountNumber: '0450001928374' },
    ],
  },
};

// Cryptographic SHA-256 Passcode Digest Helper
async function hashPin(pin: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(pin.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPin(inputPin: string): Promise<boolean> {
  const inputHash = await hashPin(inputPin);
  const storedValue = secureGet('finance_security_pin');

  if (!storedValue) {
    const defaultHash = await hashPin('1234');
    return inputHash === defaultHash || inputPin.trim() === '1234';
  }

  if (storedValue.length === 64) {
    return inputHash === storedValue;
  } else {
    const isMatch = inputPin.trim() === storedValue;
    if (isMatch) {
      secureSet('finance_security_pin', inputHash);
    }
    return isMatch;
  }
}

export default function Finances() {
  const [activeTab, setActiveTab] = useState<'balances' | 'record' | 'schedules' | 'structures' | 'transactions'>('schedules');
  const [learners, setLearners] = useState<Learner[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);

  // Fee Schedules Config State
  const [scheduleConfig, setScheduleConfig] = useState<FeeScheduleConfig>(() => {
    const saved = secureGet('finances_schedules_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading finances_schedules_v2:', e);
      }
    }
    return defaultFeeScheduleConfig;
  });

  const [newRouteName, setNewRouteName] = useState<string>('');
  const [newRouteAmount, setNewRouteAmount] = useState<number | ''>('');
  const [saveToast, setSaveToast] = useState<boolean>(false);

  const saveScheduleConfig = (updated: FeeScheduleConfig) => {
    setScheduleConfig(updated);
    secureSet('finances_schedules_v2', JSON.stringify(updated));
    logActivity('general_change', 'Updated fee schedules, transport routes & bank details', currentUser?.fullName || 'User');
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };
  
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

  // Modal / Receipt / Add Structure state
  const [receiptModalPayment, setReceiptModalPayment] = useState<FeePayment | null>(null);
  const [copiedReceiptText, setCopiedReceiptText] = useState<boolean>(false);
  const [editStructureModal, setEditStructureModal] = useState<FeeStructure | null>(null);
  const [addStructureModalOpen, setAddStructureModalOpen] = useState<boolean>(false);
  const [newGradeLabel, setNewGradeLabel] = useState<string>('Grade 1');
  const [newTuitionFee, setNewTuitionFee] = useState<number | ''>('');
  const [newActivityFee, setNewActivityFee] = useState<number | ''>('');
  const [newExamFee, setNewExamFee] = useState<number | ''>('');
  
  const [feeConfig, setFeeConfig] = useState<FeeScheduleConfig>(() => {
    const saved = secureGet('fee_config');
    return saved ? JSON.parse(saved) : defaultFeeScheduleConfig;
  });

  // Finance Security PIN Lock State
  const [isFinanceUnlocked, setIsFinanceUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('finance_session_unlocked') === 'true';
  });
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [showPinDigits, setShowPinDigits] = useState<boolean>(false);
  const [showPinChangeModal, setShowPinChangeModal] = useState<boolean>(false);
  const [currentPinInput, setCurrentPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState<string>('');
  const [pinChangeMessage, setPinChangeMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Security Hardening: Stealth Mode, Rate-Limiting & Auto-Lock
  const [hideAmounts, setHideAmounts] = useState<boolean>(false);
  const [autoLockBanner, setAutoLockBanner] = useState<string>('');
  
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    return Number(sessionStorage.getItem('finance_pin_failed_attempts') || '0');
  });

  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState<number>(() => {
    const lockoutUntil = Number(sessionStorage.getItem('finance_pin_lockout_until') || '0');
    return Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
  });

  const currentUser = getCurrentUser();
  const systemSettings = getSystemSettings();
  const schoolProfile = getSchoolProfile();
  const schoolName = systemSettings.schoolName || schoolProfile.name || 'St Augustine School';

  const userRole = (currentUser?.role as string) || '';
  const isAuthorizedRole = ['Super Admin', 'Finance Officer', 'Bursar', 'Accountant', 'Admin'].includes(userRole);
  const canEditFinance = ['Super Admin', 'Finance Officer', 'Bursar', 'Accountant'].includes(userRole);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setLockoutSecondsLeft(prev => {
        if (prev <= 1) {
          sessionStorage.removeItem('finance_pin_lockout_until');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSecondsLeft]);

  // Inactivity auto-lock guard (3 minutes idle)
  useEffect(() => {
    if (!isFinanceUnlocked) return;

    let lastActivity = Date.now();
    const handleActivity = () => {
      lastActivity = Date.now();
    };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    activityEvents.forEach(ev => window.addEventListener(ev, handleActivity));

    const checkIdle = setInterval(() => {
      if (Date.now() - lastActivity > 3 * 60 * 1000) {
        setIsFinanceUnlocked(false);
        sessionStorage.removeItem('finance_session_unlocked');
        setPinInput('');
        setAutoLockBanner('Finance Vault was automatically locked due to 3 minutes of inactivity.');
        logActivity('general_change', 'SECURITY AUTO-LOCK: Finance Vault locked due to inactivity', currentUser?.fullName || 'User');
      }
    }, 5000);

    return () => {
      activityEvents.forEach(ev => window.removeEventListener(ev, handleActivity));
      clearInterval(checkIdle);
    };
  }, [isFinanceUnlocked]);

  const handleUnlockFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSecondsLeft > 0) return;

    const isValid = await verifyPin(pinInput);
    if (isValid) {
      setIsFinanceUnlocked(true);
      sessionStorage.setItem('finance_session_unlocked', 'true');
      sessionStorage.removeItem('finance_pin_failed_attempts');
      sessionStorage.removeItem('finance_pin_lockout_until');
      setFailedAttempts(0);
      setPinError('');
      setPinInput('');
      setAutoLockBanner('');
      logActivity('general_change', 'SECURITY OK: Unlocked Finance Vault via SHA-256 PIN Verification', currentUser?.fullName || 'User');
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      sessionStorage.setItem('finance_pin_failed_attempts', String(newAttempts));

      logActivity('general_change', `SECURITY ALERT: Failed PIN entry attempt #${newAttempts} in Finance Vault`, currentUser?.fullName || 'User');

      if (newAttempts >= 5) {
        const duration = 300; // 5 mins lockout
        const lockoutTime = Date.now() + duration * 1000;
        sessionStorage.setItem('finance_pin_lockout_until', String(lockoutTime));
        setLockoutSecondsLeft(duration);
        setPinError(`SECURITY LOCKOUT TRIGGERED: 5 failed attempts! Access blocked for 5 minutes.`);
      } else if (newAttempts >= 3) {
        const duration = 60; // 1 min lockout
        const lockoutTime = Date.now() + duration * 1000;
        sessionStorage.setItem('finance_pin_lockout_until', String(lockoutTime));
        setLockoutSecondsLeft(duration);
        setPinError(`BRUTE-FORCE GUARD TRIGGERED: 3 failed attempts! Access blocked for 60 seconds.`);
      } else {
        setPinError(`Incorrect PIN code. Attempt ${newAttempts} of 3 before security lockout. (Default: 1234)`);
      }
    }
  };

  const handleLockFinance = () => {
    setIsFinanceUnlocked(false);
    sessionStorage.removeItem('finance_session_unlocked');
    setPinInput('');
    logActivity('general_change', 'Locked Finance Vault session', currentUser?.fullName || 'User');
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isCurrentValid = await verifyPin(currentPinInput);
    if (!isCurrentValid) {
      setPinChangeMessage({ text: 'Current PIN is incorrect.', type: 'error' });
      return;
    }
    if (newPinInput.length < 4) {
      setPinChangeMessage({ text: 'New PIN must be at least 4 digits.', type: 'error' });
      return;
    }
    if (newPinInput !== confirmNewPinInput) {
      setPinChangeMessage({ text: 'New PIN and Confirmation PIN do not match.', type: 'error' });
      return;
    }

    const newHash = await hashPin(newPinInput);
    secureSet('finance_security_pin', newHash);
    setPinChangeMessage({ text: 'Security PIN encrypted (SHA-256) and updated successfully!', type: 'success' });
    logActivity('general_change', 'Updated Finance Security PIN (SHA-256 Digest)', currentUser?.fullName || 'User');
    setTimeout(() => {
      setShowPinChangeModal(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmNewPinInput('');
      setPinChangeMessage(null);
    }, 1500);
  };

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

  // Add New Fee Structure
  const handleAddStructure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGradeLabel) return;

    const tuition = Number(newTuitionFee) || 0;
    const activity = Number(newActivityFee) || 0;
    const exam = Number(newExamFee) || 0;
    const total = tuition + activity + exam;

    const newStruct: FeeStructure = {
      id: `fs-${Date.now()}`,
      gradeLabel: newGradeLabel,
      term: selectedTerm,
      tuitionFee: tuition,
      activityFee: activity,
      examFee: exam,
      totalFee: total
    };

    const updated = [...structures.filter(s => s.gradeLabel !== newGradeLabel), newStruct];
    setStructures(updated);
    saveFeeStructures(updated);
    setAddStructureModalOpen(false);
    setNewTuitionFee('');
    setNewActivityFee('');
    setNewExamFee('');
  };

  // Delete Individual Fee Structure
  const handleDeleteStructure = (id: string, name?: string) => {
    if (!canDelete()) {
      confirmAction({
        title: 'Permission Restricted',
        message: 'Only Super Admin can delete fee structures.',
        confirmText: 'OK',
        variant: 'warning',
        onConfirm: () => {}
      });
      return;
    }
    confirmAction({
      title: 'Delete Fee Structure',
      message: `Are you sure you want to delete fee structure "${name || 'selected structure'}"?`,
      confirmText: 'Delete Structure',
      variant: 'danger',
      onConfirm: () => {
        const updated = structures.filter(s => s.id !== id);
        setStructures(updated);
        saveFeeStructures(updated);
      }
    });
  };

  // Delete Individual Payment
  const handleDeletePayment = (id: string, receiptNo?: string) => {
    if (!canDelete()) {
      confirmAction({
        title: 'Permission Restricted',
        message: 'Only Super Admin can delete payment records.',
        confirmText: 'OK',
        variant: 'warning',
        onConfirm: () => {}
      });
      return;
    }
    confirmAction({
      title: 'Delete Fee Payment Record',
      message: `Are you sure you want to delete payment record ${receiptNo || 'selected payment'}?`,
      confirmText: 'Delete Payment',
      variant: 'danger',
      onConfirm: () => {
        const updated = payments.filter(p => p.id !== id);
        setPayments(updated);
        saveFeePayments(updated);
      }
    });
  };

  if (!isAuthorizedRole) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ x: 0, scale: 0.95, opacity: 0 }}
          animate={{ 
            x: [0, -12, 12, -8, 8, -4, 4, 0],
            scale: 1,
            opacity: 1
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white p-8 rounded-3xl border-2 border-rose-200 shadow-2xl max-w-md w-full text-center space-y-5 relative overflow-hidden"
        >
          {/* Top warning stripe accent */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600" />

          {/* Warning Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-rose-100/80 text-rose-800 border border-rose-300 shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>WARNING: ACCESS RESTRICTED</span>
          </div>

          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200 shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              The Financial Management module contains confidential fee structures, collections, and student ledgers. Access is strictly restricted to designated 'Finance Officer' or 'Super Admin' roles.
            </p>
          </div>

          <div className="p-3 bg-rose-50/50 rounded-xl text-[11px] font-bold text-rose-950 border border-rose-200/80 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Logged In User:</span>
            <span className="text-slate-900 font-extrabold">{currentUser?.fullName || 'User'} ({currentUser?.role || 'Guest'})</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isFinanceUnlocked) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Lock className="w-3 h-3" />
              SHA-256 Encrypted Finance Vault
            </span>
            <h2 className="text-2xl font-black text-slate-900">Enter Security PIN</h2>
            <p className="text-xs text-slate-500 font-medium">
              Please enter the Finance Security PIN to unlock fee structures, collection logs, and student ledgers.
            </p>
          </div>

          {autoLockBanner && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{autoLockBanner}</span>
            </div>
          )}

          {lockoutSecondsLeft > 0 && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl text-rose-900 text-xs font-bold space-y-1 text-center">
              <div className="flex items-center justify-center gap-1.5 text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="uppercase tracking-wide font-black">Security Lockout Active</span>
              </div>
              <p className="text-[11px] text-rose-800 font-medium">
                Too many failed PIN attempts. Vault unlocked in <span className="font-mono font-black text-sm text-rose-950">{lockoutSecondsLeft}s</span>
              </p>
            </div>
          )}

          <form onSubmit={handleUnlockFinance} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Security Passcode / PIN</label>
              <div className="relative">
                <input
                  type={showPinDigits ? "text" : "password"}
                  value={pinInput}
                  disabled={lockoutSecondsLeft > 0}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (pinError) setPinError('');
                  }}
                  placeholder={lockoutSecondsLeft > 0 ? `Locked (${lockoutSecondsLeft}s)` : "Enter PIN (Default: 1234)"}
                  maxLength={10}
                  autoFocus={lockoutSecondsLeft === 0}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-mono tracking-[0.3em] font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPinDigits(!showPinDigits)}
                  disabled={lockoutSecondsLeft > 0}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer disabled:opacity-40"
                  title={showPinDigits ? "Hide PIN" : "Show PIN"}
                >
                  {showPinDigits ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pinError && (
                <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{pinError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={lockoutSecondsLeft > 0}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <KeyRound className="w-4 h-4" />
              <span>{lockoutSecondsLeft > 0 ? `Locked for ${lockoutSecondsLeft}s` : 'Unlock Finance Vault'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              disabled={lockoutSecondsLeft > 0}
              onClick={() => setPinInput('1234')}
              className="text-emerald-600 hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-40"
            >
              <KeyRound className="w-3 h-3" />
              Use Default PIN (1234)
            </button>
            <span className="text-[10px] text-slate-400 font-medium">Auto-locks after 3m idle</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-medium text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>SHA-256 Digest Hashing</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-medium text-slate-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Brute-Force Lockout</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-medium text-slate-600 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>3-Min Inactivity Auto-Lock</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-medium text-slate-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Full Activity Audit Trail</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Financial Management
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border border-emerald-200">
                  {selectedTerm}
                </span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  SHA-256 & Rate-Limited Vault
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Manage student fee structures, record collections, inspect balances, and issue digital receipts.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setHideAmounts(!hideAmounts)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                hideAmounts 
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={hideAmounts ? "Amounts are currently masked for privacy" : "Click to mask monetary amounts against shoulder surfing"}
            >
              {hideAmounts ? <EyeOff className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5 text-slate-600" />}
              <span>{hideAmounts ? 'Stealth ON' : 'Mask Amounts'}</span>
            </button>

            <button
              onClick={() => setShowPinChangeModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 cursor-pointer"
              title="Change Finance Security PIN Code"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-600" />
              <span>Change PIN</span>
            </button>

            <button
              onClick={handleLockFinance}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-rose-200 cursor-pointer"
              title="Lock Finance Vault Session"
            >
              <Lock className="w-3.5 h-3.5 text-rose-600" />
              <span>Lock Session</span>
            </button>

            <button
              onClick={() => {
                setAddStructureModalOpen(true);
                setActiveTab('structures');
              }}
              className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-blue-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Fee Structure</span>
            </button>

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
            onClick={() => setActiveTab('schedules')}
            className={`py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'schedules'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-500" />
            <span>Fee Schedules & Bank / M-Pesa</span>
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

        {/* TAB 0: EDITABLE FEE SCHEDULES, TRANSPORT & BANK / MPESA */}
        {activeTab === 'schedules' && (
          <div className="space-y-8">
            {/* Header & Save Indicator */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Editable Fee Schedules, Transport & Bank Details
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  All words, grade labels, column headings, fee amounts, transport routes, bank names, and payment instructions are 100% editable.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {saveToast && (
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Saved!
                  </span>
                )}
                <button
                  onClick={() => {
                    if (window.confirm('Reset all schedules, routes, and bank details to original defaults?')) {
                      saveScheduleConfig(defaultFeeScheduleConfig);
                    }
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>
              </div>
            </div>

            {/* 📌 SECTION 1: DAY SCHOLARS FEE TABLE */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>🏠</span>
                    <span>Day Scholars Fee Breakdown</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Type directly into column headers, grade labels, and fee fields. Total auto-calculates or can be typed over.
                  </p>
                </div>

                <button
                  onClick={() => {
                    const newRow: DayScholarFeeRow = {
                      id: `ds-${Date.now()}`,
                      gradeLabel: 'New Grade',
                      term1: 0,
                      term2: 0,
                      term3: 0,
                    };
                    saveScheduleConfig({
                      ...scheduleConfig,
                      dayScholarRows: [...scheduleConfig.dayScholarRows, newRow],
                    });
                  }}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-blue-200 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Day Scholar Grade</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-700">
                      <th className="p-3 min-w-[160px]">
                        <input
                          type="text"
                          value={scheduleConfig.dayScholarHeaders.grade}
                          onChange={(e) => saveScheduleConfig({
                            ...scheduleConfig,
                            dayScholarHeaders: { ...scheduleConfig.dayScholarHeaders, grade: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500"
                          placeholder="Grade Column Heading"
                        />
                      </th>
                      <th className="p-3 min-w-[130px]">
                        <input
                          type="text"
                          value={scheduleConfig.dayScholarHeaders.term1}
                          onChange={(e) => saveScheduleConfig({
                            ...scheduleConfig,
                            dayScholarHeaders: { ...scheduleConfig.dayScholarHeaders, term1: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500"
                          placeholder="Term 1 Heading"
                        />
                      </th>
                      <th className="p-3 min-w-[130px]">
                        <input
                          type="text"
                          value={scheduleConfig.dayScholarHeaders.term2}
                          onChange={(e) => saveScheduleConfig({
                            ...scheduleConfig,
                            dayScholarHeaders: { ...scheduleConfig.dayScholarHeaders, term2: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500"
                          placeholder="Term 2 Heading"
                        />
                      </th>
                      <th className="p-3 min-w-[130px]">
                        <input
                          type="text"
                          value={scheduleConfig.dayScholarHeaders.term3}
                          onChange={(e) => saveScheduleConfig({
                            ...scheduleConfig,
                            dayScholarHeaders: { ...scheduleConfig.dayScholarHeaders, term3: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500"
                          placeholder="Term 3 Heading"
                        />
                      </th>
                      <th className="p-3 min-w-[150px]">
                        <input
                          type="text"
                          value={scheduleConfig.dayScholarHeaders.total}
                          onChange={(e) => saveScheduleConfig({
                            ...scheduleConfig,
                            dayScholarHeaders: { ...scheduleConfig.dayScholarHeaders, total: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500"
                          placeholder="Total Column Heading"
                        />
                      </th>
                      <th className="p-3 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {scheduleConfig.dayScholarRows.map((row) => {
                      const autoSum = row.term1 + row.term2 + row.term3;
                      const displayTotal = row.customTotal != null ? row.customTotal : autoSum;

                      return (
                        <tr key={row.id} className="hover:bg-slate-50 transition">
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.gradeLabel}
                              onChange={(e) => {
                                const updatedRows = scheduleConfig.dayScholarRows.map(r => r.id === row.id ? { ...r, gradeLabel: e.target.value } : r);
                                saveScheduleConfig({ ...scheduleConfig, dayScholarRows: updatedRows });
                              }}
                              className="w-full font-bold text-slate-900 bg-white border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                              placeholder="e.g. PG-PP2"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              value={row.term1}
                              onChange={(e) => {
                                const updatedRows = scheduleConfig.dayScholarRows.map(r => r.id === row.id ? { ...r, term1: Number(e.target.value) || 0 } : r);
                                saveScheduleConfig({ ...scheduleConfig, dayScholarRows: updatedRows });
                              }}
                              className="w-full font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              value={row.term2}
                              onChange={(e) => {
                                const updatedRows = scheduleConfig.dayScholarRows.map(r => r.id === row.id ? { ...r, term2: Number(e.target.value) || 0 } : r);
                                saveScheduleConfig({ ...scheduleConfig, dayScholarRows: updatedRows });
                              }}
                              className="w-full font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              value={row.term3}
                              onChange={(e) => {
                                const updatedRows = scheduleConfig.dayScholarRows.map(r => r.id === row.id ? { ...r, term3: Number(e.target.value) || 0 } : r);
                                saveScheduleConfig({ ...scheduleConfig, dayScholarRows: updatedRows });
                              }}
                              className="w-full font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              value={displayTotal}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                const updatedRows = scheduleConfig.dayScholarRows.map(r => r.id === row.id ? { ...r, customTotal: val } : r);
                                saveScheduleConfig({ ...scheduleConfig, dayScholarRows: updatedRows });
                              }}
                              className="w-full font-mono font-extrabold text-blue-900 bg-blue-50/50 border border-blue-200 rounded-lg p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                              title="Type over to override auto-calculated total"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => {
                                const updatedRows = scheduleConfig.dayScholarRows.filter(r => r.id !== row.id);
                                saveScheduleConfig({ ...scheduleConfig, dayScholarRows: updatedRows });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Grade Row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 📌 SECTION 2: BOARDERS FEE TABLE */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>🛏️</span>
                    <span>Boarders Fee Breakdown</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Edit grade range labels, term fees, and annual totals directly.
                  </p>
                </div>

                <button
                  onClick={() => {
                    const newRow: BoarderFeeRow = {
                      id: `bd-${Date.now()}`,
                      gradeLabel: 'Grades 1-9',
                      term1: 0,
                      term2: 0,
                      term3: 0,
                    };
                    saveScheduleConfig({
                      ...scheduleConfig,
                      boarderRows: [...scheduleConfig.boarderRows, newRow],
                    });
                  }}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-blue-200 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Boarder Grade</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-700">
                      <th className="p-3 min-w-[160px]">
                        <input
                          type="text"
                          value={scheduleConfig.boarderHeaders.grade}
                          onChange={(e) => saveScheduleConfig({
                            ...scheduleConfig,
                            boarderHeaders: { ...scheduleConfig.boarderHeaders, grade: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </th>
                      <th className="p-3 min-w-[130px]">
                        <input
                          type="text"
                          value={scheduleConfig.boarderHeaders.term1}
                          onChange={(e) => saveScheduleConfig({
                            ...scheduleConfig,
                            boarderHeaders: { ...scheduleConfig.boarderHeaders, term1: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </th>
                      <th className="p-3 min-w-[130px]">
                        <input
                          type="text"
                          value={scheduleConfig.boarderHeaders.term2}
                          onChange={(e) => saveScheduleConfig({
                            ...scheduleConfig,
                            boarderHeaders: { ...scheduleConfig.boarderHeaders, term2: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </th>
                      <th className="p-3 min-w-[130px]">
                        <input
                          type="text"
                          value={scheduleConfig.boarderHeaders.term3}
                          onChange={(e) => saveScheduleConfig({
                            ...scheduleConfig,
                            boarderHeaders: { ...scheduleConfig.boarderHeaders, term3: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </th>
                      <th className="p-3 min-w-[150px]">
                        <input
                          type="text"
                          value={scheduleConfig.boarderHeaders.total}
                          onChange={(e) => saveScheduleConfig({
                            ...scheduleConfig,
                            boarderHeaders: { ...scheduleConfig.boarderHeaders, total: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </th>
                      <th className="p-3 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {scheduleConfig.boarderRows.map((row) => {
                      const autoSum = row.term1 + row.term2 + row.term3;
                      const displayTotal = row.customTotal != null ? row.customTotal : autoSum;

                      return (
                        <tr key={row.id} className="hover:bg-slate-50 transition">
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.gradeLabel}
                              onChange={(e) => {
                                const updatedRows = scheduleConfig.boarderRows.map(r => r.id === row.id ? { ...r, gradeLabel: e.target.value } : r);
                                saveScheduleConfig({ ...scheduleConfig, boarderRows: updatedRows });
                              }}
                              className="w-full font-bold text-slate-900 bg-white border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                              placeholder="e.g. Grades 3-9"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              value={row.term1}
                              onChange={(e) => {
                                const updatedRows = scheduleConfig.boarderRows.map(r => r.id === row.id ? { ...r, term1: Number(e.target.value) || 0 } : r);
                                saveScheduleConfig({ ...scheduleConfig, boarderRows: updatedRows });
                              }}
                              className="w-full font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              value={row.term2}
                              onChange={(e) => {
                                const updatedRows = scheduleConfig.boarderRows.map(r => r.id === row.id ? { ...r, term2: Number(e.target.value) || 0 } : r);
                                saveScheduleConfig({ ...scheduleConfig, boarderRows: updatedRows });
                              }}
                              className="w-full font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              value={row.term3}
                              onChange={(e) => {
                                const updatedRows = scheduleConfig.boarderRows.map(r => r.id === row.id ? { ...r, term3: Number(e.target.value) || 0 } : r);
                                saveScheduleConfig({ ...scheduleConfig, boarderRows: updatedRows });
                              }}
                              className="w-full font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </td>
                          <td className="p-2.5">
                            <input
                              type="number"
                              value={displayTotal}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                const updatedRows = scheduleConfig.boarderRows.map(r => r.id === row.id ? { ...r, customTotal: val } : r);
                                saveScheduleConfig({ ...scheduleConfig, boarderRows: updatedRows });
                              }}
                              className="w-full font-mono font-extrabold text-blue-900 bg-blue-50/50 border border-blue-200 rounded-lg p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                              title="Type over to override auto-calculated total"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => {
                                const updatedRows = scheduleConfig.boarderRows.filter(r => r.id !== row.id);
                                saveScheduleConfig({ ...scheduleConfig, boarderRows: updatedRows });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Grade Row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 📌 SECTION 3: TERMLY TRANSPORT */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Bus className="w-5 h-5 text-amber-500" />
                    <span>Termly Transport Routes & Pricing</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Rename any route, change any price, or add new transport routes instantly.
                  </p>
                </div>
              </div>

              {/* Add New Route Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newRouteName.trim()) return;
                  const newRoute: TransportRoute = {
                    id: `tr-${Date.now()}`,
                    routeName: newRouteName.trim(),
                    amount: Number(newRouteAmount) || 0,
                  };
                  saveScheduleConfig({
                    ...scheduleConfig,
                    transportRoutes: [...scheduleConfig.transportRoutes, newRoute],
                  });
                  setNewRouteName('');
                  setNewRouteAmount('');
                }}
                className="flex flex-col sm:flex-row items-center gap-2 bg-amber-50/60 p-3 rounded-2xl border border-amber-200"
              >
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Type new route name e.g. Bahati Center..."
                    value={newRouteName}
                    onChange={(e) => setNewRouteName(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <input
                    type="number"
                    placeholder="Amount e.g. 4500"
                    value={newRouteAmount}
                    onChange={(e) => setNewRouteAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold p-2.5 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Route</span>
                </button>
              </form>

              {/* Table of Routes */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-700">
                      <th className="p-3">
                        <input
                          type="text"
                          value={scheduleConfig.transportHeaders.routeName}
                          onChange={(e) => saveScheduleConfig({
                            ...scheduleConfig,
                            transportHeaders: { ...scheduleConfig.transportHeaders, routeName: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </th>
                      <th className="p-3 w-48">
                        <input
                          type="text"
                          value={scheduleConfig.transportHeaders.amount}
                          onChange={(e) => saveScheduleConfig({
                            ...scheduleConfig,
                            transportHeaders: { ...scheduleConfig.transportHeaders, amount: e.target.value }
                          })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </th>
                      <th className="p-3 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {scheduleConfig.transportRoutes.map((route) => (
                      <tr key={route.id} className="hover:bg-slate-50 transition">
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={route.routeName}
                            onChange={(e) => {
                              const updatedRoutes = scheduleConfig.transportRoutes.map(r => r.id === route.id ? { ...r, routeName: e.target.value } : r);
                              saveScheduleConfig({ ...scheduleConfig, transportRoutes: updatedRoutes });
                            }}
                            className="w-full font-bold text-slate-900 bg-white border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            placeholder="Route Name"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            value={route.amount}
                            onChange={(e) => {
                              const updatedRoutes = scheduleConfig.transportRoutes.map(r => r.id === route.id ? { ...r, amount: Number(e.target.value) || 0 } : r);
                              saveScheduleConfig({ ...scheduleConfig, transportRoutes: updatedRoutes });
                            }}
                            className="w-full font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => {
                              const updatedRoutes = scheduleConfig.transportRoutes.filter(r => r.id !== route.id);
                              saveScheduleConfig({ ...scheduleConfig, transportRoutes: updatedRoutes });
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete Route"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 📌 SECTION 4: SCHOOL BANK & MPESA */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span>School Bank & M-Pesa Payment Details</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Edit bank names, account numbers, paybill numbers, and payment instructions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* School Name & M-Pesa Details */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>General & M-Pesa Accounts</span>
                  </h4>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">School Name</label>
                    <input
                      type="text"
                      value={scheduleConfig.bankMpesaDetails.schoolName}
                      onChange={(e) => saveScheduleConfig({
                        ...scheduleConfig,
                        bankMpesaDetails: { ...scheduleConfig.bankMpesaDetails, schoolName: e.target.value }
                      })}
                      className="w-full text-xs font-extrabold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Paybill Number</label>
                      <input
                        type="text"
                        value={scheduleConfig.bankMpesaDetails.paybillNumber}
                        onChange={(e) => saveScheduleConfig({
                          ...scheduleConfig,
                          bankMpesaDetails: { ...scheduleConfig.bankMpesaDetails, paybillNumber: e.target.value }
                        })}
                        className="w-full text-xs font-mono font-black p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Account Reference</label>
                      <input
                        type="text"
                        value={scheduleConfig.bankMpesaDetails.accountReference}
                        onChange={(e) => saveScheduleConfig({
                          ...scheduleConfig,
                          bankMpesaDetails: { ...scheduleConfig.bankMpesaDetails, accountReference: e.target.value }
                        })}
                        className="w-full text-xs font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Instruction Note Text</label>
                    <textarea
                      rows={2}
                      value={scheduleConfig.bankMpesaDetails.instructionText}
                      onChange={(e) => saveScheduleConfig({
                        ...scheduleConfig,
                        bankMpesaDetails: { ...scheduleConfig.bankMpesaDetails, instructionText: e.target.value }
                      })}
                      className="w-full text-xs font-medium p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                    />
                  </div>
                </div>

                {/* Bank Accounts List */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span>School Bank Accounts</span>
                    </h4>
                    <button
                      onClick={() => {
                        const newBank: BankAccount = {
                          id: `bk-${Date.now()}`,
                          bankName: 'New Bank Name',
                          accountNumber: '0000000000',
                        };
                        saveScheduleConfig({
                          ...scheduleConfig,
                          bankMpesaDetails: {
                            ...scheduleConfig.bankMpesaDetails,
                            banks: [...scheduleConfig.bankMpesaDetails.banks, newBank]
                          }
                        });
                      }}
                      className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Bank</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {scheduleConfig.bankMpesaDetails.banks.map((b) => (
                      <div key={b.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-2">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={b.bankName}
                            onChange={(e) => {
                              const updatedBanks = scheduleConfig.bankMpesaDetails.banks.map(item => item.id === b.id ? { ...item, bankName: e.target.value } : item);
                              saveScheduleConfig({
                                ...scheduleConfig,
                                bankMpesaDetails: { ...scheduleConfig.bankMpesaDetails, banks: updatedBanks }
                              });
                            }}
                            className="text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                            placeholder="Bank Name e.g. BSA Bank"
                          />
                          <input
                            type="text"
                            value={b.accountNumber}
                            onChange={(e) => {
                              const updatedBanks = scheduleConfig.bankMpesaDetails.banks.map(item => item.id === b.id ? { ...item, accountNumber: e.target.value } : item);
                              saveScheduleConfig({
                                ...scheduleConfig,
                                bankMpesaDetails: { ...scheduleConfig.bankMpesaDetails, banks: updatedBanks }
                              });
                            }}
                            className="text-xs font-mono font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                            placeholder="Account Number"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const updatedBanks = scheduleConfig.bankMpesaDetails.banks.filter(item => item.id !== b.id);
                            saveScheduleConfig({
                              ...scheduleConfig,
                              bankMpesaDetails: { ...scheduleConfig.bankMpesaDetails, banks: updatedBanks }
                            });
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Remove Bank Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Grade Fee Structures ({selectedTerm})</h3>
                <p className="text-xs text-slate-500">Configure tuition, activity, and exam fees per grade level.</p>
              </div>
              <button
                onClick={() => setAddStructureModalOpen(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Fee Structure</span>
              </button>
            </div>

            {structures.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 space-y-3">
                <Wallet className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">No Fee Structures Added Yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click the button below to add your school's tuition, activity, and exam fee breakdown for each grade.
                </p>
                <button
                  onClick={() => setAddStructureModalOpen(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Fee Structure</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {structures.map((struct) => (
                  <div key={struct.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 relative hover:border-slate-300 transition">
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
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditStructureModal(struct)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Edit Structure"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        {canDelete() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStructure(struct.id, `${struct.grade} - ${struct.term}`);
                            }}
                            className="p-1.5 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg text-xs transition cursor-pointer active:scale-90"
                            title="Delete Structure"
                          >
                            <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                    <th className="p-3.5 pr-5 text-right">Actions</th>
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setReceiptModalPayment(p)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="View Receipt"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            {canDelete() && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePayment(p.id, p.id);
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-400 rounded-lg text-[11px] transition cursor-pointer active:scale-90"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                              </button>
                            )}
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

      {/* ADD NEW FEE STRUCTURE MODAL */}
      {addStructureModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">Add Grade Fee Structure</h3>
              <button onClick={() => setAddStructureModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStructure} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Grade Level / Class *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 1, Playgroup, Form 1"
                  value={newGradeLabel}
                  onChange={(e) => setNewGradeLabel(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tuition Fee (KES) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 15000"
                  value={newTuitionFee}
                  onChange={(e) => setNewTuitionFee(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Activity & Sports Fee (KES)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 2500"
                  value={newActivityFee}
                  onChange={(e) => setNewActivityFee(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Exam & Assessment Fee (KES)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 1500"
                  value={newExamFee}
                  onChange={(e) => setNewExamFee(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Total Term Fee:</span>
                <span className="font-mono font-black text-blue-900 text-sm">
                  KES {((Number(newTuitionFee) || 0) + (Number(newActivityFee) || 0) + (Number(newExamFee) || 0)).toLocaleString()}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddStructureModalOpen(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer"
                >
                  Create Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE SECURITY PIN MODAL */}
      {showPinChangeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <h3 className="font-black text-slate-900 text-sm">Change Finance PIN</h3>
              </div>
              <button 
                onClick={() => {
                  setShowPinChangeModal(false);
                  setPinChangeMessage(null);
                  setCurrentPinInput('');
                  setNewPinInput('');
                  setConfirmNewPinInput('');
                }} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePinSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Passcode / PIN *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current PIN"
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value)}
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Passcode / PIN *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new 4+ digit PIN"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Passcode / PIN *</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new PIN"
                  value={confirmNewPinInput}
                  onChange={(e) => setConfirmNewPinInput(e.target.value)}
                  className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              {pinChangeMessage && (
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                  pinChangeMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {pinChangeMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{pinChangeMessage.text}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinChangeModal(false);
                    setPinChangeMessage(null);
                    setCurrentPinInput('');
                    setNewPinInput('');
                    setConfirmNewPinInput('');
                  }}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Save New PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
