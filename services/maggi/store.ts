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
  PersistedMaggiMessage,
  SavedMaggiQuery,
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
  MAGGI_CHAT_KEY,
  MAGGI_SAVED_QUERIES_KEY,
  MAGGI_USAGE_KEY,
  MAGGI_SYSTEM_PROMPT,
  MAGGI_CITATION_INSTRUCTION,
} from '../../maggi/config';
import { createBrain, brainAsLlm } from './brain';

const IDB_NAME = 'MAGGI_RAG_DB';
const IDB_VERSION = 2;
const IDB_STORE = 'index';
const IDB_CHAT_STORE = 'chat';
const IDB_SAVED_STORE = 'saved_queries';
const IDB_META_STORE = 'meta';

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
        if (!db.objectStoreNames.contains(IDB_CHAT_STORE)) db.createObjectStore(IDB_CHAT_STORE);
        if (!db.objectStoreNames.contains(IDB_SAVED_STORE)) db.createObjectStore(IDB_SAVED_STORE);
        if (!db.objectStoreNames.contains(IDB_META_STORE)) db.createObjectStore(IDB_META_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

const idbPut = async (key: string, value: unknown, storeName = IDB_STORE): Promise<boolean> => {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
};

const idbGet = async <T,>(key: string, storeName = IDB_STORE): Promise<T | null> => {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const getCloudQueryStorage = async () => {
  if (typeof window === 'undefined') return null;
  try {
    return await import('./queryStorage');
  } catch {
    return null;
  }
};

const defaultQueryTitle = (queryText: string): string => {
  const compact = queryText.replace(/\s+/g, ' ').trim();
  if (!compact) return 'Saved MAGGI Query';
  return compact.length > 72 ? `${compact.slice(0, 69)}...` : compact;
};

const sortSavedQueries = (items: SavedMaggiQuery[]): SavedMaggiQuery[] =>
  [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);
  });

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
  private chatMessages: PersistedMaggiMessage[] = [];
  private savedQueries: SavedMaggiQuery[] = [];
  private listeners = new Set<() => void>();
  private ready = false;
  private cloudSynced = false;

  constructor(settings?: MaggiSettings) {
    this.settings = settings ?? loadMaggiSettings();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        /* ignore subscriber errors */
      }
    }
  }

  // --- lifecycle -----------------------------------------------------------

  async hydrate(): Promise<void> {
    if (this.ready) return;
    let snapshot = await idbGet<PersistedIndex>('index', IDB_STORE);
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

    // Hydrate persisted chat history
    let persistedChat = await idbGet<PersistedMaggiMessage[]>('history', IDB_CHAT_STORE);
    if (!persistedChat) {
      try {
        const raw = localStorage.getItem(MAGGI_CHAT_KEY);
        if (raw) persistedChat = JSON.parse(raw) as PersistedMaggiMessage[];
      } catch {
        persistedChat = null;
      }
    }
    if (Array.isArray(persistedChat)) {
      this.chatMessages = persistedChat;
    }

    // Hydrate persisted saved queries
    let persistedQueries = await idbGet<SavedMaggiQuery[]>('list', IDB_SAVED_STORE);
    if (!persistedQueries) {
      try {
        const raw = localStorage.getItem(MAGGI_SAVED_QUERIES_KEY);
        if (raw) persistedQueries = JSON.parse(raw) as SavedMaggiQuery[];
      } catch {
        persistedQueries = null;
      }
    }
    if (Array.isArray(persistedQueries)) {
      this.savedQueries = sortSavedQueries(persistedQueries);
    }

    // Hydrate usage counters
    let persistedUsage = await idbGet<MaggiUsage>('usage', IDB_META_STORE);
    if (!persistedUsage) {
      try {
        const raw = localStorage.getItem(MAGGI_USAGE_KEY);
        if (raw) persistedUsage = JSON.parse(raw) as MaggiUsage;
      } catch {
        persistedUsage = null;
      }
    }
    if (persistedUsage && typeof persistedUsage.queries === 'number') {
      this.usage = { ...EMPTY_USAGE, ...persistedUsage };
    }

    this.ready = true;
    this.notify();

    // Best-effort non-blocking cloud sync for saved queries in browser environments
    if (typeof window !== 'undefined' && !this.cloudSynced) {
      this.cloudSynced = true;
      getCloudQueryStorage()
        .then((cloud) => cloud?.loadSavedQueriesFromFirestore())
        .then((remote) => {
          if (remote?.length) {
            this.mergeRemoteSavedQueries(remote);
          }
        })
        .catch(() => {});
    }
  }

  private mergeRemoteSavedQueries(remote: SavedMaggiQuery[]): void {
    const map = new Map<string, SavedMaggiQuery>();
    for (const item of this.savedQueries) {
      map.set(item.id, item);
    }
    let changed = false;
    for (const item of remote) {
      const existing = map.get(item.id);
      if (!existing || (item.updatedAt || 0) > (existing.updatedAt || 0)) {
        map.set(item.id, item);
        changed = true;
      }
    }
    if (changed) {
      this.savedQueries = sortSavedQueries(Array.from(map.values()));
      void this.persistSavedQueriesLocal();
      this.notify();
    }
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
    const ok = await idbPut('index', snapshot, IDB_STORE);
    if (!ok) {
      try {
        localStorage.setItem(MAGGI_INDEX_KEY, JSON.stringify(snapshot));
      } catch {
        console.warn('[MAGGI] Could not persist index (quota exceeded). Index is in-memory only.');
      }
    }
    await this.persistUsage();
  }

  private async persistUsage(): Promise<void> {
    const ok = await idbPut('usage', this.usage, IDB_META_STORE);
    if (!ok) {
      try {
        localStorage.setItem(MAGGI_USAGE_KEY, JSON.stringify(this.usage));
      } catch {
        /* ignore */
      }
    }
  }

  private async persistSavedQueriesLocal(): Promise<void> {
    const ok = await idbPut('list', this.savedQueries, IDB_SAVED_STORE);
    try {
      localStorage.setItem(MAGGI_SAVED_QUERIES_KEY, JSON.stringify(this.savedQueries));
    } catch {
      if (!ok) console.warn('[MAGGI] Could not persist saved queries.');
    }
  }

  getSettings(): MaggiSettings {
    return this.settings;
  }

  updateSettings(patch: Partial<MaggiSettings>): MaggiSettings {
    this.settings = { ...this.settings, ...patch };
    saveMaggiSettings(this.settings);
    this.notify();
    return this.settings;
  }

  // --- chat persistence ----------------------------------------------------

  getChatMessages(): PersistedMaggiMessage[] {
    return [...this.chatMessages];
  }

  async saveChatMessages(msgs: PersistedMaggiMessage[]): Promise<void> {
    const trimmed = msgs.slice(-150).map((m) => ({
      ...m,
      // Keep stored retrieval lean by omitting giant contextBlock text if very large
      retrieval: m.retrieval
        ? {
            ...m.retrieval,
            contextBlock: m.retrieval.contextBlock?.slice(0, 12000) || '',
          }
        : undefined,
    }));
    this.chatMessages = trimmed;
    const ok = await idbPut('history', trimmed, IDB_CHAT_STORE);
    try {
      // Store compact mirror without heavy retrieval chunks in localStorage
      const compact = trimmed.map(({ retrieval: _r, ...rest }) => rest);
      localStorage.setItem(MAGGI_CHAT_KEY, JSON.stringify(compact));
    } catch {
      if (!ok) console.warn('[MAGGI] Could not persist chat messages.');
    }
    this.notify();
  }

  async clearChatMessages(): Promise<void> {
    this.chatMessages = [];
    await idbPut('history', [], IDB_CHAT_STORE);
    try {
      localStorage.removeItem(MAGGI_CHAT_KEY);
    } catch {
      /* ignore */
    }
    this.notify();
  }

  // --- saved queries persistence -------------------------------------------

  listSavedQueries(): SavedMaggiQuery[] {
    return sortSavedQueries(this.savedQueries);
  }

  async saveQuery(input: {
    id?: string;
    title?: string;
    query: string;
    answer: string;
    citations?: Citation[];
    retrieval?: RetrievedContext;
    usage?: RagAnswer['usage'];
    workspaceName?: string;
    pinned?: boolean;
  }): Promise<SavedMaggiQuery> {
    await this.hydrate();
    const now = Date.now();
    const cleanQuery = input.query.trim();
    const cleanAnswer = input.answer.trim();

    const existing = this.savedQueries.find(
      (q) =>
        (input.id && q.id === input.id) ||
        (q.query.trim() === cleanQuery && q.answer.trim() === cleanAnswer),
    );

    const docNames = input.retrieval
      ? Array.from(new Set(input.retrieval.chunks.map((c) => c.chunk.docName))).slice(0, 12)
      : Array.from(new Set((input.citations ?? []).map((c) => c.docName))).slice(0, 12);

    const saved: SavedMaggiQuery = {
      id: existing?.id || input.id || `mq-${now}-${Math.random().toString(36).slice(2, 7)}`,
      title: (input.title || existing?.title || defaultQueryTitle(cleanQuery)).trim(),
      query: cleanQuery,
      answer: cleanAnswer,
      pinned: input.pinned ?? existing?.pinned ?? false,
      workspaceName: input.workspaceName ?? existing?.workspaceName,
      citations: input.citations ?? existing?.citations ?? [],
      retrieval: input.retrieval
        ? {
            tokens: input.retrieval.tokens,
            latencyMs: input.retrieval.latencyMs,
            trace: input.retrieval.trace,
            chunkCount: input.retrieval.chunks.length,
            docNames,
          }
        : existing?.retrieval,
      usage: input.usage ?? existing?.usage,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const next = existing
      ? this.savedQueries.map((q) => (q.id === existing.id ? saved : q))
      : [saved, ...this.savedQueries];
    this.savedQueries = sortSavedQueries(next);
    await this.persistSavedQueriesLocal();
    this.notify();

    void getCloudQueryStorage().then((cloud) => cloud?.syncSavedQueryToFirestore(saved, Boolean(existing)));
    return saved;
  }

  async updateSavedQuery(
    id: string,
    patch: { title?: string; pinned?: boolean },
  ): Promise<SavedMaggiQuery | null> {
    await this.hydrate();
    const target = this.savedQueries.find((q) => q.id === id);
    if (!target) return null;

    const updated: SavedMaggiQuery = {
      ...target,
      ...(patch.title !== undefined ? { title: patch.title.trim() || defaultQueryTitle(target.query) } : {}),
      ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
      updatedAt: Date.now(),
    };

    this.savedQueries = sortSavedQueries(this.savedQueries.map((q) => (q.id === id ? updated : q)));
    await this.persistSavedQueriesLocal();
    this.notify();

    void getCloudQueryStorage().then((cloud) => cloud?.syncSavedQueryToFirestore(updated, true));
    return updated;
  }

  async deleteSavedQuery(id: string): Promise<void> {
    await this.hydrate();
    this.savedQueries = this.savedQueries.filter((q) => q.id !== id);
    await this.persistSavedQueriesLocal();
    this.notify();

    void getCloudQueryStorage().then((cloud) => cloud?.deleteSavedQueryFromFirestore(id));
  }

  async clearSavedQueries(): Promise<void> {
    await this.hydrate();
    const ids = this.savedQueries.map((q) => q.id);
    this.savedQueries = [];
    await this.persistSavedQueriesLocal();
    this.notify();

    void getCloudQueryStorage().then((cloud) => {
      if (!cloud) return;
      ids.forEach((id) => {
        void cloud.deleteSavedQueryFromFirestore(id);
      });
    });
  }

  private embedConfig(): EmbedConfig {
    return {
      backend: this.settings.embeddingBackend,
      geminiModel: this.settings.embeddingModel,
      freeLlmApiBaseUrl: this.settings.freeLlmApiBaseUrl,
      freeLlmApiKey: this.settings.freeLlmApiKey,
      preferFreeLlm: this.settings.provider === 'freellmapi' && this.settings.freeLlmMode !== 'keypool',
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
    this.notify();
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
    this.notify();
  }

  async clear(): Promise<void> {
    this.bm25.clear();
    this.vectors.clear();
    this.documents.clear();
    this.chunkIndex.clear();
    this.vectorBackend = 'none';
    this.usage = { ...EMPTY_USAGE };
    await idbPut('index', null, IDB_STORE);
    await idbPut('usage', this.usage, IDB_META_STORE);
    await this.clearChatMessages();
    try {
      localStorage.removeItem(MAGGI_INDEX_KEY);
      localStorage.removeItem(MAGGI_USAGE_KEY);
    } catch {
      /* ignore */
    }
    this.notify();
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
    await this.persistUsage();
    this.notify();

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

