import React, { useState, useEffect } from 'react';
import { Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';
import { synchronizeWithCloudSQL } from '../utils/db';

export default function CloudAutoSyncHeaderBar({ onOpenSyncHealth }: { onOpenSyncHealth: () => void }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncDone(false);
    await synchronizeWithCloudSQL();
    setIsSyncing(false);
    setSyncDone(true);
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
      <div className="absolute inset-0 bg-blue-500/10 blur-xl animate-pulse pointer-events-none"></div>
      
      <div className="flex items-center gap-2">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
          <div className="relative w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 relative z-10">
          Live Cloud Database
        </span>
      </div>

      <div className="flex items-center gap-3 relative z-10">
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
          <span>{isSyncing ? 'Syncing...' : syncDone ? 'Synced Done' : 'Sync Now'}</span>
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
