import React, { useState } from 'react';
import { Sparkles, Copy, Check, Download, Save, RefreshCw, AlertCircle, Layout, Eye, MessageSquare, Heart } from 'lucide-react';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';
import { MediaItem } from '../../types';

interface MarketingCopywriterProps {
  session?: any | null;
  onSaveArtifact?: (mediaItem: MediaItem) => void;
}

interface CopyResult {
  headlines: string[];
  adBody: string;
  hooks: string[];
  callToAction: string;
  keywords: string[];
}

export const MarketingCopywriter: React.FC<MarketingCopywriterProps> = ({ session, onSaveArtifact }) => {
  const [framework, setFramework] = useState('AIDA');
  const [channel, setChannel] = useState('google');
  const [customBrief, setCustomBrief] = useState('');
  const [targetAudience, setTargetAudience] = useState('General tech consumers / SaaS professionals');
  const [useSessionData, setUseSessionData] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<CopyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

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

      const prompt = `Act as an elite Conversion Rate Optimization (CRO) Copywriter and Performance Marketer.
Analyze the provided ${selectedItems.length > 0 ? 'source materials' : 'specifications'} and generate high-converting ad copy, headlines, and descriptions.

MARKETING SPECIFICATIONS:
- Copywriting Framework: ${framework === 'AIDA' ? 'AIDA (Attention, Interest, Desire, Action)' : framework === 'PAS' ? 'PAS (Problem, Agitate, Solve)' : 'Feature-Benefit (Feature matching emotional outcomes)'}
- Channel Format: ${channel === 'google' ? 'Google Search Text Ad (Headline max 30 chars, description max 90 chars)' : channel === 'facebook' ? 'Facebook Sponsored Post (Hook, Agitate, Image Copy, Link description)' : 'SaaS Landing Page Hero Block (Headline, Sub-headline, Key bullets, Call to action)'}
- Target Audience Persona: ${targetAudience}
- Product Focus/Brief: ${customBrief || 'Emphasize the core value propositions and strategic insights discovered in the sources.'}

OUTPUT FORMAT REQUIREMENTS:
You MUST output the copy elements as a structured JSON object wrapped inside a codeblock.
The object must follow this strict TypeScript structure:
{
  "headlines": [
    "Headline option 1 (Max 30-40 characters)",
    "Headline option 2",
    "Headline option 3"
  ],
  "adBody": "The primary high-converting body text. Use spacing, hooks, and bullets where relevant.",
  "hooks": [
    "Compelling hook 1 (Curiosity-based)",
    "Compelling hook 2 (Problem-based)",
    "Compelling hook 3 (Data-based)"
  ],
  "callToAction": "High-conversion CTA button text",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4"]
}

Ensure your response is valid JSON that can be parsed by JSON.parse. Wrap it inside a \`\`\`json and \`\`\` block.`;

      const responseText = await generateUnifiedAIResponse(prompt, selectedItems);

      // Extract JSON
      const jsonMatch = responseText.match(/```json([\s\S]*?)```/) || responseText.match(/\{([\s\S]*?)\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      const parsedData = JSON.parse(jsonString.trim());

      if (parsedData && parsedData.headlines && parsedData.adBody) {
        setResult(parsedData);
      } else {
        throw new Error("Parsed data was not structured correctly.");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to compile copy drafts. Check your configuration or product brief and try again!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownload = () => {
    if (!result) return;

    let text = `=========================================\n`;
    text += `MARKETING COPY SUITE: ${framework} // Channel: ${channel}\n`;
    text += `=========================================\n\n`;

    text += `### HEADLINES:\n`;
    result.headlines.forEach((hl, i) => {
      text += `${i + 1}. ${hl}\n`;
    });
    text += `\n`;

    text += `### HOOKS / VALUE PROPS:\n`;
    result.hooks.forEach((hook, i) => {
      text += `- ${hook}\n`;
    });
    text += `\n`;

    text += `### PRIMARY COPY BODY:\n`;
    text += `${result.adBody}\n\n`;

    text += `### CALL TO ACTION:\n`;
    text += `[ ${result.callToAction} ]\n\n`;

    text += `### RECOMMENDED KEYWORDS:\n`;
    text += `${result.keywords.join(', ')}\n`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing-copy-${framework}-${Date.now()}.txt`;
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
    <title>Marketing Copy suite</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 2rem; }
        .block-card { background: #111827; border: 1px solid #374151; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
    </style>
</head>
<body>
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-extrabold text-rose-500 mb-2">📢 High-Conversion Marketing copy</h1>
        <p class="text-gray-400 mb-6">Generated using the ${framework} copywriting framework optimized for ${channel}.</p>
        
        <div class="block-card">
            <h2 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Copy Highlights</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h3 class="text-rose-400 font-bold mb-2">Headlines</h3>
                    <ul class="space-y-1.5 text-sm list-disc pl-5 text-gray-300">
                        ${result.headlines.map(hl => `<li>${hl}</li>`).join('')}
                    </ul>
                </div>
                <div>
                    <h3 class="text-rose-400 font-bold mb-2">Core Hooks</h3>
                    <ul class="space-y-1.5 text-sm list-disc pl-5 text-gray-300">
                        ${result.hooks.map(hook => `<li>${hook}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>

        <div class="block-card">
            <h2 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Primary Copy Body</h2>
            <p class="text-gray-200 whitespace-pre-wrap leading-relaxed">${result.adBody}</p>
            <div class="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center">
                <span class="text-xs text-gray-500">CTA: <strong>${result.callToAction}</strong></span>
                <span class="text-xs text-gray-500">Keywords: ${result.keywords.join(', ')}</span>
            </div>
        </div>
    </div>
</body>
</html>`;

    const utf8Encode = new TextEncoder().encode(htmlContent);
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(utf8Encode)));

    const newArtifact: MediaItem = {
      id: Date.now().toString(),
      name: `Copy: ${framework} - ${channel}`,
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
          <h2 className="text-2xl font-bold flex items-center gap-2 text-rose-400">
            <Layout className="w-6 h-6" /> Marketing Copywriter
          </h2>
          <p className="text-app-dim text-xs mt-1">
            Produce ad creatives, landing page pitches, and Google or social sponsors driven by structural CRO frameworks.
          </p>
        </div>

        <div className="flex gap-2">
          {result && (
            <>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded bg-app-card border border-app-border hover:bg-app-input text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download TXT
              </button>
              <button
                onClick={handleSaveToSession}
                className="px-3 py-1.5 rounded bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {saved ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? 'Saved!' : 'Save Mockups'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">

        {/* Left Side: Setup */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-app-card border border-app-border rounded-xl p-4 md:p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-app-dim border-b border-app-border pb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-400" /> Creative Parameters
            </h3>

            {/* Knowledge base status */}
            <div className="bg-app-bg p-3 rounded border border-app-border text-xs text-app-dim space-y-2">
              <div className="flex items-center justify-between">
                <strong>Knowledge base:</strong>
                <input
                  type="checkbox"
                  checked={useSessionData}
                  onChange={(e) => setUseSessionData(e.target.checked)}
                  className="w-3.5 h-3.5 text-rose-500 bg-app-input border-app-border rounded focus:ring-rose-500 focus:ring-2"
                />
              </div>
              <p className="mt-1">
                {selectedItemsCount > 0 
                  ? `${useSessionData ? 'Using' : 'Ignoring'} ${selectedItemsCount} selected reference(s) from active session.`
                  : '⚠️ No reference files selected. Using general industry templates.'}
              </p>
            </div>

            {/* Copywriting Framework */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Copywriting Framework</label>
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-rose-500"
              >
                <option value="AIDA">AIDA (Attention, Interest, Desire, Action)</option>
                <option value="PAS">PAS (Problem, Agitate, Solve)</option>
                <option value="Feature-Benefit">Feature-Benefit (Translates stats to emotion)</option>
              </select>
            </div>

            {/* Target Channel */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Ad Format / Target Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-rose-500"
              >
                <option value="google">🖥️ Google Search Ads (Responsive text ad)</option>
                <option value="facebook">📱 Facebook Sponsored Post (Graphic captions + Link title)</option>
                <option value="landing">🏠 Landing Page Hero Copy (High-conversion Header & Call to Action)</option>
              </select>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Target Audience Persona</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-rose-500"
                placeholder="e.g. Enterprise HR directors, SaaS founders, etc."
              />
            </div>

            {/* Custom Brief */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Product Specific Brief / Instructions</label>
              <textarea
                value={customBrief}
                onChange={(e) => setCustomBrief(e.target.value)}
                rows={3}
                placeholder="Specify key product features, unique points, or value claims..."
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Generation CTA */}
            <button
              onClick={handleGenerate}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:bg-rose-850/40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Weaving High-CRO Copy...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Copy Suite
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Interactive Mockup Board */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[450px]">
          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin"></div>
                <Sparkles className="w-5 h-5 text-rose-400 absolute top-3.5 left-3.5 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-app-text">Writing Conversion Copy...</p>
              <p className="text-xs text-app-dim text-center max-w-sm">
                Parsing source facts and deploying marketing formulas to optimize cognitive engagement and click-through rates.
              </p>
            </div>
          )}

          {error && !isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 text-center">
              <AlertCircle className="w-12 h-12 text-red-500/40 mb-3" />
              <p className="text-sm font-bold text-red-400">Copywriting Failed</p>
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
              <Layout className="w-12 h-12 text-rose-500/30 mb-3" />
              <p className="text-sm font-semibold text-app-text">CRO Sandbox & Ad Mockups</p>
              <p className="text-xs max-w-sm mt-1">
                Configure your copywriting recipe on the left to see live-updating visual mockups for Google Ads, Facebook Sponsors, or Landing Pages.
              </p>
            </div>
          )}

          {!isProcessing && result && (
            <div className="flex-1 space-y-6">
              
              {/* Dynamic Mockup Presentation */}
              <div className="bg-app-card border border-app-border rounded-xl p-6 shadow-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-4 flex items-center gap-1.5">
                  <Eye className="w-4 h-4" /> Live Platform Preview Mockup
                </h4>

                {/* Google Search Ad Mockup */}
                {channel === 'google' && (
                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-left space-y-1.5 font-sans">
                    <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                      <span>Ad</span>
                      <span>·</span>
                      <span className="text-zinc-500">https://www.yourdomain.com</span>
                    </div>
                    <a href="#" className="text-blue-400 hover:underline font-medium text-base block truncate">
                      {result.headlines[0]} | {result.headlines[1] || 'Transform Your Workflow'}
                    </a>
                    <p className="text-xs text-zinc-300 leading-relaxed max-w-xl">
                      {result.adBody.slice(0, 160)}...
                    </p>
                    <div className="pt-2 flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wide">
                      <span>Sitelinks:</span>
                      <span className="text-blue-500 hover:underline cursor-pointer">{result.callToAction}</span>
                    </div>
                  </div>
                )}

                {/* Facebook Mockup */}
                {channel === 'facebook' && (
                  <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 font-sans max-w-md mx-auto">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-rose-400" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-zinc-200">Sponsored Solutions</h5>
                        <p className="text-[10px] text-zinc-500">Sponsored · Paid</p>
                      </div>
                    </div>
                    
                    {/* Caption */}
                    <p className="text-xs text-zinc-200 whitespace-pre-wrap mb-4 leading-relaxed">
                      {result.adBody}
                    </p>

                    {/* Image Placeholder */}
                    <div className="aspect-video bg-zinc-950 border border-zinc-800 rounded flex flex-col items-center justify-center gap-1 p-4 mb-3 text-center">
                      <Sparkles className="w-8 h-8 text-rose-500/30 animate-pulse" />
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{result.headlines[0]}</span>
                      <span className="text-[9px] text-zinc-600 max-w-xs">{result.hooks[0]}</span>
                    </div>

                    {/* Bottom Link Preview */}
                    <div className="bg-zinc-950 p-3 border-t border-zinc-800 flex justify-between items-center rounded-b">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-[9px] text-zinc-500 uppercase truncate">YOURDOMAIN.COM</p>
                        <h6 className="text-xs font-bold text-zinc-300 truncate">{result.headlines[1] || result.headlines[0]}</h6>
                      </div>
                      <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded text-[11px] font-semibold shrink-0">
                        {result.callToAction}
                      </button>
                    </div>
                  </div>
                )}

                {/* Landing Page Hero Mockup */}
                {channel === 'landing' && (
                  <div className="bg-zinc-950 p-6 rounded-lg border border-zinc-800 text-center font-sans space-y-4 max-w-xl mx-auto py-10">
                    <span className="inline-block px-2.5 py-1 rounded-full bg-rose-950/40 text-rose-400 border border-rose-900/40 text-[10px] font-bold uppercase tracking-wider">
                      {framework} Framework Release
                    </span>
                    <h3 className="text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight px-4">
                      {result.headlines[0]}
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                      {result.adBody.slice(0, 180)}...
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                      <button className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold transition-all shadow">
                        {result.callToAction}
                      </button>
                      <button className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded text-xs font-semibold">
                        Learn More
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid of headlines & parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Headlines List */}
                <div className="p-4 bg-app-card border border-app-border rounded-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3">Copy Alternatives</h4>
                  <div className="space-y-2">
                    {result.headlines.map((hl, i) => (
                      <div key={i} className="flex justify-between items-center p-2.5 bg-app-bg rounded border border-app-border hover:border-rose-500/20 text-xs transition-all">
                        <span className="text-app-text font-semibold truncate flex-1 mr-2">{hl}</span>
                        <button
                          onClick={() => handleCopy(hl, `hl-${i}`)}
                          className="text-[10px] text-rose-400 hover:text-rose-300 font-bold shrink-0 flex items-center gap-0.5"
                        >
                          {copiedSection === `hl-${i}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hooks List */}
                <div className="p-4 bg-app-card border border-app-border rounded-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3">Conversion Hooks</h4>
                  <div className="space-y-2">
                    {result.hooks.map((hook, i) => (
                      <div key={i} className="flex justify-between items-center p-2.5 bg-app-bg rounded border border-app-border hover:border-rose-500/20 text-xs transition-all">
                        <span className="text-app-dim truncate flex-1 mr-2">{hook}</span>
                        <button
                          onClick={() => handleCopy(hook, `hook-${i}`)}
                          className="text-[10px] text-rose-400 hover:text-rose-300 font-bold shrink-0 flex items-center gap-0.5"
                        >
                          {copiedSection === `hook-${i}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Full Text Copy Area */}
              <div className="p-4 bg-app-card border border-app-border rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">Primary Ad Body / Content Draft</h4>
                  <button
                    onClick={() => handleCopy(result.adBody, 'body')}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
                  >
                    {copiedSection === 'body' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Complete Body
                  </button>
                </div>
                <div className="p-3 bg-app-bg border border-app-border rounded text-xs text-app-text whitespace-pre-wrap leading-relaxed max-h-[150px] overflow-y-auto">
                  {result.adBody}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
