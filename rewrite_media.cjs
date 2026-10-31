const fs = require('fs');

const content = `import React, { useState } from 'react';
import { SegCarverTool } from './CreationStudio/SegCarverTool';
import { ScriptWriter } from './CreationStudio/ScriptWriter';
import { VideoScriptWriter } from './CreationStudio/VideoScriptWriter';
import { ImageDescriber } from './CreationStudio/ImageDescriber';
import { Session, MediaItem } from '../types';

export const MediaSuiteView: React.FC<{ 
  onBack: () => void,
  session: Session | null,
  sessions: Session[],
  onSaveArtifact: (item: MediaItem) => void,
  onRunTool: (toolId: string) => void
}> = ({ onBack, session, sessions, onSaveArtifact, onRunTool }) => {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const tools = [
    {
      id: 'seg_carver',
      title: 'SegCarver',
      description: 'Named, independent section carving for precise grids.',
      icon: (
        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500',
    },
    {
      id: 'image_generator',
      title: '16. Image Generator Prompts',
      description: 'Create detailed Prompts for AI image generators (Midjourney/DALL-E) from context.',
      icon: (
        <svg className="w-8 h-8 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-fuchsia-500/10 border-fuchsia-500/30 hover:border-fuchsia-500',
    },
    {
      id: 'video_script_writer',
      title: '18. Video Script Writer',
      description: 'Write complete A/V video scripts and scene directions.',
      icon: (
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      ),
      color: 'bg-red-500/10 border-red-500/30 hover:border-red-500',
    },
    {
      id: 'script_writer',
      title: '20. Script Writer',
      description: 'Compose professional screenplay scripts with text, reference images, and suggestive ideas.',
      icon: (
        <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-500',
    },
    {
      id: 'image_describer',
      title: '21. Image Describer',
      description: 'Take any image and describe its contents, style, and colors in rich detail with custom modes.',
      icon: (
        <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      color: 'bg-teal-500/10 border-teal-500/30 hover:border-teal-500',
    }
  ];

  const handleToolClick = (id: string) => {
    if (id === 'image_generator') {
      onRunTool(id);
    } else {
      setActiveTool(id);
    }
  };

  const renderActiveTool = () => {
    switch (activeTool) {
      case 'seg_carver':
        return <SegCarverTool />;
      case 'script_writer':
        return <ScriptWriter session={session} sessions={sessions} onSaveArtifact={onSaveArtifact} />;
      case 'video_script_writer':
        return <VideoScriptWriter session={session} sessions={sessions} onSaveArtifact={onSaveArtifact} />;
      case 'image_describer':
        return <ImageDescriber session={session} onSaveArtifact={onSaveArtifact} />;
      default:
        return null;
    }
  };

  if (activeTool) {
    const activeToolData = tools.find(t => t.id === activeTool);
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-app-bg text-app-text">
        <header className="p-4 border-b border-app-border flex items-center justify-between bg-app-panel">
          <h1 className="text-xl font-bold">{activeToolData?.title}</h1>
          <button onClick={() => setActiveTool(null)} className="text-sm px-3 py-1 bg-app-card border border-app-border rounded hover:bg-app-card/80 transition-colors">
            Close
          </button>
        </header>
        <div className="flex-1 overflow-auto bg-app-bg">
          {renderActiveTool()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-app-bg text-app-text">
      <header className="p-4 border-b border-app-border flex items-center justify-between bg-app-panel">
        <h1 className="text-xl font-bold">Media Suite</h1>
        <button onClick={onBack} className="text-sm px-3 py-1 bg-app-card border border-app-border rounded hover:bg-app-card/80 transition-colors">
          Back to Library
        </button>
      </header>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={\`flex flex-col items-start p-6 rounded-2xl border transition-all text-left group \${tool.color} hover:shadow-lg hover:scale-[1.02] cursor-pointer\`}
            >
              <div className={\`mb-4 p-3 rounded-xl bg-app-bg border border-app-border group-hover:scale-110 transition-transform\`}>
                {tool.icon}
              </div>
              <h3 className="font-semibold text-lg mb-2 text-app-text">{tool.title}</h3>
              <p className="text-sm text-app-dim">{tool.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
`;

fs.writeFileSync('components/MediaSuiteView.tsx', content);

console.log("Rewritten MediaSuiteView");
