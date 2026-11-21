/**
 * Shared global podcast-history writer (extracted from App.tsx).
 * Appends an item to the global history library (deduped by id).
 */
import { MediaItem } from '../types';
import { saveGlobalHistorySafely } from '../services/historyStorage';

const STORAGE_KEY = 'global_podcast_history';

export function savePodcastToHistory(item: MediaItem): void {
  try {
    const savedGlobal = localStorage.getItem(STORAGE_KEY);
    let globalHistory = savedGlobal ? JSON.parse(savedGlobal) : [];
    globalHistory = [item, ...globalHistory.filter((h: any) => h.id !== item.id)];
    saveGlobalHistorySafely(globalHistory);
  } catch (err) {
    console.error('Failed to save to global podcast history:', err);
  }
}
