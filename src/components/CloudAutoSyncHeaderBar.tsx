import React, { useState, useEffect } from 'react';
import { Cloud, RefreshCw, CheckCircle2, Clock, UploadCloud } from 'lucide-react';
import { 
  synchronizeWithMongoDB, 
  pushPendingChangesToCloud,
  secureGet, 
  secureSet, 
  getPendingChangesCount, 
  getPendingChangesTables,
  getLastSyncTime 
} from '../utils/db';

export default function CloudAutoSyncHeaderBar({ onOpenSyncHealth }: { onOpenSyncHealth: () => void }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  
  const [pendingCount, setPendingCount] = useState<number>(() => getPendingChangesCount());
  const [pendingTables, setPendingTables] = useState<string[]>(() => getPendingChangesTables());

  const getFormattedLastSync = (): string => {
    const rawIso = getLastSyncTime() || secureGet('school_last_sync_time');
    if (rawIso) {
      try {
        const d = new Date(rawIso);
        if (!isNaN(d.getTime())) {
          const now = new Date();
          const isToday = d.toDateString() === now.toDateString();
          const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return isToday ? `Today at ${timeStr}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
        }
      } catch (e) {}
    }
    const simpleTime = secureGet('last_cloud_sync_time');
    return simpleTime ? `Today at ${simpleTime}` : 'Never';
  };

  const [lastSyncDisplay, setLastSyncDisplay] = useState<string>(getFormattedLastSync);

  const updateLastSync = () => {
    const nowIso = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    secureSet('school_last_sync_time', nowIso, { skipCloud: true });
    secureSet('last_cloud_sync_time', timeStr, { skipCloud: true });
    setLastSyncDisplay(getFormattedLastSync());
  };

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncDone(false);

    let success = false;
    if (pendingCount > 0) {
      // Execute instantaneous bulk push for pending changes
      success = await pushPendingChangesToCloud();
    }
    // Also perform full sync update
    const syncResult = await synchronizeWithMongoDB();
    success = success || syncResult;

    setIsSyncing(false);
    if (success) {
      setSyncDone(true);
      updateLastSync();
      setPendingCount(getPendingChangesCount());
      setPendingTables(getPendingChangesTables());
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
      } else if (e.detail?.status === 'idle' || e.detail?.status === 'synced') {
        setIsSyncing(false);
        setSyncDone(true);
        updateLastSync();
        setPendingCount(getPendingChangesCount());
        setPendingTables(getPendingChangesTables());
        setTimeout(() => {
          setSyncDone(false);
        }, 3000);
      }
    };

    const handlePendingChanges = (e: CustomEvent) => {
      setPendingCount(e.detail?.pendingCount ?? getPendingChangesCount());
      setPendingTables(e.detail?.pendingTables ?? getPendingChangesTables());
    };

    const handleDbUpdated = () => {
      setLastSyncDisplay(getFormattedLastSync());
      setPendingCount(getPendingChangesCount());
      setPendingTables(getPendingChangesTables());
    };

    window.addEventListener('cloud_sync_status', handleSyncStatus as EventListener);
    window.addEventListener('pending_changes_updated', handlePendingChanges as EventListener);
    window.addEventListener('db_updated', handleDbUpdated);
    window.addEventListener('storage', handleDbUpdated);

    return () => {
      window.removeEventListener('cloud_sync_status', handleSyncStatus as EventListener);
      window.removeEventListener('pending_changes_updated', handlePendingChanges as EventListener);
      window.removeEventListener('db_updated', handleDbUpdated);
      window.removeEventListener('storage', handleDbUpdated);
    };
  }, []);

  return (
    <div className="bg-slate-900 px-4 py-1.5 flex items-center justify-between z-30 shadow-sm relative overflow-hidden border-b border-slate-800">
      {/* Background ambient glow effect */}
      <div className={`absolute inset-0 blur-xl animate-pulse pointer-events-none ${
        pendingCount > 0 ? 'bg-amber-500/10' : 'bg-blue-500/15'
      }`}></div>
      
      <div className="flex items-center gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            {isSyncing ? (
              <div className="absolute w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping"></div>
            ) : pendingCount > 0 ? (
              <div className="absolute w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></div>
            ) : (
              <div className={`absolute w-2.5 h-2.5 rounded-full animate-ping ${syncDone ? 'bg-emerald-400' : 'bg-emerald-500'}`}></div>
            )}
            <div className={`relative w-2.5 h-2.5 rounded-full ${
              isSyncing 
                ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' 
                : pendingCount > 0
                ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                : syncDone 
                ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]' 
                : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
            }`}></div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">
            Live Cloud Database
          </span>
        </div>

        {/* Pending Push Visual Indicator */}
        {pendingCount > 0 ? (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse"
            title={`Local changes pending server push: ${pendingTables.join(', ')}`}
          >
            <UploadCloud className="w-3 h-3 text-amber-400" />
            <span>{pendingCount} Pending Push{pendingCount > 1 ? 'es' : ''}</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>All Changes Synced</span>
          </div>
        )}

        {/* Last Successful Sync Timestamp */}
        <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-slate-400 border-l border-slate-700/80 pl-3">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="font-medium text-slate-400">Last Successful Sync:</span>
          <span className="font-bold text-emerald-400 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700/60 shadow-inner">
            {lastSyncDisplay}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <div className="flex lg:hidden items-center gap-1 text-[9px] text-slate-400">
          <Clock className="w-2.5 h-2.5 text-slate-400" />
          <span className="text-emerald-400 font-bold">{lastSyncDisplay}</span>
        </div>

        <button 
          onClick={handleManualSync}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_12px_rgba(59,130,246,0.5)] border ${
            isSyncing 
              ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.8)]' 
              : pendingCount > 0
              ? 'bg-amber-600 border-amber-500 text-white shadow-[0_0_18px_rgba(245,158,11,0.7)] hover:bg-amber-500'
              : syncDone
              ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.8)]'
              : 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-700 hover:text-blue-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]'
          }`}
        >
          {syncDone ? (
            <CheckCircle2 className="w-3 h-3 text-white" />
          ) : pendingCount > 0 ? (
            <UploadCloud className={`w-3 h-3 ${isSyncing ? 'animate-bounce' : ''}`} />
          ) : (
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          )}
          <span>
            {isSyncing 
              ? 'Syncing...' 
              : pendingCount > 0 
              ? `Push (${pendingCount})` 
              : syncDone 
              ? 'Synced' 
              : 'Sync Now'}
          </span>
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
