import React, { useState, useEffect, useRef } from 'react';

const DEFAULT_TEMPLATES = [
  "Document Accumulations",
  "image decipifer/OCR",
  "Work",
  "Travel",
  "Research",
  "Documentary",
  "Training",
  "Film"
];

export const getCustomTemplates = (): string[] => {
  try {
    const saved = localStorage.getItem('aggrigator_templates');
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load templates:", err);
  }
  return DEFAULT_TEMPLATES;
};

export const saveCustomTemplates = (templates: string[]) => {
  try {
    localStorage.setItem('aggrigator_templates', JSON.stringify(templates));
    window.dispatchEvent(new Event('aggrigator_templates_updated'));
  } catch (err) {
    console.error("Failed to save templates:", err);
  }
};

export const addCustomTemplate = (template: string): boolean => {
  const trimmed = template.trim();
  if (!trimmed) return false;
  const current = getCustomTemplates();
  if (current.map(t => t.toLowerCase()).includes(trimmed.toLowerCase())) {
    return false; // Already exists
  }
  const updated = [...current, trimmed];
  saveCustomTemplates(updated);
  return true;
};

export const deleteCustomTemplate = (template: string): boolean => {
  const current = getCustomTemplates();
  const updated = current.filter(t => t.toLowerCase() !== template.trim().toLowerCase());
  if (updated.length === current.length) return false;
  saveCustomTemplates(updated);
  return true;
};

export const exportTemplatesToCSV = (templates: string[]) => {
  // Simple CSV with a single column: Category
  const csvContent = "Category\n" + templates.map(t => `"${t.replace(/"/g, '""')}"`).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aggrigator_templates_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const parseTemplatesCSV = (text: string): string[] => {
  const lines = text.split(/\r?\n/);
  const newTemplates: string[] = [];
  lines.forEach((line, index) => {
    let cell = line.trim();
    if (!cell) return;
    
    // Simple comma split if columns exist, get the first one
    if (cell.includes(',')) {
      const parts = cell.split(',');
      cell = parts[0].trim();
    }
    
    // Remove enclosing quotes
    cell = cell.replace(/^["']|["']$/g, '').trim();
    
    if (!cell) return;
    
    // Ignore header lines
    const lower = cell.toLowerCase();
    if (index === 0 && (lower === 'category' || lower === 'template' || lower === 'name' || lower === 'title')) {
      return;
    }
    
    if (!newTemplates.map(t => t.toLowerCase()).includes(lower)) {
      newTemplates.push(cell);
    }
  });
  return newTemplates;
};

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({ isOpen, onClose }) => {
  const [templates, setTemplates] = useState<string[]>([]);
  const [newTemplate, setNewTemplate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTemplates = () => {
    setTemplates(getCustomTemplates());
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setError(null);
      setConfirmDelete(null);
      setConfirmReset(false);
    }
    
    window.addEventListener('aggrigator_templates_updated', loadTemplates);
    return () => {
      window.removeEventListener('aggrigator_templates_updated', loadTemplates);
    };
  }, [isOpen]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = newTemplate.trim();
    if (!trimmed) return;
    
    const success = addCustomTemplate(trimmed);
    if (success) {
      setNewTemplate('');
    } else {
      setError('Template category already exists.');
    }
  };

  const handleDelete = (t: string) => {
    deleteCustomTemplate(t);
  };

  const handleReset = () => {
    saveCustomTemplates(DEFAULT_TEMPLATES);
    setError(null);
  };

  const handleExport = () => {
    exportTemplatesToCSV(templates);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseTemplatesCSV(text);
        if (parsed.length > 0) {
          // Merge with current templates
          const current = getCustomTemplates();
          const merged = [...current];
          parsed.forEach(p => {
            if (!merged.map(t => t.toLowerCase()).includes(p.toLowerCase())) {
              merged.push(p);
            }
          });
          saveCustomTemplates(merged);
          alert(`Successfully imported ${parsed.length} templates!`);
        } else {
          alert('Could not find any valid templates in the CSV file.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-app-card border border-app-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-pulse-fast-once">
        
        {/* Header */}
        <div className="p-6 border-b border-app-border flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-app-text">Category Templates</h3>
            <p className="text-app-muted text-xs mt-1">Manage and configure template categories for session names.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-app-dim hover:text-app-text p-1.5 rounded-lg hover:bg-app-panel transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form and Actions */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-3 rounded-lg border border-app-border bg-app-panel hover:bg-app-card transition-all text-center group cursor-pointer"
            >
              <svg className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-text">Import CSV</span>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv" 
                onChange={handleCSVUpload} 
                className="hidden" 
              />
            </button>

            <button
              onClick={handleExport}
              className="flex flex-col items-center justify-center p-3 rounded-lg border border-app-border bg-app-panel hover:bg-app-card transition-all text-center group cursor-pointer"
            >
              <svg className="w-5 h-5 text-blue-400 mb-1 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-text">Export CSV</span>
            </button>

            <button
              onClick={() => {
                if (confirmReset) {
                  handleReset();
                  setConfirmReset(false);
                } else {
                  setConfirmReset(true);
                }
              }}
              onMouseLeave={() => setConfirmReset(false)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center group cursor-pointer ${
                confirmReset 
                  ? 'border-red-500 bg-red-950/20 text-red-400' 
                  : 'border-app-border bg-app-panel hover:bg-app-card text-app-text'
              }`}
            >
              {confirmReset ? (
                <>
                  <svg className="w-5 h-5 text-red-400 mb-1 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Confirm?</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-amber-500 mb-1 group-hover:rotate-45 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-app-text">Reset Defaults</span>
                </>
              )}
            </button>
          </div>

          {/* Add Form */}
          <form onSubmit={handleAdd} className="space-y-2">
            <label className="block text-xs font-semibold text-app-dim uppercase tracking-wider">
              Add Custom Category Template
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                placeholder="e.g. Legal Analysis"
                className="flex-1 bg-app-input border border-app-border rounded-lg px-3 py-2 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!newTemplate.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
          </form>

          {/* List */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-app-dim uppercase tracking-wider">
              Available Templates ({templates.length})
            </label>
            <div className="border border-app-border bg-app-panel rounded-lg divide-y divide-app-border/40 max-h-[220px] overflow-y-auto custom-scrollbar">
              {templates.length === 0 ? (
                <div className="p-4 text-center text-app-dim text-sm">No template categories found.</div>
              ) : (
                templates.map(t => (
                  <div key={t} className="px-4 py-2 flex items-center justify-between text-sm group hover:bg-app-card/30 transition-all">
                    <span className="text-app-text font-medium">{t}</span>
                    <button
                      onClick={() => {
                        if (confirmDelete === t) {
                          handleDelete(t);
                          setConfirmDelete(null);
                        } else {
                          setConfirmDelete(t);
                        }
                      }}
                      className={`p-1.5 rounded transition-all flex items-center gap-1.5 text-xs font-semibold ${
                        confirmDelete === t 
                          ? 'bg-red-500/20 text-red-400 opacity-100' 
                          : 'text-app-dim hover:text-red-500 hover:bg-red-500/10 opacity-60 group-hover:opacity-100'
                      }`}
                      title={confirmDelete === t ? "Confirm Deletion" : "Delete Template Category"}
                    >
                      {confirmDelete === t ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Delete?</span>
                        </>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.895-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-app-panel p-4 flex justify-end border-t border-app-border">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-app-card hover:bg-app-panel border border-app-border rounded-lg text-app-text text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
