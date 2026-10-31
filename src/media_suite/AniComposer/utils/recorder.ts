import { resolutionFor } from '../constants';
import type { AniProject } from '../types';
import { drawFrame, totalDuration } from './render';
import type { ImageMap } from './render';

export interface RecordOptions {
  project: AniProject;
  images: ImageMap;
  longEdge?: number;
  onProgress?: (ratio: number) => void;
  cancelRef?: { cancelled: boolean };
}

export interface RecordResult {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  duration: number;
  withAudio: boolean;
}

function pickMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
  ];
  if (typeof MediaRecorder === 'undefined') return 'video/webm';
  for (const candidate of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate;
    } catch {
      /* ignore */
    }
  }
  return '';
}

/**
 * Renders the animatic in real time onto an offscreen canvas and captures it
 * with MediaRecorder. Audio (if present) is mixed into the capture when the
 * browser allows it; otherwise the export falls back to video only.
 */
export function recordAnimatic(options: RecordOptions): Promise<RecordResult> {
  const { project, images, longEdge = 1280, onProgress, cancelRef } = options;
  const { width, height } = resolutionFor(project.aspectRatio, longEdge);
  const duration = Math.max(0.2, totalDuration(project.shots));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.reject(new Error('Canvas 2D context unavailable in this browser.'));
  }

  if (typeof MediaRecorder === 'undefined') {
    return Promise.reject(new Error('MediaRecorder is not supported in this browser.'));
  }

  const mimeType = pickMimeType();
  const stream = canvas.captureStream(project.fps || 30);

  let audioEl: HTMLAudioElement | null = null;
  let audioCtx: AudioContext | null = null;
  let withAudio = false;

  if (project.audio?.url) {
    try {
      const Ctor =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctor) {
        audioCtx = new Ctor();
        audioEl = new Audio();
        audioEl.src = project.audio.url;
        audioEl.volume = project.audio.volume ?? 1;
        const source = audioCtx.createMediaElementSource(audioEl);
        const destination = audioCtx.createMediaStreamDestination();
        source.connect(destination);
        destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
        withAudio = true;
      }
    } catch (error) {
      console.warn('[AniComposer] Audio capture unavailable, exporting video only.', error);
      withAudio = false;
    }
  }

  let recorder: MediaRecorder;
  try {
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  return new Promise<RecordResult>((resolve, reject) => {
    let frameId = 0;
    const startedAt = performance.now();
    let finished = false;

    const cleanup = () => {
      cancelAnimationFrame(frameId);
      if (audioEl) {
        try {
          audioEl.pause();
        } catch {
          /* noop */
        }
      }
      if (audioCtx) {
        audioCtx.close().catch(() => undefined);
      }
      stream.getTracks().forEach((track) => track.stop());
    };

    recorder.onerror = (event: any) => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(event?.error || new Error('Recording failed.'));
    };

    recorder.onstop = () => {
      if (finished) return;
      finished = true;
      cleanup();
      const blob = new Blob(chunks, { type: mimeType ? mimeType.split(';')[0] : 'video/webm' });
      resolve({
        blob,
        mimeType: blob.type || 'video/webm',
        width,
        height,
        duration,
        withAudio,
      });
    };

    // Prime the first frame before recording so the stream is never empty.
    drawFrame({ ctx, width, height }, { project, images, time: 0, hideGuides: true });
    recorder.start(1000);

    if (audioEl) {
      audioEl.currentTime = 0;
      audioEl.play().catch((error) => {
        console.warn('[AniComposer] Audio playback blocked during recording.', error);
      });
    }

    const tick = () => {
      if (cancelRef?.cancelled) {
        recorder.stop();
        return;
      }
      const elapsed = (performance.now() - startedAt) / 1000;
      const time = Math.min(elapsed, duration);
      drawFrame({ ctx, width, height }, { project, images, time, hideGuides: true });
      onProgress?.(Math.min(1, elapsed / duration));
      if (elapsed >= duration) {
        // Give the encoder a beat to flush the final frame.
        setTimeout(() => {
          if (recorder.state !== 'inactive') recorder.stop();
        }, 220);
        return;
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
  });
}
