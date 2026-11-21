import React, { useRef, useState } from 'react';
import { RagDocument, RagChunk } from '../../services/maggi/types';
import { IngestProgress } from '../../services/maggi/store';

interface Props {
  documents: RagDocument[];
  isIngesting: boolean;
  progress: IngestProgress | null;
  workspaceCount: number;
  onIngestFiles: (files: File[]) => Promise<unknown>;
  onIngestUrl: (url: string) => Promise<unknown>;
  onAddNote: (title: string, text: string) => Promise<unknown>;
  onImportWorkspace: () => Promise<unknown>;
  onRemove: (docId: string) => Promise<void>;
  onClear: () => Promise<void>;
  getChunks: (docId: string) => RagChunk[];
  getRelated: (chunkId: string, limit?: number) => RagChunk[];
}

const TYPE_ICON: Record<string, string> = {
  pdf: '📕', text: '📄', document: '📄', link: '🔗', html: '🌐', sql: '🗄️', image: '🖼️', audio: '🎧', video: '🎬',
};

const fmt = (n: number) => n.toLocaleString();

const MaggiSources: React.FC<Props> = ({
  documents,
  isIngesting,
  progress,
  workspaceCount,
  onIngestFiles,
  onIngestUrl,
  onAddNote,
  onImportWorkspace,
  onRemove,
  onClear,
  getChunks,
  getRelated,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [url, setUrl] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeChunk, setActiveChunk] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    await onIngestFiles(list);
  };

  const submitUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setBusy('url');
    try {
      await onIngestUrl(trimmed);
      setUrl('');
    } finally {
      setBusy(null);
    }
  };

  const submitNote = async () => {
    if (!noteBody.trim()) return;
    setBusy('note');
    try {
      await onAddNote(noteTitle.trim() || 'Note', noteBody);
      setNoteTitle('');
      setNoteBody('');
      setNoteOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const progressPct = progress && 'total' in progress && progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : null;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto custom-scrollbar p-4">
      {/* ---------------- ingest ------------- */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-colors ${dragOver ? 'border-emerald-400 bg-emerald-400/10' : 'border-app-border hover:border-app-text/40 bg-app-bg/40'}`}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.txt,.md,.csv,.json,.html,.htm,.sql,.xlsx,.xls"
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
        />
        <div className="text-2xl">📥</div>
        <div className="mt-1 text-xs font-bold text-app-text">Drop files to ingest</div>
        <div className="mt-0.5 text-[10px] text-app-dim">PDF · DOCX · TXT · MD · CSV · JSON · HTML · SQL</div>
      </div>

      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submitUrl(); }}
          placeholder="https://example.com/article"
          className="min-w-0 flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text outline-none focus:border-app-text/60"
        />
        <button
          onClick={submitUrl}
          disabled={!url.trim() || busy === 'url'}
          className="rounded-lg bg-app-text px-3 py-2 text-[11px] font-bold text-app-bg disabled:opacity-40"
        >
          Fetch URL
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setNoteOpen((v) => !v)}
          className="rounded-lg border border-app-border px-3 py-1.5 text-[11px] font-bold text-app-dim hover:text-app-text"
        >
          {noteOpen ? '− Close note' : '+ Add note'}
        </button>
        <button
          onClick={() => onImportWorkspace()}
          disabled={!workspaceCount || isIngesting}
          className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40"
          title="Index every source in the active workspace session"
        >
          ⚡ Import workspace ({workspaceCount})
        </button>
        {documents.length > 0 && (
          <button
            onClick={() => { if (confirm('Delete the entire MAGGI index? Sources in your workspaces are untouched.')) onClear(); }}
            className="ml-auto rounded-lg border border-app-border px-3 py-1.5 text-[11px] font-bold text-app-dim hover:border-red-400/40 hover:text-red-400"
          >
            Clear index
          </button>
        )}
      </div>

      {noteOpen && (
        <div className="space-y-2 rounded-xl border border-app-border bg-app-bg/60 p-3">
          <input
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Note title"
            className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-1.5 text-xs text-app-text outline-none"
          />
          <textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Paste any text — meeting notes, transcripts, a contract…"
            rows={6}
            className="w-full resize-y rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text outline-none custom-scrollbar"
          />
          <button
            onClick={submitNote}
            disabled={!noteBody.trim() || busy === 'note'}
            className="w-full rounded-lg bg-app-text px-3 py-2 text-[11px] font-bold text-app-bg disabled:opacity-40"
          >
            {busy === 'note' ? 'Indexing…' : 'Index note'}
          </button>
        </div>
      )}

      {/* ---------------- progress ------------- */}
      {progress && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
            <span className="truncate">
              {progress.stage === 'extract' && '📖 Extracting'}
              {progress.stage === 'chunk' && '✂️ Chunking'}
              {progress.stage === 'embed' && '🔢 Embedding'}
              {progress.stage === 'done' && '✅ Complete'}
              {progress.name ? ` · ${progress.name}` : ''}
            </span>
            {progressPct !== null && <span>{progressPct}%</span>}
          </div>
          {progressPct !== null && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-app-border">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          )}
        </div>
      )}

      {/* ---------------- documents ------------- */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-app-dim">Indexed sources</h4>
          <span className="text-[10px] text-app-dim">{documents.length} docs</span>
        </div>

        {!documents.length && (
          <div className="rounded-xl border border-app-border bg-app-bg/40 p-4 text-center">
            <p className="text-xs text-app-dim">No sources indexed yet.</p>
            <p className="mt-1 text-[10px] text-app-dim/80">Drop a file, fetch a URL, or import the active workspace.</p>
          </div>
        )}

        {documents.map((doc) => {
          const chunks = expanded === doc.id ? getChunks(doc.id) : [];
          return (
            <div key={doc.id} className="overflow-hidden rounded-xl border border-app-border bg-app-panel/60">
              <div className="flex items-start gap-2 p-3">
                <span className="text-base leading-none">{TYPE_ICON[doc.sourceType] ?? '📄'}</span>
                <button
                  onClick={() => { setExpanded(expanded === doc.id ? null : doc.id); setActiveChunk(null); }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-xs font-semibold text-app-text">{doc.name}</div>
                  <div className="mt-0.5 text-[10px] text-app-dim">
                    {doc.chunkCount} chunks · {fmt(doc.chars)} chars · {new Date(doc.updatedAt).toLocaleDateString()}
                    {doc.chunkCount > 0 && <span className="text-emerald-400"> · ✓ indexed</span>}
                  </div>
                </button>
                <button
                  onClick={() => onRemove(doc.id)}
                  className="rounded px-1.5 py-0.5 text-[10px] text-app-dim hover:bg-red-500/10 hover:text-red-400"
                  title="Remove from index"
                >
                  ✕
                </button>
              </div>

              {expanded === doc.id && (
                <div className="border-t border-app-border bg-app-bg/60 p-2">
                  <div className="max-h-72 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {chunks.map((chunk) => (
                      <div key={chunk.id}>
                        <button
                          onClick={() => setActiveChunk(activeChunk === chunk.id ? null : chunk.id)}
                          className="w-full rounded-lg border border-app-border/60 bg-app-panel/50 p-2 text-left hover:border-app-text/40"
                        >
                          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-app-dim">
                            <span className="rounded bg-app-bg px-1 py-0.5 text-app-text">#{chunk.index + 1}</span>
                            <span>~{chunk.tokenEstimate} tok</span>
                            {chunk.breadcrumb.length > 0 && (
                              <span className="truncate text-emerald-400/80">{chunk.breadcrumb.join(' › ')}</span>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-app-dim">{chunk.text.slice(0, 180)}…</p>
                        </button>
                        {activeChunk === chunk.id && (
                          <div className="mt-1 space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2">
                            <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-app-text">{chunk.text}</p>
                            <div>
                              <div className="mb-1 text-[9px] font-bold uppercase text-app-dim">Semantically related</div>
                              <div className="space-y-1">
                                {getRelated(chunk.id, 3).map((rel) => (
                                  <div key={rel.id} className="truncate rounded bg-app-bg/60 px-2 py-1 text-[10px] text-app-dim">
                                    <span className="text-emerald-400">#{rel.index + 1}</span> {rel.text.slice(0, 110)}…
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MaggiSources;
