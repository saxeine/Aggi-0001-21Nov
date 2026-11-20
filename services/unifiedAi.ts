import { generateResponse as generateGeminiResponse } from './gemini';
import { generateOllamaResponse } from './ollama';
import { generateCustomAIResponse } from './customAi';
import { MediaItem } from '../types';

export const generateUnifiedAIResponse = async (prompt: string, mediaItems: MediaItem[] = []): Promise<string> => {
  try {
    const saved = localStorage.getItem('gemini_media_aggregator_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.provider === 'ollama') {
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
      } else if (settings.provider === 'custom') {
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
        const model = settings.model || 'gemini-3.8-flash';
        const result = await generateGeminiResponse(prompt, [], mediaItems, model);
        return result.text;
      }
    }
  } catch (e) {
    console.warn("Unified AI response custom/ollama failed, falling back to Gemini:", e);
  }

  // Fallback to default Gemini
  const response = await generateGeminiResponse(prompt, [], mediaItems, 'gemini-3.8-flash');
  return response.text;
};
