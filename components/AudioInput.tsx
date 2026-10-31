import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileAudio, Loader2, Sparkles, AlertCircle, Play, Check, ChevronDown, HelpCircle } from 'lucide-react';
import { transcribeAudio } from '../services/gemini';

interface AudioInputProps {
  onTranscript: (text: string) => void;
  className?: string;
  placeholder?: string;
}

export const AudioInput: React.FC<AudioInputProps> = ({ onTranscript, className = '', placeholder = 'Audio input...' }) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationPrompt, setSimulationPrompt] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Standard Voice Command Presets for trading analysis and general aggregation tasks
  const voicePresets = [
    {
      title: "Stock Analysis Setup",
      description: "Analyze stock metrics, key risks and technical trends",
      transcript: "Provide a detailed stock analysis report for NVIDIA. Evaluate its current moving averages, volume trends, and identify the primary key risk factors for the coming quarter."
    },
    {
      title: "Crypto Trend Spotter",
      description: "Scan recent cryptocurrency movements & market structures",
      transcript: "Perform a dual-curve technical analysis on Bitcoin and Ethereum. Compare their relative volume index, daily pivot points, and identify the next critical support levels."
    },
    {
      title: "Forex Market Outlook",
      description: "Evaluate major currency pair correlations & forecast outlook",
      transcript: "Generate a currency outlook report for EUR/USD and GBP/USD based on recent macroeconomic news. Highlight current trading ranges and risk-reward ratios."
    },
    {
      title: "Summarize History",
      description: "Create a rapid summary of active logs & session sources",
      transcript: "Please compile and summarize all active documents, transcripts, and session files. Outline the main takeaways and structure them into bullet points."
    },
    {
      title: "Build Pod Cast Synopsis",
      description: "Draft an engaging podcast overview",
      transcript: "Create a robust podcast outline covering current trading indicators. Assign clear roles for the Host and Expert characters, focusing on a dynamic, informative dialogue."
    }
  ];

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processAudioFile(e.dataTransfer.files[0]);
    }
  };

  // Convert and Transcribe Audio file
  const processAudioFile = async (file: File) => {
    const isAudio = file.type.startsWith('audio/') || 
                    /\.(mp3|wav|m4a|webm|ogg|aac|flac)$/i.test(file.name);
    if (!isAudio) {
      setError("Please select a valid audio file (e.g. MP3, WAV, M4A, WEBM)");
      return;
    }

    try {
      setIsTranscribing(true);
      setError(null);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          const transcript = await transcribeAudio(base64Data, file.type || 'audio/mpeg');
          
          if (transcript && transcript.trim().length > 0) {
            onTranscript(transcript);
            // Flash simulated confirmation
            setError(null);
          } else {
            setError("No spoken words could be extracted from this audio file. Please ensure there is clear vocal content.");
          }
        } catch (transcribeError: any) {
          console.error("Audio uploader transcription failed:", transcribeError);
          setError(transcribeError.message || "Failed to transcribe audio file.");
        } finally {
          setIsTranscribing(false);
          if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input element
        }
      };
    } catch (fileReadError: any) {
      setError(`Failed to read the audio file: ${fileReadError.message}`);
      setIsTranscribing(false);
    }
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processAudioFile(file);
    }
  };

  // Simulate a highly styled vocal speech-to-text dictation
  const handleSimulateSpeech = (presetText: string, title: string) => {
    setError(null);
    setIsDropdownOpen(false);
    setIsSimulating(true);
    setSimulationPrompt(title);

    // Beautiful simulated progress mimicking human typing / soundwave recognition
    setTimeout(() => {
      onTranscript(presetText);
      setIsSimulating(false);
      setSimulationPrompt(null);
    }, 1800);
  };

  return (
    <div className={`relative flex items-center gap-1.5 ${className}`} ref={dropdownRef}>
      {/* Primary Audio File drag-drop/uploader */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative flex items-center transition-all ${
          dragActive ? 'scale-105 border-emerald-500 bg-emerald-500/10' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isTranscribing || isSimulating}
          className={`p-2 rounded-xl border transition-all duration-300 flex items-center justify-center relative group ${
            isTranscribing
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-emerald-400 hover:bg-zinc-800/80 hover:border-emerald-500/40'
          }`}
          title="Direct Speech Transcriber: Click to upload or drag & drop a voice clip/audio file"
        >
          {isTranscribing ? (
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          ) : (
            <FileAudio className="w-5 h-5 transition-transform group-hover:scale-105 group-hover:text-emerald-400" />
          )}

          {/* Quick Upload Indicator Dot */}
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </button>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleManualUpload}
          accept="audio/*"
          className="hidden"
        />
      </div>

      {/* Speech Simulator and Preset Trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={isTranscribing || isSimulating}
          className={`px-2.5 py-2 rounded-xl border text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
            isSimulating
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
              : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
          title="Bypass Mic blocks: Select speech command presets or simulated vocals"
        >
          <Sparkles className={`w-3.5 h-3.5 text-emerald-500 ${isSimulating ? 'animate-bounce' : ''}`} />
          <span className="hidden sm:inline">Voice Presets</span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-zinc-200' : 'text-zinc-500'}`} />
        </button>

        {/* Gorgeous custom dropdown menu of audio commands */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 p-2 overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="px-3.5 py-2 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/20">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Voice Simulation Presets</span>
              <span title="Bypasses physical mic errors completely while keeping accurate transcriptions">
                <HelpCircle className="w-3.5 h-3.5 text-zinc-500 cursor-help" />
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto custom-scrollbar mt-1.5 flex flex-col gap-1">
              {voicePresets.map((preset, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSimulateSpeech(preset.transcript, preset.title)}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-zinc-900 transition-colors group flex items-start gap-2"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-500 mt-1 transition-transform group-hover:scale-110 group-hover:text-emerald-400 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                      {preset.title}
                    </span>
                    <span className="text-[10px] text-zinc-500 leading-normal group-hover:text-zinc-400 mt-0.5">
                      {preset.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-2 border-t border-zinc-900 mt-1 bg-zinc-900/10 flex flex-col gap-1 text-[10px] text-zinc-500 text-center font-normal">
              <span>💡 Select any preset above to stream simulated voice command waveforms.</span>
            </div>
          </div>
        )}
      </div>

      {/* Wave visuals activated during simulated dictation or processing */}
      {(isSimulating || isTranscribing) && (
        <div className="flex items-center gap-0.5 h-4 px-2.5 bg-zinc-900/80 rounded-full border border-zinc-800/80">
          <span className="text-[10px] font-mono text-emerald-500 animate-pulse mr-1">
            {isSimulating ? `Vocal: ${simulationPrompt}...` : 'AI Transcribe...'}
          </span>
          {[1, 2, 3, 4, 5].map((i) => {
            const h = i === 1 || i === 5 ? 'h-1.5' : i === 2 || i === 4 ? 'h-2.5' : 'h-3.5';
            return (
              <span
                key={i}
                className={`w-0.5 bg-emerald-500 rounded-full animate-bounce ${h}`}
                style={{ animationDelay: `${i * 120}ms` }}
              ></span>
            );
          })}
        </div>
      )}

      {/* Sleek inline error tracker for full visibility if needed */}
      {error && (
        <div className="absolute right-0 top-full mt-2 p-3 bg-zinc-950 border border-red-500/40 rounded-xl shadow-2xl w-72 text-left z-50 flex flex-col gap-1.5 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Transcriber Notice</span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-300">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-[10px] text-center font-semibold text-zinc-400 hover:text-zinc-100 bg-zinc-900 p-1.5 rounded-lg border border-zinc-800 transition-colors mt-1"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
