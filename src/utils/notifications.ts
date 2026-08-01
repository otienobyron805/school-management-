import { getDb } from "./firebase";
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, QuerySnapshot, DocumentData } from "firebase/firestore";

export interface Notification {
  id?: string;
  teacherId: string;
  message: string;
  createdAt: any;
  read: boolean;
}

export const sendNotification = async (teacherId: string, message: string) => {
  try {
    const db = getDb();
    if (!db) return;
    await addDoc(collection(db, "notifications"), {
      teacherId,
      message,
      createdAt: serverTimestamp(),
      read: false
    });
  } catch (e) {
    console.warn("Could not save notification to Firestore: ", e);
  }
};

export const subscribeNotifications = (teacherId: string, callback: (notifications: Notification[]) => void) => {
  try {
    const db = getDb();
    if (!db) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, "notifications"),
      where("teacherId", "==", teacherId),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const notifications: Notification[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      callback(notifications);
    }, (error) => {
      console.warn("Firestore subscription unavailable. Notifications operating in offline mode.", error?.message || error);
      callback([]);
    });
  } catch (err) {
    console.warn("Error setting up notification subscription:", err);
    callback([]);
    return () => {};
  }
};
