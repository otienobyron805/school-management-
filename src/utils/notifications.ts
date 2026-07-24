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
    await addDoc(collection(getDb(), "notifications"), {
      teacherId,
      message,
      createdAt: serverTimestamp(),
      read: false
    });
  } catch (e) {
    console.error("Error adding notification: ", e);
  }
};

export const subscribeNotifications = (teacherId: string, callback: (notifications: Notification[]) => void) => {
  const q = query(
    collection(getDb(), "notifications"),
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
    console.warn("Firestore subscription unavailable. Notifications may not update in real-time.", error);
  });
};
