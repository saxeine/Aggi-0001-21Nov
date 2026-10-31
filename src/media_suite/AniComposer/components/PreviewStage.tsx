import React, { useEffect, useMemo, useRef } from 'react';
import {
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Loader2,
} from 'lucide-react';
import { formatTimecode, resolutionFor } from '../constants';
import type { AniProject } from '../types';
import { shotIndexAt, totalDuration } from '../utils/render';
import type { ImageMap } from '../utils/render';
import { drawFrame } from '../utils/render';

interface PreviewStageProps {
  project: AniProject;
  images: ImageMap;
  imagesLoading: boolean;
  time: number;
  isPlaying: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onStepShot: (direction: -1 | 1) => void;
  onSelectShot: (id: string) => void;
}

export const PreviewStage: React.FC<PreviewStageProps> = ({
  project,
  images,
  imagesLoading,
  time,
  isPlaying,
  muted,
  onToggleMute,
  onTogglePlay,
  onSeek,
  onStepShot,
  onSelectShot,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const duration = useMemo(() => totalDuration(project.shots), [project.shots]);
  const resolution = useMemo(
    () => resolutionFor(project.aspectRatio, 1280),
    [project.aspectRatio],
  );
  const activeIndex = shotIndexAt(project.shots, time);
  const activeShot = project.shots[activeIndex];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawFrame(
      { ctx, width: canvas.width, height: canvas.height },
      { project, images, time },
    );
  }, [project, images, time, resolution.width, resolution.height]);

  const toggleFullscreen = () => {
    const node = shellRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      node.requestFullscreen?.().catch(() => undefined);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 px-4 pt-4 pb-2">
      <div
        ref={shellRef}
        className="relative flex items-center justify-center w-full flex-1 min-h-0 rounded-xl overflow-hidden border border-white/10 bg-black shadow-[0_18px_60px_-20px_rgba(0,0,0,0.9)]"
      >
        <canvas
          ref={canvasRef}
          width={resolution.width}
          height={resolution.height}
          onClick={onTogglePlay}
          className="max-w-full max-h-full cursor-pointer"
          style={{ maxHeight: 'min(58vh, 100%)' }}
          title="Click to play / pause"
        />
        <div className="pointer-events-none absolute top-2 left-2 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] font-black tracking-[0.18em] text-emerald-300 border border-emerald-400/30">
            ANICOMPOSER
          </span>
          {activeShot && (
            <button
              onClick={() => onSelectShot(activeShot.id)}
              className="pointer-events-auto px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] font-bold text-slate-300 border border-white/10 hover:border-emerald-400/50 hover:text-emerald-200 transition"
            >
              {String(activeIndex + 1).padStart(2, '0')} / {String(project.shots.length).padStart(2, '0')} ·{' '}
              {activeShot.title}
            </button>
          )}
        </div>
        {imagesLoading && (
          <div className="pointer-events-none absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded bg-black/60 text-[10px] font-semibold text-slate-300">
            <Loader2 className="w-3 h-3 animate-spin" /> loading plates
          </div>
        )}
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-2 right-2 p-1.5 rounded bg-black/60 border border-white/10 text-slate-300 hover:text-white hover:border-emerald-400/50 transition"
          title="Toggle fullscreen preview"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-full flex items-center gap-3 px-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSeek(0)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStepShot(-1)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition"
            title="Previous shot"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={onTogglePlay}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={() => onStepShot(1)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition"
            title="Next shot"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition"
            title={muted ? 'Unmute scratch audio' : 'Mute scratch audio'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 h-1.5 rounded-full bg-white/10 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500/80 rounded-full"
            style={{ width: `${duration > 0 ? Math.min(100, (time / duration) * 100) : 0}%` }}
          />
        </div>

        <div className="font-mono text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
          <span className="text-emerald-300">{formatTimecode(time, project.fps)}</span>
          <span className="text-slate-600"> / </span>
          {formatTimecode(duration, project.fps)}
        </div>
      </div>
    </div>
  );
};
