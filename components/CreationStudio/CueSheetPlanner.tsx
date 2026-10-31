import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, Music, VolumeX, Plus, Trash2, Download, Play, 
  Pause, Square, Sparkles, ChevronRight, AlertTriangle, RefreshCw 
} from 'lucide-react';
import { themeStyles } from '../../constants/creativeStudioTheme';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';

interface SoundCue {
  id: string;
  time: number; // in seconds
  trackType: 'Music' | 'SFX' | 'Voiceover' | 'Ambience';
  label: string;
  volume: number; // 0 to 100
  fade: 'None' | 'Fade In' | 'Fade Out' | 'Crossfade';
  notes: string;
}

interface CueSheetProps {
  onBack?: () => void;
  localTheme: string;
}

export const CueSheetPlanner: React.FC<CueSheetProps> = ({ onBack, localTheme }) => {
  const st = themeStyles[localTheme] || themeStyles.charcoal;

  const [cues, setCues] = useState<SoundCue[]>([
    { id: 'cue-1', time: 0, trackType: 'Ambience', label: 'Heavy wind & rain howling', volume: 40, fade: 'Fade In', notes: 'Establishes cold outdoor mood.' },
    { id: 'cue-2', time: 3, trackType: 'Music', label: 'Dark synth pad starts', volume: 60, fade: 'Fade In', notes: 'Low frequency retro synth.' },
    { id: 'cue-3', time: 8, trackType: 'SFX', label: 'Glass shattering cue', volume: 90, fade: 'None', notes: 'Slightly panned to the left.' }
  ]);

  const [activeCueId, setActiveCueId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(30); // max timeline duration in seconds
  const [aiConcept, setAiConcept] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Playback timer loop
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          const nextTime = Math.round((prev + 0.5) * 10) / 10;
          
          // Trigger a sound synthesizer pitch shift when crossing cues!
          const activeCues = cues.filter(c => Math.abs(c.time - nextTime) < 0.25);
          activeCues.forEach(ac => {
            let freq = 300;
            if (ac.trackType === 'Music') freq = 440;
            if (ac.trackType === 'SFX') freq = 880;
            if (ac.trackType === 'Voiceover') freq = 600;
            if (ac.trackType === 'Ambience') freq = 200;
            triggerAudioCue(freq, ac.trackType === 'SFX' ? 'triangle' : 'sine');
          });

          return nextTime;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, cues, totalDuration]);

  // Audio cue synth maker
  const triggerAudioCue = (freq = 440, type: OscillatorType = 'sine', duration = 0.1) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {}
  };

  const handleAddCue = () => {
    const newCue: SoundCue = {
      id: `cue-${Date.now()}`,
      time: Math.min(currentTime, totalDuration),
      trackType: 'SFX',
      label: 'New audio trigger description',
      volume: 80,
      fade: 'None',
      notes: ''
    };
    setCues([...cues, newCue]);
    setActiveCueId(newCue.id);
  };

  const handleDeleteCue = (id: string) => {
    setCues(cues.filter(c => c.id !== id));
  };

  const handleCueField = (id: string, field: keyof SoundCue, value: any) => {
    setCues(cues.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // Generate dynamic cues using AI
  const handleAICues = async () => {
    if (!aiConcept.trim()) return;
    setIsGenerating(true);
    try {
      const prompt = `You are a master cinematic sound designer. Create 4 timeline audio cues for the theme: "${aiConcept}".
Response must be a raw JSON array of objects (no markdown blocks):
[
  {
    "time": 0,
    "trackType": "Ambience",
    "label": "Low synth rumble",
    "volume": 50,
    "fade": "Fade In",
    "notes": "Establishes a thick suspenseful air..."
  },
  {
    "time": 5,
    "trackType": "SFX",
    "label": "Ticking clock effect",
    "volume": 80,
    "fade": "None",
    "notes": "Builds urgency in scene..."
  }
]`;
      const response = await generateUnifiedAIResponse(prompt);
      const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleaned);
      if (Array.isArray(data)) {
        const mapped = data.map((c, i) => ({
          ...c,
          id: `ai-cue-${Date.now()}-${i}`
        }));
        setCues(mapped);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to parse AI Cue list. Try an easier scene theme like 'rainy diner'!");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportCueSheet = () => {
    let csv = 'Time (s),Track Type,Cue Label,Volume (%),Fade style,Notes\n';
    cues.forEach(c => {
      csv += `"${c.time}","${c.trackType}","${c.label.replace(/"/g, '""')}","${c.volume}","${c.fade}","${c.notes.replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sound_cue_sheet.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`p-6 min-h-screen ${st.bg} text-slate-100 flex flex-col gap-6 animate-fade-in`}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Volume2 className="text-amber-400 w-5 h-5 animate-bounce" />
            A/V Sound & Cue Sheet Planner
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choreograph background tracks, triggers, sound levels, and audio panning markers along a master cinematic timeline.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportCueSheet}
            className={`px-3 py-1.5 rounded text-xs font-bold border ${st.border} ${st.btnInactive} flex items-center gap-1.5`}
          >
            <Download className="w-3.5 h-3.5" /> Export Cue CSV
          </button>
          {onBack && (
            <button onClick={onBack} className={`px-3 py-1.5 rounded text-xs font-bold border ${st.border} ${st.btnInactive}`}>
              Back
            </button>
          )}
        </div>
      </div>

      {/* Main timeline interactive preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
        
        {/* Playback bar & Time controls */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-xs font-extrabold uppercase flex items-center gap-1 shadow-lg shadow-amber-500/10"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Pause Tracker' : 'Live Timeline Playback'}
            </button>
            <button
              onClick={() => { setIsPlaying(false); setCurrentTime(0); }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
              title="Stop"
            >
              <Square className="w-4 h-4 fill-slate-300" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono font-bold">
              Current Play Marker: <span className="text-amber-400 text-sm font-extrabold">{currentTime.toFixed(1)}s</span>
            </span>
            <span className="text-slate-700">/</span>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-slate-500 font-bold uppercase">End Time:</label>
              <input
                type="number"
                min="10"
                max="120"
                value={totalDuration}
                onChange={(e) => setTotalDuration(Math.max(10, parseInt(e.target.value) || 30))}
                className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-center font-mono font-bold text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Master visual multi-track grid */}
        <div className="relative border border-slate-800 rounded-lg p-4 bg-slate-950/60 overflow-hidden space-y-2">
          
          {/* Progress marker bar overlay */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10 transition-all pointer-events-none"
            style={{ left: `calc(130px + (${currentTime} / ${totalDuration}) * (100% - 146px))` }}
          />

          {['Ambience', 'Music', 'SFX', 'Voiceover'].map((trackType) => {
            const trackCues = cues.filter(c => c.trackType === trackType);
            return (
              <div key={trackType} className="flex items-center gap-4 h-11 relative">
                <span className="w-28 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{trackType}</span>
                <div className="flex-1 bg-slate-900/60 h-8 rounded relative border border-slate-850/60">
                  {trackCues.map((cue) => {
                    const pctLeft = (cue.time / totalDuration) * 100;
                    if (pctLeft > 100) return null;
                    return (
                      <button
                        key={cue.id}
                        onClick={() => setActiveCueId(cue.id)}
                        className={`absolute top-1 bottom-1 px-2 rounded text-[10px] font-bold text-slate-200 shadow-md transform -translate-x-1/2 flex items-center gap-1 overflow-hidden transition-all ${activeCueId === cue.id ? 'bg-amber-500 text-slate-950 scale-105 z-20 ring-1 ring-amber-300' : 'bg-slate-800 hover:bg-slate-700'}`}
                        style={{ left: `${pctLeft}%`, width: '120px' }}
                      >
                        <Volume2 className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{cue.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Cues Table List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Cues Catalog</span>
            <button
              onClick={handleAddCue}
              className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 rounded text-[10px] font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Cue at playhead
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl max-h-[45vh] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  <th className="p-3">Time</th>
                  <th className="p-3">Track Type</th>
                  <th className="p-3">Cue Description</th>
                  <th className="p-3">Volume</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {cues.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => setActiveCueId(c.id)}
                    className={`cursor-pointer transition-colors hover:bg-slate-800/30 ${activeCueId === c.id ? 'bg-amber-500/5' : ''}`}
                  >
                    <td className="p-3 text-xs font-mono font-bold text-amber-400">{c.time}s</td>
                    <td className="p-3">
                      <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-300 font-semibold">{c.trackType}</span>
                    </td>
                    <td className="p-3 text-xs text-slate-200 font-medium truncate max-w-xs">{c.label}</td>
                    <td className="p-3 text-xs font-mono text-slate-400">{c.volume}%</td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleDeleteCue(c.id)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI Cue planner */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <label className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest block">
              AI Cue Choreographer
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiConcept}
                onChange={(e) => setAiConcept(e.target.value)}
                placeholder="e.g. moody detective diner conversation, neon hum, rain sound"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
              />
              <button
                onClick={handleAICues}
                disabled={isGenerating || !aiConcept.trim()}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 disabled:opacity-40"
              >
                {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Plan Soundscape
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Active Cue Metadata Info Card */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Cue Parameters</span>
          
          {activeCueId ? (
            (() => {
              const activeCue = cues.find(c => c.id === activeCueId);
              if (!activeCue) return <p className="text-xs text-slate-500">Selected cue not found.</p>;
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Time Marker (s)</label>
                      <input
                        type="number"
                        min="0"
                        max={totalDuration}
                        value={activeCue.time}
                        onChange={(e) => handleCueField(activeCue.id, 'time', Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Track Type</label>
                      <select
                        value={activeCue.trackType}
                        onChange={(e) => handleCueField(activeCue.id, 'trackType', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                      >
                        {['Music', 'SFX', 'Voiceover', 'Ambience'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Cue Trigger Description</label>
                    <input
                      type="text"
                      value={activeCue.label}
                      onChange={(e) => handleCueField(activeCue.id, 'label', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Volume ({activeCue.volume}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={activeCue.volume}
                        onChange={(e) => handleCueField(activeCue.id, 'volume', parseInt(e.target.value))}
                        className="w-full accent-amber-500 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Fade Curve</label>
                      <select
                        value={activeCue.fade}
                        onChange={(e) => handleCueField(activeCue.id, 'fade', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                      >
                        {['None', 'Fade In', 'Fade Out', 'Crossfade'].map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Trigger Execution Notes</label>
                    <textarea
                      value={activeCue.notes}
                      onChange={(e) => handleCueField(activeCue.id, 'notes', e.target.value)}
                      rows={3}
                      placeholder="e.g. pan slightly to left ear, or trigger bass reverb..."
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-center py-8 text-slate-600 space-y-1">
              <VolumeX className="w-8 h-8 mx-auto text-slate-750" />
              <p className="text-xs">No cue selected</p>
              <p className="text-[10px]">Select a cue in catalog or visual timeline to configure details.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
