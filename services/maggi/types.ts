/**
 * MAGGI — Modular Augmented Generation & Grounded Intelligence
 * Shared type contracts for the RAG engine.
 *
 * These types are intentionally transport-agnostic: the same chunk /
 * retrieval shapes are produced in the browser (client-side indexing for
 * small corpora) and on the server (durable hybrid index for big corpora).
 */

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

export type ChunkStrategy = 'recursive' | 'sentence' | 'markdown' | 'fixed';

export interface ChunkingOptions {
  /** Hard ceiling of characters per chunk. */
  maxChars?: number;
  /** Characters of overlap carried into the next chunk (recursive/sentence). */
  overlapChars?: number;
  /** Keeps markdown headers / breadcrumbs attached to every chunk. */
  strategy?: ChunkStrategy;
}

/** A retrievable unit of text with full provenance. */
export interface RagChunk {
  id: string;
  /** Source document id this chunk belongs to. */
  docId: string;
  /** Human readable doc name (file name, URL, note title...). */
  docName: string;
  sourceType: string;
  /** Position of the chunk inside the document (0-based). */
  index: number;
  /** Ordinal path of the parent section, e.g. ["Chapter 2", "Risks"]. */
  breadcrumb: string[];
  text: string;
  /** Character range inside the normalised document text. */
  start: number;
  end: number;
  tokenEstimate: number;
  /** Content hash — used for dedupe + incremental re-indexing. */
  hash: string;
  /** Optional keyword weight map (BM25 payload). */
  terms?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export interface RagDocument {
  id: string;
  name: string;
  sourceType: string;
  mimeType?: string;
  /** Character count of the extracted text. */
  chars: number;
  chunkCount: number;
  /** Content hash of the whole document for change detection. */
  hash: string;
  addedAt: number;
  updatedAt: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/** Result of extracting readable text from an arbitrary source. */
export interface ExtractedText {
  text: string;
  title?: string;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

export interface EmbeddingResult {
  vectors: number[][];
  /** Which backend actually served the vectors. */
  provider: 'gemini' | 'hash' | 'freellmapi';
  dims: number;
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

export type RetrievalMode = 'hybrid' | 'vector' | 'keyword';

export interface RetrievalOptions {
  /** How many chunks to hand to the model. */
  topK?: number;
  /** How many candidates to pull before re-ranking. */
  candidateK?: number;
  /** Weight of dense similarity vs BM25 (0..1). 0.65 = 65% vector. */
  vectorWeight?: number;
  mode?: RetrievalMode;
  /** Restrict to specific documents. */
  docIds?: string[];
  /** Restrict to specific source types ("pdf", "text", "link"...). */
  sourceTypes?: string[];
  /** Apply MMR diversification to avoid near-duplicate context. */
  diversify?: boolean;
  /** 0..1 — higher means more diversity. */
  diversityLambda?: number;
  /** Recency boost (0 disables). */
  recencyBoost?: number;
  /** Re-rank the fused candidate list with a cross-encoder-ish LLM pass. */
  rerank?: boolean;
  /** HyDE — embed a hypothetical answer instead of the bare question. */
  useHyde?: boolean;
  /** Expand the question into paraphrases and fuse the per-query results. */
  multiQuery?: boolean;
}

export interface ScoredChunk {
  chunk: RagChunk;
  /** Final fused score. */
  score: number;
  vectorScore: number;
  keywordScore: number;
  /** Per-signal breakdown for the debug inspector. */
  signals?: Record<string, number>;
  /** 1-based rank after re-ranking. */
  rank?: number;
}

export interface RetrievedContext {
  query: string;
  chunks: ScoredChunk[];
  /** Compact, citation-ready prompt block built from the chunks. */
  contextBlock: string;
  /** Token estimate of the whole context block. */
  tokens: number;
  /** Wall-clock ms spent retrieving. */
  latencyMs: number;
  /** Which retrieval legs ran. */
  trace: string[];
}

// ---------------------------------------------------------------------------
// Answers / citations
// ---------------------------------------------------------------------------

export interface Citation {
  marker: number; // [1], [2]...
  chunkId: string;
  docId: string;
  docName: string;
  snippet: string;
  score: number;
}

export interface RagAnswer {
  answer: string;
  citations: Citation[];
  context: RetrievedContext;
  usage?: {
    model?: string;
    provider?: string;
    promptTokens?: number;
    completionTokens?: number;
    routedVia?: string;
  };
}

// ---------------------------------------------------------------------------
// Index stats (drives the MAGGI dashboard)
// ---------------------------------------------------------------------------

export interface RagIndexStats {
  documents: number;
  chunks: number;
  characters: number;
  vocabulary: number;
  /** Byte size estimate of the persisted index. */
  approxBytes: number;
  vectorBackend: 'gemini' | 'hash' | 'freellmapi' | 'none';
  dims: number;
  lastIndexedAt?: number;
}

// ---------------------------------------------------------------------------
// Chat Persistence & Saved Queries
// ---------------------------------------------------------------------------

export interface PersistedMaggiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  citations?: Citation[];
  retrieval?: RetrievedContext;
  usage?: RagAnswer['usage'];
  error?: boolean;
}

export interface SavedMaggiQuery {
  id: string;
  title: string;
  query: string;
  answer: string;
  pinned: boolean;
  workspaceName?: string;
  citations: Citation[];
  retrieval?: {
    tokens: number;
    latencyMs: number;
    trace: string[];
    chunkCount: number;
    docNames: string[];
  };
  usage?: RagAnswer['usage'];
  createdAt: number;
  updatedAt: number;
}

