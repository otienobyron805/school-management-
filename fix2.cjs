const fs = require('fs');

let code = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf8');

// The broken snippet to replace:
const brokenSnippet = `}
                  </span>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
               <button
                  onClick={() => handleSelfCheckIn('Present')}
                  disabled={!!myAttendance?.checkInTime}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
               >
                  <LogIn size={18} />
                  {myAttendance?.checkInTime ? \`Checked In at \${myAttendance.checkInTime}\` : 'CLOCK IN'}
               </button>

               <button
                  onClick={handleSelfCheckOut}
                  disabled={!myAttendance?.checkInTime || !!myAttendance?.checkOutTime}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
               >
                  <LogOut size={18} />
                  {myAttendance?.checkOutTime ? \`Checked Out at \${myAttendance.checkOutTime}\` : 'CLOCK OUT'}
               </button>
            </div>
          </div>
        )}`;

// We replace that with nothing. Wait, no, we just remove the broken part up to `}`.
code = code.replace(brokenSnippet, '');

// Then we want to insert the PROPER clock-in block after the Live Statistics Grid
// The live statistics grid ends before the Modal.
const clockInSection = `
        {/* ATTENDANCE CLOCK IN / OUT SECTION */}
        {user.role !== 'Parent' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center md:items-start space-y-1">
               <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Checking in as</p>
               <h3 className="text-lg font-black text-slate-900">{user.fullName} <span className="text-sm text-slate-400 font-medium ml-2">ID: {user.staffNo || user.id}</span></h3>
               
               <div className="flex items-center gap-2 mt-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                  </span>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
               <button
                  onClick={() => handleSelfCheckIn('Present')}
                  disabled={!!myAttendance?.checkInTime}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
               >
                  <LogIn size={18} />
                  {myAttendance?.checkInTime ? \`Checked In at \${myAttendance.checkInTime}\` : 'CLOCK IN'}
               </button>

               <button
                  onClick={handleSelfCheckOut}
                  disabled={!myAttendance?.checkInTime || !!myAttendance?.checkOutTime}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
               >
                  <LogOut size={18} />
                  {myAttendance?.checkOutTime ? \`Checked Out at \${myAttendance.checkOutTime}\` : 'CLOCK OUT'}
               </button>
            </div>
          </div>
        )}`;

// We insert it before the modal.
const insertTarget = '      {/* 🖼️ INTERACTIVE PROFILE PICTURE UPLOADER MODAL */}';
code = code.replace(insertTarget, clockInSection + '\n\n' + insertTarget);

fs.writeFileSync('src/components/HomeDashboard.tsx', code);
