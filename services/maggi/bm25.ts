/**
 * BM25 (Okapi) sparse index — the lexical leg of MAGGI's hybrid retrieval.
 *
 * Full implementations of:
 *  - per-term document frequency + inverted index
 *  - length normalisation (b) and term-frequency saturation (k1)
 *  - incremental add/remove so re-indexing a single doc is O(doc), not O(corpus)
 *
 * Tuned for short-to-medium passages (chunks), where k1=1.2/b=0.75 is the
 * classic defaults and behaves well.
 */

import { RagChunk } from './types';
import { tokenize } from './text';

export interface Bm25Options {
  k1?: number;
  b?: number;
}

export interface Bm25Hit {
  chunkId: string;
  score: number;
  matched: string[];
}

interface Posting {
  tf: number;
}

export class Bm25Index {
  private k1: number;
  private b: number;

  /** term -> (chunkId -> term frequency) */
  private postings = new Map<string, Map<string, Posting>>();
  /** chunkId -> token length */
  private lengths = new Map<string, number>();
  /** chunkId -> chunk (kept so scoring can return the payload) */
  private chunks = new Map<string, RagChunk>();
  /** chunkId -> term multiset, for removal */
  private termsByChunk = new Map<string, Map<string, number>>();

  private totalLength = 0;

  constructor(options: Bm25Options = {}) {
    this.k1 = options.k1 ?? 1.2;
    this.b = options.b ?? 0.75;
  }

  get size(): number {
    return this.chunks.size;
  }

  get vocabularySize(): number {
    return this.postings.size;
  }

  addChunk(chunk: RagChunk): void {
    if (this.chunks.has(chunk.id)) this.removeChunk(chunk.id);

    const tokens = tokenize(chunk.text);
    const termCounts = new Map<string, number>();
    for (const t of tokens) termCounts.set(t, (termCounts.get(t) ?? 0) + 1);

    for (const [term, tf] of termCounts) {
      let map = this.postings.get(term);
      if (!map) {
        map = new Map();
        this.postings.set(term, map);
      }
      map.set(chunk.id, { tf });
    }

    this.termsByChunk.set(chunk.id, termCounts);
    this.lengths.set(chunk.id, tokens.length);
    this.chunks.set(chunk.id, chunk);
    this.totalLength += tokens.length;
  }

  addChunks(chunks: RagChunk[]): void {
    for (const c of chunks) this.addChunk(c);
  }

  removeChunk(chunkId: string): void {
    const terms = this.termsByChunk.get(chunkId);
    if (!terms) return;
    for (const term of terms.keys()) {
      const map = this.postings.get(term);
      if (!map) continue;
      map.delete(chunkId);
      if (map.size === 0) this.postings.delete(term);
    }
    this.totalLength -= this.lengths.get(chunkId) ?? 0;
    this.lengths.delete(chunkId);
    this.termsByChunk.delete(chunkId);
    this.chunks.delete(chunkId);
  }

  removeByDoc(docId: string): string[] {
    const removed: string[] = [];
    for (const chunk of Array.from(this.chunks.values())) {
      if (chunk.docId === docId) {
        this.removeChunk(chunk.id);
        removed.push(chunk.id);
      }
    }
    return removed;
  }

  clear(): void {
    this.postings.clear();
    this.lengths.clear();
    this.chunks.clear();
    this.termsByChunk.clear();
    this.totalLength = 0;
  }

  getChunks(): RagChunk[] {
    return Array.from(this.chunks.values());
  }

  getChunk(id: string): RagChunk | undefined {
    return this.chunks.get(id);
  }

  /**
   * Score every chunk matching at least one query term.
   * Returns hits sorted by descending BM25.
   */
  search(query: string, limit = 100, docFilter?: Set<string>): Bm25Hit[] {
    const qTerms = Array.from(new Set(tokenize(query)));
    if (!qTerms.length || !this.chunks.size) return [];

    const N = this.chunks.size;
    const avgdl = this.totalLength / Math.max(1, N);
    const scores = new Map<string, number>();
    const matched = new Map<string, string[]>();

    for (const term of qTerms) {
      const map = this.postings.get(term);
      if (!map) continue;
      const df = map.size;
      // BM25 idf with +0.5 smoothing, floored at 0 so very common terms don't
      // push scores negative.
      const idf = Math.max(0, Math.log(1 + (N - df + 0.5) / (df + 0.5)));

      for (const [chunkId, posting] of map) {
        if (docFilter && !docFilter.has(chunkId)) continue;
        const len = this.lengths.get(chunkId) ?? 0;
        const denom = posting.tf + this.k1 * (1 - this.b + this.b * (len / (avgdl || 1)));
        const termScore = idf * ((posting.tf * (this.k1 + 1)) / (denom || 1));

        scores.set(chunkId, (scores.get(chunkId) ?? 0) + termScore);
        const m = matched.get(chunkId);
        if (m) m.push(term);
        else matched.set(chunkId, [term]);
      }
    }

    return Array.from(scores.entries())
      .map(([chunkId, score]) => ({ chunkId, score, matched: matched.get(chunkId) ?? [] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /** Normalised (0..1) version of search, for score fusion. */
  searchNormalised(query: string, limit = 100, docFilter?: Set<string>): Bm25Hit[] {
    const hits = this.search(query, limit, docFilter);
    if (!hits.length) return hits;
    const max = hits[0].score || 1;
    return hits.map((h) => ({ ...h, score: h.score / max }));
  }
}
