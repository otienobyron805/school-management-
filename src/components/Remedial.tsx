import React, { useState, useEffect } from 'react';
import { RemedialSession, RemedialAttendanceLog } from '../types';
import { getCurrentUser, secureGet, secureSet, getSubjectAssignments, saveSubjectAssignments } from '../utils/db';
import { Clock, User, ClipboardList, BookOpen, CalendarDays } from 'lucide-react';

export const Remedial: React.FC = () => {
  const [sessions, setSessions] = useState<RemedialSession[]>([]);
  const [logs, setLogs] = useState<RemedialAttendanceLog[]>([]);
  const [activeTab, setActiveTab] = useState<'sessions' | 'logs' | 'roster'>('sessions');
  const user = getCurrentUser();
  const [assignments, setAssignments] = useState(() => getSubjectAssignments());

  useEffect(() => {
    const stored = secureGet('remedial_sessions');
    setSessions(stored ? JSON.parse(stored) : []);
    const storedLogs = secureGet('remedial_logs');
    setLogs(storedLogs ? JSON.parse(storedLogs) : []);
  }, []);

  const handleRoomChange = (index: number, newRoom: string) => {
    const updatedAssignments = [...assignments];
    updatedAssignments[index] = { ...updatedAssignments[index], room: newRoom };
    setAssignments(updatedAssignments);
    saveSubjectAssignments(updatedAssignments);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCheckInOut = (sessionId: string, action: 'checkIn' | 'checkOut') => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const existingLog = logs.find(l => l.sessionId === sessionId && l.date === today && l.teacherId === user.id);

    let updatedLogs = [...logs];
    if (action === 'checkIn') {
      if (existingLog) {
          alert('Already checked in for today!');
          return;
      }
      updatedLogs.push({
          id: Math.random().toString(36).substr(2, 9),
          sessionId,
          teacherId: user.id,
          checkInTime: new Date().toLocaleTimeString(),
          checkOutTime: null,
          date: today
      });
    } else {
      if (!existingLog) {
          alert('Not checked in yet!');
          return;
      }
      existingLog.checkOutTime = new Date().toLocaleTimeString();
    }
    setLogs(updatedLogs);
    secureSet('remedial_logs', JSON.stringify(updatedLogs));
  };

  if (!user) return <div className="p-6">Please log in to view remedial sessions.</div>;

  const mySessions = sessions.filter(s => s.teacherId === user.id);
  const myLogs = logs.filter(l => l.teacherId === user.id);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <h1 className="text-2xl font-bold mb-6">Remedial Sessions</h1>
      
      <div className="flex gap-4 mb-6 print-hidden">
        <button onClick={() => setActiveTab('sessions')} className={`px-4 py-2 rounded-lg ${activeTab === 'sessions' ? 'bg-indigo-600 text-white' : 'bg-white'}`}>Sessions</button>
        <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 rounded-lg ${activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'bg-white'}`}>Session Log</button>
        <button onClick={() => setActiveTab('roster')} className={`px-4 py-2 rounded-lg ${activeTab === 'roster' ? 'bg-indigo-600 text-white' : 'bg-white'}`}>Duty Roster</button>
      </div>

      {activeTab === 'sessions' ? (
        <div className="grid gap-4">
          {mySessions.map(session => (
            <div key={session.id} className="bg-white p-4 rounded-xl shadow border border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold">{session.sessionType} Remedial</h3>
                <p className="text-sm text-slate-500">{session.startTime} - {session.endTime}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleCheckInOut(session.id, 'checkIn')}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm"
                >
                  Check In
                </button>
                <button 
                  onClick={() => handleCheckInOut(session.id, 'checkOut')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm"
                >
                  Check Out
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'logs' ? (
        <div className="bg-white p-4 rounded-xl shadow border border-slate-200">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-slate-500">
                <th className="p-2">Date</th>
                <th className="p-2">Check In</th>
                <th className="p-2">Check Out</th>
              </tr>
            </thead>
            <tbody>
              {myLogs.map(log => (
                <tr key={log.id} className="border-t border-slate-100 text-sm">
                  <td className="p-2">{log.date}</td>
                  <td className="p-2">{log.checkInTime}</td>
                  <td className="p-2">{log.checkOutTime || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-xl shadow border border-slate-200" id="roster-print-area">
          <style>{`
            @media print {
              .print-hidden { display: none !important; }
              body * { visibility: hidden; }
              #roster-print-area, #roster-print-area * { visibility: visible; }
              #roster-print-area { position: absolute; left: 0; top: 0; width: 100%; }
              input { border: none !important; }
            }
          `}</style>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">Teacher Remedial Assignments</h2>
            <button onClick={handlePrint} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm print-hidden">Print Roster</button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-slate-500">
                <th className="p-2">Teacher</th>
                <th className="p-2">Subject</th>
                <th className="p-2">Grade</th>
                <th className="p-2">Room</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment, index) => (
                <tr key={index} className="border-t border-slate-100 text-sm">
                  <td className="p-2 font-medium">{assignment.teacher}</td>
                  <td className="p-2 text-slate-600">{assignment.subject}</td>
                  <td className="p-2 text-slate-600">{assignment.grade}</td>
                  <td className="p-2">
                    <input 
                      type="text" 
                      value={assignment.room || ''}
                      onChange={(e) => handleRoomChange(index, e.target.value)}
                      className="border rounded p-1 w-full"
                      placeholder="Assign room"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default Remedial;
