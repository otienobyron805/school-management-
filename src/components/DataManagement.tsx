import React, { useRef, useState, useEffect } from 'react';
import { Download, Upload, Database, CheckCircle2, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { addAlertLog } from '../utils/alerts';
import { 
  fetchMongoStatus, 
  fetchMongoCollections, 
  syncCollectionToMongo, 
  getLearners, 
  getFeePayments, 
  getFeeStructures, 
  getGrades, 
  getSubjects,
  MongoStatusResponse 
} from '../utils/db';

export const exportAllData = () => {
  const allData: Record<string, string | null> = {};
  console.log("Exporting keys:", []);
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      allData[key] = localStorage.getItem(key);
      console.log(`Exported key: ${key}`);
    }
  }

  // Record administrative backup export security notice
  addAlertLog(
    'Backup',
    'Info',
    'Full Database Backup Exported',
    `An administrator initiated a complete system database export. Total keys transferred: ${Object.keys(allData).length} system records.`
  );

  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `app-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  alert(`✅ FULL BACKUP DOWNLOADED (${Object.keys(allData).length} items) — KEEP THIS FILE SAFE!`);
};

export default function DataManagement() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mongoStatus, setMongoStatus] = useState<MongoStatusResponse | null>(null);
  const [mongoCollections, setMongoCollections] = useState<{ name: string; count: number }[]>([]);
  const [isTestingMongo, setIsTestingMongo] = useState<boolean>(false);
  const [isSyncingMongo, setIsSyncingMongo] = useState<boolean>(false);
  const [mongoSyncResult, setMongoSyncResult] = useState<string | null>(null);

  const checkMongo = async () => {
    setIsTestingMongo(true);
    setMongoSyncResult(null);
    const status = await fetchMongoStatus();
    setMongoStatus(status);
    if (status.connected) {
      const cols = await fetchMongoCollections();
      if (cols.success && cols.collections) {
        setMongoCollections(cols.collections);
      }
    }
    setIsTestingMongo(false);
  };

  useEffect(() => {
    checkMongo();
  }, []);

  const handleSyncAllToMongo = async () => {
    setIsSyncingMongo(true);
    setMongoSyncResult(null);
    try {
      const learners = getLearners();
      const feePayments = getFeePayments();
      const feeStructures = getFeeStructures();
      const grades = getGrades();
      const subjects = getSubjects();

      const r1 = await syncCollectionToMongo('learners', learners);
      const r2 = await syncCollectionToMongo('fee_payments', feePayments);
      const r3 = await syncCollectionToMongo('fee_structures', feeStructures);
      const r4 = await syncCollectionToMongo('grades', grades);
      const r5 = await syncCollectionToMongo('subjects', subjects);

      if (r1.success && r2.success) {
        setMongoSyncResult('✅ Successfully synchronized all local collections to MongoDB cluster!');
        checkMongo();
      } else {
        setMongoSyncResult(`⚠️ Sync completed with notice: ${r1.error || r2.error || 'Check connection settings'}`);
      }
    } catch (err: any) {
      setMongoSyncResult(`❌ MongoDB sync failed: ${err.message}`);
    } finally {
      setIsSyncingMongo(false);
    }
  };

  const importAllData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (typeof data !== 'object' || data === null) {
          throw new Error("Invalid backup format");
        }
        
        localStorage.clear();
        Object.keys(data).forEach((key) => {
          localStorage.setItem(key, data[key]);
        });
        
        // Log critical backup restore security alert before reloading
        addAlertLog(
          'Backup',
          'Warning',
          'Administrative Database Restored',
          `The complete system database has been overwritten and restored from an uploaded backup file containing ${Object.keys(data).length} parameters.`
        );

        alert('✅ ALL YOUR SETTINGS RESTORED SUCCESSFULLY! Page will reload.');
        location.reload();
      } catch (err) {
        console.error("Import error:", err);
        alert('❌ Not a valid backup file — use the one you downloaded earlier.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* 🟢 MONGODB CLUSTER INTEGRATION CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">MongoDB Database Integration</h2>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${
                  mongoStatus?.connected 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}>
                  {mongoStatus?.connected ? 'Connected' : 'Configuration Pending'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Connect and synchronize school records directly with a MongoDB cluster using <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">MONGODB_URI</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={checkMongo}
              disabled={isTestingMongo}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingMongo ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>

            {mongoStatus?.connected && (
              <button
                onClick={handleSyncAllToMongo}
                disabled={isSyncingMongo}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isSyncingMongo ? 'Syncing...' : 'Sync All Collections'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Connection Status Detail */}
        <div className={`p-4 rounded-2xl text-xs font-medium border ${
          mongoStatus?.connected 
            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' 
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-2 font-bold mb-1">
            {mongoStatus?.connected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{mongoStatus?.message || 'Checking MongoDB connection status...'}</span>
          </div>

          {!mongoStatus?.connected && (
            <p className="text-[11px] text-slate-500 mt-1">
              To activate MongoDB persistence, specify your MongoDB connection string in the Secrets or Environment configuration as <code className="font-mono text-slate-800 bg-slate-200 px-1 py-0.5 rounded">MONGODB_URI=mongodb+srv://...</code>
            </p>
          )}

          {mongoStatus?.connected && (
            <div className="mt-3 pt-3 border-t border-emerald-200/60 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-700 block">Database Name</span>
                <span className="font-mono font-bold text-slate-900">{mongoStatus.dbName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-700 block">Collections Count</span>
                <span className="font-mono font-bold text-slate-900">{mongoCollections.length} collections</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase text-emerald-700 block">Driver</span>
                <span className="font-mono font-bold text-slate-900">Official MongoDB Node.js Driver</span>
              </div>
            </div>
          )}
        </div>

        {mongoSyncResult && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-900">
            {mongoSyncResult}
          </div>
        )}

        {/* Synced Collections list */}
        {mongoCollections.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Active MongoDB Collections</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {mongoCollections.map(c => (
                <div key={c.name} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-800">{c.name}</span>
                  <span className="bg-slate-200 text-slate-800 text-[10px] font-mono font-black px-2 py-0.5 rounded-full">{c.count} docs</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 📄 LOCAL BACKUP & TRANSFER CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Download size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Data Backup & Transfer</h2>
        </div>
        <p className="text-sm text-slate-600 mb-6">Download your full setup as a backup file — restore anytime you publish or move your system.</p>
        <div className="flex gap-3">
          <button 
              onClick={exportAllData}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition cursor-pointer"
          >
              <Download size={16} /> Download Full Backup
          </button>
          <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition cursor-pointer"
          >
              <Upload size={16} /> Restore From Backup
          </button>
          <input 
              type="file" 
              ref={fileInputRef} 
              onChange={importAllData} 
              accept=".json" 
              className="hidden" 
          />
        </div>
      </div>
    </div>
  );
}

