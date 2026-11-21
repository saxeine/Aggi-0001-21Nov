/**
 * MAGGI configuration — single source of truth for the RAG knobs.
 *
 * Every value can be overridden at runtime from the MAGGI dashboard; the
 * persisted overrides live in localStorage under MAGGI_SETTINGS_KEY.
 */

export const MAGGI_SETTINGS_KEY = 'maggi_rag_settings_v1';
export const MAGGI_INDEX_KEY = 'maggi_rag_index_v1';
export const MAGGI_CHAT_KEY = 'maggi_rag_chat_v1';
export const MAGGI_SAVED_QUERIES_KEY = 'maggi_rag_saved_queries_v1';
export const MAGGI_USAGE_KEY = 'maggi_rag_usage_v1';

export type MaggiProvider = 'freellmapi' | 'gemini' | 'openai-compatible' | 'ollama';

export interface FreeLlmKeyEntry {
  platform: string;
  key: string;
  label?: string;
  baseUrl?: string;
  enabled?: boolean;
}

export interface MaggiSettings {
  // --- Brain -------------------------------------------------------------
  provider: MaggiProvider;

  /** 'url' connects to a FreeLLMAPI proxy; 'keypool' uses imported provider keys directly on the server. */
  freeLlmMode: 'url' | 'keypool';
  /** Imported FreeLLMAPI keys (from freellmapi-keys.json export or manual entry). */
  freeLlmKeys: FreeLlmKeyEntry[];
  /** FreeLLMAPI base URL, e.g. http://localhost:3001/v1 */
  freeLlmApiBaseUrl: string;
  /** FreeLLMAPI unified key (`freellmapi-...`). Kept server-side when env is used. */
  freeLlmApiKey: string;
  /** "auto" lets the FreeLLMAPI router choose, or "auto:fast" / "auto:smart" / a model id. */
  freeLlmApiModel: string;

  /** Optional Gemini override used as a fallback brain. */
  geminiModel: string;

  /** Generic OpenAI-compatible endpoint (llama.cpp, LM Studio, vLLM, OpenRouter...). */
  openAiBaseUrl: string;
  openAiApiKey: string;
  openAiModel: string;

  /** Local Ollama endpoint (direct, no proxy). */
  ollamaBaseUrl: string;
  ollamaModel: string;

  // --- Embeddings --------------------------------------------------------
  /**
   * `auto` → try Gemini embeddings server-side, silently fall back to the
   * built-in deterministic hash embedder so RAG always works offline.
   */
  embeddingBackend: 'auto' | 'gemini' | 'hash';
  embeddingModel: string;

  // --- Chunking ----------------------------------------------------------
  chunkStrategy: 'recursive' | 'sentence' | 'markdown' | 'fixed';
  chunkSize: number;
  chunkOverlap: number;

  // --- Retrieval ---------------------------------------------------------
  retrievalMode: 'hybrid' | 'vector' | 'keyword';
  topK: number;
  candidateK: number;
  vectorWeight: number;
  diversify: boolean;
  diversityLambda: number;
  rerank: boolean;
  recencyBoost: number;
  /** HyDE: draft a hypothetical answer first, then embed that. Costs 1 LLM call. */
  useHyde: boolean;
  /** Expand the query into multiple paraphrases before retrieval. */
  multiQuery: boolean;

  // --- Generation --------------------------------------------------------
  temperature: number;
  maxContextChars: number;
  /** "strict" refuses to answer outside the context; "balanced" allows world knowledge. */
  groundingMode: 'strict' | 'balanced';
  answerLanguage: string;
}

export const DEFAULT_MAGGI_SETTINGS: MaggiSettings = {
  provider: 'freellmapi',

  freeLlmMode: 'url',
  freeLlmKeys: [],
  freeLlmApiBaseUrl: 'http://localhost:3001/v1',
  freeLlmApiKey: '',
  freeLlmApiModel: 'auto',

  geminiModel: 'gemini-4-hydrogen',

  openAiBaseUrl: 'https://api.openai.com/v1',
  openAiApiKey: '',
  openAiModel: 'gpt-4o-mini',

  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',

  embeddingBackend: 'auto',
  embeddingModel: 'text-embedding-004',

  chunkStrategy: 'recursive',
  chunkSize: 1200,
  chunkOverlap: 180,

  retrievalMode: 'hybrid',
  topK: 8,
  candidateK: 40,
  vectorWeight: 0.65,
  diversify: true,
  diversityLambda: 0.7,
  rerank: false,
  recencyBoost: 0,
  useHyde: false,
  multiQuery: false,

  temperature: 0.25,
  maxContextChars: 24000,
  groundingMode: 'strict',
  answerLanguage: 'auto',
};

export const PROVIDER_LABELS: Record<MaggiProvider, string> = {
  freellmapi: 'FreeLLMAPI',
  gemini: 'Gemini',
  'openai-compatible': 'OpenAI-compatible',
  ollama: 'Ollama (local)',
};

export const MAGGI_SYSTEM_PROMPT = (groundingMode: 'strict' | 'balanced') => `You are MAGGI (Modular Augmented Generation & Grounded Intelligence), a retrieval-augmented research assistant.

You answer using the CONTEXT provided. The context is split into numbered passages like:
[1] (document name > section) passage text

Rules:
1. Cite every factual claim with bracketed markers matching the passage numbers, e.g. "Revenue grew 12% [2]."
2. ${groundingMode === 'strict'
    ? 'If the context does not contain the answer, say exactly: "I could not find that in the indexed sources." and suggest what to add. Never invent facts.'
    : 'Prefer the context. You may add general knowledge, but mark it clearly as "Not from your sources:" before doing so.'}
3. Never cite a number that is not in the context.
4. Be concise and structured: short paragraphs, bullet points where they help.
5. Reproduce numbers, names and dates exactly as they appear in the sources.
6. Do not mention the internal mechanics (chunk ids, embeddings, "context block"). Refer to documents by their human names.`;

export const MAGGI_CITATION_INSTRUCTION =
  'After your answer, do not add a separate bibliography — the interface renders citations from your inline markers.';
