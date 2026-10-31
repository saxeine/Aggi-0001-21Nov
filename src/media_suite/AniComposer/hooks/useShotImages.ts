import { useEffect, useRef, useState } from 'react';
import type { Shot } from '../types';
import type { ImageMap } from '../utils/render';

/**
 * Loads every shot plate into an HTMLImageElement map keyed by shot id.
 * Elements are cached by URL so re-ordering / renaming never reloads a plate.
 */
export function useShotImages(shots: Shot[]): { images: ImageMap; loading: boolean } {
  const [images, setImages] = useState<ImageMap>({});
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const signature = shots
    .map((shot) => {
      const url = shot.imageUrl || '';
      return `${shot.id}:${url.length}:${url.slice(0, 32)}:${url.slice(-32)}`;
    })
    .join('|');

  useEffect(() => {
    let cancelled = false;
    const cache = cacheRef.current;
    const activeIds = new Set<string>();
    let pending = 0;

    shots.forEach((shot) => {
      if (!shot.imageUrl) return;
      activeIds.add(shot.id);
      const cached = cache.get(shot.imageUrl);
      if (cached && cached.complete && cached.naturalWidth) {
        setImages((prev) => (prev[shot.id] === cached ? prev : { ...prev, [shot.id]: cached }));
        return;
      }
      pending += 1;
      const img = new Image();
      if (!shot.imageUrl.startsWith('data:') && !shot.imageUrl.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        cache.set(shot.imageUrl as string, img);
        pending = Math.max(0, pending - 1);
        if (cancelled) return;
        setImages((prev) => ({ ...prev, [shot.id]: img }));
        if (pending === 0) setLoading(false);
      };
      img.onerror = () => {
        pending = Math.max(0, pending - 1);
        if (cancelled) return;
        if (pending === 0) setLoading(false);
      };
      img.src = shot.imageUrl;
    });

    // Drop references for shots that no longer exist to keep memory bounded.
    setImages((prev) => {
      const next: ImageMap = {};
      Object.keys(prev).forEach((key) => {
        if (activeIds.has(key)) next[key] = prev[key];
      });
      return next;
    });

    if (pending > 0) setLoading(true);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return { images, loading };
}
