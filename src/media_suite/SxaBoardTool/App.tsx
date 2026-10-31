import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Layout, Film, Plus, Download, FolderPlus, Save, Trash2, Printer, Loader2,
  SlidersHorizontal, Volume2, VolumeX, ChevronLeft, ChevronRight,
  Copy, RotateCcw, SkipBack, SkipForward, Play, Search, PlayCircle, List,
  GripVertical, CheckSquare, Square, Sparkles, Maximize2, Minimize2, Move,
  Eye, EyeOff, Settings, Menu, Repeat, Mic, Music, Pause, Upload, ListOrdered, ListVideo,
  Check, ChevronDown
} from 'lucide-react';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import UploadModal from './components/UploadModal';
import FrameEdit from './components/FrameEdit';
import GridEdit from './components/GridEdit';
import ScreenplayWriter from './components/ScreenplayWriter';
import { Slide, AspectRatioKey, TransitionStyle, COLOR_LABELS, SHOT_TYPES, PlaybackTrack } from './types';
import { ASPECT_RATIOS, GRADIENT_PRESETS } from './constants';
import { useAudio } from './useAudio';
import { cn } from './utils/cn';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { resizeImage } from './utils/image';

const storage = getStorage();

interface Theme {
  id: string;
  name: string;
  variables: Record<string, string>;
}

const THEMES: Theme[] = [
  {
    id: 'cinema',
    name: 'Dark Cinema',
    variables: {
      '--theme-bg-app': '#09090b',
      '--theme-bg-header': '#121217',
      '--theme-bg-panel': '#161622',
      '--theme-border': '#252538',
      '--theme-text-primary': '#e2e8f0',
      '--theme-text-heading': '#ffffff',
      '--theme-text-muted': '#94a3b8',
      '--theme-accent': '#6366f1',
      '--theme-accent-hover': '#818cf8',
      '--theme-accent-text': '#ffffff',
      '--theme-badge-bg': '#1e1e2f',
    }
  },
  {
    id: 'silver',
    name: 'Light Silver',
    variables: {
      '--theme-bg-app': '#f1f5f9',
      '--theme-bg-header': '#e2e8f0',
      '--theme-bg-panel': '#ffffff',
      '--theme-border': '#cbd5e1',
      '--theme-text-primary': '#334155',
      '--theme-text-heading': '#0f172a',
      '--theme-text-muted': '#64748b',
      '--theme-accent': '#64748b',
      '--theme-accent-hover': '#475569',
      '--theme-accent-text': '#ffffff',
      '--theme-badge-bg': '#e2e8f0',
    }
  },
  {
    id: 'pastel_green',
    name: 'Pastel Green',
    variables: {
      '--theme-bg-app': '#f0fdf4',
      '--theme-bg-header': '#dcfce7',
      '--theme-bg-panel': '#ffffff',
      '--theme-border': '#bbf7d0',
      '--theme-text-primary': '#166534',
      '--theme-text-heading': '#14532d',
      '--theme-text-muted': '#15803d',
      '--theme-accent': '#16a34a',
      '--theme-accent-hover': '#15803d',
      '--theme-accent-text': '#ffffff',
      '--theme-badge-bg': '#dcfce7',
    }
  },
  {
    id: 'navy',
    name: 'Midnight Navy',
    variables: {
      '--theme-bg-app': '#020617',
      '--theme-bg-header': '#0f172a',
      '--theme-bg-panel': '#1e293b',
      '--theme-border': '#334155',
      '--theme-text-primary': '#cbd5e1',
      '--theme-text-heading': '#f8fafc',
      '--theme-text-muted': '#64748b',
      '--theme-accent': '#38bdf8',
      '--theme-accent-hover': '#7dd3fc',
      '--theme-accent-text': '#020617',
      '--theme-badge-bg': '#1e293b',
    }
  }
];

const TRANSITION_OPTIONS = [
  { value: 'none', label: 'Cut (None)' },
  { value: 'fade', label: 'Cross-Fade' },
  { value: 'wipe', label: 'Slide-In' },
  { value: 'zoom', label: 'Zoom Dissolve' },
  { value: 'slideUp', label: 'Vertical Slide' },
  { value: 'blur', label: 'Defocus Blur' },
] as const;

export default function SxaBoardTool({ 
  onBack,
  activeSession,
  onSaveArtifact
}: { 
  onBack?: () => void;
  activeSession?: any;
  onSaveArtifact?: (item: any) => void;
}) {
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    return localStorage.getItem('storyboard_theme') || 'cinema';
  });

  const handleSetTheme = (themeId: string) => {
    setCurrentThemeId(themeId);
    localStorage.setItem('storyboard_theme', themeId);
  };

  const [customBgColor, setCustomBgColor] = useState<string>(() => {
    return localStorage.getItem('storyboard_custom_bg') || '';
  });
  const [customTextColor, setCustomTextColor] = useState<string>(() => {
    return localStorage.getItem('storyboard_custom_text') || '#10b981';
  });
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  const handleSetCustomBgColor = (color: string) => {
    setCustomBgColor(color);
    if (color) {
      localStorage.setItem('storyboard_custom_bg', color);
    } else {
      localStorage.removeItem('storyboard_custom_bg');
    }
  };

  const handleSetCustomTextColor = (color: string) => {
    setCustomTextColor(color);
    if (color) {
      localStorage.setItem('storyboard_custom_text', color);
    } else {
      localStorage.removeItem('storyboard_custom_text');
    }
  };

  const [storyboardId, setStoryboardId] = useState<string>(() => {
    return localStorage.getItem('storyboard_active_id') || 'default-filmstrip';
  });

  const [projectList, setProjectList] = useState<Array<{ id: string; name: string }>>(() => {
    const localList = localStorage.getItem('storyboard_projects_list');
    if (localList) {
      try {
        return JSON.parse(localList);
      } catch (e) {
        console.error(e);
      }
    }
    return [{ id: 'default-filmstrip', name: 'My-Storyboard' }];
  });

  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // Save storyboardId to localStorage
  useEffect(() => {
    localStorage.setItem('storyboard_active_id', storyboardId);
  }, [storyboardId]);

  // Save projectList to localStorage
  useEffect(() => {
    localStorage.setItem('storyboard_projects_list', JSON.stringify(projectList));
  }, [projectList]);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [editingFrame, setEditingFrame] = useState<{imageUrl: string; index: number} | null>(null);
  const [editingGridFrame, setEditingGridFrame] = useState<{imageUrl: string; index: number} | null>(null);
  const [folderName, setFolderName] = useState('My-Storyboard');

  // Keep projectList names synchronized with the actual project folderName
  useEffect(() => {
    if (folderName && storyboardId) {
      setProjectList(prev => {
        const idx = prev.findIndex(p => p.id === storyboardId);
        if (idx !== -1) {
          if (prev[idx].name === folderName) return prev;
          const updated = [...prev];
          updated[idx] = { ...updated[idx], name: folderName };
          return updated;
        } else {
          return [...prev, { id: storyboardId, name: folderName }];
        }
      });
    }
  }, [folderName, storyboardId]);

  const handleCreateNewProject = (customName?: string) => {
    const name = (customName || '').trim() || `Storyboard-${Date.now().toString().slice(-4)}`;
    const newId = `storyboard_${Date.now()}`;
    
    setProjectList(prev => [...prev, { id: newId, name }]);
    setStoryboardId(newId);
    setSlides([]);
    setFolderName(name);
    setPlaybackTracks([]);
    
    localStorage.setItem(`storyboard_${newId}`, JSON.stringify({
      slides: [],
      folderName: name,
      id: newId,
      playbackTracks: []
    }));
    
    setDoc(doc(db, 'storyboards', newId), {
      slides: [],
      folderName: name,
      id: newId,
      playbackTracks: []
    }).catch(err => console.error(err));
    
    if (enableBeeps) triggerAudioBeep(650, 'sine', 0.15);
  };

  const handleClearStoryboard = () => {
    if (window.confirm("Are you sure you want to flush all frames and clear the storyboard? This cannot be undone.")) {
      setSlides([]);
      setFolderName('My-Storyboard');
      setPlaybackTracks([]);
      
      localStorage.setItem(`storyboard_${storyboardId}`, JSON.stringify({
        slides: [],
        folderName: 'My-Storyboard',
        id: storyboardId,
        playbackTracks: []
      }));
      
      setDoc(doc(db, 'storyboards', storyboardId), {
        slides: [],
        folderName: 'My-Storyboard',
        id: storyboardId,
        playbackTracks: []
      }).catch(err => console.error(err));
      
      if (enableBeeps) triggerAudioBeep(300, 'sine', 0.2);
    }
  };

  const handleDeleteProject = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (idToDelete === 'default-filmstrip') {
      alert("Cannot delete the default filmstrip project.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this project? All its frames will be lost.")) {
      const updatedList = projectList.filter(p => p.id !== idToDelete);
      setProjectList(updatedList);
      
      localStorage.removeItem(`storyboard_${idToDelete}`);
      
      if (storyboardId === idToDelete) {
        setStoryboardId('default-filmstrip');
      }
      if (enableBeeps) triggerAudioBeep(400, 'sine', 0.1);
    }
  };

  const handleSaveToWorkspaceSession = () => {
    if (!onSaveArtifact) {
      alert("No active session or save callback found. Please make sure you are in a workspace session.");
      return;
    }
    
    const jsonStr = JSON.stringify({ slides, folderName, playbackTracks });
    const b64Data = btoa(unescape(encodeURIComponent(jsonStr)));
    
    const item = {
      id: `storyboard-snapshot-${Date.now()}`,
      name: `Storyboard: ${folderName}`,
      type: 'text' as const,
      mimeType: 'application/json',
      data: b64Data,
      createdAt: Date.now()
    };
    
    onSaveArtifact(item);
  };

  const getWorkspaceStoryboards = () => {
    if (!activeSession || !activeSession.mediaItems) return [];
    return activeSession.mediaItems.filter((item: any) => {
      if (item.type !== 'text') return false;
      if (item.name.startsWith('Storyboard:')) return true;
      try {
        const decoded = new TextDecoder().decode(Uint8Array.from(atob(item.data), c => c.charCodeAt(0)));
        const parsed = JSON.parse(decoded);
        return Array.isArray(parsed.slides);
      } catch (e) {
        return false;
      }
    });
  };

  const handleLoadFromWorkspaceItem = (item: any) => {
    try {
      const decoded = new TextDecoder().decode(Uint8Array.from(atob(item.data), c => c.charCodeAt(0)));
      const parsed = JSON.parse(decoded);
      if (parsed && Array.isArray(parsed.slides)) {
        setSlides(parsed.slides);
        setFolderName(parsed.folderName || 'Imported-Storyboard');
        setPlaybackTracks(parsed.playbackTracks || []);
        
        saveToFirebase(parsed.slides, parsed.folderName || 'Imported-Storyboard', parsed.playbackTracks || []);
        if (enableBeeps) triggerAudioBeep(600, 'sine', 0.1);
        alert(`Successfully loaded storyboard "${parsed.folderName || 'Imported-Storyboard'}" into FilmStrip Editor!`);
      } else {
        alert("Invalid storyboard format.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to parse the storyboard data from this session item.");
    }
  };

  const [viewDensity, setViewDensity] = useState<'full' | 'compact' | 'strip' | 'icon'>(() => {
    return (localStorage.getItem('storyboard_density') as any) || 'strip';
  });
  const [showScriptEditor, setShowScriptEditor] = useState<boolean>(() => {
    return localStorage.getItem('storyboard_show_script') === 'true';
  });
  const [scriptWriterFullScreen, setScriptWriterFullScreen] = useState(false);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const handleSelectSlide = (id: string | null) => {
    setActiveSlideId(id);
    if (id) {
      const idx = slides.findIndex(s => s.id === id);
      if (idx !== -1) {
        setCurrentSlideIndex(idx);
      }
    }
  };

  useEffect(() => {
    if (slides.length > 0) {
      let indexToUse = currentSlideIndex;
      if (indexToUse < 0 || indexToUse >= slides.length) {
        indexToUse = 0;
        setCurrentSlideIndex(0);
      }
      const targetId = slides[indexToUse]?.id || null;
      if (targetId && targetId !== activeSlideId) {
        setActiveSlideId(targetId);
      }
    } else {
      if (activeSlideId !== null) {
        setActiveSlideId(null);
      }
    }
  }, [currentSlideIndex, slides, activeSlideId]);

  useEffect(() => {
    localStorage.setItem('storyboard_density', viewDensity);
  }, [viewDensity]);

  useEffect(() => {
    localStorage.setItem('storyboard_show_script', String(showScriptEditor));
  }, [showScriptEditor]);

  const [headerDisplayMode, setHeaderDisplayMode] = useState<'icons' | 'text' | 'both'>(() => {
    return (localStorage.getItem('storyboard_header_display_mode') as 'icons' | 'text' | 'both') || 'icons';
  });

  useEffect(() => {
    localStorage.setItem('storyboard_header_display_mode', headerDisplayMode);
  }, [headerDisplayMode]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [transitionStyle, setTransitionStyle] = useState<TransitionStyle>('fade');
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);
  const [showTransitionDropdown, setShowTransitionDropdown] = useState(false);
  const [activeLayout, setActiveLayout] = useState<'grid' | 'spreadsheet' | 'player'>('spreadsheet');
  const [selectedAspectRatio] = useState<AspectRatioKey>('16:9');
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [enableBeeps, setEnableBeeps] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [showFilmstrip, setShowFilmstrip] = useState(true);
  const [showAddBlankDropdown, setShowAddBlankDropdown] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'filmstrip' | 'tracks'>('filmstrip');
  const [activePlaybackTrackId, setActivePlaybackTrackId] = useState<string | null>(null);
  const [enableTransitionSpeed, setEnableTransitionSpeed] = useState<boolean>(false);

  const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [zoomVariationsSource, setZoomVariationsSource] = useState<Slide | null>(null);
  const [zoomRatios, setZoomRatios] = useState<[number, number, number]>([1.2, 1.8, 2.5]);
  const [zoomPanOffsets, setZoomPanOffsets] = useState<Array<{ x: number; y: number }>>([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printTitle, setPrintTitle] = useState('');
  const [printAuthor, setPrintAuthor] = useState('');
  const [printLayout, setPrintLayout] = useState<'grid' | 'list'>('grid');
  const [printCols, setPrintCols] = useState<number>(2);
  const [printNotes, setPrintNotes] = useState(true);
  const [printDialogue, setPrintDialogue] = useState(true);
  const [printMeta, setPrintMeta] = useState(true);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [exportToSession, setExportToSession] = useState(false);

  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false);
  const [showZipDialog, setShowZipDialog] = useState(false);
  const [zipFileName, setZipFileName] = useState('storyboard');
  const [isExportingZip, setIsExportingZip] = useState(false);

  const [prevSlideImageUrl, setPrevSlideImageUrl] = useState<string | null>(null);
  const [prevSlideFitMode, setPrevSlideFitMode] = useState<'contain' | 'cover'>('contain');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [transitionDuration, setTransitionDuration] = useState<number>(0.5);
  const [playbackTracks, setPlaybackTracks] = useState<PlaybackTrack[]>([]);
  const [isRecordingPlayback, setIsRecordingPlayback] = useState(false);
  const [recordedTimings, setRecordedTimings] = useState<Record<string, number>>({});

  const { triggerAudioBeep } = useAudio();
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const processedImagesRef = useRef<Set<string>>(new Set());

  const [recordingIdx, setRecordingIdx] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async (idx: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (re) => {
          handleUpdateSlideField(idx, 'audioUrl', re.target?.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setRecordingIdx(idx);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingIdx(null);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (isPlaying && slides.length > 0) {
      const currentSlide = slides[currentSlideIndex];
      if (currentSlide && currentSlide.audioUrl) {
        const audio = new Audio(currentSlide.audioUrl);
        activeAudioRef.current = audio;
        audio.play().catch(err => console.warn(err));
      }
    }
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, [currentSlideIndex, isPlaying, slides]);

  useEffect(() => {
    if (activeLayout !== 'player' && isPlaying) {
      setIsPlaying(false);
    }
  }, [activeLayout, isPlaying]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'storyboards', storyboardId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSlides(data.slides || []);
        setFolderName(data.folderName || 'My-Storyboard');
        setPlaybackTracks(data.playbackTracks || []);
      } else {
        const localData = localStorage.getItem(`storyboard_${storyboardId}`);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            setSlides(parsed.slides || []);
            setFolderName(parsed.folderName || 'My-Storyboard');
            setPlaybackTracks(parsed.playbackTracks || []);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }, (error) => {
      console.error(error);
      const localData = localStorage.getItem(`storyboard_${storyboardId}`);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setSlides(parsed.slides || []);
          setFolderName(parsed.folderName || 'My-Storyboard');
          setPlaybackTracks(parsed.playbackTracks || []);
        } catch (e) {
          console.error(e);
        }
      }
    });
    return () => unsub();
  }, [storyboardId]);

  useEffect(() => {
    if (draggingIdx === null) return;
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current || !panStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const scaleX = dx / 300;
      const scaleY = dy / 169;
      const baseZoom = zoomRatios[draggingIdx];
      const maxPan = Math.max(0, (baseZoom - 1) / 2);
      setZoomPanOffsets((prev) => {
        const next = [...prev];
        next[draggingIdx] = {
          x: Math.max(-maxPan, Math.min(maxPan, panStartRef.current!.x + scaleX)),
          y: Math.max(-maxPan, Math.min(maxPan, panStartRef.current!.y + scaleY)),
        };
        return next;
      });
    };
    const handlePointerUp = () => {
      setDraggingIdx(null);
      dragStartRef.current = null;
      panStartRef.current = null;
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingIdx, zoomRatios]);

  const handlePanStart = (e: React.MouseEvent | React.TouchEvent, idx: number) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { x: clientX, y: clientY };
    panStartRef.current = { ...zoomPanOffsets[idx] };
    setDraggingIdx(idx);
  };

  useEffect(() => {
    if (playTimerRef.current) clearTimeout(playTimerRef.current);
    if (!isPlaying || slides.length === 0) return;
    const currentSlide = slides[currentSlideIndex];
    const duration = currentSlide?.duration || 3000;
    if (voiceoverEnabled && currentSlide && (currentSlide.action || currentSlide.dialogue)) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentSlide.dialogue || currentSlide.action);
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn(err);
      }
    }
    playTimerRef.current = setTimeout(() => {
      if (currentSlideIndex < slides.length - 1) {
        if (enableBeeps) triggerAudioBeep(600, 'sine', 0.08);
        setCurrentSlideIndex((prev) => prev + 1);
      } else {
        if (isLooping) {
          if (enableBeeps) triggerAudioBeep(800, 'sine', 0.12);
          setCurrentSlideIndex(0);
        } else {
          setIsPlaying(false);
        }
      }
    }, duration);
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [isPlaying, currentSlideIndex, slides, isLooping, enableBeeps, triggerAudioBeep, voiceoverEnabled]);

  useEffect(() => {
    if (!isPlaying && voiceoverEnabled) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  }, [isPlaying, voiceoverEnabled]);

  useEffect(() => {
    if (slides.length > 0 && slides[currentSlideIndex]) {
      const currentUrl = slides[currentSlideIndex].imageUrl;
      const currentFit = slides[currentSlideIndex].fitMode || 'contain';
      if (prevSlideImageUrl && prevSlideImageUrl !== currentUrl) {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
          setIsTransitioning(false);
          setPrevSlideImageUrl(currentUrl);
          setPrevSlideFitMode(currentFit);
        }, transitionDuration * 1000);
        return () => clearTimeout(timer);
      } else {
        setPrevSlideImageUrl(currentUrl);
        setPrevSlideFitMode(currentFit);
      }
    } else {
      setPrevSlideImageUrl(null);
    }
  }, [currentSlideIndex, slides, transitionDuration]);

  const saveToFirebase = async (newSlides: Slide[], name: string, updatedTracks?: PlaybackTrack[]) => {
    let slidesToSave = newSlides;
    const tracksToSave = updatedTracks !== undefined ? updatedTracks : playbackTracks;
    try {
      slidesToSave = await Promise.all(newSlides.map(async (s) => {
        if (s.imageUrl.startsWith('data:image')) {
          if (processedImagesRef.current.has(s.imageUrl)) return s;
          try {
            const storageRef = ref(storage, `storyboards/${storyboardId}/${s.id}.jpg`);
            await uploadString(storageRef, s.imageUrl, 'data_url');
            const downloadUrl = await getDownloadURL(storageRef);
            processedImagesRef.current.add(downloadUrl);
            processedImagesRef.current.add(s.imageUrl);
            return { ...s, imageUrl: downloadUrl };
          } catch (storageErr) {
            console.warn(storageErr);
            const compressed = await resizeImage(s.imageUrl, 800, 450, 0.5);
            processedImagesRef.current.add(compressed);
            processedImagesRef.current.add(s.imageUrl);
            return { ...s, imageUrl: compressed };
          }
        }
        return s;
      }));
    } catch (err) {
      console.error(err);
    }
    try {
      localStorage.setItem(`storyboard_${storyboardId}`, JSON.stringify({
        slides: slidesToSave,
        folderName: name,
        id: storyboardId,
        playbackTracks: tracksToSave
      }));
    } catch (localErr) {
      console.error(localErr);
    }
    try {
      await setDoc(doc(db, 'storyboards', storyboardId), {
        slides: slidesToSave,
        folderName: name,
        id: storyboardId,
        playbackTracks: tracksToSave
      });
    } catch (dbErr) {
      console.error(dbErr);
    }
  };

  const lastActiveSlideIdRef = useRef<string | null>(null);
  const recordStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isRecordingPlayback) {
      const now = Date.now();
      const prevSlideId = lastActiveSlideIdRef.current;
      if (prevSlideId) {
        const elapsed = now - recordStartTimeRef.current;
        if (elapsed > 200) {
          setRecordedTimings(prev => ({
            ...prev,
            [prevSlideId]: elapsed
          }));
        }
      }
      recordStartTimeRef.current = now;
    }
    if (slides[currentSlideIndex]) {
      lastActiveSlideIdRef.current = slides[currentSlideIndex].id;
    } else {
      lastActiveSlideIdRef.current = null;
    }
  }, [currentSlideIndex, isRecordingPlayback, slides]);

  useEffect(() => {
    if (isRecordingPlayback && !isPlaying && Object.keys(recordedTimings).length > 0) {
      handleStopRecordingPlayback();
    }
  }, [isPlaying]);

  const [showSaveTrackDialog, setShowSaveTrackDialog] = useState(false);
  const [newTrackName, setNewTrackName] = useState('');

  const handleStartRecordingPlayback = () => {
    setIsRecordingPlayback(true);
    setRecordedTimings({});
    recordStartTimeRef.current = Date.now();
    if (slides[currentSlideIndex]) lastActiveSlideIdRef.current = slides[currentSlideIndex].id;
    if (!isPlaying) setIsPlaying(true);
    if (enableBeeps) triggerAudioBeep(600, 'sine', 0.1);
  };

  const handleStopRecordingPlayback = () => {
    if (!isRecordingPlayback) return;
    const now = Date.now();
    const prevSlideId = lastActiveSlideIdRef.current;
    const finalTimings = { ...recordedTimings };
    if (prevSlideId) {
      const elapsed = now - recordStartTimeRef.current;
      if (elapsed > 200) finalTimings[prevSlideId] = elapsed;
    }
    setRecordedTimings(finalTimings);
    setIsPlaying(false);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const totalRecordedSecs = (Object.values(finalTimings) as number[]).reduce((sum, val) => sum + val, 0) / 1000;
    setNewTrackName(`Live Cut (${totalRecordedSecs.toFixed(1)}s) - ${timestamp}`);
    setShowSaveTrackDialog(true);
    if (enableBeeps) triggerAudioBeep(450, 'sine', 0.1);
  };

  const handleSaveCurrentTimingsAsTrack = () => {
    const currentTimings: Record<string, number> = {};
    slides.forEach(s => {
      currentTimings[s.id] = s.duration || 3000;
    });
    const totalSecs = slides.reduce((sum, s) => sum + (s.duration || 3000), 0) / 1000;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setRecordedTimings(currentTimings);
    setNewTrackName(`Manual Cut (${totalSecs.toFixed(1)}s) - ${timestamp}`);
    setShowSaveTrackDialog(true);
    if (enableBeeps) triggerAudioBeep(600, 'sine', 0.1);
  };

  const handleConfirmSaveTrack = () => {
    if (!newTrackName.trim()) return;
    const newTrack: PlaybackTrack = {
      id: Math.random().toString(36).substring(2, 9),
      name: newTrackName.trim(),
      timings: recordedTimings,
      createdAt: new Date().toISOString()
    };
    const updatedTracks = [...playbackTracks, newTrack];
    setPlaybackTracks(updatedTracks);
    setActivePlaybackTrackId(newTrack.id);
    setIsRecordingPlayback(false);
    setShowSaveTrackDialog(false);
    const updatedSlides = slides.map(s => {
      if (recordedTimings[s.id] !== undefined) return { ...s, duration: recordedTimings[s.id] };
      return s;
    });
    setSlides(updatedSlides);
    saveToFirebase(updatedSlides, folderName, updatedTracks);
    if (enableBeeps) triggerAudioBeep(650, 'sine', 0.15);
  };

  const handleCancelSaveTrack = () => {
    setIsRecordingPlayback(false);
    setShowSaveTrackDialog(false);
    if (enableBeeps) triggerAudioBeep(400, 'sine', 0.05);
  };

  const handleLoadPlaybackTrack = (track: PlaybackTrack) => {
    const updatedSlides = slides.map(s => {
      const savedDuration = track.timings[s.id];
      if (savedDuration !== undefined) return { ...s, duration: savedDuration };
      return s;
    });
    setSlides(updatedSlides);
    setActivePlaybackTrackId(track.id);
    saveToFirebase(updatedSlides, folderName, playbackTracks);
    if (enableBeeps) triggerAudioBeep(580, 'sine', 0.1);
  };

  const handleDeletePlaybackTrack = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTracks = playbackTracks.filter(t => t.id !== trackId);
    setPlaybackTracks(updatedTracks);
    if (activePlaybackTrackId === trackId) setActivePlaybackTrackId(null);
    saveToFirebase(slides, folderName, updatedTracks);
    if (enableBeeps) triggerAudioBeep(400, 'sine', 0.1);
  };

  const handleImport = (files: any[], folder?: string) => {
    const newFolderName = folder || folderName;
    if (newFolderName !== folderName) {
      setFolderName(newFolderName);
      setZipFileName(newFolderName);
    }
    const lastSlide = slides[slides.length - 1];
    let cScene = lastSlide ? lastSlide.sceneNo : 1;
    let cShot = lastSlide ? lastSlide.shotNo : 0;
    const newSlides: Slide[] = [...slides, ...files.map((f) => {
      cShot++;
      const cleanName = f.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
      return {
        id: Math.random().toString(36).substring(2, 9),
        sceneNo: cScene,
        shotNo: cShot,
        action: cleanName || 'Imported frame',
        dialogue: '',
        duration: 3000,
        imageUrl: f.dataUrl,
        notes: f.relativePath || '',
        shotType: 'MS',
        colorLabel: 'none'
      };
    })];
    setSlides(newSlides);
    saveToFirebase(newSlides, newFolderName);
    if (enableBeeps) triggerAudioBeep(520, 'sine', 0.15);
  };

  const handleUploadFiles = (files: FileList | File[]) => {
    const fileList = Array.from(files);
    Promise.all(fileList.map(f => {
      return new Promise<{ name: string; dataUrl: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = (re) => {
          resolve({
            name: f.name,
            dataUrl: re.target?.result as string
          });
        };
        reader.readAsDataURL(f);
      });
    })).then(resolvedFiles => {
      handleImport(resolvedFiles);
      setShowUpload(false);
    });
  };

  const handleSelectSample = (type: 'adventure' | 'scifi' | 'commercial') => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = type === 'scifi' ? '#0f172a' : type === 'adventure' ? '#1e293b' : '#0c4a6e';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${type.toUpperCase()} SAMPLE SHOT 1`, 640, 360);
    const dataUrl1 = canvas.toDataURL('image/jpeg');

    const sampleFiles = [
      { name: `${type}_shot_1.jpg`, dataUrl: dataUrl1 }
    ];
    handleImport(sampleFiles);
    setShowUpload(false);
  };

  const handleEditFrame = (imageUrl: string, index: number) => {
    setEditingFrame({ imageUrl, index });
  };

  const handleSaveEditedFrame = (dataUrl: string) => {
    if (!editingFrame) return;
    const newSlides = slides.map((s, i) => i === editingFrame.index ? { ...s, imageUrl: dataUrl } : s);
    setSlides(newSlides);
    saveToFirebase(newSlides, folderName);
    setEditingFrame(null);
  };

  const handleSaveAsNewFrame = (dataUrl: string) => {
    if (!editingFrame) return;
    const baseSlide = slides[editingFrame.index];
    const newSlide: Slide = {
      ...baseSlide,
      id: Math.random().toString(36).substring(2, 9),
      sceneNo: baseSlide.sceneNo,
      shotNo: baseSlide.shotNo + 1,
      imageUrl: dataUrl
    };
    const newSlides = [...slides];
    newSlides.splice(editingFrame.index + 1, 0, newSlide);
    setSlides(newSlides);
    saveToFirebase(newSlides, folderName);
    // Keep present frame open; do not set editing frame to null
  };

  const triggerReplaceFile = (index: number) => {
    setReplacingIndex(index);
    setTimeout(() => {
      replaceFileInputRef.current?.click();
    }, 50);
  };

  const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || replacingIndex === null) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const updatedSlides = slides.map((s, i) => i === replacingIndex ? { ...s, imageUrl: dataUrl } : s);
      setSlides(updatedSlides);
      saveToFirebase(updatedSlides, folderName);
      setReplacingIndex(null);
      // reset file input value
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleEditGridFrame = (imageUrl: string, index: number) => {
    setEditingGridFrame({ imageUrl, index });
  };

  const handleSaveEditedGridFrame = (dataUrl: string) => {
    if (!editingGridFrame) return;
    const newSlides = slides.map((s, i) => i === editingGridFrame.index ? { ...s, imageUrl: dataUrl } : s);
    setSlides(newSlides);
    saveToFirebase(newSlides, folderName);
    setEditingGridFrame(null);
  };

  const handleSaveAsNewGridFrame = (dataUrl: string) => {
    if (!editingGridFrame) return;
    const baseSlide = slides[editingGridFrame.index];
    const baseShotInt = Math.floor(baseSlide.shotNo);
    const newSlide: Slide = {
      ...baseSlide,
      id: Math.random().toString(36).substring(2, 9),
      sceneNo: baseSlide.sceneNo,
      shotNo: parseFloat((baseShotInt + 0.1).toFixed(2)),
      imageUrl: dataUrl
    };
    const newSlides = [...slides];
    newSlides.splice(editingGridFrame.index + 1, 0, newSlide);
    setSlides(newSlides);
    saveToFirebase(newSlides, folderName);
    setEditingGridFrame(null);
  };

  const handleSaveSlicesToSlides = (resolvedSlices: { dataUrl: string; name: string }[]) => {
    if (!editingGridFrame || resolvedSlices.length === 0) return;
    const baseSlide = slides[editingGridFrame.index];
    const baseShotInt = Math.floor(baseSlide.shotNo);
    const newSlidesToInsert: Slide[] = resolvedSlices.map((slice, idx) => {
      const sliceNum = idx + 1;
      const sequentialShotNo = parseFloat((baseShotInt + sliceNum / 100).toFixed(2));
      return {
        ...baseSlide,
        id: Math.random().toString(36).substring(2, 9),
        sceneNo: baseSlide.sceneNo,
        shotNo: sequentialShotNo,
        action: baseSlide.action ? `${baseSlide.action} (Slice ${sliceNum})` : `Slice ${sliceNum}`,
        notes: baseSlide.notes ? `${baseSlide.notes} [Grid Slice #${sliceNum}]` : `Grid Slice #${sliceNum}`,
        imageUrl: slice.dataUrl
      };
    });
    const newSlides = [...slides];
    newSlides.splice(editingGridFrame.index, 1, ...newSlidesToInsert);
    setSlides(newSlides);
    saveToFirebase(newSlides, folderName);
    setEditingGridFrame(null);
  };

  const handleGenerateVariations = (sourceSlide: Slide, zooms: [number, number, number]) => {
    const globalIndex = slides.findIndex(s => s.id === sourceSlide.id);
    if (globalIndex === -1) return;
    const promises = zooms.map((zoom, idx) => {
      const pan = zoomPanOffsets[idx] || { x: 0, y: 0 };
      return new Promise<string>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 1280;
          canvas.height = img.naturalHeight || 720;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(sourceSlide.imageUrl);
            return;
          }
          const cx = (0.5 - pan.x / zoom) * canvas.width;
          const cy = (0.5 - pan.y / zoom) * canvas.height;
          const w = canvas.width / zoom;
          const h = canvas.height / zoom;
          const clampedCx = Math.max(w / 2, Math.min(canvas.width - w / 2, cx));
          const clampedCy = Math.max(h / 2, Math.min(canvas.height - h / 2, cy));
          ctx.drawImage(img, clampedCx - w / 2, clampedCy - h / 2, w, h, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(sourceSlide.imageUrl);
        img.src = sourceSlide.imageUrl;
      });
    });
    Promise.all(promises).then((zoomedDataUrls) => {
      const newVariations: Slide[] = zoomedDataUrls.map((dataUrl, idx) => {
        let shotType = 'MS';
        if (zooms[idx] >= 2.4) shotType = 'ECU';
        else if (zooms[idx] >= 1.7) shotType = 'CU';
        return {
          id: Math.random().toString(36).substring(2, 9),
          sceneNo: sourceSlide.sceneNo,
          shotNo: sourceSlide.shotNo + idx + 1,
          action: `${sourceSlide.action || 'Visual direction'} (${zooms[idx]}x Zoom)`,
          dialogue: sourceSlide.dialogue,
          duration: sourceSlide.duration || 3000,
          imageUrl: dataUrl,
          notes: `Zoom Variation of shot ${sourceSlide.shotNo} at ${zooms[idx]}x`,
          shotType,
          colorLabel: sourceSlide.colorLabel || 'none'
        };
      });
      const nextSlides = [...slides];
      nextSlides.splice(globalIndex + 1, 0, ...newVariations);
      setSlides(nextSlides);
      saveToFirebase(nextSlides, folderName);
      setZoomVariationsSource(null);
      if (enableBeeps) triggerAudioBeep(700, 'sine', 0.12);
    });
  };

  const handleAddBlankFrame = (color: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (color.startsWith('linear-gradient')) {
        const grad = ctx.createLinearGradient(0, 0, 1280, 720);
        const hexes = color.match(/#[0-9a-fA-F]{6}/g);
        if (hexes && hexes.length >= 2) {
          grad.addColorStop(0, hexes[0]);
          grad.addColorStop(1, hexes[1]);
        } else {
          grad.addColorStop(0, '#1e293b');
          grad.addColorStop(1, '#0f172a');
        }
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = color;
      }
      ctx.fillRect(0, 0, 1280, 720);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const newSlide: Slide = {
        id: Math.random().toString(36).substring(2, 9),
        sceneNo: slides.length + 1,
        shotNo: 1,
        action: 'New blank scene',
        dialogue: '',
        duration: 3000,
        imageUrl: dataUrl,
        notes: '',
        shotType: 'MS',
        colorLabel: 'none'
      };
      const newSlides = [...slides, newSlide];
      setSlides(newSlides);
      saveToFirebase(newSlides, folderName);
    }
    setShowAddBlankDropdown(false);
  };

  const handleAutoNumber = () => {
    const renumbered = slides.map((slide, i) => ({
      ...slide,
      sceneNo: i + 1,
      shotNo: 1
    }));
    setSlides(renumbered);
    saveToFirebase(renumbered, folderName);
    if (enableBeeps) triggerAudioBeep(500, 'sine', 0.1);
  };

  const handleDuplicateSlide = (index: number) => {
    const slideToCopy = slides[index];
    const duplicated: Slide = {
      ...slideToCopy,
      id: Math.random().toString(36).substring(2, 9),
      sceneNo: slideToCopy.sceneNo,
      shotNo: slideToCopy.shotNo + 1,
    };
    const newSlides = [...slides];
    newSlides.splice(index + 1, 0, duplicated);
    setSlides(newSlides);
    saveToFirebase(newSlides, folderName);
  };

  const handleMoveSlide = (index: number, direction: 'left' | 'right' | 'up' | 'down') => {
    const targetIndex = (direction === 'left' || direction === 'up') ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;
    const newSlides = [...slides];
    const [moved] = newSlides.splice(index, 1);
    newSlides.splice(targetIndex, 0, moved);
    setSlides(newSlides);
    saveToFirebase(newSlides, folderName);
  };

  const handleUpdateSlideField = (index: number, field: keyof Slide, value: any) => {
    const newSlides = slides.map((s, i) => i === index ? { ...s, [field]: value } : s);
    setSlides(newSlides);
    saveToFirebase(newSlides, folderName);
  };

  const handleToggleSelectSlide = (id: string, event?: { shiftKey?: boolean } | React.MouseEvent) => {
    if (event?.shiftKey && selectedSlideIds.length > 0) {
      const lastSelectedId = selectedSlideIds[selectedSlideIds.length - 1];
      const lastIndex = slides.findIndex(s => s.id === lastSelectedId);
      const currentIndex = slides.findIndex(s => s.id === id);
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = slides.slice(start, end + 1).map(s => s.id);
        setSelectedSlideIds(prev => {
          const base = prev.filter(x => !rangeIds.includes(x));
          return [...base, ...rangeIds];
        });
        return;
      }
    }
    setSelectedSlideIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const currentFilteredIds = filteredSlides.map(s => s.id);
    const allSelectedAlready = currentFilteredIds.every(id => selectedSlideIds.includes(id));
    if (allSelectedAlready) {
      setSelectedSlideIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      setSelectedSlideIds(prev => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedSlideIds.length === 0) return;
    const newSlides = slides.filter(s => !selectedSlideIds.includes(s.id));
    setSlides(newSlides);
    setSelectedSlideIds([]);
    saveToFirebase(newSlides, folderName);
    if (enableBeeps) triggerAudioBeep(450, 'sine', 0.1);
  };

  const handleDuplicateSelected = () => {
    if (selectedSlideIds.length === 0) return;
    const newSlides: Slide[] = [];
    slides.forEach(s => {
      newSlides.push(s);
      if (selectedSlideIds.includes(s.id)) {
        newSlides.push({
          ...s,
          id: Math.random().toString(36).substring(2, 9),
          shotNo: s.shotNo + 1
        });
      }
    });
    setSlides(newSlides);
    saveToFirebase(newSlides, folderName);
    if (enableBeeps) triggerAudioBeep(520, 'sine', 0.15);
  };

  const handleBatchUpdateField = (field: keyof Slide, value: any) => {
    if (selectedSlideIds.length === 0) return;
    const newSlides = slides.map(s => 
      selectedSlideIds.includes(s.id) ? { ...s, [field]: value } : s
    );
    setSlides(newSlides);
    saveToFirebase(newSlides, folderName);
    if (enableBeeps) triggerAudioBeep(600, 'sine', 0.05);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    const draggedId = slides[draggedIndex].id;
    let newSlides = [...slides];
    if (selectedSlideIds.includes(draggedId)) {
      const selectedSlides = slides.filter(s => selectedSlideIds.includes(s.id));
      const unselectedSlides = slides.filter(s => !selectedSlideIds.includes(s.id));
      const targetSlide = slides[targetIndex];
      let insertIndex = unselectedSlides.findIndex(s => s.id === targetSlide.id);
      if (insertIndex === -1) {
        insertIndex = targetIndex;
      } else {
        if (targetIndex > draggedIndex) insertIndex += 1;
      }
      const reordered = [...unselectedSlides];
      reordered.splice(insertIndex, 0, ...selectedSlides);
      newSlides = reordered;
    } else {
      const [moved] = newSlides.splice(draggedIndex, 1);
      newSlides.splice(targetIndex, 0, moved);
    }
    setSlides(newSlides);
    saveToFirebase(newSlides, folderName);
    setDraggedIndex(null);
    setDragOverIndex(null);
    if (enableBeeps) triggerAudioBeep(650, 'sine', 0.05);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const dataUrlToUint8 = (dataUrl: string): Uint8Array => {
    const raw = atob(dataUrl.split(',')[1]);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  };

  const fetchImageAsDataUrl = async (url: string): Promise<string> => {
    if (url.startsWith('data:')) return url;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 1280;
      canvas.height = img.naturalHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL('image/png');
      }
    } catch (e) {
      console.warn(e);
    }
    return '';
  };

  const exportZip = async () => {
    if (slides.length === 0) return;
    setIsExportingZip(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(zipFileName || 'storyboard')!;
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        const num = String(i + 1).padStart(3, '0');
        const fname = `${num}_S${s.sceneNo}_Shot${s.shotNo}.png`;
        let dataUrl = '';
        if (s.imageUrl) dataUrl = await fetchImageAsDataUrl(s.imageUrl);
        if (dataUrl) {
          folder.file(fname, dataUrlToUint8(dataUrl), { binary: true });
        } else {
          const cw = ASPECT_RATIOS[selectedAspectRatio]?.canvasWidth || 1280;
          const ch = ASPECT_RATIOS[selectedAspectRatio]?.canvasHeight || 720;
          const c = document.createElement('canvas');
          c.width = cw;
          c.height = ch;
          const ctx = c.getContext('2d')!;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, cw, ch);
          ctx.fillStyle = '#475569';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(s.action || `Frame ${i + 1}`, cw / 2, ch / 2);
          folder.file(fname, dataUrlToUint8(c.toDataURL('image/png')), { binary: true });
        }
      }
      folder.file('storyboard.json', JSON.stringify({
        selectedAspectRatio,
        transitionStyle,
        slides: slides.map((s, i) => ({
          index: i,
          sceneNo: s.sceneNo,
          shotNo: s.shotNo,
          action: s.action,
          dialogue: s.dialogue,
          duration: s.duration,
          notes: s.notes,
          shotType: s.shotType || 'MS',
          colorLabel: s.colorLabel || 'none'
        })),
      }, null, 2));
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${zipFileName || 'storyboard'}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
      setShowZipDialog(false);
      if (enableBeeps) triggerAudioBeep(600, 'sine', 0.15);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingZip(false);
    }
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 640, 360);
          ctx.fillStyle = '#475569';
          ctx.font = '24px sans-serif';
          ctx.fillText('Frame Image Not Loaded', 180, 190);
        }
        const dummyImg = new Image();
        dummyImg.onload = () => resolve(dummyImg);
        dummyImg.src = canvas.toDataURL();
      };
      img.src = url;
    });
  };

  const handleDownloadPDF = async () => {
    if (isGeneratingPDF || slides.length === 0) return;
    setIsGeneratingPDF(true);
    try {
      const loadedImages = await Promise.all(slides.map(slide => loadImage(slide.imageUrl)));
      const doc = new jsPDF({
        orientation: printOrientation,
        unit: 'mm',
        format: 'a4'
      });
      const pageWidth = printOrientation === 'portrait' ? 210 : 297;
      const pageHeight = printOrientation === 'portrait' ? 297 : 210;
      const margin = 15;
      const colGap = 8;
      const rowGap = 8;
      let currentY = margin;
      let pageNum = 1;
      const drawHeader = (pNum: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(17, 24, 39);
        const titleText = printTitle || folderName || 'Storyboard Sequence';
        doc.text(titleText, margin, margin + 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text('CINEMATIC STORYBOARD SEQUENCE', margin, margin + 9);
        if (printAuthor) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(75, 85, 99);
          doc.text(`Director: ${printAuthor}`, pageWidth - margin, margin + 4, { align: 'right' });
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        const statsText = `Frames: ${slides.length} | Page ${pNum}`;
        doc.text(statsText, pageWidth - margin, margin + 9, { align: 'right' });
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.5);
        doc.line(margin, margin + 12, pageWidth - margin, margin + 12);
      };
      const drawFooter = (pNum: number) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(`Generated via FilmStrip Editor`, margin, pageHeight - 8);
        doc.text(`Page ${pNum}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
      };
      drawHeader(pageNum);
      currentY = margin + 18;
      if (printLayout === 'grid') {
        const cols = printCols;
        const colWidth = (pageWidth - 2 * margin - (cols - 1) * colGap) / cols;
        const imgHeight = colWidth * 9 / 16;
        const rows: Array<Array<{ slide: Slide; img: HTMLImageElement; index: number }>> = [];
        for (let i = 0; i < slides.length; i += cols) {
          const rowItems = [];
          for (let j = 0; j < cols && (i + j) < slides.length; j++) {
            rowItems.push({
              slide: slides[i + j],
              img: loadedImages[i + j],
              index: i + j
            });
          }
          rows.push(rowItems);
        }
        for (const row of rows) {
          const rowHeights = row.map(({ slide }) => {
            let itemHeight = imgHeight;
            if (printMeta) itemHeight += 6;
            if (printNotes && slide.action) {
              const lines = doc.splitTextToSize(slide.action, colWidth - 6);
              itemHeight += lines.length * 3.5 + 3;
            }
            if (printDialogue && slide.dialogue) {
              const lines = doc.splitTextToSize(`"${slide.dialogue}"`, colWidth - 8);
              itemHeight += lines.length * 3.5 + 5;
            }
            if (printNotes && slide.notes) {
              const lines = doc.splitTextToSize(slide.notes, colWidth - 6);
              itemHeight += lines.length * 3 + 3;
            }
            itemHeight += 5;
            return itemHeight;
          });
          const maxRowHeight = Math.max(...rowHeights);
          if (currentY + maxRowHeight > pageHeight - margin - 12) {
            drawFooter(pageNum);
            doc.addPage();
            pageNum++;
            drawHeader(pageNum);
            currentY = margin + 18;
          }
          for (let c = 0; c < row.length; c++) {
            const { slide, img, index } = row[c];
            const x = margin + c * (colWidth + colGap);
            let itemY = currentY;
            doc.setDrawColor(229, 231, 235);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(x, itemY, colWidth, maxRowHeight, 1.5, 1.5, 'FD');
            try {
              doc.addImage(img, 'PNG', x + 1, itemY + 1, colWidth - 2, imgHeight - 1);
            } catch (err) {
              console.error(err);
            }
            itemY += imgHeight + 2;
            if (printMeta) {
              doc.setFont('courier', 'bold');
              doc.setFontSize(7.5);
              doc.setTextColor(79, 70, 229);
              doc.text(`SCENE ${slide.sceneNo} · SHOT ${slide.shotNo}`, x + 3, itemY + 3);
              if (slide.shotType) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.5);
                doc.setTextColor(107, 114, 128);
                doc.text(slide.shotType.toUpperCase(), x + colWidth - 3, itemY + 3, { align: 'right' });
              }
              itemY += 5;
            }
            if (printNotes && slide.action) {
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6.5);
              doc.setTextColor(156, 163, 175);
              doc.text('ACTION / DIRECTION', x + 3, itemY + 2);
              itemY += 4.5;
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7.5);
              doc.setTextColor(55, 65, 81);
              const lines = doc.splitTextToSize(slide.action, colWidth - 6);
              doc.text(lines, x + 3, itemY);
              itemY += lines.length * 3.5;
            }
            if (printDialogue && slide.dialogue) {
              const lines = doc.splitTextToSize(`"${slide.dialogue}"`, colWidth - 8);
              const boxHeight = lines.length * 3.5 + 3.5;
              doc.setFillColor(249, 250, 251);
              doc.rect(x + 3, itemY, colWidth - 6, boxHeight, 'F');
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(7);
              doc.setTextColor(31, 41, 55);
              doc.text(lines, x + 5, itemY + 5.5);
              itemY += boxHeight + 2;
            }
          }
          currentY += maxRowHeight + rowGap;
        }
      } else {
        const imgWidth = printOrientation === 'portrait' ? 55 : 65;
        const imgHeight = imgWidth * 9 / 16;
        const rightWidth = pageWidth - 2 * margin - imgWidth - colGap;
        for (let i = 0; i < slides.length; i++) {
          const slide = slides[i];
          const img = loadedImages[i];
          let detailsHeight = 4;
          if (printMeta) detailsHeight += 6;
          if (printNotes && slide.action) {
            const lines = doc.splitTextToSize(slide.action, rightWidth - 4);
            detailsHeight += lines.length * 3.5 + 5;
          }
          const maxItemHeight = Math.max(imgHeight + 4, detailsHeight);
          if (currentY + maxItemHeight > pageHeight - margin - 12) {
            drawFooter(pageNum);
            doc.addPage();
            pageNum++;
            drawHeader(pageNum);
            currentY = margin + 18;
          }
          doc.setDrawColor(229, 231, 235);
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(margin, currentY, pageWidth - 2 * margin, maxItemHeight, 1.5, 1.5, 'FD');
          try {
            doc.addImage(img, 'PNG', margin + 2, currentY + 2, imgWidth - 2, imgHeight);
          } catch (err) {
            console.error(err);
          }
          const rightX = margin + imgWidth + colGap;
          let detailY = currentY + 2;
          if (printMeta) {
            doc.setFont('courier', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(79, 70, 229);
            doc.text(`SCENE ${slide.sceneNo} · SHOT ${slide.shotNo}`, rightX + 2, detailY + 3);
            detailY += 6;
          }
          if (printNotes && slide.action) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            const lines = doc.splitTextToSize(slide.action, rightWidth - 4);
            doc.text(lines, rightX + 2, detailY);
          }
          currentY += maxItemHeight + rowGap;
        }
      }
      drawFooter(pageNum);
      const filename = `${(printTitle || folderName || 'storyboard').toLowerCase().replace(/\s+/g, '-')}-storyboard.pdf`;
      doc.save(filename);

      if (exportToSession && onSaveArtifact) {
        try {
          const pdfDataUri = doc.output('datauristring');
          const base64Data = pdfDataUri.split(',')[1];
          const item = {
            id: `pdf-export-${Date.now()}`,
            name: filename,
            type: 'pdf' as const,
            mimeType: 'application/pdf',
            data: base64Data,
            createdAt: Date.now()
          };
          onSaveArtifact(item);
        } catch (exportErr) {
          console.error("Failed to export PDF to session:", exportErr);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const totalDurationSeconds = slides.reduce((acc, curr) => acc + (curr.duration || 3000), 0) / 1000;

  const filteredSlides = slides.filter((slide) => {
    if (!slide) return false;
    const action = slide.action || '';
    const dialogue = slide.dialogue || '';
    const notes = slide.notes || '';
    const sceneNo = slide.sceneNo !== undefined ? String(slide.sceneNo) : '';
    const matchesSearch = 
      action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dialogue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `scene ${sceneNo}`.includes(searchQuery.toLowerCase());
    const slideColor = slide.colorLabel || 'none';
    const matchesColor = colorFilter === 'all' || slideColor === colorFilter;
    return matchesSearch && matchesColor;
  });

  const selectedTheme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];
  const effectiveTransitionStyle = isTransitionEnabled ? transitionStyle : 'none';

  return (
    <>
      <style>{`
        :root {
          ${Object.entries(selectedTheme.variables).map(([key, val]) => {
            if (customBgColor) {
              if (key === '--theme-bg-app') return `${key}: ${customBgColor};`;
              if (key === '--theme-bg-header') return `${key}: ${customBgColor};`;
              if (key === '--theme-bg-panel') return `${key}: ${customBgColor};`;
              if (key === '--theme-badge-bg') return `${key}: ${customBgColor};`;
              if (key === '--theme-border') return `${key}: ${customBgColor}40;`;
            }
            if (customTextColor) {
              if (key === '--theme-text-primary') return `${key}: ${customTextColor};`;
              if (key === '--theme-text-heading') return `${key}: ${customTextColor};`;
              if (key === '--theme-text-muted') return `${key}: ${customTextColor}b3;`;
            }
            return `${key}: ${val};`;
          }).join('\n          ')}
        }
        .bg-theme-app { background-color: var(--theme-bg-app) !important; }
        .bg-theme-header { background-color: var(--theme-bg-header) !important; }
        .bg-theme-panel { background-color: var(--theme-bg-panel) !important; }
        .border-theme { border-color: var(--theme-border) !important; }
        .text-theme-primary { color: var(--theme-text-primary) !important; }
        .text-theme-heading { color: var(--theme-text-heading) !important; }
        .text-theme-muted { color: var(--theme-text-muted) !important; }
        .bg-theme-badge { background-color: var(--theme-badge-bg) !important; }
        .bg-theme-accent { background-color: var(--theme-accent) !important; }
        .text-theme-accent { color: var(--theme-accent-text) !important; }
        .bg-theme-app .text-neutral-100 { color: var(--theme-text-heading) !important; }
        .bg-theme-app .text-neutral-300 { color: var(--theme-text-primary) !important; }
        .bg-theme-app .text-neutral-400 { color: var(--theme-text-muted) !important; }

        @keyframes fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-out-left {
          from { transform: translateX(0); }
          to { transform: translateX(-100%); }
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes zoom-out {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(1.1); opacity: 0; }
        }
        @keyframes zoom-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes blur-out {
          from { filter: blur(0px); opacity: 1; }
          to { filter: blur(12px); opacity: 0; }
        }
        @keyframes blur-in {
          from { filter: blur(12px); opacity: 0; }
          to { filter: blur(0px); opacity: 1; }
        }
        @keyframes slide-out-up {
          from { transform: translateY(0); }
          to { transform: translateY(-100%); }
        }
        @keyframes slide-in-down {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .animate-fade-out { animation: fade-out cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-fade-in-fast { animation: fade-in cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-slide-out-left { animation: slide-out-left cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-slide-in-right { animation: slide-in-right cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-zoom-out { animation: zoom-out cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-zoom-in { animation: zoom-in cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-blur-out { animation: blur-out cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-blur-in { animation: blur-in cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-slide-out-up { animation: slide-out-up cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-slide-in-down { animation: slide-in-down cubic-bezier(0.4, 0, 0.2, 1) forwards; }
      `}</style>

      <div className="flex flex-col h-screen bg-[#09090b] bg-theme-app text-neutral-300 text-theme-primary overflow-hidden font-sans print:hidden">
        {/* Header bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 border-theme bg-[#0c0c0e] bg-theme-header shrink-0 z-10">
          <div className="flex items-center gap-6">
            {/* Settings dropdown - far left */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-lg border transition-all cursor-pointer shadow-sm",
                  showSettingsDropdown 
                    ? "bg-orange-600/25 border-orange-500/40 text-orange-400" 
                    : "bg-orange-600/15 border-orange-500/20 text-orange-400 hover:bg-orange-600/25"
                )}
                title="Appearance Settings"
              >
                <Settings className="w-4 h-4 text-orange-400" />
              </button>
              {showSettingsDropdown && (
                <div className="absolute left-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-2xl z-[150] text-neutral-100">
                  <h4 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider mb-3">Preset Themes</h4>
                  <div className="grid grid-cols-2 gap-1.5 mb-4">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleSetTheme(t.id)}
                        className={cn(
                          "flex items-center gap-1.5 p-2 rounded-lg border text-[10px] font-bold transition-all cursor-pointer truncate",
                          currentThemeId === t.id ? "border-indigo-500 bg-indigo-500/10 text-white font-black" : "border-neutral-800 bg-neutral-950/40 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200"
                        )}
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-neutral-700" style={{ background: t.variables['--theme-bg-panel'] }} />
                        <span className="truncate">{t.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="h-px bg-neutral-800 my-3" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-400">
                      <span>Custom BG</span>
                      <input type="color" value={customBgColor || selectedTheme.variables['--theme-bg-app']} onChange={(e) => handleSetCustomBgColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-neutral-800 bg-neutral-950" />
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-400">
                      <span>Custom Text</span>
                      <input type="color" value={customTextColor || selectedTheme.variables['--theme-text-primary']} onChange={(e) => handleSetCustomTextColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-neutral-800 bg-neutral-950" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <h1 className="text-lg font-black tracking-tight text-white text-theme-heading flex items-center gap-2">
              <Film className="w-5 h-5 text-indigo-500" />
              <span>FilmStrip Editor</span>
            </h1>
            <div className="h-4 w-px bg-neutral-800 border-theme" />
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value);
                  saveToFirebase(slides, e.target.value);
                }}
                className="bg-transparent border border-transparent hover:border-neutral-800 focus:border-indigo-500 focus:bg-[#121215] hover:border-theme focus:bg-theme-panel px-2 py-1 rounded text-sm text-white text-theme-heading font-extrabold transition-all outline-none max-w-[200px]"
              />
              <div className="text-[11px] text-emerald-500 font-mono font-bold flex items-center gap-1.5 bg-emerald-950/20 px-2.5 py-1 rounded-md border border-emerald-500/30">
                <span className="text-emerald-400 font-extrabold">{slides.length}</span> frames • 
                <span className="text-emerald-400 font-extrabold">{totalDurationSeconds.toFixed(1)}s</span> sequence
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setZipFileName(folderName);
                setShowZipDialog(true);
              }} 
              disabled={slides.length === 0} 
              className="flex items-center justify-center w-9 h-9 bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 rounded-lg border border-blue-500/20 border-theme transition-all disabled:opacity-40"
              title="Export Project ZIP"
            >
              <Download className="w-4 h-4 text-blue-400" />
            </button>
   
            <button 
              onClick={() => setShowPrintPreview(true)} 
              disabled={slides.length === 0} 
              className="flex items-center justify-center w-9 h-9 bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 rounded-lg border border-rose-500/20 border-theme transition-all disabled:opacity-40 cursor-pointer text-xs"
              title="Export to PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Session / Project Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowProjectDropdown(!showProjectDropdown);
                  setShowSettingsDropdown(false);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 rounded-lg border transition-all cursor-pointer shadow-sm text-xs h-9 font-bold",
                  showProjectDropdown 
                    ? "bg-indigo-600/25 border-indigo-500/40 text-indigo-400" 
                    : "bg-indigo-600/15 border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/25"
                )}
                title="Manage Storyboard Projects & Sessions"
              >
                <FolderPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Session / Project</span>
              </button>
              {showProjectDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-neutral-950 bg-theme-panel border border-neutral-800 border-theme rounded-xl p-4 shadow-2xl z-[150] text-theme-primary text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-extrabold text-neutral-400 text-theme-muted uppercase tracking-wider">Local Storyboards</h4>
                    <button
                      onClick={() => {
                        const name = prompt("Enter a name for the new storyboard project:", "My-Storyboard");
                        if (name !== null) handleCreateNewProject(name);
                      }}
                      className="p-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded transition-all flex items-center justify-center gap-1 font-bold text-[10px] px-1.5 cursor-pointer"
                      title="Create New Project"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>
                  
                  {/* Local Projects list */}
                  <div className="space-y-1 max-h-40 overflow-y-auto mb-3 pr-1">
                    {projectList.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setStoryboardId(p.id);
                          setShowProjectDropdown(false);
                        }}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border group",
                          storyboardId === p.id 
                            ? "bg-indigo-600/15 border-indigo-500/40 text-white" 
                            : "bg-neutral-900/40 border-neutral-800/50 hover:bg-neutral-800/50 text-neutral-300"
                        )}
                      >
                        <span className="truncate font-semibold max-w-[160px]">{p.name}</span>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {p.id !== 'default-filmstrip' && (
                            <button
                              onClick={(e) => handleDeleteProject(p.id, e)}
                              className="p-1 text-neutral-500 hover:text-red-400 rounded transition-colors"
                              title="Delete project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-neutral-800 border-theme my-2.5" />
                  
                  <h4 className="text-[10px] font-extrabold text-neutral-400 text-theme-muted uppercase tracking-wider mb-2">Canvas Control</h4>
                  <button
                    onClick={() => {
                      setShowProjectDropdown(false);
                      handleClearStoryboard();
                    }}
                    className="w-full text-left p-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/10 transition-all font-semibold flex items-center gap-2 mb-3 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Flush Canvas (Reset)</span>
                  </button>

                  <div className="h-px bg-neutral-800 border-theme my-2.5" />
                  
                  <h4 className="text-[10px] font-extrabold text-neutral-400 text-theme-muted uppercase tracking-wider mb-2">Workspace Session</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setShowProjectDropdown(false);
                        handleSaveToWorkspaceSession();
                      }}
                      disabled={!onSaveArtifact}
                      className="w-full text-left p-2 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/10 transition-all font-semibold flex items-center gap-2 disabled:opacity-45 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Snapshot to Session</span>
                    </button>

                    {onSaveArtifact && getWorkspaceStoryboards().length > 0 ? (
                      <div className="mt-2">
                        <div className="text-[10px] text-neutral-400 mb-1.5 font-bold">Load Snapshot:</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {getWorkspaceStoryboards().map((item: any) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                setShowProjectDropdown(false);
                                handleLoadFromWorkspaceItem(item);
                              }}
                              className="p-1.5 rounded bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 cursor-pointer text-neutral-300 truncate font-mono text-[10px]"
                              title={`Load ${item.name}`}
                            >
                              {item.name.replace('Storyboard: ', '')}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-neutral-500 italic mt-1 text-center">
                        No storyboard snapshots in workspace.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {onBack && (
              <button 
                onClick={onBack}
                className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 hover:border-rose-600 rounded-lg text-xs font-black transition-all duration-150 cursor-pointer shadow flex items-center gap-1.5 h-9"
              >
                <span>Exit</span>
              </button>
            )}
          </div>
        </header>

        {/* Control Rail */}
        <div className="relative flex items-center justify-between px-6 py-2 border-b border-neutral-800/60 border-theme bg-[#0a0a0b] bg-theme-app shrink-0 z-10 text-xs">
          <div className="flex items-center gap-4">
            {activeLayout !== 'player' && (
              <div className="relative flex items-center shrink-0">
                <Search className="w-4 h-4 text-[#10b981] absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search actions, script..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#0b131c]/55 border border-emerald-950/60 rounded-xl pl-9 pr-3 py-1.5 w-64 text-xs text-neutral-300 placeholder:text-emerald-800/80 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            )}

            <button onClick={() => setShowUpload(true)} className="w-7 h-7 flex items-center justify-center bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 hover:border-emerald-500/30 rounded-lg transition-all" title="Import frames"><FolderPlus className="w-3.5 h-3.5" /></button>
            <div className="relative">
              <button onClick={() => setShowAddBlankDropdown(!showAddBlankDropdown)} className="w-7 h-7 flex items-center justify-center bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 rounded-lg" title="Add blank frame"><Plus className="w-3.5 h-3.5" /></button>
              {showAddBlankDropdown && (
                <div className="absolute left-0 mt-1.5 w-44 bg-[#0e0e11] border border-neutral-800 rounded-xl p-2 z-40">
                  <button onClick={() => handleAddBlankFrame('#000000')} className="w-full text-left text-[11px] p-1.5 rounded hover:bg-neutral-800">Black Canvas</button>
                  <button onClick={() => handleAddBlankFrame('#ffffff')} className="w-full text-left text-[11px] p-1.5 rounded hover:bg-neutral-800">White Canvas</button>
                  <button onClick={() => handleAddBlankFrame('#1a1a1c')} className="w-full text-left text-[11px] p-1.5 rounded hover:bg-neutral-800">Gray Canvas</button>
                </div>
              )}
            </div>
            <button onClick={handleAutoNumber} disabled={slides.length === 0} className="w-7 h-7 flex items-center justify-center bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 rounded-lg disabled:opacity-40" title="Auto-Number"><ListOrdered className="w-3.5 h-3.5" /></button>

            <div className="h-5 w-[1px] bg-neutral-800 border-theme self-center mx-1 shrink-0" />

            <div className="flex bg-[#0f1d1a]/65 p-1 rounded-xl border border-emerald-900/40 items-center gap-1 shrink-0">
              <button 
                onClick={() => setActiveLayout('grid')} 
                className={cn(
                  "p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center",
                  activeLayout === 'grid' 
                    ? "bg-[#059669] text-white shadow-md shadow-[#059669]/20" 
                    : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
                )}
                title="Grid Storyboard"
              >
                <Layout className="w-4.5 h-4.5" />
              </button>
              <button 
                onClick={() => {
                  setActiveLayout('spreadsheet');
                  setViewDensity('strip');
                }} 
                className={cn(
                  "p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center",
                  activeLayout === 'spreadsheet' 
                    ? "bg-[#059669] text-white shadow-md shadow-[#059669]/20" 
                    : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
                )}
                title="List Sequencer"
              >
                <ListVideo className="w-4.5 h-4.5" />
              </button>
              {activeLayout !== 'player' && (
                <button 
                  onClick={() => setActiveLayout('player')} 
                  className={cn(
                    "p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center",
                    (activeLayout as string) === 'player' 
                      ? "bg-[#059669] text-white shadow-md shadow-[#059669]/20" 
                      : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
                  )}
                  title="Playback / Preview"
                >
                  <PlayCircle className="w-4.5 h-4.5" />
                </button>
              )}
            </div>

            {activeLayout !== 'player' && (
              <button
                onClick={() => setViewDensity(prev => prev === 'full' ? 'compact' : prev === 'compact' ? 'strip' : prev === 'strip' ? 'icon' : 'full')}
                className="p-2 bg-[#0f1d1a]/65 text-emerald-400 rounded-xl border border-emerald-900/40 hover:bg-emerald-900/20 hover:text-emerald-300 transition-all flex items-center justify-center cursor-pointer shrink-0"
                title={`Cycle view density (Current: ${viewDensity.toUpperCase()})`}
              >
                <Menu className="w-4.5 h-4.5" />
              </button>
            )}
          </div>

          {activeLayout === 'player' && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#0d1c1a] bg-theme-badge p-1 rounded-xl border border-emerald-900/40 border-theme">
              <button onClick={() => { setCurrentSlideIndex(0); setIsPlaying(false); }} className="p-1.5 hover:bg-neutral-850 rounded" title="Reset playhead"><RotateCcw className="w-3.5 h-3.5" /></button>
              <button onClick={() => currentSlideIndex > 0 && setCurrentSlideIndex(prev => prev - 1)} disabled={currentSlideIndex === 0} className="p-1.5 hover:bg-neutral-850 disabled:opacity-20 rounded"><SkipBack className="w-3.5 h-3.5" /></button>
              <button onClick={() => setIsPlaying(!isPlaying)} className="w-7 h-7 bg-emerald-600 hover:bg-emerald-500 rounded-full flex items-center justify-center text-white"><Play className="w-3.5 h-3.5 ml-0.5 fill-white" /></button>
              <button onClick={() => currentSlideIndex < slides.length - 1 && setCurrentSlideIndex(prev => prev + 1)} disabled={currentSlideIndex === slides.length - 1} className="p-1.5 hover:bg-neutral-850 disabled:opacity-20 rounded"><SkipForward className="w-3.5 h-3.5" /></button>
              <button onClick={() => setIsLooping(!isLooping)} className={cn("p-1.5 rounded", isLooping ? "bg-emerald-600/20 text-emerald-400" : "text-neutral-500 hover:text-emerald-400")}><Repeat className="w-3.5 h-3.5" /></button>
              <button onClick={() => setVoiceoverEnabled(!voiceoverEnabled)} className={cn("p-1.5 rounded", voiceoverEnabled ? "bg-indigo-600/20 text-indigo-400" : "text-neutral-500 hover:text-indigo-400")}><Mic className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEnableBeeps(!enableBeeps)} className="p-1.5 rounded text-neutral-400 hover:text-white" title="Toggle Beeps">
                {enableBeeps ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          <div className="flex items-center gap-4">
            {activeLayout === 'player' && (
              <div className="flex items-center gap-2.5 bg-[#0e0e11]/90 border border-neutral-800/80 px-3 py-1.5 rounded-xl text-theme-primary">
                {/* Transition Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowTransitionDropdown(!showTransitionDropdown)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-neutral-850 text-emerald-400 hover:text-emerald-300 font-bold transition-all cursor-pointer text-xs"
                    title="Transition Style"
                  >
                    <span>
                      {TRANSITION_OPTIONS.find(o => o.value === (isTransitionEnabled ? transitionStyle : 'none'))?.label || 'Cross-Fade'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-emerald-500" />
                  </button>
                  {showTransitionDropdown && (
                    <div className="absolute right-0 bottom-full mb-1 w-40 bg-[#0c0c0e] border border-neutral-800 rounded-xl p-1 z-50 shadow-2xl">
                      {TRANSITION_OPTIONS.map((opt) => {
                        const isSelected = isTransitionEnabled ? (transitionStyle === opt.value) : (opt.value === 'none');
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              if (opt.value === 'none') {
                                setIsTransitionEnabled(false);
                              } else {
                                setTransitionStyle(opt.value);
                                setIsTransitionEnabled(true);
                              }
                              setShowTransitionDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left text-[11px] p-2 rounded-lg transition-all cursor-pointer font-bold",
                              isSelected 
                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" 
                                : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Transition Enable Checkbox */}
                <button
                  onClick={() => setIsTransitionEnabled(!isTransitionEnabled)}
                  className={cn(
                    "w-4 h-4 rounded-md flex items-center justify-center transition-all border cursor-pointer",
                    isTransitionEnabled 
                      ? "bg-blue-600 border-blue-500 text-white" 
                      : "bg-neutral-900 border-neutral-800 text-transparent"
                  )}
                  title={isTransitionEnabled ? "Disable transitions" : "Enable transitions"}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </button>

                {/* Speed Slider */}
                <div className="flex items-center gap-2 bg-black/40 border border-neutral-850 px-2.5 py-1 rounded-lg">
                  <span className="text-[10px] font-black text-[#10b981] font-mono tracking-wider">SPEED:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={transitionDuration}
                    onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                  />
                  <span className="text-[11px] font-black text-[#10b981] font-mono shrink-0">{transitionDuration.toFixed(1)}s</span>
                </div>

                {/* Divider */}
                <div className="h-4 w-px bg-neutral-800 border-theme" />

                {/* Frame count indicator */}
                <div className="text-[11px] text-emerald-400 font-mono font-black border border-emerald-500/20 bg-emerald-950/10 px-2 py-0.5 rounded-lg shrink-0">
                  Frame {currentSlideIndex + 1} / {slides.length}
                </div>
              </div>
            )}

            {activeLayout !== 'player' && (
              <button onClick={() => setShowScriptEditor(!showScriptEditor)} className={cn("px-2.5 py-1 rounded-lg border font-bold transition-all", showScriptEditor ? "bg-emerald-600 text-white" : "text-emerald-400 border-emerald-900/40")}>
                Screenplay
              </button>
            )}
          </div>
        </div>

        {/* Main Split Body */}
        <div className="flex-1 overflow-hidden relative flex flex-row">
          {slides.length === 0 ? (
            <div className="flex-1 h-full flex flex-col items-center justify-center p-6 text-center">
              <Film className="w-12 h-12 text-neutral-600 mb-3 animate-pulse" />
              <h3 className="text-sm font-black text-white">No Storyboard Frames Loaded</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm">Import files from folders or append blank canvases to script custom visual layouts.</p>
              <div className="flex gap-2.5 mt-4">
                <button onClick={() => setShowUpload(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all">Import Frames</button>
                <button onClick={() => handleAddBlankFrame('#1a1a1c')} className="px-4 py-2 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-lg text-xs font-bold transition-all">Add Blank Frame</button>
              </div>
            </div>
          ) : (
            <>
              {/* Left Workspace */}
              <div className="flex-1 h-full overflow-hidden flex flex-col relative">
                <div className="h-full overflow-y-auto">
                  {activeLayout === 'grid' && (
                    <div className={cn(
                      "p-6 grid gap-6",
                      viewDensity === 'full' && "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
                      viewDensity === 'compact' && "grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4",
                      viewDensity === 'strip' && "grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3",
                      viewDensity === 'icon' && "grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2"
                    )}>
                      {filteredSlides.map((slide, index) => {
                        const globalIndex = slides.findIndex(s => s.id === slide.id);
                        return (
                          <div 
                            key={slide.id}
                            onClick={() => handleSelectSlide(slide.id)}
                            onDoubleClick={() => handleEditFrame(slide.imageUrl || '', globalIndex)}
                            className={cn(
                              "bg-[#0c0c0e] bg-theme-panel border border-neutral-800/80 border-theme rounded-xl overflow-hidden shadow-xl flex flex-col group transition-all text-theme-primary cursor-pointer",
                              activeSlideId === slide.id ? "ring-2 ring-indigo-500 border-indigo-500/50" : ""
                            )}
                          >
                            <div className="relative bg-black select-none overflow-hidden group/frame flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
                              {slide.imageUrl ? (
                                <img 
                                  src={slide.imageUrl} 
                                  alt="" 
                                  className={cn("w-full h-full", slide.fitMode === 'cover' ? "object-cover" : "object-contain")} 
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.parentElement?.querySelector('.image-fallback-placeholder');
                                    if (fallback) {
                                      fallback.classList.remove('hidden');
                                      fallback.classList.add('flex');
                                    }
                                  }}
                                />
                              ) : null}
                              <div className={cn("image-fallback-placeholder absolute inset-0 bg-[#0c0c0e] flex-col items-center justify-center text-center gap-2 p-4 border border-dashed border-neutral-800/80", slide.imageUrl ? "hidden" : "flex")}>
                                <Film className="w-8 h-8 text-neutral-600 animate-pulse" />
                                <span className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider">Image File Missing</span>
                                <button onClick={(e) => { e.stopPropagation(); triggerReplaceFile(globalIndex); }} className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold rounded transition-colors flex items-center gap-1 shadow-md shadow-sky-600/10">
                                  <Upload className="w-3 h-3" /> Link Image File
                                </button>
                              </div>
                              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/frame:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleEditFrame(slide.imageUrl || '', globalIndex); }} 
                                  className="p-2 bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-400 hover:text-indigo-300 border border-indigo-500/40 rounded-lg transition-all shadow-lg" 
                                  title="Vector Edit"
                                >
                                  <SlidersHorizontal className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleEditGridFrame(slide.imageUrl || '', globalIndex); }} 
                                  className="p-2 bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 rounded-lg transition-all shadow-lg" 
                                  title="Grid Edit"
                                >
                                  <Layout className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); triggerReplaceFile(globalIndex); }} 
                                  className="p-2 bg-sky-950/80 hover:bg-sky-900/90 text-sky-400 hover:text-sky-300 border border-sky-500/40 rounded-lg transition-all shadow-lg" 
                                  title="Replace File"
                                >
                                  <Upload className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="absolute top-2 left-2 bg-black/75 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">
                                Scene {slide.sceneNo} • Shot {slide.shotNo}
                              </div>
                            </div>

                            {viewDensity !== 'icon' && (
                              <div className="p-3 flex-1 flex flex-col gap-2.5 border-t border-neutral-900 border-theme text-left" onClick={(e) => e.stopPropagation()}>
                                <div className="grid grid-cols-2 gap-2">
                                  <select value={slide.shotType || 'MS'} onChange={(e) => handleUpdateSlideField(globalIndex, 'shotType', e.target.value)} className="bg-[#121215] border border-neutral-800 rounded px-1.5 py-1 text-[11px] font-bold">
                                    {SHOT_TYPES.map(st => (
                                      <option key={st.id} value={st.id}>{st.label}</option>
                                    ))}
                                  </select>
                                  <div className="flex items-center bg-[#121215] border border-neutral-800 rounded px-2 py-0.5">
                                    <input type="number" step="0.5" value={((slide.duration || 3000) / 1000).toFixed(1)} onChange={(e) => handleUpdateSlideField(globalIndex, 'duration', parseFloat(e.target.value) * 1000)} className="w-full bg-transparent text-[11px] font-mono outline-none text-center font-bold" />
                                    <span className="text-[10px] text-neutral-500 font-mono">s</span>
                                  </div>
                                </div>
                                <input type="text" value={slide.action} onChange={(e) => handleUpdateSlideField(globalIndex, 'action', e.target.value)} placeholder="Action text..." className="bg-[#121215] border border-neutral-800 rounded p-1.5 text-[11px] outline-none" />
                                {viewDensity === 'full' && (
                                  <>
                                    <input type="text" value={slide.dialogue} onChange={(e) => handleUpdateSlideField(globalIndex, 'dialogue', e.target.value)} placeholder="Dialogue..." className="bg-[#121215] border border-neutral-800 rounded p-1.5 text-[11px] outline-none text-indigo-300 font-bold italic" />
                                    <div className="flex items-center justify-between mt-1 text-[10px] border-t border-neutral-900/60 pt-2">
                                      <div className="flex gap-1">
                                        <button onClick={() => handleMoveSlide(globalIndex, 'left')} disabled={globalIndex === 0} className="p-1 hover:bg-neutral-800 rounded"><ChevronLeft className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleMoveSlide(globalIndex, 'right')} disabled={globalIndex === slides.length - 1} className="p-1 hover:bg-neutral-800 rounded"><ChevronRight className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDuplicateSlide(globalIndex)} className="p-1 hover:bg-neutral-800 text-indigo-400 rounded" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => { setZoomVariationsSource(slide); }} className="p-1 hover:bg-neutral-800 text-emerald-400 rounded" title="3x Zooms"><Sparkles className="w-3.5 h-3.5" /></button>
                                      </div>
                                      <button onClick={() => setSlides(prev => prev.filter((_, i) => i !== globalIndex))} className="p-1 hover:bg-rose-950/40 text-rose-400 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeLayout === 'spreadsheet' && (
                    <div className="p-6">
                      {/* Batch Action bar when items are selected */}
                      {selectedSlideIds.length > 0 && (
                        <div className="mb-4 bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl backdrop-blur-md">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-xs font-black text-indigo-200 uppercase tracking-wider">
                              {selectedSlideIds.length} of {slides.length} Selected
                            </span>
                            <button 
                              onClick={() => setSelectedSlideIds([])}
                              className="text-[10px] text-indigo-400 hover:text-indigo-200 underline font-extrabold"
                            >
                              Deselect All
                            </button>
                          </div>

                          <div className="flex items-center flex-wrap gap-4 text-xs font-medium">
                            {/* Batch Operations */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleDuplicateSelected}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#121215] border border-neutral-800 hover:border-neutral-700 hover:text-white text-neutral-300 rounded-lg transition-colors font-bold cursor-pointer"
                                title="Duplicate all selected slides"
                              >
                                <Copy className="w-3.5 h-3.5 text-neutral-400" /> Duplicate
                              </button>
                              <button
                                onClick={handleDeleteSelected}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/20 border border-rose-500/20 hover:border-rose-500/50 hover:bg-rose-500/10 text-rose-400 rounded-lg transition-colors font-bold cursor-pointer"
                                title="Delete all selected slides"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Delete
                              </button>
                            </div>

                            <div className="h-5 w-px bg-neutral-800" />

                            {/* Fit Screen (Contain / Cover) */}
                            {(() => {
                              const selectedSlides = slides.filter(s => selectedSlideIds.includes(s.id));
                              const firstSelectedFit = selectedSlides.length > 0 ? (selectedSlides[0].fitMode || 'contain') : 'contain';
                              return (
                                <div className="flex items-center gap-1.5 bg-[#121215] px-2 py-1 rounded-lg border border-neutral-800">
                                  <span className="text-[10px] text-neutral-500 font-bold uppercase mr-1">Fit Screen:</span>
                                  <button
                                    onClick={() => handleBatchUpdateField('fitMode', 'contain')}
                                    className={cn(
                                      "px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer",
                                      firstSelectedFit === 'contain'
                                        ? "bg-indigo-600 border-indigo-500 text-white shadow-md hover:bg-indigo-500"
                                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800"
                                    )}
                                    title="Fit entire image on screen with letterboxing"
                                  >
                                    Contain
                                  </button>
                                  <button
                                    onClick={() => handleBatchUpdateField('fitMode', 'cover')}
                                    className={cn(
                                      "px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer",
                                      firstSelectedFit === 'cover'
                                        ? "bg-indigo-600 border-indigo-500 text-white shadow-md hover:bg-indigo-500"
                                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800"
                                    )}
                                    title="Zoom to fill entire screen (no bars)"
                                  >
                                    Cover (Full)
                                  </button>
                                </div>
                              );
                            })()}

                            <div className="h-5 w-px bg-neutral-800" />

                            {/* Batch Change Properties */}
                            <div className="flex items-center gap-3">
                              {/* Batch Duration */}
                              <div className="flex items-center gap-1.5 bg-[#121215] px-2 py-1 rounded-lg border border-neutral-800">
                                <span className="text-[10px] text-neutral-500 font-bold uppercase">Duration:</span>
                                <select
                                  onChange={(e) => handleBatchUpdateField('duration', parseFloat(e.target.value) * 1000)}
                                  defaultValue=""
                                  className="bg-transparent text-neutral-300 outline-none text-[11px] font-bold cursor-pointer"
                                >
                                  <option value="" disabled className="bg-[#0C0C0E]">Change...</option>
                                  <option value="0.5" className="bg-[#0C0C0E]">0.5s</option>
                                  <option value="1" className="bg-[#0C0C0E]">1.0s</option>
                                  <option value="2" className="bg-[#0C0C0E]">2.0s</option>
                                  <option value="3" className="bg-[#0C0C0E]">3.0s</option>
                                  <option value="4" className="bg-[#0C0C0E]">4.0s</option>
                                  <option value="5" className="bg-[#0C0C0E]">5.0s</option>
                                  <option value="8" className="bg-[#0C0C0E]">8.0s</option>
                                </select>
                              </div>

                              {/* Batch Shot Type */}
                              <div className="flex items-center gap-1.5 bg-[#121215] px-2 py-1 rounded-lg border border-neutral-800">
                                <span className="text-[10px] text-neutral-500 font-bold uppercase">Shot:</span>
                                <select
                                  onChange={(e) => handleBatchUpdateField('shotType', e.target.value)}
                                  defaultValue=""
                                  className="bg-transparent text-neutral-300 outline-none text-[11px] font-bold cursor-pointer"
                                >
                                  <option value="" disabled className="bg-[#0C0C0E]">Change...</option>
                                  {SHOT_TYPES.map(st => (
                                    <option key={st.id} value={st.id} className="bg-[#0C0C0E]">{st.label}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Batch Color Labels */}
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-neutral-500 font-bold uppercase mr-1">Label:</span>
                                {COLOR_LABELS.map(cl => (
                                  <button
                                    key={cl.id}
                                    onClick={() => handleBatchUpdateField('colorLabel', cl.id)}
                                    className="w-3.5 h-3.5 rounded-full border border-black/40 hover:scale-110 transition-transform relative cursor-pointer"
                                    style={{ backgroundColor: cl.color === 'transparent' ? '#374151' : cl.color }}
                                    title={`Label all selected as ${cl.label}`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="border border-neutral-800 border-theme rounded-xl overflow-hidden bg-[#0C0C0E] bg-theme-panel">
                        <table className="w-full border-collapse text-left text-xs text-theme-primary">
                          <thead>
                            <tr className="bg-neutral-900 bg-theme-badge border-b border-neutral-800 border-theme text-neutral-400 text-theme-muted font-extrabold select-none">
                              <th className="px-2 py-3 w-8 text-center">Grip</th>
                              <th className="px-3 py-3 w-10">
                                <input 
                                  type="checkbox" 
                                  checked={filteredSlides.length > 0 && filteredSlides.every(s => selectedSlideIds.includes(s.id))} 
                                  onChange={handleToggleSelectAll}
                                  className="rounded border-neutral-700 bg-neutral-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                                />
                              </th>
                              <th className="px-4 py-3 w-14">No</th>
                              <th className="px-4 py-3 w-28">Preview</th>
                              <th className="px-4 py-3 w-32">Scene & Shot</th>
                              {viewDensity !== 'strip' && viewDensity !== 'icon' && (
                                <>
                                  <th className="px-4 py-3 w-32">Shot Type</th>
                                  <th className="px-4 py-3 w-28">Duration</th>
                                  <th className="px-4 py-3 w-28">Fit Mode</th>
                                  <th className="px-4 py-3 w-36">Color Label</th>
                                </>
                              )}
                              {viewDensity !== 'icon' && (
                                <th className="px-4 py-3">Visual Action & Cues</th>
                              )}
                              <th className="px-4 py-3 w-20 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-900">
                            {filteredSlides.map((slide, index) => {
                              const globalIndex = slides.findIndex(s => s.id === slide.id);
                              const isSelected = selectedSlideIds.includes(slide.id);
                              const isDragged = draggedIndex === globalIndex;
                              const isDragTarget = dragOverIndex === globalIndex;

                              const rowPadding = cn(
                                viewDensity === 'compact' && "px-3 py-1.5",
                                viewDensity === 'strip' && "px-3 py-2",
                                viewDensity === 'icon' && "px-2 py-1",
                                viewDensity === 'full' && "px-4 py-3"
                              );

                              return (
                                <tr 
                                  key={slide.id} 
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, globalIndex)}
                                  onDragOver={(e) => handleDragOver(e, globalIndex)}
                                  onDrop={(e) => handleDrop(e, globalIndex)}
                                  onDragEnd={handleDragEnd}
                                  className={cn(
                                    "transition-all border-b border-neutral-900/60 border-theme cursor-pointer",
                                    isSelected ? "bg-indigo-600/10 hover:bg-indigo-600/15 text-theme-primary" : "hover:bg-neutral-900/40 bg-[#0C0C0E] bg-theme-panel text-theme-primary",
                                    activeSlideId === slide.id ? "ring-2 ring-indigo-500/85 bg-indigo-950/10" : "",
                                    isDragged ? "opacity-35 border-2 border-dashed border-indigo-500" : "",
                                    isDragTarget ? "border-t-4 border-t-indigo-500 bg-indigo-500/5" : ""
                                  )}
                                  onClick={() => handleSelectSlide(slide.id)}
                                  onDoubleClick={() => handleEditFrame(slide.imageUrl || '', globalIndex)}
                                >
                                  {/* Drag Grip Handle */}
                                  <td className={cn(rowPadding, "text-center cursor-grab active:cursor-grabbing text-neutral-600 hover:text-neutral-400 transition-colors")} onClick={(e) => e.stopPropagation()}>
                                    <GripVertical className="w-4 h-4 mx-auto" />
                                  </td>

                                  {/* Select Checkbox */}
                                  <td className={rowPadding} onClick={(e) => e.stopPropagation()}>
                                    <input 
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => handleToggleSelectSlide(slide.id, { shiftKey: (e.nativeEvent as MouseEvent).shiftKey })}
                                      className="rounded border-neutral-700 bg-neutral-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                                    />
                                  </td>

                                  <td className={cn(rowPadding, "font-mono text-neutral-500 font-bold")}>{globalIndex + 1}</td>
                                  <td className={rowPadding}>
                                    <div 
                                      className={cn(
                                        "aspect-video rounded bg-black overflow-hidden relative border border-neutral-800 hover:scale-105 transition-transform cursor-pointer group/thumb flex items-center justify-center",
                                        (viewDensity === 'compact' || viewDensity === 'strip' || viewDensity === 'icon') ? "w-14" : "w-20"
                                      )}
                                    >
                                      {slide.imageUrl ? (
                                        <img 
                                          src={slide.imageUrl} 
                                          alt="" 
                                          className={cn("w-full h-full", slide.fitMode === 'cover' ? "object-cover" : "object-contain")} 
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const fallback = e.currentTarget.parentElement?.querySelector('.thumb-fallback-placeholder');
                                            if (fallback) {
                                              fallback.classList.remove('hidden');
                                              fallback.classList.add('flex');
                                            }
                                          }}
                                        />
                                      ) : null}
                                      <div className={cn("thumb-fallback-placeholder absolute inset-0 bg-[#0c0c0e] flex-col items-center justify-center text-center gap-1 border border-dashed border-neutral-800/80", slide.imageUrl ? "hidden" : "flex")}>
                                        <Film className="w-4 h-4 text-neutral-600" />
                                      </div>
                                      <div className="absolute inset-0 bg-black/85 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center gap-1 transition-opacity z-10">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleEditFrame(slide.imageUrl || '', globalIndex); }}
                                          className="p-1 bg-indigo-950/80 hover:bg-indigo-900/95 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded cursor-pointer transition-colors"
                                          title="Vector Edit"
                                        >
                                          <SlidersHorizontal className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleEditGridFrame(slide.imageUrl || '', globalIndex); }}
                                          className="p-1 bg-emerald-950/80 hover:bg-emerald-900/95 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded cursor-pointer transition-colors"
                                          title="Grid Edit"
                                        >
                                          <Layout className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); triggerReplaceFile(globalIndex); }}
                                          className="p-1 bg-sky-950/80 hover:bg-sky-900/95 text-sky-400 hover:text-sky-300 border border-sky-500/30 rounded cursor-pointer transition-colors"
                                          title="Replace File"
                                        >
                                          <Upload className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                  
                                  <td className={rowPadding} onClick={(e) => e.stopPropagation()}>
                                    <div className="flex gap-1">
                                      <input
                                        type="number"
                                        value={slide.sceneNo}
                                        onChange={(e) => handleUpdateSlideField(globalIndex, 'sceneNo', parseInt(e.target.value) || 1)}
                                        className="w-11 bg-neutral-900 border border-neutral-800 rounded text-center py-0.5 font-mono text-neutral-200 focus:border-indigo-500 outline-none text-xs"
                                        title="Scene"
                                      />
                                      <input
                                        type="number"
                                        value={slide.shotNo}
                                        onChange={(e) => handleUpdateSlideField(globalIndex, 'shotNo', parseInt(e.target.value) || 1)}
                                        className="w-11 bg-neutral-900 border border-neutral-800 rounded text-center py-0.5 font-mono text-neutral-200 focus:border-indigo-500 outline-none text-xs"
                                        title="Shot"
                                      />
                                    </div>
                                  </td>
                                  
                                  {viewDensity !== 'strip' && viewDensity !== 'icon' && (
                                    <>
                                      <td className={rowPadding} onClick={(e) => e.stopPropagation()}>
                                        <select
                                          value={slide.shotType || 'MS'}
                                          onChange={(e) => handleUpdateSlideField(globalIndex, 'shotType', e.target.value)}
                                          className="bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 text-xs text-neutral-300 font-bold focus:border-indigo-500 outline-none cursor-pointer"
                                        >
                                          {SHOT_TYPES.map(st => (
                                            <option key={st.id} value={st.id}>{st.id}</option>
                                          ))}
                                        </select>
                                      </td>
                                      
                                      <td className={rowPadding} onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 w-20 focus-within:border-indigo-500">
                                          <input
                                            type="number"
                                            step="0.5"
                                            min="0.5"
                                            value={((slide.duration || 3000) / 1000).toFixed(1)}
                                            onChange={(e) => handleUpdateSlideField(globalIndex, 'duration', Math.max(500, parseFloat(e.target.value) * 1000))}
                                            className="w-full bg-transparent text-center text-xs font-mono font-bold outline-none text-neutral-300"
                                          />
                                          <span className="text-neutral-500 font-mono text-[10px]">s</span>
                                        </div>
                                      </td>
                                      
                                      <td className={rowPadding} onClick={(e) => e.stopPropagation()}>
                                        <select
                                          value={slide.fitMode || 'contain'}
                                          onChange={(e) => handleUpdateSlideField(globalIndex, 'fitMode', e.target.value)}
                                          className="bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 text-xs text-neutral-300 font-bold focus:border-indigo-500 outline-none cursor-pointer"
                                        >
                                          <option value="contain">Contain</option>
                                          <option value="cover">Cover</option>
                                        </select>
                                      </td>
                                      
                                      <td className={rowPadding} onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 focus-within:border-indigo-500">
                                          <select
                                            value={slide.colorLabel || 'none'}
                                            onChange={(e) => handleUpdateSlideField(globalIndex, 'colorLabel', e.target.value)}
                                            className="bg-transparent text-neutral-300 text-xs font-bold outline-none cursor-pointer w-full"
                                          >
                                            {COLOR_LABELS.map(cl => (
                                              <option key={cl.id} value={cl.id} className="bg-[#0C0C0E]">{cl.label}</option>
                                            ))}
                                          </select>
                                          <div 
                                            className="w-3 h-3 rounded-full border border-black/30 shrink-0"
                                            style={{ backgroundColor: COLOR_LABELS.find(cl => cl.id === (slide.colorLabel || 'none'))?.color || 'transparent' }}
                                          />
                                        </div>
                                      </td>
                                    </>
                                  )}

                                  {viewDensity !== 'icon' && (
                                    <td className={cn(rowPadding, "space-y-1")} onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="text"
                                        value={slide.action}
                                        onChange={(e) => handleUpdateSlideField(globalIndex, 'action', e.target.value)}
                                        className="w-full bg-transparent border-b border-transparent hover:border-neutral-800 focus:border-indigo-500 outline-none pb-0.5 text-neutral-200 font-semibold text-xs"
                                        placeholder="Visual Action..."
                                      />
                                      {viewDensity !== 'strip' && (
                                        <input
                                          type="text"
                                          value={slide.dialogue}
                                          onChange={(e) => handleUpdateSlideField(globalIndex, 'dialogue', e.target.value)}
                                          className="w-full bg-transparent border-b border-transparent hover:border-neutral-800 focus:border-indigo-500 outline-none pb-0.5 text-indigo-300 font-medium italic text-xs"
                                          placeholder="Dialogue cue..."
                                        />
                                      )}
                                    </td>
                                  )}

                                  <td className={rowPadding} onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => handleDuplicateSlide(globalIndex)}
                                        className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                                        title="Duplicate"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setZoomVariationsSource(slide);
                                          setZoomRatios([1.2, 1.8, 2.5]);
                                          setZoomPanOffsets([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]);
                                        }}
                                        className="p-1 text-neutral-400 hover:text-indigo-400 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                                        title="Create 3 Zoom Variations"
                                      >
                                        <Sparkles className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          const newSlides = slides.filter((_, i) => i !== globalIndex);
                                          setSlides(newSlides);
                                          saveToFirebase(newSlides, folderName);
                                        }}
                                        className="p-1 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeLayout === 'player' && (
                    <div className="flex flex-col xl:flex-row h-full">
                      <div className="flex-1 bg-black flex flex-col items-center justify-center p-6 relative">
                        <div className="relative bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden flex items-center justify-center max-w-full max-h-[70vh] shadow-2xl aspect-video w-[800px]">
                          <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
                            {isTransitioning && prevSlideImageUrl && effectiveTransitionStyle !== 'none' && (
                              <img src={prevSlideImageUrl} alt="" style={{ animationDuration: `${transitionDuration}s` }} className={cn("absolute inset-0 w-full h-full pointer-events-none z-10", prevSlideFitMode === 'cover' ? 'object-cover' : 'object-contain', effectiveTransitionStyle === 'fade' ? 'animate-fade-out' : effectiveTransitionStyle === 'wipe' ? 'animate-slide-out-left' : effectiveTransitionStyle === 'zoom' ? 'animate-zoom-out' : effectiveTransitionStyle === 'slideUp' ? 'animate-slide-out-up' : effectiveTransitionStyle === 'blur' ? 'animate-blur-out' : '')} />
                            )}
                            <img key={currentSlideIndex} src={slides[currentSlideIndex]?.imageUrl} alt="" style={{ animationDuration: `${transitionDuration}s` }} className={cn("w-full h-full", slides[currentSlideIndex]?.fitMode === 'cover' ? 'object-cover' : 'object-contain', isTransitioning ? (effectiveTransitionStyle === 'fade' ? 'animate-fade-in-fast' : effectiveTransitionStyle === 'wipe' ? 'animate-slide-in-right' : effectiveTransitionStyle === 'zoom' ? 'animate-zoom-in' : effectiveTransitionStyle === 'slideUp' ? 'animate-slide-in-down' : effectiveTransitionStyle === 'blur' ? 'animate-blur-in' : '') : '')} />
                          </div>

                          <button onClick={() => currentSlideIndex > 0 && setCurrentSlideIndex(prev => prev - 1)} disabled={currentSlideIndex === 0} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-neutral-300 hover:text-white rounded-full transition-colors disabled:opacity-10 cursor-pointer"><ChevronLeft className="w-5 h-5" /></button>
                          <button onClick={() => currentSlideIndex < slides.length - 1 && setCurrentSlideIndex(prev => prev + 1)} disabled={currentSlideIndex === slides.length - 1} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-neutral-300 hover:text-white rounded-full transition-colors disabled:opacity-10 cursor-pointer"><ChevronRight className="w-5 h-5" /></button>

                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 to-transparent p-6 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2 text-[10px]">
                              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-mono font-bold">Scene {slides[currentSlideIndex]?.sceneNo || 1}</span>
                              <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded font-mono font-bold">Shot {slides[currentSlideIndex]?.shotNo || 1} • {slides[currentSlideIndex]?.shotType || 'MS'}</span>
                            </div>
                            {slides[currentSlideIndex]?.action && <p className="text-white font-extrabold text-sm max-w-xl mx-auto drop-shadow">{slides[currentSlideIndex]?.action}</p>}
                            {slides[currentSlideIndex]?.dialogue && <p className="text-indigo-300 font-bold text-xs italic mt-1 drop-shadow">"{slides[currentSlideIndex]?.dialogue}"</p>}
                          </div>
                        </div>
                      </div>

                      {showFilmstrip && (
                        <div className="w-80 bg-[#0c0c0e] border-l border-neutral-800 flex flex-col overflow-hidden shrink-0">
                          <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
                            <span className="text-[10px] text-neutral-500 font-bold uppercase">Sidebar Timeline</span>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-left">
                            {slides.map((slide, index) => (
                              <div key={slide.id} onClick={() => setCurrentSlideIndex(index)} className={cn("flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-all", index === currentSlideIndex ? "bg-indigo-600/10 border-indigo-500 scale-[1.02]" : "bg-neutral-900/40 border-neutral-800 hover:bg-neutral-900/80")}>
                                <div className="w-14 aspect-video rounded overflow-hidden bg-black shrink-0 relative border border-neutral-800">
                                  <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-bold text-neutral-200">Scene {slide.sceneNo} • Shot {slide.shotNo}</p>
                                  <p className="text-[9px] text-neutral-500 truncate mt-0.5">{slide.action || 'No description'}</p>
                                </div>
                                <span className="text-[10px] font-mono text-neutral-500 font-bold">{((slide.duration || 3000)/1000).toFixed(1)}s</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Workspace: Screenplay Writer */}
              {showScriptEditor && (
                <div className={cn("h-full border-neutral-800 border-theme bg-[#0c0c0f] bg-theme-panel flex flex-col shrink-0 border-l w-[380px] md:w-[420px] xl:w-[480px]")}>
                  <ScreenplayWriter
                    onClose={() => setShowScriptEditor(false)}
                    sceneName={folderName}
                    sceneDescription={slides.map(s => s.action ? `[SHOT ${s.shotNo}] ${s.action}` : '').filter(Boolean).join('\n\n')}
                    onUpdateScene={(name, desc) => {
                      setFolderName(name);
                      saveToFirebase(slides, name);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showUpload && <UploadModal onUpload={handleUploadFiles} onSelectSample={handleSelectSample} onClose={() => setShowUpload(false)} />}
      {editingFrame && (
        <FrameEdit 
          imageUrl={editingFrame.imageUrl} 
          width={1280} 
          height={720} 
          onClose={() => setEditingFrame(null)} 
          onSave={handleSaveEditedFrame} 
          onApply={(dataUrl) => {
            const updatedSlides = slides.map((s, i) => i === editingFrame.index ? { ...s, imageUrl: dataUrl } : s);
            setSlides(updatedSlides);
            saveToFirebase(updatedSlides, folderName);
            setEditingFrame({ ...editingFrame, imageUrl: dataUrl });
          }}
          onSaveAsNew={handleSaveAsNewFrame}
          index={editingFrame.index}
          totalFrames={slides.length}
          onNavigate={(direction, currentFrameDataUrl) => {
            const updatedSlides = slides.map((s, i) => i === editingFrame.index ? { ...s, imageUrl: currentFrameDataUrl } : s);
            setSlides(updatedSlides);
            saveToFirebase(updatedSlides, folderName);
            const targetIndex = direction === 'prev' ? editingFrame.index - 1 : editingFrame.index + 1;
            if (targetIndex >= 0 && targetIndex < updatedSlides.length) {
              const targetSlide = updatedSlides[targetIndex];
              setEditingFrame({ imageUrl: targetSlide.imageUrl, index: targetIndex });
            }
          }}
        />
      )}

      <input 
        type="file" 
        ref={replaceFileInputRef} 
        onChange={handleReplaceFile} 
        accept="image/*" 
        className="hidden" 
      />
      {editingGridFrame && (
        <GridEdit 
          imageUrl={editingGridFrame.imageUrl} 
          width={1280} 
          height={720} 
          onClose={() => setEditingGridFrame(null)} 
          onSave={handleSaveEditedGridFrame} 
          onSaveAsNew={handleSaveAsNewGridFrame}
          onSaveSlicesToSlides={handleSaveSlicesToSlides}
        />
      )}

      {showZipDialog && (
        <div className="fixed inset-0 bg-neutral-950/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0c0c0e] border border-neutral-800 rounded-2xl p-6 w-full max-w-md space-y-4 text-left">
            <h3 className="text-sm font-black text-white">Export Storyboard ZIP</h3>
            <input type="text" value={zipFileName} onChange={(e) => setZipFileName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white" />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowZipDialog(false)} className="px-4 py-2 bg-neutral-800 text-neutral-400 rounded-lg text-xs font-bold">Cancel</button>
              <button onClick={exportZip} disabled={isExportingZip} className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1">
                {isExportingZip ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <span>Download ZIP</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {zoomVariationsSource && (
        <div className="fixed inset-0 bg-[#0a0a0b]/95 z-[200] flex items-center justify-center p-4 backdrop-blur-md text-left">
          <div className="bg-[#0c0c0e] border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-white">Create 3 Zoom Variations</h3>
                <p className="text-[10px] text-neutral-500">Intelligent automatic focal cropped sequence insertion.</p>
              </div>
              <button onClick={() => setZoomVariationsSource(null)} className="text-xs text-neutral-500 hover:text-white px-2 py-1 bg-neutral-900 rounded">Close</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[0, 1, 2].map((idx) => {
                  const currentZoom = zoomRatios[idx];
                  const pan = zoomPanOffsets[idx] || { x: 0, y: 0 };
                  return (
                    <div key={idx} className="bg-[#121215] border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                        <span className="text-[9px] font-mono text-indigo-400 font-bold">VARIATION {idx + 1}</span>
                        <span className="px-1.5 py-0.2 bg-indigo-500/10 text-indigo-400 font-mono text-[9px] font-bold rounded">{currentZoom.toFixed(1)}x Zoom</span>
                      </div>
                      <div onPointerDown={(e) => handlePanStart(e, idx)} className="aspect-video bg-black rounded-lg overflow-hidden relative border border-neutral-800 flex items-center justify-center cursor-grab select-none">
                        <img src={zoomVariationsSource.imageUrl} alt="" className="absolute w-full h-full object-cover pointer-events-none transition-transform duration-75" style={{ transform: `scale(${currentZoom})`, left: `${pan.x * 100}%`, top: `${pan.y * 100}%` }} />
                      </div>
                      <input type="range" min="1.0" max="4.0" step="0.05" value={currentZoom} onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setZoomRatios(prev => {
                          const next = [...prev] as [number, number, number];
                          next[idx] = val;
                          return next;
                        });
                      }} className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 bg-neutral-900/40 border-t border-neutral-800 flex justify-end gap-3 shrink-0">
              <button onClick={() => setZoomVariationsSource(null)} className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-bold border border-neutral-700">Cancel</button>
              <button onClick={() => handleGenerateVariations(zoomVariationsSource, zoomRatios)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black transition-colors flex items-center gap-1.5 shadow-lg cursor-pointer">
                <span>Create 3 Zoom Variations</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrintPreview && (
        <div className="fixed inset-0 bg-[#0a0a0b]/98 z-[250] flex flex-col text-left text-theme-primary">
          <div className="px-6 py-4 border-b border-neutral-800 bg-[#0c0c0e] flex items-center justify-between shrink-0">
            <h3 className="text-sm font-black text-white">PDF / Print Preview</h3>
            <div className="flex gap-2">
              <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white rounded-lg text-xs font-black">{isGeneratingPDF ? 'Generating...' : 'Download PDF'}</button>
              <button onClick={() => setShowPrintPreview(false)} className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 rounded-lg text-xs font-bold">Exit Preview</button>
            </div>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <div className="w-80 border-r border-neutral-800 p-6 space-y-6 flex flex-col justify-between shrink-0 bg-[#0c0c0e]">
              <div className="space-y-4">
                <input type="text" value={printTitle || folderName} onChange={(e) => setPrintTitle(e.target.value)} placeholder="Production Title" className="w-full bg-[#121215] border border-neutral-800 text-white rounded px-3 py-2 text-xs" />
                <input type="text" value={printAuthor} onChange={(e) => setPrintAuthor(e.target.value)} placeholder="Director" className="w-full bg-[#121215] border border-neutral-800 text-white rounded px-3 py-2 text-xs" />
                <select value={printOrientation} onChange={(e) => setPrintOrientation(e.target.value as any)} className="w-full bg-[#121215] border border-neutral-800 text-white rounded px-3 py-2 text-xs">
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
                <select value={printLayout} onChange={(e) => setPrintLayout(e.target.value as any)} className="w-full bg-[#121215] border border-neutral-800 text-white rounded px-3 py-2 text-xs">
                  <option value="grid">Grid Layout</option>
                  <option value="list">List Layout</option>
                </select>
                <div className="flex items-center justify-between p-1 pt-2 border-t border-neutral-800/60">
                  <span className="text-xs font-medium text-neutral-300">Export to active session</span>
                  <button 
                    onClick={() => setExportToSession(prev => !prev)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      exportToSession ? "bg-indigo-600" : "bg-neutral-800"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        exportToSession ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-neutral-500 leading-relaxed bg-neutral-900/60 p-3.5 border border-neutral-800/80 rounded-xl">
                PDF direct download renders fully compiled graphics and styles inside your browser!
              </div>
            </div>
            <div className="flex-1 bg-neutral-950 p-8 overflow-y-auto flex justify-center">
              <div className={cn("w-full bg-white text-black p-12 shadow-2xl rounded-xl flex flex-col gap-6 self-start", printOrientation === 'portrait' ? "max-w-[210mm] min-h-[297mm]" : "max-w-[297mm] min-h-[210mm]")}>
                <div className="border-b-4 border-black pb-4 flex justify-between items-end">
                  <div>
                    <h1 className="text-xl font-black uppercase text-neutral-900">{printTitle || folderName}</h1>
                    <p className="text-[9px] font-mono text-neutral-400 mt-0.5 uppercase">Cinematic Sequence Storyboard</p>
                  </div>
                  <div className="text-right text-[10px] text-neutral-500 font-mono">
                    Frames: {slides.length} | Dur: {totalDurationSeconds.toFixed(1)}s
                  </div>
                </div>
                <div className={cn("grid gap-4", printLayout === 'grid' ? `grid-cols-${printCols}` : "grid-cols-1")}>
                  {slides.map((slide, idx) => (
                    <div key={slide.id} className={cn("border border-neutral-200 rounded-lg overflow-hidden bg-white", printLayout === 'list' && "flex gap-4 p-2")}>
                      <div className={cn("bg-black flex items-center justify-center overflow-hidden shrink-0", printLayout === 'grid' ? "w-full aspect-video" : "w-36 aspect-video rounded border")}>
                        <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3 flex-1 text-left space-y-1.5">
                        <div className="text-[9px] font-black uppercase text-indigo-600 border-b pb-1">Scene {slide.sceneNo} · Shot {slide.shotNo} • {slide.shotType}</div>
                        {slide.action && <p className="text-[10px] text-neutral-700 leading-snug">{slide.action}</p>}
                        {slide.dialogue && <p className="text-[9px] italic text-neutral-500 bg-neutral-50 p-1.5 rounded">"{slide.dialogue}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
