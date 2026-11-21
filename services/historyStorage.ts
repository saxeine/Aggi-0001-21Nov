import { saveAudioBlobToIDB } from './storage';

export interface HistoryRecord {
  id?: string;
  type?: string;
  name?: string;
  mimeType?: string;
  data?: string;
  scriptHtml?: string;
  hasAudioData?: boolean;
  [key: string]: any;
}

const STORAGE_KEY = 'global_podcast_history';

/**
 * Persists podcast/audio history with graceful degradation:
 *  - Full audio blobs go to IndexedDB (large WAV data is never kept in localStorage)
 *  - localStorage keeps a sanitized, lightweight history (tiers 1-3)
 *
 * Tiers:
 *  1. Sanitized list (top item keeps data if < 50KB, scriptHtml > 2000 → 1000 chars)
 *  2. Stripped data + short scriptHtml, top 15
 *  3. Top 5 metadata-only
 *  4. Remove the key entirely (never throws)
 */
export const saveGlobalHistorySafely = (history: HistoryRecord[]): void => {
  if (!Array.isArray(history)) return;

  // 1. Persist full audio data to IndexedDB so large WAV blobs are never lost
  history.forEach(item => {
    if (item?.id && item?.data && typeof item.data === 'string' && item.data.length > 500) {
      saveAudioBlobToIDB(item.id, item.data, item.scriptHtml).catch(() => {});
    }
  });

  // 2. Prepare lightweight history for localStorage (strip heavy base64 strings)
  const sanitizeItem = (item: HistoryRecord, keepData = false): HistoryRecord => ({
    ...item,
    data: keepData && item.data && typeof item.data === 'string' && item.data.length < 50000 ? item.data : undefined,
    hasAudioData: !!(item.data || item.file),
    scriptHtml: item.scriptHtml && typeof item.scriptHtml === 'string' && item.scriptHtml.length > 2000
      ? item.scriptHtml.substring(0, 1000) + '<!-- truncated for storage -->'
      : item.scriptHtml
  });

  const dispatchUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('global_podcast_history_updated'));
    }
  };

  // Tier 1: sanitized history (keeps data on the top item when reasonably small)
  try {
    const sanitized = history.slice(0, 30).map((item, idx) => sanitizeItem(item, idx === 0));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    dispatchUpdated();
    return;
  } catch (e1) {
    console.warn('Storage quota exceeded in Tier 1. Stripping all audio payloads from localStorage history...');
  }

  // Tier 2: strip ALL data and truncate scriptHtml for all items
  try {
    const minimal = history.slice(0, 15).map(item => ({
      id: item.id,
      type: item.type,
      name: item.name,
      mimeType: item.mimeType,
      hasAudioData: true,
      scriptHtml: item.scriptHtml && typeof item.scriptHtml === 'string' ? item.scriptHtml.substring(0, 300) : undefined
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    dispatchUpdated();
    return;
  } catch (e2) {
    console.warn('Storage quota exceeded in Tier 2. Keeping top 5 minimal records...');
  }

  // Tier 3: top 5 lightweight metadata records
  try {
    const ultraMinimal = history.slice(0, 5).map(item => ({
      id: item.id,
      type: item.type,
      name: item.name,
      mimeType: item.mimeType,
      hasAudioData: true
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ultraMinimal));
    dispatchUpdated();
  } catch (e3) {
    // Tier 4: remove the key if completely blocked
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e4) {
      /* completely silent failover to prevent unhandled crash */
    }
  }
};

export const loadGlobalHistory = (): HistoryRecord[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Failed to load global podcast history:', err);
    return [];
  }
};
