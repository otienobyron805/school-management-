import React, { useState, useEffect } from 'react';
import { getUsers, getSubjects, getGrades, getSubjectAssignments, saveSubjectAssignments, getClassTeacherAssignments, saveClassTeacherAssignments, getCurrentUser } from '../utils/db';
import { canDelete } from '../utils/permissions';
import { CheckCircle2, BookOpen } from 'lucide-react';

export default function SubjectAssignments() {
  const currentUser = getCurrentUser();
  const userRole = (currentUser?.role || '').toLowerCase();
  
  // Authorized roles for admin-only sections: Admin, Headteacher, Deputy Headteacher, Senior Teacher, Super Admin
  const ADMIN_ROLES = ['admin', 'headteacher', 'head teacher', 'deputy headteacher', 'deputy head teacher', 'deputy', 'senior teacher', 'senior', 'super admin', 'administrator', 'principal'];
  const isAdminLevel = ADMIN_ROLES.some(r => userRole.includes(r));

  const [assignments, setAssignments] = useState<any[]>(() => getSubjectAssignments());
  const [classTeachers, setClassTeachers] = useState<any[]>(() => getClassTeacherAssignments());

  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [gradesList, setGradesList] = useState<any[]>([]);

  // Selected values for Subject Assignment Form
  const [selTeacher, setSelTeacher] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selGrade, setSelGrade] = useState('');
  const [selStream, setSelStream] = useState('All Streams');
  const [successMessage, setSuccessMessage] = useState('');

  // Selected values for Class Teacher Assignment Form
  const [selClassTeacher, setSelClassTeacher] = useState('');
  const [selClassGrade, setSelClassGrade] = useState('');
  const [selClassStream, setSelClassStream] = useState('');

  const [isClassStreamDisabled, setIsClassStreamDisabled] = useState(true);

  useEffect(() => {
    const users = getUsers().filter(u => u.role !== 'Parent');
    setTeachersList(users);
    setSubjectsList(getSubjects());
    setGradesList(getGrades());

    if (currentUser) {
      const match = users.find(u => u.id === currentUser.id || u.fullName === currentUser.fullName || u.username === currentUser.username);
      if (match) {
        setSelTeacher(match.id);
      }
    }
  }, []);

  // Auto-save effect for subject assignments
  useEffect(() => {
    saveSubjectAssignments(assignments);
  }, [assignments]);

  // Auto-save effect for class teacher assignments
  useEffect(() => {
    saveClassTeacherAssignments(classTeachers);
  }, [classTeachers]);

  const handleClassGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelClassGrade(value);
    setIsClassStreamDisabled(value === '');
    setSelClassStream('');
  };

  const assignSubject = () => {
    if (!selTeacher || !selSubject || !selGrade) {
      alert('⚠️ Please select a Teacher, Subject, and Grade.');
      return;
    }
    const teacherObj = teachersList.find(t => t.id === selTeacher);
    const teacherName = teacherObj?.fullName || 'Unknown';
    const subjectName = subjectsList.find(s => s.id === selSubject)?.name || 'Unknown';
    const gradeName = gradesList.find(g => g.id === selGrade)?.name || 'Unknown';

    const nextAssignments = [
      ...assignments,
      { teacher: teacherName, subject: subjectName, grade: gradeName, stream: selStream }
    ];
    setAssignments(nextAssignments);
    saveSubjectAssignments(nextAssignments);

    setSuccessMessage(`✅ Successfully assigned ${subjectName} in ${gradeName} (${selStream}) to ${teacherName}!`);
    setTimeout(() => setSuccessMessage(''), 5000);

    // Reset selects
    if (isAdminLevel) {
      setSelTeacher('');
    }
    setSelSubject('');
    setSelGrade('');
    setSelStream('All Streams');
  };

  const assignClassTeacher = () => {
    if (!selClassTeacher || !selClassGrade || !selClassStream) {
      alert('⚠️ Please select a Teacher, Grade, and Stream.');
      return;
    }
    const teacherId = selClassTeacher;
    const teacherName = teachersList.find(t => t.id === selClassTeacher)?.fullName || 'Unknown';
    const gradeId = selClassGrade;
    const gradeName = gradesList.find(g => g.id === selClassGrade)?.name || 'Unknown';

    const nextClassTeachers = [
      ...classTeachers,
      { teacherId, teacher: teacherName, gradeId, grade: gradeName, stream: selClassStream }
    ];
    setClassTeachers(nextClassTeachers);
    saveClassTeacherAssignments(nextClassTeachers);

    // Reset selects
    setSelClassTeacher('');
    setSelClassGrade('');
    setSelClassStream('');
    setIsClassStreamDisabled(true);
  };

  const deleteAssignment = (index: number) => {
    if (!canDelete()) {
      alert('⚠️ Access denied: You have a restriction ("cannot delete") preventing you from deleting items in this software.');
      return;
    }
    if(confirm('⚠️ Remove this assignment?')) {
        const nextAssignments = assignments.filter((_, i) => i !== index);
        setAssignments(nextAssignments);
        saveSubjectAssignments(nextAssignments);
    }
  }

  const deleteClassTeacher = (index: number) => {
    if (!canDelete()) {
      alert('⚠️ Access denied: You have a restriction ("cannot delete") preventing you from deleting items in this software.');
      return;
    }
    if(confirm('⚠️ Remove this assignment?')) {
        const nextClassTeachers = classTeachers.filter((_, i) => i !== index);
        setClassTeachers(nextClassTeachers);
        saveClassTeacherAssignments(nextClassTeachers);
    }
  }

  const Hint = ({text}: {text: string}) => <p className="text-xs text-slate-400 italic mb-4 flex items-center gap-1">ℹ️ {text}</p>;

  // Get unassigned teachers (teachers who are not class teachers)
  const classTeacherNames = new Set(classTeachers.map(ct => ct.teacher));
  const unassignedTeachers = teachersList.filter(t => t.role !== 'Admin' && !classTeacherNames.has(t.fullName));

  // Filter selectable teachers: admins see all, teachers see only their own personnel account
  const selectableTeachers = isAdminLevel
    ? teachersList
    : teachersList.filter(t => t.id === currentUser?.id || t.fullName === currentUser?.fullName || t.username === currentUser?.username);

  const activeTeacherOptions = selectableTeachers.length > 0 
    ? selectableTeachers 
    : (currentUser ? [{ id: currentUser.id, fullName: currentUser.fullName, role: currentUser.role }] : teachersList);

  return (
    <div className="space-y-6">
      <div className={isAdminLevel ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "max-w-2xl mx-auto"}>
        {/* Subject Assignments Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Subject Assignments
            </h3>
            <span className="text-[11px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold border border-blue-100">
              {isAdminLevel ? 'Administrative' : 'Teacher Form'}
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-4">Assign subjects to classes and streams</p>
          
          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <Hint text="Select: Teacher → Subject → Grade → Stream" />
          <div className="flex gap-3 mb-3 flex-wrap">
            <select 
              value={selTeacher}
              onChange={(e) => setSelTeacher(e.target.value)}
              className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50/50 font-medium"
            >
              {isAdminLevel && <option value="">— Select Teacher —</option>}
              {activeTeacherOptions.map(t => (
                <option key={t.id} value={t.id}>{t.fullName} ({t.role})</option>
              ))}
            </select>
            <select 
              value={selSubject}
              onChange={(e) => setSelSubject(e.target.value)}
              className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm font-medium"
            >
              <option value="">— Select Subject —</option>
              {subjectsList.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 mb-4 flex-wrap">
            <select 
              value={selGrade}
              onChange={(e) => {
                setSelGrade(e.target.value);
                setSelStream('All Streams');
              }}
              className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm font-medium"
            >
              <option value="">— Select Grade —</option>
              {gradesList.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <select 
              value={selStream}
              onChange={(e) => setSelStream(e.target.value)}
              className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm font-medium"
            >
              <option value="All Streams">All Streams</option>
              {selGrade && gradesList.find(g => g.id === selGrade)?.streams.map((st: any) => (
                <option key={st.id} value={st.name}>{st.name}</option>
              ))}
            </select>
          </div>
          <button className="w-full sm:w-auto bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2" onClick={assignSubject}>
            + Assign Subject
          </button>
        </div>

        {/* Class Teacher Assignments Card - Admin / Headteacher / Deputy Headteacher / Senior Teacher Only */}
        {isAdminLevel && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-blue-800 mb-1">Class Teacher Assignments</h3>
            <p className="text-sm text-slate-600 mb-4">One class teacher per grade + stream</p>
            <Hint text="First select Grade, then Stream will unlock" />
            <div className="flex gap-3 mb-3 flex-wrap">
              <select 
                value={selClassTeacher}
                onChange={(e) => setSelClassTeacher(e.target.value)}
                className="flex-1 p-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">— Select Teacher —</option>
                {teachersList.map(t => (
                  <option key={t.id} value={t.id}>{t.fullName} ({t.role})</option>
                ))}
              </select>
              <select 
                value={selClassGrade}
                onChange={handleClassGradeChange}
                className="flex-1 p-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">— Select Grade —</option>
                {gradesList.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 mb-4 flex-wrap">
              <select 
                value={selClassStream}
                onChange={(e) => setSelClassStream(e.target.value)}
                className="flex-1 p-2 border border-slate-300 rounded-lg text-sm" 
                disabled={isClassStreamDisabled}
              >
                <option value="">{isClassStreamDisabled ? '— Select Grade first —' : '— Select Stream —'}</option>
                {!isClassStreamDisabled && selClassGrade && gradesList.find(g => g.id === selClassGrade)?.streams.map((st: any) => (
                  <option key={st.id} value={st.name}>{st.name}</option>
                ))}
              </select>
            </div>
            <button className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow-md transition-all cursor-pointer" onClick={assignClassTeacher}>+ Assign Class Teacher</button>
          </div>
        )}
      </div>

      {/* Current Subject Assignments Table - Admin / Headteacher / Deputy Headteacher / Senior Teacher Only */}
      {isAdminLevel && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <h3 className="text-lg font-bold mb-4">Current Subject Assignments</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase">
                <th className="p-3 border-b">TEACHER</th>
                <th className="p-3 border-b">ROLE</th>
                <th className="p-3 border-b">SUBJECT</th>
                <th className="p-3 border-b">GRADE</th>
                <th className="p-3 border-b">STREAM</th>
                <th className="p-3 border-b"></th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400 border-dashed border-2 rounded-xl">No subject assignments yet</td></tr>}
              {assignments.map((a, i) => (
                <tr key={i} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-sm font-medium text-slate-700">{a.teacher}</td>
                  <td className="p-3 text-xs"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Subject Teacher</span></td>
                  <td className="p-3 text-sm text-slate-600">{a.subject}</td>
                  <td className="p-3 text-sm text-slate-600">{a.grade}</td>
                  <td className="p-3 text-sm text-slate-600">{a.stream}</td>
                  <td className="p-3 text-right">
                    {canDelete() && (
                      <button onClick={() => deleteAssignment(i)} className="w-7 h-7 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 font-bold transition-all cursor-pointer">×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom Grid - Admin / Headteacher / Deputy Headteacher / Senior Teacher Only */}
      {isAdminLevel && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <h3 className="text-lg font-bold mb-4">Current Class Teachers</h3>
              <table className="w-full border-collapse">
              <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase">
                  <th className="p-3 border-b">CLASS TEACHER</th>
                  <th className="p-3 border-b">GRADE</th>
                  <th className="p-3 border-b">STREAM</th>
                  <th className="p-3 border-b"></th>
                  </tr>
              </thead>
              <tbody>
                  {classTeachers.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 border-dashed border-2 rounded-xl">No class teachers assigned yet</td></tr>}
                  {classTeachers.map((a, i) => (
                  <tr key={i} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-sm font-medium text-slate-700">{a.teacher}</td>
                      <td className="p-3 text-sm text-slate-600">{a.grade}</td>
                      <td className="p-3 text-sm text-slate-600">{a.stream}</td>
                      <td className="p-3 text-right">
                        {canDelete() && (
                          <button onClick={() => deleteClassTeacher(i)} className="w-7 h-7 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 font-bold transition-all cursor-pointer">×</button>
                        )}
                      </td>
                  </tr>
                  ))}
              </tbody>
              </table>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <h3 className="text-lg font-bold mb-4">Unassigned Teachers</h3>
              {unassignedTeachers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border-dashed border-2 rounded-xl">No unassigned teachers</div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {unassignedTeachers.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-700">
                      <span>{t.fullName}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded">{t.role}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}

