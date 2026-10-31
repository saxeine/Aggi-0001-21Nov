import React, { useState } from 'react';
import { Search, TrendingUp, Target, Zap, RefreshCw, Copy, CheckCircle, Download, Save, Lightbulb, BarChart2 } from 'lucide-react';
import { generateResponse } from '../../services/gemini';
import { MediaItem } from '../../types';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';
import Markdown from 'react-markdown';

interface ProductResearchToolProps {
  session?: any | null;
  onSaveArtifact?: (mediaItem: MediaItem) => void;
}

export const ProductResearchTool: React.FC<ProductResearchToolProps> = ({ session, onSaveArtifact }) => {
  const [activeMode, setActiveMode] = useState<'research' | 'validator'>('research');
  const [useSessionData, setUseSessionData] = useState(false);

  // Research Mode State
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('');
  const [agentType, setAgentType] = useState('Trend Analyst');
  
  // Validator Mode State
  const [productIdea, setProductIdea] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [keyFeature, setKeyFeature] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleRun = async () => {
    if (activeMode === 'research' && !topic.trim()) return;
    if (activeMode === 'validator' && !productIdea.trim()) return;
    
    setIsProcessing(true);
    setResult(null);
    setCopied(false);
    setSaved(false);
    
    try {
      let prompt = '';
      
      if (activeMode === 'research') {
        prompt = `You are a world-class ${agentType}. 
Conduct deep product research and market gap analysis on the following topic: "${topic}".
Niche Focus: ${niche || 'General/Broad'}.

Please provide a comprehensive report including:
1. **Trend Analysis:** Current market trajectory, search interest, and emerging sub-trends.
2. **Demand Scoring:** A quantifiable score (1-100) of market demand with reasoning.
3. **Market Gap Finder:** Specific underserved areas, unmet customer needs, or missing features in current solutions.
4. **Competitor Analysis:** What existing competitors are doing wrong or right.
5. **Profitable Niches:** Actionable digital product ideas (SaaS, courses, ebooks, tools) that can capitalize on this research.

Format your response in clean markdown. Ensure the tone is analytical, professional, and highly actionable.`;
      } else {
        prompt = `You are an expert Product Validator and Market Strategist.
Please validate the following digital product idea before the user builds it.

**Product Idea:** ${productIdea}
**Target Audience:** ${targetAudience || 'General/Broad'}
**Core Key Feature:** ${keyFeature || 'Not specified'}

Provide a strict, realistic validation report including:
1. **Demand Score (0-100):** How much do people actually want this? Include a breakdown of why.
2. **Competitor Analysis:** Who is already doing this, what are they missing, and how hard is it to compete?
3. **Pricing Benchmarks:** Suggested pricing models (e.g., subscription vs one-time) and realistic price points based on market standards.
4. **Technical Feasibility:** Potential roadblocks in building this product.
5. **Go/No-Go Recommendation:** A final verdict on whether this idea is worth pursuing or needs to pivot.

Format your response in clean markdown. Ensure the tone is objective, critical, and highly informative.`;
      }

      const selectedItems = useSessionData 
        ? (session?.mediaItems?.filter((item: MediaItem) =>
            session?.selectedMediaIds?.includes(item.id)
          ) || [])
        : [];

      if (selectedItems.length > 0) {
        prompt += `\n\n### ADDITIONAL SESSION CONTEXT:\nUse the following reference files from the active session to inform, ground, and target your research/validation report:\n`;
        selectedItems.forEach((item: MediaItem) => {
          prompt += `- [${item.type.toUpperCase()}] ${item.name}\n`;
        });
      }

      const reportText = await generateUnifiedAIResponse(prompt, selectedItems);
      setResult(reportText);
    } catch (error) {
      console.error(error);
      setResult('Error during generation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (result) {
      const blob = new Blob([result], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = activeMode === 'research' 
        ? `product-research-${topic.replace(/\\s+/g, '-').toLowerCase()}.md`
        : `idea-validation-${productIdea.replace(/\\s+/g, '-').toLowerCase()}.md`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleSaveToSession = () => {
    if (result && onSaveArtifact) {
      const utf8Encode = new TextEncoder().encode(result);
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(utf8Encode)));
      
      const artifactName = activeMode === 'research' ? `Research: ${topic}` : `Validation: ${productIdea}`;
      
      const newArtifact: MediaItem = {
        id: Date.now().toString(),
        name: artifactName,
        mimeType: 'text/markdown',
        type: 'text',
        data: base64Data
      };
      onSaveArtifact(newArtifact);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-app-bg text-app-text">
      <div className="flex items-center justify-between mb-6 px-2">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-indigo-400">
          <Search className="w-6 h-6" /> Product Strategy Hub
        </h2>
        
        <div className="flex bg-app-card p-1 rounded-lg border border-app-border">
          <button
            onClick={() => setActiveMode('research')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeMode === 'research' ? 'bg-indigo-600 text-white shadow-md' : 'text-app-dim hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" /> Market Research
          </button>
          <button
            onClick={() => setActiveMode('validator')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              activeMode === 'validator' ? 'bg-purple-600 text-white shadow-md' : 'text-app-dim hover:text-white'
            }`}
          >
            <Lightbulb className="w-4 h-4" /> Idea Validator
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="md:col-span-1 space-y-4">
          {activeMode === 'research' ? (
            <>
              <div className="bg-app-card p-4 rounded-xl border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all">
                <label className="block text-sm font-bold mb-2 text-indigo-300">Topic or Seed Idea</label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. AI-powered meditation"
                  className="w-full bg-app-bg border border-app-border rounded-lg p-2 text-sm focus:border-indigo-500 outline-none transition-colors"
                />
              </div>
              
              <div className="bg-app-card p-4 rounded-xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all">
                <label className="block text-sm font-bold mb-2 text-purple-300">Target Niche (Optional)</label>
                <input 
                  type="text" 
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g. Remote workers, Developers"
                  className="w-full bg-app-bg border border-app-border rounded-lg p-2 text-sm focus:border-purple-500 outline-none transition-colors"
                />
              </div>
              
              <div className="bg-app-card p-4 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all">
                <label className="block text-sm font-bold mb-2 text-cyan-300">Research Agent</label>
                <select 
                  value={agentType}
                  onChange={(e) => setAgentType(e.target.value)}
                  className="w-full bg-app-bg border border-app-border rounded-lg p-2 text-sm focus:border-cyan-500 outline-none transition-colors"
                >
                  <option value="Trend Analyst">Trend Analyst</option>
                  <option value="Market Gap Finder">Market Gap Finder</option>
                  <option value="Product Strategist">Product Strategist</option>
                  <option value="Competitor Researcher">Competitor Researcher</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="bg-app-card p-4 rounded-xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all">
                <label className="block text-sm font-bold mb-2 text-purple-300">Product Idea</label>
                <textarea 
                  value={productIdea}
                  onChange={(e) => setProductIdea(e.target.value)}
                  placeholder="e.g. A micro-SaaS that auto-generates podcast shownotes from audio..."
                  rows={3}
                  className="w-full bg-app-bg border border-app-border rounded-lg p-2 text-sm focus:border-purple-500 outline-none transition-colors custom-scrollbar resize-none"
                />
              </div>
              
              <div className="bg-app-card p-4 rounded-xl border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.1)] transition-all">
                <label className="block text-sm font-bold mb-2 text-pink-300">Target Audience (Optional)</label>
                <input 
                  type="text" 
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. Indie hackers, Content creators"
                  className="w-full bg-app-bg border border-app-border rounded-lg p-2 text-sm focus:border-pink-500 outline-none transition-colors"
                />
              </div>
              
              <div className="bg-app-card p-4 rounded-xl border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-all">
                <label className="block text-sm font-bold mb-2 text-amber-300">Key Feature (Optional)</label>
                <input 
                  type="text" 
                  value={keyFeature}
                  onChange={(e) => setKeyFeature(e.target.value)}
                  placeholder="e.g. 1-click publishing to WordPress"
                  className="w-full bg-app-bg border border-app-border rounded-lg p-2 text-sm focus:border-amber-500 outline-none transition-colors"
                />
              </div>
            </>
          )}

          {/* SESSION CONTEXT CONNECTOR */}
          {session && (
            <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>Use Session Context</span>
                </label>
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Enable</span>
                  <input
                    type="checkbox"
                    checked={useSessionData}
                    onChange={(e) => setUseSessionData(e.target.checked)}
                    className="w-3.5 h-3.5 text-rose-500 bg-zinc-950 border-zinc-800 rounded focus:ring-rose-500 focus:ring-2 cursor-pointer"
                  />
                </div>
              </div>

              {useSessionData ? (
                <p className="text-[11px] text-zinc-400 bg-rose-950/10 border border-rose-950/40 p-2.5 rounded-lg">
                  Using <strong className="text-rose-400">{(session?.selectedMediaIds?.length || 0)} selected reference(s)</strong> from active session (<strong className="text-rose-400">{session?.name}</strong>) to ground product analysis reports.
                </p>
              ) : (
                <p className="text-[11px] text-zinc-500 italic bg-zinc-900/20 p-2.5 rounded-lg">
                  Session data integration is disabled. Enable to inject active workspace knowledge.
                </p>
              )}
            </div>
          )}
          
          <button 
            onClick={handleRun}
            disabled={activeMode === 'research' ? !topic.trim() : !productIdea.trim() || isProcessing}
            className={`w-full text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg ${
              activeMode === 'research' 
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-indigo-500/20' 
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-500/20'
            }`}
          >
            {isProcessing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : activeMode === 'research' ? (
              <Search className="w-5 h-5" />
            ) : (
              <BarChart2 className="w-5 h-5" />
            )}
            {isProcessing ? 'Processing...' : activeMode === 'research' ? 'Start Research' : 'Validate Idea'}
          </button>
        </div>
        
        {/* Results */}
        <div className="md:col-span-2 bg-app-card rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex flex-col min-h-[500px] overflow-hidden">
          <div className="p-4 border-b border-app-border flex justify-between items-center bg-app-panel">
            <h3 className="font-bold flex items-center gap-2 text-emerald-400">
              {activeMode === 'research' ? <TrendingUp className="w-5 h-5" /> : <BarChart2 className="w-5 h-5" />}
              {activeMode === 'research' ? 'Research Intelligence' : 'Validation Report'}
            </h3>
            
            {result && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="p-1.5 hover:bg-app-bg rounded-lg text-app-dim hover:text-white transition-colors"
                  title="Copy to Clipboard"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1.5 hover:bg-app-bg rounded-lg text-app-dim hover:text-white transition-colors"
                  title="Download as Markdown"
                >
                  <Download className="w-4 h-4" />
                </button>
                {onSaveArtifact && (
                  <button
                    onClick={handleSaveToSession}
                    className="p-1.5 hover:bg-app-bg rounded-lg text-app-dim hover:text-white transition-colors"
                    title="Save to Session"
                  >
                    {saved ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Save className="w-4 h-4" />}
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {isProcessing ? (
              <div className="h-full flex flex-col items-center justify-center text-app-dim">
                <RefreshCw className="w-10 h-10 animate-spin mb-4 text-emerald-500" />
                <p>
                  {activeMode === 'research' 
                    ? `Deploying ${agentType} to scan markets...` 
                    : 'Analyzing market viability and crunching demand scores...'}
                </p>
              </div>
            ) : result ? (
              <div className="prose prose-invert max-w-none text-sm markdown-body">
                <Markdown>{result}</Markdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-app-dim">
                {activeMode === 'research' ? (
                  <Target className="w-12 h-12 mb-4 opacity-50 text-emerald-500/50" />
                ) : (
                  <Lightbulb className="w-12 h-12 mb-4 opacity-50 text-emerald-500/50" />
                )}
                <p>
                  {activeMode === 'research' 
                    ? 'Enter a topic to generate actionable market insights.' 
                    : 'Describe your product idea to get an instant validation report.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
