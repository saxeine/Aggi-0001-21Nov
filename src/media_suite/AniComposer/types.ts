export type AspectRatioKey = '16:9' | '4:3' | '1:1' | '9:16' | '2.39:1';

export type CameraMoveId =
  | 'static'
  | 'push_in'
  | 'pull_out'
  | 'pan_left'
  | 'pan_right'
  | 'tilt_up'
  | 'tilt_down'
  | 'diagonal_tl'
  | 'diagonal_br'
  | 'handheld';

export type TransitionId =
  | 'none'
  | 'fade'
  | 'dip_black'
  | 'wipe_left'
  | 'wipe_right'
  | 'slide_left'
  | 'slide_up'
  | 'zoom'
  | 'blur';

export interface CameraTransform {
  scale: number;
  x: number;
  y: number;
}

export interface ShotFilter {
  grayscale: number;
  sepia: number;
  brightness: number;
  contrast: number;
  saturate: number;
  blur: number;
}

export interface Shot {
  id: string;
  title: string;
  imageUrl: string | null;
  mimeType?: string;
  duration: number;
  camera: CameraMoveId;
  zoom: number;
  transition: TransitionId;
  transitionDuration: number;
  caption: string;
  captionPosition: 'top' | 'center' | 'bottom';
  notes: string;
  backgroundColor: string;
  filter: ShotFilter;
}

export interface AudioTrack {
  url: string;
  name: string;
  volume: number;
}

export interface AniProject {
  id: string;
  name: string;
  aspectRatio: AspectRatioKey;
  fps: number;
  shots: Shot[];
  audio: AudioTrack | null;
  showCaptions: boolean;
  showSafeFrame: boolean;
  showTimecode: boolean;
  background: string;
  updatedAt: number;
}

export interface MediaOption {
  id: string;
  name: string;
  url: string;
  mimeType: string;
}
