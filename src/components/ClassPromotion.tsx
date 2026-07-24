import React, { useState, useEffect } from 'react';
import { getGrades, getLearners, Grade, Learner } from '../utils/db';

const ClassPromotion: React.FC = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);

  useEffect(() => {
    setGrades(getGrades());
    setLearners(getLearners());
  }, []);

  const selectStream = (gradeName: string, streamName: string) => {
    alert(`✅ Selected Stream: ${gradeName} ${streamName}\n\nYou are about to promote all eligible learners in this stream.`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-800 text-white">
        <h2 className="text-lg font-bold flex items-center gap-2">
          Class Promotion
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 sm:p-6 bg-slate-50">
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-100">
            <h4 className="font-bold text-sm text-slate-800 mb-2">Select a Stream to Promote</h4>
            <p className="text-xs text-slate-500 mb-4">Process all eligible learners in one stream</p>
            <button className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-800 text-white font-bold text-sm hover:opacity-90 transition active:scale-95 cursor-pointer">
              View All Alumni
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {grades.length === 0 ? (
              <div className="text-center p-6 bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
                No grades/streams configured.
              </div>
            ) : (
              grades.map(grade => (
                <div key={grade.id}>
                  <h5 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">{grade.name}</h5>
                  <div className="flex flex-col gap-2">
                    {grade.streams.map(stream => {
                      const count = learners.filter(l => l.gradeLabel === grade.name && l.stream === stream.name).length;
                      return (
                        <div 
                          key={stream.id}
                          className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:border-blue-300 transition active:scale-[0.98] active:shadow-inner" 
                          onClick={() => selectStream(grade.name, stream.name)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold">{stream.name.charAt(0)}</div>
                            <div>
                              <div className="font-semibold text-slate-800">{stream.name}</div>
                              <div className="text-xs text-slate-500">{count} active learners</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-100 h-full">
            <h4 className="font-bold text-sm text-slate-800 mb-5">Recent Promotions</h4>
            <div className="text-center py-10">
              <p className="text-sm text-slate-500">No promotions have been recorded yet.</p>
              <button className="mt-5 w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 bg-white text-blue-600 font-bold text-sm hover:bg-slate-50 transition active:scale-95 cursor-pointer">
                Run a Promotion
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassPromotion;
