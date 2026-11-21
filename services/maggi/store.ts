/**
 * MAGGI store — the orchestrator that owns the index lifecycle.
 *
 * Responsibilities:
 *  - ingest sources → extract → chunk → embed → index (BM25 + vectors)
 *  - incremental re-indexing: unchanged docs are skipped via content hash,
 *    changed docs have only their own chunks replaced
 *  - persistence in IndexedDB (large corpora) with a localStorage metadata
 *    fallback, so a reload doesn't force re-embedding (the expensive part)
 *  - retrieval + grounded answering with citations
 *  - usage/telemetry counters for the dashboard
 *
 * This is a deliberate upgrade over the app's previous approach (packing every
 * media item into one 300k-char prompt or a Gemini context cache): the model
 * now receives only the most relevant ~8 passages, each with provenance.
 */

import {
  RagChunk,
  RagDocument,
  RagIndexStats,
  RetrievalOptions,
  RetrievedContext,
  Citation,
  RagAnswer,
  ExtractedText,
} from './types';
import { chunkDocument } from './chunker';
import { Bm25Index } from './bm25';
import { VectorIndex } from './vectorStore';
import { embedTexts, embedQuery as embedOne, EmbedConfig } from './embeddings';
import { retrieve, buildContextBlock } from './retriever';
import { extractFromSource, IngestSource } from './extract';
import { hashString, estimateTokens } from './text';
import {
  MaggiSettings,
  DEFAULT_MAGGI_SETTINGS,
  MAGGI_SETTINGS_KEY,
  MAGGI_INDEX_KEY,
  MAGGI_SYSTEM_PROMPT,
  MAGGI_CITATION_INSTRUCTION,
} from '../../maggi/config';
import { createBrain, brainAsLlm } from './brain';

const IDB_NAME = 'MAGGI_RAG_DB';
const IDB_VERSION = 1;
const IDB_STORE = 'index';

interface PersistedIndex {
  version: 1;
  documents: RagDocument[];
  chunks: RagChunk[];
  vectors: { dims: number; entries: Array<[string, number[]]> };
  vectorBackend: string;
  savedAt: number;
}

export interface MaggiUsage {
  queries: number;
  chunksRetrieved: number;
  chunksIndexed: number;
  lastQueryMs: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  byProvider: Record<string, number>;
  lastTrace: string[];
  lastRoutedVia?: string;
}

export interface QueryResult extends RagAnswer {
  retrieval: RetrievedContext;
}

const EMPTY_USAGE: MaggiUsage = {
  queries: 0,
  chunksRetrieved: 0,
  chunksIndexed: 0,
  lastQueryMs: 0,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  byProvider: {},
  lastTrace: [],
};

// ---------------------------------------------------------------------------
// Settings persistence
// ---------------------------------------------------------------------------

export const loadMaggiSettings = (): MaggiSettings => {
  try {
    const raw = localStorage.getItem(MAGGI_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_MAGGI_SETTINGS };
    return { ...DEFAULT_MAGGI_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_MAGGI_SETTINGS };
  }
};

export const saveMaggiSettings = (settings: MaggiSettings): void => {
  try {
    localStorage.setItem(MAGGI_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* quota — non fatal */
  }
};

// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------

const openDb = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

const idbPut = async (key: string, value: unknown): Promise<boolean> => {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
};

const idbGet = async <T,>(key: string): Promise<T | null> => {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export type IngestProgress =
  | { stage: 'extract'; name: string; done: number; total: number }
  | { stage: 'chunk'; name: string; done: number; total: number }
  | { stage: 'embed'; name: string; done: number; total: number }
  | { stage: 'done'; name: string; done: number; total: number };

export class MaggiStore {
  private settings: MaggiSettings;
  private bm25 = new Bm25Index();
  private vectors = new VectorIndex();
  private documents = new Map<string, RagDocument>();
  private chunkIndex = new Map<string, RagChunk>();
  private vectorBackend: RagIndexStats['vectorBackend'] = 'none';
  private usage: MaggiUsage = { ...EMPTY_USAGE };
  private ready = false;

  constructor(settings?: MaggiSettings) {
    this.settings = settings ?? loadMaggiSettings();
  }

  // --- lifecycle -----------------------------------------------------------

  async hydrate(): Promise<void> {
    if (this.ready) return;
    let snapshot = await idbGet<PersistedIndex>('index');
    if (!snapshot) {
      try {
        const raw = localStorage.getItem(MAGGI_INDEX_KEY);
        if (raw) snapshot = JSON.parse(raw) as PersistedIndex;
      } catch {
        snapshot = null;
      }
    }
    if (snapshot?.chunks?.length) {
      for (const doc of snapshot.documents ?? []) this.documents.set(doc.id, doc);
      for (const chunk of snapshot.chunks) {
        this.chunkIndex.set(chunk.id, chunk);
      }
      this.bm25.addChunks(snapshot.chunks);
      for (const [id, vec] of snapshot.vectors?.entries ?? []) {
        const chunk = this.chunkIndex.get(id);
        if (chunk) this.vectors.add(chunk, vec);
      }
      this.vectorBackend = (snapshot.vectorBackend as any) ?? 'hash';
    }
    this.ready = true;
  }

  async persist(): Promise<void> {
    const snapshot: PersistedIndex = {
      version: 1,
      documents: Array.from(this.documents.values()),
      chunks: Array.from(this.chunkIndex.values()),
      vectors: this.vectors.toSerialisable(),
      vectorBackend: this.vectorBackend,
      savedAt: Date.now(),
    };
    const ok = await idbPut('index', snapshot);
    if (!ok) {
      try {
        localStorage.setItem(MAGGI_INDEX_KEY, JSON.stringify(snapshot));
      } catch {
        console.warn('[MAGGI] Could not persist index (quota exceeded). Index is in-memory only.');
      }
    }
  }

  getSettings(): MaggiSettings {
    return this.settings;
  }

  updateSettings(patch: Partial<MaggiSettings>): MaggiSettings {
    this.settings = { ...this.settings, ...patch };
    saveMaggiSettings(this.settings);
    return this.settings;
  }

  private embedConfig(): EmbedConfig {
    return {
      backend: this.settings.embeddingBackend,
      geminiModel: this.settings.embeddingModel,
      freeLlmApiBaseUrl: this.settings.freeLlmApiBaseUrl,
      freeLlmApiKey: this.settings.freeLlmApiKey,
      preferFreeLlm: this.settings.provider === 'freellmapi',
    };
  }

  // --- ingestion -----------------------------------------------------------

  /**
   * Ingest a batch of sources. Skips documents whose content hash is unchanged.
   * Returns per-source outcomes so the UI can show what was skipped/failed.
   */
  async ingest(
    sources: IngestSource[],
    onProgress?: (p: IngestProgress) => void,
  ): Promise<Array<{ name: string; docId?: string; chunks: number; skipped?: boolean; error?: string; warnings?: string[] }>> {
    await this.hydrate();
    const outcomes: Array<{ name: string; docId?: string; chunks: number; skipped?: boolean; error?: string; warnings?: string[] }> = [];
    const total = sources.length;

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      try {
        onProgress?.({ stage: 'extract', name: source.name, done: i, total });

        const extracted: ExtractedText = await extractFromSource(source);
        const text = extracted.text || '';
        if (text.trim().length < 20) {
          outcomes.push({
            name: source.name,
            chunks: 0,
            error: extracted.warnings?.join(' ') || 'No readable text found in this source.',
            warnings: extracted.warnings,
          });
          continue;
        }

        const docHash = hashString(text);
        const docId = source.id ? `doc-${source.id}` : `doc-${hashString(source.name + docHash)}`;

        const existing = this.documents.get(docId);
        if (existing && existing.hash === docHash) {
          outcomes.push({ name: source.name, docId, chunks: existing.chunkCount, skipped: true });
          continue;
        }

        // Remove stale chunks for this doc (incremental re-index).
        if (existing) this.removeDocumentInternal(docId);

        onProgress?.({ stage: 'chunk', name: source.name, done: i, total });
        const chunks = chunkDocument({
          docId,
          docName: extracted.title || source.name,
          sourceType: source.type || 'text',
          text,
          metadata: { addedAt: Date.now(), sourceId: source.id, ...(extracted.metadata ?? {}) },
          options: {
            strategy: this.settings.chunkStrategy,
            maxChars: this.settings.chunkSize,
            overlapChars: this.settings.chunkOverlap,
          },
        });

        if (!chunks.length) {
          outcomes.push({ name: source.name, chunks: 0, error: 'Document produced no usable chunks.' });
          continue;
        }

        // Embed in batches so progress is visible and we don't blow the payload limit.
        onProgress?.({ stage: 'embed', name: source.name, done: 0, total: chunks.length });
        const batchSize = 48;
        const storedVectors: number[][] = [];
        for (let b = 0; b < chunks.length; b += batchSize) {
          const batch = chunks.slice(b, b + batchSize);
          const result = await embedTexts(batch.map((c) => c.text), this.embedConfig());
          storedVectors.push(...result.vectors);
          this.vectorBackend = result.provider;
          onProgress?.({
            stage: 'embed',
            name: source.name,
            done: Math.min(chunks.length, b + batch.length),
            total: chunks.length,
          });
        }

        chunks.forEach((chunk, idx) => {
          this.chunkIndex.set(chunk.id, chunk);
          this.bm25.addChunk(chunk);
          const vec = storedVectors[idx];
          if (vec?.length) this.vectors.add(chunk, vec);
        });

        const doc: RagDocument = {
          id: docId,
          name: extracted.title || source.name,
          sourceType: source.type || 'text',
          mimeType: source.mimeType,
          chars: text.length,
          chunkCount: chunks.length,
          hash: docHash,
          addedAt: existing?.addedAt ?? Date.now(),
          updatedAt: Date.now(),
          tags: [],
        };
        this.documents.set(docId, doc);

        this.usage.chunksIndexed += chunks.length;
        outcomes.push({
          name: source.name,
          docId,
          chunks: chunks.length,
          warnings: extracted.warnings,
        });
      } catch (e) {
        outcomes.push({ name: source.name, chunks: 0, error: (e as Error).message });
      }
    }

    onProgress?.({ stage: 'done', name: '', done: total, total });
    await this.persist();
    return outcomes;
  }

  /** Ingest freeform note text (used by the "Add note" box). */
  async addNote(title: string, text: string): Promise<{ docId?: string; chunks: number; error?: string }> {
    const result = await this.ingest([{
      id: `note-${hashString(title + text).slice(0, 8)}`,
      name: title || 'Untitled note',
      type: 'text',
      data: text,
    }]);
    const r = result[0];
    return { docId: r.docId, chunks: r.chunks, error: r.error };
  }

  /** Pull every selected media item from a workspace session into the index. */
  async ingestMediaItems(
    items: Array<{ id: string; name: string; type: string; mimeType?: string; data: string }>,
    onProgress?: (p: IngestProgress) => void,
  ): Promise<ReturnType<MaggiStore['ingest']> extends Promise<infer U> ? U : never> {
    return this.ingest(
      items.map((it) => ({ id: it.id, name: it.name, type: it.type, mimeType: it.mimeType, data: it.data })),
      onProgress,
    );
  }

  private removeDocumentInternal(docId: string): void {
    const removed = this.bm25.removeByDoc(docId);
    this.vectors.removeByDoc(docId);
    for (const id of removed) this.chunkIndex.delete(id);
    this.documents.delete(docId);
  }

  async removeDocument(docId: string): Promise<void> {
    this.removeDocumentInternal(docId);
    await this.persist();
  }

  async clear(): Promise<void> {
    this.bm25.clear();
    this.vectors.clear();
    this.documents.clear();
    this.chunkIndex.clear();
    this.vectorBackend = 'none';
    this.usage = { ...EMPTY_USAGE };
    await idbPut('index', null);
    try {
      localStorage.removeItem(MAGGI_INDEX_KEY);
    } catch {
      /* ignore */
    }
  }

  // --- inspection ----------------------------------------------------------

  listDocuments(): RagDocument[] {
    return Array.from(this.documents.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getDocument(docId: string): RagDocument | undefined {
    return this.documents.get(docId);
  }

  getChunksForDocument(docId: string): RagChunk[] {
    return Array.from(this.chunkIndex.values())
      .filter((c) => c.docId === docId)
      .sort((a, b) => a.index - b.index);
  }

  /** Chunks most similar to a given chunk (used in the inspector). */
  relatedChunks(chunkId: string, limit = 5): RagChunk[] {
    const chunk = this.chunkIndex.get(chunkId);
    if (!chunk) return [];
    const vec = this.vectors.getVector(chunkId);
    if (vec) {
      return this.vectors.search(Array.from(vec), limit + 1)
        .filter((h) => h.chunkId !== chunkId)
        .slice(0, limit)
        .map((h) => this.chunkIndex.get(h.chunkId))
        .filter(Boolean) as RagChunk[];
    }
    const hits = this.bm25.search(chunk.text.slice(0, 400), limit + 1);
    return hits
      .filter((h) => h.chunkId !== chunkId)
      .slice(0, limit)
      .map((h) => this.chunkIndex.get(h.chunkId))
      .filter(Boolean) as RagChunk[];
  }

  stats(): RagIndexStats {
    let characters = 0;
    for (const c of this.chunkIndex.values()) characters += c.text.length;
    return {
      documents: this.documents.size,
      chunks: this.chunkIndex.size,
      characters,
      vocabulary: this.bm25.vocabularySize,
      approxBytes: this.vectors.approxBytes + characters * 2,
      vectorBackend: this.vectorBackend,
      dims: this.vectors.dimensions,
      lastIndexedAt: Math.max(0, ...Array.from(this.documents.values()).map((d) => d.updatedAt)) || undefined,
    };
  }

  getUsage(): MaggiUsage {
    return { ...this.usage };
  }

  // --- retrieval + answering ----------------------------------------------

  async retrieveContext(query: string, options?: RetrievalOptions): Promise<RetrievedContext> {
    await this.hydrate();
    const opts: RetrievalOptions = {
      topK: this.settings.topK,
      candidateK: this.settings.candidateK,
      vectorWeight: this.settings.vectorWeight,
      mode: this.settings.retrievalMode,
      diversify: this.settings.diversify,
      diversityLambda: this.settings.diversityLambda,
      rerank: this.settings.rerank,
      recencyBoost: this.settings.recencyBoost,
      useHyde: this.settings.useHyde,
      multiQuery: this.settings.multiQuery,
      ...options,
    };

    const brain = createBrain(this.settings);
    const needsLlm = opts.rerank || opts.useHyde || opts.multiQuery;

    const ctx = await retrieve(
      query,
      {
        bm25: this.bm25,
        vectors: this.vectors,
        embedQuery: async (text: string) => {
          const { vector } = await embedOne(text, this.embedConfig());
          // Re-embedding with a different backend/dims would silently break
          // similarity — guard by padding/truncating to the index dimension.
          if (this.vectors.dimensions && vector.length !== this.vectors.dimensions) {
            return this.projectToDims(vector, this.vectors.dimensions);
          }
          return vector;
        },
        llm: needsLlm ? brainAsLlm(brain) : undefined,
      },
      opts,
      this.settings.maxContextChars,
    );

    this.usage.chunksRetrieved += ctx.chunks.length;
    this.usage.lastQueryMs = ctx.latencyMs;
    this.usage.lastTrace = ctx.trace;
    return ctx;
  }

  /** Keep query vectors in the same space as the index (hash↔neural drift). */
  private projectToDims(vector: number[], dims: number): number[] {
    if (vector.length === dims) return vector;
    if (vector.length > dims) {
      // fold the extra mass into the tail so no signal is lost outright
      const out = vector.slice(0, dims);
      for (let i = dims; i < vector.length; i++) out[i % dims] += vector[i] * 0.5;
      let n = 0;
      for (const v of out) n += v * v;
      const norm = Math.sqrt(n) || 1;
      return out.map((v) => v / norm);
    }
    return [...vector, ...new Array(dims - vector.length).fill(0)];
  }

  /** Non-LLM retrieval only — instant, useful for search-as-you-type. */
  async search(query: string, options?: RetrievalOptions): Promise<RetrievedContext> {
    return this.retrieveContext(query, { ...options, rerank: false, useHyde: false, multiQuery: false });
  }

  /**
   * Full RAG turn: retrieve → ground → generate → extract citations.
   */
  async ask(
    query: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    options: {
      retrieval?: RetrievalOptions;
      onDelta?: (delta: string) => void;
      signal?: AbortSignal;
      useStreaming?: boolean;
    } = {},
  ): Promise<QueryResult> {
    await this.hydrate();

    if (this.chunkIndex.size === 0) {
      throw new Error('MAGGI has no indexed sources yet. Add a source or import your workspace first.');
    }

    const retrieval = await this.retrieveContext(query, options.retrieval);
    if (!retrieval.chunks.length) {
      return {
        answer: 'I could not find anything relevant in the indexed sources. Try rephrasing, or add more sources.',
        citations: [],
        context: retrieval,
        retrieval,
      };
    }

    const brain = createBrain(this.settings);
    const langLine = this.settings.answerLanguage !== 'auto'
      ? `\nAnswer in ${this.settings.answerLanguage}.`
      : '';

    const system = `${MAGGI_SYSTEM_PROMPT(this.settings.groundingMode)}\n${MAGGI_CITATION_INSTRUCTION}${langLine}`;
    const userContent = `CONTEXT (retrieved passages):\n\n${retrieval.contextBlock}\n\n=== QUESTION ===\n${query}`;

    // Keep the last few turns for conversational follow-ups, but never let
    // history crowd out the retrieved context.
    const trimmedHistory = history.slice(-6).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }) as const);

    const messages = [
      { role: 'system' as const, content: system },
      ...trimmedHistory,
      { role: 'user' as const, content: userContent },
    ];

    let result;
    if (options.useStreaming && options.onDelta) {
      result = await brain.stream(messages, { temperature: this.settings.temperature, signal: options.signal }, options.onDelta);
    } else {
      result = await brain.complete(messages, { temperature: this.settings.temperature, signal: options.signal });
    }

    const citations = this.extractCitations(result.text, retrieval);

    this.usage.queries += 1;
    this.usage.totalPromptTokens += result.usage?.promptTokens ?? estimateTokens(system + userContent);
    this.usage.totalCompletionTokens += result.usage?.completionTokens ?? estimateTokens(result.text);
    this.usage.byProvider[result.provider] = (this.usage.byProvider[result.provider] ?? 0) + 1;
    this.usage.lastRoutedVia = result.routedVia;

    return {
      answer: result.text,
      citations,
      context: retrieval,
      retrieval,
      usage: {
        model: result.model,
        provider: result.provider,
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens,
        routedVia: result.routedVia,
      },
    };
  }

  /** Map inline [n] markers back onto the retrieved passages. */
  extractCitations(answer: string, ctx: RetrievedContext): Citation[] {
    const markers = new Set<number>();
    const re = /\[(\d{1,2})\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(answer)) !== null) {
      const n = Number(m[1]);
      if (n >= 1 && n <= ctx.chunks.length) markers.add(n);
    }
    // if the model cited nothing, surface the top passages so the user can verify
    if (!markers.size && ctx.chunks.length) {
      ctx.chunks.slice(0, Math.min(3, ctx.chunks.length)).forEach((_c, i) => markers.add(i + 1));
    }

    return Array.from(markers).sort((a, b) => a - b).map((n) => {
      const sc = ctx.chunks[n - 1];
      return {
        marker: n,
        chunkId: sc.chunk.id,
        docId: sc.chunk.docId,
        docName: sc.chunk.docName,
        snippet: sc.chunk.text.slice(0, 400),
        score: sc.score,
      };
    });
  }

  /** Rebuild the context block for a fixed chunk set (used by "expand context"). */
  renderContext(chunks: RetrievedContext['chunks']): string {
    return buildContextBlock(chunks, this.settings.maxContextChars).block;
  }
}

// A module-level singleton keeps the index warm across React remounts.
let singleton: MaggiStore | null = null;

export const getMaggiStore = (settings?: MaggiSettings): MaggiStore => {
  if (!singleton) singleton = new MaggiStore(settings);
  else if (settings) singleton.updateSettings(settings);
  return singleton;
};
