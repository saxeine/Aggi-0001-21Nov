import React, { useState, useRef } from 'react';
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
  Palette
} from 'lucide-react';
import { AudioInput } from '../AudioInput';
import { useLanguage } from '../../contexts/LanguageContext';
import Markdown from 'react-markdown';
import { MediaItem } from '../../types';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';

interface ScriptWriterProps {
  session?: any | null;
  onSaveArtifact?: (mediaItem: MediaItem) => void;
  onRunTool?: (toolId: string, payload?: any) => void;
}

interface ImageUpload {
  file: File;
  preview: string;
  base64: string;
}

interface Character {
  name: string;
  role: string;
}

const SUGGESTIVE_IDEAS = [
  { id: 'twist', label: '🎭 Unexpected Twist', prompt: 'Include an unexpected plot twist near the middle that changes everything.' },
  { id: 'dialogue', label: '⚡ Snappy Dialogue', prompt: 'Write highly stylized, sharp, fast-paced, and witty dialogue.' },
  { id: 'aesthetic', label: '🕶️ Neo-Noir Vibe', prompt: 'Infuse a moody, high-contrast, atmospheric Neo-Noir cinematic aesthetic.' },
  { id: 'metaphor', label: '🎨 Visual Metaphor', prompt: 'Use recurring visual metaphors and symbolic objects to tell the story visually.' },
  { id: 'irony', label: '💔 Dramatic Irony', prompt: 'Employ strong dramatic irony where the audience knows something a key character does not.' },
  { id: 'cliffhanger', label: '🍿 Tense Cliffhanger', prompt: 'End with a high-stakes, suspenseful cliffhanger.' },
  { id: 'monologue', label: '🕰️ Inner Monologue', prompt: 'Include a poetic voiceover/inner monologue from the protagonist.' },
  { id: 'humor', label: '🐱 Dark Comedy', prompt: 'Balance the dark situation with dry, cynical, and sarcastic dark humor.' }
];

export const ScriptWriter: React.FC<ScriptWriterProps> = ({ session, onSaveArtifact, onRunTool }) => {
  const { t } = useLanguage();
  
  // State variables
  const [plot, setPlot] = useState('');
  const [useSessionData, setUseSessionData] = useState(false);
  const [images, setImages] = useState<ImageUpload[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<string[]>([]);
  const [genre, setGenre] = useState('Sci-Fi');
  const [tone, setTone] = useState('Cinematic');
  const [format, setFormat] = useState('Screenplay');
  const [pacing, setPacing] = useState('Balanced');
  const [characters, setCharacters] = useState<Character[]>([
    { name: 'Protagonist', role: 'Main seeker' }
  ]);
  const [newCharName, setNewCharName] = useState('');
  const [newCharRole, setNewCharRole] = useState('');
  
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStatus, setCompileStatus] = useState('');
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');
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
  
  // AI Refine Script State
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers for Images
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        const base64 = preview.split(',')[1];
        setImages(prev => [...prev, { file, preview, base64 }]);
      };
      reader.readAsDataURL(file);
    });
    
    // Clear the file input so the same files can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle Suggestive Idea
  const toggleIdea = (id: string) => {
    setSelectedIdeas(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Character Management
  const addCharacter = () => {
    if (!newCharName.trim()) return;
    setCharacters(prev => [...prev, { name: newCharName.trim(), role: newCharRole.trim() || 'Supporting Character' }]);
    setNewCharName('');
    setNewCharRole('');
  };

  const removeCharacter = (index: number) => {
    setCharacters(prev => prev.filter((_, i) => i !== index));
  };

  // Helper function to build custom compile prompts
  const buildPrompt = (isRefiningScript: boolean, refineDirective: string = '') => {
    let promptText = '';
    
    if (isRefiningScript) {
      promptText = `Here is the current script:\n\n${generatedScript}\n\nPlease refine and modify this script based on the following instruction: "${refineDirective}".\n\n`;
      promptText += `Maintain the overall screenwriting format, tone, and pacing. Return ONLY the fully updated and rewritten script. Do not include introductory text.`;
      return promptText;
    }

    // New Script Build
    promptText = `You are an award-winning screenplay and script writer. Draft an engaging, highly-polished script based on the following instructions.\n\n`;
    
    promptText += `### STORY FOCUS / CORE IDEA:\n${plot || 'Write an immersive story scene based on the characters and style choices below.'}\n\n`;
    
    promptText += `### CREATIVE PARAMETERS:\n`;
    promptText += `- **Genre**: ${genre}\n`;
    promptText += `- **Tone**: ${tone}\n`;
    promptText += `- **Format/Layout**: ${format} (Ensure standard, beautiful industry layout formatting for this choice)\n`;
    promptText += `- **Pacing**: ${pacing}\n\n`;

    if (characters.length > 0) {
      promptText += `### CHARACTERS INVOLVED:\n`;
      characters.forEach(char => {
        promptText += `- **${char.name}**: ${char.role}\n`;
      });
      promptText += `\n`;
    }

    const appliedIdeas = SUGGESTIVE_IDEAS.filter(idea => selectedIdeas.includes(idea.id));
    if (appliedIdeas.length > 0) {
      promptText += `### SUGGESTIVE DIRECTIVES & IDEAS TO INTEGRATE:\n`;
      appliedIdeas.forEach(idea => {
        promptText += `- ${idea.prompt}\n`;
      });
      promptText += `\n`;
    }

    if (images.length > 0) {
      promptText += `### VISUAL REFERENCES:\nAnalyze the provided image references carefully. Interpret their contents, environments, color palette, lighting, moods, or characters, and translate them directly into visual scene descriptions, action lines, setting headers, or costuming inside the script.\n\n`;
    }

    promptText += `### FORMATTING & OUTPUT RULES:\n`;
    if (format === 'Screenplay') {
      promptText += `1. Follow standard Hollywood Screenplay Format. Use bold headers like "SCENE 1: INT. SPACE STATION - NIGHT".\n`;
      promptText += `2. Put character names in bold caps, centered on a line, followed by their dialogue directly below it (indented slightly for readability).\n`;
      promptText += `3. Include parentheticals for delivery mood (e.g. *(whispering)*) where appropriate.\n`;
      promptText += `4. Keep action descriptions visual, cinematic, and written in the present tense.\n`;
    } else if (format === 'A/V Dual-Column') {
      promptText += `1. Format as an elegant 2-column list or Markdown table with headers: | VISUAL (Scene & Directions) | AUDIO (Dialogue & Sound Effects) |.\n`;
      promptText += `2. Ensure clear coordination between left and right column visual/audio cues.\n`;
    } else if (format === 'TikTok / YouTube Shorts') {
      promptText += `1. Build for rapid engagement. Write a clear "[HOOK]" within the first 3 seconds.\n`;
      promptText += `2. Use snappy on-screen-text cues like "[TEXT ON SCREEN: ...]" and visual indicators.\n`;
      promptText += `3. Maximize punchy dialogue and fast pacing.\n`;
    } else if (format === 'Podcast / Conversation') {
      promptText += `1. Format as a natural, conversational, unscripted-feeling transcript.\n`;
      promptText += `2. Use host names like "Host: " and "Expert: ", adding back-and-forth interruptions, agreements, laughs, or thought pauses.\n`;
    } else {
      promptText += `1. Generate a robust audio drama/radio narrative script. Utilize parentheticals like "[SFX: rain pattering on a window]" and "[MUSIC: low synth drone rises]".\n`;
    }
    
    promptText += `Return the complete, finished script in elegant, clean Markdown. Do not include meta-discussions or concluding notes, just start writing the script immediately.`;
    return promptText;
  };

  // Compile Trigger
  const compileScript = async () => {
    setIsCompiling(true);
    setSavedToWorkspace(false);
    
    const statuses = [
      'Analyzing plot instructions and parameters...',
      'Decoding multimodal image references...',
      'Synthesizing suggestive creative directives...',
      'Drafting character motivations & dialogue...',
      'Applying professional script layout formatting...',
      'Reviewing and polishing dramatic pacing...'
    ];

    // Cycle through status messages for a professional visual feel
    let statusIdx = 0;
    setCompileStatus(statuses[0]);
    const statusInterval = setInterval(() => {
      statusIdx = (statusIdx + 1) % statuses.length;
      setCompileStatus(statuses[statusIdx]);
    }, 2500);

    try {
      const promptText = buildPrompt(false);
      
      // Build local image media items array
      const localImageMediaItems: MediaItem[] = images.map((img, idx) => ({
        id: `local_img_${idx}`,
        name: img.file.name,
        mimeType: img.file.type,
        type: 'image',
        data: img.base64
      }));

      const selectedItems = useSessionData 
        ? (session?.mediaItems?.filter((item: MediaItem) =>
            session?.selectedMediaIds?.includes(item.id)
          ) || [])
        : [];

      const allMediaItems = [...localImageMediaItems, ...selectedItems];

      const scriptText = await generateUnifiedAIResponse(promptText, allMediaItems);

      setGeneratedScript(scriptText || "No script could be compiled. Please check your inputs.");
    } catch (err: any) {
      console.error(err);
      alert(`Error compiling script: ${err.message || err}`);
    } finally {
      clearInterval(statusInterval);
      setIsCompiling(false);
    }
  };

  // Polish / Refine Trigger
  const refineScript = async () => {
    if (!refinePrompt.trim() || !generatedScript) return;
    setIsRefining(true);
    
    try {
      const promptText = buildPrompt(true, refinePrompt.trim());
      const scriptText = await generateUnifiedAIResponse(promptText, []);
      setGeneratedScript(scriptText || generatedScript);
      setRefinePrompt('');
    } catch (err: any) {
      console.error(err);
      alert(`Error refining script: ${err.message || err}`);
    } finally {
      setIsRefining(false);
    }
  };

  // Clipboard Copy Helper
  const copyToClipboard = () => {
    if (!generatedScript) return;
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download File Helper
  const downloadScriptFile = () => {
    if (!generatedScript) return;
    const element = document.createElement("a");
    const file = new Blob([generatedScript], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${plot ? plot.substring(0, 15).replace(/\s+/g, '_') : 'script'}_writer.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Save to Session / Workspace helper
  const handleSaveToWorkspace = () => {
    if (!generatedScript || !onSaveArtifact) return;

    const base64Data = btoa(unescape(encodeURIComponent(generatedScript)));
    const cleanTitle = plot ? plot.substring(0, 30) : `AI Script (${genre})`;

    const item: MediaItem = {
      id: `script_${Date.now()}`,
      name: `${cleanTitle}.txt`,
      type: 'text',
      mimeType: 'text/plain',
      data: base64Data,
      tags: ['script', genre.toLowerCase(), tone.toLowerCase()]
    };

    onSaveArtifact(item);
    setSavedToWorkspace(true);
  };

  const selectedItemsCount = session?.mediaItems?.filter((item: MediaItem) =>
    session?.selectedMediaIds?.includes(item.id)
  )?.length || 0;

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto p-4 md:p-6 text-zinc-100">
      
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-amber-500 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <Film className="w-7 h-7" />
            </span>
            AI Script Writer & Screenplay Studio
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Compose and compile industry-standard screenplay scripts with text prompts, storyboard images, and suggestive concepts.
          </p>
        </div>
        
        {/* Quick Reset */}
        <button
          onClick={() => {
            setPlot('');
            setImages([]);
            setSelectedIdeas([]);
            setCharacters([{ name: 'Protagonist', role: 'Main seeker' }]);
            setGeneratedScript(null);
            setSavedToWorkspace(false);
          }}
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold rounded-lg transition-all"
        >
          Reset Workspace
        </button>
      </div>

      {/* Main Studio Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Input & Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Plot Text Prompt Area */}
          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
                <span>1. Plot Synopsis & Directives</span>
              </label>
              <AudioInput
                onTranscript={(text) => setPlot(prev => prev ? `${prev} ${text}` : text)}
                placeholder="Dictate your scene plot..."
              />
            </div>
            
            <textarea
              value={plot}
              onChange={(e) => setPlot(e.target.value)}
              rows={4}
              placeholder="Describe what happens in your scene. E.g. 'Two rival hackers meet in a neon-lit ramen shop to trade a decrypted data drive, but they soon realize they are being set up...'"
              className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-500/50 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:ring-0 outline-none transition-all resize-none"
            />
          </div>

          {/* Multimodal Image References */}
          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                <span>2. Storyboard & Visual References</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-medium">({images.length} added)</span>
            </div>
            
            <div className="space-y-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-800 hover:border-amber-500/40 bg-zinc-900/20 hover:bg-zinc-900/40 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center"
              >
                <ImageIcon className="w-8 h-8 text-zinc-600 mb-2" />
                <span className="text-xs font-bold text-zinc-300">Upload Reference Images</span>
                <span className="text-[10px] text-zinc-500 mt-1">Drag and drop images or click to select storyboard reference files</span>
              </div>
              
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                className="hidden"
              />

              {/* Upload Previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg border border-zinc-800 overflow-hidden bg-zinc-900">
                      <img src={img.preview} alt="Reference Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute inset-0 bg-red-600/95 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                        title="Remove Image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Directives & Suggestive Ideas */}
          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4 shadow-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-400">
              3. Creative Ideas & Suggestive Concepts
            </label>
            
            <p className="text-[11px] text-zinc-500">
              Tap any suggestive directive card to force the AI writer to weave that specific narrative device or pacing into your screenplay.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIVE_IDEAS.map(idea => {
                const isActive = selectedIdeas.includes(idea.id);
                return (
                  <button
                    key={idea.id}
                    type="button"
                    onClick={() => toggleIdea(idea.id)}
                    className={`p-2.5 text-left rounded-xl border text-xs font-medium transition-all ${
                      isActive 
                        ? 'bg-purple-500/10 border-purple-500 text-purple-400 shadow-md shadow-purple-500/5' 
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    {idea.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Session Context Reference status */}
          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Knowledge base context
              </label>
              <input
                type="checkbox"
                checked={useSessionData}
                onChange={(e) => setUseSessionData(e.target.checked)}
                className="w-4 h-4 text-red-500 bg-zinc-900 border-zinc-800 rounded focus:ring-red-500 focus:ring-2"
              />
            </div>
            <p className="text-xs text-zinc-500">
              {selectedItemsCount > 0 
                ? `${useSessionData ? 'Using' : 'Ignoring'} ${selectedItemsCount} selected reference(s) from active session to ground script writing.`
                : '⚠️ No reference files selected in session chat yet. Script will use general creative inputs.'}
            </p>
          </div>

          {/* Scene Parameters & Format */}
          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-5 shadow-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
              4. Format & Genre Setup
            </label>

            <div className="grid grid-cols-2 gap-4">
              {/* Format Select */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Script Format</span>
                <select 
                  value={format} 
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs font-bold text-zinc-300 focus:border-emerald-500 outline-none cursor-pointer"
                >
                  <option value="Screenplay">Movie Screenplay</option>
                  <option value="A/V Dual-Column">A/V Dual Column</option>
                  <option value="TikTok / YouTube Shorts">Social Short Video</option>
                  <option value="Podcast / Conversation">Podcast Dialogue</option>
                  <option value="Audio Drama">Audio/SFX Drama</option>
                </select>
              </div>

              {/* Genre Select */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Genre</span>
                <select 
                  value={genre} 
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs font-bold text-zinc-300 focus:border-emerald-500 outline-none cursor-pointer"
                >
                  <option value="Sci-Fi">Science Fiction</option>
                  <option value="Drama">Drama</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Horror">Horror/Thriller</option>
                  <option value="Noir / Detective">Crime Noir</option>
                  <option value="Action">Action/Adventure</option>
                  <option value="Educational / Ad">Corporate Ad</option>
                </select>
              </div>

              {/* Tone Select */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Tone</span>
                <select 
                  value={tone} 
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs font-bold text-zinc-300 focus:border-emerald-500 outline-none cursor-pointer"
                >
                  <option value="Cinematic">Cinematic</option>
                  <option value="Suspenseful">Suspenseful</option>
                  <option value="Atmospheric">Atmospheric</option>
                  <option value="Whimsical">Whimsical</option>
                  <option value="Sarcastic">Sarcastic</option>
                  <option value="Epic">Epic</option>
                  <option value="Intimate">Intimate</option>
                </select>
              </div>

              {/* Pacing Select */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Pacing</span>
                <select 
                  value={pacing} 
                  onChange={(e) => setPacing(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs font-bold text-zinc-300 focus:border-emerald-500 outline-none cursor-pointer"
                >
                  <option value="Balanced">Balanced</option>
                  <option value="Fast / High-Octane">Fast-Paced</option>
                  <option value="Slow / Atmospheric">Slow / Moody</option>
                </select>
              </div>
            </div>

            {/* Character Setup */}
            <div className="space-y-3 pt-3 border-t border-zinc-900">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Dramatis Personae (Characters)</span>
              
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {characters.map((char, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs"
                  >
                    <User className="w-3 h-3 text-red-400" />
                    <span className="font-bold">{char.name}</span>
                    <span className="text-[10px] text-zinc-500">({char.role})</span>
                    <button 
                      type="button" 
                      onClick={() => removeCharacter(idx)}
                      className="text-zinc-500 hover:text-red-400 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Character Input fields */}
              <div className="flex gap-2 items-center">
                <input 
                  type="text"
                  placeholder="Name (e.g. Leo)"
                  value={newCharName}
                  onChange={e => setNewCharName(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 w-1/2 focus:border-emerald-500 outline-none"
                />
                <input 
                  type="text"
                  placeholder="Role (e.g. Detective)"
                  value={newCharRole}
                  onChange={e => setNewCharRole(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 w-1/2 focus:border-emerald-500 outline-none"
                />
                <button
                  type="button"
                  onClick={addCharacter}
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 hover:text-emerald-300 rounded border border-zinc-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Core Build Button */}
          <button
            type="button"
            onClick={compileScript}
            disabled={isCompiling}
            className="w-full py-4 bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 hover:from-red-500 hover:via-amber-500 hover:to-amber-400 disabled:opacity-40 text-white font-bold rounded-xl shadow-xl hover:shadow-red-500/10 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
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
                <span>Compile & Write Screenplay</span>
              </>
            )}
          </button>

        </div>

        {/* Right Output Screen (7 cols) */}
        <div className="lg:col-span-7 flex flex-col min-h-[600px] h-full">
          
          {generatedScript ? (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl flex-1 flex flex-col shadow-2xl overflow-hidden">
              
              {/* Output Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-900 p-4 bg-zinc-900/30">
                <div className="flex items-center gap-1.5 p-0.5 bg-zinc-900 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Script Preview
                  </button>
                  <button
                    onClick={() => setActiveTab('raw')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'raw' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Raw Text
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Script Theme Cycler */}
                  {activeTab === 'preview' && (
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
                    onClick={copyToClipboard}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    title="Copy script to clipboard"
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

                  {/* Save to workspace session if available */}
                  {onSaveArtifact && (
                    <button
                      type="button"
                      onClick={handleSaveToWorkspace}
                      className={`p-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        savedToWorkspace 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                      title="Save text artifact to active workspace session"
                    >
                      {savedToWorkspace ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Saved to Library</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          <span>Save to Session</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Export as file */}
                  <button
                    type="button"
                    onClick={downloadScriptFile}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    title="Download .txt script file"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Generated Text Area */}
              <div className={`flex-1 p-6 overflow-y-auto max-h-[640px] min-h-[480px] transition-all duration-300 ${scriptTheme === 'courier' ? 'bg-stone-100' : scriptTheme === 'emerald' ? 'bg-emerald-950' : 'bg-zinc-950'}`}>
                {activeTab === 'preview' ? (
                  <div className={`markdown-body text-zinc-300 text-sm leading-relaxed font-sans space-y-4 prose prose-invert max-w-none prose-sm transition-all duration-300 ${getScriptThemeClasses()}`}>
                    <Markdown>{generatedScript}</Markdown>
                  </div>
                ) : (
                  <pre className={`font-mono text-xs whitespace-pre-wrap select-text p-6 rounded-xl max-h-[580px] overflow-y-auto border transition-all duration-300 ${getRawThemeClasses()}`}>
                    {generatedScript}
                  </pre>
                )}
              </div>

              {/* AI Refining / Re-Prompt Panel */}
              <div className="border-t border-zinc-900 p-4 bg-zinc-900/20">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Polishing: Refit with AI Directives</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={refinePrompt}
                      onChange={e => setRefinePrompt(e.target.value)}
                      placeholder="e.g. 'Make Clara sound more tense' or 'Add a dramatic pause before the hacker speaks'"
                      disabled={isRefining}
                      onKeyDown={e => e.key === 'Enter' && refineScript()}
                      className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-red-500/50 text-xs rounded-xl px-4 py-2.5 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={refineScript}
                      disabled={isRefining || !refinePrompt.trim()}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl border border-zinc-700 transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      {isRefining ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>Polish</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 flex-1 flex flex-col items-center justify-center text-center py-20 shadow-2xl">
              <span className="p-4 rounded-2xl bg-gradient-to-r from-red-500/10 to-amber-500/10 text-red-400 border border-red-500/10 mb-4 animate-pulse">
                <Film className="w-10 h-10" />
              </span>
              <h3 className="text-lg font-bold text-zinc-200">No Screenplay Compiled Yet</h3>
              <p className="text-xs text-zinc-500 max-w-sm mb-8 leading-relaxed">
                Add story inputs, visual references, or toggle suggestive concepts, then click the compile button to create your AI screenplay.
              </p>
              
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono font-bold">Hollywood Standard formatting</span>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono font-bold">Multimodal reference parser</span>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono font-bold">Interactive polish prompt</span>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
