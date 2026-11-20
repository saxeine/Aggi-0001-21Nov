
export interface MediaItem {
  id: string;
  name: string;
  mimeType: string;
  data: string; // Base64 string or URL
  type: 'image' | 'text' | 'pdf' | 'video' | 'audio' | 'link' | 'sql' | 'document' | 'html';
  tags?: string[];
  scriptHtml?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  isError?: boolean;
  groundingChunks?: any[]; // Array containing web source metadata
  category?: 'insight' | 'discovery' | 'structure' | 'custom';
}

export interface Session {
  id: string;
  name: string;
  description?: string;
  mediaItems: MediaItem[];
  selectedMediaIds: string[]; // List of IDs currently active for context
  history: Message[];
  suggestions: string[];
  createdAt: number;
  order?: number; // Display order index
  
  // Caching
  geminiCacheName?: string;
  geminiCacheHash?: string;
  
  // Mind Map Data
  mindMapData?: MindMapNode; // Changed from MindMapGraph to Root Node
}

export interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[]; // Recursive structure
  summary?: string; 
  type?: 'root' | 'main' | 'sub';
}

export interface MIPrOMPTItem {
  id: string;
  name: string;
  type: 'prB' | 'ctB' | 'txS';
  content: string;
  isFavorite: boolean;
  createdAt: number;
}

export interface ChatState {
  history: Message[];
  isLoading: boolean;
}

export interface SuggestionState {
  questions: string[];
  isLoading: boolean;
}

export type Theme = 'dark' | 'light' | 'olive';

export interface VoiceSettings {
  host: string;
  hostLabel: string;
  hostAvatar?: string;
  hostBio?: string;
  hostCharacterId?: string;
  hostMemberId?: string;
  expert: string;
  expertLabel: string;
  expertAvatar?: string;
  expertBio?: string;
  expertCharacterId?: string;
  expertMemberId?: string;
  guest: string;
  guestLabel: string;
  guestAvatar?: string;
  guestBio?: string;
  guestCharacterId?: string;
  guestMemberId?: string;
  length?: 'Short (1-2 min)' | 'Medium (3-5 min)' | 'Long (Deep Dive)';
  language?: 'English' | 'Swedish';
}

export interface CharacterPrompt {
  id: string;
  title: string;
  content: string;
  tone?: string;
  perspective?: string;
  bias?: string;
  category: 'system' | 'user';
}

export interface ThemeSettings {
  bgBrightness: number;   // 0 to 100 (percentage of base value)
  textBrightness: number; // 0 to 150 (percentage of base value)
  hue: number;            // 0 to 360 (degrees of rotation)
  textSize: number;       // 80 to 140 (percentage of base font size)
  showLabels: boolean;    // Toggle for icon text labels
  
  // AI Provider Settings
  provider: 'gemini' | 'ollama' | 'custom';
  
  // Gemini Specific
  model: string;          // 'gemini-3.8-flash' | 'gemini-4-argon' | 'gemini-3.1-flash-lite'
  enableCaching: boolean; // Context Caching toggle
  autoTagSources?: boolean; // Auto-tag uploaded sources
  geminiApiKey?: string;  // Custom Gemini API Key
  
  // Ollama Specific
  ollamaEndpoint: string;
  ollamaModel: string;

  // Custom OpenAI-Compatible Specific
  customBaseUrl: string;
  customApiKey: string;
  customModelName: string;
  customApiPath: string;
}

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  category: 'system' | 'user';
  tags?: string[]; // e.g., 'insight', 'discovery', 'structure'
}

export interface CastMember {
  id: string;
  name: string;
  voice: string; // Voice name from available voices
  bio: string; // Personality/vibe description
  avatar?: string; // URL to avatar image
  category: 'system' | 'user';
  defaultRole?: 'host' | 'expert' | 'guest';
  gender?: 'Male' | 'Female' | 'Neutral';
}
