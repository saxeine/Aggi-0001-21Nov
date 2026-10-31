
import React, { useState, useMemo } from 'react';
import { CharacterPrompt } from '../types';

interface CharacterLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: CharacterPrompt[];
  onAdd: (char: Omit<CharacterPrompt, 'id' | 'category'>) => void;
  onDelete: (id: string) => void;
}

const CharacterLibraryModal: React.FC<CharacterLibraryModalProps> = ({ 
  isOpen, 
  onClose, 
  characters, 
  onAdd,
  onDelete 
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'user' | 'system'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'add'>('list');

  // Add Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTone, setNewTone] = useState('');
  const [newPerspective, setNewPerspective] = useState('');
  const [newBias, setNewBias] = useState('');

  const filteredCharacters = useMemo(() => {
    let filtered = characters;
    if (activeTab === 'user') filtered = characters.filter(c => c.category === 'user');
    if (activeTab === 'system') filtered = characters.filter(c => c.category === 'system');

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(q) || 
        c.content.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [characters, activeTab, search]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim() && newContent.trim()) {
      onAdd({
        title: newTitle.trim(),
        content: newContent.trim(),
        tone: newTone.trim(),
        perspective: newPerspective.trim(),
        bias: newBias.trim()
      });
      setNewTitle('');
      setNewContent('');
      setNewTone('');
      setNewPerspective('');
      setNewBias('');
      setViewMode('list');
      setActiveTab('user');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-app-card border border-app-border rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
        
        {/* Header */}
        <div className="p-4 border-b border-app-border flex justify-between items-center bg-app-panel">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="text-lg font-bold text-app-text uppercase tracking-wider">Character Library</h3>
          </div>
          <button onClick={onClose} className="text-app-muted hover:text-app-text p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {viewMode === 'list' ? (
            <>
              {/* Toolbar */}
              <div className="p-3 border-b border-app-border flex gap-2 items-center flex-wrap bg-app-bg/50">
                <div className="flex bg-app-panel rounded-lg p-1 border border-app-border">
                  <button onClick={() => setActiveTab('all')} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'all' ? 'bg-app-text text-app-bg' : 'text-app-muted hover:text-app-text'}`}>All</button>
                  <button onClick={() => setActiveTab('system')} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'system' ? 'bg-app-text text-app-bg' : 'text-app-muted hover:text-app-text'}`}>System</button>
                  <button onClick={() => setActiveTab('user')} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'user' ? 'bg-app-text text-app-bg' : 'text-app-muted hover:text-app-text'}`}>My Characters</button>
                </div>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    placeholder="Search characters..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-app-input border border-app-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-app-text focus:outline-none focus:border-app-text"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-app-dim" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <button 
                  onClick={() => setViewMode('add')}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  New
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                 {filteredCharacters.length === 0 && (
                   <div className="text-center text-app-dim mt-10">No characters found.</div>
                 )}
                 {filteredCharacters.map(char => (
                   <div key={char.id} className="bg-app-panel border border-app-border rounded-lg p-4 hover:border-rose-500/50 transition-colors group flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-app-text">{char.title}</span>
                          {char.category === 'user' && <span className="text-[10px] bg-rose-900 text-rose-200 px-1.5 rounded border border-rose-700">User</span>}
                        </div>
                        <p className="text-xs text-app-muted mb-3 italic">"{char.content}"</p>
                        <div className="flex flex-wrap gap-2">
                           {char.tone && <span className="text-[9px] bg-app-bg text-app-dim px-2 py-0.5 rounded border border-app-border uppercase tracking-wider">Tone: {char.tone}</span>}
                           {char.perspective && <span className="text-[9px] bg-app-bg text-app-dim px-2 py-0.5 rounded border border-app-border uppercase tracking-wider">View: {char.perspective}</span>}
                           {char.bias && <span className="text-[9px] bg-app-bg text-app-dim px-2 py-0.5 rounded border border-app-border uppercase tracking-wider text-rose-400/70">Bias: {char.bias}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {char.category === 'user' && (
                            <button onClick={() => onDelete(char.id)} className="text-app-dim hover:text-red-400 p-1" title="Delete">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                 <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                               </svg>
                            </button>
                         )}
                      </div>
                   </div>
                 ))}
              </div>
            </>
          ) : (
            // Add Form
            <form onSubmit={handleAddSubmit} className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto custom-scrollbar">
              <h4 className="text-sm font-bold text-app-text uppercase tracking-wider">Define Character Personality</h4>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-app-dim uppercase tracking-wider mb-1">Character Name / Title</label>
                    <input 
                      type="text" 
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-sm text-app-text focus:outline-none focus:border-rose-500"
                      placeholder="e.g., The Cynical Investor"
                      required
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-app-dim uppercase tracking-wider mb-1">Tone</label>
                    <input 
                      type="text" 
                      value={newTone}
                      onChange={e => setNewTone(e.target.value)}
                      className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-sm text-app-text focus:outline-none focus:border-rose-500"
                      placeholder="e.g., Sarcastic, Formal"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-app-dim uppercase tracking-wider mb-1">Perspective</label>
                    <input 
                      type="text" 
                      value={newPerspective}
                      onChange={e => setNewPerspective(e.target.value)}
                      className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-sm text-app-text focus:outline-none focus:border-rose-500"
                      placeholder="e.g., Profit-first, Ethical"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-app-dim uppercase tracking-wider mb-1">Specific Bias / Agenda</label>
                    <input 
                      type="text" 
                      value={newBias}
                      onChange={e => setNewBias(e.target.value)}
                      className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-sm text-app-text focus:outline-none focus:border-rose-500"
                      placeholder="e.g., Skeptical of AI, Pro-Crypto"
                    />
                  </div>
              </div>

              <div className="flex-1">
                <label className="block text-[10px] font-bold text-app-dim uppercase tracking-wider mb-1">Internal Monologue / Instructions</label>
                <textarea 
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="w-full h-32 bg-app-input border border-app-border rounded px-3 py-2 text-sm text-app-text focus:outline-none focus:border-rose-500 resize-none"
                  placeholder="Describe how this character should think and speak..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
                <button type="button" onClick={() => setViewMode('list')} className="px-4 py-2 text-sm text-app-muted hover:text-app-text">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-sm font-bold uppercase tracking-widest">Save Character</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterLibraryModal;
