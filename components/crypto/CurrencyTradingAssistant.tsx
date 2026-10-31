import React, { useState, useEffect, useMemo } from 'react';
import { FOREX_PAIRS, FOREX_MAP, ForexPair } from '../../constants/forex';
import { TradingHeatmap } from './TradingHeatmap';
import { CurrencyCard } from './CurrencyCard';
import { CurrencyAnalysisPanel } from './CurrencyAnalysisPanel';
import { CurrencyPortfolioTracker } from './CurrencyPortfolioTracker';
import { fetchLiveForexData, LiveForexData } from '../../services/forexApi';
import { fetchFXRates } from '../../services/cryptoApi';
import { 
  Search, RefreshCw, Clock, Activity, ArrowUpDown, ShieldCheck, 
  ChevronLeft, ChevronRight, TrendingUp, DollarSign, Wallet, ArrowRight,
  TrendingDown, Globe, Plus, Check, Trash2, Sliders, Menu, X 
} from 'lucide-react';

export const CurrencyTradingAssistant: React.FC<{ theme?: 'charcoal' | 'silver' | 'white' | 'cosmic' | 'emerald' | 'amber' | 'cyberpunk' | 'slate' | 'crimson' | 'orchid' | 'olive' }> = ({ theme = 'charcoal' }) => {
  const st = useMemo(() => {
    const styles = {
      charcoal: {
        bg: 'bg-zinc-950',
        headerBg: 'bg-zinc-950/90 border-zinc-900',
        text: 'text-zinc-100',
        textDim: 'text-zinc-400',
        textMuted: 'text-zinc-500',
        textHighlight: 'text-white',
        border: 'border-zinc-800',
        cardBg: 'bg-zinc-900/40 border-zinc-850',
        sidebarBg: 'bg-zinc-950/40 border-zinc-900',
        innerBg: 'bg-zinc-900',
        inputBg: 'bg-zinc-900 border-zinc-800 focus:border-teal-500 text-zinc-100',
        btnActive: 'bg-teal-600 text-white shadow-lg shadow-teal-900/20',
        btnInactive: 'text-zinc-400 hover:text-white hover:bg-zinc-800/20',
        badgeBg: 'bg-zinc-900 text-sky-400 border-zinc-850',
        accentText: 'text-teal-400',
        accentBorder: 'border-teal-500/30',
        accentBg: 'bg-teal-50/50'
      },
      silver: {
        bg: 'bg-zinc-500',
        headerBg: 'bg-zinc-600/90 border-zinc-700',
        text: 'text-blue-950',
        textDim: 'text-indigo-950',
        textMuted: 'text-blue-900',
        textHighlight: 'text-blue-950 font-extrabold',
        border: 'border-zinc-600',
        cardBg: 'bg-zinc-300/90 border-zinc-400 shadow-md',
        sidebarBg: 'bg-zinc-400/50 border-zinc-600',
        innerBg: 'bg-zinc-100',
        inputBg: 'bg-zinc-100 border-zinc-450 focus:border-blue-950 text-blue-950',
        btnActive: 'bg-blue-950 text-white shadow-md shadow-blue-950/25',
        btnInactive: 'text-blue-950 hover:text-blue-950 hover:bg-zinc-300/50',
        badgeBg: 'bg-blue-200 text-blue-950 border-blue-300',
        accentText: 'text-blue-950',
        accentBorder: 'border-blue-950/30',
        accentBg: 'bg-blue-950/10'
      },
      white: {
        bg: 'bg-white',
        headerBg: 'bg-white/90 border-zinc-200',
        text: 'text-zinc-800',
        textDim: 'text-zinc-600',
        textMuted: 'text-zinc-400',
        textHighlight: 'text-zinc-950 font-extrabold',
        border: 'border-zinc-200',
        cardBg: 'bg-zinc-50 border-zinc-100 shadow-sm',
        sidebarBg: 'bg-zinc-50 border-zinc-100',
        innerBg: 'bg-white',
        inputBg: 'bg-white border-zinc-200 focus:border-teal-500 text-zinc-800',
        btnActive: 'bg-teal-600 text-white shadow-md shadow-teal-500/10',
        btnInactive: 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100',
        badgeBg: 'bg-zinc-100 text-sky-600 border-zinc-200',
        accentText: 'text-teal-600',
        accentBorder: 'border-teal-200',
        accentBg: 'bg-teal-50/50'
      },
      cosmic: {
        bg: 'bg-slate-950',
        headerBg: 'bg-slate-950/90 border-slate-900',
        text: 'text-indigo-100',
        textDim: 'text-indigo-300',
        textMuted: 'text-indigo-500',
        textHighlight: 'text-white',
        border: 'border-slate-850',
        cardBg: 'bg-indigo-950/30 border-indigo-900/50',
        sidebarBg: 'bg-slate-950/40 border-slate-900',
        innerBg: 'bg-slate-900',
        inputBg: 'bg-slate-900 border-slate-850 focus:border-violet-500 text-indigo-100',
        btnActive: 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40',
        btnInactive: 'text-indigo-300 hover:text-white hover:bg-slate-800',
        badgeBg: 'bg-indigo-950 text-indigo-300 border-indigo-900/40',
        accentText: 'text-indigo-400',
        accentBorder: 'border-indigo-500/30',
        accentBg: 'bg-indigo-500/10'
      },
      emerald: {
        bg: 'bg-stone-950',
        headerBg: 'bg-stone-950/90 border-stone-900',
        text: 'text-emerald-100',
        textDim: 'text-emerald-400',
        textMuted: 'text-emerald-600',
        textHighlight: 'text-emerald-50',
        border: 'border-emerald-950',
        cardBg: 'bg-emerald-950/20 border-emerald-900/40',
        sidebarBg: 'bg-stone-950/40 border-stone-900',
        innerBg: 'bg-stone-900',
        inputBg: 'bg-stone-900 border-stone-800 focus:border-emerald-500 text-emerald-100',
        btnActive: 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40',
        btnInactive: 'text-emerald-400 hover:text-emerald-200 hover:bg-stone-800',
        badgeBg: 'bg-emerald-950 text-emerald-400 border-emerald-900/30',
        accentText: 'text-emerald-400',
        accentBorder: 'border-emerald-500/30',
        accentBg: 'bg-emerald-500/10'
      },
      amber: {
        bg: 'bg-yellow-950',
        headerBg: 'bg-yellow-950/90 border-yellow-900/50',
        text: 'text-amber-400',
        textDim: 'text-amber-500/85',
        textMuted: 'text-amber-600/70',
        textHighlight: 'text-amber-300 font-extrabold',
        border: 'border-yellow-900/35',
        cardBg: 'bg-yellow-950/45 border-yellow-900/25',
        sidebarBg: 'bg-yellow-950/40 border-yellow-900/30',
        innerBg: 'bg-yellow-950/70',
        inputBg: 'bg-yellow-950/70 border-yellow-900/30 focus:border-amber-400 text-amber-400',
        btnActive: 'bg-amber-500 text-black font-black shadow-lg shadow-amber-950/50',
        btnInactive: 'text-amber-500 hover:text-amber-300 hover:bg-yellow-900/35',
        badgeBg: 'bg-yellow-950 text-amber-400 border-yellow-900/30',
        accentText: 'text-amber-400',
        accentBorder: 'border-amber-500/30',
        accentBg: 'bg-amber-500/10'
      },
      cyberpunk: {
        bg: 'bg-zinc-950',
        headerBg: 'bg-zinc-950/90 border-fuchsia-900/55',
        text: 'text-cyan-400',
        textDim: 'text-pink-400',
        textMuted: 'text-fuchsia-600',
        textHighlight: 'text-cyan-300 font-extrabold',
        border: 'border-fuchsia-900/45',
        cardBg: 'bg-fuchsia-950/15 border-fuchsia-900/35',
        sidebarBg: 'bg-zinc-950/40 border-zinc-900',
        innerBg: 'bg-zinc-900',
        inputBg: 'bg-zinc-900 border-zinc-800 focus:border-pink-500 text-cyan-400',
        btnActive: 'bg-pink-600 text-white shadow-lg shadow-pink-900/40',
        btnInactive: 'text-pink-400 hover:text-pink-200 hover:bg-zinc-800',
        badgeBg: 'bg-fuchsia-950/30 text-cyan-300 border-fuchsia-900/35',
        accentText: 'text-cyan-400',
        accentBorder: 'border-cyan-500/30',
        accentBg: 'bg-cyan-500/10'
      },
      slate: {
        bg: 'bg-slate-900',
        headerBg: 'bg-slate-900/90 border-slate-800',
        text: 'text-slate-100',
        textDim: 'text-slate-400',
        textMuted: 'text-slate-500',
        textHighlight: 'text-white',
        border: 'border-slate-850',
        cardBg: 'bg-slate-800/40 border-slate-850',
        sidebarBg: 'bg-slate-900/40 border-slate-850',
        innerBg: 'bg-slate-950',
        inputBg: 'bg-slate-950 border-slate-800 focus:border-teal-500 text-slate-100',
        btnActive: 'bg-teal-600 text-white shadow-lg shadow-teal-900/20',
        btnInactive: 'text-slate-400 hover:text-white hover:bg-slate-800/20',
        badgeBg: 'bg-slate-950 text-sky-400 border-slate-850',
        accentText: 'text-teal-400',
        accentBorder: 'border-teal-500/30',
        accentBg: 'bg-teal-50/50'
      },
      crimson: {
        bg: 'bg-rose-950',
        headerBg: 'bg-rose-950/90 border-rose-900/50',
        text: 'text-rose-100',
        textDim: 'text-rose-350',
        textMuted: 'text-rose-500',
        textHighlight: 'text-white',
        border: 'border-rose-900/40',
        cardBg: 'bg-rose-950/20 border-rose-900/30',
        sidebarBg: 'bg-rose-950/40 border-rose-900/40',
        innerBg: 'bg-rose-950/40',
        inputBg: 'bg-rose-950/40 border-rose-900/30 focus:border-rose-500 text-rose-100',
        btnActive: 'bg-rose-600 text-white shadow-lg shadow-rose-950/40',
        btnInactive: 'text-rose-300 hover:text-rose-200 hover:bg-rose-900/40',
        badgeBg: 'bg-rose-950 text-rose-300 border-rose-900/35',
        accentText: 'text-rose-400',
        accentBorder: 'border-rose-500/30',
        accentBg: 'bg-rose-500/10'
      },
      orchid: {
        bg: 'bg-fuchsia-950',
        headerBg: 'bg-fuchsia-950/90 border-fuchsia-900/50',
        text: 'text-fuchsia-100',
        textDim: 'text-fuchsia-300',
        textMuted: 'text-fuchsia-500',
        textHighlight: 'text-white font-extrabold',
        border: 'border-fuchsia-800/40',
        cardBg: 'bg-fuchsia-900/20 border-fuchsia-850',
        sidebarBg: 'bg-fuchsia-950/40 border-fuchsia-900/40',
        innerBg: 'bg-fuchsia-950/40',
        inputBg: 'bg-fuchsia-950/40 border-fuchsia-900/30 focus:border-fuchsia-500 text-fuchsia-100',
        btnActive: 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-950/40',
        btnInactive: 'text-fuchsia-300 hover:text-fuchsia-200 hover:bg-fuchsia-900/45',
        badgeBg: 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-900/35',
        accentText: 'text-fuchsia-400',
        accentBorder: 'border-fuchsia-500/30',
        accentBg: 'bg-fuchsia-500/10'
      },
      olive: {
        bg: 'bg-stone-900',
        headerBg: 'bg-stone-900/90 border-stone-800',
        text: 'text-lime-100',
        textDim: 'text-lime-350/85',
        textMuted: 'text-lime-500/70',
        textHighlight: 'text-lime-50 font-extrabold',
        border: 'border-stone-800/40',
        cardBg: 'bg-stone-950/45 border-stone-800/25',
        sidebarBg: 'bg-stone-900/40 border-stone-800/40',
        innerBg: 'bg-stone-950/70',
        inputBg: 'bg-stone-950/70 border-stone-800/30 focus:border-amber-500 text-lime-400',
        btnActive: 'bg-amber-600 text-stone-950 font-bold shadow-lg shadow-stone-950/50',
        btnInactive: 'text-lime-400 hover:text-lime-200 hover:bg-stone-800/45',
        badgeBg: 'bg-stone-950 text-lime-400 border-stone-800/30',
        accentText: 'text-lime-400',
        accentBorder: 'border-stone-800/30',
        accentBg: 'bg-stone-800/10'
      }
    };
    return styles[theme] || styles.charcoal;
  }, [theme]);

  // Global rates and prices
  const [forexData, setForexData] = useState<LiveForexData | null>(null);
  const [sekRate, setSekRate] = useState<number>(10.65); // USD/SEK default buy Price
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'success' | 'error'>('loading');

  // Sidebar controls
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState<boolean>(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(false);

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPairId, setSelectedPairId] = useState<string>('eur-usd');
  const [timeframe, setTimeframe] = useState<string>('4H');
  const [assistantTab, setAssistantTab] = useState<'terminal' | 'portfolio' | 'heatmap'>('terminal');

  // Interactive Live Ticking controls
  const [refreshInterval, setRefreshInterval] = useState<number>(60);
  const [countdown, setCountdown] = useState<number>(60);
  const [tickerSpeed, setTickerSpeed] = useState<number>(2);

  // Form states for creating custom pair
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
  const [customPairs, setCustomPairs] = useState<ForexPair[]>([]);
  const [customBase, setCustomBase] = useState<string>('');
  const [customQuote, setCustomQuote] = useState('');
  const [customName, setCustomName] = useState('');

  // 1. Combine default forex pairs with user-custom pairs
  const mergedPairs = useMemo(() => {
    return [...FOREX_PAIRS, ...customPairs];
  }, [customPairs]);

  const activePair = useMemo(() => {
    return mergedPairs.find(p => p.id === selectedPairId) || mergedPairs[0];
  }, [mergedPairs, selectedPairId]);

  // Load prices and core SEK exchange multiplier
  const loadForexRates = async (showSilently = false) => {
    if (!showSilently) {
      setLoadState('loading');
    }
    try {
      // Load standard SEK dollar rate
      const fx = await fetchFXRates();
      if (fx && fx.SEK) {
        setSekRate(fx.SEK);
      }

      // Load all live Forex ratios
      const forex = await fetchLiveForexData();
      
      // Inject some custom pairs' prices if custom pairs exist
      if (customPairs.length > 0) {
        customPairs.forEach(p => {
          if (!forex.rates[p.id]) {
            // Generate mock interactive price
            forex.rates[p.id] = (forex.rates[`${p.baseSymbol.toLowerCase()}-usd`] || 1.1) / (forex.rates[`${p.quoteSymbol.toLowerCase()}-usd`] || 1.0);
            if (isNaN(forex.rates[p.id]) || forex.rates[p.id] === 0) {
              forex.rates[p.id] = 1.0825 + (Math.sin(Date.now() / 100000) * 0.05);
            }
          }
          if (!forex.changes[p.id]) {
            forex.changes[p.id] = 0.045 + (Math.cos(Date.now() / 50000) * 0.08);
          }
        });
      }

      setForexData(forex);
      setLoadState('success');
    } catch (e) {
      console.error(e);
      setLoadState('error');
    }
  };

  // Initial load
  useEffect(() => {
    loadForexRates(false);
  }, [customPairs]);

  // Sync intervals
  useEffect(() => {
    setCountdown(refreshInterval);
  }, [refreshInterval]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadForexRates(true);
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [refreshInterval, customPairs]);

  // Filter based on search query
  const filteredPairs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return mergedPairs;
    return mergedPairs.filter(
      p => p.name.toLowerCase().includes(query) || 
           p.baseName.toLowerCase().includes(query) || 
           p.quoteName.toLowerCase().includes(query)
    );
  }, [mergedPairs, searchQuery]);

  // Handle adding custom pair
  const handleAddCustomPair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBase || !customQuote) {
      alert("Please provide valid currency codes.");
      return;
    }
    const base = customBase.toUpperCase().trim();
    const quote = customQuote.toUpperCase().trim();
    const name = customName.trim() || `${base}/${quote}`;
    const id = `${base.toLowerCase()}-${quote.toLowerCase()}`;

    // Prevent duplicates
    if (mergedPairs.some(p => p.id === id)) {
      alert("This currency pair instrument already exists.");
      return;
    }

    const newPair: ForexPair = {
      id,
      name,
      baseSymbol: base,
      quoteSymbol: quote,
      baseName: `${base} Cross`,
      quoteName: `${quote} Cross`,
      icon: '💵',
      sector: 'Custom Pairs',
      isCustom: true
    };

    setCustomPairs(prev => [...prev, newPair]);
    setSelectedPairId(id);
    setCustomBase('');
    setCustomQuote('');
    setCustomName('');
    setIsAddingCustom(false);
  };

  const handleRemoveCustomPair = (id: string) => {
    setCustomPairs(prev => prev.filter(p => p.id !== id));
    if (selectedPairId === id) {
      setSelectedPairId('eur-usd');
    }
  };

  // Top movers calculation (gainers/losers)
  const movers = useMemo(() => {
    if (!forexData) return { gainers: [], losers: [] };
    const sorted = [...mergedPairs].sort((a, b) => {
      const chgA = forexData.changes[a.id] || 0;
      const chgB = forexData.changes[b.id] || 0;
      return chgB - chgA;
    });
    return {
      gainers: sorted.slice(0, 3),
      losers: sorted.reverse().slice(0, 3)
    };
  }, [mergedPairs, forexData]);

  // Group by sector
  const sectors = useMemo(() => {
    const groups: Record<string, ForexPair[]> = {};
    filteredPairs.forEach(p => {
      const s = p.sector || 'Custom Pairs';
      if (!groups[s]) groups[s] = [];
      groups[s].push(p);
    });
    return groups;
  }, [filteredPairs]);

  return (
    <div className={`min-h-screen ${st.bg} ${st.text} flex flex-col font-sans selection:bg-blue-600/30`}>
      
      {/* HEADER SECTION */}
      <header className={`${st.headerBg} border-b sticky top-0 z-40 px-4 py-3 shadow-lg`}>
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 rounded-2xl border border-blue-500/20 text-blue-400">
              <Globe className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Currency Trading Assistant
                </h1>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Global Currency & SEK Cross Tracking System</p>
            </div>
          </div>

          {/* Navigation Tab Panel */}
          <button
            onClick={() => {
              const tabs: ('terminal' | 'portfolio' | 'heatmap')[] = ['terminal', 'portfolio', 'heatmap'];
              const nextIndex = (tabs.indexOf(assistantTab) + 1) % tabs.length;
              setAssistantTab(tabs[nextIndex]);
            }}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 ${st.btnActive}`}
            title={`Cycle View: ${
              assistantTab === 'terminal' ? 'Forex Terminal' : assistantTab === 'portfolio' ? 'Position Portfolio' : 'Heatmap Matrix'
            } (Click to cycle)`}
          >
            {assistantTab === 'terminal' ? (
              <Activity className="w-5 h-5 text-white" />
            ) : assistantTab === 'portfolio' ? (
              <Wallet className="w-5 h-5 text-white" />
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            )}
          </button>

          {/* Controls bar */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-slate-400 text-left">USD/SEK Rate:</span>
              <span className="font-bold text-emerald-400">{sekRate.toFixed(4)} SEK</span>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 text-left">Tick in:</span>
              <span className="font-bold text-blue-400 w-5 text-right">{countdown}s</span>
            </div>

            <button
              onClick={() => loadForexRates(false)}
              disabled={loadState === 'loading'}
              className="p-2 bg-slate-950 hover:bg-slate-850 text-slate-350 hover:text-white rounded-xl border border-slate-800 transition-all cursor-pointer group"
              title="Refresh Forex Feed"
            >
              <RefreshCw className={`w-4 h-4 ${loadState === 'loading' ? 'animate-spin text-blue-400' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            </button>
          </div>
        </div>
      </header>

      {/* TICKER TAPE BAR */}
      <div className="bg-slate-950 border-b border-slate-900 py-1.5 overflow-hidden">
        <div className="max-w-[1700px] mx-auto px-4 flex items-center gap-6 whitespace-nowrap overflow-hidden">
          <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-500 shrink-0 flex items-center gap-1.5 bg-slate-950 z-10 pr-2">
            <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" /> Live Forex Tape
          </span>
          <div 
            className="flex items-center gap-6 animate-marquee"
            style={{ 
              animationDuration: tickerSpeed === 0 ? '0s' : `${120 / tickerSpeed}s`,
              animationPlayState: tickerSpeed === 0 ? 'paused' : 'running'
            }}
          >
            {[...mergedPairs, ...mergedPairs].map((pair, idx) => {
              const livePrice = forexData?.rates[pair.id] || 1.0;
              const chg = forexData?.changes[pair.id] || 0;
              const isUp = chg >= 0;
              const isSel = pair.id === selectedPairId;

              return (
                <button
                  key={`${pair.id}-${idx}`}
                  onClick={() => setSelectedPairId(pair.id)}
                  className={`inline-flex items-center gap-2 text-xs font-mono font-medium py-1 px-2.5 rounded-lg transition-colors cursor-pointer ${
                    isSel ? 'bg-blue-950 text-blue-300 ring-1 ring-blue-500/50' : 'hover:bg-slate-900 text-slate-350'
                  }`}
                >
                  <span className="text-sm">{pair.icon}</span>
                  <span className="font-bold">{pair.name}</span>
                  <span className="text-slate-400 font-mono">
                    {livePrice.toFixed(pair.quoteSymbol === 'JPY' ? 2 : 4)}
                  </span>
                  <span className={`text-[10px] font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isUp ? '▲' : '▼'}{Math.abs(chg).toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER WORKSPACE */}
      {assistantTab === 'portfolio' ? (
        <div className="flex-1 max-w-[1700px] w-full mx-auto p-4 animate-fade-in">
          <CurrencyPortfolioTracker 
            pairs={mergedPairs}
            prices={forexData?.rates || {}}
            change24hs={forexData?.changes || {}}
            sekRate={sekRate}
          />
        </div>
      ) : assistantTab === 'heatmap' ? (
        <div className="flex-1 max-w-[1700px] w-full mx-auto p-4 animate-fade-in">
          <TradingHeatmap 
            initialType="forex" 
            sekRate={sekRate} 
            onSelectAsset={(id, type) => {
              if (type === 'forex') {
                setSelectedPairId(id);
                setAssistantTab('terminal');
              }
            }}
          />
        </div>
      ) : (
        <div className="flex-1 max-w-[1700px] w-full mx-auto p-4 flex flex-col lg:flex-row gap-6 items-stretch">
          
          {/* LEFT SIDEBAR - Currency selector */}
          <aside className={`shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-full lg:w-80'} flex flex-col gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-900 min-h-[600px]`}>
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              {!sidebarCollapsed ? (
                <div className="relative flex-1 mr-2 space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1">Instrument List</span>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Search Forex..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 pl-9 text-xs font-semibold focus:outline-none focus:border-blue-500 placeholder-slate-500"
                    />
                  </div>
                </div>
              ) : null}

              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 bg-slate-950 hover:bg-slate-855 text-slate-400 hover:text-white border border-slate-850 rounded-lg cursor-pointer transition-colors"
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* List group sectors */}
            <div className="space-y-4 overflow-y-auto max-h-[500px] flex-1 pr-1">
              {Object.keys(sectors).map(sec => (
                <div key={sec} className="space-y-1.5">
                  {!sidebarCollapsed && (
                    <span className="text-[9px] font-black text-slate-500 tracking-wider block uppercase pl-1">{sec}</span>
                  )}
                  {sectors[sec].map(pair => (
                    <div key={pair.id} className="relative group">
                      <CurrencyCard 
                        pair={pair}
                        price={forexData?.rates[pair.id] || 1.0}
                        change24h={forexData?.changes[pair.id] || 0.05}
                        selected={selectedPairId === pair.id}
                        onClick={() => setSelectedPairId(pair.id)}
                      />
                      {pair.isCustom && !sidebarCollapsed && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCustomPair(pair.id);
                          }}
                          className="absolute right-3.5 top-3.5 p-1 bg-rose-950/90 border border-rose-900/30 text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-rose-900 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Custom pair adder */}
            {!sidebarCollapsed && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                <button
                  onClick={() => setIsAddingCustom(!isAddingCustom)}
                  className="w-full text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider block text-left"
                >
                  {isAddingCustom ? '✕ Hide Custom Maker' : '+ Create Custom Pair'}
                </button>
                
                {isAddingCustom && (
                  <form onSubmit={handleAddCustomPair} className="space-y-2 mt-2 pt-2 border-t border-slate-900 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Base (e.g. SEK)</span>
                        <input 
                          type="text"
                          required
                          placeholder="SEK"
                          value={customBase}
                          onChange={(e) => setCustomBase(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 font-mono text-center"
                        />
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Quote (e.g. NOK)</span>
                        <input 
                          type="text"
                          required
                          placeholder="NOK"
                          value={customQuote}
                          onChange={(e) => setCustomQuote(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 font-mono text-center"
                        />
                      </div>
                    </div>
                    <button 
                      type="submit"
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 font-bold rounded text-[10px] text-white uppercase"
                    >
                      Create Pair Mapping
                    </button>
                  </form>
                )}
              </div>
            )}
          </aside>

          {/* CENTER WORKSPACE SECTION */}
          <main className="flex-1 space-y-6">
            {loadState === 'loading' && !forexData ? (
              <div className="h-[500px] bg-slate-900/40 border border-slate-900 rounded-3xl flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Syncing exchange server ratios...</span>
              </div>
            ) : (
              <CurrencyAnalysisPanel 
                pair={activePair}
                price={forexData?.rates[activePair.id] || 1.0}
                change24h={forexData?.changes[activePair.id] || 0.05}
                sekRate={sekRate}
              />
            )}
          </main>

          {/* RIGHT SIDEBAR - Ticker summary and stats */}
          <aside className="w-full lg:w-72 space-y-4 self-stretch flex flex-col justify-between">
            <div className="space-y-4">
              {/* Movers */}
              <div className="bg-slate-900/50 p-4 border border-slate-900 rounded-2xl space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-800 pb-1.5">
                  Top Currency Volatilities
                </span>
                
                <div className="space-y-2">
                  {movers.gainers.slice(0, 2).map(p => {
                    const price = forexData?.rates[p.id] || 1.0;
                    const chg = forexData?.changes[p.id] || 0;
                    return (
                      <div key={p.id} className="flex justify-between items-center text-xs p-1.5 rounded hover:bg-slate-850 transition-colors">
                        <span className="font-bold text-slate-300">{p.name}</span>
                        <span className="font-mono text-emerald-400 font-bold">+{chg.toFixed(2)}%</span>
                      </div>
                    );
                  })}
                  {movers.losers.slice(0, 2).map(p => {
                    const price = forexData?.rates[p.id] || 1.0;
                    const chg = forexData?.changes[p.id] || 0;
                    return (
                      <div key={p.id} className="flex justify-between items-center text-xs p-1.5 rounded hover:bg-slate-850 transition-colors">
                        <span className="font-bold text-slate-300">{p.name}</span>
                        <span className="font-mono text-rose-450 font-bold">{chg.toFixed(2)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SEK Cross multipliers */}
              <div className="bg-slate-900/50 p-4 border border-slate-900 rounded-2xl space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-800 pb-1.5 text-left">
                  Swedish Krona Standard
                </span>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                    <span className="text-slate-500">USD to SEK</span>
                    <span className="font-bold font-mono text-white">{sekRate.toFixed(4)} kr</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                    <span className="text-slate-500">EUR to SEK</span>
                    <span className="font-bold font-mono text-white">{(forexData?.rates['eur-sek'] || 11.53).toFixed(4)} kr</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">GBP to SEK</span>
                    <span className="font-bold font-mono text-white">{(forexData?.rates['gbp-sek'] || 13.48).toFixed(4)} kr</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-gradient-to-br from-blue-950/20 to-slate-900/50 p-4 rounded-xl border border-blue-500/10 text-[9px] text-slate-500 leading-relaxed text-center">
              System connections over ExchangeRate services. Intraday indicators computed locally. Trades involve leverage risks.
            </div>
          </aside>

        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-850 py-4 mt-6 text-[10px] text-slate-500">
        <div className="max-w-[1700px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center font-mono">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            <span className="text-slate-400">Forex Feed API Linked</span>
          </div>
          <span>Currency & FX Trading Assistant</span>
        </div>
      </footer>
    </div>
  );
};
