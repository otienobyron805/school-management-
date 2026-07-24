const fs = require('fs');

let code = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf8');

// I will find the exact index of `        {/* SCHOOL NAME HEADER */}`
const schoolHeaderIndex = code.indexOf('        {/* SCHOOL NAME HEADER */}');
if (schoolHeaderIndex === -1) {
  console.log('Cannot find school header index');
  process.exit(1);
}

// Keep everything up to the school header
let finalCode = code.substring(0, schoolHeaderIndex);

// Add the rest manually to ensure it's correct
finalCode += `        {/* SCHOOL NAME HEADER */}
        <div className="text-center pt-4 pb-2">
          <div className="inline-flex items-center justify-center gap-2.5 text-2xl sm:text-3xl font-black uppercase tracking-wider bg-gradient-to-r from-blue-800 to-cyan-600 bg-clip-text text-transparent select-none">
            <span>🏫</span>
            <span>{schoolProfile?.name || "Academic Portal"}</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ✅ LIVE STATISTICS GRID (REPLICATING THE SPECIFIED DESIGN) */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 p-1 w-full">
          
          {/* 1. TOTAL STUDENTS */}
          <div 
            onClick={() => navigateTo('Learners')}
            className="cursor-pointer rounded-lg p-0.5 text-center shadow-sm bg-blue-100 text-blue-800 h-12 w-full flex flex-col items-center justify-center overflow-hidden"
          >
            <div className="text-[8px] font-medium leading-tight">👥 Students</div>
            <div className="text-xs font-bold leading-tight mt-0.5">{stats.totalStudents}</div>
          </div>

          {/* 2. MALE STUDENTS */}
          <div 
            onClick={() => navigateTo('Learners')}
            className="cursor-pointer rounded-lg p-0.5 text-center shadow-sm bg-cyan-100 text-cyan-800 h-12 w-full flex flex-col items-center justify-center overflow-hidden"
          >
            <div className="text-[8px] font-medium leading-tight">👦 Male</div>
            <div className="text-xs font-bold leading-tight mt-0.5">{stats.maleStudents}</div>
          </div>

          {/* 3. FEMALE STUDENTS */}
          <div 
            onClick={() => navigateTo('Learners')}
            className="cursor-pointer rounded-lg p-0.5 text-center shadow-sm bg-pink-100 text-pink-800 h-12 w-full flex flex-col items-center justify-center overflow-hidden"
          >
            <div className="text-[8px] font-medium leading-tight">👧 Female</div>
            <div className="text-xs font-bold leading-tight mt-0.5">{stats.femaleStudents}</div>
          </div>

          {/* 4. STAFF */}
          <div 
            onClick={() => navigateTo('Staff Attendance')}
            className="cursor-pointer rounded-lg p-0.5 text-center shadow-sm bg-amber-100 text-amber-800 h-12 w-full flex flex-col items-center justify-center overflow-hidden"
          >
            <div className="text-[8px] font-medium leading-tight">💼 Staff</div>
            <div className="text-xs font-bold leading-tight mt-0.5">
              {stats.staffActive}<span className="text-amber-800/70">/{stats.staffTotal}</span>
            </div>
          </div>

          {/* 5. ABSENTS TODAY */}
          <div 
            onClick={() => navigateTo('Attendance Roll')}
            className="cursor-pointer rounded-lg p-0.5 text-center shadow-sm bg-rose-100 text-rose-800 h-12 w-full flex flex-col items-center justify-center overflow-hidden"
          >
            <div className="text-[8px] font-medium leading-tight">📉 Absents</div>
            <div className="text-xs font-bold leading-tight mt-0.5">{stats.absentsCount}</div>
          </div>

          {/* 6. CURRENT SESSION */}
          <div 
            onClick={() => navigateTo('School Profile')}
            className="cursor-pointer rounded-lg p-0.5 text-center shadow-sm bg-emerald-100 text-emerald-800 h-12 w-full flex flex-col items-center justify-center overflow-hidden"
          >
            <div className="text-[8px] font-medium leading-tight">📅 Session</div>
            <div className="text-xs font-bold leading-tight mt-0.5 truncate w-full px-0.5">
              {schoolProfile?.academicCalendar ? (
                schoolProfile.academicCalendar.includes("Term") 
                  ? schoolProfile.academicCalendar.split(":")[0].trim() 
                  : schoolProfile.academicCalendar
              ) : new Date().getFullYear()}
            </div>
          </div>

        </div>

        {/* ATTENDANCE CLOCK IN / OUT SECTION (Moved here based on user request) */}
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
        )}

      </div>

      {/* 🖼️ INTERACTIVE PROFILE PICTURE UPLOADER MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-150 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" /> Update Profile Picture
              </h3>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              
              {/* Image Preview Container */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-sm relative">
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-slate-300" />
                  )}
                </div>
              </div>

              {/* URL Input Form */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/photo.jpg"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setUploadError('');
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm font-medium"
                />
              </div>

              {/* Or File Upload Form */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-slate-500 font-medium">Or upload a file</span>
                </div>
              </div>

              <div 
                className={\`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer \${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:bg-slate-50'}\`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('avatar-upload-input')?.click()}
              >
                <input 
                  id="avatar-upload-input"
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <UploadCloud className={\`w-8 h-8 mx-auto mb-2 \${dragActive ? 'text-blue-500' : 'text-slate-400'}\`} />
                <p className="text-sm font-medium text-slate-700">
                  {dragActive ? 'Drop image here...' : 'Click or drag image here'}
                </p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 2MB</p>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {uploadError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleRemove}
                  className="px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  Remove
                </button>
                <div className="flex-1"></div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
                >
                  Save Profile
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HomeDashboard;
`;

fs.writeFileSync('src/components/HomeDashboard.tsx', finalCode);
console.log('Fixed successfully');
