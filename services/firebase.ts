import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// Firebase web config is injected via Vite env vars (VITE_FIREBASE_*).
// The previous tracked copy was removed from git — see .env.example.
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let db: any = null;
let auth: any = null;

export let authReadyPromise: Promise<any> = Promise.resolve();
export let firebaseReadyPromise: Promise<boolean> = Promise.resolve(false);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.warn('Firestore Permission Access warning: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export let isFirebaseAvailable = true;

export function setFirebaseAvailable(val: boolean) {
  isFirebaseAvailable = val;
}

const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.firestoreDatabaseId
);

if (!firebaseEnabled) {
  console.warn(
    "Firebase config missing (VITE_FIREBASE_* env vars). Falling back to local storage / IDB for all operations."
  );
  isFirebaseAvailable = false;
  firebaseReadyPromise = Promise.resolve(false);
} else {
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    
    let resolveAuthReady: (value: any) => void = () => {};
    authReadyPromise = new Promise((resolve) => {
      resolveAuthReady = resolve;
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          resolve(user);
          unsubscribe();
        }
      });
      // Fallback timeout to prevent infinite hang if network is slow or auth is restricted
      setTimeout(() => {
        resolve(null);
      }, 4000);
    });

    firebaseReadyPromise = (async () => {
      try {
        // 1. Try to sign in anonymously
        const user = await signInAnonymously(auth)
          .then((userCredential) => {
            console.log("Firebase: Signed in anonymously as", userCredential.user.uid);
            return userCredential.user;
          })
          .catch((error) => {
            console.warn("Firebase Auth failed (anonymous auth restricted in project settings). Using robust Local Storage / IDB fallback.", error);
            resolveAuthReady(null);
            return null;
          });

        if (!user) {
          isFirebaseAvailable = false;
          return false;
        }

        // 2. Wait for auth state to propagate
        await authReadyPromise;

        // 3. Perform a quick permissions/connection check
        const isConnected = await testConnection();
        if (!isConnected) {
          isFirebaseAvailable = false;
          return false;
        }

        isFirebaseAvailable = true;
        return true;
      } catch (e) {
        console.warn("Firebase initialization flow failed. Falling back to local storage.", e);
        isFirebaseAvailable = false;
        resolveAuthReady(null);
        return false;
      }
    })();
  } catch (error) {
    console.warn("Firebase init failed, using local storage fallback:", error);
    isFirebaseAvailable = false;
    firebaseReadyPromise = Promise.resolve(false);
  }
}

async function testConnection(): Promise<boolean> {
  if (db) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      return true;
    } catch (error: any) {
      if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
        console.warn("Firestore permissions check failed. Silently using local IDB fallback for all operations.");
        isFirebaseAvailable = false;
        return false;
      } else if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
        return false;
      }
      return false;
    }
  }
  return false;
}

export { db, auth };

