import ToolOrderSettingsModal from './ToolOrderSettingsModal';
import React, { useState, useEffect, useRef } from 'react';
import { themeStyles } from '../constants/creativeStudioTheme';
import { saveUserPreference, loadUserPreference } from '../services/storage';
import { SegCarverTool } from './CreationStudio/SegCarverTool';
import { ScriptWriter } from './CreationStudio/ScriptWriter';
import { VideoScriptWriter } from './CreationStudio/VideoScriptWriter';
import { ImageDescriber } from './CreationStudio/ImageDescriber';
import { ImageCarverTool } from './CreationStudio/ImageCarverTool';
import MIPrOMPTLibraryView from './MIPrOMPTLibraryView';
import { BRollSearcher } from './CreationStudio/BRollSearcher';
import { SubtitlerTranslator } from './CreationStudio/SubtitlerTranslator';
import { AdvancedStoryboarder } from './CreationStudio/AdvancedStoryboarder';
import { StoryboardXL } from './CreationStudio/StoryboardXL';
import { MoodboardGenerator } from './CreationStudio/MoodboardGenerator';
import { CueSheetPlanner } from './CreationStudio/CueSheetPlanner';
import { VoiceoverDirector } from './CreationStudio/VoiceoverDirector';
import { ShotListBuilder } from './CreationStudio/ShotListBuilder';
import { ThumbnailHookSuite } from './CreationStudio/ThumbnailHookSuite';
import { Session, MediaItem, MIPrOMPTItem } from '../types';
import SxaBoardTool from '../src/media_suite/SxaBoardTool/App';
import FilmStripEditor from '../src/media_suite/FilmStripEditor/App';
import AniComposer from '../src/media_suite/AniComposer/App';
import MagicLayers from '../src/media_suite/MagicLayers/App';

export const MediaSuiteView: React.FC<{ 
  onBack: () => void,
  session: Session | null,
  sessions: Session[],
  onSaveArtifact: (item: MediaItem) => void,
  onRunTool: (toolId: string, payload?: any) => void,
  miprompts?: MIPrOMPTItem[],
  onAddMIPrOMPT?: (type: 'prB' | 'ctB' | 'txS', content: string, title?: string) => void,
  onUpdateMIPrOMPT?: (id: string, updates: Partial<MIPrOMPTItem>) => void,
  onDeleteMIPrOMPT?: (id: string) => void,
  onImportCSV?: (csvText: string) => void,
  currentTheme?: string,
  isLoading?: boolean
}> = ({ 
  onBack, 
  session, 
  sessions, 
  onSaveArtifact, 
  onRunTool,
  miprompts = [],
  onAddMIPrOMPT = () => {},
  onUpdateMIPrOMPT = () => {},
  onDeleteMIPrOMPT = () => {},
  onImportCSV = () => {},
  currentTheme,
  isLoading = false
}) => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [ytLink, setYtLink] = useState('');
  const [ytFile, setYtFile] = useState<File | null>(null);
  const [ytDuration, setYtDuration] = useState('3');
  const hasActiveSession = !!session;
  
  const themes = ['charcoal', 'silver', 'white', 'cosmic', 'emerald', 'amber', 'cyberpunk', 'slate', 'crimson', 'orchid', 'olive'];
  const [localTheme, setLocalTheme] = useState(() => {
    const saved = localStorage.getItem('creative_studio_theme');
    return saved && themes.includes(saved) ? saved : 'charcoal';
  });

  React.useEffect(() => {
    const handleThemeChange = () => {
      const saved = localStorage.getItem('creative_studio_theme');
      if (saved && themes.includes(saved)) {
        setLocalTheme(saved);
      }
    };
    window.addEventListener('creative_studio_theme_change', handleThemeChange);
    return () => window.removeEventListener('creative_studio_theme_change', handleThemeChange);
  }, []);

  const [viewMode, setViewMode] = useState<'compact' | 'strip' | 'icon'>(() => {
    try {
      const saved = localStorage.getItem('pref_mediaSuiteViewMode');
      if (saved) return JSON.parse(saved);
    } catch {}
    return 'compact';
  });
  
  useEffect(() => {
    loadUserPreference('mediaSuiteViewMode').then(saved => {
      if (saved) setViewMode(saved);
    });
  }, []);

  const handleViewModeChange = () => {
    const nextMode = viewMode === 'compact' ? 'strip' : viewMode === 'strip' ? 'icon' : 'compact';
    setViewMode(nextMode);
    saveUserPreference('mediaSuiteViewMode', nextMode);
  };
  const st = themeStyles[localTheme];

  const tools = [
    {
      id: 'seg_carver',
      title: 'Segment Editor',
      description: 'Take any image and disect it into smaller sections for use in a storyboard',
      icon: (
        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500',
      disabled: false
    },
    {
      id: 'video_script_writer',
      title: 'Video Script Writer',
      description: 'Write complete A/V video scripts and scene directions.',
      icon: (
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      ),
      color: 'bg-red-500/10 border-red-500/30 hover:border-red-500',
      disabled: false
    },
    {
      id: 'script_writer',
      title: 'Script Writer',
      description: 'Compose professional screenplay scripts with text, reference images, and suggestive ideas.',
      icon: (
        <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-500',
      disabled: false
    },
    {
      id: 'image_describer',
      title: 'Image Describer',
      description: 'Take any image and describe its contents, style, and colors in rich detail with custom modes.',
      icon: (
        <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      color: 'bg-teal-500/10 border-teal-500/30 hover:border-teal-500',
      disabled: false
    },
    {
      id: 'filmstrip_editor',
      title: 'FilmStrip Editor',
      description: 'Synchronized sequence storyboarder & voiceover synthesizer with custom grid slicer.',
      icon: (
        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      color: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500',
      disabled: false
    },
    {
      id: 'storyboard_xl',
      title: 'Storyboard XL',
      description: 'Draw detailed story scenes, frame shots, define timing/notes, and preview live animatics in XL edition.',
      icon: (
        <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM4 21a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" />
        </svg>
      ),
      color: 'bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-400',
      disabled: false
    },
    {
      id: 'youtube_transcript',
      title: 'YouTube Transcript Generator',
      description: 'Generate transcripts from YouTube links or video file uploads.',
      icon: (
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-red-500/10 border-red-500/30 hover:border-red-500',
      disabled: false
    },
    {
      id: 'image_generator',
      title: 'Image Generator Prompts',
      description: 'Create detailed Prompts for AI image generators (Midjourney/DALL-E) from context.',
      icon: (
        <svg className="w-8 h-8 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-fuchsia-500/10 border-fuchsia-500/30 hover:border-fuchsia-500',
      disabled: !hasActiveSession
    },
    {
      id: 'image_carver',
      title: 'Image Carver',
      description: 'Precision-crop and slice images into geometric grids.',
      icon: (
        <svg className="w-8 h-8 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-sky-500/10 border-sky-500/30 hover:border-sky-500',
      disabled: false
    },
    {
      id: 'broll_searcher',
      title: 'B-Roll Searcher & Gen',
      description: 'Analyze video scripts to dynamically generate prompts and search keywords for B-roll footage.',
      icon: (
        <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10v4h4" />
        </svg>
      ),
      color: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500',
      disabled: false
    },
    {
      id: 'subtitler',
      title: 'Subtitler & Translator',
      description: 'Extract subtitles from an uploaded video and instantly translate into multiple SRT files.',
      icon: (
        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      ),
      color: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500',
      disabled: false
    },
    {
      id: 'audio_cleaner',
      title: 'AI Audio Cleaner',
      description: 'Remove background noise and enhance speech for crystal clear vocals.',
      icon: (
        <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M8 12h.01M12 12h.01M16 12h.01" />
        </svg>
      ),
      color: 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500',
      disabled: false
    },
    {
      id: 'color_grader',
      title: 'Cinematic Color Grader',
      description: 'Apply AI-driven color grading prompts, cinematic LUTs, and mood adjustments.',
      icon: (
        <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      color: 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500',
      disabled: false
    },
    {
      id: 'advanced_storyboarder',
      title: 'Advanced Storyboard Studio',
      description: 'Draw detailed story scenes, frame shots, define timing/notes, and preview live animatics.',
      icon: (
        <svg className="w-8 h-8 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM4 21a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" />
        </svg>
      ),
      color: 'bg-sky-500/10 border-sky-500/30 hover:border-sky-500',
      disabled: false
    },
    {
      id: 'moodboard_creator',
      title: 'Moodboard & Concept Builder',
      description: 'Curate thematic styles, extract visual references with AI, and design aesthetic color palettes.',
      icon: (
        <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500',
      disabled: false
    },
    {
      id: 'cue_sheet_planner',
      title: 'A/V Sound & Cue Sheet Planner',
      description: 'Choreograph audio stems, volume slopes, and trigger conditions on a synchronized timeline.',
      icon: (
        <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
      color: 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500',
      disabled: false
    },
    {
      id: 'voiceover_director',
      title: 'Voiceover Script Director',
      description: 'Format script lines, auto-calculate reading timings, set tone guides, and test spoken playbacks.',
      icon: (
        <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      color: 'bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-500',
      disabled: false
    },
    {
      id: 'shot_list_builder',
      title: 'Cinematic Shot List Builder',
      description: 'Define camera types, lens lengths, moody lighting, and track production status on set.',
      icon: (
        <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-teal-500/10 border-teal-500/30 hover:border-teal-500',
      disabled: false
    },
    {
      id: 'thumbnail_mockup_suite',
      title: 'Thumbnail & Hook Suite',
      description: 'Simulate user social media cards, generate alternative high-CTR hooks, and preview feeds.',
      icon: (
        <svg className="w-8 h-8 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      color: 'bg-fuchsia-500/10 border-fuchsia-500/30 hover:border-fuchsia-500',
      disabled: false
    },
    {
      id: 'miprompt_library',
      title: 'MyPrompt Lib',
      description: 'Access, manage, import, and export your structured prompts and blueprints.',
      icon: (
        <svg className="w-8 h-8 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'bg-fuchsia-500/10 border-fuchsia-500/30 hover:border-fuchsia-500',
      disabled: false
    },
    {
      id: 'sxa_board',
      title: 'SeqFrame Editor',
      description: 'Create and organize storyboards with multi-select support, sketching, and export capabilities.',
      icon: (
        <svg className="w-8 h-8 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      color: 'bg-sky-500/10 border-sky-500/30 hover:border-sky-500',
      disabled: false
    },
    {
      id: 'ani_composer',
      title: 'AniComposer',
      description: 'Turn storyboard plates into a timed animatic with camera moves, transitions, captions and a scratch soundtrack.',
      icon: (
        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l4 3-4 3V9z" />
        </svg>
      ),
      color: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-400',
      disabled: false
    },
    {
      id: 'magic_layers',
      title: 'Magic Layers',
      description: 'Split any image into colour-separated component layers with K-means clustering — compare, explode and export each layer as a PNG.',
      icon: (
        <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l9 5-9 5-9-5 9-5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9 5 9-5M3 16l9 5 9-5" />
        </svg>
      ),
      color: 'bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-400',
      disabled: false
    }
  ];

  const defaultOrder = tools.map(t => t.id);
  const [toolOrder, setToolOrder] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pref_mediaSuiteToolOrder');
      if (saved) {
         const parsed = JSON.parse(saved);
         if (parsed.length === defaultOrder.length) return parsed;
      }
    } catch {}
    return defaultOrder;
  });

  useEffect(() => {
    loadUserPreference('mediaSuiteToolOrder').then(saved => {
      if (saved && Array.isArray(saved)) {
         let newOrder = [...saved];
         defaultOrder.forEach(id => {
            if (!newOrder.includes(id)) {
               if (id === 'storyboard_xl') {
                  newOrder.splice(4, 0, id);
               } else {
                  newOrder.push(id);
               }
            }
         });
         setToolOrder(newOrder);
      }
    });
  }, []);

  const [isToolSettingsOpen, setIsToolSettingsOpen] = React.useState(false);

  const orderedTools = [...tools].sort((a, b) => {
    let indexA = toolOrder.indexOf(a.id);
    let indexB = toolOrder.indexOf(b.id);
    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;
    return indexA - indexB;
  });

  const handleSaveOrder = (newOrder: string[]) => {
    setToolOrder(newOrder);
    saveUserPreference('mediaSuiteToolOrder', newOrder);
  };

  
  const handleGenerateTranscript = () => {
    if (!ytLink && !ytFile) {
      alert("Please provide a YouTube link or upload a video or audio file.");
      return;
    }
    
    if (ytFile) {
      if (ytFile.size > 19 * 1024 * 1024) {
        alert("File is too large for direct upload (max 19MB). Please use a YouTube link instead.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64Data = result.split(',')[1];
        const mediaItem: MediaItem = {
          id: Math.random().toString(36).substring(7),
          name: ytFile.name,
          type: ytFile.type.startsWith('audio/') ? 'audio' : 'video',
          mimeType: ytFile.type,
          data: base64Data
        };
        onRunTool('youtube_transcript', { mediaItem, duration: ytDuration });
      };
      reader.readAsDataURL(ytFile);
    } else {
      const mediaItem: MediaItem = {
        id: Math.random().toString(36).substring(7),
        name: ytLink,
        type: 'link',
        mimeType: 'text/uri-list',
        data: ytLink
      };
      onRunTool('youtube_transcript', { mediaItem, duration: ytDuration });
    }
  };

  const handleToolClick = (id: string) => {
    if (id === 'image_generator') {
      onRunTool('image_generator');
      onBack();
    } else {
      setActiveTool(id);
    }
  };

  const renderActiveTool = () => {
    switch (activeTool) {
      case 'seg_carver':
        return <SegCarverTool />;
      case 'filmstrip_editor':
        return <FilmStripEditor onBack={() => setActiveTool(null)} activeSession={session} onSaveArtifact={onSaveArtifact} />;
      case 'sxa_board':
        return <SxaBoardTool onBack={() => setActiveTool(null)} activeSession={session} onSaveArtifact={onSaveArtifact} />;
      case 'ani_composer':
        return <AniComposer onBack={() => setActiveTool(null)} activeSession={session} onSaveArtifact={onSaveArtifact} />;
      case 'magic_layers':
        return <MagicLayers onBack={() => setActiveTool(null)} activeSession={session} onSaveArtifact={onSaveArtifact} />;
      case 'script_writer':
        return <ScriptWriter session={session} onSaveArtifact={onSaveArtifact} />;
      case 'video_script_writer':
        return <VideoScriptWriter session={session} sessions={sessions} onSaveArtifact={onSaveArtifact} />;
      case 'image_describer':
        return <ImageDescriber session={session} onSaveArtifact={onSaveArtifact} />;
      case 'image_carver':
        return <ImageCarverTool />;
      case 'youtube_transcript':
        return (
          <div className="max-w-3xl mx-auto p-6 md:p-10 animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <h2 className={`text-2xl font-bold ${st.text} flex items-center gap-3`}>
                <span className="p-2 rounded-lg bg-red-500/20 text-red-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                YouTube Transcript Generator
              </h2>
            </div>
            
            <div className={`space-y-6 ${st.cardBg} border ${st.border} rounded-xl p-6`}>
              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-bold ${st.textDim} uppercase mb-2`}>YouTube Link</label>
                  <input 
                    type="text" 
                    value={ytLink}
                    onChange={(e) => { setYtLink(e.target.value); setYtFile(null); }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={`w-full bg-zinc-900/50 border ${st.border} rounded-lg p-3 ${st.text} focus:border-red-500 focus:outline-none transition-colors`}
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={`h-px flex-1 ${st.border}`}></div>
                  <span className={`text-xs font-bold ${st.textDim} uppercase`}>OR</span>
                  <div className={`h-px flex-1 ${st.border}`}></div>
                </div>
                
                <div>
                  <label className={`block text-xs font-bold ${st.textDim} uppercase mb-2`}>Upload Video or Audio File</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="video/*,audio/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setYtFile(e.target.files[0]);
                          setYtLink('');
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors ${ytFile ? 'border-red-500 bg-red-500/5' : `${st.border} bg-zinc-900/20 hover:border-red-500/50 hover:bg-red-500/5`}`}>
                      <svg className={`w-8 h-8 mb-2 ${ytFile ? 'text-red-400' : st.textDim}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className={`text-sm font-bold ${ytFile ? 'text-red-400' : st.text}`}>
                        {ytFile ? ytFile.name : 'Click or drag media file here'}
                      </span>
                      {!ytFile && <span className={`text-xs ${st.textDim} mt-1`}>MP4, MP3, WAV, etc.</span>}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`pt-6 border-t ${st.border}`}>
                <label className={`block text-xs font-bold ${st.textDim} uppercase mb-3`}>Transcription Duration</label>
                <div className="grid grid-cols-4 gap-3">
                  {['1', '3', '5', 'All'].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setYtDuration(dur)}
                      className={`py-2 rounded-lg border text-sm font-bold transition-all ${ytDuration === dur ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' : `bg-zinc-900/30 ${st.border} ${st.textDim} hover:${st.text} hover:border-red-500/50`}`}
                    >
                      {dur === 'All' ? 'Full Video' : `${dur} Min`}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="pt-6">
                <button 
                  onClick={handleGenerateTranscript}
                  disabled={isLoading || (!ytLink && !ytFile)}
                  className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating Transcript...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span>Generate Transcript</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      case 'broll_searcher':
        return <BRollSearcher onBack={onBack} localTheme={localTheme} />;
      case 'subtitler':
        return <SubtitlerTranslator onBack={onBack} localTheme={localTheme} />;
      case 'audio_cleaner':
        return <AudioCleanerWorkspace onBack={() => setActiveTool(null)} localTheme={localTheme} />;
      case 'color_grader':
        return <ColorGraderWorkspace onBack={() => setActiveTool(null)} localTheme={localTheme} />;
      case 'advanced_storyboarder':
        return <AdvancedStoryboarder onBack={() => setActiveTool(null)} localTheme={localTheme} />;
      case 'storyboard_xl':
        return <StoryboardXL onBack={() => setActiveTool(null)} localTheme={localTheme} />;
      case 'moodboard_creator':
        return <MoodboardGenerator onBack={() => setActiveTool(null)} localTheme={localTheme} />;
      case 'cue_sheet_planner':
        return <CueSheetPlanner onBack={() => setActiveTool(null)} localTheme={localTheme} />;
      case 'voiceover_director':
        return <VoiceoverDirector onBack={() => setActiveTool(null)} localTheme={localTheme} />;
      case 'shot_list_builder':
        return <ShotListBuilder onBack={() => setActiveTool(null)} localTheme={localTheme} />;
      case 'thumbnail_mockup_suite':
        return <ThumbnailHookSuite onBack={() => setActiveTool(null)} localTheme={localTheme} />;
      case 'miprompt_library':
        return (
          <MIPrOMPTLibraryView 
            miprompts={miprompts}
            onAdd={onAddMIPrOMPT}
            onUpdate={onUpdateMIPrOMPT}
            onDelete={onDeleteMIPrOMPT}
            onImport={onImportCSV}
            currentTheme={currentTheme}
          />
        );
      default:
        return null;
    }
  };

  if (activeTool) {
    const activeToolData = tools.find(t => t.id === activeTool);
    const hasCustomHeader = activeTool === 'storyboard_xl' || activeTool === 'filmstrip_editor' || activeTool === 'sxa_board' || activeTool === 'ani_composer' || activeTool === 'magic_layers';
    return (
      <div className={`fixed inset-0 z-[100] flex flex-col ${st.bg}`}>
        {!hasCustomHeader && (
          <header className={`p-4 border-b flex items-center justify-between ${st.panelBg} ${st.border}`}>
            <h1 className={`text-xl font-bold ${st.text}`}>{activeToolData?.title}</h1>
            <button 
              onClick={() => setActiveTool(null)} 
              className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 hover:border-rose-600 rounded-lg text-xs font-black transition-all duration-150 cursor-pointer shadow flex items-center gap-1.5"
            >
              <span>Close Tool</span>
            </button>
          </header>
        )}
        <div className={`flex-1 overflow-auto ${st.bg}`}>
          {renderActiveTool()}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${st.bg}`}>
      <header className={`p-4 border-b flex items-center justify-between ${st.panelBg} ${st.border}`}>
        <h1 className={`text-xl font-bold ${st.text}`}>Media Suite</h1>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const nextIndex = (themes.indexOf(localTheme) + 1) % themes.length;
              const nextTheme = themes[nextIndex];
              setLocalTheme(nextTheme);
              localStorage.setItem('creative_studio_theme', nextTheme);
              saveUserPreference('creative_studio_theme', nextTheme);
              window.dispatchEvent(new Event('creative_studio_theme_change'));
            }}
            className={`w-7 h-7 rounded-full border-2 transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer ${
              localTheme === 'charcoal' ? 'bg-zinc-900 border-zinc-600 shadow-md shadow-black/40'
              : localTheme === 'silver' ? 'bg-zinc-300 border-zinc-400 shadow-md shadow-zinc-500/20'
              : localTheme === 'white' ? 'bg-white border-zinc-300 shadow-md'
              : localTheme === 'cosmic' ? 'bg-indigo-900 border-indigo-500 shadow-md shadow-indigo-950/50'
              : localTheme === 'emerald' ? 'bg-emerald-900 border-emerald-500 shadow-md shadow-emerald-950/50'
              : localTheme === 'amber' ? 'bg-amber-600 border-amber-500 shadow-md shadow-amber-950/50'
              : localTheme === 'cyberpunk' ? 'bg-fuchsia-900 border-cyan-400 shadow-md'
              : localTheme === 'slate' ? 'bg-slate-800 border-slate-500 shadow-md'
              : localTheme === 'crimson' ? 'bg-rose-900 border-rose-500 shadow-md shadow-rose-950/50'
              : localTheme === 'orchid' ? 'bg-fuchsia-700 border-fuchsia-500 shadow-md shadow-fuchsia-950/50'
              : 'bg-stone-700 border-stone-500 shadow-md shadow-stone-950/50'
            }`}
            title={`Cycle theme (current: ${localTheme})`}
          />
          <button
            onClick={handleViewModeChange}
            className={`p-1.5 rounded-md transition-colors shadow-sm ${st.btnInactive}`}
            title="Toggle View Mode"
          >
            {viewMode === 'strip' ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            ) : viewMode === 'compact' ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM10 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM16 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                </svg>
            )}
          </button>
          {!activeTool && (
            <button
              onClick={() => setIsToolSettingsOpen(true)}
              className={`p-1.5 rounded-md transition-colors shadow-sm ${st.btnInactive}`}
              title="Reorder Tools"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          <button 
            onClick={onBack} 
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 hover:border-red-600 rounded-lg text-xs font-black transition-all duration-150 shadow cursor-pointer"
            title="Back to Library"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Return to Tools</span>
          </button>
        </div>

      </header>
      <div className="flex-1 overflow-auto p-6">
        <div className={`grid ${viewMode === "icon" ? "grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8" : viewMode === "compact" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"} gap-6`}>
          {orderedTools.map((tool, index) => (
            <button
              key={tool.id}
              onClick={() => {
                if (tool.disabled) return;
                handleToolClick(tool.id);
              }}
              disabled={tool.disabled}
              className={`flex ${viewMode === 'strip' ? 'flex-row items-center space-x-6' : viewMode === 'icon' ? 'flex-col items-center justify-center p-4' : 'flex-col items-start'} ${viewMode !== 'icon' ? 'p-6' : ''} rounded-2xl border transition-all text-left group ${tool.color} ${tool.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-[1.02] cursor-pointer'}`}
            >
              <div className={`p-3 rounded-xl ${st.cardBg} border ${st.border} group-hover:scale-110 transition-transform ${viewMode === 'strip' || viewMode === 'icon' ? 'mb-0' : 'mb-4'}`}>
                {tool.icon}
              </div>
              {viewMode !== 'icon' && (
              <div>
                <h3 className={`font-semibold text-lg mb-2 ${st.text}`}>{index + 1}. {tool.title}</h3>
                <p className={`text-sm ${st.textDim}`}>{tool.description}</p>
              </div>
            )}
            </button>
          ))}
        </div>
      </div>
    
      
    
      <ToolOrderSettingsModal
        isOpen={isToolSettingsOpen}
        onClose={() => setIsToolSettingsOpen(false)}
        tools={tools}
        toolOrder={toolOrder}
        onSave={handleSaveOrder}
        viewModeLabel={`Layout: ${viewMode}`}
        onCycleViewMode={handleViewModeChange}
        themeLabel={`Theme: ${localTheme}`}
        onCycleTheme={() => {
           const themes = ['charcoal', 'silver', 'white', 'cosmic', 'emerald', 'amber', 'cyberpunk', 'slate', 'crimson', 'orchid', 'olive'];
           const nextIndex = (themes.indexOf(localTheme) + 1) % themes.length;
           const nextTheme = themes[nextIndex];
           setLocalTheme(nextTheme);
           localStorage.setItem('creative_studio_theme', nextTheme);
           saveUserPreference('creative_studio_theme', nextTheme);
           window.dispatchEvent(new Event('creative_studio_theme_change'));
        }}
      />
</div>
  );
};

// ==========================================
// AI AUDIO CLEANER WORKSPACE
// ==========================================
interface AudioCleanerProps {
  onBack: () => void;
  localTheme: string;
}

const AudioCleanerWorkspace: React.FC<AudioCleanerProps> = ({ onBack, localTheme }) => {
  const st = themeStyles[localTheme] || themeStyles.charcoal;
  const [noiseReduction, setNoiseReduction] = useState(85);
  const [voicePresence, setVoicePresence] = useState(60);
  const [bassBoost, setBassBoost] = useState(20);
  const [activePreset, setActivePreset] = useState('diner_hiss');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCleaned, setIsCleaned] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const presets = {
    diner_hiss: { name: 'Diner Background Gossip', freq: 150, noiseLevel: 0.25 },
    windy_street: { name: 'Windy City Alleyway', freq: 60, noiseLevel: 0.4 },
    ac_hum: { name: 'Server AC Unit Hum', freq: 50, noiseLevel: 0.15 }
  };

  const handlePlaySim = () => {
    if (isPlaying) {
      handleStopSim();
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      // Create "Voice" representation
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      oscRef.current = osc;

      // Create "Background Noise" representation
      const humOsc = ctx.createOscillator();
      humOsc.type = 'sawtooth';
      humOsc.frequency.setValueAtTime((presets as any)[activePreset].freq, ctx.currentTime);
      
      const noiseGain = ctx.createGain();
      const targetNoise = isCleaned 
        ? (presets as any)[activePreset].noiseLevel * (1 - noiseReduction / 100)
        : (presets as any)[activePreset].noiseLevel;
      noiseGain.gain.setValueAtTime(targetNoise, ctx.currentTime);

      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNodeRef.current = mainGain;

      // Connect nodes
      osc.connect(mainGain);
      humOsc.connect(noiseGain);
      noiseGain.connect(mainGain);
      mainGain.connect(ctx.destination);

      osc.start();
      humOsc.start();
      setIsPlaying(true);
    } catch (e) {
      console.error(e);
      setIsPlaying(true);
    }
  };

  const handleStopSim = () => {
    try {
      if (oscRef.current) oscRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
    } catch {}
    setIsPlaying(false);
  };

  useEffect(() => {
    if (isPlaying) {
      handleStopSim();
      setTimeout(() => handlePlaySim(), 100);
    }
  }, [isCleaned, noiseReduction, activePreset]);

  useEffect(() => {
    return () => {
      try {
        if (oscRef.current) oscRef.current.stop();
        if (audioContextRef.current) audioContextRef.current.close();
      } catch {}
    };
  }, []);

  const runMockClean = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsCleaned(true);
      alert("Audio cleaned successfully using custom AI profile!");
    }, 1500);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-amber-400">
            <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            AI Audio Cleaner Studio
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Isolate voices, dial down room rumble, and filter wind hiss interactively.</p>
        </div>
        <button onClick={onBack} className={`px-3 py-1.5 rounded text-xs font-bold border ${st.border} ${st.btnInactive}`}>Back</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Visual Waveform & Control Playback */}
        <div className="md:col-span-7 bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 font-extrabold uppercase">Audio Input Reference</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsCleaned(!isCleaned)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold border ${isCleaned ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}
              >
                Output: {isCleaned ? 'Filtered Clean voice' : 'Original Raw Noise'}
              </button>
            </div>
          </div>

          {/* Real Animated Waveform Bars */}
          <div className="h-28 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center justify-center px-6 gap-0.5 overflow-hidden relative">
            {Array.from({ length: 42 }).map((_, i) => {
              const baseHeight = Math.sin(i * 0.3) * 30 + 40;
              const cleanHeight = baseHeight * (1 - noiseReduction / 120);
              const activeHeight = isPlaying ? (isCleaned ? cleanHeight : baseHeight) : 6;
              return (
                <div 
                  key={i} 
                  className={`w-1 rounded transition-all duration-300 ${isCleaned ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ 
                    height: `${activeHeight}%`,
                    animationDelay: isPlaying ? `${i * 30}ms` : '0s',
                    animationDuration: '600ms',
                    animationIterationCount: 'infinite',
                    animationName: isPlaying ? 'bounce' : 'none'
                  }}
                />
              );
            })}
            <style>{`
              @keyframes bounce {
                0%, 100% { transform: scaleY(1); }
                50% { transform: scaleY(0.4); }
              }
            `}</style>
          </div>

          {/* Simulated Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePlaySim}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${isPlaying ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}`}
            >
              {isPlaying ? (
                <>
                  <svg className="w-4 h-4 fill-black" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  Stop Test Signal
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 fill-zinc-200" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  Simulate Play Signal
                </>
              )}
            </button>

            <button 
              onClick={runMockClean}
              disabled={isProcessing}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold flex items-center gap-1"
            >
              {isProcessing ? 'Enhancing...' : 'Recalculate AI Voice Filter'}
            </button>
          </div>
        </div>

        {/* Sliders Configuration */}
        <div className="md:col-span-5 bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-5">
          <span className="text-[10px] text-zinc-400 font-extrabold uppercase">Parameter Settings</span>

          <div>
            <label className="text-[10px] text-zinc-400 font-bold block mb-1">Preset Scene Sample</label>
            <select
              value={activePreset}
              onChange={(e) => setActivePreset(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200"
            >
              {Object.entries(presets).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-bold mb-1">
                <span>Noise Isolation Strength</span>
                <span className="text-amber-400 font-mono font-bold">{noiseReduction}%</span>
              </div>
              <input 
                type="range"
                min="10"
                max="100"
                value={noiseReduction}
                onChange={(e) => setNoiseReduction(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-bold mb-1">
                <span>Voice Presence Boost</span>
                <span className="text-amber-400 font-mono font-bold">{voicePresence}%</span>
              </div>
              <input 
                type="range"
                min="0"
                max="100"
                value={voicePresence}
                onChange={(e) => setVoicePresence(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-bold mb-1">
                <span>Sub-Bass Vocal Warmth</span>
                <span className="text-amber-400 font-mono font-bold">{bassBoost}%</span>
              </div>
              <input 
                type="range"
                min="0"
                max="100"
                value={bassBoost}
                onChange={(e) => setBassBoost(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// CINEMATIC COLOR GRADER WORKSPACE
// ==========================================
interface ColorGraderProps {
  onBack: () => void;
  localTheme: string;
}

const ColorGraderWorkspace: React.FC<ColorGraderProps> = ({ onBack, localTheme }) => {
  const st = themeStyles[localTheme] || themeStyles.charcoal;

  const presets = {
    warm_blockbuster: { name: 'Teal & Orange', brightness: 105, contrast: 115, saturate: 125, sepia: 15, hueRotate: 0, desc: 'Cozy skin-tones paired with cool shadows.' },
    cyberpunk: { name: 'Cyberpunk Grid', brightness: 110, contrast: 130, saturate: 180, sepia: 0, hueRotate: 310, desc: 'Highly vibrant neon purples and hot pinks.' },
    noir: { name: 'Detective Noir', brightness: 90, contrast: 140, saturate: 0, sepia: 5, hueRotate: 0, desc: 'Classic monochromatic heavy-shadow styling.' },
    vintage: { name: 'Vintage Kodak', brightness: 95, contrast: 105, saturate: 90, sepia: 30, hueRotate: 15, desc: 'Warm 1970s film nostalgia grain.' }
  };

  const [brightness, setBrightness] = useState(105);
  const [contrast, setContrast] = useState(115);
  const [saturate, setSaturate] = useState(125);
  const [sepia, setSepia] = useState(15);
  const [hueRotate, setHueRotate] = useState(0);

  const applyPreset = (key: keyof typeof presets) => {
    const p = presets[key];
    setBrightness(p.brightness);
    setContrast(p.contrast);
    setSaturate(p.saturate);
    setSepia(p.sepia);
    setHueRotate(p.hueRotate);
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
    setSepia(0);
    setHueRotate(0);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-rose-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Cinematic Color Grader
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Configure real-time CSS lookup filter attributes and cinematic LUT maps.</p>
        </div>
        <button onClick={onBack} className={`px-3 py-1.5 rounded text-xs font-bold border ${st.border} ${st.btnInactive}`}>Back</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Visual Canvas Image Preview */}
        <div className="md:col-span-7 bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between gap-4">
          <span className="text-[10px] text-zinc-400 font-extrabold uppercase">Live Grading Board</span>

          <div className="aspect-video w-full rounded-lg bg-zinc-950 border border-zinc-850 overflow-hidden relative flex items-center justify-center">
            <svg 
              className="w-full h-full transition-all duration-300"
              viewBox="0 0 400 225"
              style={{
                filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) sepia(${sepia}%) hue-rotate(${hueRotate}deg)`
              }}
            >
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#1e1b4b', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#311042', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <rect width="400" height="225" fill="url(#grad1)" />
              <circle cx="200" cy="112" r="50" fill="#f59e0b" opacity="0.8" />
              <polygon points="0,225 150,120 300,225" fill="#0f172a" />
              <polygon points="180,225 310,140 400,225" fill="#090d16" />
              <text x="20" y="40" fill="#ffffff" fontSize="12" fontWeight="bold" opacity="0.6" fontFamily="sans-serif">CAMERA INPUT A1</text>
            </svg>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={resetFilters}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg"
            >
              Reset Settings
            </button>
          </div>
        </div>

        {/* Configurations Controls */}
        <div className="md:col-span-5 bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-6">
          
          {/* Preset Cards */}
          <div>
            <span className="text-[10px] text-zinc-400 font-extrabold uppercase block mb-2">Cinematic LUT Presets</span>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(presets).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => applyPreset(k as any)}
                  className="bg-zinc-950 hover:bg-zinc-850 p-2 border border-zinc-800 rounded text-left space-y-0.5 transition-all"
                >
                  <span className="text-xs font-bold block text-rose-400">{v.name}</span>
                  <span className="text-[9px] text-zinc-500 leading-tight block">{v.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4 border-t border-zinc-800 pt-4">
            <span className="text-[10px] text-zinc-400 font-extrabold uppercase block">Precision Adjustments</span>

            <div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-bold mb-1">
                <span>Contrast</span>
                <span className="text-rose-400 font-mono font-bold">{contrast}%</span>
              </div>
              <input type="range" min="50" max="200" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} className="w-full accent-rose-500" />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-bold mb-1">
                <span>Saturation</span>
                <span className="text-rose-400 font-mono font-bold">{saturate}%</span>
              </div>
              <input type="range" min="0" max="250" value={saturate} onChange={(e) => setSaturate(parseInt(e.target.value))} className="w-full accent-rose-500" />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-bold mb-1">
                <span>Hue Rotate (Tonal shift)</span>
                <span className="text-rose-400 font-mono font-bold">{hueRotate}°</span>
              </div>
              <input type="range" min="0" max="360" value={hueRotate} onChange={(e) => setHueRotate(parseInt(e.target.value))} className="w-full accent-rose-500" />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-bold mb-1">
                <span>Vintage Warmth (Sepia)</span>
                <span className="text-rose-400 font-mono font-bold">{sepia}%</span>
              </div>
              <input type="range" min="0" max="100" value={sepia} onChange={(e) => setSepia(parseInt(e.target.value))} className="w-full accent-rose-500" />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
