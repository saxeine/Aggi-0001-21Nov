/**
 * MAGGI hybrid retriever.
 *
 * Pipeline (each stage can be switched off):
 *
 *   query
 *     ├─ (optional) multi-query expansion  → 3 paraphrases
 *     ├─ (optional) HyDE                  → hypothetical answer
 *     ↓
 *   dense search (cosine, top candidateK)      sparse search (BM25, top candidateK)
 *     ↓                                              ↓
 *     └────────── Reciprocal Rank Fusion ────────────┘
 *                        ↓
 *               (optional) LLM re-rank
 *                        ↓
 *               (optional) MMR diversification
 *                        ↓
 *                  topK chunks → citation block
 *
 * RRF is used instead of naive score addition because BM25 scores and cosine
 * similarities live on different scales; rank fusion needs no normalisation
 * and is robust to one leg being much noisier than the other.
 */

import { RagChunk, RetrievalOptions, ScoredChunk, RetrievedContext } from './types';
import { Bm25Index } from './bm25';
import { VectorIndex } from './vectorStore';
import { estimateTokens } from './text';

export interface RetrieverDeps {
  bm25: Bm25Index;
  vectors: VectorIndex;
  embedQuery: (text: string) => Promise<number[]>;
  /** Optional LLM helpers for HyDE / multi-query / rerank. */
  llm?: {
    complete: (prompt: string, opts?: { temperature?: number; maxTokens?: number }) => Promise<string>;
  };
}

const RRF_K = 60; // standard RRF constant

/** Build a numbered, citation-ready context block. */
export const buildContextBlock = (
  chunks: ScoredChunk[],
  maxChars: number,
): { block: string; used: ScoredChunk[] } => {
  const used: ScoredChunk[] = [];
  const parts: string[] = [];
  let total = 0;
  let marker = 1;

  for (const sc of chunks) {
    const c = sc.chunk;
    const location = c.breadcrumb.length ? ` — ${c.breadcrumb.join(' › ')}` : '';
    const header = `[${marker}] (${c.docName}${location})`;
    const body = c.text.replace(/\s+\n/g, '\n').trim();
    const entry = `${header}\n${body}`;
    if (total + entry.length > maxChars && used.length > 0) break;
    parts.push(entry);
    total += entry.length + 2;
    used.push({ ...sc, rank: marker });
    marker++;
  }

  return { block: parts.join('\n\n---\n\n'), used };
};

const dedupe = (chunks: ScoredChunk[]): ScoredChunk[] => {
  const seen = new Set<string>();
  const out: ScoredChunk[] = [];
  for (const c of chunks) {
    if (seen.has(c.chunk.id)) continue;
    seen.add(c.chunk.id);
    out.push(c);
  }
  return out;
};

/** Maximal Marginal Relevance — trades relevance for coverage. */
const mmr = (
  candidates: ScoredChunk[],
  vectors: VectorIndex,
  k: number,
  lambda: number,
): ScoredChunk[] => {
  const selected: ScoredChunk[] = [];
  const pool = [...candidates];

  // normalise candidate scores to 0..1 for a sane lambda trade-off
  const maxScore = Math.max(...pool.map((c) => c.score), 0.0001);
  while (selected.length < k && pool.length) {
    let bestIdx = 0;
    let bestVal = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const relevance = pool[i].score / maxScore;
      let maxSim = 0;
      for (const s of selected) {
        const sim = vectors.similarity(pool[i].chunk.id, s.chunk.id);
        if (sim > maxSim) maxSim = sim;
      }
      const val = lambda * relevance - (1 - lambda) * maxSim;
      if (val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    }
    selected.push(pool[bestIdx]);
    pool.splice(bestIdx, 1);
  }
  return selected;
};

const parseRerankResponse = (raw: string, count: number): number[] | null => {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return null;
    return arr
      .map((v: any) => (typeof v === 'number' ? v : Number(v?.id ?? v?.index)))
      .filter((n: number) => Number.isFinite(n) && n >= 0 && n < count);
  } catch {
    return null;
  }
};

export const retrieve = async (
  query: string,
  deps: RetrieverDeps,
  options: RetrievalOptions = {},
  maxContextChars = 24000,
): Promise<RetrievedContext> => {
  const started = performance.now();
  const trace: string[] = [];

  const topK = options.topK ?? 8;
  const candidateK = Math.max(options.candidateK ?? 40, topK);
  const mode = options.mode ?? 'hybrid';
  const vectorWeight = options.vectorWeight ?? 0.65;
  const diversify = options.diversify ?? true;
  const diversityLambda = options.diversityLambda ?? 0.7;

  const docFilter = options.docIds?.length ? new Set(options.docIds) : undefined;

  // ---- query expansion -----------------------------------------------------
  let queries = [query];
  if (options.multiQuery && deps.llm) {
    try {
      trace.push('multi-query');
      const raw = await deps.llm.complete(
        `Generate 2 alternative search phrasings of this question. Return ONLY a JSON array of 2 strings.\nQuestion: ${query}`,
        { temperature: 0.3, maxTokens: 160 },
      );
      const m = raw.match(/\[[\s\S]*\]/);
      if (m) {
        const arr = JSON.parse(m[0]);
        if (Array.isArray(arr)) {
          queries = [query, ...arr.filter((s: any) => typeof s === 'string').slice(0, 2)];
        }
      }
    } catch {
      /* non-fatal */
    }
  }

  let searchText = query;
  if (options.useHyde && options.useHyde !== undefined && deps.llm) {
    try {
      trace.push('hyde');
      const draft = await deps.llm.complete(
        `Write a short, factual paragraph that would answer the question below. Do not hedge, just write the ideal answer passage.\nQuestion: ${query}`,
        { temperature: 0.2, maxTokens: 220 },
      );
      if (draft.trim().length > 40) searchText = `${query}\n${draft}`;
    } catch {
      /* non-fatal */
    }
  }

  // ---- candidate gathering -------------------------------------------------
  const fused = new Map<string, ScoredChunk>();
  const addOrMerge = (chunk: RagChunk | undefined, update: Partial<ScoredChunk>) => {
    if (!chunk) return;
    const key = chunk.id;
    const existing = fused.get(key);
    if (existing) {
      existing.vectorScore = Math.max(existing.vectorScore, update.vectorScore ?? 0);
      existing.keywordScore = Math.max(existing.keywordScore, update.keywordScore ?? 0);
      existing.score += update.score ?? 0;
    } else if (update.score) {
      fused.set(key, {
        chunk,
        score: update.score ?? 0,
        vectorScore: update.vectorScore ?? 0,
        keywordScore: update.keywordScore ?? 0,
      });
    }
  };

  const perQueryK = Math.max(10, Math.ceil(candidateK / Math.max(1, queries.length)));

  // Build the id→chunk map once; never do an O(n) find inside the hit loop.
  const chunkById = new Map<string, RagChunk>();
  for (const c of deps.vectors.getChunks()) chunkById.set(c.id, c);
  for (const c of deps.bm25.getChunks()) if (!chunkById.has(c.id)) chunkById.set(c.id, c);

  for (const q of queries) {
    // --- dense leg ---
    if (mode !== 'keyword' && deps.vectors.size > 0) {
      try {
        const qVec = await deps.embedQuery(searchText);
        if (qVec.length) {
          const hits = deps.vectors.search(qVec, perQueryK, docFilter);
          trace.push(`vector:${hits.length}`);
          hits.forEach((h, rank) => {
            const chunk = chunkById.get(h.chunkId);
            // RRF weighted contribution
            addOrMerge(chunk, {
              score: vectorWeight * (1 / (RRF_K + rank + 1)),
              vectorScore: h.score,
            });
          });
        }
      } catch (e) {
        trace.push('vector:error');
      }
    }

    // --- sparse leg ---
    if (mode !== 'vector' && deps.bm25.size > 0) {
      const hits = deps.bm25.search(q, perQueryK, docFilter);
      trace.push(`bm25:${hits.length}`);
      hits.forEach((h, rank) => {
        const chunk = deps.bm25.getChunk(h.chunkId);
        addOrMerge(chunk, {
          score: (1 - vectorWeight) * (1 / (RRF_K + rank + 1)),
          keywordScore: h.score,
        });
      });
    }
  }

  let candidates = Array.from(fused.values());

  // enforce source-type / doc filters that sparse+dense may not have applied
  if (options.sourceTypes?.length) {
    const allowed = new Set(options.sourceTypes);
    candidates = candidates.filter((c) => allowed.has(c.chunk.sourceType));
  }

  // ---- recency boost -------------------------------------------------------
  if (options.recencyBoost && options.recencyBoost > 0) {
    const now = Date.now();
    for (const c of candidates) {
      const addedAt = Number((c.chunk.metadata as any)?.addedAt ?? 0);
      if (!addedAt) continue;
      const ageDays = (now - addedAt) / 86_400_000;
      const decay = Math.exp(-ageDays / 30);
      c.score *= 1 + options.recencyBoost * decay;
    }
    trace.push('recency');
  }

  candidates.sort((a, b) => b.score - a.score);
  candidates = candidates.slice(0, candidateK);

  // ---- optional LLM re-rank ------------------------------------------------
  if (options.rerank && deps.llm && candidates.length > 1) {
    try {
      trace.push('rerank');
      const listing = candidates
        .slice(0, 20)
        .map((c, i) => `id=${i}: ${c.chunk.text.slice(0, 320).replace(/\n/g, ' ')}`)
        .join('\n');
      const raw = await deps.llm.complete(
        `Rank these passages by how directly they answer the question. Return ONLY a JSON array of ids, most relevant first.\n\nQuestion: ${query}\n\n${listing}`,
        { temperature: 0, maxTokens: 120 },
      );
      const order = parseRerankResponse(raw, Math.min(20, candidates.length));
      if (order?.length) {
        const head = order.map((i) => candidates[i]).filter(Boolean);
        const tail = candidates.filter((c) => !head.includes(c));
        candidates = [...head, ...tail];
      }
    } catch {
      trace.push('rerank:error');
    }
  }

  // ---- diversification -----------------------------------------------------
  let selected: ScoredChunk[];
  if (diversify && deps.vectors.size > 0 && candidates.length > topK) {
    trace.push('mmr');
    selected = mmr(candidates, deps.vectors, topK, diversityLambda);
  } else {
    selected = candidates.slice(0, topK);
  }
  selected = dedupe(selected);

  // ---- context block -------------------------------------------------------
  const { block, used } = buildContextBlock(selected, maxContextChars);

  return {
    query,
    chunks: used,
    contextBlock: block,
    tokens: estimateTokens(block),
    latencyMs: Math.round(performance.now() - started),
    trace,
  };
};
