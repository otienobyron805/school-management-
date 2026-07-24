import React, { useState, useEffect } from 'react';
import { 
  getStaffAttendanceSheets, 
  StaffAttendanceSheet, 
  getUsers,
  UserAccount
} from '../utils/db';
import { Clock, Calendar as CalendarIcon, User } from 'lucide-react';

const StaffAttendance: React.FC = () => {
  const [sheets, setSheets] = useState<StaffAttendanceSheet[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    setSheets(getStaffAttendanceSheets());
    setUsers(getUsers().filter(u => u.role !== 'Parent'));
  }, []);

  const currentSheet = sheets.find(s => s.date === selectedDate);
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold">💼 Staff Attendance Records</h1>
            <p className="text-slate-400 text-sm">View staff clock-in and clock-out logs</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl flex items-center gap-3">
            <CalendarIcon className="text-blue-400" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={handleDateChange}
              className="bg-transparent text-white font-bold outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* RECORDS TABLE */}
        <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-bold">Staff Member</th>
                  <th className="p-4 font-bold">Role</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Clock In</th>
                  <th className="p-4 font-bold">Clock Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(user => {
                  const record = currentSheet?.records[user.id];
                  const status = record?.status || 'Absent';
                  
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                            <User size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{user.fullName}</p>
                            <p className="text-xs text-slate-500">{user.staffNo || user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          status === 'Present' ? 'bg-emerald-100 text-emerald-700' :
                          status === 'Late' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
                          {record?.checkInTime ? (
                            <><Clock size={14} className="text-emerald-500" /> {record.checkInTime}</>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
                          {record?.checkOutTime ? (
                            <><Clock size={14} className="text-blue-500" /> {record.checkOutTime}</>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                      No staff members found in the system.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StaffAttendance;
