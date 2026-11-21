/**
 * MAGGI chunker — structure-aware, overlap-safe splitting.
 *
 * Upgrades over "stuff the whole file in the prompt":
 *  - Recursive boundary hierarchy (section → paragraph → sentence → word clause)
 *    so we never cut mid-thought when a larger boundary fits.
 *  - Markdown/heading breadcrumbs are carried onto every chunk, so an orphan
 *    paragraph still knows it belongs to "Chapter 3 → Risks".
 *  - Character-overlap so a fact spanning a boundary stays retrievable.
 *  - Stable content hashes + char offsets → incremental re-indexing and
 *    precise citation highlighting.
 */

import { ChunkStrategy, ChunkingOptions, RagChunk } from './types';
import { estimateTokens, hashString, normaliseText } from './text';

const DEFAULT_MAX = 1200;
const DEFAULT_OVERLAP = 180;

const HEADING_RE = /^\s{0,3}(#{1,6})\s+(.*)$/;
const BOLD_HEADING_RE = /^\s{0,3}\*\*([^*]{3,80})\*\*\s*$/;
const NUMBERED_HEADING_RE = /^\s{0,3}((?:\d+\.)+\d*|[A-Z][A-Z0-9 ,'&/()-]{6,70}:)\s*$/;

interface Section {
  breadcrumb: string[];
  start: number;
  end: number;
}

/** Extract heading positions so chunks can inherit a breadcrumb trail. */
const findSections = (text: string): Section[] => {
  const sections: Section[] = [];
  const stack: { level: number; title: string }[] = [];
  let cursor = 0;
  const lines = text.split('\n');
  const offsets: number[] = new Array(lines.length);
  for (let i = 0; i < lines.length; i++) {
    offsets[i] = cursor;
    cursor += lines[i].length + 1;
  }

  sections.push({ breadcrumb: [], start: 0, end: 0 });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const md = HEADING_RE.exec(line);
    let level = 0;
    let title = '';
    if (md) {
      level = md[1].length;
      title = md[2].replace(/#+\s*$/, '').trim();
    } else if (BOLD_HEADING_RE.test(line)) {
      level = 3;
      title = BOLD_HEADING_RE.exec(line)![1].trim();
    } else if (NUMBERED_HEADING_RE.test(line) && line.trim().length < 80) {
      level = 4;
      title = line.trim().replace(/:$/, '');
    }
    if (!level || !title) continue;

    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
    stack.push({ level, title });
    sections.push({
      breadcrumb: stack.map((s) => s.title),
      start: offsets[i],
      end: offsets[i] + line.length,
    });
  }
  return sections;
};

const breadcrumbAt = (sections: Section[], pos: number): string[] => {
  let bc: string[] = [];
  for (const s of sections) {
    if (s.start <= pos) bc = s.breadcrumb;
    else break;
  }
  return bc;
};

/** Split a block on the deepest boundary that still respects maxChars. */
const SPLITTERS: Array<(t: string) => string[]> = [
  (t) => t.split(/\n{2,}/),                       // paragraphs
  (t) => t.split(/\n/),                            // lines
  (t) => t.split(/(?<=[.!?])\s+(?=[A-ZÅÄÖ"'(])/),  // sentences
  (t) => t.split(/;\s+/),                          // clauses
  (t) => t.split(/\s+/),                           // words (last resort)
];

const recursiveSplit = (text: string, maxChars: number, depth = 0): string[] => {
  if (text.length <= maxChars) return [text];
  if (depth >= SPLITTERS.length) {
    // hard cut
    const out: string[] = [];
    for (let i = 0; i < text.length; i += maxChars) out.push(text.slice(i, i + maxChars));
    return out;
  }
  const pieces = SPLITTERS[depth](text).filter((p) => p.trim().length > 0);
  if (pieces.length <= 1) return recursiveSplit(text, maxChars, depth + 1);

  const out: string[] = [];
  let buffer = '';
  for (const piece of pieces) {
    const candidate = buffer ? `${buffer}\n${piece}` : piece;
    if (candidate.length > maxChars && buffer) {
      out.push(buffer);
      buffer = piece.length > maxChars ? '' : piece;
      if (piece.length > maxChars) out.push(...recursiveSplit(piece, maxChars, depth + 1));
    } else {
      buffer = candidate;
    }
  }
  if (buffer) out.push(buffer);
  return out;
};

/** Sentence-aware split (keeps abbreviations reasonably intact). */
const sentenceSplit = (text: string, maxChars: number, overlap: number): string[] => {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const out: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if ((buf + ' ' + s).trim().length > maxChars && buf) {
      out.push(buf.trim());
      buf = overlap > 0 ? tailWords(buf, overlap) + ' ' + s : s;
    } else {
      buf = (buf ? buf + ' ' : '') + s;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
};

const tailWords = (text: string, chars: number): string => {
  if (chars <= 0) return '';
  const slice = text.slice(-chars);
  const firstSpace = slice.indexOf(' ');
  return firstSpace === -1 ? slice : slice.slice(firstSpace + 1);
};

export interface ChunkDocumentInput {
  docId: string;
  docName: string;
  sourceType?: string;
  text: string;
  options?: ChunkingOptions;
  metadata?: Record<string, unknown>;
}

/**
 * Main entry point. Returns chunks with provenance + breadcrumbs + hashes.
 */
export const chunkDocument = (input: ChunkDocumentInput): RagChunk[] => {
  const {
    docId,
    docName,
    sourceType = 'text',
    metadata = {},
  } = input;
  const options = input.options ?? {};
  const maxChars = Math.max(200, options.maxChars ?? DEFAULT_MAX);
  const overlap = Math.max(0, Math.min(options.overlapChars ?? DEFAULT_OVERLAP, Math.floor(maxChars / 2)));
  const strategy: ChunkStrategy = options.strategy ?? 'recursive';

  const text = normaliseText(input.text);
  if (!text) return [];

  const sections = strategy === 'markdown' || strategy === 'recursive' ? findSections(text) : [];

  // 1. Produce raw spans of text.
  const spans: { text: string; start: number }[] = [];
  if (strategy === 'fixed') {
    for (let i = 0; i < text.length; i += maxChars - overlap) {
      spans.push({ text: text.slice(i, i + maxChars), start: i });
    }
  } else if (strategy === 'sentence') {
    let cursor = 0;
    for (const piece of sentenceSplit(text, maxChars, overlap)) {
      const idx = text.indexOf(piece, Math.max(0, cursor - overlap));
      const start = idx === -1 ? cursor : idx;
      spans.push({ text: piece, start });
      cursor = start + piece.length;
    }
  } else {
    // recursive / markdown: split per section so breadcrumbs stay meaningful
    const bounds = sections.length > 1
      ? sections.map((s, i) => ({
        start: s.start,
        end: i + 1 < sections.length ? sections[i + 1].start : text.length,
      }))
      : [{ start: 0, end: text.length }];

    for (const b of bounds) {
      const body = text.slice(b.start, b.end);
      if (!body.trim()) continue;
      for (const piece of recursiveSplit(body, maxChars)) {
        const trimmed = piece.trim();
        if (!trimmed) continue;
        const idx = text.indexOf(trimmed, b.start);
        spans.push({ text: trimmed, start: idx === -1 ? b.start : idx });
      }
    }
  }

  // 2. Attach provenance, dedupe by hash, add overlap breadcrumbs.
  const chunks: RagChunk[] = [];
  const seen = new Set<string>();
  let ordinal = 0;

  for (const span of spans) {
    const body = span.text.trim();
    if (body.length < 20) continue;
    // Skip chunks that are pure boilerplate (page numbers, rules).
    if (/^[\s\-_=*#.|~]+$/.test(body)) continue;

    const hash = hashString(`${docId}:${body}`);
    if (seen.has(hash)) continue;
    seen.add(hash);

    chunks.push({
      id: `${docId}:${ordinal}`,
      docId,
      docName,
      sourceType,
      index: ordinal,
      breadcrumb: breadcrumbAt(sections, span.start),
      text: body,
      start: span.start,
      end: span.start + body.length,
      tokenEstimate: estimateTokens(body),
      hash,
      metadata,
    });
    ordinal++;
  }

  return chunks;
};

/** Cheap preview used by the UI chunk inspector. */
export const previewChunks = (text: string, options: ChunkingOptions, limit = 6): RagChunk[] =>
  chunkDocument({ docId: 'preview', docName: 'Preview', text, options }).slice(0, limit);
