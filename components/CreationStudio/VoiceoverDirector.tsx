import React, { useState, useEffect } from 'react';
import { 
  Volume2, Play, Pause, Plus, Trash2, Download, Sparkles, 
  RefreshCw, Megaphone, Clock, Info, Check, AlertCircle 
} from 'lucide-react';
import { themeStyles } from '../../constants/creativeStudioTheme';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';

interface VoiceoverSegment {
  id: string;
  speaker: string;
  text: string;
  tone: string; // e.g. Whispering, High Energy, Dramatic, News Anchor
  pauseAfter: number; // pause in seconds
}

interface VoiceoverProps {
  onBack?: () => void;
  localTheme: string;
}

export const VoiceoverDirector: React.FC<VoiceoverProps> = ({ onBack, localTheme }) => {
  const st = themeStyles[localTheme] || themeStyles.charcoal;

  const [segments, setSegments] = useState<VoiceoverSegment[]>([
    {
      id: 'seg-1',
      speaker: 'Narrator',
      text: 'In the year 2085, the lines between reality and simulation vanished entirely.',
      tone: 'Dramatic / Cinematic',
      pauseAfter: 1.5
    },
    {
      id: 'seg-2',
      speaker: 'Hacker',
      text: 'They think they own the clouds. But the clouds are made of code... and code belongs to everyone.',
      tone: 'Gritty / Whispering',
      pauseAfter: 2
    }
  ]);

  const [activeSegmentId, setActiveSegmentId] = useState<string>(segments[0]?.id || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [readingSpeed, setReadingSpeed] = useState(140); // words per minute (WPM)
  const [playIndex, setPlayIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sceneContext, setSceneContext] = useState('');

  // Auto-calculate segment read duration in seconds
  const calculateDuration = (text: string) => {
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    return Math.round((wordCount / readingSpeed) * 60 * 10) / 10;
  };

  // Total speech script statistics
  const totalWords = segments.reduce((acc, s) => acc + s.text.split(/\s+/).filter(w => w.length > 0).length, 0);
  const totalReadTime = segments.reduce((acc, s) => acc + calculateDuration(s.text) + s.pauseAfter, 0);

  // Playback speech synthesis loop
  const speakSegment = (seg: VoiceoverSegment) => {
    if (!('speechSynthesis' in window)) {
      alert("Speech synthesis is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(seg.text);
    // Set custom speaking rate based on reading WPM
    utterance.rate = readingSpeed / 150; 
    
    utterance.onend = () => {
      setTimeout(() => {
        if (isPlaying && playIndex < segments.length - 1) {
          setPlayIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, seg.pauseAfter * 1000);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (isPlaying) {
      const currentSeg = segments[playIndex];
      if (currentSeg) {
        setActiveSegmentId(currentSeg.id);
        speakSegment(currentSeg);
      } else {
        setIsPlaying(false);
      }
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying, playIndex]);

  const handleStartPlayback = () => {
    if (segments.length === 0) return;
    setPlayIndex(0);
    setIsPlaying(true);
  };

  const handleAddSegment = () => {
    const newSeg: VoiceoverSegment = {
      id: `seg-${Date.now()}`,
      speaker: 'Narrator',
      text: 'Add your narration sentences here...',
      tone: 'Dramatic',
      pauseAfter: 1
    };
    setSegments([...segments, newSeg]);
    setActiveSegmentId(newSeg.id);
  };

  const handleDeleteSegment = (id: string) => {
    setSegments(segments.filter(s => s.id !== id));
  };

  const handleFieldChange = (id: string, field: keyof VoiceoverSegment, value: any) => {
    setSegments(segments.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // Generate VO Script from AI scene description
  const handleAIGenerate = async () => {
    if (!sceneContext.trim()) return;
    setIsGenerating(true);
    try {
      const prompt = `You are a cinematic script writer and voice director. Generate a 3-part voiceover narration script for this scene concept: "${sceneContext}".
The narration should be atmospheric and split into distinct reading beats.
Return a raw JSON array exactly in this format (no codeblocks):
[
  {
    "speaker": "Narrator",
    "text": "The first narration line...",
    "tone": "Suspenseful / Low pitch",
    "pauseAfter": 1.5
  },
  {
    "speaker": "Voice",
    "text": "The second voice line...",
    "tone": "Whispering",
    "pauseAfter": 2
  }
]`;
      const response = await generateUnifiedAIResponse(prompt);
      const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleaned);
      if (Array.isArray(data)) {
        const mapped = data.map((d, i) => ({
          ...d,
          id: `ai-seg-${Date.now()}-${i}`
        }));
        setSegments(mapped);
        setActiveSegmentId(mapped[0]?.id || '');
      }
    } catch (e) {
      console.error(e);
      alert("Failed to parse script. Try a clearer movie premise!");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportVOScript = () => {
    let output = `# Voiceover Production Script\n`;
    output += `Generated: ${new Date().toLocaleDateString()} | Target Read Speed: ${readingSpeed} WPM\n`;
    output += `Total Word Count: ${totalWords} words | Total Play Time: ${totalReadTime.toFixed(1)}s\n\n`;
    output += `--------------------------------------------------------\n\n`;

    segments.forEach((s, idx) => {
      output += `[Beat ${idx + 1}] (${s.speaker}) [Tone: ${s.tone}]\n`;
      output += `"${s.text}"\n`;
      if (s.pauseAfter > 0) {
        output += `[PAUSE: ${s.pauseAfter}s]\n`;
      }
      output += `\n`;
    });

    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voiceover_production_script.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`p-6 min-h-screen ${st.bg} text-slate-100 flex flex-col gap-6 animate-fade-in`}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="text-sky-400 w-5 h-5" />
            Voiceover Script Director
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Write narrator guidelines, calculate timing statistics, adjust tone profiles, and play synthetic readbacks instantly.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportVOScript}
            className={`px-3 py-1.5 rounded text-xs font-bold border ${st.border} ${st.btnInactive} flex items-center gap-1.5`}
          >
            <Download className="w-3.5 h-3.5" /> Export Script (.txt)
          </button>
          {onBack && (
            <button onClick={onBack} className={`px-3 py-1.5 rounded text-xs font-bold border ${st.border} ${st.btnInactive}`}>
              Back
            </button>
          )}
        </div>
      </div>

      {/* Timing and script stats banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-sky-500/10 rounded-lg text-sky-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Read Time</span>
            <span className="text-lg font-mono font-extrabold text-sky-400">{totalReadTime.toFixed(1)}s</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Word Count</span>
            <span className="text-lg font-mono font-extrabold text-emerald-400">{totalWords} words</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Pace ({readingSpeed} WPM)</span>
            <span className="text-[9px] text-slate-500 font-bold">120 = Slow, 160 = Fast</span>
          </div>
          <input 
            type="range"
            min="100"
            max="180"
            step="5"
            value={readingSpeed}
            onChange={(e) => setReadingSpeed(parseInt(e.target.value))}
            className="w-full accent-sky-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Segment Timelines */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
              Narration Blocks Sequence
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleStartPlayback}
                disabled={isPlaying}
                className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold uppercase rounded text-[10px] flex items-center gap-1"
              >
                <Play className="w-3 h-3" /> Play Script Voiceover
              </button>
              <button
                onClick={handleAddSegment}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 rounded text-[10px] font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Beat
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {segments.map((seg, idx) => {
              const active = activeSegmentId === seg.id;
              const duration = calculateDuration(seg.text);
              return (
                <div 
                  key={seg.id}
                  onClick={() => { setActiveSegmentId(seg.id); if (!isPlaying) speakSegment(seg); }}
                  className={`group border rounded-xl p-4 cursor-pointer transition-all ${active ? 'border-sky-500 bg-sky-500/5' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center font-mono text-xs font-bold text-slate-500">
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-sky-400 uppercase tracking-wide">{seg.speaker}</span>
                          <span className="text-[10px] bg-slate-800 border border-slate-750 rounded-full px-2 py-0.5 text-slate-400 font-bold">{seg.tone}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-mono font-semibold">
                            Est: {duration}s (+{seg.pauseAfter}s pause)
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteSegment(seg.id); }}
                            className="p-1 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-slate-200 leading-relaxed font-serif">"{seg.text}"</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Generator prompt */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <label className="text-[10px] font-extrabold text-sky-400 uppercase tracking-widest block">
              AI Speechwriter Concept Generator
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sceneContext}
                onChange={(e) => setSceneContext(e.target.value)}
                placeholder="e.g. suspenseful trailer intro for a space horror film..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
              />
              <button
                onClick={handleAIGenerate}
                disabled={isGenerating || !sceneContext.trim()}
                className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 disabled:opacity-40"
              >
                {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Compose Narration
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Segment Detail Settings */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Segment Properties</span>

          {activeSegmentId ? (
            (() => {
              const activeSegment = segments.find(s => s.id === activeSegmentId);
              if (!activeSegment) return <p className="text-xs text-slate-500">Selected segment not found.</p>;
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Speaker Tag</label>
                      <input 
                        type="text"
                        value={activeSegment.speaker}
                        onChange={(e) => handleFieldChange(activeSegment.id, 'speaker', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Tone Guideline</label>
                      <input 
                        type="text"
                        value={activeSegment.tone}
                        onChange={(e) => handleFieldChange(activeSegment.id, 'tone', e.target.value)}
                        placeholder="e.g. Whispering"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Narration Text</label>
                    <textarea 
                      value={activeSegment.text}
                      onChange={(e) => handleFieldChange(activeSegment.id, 'text', e.target.value)}
                      rows={5}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 leading-relaxed font-serif"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Pause After Segment ({activeSegment.pauseAfter}s)</label>
                    <input 
                      type="range"
                      min="0"
                      max="4"
                      step="0.5"
                      value={activeSegment.pauseAfter}
                      onChange={(e) => handleFieldChange(activeSegment.id, 'pauseAfter', parseFloat(e.target.value))}
                      className="w-full accent-sky-500 mt-1"
                    />
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-center py-8 text-slate-600">
              <Info className="w-8 h-8 mx-auto text-slate-750 mb-1" />
              <p className="text-xs">Select any segment card on the left to edit script properties.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
