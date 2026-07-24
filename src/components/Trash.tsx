import React from 'react';

export default function Trash({ setActiveView }: { setActiveView: (view: string) => void }) {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* BACK BUTTON */}
      <button 
        onClick={() => setActiveView('All Exams')}
        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-blue-600 font-semibold text-sm hover:bg-blue-50 transition flex items-center gap-2"
      >
        ← Back to Exams
      </button>

      {/* TRASH CARD */}
      <div className="bg-white rounded-2xl border border-red-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-red-50 border-b border-red-200">
          <h4 className="font-bold text-red-700">🗑️ Trashed Exams</h4>
          <p className="text-xs text-slate-500 mt-1">Admins and Deputy can restore exams. Only School Admin can permanently delete.</p>
        </div>

        <div className="p-12 text-center text-slate-400">
          <div className="text-6xl mb-4 opacity-30">🗑️</div>
          <h4 className="text-sm font-semibold text-slate-700 mb-1">Trash Bin is empty</h4>
          <p className="text-xs">Deleted exams appear here and can be restored.</p>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="p-4 bg-white rounded-xl border border-slate-200">
        <h5 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">ℹ️ How it works:</h5>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span className="text-lg">👤</span>
            <span>School Admin, Deputy, Director of Studies can create exams and move them to trash.</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span className="text-lg">♻️</span>
            <span>School Admin, Deputy, Director of Studies can restore exams from trash.</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span className="text-lg">🛑</span>
            <span>School Admin only can permanently delete (irreversible — all marks lost).</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-500">
            <span className="text-lg">🚫</span>
            <span>Teachers cannot create or delete exams.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
