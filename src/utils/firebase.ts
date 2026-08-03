import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  Firestore, 
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  onSnapshot,
  addDoc
} from "firebase/firestore";
import config from "../../firebase-applet-config.json";

let dbInstance: Firestore | null = null;

export const getDb = (): Firestore | null => {
  if (!dbInstance) {
    try {
      const firebaseConfig = {
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
        databaseId: 'ai-studio-school-management-4bb388c3-6b05-4d40-827c-07097b2e19d5'
      };

      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      
      dbInstance = getFirestore(app, firebaseConfig.databaseId);
    } catch (e) {
      console.warn("Firebase initialize error, falling back to local mode:", e);
      return null;
    }
  }
  return dbInstance;
};

/**
 * Log teacher actions for audit purposes
 */
export async function logTeacherAction(teacherId: string, teacherName: string, action: string, details: any): Promise<void> {
  try {
    const db = getDb();
    if (!db) return;
    await addDoc(collection(db, 'audit_logs'), {
      teacherId,
      teacherName,
      action,
      module: 'Marks Submissions',
      details,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.warn("[AuditLog] Failed to log action:", err);
  }
}

/**
 * Save feeding table dataset directly to Cloud Firestore
 */
export async function saveToFirestore(table: string, data: any): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) {
      console.warn("[Firestore] DB not initialized");
      return false;
    }
    const docRef = doc(db, 'school_data', table);
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Log the intent to save to Firestore
    console.log(`[Firestore] Attempting to save table: ${table}`);
    
    await setDoc(docRef, {
      table,
      data: serialized,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log(`[Firestore] Successfully saved table: ${table}`);
    return true;
  } catch (err) {
    console.warn(`[Firestore] Failed to save table ${table}:`, err);
    return false;
  }
}

/**
 * Fetch a single feeding table from Cloud Firestore
 */
export async function fetchFromFirestore(table: string): Promise<any | null> {
  try {
    const db = getDb();
    if (!db) return null;
    const docRef = doc(db, 'school_data', table);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const docData = snap.data();
      if (docData && docData.data) {
        return typeof docData.data === 'string' ? JSON.parse(docData.data) : docData.data;
      }
    }
    return null;
  } catch (err) {
    console.warn(`[Firestore] Failed to fetch table ${table}:`, err);
    return null;
  }
}

/**
 * Fetch all feeding tables from Cloud Firestore
 */
export async function fetchAllFromFirestore(): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  try {
    const db = getDb();
    if (!db) {
      console.log("[Firestore] No DB instance");
      return results;
    }
    const colRef = collection(db, 'school_data');
    console.log("[Firestore] Fetching all from school_data...");
    const snap = await getDocs(colRef);
    console.log(`[Firestore] Fetched ${snap.size} docs`);
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d && d.table && d.data) {
        try {
          results[d.table] = typeof d.data === 'string' ? JSON.parse(d.data) : d.data;
        } catch (e) {
          results[d.table] = d.data;
        }
      }
    });
  } catch (err) {
    console.warn("[Firestore] Failed to fetch all tables:", err);
  }
  return results;
}

/**
 * Subscribe to real-time Cloud Firestore updates across all school data
 */
export function subscribeToFirestore(onUpdate: (table: string, data: any) => void): () => void {
  try {
    const db = getDb();
    if (!db) return () => {};
    const colRef = collection(db, 'school_data');
    return onSnapshot(colRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const d = change.doc.data();
          if (d && d.table && d.data) {
            console.log(`[Firestore] Received update for table: ${d.table}`);
            try {
              const parsed = typeof d.data === 'string' ? JSON.parse(d.data) : d.data;
              onUpdate(d.table, parsed);
            } catch (e) {
              onUpdate(d.table, d.data);
            }
          }
        }
      });
    }, (error) => {
      console.warn("[Firestore] Snapshot listener error:", error);
    });
  } catch (e) {
    return () => {};
  }
}

export interface CloudSnapshotMeta {
  id: string;
  timestamp: string;
  formattedDate: string;
  createdBy: string;
  recordCount: number;
  note: string;
  tablesCount: number;
  snapshotData?: Record<string, any>;
}

/**
 * Creates a manual backup snapshot of all current database state to Firestore
 */
export async function createCloudSnapshotToFirestore(
  snapshotData: Record<string, any>,
  createdBy: string = 'Admin',
  note: string = ''
): Promise<{ success: boolean; snapshot?: CloudSnapshotMeta; error?: string }> {
  try {
    const db = getDb();
    if (!db) {
      return { success: false, error: 'Firebase Firestore is not initialized' };
    }

    const snapshotId = `snap_${Date.now()}`;
    const now = new Date();
    
    // Calculate total records
    let recordCount = 0;
    Object.values(snapshotData).forEach(val => {
      if (Array.isArray(val)) {
        recordCount += val.length;
      }
    });

    const meta: CloudSnapshotMeta = {
      id: snapshotId,
      timestamp: now.toISOString(),
      formattedDate: now.toLocaleString(),
      createdBy,
      recordCount,
      note,
      tablesCount: Object.keys(snapshotData).length
    };

    const docRef = doc(db, 'school_backups', snapshotId);
    const serializedData = JSON.stringify(snapshotData);

    await setDoc(docRef, {
      ...meta,
      snapshotData: serializedData
    });

    return { success: true, snapshot: meta };
  } catch (err: any) {
    console.error('[Firestore] Failed to create snapshot:', err);
    return { success: false, error: err.message || 'Failed to write snapshot to cloud' };
  }
}

/**
 * Fetch list of all cloud backup snapshots from Firestore
 */
export async function fetchCloudSnapshotsFromFirestore(): Promise<CloudSnapshotMeta[]> {
  try {
    const db = getDb();
    if (!db) return [];
    const colRef = collection(db, 'school_backups');
    const snap = await getDocs(colRef);
    const list: CloudSnapshotMeta[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d && d.id && d.timestamp) {
        let snapshotDataParsed: any = undefined;
        if (d.snapshotData) {
          try {
            snapshotDataParsed = typeof d.snapshotData === 'string' ? JSON.parse(d.snapshotData) : d.snapshotData;
          } catch (e) {}
        }
        list.push({
          id: d.id,
          timestamp: d.timestamp,
          formattedDate: d.formattedDate || new Date(d.timestamp).toLocaleString(),
          createdBy: d.createdBy || 'System',
          recordCount: d.recordCount || 0,
          note: d.note || '',
          tablesCount: d.tablesCount || 0,
          snapshotData: snapshotDataParsed
        });
      }
    });
    // Sort descending by timestamp
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list;
  } catch (err) {
    console.error('[Firestore] Failed to fetch snapshots:', err);
    return [];
  }
}

/**
 * Delete a specific snapshot document from Firestore
 */
export async function deleteCloudSnapshotFromFirestore(snapshotId: string): Promise<boolean> {
  try {
    const db = getDb();
    if (!db) return false;
    const docRef = doc(db, 'school_backups', snapshotId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('[Firestore] Failed to delete snapshot:', err);
    return false;
  }
}
