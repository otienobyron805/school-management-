import React, { useState, useEffect } from 'react';
import { getActivityLogs } from '../utils/db';
import { ActivityEvent } from '../types';
import { Clock } from 'lucide-react';

export default function ActivityFeed() {
  const [logs, setLogs] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    setLogs(getActivityLogs());
    const handleStorageChange = () => setLogs(getActivityLogs());
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h3>
      {logs.length === 0 ? (
        <p className="text-sm text-slate-500">No recent activity.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 text-sm">
              <div className="mt-0.5 p-1.5 rounded-full bg-blue-50 text-blue-600">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-slate-800 font-medium">{log.message}</p>
                <p className="text-xs text-slate-500">
                  {new Date(log.timestamp).toLocaleString()} by {log.user}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
