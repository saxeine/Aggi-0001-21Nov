
import { useState, useCallback } from 'react';
import { Session, Message, MediaItem, ThemeSettings } from '../types';
import { generateResponse as generateGeminiResponse, generateSuggestions as generateGeminiSuggestions, updateCache, generateMindMapJson, generateTagsForMedia } from '../services/gemini';
import { generateOllamaResponse, generateOllamaSuggestions, OllamaError } from '../services/ollama';
import { generateCustomAIResponse, generateCustomAISuggestions } from '../services/customAi';

const getFriendlyErrorMessage = (err: any): string => {
  if (err instanceof OllamaError) {
    switch (err.kind) {
      case 'mixed_content':
      case 'network':
      case 'html_response':
        return `⚠️ ${err.message}`;
      case 'timeout':
        return `⚠️ **Timeout**: ${err.message}`;
      case 'http_error':
        return `⚠️ **Ollama API Error**: ${err.message}`;
      case 'parse_error':
        return `⚠️ **Parsing Error**: ${err.message}`;
    }
  }

  const str = JSON.stringify(err, Object.getOwnPropertyNames(err)) || String(err);
  const msg = err.message || String(err);
  
  if (msg.includes("Ollama Connection Failed") && msg.includes("Troubleshooting:")) {
      return `⚠️ ${msg}`;
  }

  if (
      str.includes("exceeded your billing plan quota") ||
      str.includes("check your plan and billing details") ||
      str.includes("Account Quota Exceeded")
  ) {
    return "⚠️ **Gemini API Account Quota Exceeded**\n\nThe server's shared Gemini API key has exceeded its daily or billing quota.\n\n### 💡 Instant Bypass Solution:\nTo continue using all features without limits immediately, you can use your own Google AI Studio key:\n\n1. Get a **free API key** in seconds from [Google AI Studio](https://aistudio.google.com/)\n2. Click the **Settings ⚙️** icon in the top header (or bottom side menu) of this app\n3. Paste your key under **Custom Gemini API Key** and close settings. Enjoy unlimited private queries!\n\n*(Your custom key is saved locally in your browser and never sent to any third party.)*";
  }

  if (
      str.includes("429") || 
      str.includes("RESOURCE_EXHAUSTED") || 
      str.includes("quota") ||
      (err.status === 429) || 
      (err.code === 429)
  ) {
    return "⚠️ **API Quota Exceeded**\n\nYou have reached the rate limit or daily quota for the Gemini API.\n\n*   **Solution**: Please wait a minute and try again.\n*   **Info**: If you are using the free tier, you may have hit the Requests Per Minute (RPM) or Tokens Per Day (TPD) limit. You can bypass this limit entirely by setting your own free Gemini API key under Settings ⚙️.";
  }
  
  if (str.includes("Failed to fetch") || str.includes("NetworkError")) {
      return "⚠️ **Connection Failed**\n\nThe browser could not reach the AI service.\n\n**Common Fixes:**\n1. Check your internet connection.\n2. If using Ollama, ensure it is running with `OLLAMA_ORIGINS=\"*\" ollama serve`.\n3. Check if an ad-blocker or firewall is interfering.";
  }

  if (str.includes("401") || str.includes("API key not valid") || str.includes("INVALID_API_KEY") || str.includes("API_KEY_INVALID")) {
      return "⚠️ **Invalid API Key**\n\nThe Gemini API key is missing or invalid.\n\n*   **Solution**: Go to **Settings > AI** and check your `GEMINI_API_KEY`.\n*   **Info**: Make sure you have copied the correct key from Google AI Studio.";
  }

  if (str.includes("400") || str.includes("INVALID_ARGUMENT")) {
      return `⚠️ **Invalid Request**: The API rejected the data. This often happens with unsupported file formats or extremely large text contexts.\n\n*Raw Error*: ${str}`;
  }
  
  if (str.includes("500") || str.includes("INTERNAL")) {
      return `⚠️ **Service Error**: Google's servers are experiencing issues. Please try again later.`;
  }

  if (str.length > 500) {
      return `Error: An unexpected error occurred. (Check console for details)`;
  }
  
  return `Error: Could not generate response. ${String(err)}`;
};

export const useAI = (
    activeSession: Session | null, 
    updateActiveSession: (updater: (s: Session) => Session) => void,
    updateSessionById: (id: string, updater: (s: Session) => Session) => void,
    settings: ThemeSettings,
    onAutoPreview?: (code: string) => void
) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const [isMindMapLoading, setIsMindMapLoading] = useState(false);

    const generateSuggestionsForSession = useCallback(async (sessionId: string, items: MediaItem[]) => {
        if (items.length === 0) {
          updateSessionById(sessionId, s => ({ ...s, suggestions: [] }));
          return;
        }
        
        setIsSuggestionsLoading(true);
        try {
          let qs: string[] = [];
          if (settings.provider === 'ollama') {
             if (!settings.ollamaModel) {
                 qs = ["Please select an Ollama model in settings."];
             } else {
                 qs = await generateOllamaSuggestions(settings.ollamaEndpoint, settings.ollamaModel, items);
             }
          } else if (settings.provider === 'custom') {
             qs = await generateCustomAISuggestions(
                 settings.customBaseUrl,
                 settings.customApiKey,
                 settings.customModelName,
                 settings.customApiPath,
                 items
             );
          } else {
             const model = settings.model || 'gemini-3-flash-preview';
             qs = await generateGeminiSuggestions(items, model);
          }
          updateSessionById(sessionId, s => ({ ...s, suggestions: qs }));
        } catch (e) {
          console.error("Suggestion generation failed", e);
        } finally {
          setIsSuggestionsLoading(false);
        }
    }, [settings.provider, settings.model, settings.ollamaEndpoint, settings.ollamaModel, settings.customBaseUrl, settings.customApiKey, settings.customModelName, settings.customApiPath, updateSessionById]);

    const autoTagMediaItems = useCallback(async (sessionId: string, items: MediaItem[]) => {
        if (items.length === 0 || settings.provider !== 'gemini') return;
        
        const model = settings.model || 'gemini-3-flash-preview';
        
        for (const item of items) {
            // Already tagged or empty
            if (item.tags && item.tags.length > 0) continue;

            try {
                // Throttle to avoid rate limits (Gemini Free has 15 RPM limit = ~4s per request)
                await new Promise(resolve => setTimeout(resolve, 4500));
                
                const tags = await generateTagsForMedia(item, model);
                if (tags && tags.length > 0) {
                    updateSessionById(sessionId, s => ({
                        ...s,
                        mediaItems: s.mediaItems.map(m => m.id === item.id ? { ...m, tags } : m)
                    }));
                }
            } catch (e) {
                console.error(`Failed to auto-tag item ${item.id}`, e);
            }
        }
    }, [settings.provider, settings.model, updateSessionById]);

    const handleSend = async (messageContent?: string, category?: Message['category']) => {
        if (!activeSession) return;
        const textToSend = messageContent || input;
        
        const activeMediaItems = activeSession.mediaItems.filter(item => 
          activeSession.selectedMediaIds.includes(item.id)
        );
    
        if (!textToSend.trim() && activeMediaItems.length === 0) return;
        
        const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: textToSend,
          timestamp: new Date(),
          category: category
        };
    
        updateActiveSession(s => ({ ...s, history: [...s.history, userMsg] }));
        if (!messageContent) setInput('');
        setIsLoading(true);
    
        try {
          const currentHistory = [...activeSession.history, userMsg];
          
          let responseText = "";
          let groundingChunks = undefined;
    
          if (settings.provider === 'ollama') {
            if (!settings.ollamaModel) {
                responseText = "Please select an Ollama model in settings.";
            } else {
                const generator = await generateOllamaResponse(settings.ollamaEndpoint, settings.ollamaModel, userMsg.content, currentHistory, activeMediaItems);
                
                const modelMsgId = (Date.now() + 1).toString();
                const modelMsg: Message = {
                  id: modelMsgId,
                  role: 'model',
                  content: '',
                  timestamp: new Date(),
                  category: category
                };
                updateActiveSession(s => ({ ...s, history: [...s.history, modelMsg] }));

                for await (const chunk of generator) {
                    responseText += chunk;
                    updateActiveSession(s => ({
                      ...s,
                      history: s.history.map(m => m.id === modelMsgId ? { ...m, content: responseText } : m)
                    }));
                }
                
                // Auto-Preview Map detection
                if (onAutoPreview && responseText.includes('leaflet.js') && responseText.includes('<!DOCTYPE html>')) {
                    const codeMatch = responseText.match(/```html\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/);
                    if (codeMatch && codeMatch[1]) {
                        onAutoPreview(codeMatch[1]);
                    }
                }
                return;
            }
          } else if (settings.provider === 'custom') {
            const result = await generateCustomAIResponse(
              settings.customBaseUrl,
              settings.customApiKey,
              settings.customModelName,
              settings.customApiPath,
              userMsg.content,
              activeSession.history,
              activeMediaItems
            );
            responseText = result.text;
          } else {
            const model = settings.model || 'gemini-3-flash-preview';
            
            let cachedContentName = undefined;
            if (settings.enableCaching && activeMediaItems.length > 0) {
               try {
                   const { cacheName, cacheHash } = await updateCache(
                     activeMediaItems, 
                     model, 
                     activeSession.geminiCacheName, 
                     activeSession.geminiCacheHash
                   );
                   
                   if (cacheName) {
                      cachedContentName = cacheName;
                      updateActiveSession(s => ({ 
                        ...s, 
                        geminiCacheName: cacheName, 
                        geminiCacheHash: cacheHash 
                      }));
                   }
               } catch (cacheErr) {
                   console.warn("Caching failed, proceeding without cache", cacheErr);
               }
            }
    
            const result = await generateGeminiResponse(userMsg.content, currentHistory, activeMediaItems, model, cachedContentName);
            responseText = result.text;
            groundingChunks = result.groundingChunks;
          }
          
          // Auto-Preview Map detection
          if (onAutoPreview && responseText.includes('leaflet.js') && responseText.includes('<!DOCTYPE html>')) {
              const codeMatch = responseText.match(/```html\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/);
              if (codeMatch && codeMatch[1]) {
                  onAutoPreview(codeMatch[1]);
              }
          }

          const modelMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: responseText,
            timestamp: new Date(),
            groundingChunks: groundingChunks,
            category: category // Inherit category from user question for styling match
          };
          
          updateActiveSession(s => ({ ...s, history: [...s.history, modelMsg] }));
        } catch (err) {
          const friendlyError = getFriendlyErrorMessage(err);
          const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: friendlyError,
            timestamp: new Date(),
            isError: true,
            category: category // Inherit category even on error
          };
          updateActiveSession(s => ({ ...s, history: [...s.history, errorMsg] }));
        } finally {
          setIsLoading(false);
        }
    };

    const triggerSuggestion = (suggestion: string, category?: Message['category']) => {
        handleSend(suggestion, category);
    };

    const generateMindMap = async () => {
        if (!activeSession) return;
        setIsMindMapLoading(true);
        try {
            const activeMediaItems = activeSession.mediaItems.filter(item => 
                activeSession.selectedMediaIds.includes(item.id)
            );
            
            // Only support Gemini for MindMap currently due to JSON structure requirements
            const model = settings.model || 'gemini-3-flash-preview';
            const graph = await generateMindMapJson(activeMediaItems, model);
            
            if (graph) {
                updateActiveSession(s => ({ ...s, mindMapData: graph }));
            }
        } catch (e) {
            console.error("MindMap generation failed", e);
        } finally {
            setIsMindMapLoading(false);
        }
    };

    return {
        input,
        setInput,
        isLoading,
        isSuggestionsLoading,
        handleSend,
        triggerSuggestion,
        generateSuggestionsForSession,
        autoTagMediaItems,
        generateMindMap,
        isMindMapLoading
    };
};
