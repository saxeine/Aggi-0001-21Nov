import React, { useState, useEffect } from 'react';

export interface ToolItem {
  id: string;
  title: string;
}

interface ToolOrderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tools: ToolItem[];
  toolOrder: string[];
  onSave: (newOrder: string[]) => void;
  viewModeLabel?: string;
  onCycleViewMode?: () => void;
  themeLabel?: string;
  onCycleTheme?: () => void;
}

const ToolOrderSettingsModal: React.FC<ToolOrderSettingsModalProps> = ({
  isOpen, onClose, tools, toolOrder, onSave, viewModeLabel, onCycleViewMode, themeLabel, onCycleTheme
}) => {
  const [currentOrder, setCurrentOrder] = useState<string[]>(toolOrder);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentOrder(toolOrder);
    }
  }, [toolOrder, isOpen]);

  if (!isOpen) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        // Required for Firefox
        e.dataTransfer.setData('text/plain', index.toString());
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    
    const newOrder = [...currentOrder];
    const draggedItem = newOrder[draggedIdx];
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(index, 0, draggedItem);
    
    setDraggedIdx(index);
    setCurrentOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const getToolTitle = (id: string) => {
    return tools.find(t => t.id === id)?.title || id;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-app-card border border-app-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
        <div className="p-6">
          <div className="flex justify-between items-center mb-2">
             <h3 className="text-xl font-bold text-green-500">Reorder Tools</h3>
             <div className="flex gap-2">
                {onCycleViewMode && (
                   <button onClick={onCycleViewMode} className="p-2 bg-app-panel rounded-md border border-app-border hover:border-green-500/50 transition-colors text-xs text-app-text flex items-center" title="Cycle View Mode">
                       {viewModeLabel || "Layout"}
                   </button>
                )}
                {onCycleTheme && (
                   <button onClick={onCycleTheme} className="p-2 bg-app-panel rounded-md border border-app-border hover:border-green-500/50 transition-colors text-xs text-app-text flex items-center" title="Cycle Theme">
                       {themeLabel || "Theme"}
                   </button>
                )}
             </div>
          </div>
          <p className="text-app-muted text-sm mb-6">Drag and drop to rearrange how tools appear.</p>
          
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {currentOrder.map((id, index) => (
              <div
                key={id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`p-3 bg-app-panel border border-app-border rounded-lg flex items-center gap-3 cursor-grab active:cursor-grabbing hover:border-green-500/50 transition-colors ${draggedIdx === index ? 'opacity-50 border-green-500' : ''}`}
              >
                <svg className="w-5 h-5 text-app-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
                <span className="text-app-text font-medium">{getToolTitle(id)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-app-panel p-4 flex justify-end gap-3 border-t border-app-border">
          <button onClick={onClose} className="px-4 py-2 text-app-muted hover:text-app-text text-sm font-medium transition-colors">Cancel</button>
          <button onClick={() => { onSave(currentOrder); onClose(); }} className="px-6 py-2 bg-transparent border border-green-500 hover:bg-green-500/10 text-green-500 rounded-lg text-sm font-medium transition-all shadow-lg shadow-green-900/20">Save Order</button>
        </div>
      </div>
    </div>
  );
};

export default ToolOrderSettingsModal;
