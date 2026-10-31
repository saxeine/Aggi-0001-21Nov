
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MindMapPopupProps {
  title: string;
  content: string | null;
  isLoading: boolean;
  onClose: () => void;
}

const MindMapPopup: React.FC<MindMapPopupProps> = ({ title, content, isLoading, onClose }) => {
  const [tableStyle, setTableStyle] = useState<'default' | 'modern' | 'minimal'>('default');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-app-card border border-app-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-app-border bg-app-panel">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-500/10 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
             </div>
             <h3 className="text-lg font-bold text-app-text">
               {title} <span className="text-sm font-normal text-app-dim opacity-75">/ Context Detail</span>
             </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-app-bg text-app-dim hover:text-app-text transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-app-bg text-app-text relative">
           {isLoading ? (
             <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-app-dim animate-pulse">Analyzing context from sources...</p>
             </div>
           ) : (
             <div className="markdown-body text-sm whitespace-pre-wrap">
                {content ? (
                  <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                          table: ({node, ...props}) => (
                              <div className="my-4 group relative pt-8">
                                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                                      <button onClick={() => setTableStyle('default')} className={`px-2 py-1 text-[10px] rounded ${tableStyle === 'default' ? 'bg-blue-600 text-white' : 'bg-app-card text-app-dim hover:text-app-text'}`}>Default</button>
                                      <button onClick={() => setTableStyle('modern')} className={`px-2 py-1 text-[10px] rounded ${tableStyle === 'modern' ? 'bg-purple-600 text-white' : 'bg-app-card text-app-dim hover:text-app-text'}`}>Modern</button>
                                      <button onClick={() => setTableStyle('minimal')} className={`px-2 py-1 text-[10px] rounded ${tableStyle === 'minimal' ? 'bg-emerald-600 text-white' : 'bg-app-card text-app-dim hover:text-app-text'}`}>Minimal</button>
                                  </div>
                                  <div className="overflow-x-auto">
                                      <table className={`min-w-full divide-y ${tableStyle === 'modern' ? 'divide-purple-500/30 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] bg-purple-900/10' : tableStyle === 'minimal' ? 'divide-transparent border-transparent' : 'divide-app-border border-app-border bg-black/20'} border rounded-lg`} {...props} />
                                  </div>
                              </div>
                          ),
                          thead: ({node, ...props}) => <thead className={`${tableStyle === 'modern' ? 'bg-purple-900/40' : tableStyle === 'minimal' ? 'border-b-2 border-app-text' : 'bg-app-panel/50'}`} {...props} />,
                          th: ({node, ...props}) => <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${tableStyle === 'modern' ? 'text-purple-300 border-b border-purple-500/30' : tableStyle === 'minimal' ? 'text-app-text' : 'text-app-text border-b border-app-border'}`} {...props} />,
                          td: ({node, ...props}) => <td className={`px-4 py-2 text-sm ${tableStyle === 'modern' ? 'text-purple-100/90 border-b border-purple-500/20' : tableStyle === 'minimal' ? 'text-app-text/80 py-3' : 'text-app-text/90 border-b border-app-border/50'}`} {...props} />,
                          a: ({node, href, children, ...props}) => <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-md font-bold mt-2 mb-1" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-app-border pl-4 italic opacity-80 my-2" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-bold text-current opacity-100" {...props} />,
                      }}
                  >
                      {content}
                  </ReactMarkdown>
                ) : (
                  "No details available."
                )}
             </div>
           )}
        </div>
        
        {/* Footer */}
        <div className="p-3 bg-app-panel border-t border-app-border flex justify-end">
           <button onClick={onClose} className="px-4 py-2 bg-app-card hover:bg-app-border text-app-text text-sm font-medium rounded-lg transition-colors border border-app-border">
             Close
           </button>
        </div>
      </div>
    </div>
  );
};

export default MindMapPopup;
