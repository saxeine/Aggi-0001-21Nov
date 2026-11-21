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

const postJson = async (url: string, body: unknown, signal?: AbortSignal) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 400) || res.statusText}`);
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
    payload.baseUrl = settings.freeLlmApiBaseUrl;
    payload.apiKey = settings.freeLlmApiKey;
    payload.model = opts.model || settings.freeLlmApiModel || 'auto';
  } else if (provider === 'openai') {
    payload.baseUrl = settings.openAiBaseUrl;
    payload.apiKey = settings.openAiApiKey;
    payload.model = opts.model || settings.openAiModel;
  } else if (provider === 'ollama') {
    payload.baseUrl = settings.ollamaBaseUrl;
    payload.model = opts.model || settings.ollamaModel;
  } else {
    payload.model = opts.model || settings.geminiModel;
  }
  return payload;
};

export const createBrain = (settings: MaggiSettings): MaggiBrain => {
  const provider = settings.provider;
  const label = PROVIDER_LABELS[provider];

  const complete = async (messages: ChatMessage[], opts: CompletionOptions = {}): Promise<CompletionResult> => {
    const started = performance.now();
    const payload = buildPayload(settings, messages, opts);
    const res = await postJson('/api/maggi/chat', payload, opts.signal);
    const data = await res.json();

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
      routedVia: data.routedVia || data.routed_via || res.headers.get('x-routed-via') || undefined,
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
    const res = await fetch('/api/maggi/chat-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: opts.signal,
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new Error(`Stream failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    let model = String(payload.model || '');
    let routedVia: string | undefined;

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
    try {
      const res = await postJson('/api/maggi/probe', {
        provider: normaliseProvider(provider),
        baseUrl: provider === 'freellmapi' ? settings.freeLlmApiBaseUrl
          : provider === 'openai-compatible' ? settings.openAiBaseUrl
            : provider === 'ollama' ? settings.ollamaBaseUrl : undefined,
        apiKey: provider === 'freellmapi' ? settings.freeLlmApiKey
          : provider === 'openai-compatible' ? settings.openAiApiKey : undefined,
        model: provider === 'freellmapi' ? settings.freeLlmApiModel
          : provider === 'openai-compatible' ? settings.openAiModel : settings.ollamaModel,
      });
      const data = await res.json();
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
