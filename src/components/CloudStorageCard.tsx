import React, { useEffect, useState } from 'react';
import { Database, ShieldCheck } from 'lucide-react';
import { getCurrentUser, getAllMemCacheData } from '../utils/db';

export default function CloudStorageCard() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => {
    const user = getCurrentUser();
    return user?.role === 'Super Admin' || user?.systemRole === 'super_admin';
  });

  const [storageMb, setStorageMb] = useState<string>('--');
  const [percent, setPercent] = useState<string>('0.0');
  const [barColor, setBarColor] = useState<string>('linear-gradient(90deg, #22c55e, #3b82f6)');
  const [textColor, setTextColor] = useState<string>('#64748b');

  const maxMB = 5000; // 5GB Free Tier

  const checkUser = () => {
    const user = getCurrentUser();
    setIsSuperAdmin(user?.role === 'Super Admin' || user?.systemRole === 'super_admin');
  };

  const calculateStorage = () => {
    checkUser();
    try {
      let totalBytes = 0;
      const data = getAllMemCacheData();
      for (const [key, val] of Object.entries(data)) {
        if (key && val) {
          totalBytes += new Blob([key + val]).size;
        }
      }

      const mb = (totalBytes / (1024 * 1024));
      // Display at least 0.05 MB if there is data
      const displayMb = mb > 0 ? (mb < 0.01 ? 0.01 : mb).toFixed(2) : '0.00';
      const pct = ((totalBytes / (maxMB * 1024 * 1024)) * 100).toFixed(1);

      setStorageMb(`${displayMb} MB`);
      setPercent(pct);

      const numPct = parseFloat(pct);
      if (numPct > 95) {
        setBarColor('#ef4444');
        setTextColor('#dc2626');
      } else if (numPct > 80) {
        setBarColor('#f59e0b');
        setTextColor('#ea580c');
      } else {
        setBarColor('linear-gradient(90deg, #22c55e, #3b82f6)');
        setTextColor('#64748b');
      }
    } catch (e) {
      setStorageMb('0.10 MB');
      setPercent('0.0');
    }
  };

  useEffect(() => {
    calculateStorage();
    window.addEventListener('storage', calculateStorage);
    return () => window.removeEventListener('storage', calculateStorage);
  }, []);

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="stat-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2.5 bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-2xl">
          <Database className="w-5 h-5 stat-icon" style={{ color: '#8b5cf6' }} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          5GB Free Tier
        </span>
      </div>

      <div className="stat-number text-2xl font-black text-slate-900 dark:text-white tracking-tight" id="storageUsed">
        {storageMb}
      </div>
      <p style={{ fontSize: '14px', color: '#64748b', margin: '8px 0' }} className="font-semibold text-slate-500">
        Cloud Storage
      </p>

      <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }} className="dark:bg-slate-800">
        <div
          id="storageBar"
          style={{
            height: '100%',
            width: `${Math.max(parseFloat(percent), 0.5)}%`,
            background: barColor,
            transition: '0.3s'
          }}
        />
      </div>

      <small
        id="storagePercent"
        style={{ display: 'block', marginTop: '6px', color: textColor, fontSize: '12px' }}
        className="font-medium"
      >
        {percent}% of {maxMB} MB Free
      </small>
    </div>
  );
}
