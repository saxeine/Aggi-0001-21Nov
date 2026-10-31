import React from 'react';
import { X, RefreshCw, Download } from 'lucide-react';

export interface Creation {
  id: string;
  name: string;
  html: string;
  originalImage?: string;
  timestamp: Date;
}

interface LivePreviewProps {
  creation: Creation | null;
  isLoading: boolean;
  isFocused: boolean;
  onReset: () => void;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ creation, isLoading, isFocused, onReset }) => {
  const handleDownload = () => {
    if (!creation) return;
    const blob = new Blob([creation.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${creation.name.replace(/\.[^/.]+$/, "")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isFocused && !isLoading) return null;

  return (
    <div className={`fixed inset-0 z-40 bg-zinc-950 flex flex-col transition-all duration-700 ${isFocused ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Top Bar */}
      <div className="flex-shrink-0 h-16 border-b border-zinc-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button onClick={onReset} className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-200">{creation?.name || 'Creating...'}</span>
            <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest leading-none">Gemini Studio</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {creation && (
            <>
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export Code</span>
              </button>
              <div className="w-px h-4 bg-zinc-800 mx-2" />
            </>
          )}
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-500/80 uppercase tracking-tighter">Live Session</span>
        </div>
      </div>

      {/* Main Preview */}
      <div className="flex-1 relative bg-[#050505] overflow-hidden flex justify-center items-center">
        {isLoading && (
          <div className="absolute inset-0 bg-[#050505] z-10 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-t-2 border-blue-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-blue-500/40 animate-pulse" />
              </div>
            </div>
            <div className="space-y-1 text-center">
              <p className="text-lg font-medium text-zinc-200 animate-pulse">Bringing your idea to life...</p>
              <p className="text-xs text-zinc-500">Gemini is architecting your interface</p>
            </div>
          </div>
        )}
        
        {creation && (
          <iframe 
            srcDoc={creation.html}
            title="Preview"
            className={`w-full h-full border-none shadow-2xl bg-white ${isLoading ? 'hidden' : 'block'}`}
            sandbox="allow-scripts allow-modals allow-forms"
          />
        )}
      </div>
    </div>
  );
};
