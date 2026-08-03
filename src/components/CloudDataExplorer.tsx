import React, { useState, useEffect } from 'react';
import { Search, Database, RefreshCw, AlertTriangle } from 'lucide-react';

export default function CloudDataExplorer() {
  const [tables, setTables] = useState<string[]>(['learners', 'staff', 'subjects', 'attendance', 'messages', 'exams']);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTableData = async (tableName: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/mongo/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionName: tableName, limit: 200 })
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.documents) && json.documents.length > 0) {
        setData(json.documents);
      } else {
        const { secureGet } = await import('../utils/db');
        const local = secureGet(tableName) || secureGet(`school_${tableName}`);
        setData(Array.isArray(local) ? local : (local ? [local] : []));
      }
    } catch (e) {
      console.error('Error fetching MongoDB collection data:', e);
      const { secureGet } = await import('../utils/db');
      const local = secureGet(tableName) || secureGet(`school_${tableName}`);
      setData(Array.isArray(local) ? local : (local ? [local] : []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable);
    }
  }, [selectedTable]);

  const filteredData = data.filter(item => 
    JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-1 bg-white p-4 rounded-xl border border-slate-200">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Tables</h3>
          <div className="space-y-1">
            {tables.map(table => (
              <button 
                key={table}
                onClick={() => setSelectedTable(table)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold ${selectedTable === table ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}
              >
                {table}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-1 md:col-span-3 bg-white p-4 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{selectedTable || 'Select a table'}</h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-2 text-left font-bold text-slate-500">ID</th>
                    <th className="px-4 py-2 text-left font-bold text-slate-500">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(item => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono text-slate-500">{item.id}</td>
                      <td className="px-4 py-2 text-slate-700">{JSON.stringify(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
