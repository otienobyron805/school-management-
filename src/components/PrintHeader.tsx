import React, { useEffect, useState } from 'react';
import { getSchoolProfile, SchoolProfile } from '../utils/db';

export function PrintHeader() {
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);

  useEffect(() => {
    setSchoolProfile(getSchoolProfile());
  }, []);

  return (
    <div className="hidden print:flex justify-between items-center pb-4 border-b border-slate-200 mb-6 w-full">
      <div className="text-left">
        <h1 className="text-lg font-black text-slate-900 uppercase tracking-wide">
          {schoolProfile?.name || 'School Report'}
        </h1>
        <p className="text-[10px] text-slate-500 font-mono">
          {schoolProfile?.address || schoolProfile?.location || 'Official Academic Portal'}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-mono text-slate-500">
          Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
