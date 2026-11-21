import { generateResponse as generateGeminiResponse } from './gemini';
import { generateOllamaResponse } from './ollama';
import { generateCustomAIResponse } from './customAi';
import { getMaggiStore } from './maggi/store';
import { createBrain } from './maggi/brain';
import { DEFAULT_GEMINI_MODEL } from '../constants/geminiModels';
import { MediaItem } from '../types';

export const generateUnifiedAIResponse = async (prompt: string, mediaItems: MediaItem[] = []): Promise<string> => {
  let provider = 'gemini';
  try {
    const saved = localStorage.getItem('gemini_media_aggregator_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      provider = settings.provider || 'gemini';
      if (provider === 'maggi') {
        const store = getMaggiStore();
        await store.hydrate();
        if (settings.maggiAutoIndexSession !== false && mediaItems.length > 0) {
          await store.ingestMediaItems(
            mediaItems.map((it) => ({
              id: it.id,
              name: it.name,
              type: it.type,
              mimeType: it.mimeType,
              data: it.data,
            })),
          );
        }
        if (store.stats().chunks > 0) {
          const result = await store.ask(prompt, [], { useStreaming: false });
          return result.answer;
        }
        const brain = createBrain(store.getSettings());
        const completion = await brain.complete([{ role: 'user', content: prompt }]);
        return completion.text;
      } else if (provider === 'ollama') {
        let fullText = "";
        const generator = generateOllamaResponse(
          settings.ollamaEndpoint || 'http://localhost:11434',
          settings.ollamaModel || 'llama3',
          prompt,
          [],
          mediaItems
        );
        for await (const chunk of generator) {
          fullText += chunk;
        }
        return fullText;
      } else if (provider === 'custom') {
        const result = await generateCustomAIResponse(
          settings.customBaseUrl || 'https://api.openai.com',
          settings.customApiKey || '',
          settings.customModelName || 'gpt-4o-mini',
          settings.customApiPath || '/v1/chat/completions',
          prompt,
          [],
          mediaItems
        );
        return result.text;
      } else {
        const model = settings.model || DEFAULT_GEMINI_MODEL;
        const result = await generateGeminiResponse(prompt, [], mediaItems, model);
        return result.text;
      }
    }
  } catch (e) {
    if (provider !== 'gemini') {
      throw e;
    }
    console.warn("Unified AI settings read failed, using default Gemini:", e);
  }

  // Fallback to default Gemini
  const response = await generateGeminiResponse(prompt, [], mediaItems, DEFAULT_GEMINI_MODEL);
  return response.text;
};

