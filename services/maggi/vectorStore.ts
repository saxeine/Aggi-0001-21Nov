/**
 * MAGGI vector index — a compact flat index with SIMD-friendly loops.
 *
 * For corpora up to ~50k chunks a flat index is both faster to build and
 * usually as fast to query as an HNSW graph (which costs memory + build time),
 * and it has zero dependencies. Vectors are stored as Float32Array so they're
 * transferable and cheap to persist via IndexedDB/JSON+base64.
 */

import { RagChunk } from './types';

export interface VectorHit {
  chunkId: string;
  score: number;
}

export class VectorIndex {
  private vectors = new Map<string, Float32Array>();
  private chunks = new Map<string, RagChunk>();
  private dims = 0;

  get size(): number {
    return this.vectors.size;
  }

  get dimensions(): number {
    return this.dims;
  }

  get approxBytes(): number {
    let bytes = 0;
    for (const v of this.vectors.values()) bytes += v.byteLength;
    return bytes;
  }

  add(chunk: RagChunk, vector: number[]): void {
    if (!vector?.length) return;
    if (!this.dims) this.dims = vector.length;
    // If the backend changed dimensionality, drop old vectors rather than
    // produce meaningless similarities.
    if (vector.length !== this.dims) {
      this.vectors.clear();
      this.dims = vector.length;
    }
    this.vectors.set(chunk.id, Float32Array.from(vector));
    this.chunks.set(chunk.id, chunk);
  }

  remove(chunkId: string): void {
    this.vectors.delete(chunkId);
    this.chunks.delete(chunkId);
  }

  removeByDoc(docId: string): void {
    for (const [id, chunk] of Array.from(this.chunks.entries())) {
      if (chunk.docId === docId) {
        this.vectors.delete(id);
        this.chunks.delete(id);
      }
    }
  }

  clear(): void {
    this.vectors.clear();
    this.chunks.clear();
    this.dims = 0;
  }

  has(chunkId: string): boolean {
    return this.vectors.has(chunkId);
  }

  getVector(chunkId: string): Float32Array | undefined {
    return this.vectors.get(chunkId);
  }

  getChunks(): RagChunk[] {
    return Array.from(this.chunks.values());
  }

  /** Exact cosine search (vectors are pre-normalised by the embedding layer). */
  search(query: number[], limit = 100, docFilter?: Set<string>): VectorHit[] {
    if (!query?.length || !this.vectors.size) return [];
    const hits: VectorHit[] = [];
    const q = Float32Array.from(query);

    for (const [chunkId, vec] of this.vectors) {
      if (docFilter && !docFilter.has(chunkId)) continue;
      const n = Math.min(vec.length, q.length);
      let dot = 0;
      for (let i = 0; i < n; i++) dot += vec[i] * q[i];
      hits.push({ chunkId, score: dot });
    }

    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, limit);
  }

  /** Similarity between two stored chunks (used by MMR). */
  similarity(a: string, b: string): number {
    const va = this.vectors.get(a);
    const vb = this.vectors.get(b);
    if (!va || !vb) return 0;
    const n = Math.min(va.length, vb.length);
    let dot = 0;
    for (let i = 0; i < n; i++) dot += va[i] * vb[i];
    return dot;
  }

  toSerialisable(): { dims: number; entries: Array<[string, number[]]> } {
    return {
      dims: this.dims,
      entries: Array.from(this.vectors.entries()).map(([id, v]) => [id, Array.from(v)]),
    };
  }
}
