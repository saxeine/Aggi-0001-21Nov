import ToolOrderSettingsModal from './ToolOrderSettingsModal';
import React, { useState, useEffect } from 'react';
import { saveUserPreference, loadUserPreference } from '../services/storage';
import { CryptoTradingAssistant } from './crypto/CryptoTradingAssistant';
import { StockTradingAssistant } from './crypto/StockTradingAssistant';
import { CurrencyTradingAssistant } from './crypto/CurrencyTradingAssistant';
import { TVIndicatorStudio } from './crypto/TVIndicatorStudio';
import { KellyCriterionCalculator } from './crypto/KellyCriterionCalculator';
import { MonteCarloSimulator } from './crypto/MonteCarloSimulator';
import { YieldCurveAnalyser } from './crypto/YieldCurveAnalyser';
import { ArbitrageCorrelationTracker } from './crypto/ArbitrageCorrelationTracker';
import { AISentimentTerminal } from './crypto/AISentimentTerminal';
import { FinanceIntellRegistry } from './crypto/FinanceIntellRegistry';
import { 
  TrendingUp, BarChart2, DollarSign, ArrowLeft, Code, 
  ShieldCheck, LineChart, Activity, ArrowUpDown, Bot 
} from 'lucide-react';

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
    cardBg: 'bg-zinc-900/40 border-zinc-850',
    rowHover: 'hover:bg-zinc-900/60',
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

interface FinanceViewProps {
  onBack: () => void;
}

type ThemeKey = keyof typeof themeStyles;

export const FinanceView: React.FC<FinanceViewProps> = ({ onBack }) => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [panelSize, setPanelSize] = useState<'large' | 'strip'>(() => {
    try {
      const saved = localStorage.getItem('pref_financePanelSize');
      if (saved) return JSON.parse(saved);
    } catch {}
    return 'strip';
  });

  useEffect(() => {
    loadUserPreference('financePanelSize').then(saved => {
      if (saved) setPanelSize(saved);
    });
  }, []);
  const [localTheme, setLocalTheme] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem('creative_studio_theme') as ThemeKey;
    if (saved && Object.keys(themeStyles).includes(saved)) {
      return saved;
    }
    return 'charcoal';
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const saved = localStorage.getItem('creative_studio_theme') as ThemeKey;
      if (saved && Object.keys(themeStyles).includes(saved)) {
        setLocalTheme(saved);
      }
    };
    window.addEventListener('creative_studio_theme_change', handleThemeChange);
    return () => {
      window.removeEventListener('creative_studio_theme_change', handleThemeChange);
    };
  }, []);

  const st = themeStyles[localTheme];

  const tools = [
    {
      id: 'stock_trading_assistant',
      title: 'US Stock Trading Assistant',
      icon: <BarChart2 className="w-5 h-5 text-emerald-400" />,
      color: 'hover:border-emerald-500/40',
      pills: ['Equities', 'Nasdaq 500', 'SEK Valuation']
    },
    {
      id: 'crypto_trading_assistant',
      title: 'Crypto Trading Assistant',
      icon: <TrendingUp className="w-5 h-5 text-amber-400" />,
      color: 'hover:border-amber-500/40',
      pills: ['Crypto', 'Conversion', 'RSI / MACD']
    },
    {
      id: 'currency_trading_assistant',
      title: 'Currency Trading Assistant',
      icon: <DollarSign className="w-5 h-5 text-sky-400" />,
      color: 'hover:border-sky-500/40',
      pills: ['Forex', 'SEK crosses', 'Live Pips']
    },
    {
      id: 'kelly_criterion',
      title: 'Kelly Criterion Risk Planner',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      color: 'hover:border-emerald-500/40',
      pills: ['Risk Management', 'Monte Carlo', 'Bet Sizing']
    },
    {
      id: 'portfolio_simulator',
      title: 'Stochastic Portfolio Simulator',
      icon: <LineChart className="w-5 h-5 text-amber-400" />,
      color: 'hover:border-amber-500/40',
      pills: ['Stochastic simulation', 'Portfolio projections', 'Tail Risk']
    },
    {
      id: 'yield_curve_analyser',
      title: 'Macro Yield Curve Analyser',
      icon: <Activity className="w-5 h-5 text-sky-400" />,
      color: 'hover:border-sky-500/40',
      pills: ['Bond yield curve', 'PV discounting', 'Macro signals']
    },
    {
      id: 'arbitrage_matrix',
      title: 'Cross-Asset Arbitrage & Matrix',
      icon: <ArrowUpDown className="w-5 h-5 text-indigo-400" />,
      color: 'hover:border-indigo-500/40',
      pills: ['Arbitrage spreads', 'Correlation cluster', 'Live spreads']
    },
    {
      id: 'sentiment_terminal',
      title: 'AI News Sentiment Terminal',
      icon: <Bot className="w-5 h-5 text-teal-400" />,
      color: 'hover:border-teal-500/40',
      pills: ['Gemini 3.5 AI', 'Sentiment parsing', 'Catalyst scores']
    },
    {
      id: 'tv_indicator_studio',
      title: 'TradingView Indicator Studio',
      icon: <Code className="w-5 h-5 text-fuchsia-400" />,
      color: 'hover:border-fuchsia-500/40',
      pills: ['Pine Script v5', 'Combiner Engine', 'Visual Backtest']
    }
  ];

  const defaultOrder = tools.map(t => t.id);
  const [toolOrder, setToolOrder] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pref_financeToolOrder');
      if (saved) {
         const parsed = JSON.parse(saved);
         if (parsed.length === defaultOrder.length) return parsed;
      }
    } catch {}
    return defaultOrder;
  });

  useEffect(() => {
    loadUserPreference('financeToolOrder').then(saved => {
      if (saved && Array.isArray(saved)) {
         let newOrder = [...saved];
         defaultOrder.forEach(id => {
            if (!newOrder.includes(id)) {
               newOrder.push(id);
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
    saveUserPreference('financeToolOrder', newOrder);
  };

  
  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${st.bg} ${st.text}`}>
      {/* Top Header Navigation */}
      <header className={`border-b backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between transition-colors duration-300 ${st.bg} ${st.border}`}>
        <div className="flex items-center gap-3">
          <span className="font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent text-lg">
            Finance Intell
          </span>
          {activeTool && (
            <div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${st.badgeBg}`}>
                {tools.find(t => t.id === activeTool)?.title || 'Finance Tool'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeTool !== 'registry' && (
            <button
              onClick={() => setActiveTool('registry')}
              className="px-4 py-2 bg-gradient-to-r from-teal-500/10 to-sky-500/10 hover:from-teal-500/20 hover:to-sky-500/20 border border-teal-500/20 hover:border-teal-500/40 rounded-lg text-teal-400 text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-teal-500/5 cursor-pointer"
              title="Open Finance Intell Registry"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>info</span>
            </button>
          )}

          {/* Pill box button *243.jpg to compact panels */}
          {!activeTool && (
            <button
              onClick={() => {
                 const nextSize = panelSize === 'large' ? 'strip' : 'large';
                 setPanelSize(nextSize);
                 saveUserPreference('financePanelSize', nextSize);
              }}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl transition-all flex items-center justify-center group"
              title="Compact panels to strip/large"
            >
              <svg className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {!activeTool && (
            <button
              onClick={() => setIsToolSettingsOpen(true)}
              className={`p-2 border rounded-xl transition-colors ${st.btnInactive}`}
              title="Reorder Tools"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}

          {/* Theme cycle button added directly in the finance section header */}
          <button
            onClick={() => {
              const themes = Object.keys(themeStyles) as ThemeKey[];
              const nextIndex = (themes.indexOf(localTheme) + 1) % themes.length;
              const nextTheme = themes[nextIndex];
              setLocalTheme(nextTheme);
              localStorage.setItem('creative_studio_theme', nextTheme);
              saveUserPreference('creative_studio_theme', nextTheme);
              window.dispatchEvent(new Event('creative_studio_theme_change'));
            }}
            className={`w-7 h-7 rounded-full border-2 transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer ${
              localTheme === 'charcoal' 
                ? 'bg-zinc-900 border-zinc-600 shadow-md shadow-black/40' 
                : localTheme === 'silver' 
                ? 'bg-zinc-300 border-zinc-400 shadow-md shadow-zinc-500/20' 
                : localTheme === 'white' 
                ? 'bg-white border-zinc-300 shadow-md'
                : localTheme === 'cosmic' 
                ? 'bg-indigo-900 border-indigo-500 shadow-md shadow-indigo-950/50' 
                : localTheme === 'emerald' 
                ? 'bg-emerald-900 border-emerald-500 shadow-md shadow-emerald-950/50' 
                : localTheme === 'amber' 
                ? 'bg-amber-600 border-amber-500 shadow-md shadow-amber-950/50' 
                : localTheme === 'cyberpunk' 
                ? 'bg-fuchsia-900 border-cyan-400 shadow-md' 
                : localTheme === 'slate' 
                ? 'bg-slate-800 border-slate-500 shadow-md' 
                : localTheme === 'crimson'
                ? 'bg-rose-900 border-rose-500 shadow-md shadow-rose-950/50'
                : localTheme === 'orchid'
                ? 'bg-fuchsia-700 border-fuchsia-500 shadow-md shadow-fuchsia-950/50'
                : 'bg-stone-700 border-stone-500 shadow-md shadow-stone-950/50'
            }`}
            title={`Cycle theme (current: ${localTheme})`}
          />

          {activeTool && (
            <button
              onClick={() => setActiveTool(null)}
              className={`text-xs font-bold px-3 py-1.5 border rounded-lg transition-colors ${st.btnInactive}`}
            >
              Dashboard
            </button>
          )}

          <button
            onClick={activeTool ? () => setActiveTool(null) : onBack}
            className={`p-2 border rounded-lg transition-colors ${st.btnInactive}`}
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content View */}
      <main className={`flex-1 overflow-y-auto pt-2 px-6 pb-6 md:pt-3 md:px-8 md:pb-8 ${activeTool ? 'max-w-[1700px]' : 'max-w-7xl'} w-full mx-auto custom-scrollbar`}>
        {!activeTool ? (
          <div className="animate-fade-in space-y-6 pt-0 pb-2">
            <div className="max-w-2xl">
              <h2 className={`text-3xl font-extrabold tracking-tight mt-0 mb-1.5 ${st.textHighlight}`}>
                Finance Intell
              </h2>
              <p className={`text-sm leading-relaxed ${st.textDim}`}>
                Analyze price feeds, calculate pip movements, configure watchlists, and map stock vectors. Fully optimized with direct SEK valuation crosses.
              </p>
            </div>

            {/* Compact panels list using custom pill boxes or grid based on panelSize state */}
            {panelSize === 'strip' ? (
              <div className="flex flex-col gap-3 pt-2">
                {orderedTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 hover:translate-x-1 cursor-pointer ${st.cardBg} ${st.borderSubtle} ${tool.color}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-900/80 rounded-xl border border-zinc-800 text-zinc-300 flex items-center justify-center">
                        {tool.icon}
                      </div>
                      <h3 className={`text-sm font-bold ${st.textHighlight}`}>
                        {tool.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Custom Pill Box badges */}
                      <div className="hidden sm:flex flex-wrap gap-1.5">
                        {tool.pills.map((pill, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              i === 0 
                                ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' 
                                : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50'
                            }`}
                          >
                            {pill}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center text-xs font-bold text-zinc-400 hover:text-white transition-colors">
                        <span className={st.textDim}>Launch</span>
                        <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                {orderedTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    className={`flex flex-col text-left p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer ${st.cardBg} ${st.borderSubtle} ${tool.color}`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-zinc-900/80 rounded-xl border border-zinc-800 text-zinc-300 flex items-center justify-center">
                        {tool.icon}
                      </div>
                      <h3 className={`text-sm font-bold ${st.textHighlight}`}>
                        {tool.title}
                      </h3>
                    </div>

                    {/* Custom Pill Box badges */}
                    <div className="flex flex-wrap gap-1.5 mb-5 mt-auto">
                      {tool.pills.map((pill, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            i === 0 
                              ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' 
                              : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50'
                          }`}
                        >
                          {pill}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-zinc-400 hover:text-white transition-colors pt-2 border-t border-zinc-800/40">
                      <span className={st.textDim}>Launch Interface</span>
                      <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTool === 'registry' && (
              <FinanceIntellRegistry 
                theme={localTheme} 
                onClose={() => setActiveTool(null)} 
                onRunTool={(toolId) => setActiveTool(toolId)} 
              />
            )}
            {activeTool === 'tv_indicator_studio' && <TVIndicatorStudio theme={localTheme} />}
            {activeTool === 'crypto_trading_assistant' && <CryptoTradingAssistant theme={localTheme} />}
            {activeTool === 'stock_trading_assistant' && <StockTradingAssistant theme={localTheme} />}
            {activeTool === 'currency_trading_assistant' && <CurrencyTradingAssistant theme={localTheme} />}
            {activeTool === 'kelly_criterion' && <KellyCriterionCalculator theme={localTheme} />}
            {activeTool === 'portfolio_simulator' && <MonteCarloSimulator theme={localTheme} />}
            {activeTool === 'yield_curve_analyser' && <YieldCurveAnalyser theme={localTheme} />}
            {activeTool === 'arbitrage_matrix' && <ArbitrageCorrelationTracker theme={localTheme} />}
            {activeTool === 'sentiment_terminal' && <AISentimentTerminal theme={localTheme} />}
          </div>
        )}
      </main>
    
      
    
      <ToolOrderSettingsModal
        isOpen={isToolSettingsOpen}
        onClose={() => setIsToolSettingsOpen(false)}
        tools={tools}
        toolOrder={toolOrder}
        onSave={handleSaveOrder}
        viewModeLabel={`Layout: ${panelSize}`}
        onCycleViewMode={() => {
           const nextSize = panelSize === 'large' ? 'strip' : 'large';
           setPanelSize(nextSize);
           saveUserPreference('financePanelSize', nextSize);
        }}
        themeLabel={`Theme: ${localTheme}`}
        onCycleTheme={() => {
           const themes = Object.keys(themeStyles) as ThemeKey[];
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
