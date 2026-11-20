import { Session } from '../types';
import { db, handleFirestoreError, OperationType, firebaseReadyPromise, isFirebaseAvailable } from './firebase';
import { collection, getDocs, doc, writeBatch, setDoc, deleteDoc } from 'firebase/firestore';

const COLLECTION_NAME = 'sessions';
const IDB_NAME = 'GeminiMediaAggregatorDB';
const IDB_STORE = 'sessions';
const IDB_AUDIO_STORE = 'audio_blobs';
const IDB_VERSION = 2;

// --- INDEXED DB HELPERS (Fallback & Large Asset Storage) ---
const openIDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(IDB_NAME, IDB_VERSION);
        request.onupgradeneeded = (e) => {
            const d = (e.target as IDBOpenDBRequest).result;
            if (!d.objectStoreNames.contains(IDB_STORE)) {
                d.createObjectStore(IDB_STORE, { keyPath: 'id' });
            }
            if (!d.objectStoreNames.contains(IDB_AUDIO_STORE)) {
                d.createObjectStore(IDB_AUDIO_STORE, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const saveAudioBlobToIDB = async (id: string, data: string, scriptHtml?: string): Promise<void> => {
    try {
        const idb = await openIDB();
        if (!idb.objectStoreNames.contains(IDB_AUDIO_STORE)) return;
        const tx = idb.transaction(IDB_AUDIO_STORE, 'readwrite');
        const store = tx.objectStore(IDB_AUDIO_STORE);
        store.put({ id, data, scriptHtml, updatedAt: Date.now() });
        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.warn("Could not save audio blob to IndexedDB:", e);
    }
};

export const loadAudioBlobFromIDB = async (id: string): Promise<{ data?: string, scriptHtml?: string } | null> => {
    try {
        const idb = await openIDB();
        if (!idb.objectStoreNames.contains(IDB_AUDIO_STORE)) return null;
        const tx = idb.transaction(IDB_AUDIO_STORE, 'readonly');
        const store = tx.objectStore(IDB_AUDIO_STORE);
        const req = store.get(id);
        return new Promise((resolve) => {
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch (e) {
        return null;
    }
};

// --- GENERAL FIRESTORE UTILITIES FOR ALL ASSETS ---

/**
 * Saves a single document to any Firestore collection
 */
export const saveDocToFirestore = async (collectionName: string, docId: string, data: any): Promise<void> => {
  if (db && isFirebaseAvailable) {
    const isReady = await firebaseReadyPromise;
    if (!isReady || !isFirebaseAvailable) return;
    try {
      // Remove any undefined fields to prevent Firestore serialization errors
      const cleanData = JSON.parse(JSON.stringify(data));
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, cleanData);
      console.log(`Successfully persisted ${docId} in Firebase collection: ${collectionName}`);
    } catch (e: any) {
      if (e?.code === 'permission-denied' || e?.message?.includes('permission')) {
        try {
          handleFirestoreError(e, OperationType.WRITE, `${collectionName}/${docId}`);
        } catch (diagnosticError) {
          console.warn(`Firestore write blocked by permissions for ${collectionName}/${docId}:`, e);
        }
      } else {
        console.warn(`Firebase write deferred/failed for ${collectionName}/${docId}:`, e);
      }
    }
  }
};

/**
 * Deletes a single document from any Firestore collection
 */
export const deleteDocFromFirestore = async (collectionName: string, docId: string): Promise<void> => {
  if (db && isFirebaseAvailable) {
    const isReady = await firebaseReadyPromise;
    if (!isReady || !isFirebaseAvailable) return;
    try {
      await deleteDoc(doc(db, collectionName, docId));
      console.log(`Successfully deleted ${docId} from Firebase collection: ${collectionName}`);
    } catch (e: any) {
      if (e?.code === 'permission-denied' || e?.message?.includes('permission')) {
        try {
          handleFirestoreError(e, OperationType.DELETE, `${collectionName}/${docId}`);
        } catch (diagnosticError) {
          console.warn(`Firestore delete blocked by permissions for ${collectionName}/${docId}:`, e);
        }
      } else {
        console.warn(`Firebase delete deferred/failed for ${collectionName}/${docId}:`, e);
      }
    }
  }
};

/**
 * Reads all documents from any Firestore collection
 */
export const getDocsFromFirestore = async (collectionName: string): Promise<any[]> => {
  if (db && isFirebaseAvailable) {
    const isReady = await firebaseReadyPromise;
    if (!isReady || !isFirebaseAvailable) return [];
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const results: any[] = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });
      return results;
    } catch (e: any) {
      if (e?.code === 'permission-denied' || e?.message?.includes('permission')) {
        try {
          handleFirestoreError(e, OperationType.LIST, collectionName);
        } catch (diagnosticError) {
          console.warn(`Firestore read blocked by permissions for ${collectionName}:`, e);
        }
      } else {
        console.warn(`Firebase read deferred/failed for ${collectionName}:`, e);
      }
      return [];
    }
  }
  return [];
};


/**
 * Reads a single document from any Firestore collection
 */
export const getDocFromFirestore = async (collectionName: string, docId: string): Promise<any> => {
  if (db && isFirebaseAvailable) {
    const isReady = await firebaseReadyPromise;
    if (!isReady || !isFirebaseAvailable) return null;
    try {
      const { getDoc } = await import('firebase/firestore');
      const docSnap = await getDoc(doc(db, collectionName, docId));
      if (docSnap.exists()) {
        return docSnap.data();
      }
    } catch (e: any) {
      if (e?.code === 'permission-denied' || e?.message?.includes('permission')) {
        console.warn(`Firestore read blocked by permissions for ${collectionName}/${docId}`);
      } else {
        console.warn(`Firebase read deferred/failed for ${collectionName}/${docId}:`, e);
      }
    }
  }
  return null;
};

// --- PREFERENCES STORAGE FUNCTIONS ---
export const saveUserPreference = async (key: string, data: any): Promise<void> => {
  try {
    localStorage.setItem(`pref_${key}`, JSON.stringify(data));
    await saveDocToFirestore('user_preferences', key, { data });
  } catch (e) {
    console.error("Error saving preference", e);
  }
};

export const loadUserPreference = async (key: string): Promise<any> => {
  try {
    const cloudData = await getDocFromFirestore('user_preferences', key);
    if (cloudData && cloudData.data) {
       localStorage.setItem(`pref_${key}`, JSON.stringify(cloudData.data));
       return cloudData.data;
    }
    const local = localStorage.getItem(`pref_${key}`);
    if (local) return JSON.parse(local);
  } catch (e) {
    console.error("Error loading preference", e);
  }
  return null;
};

// --- SESSIONS STORAGE FUNCTIONS ---

export const saveSessionsToDB = async (sessions: Session[]): Promise<void> => {
  // 1. Try Firebase if available
  if (db && isFirebaseAvailable) {
      const isReady = await firebaseReadyPromise;
      if (isReady && isFirebaseAvailable) {
          try {
            const batch = writeBatch(db);
            sessions.forEach(session => {
                const docRef = doc(db!, COLLECTION_NAME, session.id);
                
                // Prepare object with primitive/serializable types
                // Explicitly convert Date objects to strings for Firestore compatibility in JSON
                const preCleanSession = {
                    ...session,
                    history: session.history.map(msg => ({
                        ...msg,
                        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
                    })),
                    mindMapData: session.mindMapData || null,
                    geminiCacheName: session.geminiCacheName || null,
                    geminiCacheHash: session.geminiCacheHash || null
                };

                // Deep clean to remove any lingering 'undefined' values which Firestore rejects
                const cleanSession = JSON.parse(JSON.stringify(preCleanSession));

                batch.set(docRef, cleanSession);
            });
            await batch.commit();
            console.log("Sessions synced to Firestore");
            return; 
          } catch (error: any) {
            if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
              try {
                handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
              } catch (diagnosticError) {
                console.warn("Firestore permissions prevented session save, falling back to local IDB", diagnosticError);
              }
            } else {
              console.warn("Firestore sessions sync failed, falling back to local IDB", error);
            }
          }
      }
  }

  // 2. Fallback to IndexedDB (Local)
  try {
      const idb = await openIDB();
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      
      // We overwrite specific items to ensure local state matches app state
      sessions.forEach(s => store.put(s));
      
      await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
      });
      console.log("Sessions saved to local IndexedDB");
  } catch (e) {
      console.error("IndexedDB Save Error:", e);
  }
};

export const loadSessionsFromDB = async (): Promise<Session[]> => {
  // 1. Try Firebase if available
  if (db && isFirebaseAvailable) {
      const isReady = await firebaseReadyPromise;
      if (isReady && isFirebaseAvailable) {
          try {
            const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
            const sessions: Session[] = [];
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              const history = (data.history || []).map((msg: any) => ({
                  ...msg,
                  timestamp: new Date(msg.timestamp)
              }));
              sessions.push({
                  id: data.id,
                  name: data.name,
                  mediaItems: data.mediaItems || [],
                  selectedMediaIds: data.selectedMediaIds || [],
                  history: history,
                  suggestions: data.suggestions || [],
                  createdAt: data.createdAt,
                  geminiCacheName: data.geminiCacheName,
                  geminiCacheHash: data.geminiCacheHash,
                  mindMapData: data.mindMapData
              } as Session);
            });
            
            if (sessions.length > 0) {
                console.log("Loaded sessions from Firestore");
                return sessions.sort((a, b) => b.createdAt - a.createdAt);
            }
          } catch (error: any) {
             if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
               try {
                 handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
               } catch (diagnosticError) {
                 console.warn("Firestore permissions prevented session load, falling back to local IDB", diagnosticError);
               }
             } else {
               console.warn("Firestore sessions load failed, falling back to local IDB", error);
             }
          }
      }
  }

  // 2. Fallback to IndexedDB (Local)
  try {
      const idb = await openIDB();
      return new Promise((resolve, reject) => {
          const tx = idb.transaction(IDB_STORE, 'readonly');
          const store = tx.objectStore(IDB_STORE);
          const request = store.getAll();
          request.onsuccess = () => {
              const res = request.result || [];
              const processed = res.map((s: any) => ({
                  ...s,
                  history: s.history.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
               }));
              console.log("Loaded sessions from local IndexedDB");
              resolve(processed.sort((a: any, b: any) => b.createdAt - a.createdAt));
          };
          request.onerror = () => reject(request.error);
      });
  } catch (e) {
      console.error("IndexedDB Load Error:", e);
      return [];
  }
};
