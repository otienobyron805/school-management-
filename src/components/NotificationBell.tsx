import { useState, useEffect } from "react";
import { Bell, AlertTriangle } from "lucide-react";
import { subscribeNotifications, Notification } from "../utils/notifications";
import { getCurrentUser, getMessages } from "../utils/db";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const user = getCurrentUser();

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeNotifications(userId, (notes) => {
      setNotifications(notes);
    });
    return () => unsubscribe();
  }, [userId]);

  // Combine Firestore notifications with local db system messages
  const unreadSystemMessages = user ? getMessages().filter(m => 
    !m.read && (m.receiverId === user.id || m.receiverId === 'ALL_CLASS_TEACHERS' || user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'Class Teacher' || user.role !== 'Parent')
  ) : [];

  const totalUnread = notifications.filter(n => !n.read).length + unreadSystemMessages.length;

  return (
    <div className="relative p-1">
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer text-slate-600 hover:text-slate-900"
        title="Notifications & System Alerts"
      >
        <Bell size={20} />
        {totalUnread > 0 && (
          <span className="absolute top-1 right-1 bg-rose-500 text-white font-extrabold text-[10px] min-w-[18px] h-4 px-1 flex items-center justify-center rounded-full animate-pulse shadow-xs">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-black uppercase tracking-wider">Notifications & Alerts</h4>
            </div>
            <span className="text-[10px] font-extrabold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
              {totalUnread} Unread
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {unreadSystemMessages.length === 0 && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">
                No new notifications or attendance alerts.
              </div>
            ) : (
              <>
                {unreadSystemMessages.map((msg, idx) => (
                  <div key={idx} className="p-3.5 bg-rose-50/60 hover:bg-rose-50 transition">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-rose-700 tracking-wider block">
                          Automated Attendance Alert
                        </span>
                        <p className="text-xs text-slate-800 font-semibold leading-snug">{msg.text}</p>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {new Date(msg.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {notifications.map((note, idx) => (
                  <div key={idx} className="p-3.5 hover:bg-slate-50 transition">
                    <p className="text-xs text-slate-800 font-medium">{note.message}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <button 
              onClick={() => setShowDropdown(false)}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Close Panel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

