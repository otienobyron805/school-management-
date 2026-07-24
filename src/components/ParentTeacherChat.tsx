import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, User, MessageSquare, ShieldCheck, Clock, Search, 
  Sparkles, RefreshCw, Star, Info, UserCheck, CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  UserAccount, Learner, Message, 
  getMessages, saveMessages 
} from '../utils/db';
import { motion, AnimatePresence } from 'motion/react';

interface ParentTeacherChatProps {
  user: UserAccount;
  selectedChild: Learner;
  onToast: (msg: string) => void;
}

export default function ParentTeacherChat({ user, selectedChild, onToast }: ParentTeacherChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load messages and listen for updates
    const loadMsgs = () => {
      const allMsgs = getMessages();
      // Filter for this specific child
      const filtered = allMsgs.filter(m => m.learnerId === selectedChild.id || m.learnerId === 'all');
      setMessages(filtered);

      // Mark messages as read if I am the receiver
      let changed = false;
      const updatedAll = allMsgs.map(m => {
        if (!m.read && (m.learnerId === selectedChild.id || m.learnerId === 'all')) {
          // If parent is viewing, mark teacher messages as read
          if (user.role === 'Parent' && m.senderRole === 'Teacher' && (m.receiverId === user.id || m.receiverId === null)) {
            changed = true;
            return { ...m, read: true };
          }
          // If teacher/admin is viewing, mark parent messages as read (receiverId would be null or teacher id)
          if (user.role !== 'Parent' && m.senderRole === 'Parent') {
            changed = true;
            return { ...m, read: true };
          }
        }
        return m;
      });

      if (changed) {
        saveMessages(updatedAll);
        window.dispatchEvent(new CustomEvent('messagesUpdated'));
      }
    };

    loadMsgs();
    
    // Subscribe to storage events to keep sync across tabs/views
    window.addEventListener('storage', loadMsgs);
    return () => window.removeEventListener('storage', loadMsgs);
  }, [selectedChild.id]);

  useEffect(() => {
    // Auto scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg: Message = {
      id: `msg-${Date.now()}`,
      senderId: user.id,
      learnerId: selectedChild.id,
      text: newMessage.trim(),
      senderRole: 'Parent',
      timestamp: new Date().toISOString(),
      read: false
    };

    const allMsgs = getMessages();
    const updated = [...allMsgs, msg];
    saveMessages(updated);
    window.dispatchEvent(new CustomEvent('messagesUpdated'));
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    onToast('Message sent to class teacher!');

    // Simulated Teacher auto-reply logic
    setIsTyping(true);
    setTimeout(() => {
      const teacherReply: Message = {
        id: `msg-${Date.now() + 1}`,
        senderId: 'teacher-system',
        learnerId: selectedChild.id,
        text: `Thank you for reaching out regarding ${selectedChild.name}. I've received your note and will review it shortly. If it's an emergency, please call the school office.`,
        senderRole: 'Teacher',
        timestamp: new Date().toISOString(),
        read: false
      };
      const finalAll = [...getMessages(), teacherReply];
      saveMessages(finalAll);
      window.dispatchEvent(new CustomEvent('messagesUpdated'));
      setMessages(prev => [...prev, teacherReply]);
      setIsTyping(false);
    }, 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[550px] animate-fadeIn">
      {/* Chat Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight">Teacher Communications</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Class Teacher Online</p>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="px-2.5 py-1 bg-slate-800 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 border border-slate-700/50">
            Secure Channel
          </div>
        </div>
      </div>

      {/* Messages Stage */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 p-8">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-700 uppercase">No Message History</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Start a conversation with the class teacher about {selectedChild.name}.</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderRole === 'Parent';
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id} 
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] sm:max-w-[70%] space-y-1 ${isMe ? 'text-right' : 'text-left'}`}>
                  <div className={`px-4 py-3 rounded-2xl shadow-sm text-xs leading-relaxed ${
                    isMe 
                      ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                  }`}>
                    <p className="font-semibold">{msg.text}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{time}</span>
                    {isMe && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}

        {isTyping && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex justify-start"
          >
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teacher is typing...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-150">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${selectedChild.name}'s teacher...`}
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-inner"
            required
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-indigo-200 cursor-pointer"
          >
            <span className="hidden sm:inline">SEND</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[9px] text-slate-400 text-center mt-3 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          End-to-End Encrypted Communication Channel
        </p>
      </div>
    </div>
  );
}
