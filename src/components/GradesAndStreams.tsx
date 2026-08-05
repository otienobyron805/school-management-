import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, BarChart, Save, CheckCircle2, RefreshCw } from 'lucide-react';
import { getGrades, saveGrades, Grade, Stream } from '../utils/db';
import { canDelete } from '../utils/permissions';
import { confirmAction } from './ConfirmDialog';

export default function GradesAndStreams() {
  const [grades, setGrades] = useState<Grade[]>(() => getGrades());
  const [syncStatus, setSyncStatus] = useState<'saved' | 'syncing'>('saved');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGradeName, setNewGradeName] = useState('');
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [newStreamName, setNewStreamName] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editContext, setEditContext] = useState<{type: 'grade' | 'stream', gradeId: string, streamId?: string} | null>(null);

  // Sync / storage listeners
  useEffect(() => {
    const refreshGrades = () => {
      setGrades(getGrades());
    };
    window.addEventListener('storage', refreshGrades);
    window.addEventListener('db_updated', refreshGrades);
    return () => {
      window.removeEventListener('storage', refreshGrades);
      window.removeEventListener('db_updated', refreshGrades);
    };
  }, []);

  const triggerSave = (nextGrades: Grade[]) => {
    setSyncStatus('syncing');
    setGrades(nextGrades);
    saveGrades(nextGrades);
    setTimeout(() => {
      setSyncStatus('saved');
    }, 600);
  };

  const addGrade = () => {
    setIsModalOpen(true);
  };

  const saveGrade = () => {
    if (newGradeName.trim()) {
      const nextGrades = [...grades, { id: 'g' + Date.now(), name: newGradeName.trim(), streams: [] }];
      triggerSave(nextGrades);
      setNewGradeName('');
      setIsModalOpen(false);
    }
  };

  const openEditGrade = (grade: Grade) => {
    setEditContext({ type: 'grade', gradeId: grade.id });
    setEditValue(grade.name);
    setIsEditModalOpen(true);
  };

  const openEditStream = (gradeId: string, stream: Stream) => {
    setEditContext({ type: 'stream', gradeId, streamId: stream.id });
    setEditValue(stream.name);
    setIsEditModalOpen(true);
  };

  const saveEdit = () => {
    if (editValue.trim() && editContext) {
      let nextGrades: Grade[];
      if (editContext.type === 'grade') {
        nextGrades = grades.map(g => g.id === editContext.gradeId ? { ...g, name: editValue.trim() } : g);
      } else {
        nextGrades = grades.map(g => g.id === editContext.gradeId ? { ...g, streams: g.streams.map(s => s.id === editContext.streamId ? { ...s, name: editValue.trim() } : s) } : g);
      }
      triggerSave(nextGrades);
      setIsEditModalOpen(false);
      setEditContext(null);
      setEditValue('');
    }
  };

  const deleteGrade = (id: string, name?: string) => {
    if (!canDelete()) {
      confirmAction({
        title: 'Permission Restricted',
        message: 'Only Super Admin can delete grades in this software.',
        confirmText: 'OK',
        variant: 'warning',
        onConfirm: () => {}
      });
      return;
    }
    confirmAction({
      title: 'Delete Grade Level',
      message: `Are you sure you want to delete ${name || 'this grade'} and all its associated streams?`,
      confirmText: 'Delete Grade',
      variant: 'danger',
      onConfirm: () => {
        const nextGrades = grades.filter(g => g.id !== id);
        triggerSave(nextGrades);
      }
    });
  };

  const addStream = (gradeId: string) => {
    setSelectedGradeId(gradeId);
    setIsStreamModalOpen(true);
  };

  const saveStream = () => {
    if (newStreamName.trim() && selectedGradeId) {
      const nextGrades = grades.map(g => g.id === selectedGradeId ? { ...g, streams: [...g.streams, { id: 's' + Date.now(), name: newStreamName.trim() }] } : g);
      triggerSave(nextGrades);
      setNewStreamName('');
      setIsStreamModalOpen(false);
      setSelectedGradeId(null);
    }
  };

  const deleteStream = (gradeId: string, streamId: string, streamName?: string) => {
    if (!canDelete()) {
      confirmAction({
        title: 'Permission Restricted',
        message: 'Only Super Admin can delete streams.',
        confirmText: 'OK',
        variant: 'warning',
        onConfirm: () => {}
      });
      return;
    }
    confirmAction({
      title: 'Delete Stream',
      message: `Are you sure you want to delete stream "${streamName || 'selected stream'}"?`,
      confirmText: 'Delete Stream',
      variant: 'danger',
      onConfirm: () => {
        const nextGrades = grades.map(g => g.id === gradeId ? { ...g, streams: g.streams.filter(s => s.id !== streamId) } : g);
        triggerSave(nextGrades);
      }
    });
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">Grades & Streams</h1>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            syncStatus === 'syncing' 
              ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm' 
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {syncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Saved</span>
              </>
            )}
          </div>
        </div>
        <button 
          onClick={addGrade}
          className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" /> Add Grade
        </button>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Edit {editContext?.type === 'grade' ? 'Grade' : 'Stream'}</h2>
            <input 
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={`Enter ${editContext?.type} name`}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
                <button onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100">Cancel</button>
                <button onClick={saveEdit} className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Save</button>
            </div>
          </div>
        </div>
      )}
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Add New Grade</h2>
            <input 
              type="text"
              value={newGradeName}
              onChange={(e) => setNewGradeName(e.target.value)}
              placeholder="Enter grade name"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100">Cancel</button>
                <button onClick={saveGrade} className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add</button>
            </div>
          </div>
        </div>
      )}

      {isStreamModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Add New Stream</h2>
            <input 
              type="text"
              value={newStreamName}
              onChange={(e) => setNewStreamName(e.target.value)}
              placeholder="Enter stream name"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
                <button onClick={() => setIsStreamModalOpen(false)} className="flex-1 px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100">Cancel</button>
                <button onClick={saveStream} className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add</button>
            </div>
          </div>
        </div>
      )}

      {grades.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border-2 border-dashed border-slate-200 shadow-sm">
          <span className="text-5xl mb-4 block opacity-70">📚</span>
          <p className="text-slate-500 font-medium text-lg">No grades configured yet.</p>
          <p className="text-slate-400">Click "Add Grade" to create your first class level.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grades.map(grade => (
            <div key={grade.id} className="bg-white rounded-2xl p-7 shadow-sm border border-slate-200 transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{grade.name}</h3>
                  <p className="text-sm text-slate-500">{grade.streams.length} stream(s) configured</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditGrade(grade)} className="p-3 text-amber-600 bg-amber-50 rounded-xl hover:bg-amber-100 hover:scale-105 transition-all"><Edit2 className="w-5 h-5 pointer-events-none" /></button>
                  {canDelete() && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGrade(grade.id, grade.name);
                      }} 
                      className="p-3 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 hover:text-red-700 active:scale-95 transition-all cursor-pointer"
                      title="Delete Grade"
                    >
                      <Trash2 className="w-5 h-5 pointer-events-none" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 mb-6">
                {grade.streams.map(stream => (
                  <div key={stream.id} className="flex items-center gap-3 bg-blue-50/50 text-blue-700 px-4 py-3 rounded-xl text-sm font-medium border border-blue-100">
                    {stream.name}
                    <div className="flex gap-1 ml-2">
                        <button className="p-1 hover:bg-blue-100 rounded text-blue-600"><BarChart className="w-4 h-4" /></button>
                        <button onClick={() => openEditStream(grade.id, stream)} className="p-1 hover:bg-blue-100 rounded"><Edit2 className="w-3 h-3 pointer-events-none" /></button>
                        {canDelete() && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteStream(grade.id, stream.id, stream.name);
                              }} 
                              className="p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 active:scale-90 transition-all cursor-pointer"
                              title="Delete Stream"
                            >
                              <Trash2 className="w-3 h-3 pointer-events-none" />
                            </button>
                        )}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => addStream(grade.id)}
                className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-emerald-100 transition-all"
              >
                  <Plus className="w-4 h-4" /> Add New Stream
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
