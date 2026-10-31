import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Timeframe, PriceData, OHLCCandle, AnalysisResult } from '../../crypto-types';
import { SEED_STOCKS, StockItem } from '../../constants/stocks';
import { TradingHeatmap } from './TradingHeatmap';
import { fetchFXRates } from '../../services/cryptoApi';
import { analyzeCandles } from '../../services/cryptoIndicators';
import { StockCard } from './StockCard';
import { StockAnalysisPanel } from './StockAnalysisPanel';
import { StockPortfolioTracker } from './StockPortfolioTracker';
import { 
  Terminal, RefreshCw, Search, ChevronLeft, ChevronRight, TrendingUp, 
  Activity, DollarSign, Clock, Wallet, Plus, X, Tag
} from 'lucide-react';

export const StockTradingAssistant: React.FC<{ theme?: 'charcoal' | 'silver' | 'white' | 'cosmic' | 'emerald' | 'amber' | 'cyberpunk' | 'slate' | 'crimson' | 'orchid' | 'olive' }> = ({ theme = 'charcoal' }) => {
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

  // State per specification
  const [assistantTab, setAssistantTab] = useState<'terminal' | 'portfolio' | 'heatmap'>(() => {
    return (localStorage.getItem('stock_assistantTab') as 'terminal' | 'portfolio' | 'heatmap') || 'terminal';
  });

  // Base and Custom Stocks list
  const [stocks, setStocks] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem('stock_assistant_custom_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse custom stock list:", e);
      }
    }
    return SEED_STOCKS;
  });

  // Prices state
  const [prices, setPrices] = useState<Record<string, PriceData>>(() => {
    const initialPrices: Record<string, PriceData> = {};
    stocks.forEach(s => {
      initialPrices[s.id] = {
        usd: s.seedPrice,
        usd_24h_change: (Math.random() * 6) - 3, // random -3% to +3%
        last_updated_at: Math.floor(Date.now() / 1000)
      };
    });
    return initialPrices;
  });

  const [sekRate, setSekRate] = useState<number>(10.65);
  const [selectedStock, setSelectedStock] = useState<string>(() => {
    const saved = localStorage.getItem('stock_selectedStock');
    return saved && SEED_STOCKS.some(s => s.id === saved) ? saved : 'aapl';
  });
  const [timeframe, setTimeframe] = useState<Timeframe>(() => {
    return (localStorage.getItem('stock_timeframe') as Timeframe) || '4H';
  });
  const [candles, setCandles] = useState<OHLCCandle[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'success'>('success');
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem('stock_refreshInterval');
    return saved ? parseInt(saved) : 180;
  });
  const [countdown, setCountdown] = useState<number>(refreshInterval);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Filter/Sort Catalog states
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [selectedSort, setSelectedSort] = useState<string>('Default');

  // Add Custom Stock Menu Toggle & Fields
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [newStockName, setNewStockName] = useState('');
  const [newStockPrice, setNewStockPrice] = useState('');
  const [newStockSector, setNewStockSector] = useState('Technology & Software');

  // Preset picker states
  const [presetSectorFilter, setPresetSectorFilter] = useState('All');
  const [selectedPreset, setSelectedPreset] = useState('');

  // Preset Stocks templates
  const PRESET_STOCK_TEMPLATES = useMemo(() => [
    { name: 'Starbucks Corp.', symbol: 'SBUX', seedPrice: 96.50, sector: 'Consumer & Retail', change24h: 3.52 },
    { name: 'Moderna Biotech', symbol: 'MRNA', seedPrice: 110.20, sector: 'Health & Biotech', change24h: 8.94 },
    { name: 'Airbnb Inc.', symbol: 'ABNB', seedPrice: 148.15, sector: 'Consumer & Retail', change24h: -1.85 },
    { name: 'Qualcomm Inc.', symbol: 'QCOM', seedPrice: 185.00, sector: 'Semiconductors', change24h: 2.10 },
    { name: 'Zoom Video Communications', symbol: 'ZM', seedPrice: 62.40, sector: 'Technology & Software', change24h: -5.46 },
    { name: 'Palantir Technologies', symbol: 'PLTR', seedPrice: 22.35, sector: 'Technology & Software', change24h: 14.12 },
    { name: 'CrowdStrike Holdings', symbol: 'CRWD', seedPrice: 320.10, sector: 'Technology & Software', change24h: 6.85 },
    { name: 'Arm Holdings plc', symbol: 'ARM', seedPrice: 125.50, sector: 'Semiconductors', change24h: -8.92 },
    { name: 'Asml Holding NV', symbol: 'ASML', seedPrice: 915.20, sector: 'Semiconductors', change24h: 4.18 },
    { name: 'Rivian Automotive', symbol: 'RIVN', seedPrice: 11.45, sector: 'Automotive & Energy', change24h: -7.21 },
    { name: 'Lucid Group Inc.', symbol: 'LCID', seedPrice: 2.85, sector: 'Automotive & Energy', change24h: -12.45 },
    { name: 'Plug Power Inc.', symbol: 'PLUG', seedPrice: 3.42, sector: 'Automotive & Energy', change24h: 18.52 },
    { name: 'Mondelez International', symbol: 'MDLZ', seedPrice: 70.30, sector: 'Consumer & Retail', change24h: 1.15 },
    { name: 'Gilead Sciences', symbol: 'GILD', seedPrice: 66.85, sector: 'Health & Biotech', change24h: -2.32 },
    { name: 'Palo Alto Networks', symbol: 'PANW', seedPrice: 295.40, sector: 'Technology & Software', change24h: -1.54 },
    { name: 'PayPal Holdings', symbol: 'PYPL', seedPrice: 65.20, sector: 'Consumer & Retail', change24h: -3.25 },
  ], []);

  // Filtered presets list for dropdown autocomplete choice sorted by sector, gainers, losers
  const filteredPresets = useMemo(() => {
    let list = [...PRESET_STOCK_TEMPLATES];
    if (presetSectorFilter === 'Gainers') {
      list.sort((a, b) => b.change24h - a.change24h);
    } else if (presetSectorFilter === 'Losers') {
      list.sort((a, b) => a.change24h - b.change24h);
    } else if (presetSectorFilter !== 'All') {
      list = list.filter(item => item.sector === presetSectorFilter);
    }
    return list;
  }, [PRESET_STOCK_TEMPLATES, presetSectorFilter]);

  // Handle template selection to auto fill form
  const handlePresetSelect = (symbolSelection: string) => {
    const found = PRESET_STOCK_TEMPLATES.find(p => p.symbol === symbolSelection);
    if (found) {
      setNewStockName(found.name);
      setNewStockSymbol(found.symbol);
      setNewStockPrice(found.seedPrice.toString());
      setNewStockSector(found.sector);
      setSelectedPreset(symbolSelection);
    } else {
      setSelectedPreset('');
    }
  };

  // Custom non-blocking modals (avoids iframe security blocking issues)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stockToDelete, setStockToDelete] = useState<string | null>(null);

  // Helper to generate symbol and price based on name
  const updateGeneratedStockDetails = (name: string) => {
    if (!name.trim()) {
      setNewStockSymbol('');
      setNewStockPrice('');
      return;
    }
    
    // Clean corporate suffixes
    const cleanName = name
      .replace(/(corp|corporation|inc|incorporated|co|company|ltd|limited|group|tech|technology|llc)/gi, '')
      .trim();
    
    // Extract words
    const words = cleanName.split(/\s+/).filter(w => w.length > 0);
    let symbol = '';
    
    if (words.length >= 2) {
      // Take first letter of each word, up to 4 words. If that's too short, add consonants
      symbol = words.map(w => w[0].toUpperCase()).join('');
      if (symbol.length < 3 && words[0].length > 1) {
        // Add second letter of the first word
        symbol += words[0][1].toUpperCase();
      }
    } else if (words.length === 1) {
      // Single word: extract up to 4 consonants or characters
      const lettersOnly = words[0].replace(/[^a-zA-Z]/g, '');
      if (lettersOnly.length <= 4) {
        symbol = lettersOnly.toUpperCase();
      } else {
        // Take consonants primarily or just first, second, third, last
        symbol = (lettersOnly[0] + (lettersOnly.slice(1).replace(/[aeiou]/gi, '')).slice(0, 3)).toUpperCase();
        if (symbol.length < 3) {
          symbol = lettersOnly.slice(0, 3).toUpperCase();
        }
      }
    }
    
    // Fallback if empty or invalid
    symbol = symbol.replace(/[^A-Z]/g, '').slice(0, 4);
    if (!symbol) {
      symbol = 'STK';
    }
    
    // Pseudo-random but deterministic/stable price based on corporate name string hash
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const seedPriceVal = Math.abs(hash % 400) + 30; // $30 to $430
    const roundedPrice = Number(seedPriceVal.toFixed(2));
    
    setNewStockSymbol(symbol);
    setNewStockPrice(roundedPrice.toString());
  };

  // Persist settings
  useEffect(() => { localStorage.setItem('stock_assistantTab', assistantTab); }, [assistantTab]);
  useEffect(() => { localStorage.setItem('stock_selectedStock', selectedStock); }, [selectedStock]);
  useEffect(() => { localStorage.setItem('stock_timeframe', timeframe); }, [timeframe]);
  useEffect(() => { localStorage.setItem('stock_refreshInterval', refreshInterval.toString()); }, [refreshInterval]);

  // Persist stocks list whenever it changes
  useEffect(() => {
    localStorage.setItem('stock_assistant_custom_list', JSON.stringify(stocks));
  }, [stocks]);

  // Load FX Rates once on mount
  useEffect(() => {
    const loadFX = async () => {
      try {
        const rates = await fetchFXRates();
        if (rates.SEK > 0) {
          setSekRate(rates.SEK);
        }
      } catch (e) {
        console.error("Error loading FX rates for stock advisor:", e);
      }
    };
    loadFX();
  }, []);

  // Update selected stock if current one is deleted
  useEffect(() => {
    if (stocks.length > 0 && !stocks.some(s => s.id === selectedStock)) {
      setSelectedStock(stocks[0].id);
    }
  }, [stocks, selectedStock]);

  // Fluctuates prices slightly to simulate a real-time live trading atmosphere
  const simulatePriceFlustuations = useCallback(() => {
    setPrices((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        const oldPriceVal = updated[id].usd;
        const drift = (Math.random() * 0.4 - 0.2) / 100; // -0.2% to +0.2%
        const newPriceVal = Number((oldPriceVal * (1 + drift)).toFixed(2));
        const originalStock = stocks.find(s => s.id === id);
        const basePrice = originalStock ? originalStock.seedPrice : 100;
        const changePct = ((newPriceVal - basePrice) / basePrice) * 100;

        updated[id] = {
          usd: newPriceVal,
          usd_24h_change: Number(changePct.toFixed(2)),
          last_updated_at: Math.floor(Date.now() / 1000)
        };
      });
      return updated;
    });
  }, [stocks]);

  // Simulate Candlestick structures for selected stock based on current prices
  const generateSimulatedCandles = useCallback((stockId: string, tf: Timeframe, curPrice: number) => {
    let numCandles = 30;
    if (tf === '1H') numCandles = 24;
    else if (tf === '4H') numCandles = 28;
    else if (tf === '1D') numCandles = 30;
    else numCandles = 24;

    const simulatedList: OHLCCandle[] = [];
    let priceCursor = curPrice * 0.96; // start slightly lower
    const baseTime = Date.now() - numCandles * 3600000;

    for (let i = 0; i < numCandles; i++) {
      const scaleDrift = (Math.random() * 3 - 1.4) / 100; // slight upward bias
      const open = priceCursor;
      const close = Number((priceCursor * (1 + scaleDrift)).toFixed(2));
      const high = Number((Math.max(open, close) * (1 + Math.random() * 0.01)).toFixed(2));
      const low = Number((Math.min(open, close) * (1 - Math.random() * 0.01)).toFixed(2));
      
      simulatedList.push({
        time: baseTime + i * 3600000,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 50000) + 10000
      });
      priceCursor = close;
    }

    // Adjust last candle close precisely to currentPrice
    if (simulatedList.length > 0) {
      const last = simulatedList[simulatedList.length - 1];
      last.close = curPrice;
      last.high = Math.max(last.high, curPrice);
      last.low = Math.min(last.low, curPrice);
    }

    return simulatedList;
  }, []);

  // Run technical indicators analysis
  const runAnalysis = useCallback(() => {
    setAnalysisLoading(true);
    const stockMeta = stocks.find(s => s.id === selectedStock);
    if (!stockMeta) {
      setAnalysisLoading(false);
      return;
    }

    const currentPriceData = prices[selectedStock] || { usd: stockMeta.seedPrice, usd_24h_change: 0 };
    const simulated = generateSimulatedCandles(selectedStock, timeframe, currentPriceData.usd);
    setCandles(simulated);

    const result = analyzeCandles(
      {
        id: stockMeta.id,
        name: stockMeta.name,
        symbol: stockMeta.symbol,
        icon: stockMeta.icon
      },
      currentPriceData,
      sekRate,
      timeframe,
      simulated
    );
    setAnalysis(result);
    setAnalysisLoading(false);
  }, [selectedStock, timeframe, sekRate, prices, stocks, generateSimulatedCandles]);

  // Handle adding custom stock
  const handleAddCustomStock = (e: React.FormEvent) => {
    e.preventDefault();
    const symbolClean = newStockSymbol.toUpperCase().trim();
    const nameClean = newStockName.trim();
    const priceClean = parseFloat(newStockPrice);

    if (!symbolClean || !nameClean || isNaN(priceClean) || priceClean <= 0) {
      setErrorMessage("Please check symbol, name, and purchase price input validity.");
      return;
    }

    // Check duplicate
    const id = symbolClean.toLowerCase();
    if (stocks.some(s => s.id === id)) {
      setErrorMessage("Stock with this symbol already exists inside Nasdaq indexing pool.");
      return;
    }

    const newStock: StockItem = {
      id,
      name: nameClean,
      symbol: symbolClean,
      icon: '', // Custom stock doesn't have icon URL, we'll draw symbol initials fallback
      seedPrice: priceClean,
      sector: newStockSector
    };

    const updatedStocks = [...stocks, newStock];
    setStocks(updatedStocks);

    // Get preset 24h change matching template if present, or set a random change
    const matchedPreset = PRESET_STOCK_TEMPLATES.find(p => p.symbol === symbolClean);
    const initialChange = matchedPreset ? matchedPreset.change24h : ((Math.random() * 6) - 3);

    // Update prices
    setPrices((prev) => ({
      ...prev,
      [id]: {
        usd: priceClean,
        usd_24h_change: Number(initialChange.toFixed(2)),
        last_updated_at: Math.floor(Date.now() / 1000)
      }
    }));

    // Auto-select
    setSelectedStock(id);

    // Reset Form
    setNewStockSymbol('');
    setNewStockName('');
    setNewStockPrice('');
    setNewStockSector('Technology & Software');
    setSelectedPreset('');
    setIsAddStockOpen(false);
  };

  // Handle deleting stock
  const handleDeleteStock = (idToDelete: string) => {
    setStockToDelete(idToDelete);
  };

  const confirmDeleteStock = (idToDelete: string) => {
    const updated = stocks.filter(s => s.id !== idToDelete);
    setStocks(updated);

    // Clean up portfolio local holdings if any
    const currentHoldings = localStorage.getItem('stock_portfolio_holdings');
    if (currentHoldings) {
      try {
        const parsed = JSON.parse(currentHoldings);
        if (Array.isArray(parsed)) {
          const filteredHoldings = parsed.filter((item: any) => item.stockId !== idToDelete);
          localStorage.setItem('stock_portfolio_holdings', JSON.stringify(filteredHoldings));
        }
      } catch (err) {
        console.error("Failed to filter custom holdings clean:", err);
      }
    }
  };

  // Initial analysis triggers
  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  // Countdown auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          simulatePriceFlustuations();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [simulatePriceFlustuations, refreshInterval]);

  // Filtered stocks for sidebar list representation
  const filteredStocks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    
    let items = stocks.map(s => {
      const origMatch = SEED_STOCKS.find(orig => orig.id === s.id);
      return {
        ...s,
        isCustom: !origMatch,
        sector: s.sector || origMatch?.sector || 'Other'
      };
    });

    // Sector Filter
    if (selectedSector !== 'All') {
      items = items.filter(s => s.sector === selectedSector);
    }

    // Search Query Filter
    if (q) {
      items = items.filter(s => 
        s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q)
      );
    }

    // Sort criteria
    if (selectedSort === 'Gainers') {
      items.sort((a, b) => {
        const changeA = prices[a.id]?.usd_24h_change ?? 0;
        const changeB = prices[b.id]?.usd_24h_change ?? 0;
        return changeB - changeA;
      });
    } else if (selectedSort === 'Losers') {
      items.sort((a, b) => {
        const changeA = prices[a.id]?.usd_24h_change ?? 0;
        const changeB = prices[b.id]?.usd_24h_change ?? 0;
        return changeA - changeB;
      });
    } else {
      // Default: Alphabetical by Stock Symbol
      items.sort((a, b) => a.symbol.localeCompare(b.symbol));
    }

    return items;
  }, [stocks, searchQuery, selectedSector, selectedSort, prices]);

  return (
    <div className={`min-h-screen ${st.bg} ${st.text} flex flex-col font-sans antialiased overflow-x-hidden selection:bg-blue-500 selection:text-white`}>
      
      {/* HEADER BAR */}
      <header className={`sticky top-0 z-40 ${st.headerBg} border-b backdrop-blur-md px-4 py-3`}>
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
                 <Terminal className="w-5 h-5 text-white" />
               </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  US Nasdaq 500 Agent Terminal
                </h1>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Real-Time Multi-Factor Stock Analyst</span>
                <span className="inline-block w-1 h-1 rounded-full bg-slate-600" />
                <span className="text-blue-400 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping inline-block" /> Auto-Fluctuating Ticker Index
                </span>
              </div>
            </div>
          </div>

          {/* Tab Selection Toggles */}
          <button
            onClick={() => {
              const tabs: ('terminal' | 'portfolio' | 'heatmap')[] = ['terminal', 'portfolio', 'heatmap'];
              const nextIndex = (tabs.indexOf(assistantTab) + 1) % tabs.length;
              setAssistantTab(tabs[nextIndex]);
              localStorage.setItem('stock_assistantTab', tabs[nextIndex]);
            }}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 ${st.btnActive}`}
            title={`Cycle View: ${
              assistantTab === 'terminal' ? 'Technical Terminal' : assistantTab === 'portfolio' ? 'Portfolio Tracker' : 'Trading Heatmap'
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

          {/* Timeframe selector tabs */}
          {assistantTab === 'terminal' && (
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
              {(['1H', '4H', '1D', '1W'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-tight transition-all cursor-pointer ${
                    timeframe === tf
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}

          {/* SEK rate chip & refresh controls */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">USD/SEK Rate:</span>
              <span className="font-bold text-blue-400">{sekRate.toFixed(2)} SEK</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Fluctuates in:</span>
                <span className="font-bold text-blue-400 w-6 text-right">{countdown}s</span>
              </div>
              <select 
                value={refreshInterval}
                onChange={(e) => {
                  const newRate = parseInt(e.target.value);
                  setRefreshInterval(newRate);
                  setCountdown(newRate);
                }}
                className="bg-slate-950 border border-slate-800 rounded px-1 text-[10px] text-slate-400 font-bold hover:border-slate-700 focus:outline-none"
              >
                <option value={10}>10s (Fast)</option>
                <option value={60}>60s (Medium)</option>
                <option value={180}>180s (Standard)</option>
              </select>
            </div>
          </div>

        </div>
      </header>

      {/* BODY CONTENT VIEW */}
      <div className="max-w-[1700px] mx-auto w-full p-4 md:p-6 flex-1 flex flex-col lg:flex-row gap-6">
        
        {assistantTab === 'portfolio' ? (
          <div className="w-full">
            <StockPortfolioTracker 
              stocks={stocks}
              externalPrices={prices}
              externalSekRate={sekRate}
            />
          </div>
        ) : assistantTab === 'heatmap' ? (
          <div className="w-full">
            <TradingHeatmap 
              initialType="stock" 
              sekRate={sekRate} 
              onSelectAsset={(id, type) => {
                if (type === 'stock') {
                  setSelectedStock(id);
                  setAssistantTab('terminal');
                }
              }}
            />
          </div>
        ) : (
          <>
            {/* COLLAPSIBLE SIDEBAR */}
            <aside className={`flex flex-col bg-slate-950 border border-slate-900 rounded-3xl shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-full lg:w-[360px]'}`}>
              
              <div className="p-4 border-b border-slate-900 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  {!sidebarCollapsed && (
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <Search className="w-4 h-4" />
                      </span>
                      <input 
                        type="text"
                        placeholder="Filter NASDAQ indexing index..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:outline-none focus:border-blue-500 placeholder-slate-500 text-white font-semibold"
                      />
                    </div>
                  )}
                  
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
                    title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  >
                    {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </button>
                </div>

                {/* Search filters for Sectors & Gainers/Losers */}
                {!sidebarCollapsed && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="space-y-1">
                      <label className="text-[8px] text-slate-500 uppercase font-black tracking-wider block">Sector Filter</label>
                      <select
                        value={selectedSector}
                        onChange={(e) => setSelectedSector(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-lg py-1.5 px-2 text-[10px] font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="All">All Sectors</option>
                        <option value="Technology & Software">Tech/Software</option>
                        <option value="Semiconductors">Semiconductors</option>
                        <option value="Consumer & Retail">Consumer/Retail</option>
                        <option value="Media & Entertainment">Media/Ent.</option>
                        <option value="Networking & Telecom">Telco/Net</option>
                        <option value="Health & Biotech">Health/Biotech</option>
                        <option value="Automotive & Energy">Auto/Energy</option>
                        <option value="Industrials & Conglomerates">Industrials</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] text-slate-500 uppercase font-black tracking-wider block">Performative Sort</label>
                      <select
                        value={selectedSort}
                        onChange={(e) => setSelectedSort(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-lg py-1.5 px-2 text-[10px] font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="Default">Alphabetical</option>
                        <option value="Gainers">Top Gainers 📈</option>
                        <option value="Losers">Top Losers 📉</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* + ADD CUSTOM STOCK OPTION PANEL */}
              {!sidebarCollapsed && (
                <div className="p-4 border-b border-slate-900 bg-slate-900/20">
                  {!isAddStockOpen ? (
                    <button
                      onClick={() => setIsAddStockOpen(true)}
                      className="w-full py-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 hover:text-blue-100 rounded-xl border border-blue-900/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Custom Ticker</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAddCustomStock} className="space-y-3 bg-slate-950 p-4 border border-slate-850 rounded-xl relative">
                      <button 
                        type="button"
                        onClick={() => setIsAddStockOpen(false)}
                        className="absolute top-2 right-2 text-slate-500 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                        <Tag className="w-3 h-3 text-blue-400" /> NASDAQ Symbol Input
                      </h4>

                      {/* Dropdown Menu selectable and sortable by Sector, including Gainers and Losers */}
                      <div className="space-y-1.5 bg-slate-900/50 p-2 rounded-lg border border-slate-850">
                        <div className="flex items-center justify-between text-[9px] text-slate-400 uppercase font-black">
                          <span>Preset Profile templates</span>
                          <span className="text-blue-400 font-mono">Autofill</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-1.5">
                          <select
                            value={presetSectorFilter}
                            onChange={(e) => setPresetSectorFilter(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-1 text-[10px] font-bold focus:outline-none cursor-pointer"
                            title="Filter Preset Profiles"
                          >
                            <option value="All">All Preset Sectors</option>
                            <option value="Technology & Software">Technology & Software</option>
                            <option value="Semiconductors">Semiconductors</option>
                            <option value="Consumer & Retail">Consumer & Retail</option>
                            <option value="Health & Biotech">Health & Biotech</option>
                            <option value="Automotive & Energy">Automotive & Energy</option>
                            <option value="Gainers">Top Gainers 📈</option>
                            <option value="Losers">Top Losers 📉</option>
                          </select>

                          <select
                            value={selectedPreset}
                            onChange={(e) => handlePresetSelect(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-bold uppercase focus:outline-none focus:border-blue-500 font-mono cursor-pointer"
                          >
                            <option value="">-- Choose a Preset Profile --</option>
                            {filteredPresets.map(p => (
                              <option key={p.symbol} value={p.symbol}>
                                {p.symbol} - {p.name} [{p.sector}] ({p.change24h >= 0 ? '+' : ''}{p.change24h.toFixed(2)}%)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase font-black">Corporate Name</label>
                        <input 
                          type="text"
                          required
                          placeholder="e.g. Starbucks"
                          value={newStockName}
                          onChange={(e) => {
                            setNewStockName(e.target.value);
                            updateGeneratedStockDetails(e.target.value);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase font-black">Ticker Symbol</label>
                          <input 
                            type="text"
                            required
                            placeholder="e.g. SBUX"
                            value={newStockSymbol}
                            onChange={(e) => setNewStockSymbol(e.target.value.toUpperCase())}
                            className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1 text-xs text-blue-400 uppercase focus:outline-none focus:border-blue-500 font-mono font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase font-black">Sector</label>
                          <select
                            value={newStockSector}
                            onChange={(e) => setNewStockSector(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1 text-xs text-blue-400 focus:outline-none focus:border-blue-500 font-bold cursor-pointer"
                          >
                            <option value="Technology & Software">Technology & Software</option>
                            <option value="Semiconductors">Semiconductors</option>
                            <option value="Consumer & Retail">Consumer & Retail</option>
                            <option value="Media & Entertainment">Media & Entertainment</option>
                            <option value="Networking & Telecom">Networking & Telecom</option>
                            <option value="Health & Biotech">Health & Biotech</option>
                            <option value="Automotive & Energy">Automotive & Energy</option>
                            <option value="Industrials & Conglomerates">Industrials & Conglo</option>
                            <option value="Other">Other / Custom</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase font-black">Initial Price (USD)</label>
                        <input 
                          type="number"
                          step="any"
                          required
                          placeholder="e.g. 96.50"
                          value={newStockPrice}
                          onChange={(e) => setNewStockPrice(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-850 rounded px-2.5 py-1 text-xs text-blue-400 focus:outline-none focus:border-blue-500 font-mono font-bold"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold text-white text-[11px] rounded-lg transition-all cursor-pointer shadow"
                      >
                        Register Nasdaq Stock
                      </button>
                    </form>
                  )}
                </div>
              )}

              <div className="p-3 overflow-y-auto space-y-2 flex-1 scrollbar-thin max-h-[calc(100vh-220px)]">
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-wider px-2 mb-2">
                  {sidebarCollapsed ? "Stocks" : `Nasdaq Catalog (${filteredStocks.length})`}
                </div>
                
                {filteredStocks.map((stock) => (
                  <div key={stock.id} className={sidebarCollapsed ? 'flex justify-center' : ''}>
                    {sidebarCollapsed ? (
                      <button
                        onClick={() => setSelectedStock(stock.id)}
                        title={`${stock.name} (${stock.symbol})`}
                        className={`w-14 h-14 rounded-2xl p-1.5 flex flex-col items-center justify-center border transition-all cursor-pointer ${
                          selectedStock === stock.id ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-600/30 ring-2 ring-blue-400 text-white' : 'bg-slate-900 hover:bg-slate-850 border-slate-800'
                        }`}
                      >
                        {stock.icon ? (
                          <img src={stock.icon} alt={stock.symbol} className="w-8 h-8 object-contain rounded" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-xs font-mono font-black">{stock.symbol.slice(0, 2)}</span>
                        )}
                        <span className="text-[8px] font-mono mt-0.5 truncate max-w-full font-black uppercase text-opacity-80">{stock.symbol}</span>
                      </button>
                    ) : (
                      <StockCard
                        stock={stock}
                        priceData={prices[stock.id]}
                        selected={selectedStock === stock.id}
                        onClick={() => setSelectedStock(stock.id)}
                        onDelete={() => handleDeleteStock(stock.id)}
                      />
                    )}
                  </div>
                ))}
              </div>

            </aside>

            {/* CORE TECHNICAL ANALYSIS WORKSPACE (MAIN WORKSPACE (Right/Middle)) */}
            <main className="flex-1 min-w-0">
              {analysisLoading || !analysis ? (
                <div className="h-[400px] bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  <div>
                    <h3 className="text-white text-sm font-black uppercase tracking-widest">Re-Indexing Nasdaq Variables</h3>
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mt-1">Generating technical indicator matrices...</p>
                  </div>
                </div>
              ) : (
                <StockAnalysisPanel 
                  analysis={analysis}
                  candles={candles}
                  sekRate={sekRate}
                />
              )}
            </main>
          </>
        )}

      </div>

      {/* Custom Confirmation Modal */}
      {stockToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-white text-sm uppercase tracking-wider">Confirm Delete Ticker</h4>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none mt-1">Nasdaq index modification</p>
              </div>
            </div>
            
            <p className="text-slate-300 text-xs leading-relaxed">
              Are you sure you want to remove <span className="font-mono font-bold text-white uppercase">{stocks.find(s => s.id === stockToDelete)?.symbol || stockToDelete}</span> from the active Nasdaq listing pool? This will also clear any corresponding positions in your active portfolio.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStockToDelete(null)}
                className="flex-1 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer select-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteStock(stockToDelete)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-white text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-rose-600/20 select-none"
              >
                Delete Ticker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Message Modal */}
      {errorMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-blue-400">
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-white text-sm uppercase tracking-wider">Operational Notice</h4>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none mt-1">Validation Guard</p>
              </div>
            </div>
            
            <p className="text-slate-300 text-xs leading-relaxed">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-blue-500/10 select-none"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
