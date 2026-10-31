import React, { useState } from 'react';
import { Sparkles, Copy, Check, Download, Save, RefreshCw, AlertCircle, Eye, ShieldAlert, BarChart2, CheckCircle, AlertTriangle } from 'lucide-react';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';
import { MediaItem } from '../../types';

interface SwotAnalysisProps {
  session?: any | null;
  onSaveArtifact?: (mediaItem: MediaItem) => void;
}

interface SwotResult {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  strategicActions: {
    title: string;
    description: string;
    priority: 'High' | 'Medium' | 'Low';
  }[];
}

export const SwotAnalysis: React.FC<SwotAnalysisProps> = ({ session, onSaveArtifact }) => {
  const [perspective, setPerspective] = useState('Product Market Fit');
  const [customDrivers, setCustomDrivers] = useState('');
  const [useSessionData, setUseSessionData] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SwotResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const selectedItems = useSessionData 
        ? (session?.mediaItems?.filter((item: MediaItem) =>
            session?.selectedMediaIds?.includes(item.id)
          ) || [])
        : [];

      const prompt = `Act as an elite Strategy Consultant and Management Partner. 
Analyze the provided ${selectedItems.length > 0 ? 'source materials' : 'specifications'} and compile an exhaustive SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis.

STRATEGIC PERSPECTIVE:
- Perspective Focus: ${perspective} (Tailor all parameters to evaluate this specific operational or business facet)
- Custom Constraints/Focus Drivers: ${customDrivers || 'Examine all variables based on general market entry, operations, and resilience.'}

OUTPUT FORMAT REQUIREMENTS:
You MUST output the SWOT data as a structured JSON object wrapped inside a codeblock.
The object must follow this strict TypeScript structure:
{
  "strengths": ["Strength 1 (Concrete fact from sources)", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1 (Concrete operational or structural risk)", "Weakness 2", "Weakness 3"],
  "opportunities": ["Opportunity 1 (External market or tech opportunity)", "Opportunity 2", "Opportunity 3"],
  "threats": ["Threat 1 (External competitive, regulatory, or market threat)", "Threat 2", "Threat 3"],
  "strategicActions": [
    {
      "title": "Action Item Name (e.g. Mitigate Weakness X with Strength Y)",
      "description": "Short description of how to operationalize this recommendation.",
      "priority": "High"
    },
    {
      "title": "Action Item Name 2",
      "description": "Description...",
      "priority": "Medium"
    }
  ]
}

Ensure your response is valid JSON that can be parsed by JSON.parse. Wrap it inside a \`\`\`json and \`\`\` block.`;

      const responseText = await generateUnifiedAIResponse(prompt, selectedItems);

      // Extract JSON
      const jsonMatch = responseText.match(/```json([\s\S]*?)```/) || responseText.match(/\{([\s\S]*?)\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      const parsedData = JSON.parse(jsonString.trim());

      if (parsedData && parsedData.strengths && parsedData.weaknesses) {
        setResult(parsedData);
      } else {
        throw new Error("Parsed data was not structured correctly.");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to formulate SWOT analysis in a structured format. Please verify your selected assets and try again!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!result) return;

    let mdText = `# 📊 Strategic SWOT Analysis: ${perspective}\n\n`;
    mdText += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    
    mdText += `## STRENGTHS (Internal, Positive)\n`;
    result.strengths.forEach(s => mdText += `- ${s}\n`);
    mdText += `\n`;

    mdText += `## WEAKNESSES (Internal, Negative)\n`;
    result.weaknesses.forEach(w => mdText += `- ${w}\n`);
    mdText += `\n`;

    mdText += `## OPPORTUNITIES (External, Positive)\n`;
    result.opportunities.forEach(o => mdText += `- ${o}\n`);
    mdText += `\n`;

    mdText += `## THREATS (External, Negative)\n`;
    result.threats.forEach(t => mdText += `- ${t}\n`);
    mdText += `\n`;

    mdText += `## STRATEGIC ACTION STRATEGY MAP\n`;
    result.strategicActions.forEach(act => {
      mdText += `### [${act.priority} Priority] ${act.title}\n`;
      mdText += `${act.description}\n\n`;
    });

    navigator.clipboard.writeText(mdText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;

    let mdText = `# 📊 Strategic SWOT Analysis: ${perspective}\n\n`;
    mdText += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    
    mdText += `## STRENGTHS\n`;
    result.strengths.forEach(s => mdText += `- ${s}\n`);
    mdText += `\n`;

    mdText += `## WEAKNESSES\n`;
    result.weaknesses.forEach(w => mdText += `- ${w}\n`);
    mdText += `\n`;

    mdText += `## OPPORTUNITIES\n`;
    result.opportunities.forEach(o => mdText += `- ${o}\n`);
    mdText += `\n`;

    mdText += `## THREATS\n`;
    result.threats.forEach(t => mdText += `- ${t}\n`);
    mdText += `\n`;

    mdText += `## RECOMMENDATIONS\n`;
    result.strategicActions.forEach(act => {
      mdText += `### [${act.priority}] ${act.title}\n`;
      mdText += `${act.description}\n\n`;
    });

    const blob = new Blob([mdText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swot-analysis-${perspective.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToSession = () => {
    if (!result || !onSaveArtifact) return;

    let htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>SWOT Strategic Evaluation</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 2rem; }
        .grid-quad { border: 1px solid #374151; padding: 1.5rem; border-radius: 12px; height: 100%; }
        .quad-title { font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.875rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
    </style>
</head>
<body>
    <div class="max-w-6xl mx-auto">
        <h1 class="text-3xl font-extrabold text-violet-400 mb-1">📊 SWOT Strategic Evaluation</h1>
        <p class="text-gray-400 mb-8">Perspective: <strong>${perspective}</strong></p>

        <!-- 2x2 SWOT Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="grid-quad bg-emerald-950/20 border-emerald-800/40">
                <div class="quad-title text-emerald-400">💪 Strengths (Internal)</div>
                <ul class="space-y-2 text-sm text-gray-300 list-disc pl-5">
                    ${result.strengths.map(s => `<li>${s}</li>`).join('')}
                </ul>
            </div>
            <div class="grid-quad bg-rose-950/20 border-rose-800/40">
                <div class="quad-title text-rose-400">⚠️ Weaknesses (Internal)</div>
                <ul class="space-y-2 text-sm text-gray-300 list-disc pl-5">
                    ${result.weaknesses.map(w => `<li>${w}</li>`).join('')}
                </ul>
            </div>
            <div class="grid-quad bg-blue-950/20 border-blue-800/40">
                <div class="quad-title text-blue-400">🚀 Opportunities (External)</div>
                <ul class="space-y-2 text-sm text-gray-300 list-disc pl-5">
                    ${result.opportunities.map(o => `<li>${o}</li>`).join('')}
                </ul>
            </div>
            <div class="grid-quad bg-amber-950/20 border-amber-800/40">
                <div class="quad-title text-amber-400">🔥 Threats (External)</div>
                <ul class="space-y-2 text-sm text-gray-300 list-disc pl-5">
                    ${result.threats.map(t => `<li>${t}</li>`).join('')}
                </ul>
            </div>
        </div>

        <!-- Recommendations -->
        <div class="p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <h2 class="text-lg font-bold text-gray-200 mb-4">Strategic Recommendation & Action Map</h2>
            <div class="space-y-4">
                ${result.strategicActions.map(act => `
                <div class="p-4 bg-gray-950 border border-gray-800/50 rounded-lg">
                    <div class="flex justify-between items-start mb-1">
                        <h3 class="font-bold text-gray-200">${act.title}</h3>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                          act.priority === 'High' ? 'bg-red-900/40 text-red-400' : 'bg-yellow-900/40 text-yellow-400'
                        }">${act.priority} Priority</span>
                    </div>
                    <p class="text-xs text-gray-400 leading-relaxed">${act.description}</p>
                </div>
                `).join('')}
            </div>
        </div>
    </div>
</body>
</html>`;

    const utf8Encode = new TextEncoder().encode(htmlContent);
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(utf8Encode)));

    const newArtifact: MediaItem = {
      id: Date.now().toString(),
      name: `SWOT: ${perspective}`,
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
          <h2 className="text-2xl font-bold flex items-center gap-2 text-violet-400">
            <BarChart2 className="w-6 h-6" /> SWOT Strategic Desk
          </h2>
          <p className="text-app-dim text-xs mt-1">
            Build interactive SWOT matrices evaluating enterprise, compliance, or strategic market vectors directly from sources.
          </p>
        </div>

        <div className="flex gap-2">
          {result && (
            <>
              <button
                onClick={handleCopyMarkdown}
                className="px-3 py-1.5 rounded bg-app-card border border-app-border hover:bg-app-input text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied Markdown' : 'Copy MD'}
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded bg-app-card border border-app-border hover:bg-app-input text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download Report
              </button>
              <button
                onClick={handleSaveToSession}
                className="px-3 py-1.5 rounded bg-violet-600/20 text-violet-400 border border-violet-500/30 hover:bg-violet-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {saved ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? 'Saved!' : 'Save Report'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">

        {/* Configuration Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-app-card border border-app-border rounded-xl p-4 md:p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-app-dim border-b border-app-border pb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-violet-400" /> Audit Parameters
            </h3>

            {/* Knowledge base status */}
            <div className="bg-app-bg p-3 rounded border border-app-border text-xs text-app-dim space-y-2">
              <div className="flex items-center justify-between">
                <strong>Knowledge base:</strong>
                <input
                  type="checkbox"
                  checked={useSessionData}
                  onChange={(e) => setUseSessionData(e.target.checked)}
                  className="w-3.5 h-3.5 text-violet-500 bg-app-input border-app-border rounded focus:ring-violet-500 focus:ring-2"
                />
              </div>
              <p className="mt-1">
                {selectedItemsCount > 0 
                  ? `${useSessionData ? 'Using' : 'Ignoring'} ${selectedItemsCount} selected reference(s) from active session.`
                  : '⚠️ No reference files selected. Using general market intelligence templates.'}
              </p>
            </div>

            {/* Strategic Lens */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Strategic Lens Perspective</label>
              <select
                value={perspective}
                onChange={(e) => setPerspective(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-violet-500"
              >
                <option value="Product Market Fit">🎯 Product Market Fit (User value, pricing, retention)</option>
                <option value="Competitive Moat">🛡️ Competitive Moat (Patent defensibility, lock-in, market threats)</option>
                <option value="Security & Compliance">🔒 Security, Risk & Compliance (PII, scale hurdles, tech debt)</option>
                <option value="Financial Scalability">📈 Financial Scalability (Margin models, acquisition costs, LTV)</option>
              </select>
            </div>

            {/* Custom Constraints */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Specific Focus Drivers (Optional)</label>
              <textarea
                value={customDrivers}
                onChange={(e) => setCustomDrivers(e.target.value)}
                rows={3}
                placeholder="e.g. Focus particularly on European GDPR compliance or competitive pressures from hyperscalers..."
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Execute Button */}
            <button
              onClick={handleGenerate}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-violet-850/40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Mapping Strategic Coordinates...
                </>
              ) : (
                <>
                  <BarChart2 className="w-4 h-4" />
                  Perform SWOT Analysis
                </>
              )}
            </button>
          </div>
        </div>

        {/* Matrix & Recommendations Column */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[450px]">
          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin"></div>
                <BarChart2 className="w-5 h-5 text-violet-400 absolute top-3.5 left-3.5 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-app-text">Compiling SWOT Matrix...</p>
              <p className="text-xs text-app-dim text-center max-w-sm">
                Structuring internal strengths and weaknesses alongside external threat landscapes and blue-ocean opportunities.
              </p>
            </div>
          )}

          {error && !isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 text-center">
              <AlertCircle className="w-12 h-12 text-red-500/40 mb-3" />
              <p className="text-sm font-bold text-red-400">Analysis Failed</p>
              <p className="text-xs text-app-dim max-w-md mt-1 mb-4">{error}</p>
              <button
                onClick={handleGenerate}
                className="px-4 py-2 bg-app-bg border border-app-border rounded text-xs font-semibold hover:bg-app-input text-app-text"
              >
                Retry
              </button>
            </div>
          )}

          {!isProcessing && !error && !result && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 text-center text-app-dim">
              <BarChart2 className="w-12 h-12 text-violet-500/30 mb-3" />
              <p className="text-sm font-semibold text-app-text">Strategic Matrix Board</p>
              <p className="text-xs max-w-sm mt-1">
                Trigger the SWOT engine to construct a comprehensive business/product health assessment layout.
              </p>
            </div>
          )}

          {!isProcessing && result && (
            <div className="flex-1 space-y-6 overflow-y-auto max-h-[70vh] pr-1">
              
              {/* SWOT 2x2 Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="p-5 bg-emerald-950/15 border border-emerald-900/30 hover:border-emerald-500/40 rounded-xl transition-colors">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Strengths (Internal)
                  </h4>
                  <ul className="space-y-2 text-xs text-app-text list-disc pl-5">
                    {result.strengths.map((str, index) => (
                      <li key={index} className="leading-relaxed">{str}</li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="p-5 bg-rose-950/15 border border-rose-900/30 hover:border-rose-500/40 rounded-xl transition-colors">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-3 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" /> Weaknesses (Internal)
                  </h4>
                  <ul className="space-y-2 text-xs text-app-text list-disc pl-5">
                    {result.weaknesses.map((weak, index) => (
                      <li key={index} className="leading-relaxed">{weak}</li>
                    ))}
                  </ul>
                </div>

                {/* Opportunities */}
                <div className="p-5 bg-blue-950/15 border border-blue-900/30 hover:border-blue-500/40 rounded-xl transition-colors">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Opportunities (External)
                  </h4>
                  <ul className="space-y-2 text-xs text-app-text list-disc pl-5">
                    {result.opportunities.map((opp, index) => (
                      <li key={index} className="leading-relaxed">{opp}</li>
                    ))}
                  </ul>
                </div>

                {/* Threats */}
                <div className="p-5 bg-amber-950/15 border border-amber-900/30 hover:border-amber-500/40 rounded-xl transition-colors">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Threats (External)
                  </h4>
                  <ul className="space-y-2 text-xs text-app-text list-disc pl-5">
                    {result.threats.map((thr, index) => (
                      <li key={index} className="leading-relaxed">{thr}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Blueprint */}
              {result.strategicActions && result.strategicActions.length > 0 && (
                <div className="p-5 bg-app-card border border-app-border rounded-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400 mb-4">
                    Immediate Action Map & Strategic Mitigations
                  </h4>
                  <div className="space-y-3">
                    {result.strategicActions.map((act, index) => (
                      <div key={index} className="p-3.5 bg-app-bg border border-app-border rounded-lg text-xs hover:border-violet-500/30 transition-all">
                        <div className="flex justify-between items-start mb-1.5">
                          <h5 className="font-bold text-app-text text-sm">{act.title}</h5>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            act.priority === 'High' 
                              ? 'bg-red-950 text-red-400 border border-red-900/40' 
                              : 'bg-yellow-950 text-yellow-400 border border-yellow-900/40'
                          }`}>
                            {act.priority} Priority
                          </span>
                        </div>
                        <p className="text-app-dim leading-relaxed">{act.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
