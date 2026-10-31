import React, { useState, useMemo, useEffect } from 'react';

interface ArtifactPreviewProps {
  code: string;
  onClose: () => void;
  onMinimize?: () => void;
  onToggleFullWidth?: () => void;
  onSaveToSession?: (code: string, title: string) => void;
  onSaveToMIPrOMPT?: (title: string) => void;
  isFullWidth?: boolean;
  theme?: string;
}

const ArtifactPreview: React.FC<ArtifactPreviewProps> = ({ 
  code, 
  onClose, 
  onMinimize,
  onToggleFullWidth,
  onSaveToSession,
  onSaveToMIPrOMPT,
  isFullWidth,
  theme
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [isQrVisible, setIsQrVisible] = useState(false);

  // Read active CSS variables from DOM to match theme perfectly
  const [themeStyles, setThemeStyles] = useState({
    bgApp: '#121212',
    bgPanel: '#1a1a1a',
    bgCard: '#262626',
    bgInput: '#000000',
    border: '#333333',
    textMain: '#ffffff',
    textMuted: '#d4d4d8',
    textDim: '#71717a',
    isDark: true
  });

  useEffect(() => {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    
    const readVar = (name: string, fallback: string) => {
      const val = computed.getPropertyValue(name).trim();
      return val || fallback;
    };

    const bgApp = readVar('--c-bg-app', '#121212');
    
    // Determine active theme
    let activeTheme = theme || localStorage.getItem('gemini_media_aggregator_theme') || 'dark';
    const isDark = activeTheme !== 'light' && activeTheme !== 'olive';

    setThemeStyles({
      bgApp,
      bgPanel: readVar('--c-bg-panel', isDark ? '#1a1a1a' : '#f8fafc'),
      bgCard: readVar('--c-bg-card', isDark ? '#262626' : '#f1f5f9'),
      bgInput: readVar('--c-bg-input', isDark ? '#000000' : '#ffffff'),
      border: readVar('--c-border', isDark ? '#333333' : '#e4e4e7'),
      textMain: readVar('--c-text-main', isDark ? '#ffffff' : '#0f172a'),
      textMuted: readVar('--c-text-muted', isDark ? '#d4d4d8' : '#3f3f46'),
      textDim: readVar('--c-text-dim', isDark ? '#71717a' : '#71717a'),
      isDark
    });
  }, [code, theme]);

  // Extract title for filename
  const title = useMemo(() => {
      // Try H1 first
      let match = code.match(/<h1[^>]*>(.*?)<\/h1>/i);
      if (match) return match[1].replace(/<[^>]+>/g, '').trim();
      
      // Try H2
      match = code.match(/<h2[^>]*>(.*?)<\/h2>/i);
      if (match) return match[1].replace(/<[^>]+>/g, '').trim();

      // Try Title tag
      match = code.match(/<title[^>]*>(.*?)<\/title>/i);
      if (match) return match[1].replace(/<[^>]+>/g, '').trim();

      return 'artifact';
  }, [code]);

  // Extract audio base64 for download
  const audioBase64 = useMemo(() => {
      const match = code.match(/src="data:audio\/wav;base64,([^"]+)"/);
      return match ? match[1] : null;
  }, [code]);

  // Detect Map Coordinates for QR Code
  useEffect(() => {
      // Look for Leaflet setView([lat, lng]) or similar pattern
      const match = code.match(/setView\(\s*\[\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\]/);
      if (match) {
          const lat = match[1];
          const lng = match[2];
          // Create Google Maps Universal Link
          setQrUrl(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
      } else {
          setQrUrl(null);
      }
      setIsQrVisible(false);
  }, [code]);

  // Inject Custom Styles to enforce absolute readability for the given theme
  const themedCode = useMemo(() => {
      const isPodcast = title === 'Podcast Script';
      
      // Build CSS to embed inside iframe
      const systemColorsOverride = `
        <style>
          /* Base Theme Styles */
          body, html { 
            background-color: ${themeStyles.bgApp} !important; 
            color: ${isPodcast ? '#4ade80' : themeStyles.textMain} !important; 
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
            margin: 0;
            padding: 8px; /* Extra padding for edge-to-edge readability */
            min-height: 100vh;
          }
          
          /* Forced podcast green or normal theme main color */
          h1, h2, h3, h4, h5, h6 { 
            color: ${isPodcast ? '#4ade80' : themeStyles.textMain} !important; 
            border-color: ${themeStyles.border} !important; 
          }
          
          p, li, span, div, td, th, article, section, main { 
            color: ${isPodcast ? '#4ade80' : themeStyles.textMuted} !important; 
          }
          
          strong, b { 
            color: ${isPodcast ? '#86efac' : themeStyles.textMain} !important; 
          }
          
          a { 
            color: ${isPodcast ? '#86efac' : '#3b82f6'} !important; 
            text-decoration: underline; 
          }
          
          /* Override light theme artifacts on dark elements & vice versa depending on active theme */
          ${!themeStyles.isDark ? `
            /* Remap dark tailwind background utility classes in light/olive mood to maintain high contrast */
            .bg-slate-900, .bg-slate-850, .bg-black, .bg-gray-900, .bg-neutral-900, .bg-slate-950, .bg-gray-950, .bg-\\[\\#121212\\], .bg-\\[\\#1a1a1a\\], .bg-\\[\\#1c1c1c\\], .bg-\\[\\#0c0c0c\\] {
              background-color: ${themeStyles.bgApp} !important;
              color: ${themeStyles.textMain} !important;
            }
            .bg-slate-800, .bg-gray-800, .bg-neutral-800, .bg-slate-700, .bg-gray-700 {
              background-color: ${themeStyles.bgCard} !important;
              color: ${themeStyles.textMain} !important;
              border-color: ${themeStyles.border} !important;
            }
            /* Remap high-contrast white texts to theme main text */
            .text-white, .text-slate-100, .text-slate-200, .text-slate-300, .text-gray-100, .text-gray-200, .text-gray-300, .text-zinc-100, .text-zinc-200, .text-zinc-300, .text-neutral-100, .text-neutral-200, .text-neutral-300 {
              color: ${themeStyles.textMain} !important;
            }
            .text-slate-400, .text-gray-400, .text-gray-500, .text-slate-500 {
              color: ${themeStyles.textMuted} !important;
            }
            .border-slate-800, .border-slate-700, .border-gray-800, .border-gray-700, .border-neutral-800, .border-neutral-700 {
              border-color: ${themeStyles.border} !important;
            }
          ` : `
            /* Remap light background classes in dark mode to dark background to protect eyes */
            .bg-white, .bg-slate-50, .bg-gray-50, .bg-slate-100, .bg-gray-100 {
              background-color: ${themeStyles.bgCard} !important;
              color: ${themeStyles.textMain} !important;
            }
            .text-gray-900, .text-slate-900, .text-black, .text-neutral-900 {
              color: ${themeStyles.textMain} !important;
            }
          `}
          
          /* Audio player overrides */
          div[style*="background: #1a1a1a"],
          div[style*="background-color: #1a1a1a"],
          div[style*="background: #f3f4f6"], 
          div[style*="background-color: #f3f4f6"] { 
            background-color: ${themeStyles.bgPanel} !important; 
            border-bottom: 1px solid ${themeStyles.border} !important;
            color: ${isPodcast ? '#4ade80' : themeStyles.textMain} !important;
          }
          
          ${isPodcast ? `h3[style*="color: #374151"] { color: #4ade80 !important; }` : ''}

          /* General Scrollbar Styling */
          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track { background: ${themeStyles.bgApp}; }
          ::-webkit-scrollbar-thumb { background: ${themeStyles.border}; border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: ${themeStyles.textDim}; }

          /* Leaflet Map elements */
          ${!themeStyles.isDark ? '' : `
            .leaflet-tile { filter: invert(1) hue-rotate(180deg); }
          `}
          .leaflet-container { background: ${themeStyles.bgApp} !important; }
        </style>
      `;

      let finalCode = code;
      
      // Auto-inject Tailwind CDN if missing to ensure utility classes run flawlessly
      if (!finalCode.includes('cdn.tailwindcss.com') && !finalCode.includes('tailwindcss')) {
          const tailwindCdn = '<script src="https://cdn.tailwindcss.com"></script>';
          if (finalCode.includes('</head>')) {
              finalCode = finalCode.replace('</head>', `${tailwindCdn}</head>`);
          } else if (finalCode.includes('<head>')) {
              finalCode = finalCode.replace('<head>', `<head>${tailwindCdn}`);
          } else if (finalCode.includes('<body>')) {
              finalCode = finalCode.replace('<body>', `<head>${tailwindCdn}</head><body>`);
          } else {
              finalCode = `<head>${tailwindCdn}</head>` + finalCode;
          }
      }

      // Inject custom tailwind.config object inside iframe tailwind parser to map custom variable classes
      const tailwindConfig = `
        <script>
          if (window.tailwind) {
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    app: {
                      bg: '${themeStyles.bgApp}',
                      panel: '${themeStyles.bgPanel}',
                      card: '${themeStyles.bgCard}',
                      input: '${themeStyles.bgInput}',
                      border: '${themeStyles.border}',
                      text: '${themeStyles.textMain}',
                      muted: '${themeStyles.textMuted}',
                      dim: '${themeStyles.textDim}',
                    }
                  }
                }
              }
            }
          }
        </script>
      `;

      // Prepend/Inject into the iframe head
      const totalInjected = systemColorsOverride + tailwindConfig;
      if (finalCode.includes('</head>')) {
          return finalCode.replace('</head>', `${totalInjected}</head>`);
      } else if (finalCode.includes('<body>')) {
          return finalCode.replace('<body>', `<body>${totalInjected}`);
      }
      return totalInjected + finalCode;
  }, [code, title, themeStyles]);

  const handleDownloadHtml = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsMenuOpen(false);
  };

  const handleDownloadText = () => {
    // Create a temporary DOM element to strip HTML tags safely
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = code;
    
    // Remove scripts and styles
    const scripts = tempDiv.getElementsByTagName('script');
    while(scripts.length > 0) scripts[0].parentNode?.removeChild(scripts[0]);
    const styles = tempDiv.getElementsByTagName('style');
    while(styles.length > 0) styles[0].parentNode?.removeChild(styles[0]);
    
    const text = tempDiv.innerText || tempDiv.textContent || "";
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsMenuOpen(false);
  };

  const handleDownloadAudio = () => {
      if (!audioBase64) return;
      try {
          const byteCharacters = atob(audioBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'audio/wav' });
          
          let safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          if (!safeTitle || safeTitle.trim().length === 0) safeTitle = 'wav001';
          
          const filename = safeTitle.startsWith('wav001') ? 'wav001.wav' : `${safeTitle}.wav`; 

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      } catch (e) {
          console.error("Failed to process audio for download", e);
          alert("Could not process audio data.");
      }
      setIsMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-app-bg border-l border-app-border text-app-text relative transition-colors duration-300">
      <div className="flex items-center justify-between p-3 border-b border-app-border bg-app-panel transition-colors duration-300">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-bold text-app-text truncate max-w-[150px]">{title}</span>
        </div>
        <div className="flex items-center gap-1">
            
            {/* Send To Phone Button */}
            {qrUrl && (
                <div className="relative">
                    <button 
                        onClick={() => setIsQrVisible(!isQrVisible)} 
                        className={`p-1 rounded transition-colors flex items-center gap-1 ${isQrVisible ? 'bg-green-600 text-white' : 'text-green-500 hover:text-white hover:bg-app-card'}`}
                        title="Send to Phone"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                    </button>
                    {isQrVisible && (
                        <div className="absolute top-full right-0 mt-2 bg-white p-3 rounded-xl shadow-2xl z-50 border-4 border-white flex flex-col items-center animate-fade-in w-48">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}`} alt="QR Code" className="w-full h-auto" />
                            <p className="text-[10px] text-gray-800 font-bold mt-2 text-center uppercase tracking-wider">Scan to Open Map</p>
                        </div>
                    )}
                </div>
            )}

            {onToggleFullWidth && (
              <button onClick={onToggleFullWidth} className="text-app-muted hover:text-app-text p-1 rounded hover:bg-app-card transition-colors" title={isFullWidth ? "Split View" : "Full Width"}>
                 {isFullWidth ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1z" /></svg>
                 ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 011 1v1.586l2.293-2.293a1 1 0 111.414 1.414L5.414 15H7a1 1 0 110 2H3a1 1 0 01-1-1v-4a1 1 0 011-1zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" /></svg>
                 )}
              </button>
            )}

            {onMinimize && (
                <button onClick={onMinimize} className="text-app-muted hover:text-app-text p-1 rounded hover:bg-app-card transition-colors" title="Minimize (Keep Audio Playing)">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                </button>
            )}

            <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)} 
                  className="text-app-muted hover:text-app-text p-1 rounded hover:bg-app-card transition-colors"
                  title="More Options"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                </button>
                {isMenuOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                        <div className="absolute right-0 top-full mt-1 bg-app-card border border-app-border rounded shadow-xl z-50 w-48 overflow-hidden">
                            {onSaveToMIPrOMPT && (
                                <button 
                                    onClick={() => { onSaveToMIPrOMPT(title); setIsMenuOpen(false); }} 
                                    className="flex items-center w-full text-left px-4 py-3 text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white gap-2 border-b border-app-border"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                    </svg>
                                    Save to mIPrOMPT
                                </button>
                            )}
                            {onSaveToSession && (
                                <button 
                                    onClick={() => { onSaveToSession(code, title); setIsMenuOpen(false); }} 
                                    className="flex items-center w-full text-left px-4 py-3 text-xs text-green-500 hover:bg-green-600/10 hover:text-green-400 gap-2 border-b border-app-border bg-transparent"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Save to Session
                                </button>
                            )}
                            {audioBase64 && (
                                <button onClick={handleDownloadAudio} className="flex items-center w-full text-left px-4 py-3 text-xs text-app-text hover:bg-app-panel gap-2 border-b border-app-border bg-transparent">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    Download Audio
                                </button>
                            )}
                            <button onClick={handleDownloadHtml} className="flex items-center w-full text-left px-4 py-3 text-xs text-app-text hover:bg-app-panel gap-2 border-b border-app-border bg-transparent">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                Download HTML
                            </button>
                            <button onClick={handleDownloadText} className="flex items-center w-full text-left px-4 py-3 text-xs text-app-text hover:bg-app-panel gap-2 bg-transparent">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                                Download Text
                            </button>
                        </div>
                    </>
                )}
            </div>

            <button onClick={onClose} className="text-app-muted hover:text-app-text p-1 rounded hover:bg-app-card transition-colors" title="Close">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative bg-app-bg transition-colors duration-300">
        <iframe 
          title="Artifact Preview"
          srcDoc={themedCode}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin allow-downloads"
        />
      </div>
    </div>
  );
};

export default ArtifactPreview;
