/**
 * Tiny helpers that isolate pure scoring logic for the self-test.
 */
import { RagChunk } from '../services/maggi/types';

/** Reciprocal-rank fusion should rank an item found by both lists above items found by one. */
export const rankFusionSanity = (): boolean => {
  const K = 60;
  const both = 1 / (K + 1) + 1 / (K + 1);   // rank 0 in both lists
  const onlyOne = 1 / (K + 1);              // rank 0 in a single list
  return both > onlyOne;
};

export const fakeChunk = (id: string, text: string): RagChunk => ({
  id,
  docId: 'd',
  docName: 'n',
  sourceType: 'text',
  index: 0,
  breadcrumb: [],
  text,
  start: 0,
  end: text.length,
  tokenEstimate: Math.ceil(text.length / 4),
  hash: id,
});

export const latexFree = (s: string) => s.replace(/\\/g, '');
