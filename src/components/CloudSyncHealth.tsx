import React, { useEffect, useState } from 'react';
import { 
  Database, 
  ShieldCheck, 
  RefreshCw, 
  Trash2, 
  RotateCcw, 
  PlusCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  User, 
  FileText, 
  Cloud,
  Lock
} from 'lucide-react';
import { 
  getCloudSnapshots, 
  triggerManualCloudSnapshot, 
  deleteCloudSnapshot, 
  restoreCloudSnapshot, 
  CloudSnapshotMeta,
  getCurrentUser
} from '../utils/db';
import { canDelete } from '../utils/permissions';

export default function CloudSyncHealth() {
  const [snapshots, setSnapshots] = useState<CloudSnapshotMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Headteacher' || currentUser?.systemRole === 'super_admin';

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const list = await getCloudSnapshots();
      setSnapshots(list);
    } catch (err) {
      console.error('Failed to load snapshots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setFeedback({ type: 'error', message: 'Only Administrators can create cloud snapshots.' });
      return;
    }

    setCreating(true);
    setFeedback(null);
    try {
      const res = await triggerManualCloudSnapshot(noteInput.trim());
      if (res.success) {
        setFeedback({ type: 'success', message: 'Cloud snapshot archive created successfully!' });
        setNoteInput('');
        await loadSnapshots();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to create snapshot.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'An error occurred.' });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (snap: CloudSnapshotMeta) => {
    if (!isSuperAdmin) {
      setFeedback({ type: 'error', message: 'Only Administrators can restore snapshots.' });
      return;
    }

    const confirmRestore = window.confirm(
      `⚠️ WARNING: You are about to restore the system state from snapshot archive [${snap.id}] dated ${snap.formattedDate}.\n\nThis will overwrite current local records with the snapshot data. Continue?`
    );

    if (!confirmRestore) return;

    setRestoringId(snap.id);
    setFeedback(null);
    try {
      const ok = await restoreCloudSnapshot(snap);
      if (ok) {
        setFeedback({ type: 'success', message: `Successfully restored database from snapshot ${snap.id}! Reloading app...` });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setFeedback({ type: 'error', message: 'Failed to restore snapshot data.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error during restore.' });
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isSuperAdmin) {
      setFeedback({ type: 'error', message: 'Only Administrators can delete snapshots.' });
      return;
    }

    if (!window.confirm('Are you sure you want to delete this cloud snapshot archive?')) return;

    try {
      const ok = await deleteCloudSnapshot(id);
      if (ok) {
        setSnapshots(prev => prev.filter(s => s.id !== id));
        setFeedback({ type: 'success', message: 'Snapshot deleted successfully.' });
      } else {
        setFeedback({ type: 'error', message: 'Failed to delete snapshot from cloud.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error deleting snapshot.' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-blue-500/10 blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                <Cloud className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-black tracking-tight">Cloud Sync Health & Backup Archives</h1>
            </div>
            <p className="text-xs text-slate-300 max-w-xl">
              Monitor cloud synchronization status, trigger immediate backup snapshots of your school database to Firestore, and instantly restore previous versions if sync errors occur.
            </p>
          </div>
          <button 
            onClick={loadSnapshots}
            disabled={loading}
            className="self-start md:self-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Archives</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 border ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
            : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Create Snapshot Card */}
      {isSuperAdmin && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>Create Immediate Cloud Snapshot Archive</span>
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
              Admin Exclusive
            </span>
          </div>

          <form onSubmit={handleCreateSnapshot} className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              placeholder="Optional archive note (e.g. End of Term 1, Before promotion...)" 
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit"
              disabled={creating}
              className="px-6 py-2.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md active:scale-95 disabled:opacity-50"
            >
              {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              <span>{creating ? 'Archiving...' : 'Take Snapshot Now'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Snapshots List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Cloud Backup Archive History ({snapshots.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Stored securely in Firebase Firestore</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <span>Loading cloud backup archives...</span>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <Database className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="font-bold text-slate-600 dark:text-slate-300">No Cloud Snapshots Found</p>
            <p className="text-[11px]">Click "Take Snapshot Now" above to back up your school database to the cloud immediately.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {snapshots.map((snap) => (
              <div key={snap.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {snap.id}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {snap.formattedDate}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {snap.createdBy}
                    </span>
                  </div>

                  {snap.note && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                      <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{snap.note}</span>
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span>Records: <strong className="text-slate-700 dark:text-slate-300">{snap.recordCount}</strong></span>
                    <span>Tables: <strong className="text-slate-700 dark:text-slate-300">{snap.tablesCount}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => handleRestore(snap)}
                    disabled={restoringId === snap.id || !isSuperAdmin}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
                    title="Restore this snapshot version to the application"
                  >
                    {restoringId === snap.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    <span>{restoringId === snap.id ? 'Restoring...' : 'Restore'}</span>
                  </button>

                  {canDelete() && (
                    <button 
                      onClick={() => handleDelete(snap.id)}
                      className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/50 rounded-xl transition"
                      title="Delete snapshot archive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
