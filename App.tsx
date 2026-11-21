
import React, { useState, useEffect } from 'react';
import MediaPanel from './components/MediaPanel';
import ChatPanel from './components/ChatPanel';
import SessionModal from './components/SessionModal';
import ArtifactPreview from './components/ArtifactPreview';
import MediaViewer from './components/MediaViewer';
import MindMapViewer from './components/MindMapViewer';
import MindMapPopup from './components/MindMapPopup';
import LibraryView from './components/LibraryView';
import SettingsPanel from './components/SettingsPanel';
import StudioView from './components/StudioView';
import OfficeTools from './components/OfficeTools';
import { MediaSuiteView } from './components/MediaSuiteView';
import MIPrOMPTLibraryView from './components/MIPrOMPTLibraryView';
import { FinanceView } from './components/FinanceView';
import MaggiView from './components/MaggiView';
import SxaBoardApp from './src/media_suite/SxaBoardTool/App';
import { MediaItem, VoiceSettings, PromptTemplate, CastMember, MIPrOMPTItem } from './types';
import { useThemeEngine } from './hooks/useThemeEngine';
import { useSessionManager } from './hooks/useSessionManager';
import { useAI } from './hooks/useAI';
import { usePromptLibrary } from './hooks/usePromptLibrary';
import { useMIPrOMPTLibrary } from './hooks/useMIPrOMPTLibrary';
import { useCastLibrary } from './hooks/useCastLibrary';
import { useCharacterLibrary } from './hooks/useCharacterLibrary';
import { generateResponse, generateSpeech, searchWeb, chunkText, base64ToText, translateText } from './services/gemini'; 
import { saveAudioBlobToIDB, loadAudioBlobFromIDB } from './services/storage'; 

const App: React.FC = () => {
  const { theme, setTheme, settings, setSettings } = useThemeEngine();
  const { castLibrary, addCastMember, updateCastMember, deleteCastMember, resetLibrary } = useCastLibrary();
  const { characters, addCharacter, updateCharacter, deleteCharacter } = useCharacterLibrary();
  const { miprompts, addMIPrOMPT, updateMIPrOMPT, deleteMIPrOMPT, importCSV } = useMIPrOMPTLibrary();
  
  const { 
    sessions, 
    setSessions,
    activeSessionId, 
    setActiveSessionId, 
    activeSession, 
    createNewSession, 
    deleteSession, 
    renameSession, 
    updateSessionDescription,
    combineSessions,
    reorderSessions,
    clearSessionHistory,
    updateActiveSession,
    updateSessionById,
    handleExportSession,
    processUploadedFiles,
    addTextItem,
    handleAddLink,
    batchAddLinks,
    handleRemoveMedia,
    handleToggleMedia,
    handleToggleAllMedia,
    combineMediaItems,
    addHtmlItem,
    isStorageInitialized
  } = useSessionManager();

  // Layout State
  const [viewMode, setViewMode] = useState<'library' | 'workspace' | 'studio' | 'miprompt' | 'finance' | 'media' | 'office_tools' | 'sxa_board' | 'maggi'>('library');
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [lastUsedBuilder, setLastUsedBuilder] = useState<MIPrOMPTItem['type'] | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [focusedMediaItem, setFocusedMediaItem] = useState<MediaItem | null>(null);
  const [isMindMapOpen, setIsMindMapOpen] = useState(false);
  const [isFullWidthPreview, setIsFullWidthPreview] = useState(false);
  const [isPreviewMinimized, setIsPreviewMinimized] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'ai' | 'visual' | 'cast'>('ai');

  const toggleSettings = (tab: 'ai' | 'visual' | 'cast' = 'ai') => {
    setActiveSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  // Sidebar State
  const [activeSideTab, setActiveSideTab] = useState<'sessions' | 'sources' | 'tools' | 'audio'>('sources');

  // Drawer States
  const [isMainPanelCollapsed, setIsMainPanelCollapsed] = useState(false); 
  const [isSourcesPanelOpen, setIsSourcesPanelOpen] = useState(false); 
  
  // Tool Loading State
  const [toolLoadingState, setToolLoadingState] = useState<Record<string, boolean>>({});

  // Voice Settings State
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
      host: 'Kore',
      hostLabel: 'Narrator Bot',
      hostBio: 'A clear, authoritative, and friendly voice, perfect for hosting and guiding the listener through complex topics.',
      hostAvatar: 'https://picsum.photos/seed/narrator/60/60',
      hostMemberId: 'sys-host-1',
      expert: 'Zephyr',
      expertLabel: 'Dr. Insight',
      expertBio: 'A knowledgeable and articulate voice, ideal for explaining intricate details and offering expert opinions.',
      expertAvatar: 'https://picsum.photos/seed/expert/60/60',
      expertMemberId: 'sys-expert-1',
      guest: 'Puck',
      guestLabel: 'Curious Listener',
      guestBio: 'An engaging and inquisitive voice, representing the audience and asking clarifying questions.',
      guestAvatar: 'https://picsum.photos/seed/listener/60/60',
      guestMemberId: 'sys-guest-1',
      length: 'Short (1-2 min)',
      language: 'English'
  });

  const [selectedMIPrOMPT, setSelectedMIPrOMPT] = useState<{type: 'prB' | 'ctB' | 'txS', content: string} | null>(null);

  // MindMap Popup State
  const [mindMapPopup, setMindMapPopup] = useState<{ title: string, content: string | null, isLoading: boolean } | null>(null);

  const backgroundTemplateImage = activeSession?.mediaItems.find(item => item.type === 'image');

  // Initial Route Check
  useEffect(() => {
    if (isStorageInitialized) {
      if (sessions.length > 0) {
        setViewMode('library');
      } else {
        setViewMode('workspace');
      }
    }
  }, [isStorageInitialized]);

  // Auto-Preview Callback for Maps
  const handleAutoPreview = (code: string) => {
      setPreviewCode(code);
      setFocusedMediaItem(null);
      setIsPreviewMinimized(false);
      setIsFullWidthPreview(false);
      if (isMindMapOpen) setIsMainPanelCollapsed(true);
  };

  const {
    input,
    setInput,
    isLoading,
    isSuggestionsLoading,
    handleSend,
    triggerSuggestion,
    generateSuggestionsForSession,
    autoTagMediaItems,
    generateMindMap,
    isMindMapLoading
  } = useAI(activeSession, updateActiveSession, updateSessionById, settings, handleAutoPreview);
  
  const { prompts, addPrompt, removePrompt } = usePromptLibrary();

  const [isCastLibraryOpen, setIsCastLibraryOpen] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSessionDefaultName, setNewSessionDefaultName] = useState('Session 001');

  const handleOpenCreateSessionModal = () => {
      const nextNum = sessions.length + 1;
      const paddedNum = nextNum.toString().padStart(3, '0');
      setNewSessionDefaultName(`Session ${paddedNum}`);
      setIsModalOpen(true);
  };

  const handleCreateSession = (name: string, description?: string) => {
      createNewSession(name, description);
      setInput('');
      setPreviewCode(null);
      setFocusedMediaItem(null);
      setIsMindMapOpen(false);
      setIsModalOpen(false);
      setViewMode('workspace'); 
  };

  const handleDeleteSession = (id: string) => {
      deleteSession(id);
      if (activeSessionId === id) {
          setPreviewCode(null);
          setFocusedMediaItem(null);
          setIsMindMapOpen(false);
      }
  };

  const handleDownloadSession = () => {
      if (!activeSession) return;
      
      let txt = `Session: ${activeSession.name}\n`;
      txt += `Created: ${new Date(activeSession.createdAt).toLocaleString()}\n\n`;
      txt += `--- SOURCES (${activeSession.mediaItems.length}) ---\n`;
      activeSession.mediaItems.forEach(item => {
          txt += `\n[${item.type.toUpperCase()}] ${item.name}\n`;
          if (item.type === 'text') {
              try {
                  const decoded = new TextDecoder().decode(Uint8Array.from(atob(item.data), c => c.charCodeAt(0)));
                  txt += `${decoded}\n`;
              } catch(err){}
          } else {
              txt += `(Binary or Base64 data hidden)\n`;
          }
      });
      txt += `\n--- HISTORY ---\n`;
      activeSession.history.forEach(msg => {
          txt += `\n[${msg.role.toUpperCase()}] ${new Date(msg.timestamp).toLocaleString()}\n`;
          txt += `${msg.content}\n`;
      });
      
      const blob = new Blob([txt], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const safeName = activeSession.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `session_${safeName}_${new Date().toISOString().slice(0,10)}.txt`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleSelectSession = (id: string) => {
      setActiveSessionId(id);
      setViewMode('workspace');
  };

  const onFileUpload = async (files: File[]) => {
      const result = await processUploadedFiles(files);
      if (result) {
          generateSuggestionsForSession(result.targetId, result.combinedMedia);
          if (settings.autoTagSources && result.newItems) {
              autoTagMediaItems(result.targetId, result.newItems);
          }
          if (isMindMapOpen && activeSession) {
             updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
             setTimeout(() => generateMindMap(), 100);
          }
      }
  };

  const onAddLink = (url: string) => {
      const result = handleAddLink(url);
      if (result) {
          generateSuggestionsForSession(result.targetId, result.combinedMedia);
          if (settings.autoTagSources && result.newItems) {
              autoTagMediaItems(result.targetId, result.newItems);
          }
          if (isMindMapOpen && activeSession) {
             updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
             setTimeout(() => generateMindMap(), 100);
          }
      }
  };

  const handleAddText = (title: string, content: string) => {
      const result = addTextItem(title, content);
      if (result) {
          generateSuggestionsForSession(result.targetId, result.combinedMedia);
          if (settings.autoTagSources && result.newItems) {
              autoTagMediaItems(result.targetId, result.newItems);
          }
          if (isMindMapOpen && activeSession) {
             updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
             setTimeout(() => generateMindMap(), 100);
          }
      }
  };

  const handleSearchWeb = async (query: string) => {
      const results = await searchWeb(query);
      if (results && results.length > 0) {
          const result = batchAddLinks(results);
          if (result) {
              generateSuggestionsForSession(result.targetId, result.combinedMedia);
              if (settings.autoTagSources && result.newItems) {
                  autoTagMediaItems(result.targetId, result.newItems);
              }
              if (isMindMapOpen && activeSession) {
                  updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
                  setTimeout(() => generateMindMap(), 100);
              }
          }
      } else {
          alert("No search results found or API search limit reached.");
      }
  };

  const handleRefillSearch = async (query: string) => {
      if (!activeSession) return;
      const activeIds = activeSession.selectedMediaIds;
      const unselectedLinks = activeSession.mediaItems.filter(item => item.type === 'link' && !activeIds.includes(item.id));
      const keptLinks = activeSession.mediaItems.filter(item => item.type === 'link' && activeIds.includes(item.id));
      if (unselectedLinks.length > 0) {
          unselectedLinks.forEach(item => {
              handleRemoveMedia(item.id);
          });
      }
      const excludeUrls = keptLinks.map(item => item.data);
      const results = await searchWeb(query, excludeUrls);
      if (results && results.length > 0) {
          const result = batchAddLinks(results);
          if (result) {
              generateSuggestionsForSession(result.targetId, result.combinedMedia);
              if (settings.autoTagSources && result.newItems) {
                  autoTagMediaItems(result.targetId, result.newItems);
              }
              if (isMindMapOpen) {
                  updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
                  setTimeout(() => generateMindMap(), 100);
              }
          }
      } else {
          alert("Could not find new unique resources for this topic.");
      }
  };

  const saveGlobalHistorySafely = (history: any[]) => {
      if (!Array.isArray(history)) return;

      // 1. Asynchronously persist full audio data to IndexedDB so large WAV blobs are never lost
      history.forEach(item => {
          if (item?.id && item?.data && typeof item.data === 'string' && item.data.length > 500) {
              saveAudioBlobToIDB(item.id, item.data, item.scriptHtml).catch(() => {});
          }
      });

      // 2. Prepare lightweight history for localStorage (strip heavy base64 strings)
      // localStorage has a strict ~5MB origin quota. Large audio WAVs (1-10MB) must NOT be stored directly in localStorage.
      const sanitizeItem = (item: any, keepData = false) => ({
          ...item,
          data: keepData && item.data && typeof item.data === 'string' && item.data.length < 50000 ? item.data : undefined,
          hasAudioData: !!(item.data || item.file),
          scriptHtml: item.scriptHtml && typeof item.scriptHtml === 'string' && item.scriptHtml.length > 2000 
              ? item.scriptHtml.substring(0, 1000) + '<!-- truncated for storage -->' 
              : item.scriptHtml
      });

      // Tier 1: Try saving sanitized history (keeping only light metadata for items)
      try {
          const sanitized = history.slice(0, 30).map((item, idx) => sanitizeItem(item, idx === 0));
          localStorage.setItem('global_podcast_history', JSON.stringify(sanitized));
          window.dispatchEvent(new Event('global_podcast_history_updated'));
          return;
      } catch (e1) {
          console.warn("Storage quota exceeded in Tier 1. Stripping all audio payloads from localStorage history...");
      }

      // Tier 2: Strip ALL data and truncate scriptHtml for all items
      try {
          const minimal = history.slice(0, 15).map(item => ({
              id: item.id,
              type: item.type,
              name: item.name,
              mimeType: item.mimeType,
              hasAudioData: true,
              scriptHtml: item.scriptHtml && typeof item.scriptHtml === 'string' ? item.scriptHtml.substring(0, 300) : undefined
          }));
          localStorage.setItem('global_podcast_history', JSON.stringify(minimal));
          window.dispatchEvent(new Event('global_podcast_history_updated'));
          return;
      } catch (e2) {
          console.warn("Storage quota exceeded in Tier 2. Keeping top 5 minimal records...");
      }

      // Tier 3: Keep only top 5 lightweight metadata records
      try {
          const ultraMinimal = history.slice(0, 5).map(item => ({
              id: item.id,
              type: item.type,
              name: item.name,
              mimeType: item.mimeType,
              hasAudioData: true
          }));
          localStorage.setItem('global_podcast_history', JSON.stringify(ultraMinimal));
          window.dispatchEvent(new Event('global_podcast_history_updated'));
      } catch (e3) {
          // Tier 4: Clear older non-critical keys if completely blocked
          try {
              localStorage.removeItem('global_podcast_history');
          } catch (e4) {
              /* completely silent failover to prevent unhandled crash */
          }
      }
  };

  const onRemoveMedia = (id: string) => {
      const result = handleRemoveMedia(id);
      
      // Also remove from global history
      try {
          const savedGlobal = localStorage.getItem('global_podcast_history');
          if (savedGlobal) {
              const globalHistory = JSON.parse(savedGlobal);
              const updated = globalHistory.filter((item: any) => item.id !== id);
              saveGlobalHistorySafely(updated);
          }
      } catch (err) {
          console.error("Failed to remove from global podcast history:", err);
      }

      if (focusedMediaItem?.id === id) setFocusedMediaItem(null);

      if (result) {
          generateSuggestionsForSession(result.targetId, result.updatedMedia);
          if (isMindMapOpen && activeSession) {
             updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
             setTimeout(() => generateMindMap(), 100);
          }
      }
  };

  const handleRenameMediaItem = (id: string, newName: string) => {
    if (activeSession) {
      updateActiveSession(s => ({
        ...s,
        mediaItems: s.mediaItems.map(item =>
          item.id === id ? { ...item, name: newName } : item
        )
      }));
      // Re-generate suggestions as media item name might affect prompts/context
      generateSuggestionsForSession(activeSession.id, activeSession.mediaItems.map(item => 
          item.id === id ? { ...item, name: newName } : item
      ));
      if (isMindMapOpen && activeSession) {
          updateSessionById(activeSession.id, s => ({ ...s, mindMapData: undefined }));
          setTimeout(() => generateMindMap(), 100);
      }
    }

    // Also rename in global history
    try {
        const savedGlobal = localStorage.getItem('global_podcast_history');
        if (savedGlobal) {
            const globalHistory = JSON.parse(savedGlobal);
            const updated = globalHistory.map((item: any) => 
                item.id === id ? { ...item, name: newName } : item
            );
            saveGlobalHistorySafely(updated);
        }
    } catch (err) {
        console.error("Failed to rename in global podcast history:", err);
    }
  };

  const onToggleMedia = (id: string) => {
      const result = handleToggleMedia(id);
      if (result) {
          generateSuggestionsForSession(result.targetId, result.activeItems);
          if (isMindMapOpen && activeSession) {
             updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
             setTimeout(() => generateMindMap(), 100);
          }
      }
  };

  const onToggleAllMedia = (selectAll: boolean) => {
      const result = handleToggleAllMedia(selectAll);
      if (result) {
          generateSuggestionsForSession(result.targetId, result.activeItems);
          if (isMindMapOpen && activeSession) {
             updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
             setTimeout(() => generateMindMap(), 100);
          }
      }
  };

  const onCombineMedia = (ids: string[], name: string) => {
      const result = combineMediaItems(ids, name);
      if (result) {
          generateSuggestionsForSession(result.targetId, result.combinedMedia);
          if (settings.autoTagSources && result.newItems) {
              autoTagMediaItems(result.targetId, result.newItems);
          }
          if (isMindMapOpen && activeSession) {
             updateSessionById(result.targetId, s => ({ ...s, mindMapData: undefined }));
             setTimeout(() => generateMindMap(), 100);
          }
      }
  };

  const handleSeekMedia = (timeString: string) => {
    const parts = timeString.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    
    const performSeek = () => {
      const focusedMediaEl = document.querySelector('.active-media-viewer') as HTMLMediaElement;
      if (focusedMediaEl) {
          focusedMediaEl.currentTime = seconds;
          focusedMediaEl.play().catch(e => console.log("Autoplay blocked", e));
          return true;
      }
      const allMedia = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[];
      
      // Also check inside iframes (like ArtifactPreview)
      const iframes = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
      iframes.forEach(iframe => {
        try {
          if (iframe.contentDocument) {
            const iframeMedia = Array.from(iframe.contentDocument.querySelectorAll('video, audio')) as HTMLMediaElement[];
            allMedia.push(...iframeMedia);
          }
        } catch (e) {
          // Ignore cross-origin errors if any
        }
      });

      const playingMedia = allMedia.find(el => !el.paused && !el.ended);
      if (playingMedia) {
          playingMedia.currentTime = seconds;
          playingMedia.play().catch(e => console.log("Autoplay blocked", e));
          return true;
      }
      if (allMedia.length > 0) {
          const firstMedia = allMedia[0];
          firstMedia.currentTime = seconds;
          firstMedia.play().catch(e => console.log("Autoplay blocked", e));
          return true;
      }
      return false;
    };

    if (!performSeek()) {
      // If no media element is found, try to find a media item in the session and focus it
      const mediaItem = activeSession?.mediaItems.find(item => item.type === 'video' || item.type === 'audio');
      if (mediaItem) {
        setFocusedMediaItem(mediaItem);
        setPreviewCode(null);
        setIsPreviewMinimized(false);
        if (isMindMapOpen) setIsMainPanelCollapsed(true);
        
        // Wait for render then seek
        setTimeout(() => {
          performSeek();
        }, 100);
      }
    }
  };

  const handleFocusMedia = (item: MediaItem) => {
    if (focusedMediaItem?.id === item.id) {
      setFocusedMediaItem(null);
      setIsFullWidthPreview(false);
    } else {
      setFocusedMediaItem(item);
      setPreviewCode(null);
      setIsFullWidthPreview(false); 
    }
  };

  const handleGenerateReport = () => {
    handleSend("Please analyze the currently selected media sources and generate a comprehensive, structured report. Include an Executive Summary, Key Findings, Detailed Analysis of the content, and Conclusions.");
  };

  const handleToolAction = async (toolId: string, payload?: any) => {
     if (!activeSession && (!payload || !payload.isIndependent)) return;
     setPreviewCode(null);
     setGeneratedAudio(null);
     setIsPreviewMinimized(false);
     setToolLoadingState(prev => ({ ...prev, [toolId]: true }));
     
     if (toolId === 'prompt_builder') setLastUsedBuilder('prB');
     else if (toolId === 'content_builder') setLastUsedBuilder('ctB');
     else if (toolId === 'text_summarizer') setLastUsedBuilder('txS');
     else setLastUsedBuilder(null);
     
     let activeMediaItems: MediaItem[] = [];
     
     // Resolve independent tool sessions
     if (payload?.isIndependent && payload?.builderSessionId) {
         const targetSession = sessions.find(s => s.id === payload.builderSessionId);
         if (targetSession) {
             activeMediaItems = targetSession.mediaItems; // use all media items from the selected session or specific? Just use all if not active session since we don't have selected media IDs directly for non-active
         }
     } else if (activeSession && (!payload?.isIndependent || (payload?.isIndependent && !payload.builderSessionId && payload.includeSessionData))) {
          // fallback to active session usage
         activeMediaItems = activeSession.mediaItems.filter(item => 
             activeSession.selectedMediaIds.includes(item.id)
         );
     }
     
     if ((toolId === 'youtube_transcript' || toolId === 'text_summarizer') && payload?.mediaItem) {
         activeMediaItems = [payload.mediaItem];
     } else if (activeMediaItems.length === 0 && (!payload || !payload.isIndependent) && (!payload?.builderSessionId) && (!payload?.includeSessionData) && toolId !== 'crypto_analyst') {
         alert("Please select at least one source to generate content.");
         setToolLoadingState(prev => ({ ...prev, [toolId]: false }));
         return;
     }

     if (payload?.isIndependent && !payload?.builderSessionId && !payload?.includeSessionData) {
         activeMediaItems = []; // Ensure no session data is used unless requested
     }

     if (payload?.customInput) {
         activeMediaItems = [
             ...activeMediaItems,
             {
                 id: `custom-input-${Date.now()}`,
                 type: 'text',
                 name: 'Custom Content / Topic Input',
                 mimeType: 'text/plain',
                 data: btoa(unescape(encodeURIComponent(payload.customInput)))
             }
         ];
     }
     let prompt = "";
     let isPodcast = false;
     switch(toolId) {
         case 'text_summarizer':
             const action = payload?.action || 'summarize';
             const lang = payload?.lang || 'swedish';
             
             let instruction = '';
             if (action === 'summarize') {
                 instruction = `Provide a comprehensive summary of the provided text.`;
             } else if (action === 'translate') {
                 instruction = `Translate the provided text into ${lang}.`;
             } else if (action === 'summarize_translate') {
                 instruction = `Provide a comprehensive summary of the provided text, and translate the summary into ${lang}.`;
             }

             prompt = `Act as a professional linguist and analyst.
             
             TASK: ${instruction}
             
             Format the output as a clean, readable HTML document. Use Tailwind CSS for styling. Include clear headings and well-structured paragraphs or bullet points where appropriate.`;
             break;
         case 'youtube_transcript':
             const duration = payload?.duration || 'All';
             prompt = `Please generate a detailed transcript for the provided source.
             
             Target Duration to transcribe: ${duration} minutes.
             
             If the source is a YouTube link, use your search capabilities to find the transcript or summarize the video content in detail.
             If the source is a video or audio file, analyze the media and provide a detailed transcript.
             
             Format the output as a clean, readable HTML document with timestamps (e.g., [00:00]) and speaker labels if possible. Use Tailwind CSS for styling.`;
             break;
         case 'data_table':
             const userInstructions = payload?.instructions || "Extract all key numerical data and entities mentioned.";
             const targetLang = payload?.language || "English";
             prompt = `Act as a professional Data Architect. Your task is to extract structured information from the provided sources and present it in an analysis-ready Data Table. 

USER EXTRACTION REQUIREMENTS: "${userInstructions}"
OUTPUT LANGUAGE: "${targetLang}"

CRITICAL REQUIREMENTS:
1. Identify all relevant rows and columns based on the requirements.
2. Ensure data is normalized (consistent date formats, units, and naming).
3. If information is missing for a cell, leave it blank or use "N/A".
4. FORMAT: Return a self-contained HTML document with an interactive, responsive table styled with Tailwind CSS.
5. EXPORT FEATURE: YOU MUST include a fixed header with a button that has id="downloadBtn" and text "DOWNLOAD CSV".
6. JAVASCRIPT: YOU MUST include a <script> block with a function named "downloadCSV" that is called when the button is clicked. Use this exact logic for the CSV generation:
   function downloadCSV() {
     const table = document.querySelector('table');
     let csv = [];
     for (let i = 0; i < table.rows.length; i++) {
       let row = [], cols = table.rows[i].cells;
       for (let j = 0; j < cols.length; j++) {
         let data = cols[j].innerText.replace(/(\\r\\n|\\n|\\r)/gm, '').replace(/(\\s\\s)/gm, ' ');
         data = data.replace(/"/g, '""');
         row.push('"' + data + '"');
       }
       csv.push(row.join(','));
     }
     const csvContent = csv.join('\\n');
     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
     const link = document.createElement('a');
     const url = URL.createObjectURL(blob);
     link.setAttribute('href', url);
     link.setAttribute('download', 'extracted_data.csv');
     link.style.visibility = 'hidden';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
   }
   document.getElementById('downloadBtn').addEventListener('click', downloadCSV);

STYLE: Use a professional, modern layout. Header row should be distinct. Use zebra-striping for rows.`;
             break;
         case 'podcast_2':
             prompt = `Create a detailed script for a 2-person Podcast (${voiceSettings.hostLabel} and ${voiceSettings.expertLabel}) discussing these sources.
             
             HOST (${voiceSettings.hostLabel}): ${voiceSettings.hostBio || 'A charismatic and engaging host.'}
             EXPERT (${voiceSettings.expertLabel}): ${voiceSettings.expertBio || 'A knowledgeable subject matter expert.'}
             
             Use a conversational, engaging tone. Target Length: ${voiceSettings.length || 'Medium (3-5 min)'}. Format the output as a Markdown script. Use **${voiceSettings.hostLabel}:** and **${voiceSettings.expertLabel}:** to denote speakers.`;
             isPodcast = true;
             break;
         case 'podcast_1':
             prompt = `Create a detailed script for a Single-Host Podcast reporting on these sources.
             
             HOST (${voiceSettings.hostLabel}): ${voiceSettings.hostBio || 'A charismatic and engaging host.'}
             
             The host '${voiceSettings.hostLabel}' is reporting directly to the audience. Use an engaging, storytelling tone. Target Length: ${voiceSettings.length || 'Medium (3-5 min)'}. Format the output as a Markdown script. Use **${voiceSettings.hostLabel}:** to denote the speaker.`;
             isPodcast = true;
             break;
         case 'podcast_3':
             prompt = `Create a detailed script for a 3-person Roundtable Podcast (${voiceSettings.hostLabel}, ${voiceSettings.expertLabel}, and ${voiceSettings.guestLabel}).
             
             HOST (${voiceSettings.hostLabel}): ${voiceSettings.hostBio || 'A charismatic and engaging host.'}
             EXPERT (${voiceSettings.expertLabel}): ${voiceSettings.expertBio || 'A knowledgeable subject matter expert.'}
             GUEST (${voiceSettings.guestLabel}): ${voiceSettings.guestBio || 'A special guest with a unique perspective.'}
             
             It should be a lively, multi-perspective discussion. Target Length: ${voiceSettings.length || 'Medium (3-5 min)'}. Format the output as a Markdown script. Use **${voiceSettings.hostLabel}:**, **${voiceSettings.expertLabel}:**, and **${voiceSettings.guestLabel}:** to denote speakers.`;
             isPodcast = true;
             break;
         case 'faq':
             prompt = "Analyze the sources and generate a comprehensive FAQ (Frequently Asked Questions). Include at least 10 questions. Format the output as a stylish HTML document with an accordion-like or clear Q&A structure using <details> and <summary> tags if possible, or clear headings.";
             break;
         case 'study_guide':
             prompt = "Create a structured Study Guide based on the selected content. Include Key Terms, Core Concepts, a Summary, and a short Quiz at the end. Format as a professional HTML document with clear sections and styling.";
             break;
         case 'timeline':
             prompt = "Extract all key dates and events from the sources and construct a chronological Timeline. Format this as a vertical HTML timeline with stylish CSS.";
             break;
         case 'briefing':
             prompt = "Write a formal Executive Briefing Document summarizing the key information, risks, opportunities, and strategic insights. Format as a professional HTML document.";
             break;
         case 'social_generator':
             prompt = `Act as a world-class Social Media Strategist. Based on the provided sources, generate a comprehensive Social Media Suite.
             
             OUTPUT REQUIREMENTS:
             1. **LinkedIn Post**: Professional, thought-leadership style, includes 3-5 relevant hashtags.
             2. **X (Twitter) Thread**: 5-7 engaging tweets that summarize key points and encourage discussion.
             3. **Instagram Caption**: Visual-first storytelling, punchy, includes emojis and hashtags.
             
             FORMAT: Return a clean, beautifully styled HTML document using Tailwind CSS. Use distinct sections for each platform.`;
             break;
         case 'quiz_creator':
             prompt = `Act as an Instructional Designer. Create an interactive Assessment based on the provided sources.
             
             OUTPUT REQUIREMENTS:
             1. **5 Multiple Choice Questions**: With clear explanations for the correct answers.
             2. **5 Flashcards**: Term on front, definition/context on back.
             3. **1 Short Essay Prompt**: For deep reflection.
             
             FORMAT: Return a self-contained HTML document. Use Tailwind CSS to make it look like a modern learning interface.`;
             break;
         case 'crypto_analyst': {
             const targetCrypto = payload?.crypto || 'XRP';
             prompt = `Act as an expert cryptocurrency day-trading assistant and technical analyst. Provide a highly granular, intraday technical analysis and scalp-trading blueprint for ${targetCrypto} based on the 4-hour (4H) chart frame. Use a professional, scannable, and practical tone. All monetary values and calculations must be expressed in Swedish Krona (SEK).

SYSTEM INSTRUCTION: You MUST use Google Search to find the CURRENT LIVE DATA for:
- Current ${targetCrypto} Price in SEK (or calculate from USD using current exchange rate)
- Current USD/SEK Exchange Rate
- Recent 4H technical indicators for ${targetCrypto}

Use a Target Scalp Profit goal of 756 SEK for the calculations.

Structure your dashboard with:
1. **📉 Technical Blueprint:** Entry/Exit levels.
2. **📈 Capital Requirements Matrix (in SEK):**
| Target Price Move | ${targetCrypto} Tokens Needed | Total Position Value | Spot (1x Leverage) | 5x Leverage Margin | 10x Leverage Margin | 20x Leverage Margin |

IMPORTANT: Format the entire response as a professional, dark-themed HTML dashboard. Include a <title>Crypto Day-Trading Analysis</title> tag. Use Tailwind CSS for a modern "Trading Terminal" look with emerald and rose accents.
Return ONLY the HTML code. Do not include any Markdown formatting like \`\`\`html.`;
             break;
         }
         case 'exec_briefing':
             prompt = `Act as a Chief of Staff. Prepare a high-level Executive Briefing based on the provided sources.
             
             OUTPUT REQUIREMENTS:
             1. **Executive Summary**: 3 sentences maximum.
             2. **Key Strategic Insights**: 3-5 bullet points.
             3. **Critical Risks & Opportunities**: A balanced view.
             4. **Recommended Next Steps**: Clear, actionable items.
             
             FORMAT: Return a professional, "one-pager" style HTML document. Use a clean, corporate aesthetic with Tailwind CSS.`;
             break;
         case 'brainstormer':
             prompt = `Act as a Creative Director and Futurist. Your task is to generate 10 "Wild Ideas" or unconventional perspectives based on the provided sources.
             
             OUTPUT REQUIREMENTS:
             - Push the boundaries of the current topic.
             - Think about "What if?" scenarios.
             - Connect the topic to unrelated industries or future technologies.
             
             FORMAT: Return a vibrant, energetic HTML document using Tailwind CSS. Use a bento-grid style layout for the ideas.`;
             break;
         case 'email_drafter':
             prompt = `Act as a Communications Expert. Draft 3 different email versions based on the provided sources:
             1. **Professional**: Formal and direct.
             2. **Persuasive**: Focused on a specific call to action or "sell".
             3. **Casual/Internal**: Friendly and conversational.
             
             FORMAT: Return a clean HTML document with Tailwind CSS. Use clear labels for each version and include subject lines.`;
             break;
         case 'marketing_copy':
             prompt = `Act as a Direct Response Copywriter. Generate high-converting marketing copy based on the provided sources.
             
             OUTPUT REQUIREMENTS:
             1. **3 Catchy Headlines**: Using different psychological triggers.
             2. **AIDA Framework Copy**: Attention, Interest, Desire, Action.
             3. **Short Ad Copy**: For Google or Meta ads.
             
             FORMAT: Return a professional HTML document with Tailwind CSS. Use bold typography for headlines.`;
             break;
         case 'swot_analysis':
             prompt = `Act as a Strategic Consultant. Perform a detailed SWOT Analysis based on the provided sources.
             
             OUTPUT REQUIREMENTS:
             - **Strengths**: Internal positive attributes.
             - **Weaknesses**: Internal negative attributes.
             - **Opportunities**: External positive factors.
             - **Threats**: External negative factors.
             
             FORMAT: Return a clean HTML document with a 2x2 grid layout using Tailwind CSS. Use distinct colors for each quadrant.`;
             break;
         case 'code_explainer':
             prompt = `Act as a Senior Software Engineer. Explain the provided code or technical concepts in simple, plain English.
             
             OUTPUT REQUIREMENTS:
             1. **High-Level Overview**: What does this do?
             2. **Step-by-Step Breakdown**: Explain the logic.
             3. **Key Concepts**: Define any technical terms used.
             
             FORMAT: Return a clean HTML document with Tailwind CSS. Use code blocks for any code references.`;
             break;
         case 'ebook_generator':
             prompt = `Act as an expert Author and Editor. Based on the selected sources, generate a detailed structural outline for an E-Book, and then draft the first full chapter. Format the output as a professional, deeply-styled HTML document with a cover page layout, Table of Contents, and Chapter 1 content. Use beautiful, modern typography via Tailwind CSS.`;
             break;
         case 'image_generator':
             prompt = `Act as an expert AI Prompt Engineer. Based on the selected sources, generate 5 highly detailed, creative, and evocative prompts that could be used in Midjourney or DALL-E to generate images representing the core concepts. Describe the lighting, camera angle, style, and mood for each. Format as a beautifully styled HTML grid interface.`;
             break;
         case 'spreadsheet_creator':
             prompt = `Act as a Data Analyst. Based on the sources, create a structured spreadsheet layout (columns and rows) containing the key qualitative and quantitative data. Provide it as a beautifully styled HTML table, and suggest 3 Excel/Google Sheets formulas that would be useful for this dataset.`;
             break;
         case 'video_script_writer':
             prompt = `Act as a professional Video Producer. Create a detailed A/V (Audio/Visual) Script based on the provided sources. Include timestamps, specific visual directions, B-roll suggestions, and full narration/voiceover text. Format as a professional split-column HTML script using Tailwind CSS suitable for production.`;
             break;
         case 'website_builder':
             prompt = `Act as a UX/UI Designer and Front-End Developer. Based on the source material, design the layout and write the copy for a high-converting landing page. Output a complete, self-contained HTML document using Tailwind CSS. Include a Hero section, Features/Benefits, and a Call-to-Action. Do not include external dependencies other than Tailwind.`;
             break;
         case 'prompt_builder': {
             const additionalParams = [
                 payload?.productType ? `- Product Type: ${payload.productType}` : '',
                 payload?.niche ? `- Niche/Topic: ${payload.niche}` : '',
                 payload?.skillLevel ? `- Skill Level: ${payload.skillLevel}` : '',
                 payload?.primaryGoal ? `- Primary Goal: ${payload.primaryGoal}` : '',
                 payload?.sellingPlatform ? `- Selling Platform: ${payload.sellingPlatform}` : '',
                 payload?.colorScheme ? `- Color Scheme: ${payload.colorScheme}` : '',
                 payload?.promotionStrategy ? `- Promotion Strategy: ${payload.promotionStrategy}` : ''
             ].filter(Boolean).join('\n');
             const paramsText = additionalParams ? `\n\nADVANCED CONFIGURATION OPTIONS:\n${additionalParams}\n` : '';

             prompt = `Act as an AI Specialist. Analyze the provided ${payload?.isIndependent && !payload?.builderSessionId && !payload?.includeSessionData ? 'topic/instructions' : 'sources'} and create 3 advanced, highly-detailed "System Prompts" or custom instructions that a user could feed into an LLM to interact with this specific knowledge domain. Format output as a stylish HTML document with copyable code blocks and explanations.
             
${payload?.instruction ? `\nUSER SPECIFIC INSTRUCTIONS:\n${payload.instruction}\n` : ''}${paramsText}`;
             break;
         }
         case 'content_builder': {
             const additionalParams = [
                 payload?.productType ? `- Product Type: ${payload.productType}` : '',
                 payload?.niche ? `- Niche/Topic: ${payload.niche}` : '',
                 payload?.skillLevel ? `- Skill Level: ${payload.skillLevel}` : '',
                 payload?.primaryGoal ? `- Primary Goal: ${payload.primaryGoal}` : '',
                 payload?.sellingPlatform ? `- Selling Platform: ${payload.sellingPlatform}` : '',
                 payload?.colorScheme ? `- Color Scheme: ${payload.colorScheme}` : '',
                 payload?.promotionStrategy ? `- Promotion Strategy: ${payload.promotionStrategy}` : ''
             ].filter(Boolean).join('\n');
             const paramsText = additionalParams ? `\n\nADVANCED CONFIGURATION OPTIONS:\n${additionalParams}\n` : '';

             prompt = `Act as an expert Full-Stack Developer and Web Designer. Create a comprehensive, fully functional website code based on the ${payload?.isIndependent && !payload?.builderSessionId && !payload?.includeSessionData ? 'topic/instructions' : 'sources'}. The website MUST feature a top navigation bar with exactly 5 page buttons (Home, About, Services/Products, Content/Gallery, Contact) that use JavaScript to switch between 5 distinct, beautifully styled page views within the single HTML file. Build and launch this with extremely stylish, modern styling using Tailwind CSS. Include a hero section and rich content. Output a complete, self-contained HTML document starting with <!DOCTYPE html>.
             
${payload?.instruction ? `\nUSER SPECIFIC INSTRUCTIONS:\n${payload.instruction}\n` : ''}${paramsText}`;
             break;
         }
         default:
             prompt = "Analyze the content.";
     }
     if (isPodcast) {
         prompt += `\n\nLANGUAGE: ${voiceSettings.language || 'English'}\n\nIMPORTANT: Return ONLY the raw Markdown content. Do not include \`\`\`markdown wrappers.`;
     } else {
         prompt += " IMPORTANT: Return ONLY the raw HTML code starting with <!DOCTYPE html>. Ensure it is self-contained with internal CSS.";
     }
     try {
        const model = settings.model || 'gemini-3.8-flash';
        const cacheName = (toolId === 'youtube_transcript' || toolId === 'text_summarizer') ? undefined : activeSession.geminiCacheName;
        
        let code = "";
        
        // Special handling for Text Summarizer & Translator to handle large documents via chunking
        if (toolId === 'text_summarizer') {
            const action = payload?.action || 'summarize';
            const lang = payload?.lang || 'swedish';
            
            if (action === 'translate' || action === 'summarize_translate') {
                // Extract full text for translation
                let fullText = "";
                for (const item of activeMediaItems) {
                    if (item.type === 'text' || item.type === 'document' || item.type === 'sql') {
                        fullText += (fullText ? '\n\n' : '') + base64ToText(item.data);
                    }
                }
                
                if (action === 'summarize_translate') {
                    // 1. Summarize the whole document first (Gemini 1.5 Flash handles 1M tokens)
                    const summaryPrompt = `Provide a comprehensive summary of the provided text. Return ONLY the summary content.`;
                    const summaryResult = await generateResponse(summaryPrompt, [], activeMediaItems, model, cacheName);
                    // 2. Translate the summary (usually small enough for one go, but translateText handles chunks anyway)
                    code = await translateText(summaryResult.text, lang, model);
                } else {
                    // Just translate the whole document in chunks
                    code = await translateText(fullText, lang, model);
                }
                
                // Wrap the translated result in the expected HTML format
                code = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Translation Result</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 2rem; }
        .content-container { max-width: 800px; margin: 0 auto; background: rgba(30, 41, 59, 0.5); padding: 2rem; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.1); }
        h1 { color: #fff; font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem; }
        p { margin-bottom: 1rem; line-height: 1.7; }
    </style>
</head>
<body>
    <div class="content-container">
        <h1>${action === 'summarize_translate' ? 'Summary & Translation' : 'Translation'} (${lang})</h1>
        <div class="prose prose-invert max-w-none">
            ${code.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br>').join('')}
        </div>
    </div>
</body>
</html>`;
            } else {
                // Default summarization (one-shot)
                const result = await generateResponse(prompt, [], activeMediaItems, model, cacheName);
                code = result.text;
            }
        } else {
            const result = await generateResponse(prompt, [], activeMediaItems, model, cacheName, toolId === 'crypto_analyst');
            code = result.text;
        }
        if (isPodcast) {
            code = code.replace(/^```markdown\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
            const rawText = code.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            const speechText = rawText.substring(0, 4000); 
            let speakers = 1;
            if (toolId === 'podcast_2') speakers = 2;
            if (toolId === 'podcast_3') speakers = 3;
            const audioBase64 = await generateSpeech(speechText, speakers, voiceSettings);
            if (audioBase64) {
                setGeneratedAudio(audioBase64);
            }
            
            // Format the script with color-coded blocks
            const lines = code.split('\n');
            let htmlOutput = '<div style="max-width: 800px; margin: 0 auto;">';
            
            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;
                
                let style = 'padding: 16px; margin-bottom: 16px; border-radius: 12px; color: #e2e8f0; line-height: 1.6; font-size: 16px;';
                
                // Check for speakers
                if (trimmed.includes(`**${voiceSettings.hostLabel}:**`) || trimmed.startsWith(`**Host:**`)) {
                    style += ` background-color: rgba(168, 85, 247, 0.1); border-left: 4px solid #a855f7; box-shadow: 0 2px 10px rgba(168, 85, 247, 0.05);`;
                } else if (trimmed.includes(`**${voiceSettings.expertLabel}:**`) || trimmed.startsWith(`**Expert:**`)) {
                    style += ` background-color: rgba(6, 182, 212, 0.1); border-left: 4px solid #06b6d4; box-shadow: 0 2px 10px rgba(6, 182, 212, 0.05);`;
                } else if (trimmed.includes(`**${voiceSettings.guestLabel}:**`) || trimmed.startsWith(`**Guest:**`)) {
                    style += ` background-color: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; box-shadow: 0 2px 10px rgba(245, 158, 11, 0.05);`;
                } else {
                    // Narrative or other text
                    style += ` background-color: rgba(30, 41, 59, 0.5); border-left: 4px solid #475569;`;
                }
                
                // Convert markdown bold to html bold
                const content = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff; font-weight: 700;">$1</strong>');
                htmlOutput += `<div style="${style}">${content}</div>`;
            });
            htmlOutput += '</div>';

            let audioPlayerHtml = '';
            if (audioBase64) {
                audioPlayerHtml = `
                <div style="background: #1a1a1a; padding: 20px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #333; position: sticky; top: 0; z-index: 100; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <h3 style="color: #fff; margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Audio Overview</h3>
                    <audio controls style="width: 100%;" src="data:audio/wav;base64,${audioBase64}"></audio>
                </div>`;
            }

            code = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Podcast Script</title><style>body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px 20px; background-color: #0f172a; color: #e2e8f0; } ::selection { background: rgba(168, 85, 247, 0.3); }</style></head><body>${audioPlayerHtml}${htmlOutput}</body></html>`;
            
            // Auto save generations to a history library for later retrieval, use, edit/delete
            if (audioBase64) {
                let formatLabel = "Report Podcast";
                if (toolId === 'podcast_2') formatLabel = "Dialogue Podcast";
                if (toolId === 'podcast_3') formatLabel = "Roundtable Podcast";
                if (toolId === 'podcast_creator') formatLabel = "Interactive Podcast";
                
                const timestamp = new Date().toLocaleString();
                const filename = `${formatLabel} - ${timestamp}`;
                
                const newMediaItem: MediaItem = {
                    id: `audio-${Date.now()}`,
                    type: 'audio',
                    name: filename,
                    mimeType: 'audio/wav',
                    data: audioBase64,
                    scriptHtml: code
                };

                if (activeSession) {
                    updateActiveSession(s => ({
                        ...s,
                        mediaItems: [newMediaItem, ...s.mediaItems],
                        selectedMediaIds: [...s.selectedMediaIds, newMediaItem.id]
                    }));
                }

                // Always save to global history library
                try {
                    const savedGlobal = localStorage.getItem('global_podcast_history');
                    let globalHistory = savedGlobal ? JSON.parse(savedGlobal) : [];
                    globalHistory = [newMediaItem, ...globalHistory];
                    saveGlobalHistorySafely(globalHistory);
                } catch (err) {
                    console.error("Failed to auto-save to global podcast history:", err);
                }
            }
            
            setIsFullWidthPreview(true); 
        } else {
             // Robust code cleaning for Markdown artifacts
             code = code.replace(/```[hH][tT][mM][lL]\s?([\s\S]*?)```/g, '$1')
                        .replace(/```\s?([\s\S]*?)```/g, '$1')
                        .trim();
             
             setIsFullWidthPreview(toolId === 'crypto_analyst' || toolId === 'content_builder'); 
        }
        setPreviewCode(code);
        setFocusedMediaItem(null); 
        setIsPreviewMinimized(false); 
        if (isMindMapOpen) setIsMainPanelCollapsed(true);
     } catch (e: any) {
         console.error("Tool generation failed", e);
         const msg = e.message || String(e);
         if (msg.includes('Quota') || msg.includes('429')) {
             alert("API Quota Reached. We have tried retrying, but the limit is still active. Please wait 60 seconds before trying again.");
         } else {
             alert("Failed to generate content. " + (msg.length < 100 ? msg : "Check console for details."));
         }
     } finally {
         setToolLoadingState(prev => ({ ...prev, [toolId]: false }));
     }
  };

  const handleOpenAudio = () => {
      setActiveSideTab('audio');
      if (isMindMapOpen && isMainPanelCollapsed) {
          setIsMainPanelCollapsed(false);
      }
  };

  const handleSaveAsSource = (content: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const title = `AI Answer ${timestamp}`;
    const result = addTextItem(title, content);
    if (result) {
      generateSuggestionsForSession(result.targetId, result.combinedMedia);
      if (settings.autoTagSources && result.newItems) {
          autoTagMediaItems(result.targetId, result.newItems);
      }
    }
  };

  const handleSaveArtifactToSession = (code: string, title: string) => {
    const result = addHtmlItem(title, code);
    if (result) {
      generateSuggestionsForSession(result.targetId, result.combinedMedia);
      if (settings.autoTagSources && result.newItems) {
          autoTagMediaItems(result.targetId, result.newItems);
      }
      alert(`"${title}" saved to session sources!`);
    }
  };

  const handleToggleMindMap = async () => {
      if (!isMindMapOpen) {
          setIsMindMapOpen(true);
          setIsMainPanelCollapsed(true); 
          setIsSourcesPanelOpen(false);  
          setFocusedMediaItem(null);
          setPreviewCode(null);
          if (!activeSession?.mindMapData) {
              await generateMindMap();
          }
      } else {
          setIsMindMapOpen(false);
          setIsMainPanelCollapsed(false);
          setIsSourcesPanelOpen(false);
      }
  };

  const handleRefreshMindMap = () => {
    if (!activeSession) return;
    updateActiveSession(s => ({ ...s, mindMapData: undefined }));
    setTimeout(() => generateMindMap(), 100);
  };

  const handleMindMapNodeDoubleClick = async (label: string) => {
      setIsMainPanelCollapsed(true);
      setMindMapPopup({ title: label, content: null, isLoading: true });
      try {
          const activeMediaItems = activeSession?.mediaItems.filter(item => 
              activeSession.selectedMediaIds.includes(item.id)
          ) || [];
          const prompt = `Tell me more about "${label}" and its context based on the sources. Provide a detailed summary and analysis.`;
          const model = settings.model || 'gemini-3.8-flash';
          const result = await generateResponse(prompt, [], activeMediaItems, model, activeSession?.geminiCacheName);
          setMindMapPopup({ title: label, content: result.text, isLoading: false });
      } catch (e) {
          console.error("MindMap node detail failed", e);
          setMindMapPopup({ title: label, content: "Failed to generate details. Please check API connection.", isLoading: false });
      }
  };

  if (!isStorageInitialized) {
      return <div className="bg-app-bg h-screen text-app-text p-10 flex items-center justify-center">Loading Library...</div>;
  }

  const handleSaveAudio = async (audioData: string, filename: string) => {
      // Add to session media items
      const newMediaItem: MediaItem = {
          id: `audio-${Date.now()}`,
          type: 'audio',
          name: `${filename}.wav`,
          mimeType: 'audio/wav',
          data: audioData
      };

      if (activeSession) {
          const updatedSessions = sessions.map(s => {
              if (s.id === activeSession.id) {
                  return {
                      ...s,
                      mediaItems: [...s.mediaItems, newMediaItem],
                      selectedMediaIds: [...s.selectedMediaIds, newMediaItem.id]
                  };
              }
              return s;
          });

          setSessions(updatedSessions);
          setActiveSessionId(activeSession.id);
      }

      // Save to global history
      try {
          const savedGlobal = localStorage.getItem('global_podcast_history');
          let globalHistory = savedGlobal ? JSON.parse(savedGlobal) : [];
          globalHistory = [newMediaItem, ...globalHistory];
          saveGlobalHistorySafely(globalHistory);
      } catch (err) {
          console.error("Failed to save to global podcast history:", err);
      }

      alert("Audio added to history library!");
  };

  const handleLoadAudio = async (item: MediaItem) => {
      if (item.type !== 'audio') return;
      
      let audioData = item.data;
      let scriptCode = item.scriptHtml;

      // If data is stripped from lightweight history in localStorage, recover it
      if (!audioData) {
          const foundInSession = activeSession?.mediaItems.find(m => m.id === item.id) 
              || sessions.flatMap(s => s.mediaItems).find(m => m.id === item.id);
          if (foundInSession?.data) {
              audioData = foundInSession.data;
              if (!scriptCode && foundInSession.scriptHtml) {
                  scriptCode = foundInSession.scriptHtml;
              }
          } else {
              const cachedBlob = await loadAudioBlobFromIDB(item.id);
              if (cachedBlob?.data) {
                  audioData = cachedBlob.data;
                  if (!scriptCode && cachedBlob.scriptHtml) {
                      scriptCode = cachedBlob.scriptHtml;
                  }
              }
          }
      }

      setPreviewCode(scriptCode || '<!-- Audio Only Mode -->');
      
      if (audioData) {
          setGeneratedAudio(audioData);
      } else if ((item as any).file) {
          const file = (item as any).file as File;
          const reader = new FileReader();
          reader.onload = (e) => {
              const result = e.target?.result as string;
              const base64 = result.split(',')[1];
              setGeneratedAudio(base64);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleRegenerate = async (newScript: string) => {
      setToolLoadingState(prev => ({ ...prev, 'regenerate': true }));
      setGeneratedAudio(null);
      try {
          // 1. Generate Audio
          let speakers = 1;
          if (newScript.includes('Expert:') || newScript.includes(`${voiceSettings.expertLabel}:`)) speakers = 2;
          if (newScript.includes('Guest:') || newScript.includes(`${voiceSettings.guestLabel}:`)) speakers = 3;
          
          const speechText = newScript.substring(0, 4000); 
          const audioBase64 = await generateSpeech(speechText, speakers, voiceSettings);
          if (audioBase64) {
              setGeneratedAudio(audioBase64);
          }

          // 2. Update Preview Code (HTML)
          const lines = newScript.split('\n');
          let htmlOutput = '<div style="max-width: 800px; margin: 0 auto;">';
          lines.forEach(line => {
              const trimmed = line.trim();
              if (!trimmed) return;
              let style = 'padding: 16px; margin-bottom: 16px; border-radius: 12px; color: #e2e8f0; line-height: 1.6; font-size: 16px;';
              
              if (trimmed.includes(`**${voiceSettings.hostLabel}:**`) || trimmed.startsWith(`**Host:**`) || trimmed.startsWith(`${voiceSettings.hostLabel}:`) || trimmed.startsWith(`Host:`)) {
                  style += ` background-color: rgba(168, 85, 247, 0.1); border-left: 4px solid #a855f7; box-shadow: 0 2px 10px rgba(168, 85, 247, 0.05);`;
              } else if (trimmed.includes(`**${voiceSettings.expertLabel}:**`) || trimmed.startsWith(`**Expert:**`) || trimmed.startsWith(`${voiceSettings.expertLabel}:`) || trimmed.startsWith(`Expert:`)) {
                  style += ` background-color: rgba(6, 182, 212, 0.1); border-left: 4px solid #06b6d4; box-shadow: 0 2px 10px rgba(6, 182, 212, 0.05);`;
              } else if (trimmed.includes(`**${voiceSettings.guestLabel}:**`) || trimmed.startsWith(`**Guest:**`) || trimmed.startsWith(`${voiceSettings.guestLabel}:`) || trimmed.startsWith(`Guest:`)) {
                  style += ` background-color: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; box-shadow: 0 2px 10px rgba(245, 158, 11, 0.05);`;
              } else {
                  style += ` background-color: rgba(30, 41, 59, 0.5); border-left: 4px solid #475569;`;
              }
              
              const content = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff; font-weight: 700;">$1</strong>');
              htmlOutput += `<div style="${style}">${content}</div>`;
          });
          htmlOutput += '</div>';
          
          let audioPlayerHtml = '';
          if (audioBase64) {
              audioPlayerHtml = `
              <div style="background: #1a1a1a; padding: 20px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #333; position: sticky; top: 0; z-index: 100; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                  <h3 style="color: #fff; margin-top: 0; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Audio Overview</h3>
                  <audio controls style="width: 100%;" src="data:audio/wav;base64,${audioBase64}"></audio>
              </div>`;
          }
          
          const code = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Podcast Script</title><style>body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px 20px; background-color: #0f172a; color: #e2e8f0; } ::selection { background: rgba(168, 85, 247, 0.3); }</style></head><body>${audioPlayerHtml}${htmlOutput}</body></html>`;
          setPreviewCode(code);

      } catch (e) {
          console.error("Regeneration failed", e);
          alert("Failed to regenerate audio.");
      } finally {
          setToolLoadingState(prev => ({ ...prev, 'regenerate': false }));
      }
  };

  if (viewMode === 'media') {
      return (
          <div className="h-full w-full relative" data-theme={theme}>
              <MediaSuiteView 
                  onBack={() => setViewMode('library')} 
                  session={activeSession}
                  sessions={sessions}
                  onSaveArtifact={(item) => {
                      if (activeSession) {
                          updateActiveSession(s => ({
                              ...s,
                              mediaItems: [item, ...s.mediaItems],
                              selectedMediaIds: [...s.selectedMediaIds, item.id]
                          }));
                          const sourceTypeName = item.type === 'pdf' ? 'PDF source' : 'text source';
                          alert(`"${item.name}" saved as a ${sourceTypeName} in the active workspace!`);
                      }
                  }}
                  onRunTool={handleToolAction}
                  miprompts={miprompts}
                  onAddMIPrOMPT={addMIPrOMPT}
                  onUpdateMIPrOMPT={updateMIPrOMPT}
                  onDeleteMIPrOMPT={deleteMIPrOMPT}
                  onImportCSV={importCSV}
                  currentTheme={theme}
                  isLoading={Object.values(toolLoadingState).some(Boolean)}
              />
          </div>
      );
  }

  if (viewMode === 'studio') {
      return (
          <div className="h-full w-full relative" data-theme={theme}>
              <StudioView 
                  onBack={() => setViewMode('library')}
                  voiceSettings={voiceSettings}
                  onUpdateVoiceSettings={setVoiceSettings}
                  onRunTool={handleToolAction}
                  isLoading={Object.values(toolLoadingState).some(Boolean)}
                  hasActiveSession={!!activeSession}
                  session={activeSession}
                  sessions={sessions}
                  previewCode={previewCode}
                  onClosePreview={() => setPreviewCode(null)}
                  generatedAudio={generatedAudio}
                  onSaveAudio={handleSaveAudio}
                  onLoadAudio={handleLoadAudio}
                  onRemoveMediaItem={handleRemoveMedia}
                  onRenameMediaItem={handleRenameMediaItem}
                  onRegenerate={handleRegenerate}
                  prompts={prompts}
                  onAddPrompt={addPrompt}
                  onDeletePrompt={removePrompt}
                  castLibrary={castLibrary}
                  onAddCastMember={addCastMember}
                  onUpdateCastMember={updateCastMember}
                  onDeleteCastMember={deleteCastMember}
                  isCastLibraryOpen={isCastLibraryOpen}
                  setIsCastLibraryOpen={setIsCastLibraryOpen}
                                                      miprompts={miprompts}
                  onAddMIPrOMPT={addMIPrOMPT}
                  onUpdateMIPrOMPT={updateMIPrOMPT}
                  onDeleteMIPrOMPT={deleteMIPrOMPT}
                  initialBuilderData={selectedMIPrOMPT}
                  onClearInitialBuilderData={() => setSelectedMIPrOMPT(null)}
                  onSaveArtifact={(item) => {
                      if (activeSession) {
                          updateActiveSession(s => ({
                              ...s,
                              mediaItems: [item, ...s.mediaItems],
                              selectedMediaIds: [...s.selectedMediaIds, item.id]
                          }));
                          alert(`"${item.name}" saved as a text source in the active workspace!`);
                      }
                  }}
              />
              <SettingsPanel 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentTheme={theme}
                onSetTheme={setTheme}
                settings={settings}
                onUpdateSettings={setSettings}
                initialTab={activeSettingsTab}
                voiceSettings={voiceSettings}
                onUpdateVoiceSettings={setVoiceSettings}
                castLibrary={castLibrary}
                onAddCastMember={addCastMember}
                onUpdateCastMember={updateCastMember}
                onDeleteCastMember={deleteCastMember}
                onResetLibrary={resetLibrary}
              />
          </div>
      );
  }

  if (viewMode === 'office_tools') {
      return (
          <div className="h-full w-full relative" data-theme={theme}>
              <OfficeTools 
                  onBack={() => setViewMode('library')}
                  voiceSettings={voiceSettings}
                  onUpdateVoiceSettings={setVoiceSettings}
                  onRunTool={handleToolAction}
                  isLoading={Object.values(toolLoadingState).some(Boolean)}
                  hasActiveSession={!!activeSession}
                  session={activeSession}
                  sessions={sessions}
                  previewCode={previewCode}
                  onClosePreview={() => setPreviewCode(null)}
                  generatedAudio={generatedAudio}
                  onSaveAudio={handleSaveAudio}
                  onLoadAudio={handleLoadAudio}
                  onRemoveMediaItem={handleRemoveMedia}
                  onRenameMediaItem={handleRenameMediaItem}
                  onRegenerate={handleRegenerate}
                  prompts={prompts}
                  onAddPrompt={addPrompt}
                  onDeletePrompt={removePrompt}
                  castLibrary={castLibrary}
                  onAddCastMember={addCastMember}
                  onUpdateCastMember={updateCastMember}
                  onDeleteCastMember={deleteCastMember}
                  isCastLibraryOpen={isCastLibraryOpen}
                  setIsCastLibraryOpen={setIsCastLibraryOpen}
                  miprompts={miprompts}
                  onAddMIPrOMPT={addMIPrOMPT}
                  onUpdateMIPrOMPT={updateMIPrOMPT}
                  onDeleteMIPrOMPT={deleteMIPrOMPT}
                  initialBuilderData={selectedMIPrOMPT}
                  onClearInitialBuilderData={() => setSelectedMIPrOMPT(null)}
                  onSaveArtifact={(item) => {
                      if (activeSession) {
                          updateActiveSession(s => ({
                              ...s,
                              mediaItems: [item, ...s.mediaItems],
                              selectedMediaIds: [...s.selectedMediaIds, item.id]
                          }));
                          alert(`"${item.name}" saved as a text source in the active workspace!`);
                      }
                  }}
              />
              <SettingsPanel 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentTheme={theme}
                onSetTheme={setTheme}
                settings={settings}
                onUpdateSettings={setSettings}
                initialTab={activeSettingsTab}
                voiceSettings={voiceSettings}
                onUpdateVoiceSettings={setVoiceSettings}
                castLibrary={castLibrary}
                onAddCastMember={addCastMember}
                onUpdateCastMember={updateCastMember}
                onDeleteCastMember={deleteCastMember}
                onResetLibrary={resetLibrary}
              />
          </div>
      );
  }

  if (viewMode === 'miprompt') {
      return (
          <div className="h-full w-full relative" data-theme={theme}>
              <MIPrOMPTLibraryView
                  miprompts={miprompts}
                  onAdd={addMIPrOMPT}
                  onUpdate={updateMIPrOMPT}
                  onDelete={deleteMIPrOMPT}
                  onImport={importCSV}
                  onSelectPrompt={(item) => {
                      setSelectedMIPrOMPT({ type: item.type, content: item.content });
                      setViewMode('studio');
                  }}
              />
              <button 
                  onClick={() => setViewMode('library')}
                  className="absolute top-8 left-8 p-3 bg-app-panel text-app-text rounded-full shadow-lg hover:bg-app-card border border-app-border z-50 transition-transform hover:scale-105"
                  title="Back to Library"
              >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
              </button>
          </div>
      );
  }

  if (viewMode === 'maggi') {
      return (
          <div className="h-full w-full relative" data-theme={theme}>
              <MaggiView
                  onBack={() => setViewMode('library')}
                  workspaceName={activeSession?.name}
                  workspaceItems={(activeSession?.mediaItems ?? []).map((m) => ({
                      id: m.id,
                      name: m.name,
                      type: m.type,
                      mimeType: m.mimeType,
                      data: m.data,
                  }))}
              />
          </div>
      );
  }

  if (viewMode === 'finance') {
      return (
          <FinanceView onBack={() => setViewMode('library')} />
      );
  }

  if (viewMode === 'sxa_board') {
      return (
          <SxaBoardApp 
              onBack={() => setViewMode('library')} 
              activeSession={activeSession}
              onSaveArtifact={(item) => {
                  if (activeSession) {
                      updateActiveSession(s => ({
                          ...s,
                          mediaItems: [item, ...s.mediaItems],
                          selectedMediaIds: [...s.selectedMediaIds, item.id]
                      }));
                      const sourceTypeName = item.type === 'pdf' ? 'PDF source' : 'text source';
                      alert(`"${item.name}" saved as a ${sourceTypeName} in the active workspace!`);
                  }
              }}
          />
      );
  }

  if (viewMode === 'library') {
      return (
          <div className="h-full w-full relative" data-theme={theme}>
              <LibraryView 
                  sessions={sessions}
                  onSelectSession={handleSelectSession}
                  onCreateSession={handleOpenCreateSessionModal}
                  onDeleteSession={handleDeleteSession}
                  onRenameSession={renameSession}
                  onReorderSession={reorderSessions}
                  onCombineSessions={(ids, name, description) => {
                      const newSession = combineSessions(ids, name, description);
                      if (newSession) {
                          setViewMode('studio');
                      }
                  }}
                  onOpenSettings={() => toggleSettings('ai')}
                  onOpenStudio={() => setViewMode('studio')}
                  onOpenOfficeTools={() => setViewMode('office_tools')}
                  onOpenMedia={() => setViewMode('media')}
                  onOpenMIPrOMPT={() => setViewMode('miprompt')}
                  onOpenFinance={() => setViewMode('finance')}
                  onOpenMaggi={() => setViewMode('maggi')}
              />
              <SessionModal 
                  isOpen={isModalOpen} 
                  onClose={() => setIsModalOpen(false)} 
                  onCreate={handleCreateSession}
                  defaultValue={newSessionDefaultName}
                  sessions={sessions}
              />
              <SettingsPanel 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentTheme={theme}
                onSetTheme={setTheme}
                settings={settings}
                onUpdateSettings={setSettings}
                initialTab={activeSettingsTab}
                voiceSettings={voiceSettings}
                onUpdateVoiceSettings={setVoiceSettings}
                castLibrary={castLibrary}
                onAddCastMember={addCastMember}
                onUpdateCastMember={updateCastMember}
                onDeleteCastMember={deleteCastMember}
                onResetLibrary={resetLibrary}
              />
          </div>
      );
  }

  if (!activeSession) return <div className="bg-app-bg h-screen text-app-text p-10 flex items-center justify-center">Loading Session...</div>;

  const isPreviewActive = previewCode || focusedMediaItem;
  
  const chatPanelClasses = `flex flex-col h-full transition-all duration-500 ease-in-out ${
      (!isMindMapOpen && isPreviewActive)
          ? (isPreviewMinimized 
                ? 'w-full opacity-100' 
                : (isFullWidthPreview ? 'w-0 opacity-0 overflow-hidden border-0' : 'w-1/2 border-r border-app-border opacity-100')
            )
          : 'w-full opacity-100'
  }`;

  const previewPanelClasses = `
      bg-app-bg border-l border-app-border transition-all duration-500 ease-in-out
      ${isMindMapOpen 
          ? 'fixed top-0 right-0 bottom-0 w-[50%] z-40 shadow-2xl' 
          : (isPreviewMinimized 
              ? 'fixed bottom-4 right-4 w-0 h-0 opacity-0 pointer-events-none overflow-hidden' 
              : (isFullWidthPreview ? 'w-full h-full' : 'w-1/2 h-full')
            )
      }
  `;

  return (
    <div className="h-full w-full relative overflow-hidden flex flex-col" data-theme={theme}>
      {theme === 'olive' && backgroundTemplateImage && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 ease-in-out blur-sm opacity-40 scale-105"
          style={{ backgroundImage: `url(data:${backgroundTemplateImage.mimeType};base64,${backgroundTemplateImage.data})` }}
        />
      )}
      
      <div className="absolute inset-0 z-0 bg-app-bg transition-colors duration-300" />

      {isMindMapOpen && (
          <div className="absolute inset-0 z-0 animate-fade-in">
              {activeSession.mindMapData ? (
                <MindMapViewer 
                    data={activeSession.mindMapData} 
                    onClose={handleToggleMindMap} 
                    onNodeDoubleClick={handleMindMapNodeDoubleClick}
                    onRefresh={handleRefreshMindMap}
                    sources={activeSession.mediaItems}
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-app-dim bg-app-bg/90">
                     <div className="animate-spin h-10 w-10 border-4 border-app-text border-t-transparent rounded-full mb-4"></div>
                     <p className="animate-pulse">Synthesizing Context Graph...</p>
                </div>
              )}
          </div>
      )}
      
      {isMindMapOpen && isMainPanelCollapsed && (
        <button
          onClick={() => { setIsMainPanelCollapsed(false); setIsSourcesPanelOpen(false); }}
          className="fixed left-0 top-[40%] transform -translate-y-1/2 z-50 bg-transparent text-app-text hover:bg-app-panel/20 rounded-r-lg p-1 transition-all"
          title="Open Chat & Sessions"
        >
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
           </svg>
        </button>
      )}

      {isMindMapOpen && !isSourcesPanelOpen && isMainPanelCollapsed && (
         <button
            onClick={() => setIsSourcesPanelOpen(true)}
            className="fixed left-0 top-[45%] transform -translate-y-1/2 z-50 bg-transparent text-cyan-500 hover:bg-app-panel/20 rounded-r-lg p-1 transition-all"
            title="Open Sources Only"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
             </svg>
          </button>
      )}

      <div 
          className={`
            relative z-30 flex flex-col md:flex-row h-full transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]
            ${isMindMapOpen ? 'absolute top-0 bottom-0 shadow-2xl border-r border-app-border bg-app-bg/95 backdrop-blur-md' : 'w-full'}
            ${isMindMapOpen ? (isMainPanelCollapsed ? '-translate-x-full' : 'translate-x-0') : ''}
          `}
          style={{ width: '100%' }} 
      >
        {isMindMapOpen && (
             <button 
                onClick={() => setIsMainPanelCollapsed(true)}
                className={`absolute left-4 top-4 w-10 h-10 bg-app-panel border border-app-border rounded-full flex items-center justify-center text-app-text hover:text-blue-400 z-50 shadow-lg`}
                title="Back to Mind Map"
             >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                 </svg>
             </button>
        )}

        <div className={`transition-all duration-500 ease-in-out overflow-hidden flex shrink-0 ${isSidebarVisible ? 'w-full md:w-80' : 'w-0'}`}>
          <MediaPanel 
            activeTab={activeSideTab}
            onTabChange={setActiveSideTab}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSwitchSession={setActiveSessionId}
            onCreateSession={handleOpenCreateSessionModal}
            onDeleteSession={handleDeleteSession}
            onRenameSession={renameSession}
            onExportSession={handleExportSession}
            activeMediaItems={activeSession.mediaItems} 
            selectedMediaIds={activeSession.selectedMediaIds || []}
            onToggleMedia={onToggleMedia}
            onToggleAllMedia={onToggleAllMedia}
            onFileUpload={onFileUpload}
            onAddLink={onAddLink}
            onAddText={handleAddText}
            onSearchWeb={handleSearchWeb}
            onRefillSearch={handleRefillSearch}
            onRemove={onRemoveMedia}
            onRenameMediaItem={handleRenameMediaItem} // Pass the new handler
            onCombineMedia={onCombineMedia}
            onViewMedia={handleFocusMedia}
            onLoadAudio={handleLoadAudio}
            currentTheme={theme}
            onSetTheme={setTheme}
            settings={settings}
            onUpdateSettings={setSettings}
            onRunTool={handleToolAction}
            toolLoadingState={toolLoadingState}
            voiceSettings={voiceSettings}
            onUpdateVoiceSettings={setVoiceSettings}
            onGoHome={() => setViewMode('library')}
            isSettingsOpen={isSettingsOpen}
            activeSettingsTab={activeSettingsTab}
            onToggleSettings={toggleSettings}
            viewMode={viewMode}
            characters={characters}
            onAddCharacter={addCharacter}
            onUpdateCharacter={updateCharacter}
            onDeleteCharacter={deleteCharacter}
          />
        </div>
        
        <div className="flex-1 flex overflow-hidden flex-col md:flex-row min-w-0">
           <div className={chatPanelClasses}>
              <ChatPanel 
                sessionName={activeSession.name}
                history={activeSession.history}
                isLoading={isLoading}
                input={input}
                setInput={setInput}
                onSend={() => handleSend()}
                suggestions={activeSession.suggestions}
                onSuggestionClick={triggerSuggestion}
                isSuggestionsLoading={isSuggestionsLoading}
                onSeekMedia={handleSeekMedia}
                onPreviewArtifact={(code) => { setPreviewCode(code); setFocusedMediaItem(null); setIsPreviewMinimized(false); if(isMindMapOpen) setIsMainPanelCollapsed(true); setIsFullWidthPreview(false); }}
                onSaveAsSource={handleSaveAsSource}
                onGenerateReport={handleGenerateReport}
                onOpenAudio={handleOpenAudio}
                onClearHistory={() => clearSessionHistory(activeSession.id)}
                onDeleteSession={() => handleDeleteSession(activeSession.id)}
                onDownloadSession={handleDownloadSession}
                onRunTool={handleToolAction}
                toolLoadingState={toolLoadingState}
                prompts={prompts}
                onAddPrompt={addPrompt}
                onDeletePrompt={removePrompt}
                onToggleMindMap={handleToggleMindMap}
                isMindMapLoading={isMindMapLoading}
                activeMediaItems={activeSession.mediaItems.filter(item => activeSession.selectedMediaIds.includes(item.id))}
                isSidebarVisible={isSidebarVisible}
                setIsSidebarVisible={setIsSidebarVisible}
                onRefreshSuggestions={() => generateSuggestionsForSession(activeSession.id, activeSession.mediaItems.filter(item => activeSession.selectedMediaIds.includes(item.id)))}
                sessionDescription={activeSession.description}
                onUpdateDescription={(desc) => updateSessionDescription(activeSession.id, desc)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onEditMessage={(id, newContent) => {
                  updateActiveSession((s) => ({
                    ...s,
                    history: s.history.map(m => m.id === id ? { ...m, content: newContent } : m)
                  }));
                }}
              />
           </div>
           
           {isPreviewActive && (
             <div className={previewPanelClasses}>
                {previewCode ? (
                   <ArtifactPreview 
                      code={previewCode} 
                      theme={theme} 
                      onClose={() => { setPreviewCode(null); setIsFullWidthPreview(false); }} 
                      onMinimize={() => setIsPreviewMinimized(true)}
                      onToggleFullWidth={() => setIsFullWidthPreview(prev => !prev)}
                      isFullWidth={isFullWidthPreview}
                      onSaveToSession={handleSaveArtifactToSession}
                      onSaveToMIPrOMPT={(title) => {
                          const type = lastUsedBuilder || 'prB';
                          addMIPrOMPT(type, previewCode, title);
                          alert(`Successfully saved to mIPrOMPT Library as a ${type === 'prB' ? 'Prompt' : type === 'txS' ? 'Summarizer Output' : 'Content'}!`);
                      }}
                   />
                ) : focusedMediaItem ? (
                   <MediaViewer item={focusedMediaItem} onClose={() => { setFocusedMediaItem(null); setIsFullWidthPreview(false); }} />
                ) : null}
             </div>
           )}
        </div>
      </div>
      
      {!isMindMapOpen && previewCode && isPreviewMinimized && (
          <div className="absolute bottom-6 right-6 z-50 animate-fade-in">
              <button 
                  onClick={() => setIsPreviewMinimized(false)}
                  className="flex items-center gap-3 px-4 py-3 bg-app-card border border-app-border rounded-full shadow-2xl text-app-text hover:bg-app-panel transition-all group"
              >
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </div>
                  <span className="text-sm font-bold pr-1">Playing Audio...</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
              </button>
          </div>
      )}

      {isMindMapOpen && (
          <div 
             className={`
                absolute top-0 bottom-0 left-0 z-20 w-80 bg-app-panel border-r border-app-border shadow-2xl transition-transform duration-300 ease-out
                ${isSourcesPanelOpen ? 'translate-x-0' : '-translate-x-full'}
             `}
          >
             <div className="relative h-full flex flex-col">
                <button 
                  onClick={() => setIsSourcesPanelOpen(false)}
                  className="absolute -right-6 top-[60%] transform -translate-y-1/2 w-6 h-10 bg-transparent text-cyan-500 rounded-r-lg flex items-center justify-center hover:bg-app-panel/20 border-y border-r border-app-border/30 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </button>

                <MediaPanel 
                   activeTab="sources"
                   onTabChange={() => {}}
                   sessions={sessions}
                   activeSessionId={activeSessionId}
                   onSwitchSession={setActiveSessionId}
                   onCreateSession={handleOpenCreateSessionModal}
                   onDeleteSession={handleDeleteSession}
                   onRenameSession={renameSession}
                   onExportSession={handleExportSession}
                   activeMediaItems={activeSession.mediaItems} 
                   selectedMediaIds={activeSession.selectedMediaIds || []}
                   onToggleMedia={onToggleMedia}
                   onToggleAllMedia={onToggleAllMedia}
                   onFileUpload={onFileUpload}
                   onAddLink={onAddLink}
                   onAddText={handleAddText}
                   onSearchWeb={handleSearchWeb}
                   onRefillSearch={handleRefillSearch}
                   onRemove={onRemoveMedia}
                   onRenameMediaItem={handleRenameMediaItem} // Pass the new handler
                   onViewMedia={handleFocusMedia}
                   currentTheme={theme}
                   onSetTheme={setTheme}
                   settings={settings}
                   onUpdateSettings={setSettings}
                   onRunTool={handleToolAction}
                   toolLoadingState={toolLoadingState}
                   onlySourcesView={true}
                   onLoadAudio={handleLoadAudio}
                   voiceSettings={voiceSettings}
                   onUpdateVoiceSettings={setVoiceSettings}
                   onGoHome={() => setViewMode('library')}
                   isSettingsOpen={isSettingsOpen}
                   activeSettingsTab={activeSettingsTab}
                   onToggleSettings={toggleSettings}
                   viewMode={viewMode}
                   characters={characters}
                   onAddCharacter={addCharacter}
                   onUpdateCharacter={updateCharacter}
                   onDeleteCharacter={deleteCharacter}
                />
             </div>
          </div>
      )}
      
      {mindMapPopup && (
        <MindMapPopup 
           title={mindMapPopup.title}
           content={mindMapPopup.content}
           isLoading={mindMapPopup.isLoading}
           onClose={() => setMindMapPopup(null)}
        />
      )}

      <SessionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreate={handleCreateSession}
        defaultValue={newSessionDefaultName}
        sessions={sessions}
      />
      
      <SettingsPanel 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={theme}
        onSetTheme={setTheme}
        settings={settings}
        onUpdateSettings={setSettings}
        initialTab={activeSettingsTab}
        voiceSettings={voiceSettings}
        onUpdateVoiceSettings={setVoiceSettings}
        castLibrary={castLibrary}
        onAddCastMember={addCastMember}
        onUpdateCastMember={updateCastMember}
        onDeleteCastMember={deleteCastMember}
        onResetLibrary={resetLibrary}
      />
    </div>
  );
};

export default App;
