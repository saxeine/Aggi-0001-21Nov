import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Layers, Timer, ZoomIn } from 'lucide-react';
import type { AniProject } from '../types';
import { formatDuration } from '../constants';
import { shotIndexAt, totalDuration } from '../utils/render';

interface TimelineProps {
  project: AniProject;
  time: number;
  selectedId: string | null;
  onSeek: (time: number) => void;
  onSelect: (id: string) => void;
  startTimes: number[];
}

export const Timeline: React.FC<TimelineProps> = ({
  project,
  time,
  selectedId,
  onSeek,
  onSelect,
  startTimes,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const duration = Math.max(0.1, totalDuration(project.shots));
  const activeIndex = shotIndexAt(project.shots, time);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const node = trackRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
      onSeek(ratio * duration);
    },
    [duration, onSeek],
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (event: PointerEvent) => seekFromClientX(event.clientX);
    const handleUp = () => setDragging(false);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragging, seekFromClientX]);

  const tickStep = duration > 120 ? 10 : duration > 45 ? 5 : 1;
  const ticks: number[] = [];
  for (let t = 0; t <= duration + 0.0001; t += tickStep) ticks.push(t);

  return (
    <section className="border-t border-white/10 bg-[#0c0c11] px-3 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-slate-500">
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" /> Timeline
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <Timer className="w-3 h-3" /> {formatDuration(duration)}
          </span>
          <span className="flex items-center gap-1">
            <ZoomIn className="w-3 h-3" /> {project.fps} fps
          </span>
        </div>
        <div className="text-[10px] text-slate-600">
          Click or drag the timeline to scrub · transitions show as badges
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative select-none"
        onPointerDown={(event) => {
          setDragging(true);
          seekFromClientX(event.clientX);
        }}
      >
        <div className="relative h-4 border-b border-white/5">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute top-0 bottom-0 border-l border-white/10"
              style={{ left: `${(tick / duration) * 100}%` }}
            >
              <span className="absolute top-0.5 left-1 text-[8px] text-slate-600 tabular-nums">
                {tick % 1 === 0 ? `${tick}s` : tick.toFixed(1)}
              </span>
            </div>
          ))}
        </div>

        <div className="relative h-16 mt-1 flex gap-[2px] rounded-md overflow-hidden bg-white/[0.02] p-[2px]">
          {project.shots.map((shot, index) => {
            const width = (Math.max(0.1, shot.duration) / duration) * 100;
            const isSelected = selectedId === shot.id;
            return (
              <button
                key={shot.id}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onSelect(shot.id);
                  onSeek(startTimes[index] + 0.001);
                }}
                className={`relative h-full rounded-[3px] overflow-hidden border text-left transition ${
                  isSelected
                    ? 'border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.4)]'
                    : index === activeIndex
                    ? 'border-emerald-400/40'
                    : 'border-white/10 hover:border-white/30'
                }`}
                style={{ width: `${width}%` }}
                title={`${shot.title} — ${formatDuration(shot.duration)}`}
              >
                {shot.imageUrl ? (
                  <img
                    src={shot.imageUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-55"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800/70 to-slate-900/80" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between px-1 pt-0.5">
                  <span className="text-[9px] font-black text-emerald-300/90">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[8px] font-semibold text-slate-300/80 tabular-nums">
                    {shot.duration.toFixed(1)}s
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 px-1 pb-0.5">
                  <p className="text-[8px] font-medium text-slate-200 truncate">{shot.title}</p>
                  {shot.transition !== 'none' && index > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[7px] uppercase tracking-wide text-amber-300/90">
                      ◇ {shot.transition.replace('_', ' ')}
                    </span>
                  )}
                </div>
                {index === activeIndex && (
                  <div className="absolute inset-0 border border-emerald-400/40 rounded-[3px] pointer-events-none" />
                )}
              </button>
            );
          })}
          {project.shots.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-[10px] text-slate-600">
              Timeline is empty
            </div>
          )}
        </div>

        <div
          className="absolute top-0 bottom-0 w-[2px] bg-emerald-400 pointer-events-none shadow-[0_0_10px_rgba(52,211,153,0.8)]"
          style={{ left: `${duration > 0 ? (time / duration) * 100 : 0}%` }}
        >
          <div className="absolute -top-1 -left-[5px] w-3 h-3 rotate-45 bg-emerald-400 rounded-[2px]" />
        </div>
      </div>
    </section>
  );
};
