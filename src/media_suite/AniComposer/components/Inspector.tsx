import React, { useState } from 'react';
import { ImagePlus, Music, Trash2, Wand2, Film, Sliders } from 'lucide-react';
import type { AniProject, Shot } from '../types';
import {
  ASPECT_KEYS,
  ASPECT_RATIOS,
  CAMERA_PRESETS,
  TRANSITIONS,
  formatDuration,
} from '../constants';
import { totalDuration } from '../utils/render';

interface InspectorProps {
  project: AniProject;
  shot: Shot | null;
  shotIndex: number;
  onUpdateShot: (patch: Partial<Shot>) => void;
  onUpdateProject: (patch: Partial<AniProject>) => void;
  onOpenImport: (shotId?: string) => void;
  onOpenAudioImport: () => void;
  onClearAudio: () => void;
  onClearPlate: () => void;
  onDistributeTimings: () => void;
  onApplyDurationToAll: (duration: number) => void;
}

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children,
}) => (
  <label className="block">
    <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
      {label}
      {hint && <span className="font-normal normal-case tracking-normal text-slate-600">{hint}</span>}
    </span>
    {children}
  </label>
);

const inputClass =
  'w-full bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-emerald-400/60 transition';
const selectClass = `${inputClass} appearance-none`;

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step = 1, suffix = '', onChange }) => (
  <div>
    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
      <span className="font-semibold uppercase tracking-wider">{label}</span>
      <span className="tabular-nums text-slate-400">
        {value}
        {suffix}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full h-1 accent-emerald-400 cursor-pointer"
    />
  </div>
);

export const Inspector: React.FC<InspectorProps> = ({
  project,
  shot,
  shotIndex,
  onUpdateShot,
  onUpdateProject,
  onOpenImport,
  onOpenAudioImport,
  onClearAudio,
  onClearPlate,
  onDistributeTimings,
  onApplyDurationToAll,
}) => {
  const [tab, setTab] = useState<'shot' | 'project'>('shot');

  return (
    <aside className="w-[290px] shrink-0 flex flex-col border-l border-white/10 bg-[#0f0f15] min-h-0">
      <div className="flex border-b border-white/10">
        {(['shot', 'project'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] transition ${
              tab === key
                ? 'text-emerald-300 bg-emerald-500/10 border-b-2 border-emerald-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {key === 'shot' ? <Sliders className="w-3 h-3" /> : <Film className="w-3 h-3" />}
            {key === 'shot' ? 'Shot' : 'Project'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {tab === 'shot' ? (
          shot ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-[0.18em] text-emerald-300">
                  SHOT {String(shotIndex + 1).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-slate-500">{formatDuration(shot.duration)}</span>
              </div>

              <Field label="Shot name">
                <input
                  className={inputClass}
                  value={shot.title}
                  onChange={(event) => onUpdateShot({ title: event.target.value })}
                  placeholder="Shot title"
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onOpenImport(shot.id)}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-sky-500/15 border border-sky-400/30 text-sky-300 text-[10px] font-bold hover:bg-sky-500/25 transition"
                >
                  <ImagePlus className="w-3 h-3" /> Plate
                </button>
                <button
                  onClick={onClearPlate}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-slate-300 text-[10px] font-bold hover:bg-white/10 transition"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>

              <Slider
                label="Hold duration"
                value={shot.duration}
                min={0.4}
                max={20}
                step={0.1}
                suffix="s"
                onChange={(value) => onUpdateShot({ duration: value })}
              />
              <button
                onClick={() => onApplyDurationToAll(shot.duration)}
                className="w-full px-2 py-1 rounded-md border border-white/10 text-[9px] font-semibold text-slate-400 hover:text-emerald-300 hover:border-emerald-400/40 transition"
              >
                Apply {shot.duration.toFixed(1)}s to every shot
              </button>

              <Field label="Camera move">
                <select
                  className={selectClass}
                  value={shot.camera}
                  onChange={(event) => onUpdateShot({ camera: event.target.value as Shot['camera'] })}
                >
                  {CAMERA_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label} — {preset.hint}
                    </option>
                  ))}
                </select>
              </Field>
              <Slider
                label="Camera zoom"
                value={Number(shot.zoom.toFixed(2))}
                min={0.8}
                max={1.8}
                step={0.01}
                suffix="×"
                onChange={(value) => onUpdateShot({ zoom: value })}
              />

              <div className="h-px bg-white/10" />

              <Field label="Transition in">
                <select
                  className={selectClass}
                  value={shot.transition}
                  onChange={(event) =>
                    onUpdateShot({ transition: event.target.value as Shot['transition'] })
                  }
                >
                  {TRANSITIONS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Slider
                label="Transition length"
                value={Number(shot.transitionDuration.toFixed(2))}
                min={0}
                max={2.5}
                step={0.05}
                suffix="s"
                onChange={(value) => onUpdateShot({ transitionDuration: value })}
              />

              <div className="h-px bg-white/10" />

              <Field label="Caption / action line">
                <textarea
                  className={`${inputClass} resize-none h-16`}
                  value={shot.caption}
                  onChange={(event) => onUpdateShot({ caption: event.target.value })}
                  placeholder="What happens in this shot?"
                />
              </Field>
              <div className="grid grid-cols-3 gap-1">
                {(['top', 'center', 'bottom'] as const).map((position) => (
                  <button
                    key={position}
                    onClick={() => onUpdateShot({ captionPosition: position })}
                    className={`py-1 rounded text-[9px] font-bold uppercase tracking-wide border transition ${
                      shot.captionPosition === position
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                        : 'bg-white/[0.03] border-white/10 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {position}
                  </button>
                ))}
              </div>

              <Field label="Notes (not rendered)">
                <textarea
                  className={`${inputClass} resize-none h-14`}
                  value={shot.notes}
                  onChange={(event) => onUpdateShot({ notes: event.target.value })}
                  placeholder="Audio cues, VFX notes, references…"
                />
              </Field>

              <Field label="Plate backdrop" hint="behind the image">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={shot.backgroundColor}
                    onChange={(event) => onUpdateShot({ backgroundColor: event.target.value })}
                    className="w-8 h-7 rounded border border-white/10 bg-transparent cursor-pointer"
                  />
                  <input
                    className={inputClass}
                    value={shot.backgroundColor}
                    onChange={(event) => onUpdateShot({ backgroundColor: event.target.value })}
                  />
                </div>
              </Field>

              <div className="h-px bg-white/10" />
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                Grade
              </p>
              <Slider
                label="Brightness"
                value={shot.filter.brightness}
                min={30}
                max={170}
                suffix="%"
                onChange={(value) => onUpdateShot({ filter: { ...shot.filter, brightness: value } })}
              />
              <Slider
                label="Contrast"
                value={shot.filter.contrast}
                min={30}
                max={170}
                suffix="%"
                onChange={(value) => onUpdateShot({ filter: { ...shot.filter, contrast: value } })}
              />
              <Slider
                label="Saturation"
                value={shot.filter.saturate}
                min={0}
                max={200}
                suffix="%"
                onChange={(value) => onUpdateShot({ filter: { ...shot.filter, saturate: value } })}
              />
              <Slider
                label="Grayscale"
                value={shot.filter.grayscale}
                min={0}
                max={100}
                suffix="%"
                onChange={(value) => onUpdateShot({ filter: { ...shot.filter, grayscale: value } })}
              />
              <Slider
                label="Sepia"
                value={shot.filter.sepia}
                min={0}
                max={100}
                suffix="%"
                onChange={(value) => onUpdateShot({ filter: { ...shot.filter, sepia: value } })}
              />
              <Slider
                label="Soft focus"
                value={shot.filter.blur}
                min={0}
                max={12}
                step={0.5}
                suffix="px"
                onChange={(value) => onUpdateShot({ filter: { ...shot.filter, blur: value } })}
              />
              <button
                onClick={() =>
                  onUpdateShot({
                    filter: {
                      grayscale: 0,
                      sepia: 0,
                      brightness: 100,
                      contrast: 100,
                      saturate: 100,
                      blur: 0,
                    },
                  })
                }
                className="w-full px-2 py-1 rounded-md border border-white/10 text-[9px] font-semibold text-slate-400 hover:text-emerald-300 hover:border-emerald-400/40 transition"
              >
                Reset grade
              </button>
            </>
          ) : (
            <p className="text-[11px] text-slate-500 text-center py-10">
              Select a shot to edit its timing, camera move and captions.
            </p>
          )
        ) : (
          <>
            <Field label="Project name">
              <input
                className={inputClass}
                value={project.name}
                onChange={(event) => onUpdateProject({ name: event.target.value })}
              />
            </Field>

            <Field label="Aspect ratio">
              <div className="grid grid-cols-2 gap-1">
                {ASPECT_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => onUpdateProject({ aspectRatio: key })}
                    className={`py-1.5 rounded text-[9px] font-bold border transition ${
                      project.aspectRatio === key
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                        : 'bg-white/[0.03] border-white/10 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {ASPECT_RATIOS[key].label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Playback frame rate">
              <select
                className={selectClass}
                value={project.fps}
                onChange={(event) => onUpdateProject({ fps: Number(event.target.value) })}
              >
                {[24, 25, 30, 60].map((fps) => (
                  <option key={fps} value={fps}>
                    {fps} fps
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Canvas backdrop">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={project.background}
                  onChange={(event) => onUpdateProject({ background: event.target.value })}
                  className="w-8 h-7 rounded border border-white/10 bg-transparent cursor-pointer"
                />
                <input
                  className={inputClass}
                  value={project.background}
                  onChange={(event) => onUpdateProject({ background: event.target.value })}
                />
              </div>
            </Field>

            <div className="space-y-1.5">
              {(
                [
                  ['showCaptions', 'Burn in captions'],
                  ['showSafeFrame', 'Show safe-frame guides'],
                  ['showTimecode', 'Show timecode overlay'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => onUpdateProject({ [key]: !project[key] } as Partial<AniProject>)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-md border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] transition"
                >
                  <span className="text-[10px] text-slate-300">{label}</span>
                  <span
                    className={`relative w-7 h-3.5 rounded-full transition ${
                      project[key] ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${
                        project[key] ? 'left-3.5' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
              ))}
            </div>

            <div className="h-px bg-white/10" />

            <Field label="Scratch audio / temp track">
              {project.audio ? (
                <div className="rounded-md border border-white/10 bg-black/30 p-2 space-y-1.5">
                  <p className="text-[10px] text-slate-300 truncate">{project.audio.name}</p>
                  <audio src={project.audio.url} controls className="w-full h-7" />
                  <div className="flex gap-1.5">
                    <button
                      onClick={onOpenAudioImport}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded border border-white/10 text-[9px] font-semibold text-slate-300 hover:text-emerald-300"
                    >
                      <Music className="w-3 h-3" /> Replace
                    </button>
                    <button
                      onClick={onClearAudio}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded border border-white/10 text-[9px] font-semibold text-slate-300 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                  <Slider
                    label="Volume"
                    value={Math.round((project.audio.volume ?? 1) * 100)}
                    min={0}
                    max={100}
                    suffix="%"
                    onChange={(value) =>
                      onUpdateProject({
                        audio: { ...(project.audio as NonNullable<AniProject['audio']>), volume: value / 100 },
                      })
                    }
                  />
                </div>
              ) : (
                <button
                  onClick={onOpenAudioImport}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-md bg-white/5 border border-white/10 text-slate-300 text-[10px] font-bold hover:bg-white/10 transition"
                >
                  <Music className="w-3 h-3" /> Add scratch audio
                </button>
              )}
            </Field>

            <div className="h-px bg-white/10" />

            <button
              onClick={onDistributeTimings}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-md bg-fuchsia-500/15 border border-fuchsia-400/30 text-fuchsia-300 text-[10px] font-bold hover:bg-fuchsia-500/25 transition"
            >
              <Wand2 className="w-3 h-3" /> Even out timings
            </button>

            <div className="rounded-md border border-white/10 bg-black/30 p-2 text-[10px] text-slate-500 space-y-0.5">
              <div className="flex justify-between">
                <span>Shots</span>
                <span className="text-slate-300">{project.shots.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Runtime</span>
                <span className="text-slate-300">{formatDuration(totalDuration(project.shots))}</span>
              </div>
              <div className="flex justify-between">
                <span>Output</span>
                <span className="text-slate-300">
                  {ASPECT_RATIOS[project.aspectRatio].w}:{ASPECT_RATIOS[project.aspectRatio].h}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
