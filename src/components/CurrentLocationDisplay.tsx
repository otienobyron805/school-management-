import React, { useState } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { getAttendanceSettings, saveAttendanceSettings } from '../utils/attendance';

export default function CurrentLocationDisplay() {
  const [settings, setSettings] = useState(() => getAttendanceSettings());
  const [status, setStatus] = useState<string>('');

  const refreshLocation = () => {
    if (!navigator.geolocation) {
      setStatus("Geolocation not supported.");
      return;
    }
    setStatus("Updating...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        const newSettings = { ...settings, latitude: lat, longitude: lng };
        setSettings(newSettings);
        saveAttendanceSettings(newSettings);
        setStatus("Location updated!");
        setTimeout(() => setStatus(''), 3000);
      },
      () => {
          setStatus("Error updating location.");
          setTimeout(() => setStatus(''), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
      <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-2">
        <MapPin size={14} className="text-blue-500"/>
        Current Location
      </h4>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-50 p-2 rounded">
          <span className="text-slate-400 font-bold block">Lat</span>
          <span className="font-mono font-bold text-slate-700">{settings.latitude || '--'}</span>
        </div>
        <div className="bg-slate-50 p-2 rounded">
          <span className="text-slate-400 font-bold block">Lng</span>
          <span className="font-mono font-bold text-slate-700">{settings.longitude || '--'}</span>
        </div>
      </div>
      <button 
        onClick={refreshLocation}
        className="w-full text-xs font-bold bg-blue-50 text-blue-700 p-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100"
      >
        <RefreshCw size={12}/> {status || "Refresh Location"}
      </button>
    </div>
  );
}
