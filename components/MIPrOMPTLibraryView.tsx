import React, { useState, useEffect } from 'react';
import { MIPrOMPTItem } from '../types';
import ArtifactPreview from './ArtifactPreview';
import { saveUserPreference, loadUserPreference } from '../services/storage';
import { themeStyles, CREATIVE_STUDIO_THEMES } from '../constants/creativeStudioTheme';

const FormattedPromptText: React.FC<{ text: string, className?: string }> = ({ text, className }) => {
  if (!text) return null;
  const parts = text.split(/^([A-Z][a-zA-Z\s]+:|\s*\[.*?\]:|\s*#{1,6}\s+.*$)/gm);
  return (
    <div className={className}>
      {parts.map((part, i) => {
        if (/^\s*#{1,6}\s+/.test(part)) {
          return <span key={i} className="text-blue-400 font-bold">{part}</span>;
        } else if (/^\s*\[.*?\]:/.test(part)) {
          return <span key={i} className="text-emerald-400 font-bold italic">{part}</span>;
        } else if (/^[A-Z][a-zA-Z\s]+:/.test(part)) {
          return <span key={i} className="text-purple-400 font-bold">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};

interface MIPrOMPTLibraryViewProps {
  miprompts: MIPrOMPTItem[];
  onAdd: (type: 'prB' | 'ctB' | 'txS', content: string, title?: string) => void;
  onUpdate: (id: string, updates: Partial<MIPrOMPTItem>) => void;
  onDelete: (id: string) => void;
  onImport: (csvText: string) => void;
  onSelectPrompt?: (item: MIPrOMPTItem) => void;
  currentTheme?: string;
}

const MIPrOMPTLibraryView: React.FC<MIPrOMPTLibraryViewProps> = ({ miprompts, onAdd, onUpdate, onDelete, onImport, onSelectPrompt, currentTheme }) => {
  const themes = CREATIVE_STUDIO_THEMES;
  const [localTheme, setLocalTheme] = useState(() => {
    const saved = localStorage.getItem('creative_studio_theme');
    return saved && themes.includes(saved) ? saved : 'charcoal';
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const saved = localStorage.getItem('creative_studio_theme');
      if (saved && themes.includes(saved)) {
        setLocalTheme(saved);
      }
    };
    window.addEventListener('creative_studio_theme_change', handleThemeChange);
    return () => window.removeEventListener('creative_studio_theme_change', handleThemeChange);
  }, []);

  const st = themeStyles[localTheme] || themeStyles['charcoal'];

  const [viewMode, setViewMode] = useState<'compact' | 'strip' | 'icon' | 'sql'>(() => {
    try {
      const saved = localStorage.getItem('pref_mipromptViewMode');
      if (saved) return JSON.parse(saved);
    } catch {}
    return 'strip';
  });

  useEffect(() => {
    loadUserPreference('mipromptViewMode').then(saved => {
      if (saved) setViewMode(saved);
    });
  }, []);

  const handleCycleViewMode = () => {
    const nextMode = viewMode === 'strip' ? 'compact' : viewMode === 'compact' ? 'icon' : 'strip';
    setViewMode(nextMode);
    saveUserPreference('mipromptViewMode', nextMode);
  };
  
  const handleToggleSql = () => {
    if (viewMode === 'sql') {
      setViewMode('strip');
      saveUserPreference('mipromptViewMode', 'strip');
    } else {
      setViewMode('sql');
      saveUserPreference('mipromptViewMode', 'sql');
    }
  };

  const handleCycleTheme = () => {
    const themes = CREATIVE_STUDIO_THEMES;
    const currentThemeLocal = localStorage.getItem('creative_studio_theme') || 'charcoal';
    const nextIndex = (themes.indexOf(currentThemeLocal) + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    localStorage.setItem('creative_studio_theme', nextTheme);
    saveUserPreference('creative_studio_theme', nextTheme);
    window.dispatchEvent(new Event('creative_studio_theme_change'));
  };

  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState<MIPrOMPTItem | null>(null);
  const [editFormData, setEditFormData] = useState<{name: string, content: string, type: 'prB'|'ctB'|'txS'}>({name: '', content: '', type: 'prB'});
  const [showPreview, setShowPreview] = useState(false);

  const handleEditClick = (item: MIPrOMPTItem) => {
      setEditingItem(item);
      setEditFormData({ name: item.name, content: item.content, type: item.type });
      setShowPreview(false);
  };

  const handleAddClick = (type: 'prB' | 'ctB' | 'txS') => {
      setEditingItem({ id: 'NEW', type, name: `New ${type === 'prB' ? 'Prompt' : type === 'ctB' ? 'Content' : 'Summarizer'}`, content: '', createdAt: Date.now(), isFavorite: false });
      setEditFormData({ name: `New ${type === 'prB' ? 'Prompt' : type === 'ctB' ? 'Content' : 'Summarizer'}`, content: '', type });
      setShowPreview(false);
  };

  const handleSaveEdit = () => {
      if (editingItem) {
          if (editingItem.id === 'NEW') {
              onAdd(editFormData.type, editFormData.content, editFormData.name);
          } else {
              onUpdate(editingItem.id, editFormData);
          }
          setEditingItem(null);
      }
  };

  const handleDownloadItem = (item: MIPrOMPTItem) => {
      const isHtml = item.type === 'ctB' && item.content.includes('<html');
      const blob = new Blob([item.content], { type: isHtml ? 'text/html' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${isHtml ? 'html' : 'txt'}`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    // Generate CSV
    const headers = 'Name,Type,Content,IsFavorite,CreatedAt\n';
    const rows = miprompts.map(p => `"${p.name}","${p.type}","${p.content.replace(/"/g, '""')}","${p.isFavorite}","${new Date(p.createdAt).toISOString()}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mIPrOMPT_Library.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            onImport(e.target.result as string);
          }
        };
        reader.readAsText(file);
      }
    };
    fileInput.click();
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const filtered = miprompts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.content.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className={`h-full w-full overflow-y-auto ${st.bg} ${st.text} p-8 animate-fade-in relative`}>
      <div className="max-w-6xl mx-auto space-y-8">
        
         {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                MyPrompt Lib
              </h1>
              <p className={`${st.textDim} mt-2 tracking-wide font-mono text-sm`}>
                // Central Gen Repo [{miprompts.length} ITEMS]
              </p>
            </div>
            
            <button
              onClick={handleCycleTheme}
              className={`w-7 h-7 ml-2 rounded-full border-2 transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer ${
                localTheme === 'charcoal' ? 'bg-zinc-900 border-zinc-600 shadow-md shadow-black/40'
                : localTheme === 'silver' ? 'bg-zinc-300 border-zinc-400 shadow-md shadow-zinc-500/20'
                : localTheme === 'white' ? 'bg-white border-zinc-300 shadow-md'
                : localTheme === 'cosmic' ? 'bg-indigo-900 border-indigo-500 shadow-md shadow-indigo-950/50'
                : localTheme === 'emerald' ? 'bg-emerald-900 border-emerald-500 shadow-md shadow-emerald-950/50'
                : localTheme === 'amber' ? 'bg-amber-600 border-amber-500 shadow-md shadow-amber-950/50'
                : localTheme === 'cyberpunk' ? 'bg-fuchsia-900 border-cyan-400 shadow-md'
                : localTheme === 'slate' ? 'bg-slate-800 border-slate-500 shadow-md'
                : localTheme === 'crimson' ? 'bg-rose-900 border-rose-500 shadow-md shadow-rose-950/50'
                : localTheme === 'orchid' ? 'bg-fuchsia-700 border-fuchsia-500 shadow-md shadow-fuchsia-950/50'
                : 'bg-stone-700 border-stone-500 shadow-md shadow-stone-950/50'
              }`}
              title={`Cycle theme (current: ${localTheme})`}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleAddClick('prB')}
              className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg border border-blue-500/30 transition-colors"
              title="Add Prompt"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </button>
            <button 
              onClick={() => handleAddClick('ctB')}
              className="p-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg border border-purple-500/30 transition-colors"
              title="Add Content"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            </button>
            <button 
              onClick={() => handleAddClick('txS')}
              className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg border border-emerald-500/30 transition-colors"
              title="Add Summarizer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" /></svg>
            </button>
            <div className="h-6 w-px bg-app-border mx-1"></div>
            <button onClick={handleToggleSql} className={`p-2 transition-colors ${viewMode === 'sql' ? 'text-green-400' : '${st.textDim} hover:${st.text}'}`} title="SQL / Table Preview">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </button>
            <button onClick={handleImport} className={`p-2 ${st.textDim} hover:${st.text} transition-colors`} title="Import CSV">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
            <button onClick={handleDownload} className={`p-2 ${st.textDim} hover:${st.text} transition-colors`} title="Download CSV">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
             <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${st.textDim}`}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
             </div>
             <input type="text" placeholder="Search prompts..." value={search} onChange={e => setSearch(e.target.value)} className={`w-full ${st.cardBg} border ${st.border} ${st.text} focus:outline-none focus:border-app-text rounded-xl pl-10 pr-4 py-2 transition-colors`} />
          </div>
          <div className={`flex ${st.cardBg} border ${st.border} rounded-lg p-1 w-full sm:w-auto overflow-hidden`}>
             <button 
                 onClick={handleCycleViewMode}
                 className={`px-4 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors ${st.textDim} hover:${st.text} hover:${st.bg}`}
                 title="Cycle View Mode"
             >
                {viewMode === 'strip' ? (
                   <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                   </svg>
                ) : viewMode === 'compact' ? (
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                ) : (
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" /></svg>
                )}
                {viewMode === 'strip' ? 'Strip' : viewMode === 'compact' ? 'Compact' : viewMode === 'icon' ? 'Icon' : 'View'}
             </button>
          </div>
        </div>

        {viewMode === 'sql' && (
           <div className={`${st.cardBg} border ${st.border} rounded-xl overflow-hidden shadow-xl animate-fade-in shadow-black/50`}>
               <div className={`bg-[#1e1e1e] border-b ${st.border} p-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2 text-green-400 font-mono text-xs font-bold">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      MyPromptLib_TABLE_PREVIEW
                  </div>
               </div>
               <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse font-mono text-xs">
                       <thead>
                           <tr className={`border-b ${st.border} bg-[#252525] ${st.textDim}`}>
                               <th className="p-3 whitespace-nowrap">id</th>
                               <th className="p-3 whitespace-nowrap">name</th>
                               <th className="p-3 whitespace-nowrap">type</th>
                               <th className="p-3">content</th>
                               <th className="p-3 whitespace-nowrap">is_favorite</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-app-border">
                           {filtered.map(p => (
                               <tr key={p.id} className={`hover:${st.panelBg} transition-colors ${st.text}`}>
                                   <td className={`p-3 ${st.textDim}`}>{p.id}</td>
                                   <td className="p-3 text-blue-400">{p.name}</td>
                                   <td className={`p-3 font-bold ${p.type === 'prB' ? 'text-blue-400' : p.type === 'txS' ? 'text-emerald-400' : 'text-purple-400'}`}>{p.type}</td>
                                   <td className="p-3 text-green-300/80 truncate max-w-xs">{p.content.substring(0, 100)}...</td>
                                   <td className="p-3">{p.isFavorite ? 'TRUE' : 'FALSE'}</td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           </div>
        )}

        {viewMode === 'icon' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 animate-fade-in">
             {filtered.map(item => (
                <div 
                  key={item.id} 
                  onDoubleClick={() => onSelectPrompt && onSelectPrompt(item)}
                  title={item.name}
                  className={`group border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 ${item.isFavorite ? 'border-yellow-500/50 shadow-yellow-500/10' : '${st.border} hover:${st.border}'} ${item.type === 'prB' ? 'bg-blue-500/5 hover:bg-blue-500/10' : item.type === 'txS' ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'bg-purple-500/5 hover:bg-purple-500/10'}`}
                >
                   <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-2 ${item.type === 'prB' ? 'bg-blue-500/20 text-blue-400' : item.type === 'txS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                       {item.type}
                   </span>
                   <span className={`font-mono text-xs font-bold ${st.text} truncate w-full`}>{item.name}</span>
                </div>
             ))}
          </div>
        )}

        {viewMode === 'compact' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
             {filtered.map(item => (
                <div 
                  key={item.id} 
                  onDoubleClick={() => onSelectPrompt && onSelectPrompt(item)}
                  title="Double click to Open in Studio"
                  className={`group border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${item.isFavorite ? 'border-yellow-500/50 shadow-yellow-500/10' : '${st.border} hover:${st.border}'} ${item.type === 'prB' ? 'bg-blue-500/5 hover:bg-blue-500/10' : item.type === 'txS' ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'bg-purple-500/5 hover:bg-purple-500/10'}`}
                >
                   <div className={`p-3 border-b flex justify-between items-center ${item.type === 'prB' ? 'bg-blue-500/10 border-blue-500/20' : item.type === 'txS' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-purple-500/10 border-purple-500/20'}`}>
                      <div className="flex items-center gap-2">
                         <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.type === 'prB' ? 'bg-blue-500/20 text-blue-400' : item.type === 'txS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                             {item.type}
                         </span>
                         <span className={`font-mono text-sm font-bold ${st.text}`}>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                         <button onClick={() => handleEditClick(item)} className={`p-1.5 rounded-lg ${st.textDim} hover:${st.bg} hover:text-blue-400 transition-colors`} title="Edit">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                             </svg>
                         </button>
                         <button onClick={() => onUpdate(item.id, { isFavorite: !item.isFavorite })} className={`p-1.5 rounded-lg transition-colors ${item.isFavorite ? 'text-yellow-400 bg-yellow-400/10' : `${st.textDim} hover:${st.bg} hover:text-yellow-400`}`}>
                             <svg className="w-4 h-4" fill={item.isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                             </svg>
                         </button>
                      </div>
                   </div>
                   <div className="p-4 relative h-40 group-hover:h-auto overflow-hidden">
                       <div className={`text-xs ${st.textDim} whitespace-pre-wrap font-mono line-clamp-6 group-hover:line-clamp-none`}>
                          <FormattedPromptText text={item.content} />
                       </div>
                       <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-app-card to-transparent group-hover:hidden"></div>
                   </div>
                   <div className={`p-3 border-t ${st.border} ${st.panelBg} flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <span className={`text-[10px] ${st.textDim}`}>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <div className="flex gap-2">
                          <button onClick={() => handleDownloadItem(item)} className={`p-1.5 ${st.bg} ${st.textDim} hover:text-blue-400 rounded border ${st.border} hover:${st.border} transition-colors`} title="Download">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          </button>
                          <button onClick={() => handleCopy(item.content)} className={`p-1.5 ${st.bg} ${st.textDim} hover:text-emerald-400 rounded border ${st.border} hover:${st.border} transition-colors`} title="Copy">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                          <button onClick={() => { if(confirm('Delete?')) onDelete(item.id); }} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded border border-red-500/20 transition-colors" title="Delete">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                      </div>
                   </div>
                </div>
             ))}
          </div>
        )}

        {viewMode === 'strip' && (
          <div className="flex flex-col gap-4 animate-fade-in">
             {filtered.map(item => (
                <div 
                  key={item.id} 
                  onDoubleClick={() => onSelectPrompt && onSelectPrompt(item)}
                  title="Double click to Open in Studio"
                  className={`group border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md flex flex-col md:flex-row ${item.isFavorite ? 'border-yellow-500/50 shadow-yellow-500/10' : '${st.border} hover:${st.border}'} ${item.type === 'prB' ? 'bg-blue-500/5 hover:bg-blue-500/10' : item.type === 'txS' ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'bg-purple-500/5 hover:bg-purple-500/10'}`}
                >
                   <div className={`p-4 md:w-1/4 border-b md:border-b-0 md:border-r flex md:flex-col justify-between md:justify-center items-center md:items-start gap-4 ${item.type === 'prB' ? 'bg-blue-500/10 border-blue-500/20' : item.type === 'txS' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-purple-500/10 border-purple-500/20'}`}>
                      <div className="flex md:flex-col items-center md:items-start gap-2">
                         <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.type === 'prB' ? 'bg-blue-500/20 text-blue-400' : item.type === 'txS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                             {item.type}
                         </span>
                         <span className={`font-mono text-sm font-bold ${st.text} truncate max-w-[200px]`}>{item.name}</span>
                      </div>
                      <span className={`text-[10px] ${st.textDim}`}>{new Date(item.createdAt).toLocaleDateString()}</span>
                   </div>
                   <div className="p-4 flex-1 relative md:h-24 h-32 md:hover:h-auto hover:h-auto overflow-hidden">
                       <div className={`text-xs ${st.textDim} whitespace-pre-wrap font-mono line-clamp-3 md:line-clamp-2 md:group-hover:line-clamp-none group-hover:line-clamp-none`}>
                          <FormattedPromptText text={item.content} />
                       </div>
                       <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-app-card to-transparent group-hover:hidden"></div>
                   </div>
                   <div className={`p-4 border-t md:border-t-0 md:border-l ${st.border} ${st.panelBg} flex flex-row md:flex-col gap-2 justify-end items-center md:items-end`}>
                       <button onClick={() => onUpdate(item.id, { isFavorite: !item.isFavorite })} className={`p-1.5 rounded-lg transition-colors ${item.isFavorite ? 'text-yellow-400 bg-yellow-400/10' : `${st.textDim} hover:${st.bg} hover:text-yellow-400`}`}>
                           <svg className="w-5 h-5 md:w-4 md:h-4" fill={item.isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                           </svg>
                       </button>
                       <button onClick={() => handleEditClick(item)} className={`p-1.5 rounded-lg ${st.textDim} hover:${st.bg} hover:text-blue-400 transition-colors`} title="Edit">
                           <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                           </svg>
                       </button>
                       <div className="flex gap-2 mt-auto">
                          <button onClick={() => handleDownloadItem(item)} className={`p-1.5 ${st.bg} ${st.textDim} hover:text-blue-400 rounded border ${st.border} hover:${st.border} transition-colors`} title="Download">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          </button>
                          <button onClick={() => handleCopy(item.content)} className={`p-1.5 ${st.bg} ${st.textDim} hover:text-emerald-400 rounded border ${st.border} hover:${st.border} transition-colors`} title="Copy">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                          <button onClick={() => { if(confirm('Delete?')) onDelete(item.id); }} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded border border-red-500/20 transition-colors" title="Delete">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                       </div>
                   </div>
                </div>
             ))}
          </div>
        )}

      </div>

      {/* Edit Modal */}
      {editingItem && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`${st.panelBg} border ${st.border} rounded-2xl shadow-2xl overflow-hidden flex flex-col ${showPreview ? 'w-[90vw] h-[90vh]' : 'w-full max-w-2xl max-h-[90vh]'}`}>
               <div className={`flex justify-between items-center p-4 border-b ${st.border} ${st.panelBg}`}>
                  <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                      {editingItem.id === 'NEW' ? 'Create' : 'Edit'} {editingItem.type === 'ctB' ? 'Content Builder' : editingItem.type === 'prB' ? 'Prompt' : 'Summarizer'}
                  </h3>
                  <div className="flex gap-2">
                      <button onClick={() => setShowPreview(!showPreview)} className={`px-3 py-1 rounded text-sm font-bold border transition-colors ${showPreview ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : '${st.textDim} ${st.border} hover:text-white'}`}>
                          {showPreview ? 'Hide Preview' : 'Show Preview'}
                      </button>
                      <button onClick={() => handleDownloadItem({ ...editingItem, content: editFormData.content, name: editFormData.name, type: editFormData.type })} className={`px-3 py-1 rounded text-sm font-bold border ${st.border} ${st.textDim} hover:text-white transition-colors`}>
                          Download
                      </button>
                      <button onClick={() => setEditingItem(null)} className={`p-1 px-3 rounded hover:bg-gray-800 ${st.textDim} hover:text-white border border-transparent transition-colors`}>
                          Close
                      </button>
                  </div>
               </div>
               
               <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                   {/* Form Area */}
                   <div className={`p-6 overflow-y-auto flex-col gap-4 flex ${showPreview ? 'w-full md:w-1/3 border-r ${st.border}' : 'w-full'}`}>
                      <div>
                          <label className={`block text-xs font-bold ${st.textDim} mb-1 uppercase tracking-wider`}>Name</label>
                          <input 
                              type="text" 
                              value={editFormData.name} 
                              onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                              className={`w-full ${st.inputBg} border ${st.border} rounded-lg px-3 py-2 ${st.text} focus:outline-none focus:border-blue-500 transition-colors`}
                          />
                      </div>
                      <div>
                          <label className={`block text-xs font-bold ${st.textDim} mb-1 uppercase tracking-wider`}>Type</label>
                          <select 
                              value={editFormData.type}
                              onChange={e => setEditFormData({...editFormData, type: e.target.value as any})}
                              className={`w-full ${st.inputBg} border ${st.border} rounded-lg px-3 py-2 ${st.text} focus:outline-none focus:border-blue-500 transition-colors`}
                          >
                              <option value="prB">Prompt (prB)</option>
                              <option value="ctB">Content Builder (ctB)</option>
                              <option value="txS">Text Summarizer (txS)</option>
                          </select>
                      </div>
                      <div className="flex-1 flex flex-col min-h-[200px]">
                          <label className={`block text-xs font-bold ${st.textDim} mb-1 uppercase tracking-wider`}>Content</label>
                          <textarea 
                              value={editFormData.content}
                              onChange={e => setEditFormData({...editFormData, content: e.target.value})}
                              className={`w-full flex-1 ${st.inputBg} border ${st.border} rounded-lg px-3 py-2 ${st.text} focus:outline-none focus:border-blue-500 font-mono text-sm resize-none transition-colors`}
                          />
                      </div>
                   </div>

                   {/* Preview Area */}
                   {showPreview && (
                       <div className={`flex-1 relative ${st.bg} overflow-auto`}>
                           {editingItem.type === 'ctB' && (editFormData.content.includes('<html') || editFormData.content.includes('<style') || editFormData.content.includes('<div')) ? (
                               <ArtifactPreview 
                                   code={editFormData.content} 
                                   onClose={() => setShowPreview(false)}
                                   theme={localTheme}
                               />
                           ) : (
                               <div className={`p-8 h-full whitespace-pre-wrap font-mono text-sm ${st.text}`}>
                                  <FormattedPromptText text={editFormData.content} />
                               </div>
                           )}
                       </div>
                   )}
               </div>

               <div className={`p-4 border-t ${st.border} ${st.panelBg} flex justify-end gap-3`}>
                  <button onClick={() => setEditingItem(null)} className={`px-4 py-2 rounded-lg font-bold ${st.textDim} hover:text-white transition-colors`}>
                      Cancel
                  </button>
                  <button onClick={handleSaveEdit} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors">
                      {editingItem.id === 'NEW' ? 'Create Items' : 'Save Changes'}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
export default MIPrOMPTLibraryView;
