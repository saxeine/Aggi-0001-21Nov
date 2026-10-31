import React, { useState, useEffect } from 'react';
import { 
  Camera, Plus, Trash2, Download, Sparkles, RefreshCw, 
  CheckCircle, Clock, Check, ListChecks, MoveUp, MoveDown, Info 
} from 'lucide-react';
import { themeStyles } from '../../constants/creativeStudioTheme';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';

interface CameraShot {
  id: string;
  sceneNo: string;
  shotNo: string;
  subject: string;
  shotType: string; // CU, MCU, WS, ECU, OTS, etc.
  angle: string; // Eye Level, Low, High, Dutch, etc.
  movement: string; // Static, Pan, Tilt, Dolly, Zoom, Crane
  focalLength: string; // 24mm, 35mm, 50mm, 85mm, etc.
  lighting: string; // Golden Hour, High Contrast, Moody neon, Soft key
  status: 'Ready' | 'In Progress' | 'Captured';
}

interface ShotListProps {
  onBack?: () => void;
  localTheme: string;
}

const PRESET_SHOT_TYPES = ['WS (Wide Shot)', 'MWS (Medium Wide)', 'MS (Medium Shot)', 'MCU (Medium Close-up)', 'CU (Close-up)', 'ECU (Extreme Close-up)', 'OTS (Over the Shoulder)', 'POV (Point of View)'];
const PRESET_ANGLES = ['Eye-Level', 'Low Angle', 'High Angle', 'Dutch Angle (Tilted)', 'Bird\'s Eye', 'Worm\'s Eye'];
const PRESET_MOVEMENTS = ['Static', 'Pan Left/Right', 'Tilt Up/Down', 'Dolly In/Out', 'Tracking Shot', 'Handheld', 'Zoom', 'Drone/Crane'];
const PRESET_LENSES = ['16mm (Ultra Wide)', '24mm (Wide Story)', '35mm (Cinematic Story)', '50mm (Natural Eye)', '85mm (Portraits/Closeups)', '135mm (Telephoto/Compressed)'];

export const ShotListBuilder: React.FC<ShotListProps> = ({ onBack, localTheme }) => {
  const st = themeStyles[localTheme] || themeStyles.charcoal;

  const [shots, setShots] = useState<CameraShot[]>([
    {
      id: 'shot-1',
      sceneNo: '1',
      shotNo: '1',
      subject: 'Establishing shot of detective walking into dusty retro detective office.',
      shotType: 'WS (Wide Shot)',
      angle: 'Eye-Level',
      movement: 'Dolly In/Out',
      focalLength: '24mm (Wide Story)',
      lighting: 'Moody neon, heavy shadows through window blinds',
      status: 'Ready'
    },
    {
      id: 'shot-2',
      sceneNo: '1',
      shotNo: '2',
      subject: 'Extreme closeup on detectives old copper lighter flicking on.',
      shotType: 'ECU (Extreme Close-up)',
      angle: 'Low Angle',
      movement: 'Static',
      focalLength: '85mm (Portraits/Closeups)',
      lighting: 'Warm flame glow hitting detectives face',
      status: 'In Progress'
    }
  ]);

  const [activeShotId, setActiveShotId] = useState<string>(shots[0]?.id || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sceneDescription, setSceneDescription] = useState('');

  const handleAddShot = () => {
    const newShot: CameraShot = {
      id: `shot-${Date.now()}`,
      sceneNo: String(shots.length > 0 ? Math.max(...shots.map(s => parseInt(s.sceneNo) || 1)) : 1),
      shotNo: String(shots.length + 1),
      subject: 'Enter shot subject / action here...',
      shotType: 'MS (Medium Shot)',
      angle: 'Eye-Level',
      movement: 'Static',
      focalLength: '35mm (Cinematic Story)',
      lighting: 'Soft daylight',
      status: 'Ready'
    };
    setShots([...shots, newShot]);
    setActiveShotId(newShot.id);
  };

  const handleDeleteShot = (id: string) => {
    setShots(shots.filter(s => s.id !== id));
  };

  const handleFieldChange = (id: string, field: keyof CameraShot, value: any) => {
    setShots(shots.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === shots.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const nextShots = [...shots];
    const temp = nextShots[index];
    nextShots[index] = nextShots[targetIdx];
    nextShots[targetIdx] = temp;
    setShots(nextShots);
  };

  // Convert script to detailed camera shots using AI
  const handleAIGenerate = async () => {
    if (!sceneDescription.trim()) return;
    setIsGenerating(true);
    try {
      const prompt = `You are a professional film director and cinematographer. Break down this scene screenplay description into a detailed, sequential, cinematic 3-shot shot list: "${sceneDescription}".
Response MUST be exactly a raw JSON array of objects (no markdown wrapping):
[
  {
    "sceneNo": "1",
    "shotNo": "1",
    "subject": "The specific visual subject action...",
    "shotType": "WS (Wide Shot)",
    "angle": "Eye-Level",
    "movement": "Dolly In/Out",
    "focalLength": "24mm (Wide Story)",
    "lighting": "Low contrast, warm backlighting..."
  }
]`;
      const response = await generateUnifiedAIResponse(prompt);
      const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleaned);
      if (Array.isArray(data)) {
        const mapped = data.map((d, i) => ({
          ...d,
          id: `ai-shot-${Date.now()}-${i}`,
          status: 'Ready' as const
        }));
        setShots(mapped);
        setActiveShotId(mapped[0]?.id || '');
      }
    } catch (e) {
      console.error(e);
      alert("Failed to parse shot list. Try a simpler action description!");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportMarkdown = () => {
    let md = `# Production Shot List\n\n`;
    md += `| Scene | Shot | Subject / Composition | Shot Type | Camera Angle | Movement | Focal Length | Lighting | Status |\n`;
    md += `|---|---|---|---|---|---|---|---|---|\n`;

    shots.forEach(s => {
      md += `| ${s.sceneNo} | ${s.shotNo} | ${s.subject} | ${s.shotType} | ${s.angle} | ${s.movement} | ${s.focalLength} | ${s.lighting} | **${s.status}** |\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cinematic_shot_list.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`p-6 min-h-screen ${st.bg} text-slate-100 flex flex-col gap-6 animate-fade-in`}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Camera className="text-rose-400 w-5 h-5" />
            Cinematic Shot List Builder
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Plan camera lenses, lighting rigs, screen framing ratios, and track capturing status on the set.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportMarkdown}
            className={`px-3 py-1.5 rounded text-xs font-bold border ${st.border} ${st.btnInactive} flex items-center gap-1.5`}
          >
            <Download className="w-3.5 h-3.5" /> Export Markdown Table
          </button>
          {onBack && (
            <button onClick={onBack} className={`px-3 py-1.5 rounded text-xs font-bold border ${st.border} ${st.btnInactive}`}>
              Back
            </button>
          )}
        </div>
      </div>

      {/* Stats counter widget */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Shots</span>
          <span className="text-lg font-mono font-bold text-slate-200">{shots.length}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <span className="text-[10px] text-sky-400 font-extrabold uppercase tracking-wider">Ready</span>
          <span className="text-lg font-mono font-bold text-sky-400">{shots.filter(s => s.status === 'Ready').length}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider">In Progress</span>
          <span className="text-lg font-mono font-bold text-amber-400">{shots.filter(s => s.status === 'In Progress').length}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider">Captured</span>
          <span className="text-lg font-mono font-bold text-emerald-400">{shots.filter(s => s.status === 'Captured').length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Shot Catalog and re-order list */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
              Camera Shot List Sequence
            </span>
            <button
              onClick={handleAddShot}
              className="px-2 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 rounded text-[10px] font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Shot
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl max-h-[50vh] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  <th className="p-3">S/S #</th>
                  <th className="p-3">Composition</th>
                  <th className="p-3">Camera / Lens</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Order / Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {shots.map((s, idx) => {
                  const active = activeShotId === s.id;
                  return (
                    <tr 
                      key={s.id}
                      onClick={() => setActiveShotId(s.id)}
                      className={`cursor-pointer transition-all hover:bg-slate-800/30 ${active ? 'bg-rose-500/5' : ''}`}
                    >
                      <td className="p-3 text-xs font-mono font-bold text-rose-400">
                        Scene {s.sceneNo} • Shot {s.shotNo}
                      </td>
                      <td className="p-3 text-xs text-slate-200 font-medium max-w-xs truncate">
                        {s.subject}
                      </td>
                      <td className="p-3 text-xs text-slate-400">
                        <span className="font-semibold block">{s.shotType}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{s.focalLength}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === 'Captured' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : s.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => handleMove(idx, 'up')} disabled={idx === 0} className="p-0.5 text-slate-500 hover:text-slate-300 disabled:opacity-20">
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleMove(idx, 'down')} disabled={idx === shots.length - 1} className="p-0.5 text-slate-500 hover:text-slate-300 disabled:opacity-20">
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteShot(s.id)} className="p-0.5 text-slate-500 hover:text-rose-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* AI Generator prompt panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <label className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest block">
              AI Screenplay Shotlist Doctor
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sceneDescription}
                onChange={(e) => setSceneDescription(e.target.value)}
                placeholder="e.g. detective enters dark library, slides a book aside revealing an old copper safe..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
              />
              <button
                onClick={handleAIGenerate}
                disabled={isGenerating || !sceneDescription.trim()}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 disabled:opacity-40"
              >
                {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Draft Shot List
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Active Shot Settings Form */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Camera Configurations</span>

          {activeShotId ? (
            (() => {
              const activeShot = shots.find(s => s.id === activeShotId);
              if (!activeShot) return null;
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Scene</label>
                      <input
                        type="text"
                        value={activeShot.sceneNo}
                        onChange={(e) => handleFieldChange(activeShot.id, 'sceneNo', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Shot #</label>
                      <input
                        type="text"
                        value={activeShot.shotNo}
                        onChange={(e) => handleFieldChange(activeShot.id, 'shotNo', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Status</label>
                      <select
                        value={activeShot.status}
                        onChange={(e) => handleFieldChange(activeShot.id, 'status', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[11px] text-slate-200 font-bold"
                      >
                        {['Ready', 'In Progress', 'Captured'].map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Framing Composition</label>
                    <select
                      value={activeShot.shotType}
                      onChange={(e) => handleFieldChange(activeShot.id, 'shotType', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                    >
                      {PRESET_SHOT_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Camera Angle</label>
                      <select
                        value={activeShot.angle}
                        onChange={(e) => handleFieldChange(activeShot.id, 'angle', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                      >
                        {PRESET_ANGLES.map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">Focal Length</label>
                      <select
                        value={activeShot.focalLength}
                        onChange={(e) => handleFieldChange(activeShot.id, 'focalLength', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                      >
                        {PRESET_LENSES.map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Camera Movement</label>
                    <select
                      value={activeShot.movement}
                      onChange={(e) => handleFieldChange(activeShot.id, 'movement', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                    >
                      {PRESET_MOVEMENTS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Subject action description</label>
                    <textarea
                      value={activeShot.subject}
                      onChange={(e) => handleFieldChange(activeShot.id, 'subject', e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Lighting Structure</label>
                    <input
                      type="text"
                      value={activeShot.lighting}
                      onChange={(e) => handleFieldChange(activeShot.id, 'lighting', e.target.value)}
                      placeholder="e.g. Three-point lighting with blue rim light..."
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-center py-8 text-slate-600">
              <Info className="w-8 h-8 mx-auto text-slate-750 mb-1" />
              <p className="text-xs">Select any shot card on the left to edit camera settings.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
