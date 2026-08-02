import React, { useEffect, useState } from 'react';
import { fetchAllFromFirestore } from '../utils/firebase';

export default function CloudSyncHealth() {
  const [status, setStatus] = useState<'checking' | 'synced' | 'error'>('checking');
  const [dataCount, setDataCount] = useState(0);

  useEffect(() => {
    fetchAllFromFirestore().then(data => {
        setDataCount(Object.keys(data).length);
        setStatus('synced');
    }).catch(() => setStatus('error'));
  }, []);

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold">Cloud Sync Health</h2>
      <p>Status: {status}</p>
      <p>Tables Synced: {dataCount}</p>
    </div>
  );
}
