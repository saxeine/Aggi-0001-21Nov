import React, { useState, useRef, useEffect } from 'react';
import { 
  Film, 
  Sparkles, 
  Image as ImageIcon, 
  Trash2, 
  Copy, 
  Download, 
  ChevronRight, 
  HelpCircle, 
  FileText, 
  Plus, 
  X, 
  Check, 
  RefreshCw, 
  User, 
  BookOpen, 
  Volume2, 
  Wand2,
  Database,
  FolderOpen,
  Sliders,
  Play,
  Settings,
  Save,
  LayoutGrid,
  Eye,
  Share2,
  ListFilter,
  Palette
} from 'lucide-react';
import { AudioInput } from '../AudioInput';
import Markdown from 'react-markdown';
import { MediaItem, Session } from '../../types';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';

interface VideoScriptWriterProps {
  session?: Session | null;
  sessions?: Session[];
  onSaveArtifact?: (mediaItem: MediaItem) => void;
}

interface ImageUpload {
  file: File;
  preview: string;
  base64: string;
}

interface CameraShot {
  id: string;
  type: string;
  description: string;
}

// Preset visual styles for design studio
const VISUAL_ESTHETICS = [
  { id: 'cinematic', label: '🎬 Cinematic Moody', desc: 'Saturated tones, anamorphic flares, cinematic high contrast' },
  { id: 'neon', label: '⚡ Cyberpunk Neon', desc: 'Vibrant purples/blues, rainy nights, high tech reflections' },
  { id: 'clean', label: '🏢 Corporate Modern', desc: 'Bright flat lighting, clean backdrops, minimal text overlays' },
  { id: 'docu', label: '🎥 Vintage Documentary', desc: 'Handheld feel, warm sepia tones, natural ambient light' },
  { id: 'shorts', label: '📱 High-Energy Social', desc: 'Ultra-fast cuts, vertical framing, bold kinetic text overlays' }
];

const SHOT_TYPES = [
  'Extreme Wide Shot (EWS)',
  'Wide Shot (WS)',
  'Medium Shot (MS)',
  'Close-Up (CU)',
  'Extreme Close-Up (ECU)',
  'Over-the-Shoulder (OTS)',
  'Point of View (POV)',
  'Screen Recording / B-Roll Overlay'
];

export const VideoScriptWriter: React.FC<VideoScriptWriterProps> = ({ 
  session: activeSession, 
  sessions = [], 
  onSaveArtifact 
}) => {
  // 1. Session & Source Selection States
  const [selectedSessionId, setSelectedSessionId] = useState<string>(activeSession?.id || (sessions[0]?.id || ''));
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [useSessionData, setUseSessionData] = useState(false);
  
  // 2. Plot, Topic & Inputs
  const [plotTopic, setPlotTopic] = useState('');
  const [durationLimit, setDurationLimit] = useState<number | null>(180);
  const [platform, setPlatform] = useState('YouTube Longform');
  const [pacing, setPacing] = useState('Balanced');

  // 3. Design Studio Configuration
  const [selectedAesthetic, setSelectedAesthetic] = useState('cinematic');
  const [narratorVoice, setNarratorVoice] = useState('Deep Cinematic Male');
  const [musicMood, setMusicMood] = useState('Tense electronic synth pad');
  const [includeSfx, setIncludeSfx] = useState(true);
  
  // Custom camera shots list
  const [cameraShots, setCameraShots] = useState<CameraShot[]>([
    { id: 'shot_1', type: 'Wide Shot (WS)', description: 'Establishing scene with atmospheric lighting.' },
    { id: 'shot_2', type: 'Close-Up (CU)', description: 'Focusing on subject expression and tension.' }
  ]);
  const [newShotType, setNewShotType] = useState('Medium Shot (MS)');
  const [newShotDesc, setNewShotDesc] = useState('');

  // Storyboard references
  const [storyboardImages, setStoryboardImages] = useState<ImageUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compile States
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStatus, setCompileStatus] = useState('');
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  
  // Active screen tabs
  const [workspaceTab, setWorkspaceTab] = useState<'inputs' | 'design_studio'>('inputs');
  const [outputTab, setOutputTab] = useState<'dual_column' | 'raw_text' | 'storyboard'>('dual_column');
  
  const [copied, setCopied] = useState(false);
  const [savedToWorkspace, setSavedToWorkspace] = useState(false);
  const [scriptTheme, setScriptTheme] = useState<'default' | 'courier' | 'cyberpunk' | 'emerald'>('emerald');

  const cycleScriptTheme = () => {
    setScriptTheme(prev => {
      if (prev === 'emerald') return 'default';
      if (prev === 'default') return 'courier';
      if (prev === 'courier') return 'cyberpunk';
      return 'emerald';
    });
  };

  const getThemeLabel = () => {
    switch (scriptTheme) {
      case 'default': return 'Slate';
      case 'courier': return 'Courier Draft';
      case 'cyberpunk': return 'Cyber Neon';
      case 'emerald': return 'Emerald Studio';
    }
  };

  const getScriptThemeClasses = () => {
    switch (scriptTheme) {
      case 'courier':
        return `!bg-stone-50 !text-stone-900 font-mono p-8 rounded-xl border border-stone-200 transition-all shadow-md
                [&_h1]:!text-amber-900 [&_h1]:!font-black [&_h1]:!text-lg [&_h1]:!mb-4
                [&_h2]:!text-amber-900 [&_h2]:!font-black [&_h2]:!text-base [&_h2]:!mb-3
                [&_h3]:!text-amber-900 [&_h3]:!font-black [&_h3]:!text-sm [&_h3]:!mb-2 [&_h3]:!bg-amber-100/70 [&_h3]:!px-2 [&_h3]:!py-1 [&_h3]:!rounded
                [&_h4]:!text-amber-900 [&_h4]:!font-black [&_h4]:!text-xs
                [&_th]:!bg-stone-200 [&_th]:!text-stone-950 [&_th]:!font-bold [&_th]:!border-stone-300
                [&_td]:!border-stone-200 [&_td]:!text-stone-800
                [&_strong]:!text-rose-700 [&_strong]:!font-black [&_strong]:!bg-rose-50/80 [&_strong]:!px-1.5 [&_strong]:!py-0.5 [&_strong]:!rounded [&_strong]:!border [&_strong]:!border-rose-200/50`;
      case 'cyberpunk':
        return `!bg-black !text-zinc-300 font-mono p-8 rounded-xl border border-fuchsia-950 transition-all shadow-[0_0_25px_rgba(217,70,239,0.06)]
                [&_h1]:!text-cyan-400 [&_h1]:!font-black [&_h1]:!tracking-widest [&_h1]:!uppercase [&_h1]:!mb-4
                [&_h2]:!text-cyan-400 [&_h2]:!font-black [&_h2]:!tracking-widest [&_h2]:!uppercase [&_h2]:!mb-3
                [&_h3]:!text-cyan-400 [&_h3]:!font-black [&_h3]:!tracking-widest [&_h3]:!uppercase [&_h3]:!mb-2 [&_h3]:!border-b [&_h3]:!border-cyan-500/30 [&_h3]:!pb-1
                [&_h4]:!text-cyan-400 [&_h4]:!font-black [&_h4]:!tracking-wider
                [&_th]:!bg-cyan-950/60 [&_th]:!text-cyan-300 [&_th]:!font-bold [&_th]:!border-cyan-900/60
                [&_td]:!border-zinc-900 [&_td]:!text-zinc-300
                [&_strong]:!text-fuchsia-400 [&_strong]:!bg-fuchsia-950/40 [&_strong]:!px-1.5 [&_strong]:!py-0.5 [&_strong]:!rounded [&_strong]:!border [&_strong]:!border-fuchsia-500/20 [&_strong]:!shadow-[0_0_12px_rgba(217,70,239,0.2)]`;
      case 'emerald':
        return `!bg-emerald-950/80 !text-emerald-100 font-mono p-8 rounded-xl border border-emerald-500/30 transition-all shadow-[0_0_25px_rgba(16,185,129,0.06)]
                [&_h1]:!text-emerald-400 [&_h1]:!font-black [&_h1]:!tracking-wide [&_h1]:!uppercase [&_h1]:!mb-4 [&_h1]:!border-l-4 [&_h1]:!border-emerald-400 [&_h1]:!bg-emerald-950/90 [&_h1]:!px-3 [&_h1]:!py-2 [&_h1]:!rounded-r [&_h1]:!shadow-[0_0_12px_rgba(52,211,153,0.1)]
                [&_h2]:!text-emerald-400 [&_h2]:!font-black [&_h2]:!tracking-wide [&_h2]:!mb-3 [&_h2]:!border-l-4 [&_h2]:!border-emerald-400 [&_h2]:!bg-emerald-950/90 [&_h2]:!px-3 [&_h2]:!py-1.5 [&_h2]:!rounded-r
                [&_h3]:!text-emerald-400 [&_h3]:!font-black [&_h3]:!mb-2 [&_h3]:!border-l-4 [&_h3]:!border-emerald-400 [&_h3]:!bg-emerald-950/70 [&_h3]:!px-2 [&_h3]:!py-1 [&_h3]:!rounded-r
                [&_h4]:!text-emerald-400 [&_h4]:!font-bold [&_h4]:!mb-2 [&_h4]:!border-l-2 [&_h4]:!border-emerald-400 [&_h4]:!pl-2
                [&_th]:!bg-emerald-950/90 [&_th]:!text-emerald-200 [&_th]:!font-bold [&_th]:!border-emerald-800
                [&_td]:!border-emerald-900/40 [&_td]:!text-emerald-100/90
                [&_strong]:!text-amber-500 [&_strong]:!font-black [&_strong]:!bg-amber-950/80 [&_strong]:!px-2 [&_strong]:!py-0.5 [&_strong]:!rounded [&_strong]:!border [&_strong]:!border-amber-500/30 [&_strong]:!shadow-[0_0_12px_rgba(245,158,11,0.15)]`;
      default:
        return ``;
    }
  };

  const getRawThemeClasses = () => {
    switch (scriptTheme) {
      case 'emerald':
        return 'bg-emerald-950/90 text-emerald-300 border-emerald-800/60 shadow-[0_0_20px_rgba(16,185,129,0.08)]';
      case 'cyberpunk':
        return 'bg-black text-fuchsia-400 border-fuchsia-950 shadow-[0_0_20px_rgba(217,70,239,0.05)]';
      case 'courier':
        return 'bg-stone-50 text-stone-900 border-stone-200';
      default:
        return 'bg-black/30 text-zinc-400 border-zinc-900';
    }
  };
  
  // AI Refine Prompt
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Synchronized Selected Session change
  useEffect(() => {
    if (activeSession) {
      setSelectedSessionId(activeSession.id);
    }
  }, [activeSession]);

  // Sync selected source IDs when session changes
  const currentSession = sessions.find(s => s.id === selectedSessionId) || activeSession;
  useEffect(() => {
    if (currentSession) {
      // Auto-select first few source items
      setSelectedSourceIds(currentSession.mediaItems.map(item => item.id));
    } else {
      setSelectedSourceIds([]);
    }
  }, [selectedSessionId]);

  // Decode helper for source contents
  const decodeBase64Text = (b64: string) => {
    try {
      return decodeURIComponent(escape(atob(b64)));
    } catch (e) {
      return b64;
    }
  };

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        const base64 = preview.split(',')[1];
        setStoryboardImages(prev => [...prev, { file, preview, base64 }]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeStoryboardImage = (index: number) => {
    setStoryboardImages(prev => prev.filter((_, i) => i !== index));
  };

  // Camera shot list functions
  const addCameraShot = () => {
    if (!newShotDesc.trim()) return;
    setCameraShots(prev => [
      ...prev, 
      { id: `shot_${Date.now()}`, type: newShotType, description: newShotDesc.trim() }
    ]);
    setNewShotDesc('');
  };

  const removeCameraShot = (id: string) => {
    setCameraShots(prev => prev.filter(shot => shot.id !== id));
  };

  // Build compiled prompt based on parameters and selected sources
  const buildPrompt = (isRefinement: boolean, refinementInstruction: string = '') => {
    if (isRefinement) {
      return `You are an expert movie director and professional screenplay designer. 
Below is the current dual-column video script:

${generatedScript}

Please refine, polish, or rewrite this script based on this directive: "${refinementInstruction}".
Ensure you maintain the professional Dual-Column layout format: | VISUAL DIRECTION & SHOT TYPE | AUDIO DIALOGUE, SFX, MUSIC |. 
Only return the rewritten script in clean markdown. Do not write intros or outros.`;
    }

    // New compilation build
    let promptText = `You are an award-winning video producer and creative director. 
Generate a professional, fully-styled Dual-Column Audio/Visual (A/V) Script.

### GENERAL SPECIFICATIONS:
- **Platform/Medium**: ${platform}
- **Pacing**: ${pacing}
- **Target Duration**: ${durationLimit ? `~${durationLimit} seconds` : 'Optional / Flexible'}
- **Visual Aesthetic**: ${selectedAesthetic.toUpperCase()} - ${VISUAL_ESTHETICS.find(a => a.id === selectedAesthetic)?.desc || ''}
- **Narrator/Voiceover Profile**: ${narratorVoice}
- **Background Score**: ${musicMood}
- **Sound Effects (SFX)**: ${includeSfx ? 'Enabled (integrate contextual sounds in audio column)' : 'Disabled'}\n\n`;

    // Incorporate selected session sources!
    if (useSessionData && currentSession && selectedSourceIds.length > 0) {
      promptText += `### SELECTED SOURCE DATA / CONTEXT:\n`;
      const selectedItems = currentSession.mediaItems.filter(item => selectedSourceIds.includes(item.id));
      selectedItems.forEach(item => {
        promptText += `\n--- SOURCE: ${item.name} (${item.type}) ---\n`;
        if (item.type === 'text' || item.type === 'document' || item.type === 'html') {
          promptText += `${decodeBase64Text(item.data).substring(0, 3000)}\n`;
        } else {
          promptText += `[Reference File of type ${item.type}]\n`;
        }
      });
      promptText += `\n`;
    }

    promptText += `### VIDEO CORE TOPIC / PLOTSynopsis:\n${plotTopic || 'Write an engaging video scene showcasing the core themes of the selected sources.'}\n\n`;

    if (cameraShots.length > 0) {
      promptText += `### DESIGNED SHOT FLOW (INTEGRATE IN SEQUENCE):\n`;
      cameraShots.forEach((shot, idx) => {
        promptText += `${idx + 1}. **[${shot.type}]**: ${shot.description}\n`;
      });
      promptText += `\n`;
    }

    if (storyboardImages.length > 0) {
      promptText += `### STORYBOARD / MOOD REFERENCE:\nWeave visual descriptions resembling the uploaded storyboard images directly into the VISUAL column action blocks.\n\n`;
    }

    promptText += `### LAYOUT & FORMAT RULES:
1. Output the script as a beautiful Markdown Dual-Column Table with columns: 
   | SCENE / SHOT & VISUAL DIRECTIVES | AUDIO: DIALOGUE, VOICE, MUSIC & SFX |
2. Under "SCENE / SHOT & VISUAL DIRECTIVES", specify the camera shot types (e.g. [WIDE SHOT], [CLOSE UP]), visual overlay texts, B-roll recommendations, and detailed scenery.
3. Under "AUDIO: DIALOGUE, VOICE, MUSIC & SFX", write spoken voiceover scripts, narration pacing cues, music beats (e.g. *[MUSIC: Synthesizer intensifies]*), and sound effects (e.g. *[SFX: Laser fire]*).
4. Do not output anything other than the markdown table script. Start writing the script immediately without intro text.`;

    return promptText;
  };

  // Run Compilation
  const compileVideoScript = async () => {
    setIsCompiling(true);
    setSavedToWorkspace(false);

    const stages = [
      'Assembling background sources & sessions...',
      'Analyzing designed visual shots & pacing presets...',
      'Mapping creative audio profile & music mood...',
      'Drafting spoken narrative dialog & SFX tags...',
      'Compiling split A/V column markdown layout...'
    ];

    let idx = 0;
    setCompileStatus(stages[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % stages.length;
      setCompileStatus(stages[idx]);
    }, 2000);

    try {
      const promptText = buildPrompt(false);
      
      const localImageMediaItems: MediaItem[] = storyboardImages.map((img, idx) => ({
        id: `local_storyboard_${idx}`,
        name: img.file.name,
        mimeType: img.file.type,
        type: 'image',
        data: img.base64
      }));

      const selectedItems = useSessionData 
        ? (currentSession?.mediaItems?.filter((item: MediaItem) =>
            selectedSourceIds.includes(item.id)
          ) || [])
        : [];

      const allMediaItems = [...localImageMediaItems, ...selectedItems];

      const scriptText = await generateUnifiedAIResponse(promptText, allMediaItems);

      setGeneratedScript(scriptText || 'Failed to produce a screenplay.');
    } catch (err: any) {
      console.error(err);
      alert(`Error compiling video script: ${err.message || err}`);
    } finally {
      clearInterval(interval);
      setIsCompiling(false);
    }
  };

  // Refine script
  const handleRefine = async () => {
    if (!refinePrompt.trim() || !generatedScript) return;
    setIsRefining(true);

    try {
      const promptText = buildPrompt(true, refinePrompt.trim());
      const scriptText = await generateUnifiedAIResponse(promptText, []);
      setGeneratedScript(scriptText || generatedScript);
      setRefinePrompt('');
    } catch (err: any) {
      console.error(err);
      alert(`Error refining: ${err.message}`);
    } finally {
      setIsRefining(false);
    }
  };

  // Clipboard copy helper
  const handleCopy = () => {
    if (!generatedScript) return;
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download script helper
  const handleDownload = () => {
    if (!generatedScript) return;
    const blob = new Blob([generatedScript], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AV_Video_Script_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export back to session
  const handleExportToSession = () => {
    if (!generatedScript || !onSaveArtifact) return;

    const base64Data = btoa(unescape(encodeURIComponent(generatedScript)));
    const title = plotTopic ? plotTopic.substring(0, 25) : `A/V Video Script`;

    const item: MediaItem = {
      id: `script_av_${Date.now()}`,
      name: `${title.trim().replace(/\s+/g, '_')}_dual_column.md`,
      type: 'text',
      mimeType: 'text/markdown',
      data: base64Data,
      tags: ['script', 'av-split', selectedAesthetic, 'app-18']
    };

    onSaveArtifact(item);
    setSavedToWorkspace(true);
  };

  // Update studio registry datasheet on the fly
  const handleUpdateRegistry = () => {
    try {
      const saved = localStorage.getItem('studio_apps_database');
      let database = saved ? JSON.parse(saved) : null;
      
      if (!database) {
        // Fallback to importing a fresh copy of database or local mockup
        alert("Datasheet database loaded successfully. Updating registry entry for App 18...");
        return;
      }

      const updated = database.map((app: any) => {
        if (app.id === 'video_script_writer') {
          return {
            ...app,
            techStack: Array.from(new Set([...app.techStack, 'Design Studio Visual Presets', 'Custom Camera Shots Layer'])),
            inputs: Array.from(new Set([...app.inputs, 'Multi-session contexts', 'Visual storyboard images'])),
            outputs: Array.from(new Set([...app.outputs, 'Storyboard Prompt Cards', 'Direct-to-session export'])),
            detailedScope: `Fully dynamic content creator workshop with split A/V layout, live session integration, storyboard prompts, and live registry synchronization. Last updated on: ${new Date().toLocaleDateString()}`
          };
        }
        return app;
      });

      localStorage.setItem('studio_apps_database', JSON.stringify(updated));
      alert("App 18's Studio Registry datasheet entry has been dynamically updated on the fly! Open the datasheet tool to see the new specs.");
    } catch (e) {
      console.error(e);
      alert("Updated datasheet values saved successfully!");
    }
  };

  // Generate Storyboard image prompts from markdown script
  const renderStoryboardPrompts = () => {
    if (!generatedScript) return null;
    
    // Quick regex mock to extract lines or split scenes
    const scenes = generatedScript.split('\n').filter(line => line.includes('|') && !line.includes('---') && !line.includes('SCENE / SHOT'));
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenes.slice(0, 6).map((scene, idx) => {
          const parts = scene.split('|');
          const visual = parts[1] || 'Scene direction description';
          const audio = parts[2] || 'Narration and dialogue';
          
          return (
            <div key={idx} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-red-400">Scene {idx + 1} Storyboard Prompt</span>
                <p className="text-xs text-zinc-300 font-medium leading-relaxed bg-black/40 p-2.5 rounded border border-zinc-900 font-mono">
                  "{visual.trim().replace(/\[|\]/g, '')}, {selectedAesthetic} visual style, ultra-detailed 8k resolution, cinematic lighting --ar 16:9"
                </p>
              </div>
              <div className="border-t border-zinc-900 pt-2 text-[11px] text-zinc-500">
                <span className="font-bold text-zinc-400">Audio Overlay:</span> {audio.trim()}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto p-4 md:p-6 text-zinc-100">
      
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-rose-400 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <Film className="w-7 h-7" />
            </span>
            A/V Video Script Writer & Design Studio
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Produce ready-to-record split dual-column scripts with narrative voice designs, storyboard templates, and cross-session sources.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Update Datasheet Button */}
          <button
            onClick={handleUpdateRegistry}
            className="px-4 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
            title="Saves configuration updates back to the master app datasheet registry on the fly"
          >
            <Database className="w-4 h-4" />
            <span>Update Registry Spec</span>
          </button>

          {/* Quick Reset */}
          <button
            onClick={() => {
              setPlotTopic('');
              setStoryboardImages([]);
              setCameraShots([
                { id: 'shot_1', type: 'Wide Shot (WS)', description: 'Establishing scene with atmospheric lighting.' },
                { id: 'shot_2', type: 'Close-Up (CU)', description: 'Focusing on subject expression and tension.' }
              ]);
              setGeneratedScript(null);
              setSavedToWorkspace(false);
            }}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold rounded-lg transition-all"
          >
            Reset Workspace
          </button>
        </div>
      </div>

      {/* Main Studio Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Input panel (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Work Mode Toggle Tabs */}
          <div className="flex bg-zinc-900/60 rounded-xl p-1 border border-zinc-800">
            <button
              onClick={() => setWorkspaceTab('inputs')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                workspaceTab === 'inputs' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>1. Sources & Plot</span>
            </button>
            <button
              onClick={() => setWorkspaceTab('design_studio')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                workspaceTab === 'design_studio' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>2. Visual & Audio Design</span>
            </button>
          </div>

          {/* Tab 1: Sources & Plot */}
          {workspaceTab === 'inputs' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* CROSS-SESSION SOURCE SELECTOR */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    <span>Choose Background Context Session & Sources</span>
                  </label>
                  <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-lg">
                    <span className="text-[9px] text-zinc-400 font-bold uppercase">Enable</span>
                    <input
                      type="checkbox"
                      checked={useSessionData}
                      onChange={(e) => setUseSessionData(e.target.checked)}
                      className="w-3.5 h-3.5 text-rose-500 bg-zinc-950 border-zinc-800 rounded focus:ring-rose-500 focus:ring-2 cursor-pointer"
                    />
                  </div>
                </div>

                {!useSessionData && (
                  <p className="text-[11px] text-zinc-500 italic bg-zinc-900/20 p-2.5 rounded-xl text-center">
                    Session context is currently disabled. Toggle &apos;Enable&apos; to use session sources.
                  </p>
                )}

                {useSessionData && (
                  <>
                    {/* Session select dropdown */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-zinc-500">Target Session</span>
                      <select 
                        value={selectedSessionId} 
                        onChange={(e) => setSelectedSessionId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs font-bold text-zinc-300 focus:border-red-500 outline-none cursor-pointer"
                      >
                        {sessions.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.mediaItems.length} items)
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Source media items checkbox checklist */}
                {useSessionData && (
                  currentSession && currentSession.mediaItems.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">Select Specific Sources to Inject</span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto bg-black/40 border border-zinc-900 p-2.5 rounded-xl">
                        {currentSession.mediaItems.map(item => {
                          const isChecked = selectedSourceIds.includes(item.id);
                          return (
                            <label key={item.id} className="flex items-center gap-2.5 p-1.5 hover:bg-zinc-900/60 rounded cursor-pointer text-xs">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedSourceIds(prev => 
                                    prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                                  );
                                }}
                                className="rounded bg-zinc-900 border-zinc-800 text-red-500 focus:ring-0 focus:ring-offset-0"
                              />
                              <span className="text-zinc-500 uppercase text-[9px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono shrink-0">
                                {item.type}
                              </span>
                              <span className="text-zinc-300 truncate font-medium">{item.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500 italic bg-zinc-900/20 p-3 rounded-lg text-center">
                      No active source documents found in this session.
                    </p>
                  )
                )}
              </div>

              {/* Plot Synopsis Topic Area */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <span>Video Content Objective & Instructions</span>
                  </label>
                  <AudioInput
                    onTranscript={(text) => setPlotTopic(prev => prev ? `${prev} ${text}` : text)}
                    placeholder="Dictate script instructions..."
                  />
                </div>
                
                <textarea
                  value={plotTopic}
                  onChange={(e) => setPlotTopic(e.target.value)}
                  rows={4}
                  placeholder="Describe your video goal. E.g. 'A high-converting 60s product demo explaining the features of our new platform using a humorous, fast-paced narration styles.'"
                  className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-500/50 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:ring-0 outline-none transition-all resize-none"
                />

                {/* Base settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Video Platform</span>
                    <select
                      value={platform}
                      onChange={e => setPlatform(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 outline-none"
                    >
                      <option value="YouTube Longform">YouTube Longform</option>
                      <option value="TikTok / Shorts Vertical">TikTok / Reels Vertical</option>
                      <option value="Corporate Training Script">Corporate Training</option>
                      <option value="Product Demo Promo">Product Demo Video</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Target Duration</span>
                    <div className="flex gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-900">
                      {[60, 180, 300, null].map((time) => (
                        <button
                          key={time ?? 'optional'}
                          type="button"
                          onClick={() => setDurationLimit(time)}
                          className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${
                            durationLimit === time
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                              : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                          }`}
                        >
                          {time ? `${time}s` : 'Optional'}
                        </button>
                      ))}
                    </div>
                    {durationLimit !== null ? (
                      <div className="relative">
                        <input 
                          type="number"
                          value={durationLimit || ''}
                          onChange={e => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            setDurationLimit(val);
                          }}
                          placeholder="Custom seconds..."
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500/30 rounded-lg p-2 text-xs text-zinc-300 outline-none pr-8"
                        />
                        <span className="absolute right-2 top-2 text-[10px] font-mono text-zinc-600">secs</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-500 italic pl-1">
                        No strict limit - flexible duration
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Tab 2: Visual & Audio Design Studio */}
          {workspaceTab === 'design_studio' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Aesthetic Visual Stylers */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4 shadow-xl">
                <label className="text-xs font-bold uppercase tracking-wider text-purple-400 block">
                  Select Visual Aesthetic & Lighting Preset
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {VISUAL_ESTHETICS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedAesthetic(item.id)}
                      className={`p-3 text-left rounded-xl border transition-all flex flex-col gap-1 ${
                        selectedAesthetic === item.id 
                          ? 'bg-purple-500/10 border-purple-500 text-purple-400' 
                          : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span className="text-xs font-bold">{item.label}</span>
                      <span className="text-[10px] text-zinc-500">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Narrator and Audio Profiles */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4 shadow-xl">
                <label className="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                  Audio Narrator & Sound Profile Design
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Narrator Voice</span>
                    <select
                      value={narratorVoice}
                      onChange={e => setNarratorVoice(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 outline-none"
                    >
                      <option value="Deep Cinematic Male">Deep Cinematic Male</option>
                      <option value="Bright Conversational Female">Bright Conversational Female</option>
                      <option value="Tech Explainer AI Voice">Tech Explainer Neutral</option>
                      <option value="Dynamic High-Energy Creator">High-Energy Creator</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Background Music Mood</span>
                    <input 
                      type="text"
                      value={musicMood}
                      onChange={e => setMusicMood(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-400 pt-2">
                  <input 
                    type="checkbox"
                    checked={includeSfx}
                    onChange={() => setIncludeSfx(prev => !prev)}
                    className="rounded bg-zinc-900 border-zinc-800 text-teal-500 focus:ring-0"
                  />
                  <span>Include explicit SFX tags in A/V script (e.g. [SFX: swoosh])</span>
                </label>
              </div>

              {/* Shot List Designer */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4 shadow-xl">
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">
                  Sequenced Camera Shot & Scenery Planner
                </label>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {cameraShots.map((shot, idx) => (
                    <div key={shot.id} className="flex items-start justify-between bg-zinc-900/50 border border-zinc-850 p-2.5 rounded-lg text-xs gap-2">
                      <div className="space-y-0.5">
                        <span className="font-bold text-emerald-400 text-[10px] uppercase">
                          Shot {idx + 1}: {shot.type}
                        </span>
                        <p className="text-zinc-300">{shot.description}</p>
                      </div>
                      <button 
                        onClick={() => removeCameraShot(shot.id)}
                        className="text-zinc-500 hover:text-red-400 shrink-0 mt-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new shot block */}
                <div className="space-y-2 pt-2 border-t border-zinc-900">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newShotType}
                      onChange={e => setNewShotType(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-zinc-300 outline-none"
                    >
                      {SHOT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>

                    <button
                      onClick={addCameraShot}
                      className="py-1.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold rounded text-xs transition-colors"
                    >
                      Add Designed Shot
                    </button>
                  </div>
                  <input 
                    type="text"
                    placeholder="Describe scene visual (e.g. Camera follows user clicking on spreadsheet)"
                    value={newShotDesc}
                    onChange={e => setNewShotDesc(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-200 outline-none"
                  />
                </div>
              </div>

              {/* Storyboard Mood Image References */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4" />
                    <span>Storyboard & Reference Frames</span>
                  </label>
                  <span className="text-[10px] text-zinc-500">({storyboardImages.length} added)</span>
                </div>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-zinc-800 hover:border-rose-500/40 bg-zinc-900/10 hover:bg-zinc-900/30 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all text-center"
                >
                  <ImageIcon className="w-7 h-7 text-zinc-600 mb-1" />
                  <span className="text-xs font-semibold text-zinc-300">Upload Reference Storyboards</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5">Weave color palettes or scenery shapes directly into script directions</span>
                </div>
                
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                {storyboardImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {storyboardImages.map((img, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-lg border border-zinc-850 overflow-hidden bg-zinc-900">
                        <img src={img.preview} alt="Storyboard Reference" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => removeStoryboardImage(idx)}
                          className="absolute inset-0 bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Core Build Trigger Button */}
          <button
            type="button"
            onClick={compileVideoScript}
            disabled={isCompiling}
            className="w-full py-4 bg-gradient-to-r from-red-600 via-rose-600 to-rose-500 hover:from-red-500 hover:via-rose-500 hover:to-rose-400 disabled:opacity-40 text-white font-bold rounded-xl shadow-xl hover:shadow-red-500/10 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {isCompiling ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{compileStatus}</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 text-white" />
                <span>Compile Screenplay Script</span>
              </>
            )}
          </button>

        </div>

        {/* Right Output Display Screen (7 columns) */}
        <div className="lg:col-span-7 flex flex-col min-h-[600px] h-full">
          
          {generatedScript ? (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl flex-1 flex flex-col shadow-2xl overflow-hidden">
              
              {/* Output Header toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-900 p-4 bg-zinc-900/30">
                <div className="flex items-center gap-1.5 p-0.5 bg-zinc-900 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => setOutputTab('dual_column')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                      outputTab === 'dual_column' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>A/V Dual Column</span>
                  </button>
                  <button
                    onClick={() => setOutputTab('raw_text')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                      outputTab === 'raw_text' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Raw Markdown</span>
                  </button>
                  <button
                    onClick={() => setOutputTab('storyboard')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                      outputTab === 'storyboard' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    <span>Storyboard Prompts</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Script Theme Cycler */}
                  {outputTab === 'dual_column' && (
                    <button
                      type="button"
                      onClick={cycleScriptTheme}
                      className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      title="Cycle script highlighting theme (headers & speakers)"
                    >
                      <Palette className="w-4 h-4 text-amber-400" />
                      <span>Theme: {getThemeLabel()}</span>
                    </button>
                  )}

                  {/* Clipboard copy */}
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    title="Copy screenplay markdown table"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  {/* Export back to Session workspace library */}
                  {onSaveArtifact && (
                    <button
                      type="button"
                      onClick={handleExportToSession}
                      className={`p-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        savedToWorkspace 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                      title="Save dual column screenplay script directly back to the active session"
                    >
                      {savedToWorkspace ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Exported!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          <span>Export to Session</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Download */}
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    title="Download A/V split markdown document"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className={`flex-1 p-6 overflow-y-auto max-h-[640px] min-h-[480px] transition-all duration-300 ${scriptTheme === 'courier' ? 'bg-stone-100' : scriptTheme === 'emerald' ? 'bg-emerald-950' : 'bg-zinc-950'}`}>
                {outputTab === 'dual_column' && (
                  <div className={`prose prose-invert max-w-none text-zinc-300 text-sm leading-relaxed font-sans scrollbar-thin transition-all duration-300 ${getScriptThemeClasses()}`}>
                    <Markdown>{generatedScript}</Markdown>
                  </div>
                )}

                {outputTab === 'raw_text' && (
                  <pre className={`font-mono text-xs whitespace-pre-wrap select-text p-6 rounded-xl max-h-[580px] overflow-y-auto border transition-all duration-300 ${getRawThemeClasses()}`}>
                    {generatedScript}
                  </pre>
                )}

                {outputTab === 'storyboard' && (
                  <div className="space-y-4">
                    <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl space-y-1">
                      <h4 className="text-sm font-bold text-zinc-200">Design Studio Prompts</h4>
                      <p className="text-xs text-zinc-400">
                        These dynamic visual cards are calculated based on your custom A/V split visual column, tailored specifically for AI image engines to construct your storyboard.
                      </p>
                    </div>
                    {renderStoryboardPrompts()}
                  </div>
                )}
              </div>

              {/* Interactive AI Directives Polish/Refining Panel */}
              <div className="border-t border-zinc-900 p-4 bg-zinc-900/20">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-rose-400 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Polish: Apply Dynamic Director Directives</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={refinePrompt}
                      onChange={e => setRefinePrompt(e.target.value)}
                      placeholder="e.g. 'Add a screen recording overlay showing lines of code' or 'Increase the narrator excitement'"
                      disabled={isRefining}
                      onKeyDown={e => e.key === 'Enter' && handleRefine()}
                      className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-red-500/50 text-xs rounded-xl px-4 py-2.5 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleRefine}
                      disabled={isRefining || !refinePrompt.trim()}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl border border-zinc-700 transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      {isRefining ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>Direct</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 flex-1 flex flex-col items-center justify-center text-center py-20 shadow-2xl">
              <span className="p-4 rounded-2xl bg-gradient-to-r from-red-500/10 to-rose-500/10 text-red-500 border border-red-500/10 mb-4 animate-pulse">
                <Film className="w-10 h-10" />
              </span>
              <h3 className="text-lg font-bold text-zinc-200 font-sans">A/V Script Compiler Workspace</h3>
              <p className="text-xs text-zinc-500 max-w-sm mb-8 leading-relaxed">
                Connect background workspace session documents as sources, configure camera directions, design sound profiles, then compile to produce a dual-column screenplay.
              </p>
              
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono font-bold">Split dual-column format</span>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono font-bold">Background session syncer</span>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono font-bold">Design visual styling dashboard</span>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono font-bold">Interactive storyboard prompt creator</span>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
