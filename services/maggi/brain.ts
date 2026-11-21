/**
 * MAGGI brain — one interface, four backends.
 *
 * Primary target is **FreeLLMAPI** (github.com/tashfeenahmed/freellmapi): a
 * self-hosted, OpenAI-compatible proxy that pools the free tiers of ~80
 * providers behind one endpoint with smart routing + automatic failover.
 *
 * Because it speaks the OpenAI protocol we implement one client and get:
 *   - model "auto" / "auto:fast" / "auto:smart" / "auto:cheap" routing
 *   - cross-provider failover handled upstream (no retry storms here)
 *   - per-key rate-limit tracking upstream
 *   - tool calling + streaming for free
 *
 * All network calls go through `/api/maggi/chat` so the unified key can live
 * either in localStorage (browser-only setups) or purely in the server env.
 */

import { MaggiSettings, MaggiProvider, PROVIDER_LABELS } from '../../maggi/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  signal?: AbortSignal;
}

export interface CompletionResult {
  text: string;
  provider: MaggiProvider;
  model: string;
  routedVia?: string;
  usage?: { promptTokens?: number; completionTokens?: number };
  latencyMs: number;
}

export type StreamHandler = (delta: string) => void;

export interface MaggiBrain {
  provider: MaggiProvider;
  label: string;
  complete: (messages: ChatMessage[], opts?: CompletionOptions) => Promise<CompletionResult>;
  stream: (messages: ChatMessage[], opts: CompletionOptions, onDelta: StreamHandler) => Promise<CompletionResult>;
  /** Cheap connectivity probe used by the settings panel. */
  probe: () => Promise<{ ok: boolean; detail: string; models?: string[] }>;
}

const normaliseBaseUrl = (url: string): string => {
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

const isLoopbackUrl = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
};

const formatLoopbackBrowserError = (baseUrl: string, err: unknown): string => {
  const msg = err instanceof Error ? err.message : String(err);
  return `Could not reach ${baseUrl} from the cloud server or directly from your browser (${msg}). `
    + `Make sure FreeLLMAPI is running on that port with CORS enabled, or expose it with an HTTPS tunnel `
    + `(e.g. \`cloudflared tunnel --url ${baseUrl.replace(/\/v1$/i, '')}\`) and paste the https:// URL in Base URL.`;
};

const postJson = async (url: string, body: unknown, signal?: AbortSignal) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* raw text */ }
    const err = new Error(parsed?.error || `HTTP ${res.status}: ${text.slice(0, 400) || res.statusText}`) as Error & { code?: string };
    if (parsed?.code) err.code = parsed.code;
    throw err;
  }
  return res;
};

const normaliseProvider = (p: MaggiProvider): 'freellmapi' | 'gemini' | 'openai' | 'ollama' => {
  switch (p) {
    case 'freellmapi': return 'freellmapi';
    case 'gemini': return 'gemini';
    case 'ollama': return 'ollama';
    default: return 'openai';
  }
};

const buildPayload = (settings: MaggiSettings, messages: ChatMessage[], opts: CompletionOptions) => {
  const provider = normaliseProvider(settings.provider);
  const payload: Record<string, unknown> = {
    provider,
    messages,
    temperature: opts.temperature ?? settings.temperature,
    maxTokens: opts.maxTokens ?? 1200,
  };

  if (provider === 'freellmapi') {
    const mode = settings.freeLlmMode || (settings.freeLlmKeys?.length ? 'keypool' : 'url');
    payload.freeLlmMode = mode;
    if (mode === 'keypool') {
      payload.keyPool = settings.freeLlmKeys || [];
    } else {
      payload.baseUrl = normaliseBaseUrl(settings.freeLlmApiBaseUrl);
      payload.apiKey = settings.freeLlmApiKey.trim();
    }
    payload.model = opts.model || settings.freeLlmApiModel || 'auto';
  } else if (provider === 'openai') {
    payload.baseUrl = normaliseBaseUrl(settings.openAiBaseUrl);
    payload.apiKey = settings.openAiApiKey.trim();
    payload.model = opts.model || settings.openAiModel;
  } else if (provider === 'ollama') {
    payload.baseUrl = settings.ollamaBaseUrl.replace(/\s+/g, '').replace(/\/+$/, '');
    payload.model = opts.model || settings.ollamaModel;
  } else {
    payload.model = opts.model || settings.geminiModel;
  }
  return payload;
};

const isLoopbackFallbackCandidate = (err: unknown, baseUrl?: string): boolean => {
  if (!baseUrl || !isLoopbackUrl(baseUrl)) return false;
  const code = (err as any)?.code || '';
  const msg = err instanceof Error ? err.message : String(err);
  return code === 'LOOPBACK_UNREACHABLE' || /ECONNREFUSED|LOOPBACK_UNREACHABLE|fetch failed|not reach/i.test(msg);
};

export const createBrain = (settings: MaggiSettings): MaggiBrain => {
  const provider = settings.provider;
  const label = PROVIDER_LABELS[provider];

  const complete = async (messages: ChatMessage[], opts: CompletionOptions = {}): Promise<CompletionResult> => {
    const started = performance.now();
    const payload = buildPayload(settings, messages, opts);
    const normProvider = payload.provider as string;
    const targetBase = typeof payload.baseUrl === 'string' ? payload.baseUrl : undefined;
    const targetKey = typeof payload.apiKey === 'string' ? payload.apiKey : '';

    let data: any;
    let headerRoutedVia: string | undefined;

    try {
      const res = await postJson('/api/maggi/chat', payload, opts.signal);
      headerRoutedVia = res.headers.get('x-routed-via') || undefined;
      data = await res.json();
    } catch (proxyErr) {
      if ((normProvider === 'freellmapi' || normProvider === 'openai') && isLoopbackFallbackCandidate(proxyErr, targetBase)) {
        try {
          const directRes = await fetch(`${targetBase}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(targetKey ? { Authorization: `Bearer ${targetKey}` } : {}),
            },
            body: JSON.stringify({
              model: payload.model || 'auto',
              messages,
              temperature: payload.temperature,
              max_tokens: payload.maxTokens,
              stream: false,
            }),
            signal: opts.signal,
          });
          if (!directRes.ok) {
            const raw = await directRes.text().catch(() => '');
            throw new Error(`HTTP ${directRes.status}: ${raw.slice(0, 300) || directRes.statusText}`);
          }
          headerRoutedVia = directRes.headers.get('x-routed-via') || undefined;
          data = await directRes.json();
        } catch (directErr) {
          if (directErr instanceof TypeError) {
            throw new Error(formatLoopbackBrowserError(targetBase!, directErr));
          }
          throw directErr;
        }
      } else {
        throw proxyErr;
      }
    }

    // The /api/maggi/chat route returns a normalised {text,...} envelope, but
    // tolerate a raw OpenAI/Chat shape too in case the endpoint is pointed
    // straight at an upstream-compatible gateway.
    const rawContent = data.choices?.[0]?.message?.content
      ?? data.choices?.[0]?.text
      ?? data.message?.content
      ?? '';
    const text = typeof data.text === 'string'
      ? data.text
      : typeof rawContent === 'string' ? rawContent : '';

    return {
      text: text.trim(),
      provider,
      model: data.model || String(payload.model || ''),
      routedVia: data.routedVia || data.routed_via || headerRoutedVia,
      usage: data.usage
        ? {
          promptTokens: data.usage.promptTokens ?? data.usage.prompt_tokens,
          completionTokens: data.usage.completionTokens ?? data.usage.completion_tokens,
        }
        : undefined,
      latencyMs: Math.round(performance.now() - started),
    };
  };

  const stream = async (
    messages: ChatMessage[],
    opts: CompletionOptions,
    onDelta: StreamHandler,
  ): Promise<CompletionResult> => {
    const started = performance.now();
    const payload: Record<string, unknown> = { ...buildPayload(settings, messages, opts), stream: true };
    const normProvider = payload.provider as string;
    const targetBase = typeof payload.baseUrl === 'string' ? payload.baseUrl : undefined;
    const targetKey = typeof payload.apiKey === 'string' ? payload.apiKey : '';

    let res = await fetch('/api/maggi/chat-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: opts.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* raw text */ }

      if (
        (normProvider === 'freellmapi' || normProvider === 'openai')
        && targetBase
        && isLoopbackUrl(targetBase)
        && (parsed?.code === 'LOOPBACK_UNREACHABLE' || /ECONNREFUSED|LOOPBACK_UNREACHABLE|fetch failed/i.test(text))
      ) {
        try {
          res = await fetch(`${targetBase}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(targetKey ? { Authorization: `Bearer ${targetKey}` } : {}),
            },
            body: JSON.stringify({
              model: payload.model || 'auto',
              messages,
              temperature: payload.temperature,
              max_tokens: payload.maxTokens,
              stream: true,
            }),
            signal: opts.signal,
          });
        } catch (directErr) {
          throw new Error(formatLoopbackBrowserError(targetBase, directErr));
        }
      } else {
        throw new Error(`Stream failed (${res.status}): ${parsed?.error || text.slice(0, 300)}`);
      }
    }

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new Error(`Stream failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    let model = String(payload.model || '');
    let routedVia: string | undefined = res.headers.get('x-routed-via') || undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const json = trimmed.slice(5).trim();
        if (!json || json === '[DONE]') continue;
        try {
          const evt = JSON.parse(json);
          if (evt.model) model = evt.model;
          if (evt.routedVia) routedVia = evt.routedVia;
          const delta = evt.delta ?? evt.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            full += delta;
            onDelta(delta);
          }
          if (evt.error) throw new Error(evt.error);
        } catch {
          /* ignore malformed keep-alive frames */
        }
      }
    }

    return {
      text: full.trim(),
      provider,
      model,
      routedVia,
      latencyMs: Math.round(performance.now() - started),
    };
  };

  const probe = async () => {
    const normProvider = normaliseProvider(provider);
    const mode = normProvider === 'freellmapi'
      ? (settings.freeLlmMode || (settings.freeLlmKeys?.length ? 'keypool' : 'url'))
      : 'url';
    const rawBase = provider === 'freellmapi' && mode !== 'keypool' ? settings.freeLlmApiBaseUrl
      : provider === 'openai-compatible' ? settings.openAiBaseUrl
        : provider === 'ollama' ? settings.ollamaBaseUrl : undefined;
    const cleanBase = rawBase
      ? (normProvider === 'ollama' ? rawBase.replace(/\s+/g, '').replace(/\/+$/, '') : normaliseBaseUrl(rawBase))
      : undefined;
    const cleanKey = (provider === 'freellmapi' && mode !== 'keypool' ? settings.freeLlmApiKey
      : provider === 'openai-compatible' ? settings.openAiApiKey : '').trim();

    try {
      const res = await postJson('/api/maggi/probe', {
        provider: normProvider,
        ...(normProvider === 'freellmapi' ? { freeLlmMode: mode, keyPool: mode === 'keypool' ? (settings.freeLlmKeys || []) : undefined } : {}),
        baseUrl: cleanBase,
        apiKey: cleanKey || undefined,
        model: provider === 'freellmapi' ? settings.freeLlmApiModel
          : provider === 'openai-compatible' ? settings.openAiModel : settings.ollamaModel,
      });
      const data = await res.json();

      if (!data.ok && mode !== 'keypool' && (normProvider === 'freellmapi' || normProvider === 'openai') && cleanBase && isLoopbackUrl(cleanBase)
        && (data.code === 'LOOPBACK_UNREACHABLE' || /ECONNREFUSED|LOOPBACK_UNREACHABLE|fetch failed/i.test(data.detail || ''))) {
        try {
          const direct = await fetch(`${cleanBase}/models`, {
            headers: cleanKey ? { Authorization: `Bearer ${cleanKey}` } : {},
          });
          if (!direct.ok) {
            const raw = await direct.text().catch(() => '');
            return { ok: false, detail: `Local endpoint returned HTTP ${direct.status}: ${raw.slice(0, 200) || direct.statusText}` };
          }
          const directJson = await direct.json();
          const models = (directJson.data ?? directJson.models ?? []).map((m: any) => m.id ?? m.name).filter(Boolean);
          return {
            ok: true,
            detail: `Connected directly from browser — ${models.length} models available${cleanKey ? '' : ' (no key: anonymous providers only)'}`,
            models: models.slice(0, 200),
          };
        } catch (directErr) {
          return { ok: false, detail: formatLoopbackBrowserError(cleanBase, directErr) };
        }
      }

      return {
        ok: !!data.ok,
        detail: data.detail || (data.ok ? 'Connected' : 'Unreachable'),
        models: data.models,
      };
    } catch (e) {
      return { ok: false, detail: (e as Error).message };
    }
  };

  return { provider, label, complete, stream, probe };
};

/**
 * Cheap helper for pipelines that only need a `complete` function
 * (query expansion, HyDE, re-ranking).
 */
export const brainAsLlm = (brain: MaggiBrain) => ({
  complete: async (prompt: string, opts?: { temperature?: number; maxTokens?: number }) => {
    const res = await brain.complete(
      [
        { role: 'system', content: 'You are a precise retrieval assistant. Follow the output format exactly.' },
        { role: 'user', content: prompt },
      ],
      { temperature: opts?.temperature ?? 0.2, maxTokens: opts?.maxTokens ?? 300 },
    );
    return res.text;
  },
});
