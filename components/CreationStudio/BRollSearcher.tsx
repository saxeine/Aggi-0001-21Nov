import React, { useState } from 'react';
import { Film, Search, Download, Check, Sparkles, Loader2, Play } from 'lucide-react';
import { themeStyles } from '../../constants/creativeStudioTheme';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';

interface BRollSearcherProps {
  onBack?: () => void;
  localTheme: string;
}

export const BRollSearcher: React.FC<BRollSearcherProps> = ({ onBack, localTheme }) => {
  const [script, setScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [bRollPrompts, setBRollPrompts] = useState<{ scene: string; prompt: string; keyword: string }[]>([]);
  const st = themeStyles[localTheme as keyof typeof themeStyles] || themeStyles.charcoal;

  const handleGeneratePrompts = async () => {
    if (!script.trim()) return;
    setIsGenerating(true);
    try {
      const prompt = `Analyze the following video script and break it down into scenes. For each scene, provide a highly descriptive prompt that can be used in an AI video generator (like Sora or Runway) to create matching B-roll footage. Also provide a 1-3 word search keyword to find stock footage on sites like Pexels or Shutterstock.
      
Format the response EXACTLY as a JSON array of objects with the keys "scene" (brief description of the scene context), "prompt" (detailed visual description), and "keyword" (short search term).

Script:
${script}`;

      const response = await generateUnifiedAIResponse(prompt);
      
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        setBRollPrompts(parsed);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate B-roll prompts. Please ensure the response is valid JSON.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in relative z-10 w-full">
      <div className={`p-4 sm:p-8 flex-1 overflow-y-auto ${st.bgApp}`}>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center space-x-4 mb-8">
            <div className={`p-3 rounded-xl ${st.cardBg} border ${st.border}`}>
              <Film className={`w-6 h-6 ${st.text}`} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${st.text}`}>B-Roll Searcher & Generator</h1>
              <p className={st.textDim}>Analyze scripts to dynamically generate prompts and search keywords for B-roll footage.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className={`block text-sm font-medium ${st.text}`}>Source Video Script</label>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Paste your video script here to extract B-roll scenes..."
                className={`w-full h-[400px] bg-black/40 border rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-opacity-50 ${st.border} ${st.text} ${st.focusRing}`}
              />
              <button
                onClick={handleGeneratePrompts}
                disabled={!script.trim() || isGenerating}
                className={`w-full py-3 rounded-xl flex items-center justify-center space-x-2 transition-all ${isGenerating || !script.trim() ? 'opacity-50 cursor-not-allowed' : st.btnActive}`}
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                <span>{isGenerating ? 'Analyzing Script...' : 'Generate B-Roll Prompts'}</span>
              </button>
            </div>

            <div className="space-y-4">
              <label className={`block text-sm font-medium ${st.text}`}>Generated Footage Requirements</label>
              <div className={`w-full h-[460px] bg-black/40 border rounded-xl p-4 overflow-y-auto ${st.border} custom-scrollbar`}>
                {bRollPrompts.length === 0 ? (
                  <div className={`h-full flex flex-col items-center justify-center ${st.textDim} text-center p-8`}>
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p>Generated prompts and search keywords will appear here once the script is analyzed.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bRollPrompts.map((item, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border ${st.cardBg} ${st.border}`}>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className={`font-semibold ${st.text}`}>Scene {idx + 1}: {item.scene}</h4>
                          <span className={`text-xs px-2 py-1 rounded-md bg-black/30 ${st.textDim} border ${st.border}`}>
                            {item.keyword}
                          </span>
                        </div>
                        <p className={`text-sm mb-3 ${st.textDim}`}>{item.prompt}</p>
                        <div className="flex items-center space-x-2">
                           <button 
                             onClick={() => navigator.clipboard.writeText(item.prompt)}
                             className={`text-xs px-3 py-1.5 rounded-lg border flex items-center space-x-1 hover:bg-black/20 transition-colors ${st.border} ${st.text}`}
                           >
                             <CopyIcon className="w-3.5 h-3.5" />
                             <span>Copy Prompt</span>
                           </button>
                           <a 
                             href={`https://www.pexels.com/search/videos/${encodeURIComponent(item.keyword)}/`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className={`text-xs px-3 py-1.5 rounded-lg border flex items-center space-x-1 hover:bg-black/20 transition-colors ${st.border} ${st.text}`}
                           >
                             <Search className="w-3.5 h-3.5" />
                             <span>Search Footage</span>
                           </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
