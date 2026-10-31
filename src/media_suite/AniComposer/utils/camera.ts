import { CAMERA_PRESETS } from '../constants';
import type { CameraMoveId, CameraTransform } from '../types';

export function easeInOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Resolve the camera transform for a shot at a given progress (0 → 1).
 * The shot zoom value scales the preset so each shot can be tightened or loosened.
 */
export function cameraAt(move: CameraMoveId, progress: number, zoom = 1): CameraTransform {
  const preset = CAMERA_PRESETS.find((p) => p.id === move) || CAMERA_PRESETS[0];
  const t = move === 'static' ? 0 : easeInOutCubic(progress);

  let jitterX = 0;
  let jitterY = 0;
  if (move === 'handheld') {
    // Deterministic pseudo-noise so preview and export match frame for frame.
    const phase = progress * Math.PI * 6;
    jitterX = Math.sin(phase * 1.7) * 0.004;
    jitterY = Math.cos(phase * 2.3) * 0.004;
  }

  return {
    scale: lerp(preset.from.scale, preset.to.scale, t) * (zoom || 1),
    x: lerp(preset.from.x, preset.to.x, t) + jitterX,
    y: lerp(preset.from.y, preset.to.y, t) + jitterY,
  };
}

export function filterString(filter: {
  grayscale: number;
  sepia: number;
  brightness: number;
  contrast: number;
  saturate: number;
  blur: number;
}): string {
  return [
    `grayscale(${filter.grayscale}%)`,
    `sepia(${filter.sepia}%)`,
    `brightness(${filter.brightness}%)`,
    `contrast(${filter.contrast}%)`,
    `saturate(${filter.saturate}%)`,
    `blur(${filter.blur}px)`,
  ].join(' ');
}
