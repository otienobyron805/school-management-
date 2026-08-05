import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageCircle, 
  GraduationCap, 
  Building, 
  ShieldCheck, 
  Phone, 
  Hash, 
  Info, 
  Lock, 
  Eye, 
  Send, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Bookmark,
  Sparkles,
  Save,
  X,
  Filter,
  Layers,
  Users,
  Search,
  Copy,
  Check,
  Share2
} from 'lucide-react';
import { getLearners, getSystemSettings, getSchoolProfile, getGrades, Learner, secureGet, secureSet } from '../utils/db';
import { canDelete } from '../utils/permissions';
import { confirmAction } from './ConfirmDialog';

export interface AlertTemplate {
  id: string;
  title: string;
  category: 'Attendance' | 'Finance' | 'Events' | 'General';
  icon?: string;
  template: string;
  isDefault?: boolean;
}

const DEFAULT_TEMPLATES: AlertTemplate[] = [
  {
    id: 'tpl-arrival',
    title: 'Arrival Alert',
    category: 'Attendance',
    icon: '✅',
    template: `✅ {school_name} — ARRIVAL ALERT\n📚 Student: {student_name}\n📝 Adm No: {adm_no} | Class: {grade} ({stream})\n🕒 Arrival Time: {time}\n\nYour child has safely arrived at school premises.\nThank you for your continued trust.\n— School Administration`,
    isDefault: true,
  },
  {
    id: 'tpl-departure',
    title: 'Departure Alert',
    category: 'Attendance',
    icon: '🚪',
    template: `🚪 {school_name} — DEPARTURE ALERT\n📚 Student: {student_name}\n📝 Adm No: {adm_no} | Class: {grade} ({stream})\n🕒 Departure Time: {time}\n\nYour child has been safely released from school premises.\n— School Administration`,
    isDefault: true,
  },
  {
    id: 'tpl-late',
    title: 'Late Arrival',
    category: 'Attendance',
    icon: '⏰',
    template: `⏰ {school_name} — LATE ARRIVAL NOTICE\n📚 Student: {student_name}\n📝 Adm No: {adm_no} | Class: {grade} ({stream})\n🕒 Arrival Time: {time}\n\nYour child arrived late to school today. Please ensure timely arrival in future.\n— School Administration`,
    isDefault: true,
  },
  {
    id: 'tpl-absence',
    title: 'Absence Notice',
    category: 'Attendance',
    icon: '⚠️',
    template: `⚠️ {school_name} — ABSENCE NOTICE\n📚 Student: {student_name}\n📝 Adm No: {adm_no} | Class: {grade} ({stream})\n📅 Date: {date}\n\nOur records indicate your child was marked absent today without prior notice. Please contact school administration.\n— School Administration`,
    isDefault: true,
  },
  {
    id: 'tpl-fee',
    title: 'Fee Reminder',
    category: 'Finance',
    icon: '💳',
    template: `💳 {school_name} — FEE REMINDER\n📚 Student: {student_name}\n📝 Adm No: {adm_no} | Class: {grade} ({stream})\n\nDear Parent/Guardian, this is a friendly reminder regarding outstanding school fee balances for this term. Kindly settle or visit finance office for assistance.\nThank you!\n— School Administration`,
    isDefault: true,
  },
  {
    id: 'tpl-event',
    title: 'Event Invitation',
    category: 'Events',
    icon: '🎉',
    template: `🎉 {school_name} — EVENT INVITATION\n📚 Student: {student_name}\n📝 Adm No: {adm_no} | Class: {grade} ({stream})\n\nDear Parent/Guardian, you are cordially invited to our upcoming school event. We look forward to welcoming you!\n— School Administration`,
    isDefault: true,
  },
];

const TEMPLATE_STORAGE_KEY = 'whatsapp_alert_templates_v2';

export default function WhatsAppAlerts() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [mode, setMode] = useState<'individual' | 'class_broadcast'>('individual');
  
  // Grade & Stream filter state
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [streamFilter, setStreamFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedLearnerId, setSelectedLearnerId] = useState<string>('');
  
  // Templates state
  const [templates, setTemplates] = useState<AlertTemplate[]>(() => {
    try {
      const saved = secureGet(TEMPLATE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_TEMPLATES;
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_TEMPLATES[0].id);
  const [customTextOverride, setCustomTextOverride] = useState<string>('');
  const [isCreatingNewTemplate, setIsCreatingNewTemplate] = useState<boolean>(false);

  // Form state for creating / editing template
  const [tplTitle, setTplTitle] = useState<string>('');
  const [tplCategory, setTplCategory] = useState<'Attendance' | 'Finance' | 'Events' | 'General'>('General');
  const [tplIcon, setTplIcon] = useState<string>('📢');
  const [tplBody, setTplBody] = useState<string>('');
  const [editingTplId, setEditingTplId] = useState<string | null>(null);

  const [systemSettings, setSystemSettings] = useState(getSystemSettings());
  const [schoolProfile, setSchoolProfile] = useState(getSchoolProfile());
  const [copiedLearnerId, setCopiedLearnerId] = useState<string | null>(null);

  useEffect(() => {
    const loadedLearners = getLearners();
    setLearners(loadedLearners);
    setSystemSettings(getSystemSettings());
    setSchoolProfile(getSchoolProfile());

    if (loadedLearners.length > 0 && !selectedLearnerId) {
      setSelectedLearnerId(loadedLearners[0].id);
    }
  }, []);

  // Save templates to storage and cloud
  const saveTemplates = (newTemplates: AlertTemplate[]) => {
    setTemplates(newTemplates);
    try {
      secureSet(TEMPLATE_STORAGE_KEY, JSON.stringify(newTemplates));
    } catch (e) {
      console.error('Failed to save templates', e);
    }
  };

  const schoolName = systemSettings.schoolName || schoolProfile.name || 'ST AUGUSTINE SCHOOL';

  // Extract all available Grades and Streams dynamically from learners & db grades
  const { availableGrades, availableStreams } = useMemo(() => {
    const dbGrades = getGrades();
    const gradeSet = new Set<string>();
    const streamSet = new Set<string>();

    // From DB Grades
    dbGrades.forEach(g => {
      if (g.name) gradeSet.add(g.name);
      g.streams?.forEach(s => {
        if (s.name) streamSet.add(s.name);
      });
    });

    // From Learners
    learners.forEach(l => {
      const gLabel = l.gradeLabel || (l.grade ? `Grade ${l.grade}` : '');
      if (gLabel) gradeSet.add(gLabel);
      if (l.stream) streamSet.add(l.stream);
    });

    // Default fallbacks if empty
    if (gradeSet.size === 0) {
      ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'].forEach(g => gradeSet.add(g));
    }
    if (streamSet.size === 0) {
      ['Alpha', 'Beta', 'Gamma', 'East', 'West', 'North', 'South', 'Blue', 'Red'].forEach(s => streamSet.add(s));
    }

    // Sort grades logically
    const gradesSorted = Array.from(gradeSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });

    const streamsSorted = Array.from(streamSet).sort();

    return { availableGrades: gradesSorted, availableStreams: streamsSorted };
  }, [learners]);

  // Filter learners by grade, stream, and search query
  const filteredLearners = useMemo(() => {
    return learners.filter(l => {
      const gLabel = l.gradeLabel || (l.grade ? `Grade ${l.grade}` : '');
      const matchesGrade = gradeFilter === 'all' || gLabel === gradeFilter || l.grade?.toString() === gradeFilter;
      const matchesStream = streamFilter === 'all' || (l.stream || '').toLowerCase() === streamFilter.toLowerCase();
      
      const q = searchQuery.toLowerCase().trim();
      const fullName = (l.fullName || `${l.firstName || ''} ${l.secondName || ''} ${l.otherName || ''}` || l.name || '').toLowerCase();
      const admNo = (l.admNo || l.admissionNumber || l.id || '').toLowerCase();
      const matchesSearch = !q || fullName.includes(q) || admNo.includes(q);

      return matchesGrade && matchesStream && matchesSearch;
    });
  }, [learners, gradeFilter, streamFilter, searchQuery]);

  // Ensure selected learner is synced if list changes
  useEffect(() => {
    if (filteredLearners.length > 0 && !filteredLearners.some(l => l.id === selectedLearnerId)) {
      setSelectedLearnerId(filteredLearners[0].id);
    }
  }, [filteredLearners]);

  // Selected template object
  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  useEffect(() => {
    if (activeTemplate) {
      setCustomTextOverride(activeTemplate.template);
    }
  }, [selectedTemplateId]);

  // Find selected learner
  const selectedLearner = learners.find(l => l.id === selectedLearnerId) || filteredLearners[0];

  // Auto convert Kenya number format
  const formatKenyaNumber = (phone: string) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
      cleaned = '254' + cleaned;
    }
    return cleaned;
  };

  const getLearnerPhone = (l: Learner) => {
    return formatKenyaNumber(l.parentPhone || (l as any).phone || '');
  };

  const parentPhoneFormatted = selectedLearner ? getLearnerPhone(selectedLearner) : '';

  // Current formatted date and time
  const currentTime = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });

  // Interpolate placeholders for learner
  const interpolateMessage = (templateStr: string, learnerTarget?: Learner | null) => {
    const target = learnerTarget !== undefined ? learnerTarget : selectedLearner;
    if (!target) {
      return '— Select a student above to generate message preview —';
    }

    const studentName = target.fullName || `${target.firstName || ''} ${target.secondName || ''} ${target.otherName || ''}`.trim() || target.name || 'Student';
    const admNo = target.admNo || target.admissionNumber || target.id || 'N/A';
    const parentName = target.parentName || 'Parent/Guardian';
    const gradeStr = target.gradeLabel || (target.grade ? `Grade ${target.grade}` : 'N/A');
    const streamStr = target.stream || 'N/A';

    return templateStr
      .replace(/\{school_name\}/g, schoolName)
      .replace(/\{student_name\}/g, studentName)
      .replace(/\{adm_no\}/g, admNo)
      .replace(/\{grade\}/g, gradeStr)
      .replace(/\{stream\}/g, streamStr)
      .replace(/\{time\}/g, currentTime)
      .replace(/\{date\}/g, currentDate)
      .replace(/\{parent_name\}/g, parentName);
  };

  const previewMessage = interpolateMessage(customTextOverride || activeTemplate?.template || '');

  const handleSendAlert = (lTarget?: Learner) => {
    const target = lTarget || selectedLearner;
    if (!target) {
      alert('⚠️ Please select a student first!');
      return;
    }
    const phone = getLearnerPhone(target);
    if (!phone) {
      alert(`⚠️ No valid parent phone number found for ${target.fullName || target.name || 'this student'}. Please update their record in Learners.`);
      return;
    }

    const msg = lTarget ? interpolateMessage(customTextOverride || activeTemplate?.template || '', lTarget) : previewMessage;
    const encoded = encodeURIComponent(msg);
    const url = `https://wa.me/${phone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleCopyMessage = (l: Learner) => {
    const msg = interpolateMessage(customTextOverride || activeTemplate?.template || '', l);
    navigator.clipboard.writeText(msg);
    setCopiedLearnerId(l.id);
    setTimeout(() => setCopiedLearnerId(null), 2000);
  };

  // Open modal to create new template
  const handleStartCreateTemplate = () => {
    setTplTitle('');
    setTplCategory('General');
    setTplIcon('📢');
    setTplBody(`📢 {school_name} — NOTICE\n📚 Student: {student_name}\n📝 Adm No: {adm_no} | Class: {grade} ({stream})\n\nYour message text here...\n— School Administration`);
    setEditingTplId(null);
    setIsCreatingNewTemplate(true);
  };

  // Open modal to edit active template
  const handleStartEditTemplate = () => {
    if (!activeTemplate) return;
    setTplTitle(activeTemplate.title);
    setTplCategory(activeTemplate.category);
    setTplIcon(activeTemplate.icon || '📢');
    setTplBody(activeTemplate.template);
    setEditingTplId(activeTemplate.id);
    setIsCreatingNewTemplate(true);
  };

  // Save template from modal
  const handleSaveModalTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplTitle.trim() || !tplBody.trim()) {
      alert('Please fill in both Template Title and Message Content.');
      return;
    }

    if (editingTplId) {
      // Edit existing
      const updated = templates.map(t => {
        if (t.id === editingTplId) {
          return {
            ...t,
            title: tplTitle.trim(),
            category: tplCategory,
            icon: tplIcon.trim() || '📢',
            template: tplBody.trim(),
          };
        }
        return t;
      });
      saveTemplates(updated);
      setCustomTextOverride(tplBody.trim());
    } else {
      // Create new
      const newTpl: AlertTemplate = {
        id: `tpl-custom-${Date.now()}`,
        title: tplTitle.trim(),
        category: tplCategory,
        icon: tplIcon.trim() || '📢',
        template: tplBody.trim(),
        isDefault: false,
      };
      const updated = [...templates, newTpl];
      saveTemplates(updated);
      setSelectedTemplateId(newTpl.id);
      setCustomTextOverride(newTpl.template);
    }

    setIsCreatingNewTemplate(false);
  };

  // Delete current template
  const handleDeleteTemplate = (id: string, title?: string) => {
    if (!canDelete()) {
      confirmAction({
        title: 'Permission Restricted',
        message: 'Only Super Admin can delete alert templates.',
        confirmText: 'OK',
        variant: 'warning',
        onConfirm: () => {}
      });
      return;
    }
    if (templates.length <= 1) {
      confirmAction({
        title: 'Template Required',
        message: 'At least one template must remain in the system.',
        confirmText: 'OK',
        variant: 'warning',
        onConfirm: () => {}
      });
      return;
    }
    confirmAction({
      title: 'Delete WhatsApp Template',
      message: `Are you sure you want to delete template "${title || 'selected template'}"?`,
      confirmText: 'Delete Template',
      variant: 'danger',
      onConfirm: () => {
        const updated = templates.filter(t => t.id !== id);
        saveTemplates(updated);
        setSelectedTemplateId(updated[0].id);
      }
    });
  };

  // Insert tag into modal body
  const insertPlaceholderTag = (tag: string) => {
    setTplBody(prev => prev + tag);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50/50 to-indigo-50/30 p-3 sm:p-5 md:p-6 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* 🚀 PAGE HEADER */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 mb-1">
            <MessageCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
            WhatsApp Alert Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
            Direct WhatsApp integration linked with learners, grades and streams. Send instant notifications to individual parents or entire stream rosters.
          </p>
        </div>

        {/* 💳 MAIN CARD */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
          
          {/* Card Top Banner & Mode Selector */}
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-4 sm:p-6 text-white space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5 font-bold text-base sm:text-lg">
                <Building className="w-5 h-5 text-blue-200" />
                <span>Student Notification Portal</span>
              </div>
              <span className="text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full font-semibold border border-white/20">
                {schoolName}
              </span>
            </div>

            {/* MODE SWITCHER TABS */}
            <div className="flex items-center gap-2 bg-blue-900/40 p-1.5 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setMode('individual')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  mode === 'individual'
                    ? 'bg-white text-blue-900 shadow-md'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Individual Student Alert</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('class_broadcast')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  mode === 'class_broadcast'
                    ? 'bg-white text-blue-900 shadow-md'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Grade & Stream Class Roster</span>
                <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold ml-1">
                  {filteredLearners.length}
                </span>
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-7 space-y-6">

            {/* 🛡️ LINKED GRADE & STREAM FILTER BAR */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-600" /> Filter Learners by Grade & Stream
                </label>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                  {filteredLearners.length} {filteredLearners.length === 1 ? 'Learner' : 'Learners'} Found
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Grade Filter */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Grade / Class</span>
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

                {/* Stream Filter */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Stream / Division</span>
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

                {/* Search Learner */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Search Learner / Adm No</span>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type name or adm..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs font-medium pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 📋 PRE-DEFINED TEMPLATES SELECTOR */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-emerald-600" /> Select WhatsApp Message Template
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartEditTemplate}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" /> Edit Template
                  </button>
                  <button
                    type="button"
                    onClick={handleStartCreateTemplate}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Template
                  </button>
                </div>
              </div>

              {/* Template grid cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {templates.map((tpl) => {
                  const isSelected = tpl.id === selectedTemplateId;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(tpl.id);
                        setCustomTextOverride(tpl.template);
                      }}
                      className={`p-3 rounded-2xl text-left border transition relative cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base">{tpl.icon || '📢'}</span>
                        <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                          tpl.category === 'Attendance' ? 'bg-emerald-100 text-emerald-800' :
                          tpl.category === 'Finance' ? 'bg-blue-100 text-blue-800' :
                          tpl.category === 'Events' ? 'bg-purple-100 text-purple-800' :
                          'bg-slate-200 text-slate-800'
                        }`}>
                          {tpl.category}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {tpl.title}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MODE 1: INDIVIDUAL STUDENT ALERT */}
            {mode === 'individual' && (
              <div className="space-y-5 pt-2">
                {/* 👨‍🎓 STUDENT SELECT */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-blue-600" /> Select Learner from Filtered List
                  </label>
                  <select
                    value={selectedLearnerId}
                    onChange={(e) => setSelectedLearnerId(e.target.value)}
                    className="w-full text-xs font-semibold p-3 bg-slate-50 border-2 border-blue-200/80 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition text-slate-900 cursor-pointer"
                  >
                    {filteredLearners.length === 0 ? (
                      <option value="">— No learners match current grade/stream filters —</option>
                    ) : (
                      filteredLearners.map((learner) => {
                        const g = learner.gradeLabel || (learner.grade ? `Grade ${learner.grade}` : 'N/A');
                        const s = learner.stream || 'N/A';
                        const name = learner.fullName || `${learner.firstName || ''} ${learner.secondName || ''} ${learner.otherName || ''}`.trim() || learner.name;
                        const adm = learner.admNo || learner.admissionNumber || learner.id;
                        return (
                          <option key={learner.id} value={learner.id}>
                            {name} — Adm: {adm} | {g} ({s})
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                {/* 👤 STUDENT & GRADE DETAILS READONLY GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" /> Learner Name
                    </label>
                    <input
                      type="text"
                      value={selectedLearner ? (selectedLearner.fullName || `${selectedLearner.firstName || ''} ${selectedLearner.secondName || ''}`.trim() || selectedLearner.name) : ''}
                      placeholder="Student name"
                      readOnly
                      className="w-full text-xs font-semibold p-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-slate-800 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-blue-600" /> Adm No & Class
                    </label>
                    <div className="flex items-center gap-2 bg-slate-100/80 border border-slate-200 rounded-xl p-2.5">
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {selectedLearner ? (selectedLearner.admNo || selectedLearner.admissionNumber || selectedLearner.id) : '—'}
                      </span>
                      {selectedLearner && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-full ml-auto shrink-0">
                          {selectedLearner.gradeLabel || (selectedLearner.grade ? `Grade ${selectedLearner.grade}` : 'N/A')} • {selectedLearner.stream || 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-600" /> Parent WhatsApp Phone
                    </label>
                    <input
                      type="text"
                      value={parentPhoneFormatted || 'No phone recorded'}
                      readOnly
                      className={`w-full text-xs font-mono font-bold p-2.5 rounded-xl border cursor-not-allowed ${
                        parentPhoneFormatted 
                          ? 'bg-slate-100/80 border-slate-200 text-slate-900' 
                          : 'bg-rose-50 border-rose-200 text-rose-700'
                      }`}
                    />
                  </div>
                </div>

                {/* EDITABLE MESSAGE CONTENT IN SESSION */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Raw Message Template (Editable in Session)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomTextOverride(activeTemplate?.template || '')}
                      className="text-[10px] text-slate-500 hover:text-slate-700 underline font-semibold cursor-pointer"
                    >
                      Reset to Template Default
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={customTextOverride}
                    onChange={(e) => setCustomTextOverride(e.target.value)}
                    className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900"
                  />
                </div>

                {/* 📲 SEND WHATSAPP BUTTON */}
                <button
                  onClick={() => handleSendAlert()}
                  className="w-full py-4 px-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-[0.99]"
                >
                  <MessageCircle className="w-5 h-5 stroke-[2.5]" />
                  Send WhatsApp Alert Now
                  <ExternalLink className="w-4 h-4 opacity-80" />
                </button>

                {/* 👁️ PREVIEW BOX */}
                <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                      <Eye className="w-4 h-4 text-emerald-600" />
                      Live Interpolated Message Preview
                    </div>
                    <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                      {activeTemplate?.title}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-950 font-mono whitespace-pre-line leading-relaxed bg-white/80 p-3.5 rounded-xl border border-emerald-100/80 shadow-2xs">
                    {previewMessage}
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: CLASS ROSTER BROADCAST LIST */}
            {mode === 'class_broadcast' && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Class Learners Roster — Active Template: <strong>{activeTemplate.title}</strong></span>
                  </div>
                </div>

                {filteredLearners.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                    <p className="text-xs font-bold text-amber-900">No learners found matching selected Grade & Stream</p>
                    <p className="text-[11px] text-amber-700">Try changing your Grade or Stream filter above to view parents.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                      {filteredLearners.map((learner) => {
                        const phone = getLearnerPhone(learner);
                        const msg = interpolateMessage(customTextOverride || activeTemplate?.template || '', learner);
                        const isCopied = copiedLearnerId === learner.id;
                        const name = learner.fullName || `${learner.firstName || ''} ${learner.secondName || ''}`.trim() || learner.name;
                        const adm = learner.admNo || learner.admissionNumber || learner.id;
                        const g = learner.gradeLabel || (learner.grade ? `Grade ${learner.grade}` : 'N/A');
                        const s = learner.stream || 'N/A';

                        return (
                          <div 
                            key={learner.id}
                            className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 hover:border-blue-300 transition"
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                              <div>
                                <h4 className="text-xs font-black text-slate-900">{name}</h4>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Adm: <strong>{adm}</strong> • Class: <span className="text-blue-700 font-bold">{g} ({s})</span>
                                </div>
                              </div>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                phone ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {phone ? `📱 254${phone.slice(-9)}` : '⚠️ No Phone'}
                              </span>
                            </div>

                            {/* Message Preview Snippet */}
                            <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 line-clamp-3 leading-tight">
                              {msg}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(learner)}
                                className="px-2.5 py-1.5 bg-slate-200/80 hover:bg-slate-300 text-slate-800 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{isCopied ? 'Copied' : 'Copy'}</span>
                              </button>

                              <button
                                type="button"
                                disabled={!phone}
                                onClick={() => handleSendAlert(learner)}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition shadow-2xs ${
                                  phone 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer' 
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Send WhatsApp</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* 🔒 FOOTER NOTE */}
        <div className="text-center text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-400" /> Linked with Learners, Grades & Streams • St Augustine School Platform
        </div>

      </div>

      {/* 🛠️ CREATE / EDIT TEMPLATE MODAL */}
      {isCreatingNewTemplate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-base">
                <Bookmark className="w-5 h-5 text-emerald-600" />
                <span>{editingTplId ? 'Edit WhatsApp Template' : 'Create New WhatsApp Template'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingNewTemplate(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalTemplate} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Template Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Late Arrival, Fee Reminder"
                    value={tplTitle}
                    onChange={(e) => setTplTitle(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Icon Emoji</label>
                  <input
                    type="text"
                    placeholder="e.g. ⏰, 💳"
                    value={tplIcon}
                    onChange={(e) => setTplIcon(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                <select
                  value={tplCategory}
                  onChange={(e) => setTplCategory(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-semibold cursor-pointer"
                >
                  <option value="Attendance">Attendance</option>
                  <option value="Finance">Finance</option>
                  <option value="Events">Events</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">Message Format</label>
                  <span className="text-[10px] text-slate-500 font-medium">Click tag to insert tag</span>
                </div>

                {/* Placeholder Quick Tags */}
                <div className="flex flex-wrap gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => insertPlaceholderTag('{school_name}')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-mono cursor-pointer"
                  >
                    +&#123;school_name&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholderTag('{student_name}')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-mono cursor-pointer"
                  >
                    +&#123;student_name&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholderTag('{adm_no}')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-mono cursor-pointer"
                  >
                    +&#123;adm_no&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholderTag('{grade}')}
                    className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-900 px-2 py-0.5 rounded-md font-mono font-bold cursor-pointer"
                  >
                    +&#123;grade&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholderTag('{stream}')}
                    className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-900 px-2 py-0.5 rounded-md font-mono font-bold cursor-pointer"
                  >
                    +&#123;stream&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholderTag('{time}')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-mono cursor-pointer"
                  >
                    +&#123;time&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholderTag('{date}')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-mono cursor-pointer"
                  >
                    +&#123;date&#125;
                  </button>
                </div>

                <textarea
                  rows={6}
                  required
                  value={tplBody}
                  onChange={(e) => setTplBody(e.target.value)}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {editingTplId && canDelete() ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreatingNewTemplate(false);
                      handleDeleteTemplate(editingTplId, tplTitle);
                    }}
                    className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 font-bold rounded-xl transition flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5 pointer-events-none" /> Delete Template
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewTemplate(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Template
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
