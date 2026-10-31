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

interface OfficeDatasheetProps {
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
    id: 'social_generator',
    number: 1,
    title: 'Social Media Suite',
    description: 'Generate viral posts for LinkedIn, X, and Instagram.',
    author: 'sax/kooLabs',
    creationDate: '2025-10-12',
    category: 'Marketing',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Topic', 'Platform'],
    outputs: ['Social Media Posts'],
    detailedScope: 'Generates platform-specific social media posts tailored to your audience.'
  },
  {
    id: 'quiz_creator',
    number: 2,
    title: 'Quiz & Assessment Builder',
    description: 'Transform boring documents into interactive, gamified quizzes instantly.',
    author: 'sax/kooLabs',
    creationDate: '2025-10-15',
    category: 'Content',
    techStack: ['Gemini 2.5 Flash', 'React', 'Tailwind'],
    inputs: ['Document', 'Quiz Type'],
    outputs: ['Interactive Quiz'],
    detailedScope: 'Creates interactive quizzes from any document to test knowledge retention.'
  },
  {
    id: 'exec_briefing',
    number: 3,
    title: 'Executive Briefing Generator',
    description: 'Condense 50-page reports into crisp, 1-page executive summaries.',
    author: 'sax/kooLabs',
    creationDate: '2025-10-20',
    category: 'Research',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Long Report'],
    outputs: ['1-Page Summary'],
    detailedScope: 'Distills complex documents into concise executive briefings for rapid consumption.'
  },
  {
    id: 'brainstormer',
    number: 4,
    title: 'Concept Brainstormer',
    description: 'Overcome writer\'s block with AI-driven lateral thinking and idea generation.',
    author: 'sax/kooLabs',
    creationDate: '2025-10-22',
    category: 'Content',
    techStack: ['Gemini 2.5 Flash', 'React', 'Tailwind'],
    inputs: ['Topic or Problem'],
    outputs: ['Idea List'],
    detailedScope: 'Generates creative and lateral ideas to kickstart your next project.'
  },
  {
    id: 'email_drafter',
    number: 5,
    title: 'Smart Email Drafter',
    description: 'Write professional, persuasive emails for any scenario in seconds.',
    author: 'sax/kooLabs',
    creationDate: '2025-10-25',
    category: 'Marketing',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Recipient', 'Purpose'],
    outputs: ['Email Draft'],
    detailedScope: 'Drafts professional emails for sales, networking, or internal communication.'
  },
  {
    id: 'marketing_copy',
    number: 6,
    title: 'Marketing Copywriter',
    description: 'Generate high-converting ad copy, landing page headlines, and product descriptions.',
    author: 'sax/kooLabs',
    creationDate: '2025-10-28',
    category: 'Marketing',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Product Info', 'Target Audience'],
    outputs: ['Marketing Copy'],
    detailedScope: 'Writes persuasive copy optimized for conversions across various marketing channels.'
  },
  {
    id: 'swot_analysis',
    number: 7,
    title: 'SWOT Analysis Builder',
    description: 'Analyze strengths, weaknesses, opportunities, and threats for any business strategy.',
    author: 'sax/kooLabs',
    creationDate: '2025-11-01',
    category: 'Research',
    techStack: ['Gemini 2.5 Flash', 'React', 'Tailwind'],
    inputs: ['Business Context'],
    outputs: ['SWOT Matrix'],
    detailedScope: 'Creates a structured SWOT analysis to evaluate business strategies or projects.'
  },
  {
    id: 'code_explainer',
    number: 8,
    title: 'Code Explainer',
    description: 'Paste complex code snippets and get plain-English explanations of how they work.',
    author: 'sax/kooLabs',
    creationDate: '2025-11-05',
    category: 'Web',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Code Snippet'],
    outputs: ['Explanation'],
    detailedScope: 'Breaks down complex code into easy-to-understand explanations.'
  },
  {
    id: 'ebook_generator',
    number: 9,
    title: 'E-Book Outliner & Drafter',
    description: 'Structure and draft comprehensive e-books or whitepapers from a single prompt.',
    author: 'sax/kooLabs',
    creationDate: '2025-11-10',
    category: 'Content',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Topic', 'Target Audience'],
    outputs: ['E-Book Outline'],
    detailedScope: 'Generates a structured outline and drafts content for long-form e-books or whitepapers.'
  },
  {
    id: 'spreadsheet_creator',
    number: 10,
    title: 'Smart Spreadsheet Creator',
    description: 'Generate complex Excel/Sheets formulas and VBA macros from natural language.',
    author: 'sax/kooLabs',
    creationDate: '2025-11-15',
    category: 'Content',
    techStack: ['Gemini 2.5 Flash', 'React', 'Tailwind'],
    inputs: ['Data Requirements'],
    outputs: ['Spreadsheet Formulas'],
    detailedScope: 'Translates natural language into complex spreadsheet formulas and macros.'
  },
  {
    id: 'website_builder',
    number: 11,
    title: 'Website Builder',
    description: 'Generate complete, interactive website landing pages with modern design components.',
    author: 'sax/kooLabs',
    creationDate: '2025-11-20',
    category: 'Web',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Website Idea'],
    outputs: ['Website Code'],
    detailedScope: 'Creates fully functional, responsive website landing pages with modern design patterns.'
  },
  {
    id: 'product_research_tool',
    number: 12,
    title: 'Product Research Tool',
    description: 'Discover profitable digital product niches before competitors with trend analysis.',
    author: 'sax/kooLabs',
    creationDate: '2025-11-25',
    category: 'Research',
    techStack: ['Gemini 2.5 Pro', 'React', 'Tailwind'],
    inputs: ['Niche or Market'],
    outputs: ['Product Research Report'],
    detailedScope: 'Analyzes market trends and identifies profitable digital product opportunities.'
  }
];

export const OfficeDatasheet: React.FC<OfficeDatasheetProps> = ({ onRunTool, onClose }) => {
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
