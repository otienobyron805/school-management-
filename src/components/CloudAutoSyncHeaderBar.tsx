import React, { useState, useEffect } from 'react';
import { Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';
import { synchronizeWithMongoDB } from '../utils/db';

export default function CloudAutoSyncHeaderBar({ onOpenSyncHealth }: { onOpenSyncHealth: () => void }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('last_cloud_sync_time') || 'Never';
  });

  const updateLastSync = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSyncTime(timeStr);
    localStorage.setItem('last_cloud_sync_time', timeStr);
  };

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncDone(false);
    const success = await synchronizeWithMongoDB();
    setIsSyncing(false);
    if (success) {
      setSyncDone(true);
      updateLastSync();
    }
    setTimeout(() => {
      setSyncDone(false);
    }, 3000);
  };

  useEffect(() => {
    const handleSyncStatus = (e: CustomEvent) => {
       if (e.detail?.status === 'syncing') {
         setIsSyncing(true);
         setSyncDone(false);
       } else if (e.detail?.status === 'idle') {
         setIsSyncing(false);
         setSyncDone(true);
         updateLastSync();
         setTimeout(() => {
           setSyncDone(false);
         }, 3000);
       }
    };
    window.addEventListener('cloud_sync_status', handleSyncStatus as EventListener);
    return () => window.removeEventListener('cloud_sync_status', handleSyncStatus as EventListener);
  }, []);

  return (
    <div className="bg-slate-900 px-4 py-1.5 flex items-center justify-between z-30 shadow-sm relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-blue-500/15 blur-xl animate-pulse pointer-events-none"></div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            {isSyncing ? (
              <div className="absolute w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping"></div>
            ) : (
              <div className={`absolute w-2.5 h-2.5 rounded-full animate-ping ${syncDone ? 'bg-emerald-400' : 'bg-emerald-500'}`}></div>
            )}
            <div className={`relative w-2.5 h-2.5 rounded-full ${
              isSyncing 
                ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' 
                : syncDone 
                ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]' 
                : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
            }`}></div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-200 relative z-10">
            Live Cloud Database
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-400 border-l border-slate-700/80 pl-3 relative z-10">
          <span className="font-medium text-slate-400">Last Sync:</span>
          <span className="font-bold text-emerald-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">{lastSyncTime}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <div className="flex md:hidden items-center text-[9px] text-slate-400">
          <span className="text-emerald-400 font-bold">{lastSyncTime}</span>
        </div>

        <button 
          onClick={handleManualSync}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_12px_rgba(59,130,246,0.5)] border ${
            isSyncing 
              ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.8)]' 
              : syncDone
              ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.8)]'
              : 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-700 hover:text-blue-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]'
          }`}
        >
          {syncDone ? (
            <CheckCircle2 className="w-3 h-3 text-white" />
          ) : (
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          )}
          <span>{isSyncing ? 'Syncing...' : syncDone ? 'Synced' : 'Sync Now'}</span>
        </button>

        <button 
          onClick={onOpenSyncHealth}
          className="text-slate-400 hover:text-white transition flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
          title="View Sync Health"
        >
          <Cloud className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Health</span>
        </button>
      </div>
    </div>
  );
}
