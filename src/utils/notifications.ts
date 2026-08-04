import { secureGet, secureSet } from './db';

// Database-backed system notifications
export interface Notification {
  id?: string;
  teacherId: string;
  message: string;
  createdAt: any;
  read: boolean;
}

export const sendNotification = async (teacherId: string, message: string) => {
  try {
    if (typeof window === 'undefined') return;
    const existingStr = secureGet('school_notifications');
    const existing: Notification[] = existingStr ? JSON.parse(existingStr) : [];
    
    const newNote: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      teacherId,
      message,
      createdAt: new Date().toISOString(),
      read: false
    };

    existing.unshift(newNote);
    secureSet('school_notifications', JSON.stringify(existing.slice(0, 100)));
    window.dispatchEvent(new CustomEvent('notifications_updated'));
  } catch (e) {
    console.warn("Could not save notification: ", e);
  }
};

export const subscribeNotifications = (teacherId: string, callback: (notifications: Notification[]) => void) => {
  const loadNotifications = () => {
    try {
      if (typeof window === 'undefined') {
        callback([]);
        return;
      }
      const existingStr = secureGet('school_notifications');
      const existing: Notification[] = existingStr ? JSON.parse(existingStr) : [];
      const userNotes = existing.filter(n => n.teacherId === teacherId);
      callback(userNotes);
    } catch (e) {
      callback([]);
    }
  };

  loadNotifications();
  if (typeof window !== 'undefined') {
    window.addEventListener('notifications_updated', loadNotifications);
    window.addEventListener('storage', loadNotifications);
    return () => {
      window.removeEventListener('notifications_updated', loadNotifications);
      window.removeEventListener('storage', loadNotifications);
    };
  }

  return () => {};
};

