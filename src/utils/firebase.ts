import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  Firestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import config from "../../firebase-applet-config.json";

let dbInstance: Firestore | null = null;

export const getDb = (): Firestore => {
  if (!dbInstance) {
    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    };

    const app = initializeApp(firebaseConfig);
    // Initialize with persistent cache to handle offline/connectivity issues gracefully
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  }
  return dbInstance;
};
