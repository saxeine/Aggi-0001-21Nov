import { AspectRatioConfig, AspectRatioKey } from './types';

export const ASPECT_RATIOS: Record<AspectRatioKey, AspectRatioConfig> = {
  '16:9': { label: '16:9 Widescreen', canvasWidth: 560, canvasHeight: 315 },
  '4:3': { label: '4:3 Standard', canvasWidth: 480, canvasHeight: 360 },
  '1:1': { label: '1:1 Square', canvasWidth: 400, canvasHeight: 400 },
  '9:16': { label: '9:16 Vertical', canvasWidth: 280, canvasHeight: 498 },
  '2.39:1': { label: '2.39:1 Cinemascope', canvasWidth: 600, canvasHeight: 251 },
};

export const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
  'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
  'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #84cc16 100%)',
  'linear-gradient(135deg, #1e293b 0%, #374151 50%, #1e293b 100%)',
];
