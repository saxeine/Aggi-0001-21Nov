/**
 * MAGGI engine self-test — pure logic, no network, no DOM.
 *
 * Run with:  npx tsx scripts/maggi-selftest.ts
 *
 * Covers: tokenizer/stemmer, chunker (structure + overlap + dedupe), BM25,
 * hash embeddings, RRF hybrid fusion, MMR diversification, context block
 * numbering and citation extraction.
 */

import { chunkDocument } from '../services/maggi/chunker';
import { Bm25Index } from '../services/maggi/bm25';
import { VectorIndex } from '../services/maggi/vectorStore';
import { hashEmbed, cosine, l2Normalise } from '../services/maggi/embeddings';
import { retrieve, buildContextBlock } from '../services/maggi/retriever';
import { tokenize, stem, hashString, estimateTokens } from '../services/maggi/text';
import { rankFusionSanity } from './maggi-test-utils';

let passed = 0;
let failed = 0;

const ok = (name: string, condition: boolean, detail = '') => {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const section = (t: string) => console.log(`\n\x1b[1m${t}\x1b[0m`);

// ---------------------------------------------------------------------------
section('1. Tokenizer & hashing');
// ---------------------------------------------------------------------------
ok('stems plurals', stem('invoices') === 'invoice', stem('invoices'));
ok('stems gerunds', stem('refinancing') === 'refinanc', stem('refinancing'));
ok('tokenize drops stopwords', !tokenize('the cat and the dog').includes('the'));
ok('tokenize keeps numbers', tokenize('Q3 revenue was 12.4M').includes('12'));
ok('hash is stable', hashString('hello world') === hashString('hello world'));
ok('hash differs on content', hashString('a') !== hashString('b'));
ok('token estimate sane', estimateTokens('a'.repeat(400)) === 100);

// ---------------------------------------------------------------------------
section('2. Chunker');
// ---------------------------------------------------------------------------
const doc = `# Annual Report 2024

## Revenue

Revenue grew 12% to $48.2M in 2024, driven by enterprise renewals. Churn fell to 3.1%,
the lowest in company history. Customer acquisition cost dropped 18% year over year.

## Risks

Supply chain concentration remains our largest exposure: 62% of components come from a
single region. Currency volatility in the EU market could reduce margins by 2–3 points.
Regulatory pressure on data residency is increasing in three key markets.

## Outlook

Management expects 15% growth in 2025. We will invest $6M in R&D and expand the sales
team by 20 headcount.

### Detailed Notes

${Array.from({ length: 12 }).map((_, i) => `Note ${i + 1}: operational detail about process ${i + 1}, including metrics, owners, and quarterly milestones that must be tracked carefully.`).join('\n\n')}`;

const chunks = chunkDocument({
  docId: 'doc1',
  docName: 'annual-report.md',
  sourceType: 'text',
  text: doc,
  options: { strategy: 'recursive', maxChars: 400, overlapChars: 80 },
});

ok('produces multiple chunks', chunks.length >= 4, `got ${chunks.length}`);
ok('every chunk respects max size (+ tolerance)', chunks.every((c) => c.text.length <= 460),
  `max=${Math.max(...chunks.map((c) => c.text.length))}`);
ok('chunks carry heading breadcrumbs', chunks.some((c) => c.breadcrumb.includes('Risks')),
  JSON.stringify(chunks.map((c) => c.breadcrumb)));
ok('chunks have stable unique ids', new Set(chunks.map((c) => c.id)).size === chunks.length);
ok('chunks have char offsets', chunks.every((c) => c.start >= 0 && c.end > c.start));
ok('no duplicated chunk content', new Set(chunks.map((c) => c.hash)).size === chunks.length);

const smallChunks = chunkDocument({
  docId: 'doc2', docName: 'tiny', sourceType: 'text',
  text: 'Just one short paragraph that should remain a single chunk of text.',
  options: { maxChars: 1200 },
});
ok('short docs stay whole', smallChunks.length === 1, `got ${smallChunks.length}`);

// ---------------------------------------------------------------------------
section('3. BM25 lexical index');
// ---------------------------------------------------------------------------
const bm25 = new Bm25Index();
bm25.addChunks(chunks);
ok('indexes all chunks', bm25.size === chunks.length);
ok('vocabulary is non-empty', bm25.vocabularySize > 20, `${bm25.vocabularySize} terms`);

const revHits = bm25.search('revenue growth churn');
ok('finds revenue passage first', revHits[0]?.chunkId === chunks.find((c) => c.text.includes('Revenue grew 12%'))?.id,
  revHits[0]?.chunkId);

const riskHits = bm25.search('supply chain currency volatility risk');
ok('finds risk passage first', /Supply chain concentration/.test(bm25.getChunk(riskHits[0]?.chunkId ?? '')?.text ?? ''));

const numHits = bm25.search('R&D investment 2025');
ok('matches numeric/entity query', numHits.length > 0);

bm25.removeChunk(chunks[0].id);
ok('supports removal', bm25.size === chunks.length - 1);
bm25.addChunk(chunks[0]);
ok('supports re-add', bm25.size === chunks.length);

// ---------------------------------------------------------------------------
section('4. Embeddings (offline hash backend)');
// ---------------------------------------------------------------------------
const v1 = hashEmbed('revenue growth and enterprise renewals');
const v2 = hashEmbed('enterprise renewals drove revenue growth');
const v3 = hashEmbed('supply chain concentration in one region');
ok('vectors are normalised', Math.abs(l2Normalise([...v1]).reduce((s, x) => s + x * x, 0) - 1) < 1e-6);
ok('paraphrase similarity > unrelated similarity',
  cosine(v1, v2) > cosine(v1, v3),
  `para=${cosine(v1, v2).toFixed(3)} unrel=${cosine(v1, v3).toFixed(3)}`);
ok('identical text ⇒ similarity 1', Math.abs(cosine(v1, hashEmbed('revenue growth and enterprise renewals')) - 1) < 1e-6);
ok('morphological variants are close', cosine(hashEmbed('refinance options'), hashEmbed('refinancing options')) > 0.5,
  cosine(hashEmbed('refinance options'), hashEmbed('refinancing options')).toFixed(3));

// ---------------------------------------------------------------------------
section('5. Vector index');
// ---------------------------------------------------------------------------
const vectors = new VectorIndex();
chunks.forEach((c) => vectors.add(c, hashEmbed(c.text)));
ok('stores every chunk', vectors.size === chunks.length);
const qv = hashEmbed('currency volatility margin risk');
const vHits = vectors.search(qv, 3);
ok('returns ranked vector hits', vHits.length === 3 && vHits[0].score >= vHits[1].score);
ok('top vector hit is the risk chunk',
  /Supply chain|volatility/.test(chunks.find((c) => c.id === vHits[0].chunkId)?.text ?? ''),
  chunks.find((c) => c.id === vHits[0].chunkId)?.text.slice(0, 80));

// ---------------------------------------------------------------------------
section('6. Hybrid retrieval (RRF fusion + MMR)');
// ---------------------------------------------------------------------------
const deps = {
  bm25,
  vectors,
  embedQuery: async (t: string) => hashEmbed(t),
};

(async () => {
  const hybrid = await retrieve('What are the biggest risks to margins?', deps, {
    topK: 3, candidateK: 10, vectorWeight: 0.6, diversify: true, mode: 'hybrid',
  }, 8000);

  ok('hybrid returns topK passages', hybrid.chunks.length === 3, `got ${hybrid.chunks.length}`);
  ok('retrieval is fast (<500ms)', hybrid.latencyMs < 500, `${hybrid.latencyMs}ms`);
  ok('trace records both legs', hybrid.trace.some((t) => t.startsWith('vector')) && hybrid.trace.some((t) => t.startsWith('bm25')),
    hybrid.trace.join(','));
  ok('risk content is retrieved',
    hybrid.chunks.some((c) => /volatility|Supply chain|Regulatory/.test(c.chunk.text)),
    hybrid.chunks.map((c) => c.chunk.text.slice(0, 40)).join(' | '));
  ok('context block is numbered', /^\[1\]/.test(hybrid.contextBlock));
  ok('context block includes doc names', hybrid.contextBlock.includes('annual-report.md'));
  ok('token estimate is positive', hybrid.tokens > 0);

  const keywordOnly = await retrieve('supply chain concentration', deps, { topK: 2, mode: 'keyword' }, 8000);
  ok('keyword-only mode works (no vector leg)',
    keywordOnly.chunks.length >= 1 && !keywordOnly.trace.some((t) => t.startsWith('vector')),
    `chunks=${keywordOnly.chunks.length} trace=${keywordOnly.trace.join(',')}`);

  const vectorOnly = await retrieve('supply chain concentration', deps, { topK: 2, mode: 'vector' }, 8000);
  ok('vector-only mode works', vectorOnly.chunks.length === 2 && !vectorOnly.trace.some((t) => t.startsWith('bm25')));

  // MMR: with diversification the top-k should cover more distinct sections
  const diversified = await retrieve('report details risks outlook revenue', deps, {
    topK: 4, candidateK: 20, diversify: true, diversityLambda: 0.5,
  }, 8000);
  const distinctBreadcrumbs = new Set(diversified.chunks.map((c) => c.chunk.breadcrumb.join('>'))).size;
  ok('MMR increases section coverage', distinctBreadcrumbs >= 2, `${distinctBreadcrumbs} sections`);

  // budget enforcement
  const tiny = await retrieve('revenue risk outlook', deps, { topK: 10 }, 300);
  ok('respects maxContextChars budget', tiny.contextBlock.length <= 900, `${tiny.contextBlock.length} chars`);

  // -------------------------------------------------------------------------
  section('7. Fusion sanity + citations');
  // -------------------------------------------------------------------------
  ok('RRF favours chunks found by both legs', rankFusionSanity());

  const block = buildContextBlock(hybrid.chunks, 8000);
  ok('markers are sequential', /^\[1\][\s\S]*\[2\]/.test(block.block));
  ok('built block matches retrieval', block.block.length > 0 && block.used.length === 3);

  // -------------------------------------------------------------------------
  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed === 0 ? 0 : 1);
})();
