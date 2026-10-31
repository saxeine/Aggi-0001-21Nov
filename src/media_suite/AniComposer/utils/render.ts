import { ASPECT_RATIOS } from '../constants';
import type { AniProject, Shot } from '../types';
import { cameraAt, filterString } from './camera';

export type ImageMap = Record<string, HTMLImageElement | undefined>;

export interface FrameSurface {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

export interface FrameOptions {
  project: AniProject;
  images: ImageMap;
  time: number;
  /** When true the safe-frame / timecode guides are skipped (used while recording). */
  hideGuides?: boolean;
}

export function shotStartTimes(shots: Shot[]): number[] {
  const starts: number[] = [];
  let cursor = 0;
  for (const shot of shots) {
    starts.push(cursor);
    cursor += Math.max(0.1, shot.duration);
  }
  return starts;
}

export function totalDuration(shots: Shot[]): number {
  return shots.reduce((acc, shot) => acc + Math.max(0.1, shot.duration), 0);
}

export function shotIndexAt(shots: Shot[], time: number): number {
  const starts = shotStartTimes(shots);
  let index = 0;
  for (let i = 0; i < shots.length; i++) {
    if (time >= starts[i] - 1e-6) index = i;
  }
  return index;
}

let scratchA: HTMLCanvasElement | null = null;
let scratchB: HTMLCanvasElement | null = null;

function getScratch(which: 'a' | 'b', width: number, height: number): HTMLCanvasElement {
  let canvas = which === 'a' ? scratchA : scratchB;
  if (!canvas) {
    canvas = document.createElement('canvas');
    if (which === 'a') scratchA = canvas;
    else scratchB = canvas;
  }
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return canvas;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split(/\n/);
  const lines: string[] = [];
  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line) lines.push(line);
  });
  return lines;
}

function drawCaption(surface: FrameSurface, shot: Shot) {
  const { ctx, width, height } = surface;
  const text = shot.caption.trim();
  if (!text) return;

  const fontSize = Math.round(height * 0.048);
  const padding = Math.round(height * 0.022);
  const maxWidth = width * 0.84;

  ctx.save();
  ctx.font = `600 ${fontSize}px "Inter", "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = wrapLines(ctx, text, maxWidth);
  const lineHeight = fontSize * 1.25;
  const blockHeight = lines.length * lineHeight + padding * 1.1;
  const widest = Math.min(
    maxWidth,
    Math.max(...lines.map((line) => ctx.measureText(line).width), fontSize * 4),
  );
  const boxWidth = widest + padding * 2;

  let centerY: number;
  if (shot.captionPosition === 'top') centerY = padding + blockHeight / 2;
  else if (shot.captionPosition === 'center') centerY = height / 2;
  else centerY = height - padding - blockHeight / 2;

  const boxX = (width - boxWidth) / 2;
  const boxY = centerY - blockHeight / 2;

  ctx.fillStyle = 'rgba(6, 8, 14, 0.62)';
  roundRect(ctx, boxX, boxY, boxWidth, blockHeight, height * 0.014);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = Math.max(1, height * 0.0018);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = height * 0.012;
  lines.forEach((line, index) => {
    const y = boxY + padding * 0.55 + lineHeight * (index + 0.5);
    ctx.fillText(line, width / 2, y);
  });
  ctx.restore();
}

function drawPlaceholder(surface: FrameSurface, shot: Shot, index: number) {
  const { ctx, width, height } = surface;
  ctx.save();
  ctx.fillStyle = shot.backgroundColor || '#0b0b0e';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.setLineDash([height * 0.02, height * 0.014]);
  ctx.lineWidth = Math.max(1, height * 0.003);
  ctx.strokeRect(width * 0.08, height * 0.08, width * 0.84, height * 0.84);
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(height * 0.055)}px "Inter", Arial, sans-serif`;
  ctx.fillText(`SHOT ${String(index + 1).padStart(2, '0')}`, width / 2, height / 2 - height * 0.02);
  ctx.font = `500 ${Math.round(height * 0.03)}px "Inter", Arial, sans-serif`;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
  ctx.fillText('No plate attached — import an image', width / 2, height / 2 + height * 0.05);
  ctx.restore();
}

/** Paint a single shot into the given surface (full frame, no overlays). */
export function paintShot(
  surface: FrameSurface,
  shot: Shot,
  progress: number,
  project: AniProject,
  images: ImageMap,
  index = 0,
  options: { captions?: boolean } = {},
) {
  const { ctx, width, height } = surface;
  const img = images[shot.id];

  if (!img || !img.complete || !img.naturalWidth) {
    drawPlaceholder(surface, shot, index);
  } else {
    ctx.save();
    ctx.fillStyle = shot.backgroundColor || project.background;
    ctx.fillRect(0, 0, width, height);

    const cam = cameraAt(shot.camera, Math.min(1, Math.max(0, progress)), shot.zoom);
    const cover = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const scale = cover * cam.scale;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const drawX = (width - drawW) / 2 + cam.x * width;
    const drawY = (height - drawH) / 2 + cam.y * height;

    ctx.filter = filterString(shot.filter);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.filter = 'none';
    ctx.restore();
  }

  if (project.showCaptions && options.captions !== false) drawCaption(surface, shot);
}

function drawTransition(
  surface: FrameSurface,
  previous: Shot,
  current: Shot,
  progress: number,
  project: AniProject,
  images: ImageMap,
  prevIndex: number,
  currentIndex: number,
) {
  const { ctx, width, height } = surface;
  const p = Math.min(1, Math.max(0, progress));
  const eased = 1 - Math.pow(1 - p, 2);

  const prevCanvas = getScratch('a', width, height);
  const prevCtx = prevCanvas.getContext('2d');
  const curCanvas = getScratch('b', width, height);
  const curCtx = curCanvas.getContext('2d');
  if (!prevCtx || !curCtx) return;

  prevCtx.setTransform(1, 0, 0, 1, 0, 0);
  prevCtx.clearRect(0, 0, width, height);
  paintShot(
    { ctx: prevCtx, width, height },
    previous,
    1,
    project,
    images,
    prevIndex,
    { captions: false },
  );

  curCtx.setTransform(1, 0, 0, 1, 0, 0);
  curCtx.clearRect(0, 0, width, height);
  paintShot(
    { ctx: curCtx, width, height },
    current,
    p * 0.25,
    project,
    images,
    currentIndex,
    { captions: false },
  );

  ctx.save();
  ctx.fillStyle = project.background;
  ctx.fillRect(0, 0, width, height);

  switch (current.transition) {
    case 'fade': {
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.globalAlpha = eased;
      ctx.drawImage(curCanvas, 0, 0);
      break;
    }
    case 'dip_black': {
      if (p < 0.5) {
        ctx.globalAlpha = 1 - p * 2;
        ctx.drawImage(prevCanvas, 0, 0);
      } else {
        ctx.globalAlpha = (p - 0.5) * 2;
        ctx.drawImage(curCanvas, 0, 0);
      }
      break;
    }
    case 'wipe_left': {
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.beginPath();
      ctx.rect(0, 0, width * eased, height);
      ctx.clip();
      ctx.drawImage(curCanvas, 0, 0);
      break;
    }
    case 'wipe_right': {
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.beginPath();
      ctx.rect(width * (1 - eased), 0, width * eased, height);
      ctx.clip();
      ctx.drawImage(curCanvas, 0, 0);
      break;
    }
    case 'slide_left': {
      ctx.drawImage(prevCanvas, -eased * width, 0);
      ctx.drawImage(curCanvas, (1 - eased) * width, 0);
      break;
    }
    case 'slide_up': {
      ctx.drawImage(prevCanvas, 0, -eased * height);
      ctx.drawImage(curCanvas, 0, (1 - eased) * height);
      break;
    }
    case 'zoom': {
      ctx.drawImage(prevCanvas, 0, 0);
      const scale = 1.22 - 0.22 * eased;
      ctx.globalAlpha = eased;
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
      ctx.drawImage(curCanvas, 0, 0);
      break;
    }
    case 'blur': {
      ctx.filter = `blur(${(eased * 18).toFixed(2)}px)`;
      ctx.drawImage(prevCanvas, 0, 0);
      ctx.filter = 'none';
      ctx.globalAlpha = eased;
      ctx.drawImage(curCanvas, 0, 0);
      break;
    }
    default: {
      ctx.drawImage(curCanvas, 0, 0);
      break;
    }
  }

  // Captions from the incoming shot fade in over the blended frame so the
  // outgoing shot's title never ghosts on top of the new one.
  if (project.showCaptions && current.caption.trim()) {
    ctx.globalAlpha = eased;
    drawCaption({ ctx, width, height }, current);
  }
  ctx.restore();
}

function drawGuides(surface: FrameSurface, project: AniProject, time: number) {
  const { ctx, width, height } = surface;

  if (project.showSafeFrame) {
    ctx.save();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
    ctx.lineWidth = Math.max(1, width * 0.0015);
    ctx.setLineDash([width * 0.012, width * 0.008]);
    ctx.strokeRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.32)';
    ctx.strokeRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.25)';
    ctx.beginPath();
    ctx.moveTo(width / 3, 0);
    ctx.lineTo(width / 3, height);
    ctx.moveTo((width / 3) * 2, 0);
    ctx.lineTo((width / 3) * 2, height);
    ctx.moveTo(0, height / 3);
    ctx.lineTo(width, height / 3);
    ctx.moveTo(0, (height / 3) * 2);
    ctx.lineTo(width, (height / 3) * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (project.showTimecode) {
    const text = formatTimecodeLocal(time, project.fps);
    ctx.save();
    ctx.font = `700 ${Math.round(height * 0.032)}px "Courier New", monospace`;
    const metrics = ctx.measureText(text);
    const padX = height * 0.02;
    const boxW = metrics.width + padX * 2;
    const boxH = height * 0.055;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(ctx, width - boxW - height * 0.03, height * 0.03, boxW, boxH, height * 0.01);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width - boxW / 2 - height * 0.03, height * 0.03 + boxH / 2);
    ctx.restore();
  }
}

function formatTimecodeLocal(seconds: number, fps: number): string {
  const safe = Math.max(0, seconds);
  const pad = (n: number) => String(n).padStart(2, '0');
  const frames = Math.floor((safe % 1) * fps);
  return `${pad(Math.floor(safe / 60))}:${pad(Math.floor(safe % 60))}:${pad(frames)}`;
}

/** Compose a full frame (shot + transition + guides) for a given playhead time. */
export function drawFrame(surface: FrameSurface, options: FrameOptions) {
  const { ctx, width, height } = surface;
  const { project, images } = options;
  const shots = project.shots;
  const duration = totalDuration(shots);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.fillStyle = project.background;
  ctx.fillRect(0, 0, width, height);

  if (shots.length === 0) {
    ctx.fillStyle = 'rgba(148,163,184,0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(height * 0.04)}px "Inter", Arial, sans-serif`;
    ctx.fillText('Add a shot to begin composing', width / 2, height / 2);
    return;
  }

  const time = Math.min(Math.max(0, options.time), duration);
  const starts = shotStartTimes(shots);
  let index = 0;
  for (let i = 0; i < shots.length; i++) {
    if (time >= starts[i] - 1e-6) index = i;
  }
  const shot = shots[index];
  const localTime = time - starts[index];
  const transitionLength = Math.min(
    Math.max(0, shot.transitionDuration),
    Math.max(0.1, shot.duration) * 0.9,
  );
  const inTransition =
    index > 0 && shot.transition !== 'none' && transitionLength > 0 && localTime < transitionLength;

  if (inTransition) {
    drawTransition(
      surface,
      shots[index - 1],
      shot,
      localTime / transitionLength,
      project,
      images,
      index - 1,
      index,
    );
  } else {
    paintShot(surface, shot, localTime / Math.max(0.1, shot.duration), project, images, index);
  }

  if (!options.hideGuides) drawGuides(surface, project, time);
}

/** Render a single still (used for thumbnails and PNG export). */
export function renderStill(
  project: AniProject,
  images: ImageMap,
  time: number,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawFrame({ ctx, width, height }, { project, images, time, hideGuides: true });
  }
  return canvas;
}

export function aspectRatioValue(project: AniProject): number {
  const cfg = ASPECT_RATIOS[project.aspectRatio] || ASPECT_RATIOS['16:9'];
  return cfg.w / cfg.h;
}
