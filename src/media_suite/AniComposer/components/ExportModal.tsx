import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clapperboard,
  Download,
  FileJson,
  Image as ImageIcon,
  Loader2,
  Save,
  Square,
  Upload,
  X,
} from 'lucide-react';
import type { AniProject } from '../types';
import { ASPECT_RATIOS, formatDuration, resolutionFor } from '../constants';
import { totalDuration } from '../utils/render';
import type { ImageMap } from '../utils/render';
import { renderStill } from '../utils/render';
import { recordAnimatic } from '../utils/recorder';
import type { RecordResult } from '../utils/recorder';
import {
  blobToBase64,
  dataUrlToBase64,
  downloadBlob,
  downloadJson,
  downloadDataUrl,
  slugify,
} from '../utils/media';

interface ExportModalProps {
  open: boolean;
  project: AniProject;
  images: ImageMap;
  currentTime: number;
  onClose: () => void;
  onImportProject: (project: AniProject) => void;
  onSaveArtifact?: (item: {
    id: string;
    name: string;
    mimeType: string;
    data: string;
    type: 'video' | 'image';
  }) => void;
  onNotify: (message: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  project,
  images,
  currentTime,
  onClose,
  onImportProject,
  onSaveArtifact,
  onNotify,
}) => {
  const [longEdge, setLongEdge] = useState(1280);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<RecordResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const resultUrl = useMemo(() => (result ? URL.createObjectURL(result.blob) : null), [result]);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  if (!open) return null;

  const duration = totalDuration(project.shots);
  const resolution = resolutionFor(project.aspectRatio, longEdge);
  const baseName = slugify(project.name);

  const handleRecord = async () => {
    if (!project.shots.length) {
      setError('Add at least one shot before recording.');
      return;
    }
    setError(null);
    setResult(null);
    setRecording(true);
    setProgress(0);
    cancelRef.current = { cancelled: false };
    try {
      const output = await recordAnimatic({
        project,
        images,
        longEdge,
        cancelRef: cancelRef.current,
        onProgress: (ratio) => setProgress(ratio),
      });
      setResult(output);
      onNotify('Animatic rendered — download it or save it to the session.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recording failed.');
    } finally {
      setRecording(false);
      setProgress(0);
    }
  };

  const stopRecording = () => {
    cancelRef.current.cancelled = true;
  };

  const handleDownloadVideo = () => {
    if (!result) return;
    const extension = result.mimeType.includes('mp4') ? 'mp4' : 'webm';
    downloadBlob(result.blob, `${baseName}-animatic.${extension}`);
  };

  const handleSaveVideo = async () => {
    if (!result || !onSaveArtifact) return;
    const base64 = await blobToBase64(result.blob);
    onSaveArtifact({
      id: Math.random().toString(36).slice(2, 10),
      name: `${project.name} — animatic.${result.mimeType.includes('mp4') ? 'mp4' : 'webm'}`,
      mimeType: result.mimeType.split(';')[0],
      data: base64,
      type: 'video',
    });
  };

  const exportPoster = (saveToSession: boolean) => {
    const { width, height } = resolutionFor(project.aspectRatio, 1600);
    const canvas = renderStill(project, images, currentTime, width, height);
    const dataUrl = canvas.toDataURL('image/png');
    if (saveToSession && onSaveArtifact) {
      onSaveArtifact({
        id: Math.random().toString(36).slice(2, 10),
        name: `${project.name} — frame ${currentTime.toFixed(2)}s.png`,
        mimeType: 'image/png',
        data: dataUrlToBase64(dataUrl),
        type: 'image',
      });
      onNotify('Current frame saved to the session library.');
    } else {
      downloadDataUrl(dataUrl, `${baseName}-frame-${currentTime.toFixed(2)}s.png`);
    }
  };

  const handleProjectImport = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      onImportProject(parsed);
    } catch (err) {
      setError('That file is not a valid AniComposer project JSON.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-white/10 bg-[#111118] shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-emerald-300" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">Export animatic</h3>
              <p className="text-[10px] text-slate-500">
                {project.shots.length} shots · {formatDuration(duration)} ·{' '}
                {ASPECT_RATIOS[project.aspectRatio].label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          <section className="rounded-xl border border-white/10 bg-black/25 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                WebM / MP4 render
              </p>
              <div className="flex gap-1">
                {[960, 1280, 1920].map((edge) => (
                  <button
                    key={edge}
                    onClick={() => setLongEdge(edge)}
                    disabled={recording}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold border transition ${
                      longEdge === edge
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                        : 'border-white/10 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {edge}p
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Renders in real time at {resolution.width}×{resolution.height}. Keep this tab in front
              while encoding.
            </p>

            {!recording && (
              <button
                onClick={handleRecord}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black uppercase tracking-wider transition"
              >
                <Clapperboard className="w-3.5 h-3.5" /> Record animatic
              </button>
            )}

            {recording && (
              <div className="space-y-2">
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> Rendering…{' '}
                    {Math.round(progress * 100)}%
                  </span>
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-1 px-2 py-1 rounded border border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                  >
                    <Square className="w-3 h-3" /> Stop
                  </button>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-2">
                <video
                  src={resultUrl || undefined}
                  controls
                  className="w-full rounded-lg border border-white/10 bg-black"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadVideo}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-bold text-slate-100 transition"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                  {onSaveArtifact && (
                    <button
                      onClick={handleSaveVideo}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-[10px] font-bold text-sky-200 transition"
                    >
                      <Save className="w-3 h-3" /> Save to session
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-slate-500">
                  {result.withAudio
                    ? 'Scratch audio included in the render.'
                    : 'Video only — this browser blocked audio capture for the render.'}
                </p>
              </div>
            )}
          </section>

          <section className="grid grid-cols-2 gap-2">
            <button
              onClick={() => exportPoster(false)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-200 transition"
            >
              <ImageIcon className="w-3.5 h-3.5" /> PNG of current frame
            </button>
            <button
              onClick={() => exportPoster(true)}
              disabled={!onSaveArtifact}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-200 transition disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" /> Frame → session
            </button>
            <button
              onClick={() => downloadJson(project, `${baseName}.anicomposer.json`)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-200 transition"
            >
              <FileJson className="w-3.5 h-3.5" /> Export project JSON
            </button>
            <button
              onClick={() => jsonInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-200 transition"
            >
              <Upload className="w-3.5 h-3.5" /> Import project JSON
            </button>
            <input
              ref={jsonInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => handleProjectImport(event.target.files?.[0] || null)}
            />
          </section>

          {error && (
            <p className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded-md px-2 py-1.5">
              {error}
            </p>
          )}

          <p className="text-[9px] text-slate-600 leading-relaxed">
            Note: recording uses your display's real-time clock, so a 30 second animatic takes about
            30 seconds to export. Audio is captured when the browser allows a media-element source.
          </p>
        </div>
      </div>
    </div>
  );
};
