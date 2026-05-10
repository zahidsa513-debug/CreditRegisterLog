import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Firebase configuration is missing required fields. Please check firebase-applet-config.json");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore to force long polling, which is more reliable in some web environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Enable persistence for offline support
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled
        // in one tab at a a time.
        console.warn('Firestore persistence failed: multiple tabs open');
    } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence
        console.warn('Firestore persistence failed: browser not supported');
    }
});

// Connection test to verify Firestore is reachable
async function testConnection() {
  try {
    // Attempting a server read to "wake up" the connection
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection verified");
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      // Permission denied is actually a good sign - it means we reached the server!
      console.log("Firestore reachability verified (permission denied is expected for test doc)");
    } else if (error.message?.includes('offline') || error.code === 'unavailable') {
      console.error("Firestore Error: The client is offline or configuration is invalid.");
    }
  }
}

testConnection();

export const googleProvider = new GoogleAuthProvider();

// Initialize analytics lazily
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);
