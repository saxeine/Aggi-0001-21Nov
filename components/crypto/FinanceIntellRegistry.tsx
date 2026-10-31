import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, ArrowUpDown, Calendar, User, Play, FileSpreadsheet, 
  ChevronRight, X, Check, Info, Layers, Sparkles, ArrowRight, Edit, Plus, RotateCcw, AlertTriangle, ShieldCheck
} from 'lucide-react';

export interface FinanceToolRecord {
  id: string;
  number: number;
  title: string;
  description: string;
  author: string;
  creationDate: string;
  category: 'Stocks' | 'Crypto' | 'Forex' | 'Risk Management' | 'Macro' | 'AI/Sentiment' | 'DevTools' | 'General';
  techStack: string[];
  version: string;
  status: 'Stable' | 'Beta' | 'Active' | 'Under Development' | 'Deprecating';
}

interface FinanceIntellRegistryProps {
  onRunTool: (toolId: string) => void;
  onClose: () => void;
  theme?: string;
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

const DEFAULT_FINANCE_TOOLS: FinanceToolRecord[] = [
  {
    id: 'stock_trading_assistant',
    number: 1,
    title: 'Stock Trading Assistant',
    category: 'Stocks',
    description: 'Analyzes technical stock indicators, aggregates daily candle volumes, and displays high-fidelity interactive stock charts for active day traders.',
    author: 'sax/kooLabs',
    creationDate: '2026-01-15',
    version: 'v1.2.0',
    techStack: ['React', 'Tailwind CSS', 'Recharts', 'Lucide Icons'],
    status: 'Stable'
  },
  {
    id: 'crypto_trading_assistant',
    number: 2,
    title: 'Crypto Trading Assistant',
    category: 'Crypto',
    description: 'Tracks live blockchain asset valuations, calculates moving averages across major pairs, and provides trading execution simulations.',
    author: 'Rytt/kooWorks',
    creationDate: '2026-02-02',
    version: 'v1.3.1',
    techStack: ['React hooks', 'LocalStorage', 'CSS Animations'],
    status: 'Stable'
  },
  {
    id: 'currency_trading_assistant',
    number: 3,
    title: 'Currency Trading Assistant',
    category: 'Forex',
    description: 'Forex cross-rate calculation desk supporting Swedish Krona (SEK) and main major currency pairs with live pip-spread calculators.',
    author: 'TallViking/kooWorks',
    creationDate: '2026-02-28',
    version: 'v1.0.5',
    techStack: ['React', 'Currency Conversion API', 'Lucide Icons'],
    status: 'Active'
  },
  {
    id: 'kelly_criterion',
    number: 4,
    title: 'Kelly Criterion Risk Planner',
    category: 'Risk Management',
    description: 'Calculates fractional bet-sizing and capital allocations using the classic Kelly Criterion formula based on historic win rates and pay-out odds.',
    author: 'sax/kooLabs',
    creationDate: '2026-03-12',
    version: 'v2.1.0',
    techStack: ['Stochastic algorithms', 'React state', 'math.js'],
    status: 'Stable'
  },
  {
    id: 'portfolio_simulator',
    number: 5,
    title: 'Stochastic Portfolio Simulator',
    category: 'Risk Management',
    description: 'Performs multi-asset Monte Carlo trials to project portfolio compounded growth boundaries, tail risk, and maximum drawdown distributions.',
    author: 'StockX/kooWorks',
    creationDate: '2026-04-18',
    version: 'v1.8.0',
    techStack: ['Monte Carlo simulations', 'Canvas API', 'Recharts'],
    status: 'Beta'
  },
  {
    id: 'yield_curve_analyser',
    number: 6,
    title: 'Macro Yield Curve Analyser',
    category: 'Macro',
    description: 'Plots US Treasury or sovereign yield curves, calculates present value (PV) discounting of bond payments, and signals macro expansion/contraction regimes.',
    author: 'sax/kooLabs',
    creationDate: '2026-05-09',
    version: 'v1.1.2',
    techStack: ['Recharts', 'Financial formulas', 'SVG rendering'],
    status: 'Active'
  },
  {
    id: 'arbitrage_matrix',
    number: 7,
    title: 'Cross-Asset Arbitrage & Matrix',
    category: 'Crypto',
    description: 'Monitors price discrepancies across Coinbase, Binance, Uniswap and Kraken live, subtracts fee frictions, and updates asset correlation heatmap clusters.',
    author: 'saxeine/kooLabs',
    creationDate: '2026-06-20',
    version: 'v1.5.0',
    techStack: ['WebSockets simulated feed', 'Heatmap matrices', 'React context'],
    status: 'Stable'
  },
  {
    id: 'sentiment_terminal',
    number: 8,
    title: 'AI News Sentiment Terminal',
    category: 'AI/Sentiment',
    description: 'Leverages server-side Gemini 3.5 LLMs to parse unstructured financial wires and news into categorical sentiment indices and multi-market catalyst scores.',
    author: 'sax/kooLabs',
    creationDate: '2026-07-01',
    version: 'v1.5.0',
    techStack: ['Gemini 3.5 Flash', 'Node Express proxy', 'JSON structured schemas'],
    status: 'Stable'
  },
  {
    id: 'tv_indicator_studio',
    number: 9,
    title: 'TradingView Indicator Studio',
    category: 'DevTools',
    description: 'Pine Script compiler and editor enabling users to chain and customize indicators, auto-generate Pine Script v5, and perform backtests.',
    author: 'TheBear/kooWorks',
    creationDate: '2026-07-04',
    version: 'v3.0.0',
    techStack: ['Pine Script v5 parser', 'Code editor container', 'Backtest engine'],
    status: 'Stable'
  }
];

export const FinanceIntellRegistry: React.FC<FinanceIntellRegistryProps> = ({ onRunTool, onClose, theme = 'charcoal' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All categories');
  const [sortBy, setSortBy] = useState<'number' | 'title' | 'creationDate' | 'version'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedTool, setSelectedTool] = useState<FinanceToolRecord | null>(null);

  // Tools database persistence in localStorage
  const [tools, setTools] = useState<FinanceToolRecord[]>(() => {
    const saved = localStorage.getItem('finance_tools_registry');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_FINANCE_TOOLS;
      }
    }
    return DEFAULT_FINANCE_TOOLS;
  });

  // Save to localStorage on change
  const saveToStorage = (updatedList: FinanceToolRecord[]) => {
    setTools(updatedList);
    localStorage.setItem('finance_tools_registry', JSON.stringify(updatedList));
  };

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form Fields
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editCreationDate, setEditCreationDate] = useState('');
  const [editCategory, setEditCategory] = useState<FinanceToolRecord['category']>('Stocks');
  const [editTechStack, setEditTechStack] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [editStatus, setEditStatus] = useState<FinanceToolRecord['status']>('Stable');

  const handleStartEdit = (tool: FinanceToolRecord) => {
    setEditTitle(tool.title);
    setEditDescription(tool.description);
    setEditAuthor(tool.author);
    setEditCreationDate(tool.creationDate);
    setEditCategory(tool.category);
    setEditTechStack(tool.techStack.join(', '));
    setEditVersion(tool.version);
    setEditStatus(tool.status);
    setIsEditing(true);
    setIsCreatingNew(false);
  };

  const handleStartCreate = () => {
    setEditTitle('');
    setEditDescription('');
    setEditAuthor('sax/kooLabs');
    // Set to current date YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    setEditCreationDate(today);
    setEditCategory('Stocks');
    setEditTechStack('');
    setEditVersion('v1.0.0');
    setEditStatus('Active');
    setIsEditing(true);
    setIsCreatingNew(true);
  };

  const handleSaveForm = () => {
    if (isCreatingNew) {
      const nextNum = tools.length > 0 ? Math.max(...tools.map(t => t.number)) + 1 : 1;
      const newId = editTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const newRecord: FinanceToolRecord = {
        id: newId || `tool_${Date.now()}`,
        number: nextNum,
        title: editTitle || 'New Finance Tool',
        description: editDescription,
        author: editAuthor || 'sax/kooLabs',
        creationDate: editCreationDate || new Date().toISOString().split('T')[0],
        category: editCategory,
        techStack: editTechStack.split(',').map(s => s.trim()).filter(Boolean),
        version: editVersion || 'v1.0.0',
        status: editStatus
      };
      const updated = [...tools, newRecord];
      saveToStorage(updated);
      setSelectedTool(newRecord);
    } else {
      if (!selectedTool) return;
      const updated = tools.map(t => {
        if (t.id === selectedTool.id) {
          return {
            ...t,
            title: editTitle,
            description: editDescription,
            author: editAuthor,
            creationDate: editCreationDate,
            category: editCategory,
            techStack: editTechStack.split(',').map(s => s.trim()).filter(Boolean),
            version: editVersion,
            status: editStatus
          };
        }
        return t;
      });
      saveToStorage(updated);
      const updatedTool = updated.find(t => t.id === selectedTool.id) || null;
      setSelectedTool(updatedTool);
    }
    setIsEditing(false);
    setIsCreatingNew(false);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset tools registry log to default specification templates? All custom entries will be restored.')) {
      saveToStorage(DEFAULT_FINANCE_TOOLS);
      setSelectedTool(null);
      setIsEditing(false);
      setIsCreatingNew(false);
    }
  };

  const handleDeleteTool = (toolId: string) => {
    if (window.confirm('Are you sure you want to delete this tool record from the log?')) {
      const updated = tools.filter(t => t.id !== toolId);
      saveToStorage(updated);
      setSelectedTool(null);
      setIsEditing(false);
      setIsCreatingNew(false);
    }
  };

  // Theme support mirroring FinanceView styles mapping
  const themeStyles: Record<string, any> = {
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
      rowHover: 'hover:bg-zinc-900/60',
      inputBg: 'bg-zinc-900',
      badgeBg: 'bg-zinc-900 text-sky-400 border-zinc-850',
      tableHeaderBg: 'bg-zinc-900/50',
      headerGradient: 'from-teal-400 to-sky-500',
      btnActive: 'bg-teal-600 text-white shadow-lg shadow-teal-900/20',
      btnInactive: 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border-zinc-800',
      modalBg: 'bg-zinc-950 border-zinc-800'
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
    },
    cosmic: {
      bg: 'bg-slate-950 border-slate-900',
      text: 'text-indigo-100',
      textDim: 'text-indigo-300',
      textMuted: 'text-indigo-500',
      textHighlight: 'text-white',
      border: 'border-slate-850',
      borderSubtle: 'border-slate-900',
      panelBg: 'bg-slate-950',
      cardBg: 'bg-indigo-950/30 border-indigo-900/50',
      rowHover: 'hover:bg-indigo-950/40',
      inputBg: 'bg-slate-900',
      badgeBg: 'bg-indigo-950 text-indigo-300 border-indigo-900/40',
      tableHeaderBg: 'bg-slate-900/50',
      headerGradient: 'from-violet-500 to-indigo-500',
      btnActive: 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40',
      btnInactive: 'bg-slate-900 text-indigo-300 hover:bg-slate-800 border-slate-800',
      modalBg: 'bg-slate-950 border-slate-900'
    },
    emerald: {
      bg: 'bg-stone-950 border-stone-900',
      text: 'text-emerald-100',
      textDim: 'text-emerald-400',
      textMuted: 'text-emerald-600',
      textHighlight: 'text-emerald-50',
      border: 'border-emerald-950',
      borderSubtle: 'border-stone-900',
      panelBg: 'bg-stone-950',
      cardBg: 'bg-emerald-950/20 border-emerald-900/40',
      rowHover: 'hover:bg-emerald-950/30',
      inputBg: 'bg-stone-900',
      badgeBg: 'bg-emerald-950 text-emerald-400 border-emerald-900/30',
      tableHeaderBg: 'bg-stone-900/50',
      headerGradient: 'from-emerald-400 to-teal-500',
      btnActive: 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40',
      btnInactive: 'bg-stone-900 text-emerald-400 hover:bg-stone-800 border-stone-800',
      modalBg: 'bg-stone-950 border-stone-900'
    },
    amber: {
      bg: 'bg-yellow-950 border-yellow-900/50',
      text: 'text-amber-400',
      textDim: 'text-amber-500/85',
      textMuted: 'text-amber-600/70',
      textHighlight: 'text-amber-300 font-extrabold',
      border: 'border-yellow-900/35',
      borderSubtle: 'border-yellow-950',
      panelBg: 'bg-yellow-950',
      cardBg: 'bg-yellow-950/45 border-yellow-900/25',
      rowHover: 'hover:bg-yellow-900/25',
      inputBg: 'bg-yellow-950/70',
      badgeBg: 'bg-yellow-950 text-amber-400 border-yellow-900/30',
      tableHeaderBg: 'bg-yellow-950/35',
      headerGradient: 'from-amber-400 to-yellow-500',
      btnActive: 'bg-amber-500 text-black font-black shadow-lg shadow-amber-950/50',
      btnInactive: 'bg-yellow-950 text-amber-500 hover:bg-yellow-900/35 border-yellow-900/35',
      modalBg: 'bg-yellow-950 border-yellow-900/40'
    },
    cyberpunk: {
      bg: 'bg-zinc-950 border-fuchsia-900/55',
      text: 'text-cyan-400',
      textDim: 'text-pink-400',
      textMuted: 'text-fuchsia-600',
      textHighlight: 'text-cyan-300 font-extrabold',
      border: 'border-fuchsia-900/45',
      borderSubtle: 'border-zinc-900',
      panelBg: 'bg-zinc-950',
      cardBg: 'bg-fuchsia-950/15 border-fuchsia-900/35',
      rowHover: 'hover:bg-fuchsia-950/25',
      inputBg: 'bg-zinc-900',
      badgeBg: 'bg-fuchsia-950/30 text-cyan-300 border-fuchsia-900/35',
      tableHeaderBg: 'bg-zinc-900/55',
      headerGradient: 'from-pink-500 to-cyan-400',
      btnActive: 'bg-pink-600 text-white shadow-lg shadow-pink-900/40',
      btnInactive: 'bg-zinc-900 text-pink-400 hover:bg-zinc-800 border-zinc-800',
      modalBg: 'bg-zinc-950 border-fuchsia-900/45'
    },
    slate: {
      bg: 'bg-slate-900 border-slate-800',
      text: 'text-slate-100',
      textDim: 'text-slate-400',
      textMuted: 'text-slate-500',
      textHighlight: 'text-white',
      border: 'border-slate-850',
      borderSubtle: 'border-slate-950',
      panelBg: 'bg-slate-900',
      cardBg: 'bg-slate-800/40 border-slate-850',
      rowHover: 'hover:bg-slate-800/60',
      inputBg: 'bg-slate-950',
      badgeBg: 'bg-slate-950 text-sky-400 border-slate-850',
      tableHeaderBg: 'bg-slate-950/50',
      headerGradient: 'from-teal-400 to-sky-500',
      btnActive: 'bg-teal-600 text-white shadow-lg shadow-teal-900/20',
      btnInactive: 'bg-slate-950 text-slate-400 hover:bg-slate-800 border-slate-800',
      modalBg: 'bg-slate-900 border-slate-800'
    },
    crimson: {
      bg: 'bg-rose-950 border-rose-900/50',
      text: 'text-rose-100',
      textDim: 'text-rose-350',
      textMuted: 'text-rose-500',
      textHighlight: 'text-white',
      border: 'border-rose-900/40',
      borderSubtle: 'border-rose-950',
      panelBg: 'bg-rose-950',
      cardBg: 'bg-rose-950/20 border-rose-900/30',
      rowHover: 'hover:bg-rose-950/30',
      inputBg: 'bg-rose-950/40',
      badgeBg: 'bg-rose-950 text-rose-300 border-rose-900/35',
      tableHeaderBg: 'bg-rose-950/30',
      headerGradient: 'from-rose-500 to-orange-500',
      btnActive: 'bg-rose-600 text-white shadow-lg shadow-rose-950/40',
      btnInactive: 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/45 border-rose-900/35',
      modalBg: 'bg-rose-950 border-rose-900'
    },
    orchid: {
      bg: 'bg-fuchsia-950 border-fuchsia-900/50',
      text: 'text-fuchsia-100',
      textDim: 'text-fuchsia-300',
      textMuted: 'text-fuchsia-500',
      textHighlight: 'text-white font-extrabold',
      border: 'border-fuchsia-800/40',
      borderSubtle: 'border-fuchsia-900',
      panelBg: 'bg-fuchsia-950',
      cardBg: 'bg-fuchsia-900/20 border-fuchsia-850',
      rowHover: 'hover:bg-fuchsia-900/30',
      inputBg: 'bg-fuchsia-950/40',
      badgeBg: 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-900/35',
      tableHeaderBg: 'bg-fuchsia-950/30',
      headerGradient: 'from-pink-400 to-fuchsia-500',
      btnActive: 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-950/40',
      btnInactive: 'bg-fuchsia-950 text-fuchsia-300 hover:bg-fuchsia-900/45 border-fuchsia-900/35',
      modalBg: 'bg-fuchsia-950 border-fuchsia-800'
    },
    olive: {
      bg: 'bg-stone-900 border-stone-800',
      text: 'text-lime-100',
      textDim: 'text-lime-350/85',
      textMuted: 'text-lime-500/70',
      textHighlight: 'text-lime-50 font-extrabold',
      border: 'border-stone-800/40',
      borderSubtle: 'border-stone-900',
      panelBg: 'bg-stone-900',
      cardBg: 'bg-stone-950/45 border-stone-800/25',
      rowHover: 'hover:bg-stone-800/30',
      inputBg: 'bg-stone-950/70',
      badgeBg: 'bg-stone-950 text-lime-400 border-stone-800/30',
      tableHeaderBg: 'bg-stone-950/30',
      headerGradient: 'from-amber-600 to-lime-500',
      btnActive: 'bg-amber-600 text-stone-950 font-bold shadow-lg shadow-stone-950/50',
      btnInactive: 'bg-stone-950 text-lime-400 hover:bg-stone-800/45 border-stone-800/30',
      modalBg: 'bg-stone-900 border-stone-800'
    }
  };

  const st = themeStyles[theme] || themeStyles['charcoal'];

  // Categories list
  const categories = [
    'All categories', 
    'Stocks', 
    'Crypto', 
    'Forex', 
    'Risk Management', 
    'Macro', 
    'AI/Sentiment', 
    'DevTools'
  ];

  // Search and filter logic
  const filteredTools = useMemo(() => {
    return tools.filter(t => {
      const matchesSearch = 
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.techStack.some(tech => tech.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'All categories' || t.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [tools, searchTerm, selectedCategory]);

  // Sorting logic
  const sortedTools = useMemo(() => {
    return [...filteredTools].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'number') {
        comparison = a.number - b.number;
      } else if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'creationDate') {
        comparison = a.creationDate.localeCompare(b.creationDate);
      } else if (sortBy === 'version') {
        comparison = a.version.localeCompare(b.version);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredTools, sortBy, sortOrder]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const BOM = '\uFEFF';
    const cleanField = (str: string) => {
      if (!str) return '';
      return str.replace(/\r?\n|\r/g, ' ').replace(/"/g, '""');
    };

    const headers = ['ID', 'Tool Title', 'Category', 'Version', 'Status', 'Creation Date', 'Author/Developer', 'Tech Stack', 'Description'];
    const rows = tools.map(t => [
      t.number,
      `"${cleanField(t.title)}"`,
      `"${cleanField(t.category)}"`,
      `"${cleanField(t.version)}"`,
      `"${cleanField(t.status)}"`,
      `"${cleanField(formatDateToDDMMYY(t.creationDate))}"`,
      `"${cleanField(t.author)}"`,
      `"${cleanField(t.techStack.join(', '))}"`,
      `"${cleanField(t.description)}"`
    ]);

    const csvContent = BOM + 'sep=,\n' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `finance_intell_registry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportTxt = () => {
    const headerText = "FINANCE INTELL STUDIO REGISTRY LOG\n" + "==================================\n\n";
    const body = tools.map(t => {
      return `[ID: ${t.number}] ${t.title} (${t.version})\n` +
             `Category: ${t.category} | Status: ${t.status}\n` +
             `Created: ${formatDateToDDMMYY(t.creationDate)} by ${t.author}\n` +
             `Tech Stack: ${t.techStack.join(', ')}\n` +
             `Description: ${t.description}\n` +
             "--------------------------------------------------";
    }).join('\n\n');

    const txtContent = headerText + body;
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `finance_intell_registry_${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusStyle = (status: FinanceToolRecord['status']) => {
    switch (status) {
      case 'Stable':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Active':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'Beta':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Under Development':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Deprecating':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className={`p-6 md:p-8 rounded-2xl border transition-all duration-300 shadow-2xl flex flex-col gap-6 ${st.bg} ${st.text}`}>
      
      {/* Header Panel */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between border-b pb-6 gap-4 ${st.border}`}>
        <div className="space-y-1">
          <h2 className={`text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r ${st.headerGradient} flex items-center gap-3`}>
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <FileSpreadsheet className="w-7 h-7" />
            </span>
            Finance Intell Registry Log
          </h2>
          <p className={`text-xs ${st.textDim}`}>
            Version-controlled developer logs, tech stack dependencies, and strategic metadata for all financial intelligence tooling suites.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Create New Record */}
          <button
            onClick={handleStartCreate}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Add Tool Spec</span>
          </button>

          {/* Reset Defaults */}
          <button
            onClick={handleResetDefaults}
            className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${st.btnInactive}`}
            title="Restore Default Templates"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export</span>
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
                      handleExportCSV();
                      setIsExportDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${st.rowHover} ${st.text}`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span>Export Excel CSV (.csv)</span>
                  </button>
                  <button
                    onClick={() => {
                      handleExportTxt();
                      setIsExportDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${st.rowHover} ${st.text}`}
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
          
          {/* Close Registry Button */}
          <button
            onClick={onClose}
            className="p-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-500 hover:text-red-400 rounded-xl transition-all flex items-center justify-center cursor-pointer"
            title="Close Registry View"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`flex flex-col lg:flex-row gap-4 items-center justify-between p-4 rounded-xl border shadow-lg ${st.cardBg} ${st.borderSubtle}`}>
        
        {/* Search Input */}
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, author, tech stack, version..."
            className={`w-full border rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-teal-500 transition-colors ${st.inputBg} ${st.border} ${st.text}`}
          />
        </div>

        {/* Categories Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
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

      {/* Spreadsheet Grid */}
      <div className={`border rounded-xl overflow-hidden shadow-xl ${st.cardBg} ${st.borderSubtle}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-xs font-bold ${st.tableHeaderBg} ${st.borderSubtle} ${st.textDim}`}>
                <th className="p-4 w-16 cursor-pointer hover:bg-zinc-500/10 transition-colors" onClick={() => toggleSort('number')}>
                  <div className="flex items-center gap-1">
                    <span># ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-zinc-500/10 transition-colors" onClick={() => toggleSort('title')}>
                  <div className="flex items-center gap-1">
                    <span>App Name / Title</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4">Category</th>
                <th className="p-4">Version</th>
                <th className="p-4">Primary Purpose & Description</th>
                <th className="p-4 cursor-pointer hover:bg-zinc-500/10 transition-colors" onClick={() => toggleSort('creationDate')}>
                  <div className="flex items-center gap-1">
                    <span>Created Date</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4">Status</th>
                <th className="p-4">Developer</th>
                <th className="p-4 text-center">Interactive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-950/20 text-xs">
              {sortedTools.map((tool) => (
                <tr 
                  key={tool.id} 
                  className={`transition-colors cursor-pointer group ${st.rowHover} border-b ${st.borderSubtle}`}
                  onClick={() => setSelectedTool(tool)}
                >
                  <td className={`p-4 font-mono font-bold ${st.textMuted}`}>
                    {tool.number}
                  </td>
                  <td className={`p-4 font-bold ${st.text} group-hover:text-teal-500 transition-colors`}>
                    {tool.title}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-[10px] font-bold text-teal-400">
                      {tool.category}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-semibold text-zinc-400">
                    {tool.version}
                  </td>
                  <td className={`p-4 min-w-[240px] whitespace-normal break-words ${st.textDim}`} title={tool.description}>
                    <p className="line-clamp-2 leading-relaxed">{tool.description}</p>
                  </td>
                  <td className="p-4 font-mono">
                    <span className="flex items-center gap-1 text-emerald-500 font-medium">
                      <Calendar className="w-3.5 h-3.5 opacity-60" />
                      {formatDateToDDMMYY(tool.creationDate)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusStyle(tool.status)}`}>
                      {tool.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-1 text-pink-500 font-semibold">
                      <User className="w-3.5 h-3.5 opacity-60" />
                      {tool.author}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedTool(tool)}
                        className={`p-1.5 border rounded-lg transition-all ${st.btnInactive}`}
                        title="View specifications details"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>

                      {/* We only render "Run" button for actual core tool IDs that the main panel hosts */}
                      {['stock_trading_assistant', 'crypto_trading_assistant', 'currency_trading_assistant', 'kelly_criterion', 'portfolio_simulator', 'yield_curve_analyser', 'arbitrage_matrix', 'sentiment_terminal', 'tv_indicator_studio'].includes(tool.id) ? (
                        <button
                          onClick={() => onRunTool(tool.id)}
                          className="p-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-400 hover:text-teal-300 rounded-lg transition-all"
                          title="Run this application directly"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-600 font-mono italic px-2">Log only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {sortedTools.length === 0 && (
                <tr>
                  <td colSpan={9} className={`p-12 text-center ${st.textMuted}`}>
                    No tools match the filters or search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Slide-Over Drawer */}
      {selectedTool && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-end animate-fade-in">
          <div className={`w-full max-w-2xl h-full border-l p-6 md:p-8 overflow-y-auto flex flex-col justify-between shadow-2xl relative ${st.bg} ${st.border}`}>
            
            {isEditing ? (
              /* Edit Tool / Create Tool Form */
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                  <div className={`flex items-center justify-between border-b pb-4 ${st.border}`}>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest">
                        {isCreatingNew ? 'ADD NEW SPECIFICATION RECORD' : `EDIT TOOL LOG SPECIFICATION • RECORD ${selectedTool.number}`}
                      </span>
                      <h3 className={`text-xl font-bold ${st.textHighlight}`}>
                        {isCreatingNew ? 'Create New Tool' : 'Modify Tool Metadata'}
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsEditing(false)}
                      className={`p-1.5 border rounded-lg transition-colors ${st.btnInactive}`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Tool Title / Name</label>
                      <input 
                        type="text" 
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="e.g. Black-Scholes Pricer"
                        className={`w-full border focus:border-teal-500 rounded-lg p-2.5 text-xs outline-none ${st.inputBg} ${st.border} ${st.text}`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Author / Lab</label>
                      <input 
                        type="text" 
                        value={editAuthor}
                        onChange={e => setEditAuthor(e.target.value)}
                        className={`w-full border focus:border-teal-500 rounded-lg p-2.5 text-xs outline-none ${st.inputBg} ${st.border} ${st.text}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Category</label>
                      <select 
                        value={editCategory}
                        onChange={e => setEditCategory(e.target.value as any)}
                        className={`w-full border focus:border-teal-500 rounded-lg p-2 text-xs outline-none cursor-pointer ${st.inputBg} ${st.border} ${st.text}`}
                      >
                        {categories.filter(c => c !== 'All categories').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Version</label>
                      <input 
                        type="text" 
                        value={editVersion}
                        onChange={e => setEditVersion(e.target.value)}
                        placeholder="v1.0.0"
                        className={`w-full border focus:border-teal-500 rounded-lg p-2 text-xs outline-none font-mono ${st.inputBg} ${st.border} ${st.text}`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Status</label>
                      <select 
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value as any)}
                        className={`w-full border focus:border-teal-500 rounded-lg p-2 text-xs outline-none cursor-pointer ${st.inputBg} ${st.border} ${st.text}`}
                      >
                        <option value="Stable">Stable</option>
                        <option value="Beta">Beta</option>
                        <option value="Active">Active</option>
                        <option value="Under Development">Under Dev</option>
                        <option value="Deprecating">Deprecating</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Creation Date (YYYY-MM-DD)</label>
                      <input 
                        type="text" 
                        value={editCreationDate}
                        onChange={e => setEditCreationDate(e.target.value)}
                        className={`w-full border focus:border-teal-500 rounded-lg p-2.5 text-xs outline-none font-mono ${st.inputBg} ${st.border} ${st.text}`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Tech Stack (comma-separated)</label>
                      <input 
                        type="text" 
                        value={editTechStack}
                        onChange={e => setEditTechStack(e.target.value)}
                        placeholder="React, Recharts, D3"
                        className={`w-full border focus:border-teal-500 rounded-lg p-2.5 text-xs outline-none ${st.inputBg} ${st.border} ${st.text}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-bold uppercase ${st.textDim}`}>Description Purpose Summary</label>
                    <textarea 
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      rows={4}
                      className={`w-full border focus:border-teal-500 rounded-lg p-2.5 text-xs outline-none resize-none leading-relaxed ${st.inputBg} ${st.border} ${st.text}`}
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className={`flex items-center justify-between border-t pt-4 ${st.border}`}>
                  {!isCreatingNew && (
                    <button
                      onClick={() => handleDeleteTool(selectedTool.id)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                    >
                      Delete Record
                    </button>
                  )}
                  <div className="flex items-center gap-3 ml-auto">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        if (isCreatingNew) setSelectedTool(null);
                      }}
                      className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${st.btnInactive}`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveForm}
                      className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-teal-500/15"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Spec</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Standard View Specs mode */
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  {/* Title Bar */}
                  <div className={`flex items-center justify-between border-b pb-4 ${st.border}`}>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-widest">
                        SPECIFICATION RECORD • APP {selectedTool.number}
                      </span>
                      <h3 className={`text-2xl font-black ${st.textHighlight}`}>{selectedTool.title}</h3>
                    </div>
                    <button
                      onClick={() => setSelectedTool(null)}
                      className={`p-1.5 border rounded-lg transition-colors ${st.btnInactive}`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Core Badges Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded bg-teal-500/10 border border-teal-500/25 text-xs font-extrabold text-teal-400">
                      Category: {selectedTool.category}
                    </span>
                    <span className="px-3 py-1 rounded bg-zinc-500/10 border border-zinc-500/25 text-xs font-mono font-semibold text-zinc-400">
                      Version: {selectedTool.version}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(selectedTool.status)}`}>
                      Status: {selectedTool.status}
                    </span>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 rounded-xl border ${st.cardBg} ${st.borderSubtle} space-y-1`}>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">Created Date</span>
                      <span className="text-xs font-mono font-medium flex items-center gap-1.5 text-emerald-400">
                        <Calendar className="w-4 h-4 opacity-70" />
                        {formatDateToDDMMYY(selectedTool.creationDate)}
                      </span>
                    </div>

                    <div className={`p-3 rounded-xl border ${st.cardBg} ${st.borderSubtle} space-y-1`}>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">Developer / Lab</span>
                      <span className="text-xs font-semibold flex items-center gap-1.5 text-pink-500">
                        <User className="w-4 h-4 opacity-70" />
                        {selectedTool.author}
                      </span>
                    </div>
                  </div>

                  {/* Description Card */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Description & Purpose</span>
                    <p className={`text-xs leading-relaxed p-4 rounded-xl border ${st.cardBg} ${st.borderSubtle} ${st.textDim} whitespace-pre-wrap`}>
                      {selectedTool.description}
                    </p>
                  </div>

                  {/* Tech Stack Chips */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Technology Stack Dependencies</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedTool.techStack.length > 0 ? (
                        selectedTool.techStack.map((tech, idx) => (
                          <span 
                            key={idx} 
                            className="px-2.5 py-1 bg-zinc-950 border border-zinc-900 rounded-lg text-xs font-mono text-zinc-400 flex items-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse" />
                            {tech}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs italic text-zinc-500">No dependencies specified</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Controls inside Drawer */}
                <div className={`flex items-center justify-between border-t pt-4 ${st.border}`}>
                  <button
                    onClick={() => handleStartEdit(selectedTool)}
                    className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit Specifications</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedTool(null)}
                      className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${st.btnInactive}`}
                    >
                      Close Details
                    </button>

                    {['stock_trading_assistant', 'crypto_trading_assistant', 'currency_trading_assistant', 'kelly_criterion', 'portfolio_simulator', 'yield_curve_analyser', 'arbitrage_matrix', 'sentiment_terminal', 'tv_indicator_studio'].includes(selectedTool.id) && (
                      <button
                        onClick={() => {
                          onRunTool(selectedTool.id);
                          setSelectedTool(null);
                        }}
                        className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-teal-500/15 animate-pulse"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Launch Applet</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
