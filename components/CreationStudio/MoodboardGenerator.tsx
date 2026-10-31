import React, { useState, useEffect } from 'react';
import { Sparkles, Palette, Plus, Trash2, Download, RefreshCw, Upload, Heart, Share2 } from 'lucide-react';
import { themeStyles } from '../../constants/creativeStudioTheme';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';

interface MoodCard {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  tags: string[];
}

interface ColorPalette {
  name: string;
  colors: string[]; // hex codes
}

interface MoodboardProps {
  onBack?: () => void;
  localTheme: string;
}

export const MoodboardGenerator: React.FC<MoodboardProps> = ({ onBack, localTheme }) => {
  const st = themeStyles[localTheme] || themeStyles.charcoal;

  const [projectName, setProjectName] = useState('My Cyberpunk Film');
  const [boardPrompt, setBoardPrompt] = useState('Neo-tokyo rain, warm ramen bar light, heavy fog, magenta and amber glow');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [palette, setPalette] = useState<ColorPalette>({
    name: 'Cyber Neon',
    colors: ['#0f172a', '#3b0764', '#ec4899', '#f59e0b', '#06b6d4']
  });

  const [cards, setCards] = useState<MoodCard[]>([
    {
      id: 'mc-1',
      title: 'Neon Reflection',
      imageUrl: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)',
      description: 'Streets glistening with night-rain, reflecting vibrant purple and pink billboard signs.',
      tags: ['magenta', 'wet streets', 'cyberpunk']
    },
    {
      id: 'mc-2',
      title: 'Alleyway Food Stall',
      imageUrl: 'linear-gradient(135deg, #451a03 0%, #1c1917 100%)',
      description: 'A cozy corner noodle stand steaming in the dark night with warm orange paper lanterns.',
      tags: ['ramen', 'cozy', 'warm light']
    }
  ]);

  const [aiSuggestions, setAiSuggestions] = useState<string>('');

  const generateAIBoard = async () => {
    if (!boardPrompt.trim()) return;
    setIsGenerating(true);
    setAiSuggestions('');
    try {
      const prompt = `You are a high-end cinematic Art Director. Create a visual moodboard and theme guide for the prompt: "${boardPrompt}".
Return a JSON block exactly in this format (no extra code block wraps):
{
  "paletteName": "Cinematic Golden Hour",
  "colors": ["#111827", "#7c2d12", "#d97706", "#fef08a", "#1e3a8a"],
  "cards": [
    {
      "title": "Scene Motif 1",
      "description": "Visual details...",
      "tags": ["tag1", "tag2"]
    },
    {
      "title": "Scene Motif 2",
      "description": "Visual details...",
      "tags": ["tag1", "tag2"]
    }
  ],
  "aestheticGuide": "A 2-sentence guide about visual pacing, lighting, and style..."
}`;

      const response = await generateUnifiedAIResponse(prompt);
      const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleaned);

      if (data.colors) {
        setPalette({
          name: data.paletteName || 'AI Palette',
          colors: data.colors
        });
      }

      if (data.cards) {
        const mapped: MoodCard[] = data.cards.map((c: any, i: number) => ({
          id: `ai-card-${Date.now()}-${i}`,
          title: c.title,
          imageUrl: `linear-gradient(135deg, ${data.colors[2 % data.colors.length]} 0%, ${data.colors[0]} 100%)`,
          description: c.description,
          tags: c.tags || []
        }));
        setCards(mapped);
      }

      if (data.aestheticGuide) {
        setAiSuggestions(data.aestheticGuide);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to parse AI art direction. Try a simpler theme prompt!');
    } finally {
      setIsGenerating(false);
    }
  };

  const addCustomCard = () => {
    const newCard: MoodCard = {
      id: `custom-card-${Date.now()}`,
      title: 'Custom Idea',
      imageUrl: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)',
      description: 'Enter custom cinematic descriptions, props, and lighting reference notes.',
      tags: ['User custom']
    };
    setCards([...cards, newCard]);
  };

  const deleteCard = (id: string) => {
    setCards(cards.filter(c => c.id !== id));
  };

  const handleCardUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCards(cards.map(c => c.id === id ? { ...c, imageUrl: ev.target?.result as string } : c));
      };
      reader.readAsDataURL(file);
    }
  };

  const exportMoodboard = () => {
    const dataStr = JSON.stringify({ projectName, palette, cards, aiSuggestions }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-moodboard.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`p-6 min-h-screen ${st.bg} text-slate-100 flex flex-col gap-6 animate-fade-in`}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Palette className="text-rose-400 w-5 h-5" />
            Moodboard & Concept Builder
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Build art concepts, curate cinematic color palettes, and describe thematic aesthetic guides with AI assistance.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportMoodboard}
            className={`px-3 py-1.5 rounded text-xs font-bold border ${st.border} ${st.btnInactive} flex items-center gap-1.5`}
          >
            <Download className="w-3.5 h-3.5" /> Save Moodboard JSON
          </button>
          {onBack && (
            <button onClick={onBack} className={`px-3 py-1.5 rounded text-xs font-bold border ${st.border} ${st.btnInactive}`}>
              Back
            </button>
          )}
        </div>
      </div>

      {/* Input panel & AI generation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Settings and Palettes */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Concept Theme / Core Motifs</label>
              <textarea
                value={boardPrompt}
                onChange={(e) => setBoardPrompt(e.target.value)}
                rows={3}
                placeholder="Describe details: warm candles, rainy highways, cyberpunk neon, etc."
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none placeholder-slate-700"
              />
            </div>

            <button
              onClick={generateAIBoard}
              disabled={isGenerating || !boardPrompt.trim()}
              className="w-full py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/10 transition-all"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Aesthetic Concept
            </button>
          </div>

          {/* Color Palette Display */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Color Palette: {palette.name}</span>
            </div>
            
            <div className="grid grid-cols-5 gap-1.5">
              {palette.colors.map((color, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div 
                    className="w-full aspect-square rounded-lg border border-slate-800 relative group"
                    style={{ backgroundColor: color }}
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg text-[9px] font-mono cursor-pointer" onClick={() => navigator.clipboard.writeText(color)}>
                      Copy
                    </span>
                  </div>
                  <span className="text-[8px] font-mono text-slate-500 mt-1">{color}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Aesthetic Guide Text */}
          {aiSuggestions && (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 space-y-2">
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">Artistic Direction Guide</span>
              <p className="text-xs text-slate-300 leading-relaxed italic">"{aiSuggestions}"</p>
            </div>
          )}
        </div>

        {/* Mood Board Grid Cards */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
              Visual Reference Grid
            </span>
            <button 
              onClick={addCustomCard}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add card
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {cards.map((c) => (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col group relative">
                
                {/* Visual Header */}
                <div 
                  className="h-32 w-full flex items-center justify-center bg-slate-950 relative overflow-hidden"
                  style={c.imageUrl.startsWith('linear-gradient') ? { background: c.imageUrl } : { backgroundImage: `url('${c.imageUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-slate-200 font-bold transition-opacity cursor-pointer">
                    Change Image
                    <input type="file" accept="image/*" onChange={(e) => handleCardUpload(c.id, e)} className="hidden" />
                  </label>
                  
                  <button 
                    onClick={() => deleteCard(c.id)}
                    className="absolute top-2 right-2 p-1 bg-slate-950/80 rounded border border-slate-800 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Info and Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <input 
                      type="text" 
                      value={c.title}
                      onChange={(e) => setCards(cards.map(card => card.id === c.id ? { ...card, title: e.target.value } : card))}
                      className="bg-transparent font-bold text-sm text-slate-200 w-full focus:outline-none focus:border-b border-rose-500"
                    />
                    <textarea 
                      value={c.description}
                      onChange={(e) => setCards(cards.map(card => card.id === c.id ? { ...card, description: e.target.value } : card))}
                      rows={3}
                      className="bg-transparent text-xs text-slate-400 w-full resize-none focus:outline-none focus:border border-slate-800 rounded p-1"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((tag, idx) => (
                      <span key={idx} className="bg-slate-950 px-1.5 py-0.5 rounded text-[9px] text-rose-400 font-mono">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};
