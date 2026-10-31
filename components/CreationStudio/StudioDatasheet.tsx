import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  Calendar, 
  User, 
  Play, 
  FileSpreadsheet, 
  ChevronRight, 
  X, 
  Check, 
  ArrowUpRight,
  Info,
  Layers,
  Sparkles,
  ArrowRight,
  Edit
} from 'lucide-react';

interface AppRecord {
  id: string;
  number: number;
  title: string;
  description: string;
  author: string;
  creationDate: string;
  category: 'Content' | 'Media' | 'Research' | 'Marketing' | 'Web';
  techStack: string[];
  inputs: string[];
  outputs: string[];
  detailedScope: string;
}

interface StudioDatasheetProps {
  onRunTool: (toolId: string) => void;
  onClose: () => void;
}

const formatDateToDDMMYY = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0].slice(-2);
    const month = parts[1];
    const day = parts[2];
    return `${day}/${month}/${year}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    // fallback
  }
  return dateStr;
};

const APPS_DATABASE: AppRecord[] = [
  {
    id: 'app1',
    number: 1,
    title: 'Bring Anything to Life',
    description: 'Turn sketches, UI layouts, diagrams, or wireframes into fully-interactive, styled React components.',
    author: 'sax/kooLabs',
    creationDate: '2025-10-12',
    category: 'Web',
    techStack: ['Gemini 2.5 Flash', 'HTML5 Canvas', 'Tailwind CSS', 'React Live Compiler'],
    inputs: ['Drawing image file', 'UI screenshot', 'Text layout requirements'],
    outputs: ['Interactive React Code', 'Full-screen component render', 'Exportable code ZIP'],
    detailedScope: 'A landmark system designed to bypass standard design-to-development friction. It parses spatial bounds, identifies form inputs, buttons, and visual structures, and translates them to functional tailwind layouts.'
  },
  {
    id: 'app2',
    number: 2,
    title: 'Interactive Audio Podcast',
    description: 'Generates multi-person audio podcasts and educational broadcasts from active workspace documents.',
    author: 'sax/kooLabs',
    creationDate: '2025-11-05',
    category: 'Media',
    techStack: ['Text-To-Speech API', 'Gemini Audio Synthesis Model', 'Audio Context API'],
    inputs: ['Source text files', 'Podcast topic instructions', 'Voice settings'],
    outputs: ['MP3 Audio broadcast', 'Complete spoken script transcript', 'Speaker timings metadata'],
    detailedScope: 'Allows users to synthesize dynamic, realistic 2-person and 3-person podcast dialogues. Features real-time pitch, volume, and voice cadence customization with editable transcripts.'
  },
  {
    id: 'app3',
    number: 3,
    title: 'Prompt Builder',
    description: 'Collaborative development assistant that tests and refines system instruction prompts for LLMs.',
    author: 'sax/kooLabs',
    creationDate: '2025-11-20',
    category: 'Content',
    techStack: ['Prompt-Deconstruct algorithm', 'Token Counter', 'System Role Engine'],
    inputs: ['Draft prompt instructions', 'Target persona parameters', 'Edge cases to handle'],
    outputs: ['Structured System Prompt', 'Few-shot training examples', 'Instruction robustness score'],
    detailedScope: 'Analyzes user-provided prompt drafts to inject critical guards, prevent jailbreaks, configure output constraints, and supply highly contextual few-shot instruction arrays.'
  },
  {
    id: 'app4',
    number: 4,
    title: 'Content Builder',
    description: 'Generates complete multi-page responsive web applications with simulated client-side routes.',
    author: 'sax/kooLabs',
    creationDate: '2025-12-01',
    category: 'Web',
    techStack: ['Vite Router simulation', 'Tailwind Grid Engine', 'HTML5 Boilerplate Parser'],
    inputs: ['Brand goals', 'Sitemap outlines', 'Color palette preferences'],
    outputs: ['Multi-page code output', 'Dynamic responsive mockup', 'Exportable layout modules'],
    detailedScope: 'Designed for quick, stunning landing-page prototypes. Automates the generation of sitemaps, navigations, hero sections, interactive FAQ accordions, and fully style-matched contact fields.'
  },
  {
    id: 'app5',
    number: 5,
    title: 'YouTube Transcript Generator',
    description: 'Harvests audio transcripts from online video links or uploaded media files with search highlights.',
    author: 'sax/kooLabs',
    creationDate: '2026-02-20',
    category: 'Media',
    techStack: ['YouTube Data API v3', 'Whisper Speech-To-Text API', 'Regex timestamp parser'],
    inputs: ['YouTube video URL', 'Media file upload', 'Language override selection'],
    outputs: ['Timed script text file', 'Chapter summary logs', 'Key takeaway briefs'],
    detailedScope: 'Solves the tedious task of manual transcribing. Directly fetches available subtitle files, or falls back to server-side acoustic parsing models to output clean, punctuated transcripts.'
  },
  {
    id: 'app6',
    number: 6,
    title: 'Text Summarizer & Translator',
    description: 'Condenses bulky reports and slides, translating fluently between English and Swedish.',
    author: 'sax/kooLabs',
    creationDate: '2026-03-02',
    category: 'Content',
    techStack: ['SVE Translation Context Engine', 'Recursive Text Splitter', 'Gemini NLP Models'],
    inputs: ['PDF/TXT files', 'Summary ratio selection', 'Target translation language'],
    outputs: ['Key bullet-points summary', 'Bilingual translation blocks', 'Executive elevator pitch'],
    detailedScope: 'High-speed document parsing assistant. Keeps specialized terminology intact when translating technical datasheets between English and SVE (Swedish).'
  },
  {
    id: 'app7',
    number: 7,
    title: 'Social Media Suite',
    description: 'Creates viral copy, hashtags, and formatting configurations optimized for LinkedIn, X, and Instagram.',
    author: 'sax/kooLabs',
    creationDate: '2026-03-15',
    category: 'Marketing',
    techStack: ['Viral Hooks Database', 'Emoji Injector', 'Character Limit Guard'],
    inputs: ['Product outlines', 'Target audience demographics', 'Channel selector'],
    outputs: ['Formatted post drafts', 'Curated relevant hashtags', 'Visual asset suggestions'],
    detailedScope: 'Fine-tuned content generation tool built to craft hooks, bullet structures, call-to-actions, and spacing configurations tailored for professional and casual visual grids.'
  },
  {
    id: 'app8',
    number: 8,
    title: 'Quiz & Assessment Creator',
    description: 'Generates active-recall flashcards, quizzes, and score-graded exams from source materials.',
    author: 'sax/kooLabs',
    creationDate: '2026-03-29',
    category: 'Media',
    techStack: ['Anki Flashcard algorithm', 'Markdown Quiz compiler', 'Local progress trackers'],
    inputs: ['Study notes or PDFs', 'Question limit count', 'Difficulty tier'],
    outputs: ['Interactive card deck', 'Graded multiple-choice exam', 'Incorrect-answers study sheet'],
    detailedScope: 'Assists educators and independent learners by extracting vocabulary terms, formulas, and concepts, compiling them into interactive digital self-testing environments.'
  },
  {
    id: 'app9',
    number: 9,
    title: 'Executive Briefing',
    description: 'Condenses corporate source materials into high-level strategic overview sheets for executives.',
    author: 'sax/kooLabs',
    creationDate: '2026-04-10',
    category: 'Research',
    techStack: ['Strategic KPI Extractor', 'Visual Bento Formatter', 'Gemini Flash 3.5'],
    inputs: ['Annual statements', 'Business reports', 'Focus divisions'],
    outputs: ['One-page executive dashboard', 'Strategic risk matrices', 'Action-point checklists'],
    detailedScope: 'Perfect for fast-paced decision makers. Condenses hundreds of pages of reports into clean, high-impact cards detailing financial vectors, competitive outlook, and next milestones.'
  },
  {
    id: 'app10',
    number: 10,
    title: 'Creative Brainstorm',
    description: 'Generates 10 completely unconventional, wild ideas and strategic counter-arguments on business ideas.',
    author: 'sax/kooLabs',
    creationDate: '2026-04-22',
    category: 'Content',
    techStack: ['Lateral Thinking matrix', 'Opposite View generator', 'Gemini Creative Engine'],
    inputs: ['Core business concept', 'Competitor landscape details', 'Creativity temperature'],
    outputs: ['10 Unconventional ideas', 'Strategic pre-mortem risks', 'Pivot angle frameworks'],
    detailedScope: 'A system built to disrupt corporate echo chambers. Avoids cliché marketing advice to generate truly left-field product expansions, guerrilla marketing plans, and unexpected partnerships.'
  },
  {
    id: 'app11',
    number: 11,
    title: 'Email Drafter',
    description: 'Drafts cold pitches, client updates, and announcements in professional, warm, or casual tones.',
    author: 'sax/kooLabs',
    creationDate: '2026-05-05',
    category: 'Content',
    techStack: ['Tone Modifier Engine', 'Variable Personalization mapper', 'Email template parser'],
    inputs: ['Recipient context', 'Key message points', 'Tone selection slider'],
    outputs: ['Complete copy email body', 'Subject line variations', 'Follow-up timeline guide'],
    detailedScope: 'Speeds up daily communication. Features direct variables insertion, email lengths adjustment, and specialized language presets designed to build instant rapport.'
  },
  {
    id: 'app12',
    number: 12,
    title: 'Marketing Copywriter',
    description: 'Generates high-converting AIDA-framework copy, landing page hooks, and product descriptions.',
    author: 'sax/kooLabs',
    creationDate: '2026-05-18',
    category: 'Marketing',
    techStack: ['AIDA framework mapper', 'Copywriting Rules Engine', 'SEO keyword density counter'],
    inputs: ['Feature parameters list', 'Main USP (Unique Selling Prop)', 'Target keywords'],
    outputs: ['High-converting copy decks', 'Social ad variants', 'SEO title/description sets'],
    detailedScope: 'Engineered for conversion optimization. Uses established copywriting frameworks to trigger user interest, build desire, and request clear actions in minimal word counts.'
  },
  {
    id: 'app13',
    number: 13,
    title: 'SWOT Analysis',
    description: 'Builds comprehensive strategic matrixes mapping Strengths, Weaknesses, Opportunities, and Threats.',
    author: 'sax/kooLabs',
    creationDate: '2026-05-29',
    category: 'Research',
    techStack: ['SWOT quadrant compiler', 'Competitor Threat database', 'Markdown tables'],
    inputs: ['Company details', 'Competitor names', 'Macro-economic factors'],
    outputs: ['4-quadrant SWOT matrix', 'Strategic response checklist', 'Mitigation priority index'],
    detailedScope: 'Translates raw market and company descriptions into structured strategy vectors. Suggests steps to convert threats into opportunities and shore up weaknesses.'
  },
  {
    id: 'app14',
    number: 14,
    title: 'Code Explainer',
    description: 'Breaks down complex source files and algorithms into conversational, simple English tutorials.',
    author: 'sax/kooLabs',
    creationDate: '2026-06-08',
    category: 'Web',
    techStack: ['AST (Abstract Syntax Tree) Parser', 'Line-by-line interpreter', 'Prism syntax highlights'],
    inputs: ['JavaScript, TS, Python, Rust code', 'User expertise tier', 'Line focus coordinates'],
    outputs: ['Technical block explanations', 'Big-O complexity estimate', 'Refactored cleaner model'],
    detailedScope: 'An essential companion for junior developers and onboarding teams. Translates nested async loops, SQL joints, and complex recursion into digestible logic.'
  },
  {
    id: 'app15',
    number: 15,
    title: 'Ebook Generator',
    description: 'Builds comprehensive book chapters, structural sitemaps, outlines, and summaries for publications.',
    author: 'sax/kooLabs',
    creationDate: '2026-06-15',
    category: 'Content',
    techStack: ['Long-form prompt chaining', 'Style Consistency Engine', 'EPUB-schema markdown'],
    inputs: ['Draft summary idea', 'Target voice style', 'Chapters limit selection'],
    outputs: ['Book outline index', 'Completed chapter draft scripts', 'E-reader compatible file text'],
    detailedScope: 'Enables prompt-driven long-form writing. Integrates chapters style tracking to prevent formatting divergence across extensive sections of generated prose.'
  },
  {
    id: 'app16',
    number: 16,
    title: 'Image Generator Prompts',
    description: 'Generates ultra-detailed, photography-accurate prompt instructions for Midjourney and DALL-E.',
    author: 'sax/kooLabs',
    creationDate: '2026-06-19',
    category: 'Content',
    techStack: ['Midjourney v6 parameters map', 'Cinematography lens glossary', 'Art-History glossary'],
    inputs: ['Core visual concept', 'Target lighting & mood', 'Aspect ratio choice'],
    outputs: ['Optimized copyable prompts', 'Negative prompt sets', 'Lighting, camera settings spec'],
    detailedScope: 'Built to master visual prompt constraints. Injects expert terms like volumetric lighting, anamorphic lenses, film grain, and historical art-style references to achieve high-fidelity rendering outputs.'
  },
  {
    id: 'app17',
    number: 17,
    title: 'Spreadsheet Creator',
    description: 'Organizes unstructured text lists into highly structured tables with custom formulas.',
    author: 'sax/kooLabs',
    creationDate: '2026-06-24',
    category: 'Research',
    techStack: ['CSV Parser', 'Math expression mapper', 'HTML Table grid styling'],
    inputs: ['Unstructured rows/reports', 'Formula goal instructions', 'Format presets'],
    outputs: ['Copyable spreadsheet Markdown', 'Formula tags index', 'Downloadable CSV files'],
    detailedScope: 'Designed for corporate data prep. Converts scattered emails, chat transcript numbers, or logs into clean Excel-ready grids containing custom formulas.'
  },
  {
    id: 'app18',
    number: 18,
    title: 'Video Script Writer',
    description: 'Composes complete YouTube, TikTok, or training video scripts with Audio/Visual columns.',
    author: 'sax/kooLabs',
    creationDate: '2026-06-28',
    category: 'Media',
    techStack: ['A/V script dual-column grid', 'Timing estimate algorithms', 'Narrative arc presets'],
    inputs: ['Target core message', 'Video platform choice', 'Duration limit (secs)'],
    outputs: ['Dual-column A/V screenplay', 'Spoken dialogue track', 'Visual scene direction list'],
    detailedScope: 'Allows content creators to structure their work using the industry-standard dual-column split, clearly separating verbal cues from physical camera movements and overlays.'
  },
  {
    id: 'app19',
    number: 19,
    title: 'Website Builder',
    description: 'Instantly generates responsive HTML structures, CSS rules, and landing page wireframes.',
    author: 'sax/kooLabs',
    creationDate: '2026-06-30',
    category: 'Web',
    techStack: ['Flexbox layout engine', 'Single-file code bundle', 'Tailwind stylesheet link'],
    inputs: ['Target landing objective', 'Section list sitemap', 'Style design system selection'],
    outputs: ['Single-file HTML web page', 'Render preview container', 'Exportable layout files'],
    detailedScope: 'Renders complete standalone visual landing pages. Includes dynamic responsive headers, custom buttons, bento grids, pricing cards, and testimonials fields instantly.'
  },
  {
    id: 'app20',
    number: 20,
    title: 'Script Writer',
    description: 'Composes professional screenplay scripts following strict Hollywood formatting styles.',
    author: 'sax/kooLabs',
    creationDate: '2026-07-02',
    category: 'Content',
    techStack: ['Fountain syntax parser', 'Hollywood screenplay formatter', 'Character cards map'],
    inputs: ['Genre and core plot hook', 'Character descriptions', 'Tone and style details'],
    outputs: ['Formatted screenplay scripts', 'Scene structure notes', 'Character dialogue highlights'],
    detailedScope: 'A scriptwriting assistant that formats scene headers, action blocks, parentheticals, and dialogue spacing to align with strict industry expectations, making it ready for production review.'
  },
  {
    id: 'app21',
    number: 21,
    title: 'Image Describer',
    description: 'Scans image pixels and layout vectors, extracting texts, data charts, and accessibility alt-text.',
    author: 'sax/kooLabs',
    creationDate: '2026-07-04',
    category: 'Media',
    techStack: ['Gemini 3.5 Multimodal SDK', 'OCR transcription engines', 'Color Histogram scanners'],
    inputs: ['Uploaded graphics files', 'Analysis style selection', 'Focus directives'],
    outputs: ['Detailed visual breakdown', 'Accessibility alt-text blocks', 'Data table & chart extraction'],
    detailedScope: 'Our state-of-the-art vision terminal. Features "Straight Retell" to isolate facts in charts/graphs and skip subjective noise, as well as forensic, accessibility, and narrative analyzers.'
  },
  {
    id: 'app22',
    number: 22,
    title: 'Product Research Tool & Idea Validator',
    description: 'Discover profitable digital product niches and validate ideas instantly before building them.',
    author: 'sax/kooLabs',
    creationDate: '2026-07-05',
    category: 'Research',
    techStack: ['Gemini 3.5 Flash', 'Market Trend Algorithms', 'Semantic Competitor Analysis', 'Demand Scoring'],
    inputs: ['Topic or Seed Idea', 'Target Niche', 'Product Idea', 'Target Audience', 'Key Feature'],
    outputs: ['Trend Analysis Report', 'Demand Scoring Metrics', 'Profitable Niche Suggestions', 'Pricing Benchmarks', 'Go/No-Go Recommendation'],
    detailedScope: 'Dual-engine market intelligence tool. Features a "Market Research" mode to discover niches and gaps, and an "Idea Validator" mode to score demand, analyze competitors, establish pricing, and provide go/no-go recommendations for specific digital product ideas.'
  }
];

export const StudioDatasheet: React.FC<StudioDatasheetProps> = ({ onRunTool, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All tools');
  const [sortBy, setSortBy] = useState<'number' | 'title' | 'creationDate'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedApp, setSelectedApp] = useState<AppRecord | null>(null);
  const [localTheme, setLocalTheme] = useState<'charcoal' | 'silver' | 'white'>(() => {
    const saved = localStorage.getItem('creative_studio_theme');
    if (saved === 'charcoal' || saved === 'silver' || saved === 'white') {
      return saved;
    }
    return 'charcoal';
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const saved = localStorage.getItem('creative_studio_theme');
      if (saved === 'charcoal' || saved === 'silver' || saved === 'white') {
        setLocalTheme(saved);
      }
    };
    window.addEventListener('creative_studio_theme_change', handleThemeChange);
    return () => {
      window.removeEventListener('creative_studio_theme_change', handleThemeChange);
    };
  }, []);

  // Dynamic state for apps list
  const [apps, setApps] = useState<AppRecord[]>(() => {
    const saved = localStorage.getItem('studio_apps_database');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If the parsed database still has old format IDs, reset it to the new APPS_DATABASE
        if (parsed.some((app: any) => app.id === 'bring_to_life')) {
          localStorage.setItem('studio_apps_database', JSON.stringify(APPS_DATABASE));
          return APPS_DATABASE;
        }
        return parsed;
      } catch (e) {
        return APPS_DATABASE;
      }
    }
    return APPS_DATABASE;
  });

  // Editing helper states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editCreationDate, setEditCreationDate] = useState('');
  const [editCategory, setEditCategory] = useState<AppRecord['category']>('Web');
  const [editTechStack, setEditTechStack] = useState('');
  const [editInputs, setEditInputs] = useState('');
  const [editOutputs, setEditOutputs] = useState('');
  const [editDetailedScope, setEditDetailedScope] = useState('');

  const handleStartEdit = (app: AppRecord) => {
    setEditTitle(app.title);
    setEditDescription(app.description);
    setEditAuthor(app.author);
    setEditCreationDate(app.creationDate);
    setEditCategory(app.category);
    setEditTechStack(app.techStack.join(', '));
    setEditInputs(app.inputs.join(', '));
    setEditOutputs(app.outputs.join(', '));
    setEditDetailedScope(app.detailedScope);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!selectedApp) return;
    const updatedApps = apps.map(app => {
      if (app.id === selectedApp.id) {
        return {
          ...app,
          title: editTitle,
          description: editDescription,
          author: editAuthor,
          creationDate: editCreationDate,
          category: editCategory,
          techStack: editTechStack.split(',').map(s => s.trim()).filter(Boolean),
          inputs: editInputs.split(',').map(s => s.trim()).filter(Boolean),
          outputs: editOutputs.split(',').map(s => s.trim()).filter(Boolean),
          detailedScope: editDetailedScope
        };
      }
      return app;
    });
    
    setApps(updatedApps);
    localStorage.setItem('studio_apps_database', JSON.stringify(updatedApps));
    
    const newSelected = updatedApps.find(app => app.id === selectedApp.id) || null;
    setSelectedApp(newSelected);
    setIsEditing(false);
  };

  // Filter & Search Logic
  const categories = ['All tools', 'Content', 'Media', 'Research', 'Marketing', 'Web'];

  const filteredApps = apps.filter(app => {
    const matchesSearch = 
      app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.techStack.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesCategory = selectedCategory === 'All tools' || app.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Sorting Logic
  const sortedApps = [...filteredApps].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'number') {
      comparison = a.number - b.number;
    } else if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === 'creationDate') {
      comparison = a.creationDate.localeCompare(b.creationDate);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (field: 'number' | 'title' | 'creationDate') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const exportToExcelCSV = () => {
    const BOM = '\uFEFF';
    const cleanField = (str: string) => {
      if (!str) return '';
      return str.replace(/\r?\n|\r/g, ' ').replace(/"/g, '""');
    };

    const headers = ['ID', 'App Name / Title', 'Functional Summary', 'Creation Date', 'Developer / Author'];
    const rows = apps.map(app => [
      app.number,
      `"${cleanField(app.title)}"`,
      `"${cleanField(app.description)}"`,
      `"${cleanField(formatDateToDDMMYY(app.creationDate))}"`,
      `"${cleanField(app.author)}"`
    ]);
    
    const csvContent = BOM + 'sep=,\n' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `app_info_datasheet_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToTxt = () => {
    const titleLine = "APP INFO DATASHEET REGISTRY\n" + "===========================\n\n";
    
    const blocks = apps.map(app => {
      return `ID: ${app.number}\n` +
             `App Name / Title: ${app.title}\n` +
             `Functional Summary: ${app.description}\n` +
             `Creation Date: ${formatDateToDDMMYY(app.creationDate)}\n` +
             `Developer / Author: ${app.author}\n` +
             "--------------------------------------------------";
    }).join('\n\n');
    
    const txtContent = titleLine + blocks;
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `app_info_datasheet_${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Local theme design spec mapping
  const themeStyles = {
    charcoal: {
      bg: 'bg-zinc-950 border-zinc-900',
      text: 'text-zinc-100',
      textDim: 'text-zinc-400',
      textMuted: 'text-zinc-500',
      textHighlight: 'text-white',
      border: 'border-zinc-800',
      borderSubtle: 'border-zinc-900',
      panelBg: 'bg-zinc-950',
      cardBg: 'bg-zinc-900/40',
      rowHover: 'hover:bg-zinc-900/40',
      inputBg: 'bg-zinc-900',
      badgeBg: 'bg-zinc-900 text-sky-400 border-zinc-850',
      tableHeaderBg: 'bg-zinc-900/50',
      headerGradient: 'from-teal-400 to-sky-500',
      btnActive: 'bg-teal-600 text-white shadow-lg shadow-teal-900/20',
      btnInactive: 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border-zinc-800',
      modalBg: 'bg-zinc-950 border-zinc-900'
    },
    silver: {
      bg: 'bg-zinc-500 border-zinc-600',
      text: 'text-blue-950',
      textDim: 'text-indigo-950',
      textMuted: 'text-blue-900',
      textHighlight: 'text-blue-950 font-extrabold',
      border: 'border-zinc-600',
      borderSubtle: 'border-zinc-400',
      panelBg: 'bg-zinc-600',
      cardBg: 'bg-zinc-300/90 border-zinc-400 shadow-md',
      rowHover: 'hover:bg-zinc-300/60',
      inputBg: 'bg-zinc-100',
      badgeBg: 'bg-blue-200 text-blue-950 border-blue-300',
      tableHeaderBg: 'bg-zinc-400/50',
      headerGradient: 'from-blue-950 via-indigo-950 to-blue-900',
      btnActive: 'bg-blue-950 text-white shadow-md shadow-blue-950/25',
      btnInactive: 'bg-zinc-300 text-blue-950 hover:bg-zinc-200 hover:text-blue-950 border-zinc-400',
      modalBg: 'bg-zinc-300 border-zinc-400'
    },
    white: {
      bg: 'bg-white border-zinc-200',
      text: 'text-zinc-800',
      textDim: 'text-zinc-600',
      textMuted: 'text-zinc-400',
      textHighlight: 'text-zinc-950 font-extrabold',
      border: 'border-zinc-200',
      borderSubtle: 'border-zinc-100',
      panelBg: 'bg-zinc-50',
      cardBg: 'bg-zinc-50 border-zinc-100 shadow-sm',
      rowHover: 'hover:bg-zinc-100/60',
      inputBg: 'bg-white',
      badgeBg: 'bg-zinc-100 text-sky-600 border-zinc-200',
      tableHeaderBg: 'bg-zinc-100',
      headerGradient: 'from-teal-600 to-sky-600',
      btnActive: 'bg-teal-600 text-white shadow-md shadow-teal-500/10',
      btnInactive: 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 border-zinc-200',
      modalBg: 'bg-white border-zinc-200'
    }
  };

  const st = themeStyles[localTheme];

  return (
    <div className={`p-6 md:p-8 rounded-2xl border transition-all duration-300 shadow-2xl flex flex-col gap-6 ${st.bg} ${st.text}`}>
      
      {/* Header Panel */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between border-b pb-6 gap-4 ${st.border}`}>
        <div>
          <h2 className={`text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r ${st.headerGradient} flex items-center gap-3`}>
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <FileSpreadsheet className="w-7 h-7" />
            </span>
            App InfoDatasheet
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Local Theme Selector (Cycle) */}
          <button
            onClick={() => {
              const themes: ('charcoal' | 'silver' | 'white')[] = ['charcoal', 'silver', 'white'];
              const nextIndex = (themes.indexOf(localTheme) + 1) % themes.length;
              const nextTheme = themes[nextIndex];
              setLocalTheme(nextTheme);
              localStorage.setItem('creative_studio_theme', nextTheme);
              window.dispatchEvent(new Event('creative_studio_theme_change'));
            }}
            className={`w-7 h-7 rounded-full border-2 transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer ${
              localTheme === 'charcoal' 
                ? 'bg-zinc-900 border-zinc-600 shadow-md shadow-black/40' 
                : localTheme === 'silver' 
                ? 'bg-zinc-300 border-zinc-400 shadow-md shadow-zinc-500/20' 
                : 'bg-white border-zinc-300 shadow-md'
            }`}
            title={`Cycle theme (current: ${localTheme})`}
          />

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Datasheet</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExportDropdownOpen ? 'rotate-90' : ''}`} />
            </button>
            
            {isExportDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => setIsExportDropdownOpen(false)} 
                />
                <div className={`absolute right-0 mt-2 w-56 rounded-xl border p-1.5 shadow-2xl z-50 animate-fade-in ${st.modalBg} ${st.border}`}>
                  <button
                    onClick={() => {
                      exportToExcelCSV();
                      setIsExportDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${st.rowHover}`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span>Export Excel CSV (.csv)</span>
                  </button>
                  <button
                    onClick={() => {
                      exportToTxt();
                      setIsExportDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${st.rowHover}`}
                  >
                    <svg className="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Export Plain Text (.txt)</span>
                  </button>
                </div>
              </>
            )}
          </div>
          
          {/* Close Registry Button (Red X) */}
          <button
            onClick={onClose}
            className="p-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-500 hover:text-red-400 rounded-xl transition-all flex items-center justify-center cursor-pointer"
            title="Close Registry"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>



      {/* Filter and Search Bar */}
      <div className={`flex flex-col lg:flex-row gap-4 items-center justify-between p-4 rounded-xl border shadow-lg ${st.cardBg} ${st.borderSubtle}`}>
        
        {/* Search */}
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, author, tech stack..."
            className={`w-full border rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-teal-500 transition-colors ${st.inputBg} ${st.border} ${st.text}`}
          />
        </div>

        {/* Categories Button Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                selectedCategory === cat 
                ? st.btnActive 
                : st.btnInactive
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

      </div>


      {/* Datasheet Interactive Spreadsheet Grid */}
      <div className={`border rounded-xl overflow-hidden shadow-xl ${st.cardBg} ${st.borderSubtle}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-xs font-bold ${st.tableHeaderBg} ${st.borderSubtle} ${st.textDim}`}>
                <th className="p-4 w-20 cursor-pointer hover:bg-zinc-500/10 transition-colors" onClick={() => toggleSort('number')}>
                  <div className="flex items-center gap-1">
                    <span># ID</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-zinc-500/10 transition-colors" onClick={() => toggleSort('title')}>
                  <div className="flex items-center gap-1">
                    <span>App Name / Title</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="p-4">Category</th>
                <th className="p-4">Primary Purpose & Description</th>
                <th className="p-4 cursor-pointer hover:bg-zinc-500/10 transition-colors" onClick={() => toggleSort('creationDate')}>
                  <div className="flex items-center gap-1">
                    <span>Created Date</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="p-4">Author / Lab</th>
                <th className="p-4 text-center">Interactive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/10 text-xs">
              {sortedApps.map((app) => (
                <tr 
                  key={app.id} 
                  className={`transition-colors cursor-pointer group ${st.rowHover} border-b ${st.borderSubtle}`}
                  onClick={() => setSelectedApp(app)}
                >
                  <td className={`p-4 font-mono font-bold ${st.textMuted}`}>
                    {app.number}
                  </td>
                  <td className={`p-4 font-bold ${st.text} group-hover:text-teal-500 transition-colors`}>
                    {app.title}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded bg-zinc-500/10 border border-zinc-500/15 text-[10px] font-bold text-sky-500">
                      {app.category}
                    </span>
                  </td>
                  <td className={`p-4 min-w-[260px] whitespace-normal break-words ${st.textDim}`} title={app.description}>
                    {app.description}
                  </td>
                  <td className="p-4 font-mono">
                    <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
                      <Calendar className="w-3.5 h-3.5 opacity-60" />
                      {formatDateToDDMMYY(app.creationDate)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-1.5 text-pink-500 font-semibold">
                      <User className="w-3.5 h-3.5 opacity-60" />
                      {app.author}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedApp(app)}
                        className={`p-1.5 border rounded-lg transition-all ${st.btnInactive}`}
                        title="View specifications details"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onRunTool(app.id)}
                        className="p-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-400 hover:text-teal-300 rounded-lg transition-all"
                        title="Run this application directly"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {sortedApps.length === 0 && (
                <tr>
                  <td colSpan={7} className={`p-12 text-center ${st.textMuted}`}>
                    No applications matched your search filters. Try typing another criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* App Details Slide-Out / Drawer overlay */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end animate-fade-in">
          <div className={`w-full max-w-2xl h-full border-l p-6 md:p-8 overflow-y-auto flex flex-col justify-between shadow-2xl relative ${st.bg} ${st.border}`}>
            
            {isEditing ? (
              /* Editable Registry Form */
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                  <div className={`flex items-center justify-between border-b pb-4 ${st.border}`}>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest">
                        EDITING REGISTRY SPEC • APP {selectedApp.number}
                      </span>
                      <h3 className={`text-xl font-bold ${st.textHighlight}`}>Modify App Metadata</h3>
                    </div>
                    <button
                      onClick={() => setIsEditing(false)}
                      className={`p-1.5 border rounded-lg transition-colors ${st.btnInactive}`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>App Title</label>
                      <input 
                        type="text" 
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className={`w-full border focus:border-teal-500 rounded-lg p-2.5 text-xs outline-none ${st.inputBg} ${st.border} ${st.text}`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Developer / Author</label>
                      <select 
                        value={editAuthor || 'sax/kooLabs'}
                        onChange={e => setEditAuthor(e.target.value)}
                        className={`w-full border focus:border-teal-500 rounded-lg p-2.5 text-xs outline-none cursor-pointer ${st.inputBg} ${st.border} ${st.text}`}
                      >
                        {Array.from(new Set([
                          'sax/kooLabs',
                          'Rytt/kooWorks',
                          'TallViking/kooWorks',
                          'Bjornfs4/kooWorks',
                          'saxeine/kooLabs',
                          'TheBear/kooWorks',
                          'StockX/kooWorks',
                          editAuthor
                        ])).filter(Boolean).map(auth => (
                          <option key={auth} value={auth}>{auth}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Category</label>
                      <select 
                        value={editCategory}
                        onChange={e => setEditCategory(e.target.value as any)}
                        className={`w-full border focus:border-teal-500 rounded-lg p-2.5 text-xs outline-none cursor-pointer ${st.inputBg} ${st.border} ${st.text}`}
                      >
                        {categories.filter(c => c !== 'All tools').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Creation Date (YYYY-MM-DD)</label>
                      <input 
                        type="text" 
                        value={editCreationDate}
                        onChange={e => setEditCreationDate(e.target.value)}
                        className={`w-full border focus:border-teal-500 rounded-lg p-2.5 text-xs outline-none font-mono ${st.inputBg} ${st.border} ${st.text}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Functional Summary Description</label>
                    <textarea 
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      rows={2}
                      className={`w-full border focus:border-teal-500 rounded-lg p-2.5 text-xs outline-none resize-none ${st.inputBg} ${st.border} ${st.text}`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Tech Stack (comma-separated)</label>
                    <input 
                      type="text" 
                      value={editTechStack}
                      onChange={e => setEditTechStack(e.target.value)}
                      placeholder="React, Tailwind, Gemini SDK"
                      className={`w-full border focus:border-teal-500 rounded-lg p-2.5 text-xs outline-none ${st.inputBg} ${st.border} ${st.text}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Required Inputs (comma-separated)</label>
                      <input 
                        type="text" 
                        value={editInputs}
                        onChange={e => setEditInputs(e.target.value)}
                        className={`w-full border focus:border-teal-500 rounded-lg p-2.5 text-xs outline-none ${st.inputBg} ${st.border} ${st.text}`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Generated Outputs (comma-separated)</label>
                      <input 
                        type="text" 
                        value={editOutputs}
                        onChange={e => setEditOutputs(e.target.value)}
                        className={`w-full border focus:border-teal-500 rounded-lg p-2.5 text-xs outline-none ${st.inputBg} ${st.border} ${st.text}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Detailed Engineering Scope Narrative</label>
                    <textarea 
                      value={editDetailedScope}
                      onChange={e => setEditDetailedScope(e.target.value)}
                      rows={3}
                      className={`w-full border focus:border-teal-500 rounded-lg p-2.5 text-xs outline-none resize-none ${st.inputBg} ${st.border} ${st.text}`}
                    />
                  </div>
                </div>

                <div className={`pt-6 border-t mt-8 flex gap-3 ${st.border}`}>
                  <button
                    onClick={() => setIsEditing(false)}
                    className={`flex-1 py-3 border text-xs font-bold rounded-xl transition-all ${st.btnInactive}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              /* Specs Viewer Drawer Mode */
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className={`flex items-center justify-between border-b pb-4 ${st.border}`}>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-teal-500 uppercase tracking-widest">
                        SYSTEM INDEX: APP {selectedApp.number} • ID: {selectedApp.id}
                      </span>
                      <h3 className={`text-xl md:text-2xl font-bold ${st.textHighlight} flex items-center gap-2`}>
                        {selectedApp.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEdit(selectedApp)}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                        title="Edit specifications details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Spec</span>
                      </button>

                      <button
                        onClick={() => setSelectedApp(null)}
                        className={`p-1.5 border rounded-lg transition-colors ${st.btnInactive}`}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Summary Description */}
                  <div className="space-y-2">
                    <span className={`text-xs font-bold block uppercase tracking-wider ${st.textDim}`}>Functional Summary</span>
                    <p className={`text-sm leading-relaxed p-4 rounded-xl border ${st.cardBg} ${st.borderSubtle}`}>
                      {selectedApp.description}
                    </p>
                  </div>

                  {/* Project Metadata Group */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl border space-y-1 ${st.cardBg} ${st.borderSubtle}`}>
                      <span className={`text-[10px] font-bold uppercase block ${st.textMuted}`}>Creation Date</span>
                      <div className="flex items-center gap-2 text-xs text-emerald-500 font-mono">
                        <Calendar className="w-4 h-4 opacity-70" />
                        <span>{formatDateToDDMMYY(selectedApp.creationDate)}</span>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border space-y-1 ${st.cardBg} ${st.borderSubtle}`}>
                      <span className={`text-[10px] font-bold uppercase block ${st.textMuted}`}>Developer / Author</span>
                      <div className="flex items-center gap-2 text-xs text-pink-500">
                        <User className="w-4 h-4 opacity-70" />
                        <span className="font-semibold">{selectedApp.author}</span>
                      </div>
                    </div>
                  </div>

                  {/* Category & Tech stack */}
                  <div className="space-y-2">
                    <span className={`text-xs font-bold block uppercase tracking-wider ${st.textDim}`}>Deploy & Infrastructure Stack</span>
                    <div className={`p-4 rounded-xl border space-y-3 ${st.cardBg} ${st.borderSubtle}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase font-mono w-24 ${st.textMuted}`}>Category:</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-500/10 border border-zinc-500/15 text-[10px] font-bold text-sky-500">
                          {selectedApp.category}
                        </span>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <span className={`text-[10px] uppercase font-mono w-24 shrink-0 mt-1 ${st.textMuted}`}>Tech Stack:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedApp.techStack.map(tech => (
                            <span key={tech} className="px-2 py-0.5 rounded bg-zinc-500/10 border border-zinc-500/15 text-[10px] font-mono text-emerald-500">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Data Flow I/O Specs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className={`text-xs font-bold block uppercase tracking-wider ${st.textDim}`}>Required Inputs</span>
                      <div className={`p-3 border rounded-xl space-y-1 min-h-[100px] ${st.cardBg} ${st.borderSubtle}`}>
                        {selectedApp.inputs.map(inp => (
                          <div key={inp} className={`flex items-center gap-2 text-xs ${st.textDim}`}>
                            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                            <span>{inp}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className={`text-xs font-bold block uppercase tracking-wider ${st.textDim}`}>Generated Outputs</span>
                      <div className={`p-3 border rounded-xl space-y-1 min-h-[100px] ${st.cardBg} ${st.borderSubtle}`}>
                        {selectedApp.outputs.map(out => (
                          <div key={out} className="flex items-center gap-2 text-xs text-teal-500">
                            <Check className="w-3.5 h-3.5 opacity-60" />
                            <span>{out}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Scope */}
                  <div className="space-y-1.5">
                    <span className={`text-xs font-bold block uppercase tracking-wider ${st.textDim}`}>Engineering Narrative Scope</span>
                    <p className={`text-xs leading-relaxed p-4 rounded-xl border ${st.cardBg} ${st.borderSubtle} ${st.textDim}`}>
                      {selectedApp.detailedScope}
                    </p>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className={`pt-6 border-t mt-8 flex flex-col sm:flex-row gap-3 ${st.border}`}>
                  <button
                    onClick={() => setSelectedApp(null)}
                    className={`flex-1 py-3 border text-xs font-bold rounded-xl transition-all ${st.btnInactive}`}
                  >
                    Close Specs
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedApp(null);
                      onRunTool(selectedApp.id);
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-sky-500 hover:from-teal-500 hover:to-sky-400 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/10"
                  >
                    <span>Initialize & Run {selectedApp.title}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
