import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Palette, Type, Upload, Download, RefreshCw, 
  ChevronRight, Compass, ShieldAlert, Check, TrendingUp, HelpCircle 
} from 'lucide-react';
import { themeStyles } from '../../constants/creativeStudioTheme';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';

interface TitleHook {
  title: string;
  ctrRating: string;
  psychology: string;
}

interface ThumbnailProps {
  onBack?: () => void;
  localTheme: string;
}

export const ThumbnailHookSuite: React.FC<ThumbnailProps> = ({ onBack, localTheme }) => {
  const st = themeStyles[localTheme] || themeStyles.charcoal;

  const [rawTitle, setRawTitle] = useState('My Coding App Project Showcase');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hooks, setHooks] = useState<TitleHook[]>([
    {
      title: 'I Built a Full-Stack Media Suite in 5 Minutes (And It Actually Works!)',
      ctrRating: '9.2% (Very High)',
      psychology: 'Curiosity combined with a time constraint and proof of success.'
    },
    {
      title: 'Why Everyone Is Switching to This New Coding AI Studio',
      ctrRating: '8.5% (High)',
      psychology: 'FOMO (Fear Of Missing Out) and industry standard alignment.'
    }
  ]);

  // Thumbnail Composition State
  const [thumbnailBg, setThumbnailBg] = useState('linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)');
  const [overlayText, setOverlayText] = useState('CODE CRACKED!');
  const [textSize, setTextSize] = useState('text-3xl');
  const [textColor, setTextColor] = useState('#f59e0b'); // amber
  const [textY, setTextY] = useState('top-6'); // top-6, bottom-6, middle
  const [hasFace, setHasFace] = useState(true);
  const [platform, setPlatform] = useState<'YouTube' | 'TikTok' | 'Instagram'>('YouTube');
  const [ctrScore, setCtrScore] = useState(72);

  const calculateCtrScore = () => {
    let score = 50;
    if (overlayText && overlayText.length < 15) score += 15;
    if (textColor === '#f59e0b' || textColor === '#ef4444') score += 10;
    if (hasFace) score += 15;
    if (thumbnailBg.includes('linear-gradient') === false) score += 10; // real image upload
    setCtrScore(Math.min(98, score));
  };

  useEffect(() => {
    calculateCtrScore();
  }, [overlayText, textColor, hasFace, thumbnailBg]);

  const handleSuggestHooks = async () => {
    if (!rawTitle.trim()) return;
    setIsGenerating(true);
    try {
      const prompt = `You are a high-conversion viral content strategist and thumbnail script doctor. Suggest 3 highly catchy alternative titles/hooks for: "${rawTitle}".
Response must be a raw JSON array of objects (no markdown wrappers):
[
  {
    "title": "Hook Alternative 1",
    "ctrRating": "9.5% (Extremely High)",
    "psychology": "Explain why this hook stimulates clicks..."
  }
]`;
      const response = await generateUnifiedAIResponse(prompt);
      const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleaned);
      if (Array.isArray(data)) {
        setHooks(data);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to parse hooks. Try a shorter baseline title!");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setThumbnailBg(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`p-6 min-h-screen ${st.bg} text-slate-100 flex flex-col gap-6 animate-fade-in`}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Compass className="text-rose-400 w-5 h-5" />
            Thumbnail & Hook Suite
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Simulate video cards, overlay timeline players, write high-CTR hooks with AI, and view your thumb in recommendation feeds.
          </p>
        </div>
        <div className="flex gap-2">
          {onBack && (
            <button onClick={onBack} className={`px-3 py-1.5 rounded text-xs font-bold border ${st.border} ${st.btnInactive}`}>
              Back
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Thumbnail Composition Canvas */}
        <div className="lg:col-span-5 space-y-4">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Composition Canvas</span>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            {/* Visualizer Frame */}
            <div 
              className="aspect-video w-full flex items-center justify-center bg-slate-950 relative overflow-hidden"
              style={thumbnailBg.startsWith('linear-gradient') ? { background: thumbnailBg } : { backgroundImage: `url('${thumbnailBg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              
              {/* Overlay Text */}
              {overlayText && (
                <div className={`absolute left-6 right-6 text-center select-none ${
                  textY === 'top-6' ? 'top-6' : textY === 'bottom-6' ? 'bottom-20' : 'top-1/2 -translate-y-1/2'
                }`}>
                  <span 
                    className={`${textSize} font-extrabold tracking-tight uppercase px-4 py-1.5 bg-black/85 rounded-lg border border-slate-800 inline-block`}
                    style={{ color: textColor }}
                  >
                    {overlayText}
                  </span>
                </div>
              )}

              {/* Simulated Face Overlay (extremely common in thumbnails) */}
              {hasFace && (
                <div className="absolute bottom-0 right-0 h-[85%] w-[45%] flex items-end justify-center pointer-events-none">
                  {/* Stylized face avatar drawing */}
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-amber-400 bg-slate-850 flex items-center justify-center animate-pulse">
                    <span className="text-3xl">🤩</span>
                  </div>
                </div>
              )}

              {/* YouTube elapsed time or platforms border overlay */}
              {platform === 'YouTube' && (
                <>
                  <div className="absolute bottom-2 left-2 right-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-rose-600" />
                  </div>
                  <span className="absolute bottom-4 right-4 bg-slate-950/90 border border-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono">
                    14:15
                  </span>
                </>
              )}

              {platform === 'TikTok' && (
                <div className="absolute inset-0 border-2 border-cyan-400/20 p-3 flex flex-col justify-between pointer-events-none">
                  <span className="text-[10px] text-cyan-400 font-bold bg-black/60 px-1.5 rounded self-start">TikTok Simulation</span>
                  <div className="space-y-1">
                    <div className="w-6 h-6 rounded-full bg-slate-800 border" />
                    <div className="w-10 h-1.5 bg-slate-700 rounded" />
                  </div>
                </div>
              )}

              {platform === 'Instagram' && (
                <div className="absolute inset-0 border-2 border-fuchsia-400/20 p-3 flex flex-col justify-between pointer-events-none">
                  <span className="text-[10px] text-fuchsia-400 font-bold bg-black/60 px-1.5 rounded self-start">IG Reel Simulation</span>
                  <div className="w-6 h-6 rounded bg-slate-800 border self-end" />
                </div>
              )}
            </div>

            {/* Canvas Customizer Tools */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Canvas Text</label>
                  <input
                    type="text"
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Overlay Position</label>
                  <select
                    value={textY}
                    onChange={(e) => setTextY(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                  >
                    <option value="top-6">Top Header</option>
                    <option value="middle">Center Stage</option>
                    <option value="bottom-6">Bottom Overlay</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center flex-wrap gap-2 pt-2 border-t border-slate-900">
                <div className="flex items-center gap-1.5">
                  {['#f59e0b', '#ef4444', '#10b981', '#ffffff'].map(c => (
                    <button
                      key={c}
                      onClick={() => setTextColor(c)}
                      className={`w-5 h-5 rounded-full border ${textColor === c ? 'border-white scale-110' : 'border-slate-800'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <div className="flex gap-3 items-center">
                  <label className="text-[10px] text-slate-400 font-bold flex items-center gap-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasFace}
                      onChange={(e) => setHasFace(e.target.checked)}
                      className="accent-rose-500"
                    />
                    Add Expressive Face
                  </label>

                  <label className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded cursor-pointer">
                    Upload BG
                    <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Platform Simulator selector */}
              <div className="pt-3 border-t border-slate-900 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold">Simulator Device</span>
                <div className="flex gap-1 bg-slate-900 p-0.5 rounded border border-slate-850">
                  {(['YouTube', 'TikTok', 'Instagram'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`px-2 py-1 rounded text-[10px] font-bold ${platform === p ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Visual CTR Score Analysis */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Predicted CTR Hook Quality</span>
              <p className="text-xs text-slate-300">Analysis indicates {ctrScore > 75 ? 'Optimal high-contrast visibility!' : 'Consider vibrant red or yellow text for more contrast.'}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-mono font-extrabold text-amber-400">{ctrScore}%</span>
              <span className="text-[9px] text-slate-500 block uppercase font-bold">Mock Score</span>
            </div>
          </div>
        </div>

        {/* Right Side: AI Hooks and Alternatives */}
        <div className="lg:col-span-7 space-y-4">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Headline Hook Generator</span>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">Baseline Video/Content Title</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rawTitle}
                  onChange={(e) => setRawTitle(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                />
                <button
                  onClick={handleSuggestHooks}
                  disabled={isGenerating || !rawTitle.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 disabled:opacity-40"
                >
                  {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Suggest Hooks
                </button>
              </div>
            </div>

            {/* Suggestions list */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              {hooks.map((hk, i) => (
                <div key={i} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-extrabold text-slate-200 leading-relaxed font-sans flex-1">"{hk.title}"</p>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold whitespace-nowrap">
                      {hk.ctrRating}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    <span className="text-rose-400 font-bold not-italic">Strategy:</span> {hk.psychology}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Social Recommendation Feed Simulation Mockup */}
          <div className="space-y-2">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Feed Placement Simulation</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Our Mock Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                <div 
                  className="aspect-video w-full flex items-center justify-center bg-slate-950 relative"
                  style={thumbnailBg.startsWith('linear-gradient') ? { background: thumbnailBg } : { backgroundImage: `url('${thumbnailBg}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  {overlayText && (
                    <span className="absolute top-2 left-2 text-[8px] font-bold px-1.5 py-0.5 bg-black/80 rounded border text-amber-400">
                      {overlayText}
                    </span>
                  )}
                  <span className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-[8px] text-slate-400">14:15</span>
                </div>
                <div className="p-3 space-y-1">
                  <h4 className="text-xs font-bold text-slate-100 line-clamp-2">{hooks[0]?.title || rawTitle}</h4>
                  <span className="text-[10px] text-slate-400 block">Creator Studio • 12K views • 2 hours ago</span>
                </div>
              </div>

              {/* Standard Noise Card */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden opacity-50">
                <div className="aspect-video w-full bg-slate-950 flex items-center justify-center text-xs text-slate-600 uppercase font-mono">
                  Competitor Thumbnail
                </div>
                <div className="p-3 space-y-1">
                  <h4 className="text-xs font-bold text-slate-300 line-clamp-2">10 Shocking Secrets About New AI Models...</h4>
                  <span className="text-[10px] text-slate-500 block">ViralTech • 200K views • 1 day ago</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
