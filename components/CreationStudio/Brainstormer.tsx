import React, { useState } from 'react';
import { Lightbulb, Copy, Check, Download, Save, RefreshCw, Send, Sparkles, AlertCircle, Shuffle, Flame } from 'lucide-react';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';
import { MediaItem } from '../../types';

interface BrainstormerProps {
  session?: any | null;
  onSaveArtifact?: (mediaItem: MediaItem) => void;
}

interface IdeaItem {
  id: number;
  title: string;
  concept: string;
  angle: string;
  viability: string; // "Wild", "Moderate", "Crazy But Genius"
}

export const Brainstormer: React.FC<BrainstormerProps> = ({ session, onSaveArtifact }) => {
  const [brainstormAngle, setBrainstormAngle] = useState('Silicon Valley Disruption');
  const [customVibe, setCustomVibe] = useState('');
  const [ideaDivergence, setIdeaDivergence] = useState<'high' | 'ultra-wild' | 'grounded'>('high');
  const [useSessionData, setUseSessionData] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleGenerate = async () => {
    setIsProcessing(true);
    setError(null);
    setIdeas([]);
    setSaved(false);

    try {
      const selectedItems = useSessionData 
        ? (session?.mediaItems?.filter((item: MediaItem) =>
            session?.selectedMediaIds?.includes(item.id)
          ) || [])
        : [];

      const prompt = `Act as an elite Innovation Consultant, Creative Director, and Futurist. 
Based on the provided ${selectedItems.length > 0 ? 'source materials' : 'specifications'}, brainstorm 10 highly unconventional, "wild," and creative ideas or perspectives. 


USER SPECIFICATIONS:
- Creative Angle: ${brainstormAngle}
- Additional Vibe/Focus: ${customVibe || 'Surprise me with highly futuristic or lateral thinking.'}
- Divergence Intensity: ${ideaDivergence === 'ultra-wild' ? 'Unconstrained Sci-Fi & Lateral Leaps (Divergence level 10/10)' : ideaDivergence === 'high' ? 'High Creativity & Disruptive (Divergence level 8/10)' : 'Creative but Grounded (Divergence level 5/10)'}
- Source Context Active: ${selectedItems.length > 0 ? 'Yes' : 'No'}

OUTPUT FORMAT REQUIREMENTS:
You MUST output the ideas as a structured JSON array wrapped inside a codeblock. Each idea in the array must match this strict typescript structure:
interface IdeaItem {
  id: number;
  title: string;
  concept: string; // 2-3 sentences explaining the idea
  angle: string; // The specific lateral perspective used
  viability: string; // Choose one: "Wild", "Moderate", "Crazy But Genius"
}

Ensure your response is valid JSON that can be parsed by JSON.parse. Wrap it inside a \`\`\`json and \`\`\` block.`;

      const responseText = await generateUnifiedAIResponse(prompt, selectedItems);

      // Extract JSON
      const jsonMatch = responseText.match(/```json([\s\S]*?)```/) || responseText.match(/\[([\s\S]*?)\]/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      const parsedData = JSON.parse(jsonString.trim());

      if (Array.isArray(parsedData)) {
        setIdeas(parsedData);
      } else {
        throw new Error("Parsed data was not a valid array.");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to formulate wild ideas in a structured format. This can happen if the AI gets too creative. Please try again!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyIdea = (idea: IdeaItem) => {
    const text = `**Idea ${idea.id}: ${idea.title}**\n*Angle: ${idea.angle} [Viability: ${idea.viability}]*\nConcept: ${idea.concept}`;
    navigator.clipboard.writeText(text);
    setCopiedId(idea.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadAll = () => {
    if (ideas.length === 0) return;
    
    let mdText = `# 💡 Creative Brainstorming Session\n\n`;
    mdText += `Generated on ${new Date().toLocaleDateString()} // Angle: ${brainstormAngle}\n\n`;
    mdText += `---\n\n`;

    ideas.forEach(idea => {
      mdText += `## ${idea.id}. ${idea.title}\n`;
      mdText += `* **Perspective/Angle**: ${idea.angle}\n`;
      mdText += `* **Viability Rating**: ${idea.viability}\n\n`;
      mdText += `${idea.concept}\n\n`;
      mdText += `---\n\n`;
    });

    const blob = new Blob([mdText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creative-ideas-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToSession = () => {
    if (ideas.length === 0 || !onSaveArtifact) return;

    let htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Creative Brainstorming Ideas</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 2rem; }
        .idea-card { background: #111827; border: 1px solid #374151; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; transition: transform 0.2s; }
        .idea-card:hover { transform: translateY(-2px); border-color: #f97316; }
        h1 { font-size: 2rem; color: #f97316; font-weight: 800; margin-bottom: 1.5rem; border-bottom: 2px solid #ea580c; padding-bottom: 0.5rem; }
        .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold; }
    </style>
</head>
<body>
    <div class="max-w-4xl mx-auto">
        <h1>💡 Creative Brainstorming: ${brainstormAngle}</h1>
        <p class="text-gray-400 mb-6">Unconventional perspectives and disruptive concepts generated from source media assets.</p>
        
        <div class="space-y-4">
            ${ideas.map(idea => `
            <div class="idea-card">
                <div class="flex justify-between items-start mb-2">
                    <h2 class="text-lg font-bold text-orange-400">${idea.id}. ${idea.title}</h2>
                    <span class="badge ${
                      idea.viability === 'Crazy But Genius' 
                        ? 'bg-purple-900/40 text-purple-400 border border-purple-800' 
                        : idea.viability === 'Wild' 
                          ? 'bg-orange-900/40 text-orange-400 border border-orange-800' 
                          : 'bg-green-900/40 text-green-400 border border-green-800'
                    }">${idea.viability}</span>
                </div>
                <p class="text-sm font-mono text-gray-500 mb-2">Perspective: ${idea.angle}</p>
                <p class="text-gray-300 leading-relaxed">${idea.concept}</p>
            </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    const utf8Encode = new TextEncoder().encode(htmlContent);
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(utf8Encode)));
    
    const newArtifact: MediaItem = {
      id: Date.now().toString(),
      name: `Brainstorm: ${brainstormAngle}`,
      mimeType: 'text/html',
      type: 'html',
      data: base64Data
    };

    onSaveArtifact(newArtifact);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectedItemsCount = session?.mediaItems?.filter((item: MediaItem) =>
    session?.selectedMediaIds?.includes(item.id)
  )?.length || 0;

  return (
    <div className="flex flex-col h-full bg-app-bg text-app-text">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-2 border-b border-app-border pb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-orange-400">
            <Lightbulb className="w-6 h-6" /> Creative Brainstorm
          </h2>
          <p className="text-app-dim text-xs mt-1">
            Generate 10 divergent, wild ideas and unconventional strategic perspectives based on your media files.
          </p>
        </div>
        
        <div className="flex gap-2">
          {ideas.length > 0 && (
            <>
              <button
                onClick={handleDownloadAll}
                className="px-3 py-1.5 rounded bg-app-card border border-app-border hover:bg-app-input text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download Markdown
              </button>
              <button
                onClick={handleSaveToSession}
                className="px-3 py-1.5 rounded bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {saved ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? 'Saved!' : 'Save Ideas'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Left control board */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-app-card border border-app-border rounded-xl p-4 md:p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-app-dim border-b border-app-border pb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-400" /> Brainstorm Config
            </h3>

            {/* Context reference status */}
            <div className="bg-app-bg p-3 rounded border border-app-border text-xs text-app-dim space-y-2">
              <div className="flex items-center justify-between">
                <strong>Knowledge base:</strong>
                <input
                  type="checkbox"
                  checked={useSessionData}
                  onChange={(e) => setUseSessionData(e.target.checked)}
                  className="w-3.5 h-3.5 text-orange-500 bg-app-input border-app-border rounded focus:ring-orange-500 focus:ring-2"
                />
              </div>
              <p className="mt-1">
                {selectedItemsCount > 0 
                  ? `${useSessionData ? 'Using' : 'Ignoring'} ${selectedItemsCount} selected reference(s) from active session.`
                  : '⚠️ No reference files selected. Creative session will generate generic ideas.'}
              </p>
            </div>

            {/* Brainstorming Lens */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Lateral Thinking Lens</label>
              <select
                value={brainstormAngle}
                onChange={(e) => setBrainstormAngle(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-orange-500"
              >
                <option value="Silicon Valley Disruption">⚡ Silicon Valley Disruption (SaaS / Platforms)</option>
                <option value="Sci-Fi Future 2050">🪐 Sci-Fi Future (Neurotech, Ambient compute, AI overlords)</option>
                <option value="Extreme Minimalist / Retro-grade">📟 Retro / Low-Tech / Ultra-simple analog</option>
                <option value="Eco-Sustain & Solarpunk">🌱 Solarpunk & Regenerative Green-Tech</option>
                <option value="Reverse Psychology / Anti-Idea">🎭 Reverse Logic (What would fail spectacularly?)</option>
              </select>
            </div>

            {/* Intensity */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Divergence Level</label>
              <div className="grid grid-cols-3 gap-2 bg-app-bg p-1 rounded border border-app-border">
                <button
                  type="button"
                  onClick={() => setIdeaDivergence('grounded')}
                  className={`py-1.5 rounded text-[10px] font-bold transition-all ${
                    ideaDivergence === 'grounded'
                      ? 'bg-zinc-800 text-white shadow'
                      : 'text-app-dim hover:text-app-text'
                  }`}
                >
                  Grounded
                </button>
                <button
                  type="button"
                  onClick={() => setIdeaDivergence('high')}
                  className={`py-1.5 rounded text-[10px] font-bold transition-all ${
                    ideaDivergence === 'high'
                      ? 'bg-orange-600 text-white shadow'
                      : 'text-app-dim hover:text-app-text'
                  }`}
                >
                  High
                </button>
                <button
                  type="button"
                  onClick={() => setIdeaDivergence('ultra-wild')}
                  className={`py-1.5 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-0.5 ${
                    ideaDivergence === 'ultra-wild'
                      ? 'bg-purple-600 text-white shadow animate-pulse'
                      : 'text-app-dim hover:text-app-text'
                  }`}
                >
                  <Flame className="w-3 h-3 text-yellow-300" /> Wild
                </button>
              </div>
            </div>

            {/* Custom vibe input */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Custom Context / Angle (Optional)</label>
              <textarea
                value={customVibe}
                onChange={(e) => setCustomVibe(e.target.value)}
                rows={3}
                placeholder="e.g. Focus on physical-world gadgets, or gamification mechanics..."
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleGenerate}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-orange-850/40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Cultivating Lateral Ideas...
                </>
              ) : (
                <>
                  <Shuffle className="w-4 h-4" />
                  Brainstorm Ideas
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right sandbox panel */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[450px]">
          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin"></div>
                <Lightbulb className="w-5 h-5 text-orange-400 absolute top-3.5 left-3.5 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-app-text">Extracting Divergent Ideas...</p>
              <p className="text-xs text-app-dim text-center max-w-sm">
                Parsing structures and creating high-divergence conceptual leaps based on your provided context.
              </p>
            </div>
          )}

          {error && !isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 text-center">
              <AlertCircle className="w-12 h-12 text-red-500/40 mb-3" />
              <p className="text-sm font-bold text-red-400">Generation Failed</p>
              <p className="text-xs text-app-dim max-w-md mt-1 mb-4">{error}</p>
              <button
                onClick={handleGenerate}
                className="px-4 py-2 bg-app-bg border border-app-border rounded text-xs font-semibold hover:bg-app-input text-app-text"
              >
                Retry
              </button>
            </div>
          )}

          {!isProcessing && !error && ideas.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 text-center text-app-dim">
              <Lightbulb className="w-12 h-12 text-orange-500/30 mb-3" />
              <p className="text-sm font-semibold text-app-text">Creative Output Board</p>
              <p className="text-xs max-w-sm mt-1">
                Select your brainstorming focus on the left and trigger compilation to see 10 unique lateral perspectives.
              </p>
            </div>
          )}

          {!isProcessing && ideas.length > 0 && (
            <div className="flex-1 overflow-y-auto max-h-[70vh] space-y-4 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ideas.map((idea) => (
                  <div
                    key={idea.id}
                    className="p-5 bg-app-card border border-app-border hover:border-orange-500/45 rounded-xl flex flex-col justify-between transition-all group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-sm text-app-text group-hover:text-orange-400 transition-colors">
                          {idea.id}. {idea.title}
                        </h4>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                          idea.viability === 'Crazy But Genius'
                            ? 'bg-purple-950/40 text-purple-400 border border-purple-900/30'
                            : idea.viability === 'Wild'
                              ? 'bg-orange-950/40 text-orange-400 border border-orange-900/30'
                              : 'bg-green-950/40 text-green-400 border border-green-900/30'
                        }`}>
                          {idea.viability}
                        </span>
                      </div>
                      <p className="text-xs text-app-dim leading-relaxed mb-4">
                        {idea.concept}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-app-border/40 pt-3 text-[10px]">
                      <span className="text-app-dim italic font-mono truncate max-w-[150px]" title={idea.angle}>
                        Lens: {idea.angle}
                      </span>
                      
                      <button
                        onClick={() => handleCopyIdea(idea)}
                        className="text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 transition-colors"
                      >
                        {copiedId === idea.id ? (
                          <>
                            <Check className="w-3 h-3 text-green-400" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy Idea
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
