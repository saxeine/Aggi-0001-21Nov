import React, { useState } from 'react';
import { Sparkles, Copy, Check, Download, Save, RefreshCw, AlertCircle, Code, Cpu, ShieldCheck, Zap } from 'lucide-react';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';
import { MediaItem } from '../../types';

interface CodeExplainerProps {
  session?: any | null;
  onSaveArtifact?: (mediaItem: MediaItem) => void;
}

interface ExplainerResult {
  summary: string;
  walkthrough: { block: string; explanation: string }[];
  complexity: { time: string; space: string; explanation: string };
  bugsAndOptimizations: string[];
}

export const CodeExplainer: React.FC<CodeExplainerProps> = ({ session, onSaveArtifact }) => {
  const [codeSnippet, setCodeSnippet] = useState('');
  const [targetAudience, setTargetAudience] = useState('Junior Developer');
  const [useSessionData, setUseSessionData] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ExplainerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!codeSnippet.trim()) {
      setError("Please paste a code snippet first.");
      return;
    }

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

      const prompt = `Act as an expert Software Engineer, Tech Lead, and Master Computer Science Educator.
Break down the provided code snippet into simple, easy-to-understand explanations customized for a ${targetAudience}.${selectedItems.length > 0 ? '\nRefer to the active session files for any domain logic, context, libraries, or architectural specifications.' : ''}

CODE SNIPPET:
\`\`\`
${codeSnippet}
\`\`\`

OUTPUT FORMAT REQUIREMENTS:
You MUST output the explanation as a structured JSON object wrapped inside a codeblock.
The object must follow this strict TypeScript structure:
{
  "summary": "High-level summary (1-2 sentences) of what the code is aiming to solve, tailored for ${targetAudience}.",
  "walkthrough": [
    {
      "block": "Line or structural block of code",
      "explanation": "Clear explanation of what this block does, using appropriate terminology matching the audience level."
    }
  ],
  "complexity": {
    "time": "O(N) or O(1) or O(N log N) etc.",
    "space": "O(1) or O(N) etc.",
    "explanation": "Brief context explaining why this is the case."
  },
  "bugsAndOptimizations": [
    "Potential optimization, edge-case vulnerability, or standard practice recommendation 1",
    "Potential optimization or recommendation 2"
  ]
}

Ensure your response is valid JSON that can be parsed by JSON.parse. Wrap it inside a \`\`\`json and \`\`\` block.`;

      const responseText = await generateUnifiedAIResponse(prompt, selectedItems);

      // Extract JSON
      const jsonMatch = responseText.match(/```json([\s\S]*?)```/) || responseText.match(/\{([\s\S]*?)\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      const parsedData = JSON.parse(jsonString.trim());

      if (parsedData && parsedData.summary && parsedData.walkthrough) {
        setResult(parsedData);
      } else {
        throw new Error("Parsed data was not structured correctly.");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to compile code explanation. Make sure the code is valid syntax and try again!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownload = () => {
    if (!result) return;

    let text = `=========================================\n`;
    text += `CODE EXPLANATION FOR: ${targetAudience}\n`;
    text += `=========================================\n\n`;

    text += `### SUMMARY:\n${result.summary}\n\n`;

    text += `### CODE WALKTHROUGH:\n`;
    result.walkthrough.forEach((wt, idx) => {
      text += `--- BLOCK ${idx + 1} ---\n`;
      text += `${wt.block}\n`;
      text += `Explanation: ${wt.explanation}\n\n`;
    });

    text += `### COMPLEXITY ANALYTICS:\n`;
    text += `- Time Complexity: ${result.complexity.time}\n`;
    text += `- Space Complexity: ${result.complexity.space}\n`;
    text += `Context: ${result.complexity.explanation}\n\n`;

    text += `### SEC-AUDIT / REFACTOR RECOMMENDATIONS:\n`;
    result.bugsAndOptimizations.forEach(rec => {
      text += `- ${rec}\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code-explanation-${targetAudience.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.txt`;
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
    <title>Code Analysis Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 2rem; }
        .block-card { background: #111827; border: 1px solid #374151; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
        code { font-family: 'Fira Code', monospace; background: #030712; padding: 0.125rem 0.375rem; border-radius: 4px; color: #a3e635; }
        pre code { display: block; padding: 1rem; overflow-x: auto; color: #f3f4f6; }
    </style>
</head>
<body>
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-extrabold text-lime-400 mb-2">⚡ Code Analysis & Walkthrough</h1>
        <p class="text-gray-400 mb-6">Configured Audience: <strong>${targetAudience}</strong></p>

        <div class="block-card">
            <h3 class="text-lime-400 font-bold mb-2">Overview</h3>
            <p class="text-gray-300 leading-relaxed text-sm">${result.summary}</p>
        </div>

        <div class="block-card">
            <h3 class="text-lime-400 font-bold mb-4">Step-by-Step Structural Breakdown</h3>
            <div class="space-y-4">
                ${result.walkthrough.map((wt, idx) => `
                <div class="p-4 bg-gray-950 border border-gray-800 rounded-lg">
                    <pre><code class="text-xs">${wt.block}</code></pre>
                    <p class="text-sm text-gray-300 mt-2.5 leading-relaxed">${wt.explanation}</p>
                </div>
                `).join('')}
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="block-card mb-0">
                <h3 class="text-lime-400 font-bold mb-2">Time Complexity</h3>
                <span class="text-2xl font-mono text-white">${result.complexity.time}</span>
                <p class="text-xs text-gray-400 mt-2">${result.complexity.explanation}</p>
            </div>
            <div class="block-card mb-0">
                <h3 class="text-lime-400 font-bold mb-2">Space Complexity</h3>
                <span class="text-2xl font-mono text-white">${result.complexity.space}</span>
            </div>
        </div>

        <div class="block-card">
            <h3 class="text-lime-400 font-bold mb-3">Refactorings, Edge-Cases & Optimizations</h3>
            <ul class="space-y-1.5 text-sm list-disc pl-5 text-gray-300">
                ${result.bugsAndOptimizations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    </div>
</body>
</html>`;

    const utf8Encode = new TextEncoder().encode(htmlContent);
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(utf8Encode)));

    const newArtifact: MediaItem = {
      id: Date.now().toString(),
      name: `Explanation: ${targetAudience}`,
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
          <h2 className="text-2xl font-bold flex items-center gap-2 text-lime-400">
            <Code className="w-6 h-6" /> Code Explainer
          </h2>
          <p className="text-app-dim text-xs mt-1">
            Deconstruct complex algorithms or application blocks into simple, readable explanations tailored for stakeholders or juniors.
          </p>
        </div>

        <div className="flex gap-2">
          {result && (
            <>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded bg-app-card border border-app-border hover:bg-app-input text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download Analysis
              </button>
              <button
                onClick={handleSaveToSession}
                className="px-3 py-1.5 rounded bg-lime-600/20 text-lime-400 border border-lime-500/30 hover:bg-lime-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {saved ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? 'Saved!' : 'Save Report'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">

        {/* Input Column (Left) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          <div className="bg-app-card border border-app-border rounded-xl p-4 md:p-5 space-y-4 flex-1 flex flex-col">
            <h3 className="text-sm font-bold uppercase tracking-wider text-app-dim border-b border-app-border pb-2 flex items-center gap-1.5">
              <Code className="w-4 h-4 text-lime-400" /> Monospace Input Editor
            </h3>

            {/* Knowledge base status */}
            <div className="bg-app-bg p-3 rounded border border-app-border text-xs text-app-dim space-y-2">
              <div className="flex items-center justify-between">
                <strong>Knowledge base:</strong>
                <input
                  type="checkbox"
                  checked={useSessionData}
                  onChange={(e) => setUseSessionData(e.target.checked)}
                  className="w-3.5 h-3.5 text-lime-500 bg-app-input border-app-border rounded focus:ring-lime-500 focus:ring-2"
                />
              </div>
              <p className="mt-1">
                {selectedItemsCount > 0 
                  ? `${useSessionData ? 'Referencing' : 'Ignoring'} ${selectedItemsCount} selected file(s) from active session.`
                  : '⚠️ No reference files selected. Analysis will run purely on pasted snippet.'}
              </p>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Target Explanation Level</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-lime-500"
              >
                <option value="5-Year-Old (ELI5)">👶 ELI5 (Explain Like I'm 5)</option>
                <option value="Non-technical Business Stakeholder">👔 Business Stakeholder / Product Manager (No developer jargon)</option>
                <option value="Junior Developer">🌱 Junior Developer (Learn syntax, patterns & practices)</option>
                <option value="Security / Compliance Auditor">🔒 Security Auditor (Edge cases, buffer overflows, PII risks)</option>
              </select>
            </div>

            {/* Code Text Area */}
            <div className="flex-1 min-h-[250px] flex flex-col">
              <label className="block text-xs font-semibold text-app-text mb-1.5">Paste Code Snippet</label>
              <textarea
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                rows={12}
                placeholder={`// Paste your Javascript, Python, Solidity, C++, SQL code here...
function calculateLTV(arpu, churn) {
  if (churn === 0) return Infinity;
  return arpu / churn;
}`}
                className="w-full flex-1 bg-zinc-950 text-lime-400 font-mono border border-app-border rounded px-3 py-2 text-xs focus:outline-none focus:border-lime-500 leading-relaxed resize-none"
              />
            </div>

            {/* Action CTA */}
            <button
              onClick={handleGenerate}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-lg bg-lime-600 hover:bg-lime-500 disabled:bg-lime-850/40 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Deconstructing Code Snippet...
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  Explain Code Snippet
                </>
              )}
            </button>
          </div>
        </div>

        {/* Breakdown Output (Right) */}
        <div className="lg:col-span-7 flex flex-col h-full min-h-[450px]">
          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-lime-500/20 border-t-lime-500 animate-spin"></div>
                <Code className="w-5 h-5 text-lime-400 absolute top-3.5 left-3.5 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-app-text">Generating Walkthrough...</p>
              <p className="text-xs text-app-dim text-center max-w-sm">
                Compiling syntactical structural blocks, checking time complexity matrices, and formulating secure advice.
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
              <Code className="w-12 h-12 text-lime-500/30 mb-3" />
              <p className="text-sm font-semibold text-app-text">Interactive Deconstruction Desk</p>
              <p className="text-xs max-w-sm mt-1">
                Enter your codebase block on the left and select an explanation audience profile to begin analysis.
              </p>
            </div>
          )}

          {!isProcessing && result && (
            <div className="flex-1 space-y-6 overflow-y-auto max-h-[70vh] pr-1">
              
              {/* Summary Card */}
              <div className="p-5 bg-app-card border border-app-border rounded-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-lime-400 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Strategic Core Objective
                </h4>
                <p className="text-sm text-app-text leading-relaxed">{result.summary}</p>
              </div>

              {/* Step by Step walkthrough */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-lime-400 pl-1">Structural Walkthrough</h4>
                {result.walkthrough.map((wt, idx) => (
                  <div key={idx} className="bg-app-card border border-app-border rounded-xl overflow-hidden shadow">
                    <div className="bg-zinc-950 p-3 border-b border-app-border/40 font-mono text-xs text-lime-400 overflow-x-auto whitespace-pre">
                      {wt.block}
                    </div>
                    <div className="p-4 text-xs text-app-dim leading-relaxed">
                      {wt.explanation}
                    </div>
                  </div>
                ))}
              </div>

              {/* Complexity Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-app-card border border-app-border rounded-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-lime-400 mb-2 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" /> Time Complexity
                  </h4>
                  <span className="text-xl font-mono text-app-text font-extrabold">{result.complexity.time}</span>
                  <p className="text-[11px] text-app-dim mt-2 leading-relaxed">{result.complexity.explanation}</p>
                </div>
                <div className="p-4 bg-app-card border border-app-border rounded-xl flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-lime-400 mb-2 flex items-center gap-1.5">
                      <Zap className="w-4 h-4" /> Space Complexity
                    </h4>
                    <span className="text-xl font-mono text-app-text font-extrabold">{result.complexity.space}</span>
                  </div>
                </div>
              </div>

              {/* Bug/Refactor List */}
              {result.bugsAndOptimizations && result.bugsAndOptimizations.length > 0 && (
                <div className="p-5 bg-app-card border border-app-border rounded-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-lime-400 mb-3 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Secure Guardrails & Refactor Recommendations
                  </h4>
                  <ul className="space-y-2 text-xs text-app-dim list-disc pl-5">
                    {result.bugsAndOptimizations.map((rec, index) => (
                      <li key={index} className="leading-relaxed">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
