import { describe, it, expect, vi, beforeEach } from 'vitest';

// Avoid loading the real firebase-backed storage module: stub the blob saver.
vi.mock('../services/storage', () => ({
  saveAudioBlobToIDB: vi.fn().mockResolvedValue(undefined),
}));

import { saveAudioBlobToIDB } from '../services/storage';
import { saveGlobalHistorySafely } from '../services/historyStorage';

const blobSavers = vi.mocked(saveAudioBlobToIDB);

describe('saveGlobalHistorySafely', () => {
  beforeEach(() => {
    localStorage.clear();
    blobSavers.mockClear();
  });

  it('saves lightweight history and keeps audio blob in IndexedDB for large items', () => {
    const item = { id: 'audio-1', type: 'audio', name: 'Report - ts', mimeType: 'audio/wav', data: 'x'.repeat(1000), scriptHtml: '<p>hi</p>' };
    saveGlobalHistorySafely([item]);
    const stored = JSON.parse(localStorage.getItem('global_podcast_history')!);
    expect(stored).toHaveLength(1);
    expect(blobSavers).toHaveBeenCalledWith('audio-1', item.data, item.scriptHtml);
  });

  it('does not persist full base64 audio in localStorage for large items', () => {
    const bigData = 'y'.repeat(100_000); // >50KB
    const item = { id: 'audio-2', type: 'audio', name: 'big', mimeType: 'audio/wav', data: bigData, scriptHtml: '<p>script</p>' };
    saveGlobalHistorySafely([item]);
    const stored = JSON.parse(localStorage.getItem('global_podcast_history')!);
    // Large items must not be stored inline — data must be stripped.
    expect(stored[0].data).toBeUndefined();
    expect(stored[0].hasAudioData).toBe(true);
  });

  it('truncates very long scriptHtml', () => {
    const item = { id: 'audio-3', type: 'audio', name: 'long', mimeType: 'audio/wav', data: 'short', scriptHtml: 's'.repeat(3000) };
    saveGlobalHistorySafely([item]);
    const stored = JSON.parse(localStorage.getItem('global_podcast_history')!);
    expect(stored[0].scriptHtml.length).toBeLessThanOrEqual(1050);
  });

  it('falls back to tiered storage and never throws when localStorage quota is blown', () => {
    // Force every setItem to throw (quota exceeded).
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const items = Array.from({ length: 30 }, (_, i) => ({
      id: `audio-${i}`, type: 'audio', name: `item-${i}`, mimeType: 'audio/wav', data: 'small', scriptHtml: '<p>script</p>',
    }));
    expect(() => saveGlobalHistorySafely(items)).not.toThrow();
    spy.mockRestore();
  });

  it('ignores non-array input without throwing', () => {
    expect(() => saveGlobalHistorySafely(null as any)).not.toThrow();
    expect(() => saveGlobalHistorySafely(undefined as any)).not.toThrow();
  });

  it('keeps only the top 5 records in the ultra-minimal fallback', () => {
    // Fail only tier 1 and tier 2 while letting tier 3 succeed.
    const original = Storage.prototype.setItem;
    let calls = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      calls += 1;
      if (calls <= 2) throw new Error('QuotaExceededError');
      return original.call(this, key, value);
    });
    const items = Array.from({ length: 30 }, (_, i) => ({
      id: `audio-${i}`, type: 'audio', name: `item-${i}`, mimeType: 'audio/wav', data: 'small', scriptHtml: '<p>x</p>',
    }));
    saveGlobalHistorySafely(items);
    const stored = JSON.parse(localStorage.getItem('global_podcast_history')!);
    expect(stored).toHaveLength(5);
    expect(stored[0].id).toBe('audio-0');
    vi.restoreAllMocks();
  });
});
