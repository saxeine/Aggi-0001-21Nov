export interface Slide {
  id: string;
  sceneNo: number;
  shotNo: number;
  action: string;
  dialogue: string;
  duration: number;
  imageUrl: string;
  notes: string;
  colorLabel?: string;
  shotType?: string;
  imageScale?: number;
  fitMode?: 'contain' | 'cover';
  audioUrl?: string;
}

export interface AspectRatioConfig {
  label: string;
  canvasWidth: number;
  canvasHeight: number;
}

export interface PlaybackTrack {
  id: string;
  name: string;
  timings: Record<string, number>; // slideId -> duration in ms
  createdAt: string;
}

export type AspectRatioKey = '16:9' | '4:3' | '1:1' | '9:16' | '2.39:1';

export type TransitionStyle = 'none' | 'fade' | 'wipe' | 'zoom' | 'slideUp' | 'blur';

export type ShotType =
  | 'WS'
  | 'MS'
  | 'CU'
  | 'ECU'
  | 'OTS'
  | 'POV'
  | 'INSERT'
  | 'EST'
  | 'TWO'
  | 'CUSTOM';

export const COLOR_LABELS = [
  { id: 'none', color: 'transparent', label: 'None' },
  { id: 'red', color: '#ef4444', label: 'Red' },
  { id: 'orange', color: '#f97316', label: 'Orange' },
  { id: 'yellow', color: '#eab308', label: 'Yellow' },
  { id: 'green', color: '#22c55e', label: 'Green' },
  { id: 'blue', color: '#3b82f6', label: 'Blue' },
  { id: 'purple', color: '#a855f7', label: 'Purple' },
  { id: 'pink', color: '#ec4899', label: 'Pink' },
] as const;

export const SHOT_TYPES: { id: ShotType; label: string }[] = [
  { id: 'WS', label: 'Wide Shot' },
  { id: 'MS', label: 'Medium Shot' },
  { id: 'CU', label: 'Close-Up' },
  { id: 'ECU', label: 'Extreme CU' },
  { id: 'OTS', label: 'Over the Shoulder' },
  { id: 'POV', label: 'Point of View' },
  { id: 'INSERT', label: 'Insert' },
  { id: 'EST', label: 'Establishing' },
  { id: 'TWO', label: 'Two Shot' },
  { id: 'CUSTOM', label: 'Custom' },
];
