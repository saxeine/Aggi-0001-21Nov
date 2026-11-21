/**
 * MAGGI embedding layer.
 *
 * Three backends behind one interface:
 *  1. `gemini`  — Google text-embedding-004 via the existing server proxy.
 *                  Best quality; batched, retried, L2-normalised.
 *  2. `freellmapi` — /v1/embeddings on a FreeLLMAPI (or any OpenAI-compatible)
 *                  endpoint. Lets self-hosters keep embeddings local too.
 *  3. `hash`    — a deterministic, dependency-free *hashed n-gram* embedder.
 *                  Not a neural model, but far better than a bag-of-words: it
 *                  hashes word unigrams + bigrams + character 4-grams into a
 *                  fixed 512-dim space, applies sublinear TF weighting and
 *                  L2 normalisation, so morphological variants ("refinance" /
 *                  "refinancing") and typos land close together. Guarantees
 *                  RAG works offline / with no API key at all.
 *
 * All vectors are L2-normalised so cosine similarity is just a dot product.
 */

import { EmbeddingResult } from './types';
import { fnv1a, tokenize } from './text';

export const HASH_DIMS = 512;

/** L2-normalise in place, returning the vector. */
export const l2Normalise = (vec: number[]): number[] => {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i];
  const norm = Math.sqrt(sum);
  if (norm === 0) return vec;
  for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  return vec;
};

export const cosine = (a: number[], b: number[]): number => {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot; // vectors already normalised
};

const charNgrams = (word: string, n = 4): string[] => {
  const padded = `^${word}$`;
  if (padded.length <= n) return [padded];
  const out: string[] = [];
  for (let i = 0; i <= padded.length - n; i++) out.push(padded.slice(i, i + n));
  return out;
};

/** Deterministic hashed n-gram embedding. */
export const hashEmbed = (text: string, dims = HASH_DIMS): number[] => {
  const vec = new Array(dims).fill(0);
  const tokens = tokenize(text, { keepStopwords: false, doStem: true });
  if (!tokens.length) return vec;

  const counts = new Map<string, number>();
  const bump = (key: string, weight: number) => {
    const h = fnv1a(key);
    const idx = h % dims;
    // signed hashing reduces collisions cancelling real signal
    const sign = (fnv1a(key + '\u241f') & 1) === 0 ? 1 : -1;
    counts.set(`${idx}:${sign}`, (counts.get(`${idx}:${sign}`) ?? 0) + weight);
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    bump(`w:${t}`, 1.0);
    if (i + 1 < tokens.length) bump(`b:${t}_${tokens[i + 1]}`, 0.55);
    if (t.length >= 4) {
      for (const g of charNgrams(t)) bump(`c:${g}`, 0.18);
    }
  }

  for (const [key, count] of counts) {
    const [idxStr, signStr] = key.split(':');
    const idx = Number(idxStr);
    const sign = Number(signStr);
    // sublinear TF damping
    vec[idx] += sign * (1 + Math.log(1 + count));
  }
  return l2Normalise(vec);
};

// ---------------------------------------------------------------------------
// Remote backends
// ---------------------------------------------------------------------------

type EmbedConfig = {
  backend: 'auto' | 'gemini' | 'hash';
  geminiModel?: string;
  freeLlmApiBaseUrl?: string;
  freeLlmApiKey?: string;
  freeLlmApiModel?: string;
  geminiApiKey?: string;
  /** Whether a FreeLLMAPI/OpenAI-compatible embeddings endpoint should be tried. */
  preferFreeLlm?: boolean;
};

const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const requestGeminiEmbeddings = async (texts: string[], model: string, apiKey?: string): Promise<number[][]> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-gemini-key'] = apiKey;
  const res = await fetch(`/api/maggi/embed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ texts, model, backend: 'gemini' }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Gemini embeddings failed: ${res.status} ${msg.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!Array.isArray(data.vectors) || data.vectors.length !== texts.length) {
    throw new Error('Gemini embeddings returned an unexpected payload');
  }
  return data.vectors.map((v: number[]) => l2Normalise(v));
};

const normaliseEmbedBaseUrl = (url: string): string => {
  let cleaned = (url || '').replace(/\s+/g, '').replace(/\/+$/, '');
  if (!cleaned) return '';
  cleaned = cleaned.replace(/^(https?):\/([^/])/i, '$1://$2');
  if (!/^https?:\/\//i.test(cleaned)) {
    const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(cleaned);
    cleaned = `${isLocal || /:\d+/.test(cleaned) ? 'http' : 'https'}://${cleaned}`;
  }
  cleaned = cleaned
    .replace(/\/(chat\/completions|completions|embeddings|models)$/i, '')
    .replace(/\/+$/, '');
  if (!/\/v\d+(\.\d+)?$/i.test(cleaned) && !cleaned.toLowerCase().endsWith('/v1')) {
    cleaned = `${cleaned}/v1`;
  }
  return cleaned;
};

const isLoopbackEmbedUrl = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
};

const requestOpenAiEmbeddings = async (
  texts: string[],
  baseUrl: string,
  apiKey: string,
  model: string,
): Promise<number[][]> => {
  const cleanBase = normaliseEmbedBaseUrl(baseUrl);
  const cleanKey = (apiKey || '').trim();
  const res = await fetch(`/api/maggi/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, baseUrl: cleanBase, apiKey: cleanKey, model, backend: 'openai' }),
  });
  let data: any;
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    let parsed: any = null;
    try { parsed = JSON.parse(msg); } catch { /* raw text */ }
    if (isLoopbackEmbedUrl(cleanBase) && (parsed?.code === 'LOOPBACK_UNREACHABLE' || /ECONNREFUSED|LOOPBACK_UNREACHABLE|fetch failed/i.test(msg))) {
      const directRes = await fetch(`${cleanBase}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cleanKey ? { Authorization: `Bearer ${cleanKey}` } : {}),
        },
        body: JSON.stringify({ model: model || 'auto', input: texts }),
      });
      if (!directRes.ok) {
        const directMsg = await directRes.text().catch(() => '');
        throw new Error(`OpenAI-compatible embeddings failed: ${directRes.status} ${directMsg.slice(0, 200)}`);
      }
      data = await directRes.json();
      const vectors = (data.data ?? [])
        .sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
        .map((d: any) => d.embedding);
      if (!Array.isArray(vectors) || vectors.length !== texts.length) {
        throw new Error('Embeddings endpoint returned an unexpected payload');
      }
      return vectors.map((v: number[]) => l2Normalise(v));
    }
    throw new Error(`OpenAI-compatible embeddings failed: ${res.status} ${msg.slice(0, 200)}`);
  }
  data = await res.json();
  if (!Array.isArray(data.vectors) || data.vectors.length !== texts.length) {
    throw new Error('Embeddings endpoint returned an unexpected payload');
  }
  return data.vectors.map((v: number[]) => l2Normalise(v));
};

/**
 * Embed a batch of texts. Tries the configured neural backend first, then
 * degrades gracefully to the hashed embedder. Never throws.
 */
export const embedTexts = async (texts: string[], config: EmbedConfig): Promise<EmbeddingResult> => {
  if (!texts.length) {
    return { vectors: [], provider: 'hash', dims: HASH_DIMS };
  }

  const backend = config.backend;
  const model = config.geminiModel || 'text-embedding-004';

  if (backend !== 'hash') {
    // 1. OpenAI-compatible / FreeLLMAPI embeddings
    if (config.preferFreeLlm && config.freeLlmApiBaseUrl) {
      try {
        const vectors: number[][] = [];
        for (const batch of chunkArray(texts, 32)) {
          vectors.push(...await requestOpenAiEmbeddings(
            batch,
            config.freeLlmApiBaseUrl,
            config.freeLlmApiKey || '',
            config.freeLlmApiModel || 'auto',
          ));
        }
        return { vectors, provider: 'freellmapi', dims: vectors[0]?.length ?? HASH_DIMS };
      } catch (e) {
        console.warn('[MAGGI] FreeLLMAPI embeddings unavailable, trying Gemini:', (e as Error).message);
      }
    }

    // 2. Gemini
    try {
      const vectors: number[][] = [];
      // 100 texts per request keeps us well under payload limits.
      for (const batch of chunkArray(texts, 100)) {
        let attempt = 0;
        while (true) {
          try {
            vectors.push(...await requestGeminiEmbeddings(batch, model, config.geminiApiKey));
            break;
          } catch (err) {
            attempt++;
            if (attempt >= 2) throw err;
            await sleep(600 * attempt);
          }
        }
      }
      return { vectors, provider: 'gemini', dims: vectors[0]?.length ?? 768 };
    } catch (e) {
      if (backend === 'gemini') {
        console.warn('[MAGGI] Gemini embeddings failed, using hash fallback:', (e as Error).message);
      }
    }
  }

  // 3. Deterministic offline fallback
  return { vectors: texts.map((t) => hashEmbed(t)), provider: 'hash', dims: HASH_DIMS };
};

/** Single-text convenience wrapper (used for queries). */
export const embedQuery = async (text: string, config: EmbedConfig): Promise<{ vector: number[]; provider: EmbeddingResult['provider']; dims: number }> => {
  const res = await embedTexts([text], config);
  return { vector: res.vectors[0] ?? [], provider: res.provider, dims: res.dims };
};

export type { EmbedConfig };
