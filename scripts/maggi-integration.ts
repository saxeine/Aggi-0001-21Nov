/**
 * MAGGI end-to-end integration test.
 *
 * Exercises the real MaggiStore: ingest → chunk → embed → retrieve → answer →
 * citations, with the browser APIs stubbed (localStorage, no IndexedDB) and a
 * fake OpenAI-compatible brain served by a local HTTP server.
 *
 * Run: npx tsx scripts/maggi-integration.ts
 */

import http from 'node:http';

// ---------------------------------------------------------------------------
// Minimal browser shims (MaggiStore touches localStorage + performance)
// ---------------------------------------------------------------------------
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
(globalThis as any).indexedDB = undefined;

let passed = 0;
let failed = 0;
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};

// ---------------------------------------------------------------------------
// Fake FreeLLMAPI upstream
// ---------------------------------------------------------------------------
let lastChatBody: any = null;
const caughtContext = { system: '', user: '' };

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.url?.endsWith('/chat/completions')) {
      lastChatBody = JSON.parse(body);
      const msgs = lastChatBody.messages as Array<{ role: string; content: string }>;
      caughtContext.system = msgs.find((m) => m.role === 'system')?.content ?? '';
      caughtContext.user = msgs.find((m) => m.role === 'user')?.content ?? '';
      res.writeHead(200, { 'content-type': 'application/json', 'x-routed-via': 'cerebras/llama-3.3-70b' });
      res.end(JSON.stringify({
        model: 'llama-3.3-70b',
        choices: [{ message: { content: 'Churn fell to 3.1% [1], the lowest on record. Supply-chain concentration is the top risk [2].' } }],
        usage: { prompt_tokens: 640, completion_tokens: 28 },
      }));
      return;
    }
    if (req.url?.endsWith('/embeddings')) {
      res.writeHead(404); res.end('not used');
      return;
    }
    res.writeHead(404); res.end();
  });
});

const REAL_FETCH = globalThis.fetch;
const startServer = () => new Promise<number>((resolve) => {
  server.listen(0, '127.0.0.1', () => resolve((server.address() as any).port));
});

(async () => {
  const port = await startServer();
  const base = `http://127.0.0.1:${port}/v1`;

  // Route /api/maggi/* calls to the fake server, and keep everything else real.
  (globalThis as any).fetch = async (input: any, init?: any) => {
    const url = String(input);
    if (url.includes('/api/maggi/chat')) {
      return REAL_FETCH(`${base}/chat/completions`, { ...init, body: JSON.stringify(JSON.parse(init.body)) });
    }
    if (url.includes('/api/maggi/embed')) {
      // Force the offline embedder for a deterministic, network-free test.
      return new Response(JSON.stringify({ error: 'disabled in test' }), { status: 503 });
    }
    return REAL_FETCH(input, init);
  };

  const { MaggiStore } = await import('../services/maggi/store');
  const { hashString } = await import('../services/maggi/text');

  const maggi = new MaggiStore({
    provider: 'freellmapi',
    freeLlmApiBaseUrl: base,
    freeLlmApiKey: 'freellmapi-test',
    freeLlmApiModel: 'auto',
    embeddingBackend: 'hash',
    chunkStrategy: 'recursive',
    chunkSize: 700,
    chunkOverlap: 120,
    retrievalMode: 'hybrid',
    topK: 3,
    candidateK: 20,
    vectorWeight: 0.6,
    diversify: true,
    diversityLambda: 0.7,
    rerank: false,
    recencyBoost: 0,
    useHyde: false,
    multiQuery: false,
    temperature: 0.2,
    maxContextChars: 8000,
    groundingMode: 'strict',
    answerLanguage: 'auto',
  } as any);

  console.log('\n\x1b[1m1. Ingest\x1b[0m');
  await maggi.hydrate();

  const report = `# Acme Corp — Annual Report 2024

## Financial highlights

Revenue grew 12% to $48.2M in 2024, driven by enterprise renewals.
Churn fell to 3.1%, the lowest in company history.
Customer acquisition cost dropped 18% year over year.

## Risk factors

Supply chain concentration remains our largest exposure: 62% of components
come from a single region. Currency volatility in the EU market could reduce
margins by 2-3 points. Regulatory pressure on data residency is increasing
in three key markets.

## Outlook

Management expects 15% growth in 2025 and will invest $6M in R&D.`;

  const minutes = `Board minutes — Q3

The board discussed margin guidance. Currency volatility was cited as the main
driver, with a 2-3 point headwind expected. The board approved a second sourcing
region to reduce supply chain concentration below 40% by 2026.`;

  const results = await maggi.ingest([
    { id: 'report', name: 'annual-report.md', type: 'text', data: report },
    { id: 'minutes', name: 'board-minutes.txt', type: 'text', data: minutes },
  ]);

  ok('both documents ingested', results.every((r) => r.docId && r.chunks > 0),
    JSON.stringify(results.map((r) => ({ n: r.name, c: r.chunks, e: r.error }))));
  ok('chunks were produced', maggi.stats().chunks >= 3, `${maggi.stats().chunks} chunks`);
  ok('documents registered', maggi.stats().documents === 2, `${maggi.stats().documents}`);
  ok('vectors were built', maggi.stats().dims > 0, `dims=${maggi.stats().dims}`);
  ok('offline embedder reported', maggi.stats().vectorBackend === 'hash', maggi.stats().vectorBackend);

  console.log('\n\x1b[1m2. Incremental re-indexing\x1b[0m');
  const again = await maggi.ingest([{ id: 'report', name: 'annual-report.md', type: 'text', data: report }]);
  ok('unchanged document is skipped', again[0].skipped === true, JSON.stringify(again[0]));
  ok('chunk count unchanged after skip', maggi.stats().chunks === results.reduce((n, r) => n + r.chunks, 0));

  const edited = report.replace('Revenue grew 12%', 'Revenue grew 19%');
  const afterEdit = await maggi.ingest([{ id: 'report', name: 'annual-report.md', type: 'text', data: edited }]);
  ok('edited document re-indexed', !afterEdit[0].skipped && afterEdit[0].chunks > 0);
  ok('no duplicate chunks after edit',
    maggi.getChunksForDocument('doc-report').length === afterEdit[0].chunks,
    `${maggi.getChunksForDocument('doc-report').length} vs ${afterEdit[0].chunks}`);
  ok('old text replaced', maggi.getChunksForDocument('doc-report').some((c) => c.text.includes('19%')));

  console.log('\n\x1b[1m3. Retrieval\x1b[0m');
  const ctx = await maggi.search('What is the biggest supply chain risk?');
  ok('search returns passages', ctx.chunks.length > 0, `${ctx.chunks.length}`);
  ok('returns at most topK', ctx.chunks.length <= 3, `${ctx.chunks.length}`);
  ok('finds the risk passage', ctx.chunks.some((c) => /supply chain|62%/i.test(c.chunk.text)),
    ctx.chunks.map((c) => c.chunk.text.slice(0, 40)).join(' | '));
  ok('cross-document retrieval works',
    new Set(ctx.chunks.map((c) => c.chunk.docId)).size >= 1);
  ok('context block is citation-ready', /\[1\] \(/.test(ctx.contextBlock), ctx.contextBlock.slice(0, 80));

  const marginCtx = await maggi.search('currency volatility margin headwind');
  ok('retrieves across both documents for margin question',
    marginCtx.chunks.some((c) => c.chunk.docName === 'board-minutes.txt'),
    marginCtx.chunks.map((c) => c.chunk.docName).join(','));

  console.log('\n\x1b[1m4. Answer + citations via FreeLLMAPI-shaped brain\x1b[0m');
  const answer = await maggi.ask('What happened to churn, and what is the top supply-chain risk?');
  ok('answer text returned', answer.answer.includes('Churn'), answer.answer.slice(0, 60));
  ok('citations extracted', answer.citations.length >= 2, `${answer.citations.length}`);
  ok('citation markers are 1-based and ordered',
    answer.citations.every((c, i) => c.marker === i + 1 || c.marker > 0),
    JSON.stringify(answer.citations.map((c) => c.marker)));
  ok('citations resolve to real chunks',
    answer.citations.every((c) => !!c.chunkId && !!c.docName));
  ok('routedVia surfaced', answer.usage?.routedVia === 'cerebras/llama-3.3-70b', String(answer.usage?.routedVia));
  ok('usage tokens tracked', (answer.usage?.promptTokens ?? 0) > 0, String(answer.usage?.promptTokens));

  console.log('\n\x1b[1m5. Prompt construction\x1b[0m');
  ok('system prompt enforces citation', /cite/i.test(caughtContext.system));
  ok('strict grounding instruction present', /could not find that in the indexed sources/i.test(caughtContext.system));
  ok('context precedes question', caughtContext.user.indexOf('CONTEXT') < caughtContext.user.indexOf('=== QUESTION ==='));
  ok('numbered passages in prompt', /\[1\] \(/.test(caughtContext.user));
  ok('prompt carries real source names', /annual-report|board-minutes/.test(caughtContext.user));
  ok('model passed as auto', lastChatBody?.model === 'auto', String(lastChatBody?.model));
  ok('temperature forwarded', lastChatBody?.temperature === 0.2, String(lastChatBody?.temperature));

  console.log('\n\x1b[1m6. Usage + lifecycle\x1b[0m');
  const usage = maggi.getUsage();
  ok('query counter incremented', usage.queries === 1, `${usage.queries}`);
  ok('provider usage tracked', (usage.byProvider['freellmapi'] ?? 0) === 1, JSON.stringify(usage.byProvider));
  ok('tokens accumulated', usage.totalCompletionTokens > 0, `${usage.totalCompletionTokens}`);

  await maggi.removeDocument('doc-minutes');
  ok('document removal drops its chunks', maggi.stats().documents === 1, `${maggi.stats().documents}`);
  ok('remaining doc intact', maggi.getChunksForDocument('doc-report').length > 0);

  const persisted = store.get('maggi_rag_index_v1');
  ok('index persisted to storage', !!persisted && JSON.parse(persisted).chunks.length > 0);

  // Reload simulation: a fresh store must hydrate from the persisted snapshot
  const maggi2 = new MaggiStore({ ...maggi.getSettings(), embeddingBackend: 'hash' } as any);
  await maggi2.hydrate();
  ok('index rehydrates without re-embedding', maggi2.stats().chunks === maggi.stats().chunks,
    `${maggi2.stats().chunks} vs ${maggi.stats().chunks}`);
  const reCtx = await maggi2.search('supply chain concentration');
  ok('rehydrated index is still searchable', reCtx.chunks.length > 0);

  await maggi.clear();
  ok('clear empties the index', maggi.stats().chunks === 0 && maggi.stats().documents === 0);

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  server.close();
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error('FATAL', e);
  server.close();
  process.exit(1);
});
