import React, { useState } from 'react';
import { Clock, MapPin } from 'lucide-react';
import { getAttendanceSettings, saveAttendanceSettings, AttendanceSettings } from '../utils/attendance';

export default function AttendanceSettingsPanel() {
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>(() => getAttendanceSettings());
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const updateSetting = (key: keyof AttendanceSettings, value: string) => {
    const newSettings = { ...attendanceSettings, [key]: value };
    setAttendanceSettings(newSettings);
    saveAttendanceSettings(newSettings);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus({ message: "❌ Geolocation is not supported on your device", type: 'error' });
      return;
    }
    setStatus({ message: "⏳ Requesting location permission... Please look for the browser prompt.", type: 'success' });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        const newSettings = { ...attendanceSettings, latitude: lat, longitude: lng };
        setAttendanceSettings(newSettings);
        saveAttendanceSettings(newSettings);
        setStatus({ message: `✅ Location updated! Lat: ${lat}, Lng: ${lng}`, type: 'success' });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus({ message: "❌ Permission denied. To reset: click the padlock icon in your browser's address bar, find 'Location', and click 'Clear' or 'Reset'. Then try again.", type: 'error' });
        } else {
          setStatus({ message: "❌ Could not get location. Ensure GPS is enabled.", type: 'error' });
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/10">
          <Clock size={22} className="text-white" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900 leading-tight">Attendance Configuration</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Check-in & Check-out Parameters</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Location Section */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
             <label className="text-xs font-bold text-slate-700 uppercase">Latitude</label>
             <input type="text" value={attendanceSettings.latitude ?? ''} onChange={(e) => updateSetting('latitude', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800" />
          </div>
          <div className="space-y-1">
             <label className="text-xs font-bold text-slate-700 uppercase">Longitude</label>
             <input type="text" value={attendanceSettings.longitude ?? ''} onChange={(e) => updateSetting('longitude', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800" />
          </div>
        </div>
        <button onClick={getCurrentLocation} className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition">
            <MapPin size={16}/> Get Current Location
        </button>
        
        {attendanceSettings.latitude && attendanceSettings.longitude && (
            <div className="rounded-lg overflow-hidden border border-slate-200 shadow-inner">
                <iframe
                    width="100%"
                    height="200"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${attendanceSettings.latitude},${attendanceSettings.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    title="Google Map"
                    className="w-full h-[200px]"
                />
            </div>
        )}

        {/* Fields */}
        {[
          { key: 'radius', label: 'Geofence Radius (Meters)', type: 'number' },
          { key: 'checkInStart', label: 'Check-In Start Time', type: 'time' },
          { key: 'lateThreshold', label: 'Late Threshold Time', type: 'time' },
          { key: 'checkOutTime', label: 'Check-Out Time', type: 'time' },
          { key: 'checkInOpeningOffset', label: 'Check-In Opening Offset (Hours)', type: 'number' },
          { key: 'checkInAllowance', label: 'Check-In Allowance (Mins)', type: 'number' },
        ].map((item) => (
          <div key={item.key} className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">{item.label}</label>
            <input
              type={item.type || 'text'}
              value={attendanceSettings[item.key as keyof AttendanceSettings] ?? ''}
              onChange={(e) => updateSetting(item.key as keyof AttendanceSettings, e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
            />
          </div>
        ))}
        
        <div className="pt-2 pb-2 border-t border-b border-slate-100 flex items-center justify-between">
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase block">Restrict Late Check-In</label>
            <p className="text-[11px] text-slate-500">Prevent staff from clocking in after the late threshold/allowance window</p>
          </div>
          <input
            type="checkbox"
            checked={!!attendanceSettings.restrictLateCheckIn}
            onChange={(e) => {
              const val = e.target.checked;
              const newSettings = { ...attendanceSettings, restrictLateCheckIn: val };
              setAttendanceSettings(newSettings);
              saveAttendanceSettings(newSettings);
            }}
            className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 uppercase">Time Zone</label>
          <select
            value={attendanceSettings.timezone ?? ''}
            onChange={(e) => updateSetting('timezone', e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
          >
            <option value="">Select Timezone</option>
            <option value="Africa/Nairobi">Africa/Nairobi</option>
            <option value="UTC">UTC</option>
            <option value="Europe/London">Europe/London</option>
            <option value="America/New_York">America/New_York</option>
          </select>
        </div>
      </div>
      {status && (
          <div className={`p-3 rounded-lg text-xs font-bold ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {status.message}
          </div>
      )}
    </div>
  );
}
