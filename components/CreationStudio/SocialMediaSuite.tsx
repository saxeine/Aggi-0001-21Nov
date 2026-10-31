import React, { useState } from 'react';
import { Share2, Copy, Check, Download, Save, RefreshCw, Send, Sparkles, Layout, Eye, MessageSquare, Heart } from 'lucide-react';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';
import { MediaItem } from '../../types';

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

interface SocialMediaSuiteProps {
  session?: any | null;
  onSaveArtifact?: (mediaItem: MediaItem) => void;
}

export const SocialMediaSuite: React.FC<SocialMediaSuiteProps> = ({ session, onSaveArtifact }) => {
  const [tone, setTone] = useState('Professional & Engaging');
  const [focus, setFocus] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin', 'twitter', 'instagram']);
  const [useSessionData, setUseSessionData] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    linkedin?: string;
    twitter?: string[];
    instagram?: string;
  } | null>(null);
  
  const [activePreviewTab, setActivePreviewTab] = useState<'linkedin' | 'twitter' | 'instagram'>('linkedin');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const togglePlatform = (id: string) => {
    if (selectedPlatforms.includes(id)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter(p => p !== id));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, id]);
    }
  };

  const handleGenerate = async () => {
    setIsProcessing(true);
    setResult(null);
    setCopiedField(null);
    setSaved(false);

    try {
      // Collect selected media items from the current active session
      const selectedItems = useSessionData 
        ? (session?.mediaItems?.filter((item: MediaItem) =>
            session?.selectedMediaIds?.includes(item.id)
          ) || [])
        : [];

      const prompt = `Act as a world-class Social Media Strategist and Viral Growth Expert. 
Based on the ${selectedItems.length > 0 ? 'provided source material' : 'specifications'} and the following user specifications, generate highly engaging social media posts.

USER SPECIFICATIONS:
- Tone: ${tone}
- Focus/Custom Instructions: ${focus || 'Summarize the core takeaways and make it engaging.'}
- Platforms to generate: ${selectedPlatforms.join(', ')}

OUTPUT REQUIREMENTS (IMPORTANT - Follow this exact structure):
We need the output structured so we can parse each platform. Please format your reply exactly as follows, with the specific delimiters:

[LINKEDIN_START]
(Write a professional, thought-provoking LinkedIn post. Use 2-3 paragraph spacing, bold hook, and 3-5 relevant hashtags. Maintain an expert, thought-leadership style)
[LINKEDIN_END]

[TWITTER_START]
(Write a Twitter thread of 3-5 tweets. Separate each tweet with --- on its own line. Make sure each tweet fits within character limits, is punchy, and uses numbering or transitions)
[TWITTER_END]

[INSTAGRAM_START]
(Write a highly visual, aesthetic Instagram caption. Start with a hook, include emojis, bulleted takeaways, call to action, and a block of hashtags separated by dots)
[INSTAGRAM_END]

Return ONLY the text in this format.`;

      const responseText = await generateUnifiedAIResponse(prompt, selectedItems);

      // Parse the output
      const linkedinMatch = responseText.match(/\[LINKEDIN_START\]([\s\S]*?)\[LINKEDIN_END\]/);
      const twitterMatch = responseText.match(/\[TWITTER_START\]([\s\S]*?)\[TWITTER_END\]/);
      const instagramMatch = responseText.match(/\[INSTAGRAM_START\]([\s\S]*?)\[INSTAGRAM_END\]/);

      const parsedResult: any = {};
      if (linkedinMatch) {
        parsedResult.linkedin = linkedinMatch[1].trim();
      } else {
        // Fallback simple parsing if delimiters missed
        parsedResult.linkedin = responseText.substring(0, 1000);
      }

      if (twitterMatch) {
        parsedResult.twitter = twitterMatch[1].trim().split(/\n---\n|---/).map(t => t.trim()).filter(Boolean);
      } else {
        parsedResult.twitter = ["Check out these latest insights from our aggregator!", "We have processed multiple media channels into structured knowledge.", "Join the discussion today!"];
      }

      if (instagramMatch) {
        parsedResult.instagram = instagramMatch[1].trim();
      } else {
        parsedResult.instagram = "Latest insights parsed and consolidated. 🚀\n\nLink in bio to read full briefings.\n\n#media #tech #aggregation #learning";
      }

      setResult(parsedResult);
      // Set active preview tab based on what was generated
      if (parsedResult.linkedin) setActivePreviewTab('linkedin');
      else if (parsedResult.twitter) setActivePreviewTab('twitter');
      else if (parsedResult.instagram) setActivePreviewTab('instagram');
    } catch (e) {
      console.error(e);
      setResult({
        linkedin: "Failed to generate social media suite. Please try again."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadSuite = () => {
    if (!result) return;
    
    let mdText = `# Social Media Suite\n\nGenerated with AI on ${new Date().toLocaleDateString()}\n\n`;
    if (result.linkedin) {
      mdText += `## LinkedIn Post\n\n${result.linkedin}\n\n---\n\n`;
    }
    if (result.twitter) {
      mdText += `## X/Twitter Thread\n\n`;
      result.twitter.forEach((tweet, idx) => {
        mdText += `### Tweet ${idx + 1}\n\n${tweet}\n\n`;
      });
      mdText += `\n---\n\n`;
    }
    if (result.instagram) {
      mdText += `## Instagram Caption\n\n${result.instagram}\n\n`;
    }

    const blob = new Blob([mdText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `social-media-suite-${Date.now()}.md`;
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
    <title>Social Media Suite</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 2rem; }
        .suite-card { background: #111827; border: 1px solid #374151; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
        h1 { font-size: 1.75rem; color: #f472b6; font-weight: 800; margin-bottom: 1.5rem; border-bottom: 2px solid #ec4899; padding-bottom: 0.5rem; }
        h2 { font-size: 1.25rem; color: #9ca3af; margin-bottom: 1rem; border-bottom: 1px solid #1f2937; padding-bottom: 0.25rem; }
        .platform-tag { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold; margin-bottom: 0.75rem; }
    </style>
</head>
<body>
    <div class="max-w-4xl mx-auto">
        <h1>📲 Generated Social Media Suite</h1>
        
        ${result.linkedin ? `
        <div class="suite-card">
            <span class="platform-tag bg-blue-900/40 text-blue-400 border border-blue-800">LINKEDIN</span>
            <div style="white-space: pre-wrap; line-height: 1.6;">${result.linkedin}</div>
        </div>
        ` : ''}

        ${result.twitter ? `
        <div class="suite-card">
            <span class="platform-tag bg-zinc-800 text-zinc-300 border border-zinc-700">X (TWITTER) THREAD</span>
            <div class="space-y-4">
                ${result.twitter.map((tweet, i) => `
                <div style="padding: 12px; background: #1f2937; border-radius: 8px;">
                    <strong>Tweet ${i + 1}/${result.twitter?.length}:</strong>
                    <p style="white-space: pre-wrap; margin-top: 4px;">${tweet}</p>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${result.instagram ? `
        <div class="suite-card">
            <span class="platform-tag bg-pink-900/40 text-pink-400 border border-pink-800">INSTAGRAM</span>
            <div style="white-space: pre-wrap; line-height: 1.6;">${result.instagram}</div>
        </div>
        ` : ''}
    </div>
</body>
</html>`;

    const utf8Encode = new TextEncoder().encode(htmlContent);
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(utf8Encode)));
    
    const newArtifact: MediaItem = {
      id: Date.now().toString(),
      name: `Social Suite: ${tone}`,
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
          <h2 className="text-2xl font-bold flex items-center gap-2 text-pink-400">
            <Share2 className="w-6 h-6" /> Social Media Suite
          </h2>
          <p className="text-app-dim text-xs mt-1">
            Turn your consolidated source files and links into viral social posts and threads.
          </p>
        </div>
        
        <div className="flex gap-2">
          {result && (
            <>
              <button
                onClick={handleDownloadSuite}
                className="px-3 py-1.5 rounded bg-app-card border border-app-border hover:bg-app-input text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Download Markdown File"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              <button
                onClick={handleSaveToSession}
                className="px-3 py-1.5 rounded bg-pink-600/20 text-pink-400 border border-pink-500/30 hover:bg-pink-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Save as HTML Artifact to Session"
              >
                {saved ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? 'Saved!' : 'Save to Session'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Left Control Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-app-card border border-app-border rounded-xl p-4 md:p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-app-dim border-b border-app-border pb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-pink-400" /> Suite Customizer
            </h3>

            {/* Source Reference Summary */}
            <div className="bg-app-bg p-3 rounded border border-app-border text-xs space-y-2">
              <div className="flex items-center justify-between">
                <strong className="text-app-text">Source context:</strong>
                <input
                  type="checkbox"
                  checked={useSessionData}
                  onChange={(e) => setUseSessionData(e.target.checked)}
                  className="w-3.5 h-3.5 text-pink-500 bg-app-input border-app-border rounded focus:ring-pink-500 focus:ring-2"
                />
              </div>
              <p className="text-app-dim">
                {selectedItemsCount > 0 
                  ? `${useSessionData ? 'Using' : 'Ignoring'} ${selectedItemsCount} selected source file(s) / web links from active session.` 
                  : '⚠️ No source media selected. Please go back and select media items in your chat session to ground the generation.'}
              </p>
            </div>

            {/* Tone selector */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Tone of Voice</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-pink-500"
              >
                <option value="Professional & Engaging">👔 Professional & Thought Leadership (LinkedIn standard)</option>
                <option value="Viral & Hook-heavy">⚡ Viral, Bold & Punchy (Great for X/Twitter growth)</option>
                <option value="Casual & Relatable">🍕 Casual, Personal & Conversational</option>
                <option value="Highly Technical / Deep-dive">🔬 Analytical & Technical Deep-dive</option>
                <option value="Educational & Step-by-step">📚 Educational with actionable steps</option>
                <option value="Sarcastic & Witty">🎭 Sarcastic, Witty & Humorous</option>
              </select>
            </div>

            {/* Custom Focus Prompt */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-1.5">Custom Angle / Focus (Optional)</label>
              <textarea
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                rows={3}
                placeholder="e.g. Focus on the environmental impact, or add a CTA for our upcoming webinar on Friday..."
                className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-xs text-app-text focus:outline-none focus:border-pink-500"
              />
            </div>

            {/* Platforms selectors */}
            <div>
              <label className="block text-xs font-semibold text-app-text mb-2">Target Platforms</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => togglePlatform('linkedin')}
                  className={`py-2 rounded text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                    selectedPlatforms.includes('linkedin')
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                      : 'bg-app-input text-app-dim border-app-border hover:text-app-text'
                  }`}
                >
                  <LinkedinIcon className="w-3.5 h-3.5" /> LinkedIn
                </button>
                <button
                  type="button"
                  onClick={() => togglePlatform('twitter')}
                  className={`py-2 rounded text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                    selectedPlatforms.includes('twitter')
                      ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      : 'bg-app-input text-app-dim border-app-border hover:text-app-text'
                  }`}
                >
                  <TwitterIcon className="w-3.5 h-3.5" /> X / Twitter
                </button>
                <button
                  type="button"
                  onClick={() => togglePlatform('instagram')}
                  className={`py-2 rounded text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                    selectedPlatforms.includes('instagram')
                      ? 'bg-pink-600/20 text-pink-400 border-pink-500/50'
                      : 'bg-app-input text-app-dim border-app-border hover:text-app-text'
                  }`}
                >
                  <InstagramIcon className="w-3.5 h-3.5" /> Instagram
                </button>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleGenerate}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-lg bg-pink-600 hover:bg-pink-500 disabled:bg-pink-800/40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-pink-900/10"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing Sources & Crafting Posts...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Generate Suite
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Output/Preview Panels */}
        <div className="lg:col-span-7 flex flex-col h-full min-h-[450px]">
          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-pink-500/20 border-t-pink-500 animate-spin"></div>
                <Share2 className="w-5 h-5 text-pink-400 absolute top-3.5 left-3.5 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-app-text">Generating Social Media Suite...</p>
              <p className="text-xs text-app-dim text-center max-w-sm">
                Evaluating selected file structures, links, and documents to assemble cohesive, platform-specific copywriting sets.
              </p>
            </div>
          )}

          {!isProcessing && !result && (
            <div className="flex-1 flex flex-col items-center justify-center bg-app-card border border-app-border rounded-xl p-10 text-center text-app-dim">
              <Layout className="w-12 h-12 text-pink-500/30 mb-3" />
              <p className="text-sm font-semibold text-app-text">Preview Social Media Feed</p>
              <p className="text-xs max-w-sm mt-1">
                Customize your settings on the left panel and click "Generate Suite" to create and preview professional feed posts.
              </p>
            </div>
          )}

          {!isProcessing && result && (
            <div className="flex-1 flex flex-col bg-app-card border border-app-border rounded-xl overflow-hidden">
              {/* Tab Selector */}
              <div className="bg-app-bg/50 border-b border-app-border p-2 flex gap-1.5">
                {result.linkedin && (
                  <button
                    onClick={() => setActivePreviewTab('linkedin')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activePreviewTab === 'linkedin'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-app-dim hover:text-app-text hover:bg-app-input'
                    }`}
                  >
                    <LinkedinIcon className="w-3.5 h-3.5" /> LinkedIn Post
                  </button>
                )}
                {result.twitter && (
                  <button
                    onClick={() => setActivePreviewTab('twitter')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activePreviewTab === 'twitter'
                        ? 'bg-zinc-800 text-zinc-100 shadow border border-zinc-700'
                        : 'text-app-dim hover:text-app-text hover:bg-app-input'
                    }`}
                  >
                    <TwitterIcon className="w-3.5 h-3.5" /> X (Twitter) Thread
                  </button>
                )}
                {result.instagram && (
                  <button
                    onClick={() => setActivePreviewTab('instagram')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activePreviewTab === 'instagram'
                        ? 'bg-pink-600 text-white shadow'
                        : 'text-app-dim hover:text-app-text hover:bg-app-input'
                    }`}
                  >
                    <InstagramIcon className="w-3.5 h-3.5" /> Instagram Grid
                  </button>
                )}
              </div>

              {/* Preview Content Container */}
              <div className="p-4 md:p-6 flex-1 overflow-y-auto bg-app-bg/10">
                
                {/* LinkedIn Feed Mockup */}
                {activePreviewTab === 'linkedin' && result.linkedin && (
                  <div className="space-y-4 max-w-lg mx-auto">
                    <div className="bg-[#1d2226] border border-zinc-800 rounded-xl p-4 font-sans text-white text-[14px]">
                      {/* LinkedIn Header */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm text-white">ME</div>
                        <div>
                          <div className="font-bold text-[14px] hover:underline hover:text-blue-400 cursor-pointer">Aggregator Executive</div>
                          <div className="text-[12px] text-zinc-400">Chief of Staff & Publisher • 1st</div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1">Just now • <span className="text-[10px]">🌐</span></div>
                        </div>
                      </div>
                      
                      {/* Post body */}
                      <p className="whitespace-pre-wrap leading-relaxed text-zinc-200">{result.linkedin}</p>

                      {/* Mock Interactive Bar */}
                      <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between text-zinc-400 text-xs font-bold px-2">
                        <button className="flex items-center gap-1 hover:text-blue-400"><Heart className="w-4 h-4" /> Like</button>
                        <button className="flex items-center gap-1 hover:text-blue-400"><MessageSquare className="w-4 h-4" /> Comment</button>
                        <button className="flex items-center gap-1 hover:text-blue-400"><Share2 className="w-4 h-4" /> Share</button>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleCopyText(result.linkedin || '', 'linkedin')}
                      className="w-full py-2 border border-app-border bg-app-card hover:bg-app-input text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {copiedField === 'linkedin' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy LinkedIn Post
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* X/Twitter Feed Mockup */}
                {activePreviewTab === 'twitter' && result.twitter && (
                  <div className="space-y-4 max-w-lg mx-auto">
                    <div className="space-y-3">
                      {result.twitter.map((tweet, idx) => (
                        <div key={idx} className="bg-black border border-zinc-800 rounded-xl p-4 font-sans text-white text-[15px] relative">
                          {/* Thread line linking tweets */}
                          {idx < (result.twitter?.length || 0) - 1 && (
                            <div className="absolute left-9 top-14 bottom-0 w-[2px] bg-zinc-800 z-0"></div>
                          )}
                          
                          <div className="flex gap-3 relative z-10">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm text-zinc-400">X</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold hover:underline cursor-pointer">@aggregator_ai</span>
                                <span className="text-zinc-500 text-sm">@{session?.name?.toLowerCase().replace(/\s+/g, '') || 'workspace'} • Just now</span>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap leading-relaxed text-zinc-100">{tweet}</p>
                              
                              {/* Bottom counters */}
                              <div className="flex justify-between max-w-xs text-zinc-500 text-xs mt-3 pt-1">
                                <span>💬 12</span>
                                <span>🔁 48</span>
                                <span>❤️ 156</span>
                                <span>📊 1.2K</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleCopyText(result.twitter?.join('\n\n---\n\n') || '', 'twitter')}
                      className="w-full py-2 border border-app-border bg-app-card hover:bg-app-input text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {copiedField === 'twitter' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" /> Copied Thread!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Entire Thread
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Instagram Mockup */}
                {activePreviewTab === 'instagram' && result.instagram && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden font-sans text-white text-[14px]">
                      {/* Inst Header */}
                      <div className="flex items-center gap-2 p-3 border-b border-zinc-900">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 flex items-center justify-center font-bold text-xs p-[1.5px]">
                          <div className="bg-black w-full h-full rounded-full flex items-center justify-center text-[10px]">AI</div>
                        </div>
                        <span className="font-bold text-xs hover:underline cursor-pointer">workspace_briefings</span>
                      </div>
                      
                      {/* Image Placeholders */}
                      <div className="aspect-square bg-zinc-900 flex flex-col items-center justify-center text-center p-6 border-b border-zinc-900 relative">
                        <div className="absolute top-3 right-3 bg-black/60 text-[10px] px-2 py-0.5 rounded-full font-bold">1/1</div>
                        <Eye className="w-10 h-10 text-pink-500/40 mb-2" />
                        <span className="text-xs font-bold uppercase tracking-wider text-pink-400">Aggregated Insights Graphic</span>
                        <span className="text-[10px] text-zinc-500 mt-1 max-w-xs">
                          {session?.name ? `Context: ${session.name}` : 'Source collection dataset report visual reference'}
                        </span>
                      </div>

                      {/* Caption details */}
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-3 text-lg mb-1">
                          <button className="hover:text-red-500">❤️</button>
                          <button className="hover:text-blue-400">💬</button>
                          <button className="hover:text-yellow-400">📤</button>
                        </div>
                        <div className="font-bold text-xs">1,248 likes</div>
                        <div>
                          <span className="font-bold text-xs mr-1.5">workspace_briefings</span>
                          <span className="whitespace-pre-wrap leading-relaxed text-zinc-200 text-xs">{result.instagram}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyText(result.instagram || '', 'instagram')}
                      className="w-full py-2 border border-app-border bg-app-card hover:bg-app-input text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {copiedField === 'instagram' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" /> Copied Caption!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Instagram Caption
                        </>
                      )}
                    </button>
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
