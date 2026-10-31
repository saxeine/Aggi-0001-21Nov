import React, { useState, useRef } from 'react';
import { 
  Eye, 
  Sparkles, 
  Image as ImageIcon, 
  Trash2, 
  Copy, 
  Download, 
  ChevronRight, 
  FileText, 
  X, 
  Check, 
  RefreshCw, 
  Info,
  Layers,
  Activity,
  Maximize2
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import Markdown from 'react-markdown';
import { MediaItem } from '../../types';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';

interface ImageDescriberProps {
  session?: any | null;
  onSaveArtifact?: (mediaItem: MediaItem) => void;
}

interface ImageFile {
  file: File;
  preview: string;
  base64: string;
}

const ANALYSIS_STYLES = [
  { id: 'detailed', name: '🔍 Ultra Detailed', description: 'Deconstructs every object, layout, color palette, lighting source, and texture in high-fidelity.' },
  { id: 'aesthetic', name: '✨ Aesthetic & Artistic', description: 'Critiques the creative composition, mood, historical style, color harmony, and artistic impact.' },
  { id: 'alt_text', name: '♿ Accessibility Alt-Text', description: 'Creates clear, concise, and professional alt-text/captions for screen readers and web use.' },
  { id: 'detective', name: '🕵️ Forensic Detection', description: 'Extracts text/OCR, identifies materials, estimates setting/location, and isolates subtle clues.' },
  { id: 'literal_explain', name: '📊 Straight Retell (Data & Context)', description: 'Conveys exactly what the image purveys. Perfect for charts, graphs, and diagrams. Explains embedded data and core messages directly without artistic details.' },
  { id: 'story', name: '📖 Narrative/Story Starter', description: 'Translates the visual setting and characters into rich, novelistic, descriptive prose.' }
];

export const ImageDescriber: React.FC<ImageDescriberProps> = ({ session, onSaveArtifact }) => {
  const { t } = useLanguage();
  
  // States
  const [images, setImages] = useState<ImageFile[]>([]);
  const [analysisStyle, setAnalysisStyle] = useState('detailed');
  const [customFocus, setCustomFocus] = useState('');
  const [useSessionData, setUseSessionData] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [analysisOutput, setAnalysisOutput] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');
  const [copied, setCopied] = useState(false);
  const [savedToWorkspace, setSavedToWorkspace] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File uploading
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

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const buildPrompt = () => {
    let prompt = `You are a world-class visual analyst, art critic, and accessibility specialist.\n\n`;
    prompt += `Please analyze the provided image(s) very carefully and generate a highly professional description based on the requested style.\n\n`;

    const selectedItems = useSessionData 
      ? (session?.mediaItems?.filter((item: MediaItem) =>
          session?.selectedMediaIds?.includes(item.id)
        ) || [])
      : [];

    if (selectedItems.length > 0) {
      prompt += `### BACKGROUND SESSION CONTEXT:\nUse the following reference knowledge from the current user session to help identify specific objects, terminology, product names, logos, or formulas depicted in the image:\n`;
      selectedItems.forEach((item: MediaItem) => {
        prompt += `- Reference: ${item.name} (${item.type})\n`;
      });
      prompt += `\n`;
    }

    prompt += `### DESIRED ANALYSIS STYLE: `;
    if (analysisStyle === 'detailed') {
      prompt += `Ultra Detailed & Forensic\n`;
      prompt += `- Break down the image into sections (Foreground, Midground, Background).\n`;
      prompt += `- Identify all recognizable objects, human elements, expressions, or clothing.\n`;
      prompt += `- Detail the specific color palette (using hex references or descriptive color terms), ambient lighting direction, textures, and depth.\n`;
    } else if (analysisStyle === 'aesthetic') {
      prompt += `Artistic, Aesthetic & Composition Critique\n`;
      prompt += `- Analyze composition rules (e.g. rule of thirds, leading lines, framing, symmetry).\n`;
      prompt += `- Critique the creative style (e.g. impressionist, high-contrast cyberpunk, brutalist minimalist, editorial photography).\n`;
      prompt += `- Discuss the emotional resonance, atmospheric mood, and overall visual storytelling impact.\n`;
    } else if (analysisStyle === 'alt_text') {
      prompt += `Web Accessibility & Alt-Text\n`;
      prompt += `- Write a single concise 2-3 sentence description perfect for HTML 'alt' attributes (under 150 characters if possible, or up to 250 characters for complex visual graphics).\n`;
      prompt += `- Write a secondary "Extended Description" providing clear, objective screen-reader details without subjective artistic interpretation.\n`;
    } else if (analysisStyle === 'detective') {
      prompt += `Forensic Extraction & OCR Detection\n`;
      prompt += `- Transcribe any readable text, logos, signage, or typography present in the image.\n`;
      prompt += `- Isolate details: materials (e.g. wet concrete, brushed steel), time of day indicators, weather, technology clues, and architecture.\n`;
    } else if (analysisStyle === 'literal_explain') {
      prompt += `Straight Retell, Context & Data Extraction\n`;
      prompt += `- Explain the exact meaning, message, purpose, or data that the image is trying to purvey.\n`;
      prompt += `- If the image contains a chart, graph, diagram, map, slide, or UI screen, thoroughly identify the key data points, trends, legends, axes, table data, and relationships.\n`;
      prompt += `- Transcribe any embedded text or numbers, and summarize what is going on with the help of this data.\n`;
      prompt += `- STRICT RULE: Avoid describing any subjective design choices, aesthetic styles, moods, colors (unless functional like colored lines on a graph), lighting, or atmospheric qualities. Keep it purely functional, informative, and literal.\n`;
    } else {
      prompt += `Rich Narrative Prose\n`;
      prompt += `- Ignore cold, clinical labels. Turn the image into a vivid, atmospheric narrative story prompt.\n`;
      prompt += `- Focus on sensory descriptions: what the air feels like, the sounds that might echo, the hidden thoughts of characters.\n`;
    }

    if (customFocus.trim()) {
      prompt += `\n### CRITICAL FOCUS DIRECTIVE (User Requested):\n"${customFocus.trim()}"\n\n`;
    }

    prompt += `\n### OUTPUT RULES:\n`;
    prompt += `1. Structure your analysis elegantly using markdown with clear headings, bullets, and tables where applicable.\n`;
    prompt += `2. Do not use generic filler sentences. Start with the description immediately.\n`;
    prompt += `3. Return clean, polished Markdown. Do not include meta-notes or greetings.`;

    return prompt;
  };

  const startAnalysis = async () => {
    if (images.length === 0) return;
    setIsAnalyzing(true);
    setSavedToWorkspace(false);

    const statuses = [
      'Scanning image pixels and dimensions...',
      'Deconstructing visual layers & outlines...',
      'Analyzing color composition and histograms...',
      'Isolating objects and architectural boundaries...',
      'Recognizing texts, materials, and expressions...',
      'Drafting your high-fidelity detailed description...'
    ];

    let statusIdx = 0;
    setAnalysisStatus(statuses[0]);
    const statusInterval = setInterval(() => {
      statusIdx = (statusIdx + 1) % statuses.length;
      setAnalysisStatus(statuses[statusIdx]);
    }, 2500);

    try {
      const promptText = buildPrompt();

      const localImageMediaItems: MediaItem[] = images.map((img, idx) => ({
        id: `local_desc_img_${idx}`,
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

      const descriptionText = await generateUnifiedAIResponse(promptText, allMediaItems);

      setAnalysisOutput(descriptionText || "No detailed description could be compiled. Please check your image format.");
    } catch (err: any) {
      console.error(err);
      alert(`Error analyzing images: ${err.message || err}`);
    } finally {
      clearInterval(statusInterval);
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = () => {
    if (!analysisOutput) return;
    navigator.clipboard.writeText(analysisOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAnalysisFile = () => {
    if (!analysisOutput) return;
    const element = document.createElement("a");
    const file = new Blob([analysisOutput], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `image_description_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSaveToWorkspace = () => {
    if (!analysisOutput || !onSaveArtifact) return;

    const base64Data = btoa(unescape(encodeURIComponent(analysisOutput)));
    const selectedStyle = ANALYSIS_STYLES.find(s => s.id === analysisStyle)?.name || 'Description';

    const item: MediaItem = {
      id: `img_desc_${Date.now()}`,
      name: `Image Description (${selectedStyle}).txt`,
      type: 'text',
      mimeType: 'text/plain',
      data: base64Data,
      tags: ['description', analysisStyle, 'image-analysis']
    };

    onSaveArtifact(item);
    setSavedToWorkspace(true);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto p-4 md:p-6 text-zinc-100">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-sky-500 flex items-center gap-3">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Eye className="w-7 h-7" />
            </span>
            Multimodal Image Describer & Analyst
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Submit storyboard frames, photography, UI mockups, or complex layouts to receive ultra-detailed, structured analyses, accessibility tags, or aesthetic critiques.
          </p>
        </div>
        
        <button
          onClick={() => {
            setImages([]);
            setCustomFocus('');
            setAnalysisOutput(null);
            setSavedToWorkspace(false);
          }}
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold rounded-lg transition-all"
        >
          Clear Panel
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Upload & Custom Parameters (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* File Upload Box */}
          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                <span>1. Submit Images for Analysis</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-medium">({images.length} added)</span>
            </div>
            
            <div className="space-y-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-800 hover:border-teal-500/40 bg-zinc-900/20 hover:bg-zinc-900/40 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center"
              >
                <ImageIcon className="w-8 h-8 text-zinc-600 mb-2" />
                <span className="text-xs font-bold text-zinc-300">Choose Images</span>
                <span className="text-[10px] text-zinc-500 mt-1">Drag and drop images or click to select layout files</span>
              </div>
              
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                className="hidden"
              />

              {/* Display Uploaded Previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg border border-zinc-800 overflow-hidden bg-zinc-900">
                      <img src={img.preview} alt="Target analysis file" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute inset-0 bg-red-600/95 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                        title="Delete image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SESSION CONTEXT CONNECTOR */}
          {session && (
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>Use Session Context</span>
                </label>
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Enable</span>
                  <input
                    type="checkbox"
                    checked={useSessionData}
                    onChange={(e) => setUseSessionData(e.target.checked)}
                    className="w-3.5 h-3.5 text-rose-500 bg-zinc-950 border-zinc-850 rounded focus:ring-rose-500 focus:ring-2 cursor-pointer"
                  />
                </div>
              </div>

              {useSessionData ? (
                <p className="text-xs text-zinc-400 bg-rose-950/10 border border-rose-950/40 p-3 rounded-xl">
                  Using <strong className="text-rose-400">{(session?.selectedMediaIds?.length || 0)} selected reference(s)</strong> from the active session (<strong className="text-rose-400">{session?.name}</strong>) to identify and enrich image descriptions.
                </p>
              ) : (
                <p className="text-xs text-zinc-500 italic bg-zinc-900/20 p-3 rounded-xl">
                  Session data integration is disabled. Enable to inject active workspace knowledge automatically.
                </p>
              )}
            </div>
          )}

          {/* Analysis Styles Card Selector */}
          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4 shadow-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-sky-400">
              2. Select Analysis Style & Perspective
            </label>
            
            <div className="space-y-2">
              {ANALYSIS_STYLES.map(style => {
                const isActive = analysisStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setAnalysisStyle(style.id)}
                    className={`w-full p-3 text-left rounded-xl border text-xs transition-all flex items-start gap-3 ${
                      isActive 
                        ? 'bg-sky-500/10 border-sky-500 text-sky-300 shadow-lg shadow-sky-500/5' 
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isActive ? 'bg-sky-500/20 text-sky-300' : 'bg-zinc-800 text-zinc-500'}`}>
                      {style.id === 'alt_text' ? (
                        <Layers className="w-3.5 h-3.5" />
                      ) : style.id === 'detective' ? (
                        <Activity className="w-3.5 h-3.5" />
                      ) : style.id === 'literal_explain' ? (
                        <FileText className="w-3.5 h-3.5" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold block text-zinc-200">{style.name}</span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5 leading-relaxed">{style.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Focus Prompts */}
          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-3 shadow-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
              3. Special Focus Directive (Optional)
            </label>
            <p className="text-[10px] text-zinc-500">
              Isolate details, request transcription of specific signs, ask about specific objects, or command custom rules.
            </p>
            <input
              type="text"
              value={customFocus}
              onChange={(e) => setCustomFocus(e.target.value)}
              placeholder="e.g., 'Transcribe the whiteboard notes' or 'Critique the UI typography contrast'"
              className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-teal-500/50 rounded-xl px-4 py-3 text-xs text-zinc-100 placeholder-zinc-600 focus:ring-0 outline-none transition-all"
            />
          </div>

          {/* Action Trigger Button */}
          <button
            type="button"
            onClick={startAnalysis}
            disabled={isAnalyzing || images.length === 0}
            className="w-full py-4 bg-gradient-to-r from-teal-600 via-teal-500 to-sky-500 hover:from-teal-500 hover:via-teal-400 hover:to-sky-400 disabled:opacity-40 text-white font-bold rounded-xl shadow-xl hover:shadow-teal-500/10 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{analysisStatus}</span>
              </>
            ) : (
              <>
                <Eye className="w-5 h-5 text-white" />
                <span>Analyze & Describe Image Content</span>
              </>
            )}
          </button>

        </div>

        {/* Right Side: Output Dashboard (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col min-h-[600px] h-full">
          
          {analysisOutput ? (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl flex-1 flex flex-col shadow-2xl overflow-hidden animate-fade-in">
              
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-900 p-4 bg-zinc-900/30">
                <div className="flex items-center gap-1.5 p-0.5 bg-zinc-900 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Formatted Markdown
                  </button>
                  <button
                    onClick={() => setActiveTab('raw')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'raw' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Raw Copyable
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Clipboard copy */}
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    title="Copy analysis text to clipboard"
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

                  {/* Save to session as text source */}
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
                    onClick={downloadAnalysisFile}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    title="Download .txt analysis file"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Analysis Text Canvas */}
              <div className="flex-1 p-6 overflow-y-auto max-h-[640px] min-h-[480px] bg-zinc-950">
                {activeTab === 'preview' ? (
                  <div className="markdown-body text-zinc-300 text-sm leading-relaxed font-sans space-y-4 prose prose-invert max-w-none prose-sm">
                    <Markdown>{analysisOutput}</Markdown>
                  </div>
                ) : (
                  <pre className="font-mono text-xs text-zinc-400 whitespace-pre-wrap select-text bg-black/30 p-4 rounded-xl border border-zinc-900 max-h-[580px] overflow-y-auto">
                    {analysisOutput}
                  </pre>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 flex-1 flex flex-col items-center justify-center text-center py-20 shadow-2xl">
              <span className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 to-sky-500/10 text-teal-400 border border-teal-500/10 mb-4">
                <Eye className="w-10 h-10" />
              </span>
              <h3 className="text-lg font-bold text-zinc-200">No Analysis Output Yet</h3>
              <p className="text-xs text-zinc-500 max-w-sm mb-8 leading-relaxed">
                Add target reference files/images, choose a style category, and run the pixel analyzer to get high-fidelity descriptive output.
              </p>
              
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono font-bold">Ultra-detailed breakdown</span>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono font-bold">Aesthetic & creative critique</span>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono font-bold">Web Accessibility Alt-text</span>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono font-bold">OCR & text scanner</span>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
