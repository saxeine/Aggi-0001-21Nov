import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ImagePlus, Link2, Loader2, Music, Upload, X } from 'lucide-react';
import type { AudioTrack, MediaOption } from '../types';
import { fileToDataUrl, urlToDataUrl } from '../utils/media';

export type ImportMode = 'plate' | 'audio';

interface ImportModalProps {
  open: boolean;
  mode: ImportMode;
  targetShotId?: string | null;
  sessionImages: MediaOption[];
  sessionAudio: MediaOption[];
  onClose: () => void;
  onAddImages: (plates: MediaOption[]) => void;
  onSetAudio: (track: AudioTrack) => void;
}

type Tab = 'library' | 'upload' | 'url';

export const ImportModal: React.FC<ImportModalProps> = ({
  open,
  mode,
  targetShotId,
  sessionImages,
  sessionAudio,
  onClose,
  onAddImages,
  onSetAudio,
}) => {
  const [tab, setTab] = useState<Tab>('library');
  const [selected, setSelected] = useState<string[]>([]);
  const [uploads, setUploads] = useState<MediaOption[]>([]);
  const [urlValue, setUrlValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab('library');
    setSelected([]);
    setUploads([]);
    setUrlValue('');
    setBusy(false);
    setError(null);
  }, [open, mode, targetShotId]);

  const library = useMemo(
    () => (mode === 'plate' ? sessionImages : sessionAudio),
    [mode, sessionImages, sessionAudio],
  );

  if (!open) return null;

  const isAudio = mode === 'audio';

  const toggle = (id: string) => {
    setSelected((prev) =>
      isAudio ? [id] : prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true);
    setError(null);
    try {
      const next: MediaOption[] = [];
      for (const file of Array.from(files)) {
        if (isAudio && !file.type.startsWith('audio/')) continue;
        if (!isAudio && !file.type.startsWith('image/')) continue;
        const url = await fileToDataUrl(file);
        next.push({
          id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          mimeType: file.type || (isAudio ? 'audio/mpeg' : 'image/png'),
          url,
        });
      }
      if (!next.length) {
        setError(isAudio ? 'Please choose an audio file.' : 'Please choose image files.');
      }
      setUploads((prev) => [...prev, ...next]);
      setSelected((prev) => (isAudio ? (next[0] ? [next[0].id] : prev) : [...prev, ...next.map((n) => n.id)]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.');
    } finally {
      setBusy(false);
    }
  };

  const handleUrlImport = async () => {
    const trimmed = urlValue.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const result = await urlToDataUrl(trimmed);
      const item: MediaOption = {
        id: `url-${Math.random().toString(36).slice(2, 8)}`,
        name: trimmed.split('/').pop()?.split('?')[0] || 'Remote media',
        mimeType: isAudio ? 'audio/mpeg' : 'image/png',
        url: result.url,
      };
      setUploads((prev) => [...prev, item]);
      setSelected((prev) => (isAudio ? [item.id] : [...prev, item.id]));
      if (result.warning) setError(result.warning);
      setUrlValue('');
    } finally {
      setBusy(false);
    }
  };

  const pool = [...library, ...uploads];
  const chosen = pool.filter((item) => selected.includes(item.id));

  const submit = () => {
    if (!chosen.length) {
      setError(isAudio ? 'Select an audio file first.' : 'Select at least one plate.');
      return;
    }
    if (isAudio) {
      onSetAudio({ url: chosen[0].url, name: chosen[0].name, volume: 1 });
    } else {
      onAddImages(chosen);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[86vh] flex flex-col rounded-2xl border border-white/10 bg-[#111118] shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            {isAudio ? (
              <Music className="w-4 h-4 text-fuchsia-300" />
            ) : (
              <ImagePlus className="w-4 h-4 text-emerald-300" />
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {isAudio ? 'Add scratch audio' : targetShotId ? 'Replace plate' : 'Import plates'}
              </h3>
              <p className="text-[10px] text-slate-500">
                {isAudio
                  ? 'Temp music or scratch VO used while previewing and exporting.'
                  : 'Pull images from the active workspace session or upload from disk.'}
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

        <div className="flex gap-1 px-4 pt-3">
          {(
            [
              ['library', 'Session library'],
              ['upload', 'Upload'],
              ['url', 'From URL'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${
                tab === key
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 min-h-[240px]">
          {tab === 'library' && (
            <>
              {library.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-10">
                  <p className="text-[11px] text-slate-500">
                    No {isAudio ? 'audio' : 'images'} in the active session yet.
                  </p>
                  <p className="text-[10px] text-slate-600">
                    Use the Upload tab, or add media to the workspace first.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {library.map((item) => {
                    const active = selected.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggle(item.id)}
                        className={`relative rounded-lg overflow-hidden border transition text-left ${
                          active
                            ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        {isAudio ? (
                          <div className="h-20 flex flex-col items-center justify-center bg-black/40 gap-1 px-1">
                            <Music className="w-5 h-5 text-fuchsia-300" />
                            <span className="text-[9px] text-slate-300 truncate w-full text-center">
                              {item.name}
                            </span>
                          </div>
                        ) : (
                          <img src={item.url} alt={item.name} className="h-20 w-full object-cover" />
                        )}
                        {active && (
                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                        {!isAudio && (
                          <span className="absolute inset-x-0 bottom-0 bg-black/70 text-[8px] text-slate-300 px-1 py-0.5 truncate">
                            {item.name}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'upload' && (
            <div className="space-y-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-32 rounded-xl border-2 border-dashed border-white/15 hover:border-emerald-400/60 hover:bg-emerald-500/5 transition flex flex-col items-center justify-center gap-2 text-slate-400"
              >
                {busy ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-300" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                <span className="text-[11px] font-semibold">
                  {isAudio ? 'Choose audio file' : 'Choose image files'}
                </span>
                <span className="text-[9px] text-slate-600">
                  Files stay in your browser — nothing is uploaded automatically.
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept={isAudio ? 'audio/*' : 'image/*'}
                multiple={!isAudio}
                className="hidden"
                onChange={(event) => handleFiles(event.target.files)}
              />
              {uploads.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {uploads.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className={`relative rounded-lg overflow-hidden border transition ${
                        selected.includes(item.id)
                          ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      {isAudio ? (
                        <div className="h-16 flex items-center justify-center bg-black/40">
                          <Music className="w-4 h-4 text-fuchsia-300" />
                        </div>
                      ) : (
                        <img src={item.url} alt={item.name} className="h-16 w-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'url' && (
            <div className="space-y-2 max-w-lg">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {isAudio ? 'Audio URL' : 'Image URL'}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-500" />
                  <input
                    value={urlValue}
                    onChange={(event) => setUrlValue(event.target.value)}
                    placeholder="https://…"
                    className="w-full bg-black/40 border border-white/10 rounded-md pl-7 pr-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-emerald-400/60"
                  />
                </div>
                <button
                  onClick={handleUrlImport}
                  disabled={busy || !urlValue.trim()}
                  className="px-3 py-1.5 rounded-md bg-emerald-500 text-slate-950 text-[10px] font-bold disabled:opacity-40"
                >
                  {busy ? 'Fetching…' : 'Add'}
                </button>
              </div>
              <p className="text-[9px] text-slate-600 leading-relaxed">
                URLs are embedded as data so exports keep working. If the host blocks CORS the
                original URL is used instead.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-3 text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-400/30 rounded-md px-2 py-1.5">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-black/20">
          <p className="text-[10px] text-slate-500">
            {selected.length ? `${selected.length} selected` : 'Nothing selected yet'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-white/10 text-[10px] font-semibold text-slate-300 hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider transition disabled:opacity-40"
              disabled={!chosen.length}
            >
              {isAudio ? 'Use audio' : targetShotId ? 'Replace plate' : `Import ${chosen.length || ''}`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
