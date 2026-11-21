/**
 * MAGGI server routes.
 *
 * Keeps every secret server-side while letting the browser drive the pipeline:
 *
 *   POST /api/maggi/chat         — unified chat completion (FreeLLMAPI / OpenAI-compatible / Ollama / Gemini)
 *   POST /api/maggi/chat-stream  — same, but SSE-streamed
 *   POST /api/maggi/embed        — embeddings via Gemini or /v1/embeddings
 *   POST /api/maggi/extract      — PDF / DOCX / URL → text
 *   POST /api/maggi/probe        — connectivity + model discovery
 *   GET  /api/maggi/health       — capability report for the dashboard
 *
 * FreeLLMAPI (https://github.com/tashfeenahmed/freellmapi) is OpenAI-compatible,
 * so one code path covers it plus llama.cpp / LM Studio / vLLM / OpenRouter.
 */

import express from 'express';
import { GoogleGenAI } from '@google/genai';

type Router = express.Router;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const envFirst = (...names: string[]): string | undefined => {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
};

export const FREELLM_ENV = {
  baseUrl: envFirst('FREELLMAPI_BASE_URL', 'FREELMAPI_BASE_URL', 'MAGGI_FREELLM_BASE_URL'),
  apiKey: envFirst('FREELLMAPI_API_KEY', 'FREELMAPI_API_KEY', 'MAGGI_FREELLM_API_KEY'),
};

const normaliseBaseUrl = (url: string): string => {
  const trimmed = (url || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  // Accept both "http://host:3001" and "http://host:3001/v1"
  if (/\/v\d+(\.\d+)?$/.test(trimmed) || trimmed.endsWith('/v1')) return trimmed;
  return `${trimmed}/v1`;
};

const withTimeout = (ms: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
};

const FRIENDLY_ERROR = (status: number, raw: string): string => {
  const msg = raw || `HTTP ${status}`;
  if (status === 401 || status === 403) {
    return `Authentication failed (${status}). Check the FreeLLMAPI unified key / provider key. Raw: ${msg.slice(0, 200)}`;
  }
  if (status === 429) return `Rate limited (429). FreeLLMAPI will fail over to another provider — retry shortly. Raw: ${msg.slice(0, 200)}`;
  if (status === 404) return `Endpoint not found (404). Is FreeLLMAPI running and is the base URL …/v1? Raw: ${msg.slice(0, 200)}`;
  if (status >= 500) return `Upstream provider error (${status}). Raw: ${msg.slice(0, 200)}`;
  return msg.slice(0, 400);
};

/** Decode an OpenAI-style SSE body and relay normalised deltas. */
const relayOpenAiStream = async (
  upstream: Response,
  res: express.Response,
  meta: { model?: string },
) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const routedVia = upstream.headers.get('x-routed-via') || undefined;
  if (routedVia) res.write(`data: ${JSON.stringify({ routedVia })}\n\n`);

  const reader = upstream.body?.getReader();
  if (!reader) {
    res.write(`data: ${JSON.stringify({ error: 'Upstream returned no stream body' })}\n\n`);
    res.end();
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;

  const pump = async (): Promise<void> => {
    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') {
          finished = true;
          res.write('data: [DONE]\n\n');
          break;
        }
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content
            ?? json.choices?.[0]?.text
            ?? json.delta
            ?? '';
          const model = json.model || meta.model;
          if (delta) res.write(`data: ${JSON.stringify({ delta, model, routedVia })}\n\n`);
          if (json.usage) res.write(`data: ${JSON.stringify({ usage: json.usage })}\n\n`);
        } catch {
          /* keep-alive or non-JSON frame */
        }
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  };

  try {
    await pump();
  } catch (e: any) {
    res.write(`data: ${JSON.stringify({ error: e?.message || 'stream error' })}\n\n`);
    res.end();
  }
};

const blockPrivateHost = (rawUrl: string): string | null => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return 'Invalid URL';
  }
  if (!['http:', 'https:'].includes(url.protocol)) return 'Only http(s) URLs are supported';
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '0.0.0.0' || host === '[::1]') return null; // allowed: self-hosted docs
  if (host === '169.254.169.254' || host === 'metadata.google.internal') return 'Blocked URL host';
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return null; // LAN docs are fine
  return null;
};

const htmlToText = (html: string): { text: string; title?: string } => {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  let work = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|iframe|nav|footer|header|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, lvl: string, inner: string) =>
      `\n\n${'#'.repeat(Number(lvl))} ${inner.replace(/<[^>]+>/g, ' ').trim()}\n\n`)
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|section|article|li|tr|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const text = work
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&#(\d+);/g, (_m, c: string) => String.fromCharCode(Number(c)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { text, title: titleMatch ? titleMatch[1].trim() : undefined };
};

// ---------------------------------------------------------------------------
// router factory
// ---------------------------------------------------------------------------

export const createMaggiRouter = (): Router => {
  const router = express.Router();

  // Plain JSON body parser for the large-ish payloads the indexer sends.
  router.use(express.json({ limit: '60mb' }));

  // ---------------------------------------------------------------- health --
  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      freeLlmApiConfigured: !!(FREELLM_ENV.baseUrl || FREELLM_ENV.apiKey),
      freeLlmApiBaseUrl: FREELLM_ENV.baseUrl || null,
      hasEnvKey: !!FREELLM_ENV.apiKey,
      geminiAvailable: !!process.env.GEMINI_API_KEY,
      pdf: true,
      docx: true,
      urlFetch: true,
      version: 1,
    });
  });

  // ------------------------------------------------------------------ chat --
  const handleChat = async (req: express.Request, res: express.Response) => {
    const {
      provider = 'freellmapi',
      messages = [],
      model,
      temperature = 0.25,
      maxTokens = 1200,
      baseUrl,
      apiKey,
      stream = false,
    } = req.body ?? {};

    try {
      // ---- FreeLLMAPI / any OpenAI-compatible endpoint ----
      if (provider === 'freellmapi' || provider === 'openai') {
        const resolvedBase = normaliseBaseUrl(
          baseUrl || (provider === 'freellmapi' ? FREELLM_ENV.baseUrl ?? '' : ''),
        );
        const resolvedKey = apiKey || (provider === 'freellmapi' ? FREELLM_ENV.apiKey ?? '' : '');

        if (!resolvedBase) {
          res.status(400).json({
            error: provider === 'freellmapi'
              ? 'FreeLLMAPI base URL is not configured. Start FreeLLMAPI (default http://localhost:3001) and set it in MAGGI Settings, or set FREELLMAPI_BASE_URL.'
              : 'OpenAI-compatible base URL is not configured.',
            code: 'NO_BASE_URL',
          });
          return;
        }

        const timeout = withTimeout(stream ? 180_000 : 120_000);
        let upstream: Response;
        try {
          upstream = await fetch(`${resolvedBase}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(resolvedKey ? { Authorization: `Bearer ${resolvedKey}` } : {}),
            },
            body: JSON.stringify({
              model: model || 'auto',
              messages,
              temperature,
              max_tokens: maxTokens,
              stream: !!stream,
            }),
            signal: timeout.signal,
          });
        } finally {
          // timeout cleared once headers arrive; body streaming keeps its own lifetime
          if (!stream) timeout.clear();
        }

        if (!upstream.ok) {
          const raw = await upstream.text().catch(() => '');
          timeout.clear();
          res.status(upstream.status).json({ error: FRIENDLY_ERROR(upstream.status, raw) });
          return;
        }

        if (stream) {
          await relayOpenAiStream(upstream, res, { model });
          timeout.clear();
          return;
        }

        const data = await upstream.json();
        timeout.clear();
        const text = data.choices?.[0]?.message?.content
          ?? data.choices?.[0]?.text
          ?? data.output?.[0]?.content?.[0]?.text
          ?? '';
        res.json({
          text: typeof text === 'string' ? text : JSON.stringify(text),
          model: data.model || model,
          routedVia: upstream.headers.get('x-routed-via') || data.routed_via || undefined,
          usage: data.usage
            ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
            : undefined,
        });
        return;
      }

      // ---- Ollama (direct) ----
      if (provider === 'ollama') {
        const resolvedBase = (baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
        const timeout = withTimeout(120_000);
        const upstream = await fetch(`${resolvedBase}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model || 'llama3',
            messages,
            stream: false,
            options: { temperature },
          }),
          signal: timeout.signal,
        });
        timeout.clear();
        if (!upstream.ok) {
          const raw = await upstream.text().catch(() => '');
          res.status(upstream.status).json({ error: FRIENDLY_ERROR(upstream.status, raw) });
          return;
        }
        const data = await upstream.json();
        res.json({
          text: data.message?.content ?? '',
          model: data.model || model,
          usage: {
            promptTokens: data.prompt_eval_count,
            completionTokens: data.eval_count,
          },
        });
        return;
      }

      // ---- Gemini (existing key path, incl. per-request x-gemini-key) ----
      const key = (req.headers['x-gemini-key'] as string) || process.env.GEMINI_API_KEY;
      if (!key) {
        res.status(401).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
        return;
      }
      const ai = new GoogleGenAI({ apiKey: key });
      const systemMsg = messages.filter((m: any) => m.role === 'system').map((m: any) => m.content).join('\n\n');
      const contents = messages
        .filter((m: any) => m.role !== 'system')
        .map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents,
        config: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(systemMsg ? { systemInstruction: systemMsg } : {}),
        },
      });

      res.json({
        text: response.text ?? '',
        model: model || 'gemini-2.5-flash',
        usage: {
          promptTokens: (response as any).usageMetadata?.promptTokenCount,
          completionTokens: (response as any).usageMetadata?.candidatesTokenCount,
        },
      });
    } catch (e: any) {
      const message = e?.name === 'AbortError' ? 'Request timed out.' : (e?.message || 'Unknown error');
      if (!res.headersSent) res.status(500).json({ error: message });
      else res.end();
    }
  };

  router.post('/chat', handleChat);
  router.post('/chat-stream', (req, res) => {
    req.body = { ...(req.body ?? {}), stream: true };
    return handleChat(req, res);
  });

  // ----------------------------------------------------------------- embed --
  router.post('/embed', async (req, res) => {
    const { texts = [], backend = 'gemini', model, baseUrl, apiKey } = req.body ?? {};
    if (!Array.isArray(texts) || !texts.length) {
      res.status(400).json({ error: 'texts[] is required' });
      return;
    }

    try {
      if (backend === 'openai') {
        const resolvedBase = normaliseBaseUrl(baseUrl || FREELLM_ENV.baseUrl || '');
        const resolvedKey = apiKey || FREELLM_ENV.apiKey || '';
        if (!resolvedBase) {
          res.status(400).json({ error: 'No base URL for embeddings.' });
          return;
        }
        const upstream = await fetch(`${resolvedBase}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(resolvedKey ? { Authorization: `Bearer ${resolvedKey}` } : {}),
          },
          body: JSON.stringify({ model: model || 'auto', input: texts }),
        });
        if (!upstream.ok) {
          const raw = await upstream.text().catch(() => '');
          res.status(upstream.status).json({ error: FRIENDLY_ERROR(upstream.status, raw) });
          return;
        }
        const data = await upstream.json();
        const vectors = (data.data ?? [])
          .sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
          .map((d: any) => d.embedding);
        res.json({ vectors, provider: 'freellmapi' });
        return;
      }

      // Gemini embeddings
      const key = (req.headers['x-gemini-key'] as string) || process.env.GEMINI_API_KEY;
      if (!key) {
        res.status(401).json({ error: 'GEMINI_API_KEY missing — MAGGI will fall back to the local hash embedder.' });
        return;
      }
      const ai = new GoogleGenAI({ apiKey: key });
      const embedModel = model || 'text-embedding-004';

      const response = await ai.models.embedContent({
        model: embedModel,
        contents: texts,
      } as any);

      const embeddings: any = (response as any).embeddings ?? [];
      const vectors = Array.isArray(embeddings)
        ? embeddings.map((e: any) => e.values ?? e.embedding?.values ?? [])
        : [];

      if (!vectors.length || !vectors[0]?.length) {
        res.status(502).json({ error: 'Gemini returned no embeddings for this model.' });
        return;
      }
      res.json({ vectors, provider: 'gemini', model: embedModel });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Embedding failed' });
    }
  });

  // --------------------------------------------------------------- extract --
  router.post('/extract', async (req, res) => {
    const { kind, data, name, url } = req.body ?? {};
    const warnings: string[] = [];

    try {
      if (kind === 'url') {
        const blocked = blockPrivateHost(url);
        if (blocked) {
          res.status(400).json({ error: blocked });
          return;
        }
        const timeout = withTimeout(25_000);
        const upstream = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MAGGI-RAG/1.0; +https://github.com/tashfeenahmed/freellmapi)',
            Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5',
          },
          redirect: 'follow',
          signal: timeout.signal,
        });
        timeout.clear();
        if (!upstream.ok) {
          res.status(upstream.status).json({ error: `Fetch failed with ${upstream.status}` });
          return;
        }
        const contentType = upstream.headers.get('content-type') || '';
        const raw = await upstream.text();
        if (contentType.includes('text/html')) {
          const { text, title } = htmlToText(raw);
          res.json({ text, title: title || name, warnings });
        } else {
          res.json({ text: raw, title: name, warnings });
        }
        return;
      }

      if (!data) {
        res.status(400).json({ error: 'data (base64) is required' });
        return;
      }

      const buffer = Buffer.from(data, 'base64');

      if (kind === 'pdf') {
        try {
          const pdfModule: any = await import('pdf-parse');
          const PDFParse = pdfModule.PDFParse ?? pdfModule.default?.PDFParse;
          if (!PDFParse) throw new Error('pdf-parse did not expose PDFParse');
          const parser = new PDFParse({ data: new Uint8Array(buffer) });
          const result: any = await parser.getText();
          let text: string = result?.text ?? '';
          if (!text && Array.isArray(result?.pages)) {
            text = result.pages.map((p: any) => p.text).join('\n\n');
          }
          await parser.destroy?.();
          if (!text.trim()) warnings.push('No text layer found — this PDF is probably a scan. OCR is not enabled.');
          res.json({ text, warnings });
        } catch (e: any) {
          res.status(500).json({ error: `PDF parsing failed: ${e.message}`, warnings });
        }
        return;
      }

      if (kind === 'docx') {
        try {
          const mammoth: any = await import('mammoth');
          const result = await mammoth.default.extractRawText({ buffer });
          res.json({ text: result.value || '', warnings: result.messages?.map((m: any) => m.message) ?? [] });
        } catch (e: any) {
          res.status(500).json({ error: `DOCX parsing failed: ${e.message}` });
        }
        return;
      }

      // generic text
      res.json({ text: buffer.toString('utf-8'), warnings });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Extraction failed' });
    }
  });

  // ----------------------------------------------------------------- probe --
  router.post('/probe', async (req, res) => {
    const { provider = 'freellmapi', baseUrl, apiKey, model } = req.body ?? {};
    try {
      if (provider === 'ollama') {
        const base = (baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
        const timeout = withTimeout(8000);
        const upstream = await fetch(`${base}/api/tags`, { signal: timeout.signal });
        timeout.clear();
        if (!upstream.ok) {
          res.json({ ok: false, detail: `Ollama responded ${upstream.status}` });
          return;
        }
        const data = await upstream.json();
        res.json({ ok: true, detail: 'Ollama reachable', models: (data.models ?? []).map((m: any) => m.name) });
        return;
      }

      if (provider === 'gemini') {
        res.json({
          ok: !!process.env.GEMINI_API_KEY,
          detail: process.env.GEMINI_API_KEY ? 'Server Gemini key present' : 'No server Gemini key',
        });
        return;
      }

      const base = normaliseBaseUrl(baseUrl || FREELLM_ENV.baseUrl || '');
      const key = apiKey || FREELLM_ENV.apiKey || '';
      if (!base) {
        res.json({
          ok: false,
          detail: 'No base URL. Start FreeLLMAPI (`npx freellmapi` → http://localhost:3001) and set it above, or set FREELLMAPI_BASE_URL.',
        });
        return;
      }

      const timeout = withTimeout(10_000);
      let upstream: Response;
      try {
        upstream = await fetch(`${base}/models`, {
          headers: key ? { Authorization: `Bearer ${key}` } : {},
          signal: timeout.signal,
        });
      } finally {
        timeout.clear();
      }

      if (!upstream.ok) {
        const raw = await upstream.text().catch(() => '');
        res.json({ ok: false, detail: FRIENDLY_ERROR(upstream.status, raw) });
        return;
      }
      const data = await upstream.json();
      const models = (data.data ?? data.models ?? []).map((m: any) => m.id ?? m.name).filter(Boolean);
      res.json({
        ok: true,
        detail: `Connected — ${models.length} models available${key ? '' : ' (no key: anonymous providers only)'}`,
        models: models.slice(0, 200),
      });
    } catch (e: any) {
      res.json({
        ok: false,
        detail: e?.name === 'AbortError'
          ? 'Probe timed out — is FreeLLMAPI running on that port?'
          : (e?.message || 'Probe failed'),
      });
    }
  });

  return router;
};
