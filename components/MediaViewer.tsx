
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { MediaItem } from '../types';

interface MediaViewerProps {
  item: MediaItem;
  onClose: () => void;
}

const MediaViewer: React.FC<MediaViewerProps> = ({ item, onClose }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const prevVolumeRef = useRef(1);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [item.id]);

  const formatAudioTime = (time: number) => {
    if (!Number.isFinite(time) || time < 0) return '0:00';
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const toggleAudioPlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    if (vol > 0) prevVolumeRef.current = vol;
    if (audioRef.current) {
      audioRef.current.volume = vol;
      audioRef.current.muted = vol === 0;
    }
  };

  const toggleAudioMute = () => {
    const nextVol = volume > 0 ? 0 : (prevVolumeRef.current > 0 ? prevVolumeRef.current : 1);
    setVolume(nextVol);
    if (audioRef.current) {
      audioRef.current.volume = nextVol;
      audioRef.current.muted = nextVol === 0;
    }
  };
  
  // Helper to decode Base64 content for text viewing
  const decodedContent = useMemo(() => {
    if (item.type === 'link') return item.data;
    if (item.type === 'text' || item.type === 'sql' || item.type === 'html') {
      try {
        const binaryString = atob(item.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
      } catch (e) {
        console.error("Failed to decode base64 text", e);
        return "Error decoding text content.";
      }
    }
    return "";
  }, [item]);

  const renderContent = () => {
    switch (item.type) {
      case 'image':
        return (
          <img 
            src={`data:${item.mimeType};base64,${item.data}`} 
            alt={item.name} 
            className="w-full h-full object-contain"
          />
        );
      case 'video':
        return (
          <video 
            src={`data:${item.mimeType};base64,${item.data}`} 
            controls 
            className="w-full h-full active-media-viewer bg-black object-contain"
          />
        );
      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center h-full px-6 bg-gradient-to-b from-gray-200 to-gray-300">
            <div className="w-40 h-40 bg-gray-100 rounded-full flex items-center justify-center mb-10 shadow-xl relative overflow-hidden border-4 border-white/50">
              <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-blue-600 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <audio
              ref={audioRef}
              src={`data:${item.mimeType};base64,${item.data}`}
              onTimeUpdate={() => {
                if (audioRef.current) {
                  setCurrentTime(audioRef.current.currentTime);
                  setDuration(audioRef.current.duration || 0);
                }
              }}
              onLoadedMetadata={() => {
                if (audioRef.current) {
                  setDuration(audioRef.current.duration || 0);
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <div className="w-full max-w-lg bg-white/95 text-slate-800 rounded-2xl p-4 shadow-2xl border border-gray-300 flex flex-wrap items-center gap-3 active-media-viewer">
              <button
                type="button"
                onClick={toggleAudioPlay}
                className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shrink-0 transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                ) : (
                  <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              <div className="flex-1 min-w-[140px] flex flex-col">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => {
                    const t = Number(e.target.value);
                    setCurrentTime(t);
                    if (audioRef.current) audioRef.current.currentTime = t;
                  }}
                  aria-label="Seek audio"
                  className="w-full h-1.5 accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-1">
                  <span>{formatAudioTime(currentTime)}</span>
                  <span>{formatAudioTime(duration)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 px-2.5 py-1.5 rounded-full border border-gray-200">
                <button
                  type="button"
                  onClick={toggleAudioMute}
                  className="text-gray-600 hover:text-gray-900"
                  title={volume === 0 ? 'Unmute' : 'Mute'}
                  aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {volume === 0 ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleAudioVolume}
                  aria-label="Volume"
                  title="Adjust volume"
                  className="w-24 h-1.5 accent-blue-600 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-gray-600 w-8 text-right">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          </div>
        );
      case 'pdf':
        return (
          <iframe 
            src={`data:${item.mimeType};base64,${item.data}`}
            title={item.name}
            className="w-full h-full"
          />
        );
      case 'html':
        return (
          <iframe 
            srcDoc={decodedContent}
            title={item.name}
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin allow-downloads"
          />
        );
      case 'document':
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
             </svg>
             <p className="text-lg font-bold">Document Preview Unavailable</p>
             <p className="text-sm mt-2 max-w-md text-center">
               This is a binary document (Word/Excel). It cannot be previewed directly in the browser, but it has been attached to the chat context for AI analysis.
             </p>
          </div>
        );
      case 'text':
      case 'sql':
      case 'link':
      default:
        return (
          <div className="w-full h-full p-6 overflow-auto bg-gray-200">
            <div className="bg-gray-50 text-slate-900 p-6 rounded-lg shadow-sm border border-gray-300 min-h-full">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
                  {item.type === 'link' ? 'URL Link' : (item.type === 'sql' ? 'SQL Query' : 'File Content')}
                </h3>
                <pre className="font-mono text-sm whitespace-pre-wrap break-words leading-relaxed selection:bg-yellow-200 selection:text-black">
                  {decodedContent}
                </pre>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-200 border-l border-app-border">
      <div className="flex items-center justify-between p-3 border-b border-gray-300 bg-gray-100 shadow-sm z-10">
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-fuchsia-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-bold text-gray-800 truncate" title={item.name}>Viewing: {item.name}</span>
          {item.tags && item.tags.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar ml-2">
              {item.tags.map((tag, idx) => (
                <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 whitespace-nowrap border border-gray-300">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-900 p-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-hidden relative bg-gray-200">
        {renderContent()}
      </div>
    </div>
  );
};

export default MediaViewer;
