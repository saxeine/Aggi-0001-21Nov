import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clapperboard,
  Download,
  Info,
  Plus,
  Upload,
} from 'lucide-react';
import { Inspector } from './components/Inspector';
import { ImportModal } from './components/ImportModal';
import type { ImportMode } from './components/ImportModal';
import { PreviewStage } from './components/PreviewStage';
import { ShotRail } from './components/ShotRail';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { useShotImages } from './hooks/useShotImages';
import {
  ASPECT_RATIOS,
  createProject,
  createShot,
  formatDuration,
  resolutionFor,
} from './constants';
import type { AniProject, MediaOption, Shot } from './types';
import { shotIndexAt, shotStartTimes, totalDuration } from './utils/render';
import { collectMediaOptions } from './utils/media';
import { loadProject, normaliseProject, saveProject } from './utils/storage';

export interface AniComposerProps {
  onBack?: () => void;
  activeSession?: any;
  onSaveArtifact?: (item: any) => void;
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  const node = target as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || node.isContentEditable;
};

const AniComposer: React.FC<AniComposerProps> = ({ onBack, activeSession, onSaveArtifact }) => {
  const [project, setProject] = useState<AniProject>(() => loadProject() || createProject());
  const [selectedId, setSelectedId] = useState<string | null>(() => project.shots[0]?.id ?? null);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('plate');
  const [importTarget, setImportTarget] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const timeRef = useRef(0);
  const durationRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toastTimer = useRef<number | null>(null);

  const { images, loading: imagesLoading } = useShotImages(project.shots);
  const media = useMemo(() => collectMediaOptions(activeSession), [activeSession]);

  const duration = useMemo(() => totalDuration(project.shots), [project.shots]);
  const startTimes = useMemo(() => shotStartTimes(project.shots), [project.shots]);
  const activeIndex = shotIndexAt(project.shots, time);
  const selectedShot = project.shots.find((shot) => shot.id === selectedId) || null;
  const selectedIndex = project.shots.findIndex((shot) => shot.id === selectedId);

  useEffect(() => {
    durationRef.current = duration;
    if (timeRef.current > duration) {
      timeRef.current = duration;
      setTime(duration);
    }
  }, [duration]);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  // Autosave to localStorage (debounced).
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const outcome = saveProject(project);
      setStorageWarning(outcome.ok ? null : outcome.error || 'Project could not be autosaved.');
    }, 700);
    return () => window.clearTimeout(handle);
  }, [project]);

  // Playback clock.
  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const delta = Math.min(0.25, (now - last) / 1000);
      last = now;
      const next = Math.min(durationRef.current, timeRef.current + delta);
      timeRef.current = next;
      setTime(next);
      if (next >= durationRef.current) {
        setIsPlaying(false);
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  // Keep the scratch audio in sync with transport state.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : project.audio?.volume ?? 1;
    if (!project.audio) {
      audio.pause();
      return;
    }
    if (isPlaying) {
      audio.currentTime = Math.min(timeRef.current, audio.duration || Infinity);
      audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [isPlaying, project.audio, muted]);

  const seek = useCallback((next: number) => {
    const clamped = Math.min(durationRef.current, Math.max(0, next));
    timeRef.current = clamped;
    setTime(clamped);
    const audio = audioRef.current;
    if (audio && project.audio) {
      try {
        audio.currentTime = clamped;
      } catch {
        /* noop */
      }
    }
  }, [project.audio]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && timeRef.current >= durationRef.current - 0.01) {
        timeRef.current = 0;
        setTime(0);
      }
      return !prev;
    });
  }, []);

  const stepShot = useCallback(
    (direction: -1 | 1) => {
      const shots = project.shots;
      if (!shots.length) return;
      const current = shotIndexAt(shots, timeRef.current);
      const nextIndex = Math.min(shots.length - 1, Math.max(0, current + direction));
      const starts = shotStartTimes(shots);
      seek(starts[nextIndex] + 0.001);
      setSelectedId(shots[nextIndex].id);
    },
    [project.shots, seek],
  );

  const updateProject = useCallback((patch: Partial<AniProject>) => {
    setProject((prev) => ({ ...prev, ...patch, updatedAt: Date.now() }));
  }, []);

  const updateShot = useCallback((id: string, patch: Partial<Shot>) => {
    setProject((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      shots: prev.shots.map((shot) => (shot.id === id ? { ...shot, ...patch } : shot)),
    }));
  }, []);

  const updateSelectedShot = useCallback(
    (patch: Partial<Shot>) => {
      if (!selectedId) return;
      updateShot(selectedId, patch);
    },
    [selectedId, updateShot],
  );

  const addShot = useCallback(() => {
    const shot = createShot({ title: `Shot ${String(project.shots.length + 1).padStart(2, '0')}` });
    setProject((prev) => ({ ...prev, shots: [...prev.shots, shot], updatedAt: Date.now() }));
    setSelectedId(shot.id);
    const starts = shotStartTimes(project.shots);
    seek(project.shots.length ? starts[starts.length - 1] + project.shots[project.shots.length - 1].duration : 0);
  }, [project.shots, seek]);

  const duplicateShot = useCallback(
    (id: string) => {
      const index = project.shots.findIndex((shot) => shot.id === id);
      if (index === -1) return;
      const source = project.shots[index];
      const clone: Shot = {
        ...source,
        id: Math.random().toString(36).slice(2, 10),
        title: `${source.title} copy`,
        filter: { ...source.filter },
      };
      const shots = [...project.shots];
      shots.splice(index + 1, 0, clone);
      setProject({ ...project, shots, updatedAt: Date.now() });
      setSelectedId(clone.id);
    },
    [project],
  );

  const deleteShot = useCallback(
    (id: string) => {
      const shots = project.shots.filter((shot) => shot.id !== id);
      setProject({ ...project, shots, updatedAt: Date.now() });
      if (selectedId === id) setSelectedId(shots[0]?.id ?? null);
      setIsPlaying(false);
      timeRef.current = 0;
      setTime(0);
    },
    [project, selectedId],
  );

  const reorderShots = useCallback((fromIndex: number, toIndex: number) => {
    setProject((prev) => {
      if (fromIndex === toIndex) return prev;
      const shots = [...prev.shots];
      const [moved] = shots.splice(fromIndex, 1);
      shots.splice(toIndex, 0, moved);
      return { ...prev, shots, updatedAt: Date.now() };
    });
  }, []);

  const addPlates = useCallback(
    (plates: MediaOption[]) => {
      if (!plates.length) return;
      if (importTarget) {
        updateShot(importTarget, {
          imageUrl: plates[0].url,
          mimeType: plates[0].mimeType,
          title: plates[0].name.replace(/\.[a-z0-9]+$/i, '').slice(0, 42) || 'Shot',
        });
        notify('Plate replaced.');
        return;
      }
      const startIndex = project.shots.length;
      // Replace a leading empty placeholder shot with the first imported plate.
      const hasOnlyEmptyShot =
        project.shots.length === 1 &&
        !project.shots[0].imageUrl &&
        !project.shots[0].caption.trim();
      const newShots = plates.map((plate, offset) =>
        createShot({
          title:
            plate.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 42) ||
            `Shot ${String(startIndex + offset + 1).padStart(2, '0')}`,
          imageUrl: plate.url,
          mimeType: plate.mimeType,
          transition: offset === 0 && hasOnlyEmptyShot ? 'none' : 'fade',
        }),
      );
      const shots = hasOnlyEmptyShot ? newShots : [...project.shots, ...newShots];
      setProject({ ...project, shots, updatedAt: Date.now() });
      if (newShots[0]) setSelectedId(newShots[0].id);
      notify(`${plates.length} plate${plates.length === 1 ? '' : 's'} added.`);
    },
    [importTarget, notify, project, updateShot],
  );

  const setAudio = useCallback(
    (track: { url: string; name: string; volume: number }) => {
      updateProject({ audio: track });
      notify('Scratch audio attached.');
    },
    [notify, updateProject],
  );

  const distributeTimings = useCallback(() => {
    setProject((prev) => {
      if (!prev.shots.length) return prev;
      const share = totalDuration(prev.shots) / prev.shots.length;
      return {
        ...prev,
        shots: prev.shots.map((shot) => ({ ...shot, duration: Number(share.toFixed(2)) })),
        updatedAt: Date.now(),
      };
    });
    notify('Timings evened out across all shots.');
  }, [notify]);

  const applyDurationToAll = useCallback(
    (value: number) => {
      setProject((prev) => ({
        ...prev,
        shots: prev.shots.map((shot) => ({ ...shot, duration: value })),
        updatedAt: Date.now(),
      }));
    },
    [],
  );

  const openImport = useCallback((mode: ImportMode, shotId?: string) => {
    setImportMode(mode);
    setImportTarget(shotId ?? null);
    setImportOpen(true);
  }, []);

  const importProject = useCallback(
    (raw: any) => {
      const next = normaliseProject(raw);
      setProject(next);
      setSelectedId(next.shots[0]?.id ?? null);
      seek(0);
      setIsPlaying(false);
      setExportOpen(false);
      notify('Project loaded.');
    },
    [notify, seek],
  );

  const resetProject = useCallback(() => {
    if (!window.confirm('Start a new animatic? The current project will be cleared.')) return;
    const next = createProject();
    setProject(next);
    setSelectedId(next.shots[0]?.id ?? null);
    seek(0);
    setIsPlaying(false);
  }, [seek]);

  // Keyboard shortcuts.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (event.shiftKey) stepShot(-1);
        else seek(timeRef.current - (event.altKey ? 0.1 : 1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (event.shiftKey) stepShot(1);
        else seek(timeRef.current + (event.altKey ? 0.1 : 1));
      } else if (event.key === 'Home') {
        seek(0);
      } else if (event.key === 'End') {
        seek(durationRef.current);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [seek, stepShot, togglePlay]);

  const previewResolution = resolutionFor(project.aspectRatio, 1280);

  return (
    <div className="h-full min-h-0 w-full flex flex-col bg-[#08080c] text-slate-200 overflow-hidden">
      <audio ref={audioRef} src={project.audio?.url} preload="auto" className="hidden" />

      <header className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-white/10 bg-[#0d0d13]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-white/10 text-[10px] font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
          title="Back to Media Suite"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Media Suite
        </button>

        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
            <Clapperboard className="w-3.5 h-3.5 text-slate-950" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <input
                value={project.name}
                onChange={(event) => updateProject({ name: event.target.value })}
                className="bg-transparent text-sm font-bold text-slate-100 outline-none border-b border-transparent focus:border-emerald-400/60 w-52"
              />
              <span className="text-[9px] font-black tracking-[0.18em] text-emerald-300/80">
                ANICOMPOSER
              </span>
            </div>
            <p className="text-[9px] text-slate-500">
              {project.shots.length} shots · {formatDuration(duration)} ·{' '}
              {ASPECT_RATIOS[project.aspectRatio].label} · {previewResolution.width}×
              {previewResolution.height}
            </p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-1.5 text-[9px] text-slate-500">
          {storageWarning ? (
            <span className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-400/30 text-amber-300">
              <Info className="w-3 h-3" /> Autosave failed (storage full)
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400/80">
              <Check className="w-3 h-3" /> Autosaved locally
            </span>
          )}
        </div>

        <button
          onClick={resetProject}
          className="px-2.5 py-1.5 rounded-md border border-white/10 text-[10px] font-bold text-slate-300 hover:bg-white/10 transition"
          title="Start a new project"
        >
          New
        </button>
        <button
          onClick={() => setShowHelp((prev) => !prev)}
          className="p-1.5 rounded-md border border-white/10 text-slate-300 hover:bg-white/10 transition"
          title="Shortcuts & tips"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => openImport('plate')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-sky-500/15 border border-sky-400/30 text-sky-300 text-[10px] font-bold hover:bg-sky-500/25 transition"
        >
          <Upload className="w-3.5 h-3.5" /> Import plates
        </button>
        <button
          onClick={() => setExportOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider transition shadow-lg shadow-emerald-500/20"
        >
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </header>

      {showHelp && (
        <div className="shrink-0 px-4 py-2 bg-emerald-500/5 border-b border-emerald-400/20 text-[10px] text-slate-400 flex flex-wrap gap-x-5 gap-y-1">
          <span>
            <kbd className="px-1 rounded bg-white/10 text-slate-200">Space</kbd> play / pause
          </span>
          <span>
            <kbd className="px-1 rounded bg-white/10 text-slate-200">←</kbd>/
            <kbd className="px-1 rounded bg-white/10 text-slate-200">→</kbd> scrub 1s (Alt = 0.1s)
          </span>
          <span>
            <kbd className="px-1 rounded bg-white/10 text-slate-200">Shift</kbd> + arrows jump shot to
            shot
          </span>
          <span>Click a shot's thumbnail to jump the playhead there.</span>
          <span>Everything autosaves to this browser — export JSON for a portable copy.</span>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <ShotRail
          project={project}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAddShot={addShot}
          onDuplicate={duplicateShot}
          onDelete={deleteShot}
          onReorder={reorderShots}
          onOpenImport={(shotId) => openImport('plate', shotId)}
          onSeekShot={(id) => {
            const index = project.shots.findIndex((shot) => shot.id === id);
            if (index >= 0) seek(startTimes[index] + 0.001);
          }}
          startTimes={startTimes}
          activeIndex={activeIndex}
        />

        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 flex flex-col min-h-0 justify-center">
            <PreviewStage
              project={project}
              images={images}
              imagesLoading={imagesLoading}
              time={time}
              isPlaying={isPlaying}
              muted={muted}
              onToggleMute={() => setMuted((prev) => !prev)}
              onTogglePlay={togglePlay}
              onSeek={seek}
              onStepShot={stepShot}
              onSelectShot={(id) => setSelectedId(id)}
            />
          </div>
          <Timeline
            project={project}
            time={time}
            selectedId={selectedId}
            onSeek={seek}
            onSelect={setSelectedId}
            startTimes={startTimes}
          />
        </main>

        <Inspector
          project={project}
          shot={selectedShot}
          shotIndex={selectedIndex < 0 ? 0 : selectedIndex}
          onUpdateShot={updateSelectedShot}
          onUpdateProject={updateProject}
          onOpenImport={(shotId) => openImport('plate', shotId)}
          onOpenAudioImport={() => openImport('audio')}
          onClearAudio={() => updateProject({ audio: null })}
          onClearPlate={() => updateSelectedShot({ imageUrl: null })}
          onDistributeTimings={distributeTimings}
          onApplyDurationToAll={applyDurationToAll}
        />
      </div>

      <ImportModal
        open={importOpen}
        mode={importMode}
        targetShotId={importTarget}
        sessionImages={media.images}
        sessionAudio={media.audio}
        onClose={() => {
          setImportOpen(false);
          setImportTarget(null);
        }}
        onAddImages={addPlates}
        onSetAudio={setAudio}
      />

      <ExportModal
        open={exportOpen}
        project={project}
        images={images}
        currentTime={time}
        onClose={() => setExportOpen(false)}
        onImportProject={importProject}
        onSaveArtifact={onSaveArtifact}
        onNotify={notify}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-4 py-2 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-bold shadow-xl">
          {toast}
        </div>
      )}

      {!project.shots.length && (
        <button
          onClick={() => openImport('plate')}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-black uppercase tracking-wider shadow-2xl"
        >
          <Plus className="w-4 h-4" /> Import your first plate
        </button>
      )}
    </div>
  );
};

export default AniComposer;
