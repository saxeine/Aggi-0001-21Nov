
import React, { useState, useMemo } from 'react';
import { PromptTemplate } from '../types';

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: PromptTemplate[];
  onSelect: (content: string) => void;
  onAdd: (title: string, content: string) => void;
  onDelete: (id: string) => void;
}

const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({ 
  isOpen, 
  onClose, 
  prompts, 
  onSelect,
  onAdd,
  onDelete 
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'user' | 'system'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'add'>('list');

  // Add Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const filteredPrompts = useMemo(() => {
    let filtered = prompts;
    if (activeTab === 'user') filtered = prompts.filter(p => p.category === 'user');
    if (activeTab === 'system') filtered = prompts.filter(p => p.category === 'system');

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.content.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [prompts, activeTab, search]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim() && newContent.trim()) {
      onAdd(newTitle.trim(), newContent.trim());
      setNewTitle('');
      setNewContent('');
      setViewMode('list');
      setActiveTab('user');
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(prompts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompts_library.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-app-card border border-app-border rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-pulse-fast-once">
        
        {/* Header */}
        <div className="p-4 border-b border-app-border flex justify-between items-center bg-app-panel">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-app-text" viewBox="0 0 20 20" fill="currentColor">
               <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            <h3 className="text-lg font-bold text-app-text">Prompt Library</h3>
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
                  <button onClick={() => setActiveTab('user')} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'user' ? 'bg-app-text text-app-bg' : 'text-app-muted hover:text-app-text'}`}>My Prompts</button>
                </div>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    placeholder="Search prompts..." 
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
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  New
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 {filteredPrompts.length === 0 && (
                   <div className="text-center text-app-dim mt-10">No prompts found.</div>
                 )}
                 {filteredPrompts.map(prompt => (
                   <div key={prompt.id} className="bg-app-panel border border-app-border rounded-lg p-3 hover:border-app-text/50 transition-colors group flex justify-between items-start">
                      <div onClick={() => { onSelect(prompt.content); onClose(); }} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-app-text">{prompt.title}</span>
                          {prompt.category === 'user' && <span className="text-[10px] bg-blue-900 text-blue-200 px-1.5 rounded border border-blue-700">User</span>}
                          {prompt.tags?.map(t => (
                            <span key={t} className="text-[10px] bg-app-bg text-app-dim px-1.5 rounded border border-app-border capitalize">{t}</span>
                          ))}
                        </div>
                        <p className="text-xs text-app-muted line-clamp-2">{prompt.content}</p>
                      </div>
                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => { onSelect(prompt.content); onClose(); }} className="text-app-text hover:text-green-400" title="Use Prompt">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                            </svg>
                         </button>
                         {prompt.category === 'user' && (
                            <button onClick={() => onDelete(prompt.id)} className="text-app-dim hover:text-red-400" title="Delete">
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
            <form onSubmit={handleAddSubmit} className="flex-1 flex flex-col p-6 gap-4">
              <h4 className="text-sm font-bold text-app-text uppercase tracking-wider">Create New Prompt</h4>
              <div>
                <label className="block text-xs text-app-dim mb-1">Title</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-app-input border border-app-border rounded px-3 py-2 text-sm text-app-text focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Code Reviewer"
                  required
                  autoFocus
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-app-dim mb-1">Prompt Content</label>
                <textarea 
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="w-full h-full bg-app-input border border-app-border rounded px-3 py-2 text-sm text-app-text focus:outline-none focus:border-blue-500 resize-none font-mono"
                  placeholder="Type your prompt template here..."
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-app-border">
                <button type="button" onClick={() => setViewMode('list')} className="px-4 py-2 text-sm text-app-muted hover:text-app-text">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold">Save Prompt</button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {viewMode === 'list' && (
           <div className="p-3 bg-app-panel border-t border-app-border flex justify-between items-center">
              <button onClick={handleExport} className="text-xs text-app-dim hover:text-app-text flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Export JSON
              </button>
              <div className="text-[10px] text-app-dim">{prompts.length} templates</div>
           </div>
        )}
      </div>
    </div>
  );
};

export default PromptLibraryModal;
