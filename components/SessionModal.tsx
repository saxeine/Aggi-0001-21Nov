
import React, { useState, useEffect, useRef } from 'react';
import { Session } from '../types';
import { getCustomTemplates } from './TemplateManager';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
  defaultValue?: string;
  sessions?: Session[];
}

const SessionModal: React.FC<SessionModalProps> = ({ isOpen, onClose, onCreate, defaultValue = '', sessions = [] }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadTemplatesList = () => {
    setTemplates(getCustomTemplates());
  };

  const getNextSessionName = (category: string, sessionsList: Session[]): string => {
    let maxNum = 0;
    const prefix = `${category} `;
    sessionsList.forEach(s => {
      if (s.name && s.name.startsWith(prefix)) {
        const numPart = s.name.substring(prefix.length).trim();
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nextNum = maxNum + 1;
    return `${category} ${nextNum.toString().padStart(3, '0')}`;
  };

  useEffect(() => {
    loadTemplatesList();
    window.addEventListener('aggrigator_templates_updated', loadTemplatesList);
    return () => {
      window.removeEventListener('aggrigator_templates_updated', loadTemplatesList);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName(defaultValue);
      setDescription('');
      setUseTemplate(false);
      setSelectedTemplate('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), description.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-app-card border border-app-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-pulse-fast-once">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-xl font-bold text-green-500 mb-2">New Session</h3>
            <p className="text-app-muted text-sm mb-6">
              Give your session a name to organize your media context.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 py-1">
                <input
                  id="useTemplate"
                  type="checkbox"
                  checked={useTemplate}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseTemplate(checked);
                    if (checked) {
                      const initialTemplate = selectedTemplate || templates[0] || '';
                      setSelectedTemplate(initialTemplate);
                      setName(getNextSessionName(initialTemplate, sessions));
                    } else {
                      setName(defaultValue);
                    }
                  }}
                  className="w-4 h-4 text-green-500 bg-app-input border-app-border rounded focus:ring-green-500 focus:ring-2 cursor-pointer"
                />
                <label htmlFor="useTemplate" className="text-sm font-medium text-app-text cursor-pointer select-none">
                  Use Category Template
                </label>
              </div>

              {useTemplate && templates.length > 0 && (
                <div className="bg-app-panel p-3 border border-app-border rounded-lg space-y-3 animate-fade-in">
                  <div>
                    <label htmlFor="templateSelect" className="block text-xs font-semibold text-app-dim uppercase tracking-wider mb-2">
                      Select Category
                    </label>
                    <select
                      id="templateSelect"
                      value={selectedTemplate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedTemplate(val);
                        if (val) {
                          setName(getNextSessionName(val, sessions));
                        }
                      }}
                      className="w-full bg-app-input border border-app-border rounded-lg px-3 py-2 text-app-text focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    >
                      {templates.map((t) => (
                        <option key={t} value={t} className="bg-app-card text-app-text">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="sessionName" className="block text-xs font-semibold text-app-dim uppercase tracking-wider mb-2">
                  Session Name
                </label>
                <input
                  ref={inputRef}
                  id="sessionName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Session 001"
                  className="w-full bg-app-input border border-app-border rounded-lg px-4 py-3 text-app-text focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="sessionDescription" className="block text-xs font-semibold text-app-dim uppercase tracking-wider mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="sessionDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the contents of this session..."
                  className="w-full bg-app-input border border-app-border rounded-lg px-4 py-3 text-app-text focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="bg-app-panel p-4 flex justify-end gap-3 border-t border-app-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-app-muted hover:text-app-text text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-2 bg-transparent border border-green-500 hover:bg-green-500/10 text-green-500 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-900/20"
            >
              Create Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionModal;
