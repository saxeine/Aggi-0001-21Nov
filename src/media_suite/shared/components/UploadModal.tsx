import React, { useState, useRef } from 'react';
import { 
  X, Upload, Film, FileVideo, Plus, Sparkles, Image as ImageIcon, AlertTriangle, Play, HelpCircle
} from 'lucide-react';
import { cn } from '../utils/cn';

interface UploadModalProps {
  onUpload: (files: FileList | File[]) => void;
  onSelectSample: (type: 'adventure' | 'scifi' | 'commercial') => void;
  onClose: () => void;
  isProcessing?: boolean;
  processProgress?: number;
}

export default function UploadModal({ onUpload, onSelectSample, onClose, isProcessing = false, processProgress = 0 }: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'samples' | 'ai-script'>('upload');
  
  // Script and frame extractor helper states
  const [scriptTopic, setScriptTopic] = useState('');
  const [scriptStyle, setScriptStyle] = useState('Cinematic Adventure');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // AI Script Storyboarding Generation
  const handleGenerateScript = async () => {
    if (!scriptTopic.trim()) return;
    setIsGeneratingScript(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const saved = localStorage.getItem('gemini_media_aggregator_settings');
        if (saved) {
          const settings = JSON.parse(saved);
          if (settings.geminiApiKey) {
            headers['x-gemini-key'] = settings.geminiApiKey;
          }
        }
      } catch (e) {
        console.warn("Failed to retrieve custom Gemini API key from settings", e);
      }

      const response = await fetch('/api/gemini/generate-script', {
        method: 'POST',
        headers,
        body: JSON.stringify({ topic: scriptTopic, style: scriptStyle })
      });
      const data = await response.json();
      if (data.success && data.script) {
        setGeneratedScript(data.script);
      } else {
        alert(data.error || 'Failed to generate script');
      }
    } catch (err) {
      console.error(err);
      alert('Error generating storyboard script');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Create empty storyboard from the generated script structure
  const startFromScript = () => {
    if (!generatedScript) return;
    
    // Create mock storyboard frames using the lines from script
    const sampleScriptFrames = [
      {
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1280&auto=format&fit=crop&q=80',
        name: 'Scene 1: The Discovery',
        desc: 'Wide shot of ancient ruins buried under red desert sand. Golden hour lighting casts long shadows.'
      },
      {
        url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1280&auto=format&fit=crop&q=80',
        name: 'Scene 2: Into the Wild',
        desc: 'Medium shot of a hiker approaching the overgrown temple entrance. Dust particles dance in single shafts of sunlight.'
      },
      {
        url: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=1280&auto=format&fit=crop&q=80',
        name: 'Scene 3: Cryptic Sigils',
        desc: 'Close-up of moss-covered walls highlighting strange blue glowing energy nodes carved into the rock face.'
      }
    ];

    // Trigger loaded sample based on script info
    onSelectSample('adventure');
  };

  return (
    <div className="fixed inset-0 bg-[#090e1a]/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in text-left">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600/20 rounded-xl flex items-center justify-center">
              <Upload className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-tight">Create New Storyboard Project</h2>
              <p className="text-[10px] text-neutral-500 font-medium">Select source assets to populate the FilmStrip timeline</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Dynamic Modal Navigation */}
        <div className="flex border-b border-neutral-900 bg-slate-950/40 p-2 shrink-0">
          <button 
            onClick={() => setActiveTab('upload')}
            className={cn(
              "px-4 py-2 text-xs font-extrabold transition-all rounded-lg cursor-pointer",
              activeTab === 'upload' 
                ? "bg-neutral-800 text-white" 
                : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            <FileVideo className="w-3.5 h-3.5 inline mr-1.5" /> File Upload
          </button>
          <button 
            onClick={() => setActiveTab('samples')}
            className={cn(
              "px-4 py-2 text-xs font-extrabold transition-all rounded-lg cursor-pointer",
              activeTab === 'samples' 
                ? "bg-neutral-800 text-white" 
                : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            <Film className="w-3.5 h-3.5 inline mr-1.5" /> Sample Projects
          </button>
          <button 
            onClick={() => setActiveTab('ai-script')}
            className={cn(
              "px-4 py-2 text-xs font-extrabold transition-all rounded-lg cursor-pointer",
              activeTab === 'ai-script' 
                ? "bg-neutral-800 text-white" 
                : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-emerald-400 animate-pulse" /> AI Script Generator
          </button>
        </div>

        {/* Content Viewports */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center animate-pulse">
              <div className="w-12 h-12 rounded-full border-4 border-sky-500/20 border-t-sky-500 animate-spin mb-4" />
              <h3 className="text-sm font-extrabold text-white mb-1.5">Processing FilmStrip Canvas</h3>
              <p className="text-[11px] text-neutral-400 max-w-sm mb-4 leading-relaxed">
                Extracting high-resolution cinematic frames and syncing timestamps...
              </p>
              
              {/* Progress track */}
              <div className="w-64 bg-neutral-900 border border-neutral-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300 ease-out" 
                  style={{ width: `${processProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-neutral-500 mt-2 font-bold">{processProgress}%</span>
            </div>
          ) : (
            <>
              {activeTab === 'upload' && (
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all h-64",
                    dragActive 
                      ? "border-sky-500 bg-sky-500/5" 
                      : "border-neutral-800 bg-neutral-950/60 hover:bg-neutral-950 hover:border-neutral-700"
                  )}
                  onClick={onButtonClick}
                >
                  <Upload className="w-10 h-10 text-neutral-600 mb-4" />
                  <p className="text-xs font-bold text-neutral-200">Drag & Drop files here, or click to browse</p>
                  <p className="text-[10px] text-neutral-500 mt-1.5 max-w-md">
                    Accepts PNG grids, JPEG storyboards, mp4 videos, raw frames, or text scripts
                  </p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleChange} 
                    multiple 
                    accept="image/*,video/*"
                    className="hidden" 
                  />
                </div>
              )}

              {activeTab === 'samples' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Adventure */}
                    <div 
                      onClick={() => onSelectSample('adventure')}
                      className="group flex flex-col border border-neutral-800 hover:border-emerald-500 bg-neutral-950 rounded-xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1"
                    >
                      <div className="aspect-video bg-neutral-800 overflow-hidden relative">
                        <img 
                          src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80" 
                          alt="Cinematic Desert" 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                        />
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[8px] font-mono font-bold tracking-wider">
                          ADVENTURE
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="text-[11px] font-bold text-neutral-200 group-hover:text-emerald-400">The Oasis Expedition</h4>
                        <p className="text-[9px] text-neutral-500 mt-1 line-clamp-2">Exploration sequence featuring cinematic sweeps and red mountain arches.</p>
                      </div>
                    </div>

                    {/* SciFi */}
                    <div 
                      onClick={() => onSelectSample('scifi')}
                      className="group flex flex-col border border-neutral-800 hover:border-indigo-500 bg-neutral-950 rounded-xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1"
                    >
                      <div className="aspect-video bg-neutral-800 overflow-hidden relative">
                        <img 
                          src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80" 
                          alt="Sci-Fi Horizon" 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                        />
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-indigo-600/90 text-white text-[8px] font-mono font-bold tracking-wider">
                          SCI-FI
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="text-[11px] font-bold text-neutral-200 group-hover:text-indigo-400">Cyber City Lights</h4>
                        <p className="text-[9px] text-neutral-500 mt-1 line-clamp-2">High-contrast cyberpunk scene with neon details, hovering crafts, and dark rails.</p>
                      </div>
                    </div>

                    {/* Commercial */}
                    <div 
                      onClick={() => onSelectSample('commercial')}
                      className="group flex flex-col border border-neutral-800 hover:border-amber-500 bg-neutral-950 rounded-xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1"
                    >
                      <div className="aspect-video bg-neutral-800 overflow-hidden relative">
                        <img 
                          src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&auto=format&fit=crop&q=80" 
                          alt="Commercial Van" 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                        />
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-600/90 text-white text-[8px] font-mono font-bold tracking-wider">
                          COMMERCIAL
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="text-[11px] font-bold text-neutral-200 group-hover:text-amber-400">Next-Gen EV Launch</h4>
                        <p className="text-[9px] text-neutral-500 mt-1 line-clamp-2">Dynamic commercial car presentation in dusty canyon landscapes.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ai-script' && (
                <div className="space-y-4 animate-fade-in">
                  {!generatedScript ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1.5">Describe your movie concept</label>
                        <textarea 
                          value={scriptTopic}
                          onChange={(e) => setScriptTopic(e.target.value)}
                          placeholder="e.g., A cyber detective tracking a digital ghost in neo-Tokyo under heavy acid rain."
                          rows={3}
                          className="w-full bg-[#121215] border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1.5">Visual Cinematic Style</label>
                          <select 
                            value={scriptStyle}
                            onChange={(e) => setScriptStyle(e.target.value)}
                            className="w-full bg-[#121215] border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                          >
                            <option>Cinematic Adventure</option>
                            <option>Cyberpunk / Sci-Fi Noir</option>
                            <option>Cozy Warm Documentary</option>
                            <option>Minimalist Tech Commercial</option>
                            <option>Gritty Handheld Drama</option>
                          </select>
                        </div>

                        <div className="flex items-end">
                          <button 
                            onClick={handleGenerateScript}
                            disabled={isGeneratingScript || !scriptTopic.trim()}
                            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            {isGeneratingScript ? (
                              <>
                                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Generate Script Outline</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" /> AI Outline Ready
                        </span>
                        <button 
                          onClick={() => setGeneratedScript(null)}
                          className="text-[10px] text-neutral-500 hover:text-neutral-300 font-bold cursor-pointer"
                        >
                          Rewrite
                        </button>
                      </div>

                      <div className="max-h-48 overflow-y-auto text-xs text-neutral-300 font-mono space-y-2 whitespace-pre-line leading-relaxed text-left">
                        {generatedScript}
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={startFromScript}
                          className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black transition-all cursor-pointer text-center"
                        >
                          Construct FilmStrip Sequence
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
