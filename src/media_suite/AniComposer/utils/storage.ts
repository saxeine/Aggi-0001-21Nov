import { PROJECT_STORAGE_KEY, createProject, createShot } from '../constants';
import type { AniProject, Shot } from '../types';

function normaliseShot(raw: any): Shot {
  const base = createShot();
  return {
    ...base,
    ...raw,
    id: typeof raw?.id === 'string' ? raw.id : base.id,
    duration: Number.isFinite(raw?.duration) ? Math.min(600, Math.max(0.2, raw.duration)) : base.duration,
    zoom: Number.isFinite(raw?.zoom) ? raw.zoom : 1,
    transitionDuration: Number.isFinite(raw?.transitionDuration) ? raw.transitionDuration : 0.6,
    filter: { ...base.filter, ...(raw?.filter || {}) },
    captionPosition: ['top', 'center', 'bottom'].includes(raw?.captionPosition)
      ? raw.captionPosition
      : 'bottom',
  } as Shot;
}

export function normaliseProject(raw: any): AniProject {
  const base = createProject();
  const shots = Array.isArray(raw?.shots) ? raw.shots.map(normaliseShot) : base.shots;
  return {
    ...base,
    ...raw,
    id: typeof raw?.id === 'string' ? raw.id : base.id,
    name: typeof raw?.name === 'string' && raw.name.trim() ? raw.name : base.name,
    aspectRatio: ['16:9', '4:3', '1:1', '9:16', '2.39:1'].includes(raw?.aspectRatio)
      ? raw.aspectRatio
      : '16:9',
    fps: [24, 25, 30, 60].includes(raw?.fps) ? raw.fps : 30,
    shots: shots.length ? shots : base.shots,
    audio: raw?.audio && raw.audio.url ? raw.audio : null,
    updatedAt: Date.now(),
  } as AniProject;
}

export function loadProject(): AniProject | null {
  try {
    const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!stored) return null;
    return normaliseProject(JSON.parse(stored));
  } catch (error) {
    console.warn('[AniComposer] Could not restore saved project', error);
    return null;
  }
}

export function saveProject(project: AniProject): { ok: boolean; error?: string } {
  try {
    localStorage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({ ...project, updatedAt: Date.now() }),
    );
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown storage error (quota exceeded?)';
    console.warn('[AniComposer] Could not persist project', error);
    return { ok: false, error: message };
  }
}

export function clearProject() {
  try {
    localStorage.removeItem(PROJECT_STORAGE_KEY);
  } catch {
    /* noop */
  }
}
