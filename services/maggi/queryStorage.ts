import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  firebaseReadyPromise,
  handleFirestoreError,
  isFirebaseAvailable,
  OperationType,
} from '../firebase';
import { SavedMaggiQuery } from './types';

const COLLECTION_NAME = 'maggi_queries';

const toMillis = (val: unknown, fallback: number): number => {
  if (typeof val === 'number') return val;
  if (val && typeof (val as Timestamp).toMillis === 'function') {
    return (val as Timestamp).toMillis();
  }
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
};

const safeId = (id: string): string => {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned || `mq-${Date.now()}`;
};

export const syncSavedQueryToFirestore = async (
  entry: SavedMaggiQuery,
  isUpdate = false,
): Promise<void> => {
  if (typeof window === 'undefined' || !db || !isFirebaseAvailable) return;
  const ready = await firebaseReadyPromise;
  const uid = auth?.currentUser?.uid;
  if (!ready || !isFirebaseAvailable || !uid) return;

  const docId = safeId(entry.id);
  try {
    if (isUpdate) {
      await updateDoc(doc(db, COLLECTION_NAME, docId), {
        title: entry.title.slice(0, 240),
        pinned: !!entry.pinned,
        updatedAt: serverTimestamp(),
      });
    } else {
      const payload: Record<string, unknown> = {
        id: docId,
        userId: uid,
        title: (entry.title || entry.query || 'Saved Query').slice(0, 240),
        query: entry.query.slice(0, 10000),
        answer: entry.answer.slice(0, 50000),
        pinned: !!entry.pinned,
        citations: (entry.citations || []).slice(0, 25).map((c) => ({
          marker: c.marker,
          chunkId: c.chunkId,
          docId: c.docId,
          docName: String(c.docName || '').slice(0, 200),
          snippet: String(c.snippet || '').slice(0, 400),
          score: Number(c.score || 0),
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (entry.workspaceName) payload.workspaceName = entry.workspaceName.slice(0, 200);
      if (entry.retrieval) payload.retrieval = entry.retrieval;
      if (entry.usage?.model) payload.model = entry.usage.model.slice(0, 120);
      if (entry.usage?.provider) payload.provider = entry.usage.provider.slice(0, 60);
      if (entry.usage?.routedVia) payload.routedVia = entry.usage.routedVia.slice(0, 160);

      await setDoc(doc(db, COLLECTION_NAME, docId), payload);
    }
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      try {
        handleFirestoreError(error, isUpdate ? OperationType.UPDATE : OperationType.CREATE, `${COLLECTION_NAME}/${docId}`);
      } catch (diag) {
        console.warn('[MAGGI] Firestore saved query sync deferred:', diag);
      }
    } else {
      console.warn('[MAGGI] Firestore saved query sync failed:', error);
    }
  }
};

export const deleteSavedQueryFromFirestore = async (id: string): Promise<void> => {
  if (typeof window === 'undefined' || !db || !isFirebaseAvailable) return;
  const ready = await firebaseReadyPromise;
  const uid = auth?.currentUser?.uid;
  if (!ready || !isFirebaseAvailable || !uid) return;

  const docId = safeId(id);
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, docId));
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      try {
        handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${docId}`);
      } catch (diag) {
        console.warn('[MAGGI] Firestore saved query delete deferred:', diag);
      }
    } else {
      console.warn('[MAGGI] Firestore saved query delete failed:', error);
    }
  }
};

export const loadSavedQueriesFromFirestore = async (): Promise<SavedMaggiQuery[]> => {
  if (typeof window === 'undefined' || !db || !isFirebaseAvailable) return [];
  const ready = await firebaseReadyPromise;
  const uid = auth?.currentUser?.uid;
  if (!ready || !isFirebaseAvailable || !uid) return [];

  try {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', uid));
    const snap = await getDocs(q);
    const items: SavedMaggiQuery[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Record<string, any>;
      const now = Date.now();
      items.push({
        id: data.id || docSnap.id,
        title: data.title || data.query || 'Saved Query',
        query: data.query || '',
        answer: data.answer || '',
        pinned: !!data.pinned,
        workspaceName: data.workspaceName,
        citations: Array.isArray(data.citations) ? data.citations : [],
        retrieval: data.retrieval,
        usage: (data.model || data.provider || data.routedVia)
          ? {
            model: data.model,
            provider: data.provider,
            routedVia: data.routedVia,
          }
          : undefined,
        createdAt: toMillis(data.createdAt, now),
        updatedAt: toMillis(data.updatedAt, now),
      });
    });
    return items;
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      try {
        handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      } catch (diag) {
        console.warn('[MAGGI] Firestore saved queries list deferred:', diag);
      }
    } else {
      console.warn('[MAGGI] Firestore saved queries list failed:', error);
    }
    return [];
  }
};
