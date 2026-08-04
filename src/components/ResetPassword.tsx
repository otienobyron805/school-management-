import React, { useState } from 'react';
import { getCurrentUser, setCurrentUser, getUsers, saveUsers, UserAccount } from '../utils/db';
import { KeyRound, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ResetPassword() {
  const [user, setUser] = useState<UserAccount | null>(getCurrentUser());
  const [identifier, setIdentifier] = useState(user?.username || user?.fullName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match or are empty.' });
      return;
    }

    if (user) {
      // Logged in user changing their password
      const updatedUser = { ...user, password: newPassword };
      setCurrentUser(updatedUser);
      setUser(updatedUser);

      const allUsers = getUsers();
      const updatedUsers = allUsers.map(u => u.id === user.id ? updatedUser : u);
      saveUsers(updatedUsers);

      setMessage({ type: 'success', text: 'Password/PIN updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setMessage({ type: 'error', text: 'Please log in to reset password or use staff management.' });
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 mt-10">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 shadow-inner">
          <KeyRound className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Reset Password</h2>
        <p className="text-xs text-slate-500 font-medium">Update your account login credentials securely.</p>
      </div>

      <form onSubmit={handleReset} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">Account Username / Name</label>
          <input
            type="text"
            value={identifier}
            disabled
            className="w-full p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold text-sm cursor-not-allowed"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">New Password / PIN</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            placeholder="Enter new password or 4-digit PIN"
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">Confirm New Password / PIN</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm new password"
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />}
            <span>{message.text}</span>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-wider p-4 rounded-2xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
        >
          Update Password Now
        </button>
      </form>
    </div>
  );
}
