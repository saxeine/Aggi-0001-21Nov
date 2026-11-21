import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Send, FileText, Download, Copy, Play, ArrowRight, RefreshCw, Check
} from 'lucide-react';
import { cn } from '../utils/cn';

interface ScreenplayWriterProps {
  onClose: () => void;
  sceneName?: string;
  sceneDescription?: string;
  onUpdateScene?: (name: string, desc: string) => void;
}

export default function ScreenplayWriter({ onClose, sceneName = 'Scene 1', sceneDescription = '', onUpdateScene }: ScreenplayWriterProps) {
  const [editorText, setEditorText] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Initialize from props
  useEffect(() => {
    if (sceneDescription) {
      setEditorText(`SCENE: ${sceneName.toUpperCase()}\n\n${sceneDescription}`);
    } else {
      setEditorText(`SCENE: ${sceneName.toUpperCase()}\n\nINT. TEMPLE ANTECHAMBER - DAY\n\nSingle shafts of dusty sunlight penetrate the ancient vault. A lone researcher stands frozen before massive runic patterns etched into the granite.`);
    }
  }, [sceneName, sceneDescription]);

  // AI Generation
  const handleAiRefinement = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
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
        body: JSON.stringify({ 
          topic: `Refine screenplay and add dramatic dialogue or details. Current scene: ${editorText}. Instruction: ${aiPrompt}`,
          style: 'Screenplay Writer Format'
        })
      });
      const data = await response.json();
      if (data.success && data.script) {
        setEditorText(data.script);
        setAiPrompt('');
      } else {
        alert(data.error || 'AI Refinement failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error refining screenplay details');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyChanges = () => {
    if (onUpdateScene) {
      // Try to parse out the first line as Scene Name and the rest as description
      const lines = editorText.split('\n').filter(l => l.trim().length > 0);
      let parsedName = sceneName;
      let parsedDesc = editorText;

      if (lines.length > 0) {
        if (lines[0].startsWith('SCENE:') || lines[0].startsWith('INT.') || lines[0].startsWith('EXT.')) {
          parsedName = lines[0].replace('SCENE:', '').trim();
          parsedDesc = lines.slice(1).join('\n\n');
        }
      }
      onUpdateScene(parsedName, parsedDesc);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#090e1a]/90 z-[110] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in text-left">
      <div className="w-full max-w-3xl bg-[#0f172a] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[80vh]">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600/20 rounded-xl flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-tight">AI Screenplay & Dialogue Writer</h2>
              <p className="text-[10px] text-neutral-500 font-medium">Format scene prompts and voiceovers with instant industry standard templates</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Workspace Panels */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* Left Text Editor */}
          <div className="flex-1 flex flex-col border-r border-neutral-800/85">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950/20 border-b border-neutral-900 shrink-0">
              <span className="text-[10px] text-neutral-500 font-extrabold uppercase">Courier Editor View</span>
              <div className="flex gap-2">
                <button 
                  onClick={handleCopy}
                  className="px-2.5 py-1 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 rounded text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <textarea 
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              className="flex-1 w-full bg-slate-950 p-6 text-sm text-neutral-200 font-mono focus:outline-none resize-none leading-relaxed overflow-y-auto"
              style={{ fontFamily: '"Courier New", Courier, monospace' }}
            />
          </div>

          {/* Right AI Sidebar Prompt Controls */}
          <div className="w-80 bg-[#121215] flex flex-col shrink-0">
            <div className="p-4 border-b border-neutral-900">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gemini Screenplay Assistant</span>
              </h3>
              <p className="text-[10px] text-neutral-500 mt-1">Refine and craft dramatic descriptions using AI prompts</p>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              
              {/* Presets suggestions */}
              <div className="space-y-2">
                <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Style Presets</span>
                <div className="flex flex-col gap-1.5">
                  <button 
                    onClick={() => setAiPrompt("Add dramatic tension and character internal monologue description.")}
                    className="w-full text-left p-2 rounded bg-[#0f172a] hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 font-medium cursor-pointer transition-colors"
                  >
                    ⚡ Add Dramatic Tension
                  </button>
                  <button 
                    onClick={() => setAiPrompt("Convert this description into high-impact sci-fi sensory prose.")}
                    className="w-full text-left p-2 rounded bg-[#0f172a] hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 font-medium cursor-pointer transition-colors"
                  >
                    🌌 Transform to High Sci-Fi
                  </button>
                  <button 
                    onClick={() => setAiPrompt("Create a voiceover narration script that matches this scene.")}
                    className="w-full text-left p-2 rounded bg-[#0f172a] hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 font-medium cursor-pointer transition-colors"
                  >
                    🎙️ Add Voiceover Narration
                  </button>
                </div>
              </div>

              {/* Manual Custom Prompt box */}
              <div className="space-y-2">
                <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">Custom AI Direction</span>
                <textarea 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Rewrite this with more suspense, noting a heavy thunderstorm outside."
                  rows={4}
                  className="w-full bg-slate-950 border border-neutral-800 rounded-lg p-2.5 text-[11px] text-white focus:outline-none focus:border-sky-500 font-medium resize-none leading-relaxed"
                />
              </div>

              <button 
                onClick={handleAiRefinement}
                disabled={isGenerating || !aiPrompt.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-600/10"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Dialects...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                    <span>Apply AI Direction</span>
                  </>
                )}
              </button>
            </div>

            {/* Footer buttons */}
            <div className="p-4 border-t border-neutral-900 bg-slate-950/20 flex gap-2">
              <button 
                onClick={onClose}
                className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button 
                onClick={handleApplyChanges}
                className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-black transition-all cursor-pointer text-center shadow-md shadow-sky-600/10"
              >
                Apply to Slide
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
