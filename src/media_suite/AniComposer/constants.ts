import type {
  AniProject,
  AspectRatioKey,
  CameraMoveId,
  CameraTransform,
  Shot,
  ShotFilter,
  TransitionId,
} from './types';

export interface AspectConfig {
  label: string;
  w: number;
  h: number;
}

export const ASPECT_RATIOS: Record<AspectRatioKey, AspectConfig> = {
  '16:9': { label: '16:9 Widescreen', w: 16, h: 9 },
  '4:3': { label: '4:3 Academy', w: 4, h: 3 },
  '1:1': { label: '1:1 Square', w: 1, h: 1 },
  '9:16': { label: '9:16 Vertical', w: 9, h: 16 },
  '2.39:1': { label: '2.39:1 Scope', w: 239, h: 100 },
};

export const ASPECT_KEYS: AspectRatioKey[] = ['16:9', '4:3', '1:1', '9:16', '2.39:1'];

export interface CameraPreset {
  id: CameraMoveId;
  label: string;
  hint: string;
  from: CameraTransform;
  to: CameraTransform;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'static',
    label: 'Locked Off',
    hint: 'No movement',
    from: { scale: 1, x: 0, y: 0 },
    to: { scale: 1, x: 0, y: 0 },
  },
  {
    id: 'push_in',
    label: 'Push In',
    hint: 'Slow dolly toward subject',
    from: { scale: 1.02, x: 0, y: 0 },
    to: { scale: 1.24, x: 0, y: 0 },
  },
  {
    id: 'pull_out',
    label: 'Pull Out',
    hint: 'Reveal the frame',
    from: { scale: 1.24, x: 0, y: 0 },
    to: { scale: 1.02, x: 0, y: 0 },
  },
  {
    id: 'pan_left',
    label: 'Pan Left',
    hint: 'Drift left across plate',
    from: { scale: 1.14, x: 0.07, y: 0 },
    to: { scale: 1.14, x: -0.07, y: 0 },
  },
  {
    id: 'pan_right',
    label: 'Pan Right',
    hint: 'Drift right across plate',
    from: { scale: 1.14, x: -0.07, y: 0 },
    to: { scale: 1.14, x: 0.07, y: 0 },
  },
  {
    id: 'tilt_up',
    label: 'Tilt Up',
    hint: 'Reveal height',
    from: { scale: 1.14, x: 0, y: 0.07 },
    to: { scale: 1.14, x: 0, y: -0.07 },
  },
  {
    id: 'tilt_down',
    label: 'Tilt Down',
    hint: 'Settle down the frame',
    from: { scale: 1.14, x: 0, y: -0.07 },
    to: { scale: 1.14, x: 0, y: 0.07 },
  },
  {
    id: 'diagonal_tl',
    label: 'Diagonal Up-Left',
    hint: 'Roaming diagonal move',
    from: { scale: 1.2, x: 0.06, y: 0.06 },
    to: { scale: 1.2, x: -0.06, y: -0.06 },
  },
  {
    id: 'diagonal_br',
    label: 'Diagonal Down-Right',
    hint: 'Roaming diagonal move',
    from: { scale: 1.2, x: -0.06, y: -0.06 },
    to: { scale: 1.2, x: 0.06, y: 0.06 },
  },
  {
    id: 'handheld',
    label: 'Handheld Drift',
    hint: 'Organic micro-movement',
    from: { scale: 1.08, x: 0.015, y: 0.01 },
    to: { scale: 1.1, x: -0.015, y: -0.012 },
  },
];

export interface TransitionPreset {
  id: TransitionId;
  label: string;
}

export const TRANSITIONS: TransitionPreset[] = [
  { id: 'none', label: 'Cut' },
  { id: 'fade', label: 'Cross Fade' },
  { id: 'dip_black', label: 'Dip to Black' },
  { id: 'wipe_left', label: 'Wipe →' },
  { id: 'wipe_right', label: 'Wipe ←' },
  { id: 'slide_left', label: 'Slide →' },
  { id: 'slide_up', label: 'Slide ↑' },
  { id: 'zoom', label: 'Zoom Blend' },
  { id: 'blur', label: 'Defocus Blend' },
];

export const DEFAULT_FILTER: ShotFilter = {
  grayscale: 0,
  sepia: 0,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  blur: 0,
};

export const PROJECT_STORAGE_KEY = 'anicomposer_project_v1';

const uid = () => Math.random().toString(36).slice(2, 10);

export function createShot(overrides: Partial<Shot> = {}): Shot {
  return {
    id: uid(),
    title: 'New Shot',
    imageUrl: null,
    duration: 3,
    camera: 'static',
    zoom: 1,
    transition: 'fade',
    transitionDuration: 0.6,
    caption: '',
    captionPosition: 'bottom',
    notes: '',
    backgroundColor: '#0b0b0e',
    filter: { ...DEFAULT_FILTER },
    ...overrides,
  };
}

export function createProject(overrides: Partial<AniProject> = {}): AniProject {
  return {
    id: uid(),
    name: 'Untitled Animatic',
    aspectRatio: '16:9',
    fps: 30,
    shots: [createShot({ title: 'Shot 01' })],
    audio: null,
    showCaptions: true,
    showSafeFrame: false,
    showTimecode: false,
    background: '#08080b',
    updatedAt: Date.now(),
    ...overrides,
  };
}

/** Format seconds as MM:SS.ff for the timecode overlay. */
export function formatTimecode(seconds: number, fps = 30): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const frames = Math.floor((safe % 1) * fps);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}.${pad(frames)}`;
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds)) return '0.0s';
  return `${seconds.toFixed(1)}s`;
}

/** Resolution used for preview rendering and video export. */
export function resolutionFor(aspect: AspectRatioKey, longEdge: number): { width: number; height: number } {
  const cfg = ASPECT_RATIOS[aspect] || ASPECT_RATIOS['16:9'];
  const ratio = cfg.w / cfg.h;
  if (ratio >= 1) {
    const width = Math.round(longEdge);
    return { width, height: Math.max(2, Math.round(width / ratio)) };
  }
  const height = Math.round(longEdge);
  return { width: Math.max(2, Math.round(height * ratio)), height };
}
