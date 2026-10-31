import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, Layout, Sliders, Play, Pause, Square as SquareIcon, 
  ChevronLeft, ChevronRight, Download, Upload, Copy, Edit3, 
  Palette, MoveUp, MoveDown, Check, RefreshCw, Sparkles, Volume2, 
  Maximize2, Undo2, Redo2, Cloud, CloudOff, CloudLightning, FolderOpen, 
  Save, FileText, Settings, HelpCircle, Eye, Monitor, Tv, Smartphone,
  Eraser, Circle, ArrowRight, Type
} from 'lucide-react';
import { themeStyles } from '../../constants/creativeStudioTheme';
import { generateUnifiedAIResponse } from '../../services/unifiedAi';
import { saveDocToFirestore, getDocsFromFirestore, deleteDocFromFirestore } from '../../services/storage';

interface StoryboardSlide {
  id: string;
  sceneNo: string;
  shotNo: string;
  imageUrl: string;
  shotType: string;
  angle: string;
  movement: string;
  action: string;
  dialogue: string;
  duration: number; // in seconds
  sceneDescription?: string;
}

interface StoryboardProject {
  id: string;
  name: string;
  aspectRatio: string; // '16:9' | '2.39:1' | '1.43:1' | '1:1' | '9:16'
  slides: StoryboardSlide[];
  createdAt: number;
  updatedAt: number;
  userId?: string;
}

interface AdvancedStoryboarderProps {
  onBack?: () => void;
  localTheme: string;
}

const PRESET_SHOT_TYPES = ['Wide Shot', 'Medium Shot', 'Close-Up', 'Extreme Close-Up', 'Establishing Shot', 'Point of View', 'Over the Shoulder'];
const PRESET_ANGLES = ['Eye Level', 'Low Angle', 'High Angle', 'Dutch Angle', 'Bird\'s Eye View', 'Worm\'s Eye View'];
const PRESET_MOVEMENTS = ['Static', 'Pan Left/Right', 'Tilt Up/Down', 'Dolly In/Out', 'Tracking', 'Zoom', 'Crane/Jib'];

// Curated solid/gradient artistic sketches for placeholder frames
const PLACEHOLDER_SKETCHES = [
  { name: 'Cinematic Blue', value: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)' },
  { name: 'Warm Sunset', value: 'linear-gradient(135deg, #7c2d12 0%, #451a03 100%)' },
  { name: 'Cyberpunk Purple', value: 'linear-gradient(135deg, #581c87 0%, #3b0764 100%)' },
  { name: 'Forest Shadow', value: 'linear-gradient(135deg, #14532d 0%, #064e3b 100%)' },
  { name: 'Monochrome Sketch', value: 'linear-gradient(135deg, #27272a 0%, #09090b 100%)' },
];

interface AspectRatioConfig {
  label: string;
  className: string;
  canvasWidth: number;
  canvasHeight: number;
  icon: React.ReactNode;
}

export const AdvancedStoryboarder: React.FC<AdvancedStoryboarderProps> = ({ onBack, localTheme }) => {
  const st = themeStyles[localTheme] || themeStyles.charcoal;

  // --- PROJECT PERSISTENCE STATE ---
  const [projects, setProjects] = useState<StoryboardProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'syncing' | 'synced' | 'local' | 'error'>('local');

  // --- CURRENT ACTIVE PROJECT STATES ---
  const [slides, setSlides] = useState<StoryboardSlide[]>([]);
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [projectName, setProjectName] = useState<string>('Untitled Reel');

  const [activeSlideId, setActiveSlideId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // --- PLAYBACK TRANSITIONS & VOICEOVER NARRATOR ---
  const [transitionStyle, setTransitionStyle] = useState<'cut' | 'fade' | 'wipe'>('cut');
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false);
  const [voiceRate, setVoiceRate] = useState<number>(1);
  const [voicePitch, setVoicePitch] = useState<number>(1);

  // --- SKETCHPAD DRAWING STATES ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawMode, setDrawMode] = useState<'brush' | 'line' | 'rect' | 'circle' | 'arrow' | 'eraser' | 'text'>('brush');
  const [drawColor, setDrawColor] = useState('#38bdf8');
  const [drawWidth, setDrawWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Undo/Redo historical stacks
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const drawStartPos = useRef({ x: 0, y: 0 });
  const canvasSnapshot = useRef<ImageData | null>(null);

  // --- NEW USER-REQUESTED STATES ---
  const [isSpecExpanded, setIsSpecExpanded] = useState(false);
  const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'script'>('editor');
  const [textToInsert, setTextToInsert] = useState('Camera Direction');
  const [scriptText, setScriptText] = useState('');

  interface CuePoint {
    id: string;
    timeCode: string;
    text: string;
    assignedSlideId?: string;
  }

  const [cuePoints, setCuePoints] = useState<CuePoint[]>([
    { id: 'cue-1', timeCode: '00:00', text: 'Opening Sequence with ambient tone', assignedSlideId: 'slide-1' },
    { id: 'cue-2', timeCode: '00:04', text: 'Voiceover narrative starts, rain background', assignedSlideId: 'slide-2' }
  ]);

  const ASPECT_RATIOS: Record<string, AspectRatioConfig> = {
    '16:9': { label: '16:9 Widescreen', className: 'aspect-video', canvasWidth: 560, canvasHeight: 315, icon: <Monitor className="w-3.5 h-3.5" /> },
    '2.39:1': { label: '2.39:1 CinemaScope', className: 'aspect-[2.39/1]', canvasWidth: 560, canvasHeight: 234, icon: <Tv className="w-3.5 h-3.5" /> },
    '1.43:1': { label: '1.43:1 IMAX', className: 'aspect-[1.43/1]', canvasWidth: 560, canvasHeight: 392, icon: <Maximize2 className="w-3.5 h-3.5" /> },
    '1:1': { label: '1:1 Square', className: 'aspect-square', canvasWidth: 420, canvasHeight: 420, icon: <Layout className="w-3.5 h-3.5" /> },
    '9:16': { label: '9:16 Portrait', className: 'aspect-[9/16]', canvasWidth: 281, canvasHeight: 500, icon: <Smartphone className="w-3.5 h-3.5" /> }
  };

  const activeSlide = slides.find(s => s.id === activeSlideId) || slides[0];

  // --- INITIAL LOAD: FETCH FROM FIRESTORE OR IDB/LOCALSTORAGE ---
  useEffect(() => {
    const initStorage = async () => {
      setIsSyncing(true);
      try {
        const cloudProjects = await getDocsFromFirestore('storyboards');
        if (cloudProjects && cloudProjects.length > 0) {
          setProjects(cloudProjects);
          const savedActiveId = localStorage.getItem('last_active_storyboard_id') || cloudProjects[0].id;
          const found = cloudProjects.find(p => p.id === savedActiveId) || cloudProjects[0];
          setActiveProjectId(found.id);
          setProjectName(found.name);
          setAspectRatio(found.aspectRatio || '16:9');
          setSlides(found.slides || []);
          setActiveSlideId(found.slides?.[0]?.id || '');
          setCloudStatus('synced');
        } else {
          // Fall back to local storage
          const local = localStorage.getItem('adv_storyboard_projects');
          if (local) {
            const parsed = JSON.parse(local);
            setProjects(parsed);
            if (parsed.length > 0) {
              const activeProj = parsed[0];
              setActiveProjectId(activeProj.id);
              setProjectName(activeProj.name);
              setAspectRatio(activeProj.aspectRatio || '16:9');
              setSlides(activeProj.slides || []);
              setActiveSlideId(activeProj.slides?.[0]?.id || '');
            }
          } else {
            // Create a default project
            const defaultId = `proj-default-${Date.now()}`;
            const defaultProj: StoryboardProject = {
              id: defaultId,
              name: 'Epic Cyberpunk Concept Reel',
              aspectRatio: '16:9',
              slides: [
                {
                  id: 'slide-1',
                  sceneNo: '1',
                  shotNo: '1',
                  imageUrl: '',
                  shotType: 'Establishing Shot',
                  angle: 'Eye Level',
                  movement: 'Static',
                  action: 'A solitary futuristic high-rise building stands under a heavy cyberpunk rain.',
                  dialogue: '[SFX: Low neon hum and distant sirens]',
                  duration: 4
                },
                {
                  id: 'slide-2',
                  sceneNo: '1',
                  shotNo: '2',
                  imageUrl: '',
                  shotType: 'Close-Up',
                  angle: 'Low Angle',
                  movement: 'Tilt Up/Down',
                  action: 'Water droplets splashing off a neon sign that reads "HOTEL".',
                  dialogue: 'NARRATOR: In this city, memories are just digital clutter.',
                  duration: 3
                }
              ],
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            setProjects([defaultProj]);
            setActiveProjectId(defaultProj.id);
            setProjectName(defaultProj.name);
            setAspectRatio(defaultProj.aspectRatio);
            setSlides(defaultProj.slides);
            setActiveSlideId(defaultProj.slides[0].id);
            
            // Sync initial project
            await saveDocToFirestore('storyboards', defaultProj.id, defaultProj);
          }
          setCloudStatus('local');
        }
      } catch (err) {
        console.error("Failed to load storyboard projects", err);
        setCloudStatus('error');
      } finally {
        setIsSyncing(false);
      }
    };
    initStorage();
  }, []);

  // --- SAVE CURRENT ACTIVE PROJECT (DEBOUNCED SYNC) ---
  const saveActiveProject = async (projId: string, name: string, ratio: string, currentSlides: StoryboardSlide[]) => {
    if (!projId || currentSlides.length === 0) return;
    setCloudStatus('syncing');
    
    const projectToSave: StoryboardProject = {
      id: projId,
      name,
      aspectRatio: ratio,
      slides: currentSlides,
      updatedAt: Date.now(),
      createdAt: projects.find(p => p.id === projId)?.createdAt || Date.now()
    };

    try {
      // Update local state list
      setProjects(prev => prev.map(p => p.id === projId ? projectToSave : p));
      
      // Save to LocalStorage list
      const localList = localStorage.getItem('adv_storyboard_projects');
      let parsedList: StoryboardProject[] = [];
      if (localList) {
        parsedList = JSON.parse(localList);
      }
      const existingIdx = parsedList.findIndex(p => p.id === projId);
      if (existingIdx !== -1) {
        parsedList[existingIdx] = projectToSave;
      } else {
        parsedList.push(projectToSave);
      }
      localStorage.setItem('adv_storyboard_projects', JSON.stringify(parsedList));

      // Save to Firebase
      await saveDocToFirestore('storyboards', projId, projectToSave);
      setCloudStatus('synced');
    } catch (e) {
      console.error("Sync to cloud deferred/failed:", e);
      setCloudStatus('error');
    }
  };

  // Trigger debounced saves when things change
  useEffect(() => {
    if (!activeProjectId || slides.length === 0) return;
    const timer = setTimeout(() => {
      saveActiveProject(activeProjectId, projectName, aspectRatio, slides);
    }, 800);
    return () => clearTimeout(timer);
  }, [slides, aspectRatio, projectName, activeProjectId]);

  // --- PROJECT SWITCHING / CREATION / DELETION ---
  const handleLoadProject = (projId: string) => {
    const selected = projects.find(p => p.id === projId);
    if (!selected) return;
    
    setActiveProjectId(selected.id);
    setProjectName(selected.name);
    setAspectRatio(selected.aspectRatio || '16:9');
    setSlides(selected.slides || []);
    setActiveSlideId(selected.slides?.[0]?.id || '');
    localStorage.setItem('last_active_storyboard_id', selected.id);
    triggerAudioBeep(550, 'sine', 0.1);
  };

  const handleCreateNewProject = async () => {
    const newId = `proj-${Date.now()}`;
    const newProject: StoryboardProject = {
      id: newId,
      name: `New Storyboard Reel ${projects.length + 1}`,
      aspectRatio: '16:9',
      slides: [
        {
          id: `slide-${Date.now()}`,
          sceneNo: '1',
          shotNo: '1',
          imageUrl: '',
          shotType: 'Medium Shot',
          angle: 'Eye Level',
          movement: 'Static',
          action: 'Describe the opening scene action...',
          dialogue: 'Introductory voiceover or ambient audio...',
          duration: 3
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newId);
    setProjectName(newProject.name);
    setAspectRatio(newProject.aspectRatio);
    setSlides(newProject.slides);
    setActiveSlideId(newProject.slides[0].id);
    localStorage.setItem('last_active_storyboard_id', newId);

    try {
      await saveDocToFirestore('storyboards', newId, newProject);
      setCloudStatus('synced');
    } catch {
      setCloudStatus('local');
    }
    triggerAudioBeep(650, 'sine', 0.12);
  };

  const handleDeleteProject = async (projId: string) => {
    if (projects.length <= 1) {
      alert("You must keep at least one storyboard project profile.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this storyboard? This action cannot be undone.")) return;

    const remaining = projects.filter(p => p.id !== projId);
    setProjects(remaining);
    
    // Save updated list locally
    localStorage.setItem('adv_storyboard_projects', JSON.stringify(remaining));

    // Delete from Cloud
    try {
      await deleteDocFromFirestore('storyboards', projId);
    } catch (e) {
      console.warn("Deferred cloud deletion:", e);
    }

    // Switch to another project
    const nextProj = remaining[0];
    setActiveProjectId(nextProj.id);
    setProjectName(nextProj.name);
    setAspectRatio(nextProj.aspectRatio || '16:9');
    setSlides(nextProj.slides || []);
    setActiveSlideId(nextProj.slides?.[0]?.id || '');
    localStorage.setItem('last_active_storyboard_id', nextProj.id);

    triggerAudioBeep(220, 'sine', 0.15);
  };

  // --- AUDIO SYNTH BEAVER ---
  const triggerAudioBeep = (freq = 440, type: OscillatorType = 'sine', duration = 0.15) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback not allowed or supported', e);
    }
  };

  // --- VOICEOVER NARRATOR TTS SYSTEM ---
  const speakSlideScratchVoiceover = (text: string) => {
    if (!voiceoverEnabled) return;
    try {
      window.speechSynthesis.cancel();
      // Strip bracketed sound effects like [SFX: Siren]
      const cleanText = text.replace(/\[.*?\]/g, '').trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = voiceRate;
      utterance.pitch = voicePitch;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech Synthesis failed:", e);
    }
  };

  // --- PLAYBACK TIMERS & LOOPS ---
  useEffect(() => {
    let interval: any;
    let progressInterval: any;

    if (isPlaying) {
      const currentSlide = slides[playbackIndex];
      if (!currentSlide) {
        setIsPlaying(false);
        return;
      }

      triggerAudioBeep(520, 'triangle', 0.08);
      setPlaybackProgress(0);

      // Read text-to-speech aloud
      speakSlideScratchVoiceover(currentSlide.dialogue || currentSlide.action);

      // Slide Switch Timer
      interval = setTimeout(() => {
        if (playbackIndex < slides.length - 1) {
          setPlaybackIndex(prev => prev + 1);
        } else {
          setIsPlaying(false); // end of sequence
          triggerAudioBeep(330, 'sawtooth', 0.3);
          if (voiceoverEnabled) window.speechSynthesis.cancel();
        }
      }, currentSlide.duration * 1000);

      // Smooth progress bar update
      const steps = currentSlide.duration * 20; 
      let currentStep = 0;
      progressInterval = setInterval(() => {
        currentStep++;
        setPlaybackProgress((currentStep / steps) * 100);
      }, 50);
    }

    return () => {
      clearTimeout(interval);
      clearInterval(progressInterval);
    };
  }, [isPlaying, playbackIndex]);

  const startAnimatic = () => {
    if (slides.length === 0) return;
    setPlaybackIndex(0);
    setPlaybackProgress(0);
    setIsPlaying(true);
  };

  // --- SLIDE CRUD OPERATIONS ---
  const handleAddSlide = () => {
    const newId = `slide-${Date.now()}`;
    const newSlide: StoryboardSlide = {
      id: newId,
      sceneNo: String(slides.length > 0 ? Math.max(...slides.map(s => parseInt(s.sceneNo) || 1)) : 1),
      shotNo: String(slides.length > 0 ? slides.length + 1 : 1),
      imageUrl: '',
      shotType: 'Medium Shot',
      angle: 'Eye Level',
      movement: 'Static',
      action: 'Describe the visuals occurring in this frame...',
      dialogue: 'Dialogue or background music cue...',
      duration: 3
    };
    const nextSlides = [...slides, newSlide];
    setSlides(nextSlides);
    setActiveSlideId(newId);
    triggerAudioBeep(600, 'sine', 0.08);
  };

  const handleDeleteSlide = (id: string) => {
    if (slides.length <= 1) {
      alert("You must keep at least 1 slide in the storyboard.");
      return;
    }
    const idx = slides.findIndex(s => s.id === id);
    const updated = slides.filter(s => s.id !== id);
    setSlides(updated);
    if (activeSlideId === id) {
      setActiveSlideId(updated[Math.max(0, idx - 1)].id);
    }
    triggerAudioBeep(220, 'sine', 0.15);
  };

  const updateSlideField = (id: string, field: keyof StoryboardSlide, value: any) => {
    setSlides(slides.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === slides.length - 1) return;
    
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const nextSlides = [...slides];
    const temp = nextSlides[index];
    nextSlides[index] = nextSlides[targetIdx];
    nextSlides[targetIdx] = temp;
    
    setSlides(nextSlides);
    triggerAudioBeep(450, 'sine', 0.05);
  };

  const handleMoveMultiple = (direction: 'up' | 'down' | 'start' | 'end' | 'index', targetIndex?: number) => {
    if (selectedSlideIds.length === 0) return;
    
    const selectedSet = new Set(selectedSlideIds);
    
    if (direction === 'start') {
      const selected = slides.filter(s => selectedSet.has(s.id));
      const unselected = slides.filter(s => !selectedSet.has(s.id));
      setSlides([...selected, ...unselected]);
    } else if (direction === 'end') {
      const selected = slides.filter(s => selectedSet.has(s.id));
      const unselected = slides.filter(s => !selectedSet.has(s.id));
      setSlides([...unselected, ...selected]);
    } else if (direction === 'up') {
      const newSlides = [...slides];
      for (let i = 1; i < newSlides.length; i++) {
        if (selectedSet.has(newSlides[i].id) && !selectedSet.has(newSlides[i-1].id)) {
          const temp = newSlides[i];
          newSlides[i] = newSlides[i-1];
          newSlides[i-1] = temp;
        }
      }
      setSlides(newSlides);
    } else if (direction === 'down') {
      const newSlides = [...slides];
      for (let i = newSlides.length - 2; i >= 0; i--) {
        if (selectedSet.has(newSlides[i].id) && !selectedSet.has(newSlides[i+1].id)) {
          const temp = newSlides[i];
          newSlides[i] = newSlides[i+1];
          newSlides[i+1] = temp;
        }
      }
      setSlides(newSlides);
    } else if (direction === 'index' && typeof targetIndex === 'number') {
      if (targetIndex < 0 || targetIndex > slides.length) return;
      const selected = slides.filter(s => selectedSet.has(s.id));
      const unselected = slides.filter(s => !selectedSet.has(s.id));
      
      const result = [...unselected];
      result.splice(targetIndex, 0, ...selected);
      setSlides(result);
    }
    triggerAudioBeep(450, 'sine', 0.05);
  };

  const handleDuplicate = (slide: StoryboardSlide) => {
    const newId = `slide-dup-${Date.now()}`;
    const duplicated: StoryboardSlide = {
      ...slide,
      id: newId,
      shotNo: `${slide.shotNo} Copy`
    };
    const index = slides.findIndex(s => s.id === slide.id);
    const nextSlides = [...slides];
    nextSlides.splice(index + 1, 0, duplicated);
    setSlides(nextSlides);
    setActiveSlideId(newId);
    triggerAudioBeep(650, 'sine', 0.1);
  };

  // --- SHAPE DRAWING METHODS ---
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    drawStartPos.current = { x, y };
    canvasSnapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Push into Undo history stack
    const currentData = canvas.toDataURL('image/png');
    setUndoStack(prev => [...prev.slice(-19), currentData]);
    setRedoStack([]); // reset redo on new stroke

    if (drawMode === 'text') {
      const enteredText = prompt("Enter text to draw on canvas:", textToInsert);
      if (enteredText) {
        setTextToInsert(enteredText);
        ctx.font = `bold ${drawWidth * 3 + 14}px sans-serif`;
        ctx.fillStyle = drawColor;
        ctx.fillText(enteredText, x, y);
        
        // Save new canvas state
        const savedData = canvas.toDataURL('image/png');
        setUndoStack(prev => [...prev.slice(-19), savedData]);
        triggerAudioBeep(600, 'sine', 0.05);
      }
      return;
    }

    if (drawMode === 'brush' || drawMode === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = drawMode === 'eraser' ? '#0f172a' : drawColor;
      ctx.lineWidth = drawWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const startX = drawStartPos.current.x;
    const startY = drawStartPos.current.y;

    if (drawMode === 'brush' || drawMode === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      // Restore pre-stroke snapshot to clear ghost frame preview
      if (canvasSnapshot.current) {
        ctx.putImageData(canvasSnapshot.current, 0, 0);
      }

      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (drawMode === 'line') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (drawMode === 'rect') {
        ctx.beginPath();
        ctx.rect(startX, startY, x - startX, y - startY);
        ctx.stroke();
      } else if (drawMode === 'circle') {
        ctx.beginPath();
        const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (drawMode === 'arrow') {
        drawArrow(ctx, startX, startY, x, y, drawWidth);
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, width: number) => {
    const headLength = Math.max(12, width * 3.5);
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save redo snapshot
    const currentImg = canvas.toDataURL('image/png');
    setRedoStack(prev => [...prev, currentImg]);

    // Restore previous
    const previousImg = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = previousImg;
    triggerAudioBeep(400, 'sine', 0.05);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentImg = canvas.toDataURL('image/png');
    setUndoStack(prev => [...prev, currentImg]);

    const nextImg = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = nextImg;
    triggerAudioBeep(450, 'sine', 0.05);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Add to undo before clearing
    const currentImg = canvas.toDataURL('image/png');
    setUndoStack(prev => [...prev, currentImg]);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    triggerAudioBeep(200, 'sine', 0.1);
  };

  const saveCanvasDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    updateSlideField(activeSlideId, 'imageUrl', dataUrl);
    setIsDrawingOpen(false);
    triggerAudioBeep(650, 'sine', 0.1);
  };

  const openDrawingCanvas = () => {
    setIsDrawingOpen(true);
    // Reset undo/redo states for new pad session
    setUndoStack([]);
    setRedoStack([]);

    const config = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['16:9'];

    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Preload image
      if (activeSlide.imageUrl && !activeSlide.imageUrl.startsWith('linear-gradient')) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = activeSlide.imageUrl;
      }
    }, 120);
  };

  // --- AI CINEMATIC SPEC ASSISTANT ---
  const handleAIEnhance = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const prompt = `You are an elite cinematic storyboard script doctor. Given this shot description concept: "${aiPrompt}", generate structured directions for a slide.
Response MUST be exactly in JSON format, like this:
{
  "shotType": "Medium Shot",
  "angle": "Low Angle",
  "movement": "Tracking",
  "action": "A cinematic description of the frame details...",
  "dialogue": "Character dialogue or sound FX cue..."
}`;
      const response = await generateUnifiedAIResponse(prompt);
      const cleanedText = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleanedText);
      
      updateSlideField(activeSlideId, 'shotType', data.shotType || 'Medium Shot');
      updateSlideField(activeSlideId, 'angle', data.angle || 'Eye Level');
      updateSlideField(activeSlideId, 'movement', data.movement || 'Static');
      updateSlideField(activeSlideId, 'action', data.action || '');
      updateSlideField(activeSlideId, 'dialogue', data.dialogue || '');
      setAiPrompt('');
      triggerAudioBeep(880, 'sine', 0.12);
    } catch (e) {
      console.error(e);
      alert("Failed to parse AI cinematic recommendations. Try a simpler description!");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- IMAGE FILE UPLOAD HANDLER ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        updateSlideField(activeSlideId, 'imageUrl', uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- BATCH IMAGE FILE & FOLDER UPLOAD HANDLER ---
  const handleBatchImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      // Filter for image files
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      if (imageFiles.length === 0) {
        alert("No valid image files found in the selection.");
        return;
      }

      // Sort files alphabetically to keep a logical order
      imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      const newSlidesTemp: (StoryboardSlide | null)[] = new Array(imageFiles.length).fill(null);
      let loadedCount = 0;
      const baseTimestamp = Date.now();
      const currentMaxScene = slides.length > 0 ? Math.max(...slides.map(s => parseInt(s.sceneNo) || 1)) : 1;
      const startShotNo = slides.length > 0 ? slides.length + 1 : 1;

      imageFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          const imgDataUrl = uploadEvent.target?.result as string;
          const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
          
          newSlidesTemp[index] = {
            id: `slide-batch-${baseTimestamp}-${index}-${Math.random().toString(36).substring(2, 7)}`,
            sceneNo: String(currentMaxScene),
            shotNo: String(startShotNo + index),
            imageUrl: imgDataUrl,
            shotType: 'Medium Shot',
            angle: 'Eye Level',
            movement: 'Static',
            action: `Visual frame: ${fileNameWithoutExt}`,
            dialogue: 'Dialogue or sound cue...',
            duration: 3
          };

          loadedCount++;
          if (loadedCount === imageFiles.length) {
            const validNewSlides = newSlidesTemp.filter((s): s is StoryboardSlide => s !== null);
            setSlides(prev => {
              const updatedSlides = [...prev, ...validNewSlides];
              // Set the active slide to the first added slide if any
              if (validNewSlides.length > 0) {
                setActiveSlideId(validNewSlides[0].id);
              }
              return updatedSlides;
            });
            triggerAudioBeep(600, 'sine', 0.15);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // --- EXPORT STORYBOARD PRESENTATION HTML ---
  const exportHTML = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${projectName} - Storyboard Presentation</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-8">
  <div class="max-w-6xl mx-auto space-y-8">
    <div class="border-b border-slate-800 pb-4 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-extrabold text-sky-400">${projectName}</h1>
        <p class="text-sm text-slate-400">Cinematic Aspect Ratio: ${aspectRatio} • Generated in Media Suite Studio • ${new Date().toLocaleDateString()}</p>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded px-4 py-2 text-xs font-mono text-sky-400">
        ${slides.length} Total Frames
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${slides.map((s) => `
        <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
          <div class="w-full flex items-center justify-center bg-slate-950 relative overflow-hidden" style="aspect-ratio: ${aspectRatio.replace(':', '/')}; ${s.imageUrl.startsWith('linear-gradient') ? `background: ${s.imageUrl};` : s.imageUrl ? `background-image: url('${s.imageUrl}'); background-size: cover; background-position: center;` : 'background: #0f172a;'}">
            <span class="absolute top-2 left-2 bg-slate-900/85 px-2 py-0.5 rounded text-xs text-sky-400 font-bold border border-slate-800/40">
              Scene ${s.sceneNo} • Shot ${s.shotNo}
            </span>
            <span class="absolute bottom-2 right-2 bg-slate-900/85 px-2 py-0.5 rounded text-[10px] text-slate-300 font-medium">
              ${s.duration}s
            </span>
            ${!s.imageUrl ? `<span class="text-xs text-slate-600 uppercase tracking-widest font-bold">No Sketch Set</span>` : ''}
          </div>
          <div class="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div class="space-y-3">
              <div class="flex flex-wrap gap-1">
                <span class="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-semibold">${s.shotType}</span>
                <span class="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-semibold">${s.angle}</span>
                <span class="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-semibold">${s.movement}</span>
              </div>
              <div class="space-y-1">
                <span class="text-[10px] uppercase text-sky-400 font-bold tracking-wider">Action</span>
                <p class="text-xs text-slate-300 line-clamp-3">${s.action}</p>
              </div>
            </div>
            <div class="space-y-1 border-t border-slate-800/60 pt-2 mt-2">
              <span class="text-[10px] uppercase text-emerald-400 font-bold tracking-wider">Dialogue / Audio</span>
              <p class="text-xs text-slate-300 italic line-clamp-2">${s.dialogue}</p>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-reel.html`;
    a.click();
    URL.revokeObjectURL(url);
    triggerAudioBeep(750, 'sine', 0.15);
  };

  const getAspectClass = () => {
    return ASPECT_RATIOS[aspectRatio]?.className || 'aspect-video';
  };

  return (
    <div className={`p-6 min-h-screen ${st.bg} text-slate-100 flex flex-col gap-6 animate-fade-in relative`}>
      
      {/* Inject Style Overrides for Custom Canvas Transitions */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes board-fade-in {
          from { opacity: 0; transform: scale(0.99); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes board-slide-in {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-board-fade {
          animation: board-fade-in 0.25s ease-out forwards;
        }
        .animate-board-slide {
          animation: board-slide-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      {/* TOP HEADER STATUS & PREFERENCES ACTIONS */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="text-sky-400 w-5 h-5 animate-pulse" />
              Advanced Storyboard Studio
            </h2>

            {/* Syncing Indicators */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold">
              {cloudStatus === 'syncing' && (
                <span className="flex items-center gap-1 text-amber-400">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
                </span>
              )}
              {cloudStatus === 'synced' && (
                <span className="flex items-center gap-1 text-emerald-400" title="All changes saved to Firestore cloud">
                  <Cloud className="w-3 h-3" /> Cloud Synced
                </span>
              )}
              {cloudStatus === 'local' && (
                <span className="flex items-center gap-1 text-slate-400" title="Running locally with IndexedDB fallback backups">
                  <CloudOff className="w-3 h-3" /> Local Backup Only
                </span>
              )}
              {cloudStatus === 'error' && (
                <span className="flex items-center gap-1 text-rose-400" title="Permissions denied or connection unstable">
                  <CloudLightning className="w-3 h-3" /> Sync Deferred
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Build high-fidelity cinematic slides, sketch live frames, choose custom aspect crops, and run animatics with scratch vocal narratives.
          </p>
        </div>

        {/* PROFILE MANAGEMENT DROPDOWN & INPUTS */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-xl">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-sky-400" />
            <select
              value={activeProjectId}
              onChange={(e) => handleLoadProject(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Rename project..."
            className="bg-slate-950 border border-slate-850 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500 w-44"
            title="Edit Storyboard Reel Name"
          />

          <button
            onClick={handleCreateNewProject}
            className="p-1 px-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 rounded text-xs font-bold transition-colors"
            title="Create blank new storyboard project profile"
          >
            New Profile
          </button>

          <button
            onClick={() => handleDeleteProject(activeProjectId)}
            className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded text-xs font-bold transition-colors"
            title="Delete active storyboard project profile"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className={`p-2 rounded border ${st.border} transition-colors ${soundEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500'}`}
            title="Toggle Synthesizer Sound Cue"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button 
            onClick={startAnimatic} 
            className="px-3 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-sky-500/10"
          >
            <Play className="w-3.5 h-3.5" /> Play Animatic
          </button>
          <button 
            onClick={exportHTML} 
            className={`px-3 py-1.5 rounded text-xs font-bold border ${st.border} ${st.btnInactive} flex items-center gap-1.5`}
          >
            <Download className="w-3.5 h-3.5" /> Export HTML
          </button>
          {onBack && (
            <button 
              onClick={onBack} 
              className={`px-3 py-1.5 rounded text-xs font-bold border ${st.border} ${st.btnInactive}`}
            >
              Back
            </button>
          )}
        </div>
      </div>

      {/* REEL SETTINGS / ADVANCED CAPABILITIES PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl items-center">
        
        {/* Aspect Ratio Configurator */}
        <div className="md:col-span-5 flex flex-col gap-2">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Sliders className="w-3 h-3 text-sky-400" /> Cinematic Aspect Crop
          </span>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(ASPECT_RATIOS).map(ratioKey => (
              <button
                key={ratioKey}
                onClick={() => {
                  setAspectRatio(ratioKey);
                  triggerAudioBeep(480, 'sine', 0.05);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold border transition-all ${aspectRatio === ratioKey ? 'bg-sky-600 text-white border-sky-500 shadow-sm shadow-sky-500/20' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'}`}
              >
                {ASPECT_RATIOS[ratioKey].icon}
                <span>{ratioKey}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Transition Styles */}
        <div className="md:col-span-3 flex flex-col gap-2">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Eye className="w-3 h-3 text-emerald-400" /> Animatic Transition
          </span>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['cut', 'fade', 'wipe'] as const).map(style => (
              <button
                key={style}
                onClick={() => {
                  setTransitionStyle(style);
                  triggerAudioBeep(460, 'sine', 0.05);
                }}
                className={`py-1 rounded text-[10px] font-extrabold uppercase transition-all ${transitionStyle === style ? 'bg-slate-800 text-sky-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Voiceover Synthesizer Controls */}
        <div className="md:col-span-4 flex flex-col gap-2 border-l border-slate-850 pl-2">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-indigo-400" /> Voiceover Narrator (TTS)
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={voiceoverEnabled} 
                onChange={(e) => {
                  setVoiceoverEnabled(e.target.checked);
                  triggerAudioBeep(500, 'sine', 0.08);
                }} 
                className="sr-only peer" 
              />
              <div className="w-7 h-4 bg-slate-950 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
            </label>
          </span>

          <div className="grid grid-cols-2 gap-2 opacity-80 peer-checked:opacity-100">
            <div>
              <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                <span>Speed: {voiceRate}x</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.8"
                step="0.1"
                value={voiceRate}
                disabled={!voiceoverEnabled}
                onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-950 h-1 rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                <span>Pitch: {voicePitch}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={voicePitch}
                disabled={!voiceoverEnabled}
                onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-950 h-1 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-slate-800 pb-px mt-2 mb-2">
        <button
          onClick={() => {
            setActiveTab('editor');
            triggerAudioBeep(520, 'sine', 0.05);
          }}
          className={`px-4 py-2 text-xs font-extrabold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${activeTab === 'editor' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Studio Editor
        </button>
        <button
          onClick={() => {
            setActiveTab('script');
            // Auto assemble script from slide descriptions if the script is empty!
            if (!scriptText) {
              const assembled = slides.map(s => `[Scene ${s.sceneNo}, Shot ${s.shotNo} - Duration: ${s.duration}s]\nVISUALS: ${s.action}\nDESCRIPTION: ${s.sceneDescription || '(No scene description entered)'}\nAUDIO: ${s.dialogue}`).join('\n\n');
              setScriptText(assembled);
            }
            triggerAudioBeep(520, 'sine', 0.05);
          }}
          className={`px-4 py-2 text-xs font-extrabold uppercase tracking-widest border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'script' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          <FileText className="w-4 h-4" /> Script Writer & Cue Points
        </button>
      </div>

      {/* MAIN STUDIO CONTENT SPLIT */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Thumbnail/Slide List Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
              Slides Reel ({slides.length})
            </span>
            <button 
              onClick={handleAddSlide} 
              className="px-2.5 py-1 bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 rounded text-[10px] font-extrabold uppercase flex items-center gap-1 transition-all"
            >
              <Plus className="w-3 h-3" /> Add Slide
            </button>
          </div>

          {/* Bulk image and folder upload section */}
          <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900/50 rounded-lg border border-slate-800/80">
            <label className="cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded px-2 py-1.5 text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-all text-center shadow-sm hover:text-sky-400">
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Add Images</span>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={handleBatchImageUpload} 
                className="hidden" 
              />
            </label>
            <label className="cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded px-2 py-1.5 text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-all text-center shadow-sm hover:text-emerald-400">
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Folder</span>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                {...{ webkitdirectory: "", directory: "" }}
                onChange={handleBatchImageUpload} 
                className="hidden" 
              />
            </label>
          </div>

          {/* Bulk Operations Toolbar */}
          {selectedSlideIds.length > 0 && (
            <div className="bg-slate-900 border border-sky-500/30 p-2.5 rounded-lg flex flex-col gap-2 shadow-lg shadow-sky-500/5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-widest flex items-center gap-1">
                  Selected: {selectedSlideIds.length} Slide{selectedSlideIds.length > 1 ? 's' : ''}
                </span>
                <button 
                  onClick={() => {
                    setSelectedSlideIds([]);
                    triggerAudioBeep(200, 'sine', 0.05);
                  }}
                  className="text-[9px] font-bold text-slate-500 hover:text-slate-300"
                >
                  Deselect All
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1">
                <button
                  onClick={() => handleMoveMultiple('start')}
                  className="px-1 py-1.5 bg-slate-950 hover:bg-slate-800 text-[9px] font-bold text-slate-300 rounded border border-slate-800 hover:text-white transition-colors"
                  title="Move to Start"
                >
                  ⇾ Start
                </button>
                <button
                  onClick={() => handleMoveMultiple('up')}
                  className="px-1 py-1.5 bg-slate-950 hover:bg-slate-800 text-[9px] font-bold text-slate-300 rounded border border-slate-800 hover:text-white transition-colors"
                  title="Move Selected Up"
                >
                  ▲ Up
                </button>
                <button
                  onClick={() => handleMoveMultiple('down')}
                  className="px-1 py-1.5 bg-slate-950 hover:bg-slate-800 text-[9px] font-bold text-slate-300 rounded border border-slate-800 hover:text-white transition-colors"
                  title="Move Selected Down"
                >
                  ▼ Down
                </button>
                <button
                  onClick={() => handleMoveMultiple('end')}
                  className="px-1 py-1.5 bg-slate-950 hover:bg-slate-800 text-[9px] font-bold text-slate-300 rounded border border-slate-800 hover:text-white transition-colors"
                  title="Move to End"
                >
                  ⇾ End
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${selectedSlideIds.length} selected slides?`)) {
                      setSlides(slides.filter(s => !selectedSlideIds.includes(s.id)));
                      setSelectedSlideIds([]);
                      triggerAudioBeep(220, 'sine', 0.15);
                    }
                  }}
                  className="px-1 py-1.5 bg-rose-950/20 hover:bg-rose-950/40 text-[9px] font-bold text-rose-400 rounded border border-rose-900/30 transition-colors"
                  title="Delete Selected"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-[64vh] overflow-y-auto pr-1">
            {slides.map((s, idx) => {
              const isSelected = selectedSlideIds.includes(s.id);
              return (
                <div 
                  key={s.id}
                  onClick={() => { setActiveSlideId(s.id); triggerAudioBeep(350, 'sine', 0.05); }}
                  className={`group border rounded-xl overflow-hidden cursor-pointer transition-all ${activeSlideId === s.id ? 'border-sky-500 bg-sky-500/5 shadow-md shadow-sky-500/5' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'}`}
                >
                  <div className="flex gap-3 p-3 items-center">
                    {/* Multi-select checkbox */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) {
                          setSelectedSlideIds(selectedSlideIds.filter(id => id !== s.id));
                        } else {
                          setSelectedSlideIds([...selectedSlideIds, s.id]);
                        }
                        triggerAudioBeep(450, 'sine', 0.05);
                      }}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${isSelected ? 'bg-sky-500 border-sky-400 text-white scale-110' : 'border-slate-700 bg-slate-950/80 hover:border-slate-500'}`}
                      title="Select Slide"
                    >
                      {isSelected && <span className="text-[10px] leading-none font-bold">✓</span>}
                    </div>

                    {/* Miniature frame responsive aspect */}
                    <div 
                      className="w-24 h-16 rounded bg-slate-950 flex-shrink-0 flex items-center justify-center relative overflow-hidden border border-slate-800/40"
                      style={s.imageUrl.startsWith('linear-gradient') ? { background: s.imageUrl } : s.imageUrl ? { backgroundImage: `url('${s.imageUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                    >
                      {!s.imageUrl && <Layout className="w-4 h-4 text-slate-700" />}
                      <span className="absolute bottom-1 right-1 bg-slate-950/80 px-1 rounded text-[8px] text-slate-400">
                        {s.duration}s
                      </span>
                    </div>

                    {/* Descriptions */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-sky-400">
                            S{s.sceneNo} - Shot {s.shotNo}
                          </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleMove(idx, 'up'); }}
                            disabled={idx === 0}
                            className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Move Up"
                          >
                            <MoveUp className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleMove(idx, 'down'); }}
                            disabled={idx === slides.length - 1}
                            className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Move Down"
                          >
                            <MoveDown className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDuplicate(s); }}
                            className="p-0.5 text-slate-400 hover:text-white"
                            title="Duplicate Slide"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteSlide(s.id); }}
                            className="p-0.5 text-slate-400 hover:text-rose-400"
                            title="Delete Slide"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-1">{s.action || 'No description'}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold">{s.shotType}</span>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>

        {/* Right Side: Active Slide Canvas Editor & Metadata */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Active Canvas Frame Visualizer */}
          <div className="md:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div 
                className="w-full flex items-center justify-center bg-slate-950 relative overflow-hidden transition-all duration-300"
                style={{
                  aspectRatio: aspectRatio.replace(':', '/'),
                  background: activeSlide?.imageUrl?.startsWith('linear-gradient') ? activeSlide.imageUrl : undefined,
                  backgroundImage: activeSlide?.imageUrl && !activeSlide.imageUrl.startsWith('linear-gradient') ? `url('${activeSlide.imageUrl}')` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur border border-slate-800 rounded px-2.5 py-1 flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-widest">
                    Scene {activeSlide?.sceneNo} • Shot {activeSlide?.shotNo}
                  </span>
                </div>

                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <span className="bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded text-xs font-mono text-emerald-400">
                    {activeSlide?.duration}s duration
                  </span>
                </div>

                {!activeSlide?.imageUrl && (
                  <div className="text-center p-6 space-y-2">
                    <Layout className="w-10 h-10 text-slate-700 mx-auto" />
                    <p className="text-xs text-slate-500">No Visual Frame Sketch Set</p>
                  </div>
                )}
              </div>

              {/* Action Buttons underneath visualizer */}
              <div className="p-3 bg-slate-950 flex flex-wrap items-center justify-between border-t border-slate-800 gap-2">
                <div className="flex gap-2">
                  <button 
                    onClick={openDrawingCanvas} 
                    className="px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded text-xs font-bold flex items-center gap-1 border border-sky-500/20"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Sketch/Draw Frame
                  </button>
                  <label className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold flex items-center gap-1 border border-slate-700 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> Upload Image
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                {/* Preset background selector */}
                <div className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-slate-400" />
                  <div className="flex gap-1">
                    {PLACEHOLDER_SKETCHES.map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => updateSlideField(activeSlideId, 'imageUrl', preset.value)}
                        className="w-5 h-5 rounded-full border border-slate-700 transition-transform hover:scale-115"
                        style={{ background: preset.value }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Generator prompt panel */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
              <label className="text-[10px] font-extrabold text-sky-400 uppercase tracking-widest block">
                AI Cinematic Concept Assistant
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. dramatic shot of hacker looking at screens, neon green backlight"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
                <button
                  onClick={handleAIEnhance}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 disabled:opacity-40"
                >
                  {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Generate Spec
                </button>
              </div>
            </div>

            {/* Scene Description Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" /> Scene Description Panel
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  S{activeSlide?.sceneNo || '1'}-Shot {activeSlide?.shotNo || '1'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Describe this scene or screenplay context below. Your scene details will be automatically compiled into the master script tab.
              </p>
              <textarea
                value={activeSlide?.sceneDescription || ''}
                onChange={(e) => updateSlideField(activeSlideId, 'sceneDescription', e.target.value)}
                rows={3}
                placeholder="Describe the action, scene settings, and visual atmosphere..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>

          </div>

          {/* Active Spec details panel */}
          <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div 
              onClick={() => {
                setIsSpecExpanded(!isSpecExpanded);
                triggerAudioBeep(480, 'sine', 0.05);
              }}
              className="flex justify-between items-center cursor-pointer select-none pb-1 group/spec"
            >
              <span className="text-xs font-extrabold text-slate-400 group-hover/spec:text-sky-400 uppercase tracking-widest block transition-colors">
                Slide Technical Spec
              </span>
              <button className="text-slate-500 group-hover/spec:text-white text-xs font-bold px-2 py-0.5 bg-slate-950/60 rounded border border-slate-800 transition-all">
                {isSpecExpanded ? "Fold ▴" : "Expand ▾"}
              </button>
            </div>

            {isSpecExpanded ? (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Scene #</label>
                    <input
                      type="text"
                      value={activeSlide?.sceneNo || ''}
                      onChange={(e) => updateSlideField(activeSlideId, 'sceneNo', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Shot #</label>
                    <input
                      type="text"
                      value={activeSlide?.shotNo || ''}
                      onChange={(e) => updateSlideField(activeSlideId, 'shotNo', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Shot Type</label>
                  <select
                    value={activeSlide?.shotType || 'Medium Shot'}
                    onChange={(e) => updateSlideField(activeSlideId, 'shotType', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    {PRESET_SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Camera Angle</label>
                    <select
                      value={activeSlide?.angle || 'Eye Level'}
                      onChange={(e) => updateSlideField(activeSlideId, 'angle', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                    >
                      {PRESET_ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Duration (s)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={activeSlide?.duration || 3}
                      onChange={(e) => updateSlideField(activeSlideId, 'duration', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono text-emerald-400 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Camera Movement</label>
                  <select
                    value={activeSlide?.movement || 'Static'}
                    onChange={(e) => updateSlideField(activeSlideId, 'movement', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    {PRESET_MOVEMENTS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Action Description</label>
                  <textarea
                    value={activeSlide?.action || ''}
                    onChange={(e) => updateSlideField(activeSlideId, 'action', e.target.value)}
                    rows={3}
                    placeholder="What occurs in the frame?"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 placeholder-slate-700"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Dialogue / Audio Cues</label>
                  <textarea
                    value={activeSlide?.dialogue || ''}
                    onChange={(e) => updateSlideField(activeSlideId, 'dialogue', e.target.value)}
                    rows={2}
                    placeholder="What voiceovers or music cues accompany this shot?"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 italic placeholder-slate-700"
                  />
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic text-center py-5 bg-slate-950/20 rounded-xl border border-slate-850/60">
                Click "Expand ▾" above to view scene parameters, camera angles, movement, and dialogues.
              </p>
            )}
          </div>

        </div>

      </div>
      )}

      {/* SCRIPT TAB WRITER VIEW */}
      {activeTab === 'script' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          {/* Left Column: Script Editor */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-400" />
                    Assembled Screenplay / Script Writer
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Write and edit your master script text here.</p>
                </div>
                <button
                  onClick={() => {
                    const assembled = slides.map(s => `[Scene ${s.sceneNo}, Shot ${s.shotNo} - Duration: ${s.duration}s]\nVISUALS: ${s.action}\nDESCRIPTION: ${s.sceneDescription || '(No scene description entered)'}\nAUDIO: ${s.dialogue}`).join('\n\n');
                    setScriptText(assembled);
                    triggerAudioBeep(600, 'sine', 0.1);
                  }}
                  className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 rounded text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Re-Assemble from Slides
                </button>
              </div>

              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                rows={18}
                placeholder="Write your master production screenplay here... Click 'Re-Assemble from Slides' above to import description panels automatically."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono leading-relaxed"
              />
            </div>
          </div>

          {/* Right Column: Cue Points & Interactive Image Assigning */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Production Cue Points</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Assign storyboard frames to specific audio/script cues.</p>
                </div>
                <button
                  onClick={() => {
                    const newCue = {
                      id: `cue-${Date.now()}`,
                      timeCode: '00:00',
                      text: 'New script cue point...',
                      assignedSlideId: slides[0]?.id
                    };
                    setCuePoints([...cuePoints, newCue]);
                    triggerAudioBeep(600, 'sine', 0.05);
                  }}
                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Cue
                </button>
              </div>

              {cuePoints.length === 0 ? (
                <div className="text-center py-8 bg-slate-950/40 rounded-xl border border-dashed border-slate-800/80 p-4">
                  <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No cue points added yet.</p>
                  <button
                    onClick={() => {
                      setCuePoints([{ id: `cue-${Date.now()}`, timeCode: '00:00', text: 'Opening sequence...', assignedSlideId: slides[0]?.id }]);
                    }}
                    className="mt-3 px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs hover:text-white"
                  >
                    Add First Cue Point
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {cuePoints.map((cue) => {
                    const assignedSlide = slides.find(s => s.id === cue.assignedSlideId);
                    return (
                      <div key={cue.id} className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3 relative group/cue hover:border-slate-755 transition-all">
                        {/* Remove Cue button */}
                        <button
                          onClick={() => {
                            setCuePoints(cuePoints.filter(c => c.id !== cue.id));
                            triggerAudioBeep(220, 'sine', 0.1);
                          }}
                          className="absolute top-3 right-3 text-slate-600 hover:text-rose-400 opacity-0 group-hover/cue:opacity-100 transition-opacity"
                          title="Delete Cue Point"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex gap-3 items-start">
                          <div className="w-16 shrink-0">
                            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Time</label>
                            <input
                              type="text"
                              value={cue.timeCode}
                              onChange={(e) => {
                                setCuePoints(cuePoints.map(c => c.id === cue.id ? { ...c, timeCode: e.target.value } : c));
                              }}
                              placeholder="00:00"
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-emerald-400 font-mono font-semibold focus:outline-none focus:border-emerald-500 text-center"
                            />
                          </div>

                          <div className="flex-1">
                            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Cue Trigger Description</label>
                            <input
                              type="text"
                              value={cue.text}
                              onChange={(e) => {
                                setCuePoints(cuePoints.map(c => c.id === cue.id ? { ...c, text: e.target.value } : c));
                              }}
                              placeholder="e.g. Character turns and looks directly into the lens"
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                            />
                          </div>
                        </div>

                        {/* Slide image selector */}
                        <div className="border-t border-slate-850 pt-2.5 flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Assign Storyboard Frame</label>
                            <select
                              value={cue.assignedSlideId || ''}
                              onChange={(e) => {
                                setCuePoints(cuePoints.map(c => c.id === cue.id ? { ...c, assignedSlideId: e.target.value } : c));
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer font-mono text-[11px]"
                            >
                              <option value="">-- Select Slide --</option>
                              {slides.map(s => (
                                <option key={s.id} value={s.id}>
                                  S{s.sceneNo} - Shot {s.shotNo} ({s.shotType})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Image preview */}
                          <div className="w-16 h-11 bg-slate-950 rounded border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center relative">
                            {assignedSlide?.imageUrl ? (
                              assignedSlide.imageUrl.startsWith('linear-gradient') ? (
                                <div className="w-full h-full" style={{ background: assignedSlide.imageUrl }} />
                              ) : (
                                <img src={assignedSlide.imageUrl} alt="cue frame" className="w-full h-full object-cover" />
                              )
                            ) : (
                              <Eye className="w-4 h-4 text-slate-800" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* DRAWING CANVAS MODAL DIALOG */}
      {isDrawingOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur z-[150] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">
                  Cinematic Sketchpad ({aspectRatio})
                </span>
              </div>
              <button 
                onClick={() => setIsDrawingOpen(false)} 
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Shape and tool toolbar */}
            <div className="p-3 bg-slate-950/80 border-b border-slate-850 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1">
                {/* Free Drawing */}
                <button
                  onClick={() => setDrawMode('brush')}
                  className={`p-1.5 rounded text-xs font-bold transition-all ${drawMode === 'brush' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                  title="Freehand Pencil"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                {/* Eraser */}
                <button
                  onClick={() => setDrawMode('eraser')}
                  className={`p-1.5 rounded text-xs font-bold transition-all ${drawMode === 'eraser' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                  title="Eraser Tool"
                >
                  <Eraser className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-slate-800 mx-1" />
                {/* Line */}
                <button
                  onClick={() => setDrawMode('line')}
                  className={`p-1.5 rounded text-xs font-bold transition-all ${drawMode === 'line' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                  title="Straight Line"
                >
                  <span className="w-4 h-4 block border-b border-current translate-y-1.5 rotate-45 transform" />
                </button>
                {/* Arrow */}
                <button
                  onClick={() => setDrawMode('arrow')}
                  className={`p-1.5 rounded text-xs font-bold transition-all ${drawMode === 'arrow' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                  title="Motion Arrow"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                {/* Rectangle */}
                <button
                  onClick={() => setDrawMode('rect')}
                  className={`p-1.5 rounded text-xs font-bold transition-all ${drawMode === 'rect' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                  title="Rectangle Shape"
                >
                  <SquareIcon className="w-4 h-4" />
                </button>
                {/* Circle */}
                <button
                  onClick={() => setDrawMode('circle')}
                  className={`p-1.5 rounded text-xs font-bold transition-all ${drawMode === 'circle' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                  title="Focus Circle"
                >
                  <Circle className="w-4 h-4" />
                </button>
                {/* Text tool */}
                <button
                  onClick={() => {
                    setDrawMode('text');
                    triggerAudioBeep(520, 'sine', 0.05);
                  }}
                  className={`p-1.5 rounded text-xs font-bold transition-all ${drawMode === 'text' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                  title="Text Input Tool"
                >
                  <Type className="w-4 h-4" />
                </button>
              </div>

              {/* Undo and Redo operations */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300"
                  title="Undo Stroke"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300"
                  title="Redo Stroke"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-center bg-slate-950 p-4 overflow-auto">
              <canvas
                ref={canvasRef}
                width={ASPECT_RATIOS[aspectRatio]?.canvasWidth || 560}
                height={ASPECT_RATIOS[aspectRatio]?.canvasHeight || 315}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="border border-slate-800 rounded bg-slate-950 cursor-crosshair shadow-inner transition-all"
              />
            </div>

            {/* Canvas Controls */}
            <div className="p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {['#38bdf8', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#ffffff'].map(c => (
                    <button
                      key={c}
                      onClick={() => setDrawColor(c)}
                      className={`w-6 h-6 rounded-full border ${drawColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500 font-bold">Size:</span>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    value={drawWidth}
                    onChange={(e) => setDrawWidth(parseInt(e.target.value))}
                    className="w-20 accent-sky-500"
                  />
                </div>
                {drawMode === 'text' && (
                  <div className="flex items-center gap-1.5 animate-fade-in border-l border-slate-800 pl-3">
                    <span className="text-[10px] text-sky-400 font-extrabold uppercase">Text:</span>
                    <input
                      type="text"
                      value={textToInsert}
                      onChange={(e) => setTextToInsert(e.target.value)}
                      placeholder="Enter sketch text..."
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 w-32 font-medium"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={clearCanvas} 
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-xs font-bold"
                >
                  Clear Pad
                </button>
                <button 
                  onClick={saveCanvasDrawing} 
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold shadow"
                >
                  Apply Sketch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANIMATIC LIVE PLAYER MODAL DIALOG */}
      {isPlaying && (
        <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center p-6 animate-fade-in">
          <div className="max-w-4xl w-full flex flex-col gap-4">
            
            {/* Animatic Video Box (with Transition Effect classes) */}
            <div 
              key={playbackIndex}
              className={`w-full rounded-2xl flex items-center justify-center bg-slate-950 relative overflow-hidden shadow-2xl border border-slate-800 transition-all ${
                transitionStyle === 'fade' ? 'animate-board-fade' : transitionStyle === 'wipe' ? 'animate-board-slide' : ''
              }`}
              style={{
                aspectRatio: aspectRatio.replace(':', '/'),
                background: slides[playbackIndex]?.imageUrl?.startsWith('linear-gradient') ? slides[playbackIndex].imageUrl : undefined,
                backgroundImage: slides[playbackIndex]?.imageUrl && !slides[playbackIndex].imageUrl.startsWith('linear-gradient') ? `url('${slides[playbackIndex].imageUrl}')` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="absolute top-4 left-4 bg-slate-950/80 px-3 py-1 rounded text-xs text-sky-400 font-bold border border-slate-800/50">
                Scene {slides[playbackIndex]?.sceneNo} • Shot {slides[playbackIndex]?.shotNo}
              </div>

              {/* Subtitles Overlay */}
              <div className="absolute bottom-6 left-6 right-6 text-center bg-slate-950/85 border border-slate-800/80 p-4 rounded-xl backdrop-blur">
                <p className="text-sm font-bold text-slate-100">{slides[playbackIndex]?.action}</p>
                {slides[playbackIndex]?.dialogue && (
                  <p className="text-xs text-emerald-400 font-semibold italic mt-1.5">{slides[playbackIndex]?.dialogue}</p>
                )}
              </div>

              {!slides[playbackIndex]?.imageUrl && (
                <div className="text-center p-6">
                  <Layout className="w-12 h-12 text-slate-800 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs text-slate-600">Storyboard Placeholder Card</p>
                </div>
              )}
            </div>

            {/* Timeline Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div 
                className="bg-sky-500 h-full transition-all duration-75"
                style={{ width: `${playbackProgress}%` }}
              />
            </div>

            {/* Playback Controls Panel */}
            <div className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
              <span className="text-xs font-semibold text-slate-400">
                Playing Frame {playbackIndex + 1} of {slides.length}
              </span>

              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    if (playbackIndex > 0) {
                      setPlaybackIndex(prev => prev - 1);
                      triggerAudioBeep(400, 'sine', 0.08);
                    }
                  }}
                  disabled={playbackIndex === 0}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button 
                  onClick={() => { 
                    setIsPlaying(false); 
                    triggerAudioBeep(200, 'sawtooth', 0.2); 
                    if (voiceoverEnabled) window.speechSynthesis.cancel();
                  }} 
                  className="p-3 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-lg"
                >
                  <SquareIcon className="w-5 h-5 fill-white" />
                </button>

                <button 
                  onClick={() => {
                    if (playbackIndex < slides.length - 1) {
                      setPlaybackIndex(prev => prev + 1);
                      triggerAudioBeep(480, 'sine', 0.08);
                    }
                  }}
                  disabled={playbackIndex === slides.length - 1}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <span className="text-xs font-bold text-sky-400 font-mono">
                Duration: {slides[playbackIndex]?.duration}s
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
