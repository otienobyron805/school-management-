import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Users, Search, Filter, Save, X, 
  FileSpreadsheet, History, Check, ShieldAlert, ArrowUpRight, Award, CalendarDays
} from 'lucide-react';
import { getLearners, saveLearners, Learner, getCurrentUser, logActivity, getAttendanceSheets } from '../utils/db';

const GRADE_OPTIONS = [
  'PP1', 'PP2', 
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
  'Form 1', 'Form 2', 'Form 3', 'Form 4'
];

const STREAM_OPTIONS = [
  'Alpha', 'Beta', 'Gamma', 'Jupiter', 'Venus', 'Mars', 'Red', 'Blue', 'Green'
];

// Helper to convert grade label string to a standard numeric code for backend/dashboard compatibility
const getGradeNumber = (label: string): number => {
  if (label.startsWith('Grade ')) {
    return parseInt(label.replace('Grade ', ''), 10) || 8;
  }
  if (label.startsWith('Form ')) {
    const formNum = parseInt(label.replace('Form ', ''), 10) || 1;
    return formNum + 8; // Form 1 -> 9, Form 2 -> 10 etc.
  }
  if (label === 'PP1') return 1;
  if (label === 'PP2') return 2;
  return 8; // fallback to Grade 8
};

interface HistoryLearner {
  id: string;
  name: string;
}

export default function Learners() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const isParent = getCurrentUser()?.role === 'Parent';
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [streamFilter, setStreamFilter] = useState<string>('all');

  // Modal visibility states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Active / Selected learners for edit and history
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);

  // Form input states
  const [formFirstName, setFormFirstName] = useState('');
  const [formSecondName, setFormSecondName] = useState('');
  const [formOtherName, setFormOtherName] = useState('');
  const [formAdmNo, setFormAdmNo] = useState('');
  const [formAssessNo, setFormAssessNo] = useState('');
  const [formGradeLabel, setFormGradeLabel] = useState('Grade 8');
  const [formStream, setFormStream] = useState('Alpha');
  const [formGender, setFormGender] = useState<'Male' | 'Female'>('Male');
  const [formType, setFormType] = useState<'Day Scholar' | 'Boarder'>('Day Scholar');
  const [formAvatarUrl, setFormAvatarUrl] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');

  // Bulk import input state
  const [bulkText, setBulkText] = useState('');
  const [bulkParsedResult, setBulkParsedResult] = useState<any[]>([]);

  // Toast alert notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const refreshLearners = () => {
      setLearners(getLearners());
    };
    refreshLearners();
    window.addEventListener('storage', refreshLearners);
    window.addEventListener('db_updated', refreshLearners);
    return () => {
      window.removeEventListener('storage', refreshLearners);
      window.removeEventListener('db_updated', refreshLearners);
    };
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (learners.length > 0) {
      saveLearners(learners);
    }
  }, [learners]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Helper to ensure learners have firstName/secondName
  const getLearnerFirstName = (l: Learner) => {
    if (l.firstName) return l.firstName;
    const parts = l.name.split(' ');
    return parts[0] || '';
  };

  const getLearnerSecondName = (l: Learner) => {
    if (l.secondName) return l.secondName;
    const parts = l.name.split(' ');
    return parts[1] || '';
  };

  const getLearnerOtherName = (l: Learner) => {
    if (l.otherName) return l.otherName;
    const parts = l.name.split(' ');
    return parts.slice(2).join(' ') || '—';
  };

  const openAddLearner = () => {
    setFormFirstName('');
    setFormSecondName('');
    setFormOtherName('');
    setFormAdmNo('');
    setFormAssessNo('');
    setFormGradeLabel('Grade 8');
    setFormStream('Alpha');
    setFormGender('Male');
    setFormType('Day Scholar');
    setFormAvatarUrl('');
    setFormParentPhone('');
    setIsAddModalOpen(true);
  };

  const saveNewLearner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFirstName.trim() || !formSecondName.trim() || !formAdmNo.trim()) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    const admExists = learners.some(l => l.admNo.trim() === formAdmNo.trim());
    if (admExists) {
      alert(`⚠️ A learner with Admission Number "${formAdmNo.trim()}" already exists.`);
      return;
    }

    const fullName = `${formFirstName.trim()} ${formSecondName.trim()}${formOtherName.trim() ? ' ' + formOtherName.trim() : ''}`;
    const newLearner: Learner = {
      id: 'l_' + Date.now() + Math.floor(Math.random() * 1000),
      name: fullName,
      firstName: formFirstName.trim(),
      secondName: formSecondName.trim(),
      otherName: formOtherName.trim(),
      admNo: formAdmNo.trim(),
      assessNo: formAssessNo.trim() || '—',
      grade: getGradeNumber(formGradeLabel),
      gradeLabel: formGradeLabel,
      stream: formStream,
      gender: formGender,
      type: formType,
      status: 'Active',
      avatarUrl: formAvatarUrl,
      parentPhone: formParentPhone.trim()
    };

    const nextLearners = [...learners, newLearner];
    setLearners(nextLearners);
    saveLearners(nextLearners);
    const user = getCurrentUser();
    if (user) logActivity('learner_added', `New learner ${fullName} added.`, user.fullName);
    setIsAddModalOpen(false);
    triggerToast(`Added student: ${fullName}`);
  };

  const openEditLearner = (learner: Learner) => {
    setSelectedLearner(learner);
    setFormFirstName(getLearnerFirstName(learner));
    setFormSecondName(getLearnerSecondName(learner));
    setFormOtherName(getLearnerOtherName(learner) === '—' ? '' : getLearnerOtherName(learner));
    setFormAdmNo(learner.admNo);
    setFormAssessNo(learner.assessNo && learner.assessNo !== '—' ? learner.assessNo : '');
    setFormGradeLabel(learner.gradeLabel || `Grade ${learner.grade}`);
    setFormStream(learner.stream);
    setFormGender(learner.gender || 'Male');
    setFormType(learner.type || 'Day Scholar');
    setFormAvatarUrl(learner.avatarUrl || '');
    setFormParentPhone(learner.parentPhone || '');
    setIsEditModalOpen(true);
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLearner) return;

    if (!formFirstName.trim() || !formSecondName.trim()) {
      alert('First Name and Second Name are required.');
      return;
    }

    const fullName = `${formFirstName.trim()} ${formSecondName.trim()}${formOtherName.trim() ? ' ' + formOtherName.trim() : ''}`;
    const updated = learners.map(l => {
      if (l.id === selectedLearner.id) {
        return {
          ...l,
          name: fullName,
          firstName: formFirstName.trim(),
          secondName: formSecondName.trim(),
          otherName: formOtherName.trim(),
          assessNo: formAssessNo.trim() || '—',
          grade: getGradeNumber(formGradeLabel),
          gradeLabel: formGradeLabel,
          stream: formStream,
          gender: formGender,
          type: formType,
          avatarUrl: formAvatarUrl,
          parentPhone: formParentPhone.trim()
        };
      }
      return l;
    });

    setLearners(updated);
    saveLearners(updated);
    setIsEditModalOpen(false);
    setSelectedLearner(null);
    triggerToast(`Updated profile: ${fullName}`);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`⚠️ Delete learner "${name}"? This operation is permanent and clears their record.`)) {
      const updated = learners.filter(l => l.id !== id);
      setLearners(updated);
      saveLearners(updated);
      triggerToast(`Removed student record`);
    }
  };

  const openHistory = (learner: Learner) => {
    setSelectedLearner(learner);
    setIsHistoryModalOpen(true);
  };

  const toggleStatus = () => {
    if (!selectedLearner) return;
    const nextStatus = (selectedLearner.status || 'Active') === 'Active' ? 'Inactive' : 'Active';
    const updated = learners.map(l => {
      if (l.id === selectedLearner.id) {
        return { ...l, status: nextStatus as 'Active' | 'Inactive' };
      }
      return l;
    });
    setLearners(updated);
    saveLearners(updated);
    
    // Update active modal state
    setSelectedLearner({ ...selectedLearner, status: nextStatus as 'Active' | 'Inactive' });
    triggerToast(`Enrolment status updated to ${nextStatus}`);
  };

  // File Upload handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setBulkText(text);
        triggerToast(`Loaded CSV file: ${file.name}`);
        // Automatically parse after a short timeout so that states are in sync
        setTimeout(() => {
          handleParseBulkWithText(text);
        }, 100);
      }
    };
    reader.readAsText(file);
  };

  const downloadSample = () => {
    const headers = "admission_number,first_name,second_name,other_name,assessment_number,grade,stream,gender,type,parent_phone\n";
    const row1 = "2025001,Kamau,John,Mwangi,A001,Grade 7,Alpha,Male,Day Scholar,0712345678\n";
    const row2 = "2025002,Otieno,Mary,,A002,Grade 7,Alpha,Female,Boarder,0722334455\n";
    const row3 = "2025003,Wanjiku,Peter,Kariuki,,Grade 8,Beta,Male,Day Scholar,0733445566";
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + row1 + row2 + row3);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "learners_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Sample CSV file downloaded");
  };

  // Bulk Import Parsing
  const handleParseBulk = () => {
    handleParseBulkWithText(bulkText);
  };

  const handleParseBulkWithText = (textToParse: string) => {
    if (!textToParse.trim()) {
      alert('Please paste some records first or select a file.');
      return;
    }

    const lines = textToParse.split('\n');
    const parsed: any[] = [];
    let currentAdmSet = new Set(learners.map(l => l.admNo));

    // Check if the first line is a header
    const firstLine = (lines[0] || '').toLowerCase();
    const hasHeader = firstLine.includes('admission') || firstLine.includes('first_name') || firstLine.includes('second_name') || firstLine.includes('grade') || firstLine.includes('stream');

    let startIndex = 0;
    let admNoIndex = 3;
    let firstNameIndex = 0;
    let secondNameIndex = 1;
    let otherNameIndex = 2;
    let assessNoIndex = -1;
    let gradeIndex = 4;
    let streamIndex = 5;
    let genderIndex = 6;
    let typeIndex = 7;
    let parentPhoneIndex = -1;

    if (hasHeader) {
      startIndex = 1; // skip header line
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const findHeaderIndex = (keywords: string[]) => {
        return headers.findIndex(h => keywords.some(k => h.includes(k)));
      };

      const ai = findHeaderIndex(['admission', 'adm']);
      if (ai !== -1) admNoIndex = ai;

      const fi = findHeaderIndex(['first_name', 'first_name', 'first']);
      if (fi !== -1) firstNameIndex = fi;

      const si = findHeaderIndex(['second_name', 'family_name', 'second', 'last']);
      if (si !== -1) secondNameIndex = si;

      const oi = findHeaderIndex(['other_name', 'other', 'middle']);
      if (oi !== -1) otherNameIndex = oi;

      const assi = findHeaderIndex(['assessment', 'assess']);
      if (assi !== -1) assessNoIndex = assi;

      const gi = findHeaderIndex(['grade', 'class']);
      if (gi !== -1) gradeIndex = gi;

      const sti = findHeaderIndex(['stream', 'group']);
      if (sti !== -1) streamIndex = sti;

      const geni = findHeaderIndex(['gender', 'sex']);
      if (geni !== -1) genderIndex = geni;

      const tyi = findHeaderIndex(['type', 'scholar', 'boarding']);
      if (tyi !== -1) typeIndex = tyi;

      const pphi = findHeaderIndex(['parent', 'phone', 'guardian', 'mobile']);
      if (pphi !== -1) parentPhoneIndex = pphi;
    }

    lines.forEach((line, lineIdx) => {
      if (lineIdx < startIndex) return;
      if (!line.trim()) return;
      const parts = line.split(',').map(s => s.trim());
      
      if (!hasHeader) {
        if (parts.length < 4) {
          parsed.push({ line, error: 'Incomplete line (Must have at least First, Second, Adm, Grade)' });
          return;
        }
        // Fallback positional mappings:
        // Position option A (8 columns): Michael, Kiprop, , 9101, Grade 9, Beta, Male, Boarder
        if (parts.length >= 8) {
          firstNameIndex = 0;
          secondNameIndex = 1;
          otherNameIndex = 2;
          admNoIndex = 3;
          gradeIndex = 4;
          streamIndex = 5;
          genderIndex = 6;
          typeIndex = 7;
          assessNoIndex = -1;
          parentPhoneIndex = parts.length > 8 ? 8 : -1;
        } else {
          // Position option B (fewer columns): Mary, Wambui, Grace, 8104, Grade 8, Beta, Day Scholar (7 columns)
          firstNameIndex = 0;
          secondNameIndex = 1;
          otherNameIndex = parts.length > 5 ? 2 : -1;
          admNoIndex = parts.length > 5 ? 3 : 2;
          gradeIndex = parts.length > 5 ? 4 : 3;
          streamIndex = parts.length > 5 ? 5 : 4;
          genderIndex = -1;
          typeIndex = parts.length > 5 ? 6 : 5;
          assessNoIndex = -1;
        }
      }

      const firstName = parts[firstNameIndex] || '';
      const secondName = parts[secondNameIndex] || '';
      const otherName = (otherNameIndex !== -1 && parts[otherNameIndex]) ? parts[otherNameIndex] : '';
      const admNo = parts[admNoIndex] || '';
      const assessNo = (assessNoIndex !== -1 && parts[assessNoIndex]) ? parts[assessNoIndex] : '—';
      const gradeLabel = parts[gradeIndex] || 'Grade 8';
      const stream = parts[streamIndex] || 'Alpha';
      
      let genderVal: 'Male' | 'Female' = 'Male';
      if (genderIndex !== -1 && parts[genderIndex]) {
        const rawGen = parts[genderIndex].toLowerCase();
        if (rawGen.startsWith('f') || rawGen === 'female') {
          genderVal = 'Female';
        }
      }

      let typeVal: 'Day Scholar' | 'Boarder' = 'Day Scholar';
      if (typeIndex !== -1 && parts[typeIndex]) {
        const rawType = parts[typeIndex].toLowerCase();
        if (rawType.includes('board') || rawType === 'boarder') {
          typeVal = 'Boarder';
        }
      }

      const parentPhone = (parentPhoneIndex !== -1 && parts[parentPhoneIndex]) ? parts[parentPhoneIndex] : '';

      if (!firstName || !secondName || !admNo) {
        parsed.push({ line, error: 'Missing first name, second name, or Admission No.' });
        return;
      }

      if (currentAdmSet.has(admNo)) {
        parsed.push({ line, error: `Duplicate Admission No "${admNo}"` });
        return;
      }

      // Track duplicate ADM within the same bulk text
      currentAdmSet.add(admNo);

      parsed.push({
        valid: true,
        firstName,
        secondName,
        otherName,
        admNo,
        assessNo,
        gradeLabel,
        stream,
        gender: genderVal,
        type: typeVal,
        parentPhone,
        fullName: `${firstName} ${secondName}${otherName ? ' ' + otherName : ''}`
      });
    });

    setBulkParsedResult(parsed);
  };

  const handleCommitBulk = () => {
    const validRows = bulkParsedResult.filter(r => r.valid);
    if (validRows.length === 0) {
      alert('No valid records to import.');
      return;
    }

    const nextLearners = [...learners];
    validRows.forEach(row => {
      // Clean duplicate admissions if they exist in state just in case
      const index = nextLearners.findIndex(l => l.admNo.trim() === row.admNo.trim());
      const newLearnerObj: Learner = {
        id: 'l_' + Date.now() + Math.floor(Math.random() * 1000000),
        name: row.fullName,
        firstName: row.firstName,
        secondName: row.secondName,
        otherName: row.otherName || '',
        admNo: row.admNo,
        assessNo: row.assessNo || '—',
        grade: getGradeNumber(row.gradeLabel),
        gradeLabel: row.gradeLabel,
        stream: row.stream,
        gender: row.gender,
        type: row.type,
        status: 'Active',
        parentPhone: row.parentPhone
      };

      if (index !== -1) {
        // Update existing record (requested behaviour in mobile spec: "existing numbers will be updated")
        nextLearners[index] = { ...nextLearners[index], ...newLearnerObj, id: nextLearners[index].id };
      } else {
        nextLearners.push(newLearnerObj);
      }
    });

    setLearners(nextLearners);
    saveLearners(nextLearners);
    setIsBulkModalOpen(false);
    setBulkText('');
    setBulkParsedResult([]);
    triggerToast(`Successfully processed ${validRows.length} learners!`);
  };

  const loadDefaultBulkSet = () => {
    const templateHeader = `FirstName, SecondName, OtherName, AdmNo, Grade, Stream, Gender, Type\n`;
    setBulkText(templateHeader);
    triggerToast('Loaded clean CSV template structure');
  };

  // Master filtering
  const filteredLearners = learners.filter(learner => {
    const nameStr = learner.name.toLowerCase();
    const admStr = learner.admNo.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = nameStr.includes(query) || admStr.includes(query);

    const lGradeLabel = learner.gradeLabel || `Grade ${learner.grade}`;
    const matchesGrade = gradeFilter === 'all' || lGradeLabel.toLowerCase() === gradeFilter.toLowerCase();
    const matchesStream = streamFilter === 'all' || learner.stream.toLowerCase() === streamFilter.toLowerCase();

    return matchesSearch && matchesGrade && matchesStream;
  });

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl z-50 text-sm font-semibold flex items-center gap-2 animate-bounce">
          ✨ {toastMessage}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Learners Registry</span>
            <h3 className="text-2xl font-extrabold text-slate-800">{learners.length}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Status</span>
            <h3 className="text-2xl font-extrabold text-emerald-600">
              {learners.filter(l => (l.status || 'Active') === 'Active').length}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Check className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Day Scholars</span>
            <h3 className="text-2xl font-extrabold text-slate-800">
              {learners.filter(l => (l.type || 'Day Scholar') === 'Day Scholar').length}
            </h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <span className="text-lg font-bold">🏠</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Boarding Students</span>
            <h3 className="text-2xl font-extrabold text-slate-800">
              {learners.filter(l => l.type === 'Boarder').length}
            </h3>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <span className="text-lg font-bold">🏫</span>
          </div>
        </div>
      </div>

      {/* Actions and Title top bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          👨‍🎓 Learners ({learners.length})
        </h1>
        {!isParent && (
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setIsBulkModalOpen(true)}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm inline-flex items-center gap-2 transition shadow-sm cursor-pointer min-h-[44px]"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> 📋 Bulk Import
            </button>
            <button 
              onClick={openAddLearner}
              className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-xl font-extrabold text-sm inline-flex items-center gap-2 transition shadow-md cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> Add Learner
            </button>
          </div>
        )}
      </div>

      {/* Filters row */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Filter by Grade</label>
          <select 
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium text-slate-700 cursor-pointer min-h-[44px]"
          >
            <option value="all">All Grades</option>
            {GRADE_OPTIONS.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Stream</label>
          <select 
            value={streamFilter}
            onChange={(e) => setStreamFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium text-slate-700 cursor-pointer min-h-[44px]"
          >
            <option value="all">All Streams</option>
            {STREAM_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Search Query</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input 
              type="text" 
              placeholder="Search Name or Admission No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* Main Student Registry Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">#</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">First Name</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Second Name</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Other Name</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Adm No</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Assess No</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Grade</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Stream</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Gender</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLearners.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-16 text-center text-slate-400 font-medium">
                    <span className="text-5xl block mb-3 opacity-60">🔍</span>
                    No matching learners found. Add a learner or reset your filters!
                  </td>
                </tr>
              ) : (
                filteredLearners.map((learner, idx) => {
                  const isInactive = learner.status === 'Inactive';
                  return (
                    <tr 
                      key={learner.id} 
                      className={`hover:bg-slate-50/40 transition-colors ${isInactive ? 'opacity-50 bg-slate-50/30' : ''}`}
                    >
                      <td className="p-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-4 font-extrabold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] overflow-hidden shrink-0">
                            {learner.avatarUrl ? (
                              <img src={learner.avatarUrl} alt={learner.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              (getLearnerFirstName(learner)[0] || '?').toUpperCase()
                            )}
                          </div>
                          <span>{getLearnerFirstName(learner)}</span>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-800">{getLearnerSecondName(learner)}</td>
                      <td className="p-4 text-slate-600 font-medium">{getLearnerOtherName(learner)}</td>
                      <td className="p-4 font-mono text-sm text-slate-600 font-bold">{learner.admNo}</td>
                      <td className="p-4 font-mono text-xs text-slate-400 font-semibold">{learner.assessNo || '—'}</td>
                      <td className="p-4">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-extrabold">
                          {learner.gradeLabel || `Grade ${learner.grade}`}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
                          {learner.stream}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-semibold text-slate-600">{learner.gender || 'Male'}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                          learner.type === 'Boarder' 
                            ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' 
                            : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                        }`}>
                          {learner.type === 'Boarder' ? '🏫' : '🏠'} {learner.type || 'Day Scholar'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {!isParent && (
                            <button 
                              onClick={() => openEditLearner(learner)}
                              className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition cursor-pointer"
                              title="Edit Learner Details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => openHistory(learner)}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
                            title="Student History & Status"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          {!isParent && (
                            <button 
                              onClick={() => handleDelete(learner.id, learner.name)}
                              className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition cursor-pointer"
                              title="Delete Student Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Learner Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                ➕ Add New Learner
              </h2>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={saveNewLearner} className="space-y-4">
              
              {/* STUDENT PROFILE PHOTOGRAPH */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-slate-200 bg-white shadow-xs overflow-hidden flex items-center justify-center shrink-0">
                  {formAvatarUrl ? (
                    <img src={formAvatarUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-2xl">👨‍🎓</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase">Student Photograph</h4>
                  <div className="flex items-center gap-2">
                    <label className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer min-h-[32px]">
                      📁 Upload Image
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 500 * 1024) {
                              alert('⚠️ Image is too large. Please select an image under 500KB.');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setFormAvatarUrl(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }} 
                        className="hidden" 
                      />
                    </label>
                    {formAvatarUrl && (
                      <button 
                        type="button"
                        onClick={() => setFormAvatarUrl('')}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer min-h-[32px]"
                      >
                        🗑️ Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">First Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Mary"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Second Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Wambui"
                    value={formSecondName}
                    onChange={(e) => setFormSecondName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Other Name</label>
                  <input 
                    type="text"
                    placeholder="Optional"
                    value={formOtherName}
                    onChange={(e) => setFormOtherName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Admission No *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. 8001"
                    value={formAdmNo}
                    onChange={(e) => setFormAdmNo(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Assessment No</label>
                  <input 
                    type="text"
                    placeholder="e.g. ASS-49"
                    value={formAssessNo}
                    onChange={(e) => setFormAssessNo(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Grade *</label>
                  <select
                    value={formGradeLabel}
                    onChange={(e) => setFormGradeLabel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer font-semibold"
                  >
                    {GRADE_OPTIONS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Stream *</label>
                  <select
                    value={formStream}
                    onChange={(e) => setFormStream(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer font-semibold"
                  >
                    {STREAM_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as 'Male' | 'Female')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer font-semibold"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as 'Day Scholar' | 'Boarder')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer font-semibold"
                  >
                    <option value="Day Scholar">Day Scholar</option>
                    <option value="Boarder">Boarder</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Parent Phone Number</label>
                <input 
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={formParentPhone}
                  onChange={(e) => setFormParentPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="flex-1 px-4 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 text-sm transition min-h-[44px] cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-md min-h-[44px] cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Learner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Learner Modal */}
      {isEditModalOpen && selectedLearner && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
              <h2 className="text-xl font-bold text-slate-800">
                ✏️ Edit Learner Details
              </h2>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedLearner(null);
                }} 
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={saveEdit} className="space-y-4">
              
              {/* STUDENT PROFILE PHOTOGRAPH */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-slate-200 bg-white shadow-xs overflow-hidden flex items-center justify-center shrink-0">
                  {formAvatarUrl ? (
                    <img src={formAvatarUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-2xl">👨‍🎓</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase">Student Photograph</h4>
                  <div className="flex items-center gap-2">
                    <label className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer min-h-[32px]">
                      📁 Upload Image
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 500 * 1024) {
                              alert('⚠️ Image is too large. Please select an image under 500KB.');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setFormAvatarUrl(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }} 
                        className="hidden" 
                      />
                    </label>
                    {formAvatarUrl && (
                      <button 
                        type="button"
                        onClick={() => setFormAvatarUrl('')}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer min-h-[32px]"
                      >
                        🗑️ Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">First Name</label>
                  <input 
                    type="text"
                    required
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Second Name</label>
                  <input 
                    type="text"
                    required
                    value={formSecondName}
                    onChange={(e) => setFormSecondName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Other Name</label>
                  <input 
                    type="text"
                    value={formOtherName}
                    onChange={(e) => setFormOtherName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Admission No (Read-Only)</label>
                  <input 
                    type="text"
                    readOnly
                    value={formAdmNo}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 font-mono font-bold text-slate-400 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Assessment No</label>
                  <input 
                    type="text"
                    placeholder="Optional"
                    value={formAssessNo}
                    onChange={(e) => setFormAssessNo(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Grade</label>
                  <select
                    value={formGradeLabel}
                    onChange={(e) => setFormGradeLabel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer font-semibold"
                  >
                    {GRADE_OPTIONS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Stream</label>
                  <select
                    value={formStream}
                    onChange={(e) => setFormStream(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer font-semibold"
                  >
                    {STREAM_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as 'Male' | 'Female')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer font-semibold"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as 'Day Scholar' | 'Boarder')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer font-semibold"
                  >
                    <option value="Day Scholar">Day Scholar</option>
                    <option value="Boarder">Boarder</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Parent Phone Number</label>
                <input 
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={formParentPhone}
                  onChange={(e) => setFormParentPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedLearner(null);
                  }} 
                  className="flex-1 px-4 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 text-sm transition min-h-[44px] cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-md min-h-[44px] cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student History & Status Modal */}
      {isHistoryModalOpen && selectedLearner && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white p-6 rounded-3xl w-full max-w-xl shadow-2xl space-y-5 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                📜 Student File — {selectedLearner.name}
              </h2>
              <button 
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  setSelectedLearner(null);
                }} 
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Enrolment Status Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3.5">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <span className="w-2 h-4 bg-blue-600 rounded-sm"></span> Enrolment Details & Status
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-slate-500 font-medium">Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-extrabold ${
                    (selectedLearner.status || 'Active') === 'Active'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {selectedLearner.status || 'Active'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-slate-500 font-medium">Admission No</span>
                  <span className="font-mono font-bold text-slate-800">{selectedLearner.admNo}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-500 font-medium">Assessment No</span>
                  <span className="font-mono font-bold text-slate-800">{selectedLearner.assessNo || '—'}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-500 font-medium">Enrolment Date</span>
                  <span className="font-bold text-slate-800">July 16, 2026</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={toggleStatus}
                  className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer min-h-[40px] flex items-center justify-center gap-2 ${
                    (selectedLearner.status || 'Active') === 'Active'
                      ? 'bg-amber-50 hover:bg-amber-100/80 text-amber-800 border border-amber-200'
                      : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {(selectedLearner.status || 'Active') === 'Active' ? (
                    <>⚠️ Deactivate Student</>
                  ) : (
                    <>✅ Reactivate Student</>
                  )}
                </button>
              </div>
            </div>

            {/* Attendance Section */}
            {(() => {
              const sheets = getAttendanceSheets();
              const records = selectedLearner ? sheets.map(s => s.records ? s.records[selectedLearner.id] : undefined).filter(Boolean) : [];
              const totalDays = records.length;
              const presentDays = records.filter(r => ['AM', 'PM', 'Full', 'Present'].includes(r || '')).length;
              const absentDays = records.filter(r => r === 'Absent').length;
              const rate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : null;

              return (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <CalendarDays className="w-4 h-4 text-blue-600" /> Attendance History
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-extrabold text-slate-800">Term 1 Attendance Rate</div>
                      <div className="text-xs text-slate-400">Target rate is 95% minimum</div>
                    </div>
                    <div className="text-right">
                      {rate !== null ? (
                        <>
                          <span className={`text-2xl font-extrabold ${parseFloat(rate) >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{rate}%</span>
                          <div className="text-[10px] text-slate-400 font-medium">{presentDays} Days Present / {absentDays} Absent</div>
                        </>
                      ) : (
                        <>
                          <span className="text-lg font-bold text-slate-400 italic">Pending</span>
                          <div className="text-[10px] text-slate-400 font-medium">No roll logs recorded yet</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Academic Results Section */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <Award className="w-4 h-4 text-emerald-600" /> Exams & Academic Record
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700">English (ENG-101)</span>
                  <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">84% - Grade A</span>
                </div>
                <div className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700">Mathematics (MAT-102)</span>
                  <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">79% - Grade A-</span>
                </div>
                <div className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700">Science (SCI-103)</span>
                  <span className="font-mono font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">72% - Grade B+</span>
                </div>
              </div>
            </div>

            <div className="flex pt-2">
              <button 
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  setSelectedLearner(null);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm transition cursor-pointer min-h-[44px]"
              >
                Close File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-2xl w-full max-w-2xl shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                📋 Bulk Import Learners
              </h2>
              <button 
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkText('');
                  setBulkParsedResult([]);
                }} 
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ✅ Full access to all phone files notification */}
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-blue-900">
                <span>✅</span> Full Phone File Access Enabled
              </div>
              <p className="text-blue-700 leading-relaxed">
                When asked for permission, tap <strong>Allow / Grant Access</strong> to open files from your phone storage, SD card, Downloads, or any folder.
              </p>
            </div>

            {/* ✅ File selection with capture="filesystem" */}
            <div className="border-2 border-dashed border-slate-200 p-4 rounded-xl text-center space-y-3 bg-slate-50/50">
              <div className="text-slate-500 font-bold text-xs">
                Select CSV / TXT File to Import
              </div>
              <input 
                type="file" 
                id="csvFile" 
                accept=".csv, text/csv, .txt, .xls, .xlsx, application/octet-stream, *" 
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                required
                capture="filesystem"
              />
              <div className="text-[10px] text-slate-400">
                Supports .csv, .txt, and spreadsheets from any folder.
              </div>
            </div>

            {/* Instructions & Format */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Instructions & Format:</span>
                <button
                  type="button"
                  onClick={downloadSample}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  ⬇️ Download Sample CSV
                </button>
              </div>
              <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-700">Dynamic Column Mapping Enabled!</span><br />
                Headers like <code>admission_number</code>, <code>first_name</code>, <code>second_name</code>, <code>grade</code>, <code>stream</code>, <code>gender</code>, <code>type</code>, <code>parent_phone</code> are auto-detected.
                <br /><br />
                If pasting raw text, use: <code className="text-emerald-700">First, Second, Other, AdmNo, Grade, Stream, Gender, Type, ParentPhone</code>
              </div>
            </div>

            {/* Paste or edit textarea */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500">Edit / Paste CSV Data:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={loadDefaultBulkSet}
                    className="text-xs text-emerald-600 hover:text-emerald-800 font-bold transition cursor-pointer"
                  >
                    💡 Insert CSV Header
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkText('');
                      setBulkParsedResult([]);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold transition cursor-pointer"
                  >
                    Clear Data
                  </button>
                </div>
              </div>
              <textarea
                rows={5}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder=" Mary, Wambui, Grace, 8104, Grade 8, Beta, Female, Day Scholar&#10; John, Doe, , 8105, Grade 7, Red, Male, Boarder"
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs bg-slate-50 text-slate-800"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleParseBulk}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2 rounded-xl text-xs shadow transition cursor-pointer"
              >
                🔍 Parse & Preview Records
              </button>
            </div>

            {bulkParsedResult.length > 0 && (
              <div className="border border-slate-100 rounded-xl overflow-hidden space-y-2">
                <div className="bg-slate-50 p-2 text-xs font-bold text-slate-600 border-b border-slate-100 flex justify-between items-center">
                  <span>Parsed Registry Preview</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    {bulkParsedResult.filter(r => r.valid).length} Valid / {bulkParsedResult.length} Total
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto p-2 space-y-1.5">
                  {bulkParsedResult.map((res, i) => (
                    <div 
                      key={i} 
                      className={`text-xs p-2.5 rounded-lg flex items-center justify-between border ${
                        res.valid 
                          ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                          : 'bg-red-50/50 border-red-100 text-red-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-extrabold">
                          {res.valid ? `${res.fullName} (${res.admNo})` : 'Line Parsing Error'}
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {res.valid ? `Grade: ${res.gradeLabel} | Stream: ${res.stream} | ${res.gender} | ${res.type}` : res.line}
                        </p>
                      </div>
                      <div>
                        {res.valid ? (
                          <span className="bg-emerald-100 text-emerald-900 font-extrabold text-[9px] px-2 py-0.5 rounded-full">
                            ✓ Ready
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-900 font-bold text-[9px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> {res.error}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2.5 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkText('');
                  setBulkParsedResult([]);
                }} 
                className="flex-1 px-4 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 text-sm transition min-h-[44px] cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleCommitBulk}
                disabled={bulkParsedResult.filter(r => r.valid).length === 0}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-md min-h-[44px] cursor-pointer"
              >
                <Check className="w-4 h-4" /> Commit Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
