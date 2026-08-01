import React, { useState } from 'react';
import { getCurrentUser, setCurrentUser, getUsers, saveUsers, UserAccount } from '../utils/db';
import { Lock, User, CheckCircle, AlertTriangle } from 'lucide-react';

export default function MyProfile() {
  const [user, setUser] = useState<UserAccount | null>(getCurrentUser());
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (user.password && oldPin !== user.password) {
      setMessage({type: 'error', text: 'Incorrect current PIN'});
      return;
    }
    
    if (newPin !== confirmPin) {
      setMessage({type: 'error', text: 'New PINs do not match'});
      return;
    }
    
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setMessage({type: 'error', text: 'PIN must be 4 digits'});
      return;
    }
    
    // Update user
    const updatedUser = { ...user, password: newPin };
    setCurrentUser(updatedUser);
    setUser(updatedUser);
    
    const allUsers = getUsers();
    const updatedUsers = allUsers.map(u => u.id === user.id ? updatedUser : u);
    saveUsers(updatedUsers);
    
    setMessage({type: 'success', text: 'PIN changed successfully'});
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
  };

  if (!user) return null;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-md">
          {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900">{user.fullName}</h2>
          <div className="text-sm text-slate-500 font-bold uppercase tracking-wide">{user.role}</div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" /> Change Access PIN
        </h3>
        
        {/* Old PIN field */}
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current PIN</label>
            <input type="password" value={oldPin} onChange={e => setOldPin(e.target.value)} required className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-100 focus:outline-none" maxLength={4} placeholder="••••" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New PIN (4 digits)</label>
          <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} required className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-100 focus:outline-none" maxLength={4} placeholder="••••" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm New PIN</label>
          <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} required className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-100 focus:outline-none" maxLength={4} placeholder="••••" />
        </div>
        
        {message && (
          <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
            {message.text}
          </div>
        )}
        
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-bold transition-all shadow-md shadow-blue-500/20">Update PIN</button>
      </form>
    </div>
  );
}
