import React, { useState } from 'react';
import { FileText, ShieldAlert, TrendingUp, HelpCircle, Copy, Check, Download, Save, RefreshCw, Send, AlertTriangle, Zap, CheckCircle, BarChart, Settings, ListPlus, Trash2 } from 'lucide-react';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';
import { MediaItem } from '../../types';
import Markdown from 'react-markdown';

interface ExecutiveBriefingProps {
  session?: any | null;
  onSaveArtifact?: (mediaItem: MediaItem) => void;
}

interface RiskItem {
  id: string;
  category: string;
  level: 'High' | 'Medium' | 'Low';
  description: string;
}

export const ExecutiveBriefing: React.FC<ExecutiveBriefingProps> = ({ session, onSaveArtifact }) => {
  const [focusArea, setFocusArea] = useState('Strategic Opportunities');
  const [memoStyle, setMemoStyle] = useState('Bento Block Overview');
  const [tone, setTone] = useState('Analytical');
  const [useSessionData, setUseSessionData] = useState(false);

  // Interactive local parameters for customization
  const [risks, setRisks] = useState<RiskItem[]>([
    { id: '1', category: 'Operational', level: 'Medium', description: 'Information overload and stale aggregate source feeds.' },
    { id: '2', category: 'Strategic', level: 'High', description: 'CORS connectivity blocks on Custom OpenAI base URLs.' },
    { id: '3', category: 'Financial', level: 'Low', description: 'Token pricing quotas during repetitive background summarizations.' }
  ]);
  const [newRiskCategory, setNewRiskCategory] = useState('Technical');
  const [newRiskLevel, setNewRiskLevel] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newRiskDesc, setNewRiskDesc] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const addRisk = () => {
    if (!newRiskDesc.trim()) return;
    setRisks([
      ...risks,
      {
        id: Date.now().toString(),
        category: newRiskCategory,
        level: newRiskLevel,
        description: newRiskDesc.trim()
      }
    ]);
    setNewRiskDesc('');
  };

  const removeRisk = (id: string) => {
    setRisks(risks.filter(r => r.id !== id));
  };

  const handleGenerate = async () => {
    setIsProcessing(true);
    setBriefing(null);
    setCopied(false);
    setSaved(false);

    try {
      const selectedItems = useSessionData 
        ? (session?.mediaItems?.filter((item: MediaItem) =>
            session?.selectedMediaIds?.includes(item.id)
          ) || [])
        : [];

      // Format custom risks for LLM context
      const customRisksContext = risks.map((r, i) => 
        `- [${r.level} Risk] ${r.category}: ${r.description}`
      ).join('\n');

      const prompt = `You are a Chief of Staff and Principal Consultant. 
Synthesize a professional, comprehensive Executive Briefing based on the ${selectedItems.length > 0 ? 'provided source documents' : 'specifications'}.

USER SPECIFICATIONS:
- Key Focus Area: ${focusArea}
- Memo Layout Style: ${memoStyle}
- Tone: ${tone}

USER-SPECIFIED RISKS (Integrate these explicitly in your risks section):
${customRisksContext}

OUTPUT FORMAT REQUIREMENTS:
Generate a deeply synthesized, one-page report in beautiful Markdown. Organize the output into these specific headings with highly polished corporate wording:

# Executive Briefing: (Strategic Brief Title)

## 1. High-Impact Executive Summary
(Draft a powerful, maximum 3-sentence elevator pitch outlining the core purpose and immediate takeaways)

## 2. Core Strategic Drivers & Insights
(Provide 3-5 high-level bullet points detailing strategic indicators, technology advantages, or market variables discovered in the sources)

## 3. Risk Assessment & Mitigation Framework
(Synthesize a high-quality matrix containing the user-specified risks, and write clear, realistic operational mitigations for each)

## 4. Recommended Next Steps & Milestones
(Provide a structured, chronological set of immediate action items, specifying key milestones, objectives, and targeted timelines)

Ensure the output is written for executives - direct, zero-filler, analytical, and extremely concise.`;

      const responseText = await generateUnifiedAIResponse(prompt, selectedItems);
      setBriefing(responseText);
    } catch (e) {
      console.error(e);
      setBriefing("Failed to compile executive briefing. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (briefing) {
      navigator.clipboard.writeText(briefing);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (briefing) {
      const blob = new Blob([briefing], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `executive-briefing-${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleSaveToSession = () => {
    if (!briefing || !onSaveArtifact) return;

    // Convert briefing Markdown to a beautifully wrapped HTML template
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Executive Briefing Document</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #1e293b; padding: 3rem; }
        .document-container { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 3rem; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        h1 { color: #0f172a; font-size: 2rem; font-weight: 800; border-bottom: 3px solid #6366f1; padding-bottom: 0.5rem; margin-bottom: 2rem; }
        h2 { color: #4338ca; font-size: 1.25rem; font-weight: 700; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.25rem; margin-top: 2rem; margin-bottom: 1rem; }
        p { margin-bottom: 1rem; line-height: 1.7; color: #334155; }
        ul, ol { margin-left: 1.5rem; margin-bottom: 1rem; list-style-type: decimal; }
        li { margin-bottom: 0.5rem; line-height: 1.6; }
        .risk-badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
    </style>
</head>
<body>
    <div class="document-container">
        <h1>📁 Executive Briefing Document</h1>
        <div style="font-size: 0.85rem; color: #64748b; margin-top: -1.5rem; margin-bottom: 2.5rem; font-family: monospace;">
            STRICTLY CONFIDENTIAL // GENERATED VIA INTEL AGGREGATOR ENGINE // DATE: ${new Date().toLocaleDateString()}
        </div>
        
        <div class="prose prose-slate max-w-none">
            ${briefing.split('\n').map(line => {
              const trimmed = line.trim();
              if (trimmed.startsWith('# ')) {
                return `<h1>${trimmed.substring(2)}</h1>`;
              } else if (trimmed.startsWith('## ')) {
                return `<h2>${trimmed.substring(3)}</h2>`;
              } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return `<li>${trimmed.substring(2)}</li>`;
              } else if (trimmed) {
                return `<p>${trimmed}</p>`;
              }
              return '';
            }).join('\n')}
        </div>
    </div>
</body>
</html>`;

    const utf8Encode = new TextEncoder().encode(htmlContent);
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(utf8Encode)));

    const newArtifact: MediaItem = {
      id: Date.now().toString(),
      name: `Briefing Memo: ${focusArea}`,
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
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-2 border-b border-app-border pb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-indigo-400">
            <FileText className="w-6 h-6" /> Executive Briefing Desk
          </h2>
          <p className="text-app-dim text-xs mt-1">
            Formulate professional, highly structured one-pagers and memos for strategic leaders.
          </p>
        </div>
        
        <div className="flex gap-2">
          {briefing && (
            <>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded bg-app-card border border-app-border hover:bg-app-input text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded bg-app-card border border-app-border hover:bg-app-input text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              <button
                onClick={handleSaveToSession}
                className="px-3 py-1.5 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {saved ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? 'Saved!' : 'Save Briefing'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Left Hand: Controller & Dynamic Risk Board */}
        <div className="lg:col-span-5 space-y-4 overflow-y-auto max-h-[80vh] pr-1">
          {/* Main settings box */}
          <div className="bg-app-card border border-app-border rounded-xl p-4 md:p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-app-dim border-b border-app-border pb-2 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-indigo-400" /> Document Settings
            </h3>

            {/* Context reference status */}
            <div className="bg-app-bg p-3 rounded border border-app-border text-xs text-app-dim space-y-2">
              <div className="flex items-center justify-between">
                <strong>Knowledge base:</strong>
                <input
                  type="checkbox"
                  checked={useSessionData}
                  onChange={(e) => setUseSessionData(e.target.checked)}
                  className="w-3.5 h-3.5 text-indigo-500 bg-app-input border-app-border rounded focus:ring-indigo-500 focus:ring-2"
                />
              </div>
              <p className="mt-1">
                {selectedItemsCount > 0 
                  ? `${useSessionData ? 'Referencing' : 'Ignoring'} ${selectedItemsCount} selected media node(s) from active session.`
                  : '⚠️ No media nodes selected in session chat yet. Grounding will use general context.'}
              </p>
            </div>

            {/* Focus area */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Strategic Focus Area</label>
              <select
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-indigo-500"
              >
                <option value="Strategic Opportunities">🚀 Strategic Opportunities & Scaling</option>
                <option value="Risk & Mitigation Focus">🛡️ Risk Mitigation & Structural Roadblocks</option>
                <option value="Operational Roadmaps">⚙️ Operational Readiness & Milestones</option>
                <option value="Financial & Resource Targets">💰 Financial Projections & Capital Budgets</option>
              </select>
            </div>

            {/* Layout layout style */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Briefing Layout Style</label>
              <select
                value={memoStyle}
                onChange={(e) => setMemoStyle(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-indigo-500"
              >
                <option value="Classic Corporate Memo">Classic Corporate Memo (To/From/Date format)</option>
                <option value="Bento Block Overview">Bento Block Summary (Direct & Structured)</option>
                <option value="High-Level Strategic Letter">High-Level Executive Strategy Letter</option>
              </select>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Professional Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-indigo-500"
              >
                <option value="Analytical">📊 Analytical & Metrics-driven</option>
                <option value="Direct & Concise">⚡ Direct, Concise & High-impact</option>
                <option value="Narrative & Visionary">🌟 Visionary & Strategic-narrative</option>
              </select>
            </div>
          </div>

          {/* Interactive Risk Board */}
          <div className="bg-app-card border border-app-border rounded-xl p-4 md:p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-app-dim border-b border-app-border pb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Interactive Risk Board
            </h3>
            <p className="text-[11px] text-app-dim">
              Add or remove risks dynamically. The AI will build targeted mitigation roadmaps for each.
            </p>

            {/* Risk input creator */}
            <div className="bg-app-bg p-3 border border-app-border rounded space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-app-dim mb-1">Category</label>
                  <input
                    type="text"
                    value={newRiskCategory}
                    onChange={(e) => setNewRiskCategory(e.target.value)}
                    className="w-full bg-app-input border border-app-border rounded px-2 py-1 text-xs text-app-text focus:outline-none"
                    placeholder="e.g. Legal, Security"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-app-dim mb-1">Risk Level</label>
                  <select
                    value={newRiskLevel}
                    onChange={(e) => setNewRiskLevel(e.target.value as any)}
                    className="w-full bg-app-input border border-app-border rounded px-2 py-1 text-xs text-app-text focus:outline-none"
                  >
                    <option value="Low">🟢 Low</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="High">🔴 High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-app-dim mb-1">Risk Description</label>
                <input
                  type="text"
                  value={newRiskDesc}
                  onChange={(e) => setNewRiskDesc(e.target.value)}
                  className="w-full bg-app-input border border-app-border rounded px-2 py-1 text-xs text-app-text focus:outline-none"
                  placeholder="Describe the threat..."
                />
              </div>
              <button
                type="button"
                onClick={addRisk}
                className="w-full py-1 rounded bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <ListPlus className="w-3.5 h-3.5" /> Add Risk to Memo
              </button>
            </div>

            {/* Selected risks listing */}
            <div className="space-y-2">
              {risks.map(r => (
                <div key={r.id} className="flex justify-between items-start gap-2 p-2 bg-app-bg rounded border border-app-border text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="font-bold text-app-text">{r.category}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        r.level === 'High' 
                          ? 'bg-red-950/40 text-red-400 border border-red-900/30' 
                          : r.level === 'Medium' 
                            ? 'bg-yellow-950/40 text-yellow-400 border border-yellow-900/30'
                            : 'bg-green-950/40 text-green-400 border border-green-900/30'
                      }`}>
                        {r.level}
                      </span>
                    </div>
                    <p className="text-app-dim truncate" title={r.description}>{r.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRisk(r.id)}
                    className="p-1 rounded text-app-dim hover:text-red-400 hover:bg-red-950/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Run button */}
            <button
              onClick={handleGenerate}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850/40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-900/10"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Formulating Executive Memo...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Compile Briefing
                </>
              )}
            </button>

          </div>
        </div>

        {/* Right Hand: Output & Visualization Slate */}
        <div className="lg:col-span-7 flex flex-col h-full min-h-[450px]">
          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                <FileText className="w-5 h-5 text-indigo-400 absolute top-3.5 left-3.5 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-app-text">Compiling Strategy Report...</p>
              <p className="text-xs text-app-dim text-center max-w-sm">
                Evaluating structural inputs, drafting critical drivers, and formulating specific mitigations for {risks.length} dynamic threat vectors.
              </p>
            </div>
          )}

          {!isProcessing && !briefing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 text-center text-app-dim">
              <BarChart className="w-12 h-12 text-indigo-500/30 mb-3" />
              <p className="text-sm font-semibold text-app-text">Strategy Slate Preview</p>
              <p className="text-xs max-w-sm mt-1">
                Configure focus coordinates, memo layout style, and threat indexes on the left, then click "Compile Briefing".
              </p>
            </div>
          )}

          {!isProcessing && briefing && (
            <div className="flex-1 flex flex-col bg-app-card border border-app-border rounded-xl overflow-hidden">
              {/* Document Header Indicator */}
              <div className="bg-app-bg/50 border-b border-app-border px-4 py-2.5 flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 text-app-dim font-mono">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  STRICTLY CONFIDENTIAL
                </div>
                <div className="text-[10px] text-app-dim font-mono uppercase">
                  {focusArea} // {tone} Style
                </div>
              </div>

              {/* Slate Area */}
              <div className="p-6 md:p-8 flex-1 overflow-y-auto bg-app-bg/15 max-h-[650px]">
                <div className="prose prose-invert prose-xs max-w-none prose-headings:text-app-text prose-headings:font-bold prose-p:text-app-dim prose-li:text-app-dim prose-strong:text-app-text">
                  <Markdown>{briefing}</Markdown>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
