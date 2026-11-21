import React, { useCallback, useMemo, useState } from 'react';
import { useMaggi } from '../hooks/useMaggi';
import { PROVIDER_LABELS } from '../maggi/config';
import MaggiChat from './maggi/MaggiChat';
import MaggiSources from './maggi/MaggiSources';
import MaggiSettingsPanel from './maggi/MaggiSettings';
import { RagChunk } from '../services/maggi/types';

interface MaggiViewProps {
  onBack: () => void;
  /** Items from the active workspace session, offered as a one-click import. */
  workspaceItems?: Array<{ id: string; name: string; type: string; mimeType?: string; data: string }>;
  workspaceName?: string;
}

type Tab = 'chat' | 'sources' | 'settings';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

const inferType = (file: File): string => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.docx') || name.endsWith('.doc')) return 'document';
  if (name.endsWith('.html') || name.endsWith('.htm')) return 'html';
  if (name.endsWith('.sql')) return 'sql';
  if (name.endsWith('.csv')) return 'text';
  return 'text';
};

const TAB_META: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'sources', label: 'Sources', icon: '📚' },
  { id: 'settings', label: 'Settings', icon: '⚙︎' },
];

const MaggiView: React.FC<MaggiViewProps> = ({ onBack, workspaceItems = [], workspaceName }) => {
  const [tab, setTab] = useState<Tab>('chat');
  const [toast, setToast] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<{ docId: string; chunkId: string } | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  const maggi = useMaggi({ workspaceItems });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const handleIngestFiles = useCallback(async (files: File[]) => {
    const sources = await Promise.all(files.map(async (file) => ({
      name: file.name,
      type: inferType(file),
      mimeType: file.type,
      data: await fileToBase64(file),
    })));
    const results = await maggi.ingest(sources);
    const indexed = results.filter((r) => r.docId && !r.skipped);
    const skipped = results.filter((r) => r.skipped);
    const failed = results.filter((r) => r.error);
    const parts: string[] = [];
    if (indexed.length) parts.push(`✅ ${indexed.length} indexed (${indexed.reduce((n, r) => n + r.chunks, 0)} chunks)`);
    if (skipped.length) parts.push(`⏭ ${skipped.length} unchanged`);
    if (failed.length) parts.push(`⚠️ ${failed.length} failed: ${failed[0].error?.slice(0, 90)}`);
    showToast(parts.join(' · ') || 'Nothing to ingest.');
    return results;
  }, [maggi, showToast]);

  const handleIngestUrl = useCallback(async (url: string) => {
    const results = await maggi.ingest([{ name: url, type: 'link', data: url }]);
    const r = results[0];
    if (r?.error) showToast(`⚠️ ${r.error.slice(0, 140)}`);
    else showToast(`✅ Indexed ${url} → ${r?.chunks ?? 0} chunks`);
    return results;
  }, [maggi, showToast]);

  const handleAddNote = useCallback(async (title: string, text: string) => {
    const r = await maggi.addNote(title, text);
    showToast(r.error ? `⚠️ ${r.error}` : `✅ Note indexed → ${r.chunks} chunks`);
    return r;
  }, [maggi, showToast]);

  const handleImportWorkspace = useCallback(async () => {
    const results = await maggi.importWorkspace();
    if (!results.length) {
      showToast('No sources in the active workspace.');
      return results;
    }
    const chunks = results.reduce((n, r) => n + r.chunks, 0);
    showToast(`⚡ Imported ${results.length} workspace sources → ${chunks} chunks`);
    return results;
  }, [maggi, showToast]);

  const handleJump = useCallback((chunkId: string, docId: string) => {
    setHighlight({ chunkId, docId });
    setTab('sources');
  }, []);

  const stats = maggi.stats;
  const hasIndex = stats.chunks > 0;

  const chunkLookup = useMemo(() => {
    if (!highlight) return null;
    const chunks = maggi.getChunks(highlight.docId);
    return chunks.find((c) => c.id === highlight.chunkId) ?? null;
  }, [highlight, maggi]);

  const settingsForChat = maggi.settings;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-app-bg" data-theme="maggi">
      {/* ---------------- top bar ---------------- */}
      <header className="flex flex-wrap items-center gap-2 border-b border-app-border bg-app-panel px-4 py-2.5">
        <button
          onClick={onBack}
          className="grid h-8 w-8 place-items-center rounded-lg border border-app-border text-app-dim transition-colors hover:text-app-text"
          title="Back to library"
        >
          ←
        </button>

        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-black text-black">
            M
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black tracking-tight text-app-text">MAGGI</h1>
              <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400">
                RAG engine
              </span>
            </div>
            <p className="text-[9px] text-app-dim">Modular Augmented Generation &amp; Grounded Intelligence</p>
          </div>
        </div>

        {/* tabs */}
        <nav className="ml-4 flex rounded-lg border border-app-border bg-app-bg p-0.5">
          {TAB_META.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1 text-[11px] font-bold transition-colors ${tab === t.id ? 'bg-app-text text-app-bg' : 'text-app-dim hover:text-app-text'}`}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setStatsOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-app-border px-2.5 py-1.5 text-[10px] font-bold text-app-dim hover:text-app-text"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${hasIndex ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {stats.documents} docs · {stats.chunks} chunks
          </button>
          <span className="hidden rounded-lg bg-app-bg px-2 py-1.5 text-[10px] font-bold text-app-dim sm:block">
            🧠 {PROVIDER_LABELS[settingsForChat.provider]}
          </span>
        </div>
      </header>

      {/* ---------------- stats drawer ---------------- */}
      {statsOpen && (
        <div className="grid grid-cols-2 gap-2 border-b border-app-border bg-app-panel/60 px-4 py-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            ['Documents', stats.documents],
            ['Chunks', stats.chunks],
            ['Characters', stats.characters.toLocaleString()],
            ['Vocabulary', stats.vocabulary.toLocaleString()],
            ['Vectors', `${stats.chunks} × ${stats.dims || 0}`],
            ['Index size', `${(stats.approxBytes / 1024).toFixed(0)} KB`],
            ['Queries', maggi.usage.queries],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-app-border bg-app-bg/60 px-2.5 py-1.5">
              <div className="text-[8px] font-bold uppercase tracking-wide text-app-dim">{label}</div>
              <div className="text-xs font-bold tabular-nums text-app-text">{value}</div>
            </div>
          ))}
          <div className="col-span-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-1.5 sm:col-span-4 lg:col-span-7">
            <div className="text-[8px] font-bold uppercase tracking-wide text-emerald-400">Embedding backend</div>
            <div className="text-[10px] text-app-text">
              {maggi.backendLabel}
              {maggi.usage.lastQueryMs ? ` · last retrieval ${maggi.usage.lastQueryMs}ms` : ''}
              {maggi.usage.lastTrace.length ? ` · ${maggi.usage.lastTrace.join(', ')}` : ''}
              {maggi.usage.lastRoutedVia ? ` · routed via ${maggi.usage.lastRoutedVia}` : ''}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- highlighted chunk ---------------- */}
      {highlight && chunkLookup && tab === 'sources' && (
        <div className="border-b border-emerald-500/30 bg-emerald-500/5 px-4 py-2">
          <div className="flex items-start gap-2">
            <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
              chunk #{chunkLookup.index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[10px] font-bold text-app-text">{chunkLookup.docName}</div>
              <p className="line-clamp-3 text-[10px] leading-relaxed text-app-dim">{chunkLookup.text}</p>
            </div>
            <button onClick={() => setHighlight(null)} className="text-[10px] text-app-dim hover:text-app-text">✕</button>
          </div>
        </div>
      )}

      {/* ---------------- body ---------------- */}
      <main className="min-h-0 flex-1">
        {tab === 'chat' && (
          <MaggiChat
            messages={maggi.messages}
            isAnswering={maggi.isAnswering}
            hasIndex={hasIndex}
            stats={{ documents: stats.documents, chunks: stats.chunks }}
            backendLabel={maggi.backendLabel}
            providerLabel={PROVIDER_LABELS[settingsForChat.provider]}
            onAsk={maggi.ask}
            onStop={maggi.stop}
            onClear={maggi.clearChat}
            onOpenSettings={() => setTab('settings')}
            onJumpToSource={handleJump}
          />
        )}

        {tab === 'sources' && (
          <MaggiSources
            documents={maggi.documents}
            isIngesting={maggi.isIngesting}
            progress={maggi.progress}
            workspaceCount={workspaceItems.length}
            onIngestFiles={handleIngestFiles}
            onIngestUrl={handleIngestUrl}
            onAddNote={handleAddNote}
            onImportWorkspace={handleImportWorkspace}
            onRemove={maggi.removeDocument}
            onClear={maggi.clearIndex}
            getChunks={maggi.getChunks}
            getRelated={maggi.getRelated}
          />
        )}

        {tab === 'settings' && (
          <div className="h-full overflow-y-auto custom-scrollbar p-4">
            <div className="mx-auto max-w-2xl">
              {!maggi.isReady && <div className="mb-3 text-[10px] text-app-dim">Loading index…</div>}
              {workspaceName && (
                <div className="mb-3 rounded-lg border border-app-border bg-app-panel/50 px-3 py-2 text-[10px] text-app-dim">
                  Workspace in context: <span className="font-bold text-app-text">{workspaceName}</span>
                  {' · '}{workspaceItems.length} sources available to import
                </div>
              )}
              <MaggiSettingsPanel
                settings={maggi.settings}
                onChange={maggi.updateSettings}
                onReset={maggi.resetSettings}
              />
            </div>
          </div>
        )}
      </main>

      {/* ---------------- toast ---------------- */}
      {toast && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-[120] -translate-x-1/2 rounded-xl border border-app-border bg-app-panel px-4 py-2 text-[11px] font-semibold text-app-text shadow-2xl">
          {toast}
        </div>
      )}

      {maggi.error && tab === 'chat' && (
        <div className="absolute bottom-24 left-1/2 z-[110] -translate-x-1/2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[10px] text-red-300">
          {maggi.error}
        </div>
      )}
    </div>
  );
};

export default MaggiView;
