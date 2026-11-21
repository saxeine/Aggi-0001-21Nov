/**
 * Tokenizer + normalisation utilities shared by BM25 and the chunker.
 *
 * Deliberately dependency-free and deterministic so that the browser index
 * and any server-side index agree on term stats.
 */

const STOPWORDS = new Set(
  (
    'a an and are as at be but by for from has have if in into is it its of on or that the their ' +
    'then there these they this to was were will with you your we our us i not no do does did can ' +
    'could should would may might must than so such about over under between during before after ' +
    'above below both each few more most other some only own same too very just also any all'
  ).split(' ')
);

/** Light, language-agnostic stemmer (Porter-lite): strips plural + common suffixes. */
export const stem = (word: string): string => {
  let w = word;
  if (w.length <= 3) return w;

  // plural / verb forms
  if (/ies$/.test(w)) w = w.slice(0, -3) + 'y';
  else if (/(ses|xes|zes|ches|shes)$/.test(w)) w = w.slice(0, -2);
  else if (/s$/.test(w) && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);

  // common derivations — applied once, longest suffix first
  const suffixes = ['ational', 'ization', 'fulness', 'iveness', 'ousness', 'ability', 'ibility',
    'ingly', 'edly', 'ment', 'ness', 'tion', 'sion', 'ance', 'ence', 'ity', 'ive', 'ous', 'ful', 'ing', 'ed', 'ly', 'er', 'al'];
  for (const s of suffixes) {
    if (w.length - s.length >= 4 && w.endsWith(s)) {
      w = w.slice(0, -s.length);
      break;
    }
  }
  return w;
};

/** Split text into lowercase alphanumeric tokens, removing stopwords + 1-char noise. */
export const tokenize = (text: string, opts: { keepStopwords?: boolean; doStem?: boolean } = {}): string[] => {
  const { keepStopwords = false, doStem = true } = opts;
  const raw = text
    .toLowerCase()
    // keep intra-word hyphens/digits (e.g. "gpt-4", "es-2022") as one token
    .replace(/[^a-z0-9\u00c0-\u024f\u0400-\u04ff\u0590-\u05ff\u0600-\u06ff\u4e00-\u9fff\-\s]/g, ' ')
    .split(/[\s\-]+/);

  const out: string[] = [];
  for (const t of raw) {
    if (!t) continue;
    if (t.length < 2 && !/\d/.test(t)) continue;
    if (!keepStopwords && STOPWORDS.has(t)) continue;
    out.push(doStem ? stem(t) : t);
  }
  return out;
};

/** Fast 32-bit FNV-1a hash, returned as an unsigned int. */
export const fnv1a = (str: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
};

export const hashString = (str: string): string => {
  // Two independent 32-bit hashes → 64 bits of collision resistance, hex encoded.
  const a = fnv1a(str);
  const b = fnv1a(`#${str}#`);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
};

/** Rough token estimate — good enough for budgeting (≈4 chars/token + word boundary). */
export const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

/** Normalise whitespace without destroying paragraph structure. */
export const normaliseText = (text: string): string =>
  text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export { STOPWORDS };
