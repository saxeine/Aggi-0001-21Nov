import React, { useState } from 'react';
import { Layout, Code, Copy, Check, Download, Save, RefreshCw, AlertCircle, Eye, Monitor, Sparkles, Play, ToggleLeft, Laptop } from 'lucide-react';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';
import { MediaItem } from '../../types';

interface WebsiteBuilderProps {
  session?: any | null;
  onSaveArtifact?: (mediaItem: MediaItem) => void;
}

interface WebsiteResult {
  title: string;
  theme: string;
  copy: {
    heroHeadline: string;
    heroSubheadline: string;
    ctaText: string;
    featuresHeader: string;
    features: { title: string; desc: string; iconName: string }[];
    testimonials: { quote: string; author: string; role: string }[];
    pricingHeader: string;
    pricingPlans: { name: string; price: string; features: string[]; isPopular: boolean }[];
    footerText: string;
  };
  htmlCode: string;
}

export const WebsiteBuilder: React.FC<WebsiteBuilderProps> = ({ session, onSaveArtifact }) => {
  const [siteTopic, setSiteTopic] = useState('SaaS Analytics Dashboard');
  const [visualTheme, setVisualTheme] = useState('modern-dark');
  const [additionalDirectives, setAdditionalDirectives] = useState('');
  const [useSessionData, setUseSessionData] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<WebsiteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copiedType, setCopiedType] = useState<'code' | 'copy' | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'copy'>('preview');

  const selectedItemsCount = session?.mediaItems?.filter((item: MediaItem) =>
    session?.selectedMediaIds?.includes(item.id)
  )?.length || 0;

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

      const prompt = `Act as an expert Frontend Architect, CRO Specialist, and Award-Winning UI Designer.
Based on the provided ${useSessionData && selectedItems.length > 0 ? 'source materials' : 'specifications'}, generate a complete landing page structure, copy elements, and a single-file fully-styled HTML code block using Tailwind CSS.

WEBSITE SPECIFICATIONS:
- Landing Page Topic: ${siteTopic}
- Visual Theme: ${visualTheme} (Values: modern-dark, elegant-light, high-contrast-retro, slate-professional)
- Custom Brand Directives: ${additionalDirectives || 'Make it highly persuasive, modern, responsive, and visually stunning.'}

THEME DESIGN GUIDELINES:
- 'modern-dark': Deep dark slate/indigo backgrounds (e.g. bg-slate-950), lime or cyan neon text accents, glassmorphic card elements, glowing borders.
- 'elegant-light': Soft off-white backgrounds (e.g. bg-zinc-50), dark charcoal text (e.g. text-zinc-900), subtle pastel accents, delicate borders, elegant typography.
- 'high-contrast-retro': Pitch black backdrops, amber/orange glowing text, monospace typeface accents, pixel-like boundaries, solid color blocks.
- 'slate-professional': Refined blue-grey colors (e.g. bg-slate-900 / bg-slate-100), royal blue primary buttons, clean cards, corporate executive structure.

OUTPUT FORMAT REQUIREMENTS:
You MUST output the landing page design as a structured JSON object wrapped inside a codeblock.
The object must follow this strict TypeScript structure:
{
  "title": "Clean Page Title / Brand Name",
  "theme": "${visualTheme}",
  "copy": {
    "heroHeadline": "Catchy headline targeting primary value",
    "heroSubheadline": "Descriptive subheadline explaining how it works",
    "ctaText": "Call to action button label",
    "featuresHeader": "Features section section title",
    "features": [
      { "title": "Feature 1", "desc": "Brief feature benefits context", "iconName": "Lucide icon name (e.g. Zap, Shield, Cpu)" },
      { "title": "Feature 2", "desc": "Brief context", "iconName": "Icon name" },
      { "title": "Feature 3", "desc": "Brief context", "iconName": "Icon name" }
    ],
    "testimonials": [
      { "quote": "User feedback quoting dramatic benefit", "author": "User Name", "role": "CEO, Company" }
    ],
    "pricingHeader": "Flexible Plans for Every Stage",
    "pricingPlans": [
      { "name": "Starter", "price": "$19/mo", "features": ["Feature A", "Feature B"], "isPopular": false },
      { "name": "Growth", "price": "$49/mo", "features": ["Feature A", "Feature B", "Feature C"], "isPopular": true }
    ],
    "footerText": "© 2026 Brand. All rights reserved."
  },
  "htmlCode": "A single-file complete, responsive HTML landing page using Tailwind CSS via its CDN (<script src='https://cdn.tailwindcss.com'></script>). It MUST contain all layout components (Hero, Features Grid, Testimonials Section, Interactive-looking Pricing cards, CTA footer). Ensure all colors, layout spacers, padding, and hover states match the selected visual theme beautifully."
}

Ensure your response is valid JSON that can be parsed by JSON.parse. Wrap it inside a \`\`\`json and \`\`\` block.`;

      const responseText = await generateUnifiedAIResponse(prompt, selectedItems);

      // Extract JSON
      const jsonMatch = responseText.match(/```json([\s\S]*?)```/) || responseText.match(/\{([\s\S]*?)\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      const parsedData = JSON.parse(jsonString.trim());

      if (parsedData && parsedData.title && parsedData.htmlCode && parsedData.copy) {
        setResult(parsedData);
      } else {
        throw new Error("Parsed website data did not match the required JSON structure.");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to construct landing page. Please verify your details or try again!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyCode = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.htmlCode);
    setCopiedType('code');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyCopy = () => {
    if (!result) return;
    let textCopy = `TITLE: ${result.title}\n\n`;
    textCopy += `HERO HEADLINE: ${result.copy.heroHeadline}\n`;
    textCopy += `HERO SUBHEADLINE: ${result.copy.heroSubheadline}\n`;
    textCopy += `CTA: ${result.copy.ctaText}\n\n`;
    textCopy += `FEATURES:\n`;
    result.copy.features.forEach(f => {
      textCopy += `- ${f.title}: ${f.desc}\n`;
    });
    navigator.clipboard.writeText(textCopy);
    setCopiedType('copy');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.title.toLowerCase().replace(/\s+/g, '-')}-landing-page.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToSession = () => {
    if (!result || !onSaveArtifact) return;

    const utf8Encode = new TextEncoder().encode(result.htmlCode);
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(utf8Encode)));

    const newArtifact: MediaItem = {
      id: Date.now().toString(),
      name: `Landing Page: ${result.title}`,
      mimeType: 'text/html',
      type: 'html',
      data: base64Data
    };

    onSaveArtifact(newArtifact);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-app-bg text-app-text">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-2 border-b border-app-border pb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-sky-400">
            <Layout className="w-6 h-6" /> Website Builder
          </h2>
          <p className="text-app-dim text-xs mt-1">
            Synthesize your source context files into highly professional, fully responsive HTML/Tailwind landing page layouts and copy.
          </p>
        </div>

        <div className="flex gap-2">
          {result && (
            <>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded bg-app-card border border-app-border hover:bg-app-input text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download HTML File
              </button>
              <button
                onClick={handleSaveToSession}
                className="px-3 py-1.5 rounded bg-sky-600/20 text-sky-400 border border-sky-500/30 hover:bg-sky-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {saved ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? 'Saved to Session!' : 'Save Page HTML'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Options Board */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-app-card border border-app-border rounded-xl p-4 md:p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-app-dim border-b border-app-border pb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-400" /> Design Configuration
            </h3>

            {/* Optional Session Data Checkbox */}
            <div className="bg-app-bg p-3 rounded border border-app-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-app-text">Use Session Context</span>
                <input
                  type="checkbox"
                  checked={useSessionData}
                  onChange={(e) => setUseSessionData(e.target.checked)}
                  className="w-4 h-4 text-sky-500 bg-app-input border-app-border rounded focus:ring-sky-500 focus:ring-2"
                />
              </div>
              <p className="text-[11px] text-app-dim">
                {selectedItemsCount > 0 
                  ? `Incorporate copy & specs from the ${selectedItemsCount} selected file(s) in active session.`
                  : '⚠️ No reference files selected in active session. Standard generic layouts will be used.'}
              </p>
            </div>

            {/* Topic Input */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Landing Page Topic / Core Concept</label>
              <input
                type="text"
                value={siteTopic}
                onChange={(e) => setSiteTopic(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-sky-500"
                placeholder="SaaS Analytics Dashboard, Creative Agency, etc."
              />
            </div>

            {/* Theme Selector */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Visual Design & Vibe Theme</label>
              <select
                value={visualTheme}
                onChange={(e) => setVisualTheme(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-sky-500"
              >
                <option value="modern-dark">🌌 Modern Dark (Glowing neon accents & dark card glassmorphism)</option>
                <option value="elegant-light">☀️ Elegant Light (Clean slate, crisp margins & warm paper theme)</option>
                <option value="high-contrast-retro">📟 Retro terminal (High-contrast, amber monospace, block grid)</option>
                <option value="slate-professional">💼 Corporate Slate (Refined corporate corporate-blue grids)</option>
              </select>
            </div>

            {/* Additional Directives */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Custom Content & Copy Guidelines</label>
              <textarea
                value={additionalDirectives}
                onChange={(e) => setAdditionalDirectives(e.target.value)}
                rows={3}
                placeholder="Include a 30-day trial offer, mention integration with Slack, etc."
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Submit Action */}
            <button
              onClick={handleGenerate}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-sky-850/40 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Assembling Visual Canvas...
                </>
              ) : (
                <>
                  <Laptop className="w-4 h-4" />
                  Generate Landing Page
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Preview Workbench */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[450px]">
          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-sky-500/20 border-t-sky-500 animate-spin"></div>
                <Layout className="w-5 h-5 text-sky-400 absolute top-3.5 left-3.5 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-app-text">Generating Code, Copy & Layout...</p>
              <p className="text-xs text-app-dim text-center max-w-sm">
                Formulating layout blocks, writing customized performance marketing copy, and coding the responsive HTML with Tailwind CSS.
              </p>
            </div>
          )}

          {error && !isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 text-center">
              <AlertCircle className="w-12 h-12 text-red-500/40 mb-3" />
              <p className="text-sm font-bold text-red-400">Design Failed</p>
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
              <Layout className="w-12 h-12 text-sky-500/30 mb-3" />
              <p className="text-sm font-semibold text-app-text">Dynamic Visual Workbench</p>
              <p className="text-xs max-w-sm mt-1">
                Configure your proposed landing page layout and visual vibe on the left, then click Generate to render code, copy, and visual design layouts.
              </p>
            </div>
          )}

          {!isProcessing && result && (
            <div className="flex-1 flex flex-col bg-app-card border border-app-border rounded-xl overflow-hidden shadow">
              {/* Tab Bar */}
              <div className="flex items-center justify-between border-b border-app-border bg-app-bg px-4 py-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === 'preview' ? 'bg-sky-600/10 text-sky-400 border border-sky-500/30' : 'text-app-dim hover:text-app-text'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Live Visual Design
                  </button>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === 'code' ? 'bg-sky-600/10 text-sky-400 border border-sky-500/30' : 'text-app-dim hover:text-app-text'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" /> HTML/Tailwind Code
                  </button>
                  <button
                    onClick={() => setActiveTab('copy')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === 'copy' ? 'bg-sky-600/10 text-sky-400 border border-sky-500/30' : 'text-app-dim hover:text-app-text'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Marketing Copy
                  </button>
                </div>

                <div>
                  {activeTab === 'code' && (
                    <button
                      onClick={handleCopyCode}
                      className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition-colors"
                    >
                      {copiedType === 'code' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedType === 'code' ? 'Copied Code!' : 'Copy Code'}
                    </button>
                  )}
                  {activeTab === 'copy' && (
                    <button
                      onClick={handleCopyCopy}
                      className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition-colors"
                    >
                      {copiedType === 'copy' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedType === 'copy' ? 'Copied Copy Elements!' : 'Copy Copy Elements'}
                    </button>
                  )}
                </div>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 min-h-[350px] relative">
                {activeTab === 'preview' && (
                  <iframe
                    title="Landing Page Live Preview"
                    srcDoc={result.htmlCode}
                    className="w-full h-[55vh] border-0 bg-white"
                  />
                )}

                {activeTab === 'code' && (
                  <div className="p-4 bg-zinc-950 h-[55vh] overflow-y-auto">
                    <pre className="text-xs font-mono text-lime-400 leading-relaxed whitespace-pre-wrap">
                      {result.htmlCode}
                    </pre>
                  </div>
                )}

                {activeTab === 'copy' && (
                  <div className="p-5 overflow-y-auto h-[55vh] space-y-6">
                    {/* Brand Meta */}
                    <div className="border-b border-app-border pb-4">
                      <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Brand Name</span>
                      <h4 className="text-xl font-bold text-app-text mt-1">{result.title}</h4>
                    </div>

                    {/* Hero Section Copy */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Hero Banner Text</span>
                      <h5 className="font-bold text-sm text-app-text">{result.copy.heroHeadline}</h5>
                      <p className="text-xs text-app-dim leading-relaxed">{result.copy.heroSubheadline}</p>
                      <div className="inline-block px-3 py-1.5 bg-sky-600 text-black font-bold text-xs rounded mt-1">
                        {result.copy.ctaText}
                      </div>
                    </div>

                    {/* Features section */}
                    <div className="space-y-3">
                      <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Core Feature Pillars</span>
                      <h5 className="font-bold text-xs text-app-text">{result.copy.featuresHeader}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {result.copy.features.map((feat, idx) => (
                          <div key={idx} className="p-3 bg-app-bg border border-app-border rounded-lg">
                            <h6 className="font-semibold text-xs text-app-text mb-1 flex items-center gap-1">
                              <span className="text-sky-400">✦</span> {feat.title}
                            </h6>
                            <p className="text-[11px] text-app-dim leading-relaxed">{feat.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pricing section */}
                    <div className="space-y-3">
                      <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Pricing Structures</span>
                      <h5 className="font-bold text-xs text-app-text">{result.copy.pricingHeader}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.copy.pricingPlans.map((plan, idx) => (
                          <div key={idx} className={`p-4 rounded-xl border ${plan.isPopular ? 'border-sky-500 bg-sky-500/5' : 'border-app-border bg-app-bg'}`}>
                            <div className="flex justify-between items-center mb-1">
                              <h6 className="font-bold text-xs text-app-text">{plan.name}</h6>
                              {plan.isPopular && <span className="bg-sky-500 text-black font-bold text-[9px] px-1.5 py-0.5 rounded-full">POPULAR</span>}
                            </div>
                            <span className="text-lg font-bold text-app-text">{plan.price}</span>
                            <ul className="text-[10px] text-app-dim space-y-1 mt-2 list-disc pl-4">
                              {plan.features.map((f, fIdx) => (
                                <li key={fIdx}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
