import React, { useState } from 'react';
import { Sparkles, RefreshCw, X, ShieldCheck, Database, Wallet, Check } from 'lucide-react';

interface UpdateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function UpdateNotificationModal({ isOpen, onClose, onRefresh }: UpdateNotificationModalProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const isSharedUrl = typeof window !== 'undefined' && window.location.href.includes('ais-pre-');
  const isDevUrl = typeof window !== 'undefined' && window.location.href.includes('ais-dev-');

  const handleApplyRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-100 relative overflow-hidden">
        {/* Top Decorative Banner */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-lg">System Update Available</h3>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  v2.4.0
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                New enhancements and database updates are ready to apply.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Environment Badge */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-bold">Active Environment:</span>
            <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
              isSharedUrl 
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : isDevUrl 
                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {isSharedUrl ? 'Shared Live URL (ais-pre)' : isDevUrl ? 'Development URL (ais-dev)' : 'Production Workspace'}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {isSharedUrl 
              ? 'You are viewing the Shared Live Link. All changes made in development auto-sync here.' 
              : 'Development environment connected and actively deployed.'}
          </p>
        </div>

        {/* Features / Changes List */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">What's New In This Update</h4>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-start gap-2.5">
              <Database className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">MongoDB Cluster Syncing</span>
                <span className="text-slate-600 text-[11px]">Seamless connection & collection sync with live MongoDB database.</span>
              </div>
            </div>

            <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl flex items-start gap-2.5">
              <Wallet className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Finance & Custom Fee Structures</span>
                <span className="text-slate-600 text-[11px]">Create custom grade fee structures, record payments, and print instant receipts.</span>
              </div>
            </div>

            <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Enhanced Parent & Staff Portals</span>
                <span className="text-slate-600 text-[11px]">Instant academic reporting, WhatsApp alerts, and role-based access control.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isRefreshing}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer text-center disabled:opacity-50"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={handleApplyRefresh}
            disabled={isRefreshing}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer disabled:opacity-80"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Refreshing System...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Apply & Refresh System</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
