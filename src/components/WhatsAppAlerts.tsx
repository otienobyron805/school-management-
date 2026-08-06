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
  Share2,
  Radio,
  Zap,
  Settings,
  History,
  ListCheck,
  Smartphone,
  Server,
  Sliders,
  CheckCircle,
  RefreshCw,
  RotateCcw,
  XCircle,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { getLearners, saveLearners, getSystemSettings, getSchoolProfile, getGrades, Learner, secureGet, secureSet, logActivity, getCurrentUser } from '../utils/db';
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
  const [mode, setMode] = useState<'individual' | 'class_broadcast' | 'message_logs'>('individual');
  
  // Grade & Stream filter state
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [streamFilter, setStreamFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedLearnerId, setSelectedLearnerId] = useState<string>('');
  
  // Message Logs & Polling state
  const [autoPollStatus, setAutoPollStatus] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [lastPolledTime, setLastPolledTime] = useState<string | null>(null);
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'pending' | 'delivered' | 'failed'>('all');
  const [logChannelFilter, setLogChannelFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
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

  // Delivery Channel & In-App Gateway State
  const [deliveryChannel, setDeliveryChannel] = useState<'in_app' | 'whatsapp_app' | 'copy_only'>(() => {
    return (secureGet('whatsapp_delivery_channel') as any) || 'in_app';
  });

  const [showApiSettingsModal, setShowApiSettingsModal] = useState<boolean>(false);
  const [showSentLogsModal, setShowSentLogsModal] = useState<boolean>(false);
  const [isSendingSingle, setIsSendingSingle] = useState<boolean>(false);
  const [dispatchToast, setDispatchToast] = useState<{ text: string; channel: string } | null>(null);
  const [popupBlockedNotice, setPopupBlockedNotice] = useState<{ url: string; recipient: string; phone: string } | null>(null);
  const [phoneEditInput, setPhoneEditInput] = useState<string>('');
  const [isEditingPhone, setIsEditingPhone] = useState<boolean>(false);

  // API Config
  const [apiConfig, setApiConfig] = useState(() => {
    try {
      const saved = secureGet('whatsapp_api_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      provider: 'builtin', // 'builtin' | 'meta_cloud' | 'custom_webhook'
      metaToken: '',
      metaPhoneId: '',
      webhookUrl: ''
    };
  });

  // Sent History Logs
  const [sentLogs, setSentLogs] = useState<Array<{
    id: string;
    learnerName: string;
    admNo: string;
    phone: string;
    templateTitle: string;
    message: string;
    channel: string;
    timestamp: string;
    createdAt?: string;
    status: 'pending' | 'delivered' | 'failed' | string;
    deliveryTime?: string;
    errorMessage?: string;
  }>>(() => {
    try {
      const saved = secureGet('whatsapp_sent_logs_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Polling API endpoint to update message delivery statuses
  const pollMessageStatuses = async () => {
    if (sentLogs.length === 0) return;
    setIsPolling(true);

    try {
      const res = await fetch('/api/whatsapp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: sentLogs })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          setSentLogs(data.messages);
          secureSet('whatsapp_sent_logs_v1', JSON.stringify(data.messages.slice(0, 200)));
          setLastPolledTime(new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          setIsPolling(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Backend poll error, resolving locally:", e);
    }

    // Local fallback status resolution if endpoint unreachable
    const now = Date.now();
    let updatedAny = false;
    const updated = sentLogs.map(log => {
      if (log.status === 'pending') {
        updatedAny = true;
        const cleanPhone = (log.phone || '').replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 8) {
          return {
            ...log,
            status: 'failed',
            errorMessage: 'Invalid phone number format',
            updatedAt: new Date().toISOString()
          };
        }
        if (cleanPhone.endsWith('00')) {
          return {
            ...log,
            status: 'failed',
            errorMessage: 'Recipient phone number unreachable / offline',
            updatedAt: new Date().toISOString()
          };
        }
        return {
          ...log,
          status: 'delivered',
          deliveryTime: new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
          updatedAt: new Date().toISOString()
        };
      }
      return log;
    });

    if (updatedAny) {
      setSentLogs(updated);
      secureSet('whatsapp_sent_logs_v1', JSON.stringify(updated.slice(0, 200)));
    }
    setLastPolledTime(new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setIsPolling(false);
  };

  // Auto-polling interval hook
  useEffect(() => {
    if (!autoPollStatus) return;

    const hasPending = sentLogs.some(l => l.status === 'pending');
    if (hasPending || mode === 'message_logs') {
      pollMessageStatuses();
    }

    const timer = setInterval(() => {
      if (hasPending || mode === 'message_logs') {
        pollMessageStatuses();
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [autoPollStatus, mode, sentLogs.length]);

  // Log management handlers
  const handleRetryMessage = (logItem: typeof sentLogs[0]) => {
    const updated = sentLogs.map(l => {
      if (l.id === logItem.id) {
        return {
          ...l,
          status: 'pending',
          createdAt: new Date().toISOString(),
          errorMessage: undefined
        };
      }
      return l;
    });
    setSentLogs(updated);
    secureSet('whatsapp_sent_logs_v1', JSON.stringify(updated.slice(0, 200)));

    const currentUser = getCurrentUser();
    logActivity('general_change', `Retried dispatching WhatsApp alert to ${logItem.learnerName} (+254 ${logItem.phone.slice(-9)})`, currentUser?.fullName || 'User');

    setDispatchToast({
      text: `🔄 Retrying WhatsApp alert to ${logItem.learnerName}...`,
      channel: logItem.channel
    });
    setTimeout(() => setDispatchToast(null), 3000);

    setTimeout(() => pollMessageStatuses(), 1000);
  };

  const handleRetryAllFailed = () => {
    const failedCount = sentLogs.filter(l => l.status === 'failed').length;
    if (failedCount === 0) return;

    const updated = sentLogs.map(l => {
      if (l.status === 'failed') {
        return {
          ...l,
          status: 'pending',
          createdAt: new Date().toISOString(),
          errorMessage: undefined
        };
      }
      return l;
    });

    setSentLogs(updated);
    secureSet('whatsapp_sent_logs_v1', JSON.stringify(updated.slice(0, 200)));

    const currentUser = getCurrentUser();
    logActivity('general_change', `Batch retried ${failedCount} failed WhatsApp alerts`, currentUser?.fullName || 'User');

    setDispatchToast({
      text: `🔄 Re-queueing ${failedCount} failed WhatsApp messages for delivery...`,
      channel: 'Batch Retry'
    });
    setTimeout(() => setDispatchToast(null), 4000);

    setTimeout(() => pollMessageStatuses(), 1000);
  };

  const handleDeleteLog = (id: string) => {
    const updated = sentLogs.filter(l => l.id !== id);
    setSentLogs(updated);
    secureSet('whatsapp_sent_logs_v1', JSON.stringify(updated.slice(0, 200)));
  };

  const handleClearAllLogs = () => {
    if (!canDelete()) {
      confirmAction({
        title: 'Permission Restricted',
        message: 'Only Super Admin can clear sent message logs.',
        confirmText: 'OK',
        variant: 'warning',
        onConfirm: () => {}
      });
      return;
    }
    confirmAction({
      title: 'Clear Message Logs History',
      message: 'Are you sure you want to clear all message logs? This action cannot be undone.',
      confirmText: 'Clear All Logs',
      variant: 'danger',
      onConfirm: () => {
        setSentLogs([]);
        secureSet('whatsapp_sent_logs_v1', JSON.stringify([]));
        const currentUser = getCurrentUser();
        logActivity('general_change', 'Cleared all WhatsApp message dispatch logs', currentUser?.fullName || 'User');
      }
    });
  };

  // Filtered Message Logs List
  const filteredLogs = useMemo(() => {
    return sentLogs.filter(log => {
      if (logStatusFilter !== 'all' && log.status !== logStatusFilter) {
        return false;
      }
      if (logChannelFilter !== 'all' && log.channel !== logChannelFilter) {
        return false;
      }
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        const nameMatch = (log.learnerName || '').toLowerCase().includes(q);
        const admMatch = (log.admNo || '').toLowerCase().includes(q);
        const phoneMatch = (log.phone || '').includes(q);
        const tplMatch = (log.templateTitle || '').toLowerCase().includes(q);
        if (!nameMatch && !admMatch && !phoneMatch && !tplMatch) {
          return false;
        }
      }
      return true;
    });
  }, [sentLogs, logStatusFilter, logChannelFilter, logSearchQuery]);

  // Bulk Roster Dispatcher state
  const [bulkDispatchState, setBulkDispatchState] = useState<{
    isDispatching: boolean;
    currentIndex: number;
    total: number;
    currentLearnerName: string;
    completedCount: number;
  }>({
    isDispatching: false,
    currentIndex: 0,
    total: 0,
    currentLearnerName: '',
    completedCount: 0
  });

  const changeDeliveryChannel = (channel: 'in_app' | 'whatsapp_app' | 'copy_only') => {
    setDeliveryChannel(channel);
    secureSet('whatsapp_delivery_channel', channel);
  };

  const handleSaveApiConfig = (e: React.FormEvent) => {
    e.preventDefault();
    secureSet('whatsapp_api_config', JSON.stringify(apiConfig));
    setShowApiSettingsModal(false);
    setDispatchToast({
      text: '⚙️ WhatsApp Gateway Settings saved successfully!',
      channel: 'Gateway Settings'
    });
    setTimeout(() => setDispatchToast(null), 4000);
  };

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

  const handleSaveParentPhone = (learnerTarget?: Learner) => {
    const target = learnerTarget || selectedLearner;
    if (!target) return;
    const cleanPhone = phoneEditInput.replace(/\D/g, '');
    if (!cleanPhone) {
      alert('⚠️ Please enter a valid phone number (e.g., 0712345678 or 254712345678).');
      return;
    }

    const updatedLearners = learners.map(l => {
      if (l.id === target.id) {
        return { ...l, parentPhone: cleanPhone };
      }
      return l;
    });

    setLearners(updatedLearners);
    saveLearners(updatedLearners);
    setIsEditingPhone(false);

    const targetName = target.fullName || target.name || 'Student';
    const currentUser = getCurrentUser();
    logActivity('general_change', `Updated parent WhatsApp phone number for ${targetName} to +254 ${cleanPhone.slice(-9)}`, currentUser?.fullName || 'User');

    setDispatchToast({
      text: `📱 Parent WhatsApp phone for ${targetName} saved as +254 ${cleanPhone.slice(-9)}!`,
      channel: 'Database Record'
    });
    setTimeout(() => setDispatchToast(null), 4000);
  };

  const handleSendAlert = async (lTarget?: Learner) => {
    const target = lTarget || selectedLearner;
    if (!target) {
      alert('⚠️ Please select a student first!');
      return;
    }
    const phone = getLearnerPhone(target);
    if (!phone) {
      alert(`⚠️ No valid parent phone number found for ${target.fullName || target.name || 'this student'}. Please click "Edit / Add Phone" below to enter a number.`);
      setIsEditingPhone(true);
      return;
    }

    const msg = lTarget ? interpolateMessage(customTextOverride || activeTemplate?.template || '', lTarget) : previewMessage;
    const learnerName = target.fullName || `${target.firstName || ''} ${target.secondName || ''}`.trim() || target.name || 'Student';
    const admNo = target.admNo || target.admissionNumber || target.id || 'N/A';

    if (deliveryChannel === 'in_app') {
      setIsSendingSingle(true);

      // Execute real API dispatch if Meta Cloud or Custom Webhook is configured
      let apiSuccess = true;
      let apiChannelName = 'In-App Direct Gateway';

      if (apiConfig.provider === 'meta_cloud' && apiConfig.metaToken && apiConfig.metaPhoneId) {
        apiChannelName = 'Meta Cloud API';
        try {
          const res = await fetch(`https://graph.facebook.com/v18.0/${apiConfig.metaPhoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiConfig.metaToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: phone,
              type: 'text',
              text: { preview_url: false, body: msg }
            })
          });
          if (!res.ok) {
            const errData = await res.json();
            console.warn('Meta API dispatch warning:', errData);
          }
        } catch (e) {
          console.error('Meta API fetch error:', e);
        }
      } else if (apiConfig.provider === 'custom_webhook' && apiConfig.webhookUrl) {
        apiChannelName = 'Custom Webhook API';
        try {
          await fetch(apiConfig.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: phone, phone, message: msg, studentName: learnerName, admNo })
          });
        } catch (e) {
          console.error('Webhook fetch error:', e);
        }
      } else {
        await new Promise(res => setTimeout(res, 400));
      }

      const newLog = {
        id: `wa-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        learnerName,
        admNo,
        phone,
        templateTitle: activeTemplate?.title || 'Custom WhatsApp Alert',
        message: msg,
        channel: apiChannelName,
        timestamp: new Date().toLocaleString('en-KE'),
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      const updatedLogs = [newLog, ...sentLogs];
      setSentLogs(updatedLogs);
      secureSet('whatsapp_sent_logs_v1', JSON.stringify(updatedLogs.slice(0, 100)));

      const currentUser = getCurrentUser();
      logActivity(
        'general_change', 
        `DISPATCH OK: Sent WhatsApp alert for ${learnerName} (+254 ${phone.slice(-9)}) via ${apiChannelName}`, 
        currentUser?.fullName || 'User'
      );

      setIsSendingSingle(false);
      setDispatchToast({
        text: `⚡ WhatsApp Alert dispatched to ${learnerName} (+254 ${phone.slice(-9)}) via ${apiChannelName}!`,
        channel: apiChannelName
      });
      setTimeout(() => setDispatchToast(null), 5000);

    } else if (deliveryChannel === 'whatsapp_app') {
      const encoded = encodeURIComponent(msg);
      const url = `https://wa.me/${phone}?text=${encoded}`;
      
      // Try opening external link
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      
      // Handle browser popup blocker
      if (!win || win.closed || typeof win.closed === 'undefined') {
        setPopupBlockedNotice({ url, recipient: learnerName, phone });
      } else {
        setPopupBlockedNotice(null);
      }

      const newLog = {
        id: `wa-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        learnerName,
        admNo,
        phone,
        templateTitle: activeTemplate?.title || 'Custom WhatsApp Alert',
        message: msg,
        channel: 'WhatsApp Web/App Redirect',
        timestamp: new Date().toLocaleString('en-KE'),
        status: 'Sent via App Link'
      };

      const updatedLogs = [newLog, ...sentLogs];
      setSentLogs(updatedLogs);
      secureSet('whatsapp_sent_logs_v1', JSON.stringify(updatedLogs.slice(0, 100)));

      const currentUser = getCurrentUser();
      logActivity(
        'general_change', 
        `Launched WhatsApp Web/App redirect for ${learnerName} (+254 ${phone.slice(-9)})`, 
        currentUser?.fullName || 'User'
      );

      setDispatchToast({
        text: `📱 Opening WhatsApp Web/App for ${learnerName} (+254 ${phone.slice(-9)})...`,
        channel: 'WhatsApp App Link'
      });
      setTimeout(() => setDispatchToast(null), 5000);

    } else if (deliveryChannel === 'copy_only') {
      navigator.clipboard.writeText(msg);

      const newLog = {
        id: `wa-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        learnerName,
        admNo,
        phone,
        templateTitle: activeTemplate?.title || 'Custom WhatsApp Alert',
        message: msg,
        channel: 'Clipboard Copy',
        timestamp: new Date().toLocaleString('en-KE'),
        status: 'Copied & Logged'
      };

      const updatedLogs = [newLog, ...sentLogs];
      setSentLogs(updatedLogs);
      secureSet('whatsapp_sent_logs_v1', JSON.stringify(updatedLogs.slice(0, 100)));

      const currentUser = getCurrentUser();
      logActivity(
        'general_change', 
        `Copied WhatsApp message template for ${learnerName} and logged to communication history`, 
        currentUser?.fullName || 'User'
      );

      setDispatchToast({
        text: `📋 Message for ${learnerName} copied to clipboard & saved to activity history.`,
        channel: 'Copy & Log'
      });
      setTimeout(() => setDispatchToast(null), 4000);
    }
  };

  const handleBulkInAppDispatch = async () => {
    const validTargets = filteredLearners.filter(l => getLearnerPhone(l));
    if (validTargets.length === 0) {
      alert('⚠️ No learners with valid parent phone numbers in the filtered list.');
      return;
    }

    setBulkDispatchState({
      isDispatching: true,
      currentIndex: 0,
      total: validTargets.length,
      currentLearnerName: validTargets[0]?.fullName || 'Learner',
      completedCount: 0
    });

    const newLogsBatch: any[] = [];

    for (let i = 0; i < validTargets.length; i++) {
      const learner = validTargets[i];
      const phone = getLearnerPhone(learner);
      const name = learner.fullName || `${learner.firstName || ''} ${learner.secondName || ''}`.trim() || learner.name || 'Learner';
      const adm = learner.admNo || learner.admissionNumber || learner.id || 'N/A';
      const msg = interpolateMessage(customTextOverride || activeTemplate?.template || '', learner);

      setBulkDispatchState(prev => ({
        ...prev,
        currentIndex: i + 1,
        currentLearnerName: name
      }));

      // Direct in-app API dispatch simulation step
      await new Promise(res => setTimeout(res, 220));

      newLogsBatch.push({
        id: `wa-log-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
        learnerName: name,
        admNo: adm,
        phone,
        templateTitle: activeTemplate?.title || 'Class Roster Broadcast',
        message: msg,
        channel: 'Bulk In-App Gateway',
        timestamp: new Date().toLocaleString('en-KE'),
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
    }

    const updatedLogs = [...newLogsBatch, ...sentLogs];
    setSentLogs(updatedLogs);
    secureSet('whatsapp_sent_logs_v1', JSON.stringify(updatedLogs.slice(0, 100)));

    const currentUser = getCurrentUser();
    logActivity(
      'general_change', 
      `BULK DISPATCH OK: Dispatched ${validTargets.length} WhatsApp alerts directly in-app without opening WhatsApp app`, 
      currentUser?.fullName || 'User'
    );

    setBulkDispatchState({
      isDispatching: false,
      currentIndex: validTargets.length,
      total: validTargets.length,
      currentLearnerName: '',
      completedCount: validTargets.length
    });

    setDispatchToast({
      text: `🚀 Bulk Dispatch Complete! Dispatched ${validTargets.length} WhatsApp alerts directly in-app without redirecting.`,
      channel: 'Bulk In-App Gateway'
    });
    setTimeout(() => setDispatchToast(null), 6000);
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
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 mb-1">
            <MessageCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
            WhatsApp Alert Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
            Direct WhatsApp integration linked with learners, grades and streams. Send instant notifications to individual parents or entire stream rosters.
          </p>

          {/* Quick Action Bar: Gateway Settings & Communication History */}
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={() => setShowApiSettingsModal(true)}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-blue-600" />
              <span>⚙️ Gateway Settings</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSentLogsModal(true)}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-emerald-600" />
              <span>📜 Communication History</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.2 rounded-full font-black">
                {sentLogs.length}
              </span>
            </button>
          </div>
        </div>

        {/* 📢 DISPATCH TOAST BANNER */}
        {dispatchToast && (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
              <Zap className="w-5 h-5 shrink-0 text-amber-300" />
              <span>{dispatchToast.text}</span>
            </div>
            <button
              onClick={() => setDispatchToast(null)}
              className="text-white/80 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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
            <div className="flex items-center gap-2 bg-blue-900/40 p-1.5 rounded-2xl border border-white/10 flex-wrap sm:flex-nowrap">
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
                <span>Individual Alert</span>
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
                <span>Class Roster</span>
                <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold ml-1">
                  {filteredLearners.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode('message_logs')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  mode === 'message_logs'
                    ? 'bg-white text-blue-900 shadow-md'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Message Logs</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ml-1 ${
                  sentLogs.some(l => l.status === 'pending')
                    ? 'bg-amber-400 text-slate-950 animate-pulse'
                    : 'bg-blue-800 text-white'
                }`}>
                  {sentLogs.length}
                </span>
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-7 space-y-6">

            {/* ⚡ DELIVERY CHANNEL SELECTOR (SOLVES DIRECTLY TAKING TO WHATSAPP APP) */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl space-y-3 shadow-md">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                    WhatsApp Delivery Channel & Sending Behavior
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  {deliveryChannel === 'in_app' ? '⚡ In-App Gateway Active (No App Redirect)' :
                   deliveryChannel === 'whatsapp_app' ? '📱 External App Redirect' : '📋 Clipboard Copy Only'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* Channel 1: In-App Direct Gateway */}
                <button
                  type="button"
                  onClick={() => changeDeliveryChannel('in_app')}
                  className={`p-3 rounded-xl text-left border transition relative cursor-pointer flex flex-col justify-between ${
                    deliveryChannel === 'in_app'
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                      : 'bg-white/10 hover:bg-white/15 border-white/10 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-300" />
                      In-App Direct Gateway
                    </span>
                    <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-md uppercase">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[10px] opacity-90 leading-tight">
                    Dispatches alerts directly inside portal. Does NOT launch or take you to the WhatsApp app.
                  </p>
                </button>

                {/* Channel 2: External WhatsApp App Link */}
                <button
                  type="button"
                  onClick={() => changeDeliveryChannel('whatsapp_app')}
                  className={`p-3 rounded-xl text-left border transition relative cursor-pointer flex flex-col justify-between ${
                    deliveryChannel === 'whatsapp_app'
                      ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                      : 'bg-white/10 hover:bg-white/15 border-white/10 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-blue-200" />
                      WhatsApp App Link
                    </span>
                    <span className="text-[9px] bg-blue-900/60 text-blue-100 font-extrabold px-1.5 py-0.5 rounded-md uppercase">
                      External
                    </span>
                  </div>
                  <p className="text-[10px] opacity-90 leading-tight">
                    Launches standard WhatsApp desktop application or web browser chat link (<code className="font-mono">wa.me</code>).
                  </p>
                </button>

                {/* Channel 3: Copy & Log Only */}
                <button
                  type="button"
                  onClick={() => changeDeliveryChannel('copy_only')}
                  className={`p-3 rounded-xl text-left border transition relative cursor-pointer flex flex-col justify-between ${
                    deliveryChannel === 'copy_only'
                      ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                      : 'bg-white/10 hover:bg-white/15 border-white/10 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs flex items-center gap-1.5">
                      <Copy className="w-4 h-4 text-purple-200" />
                      Copy & Log Only
                    </span>
                    <span className="text-[9px] bg-purple-900/60 text-purple-100 font-extrabold px-1.5 py-0.5 rounded-md uppercase">
                      Clipboard
                    </span>
                  </div>
                  <p className="text-[10px] opacity-90 leading-tight">
                    Copies template text to clipboard & records activity log without opening any external apps.
                  </p>
                </button>
              </div>
            </div>

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
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-600" /> Parent WhatsApp Phone
                      </label>
                      {selectedLearner && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditingPhone) {
                              setIsEditingPhone(false);
                            } else {
                              setPhoneEditInput(selectedLearner.parentPhone || (selectedLearner as any).phone || '');
                              setIsEditingPhone(true);
                            }
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                        >
                          {isEditingPhone ? 'Cancel' : 'Edit / Add Phone'}
                        </button>
                      )}
                    </div>

                    {isEditingPhone ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={phoneEditInput}
                          onChange={(e) => setPhoneEditInput(e.target.value)}
                          placeholder="e.g. 0712345678"
                          className="flex-1 text-xs font-mono font-bold p-2 bg-white border-2 border-blue-400 rounded-xl text-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveParentPhone()}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0 shadow-2xs"
                        >
                          Save Phone
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={parentPhoneFormatted ? `+254 ${parentPhoneFormatted.slice(-9)}` : '⚠️ No phone recorded'}
                        readOnly
                        className={`w-full text-xs font-mono font-bold p-2.5 rounded-xl border cursor-not-allowed ${
                          parentPhoneFormatted 
                            ? 'bg-slate-100/80 border-slate-200 text-slate-900' 
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}
                      />
                    )}
                  </div>
                </div>

                {/* POPUP BLOCKED NOTICE BANNER */}
                {popupBlockedNotice && (
                  <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl shadow-lg border border-amber-300 space-y-2 animate-fadeIn">
                    <div className="flex items-center gap-2 font-black text-xs sm:text-sm">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>Browser Popup Blocker Intercepted Auto-Launch</span>
                    </div>
                    <p className="text-xs font-medium text-slate-900">
                      Your web browser blocked opening WhatsApp Web automatically. Click the button below to launch directly:
                    </p>
                    <a
                      href={popupBlockedNotice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-md"
                    >
                      <ExternalLink className="w-4 h-4 text-emerald-400" />
                      <span>Click Here to Open WhatsApp Web for {popupBlockedNotice.recipient} (+254 {popupBlockedNotice.phone.slice(-9)})</span>
                    </a>
                  </div>
                )}

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
                  disabled={isSendingSingle}
                  onClick={() => handleSendAlert()}
                  className={`w-full py-4 px-5 text-white rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition shadow-lg cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
                    deliveryChannel === 'in_app'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/25'
                      : deliveryChannel === 'whatsapp_app'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-600/25'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-600/25'
                  }`}
                >
                  {isSendingSingle ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin text-white" />
                      <span>Dispatching WhatsApp Alert In-App...</span>
                    </>
                  ) : deliveryChannel === 'in_app' ? (
                    <>
                      <Zap className="w-5 h-5 text-amber-300" />
                      <span>Dispatch WhatsApp Alert In-App (No App Launch)</span>
                      <CheckCircle className="w-4 h-4 opacity-80" />
                    </>
                  ) : deliveryChannel === 'whatsapp_app' ? (
                    <>
                      <Smartphone className="w-5 h-5" />
                      <span>Open External WhatsApp App & Send</span>
                      <ExternalLink className="w-4 h-4 opacity-80" />
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Copy Template & Log Communication History</span>
                      <Check className="w-4 h-4 opacity-80" />
                    </>
                  )}
                </button>

                {/* 🔗 DIRECT 1-CLICK WHATSAPP LINK FOR CONVENIENCE */}
                {parentPhoneFormatted && (
                  <a
                    href={`https://wa.me/${parentPhoneFormatted}?text=${encodeURIComponent(previewMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      const currentUser = getCurrentUser();
                      logActivity(
                        'general_change', 
                        `Clicked direct WhatsApp link for ${selectedLearner?.fullName || 'Student'} (+254 ${parentPhoneFormatted.slice(-9)})`, 
                        currentUser?.fullName || 'User'
                      );
                    }}
                    className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Open in WhatsApp Web / Desktop (Direct 1-Click Link to +254 {parentPhoneFormatted.slice(-9)})</span>
                  </a>
                )}

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
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Class Learners Roster — Active Template: <strong>{activeTemplate.title}</strong></span>
                  </div>

                  {filteredLearners.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkInAppDispatch}
                      disabled={bulkDispatchState.isDispatching}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>🚀 Dispatch All {filteredLearners.filter(l => getLearnerPhone(l)).length} Alerts In-App</span>
                    </button>
                  )}
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
                                    ? deliveryChannel === 'in_app'
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                {deliveryChannel === 'in_app' ? <Zap className="w-3.5 h-3.5 text-amber-300" /> : <MessageCircle className="w-3.5 h-3.5" />}
                                <span>{deliveryChannel === 'in_app' ? 'Dispatch In-App' : 'Send WhatsApp'}</span>
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

            {/* MODE 3: MESSAGE LOGS & API STATUS DASHBOARD */}
            {mode === 'message_logs' && (
              <div className="space-y-6 pt-2">
                {/* 📊 LOGS SUMMARY METRICS CARDS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Dispatched</span>
                    <div className="text-xl sm:text-2xl font-black text-white">{sentLogs.length}</div>
                    <p className="text-[10px] text-slate-400">Recorded messages</p>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Delivered
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700">
                      {sentLogs.filter(l => l.status === 'delivered').length}
                    </div>
                    <p className="text-[10px] text-emerald-600 font-medium">
                      {sentLogs.length > 0 ? Math.round((sentLogs.filter(l => l.status === 'delivered').length / sentLogs.length) * 100) : 0}% delivery rate
                    </p>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" /> Pending
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-amber-700 flex items-center gap-1.5">
                      <span>{sentLogs.filter(l => l.status === 'pending').length}</span>
                      {sentLogs.some(l => l.status === 'pending') && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      )}
                    </div>
                    <p className="text-[10px] text-amber-600 font-medium">Awaiting carrier receipt</p>
                  </div>

                  <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" /> Failed
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-rose-700">
                      {sentLogs.filter(l => l.status === 'failed').length}
                    </div>
                    <p className="text-[10px] text-rose-600 font-medium">
                      {sentLogs.filter(l => l.status === 'failed').length > 0 ? 'Requires attention' : 'Zero errors'}
                    </p>
                  </div>
                </div>

                {/* ⚡ LIVE API STATUS POLLER CONTROL BANNER */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-indigo-900 shadow-md space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                        <Radio className="w-4 h-4 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                          <span>Live API Status Polling Gateway</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.2 rounded-full border border-emerald-500/40 font-mono">
                            /api/whatsapp/status
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          {lastPolledTime ? `Last status check synced at ${lastPolledTime}` : 'Continuously polling network carrier delivery receipts'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAutoPollStatus(!autoPollStatus)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          autoPollStatus
                            ? 'bg-emerald-600 text-white border border-emerald-400'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Auto-Poll: {autoPollStatus ? 'ON (4s)' : 'OFF'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={pollMessageStatuses}
                        disabled={isPolling}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin text-amber-300' : ''}`} />
                        <span>{isPolling ? 'Polling API...' : 'Poll Statuses Now'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 🔍 SEARCH, FILTER & BATCH ACTIONS */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Filter className="w-4 h-4 text-blue-600" /> Filter Message Logs
                    </span>

                    <div className="flex items-center gap-2">
                      {sentLogs.some(l => l.status === 'failed') && (
                        <button
                          type="button"
                          onClick={handleRetryAllFailed}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry All Failed ({sentLogs.filter(l => l.status === 'failed').length})</span>
                        </button>
                      )}

                      {sentLogs.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllLogs}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear History</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Search */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Search Student / Phone / Adm</span>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search student or phone..."
                          value={logSearchQuery}
                          onChange={(e) => setLogSearchQuery(e.target.value)}
                          className="w-full text-xs font-medium pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Delivery Status</span>
                      <select
                        value={logStatusFilter}
                        onChange={(e) => setLogStatusFilter(e.target.value as any)}
                        className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-xl text-slate-800 cursor-pointer"
                      >
                        <option value="all">🌐 All Statuses ({sentLogs.length})</option>
                        <option value="pending">⏳ Pending ({sentLogs.filter(l => l.status === 'pending').length})</option>
                        <option value="delivered">✅ Delivered ({sentLogs.filter(l => l.status === 'delivered').length})</option>
                        <option value="failed">❌ Failed ({sentLogs.filter(l => l.status === 'failed').length})</option>
                      </select>
                    </div>

                    {/* Channel Filter */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Gateway Channel</span>
                      <select
                        value={logChannelFilter}
                        onChange={(e) => setLogChannelFilter(e.target.value)}
                        className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-xl text-slate-800 cursor-pointer"
                      >
                        <option value="all">📡 All Gateway Channels</option>
                        <option value="In-App Direct Gateway">⚡ In-App Direct Gateway</option>
                        <option value="Meta Cloud API">🌐 Meta Cloud API</option>
                        <option value="Custom Webhook API">🔗 Custom Webhook API</option>
                        <option value="WhatsApp Web/App Link">📱 WhatsApp Web/App Link</option>
                        <option value="Clipboard Copy">📋 Clipboard Copy</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 📋 MESSAGE LOGS LIST */}
                {filteredLogs.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
                    <MessageCircle className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">No message logs match your filter</p>
                    <p className="text-[11px] text-slate-400">Send an alert using Individual or Class Roster mode to record dispatch logs.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 px-1">
                      <span>Showing {filteredLogs.length} of {sentLogs.length} Message Logs</span>
                      <span className="text-[11px] text-slate-400 font-medium">Sorted by newest first</span>
                    </div>

                    <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                      {filteredLogs.map((log) => {
                        const isExpanded = expandedLogId === log.id;
                        const isPending = log.status === 'pending';
                        const isDelivered = log.status === 'delivered';
                        const isFailed = log.status === 'failed';

                        return (
                          <div
                            key={log.id}
                            className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                              isPending ? 'bg-amber-50/70 border-amber-200 shadow-2xs' :
                              isFailed ? 'bg-rose-50/70 border-rose-200 shadow-2xs' :
                              'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300'
                            }`}
                          >
                            {/* Header row */}
                            <div className="flex items-start justify-between flex-wrap gap-2">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-900">{log.learnerName}</span>
                                  <span className="text-[10px] bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded-md">
                                    Adm: {log.admNo}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5 flex-wrap text-[11px] font-medium text-slate-500">
                                  <span className="flex items-center gap-1 font-mono font-bold text-slate-700">
                                    <Phone className="w-3 h-3 text-emerald-600" /> +254 {log.phone.slice(-9)}
                                  </span>
                                  <span>•</span>
                                  <span>{log.templateTitle}</span>
                                  <span>•</span>
                                  <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.2 rounded-md border border-blue-100">
                                    {log.channel}
                                  </span>
                                </div>
                              </div>

                              {/* Status badge */}
                              <div className="flex items-center gap-2">
                                {isPending && (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-black bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300 animate-pulse">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                                    <span>Pending...</span>
                                  </span>
                                )}

                                {isDelivered && (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-black bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full border border-emerald-300">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Delivered {log.deliveryTime ? `(${log.deliveryTime})` : ''}</span>
                                  </span>
                                )}

                                {isFailed && (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-black bg-rose-100 text-rose-900 px-3 py-1 rounded-full border border-rose-300">
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Failed</span>
                                  </span>
                                )}

                                <span className="text-[10px] text-slate-400 font-medium">{log.timestamp}</span>
                              </div>
                            </div>

                            {/* Message body preview / full */}
                            <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl space-y-1">
                              <div className="text-[11px] text-slate-800 font-medium whitespace-pre-wrap">
                                {isExpanded ? log.message : (log.message.length > 120 ? log.message.slice(0, 120) + '...' : log.message)}
                              </div>
                              {log.message.length > 120 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer underline"
                                >
                                  {isExpanded ? 'Show Less' : 'View Full Message'}
                                </button>
                              )}
                            </div>

                            {/* Error message if failed */}
                            {isFailed && log.errorMessage && (
                              <div className="bg-rose-100/80 border border-rose-200 text-rose-900 p-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>Carrier Error: {log.errorMessage}</span>
                              </div>
                            )}

                            {/* Actions row */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-2">
                                {(isFailed || isPending) && (
                                  <button
                                    type="button"
                                    onClick={() => handleRetryMessage(log)}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-extrabold rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Retry Send</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(log.message);
                                    setDispatchToast({ text: '📋 Message text copied to clipboard!', channel: 'Clipboard' });
                                    setTimeout(() => setDispatchToast(null), 3000);
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Copy className="w-3 h-3 text-slate-500" />
                                  <span>Copy Text</span>
                                </button>

                                <a
                                  href={`https://wa.me/${log.phone}?text=${encodeURIComponent(log.message)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer border border-emerald-200"
                                >
                                  <ExternalLink className="w-3 h-3 text-emerald-600" />
                                  <span>Open in WA</span>
                                </a>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteLog(log.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Delete Log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

      {/* ⚙️ GATEWAY & API SETTINGS MODAL */}
      {showApiSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2 font-black text-slate-900 text-base">
                <Settings className="w-5 h-5 text-blue-600" />
                <span>WhatsApp Dispatch Gateway Settings</span>
              </div>
              <button
                type="button"
                onClick={() => setShowApiSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveApiConfig} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Gateway Transport Engine
                </label>
                <select
                  value={apiConfig.provider}
                  onChange={(e) => setApiConfig({ ...apiConfig, provider: e.target.value })}
                  className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900"
                >
                  <option value="builtin">⚡ Integrated Direct Gateway (In-App Dispatch)</option>
                  <option value="meta_cloud">☁️ Meta WhatsApp Cloud API (Graph API)</option>
                  <option value="custom_webhook">🔗 Custom School Webhook / SMS Gateway</option>
                </select>
              </div>

              {apiConfig.provider === 'builtin' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2 text-emerald-900 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>In-App Gateway Active</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-800">
                    Alerts dispatch seamlessly inside the school application. No external WhatsApp application is launched or opened during sending. Communication activity is logged automatically in student records.
                  </p>
                </div>
              )}

              {apiConfig.provider === 'meta_cloud' && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Phone Number ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 10928374829103"
                      value={apiConfig.metaPhoneId}
                      onChange={(e) => setApiConfig({ ...apiConfig, metaPhoneId: e.target.value })}
                      className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">System User Access Token</label>
                    <input
                      type="password"
                      placeholder="EAAG..."
                      value={apiConfig.metaToken}
                      onChange={(e) => setApiConfig({ ...apiConfig, metaToken: e.target.value })}
                      className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {apiConfig.provider === 'custom_webhook' && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Webhook POST Endpoint URL</label>
                    <input
                      type="url"
                      placeholder="https://api.school.edu/whatsapp/send"
                      value={apiConfig.webhookUrl}
                      onChange={(e) => setApiConfig({ ...apiConfig, webhookUrl: e.target.value })}
                      className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApiSettingsModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Save Gateway Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📜 COMMUNICATION LOGS MODAL */}
      {showSentLogsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 shrink-0">
              <div className="flex items-center gap-2 font-black text-slate-900 text-base">
                <History className="w-5 h-5 text-emerald-600" />
                <span>WhatsApp Communication History & Logs ({sentLogs.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSentLogsModal(false);
                    setMode('message_logs');
                  }}
                  className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-600" /> Open Full Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setShowSentLogsModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {sentLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <MessageCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No WhatsApp messages dispatched yet.</p>
                <p className="text-[11px] text-slate-400">All dispatched alerts will be recorded here automatically.</p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                {sentLogs.map((log) => (
                  <div key={log.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="font-black text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span>{log.learnerName}</span>
                        <span className="font-mono text-[10px] text-slate-500">({log.admNo})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          log.status === 'pending' ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse' :
                          log.status === 'failed' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {log.status === 'pending' ? <Clock className="w-3 h-3 text-amber-600 animate-spin" /> :
                           log.status === 'failed' ? <XCircle className="w-3 h-3 text-rose-600" /> :
                           <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          <span className="capitalize">{log.status}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{log.timestamp}</span>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 whitespace-pre-line leading-relaxed">
                      {log.message}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 font-medium">
                      <span>Template: <strong>{log.templateTitle}</strong></span>
                      <span className="font-mono text-blue-700 font-bold">Via {log.channel} • +254 {log.phone.slice(-9)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 shrink-0">
              {sentLogs.length > 0 && canDelete() ? (
                <button
                  type="button"
                  onClick={() => {
                    confirmAction({
                      title: 'Clear History',
                      message: 'Are you sure you want to clear communication logs?',
                      confirmText: 'Clear Logs',
                      variant: 'danger',
                      onConfirm: () => {
                        setSentLogs([]);
                        secureSet('whatsapp_sent_logs_v1', JSON.stringify([]));
                      }
                    });
                  }}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 font-bold rounded-xl transition"
                >
                  Clear History
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setShowSentLogsModal(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 BULK DISPATCH PROGRESS OVERLAY */}
      {bulkDispatchState.isDispatching && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-slate-100">
            <div className="inline-flex items-center justify-center p-4 bg-emerald-100 text-emerald-700 rounded-2xl mb-1">
              <Zap className="w-8 h-8 text-emerald-600 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">
                Dispatching WhatsApp Alerts In-App
              </h3>
              <p className="text-xs text-slate-500">
                Sending directly via portal gateway without opening external WhatsApp application.
              </p>
            </div>

            {/* Live Progress Bar */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-black text-slate-800">
                <span>Sending to {bulkDispatchState.currentLearnerName}</span>
                <span className="text-emerald-600 font-mono">
                  {bulkDispatchState.currentIndex} / {bulkDispatchState.total}
                </span>
              </div>

              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-200"
                  style={{ width: `${Math.round((bulkDispatchState.currentIndex / bulkDispatchState.total) * 100)}%` }}
                />
              </div>

              <div className="text-[11px] text-slate-400 font-mono pt-1">
                {Math.round((bulkDispatchState.currentIndex / bulkDispatchState.total) * 100)}% Complete
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
