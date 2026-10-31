import React, { useState, useRef } from 'react';
import { Sparkles, Paperclip, X } from 'lucide-react';
import { AudioInput } from '../AudioInput';

interface InputAreaProps {
  onGenerate: (prompt: string, file?: File) => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({ onGenerate, isGenerating, disabled }) => {
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !file) return;
    onGenerate(prompt, file || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col gap-4">
        {preview && (
          <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800 group">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <button 
              type="button" 
              onClick={clearFile}
              className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating || disabled}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-all disabled:opacity-50"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          <AudioInput 
            onTranscript={(text) => setPrompt(prev => prev ? `${prev} ${text}` : text)}
            placeholder="Speak your prompt..."
          />
          
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating || disabled}
            placeholder="A futuristic dashboard... / An interactive card game..."
            className="flex-1 bg-transparent border-none text-zinc-100 placeholder:text-zinc-600 focus:ring-0 text-lg outline-none"
          />
          
          <button 
            type="submit"
            disabled={(isGenerating || disabled) || (!prompt.trim() && !file)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all
              ${(prompt.trim() || file) && !isGenerating
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95' 
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}
            `}
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Generate</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden" 
      />
    </form>
  );
};
