import React, { useState, useEffect } from 'react';
import { Cloud, CloudCheck, CloudLightning, RefreshCw, CheckCircle2, ShieldCheck, ArrowUpRight } from 'lucide-react';

interface CloudAutoSyncHeaderBarProps {
  onOpenSyncHealth?: () => void;
}

export default function CloudAutoSyncHeaderBar({ onOpenSyncHealth }: CloudAutoSyncHeaderBarProps) {
  const [syncState, setSyncState] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [lastSavedTable, setLastSavedTable] = useState<string>('database');
  const [lastSavedTime, setLastSavedTime] = useState<Date>(new Date());
  const [timeAgoText, setTimeAgoText] = useState<string>('Just now');

  useEffect(() => {
    const handleStatusEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail) return;
      const { status, table, timestamp } = customEvent.detail;

      if (status === 'saving') {
        setSyncState('saving');
        if (table) setLastSavedTable(table);
      } else if (status === 'saved') {
        setSyncState('saved');
        if (table) setLastSavedTable(table);
        const now = timestamp ? new Date(timestamp) : new Date();
        setLastSavedTime(now);
        setTimeAgoText('Just now');
      } else if (status === 'error') {
        setSyncState('error');
      }
    };

    window.addEventListener('cloud_sync_status', handleStatusEvent);
    return () => window.removeEventListener('cloud_sync_status', handleStatusEvent);
  }, []);

  // Timer to update time ago text
  useEffect(() => {
    const interval = setInterval(() => {
      if (!lastSavedTime) return;
      const seconds = Math.floor((new Date().getTime() - lastSavedTime.getTime()) / 1000);
      if (seconds < 10) {
        setTimeAgoText('Just now');
      } else if (seconds < 60) {
        setTimeAgoText(`${seconds}s ago`);
      } else {
        const mins = Math.floor(seconds / 60);
        setTimeAgoText(`${mins}m ago`);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [lastSavedTime]);

  const formatTableName = (t: string) => {
    if (!t || t === 'database') return 'Cloud Database';
    return t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-1.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
        {/* Left Status Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30 text-emerald-300 font-bold text-[10px] uppercase tracking-wider shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Default DB: Cloud Firestore</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/60 shadow-2xs">
            {syncState === 'saving' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
                <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider">
                  Saving to Cloud...
                </span>
              </>
            ) : syncState === 'saved' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 stroke-[2.5]" />
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  Saved to Cloud <span className="text-emerald-300">✓</span>
                </span>
              </>
            ) : (
              <>
                <CloudLightning className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
                  Offline Mode (Cached)
                </span>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-slate-300 font-medium text-[11px] truncate">
            {syncState === 'saving' ? (
              <span>Saving <strong>{formatTableName(lastSavedTable)}</strong> to Cloud Database...</span>
            ) : (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 inline-block" />
                <span>Auto-saved in milliseconds to Cloud Firestore</span> • 
                <span className="text-slate-400 ml-1">Last synced {timeAgoText} ({formatTableName(lastSavedTable)})</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Info & Direct Jump */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Automatic Backups Enabled</span>
          </div>

          {onOpenSyncHealth && (
            <button
              onClick={onOpenSyncHealth}
              className="px-2.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md text-[11px] font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <Cloud className="w-3 h-3 text-blue-400" />
              <span>Cloud Health</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
