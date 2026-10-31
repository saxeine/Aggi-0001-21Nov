
import { MediaItem, Message } from "../types";

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export type OllamaErrorKind = 'mixed_content' | 'html_response' | 'network' | 'timeout' | 'http_error' | 'parse_error';

export class OllamaError extends Error {
  constructor(public kind: OllamaErrorKind, message: string, public originalError?: any) {
    super(message);
    this.name = 'OllamaError';
  }
}

const formatEndpoint = (endpoint: string): string => {
  let cleaned = endpoint.trim().replace(/\/$/, "");
  
  // Auto-use Vite proxy for local dev to bypass CORS
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  if (!isHttps && (cleaned === 'http://localhost:11434' || cleaned === 'http://127.0.0.1:11434')) {
    return '/ollama';
  }

  if (cleaned.startsWith('/')) return cleaned;
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `http://${cleaned}`;
  }
  return cleaned;
};

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (text.trim().startsWith('<')) {
    throw new OllamaError('html_response', 'Endpoint returned HTML (Tunnel Warning). Open URL in browser.');
  }
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new OllamaError('parse_error', 'Failed to parse JSON response from Ollama.', err);
  }
}

async function ollamaFetch(endpoint: string, path: string, options: RequestInit = {}): Promise<Response> {
  const cleanEndpoint = formatEndpoint(endpoint);
  
  // 1. Mixed-content guard
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isHttpEndpoint = cleanEndpoint.startsWith('http://');
  if (isHttps && isHttpEndpoint) {
    throw new OllamaError(
      'mixed_content', 
      "**Ollama Connection Failed (Mixed Content)**\n\n" +
      "You are running this app on **HTTPS**, but trying to connect to a local **HTTP** server.\n" +
      "Browsers block this for security.\n\n" +
      "**Solution: Use Cloudflare Tunnel**\n" +
      "1. Install `cloudflared`.\n" +
      "2. Run: `cloudflared tunnel --url http://localhost:11434`\n" +
      "3. Copy the `https://....trycloudflare.com` URL.\n" +
      "4. Paste it into the Ollama Endpoint setting above."
    );
  }

  // 2. AbortController guard
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);
  
  const fetchOptions: RequestInit = {
    ...options,
    signal: controller.signal,
    mode: 'cors',
    referrerPolicy: 'no-referrer',
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...(options.headers || {})
    }
  };

  const doFetch = async (baseUrl: string) => {
    try {
      const res = await fetch(`${baseUrl}${path}`, fetchOptions);
      if (!res.ok) {
        if (res.status === 504 || res.status === 502 || res.status === 500) {
           if (isHttps) {
             throw new OllamaError('network', 
              "**Ollama Connection Failed**\n\n" +
              "The Vite proxy is running in the cloud, so it cannot reach your local Ollama server.\n\n" +
              "**Solution: Use Cloudflare Tunnel**\n" +
              "1. Install `cloudflared`.\n" +
              "2. Run: `cloudflared tunnel --url http://localhost:11434`\n" +
              "3. Copy the `https://....trycloudflare.com` URL.\n" +
              "4. Paste it into the Ollama Endpoint setting above."
            );
           } else {
             throw new OllamaError('network', 
              "**Ollama Connection Failed**\n\n" +
              "The Vite proxy could not reach your local Ollama server.\n\n" +
              "**Troubleshooting:**\n" +
              "1. Ensure Ollama is running on your machine.\n" +
              "2. Check if it's listening on port 11434."
            );
           }
        }
        throw new OllamaError('http_error', `Ollama API returned ${res.status}: ${res.statusText}`);
      }
      return res;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new OllamaError('timeout', 'Ollama request timed out after 90 seconds.');
      }
      if (err instanceof OllamaError) throw err;
      throw new OllamaError(
        'network', 
        "**Ollama Connection Failed**\n\n" +
        "The browser could not reach your local Ollama server.\n\n" +
        "**Why does `curl` work?**\n" +
        "Command line tools like `curl` ignore CORS security rules. Browsers do not. You likely have a CORS issue.\n\n" +
        "**Troubleshooting:**\n" +
        "1. **Environment Variable**: You MUST run Ollama with: `OLLAMA_ORIGINS=\"*\" ollama serve`\n" +
        "2. **Restart**: Stop Ollama completely (system tray/task manager) and restart with the variable set.\n" +
        "3. **Address**: Try using `http://127.0.0.1:11434` instead of `localhost` in Settings.\n" +
        "4. **Mixed Content**: If this app is on HTTPS, it cannot talk to HTTP localhost.", 
        err
      );
    }
  };

  try {
    const res = await doFetch(cleanEndpoint);
    clearTimeout(timeoutId);
    return res;
  } catch (err: any) {
    // 3. localhost fallback guard
    if (cleanEndpoint.includes('localhost') && err.kind === 'network') {
      const fallbackUrl = cleanEndpoint.replace('localhost', '127.0.0.1');
      console.log("Retrying Ollama with 127.0.0.1 fallback...");
      try {
        const res = await doFetch(fallbackUrl);
        clearTimeout(timeoutId);
        return res;
      } catch (fallbackErr) {
        clearTimeout(timeoutId);
        throw err;
      }
    }
    clearTimeout(timeoutId);
    throw err;
  }
}

export const getOllamaModels = async (endpoint: string): Promise<OllamaModel[]> => {
  try {
    const response = await ollamaFetch(endpoint, '/api/tags');
    const data = await parseJson<{ models: OllamaModel[] }>(response);
    return data.models || [];
  } catch (error) {
    console.error("Ollama API Error:", error);
    throw error;
  }
};

export const generateOllamaResponse = async function* (
  endpoint: string,
  modelName: string,
  currentPrompt: string,
  history: Message[],
  mediaItems: MediaItem[]
): AsyncGenerator<string, void, unknown> {
  const images = mediaItems
    .filter((item) => item.type === "image")
    .map((item) => item.data); 
  
  const otherFiles = mediaItems.filter(item => item.type !== 'image' && item.type !== 'text');
  let promptContext = currentPrompt;
  
  if (otherFiles.length > 0) {
    promptContext += `\n\n[Note: The user also attached the following files which you cannot see directly: ${otherFiles.map(f => f.name).join(', ')}]`;
  }
  
  const textFiles = mediaItems.filter(item => item.type === 'text' || item.type === 'link' || item.type === 'document' || item.type === 'sql');
  if (textFiles.length > 0) {
      promptContext += "\n\nAttached Content:\n";
      textFiles.forEach(f => {
          promptContext += `--- ${f.name} ---\n${f.data}\n\n`;
      });
  }

  const messages = history.map((msg) => ({
    role: msg.role === "model" ? "assistant" : "user",
    content: msg.content,
  }));

  messages.unshift({
    role: "system",
    content: "Do NOT start your replies with phrases like 'Based on the provided report,' or 'Based on the provided sources,'. Just answer the question directly."
  } as any);

  messages.push({
    role: "user",
    content: promptContext,
    images: images.length > 0 ? images : undefined,
  } as any);

  const response = await ollamaFetch(endpoint, '/api/chat', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelName,
      messages: messages,
      stream: true, 
    }),
  });

  if (!response.body) {
    throw new OllamaError('parse_error', 'No response body from Ollama.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let isFirstChunk = true;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunkText = decoder.decode(value, { stream: true });
      
      if (isFirstChunk) {
        isFirstChunk = false;
        if (chunkText.trim().startsWith('<')) {
          throw new OllamaError('html_response', 'Endpoint returned HTML (Tunnel Warning). Open URL in browser.');
        }
      }
      
      buffer += chunkText;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              yield data.message.content;
            }
          } catch (e) {
            console.warn('Failed to parse NDJSON line:', line);
          }
        }
      }
    }
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer);
        if (data.message?.content) {
          yield data.message.content;
        }
      } catch (e) {
        console.warn('Failed to parse NDJSON line:', buffer);
      }
    }
  } finally {
    reader.releaseLock();
  }
};

export const generateOllamaSuggestions = async (
  endpoint: string,
  modelName: string,
  mediaItems: MediaItem[]
): Promise<string[]> => {
  const images = mediaItems.filter((item) => item.type === "image").map((item) => item.data);
  const textFiles = mediaItems.filter(item => item.type === 'text' || item.type === 'link' || item.type === 'document' || item.type === 'sql');
  
  let content = "Analyze the available context and list 3 short, insightful questions a user might want to ask. Return ONLY the questions as a JSON array string e.g. [\"Q1\", \"Q2\", \"Q3\"].";
  
  if (textFiles.length > 0) {
    content += "\n\nContext:\n" + textFiles.map(f => f.data).join("\n\n");
  }

  try {
    const response = await ollamaFetch(endpoint, '/api/chat', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        messages: [{
          role: "user",
          content: content,
          images: images.length > 0 ? images : undefined
        }],
        stream: false,
        format: "json" 
      }),
    });

    const data = await parseJson<any>(response);
    const resultText = data.message?.content;
    
    try {
        const parsed = JSON.parse(resultText);
        if (Array.isArray(parsed)) return parsed.slice(0, 3);
        if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions.slice(0, 3);
        return [];
    } catch {
        return resultText.match(/"([^"]+)"/g)?.map((s: string) => s.replace(/"/g, '')).slice(0,3) || [];
    }
  } catch (error) {
    console.warn("Ollama suggestion failed", error);
    return [];
  }
};
