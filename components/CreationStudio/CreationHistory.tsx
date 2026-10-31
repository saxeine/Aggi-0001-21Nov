import React, { useState } from 'react';
import { History, Clock, FileText, Trash2, Edit2, Check, X } from 'lucide-react';
import { Creation } from './LivePreview';

interface CreationHistoryProps {
  history: Creation[];
  onSelect: (creation: Creation) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newName: string) => void;
}

export const CreationHistory: React.FC<CreationHistoryProps> = ({ history, onSelect, onDelete, onEdit }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  if (history.length === 0) return null;

  const handleStartEdit = (e: React.MouseEvent, item: Creation) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const handleSaveEdit = (e: React.MouseEvent | React.FocusEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    if (editingName.trim() && onEdit) {
      onEdit(id, editingName.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2 px-2">
        <History className="w-4 h-4 text-zinc-600" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-600">Previous Artifacts</h3>
        <div className="flex-1 h-px bg-zinc-800 ml-2" />
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {history.slice(0, 12).map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (editingId !== item.id) {
                onSelect(item);
              }
            }}
            type="button"
            className="group relative aspect-[4/3] rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden hover:border-zinc-500 transition-all text-left"
          >
            {item.originalImage ? (
              <img src={item.originalImage} alt={item.name} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors">
                <FileText className="w-8 h-8 text-blue-500/20 group-hover:text-blue-500/40" />
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 flex flex-col justify-end">
              {editingId === item.id ? (
                <div className="flex items-center gap-1 mb-1 z-20">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(e, item.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="bg-zinc-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-zinc-600 focus:outline-none focus:border-blue-500 w-full"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={(e) => handleSaveEdit(e, item.id)}
                    className="p-1 bg-green-500 hover:bg-green-600 rounded text-white"
                  >
                    <Check className="w-2.5 h-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded text-white"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-bold text-zinc-100 truncate mb-1">{item.name}</span>
              )}

              <div className="flex items-center gap-1.5">
                <Clock className="w-2.5 h-2.5 text-zinc-500" />
                <span className="text-[9px] text-zinc-500 font-medium">
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            {/* Top right actions hidden by default, visible on hover */}
            {editingId !== item.id && (
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100 z-10">
                <button
                  type="button"
                  onClick={(e) => handleStartEdit(e, item)}
                  className="p-1 bg-zinc-800/90 hover:bg-zinc-700 rounded text-zinc-200 hover:text-white transition-colors border border-zinc-700"
                  title="Rename"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="p-1 bg-red-950/90 hover:bg-red-700 rounded text-red-100 transition-colors border border-red-800 hover:border-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
