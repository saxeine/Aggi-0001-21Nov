import React, { useState } from 'react';
import {
  Copy,
  GripVertical,
  ImagePlus,
  Plus,
  Trash2,
} from 'lucide-react';
import type { AniProject, Shot } from '../types';
import { CAMERA_PRESETS, TRANSITIONS, formatDuration } from '../constants';

interface ShotRailProps {
  project: AniProject;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddShot: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onOpenImport: (shotId?: string) => void;
  onSeekShot: (id: string) => void;
  startTimes: number[];
  activeIndex: number;
}

const cameraLabel = (id: string) =>
  CAMERA_PRESETS.find((preset) => preset.id === id)?.label || 'Locked Off';
const transitionLabel = (id: string) =>
  TRANSITIONS.find((preset) => preset.id === id)?.label || 'Cut';

export const ShotRail: React.FC<ShotRailProps> = ({
  project,
  selectedId,
  onSelect,
  onAddShot,
  onDuplicate,
  onDelete,
  onReorder,
  onOpenImport,
  onSeekShot,
  startTimes,
  activeIndex,
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDrop = (index: number) => {
    if (dragIndex === null) return;
    onReorder(dragIndex, index);
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-white/10 bg-[#0f0f15] min-h-0">
      <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-black tracking-[0.16em] text-slate-400">SHOT LIST</h2>
          <p className="text-[10px] text-slate-600">{project.shots.length} shots</p>
        </div>
        <button
          onClick={onAddShot}
          className="p-1.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/25 transition"
          title="Add empty shot"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
        {project.shots.map((shot: Shot, index: number) => {
          const isSelected = selectedId === shot.id;
          const isActive = index === activeIndex;
          return (
            <div
              key={shot.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => {
                event.preventDefault();
                setOverIndex(index);
              }}
              onDragLeave={() => setOverIndex((prev) => (prev === index ? null : prev))}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(index);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onClick={() => {
                onSelect(shot.id);
                onSeekShot(shot.id);
              }}
              className={`group relative rounded-lg border transition cursor-pointer overflow-hidden ${
                isSelected
                  ? 'border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]'
              } ${overIndex === index && dragIndex !== null && dragIndex !== index ? 'ring-2 ring-emerald-400/60' : ''}`}
            >
              <div className="flex items-start gap-2 p-1.5">
                <div className="flex flex-col items-center pt-0.5 text-slate-600 group-hover:text-slate-400">
                  <GripVertical className="w-3 h-3" />
                  <span className="text-[9px] font-bold mt-0.5 text-slate-500">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="w-16 h-9 shrink-0 rounded overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
                  {shot.imageUrl ? (
                    <img src={shot.imageUrl} alt={shot.title} className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-200 truncate">{shot.title}</p>
                  <p className="text-[9px] text-slate-500 truncate">
                    {formatDuration(shot.duration)} · {cameraLabel(shot.camera)}
                  </p>
                  <p className="text-[9px] text-slate-600 truncate">
                    {shot.transition === 'none' ? 'Cut in' : `${transitionLabel(shot.transition)}`}
                  </p>
                </div>
              </div>
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-400" />
              )}
              <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenImport(shot.id);
                  }}
                  className="p-1 rounded bg-black/70 border border-white/10 text-slate-300 hover:text-emerald-300"
                  title="Replace plate"
                >
                  <ImagePlus className="w-3 h-3" />
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onDuplicate(shot.id);
                  }}
                  className="p-1 rounded bg-black/70 border border-white/10 text-slate-300 hover:text-sky-300"
                  title="Duplicate shot"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(shot.id);
                  }}
                  className="p-1 rounded bg-black/70 border border-white/10 text-slate-300 hover:text-rose-400"
                  title="Delete shot"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {project.shots.length === 0 && (
          <div className="text-center px-3 py-8 text-[11px] text-slate-500">
            No shots yet. Import a plate or add an empty shot to start.
          </div>
        )}
      </div>

      <div className="p-2 border-t border-white/10 space-y-1.5">
        <button
          onClick={() => onOpenImport()}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold transition"
        >
          <Plus className="w-3.5 h-3.5" /> Import Plate
        </button>
        <p className="text-[9px] text-slate-600 leading-snug px-1">
          Drag shots to reorder. Start time of shot 01 is 0.0s.
          <span className="block mt-0.5">
            Timeline total: {formatDuration(startTimes[startTimes.length - 1] !== undefined
              ? startTimes[startTimes.length - 1] + (project.shots[project.shots.length - 1]?.duration || 0)
              : 0)}
          </span>
        </p>
      </div>
    </aside>
  );
};
