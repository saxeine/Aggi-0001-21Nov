# MAGGI — Modular Augmented Generation & Grounded Intelligence

MAGGI is a from-scratch rebuild of the aggregator's retrieval layer, with
**FreeLLMAPI as its primary brain**.

The old approach (still present, untouched, in `services/gemini.ts`) was
"context stuffing": every media item in a session was base64-decoded, truncated
at 300k characters and pasted into one prompt, optionally cached with Gemini's
context-cache API. That works for three files and falls apart at thirty:

| Problem with the old approach | What MAGGI does instead |
| --- | --- |
| Whole documents go to the model regardless of relevance | Only the top-k most relevant **passages** are sent |
| Model must infer which file said what | Every passage carries an inline `[n]` marker + document name + section breadcrumb |
| No citations, no verifiability | Inline citations resolved back to the exact chunk; clicking one jumps to it |
| 300k-char truncation silently drops the answer | Chunking + retrieval means no single document is truncated |
| One monolithic prompt cache, brittle to edits | Incremental index: only changed documents are re-embedded |
| Lexical and semantic search unavailable | Hybrid **BM25 + dense vectors**, fused with Reciprocal Rank Fusion |
| Deterministic answers, no inspection | Retrieval inspector shows per-passage fused/semantic/lexical scores |
| Single provider | FreeLLMAPI / any OpenAI-compatible / Gemini / Ollama behind one interface |

---

## 1. Architecture

```
                      ┌──────────────────────────────────────────────┐
  files, URLs, notes  │  INGEST                                      │
  workspace sources ─▶│  extract.ts  (PDF · DOCX · HTML · URL · md)  │
                      └───────────────┬──────────────────────────────┘
                                      ▼
                      ┌──────────────────────────────────────────────┐
                      │  CHUNK  chunker.ts                           │
                      │  recursive ✓ overlap ✓ heading breadcrumbs   │
                      └───────────────┬──────────────────────────────┘
                          ┌───────────┴────────────┐
                          ▼                        ▼
              ┌───────────────────┐    ┌────────────────────────┐
              │ BM25 sparse index │    │ Dense vectors          │
              │ bm25.ts           │    │ embeddings.ts          │
              └─────────┬─────────┘    └───────────┬────────────┘
                        └──────────┬───────────────┘
                                   ▼
                    ┌─────────────────────────────────┐
                    │ RETRIEVE  retriever.ts          │
                    │ RRF fusion → re-rank → MMR      │
                    └───────────────┬─────────────────┘
                                    ▼
                    ┌─────────────────────────────────┐
                    │ GENERATE  brain.ts              │
                    │ FreeLLMAPI (primary)            │
                    └───────────────┬─────────────────┘
                                    ▼
                    ┌─────────────────────────────────┐
                    │ ANSWER + CITATIONS  store.ts    │
                    └─────────────────────────────────┘
```

**Where things live**

| Path | Responsibility |
| --- | --- |
| `maggi/config.ts` | Settings schema, defaults, the grounded-answer system prompt |
| `services/maggi/types.ts` | Shared contracts (chunk, doc, retrieval, citation) |
| `services/maggi/text.ts` | Tokenizer, Porter-lite stemmer, hashing, token estimation |
| `services/maggi/chunker.ts` | Structure-aware recursive chunker |
| `services/maggi/embeddings.ts` | Gemini / OpenAI-compatible / offline hash embedder |
| `services/maggi/bm25.ts` | Incremental Okapi BM25 index |
| `services/maggi/vectorStore.ts` | Flat Float32 vector index + MMR similarity |
| `services/maggi/retriever.ts` | Hybrid search, RRF, re-ranking, MMR, context builder |
| `services/maggi/brain.ts` | Provider-agnostic LLM client (stream + non-stream + probe) |
| `services/maggi/extract.ts` | Client-side extraction & dispatch to server parsers |
| `services/maggi/store.ts` | Orchestrator: lifecycle, persistence, ingestion, answering |
| `hooks/useMaggi.ts` | React binding |
| `components/MaggiView.tsx` | Shell: chat / sources / settings tabs + stats drawer |
| `components/maggi/*` | Chat w/ citations, source manager, settings panel |
| `server/maggiRoutes.ts` | `/api/maggi/*` — secure proxy, embeddings, parsers |
| `scripts/maggi-selftest.ts` | 42 offline assertions for the whole pipeline |

---

## 2. FreeLLMAPI as the brain

[FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi) is a self-hosted,
OpenAI-compatible proxy that pools the free tiers of ~80 providers behind one
`/v1` endpoint, with smart routing, automatic failover and per-key quota
tracking. Because it speaks the OpenAI protocol, MAGGI needs exactly one client
for it — and the same client serves llama.cpp, LM Studio, vLLM and OpenRouter.

### Start it

```bash
npx freellmapi            # dashboard + API on http://localhost:3001
# open http://localhost:3001 → add provider keys → copy the unified key
```

### Point MAGGI at it

Either **in-app** — 🧠 MAGGI → Settings → Brain:

```
Base URL   http://localhost:3001/v1
API key    freellmapi-xxxxxxxx
Model      auto          # or auto:fast, auto:smart, or a concrete model id
```

…or **server-side** (keeps credentials out of the browser entirely):

```bash
FREELLMAPI_BASE_URL=http://localhost:3001/v1
FREELLMAPI_API_KEY=freellmapi-xxxxxxxx
```

Use **Test connection** in Settings to list every model the router exposes; click
one to pin it.

Model routing strings MAGGI passes through untouched:

| Model | Behaviour |
| --- | --- |
| `auto` | Router picks the best available provider |
| `auto:fast` | Latency-optimised (good for re-ranking / HyDE) |
| `auto:smart` | Capability-optimised (good for answers) |
| `llama-3.3-70b` … | Pinned concrete model |

The `x-routed-via` header is surfaced in the UI (`via groq/llama-3.3-70b`) and
in the stats drawer, so you can see which upstream provider answered.

### Provider fallback chain in MAGGI

1. `freellmapi` (default) → 2. `openai-compatible` → 3. `gemini` → 4. `ollama`.
If the primary errors, the Settings panel tells you exactly why (auth, 404 base
URL, 429 rate limit, 5xx upstream) rather than a generic failure.

---

## 3. The retrieval pipeline

Each stage is individually switchable from **Settings → Retrieval**.

### 3.1 Chunking (`chunker.ts`)

- **Recursive boundary hierarchy**: paragraphs → lines → sentences → clauses →
  words. A boundary is only cut when the parent boundary overflows, so chunks
  end on a thought, not mid-sentence.
- **Heading breadcrumbs**: markdown headings (`#`), bold headings and numbered
  headings are tracked in a stack; every chunk inherits `Risk › Currency`, so an
  orphan paragraph still knows where it came from.
- **Overlap** (default 180 chars) so facts straddling a boundary remain
  retrievable.
- **Content hashes + char offsets** enable dedupe, incremental re-indexing and
  precise citation highlighting.
- Strategies: `recursive` (default), `markdown`, `sentence`, `fixed`.

### 3.2 Sparse leg — BM25 (`bm25.ts`)

Full Okapi BM25 with inverted index, `k1=1.2`, `b=0.75`, idf floored at 0, and
true incremental `addChunk` / `removeByDoc`. BM25 is what makes exact entities
(invoice numbers, ticker symbols, surnames) retrievable — dense vectors are bad
at those.

### 3.3 Dense leg — embeddings (`embeddings.ts`)

| Backend | When | Notes |
| --- | --- | --- |
| `gemini` (**auto** first choice) | `GEMINI_API_KEY` present | `text-embedding-004`, batched 100/req, retried |
| `freellmapi` | provider is FreeLLMAPI with `preferFreeLlm` | `/v1/embeddings` — keeps everything self-hosted |
| `hash` (**auto** fallback) | no key / offline / rate-limited | see below |

The hash backend is not a toy: it hashes **word unigrams + bigrams + character
4-grams** into 512 dimensions with signed hashing, sublinear TF damping and L2
normalisation. That gives real paraphrase and morphology tolerance
(`refinance` ≈ `refinancing`) with zero network and zero API key — so MAGGI
never "breaks because embeddings are down". Semantic quality is of course below
a neural model, and the UI says which backend is active.

### 3.4 Fusion — Reciprocal Rank Fusion (`retriever.ts`)

```
score(chunk) = w_v · 1/(60 + rank_vector + 1)  +  (1 − w_v) · 1/(60 + rank_bm25 + 1)
```

RRF is used instead of adding raw scores because cosine similarity and BM25 live
on incomparable scales, and RRF is robust to one leg being much noisier. A chunk
found by **both** legs outranks a chunk found by either alone — no normalisation
required.

### 3.5 Optional refinements

| Technique | Flag | Cost | Use when |
| --- | --- | --- | --- |
| **Multi-query** — 2 LLM paraphrases fused | `multiQuery` | 1 small call | vague or jargon-heavy questions |
| **HyDE** — draft an answer, embed that | `useHyde` | 1 small call | question and source use different vocabulary |
| **LLM re-rank** — reorder top-20 candidates | `rerank` | 1 small call | precision matters more than latency |
| **MMR** — maximal marginal relevance | `diversify` | free | long documents; avoids 8 near-duplicate passages |
| **Recency boost** — exponential decay | `recencyBoost` | free | news / changelogs |

### 3.6 Context assembly

Passages are emitted as:

```
[1] (annual-report.pdf — Risks › Currency)
Supply chain concentration remains our largest exposure: 62% of components…

---

[2] (board-minutes.docx — Q3)
Margin guidance was cut by 2–3 points on EU currency volatility.
```

- Numbered markers are **stable** and are what the model must cite.
- Token/character budget (`maxContextChars`) is enforced; passages are dropped
  from the tail rather than truncated mid-passage.
- Document names and breadcrumbs are human-facing, so the model can attribute.

---

## 4. Answering & citations

`store.ask()` builds the grounded prompt, calls the brain (streaming by default),
then `extractCitations()` maps every `[n]` marker in the answer back to the
retrieved chunk. Anything the model cites that wasn't retrieved is impossible
because the numbering is derived from the context it received; if it cites
nothing, the top 3 passages are surfaced as "where this likely came from".

- **Strict mode** (default) tells the model to answer
  *"I could not find that in the indexed sources."* rather than hallucinate.
- **Balanced mode** allows world knowledge but requires it be labelled
  `Not from your sources:`.
- The UI renders citations as clickable chips; clicking jumps to the chunk in the
  Sources tab with the related-chunks panel open.

---

## 5. Storage & incremental indexing

- The index (documents + chunks + Float32 vectors + BM25 postings) lives in
  **IndexedDB** (`MAGGI_RAG_DB`), with a `localStorage` fallback for metadata.
- A reload **does not re-embed** — the expensive step is skipped entirely.
- Each document stores a content hash. Re-ingesting an unchanged file is a no-op
  (`⏭ unchanged` in the toast); a changed file has *only its own* chunks replaced.
- Retrieval runs **in the browser**, so queries against your documents don't
  leave the machine. Only the final, small context block goes to the brain.

---

## 6. Server API (`server/maggiRoutes.ts`)

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/maggi/chat` | Unified completion (freellmapi / openai / ollama / gemini) |
| `POST` | `/api/maggi/chat-stream` | Same, normalised SSE: `{delta, model, routedVia}` |
| `POST` | `/api/maggi/embed` | Gemini or `/v1/embeddings` |
| `POST` | `/api/maggi/extract` | PDF (`pdf-parse`) / DOCX (`mammoth`) / URL → text |
| `POST` | `/api/maggi/probe` | Connectivity + `GET /v1/models` discovery |
| `GET` | `/api/maggi/health` | Capability report for the dashboard |

Security notes:

- API keys are resolved **server-first** from env, then per-request from the
  browser. Nothing is logged.
- URL ingestion sends a real UA, follows redirects and blocks
  `169.254.169.254` / cloud-metadata hosts (SSRF guard).
- All upstream calls are timeout-bounded (`AbortController`); streaming keeps
  its own lifetime.
- Errors are translated into actionable messages (401 → "check the unified key",
  404 → "is the base URL …/v1?", 429 → "FreeLLMAPI will fail over, retry shortly").

---

## 7. Tests

```bash
npm run test:maggi     # 42 assertions, no network, ~1s
npm run lint           # tsc --noEmit
npm run build          # vite build
```

Coverage: stemmer/tokenizer, hashing, chunker (size limits, breadcrumbs,
offsets, dedupe, short-doc handling), BM25 (ranking, removal, re-add), hash
embeddings (normalisation, paraphrase > unrelated, morphology), vector index,
hybrid retrieval (both legs contribute, MMR coverage, budget enforcement,
keyword-only / vector-only modes), RRF sanity, context block numbering.

---

## 8. Tuning cheatsheet

| Symptom | Fix |
| --- | --- |
| Answers miss obvious facts | raise `topK` (8→12), raise `candidateK`, enable `multiQuery` |
| Answers cite the same paragraph repeatedly | keep `diversify` on, lower `diversityLambda` (0.7→0.5) |
| Exact IDs / names not found | lower `vectorWeight` (0.65→0.45) — favour BM25 |
| Synonyms / paraphrases not found | raise `vectorWeight`, enable `useHyde` |
| Citations point at the wrong passage | lower `chunkSize` (1200→700) |
| Too slow on a large corpus | disable `rerank` and `useHyde`; lower `candidateK` |
| FreeLLMAPI 429s | keep model `auto` (router fails over) or `auto:fast` |
| Everything offline | set embedding backend to `hash` and provider to `ollama` |

---

## 9. Quick start

1. `npm install && npm run dev`
2. Open the app → click **🧠** in the library header.
3. **Settings → Brain** → set the FreeLLMAPI base URL + unified key → *Test
   connection*.
4. **Sources** → drop a PDF, paste a URL, or *Import workspace* to pull the
   active session's files in.
5. **Chat** → ask a question. Expand *Retrieval* under any answer to see exactly
   which passages were used and why.
