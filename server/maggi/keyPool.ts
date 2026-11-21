/**
 * MAGGI engine helpers — environment key pool, model selection, base-URL
 * validation, streaming relay and text-extraction utilities.
 *
 * Extracted from maggiRoutes.ts so the router file stays focused on routes.
 */
import express from 'express';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

export const envFirst = (...names: string[]): string | undefined => {
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

export const normaliseBaseUrl = (url: string): string => {
  // Strip all accidental whitespace (e.g. "http: / /127.0.0.1:31415")
  let cleaned = (url || '').replace(/\s+/g, '').replace(/\/+$/, '');
  if (!cleaned) return '';

  // Fix single-slash typo after protocol (e.g. "http:/127.0.0.1" -> "http://127.0.0.1")
  cleaned = cleaned.replace(/^(https?):\/([^/])/i, '$1://$2');

  // Add default protocol if omitted
  if (!/^https?:\/\//i.test(cleaned)) {
    const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(cleaned);
    cleaned = `${isLocal || /:\d+/.test(cleaned) ? 'http' : 'https'}://${cleaned}`;
  }

  // Strip full endpoint suffixes if pasted by mistake
  cleaned = cleaned
    .replace(/\/(chat\/completions|completions|embeddings|models)$/i, '')
    .replace(/\/+$/, '');

  // Accept both "http://host:3001" and "http://host:3001/v1"
  if (!/\/v\d+(\.\d+)?$/i.test(cleaned) && !cleaned.toLowerCase().endsWith('/v1')) {
    cleaned = `${cleaned}/v1`;
  }

  return cleaned;
};

export const validateBaseUrl = (base: string): string | null => {
  if (!base) return 'Base URL is empty.';
  try {
    const parsed = new URL(base);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return `Unsupported URL protocol "${parsed.protocol}". Use http:// or https://.`;
    }
    return null;
  } catch {
    return `Invalid Base URL "${base}". Expected format like http://127.0.0.1:31415/v1 or https://your-host/v1.`;
  }
};

export const isLoopbackHost = (base: string): boolean => {
  try {
    const host = new URL(base).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
};

export const formatFetchError = (err: any, targetUrl: string): { message: string; isLoopbackUnreachable: boolean } => {
  const causeCode = err?.cause?.code || err?.code || '';
  const causeMsg = err?.cause?.message || '';
  const baseMsg = err?.name === 'AbortError'
    ? 'Request timed out — is FreeLLMAPI running and responsive?'
    : (err?.message || 'Network request failed');
  const detail = causeCode ? `${baseMsg} (${causeCode}${causeMsg ? `: ${causeMsg}` : ''})` : baseMsg;
  const isConnIssue = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH'].includes(causeCode)
    || /fetch failed|ECONNREFUSED/i.test(detail);
  const loopback = isLoopbackHost(targetUrl) && isConnIssue;
  return {
    message: loopback
      ? `Server could not reach ${targetUrl} (${causeCode || 'connection refused'}). If FreeLLMAPI runs on your local PC, trying browser-direct connection or use an HTTPS tunnel.`
      : detail,
    isLoopbackUnreachable: loopback,
  };
};

export const withTimeout = (ms: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
};

export const FRIENDLY_ERROR = (status: number, raw: string): string => {
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
export const relayOpenAiStream = async (
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

export const isBlockedIpOrHost = (host: string): boolean => {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (
    h === 'localhost'
    || h === '0.0.0.0'
    || h === '::1'
    || h === 'metadata.google.internal'
    || h.endsWith('.local')
    || h.endsWith('.internal')
  ) {
    return true;
  }
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^(fc|fd|fe80)/i.test(h)) return true;
  return false;
};

export const blockPrivateHost = (rawUrl: string): string | null => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return 'Invalid URL';
  }
  if (!['http:', 'https:'].includes(url.protocol)) return 'Only http(s) URLs are supported';
  if (isBlockedIpOrHost(url.hostname)) return 'Blocked private or metadata URL host';
  return null;
};

// ---------------------------------------------------------------------------
// Built-in FreeLLMAPI Key-Pool Router
// ---------------------------------------------------------------------------

export interface KeyPoolEntry {
  platform: string;
  key: string;
  label?: string;
  baseUrl?: string;
  enabled?: boolean;
}

export interface ResolvedTarget {
  platform: string;
  kind: 'openai' | 'google';
  baseUrl: string;
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
  defaultModels: string[];
}

export const parseEnvKeyPool = (): KeyPoolEntry[] => {
  const raw = envFirst('FREELLMAPI_KEYS_JSON', 'MAGGI_FREELLM_KEYS_JSON');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.keys) ? parsed.keys : []);
    return list.filter((e: any) => e && typeof e.platform === 'string' && typeof e.key === 'string' && e.key.trim());
  } catch {
    return [];
  }
};

export const PLATFORM_PRIORITY = [
  'openrouter',
  'nvidia',
  'cloudflare',
  'zhipu',
  'groq',
  'cerebras',
  'together',
  'sambanova',
  'mistral',
  'deepseek',
  'google',
  'custom',
  'openai',
];

export const pickModelForPlatform = (platform: string, requestedModel: string, customBaseUrl = ''): { model: string; defaults: string[] } => {
  const req = (requestedModel || 'auto').trim();
  const isAuto = !req || req === 'auto' || req.startsWith('auto:');
  const tier = req === 'auto:fast' || req === 'auto:cheap' ? 'fast' : 'smart';

  switch (platform) {
    case 'openrouter': {
      const defaults = ['openrouter/free', 'meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-3-27b-it:free'];
      return { model: isAuto ? 'openrouter/free' : req, defaults };
    }
    case 'nvidia': {
      const defaults = ['meta/llama-3.3-70b-instruct', 'meta/llama-3.1-8b-instruct', 'mistralai/mixtral-8x7b-instruct-v0.1'];
      return { model: isAuto ? (tier === 'fast' ? 'meta/llama-3.1-8b-instruct' : 'meta/llama-3.3-70b-instruct') : req, defaults };
    }
    case 'cloudflare': {
      const defaults = ['@cf/meta/llama-3.1-8b-instruct', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'];
      return { model: isAuto ? (tier === 'fast' ? '@cf/meta/llama-3.1-8b-instruct' : '@cf/meta/llama-3.3-70b-instruct-fp8-fast') : req, defaults };
    }
    case 'zhipu': {
      const defaults = ['glm-4-flash', 'glm-4-air', 'glm-4-plus'];
      return { model: isAuto ? 'glm-4-flash' : req, defaults };
    }
    case 'google': {
      const defaults = ['gemini-4-hydrogen', 'gemini-4-neon', 'gemini-3.1-flash-lite'];
      return { model: isAuto ? 'gemini-4-hydrogen' : req, defaults };
    }
    case 'groq': {
      const defaults = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
      return { model: isAuto ? (tier === 'fast' ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile') : req, defaults };
    }
    case 'cerebras': {
      const defaults = ['llama-3.3-70b', 'llama3.1-8b'];
      return { model: isAuto ? (tier === 'fast' ? 'llama3.1-8b' : 'llama-3.3-70b') : req, defaults };
    }
    case 'mistral': {
      const defaults = ['mistral-small-latest', 'open-mistral-nemo'];
      return { model: isAuto ? 'mistral-small-latest' : req, defaults };
    }
    case 'deepseek': {
      const defaults = ['deepseek-chat'];
      return { model: isAuto ? 'deepseek-chat' : req, defaults };
    }
    case 'together': {
      const defaults = ['meta-llama/Llama-3.3-70B-Instruct-Turbo'];
      return { model: isAuto ? 'meta-llama/Llama-3.3-70B-Instruct-Turbo' : req, defaults };
    }
    case 'sambanova': {
      const defaults = ['Meta-Llama-3.3-70B-Instruct'];
      return { model: isAuto ? 'Meta-Llama-3.3-70B-Instruct' : req, defaults };
    }
    case 'openai': {
      const defaults = ['gpt-4o-mini', 'gpt-4o'];
      return { model: isAuto ? 'gpt-4o-mini' : req, defaults };
    }
    default: {
      if (customBaseUrl.includes('nvidia.com')) {
        const defaults = ['meta/llama-3.3-70b-instruct', 'meta/llama-3.1-8b-instruct'];
        return { model: isAuto ? (tier === 'fast' ? 'meta/llama-3.1-8b-instruct' : 'meta/llama-3.3-70b-instruct') : req, defaults };
      }
      return { model: isAuto ? 'gpt-4o-mini' : req, defaults: ['gpt-4o-mini'] };
    }
  }
};

export const resolveKeyPoolEntry = (entry: KeyPoolEntry, requestedModel: string): ResolvedTarget | null => {
  if (entry.enabled === false) return null;
  const platform = (entry.platform || '').trim().toLowerCase();
  const rawKey = (entry.key || '').trim();
  if (!platform || !rawKey) return null;

  if (platform === 'google') {
    const picked = pickModelForPlatform('google', requestedModel);
    return {
      platform: 'google',
      kind: 'google',
      baseUrl: 'https://generativelanguage.googleapis.com',
      apiKey: rawKey,
      model: picked.model,
      defaultModels: picked.defaults,
    };
  }

  let baseUrl = '';
  let apiKey = rawKey;
  let extraHeaders: Record<string, string> | undefined;

  if (platform === 'openrouter') {
    baseUrl = 'https://openrouter.ai/api/v1';
    extraHeaders = { 'HTTP-Referer': 'https://aistudio.google.com', 'X-Title': 'MAGGI RAG' };
  } else if (platform === 'nvidia') {
    baseUrl = 'https://integrate.api.nvidia.com/v1';
  } else if (platform === 'cloudflare') {
    const sep = rawKey.indexOf(':');
    if (sep <= 0 || sep === rawKey.length - 1) return null;
    const accountId = rawKey.slice(0, sep).trim();
    apiKey = rawKey.slice(sep + 1).trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(accountId)) return null;
    baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
  } else if (platform === 'zhipu') {
    baseUrl = 'https://open.bigmodel.cn/api/paas/v4';
  } else if (platform === 'groq') {
    baseUrl = 'https://api.groq.com/openai/v1';
  } else if (platform === 'cerebras') {
    baseUrl = 'https://api.cerebras.ai/v1';
  } else if (platform === 'mistral') {
    baseUrl = 'https://api.mistral.ai/v1';
  } else if (platform === 'deepseek') {
    baseUrl = 'https://api.deepseek.com/v1';
  } else if (platform === 'together') {
    baseUrl = 'https://api.together.xyz/v1';
  } else if (platform === 'sambanova') {
    baseUrl = 'https://api.sambanova.ai/v1';
  } else if (platform === 'openai') {
    baseUrl = 'https://api.openai.com/v1';
  } else if (platform === 'custom') {
    const norm = normaliseBaseUrl(entry.baseUrl || '');
    if (!norm || validateBaseUrl(norm)) return null;
    try {
      const parsed = new URL(norm);
      if (isBlockedIpOrHost(parsed.hostname)) return null;
    } catch {
      return null;
    }
    baseUrl = norm;
  } else {
    return null;
  }

  const picked = pickModelForPlatform(platform, requestedModel, baseUrl);
  return {
    platform,
    kind: 'openai',
    baseUrl,
    apiKey,
    model: picked.model,
    extraHeaders,
    defaultModels: picked.defaults,
  };
};

export const buildKeyPoolTargets = (clientEntries: unknown, requestedModel = 'auto'): ResolvedTarget[] => {
  const clientList = Array.isArray(clientEntries) ? clientEntries : [];
  const combined = [...clientList, ...parseEnvKeyPool()];

  // Support explicit "platform:modelId" pinning (e.g. "nvidia:meta/llama-3.3-70b-instruct")
  let pinnedPlatform: string | null = null;
  let actualModel = (requestedModel || 'auto').trim();
  const colonIdx = actualModel.indexOf(':');
  if (colonIdx > 0) {
    const prefix = actualModel.slice(0, colonIdx).toLowerCase();
    if (PLATFORM_PRIORITY.includes(prefix)) {
      pinnedPlatform = prefix;
      actualModel = actualModel.slice(colonIdx + 1) || 'auto';
    }
  }

  const resolved: ResolvedTarget[] = [];
  const seen = new Set<string>();

  for (const item of combined) {
    const target = resolveKeyPoolEntry(item as KeyPoolEntry, actualModel);
    if (!target) continue;
    const dedupeKey = `${target.baseUrl}::${target.apiKey}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    resolved.push(target);
  }

  resolved.sort((a, b) => {
    if (pinnedPlatform) {
      if (a.platform === pinnedPlatform && b.platform !== pinnedPlatform) return -1;
      if (b.platform === pinnedPlatform && a.platform !== pinnedPlatform) return 1;
    }
    const idxA = PLATFORM_PRIORITY.indexOf(a.platform);
    const idxB = PLATFORM_PRIORITY.indexOf(b.platform);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  if (pinnedPlatform) {
    const matching = resolved.filter((t) => t.platform === pinnedPlatform);
    if (matching.length > 0) return matching;
  }

  return resolved;
};

export const htmlToText = (html: string): { text: string; title?: string } => {
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

