import React from 'react';
import { AlertCircle } from 'lucide-react';

interface SystemHealthProps {
  learnerCount: number;
  staffCount: number;
}

export default function SystemHealth({ learnerCount, staffCount }: SystemHealthProps) {
  const isHealthy = learnerCount > 0 && staffCount > 0;

  return (
    <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 space-y-2">
      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Health</h3>
      
      {!isHealthy && (
        <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 p-2 rounded-md border border-rose-500/20 text-xs font-bold mb-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Data Alert: Zero records</span>
        </div>
      )}
      
      <div className="text-[11px] font-bold text-slate-300 grid grid-cols-2 gap-2">
        <div className={learnerCount === 0 ? "text-rose-400" : "text-slate-400"}>
          Students: <span className="text-white">{learnerCount}</span>
        </div>
        <div className={staffCount === 0 ? "text-rose-400" : "text-slate-400"}>
          Staff: <span className="text-white">{staffCount}</span>
        </div>
      </div>
    </div>
  );
}
