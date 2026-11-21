import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MaggiChatMessage } from '../../hooks/useMaggi';
import { RetrievedContext } from '../../services/maggi/types';

interface Props {
  messages: MaggiChatMessage[];
  isAnswering: boolean;
  hasIndex: boolean;
  stats: { documents: number; chunks: number };
  backendLabel: string;
  providerLabel: string;
  onAsk: (q: string, streaming: boolean) => void;
  onStop: () => void;
  onClear: () => void;
  onOpenSettings: () => void;
  onJumpToSource: (chunkId: string, docId: string) => void;
}

const SUGGESTIONS = [
  'Summarise the key points across all sources.',
  'What are the main risks mentioned, with quotes?',
  'Create a timeline of events from the documents.',
  'Compare what two sources say about the same topic.',
];

const ScoreBar: React.FC<{ label: string; value: number; max?: number; tone?: string }> = ({ label, value, max = 1, tone = 'bg-emerald-400' }) => (
  <div className="flex items-center gap-1.5">
    <span className="w-10 shrink-0 text-[8px] font-bold uppercase text-app-dim">{label}</span>
    <div className="h-1 flex-1 overflow-hidden rounded-full bg-app-border">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(2, Math.min(100, (value / max) * 100))}%` }} />
    </div>
    <span className="w-8 text-right text-[8px] tabular-nums text-app-dim">{(value * 100).toFixed(0)}</span>
  </div>
);

const RetrievalInspector: React.FC<{ ctx: RetrievedContext; onJump: Props['onJumpToSource'] }> = ({ ctx, onJump }) => {
  const [open, setOpen] = useState(false);
  const maxScore = Math.max(...ctx.chunks.map((c) => c.score), 0.0001);
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-app-border bg-app-bg/60">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left">
        <span className="text-[10px] font-bold uppercase tracking-wide text-app-dim">
          {open ? '▾' : '▸'} Retrieval · {ctx.chunks.length} passages · ~{ctx.tokens} tokens · {ctx.latencyMs}ms
        </span>
        <span className="ml-auto flex gap-1">
          {ctx.trace.map((t, i) => (
            <span key={i} className="rounded bg-app-panel px-1 py-0.5 text-[8px] font-bold text-app-dim">{t}</span>
          ))}
        </span>
      </button>
      {open && (
        <div className="space-y-1.5 border-t border-app-border p-2">
          {ctx.chunks.map((sc, i) => (
            <button
              key={sc.chunk.id}
              onClick={() => onJump(sc.chunk.id, sc.chunk.docId)}
              className="w-full rounded-lg border border-app-border/60 bg-app-panel/50 p-2 text-left hover:border-emerald-400/40"
            >
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-emerald-400/15 px-1 py-0.5 text-[9px] font-bold text-emerald-400">[{i + 1}]</span>
                <span className="truncate text-[10px] font-semibold text-app-text">{sc.chunk.docName}</span>
                {sc.chunk.breadcrumb.length > 0 && (
                  <span className="truncate text-[9px] text-app-dim">{sc.chunk.breadcrumb.slice(-1)[0]}</span>
                )}
                <span className="ml-auto text-[9px] tabular-nums text-app-dim">#{sc.chunk.index + 1}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-app-dim">{sc.chunk.text}</p>
              <div className="mt-1.5 space-y-0.5">
                <ScoreBar label="fused" value={sc.score} max={maxScore} />
                <ScoreBar label="sem" value={Math.max(0, sc.vectorScore)} tone="bg-sky-400" />
                <ScoreBar label="lex" value={Math.min(1, sc.keywordScore / 12)} tone="bg-amber-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const MaggiChat: React.FC<Props> = ({
  messages,
  isAnswering,
  hasIndex,
  stats,
  backendLabel,
  providerLabel,
  onAsk,
  onStop,
  onClear,
  onOpenSettings,
  onJumpToSource,
}) => {
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const submit = () => {
    const q = input.trim();
    if (!q || isAnswering) return;
    onAsk(q, streaming);
    setInput('');
  };

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-app-border px-4 py-2.5">
        <span className="text-[11px] font-bold text-app-text">{providerLabel}</span>
        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">{backendLabel}</span>
        <span className="text-[9px] text-app-dim">{stats.documents} docs · {stats.chunks} chunks</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setStreaming((v) => !v)}
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold transition-colors ${streaming ? 'bg-app-text text-app-bg' : 'bg-app-panel text-app-dim'}`}
            title="Toggle token streaming"
          >
            ⚡ Stream {streaming ? 'on' : 'off'}
          </button>
          <button onClick={onOpenSettings} className="text-[10px] font-bold text-app-dim hover:text-app-text">⚙︎ Settings</button>
          {messages.length > 0 && (
            <button onClick={onClear} className="text-[10px] font-bold text-app-dim hover:text-red-400">Clear chat</button>
          )}
        </div>
      </div>

      {/* messages */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto custom-scrollbar px-4 py-4">
        {messages.length === 0 && (
          <div className="mx-auto max-w-md py-8 text-center">
            <div className="text-3xl">🧠</div>
            <h3 className="mt-2 text-sm font-bold text-app-text">Ask MAGGI</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-app-dim">
              {hasIndex
                ? 'Answers are grounded in your indexed sources and cite the exact passage for every claim.'
                : 'Add a source first — drop a file, fetch a URL, or import your active workspace.'}
            </p>
            {hasIndex && (
              <div className="mt-4 space-y-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => onAsk(s, streaming)}
                    className="w-full rounded-lg border border-app-border bg-app-bg/50 px-3 py-2 text-left text-[11px] text-app-dim transition-colors hover:border-app-text/40 hover:text-app-text"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-[11px]">🧠</div>
            )}
            <div className={`min-w-0 ${msg.role === 'user' ? 'max-w-[85%]' : 'max-w-full flex-1'}`}>
              {msg.role === 'user' ? (
                <div className="rounded-2xl rounded-tr-sm bg-app-text px-3 py-2 text-xs leading-relaxed text-app-bg">
                  {msg.content}
                </div>
              ) : (
                <div className={`rounded-xl border px-3 py-2 ${msg.error ? 'border-red-500/40 bg-red-500/5' : 'border-app-border bg-app-panel/50'}`}>
                  <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed text-app-text [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_code]:rounded [&_code]:bg-app-bg [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[11px] [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h1]:mt-3 [&_h2]:mt-3 [&_h3]:mt-3 [&_table]:text-[10px]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content || (msg.isStreaming ? '▍' : '')}
                    </ReactMarkdown>
                  </div>

                  {msg.isStreaming && msg.content && <span className="inline-block animate-pulse text-emerald-400">▍</span>}

                  {/* citations */}
                  {!!msg.citations?.length && (
                    <div className="mt-2 space-y-1 border-t border-app-border pt-2">
                      <div className="text-[9px] font-bold uppercase tracking-wide text-app-dim">Sources</div>
                      {msg.citations.map((c) => (
                        <button
                          key={c.marker}
                          onClick={() => onJumpToSource(c.chunkId, c.docId)}
                          className="flex w-full gap-1.5 rounded-lg bg-app-bg/60 p-1.5 text-left hover:bg-app-bg"
                        >
                          <span className="mt-0.5 rounded bg-emerald-400/15 px-1 py-0.5 text-[9px] font-bold text-emerald-400">[{c.marker}]</span>
                          <span className="min-w-0">
                            <span className="block truncate text-[10px] font-semibold text-app-text">{c.docName}</span>
                            <span className="block line-clamp-1 text-[9px] text-app-dim">{c.snippet}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.retrieval && <RetrievalInspector ctx={msg.retrieval} onJump={onJumpToSource} />}

                  {msg.usage && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] text-app-dim">
                      <span>{msg.usage.model}</span>
                      {msg.usage.routedVia && <span className="rounded bg-app-bg px-1 py-0.5 text-emerald-400/80">via {msg.usage.routedVia}</span>}
                      {msg.usage.promptTokens ? <span>{msg.usage.promptTokens}→{msg.usage.completionTokens} tok</span> : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* composer */}
      <div className="border-t border-app-border p-3">
        <div className="flex items-end gap-2 rounded-xl border border-app-border bg-app-bg p-1.5 focus-within:border-app-text/50">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder={hasIndex ? 'Ask anything about your sources… (Enter to send)' : 'Add a source to start…'}
            disabled={!hasIndex}
            className="max-h-32 min-h-[32px] flex-1 resize-none bg-transparent px-2 py-1.5 text-xs text-app-text outline-none placeholder:text-app-dim/70 disabled:opacity-50 custom-scrollbar"
          />
          {isAnswering ? (
            <button onClick={onStop} className="rounded-lg bg-red-500/20 px-3 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-500/30">
              Stop
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!input.trim() || !hasIndex}
              className="rounded-lg bg-app-text px-3 py-1.5 text-[11px] font-bold text-app-bg disabled:opacity-30"
            >
              Ask ↑
            </button>
          )}
        </div>
        <div className="mt-1 px-1 text-[9px] text-app-dim">
          Grounded answers with inline citations · retrieval runs locally in your browser
        </div>
      </div>
    </div>
  );
};

export default MaggiChat;
