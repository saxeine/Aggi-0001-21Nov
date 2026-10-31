
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CoinId, Timeframe, PriceData, OHLCCandle, AnalysisResult } from '../../crypto-types';
import { COINS, COIN_MAP, TIMEFRAMES, DEFAULT_SEK_RATE, FALLBACK_PRICES } from '../../constants/crypto';
import { TradingHeatmap } from './TradingHeatmap';
import { fetchAllPrices, fetchOHLC, fetchFXRates } from '../../services/cryptoApi';
import { analyzeCandles } from '../../services/cryptoIndicators';
import { CoinCard } from './CoinCard';
import { AnalysisPanel } from './AnalysisPanel';
import { ProfitRiskCalc } from './ProfitRiskCalc';
import { PortfolioTracker } from './PortfolioTracker';
import { 
  Terminal, RefreshCw, Search, ChevronLeft, ChevronRight, TrendingUp, 
  Activity, AlertTriangle, ShieldCheck, DollarSign, Clock, Wallet,
  Plus, Check, Trash2, TrendingDown
} from 'lucide-react';

export const CryptoTradingAssistant: React.FC<{ theme?: 'charcoal' | 'silver' | 'white' | 'cosmic' | 'emerald' | 'amber' | 'cyberpunk' | 'slate' | 'crimson' | 'orchid' | 'olive' }> = ({ theme = 'charcoal' }) => {
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
        accentBg: 'bg-teal-500/10'
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
        accentBg: 'bg-teal-500/10'
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

  // Support custom coins
  const [customCoins, setCustomCoins] = useState<any[]>(() => {
    const saved = localStorage.getItem('crypto_custom_coins');
    return saved ? JSON.parse(saved) : [];
  });

  const mergedCoins = useMemo(() => {
    return [...COINS, ...customCoins];
  }, [customCoins]);

  const coinMap = useMemo(() => {
    return mergedCoins.reduce((acc, coin) => {
      acc[coin.id] = coin;
      return acc;
    }, {} as Record<string, typeof COINS[0]>);
  }, [mergedCoins]);

  // Collapsible custom coin adder states
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [isVerifyingCustom, setIsVerifyingCustom] = useState(false);
  const [customAddError, setCustomAddError] = useState('');
  const [customAddSuccess, setCustomAddSuccess] = useState(false);
  const [newId, setNewId] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);

  const fetchCoinInfo = async (idVal: string) => {
    const cleanId = idVal.toLowerCase().trim();
    if (!cleanId || cleanId.length < 2) return;
    setIsFetchingInfo(true);
    setCustomAddError('');
    try {
      const response = await fetch(`/api/crypto/coin-info?id=${cleanId}`);
      if (response.ok) {
        const details = await response.json();
        if (details.name) setNewName(details.name);
        if (details.symbol) setNewSymbol(details.symbol.toUpperCase());
        if (details.icon) setNewIcon(details.icon);
      }
    } catch (e: any) {
      console.warn("Failed automatic info fetch: ", e.message);
    } finally {
      setIsFetchingInfo(false);
    }
  };

  // Trends Tab state for market movers
  const [trendsTab, setTrendsTab] = useState<'gainers' | 'losers'>('gainers');

  // State per specification
  const [assistantTab, setAssistantTab] = useState<'terminal' | 'portfolio' | 'heatmap'>(() => {
    return (localStorage.getItem('assistantTab') as 'terminal' | 'portfolio' | 'heatmap') || 'terminal';
  });
  const [prices, setPrices] = useState<Record<CoinId, PriceData>>(() => FALLBACK_PRICES as Record<CoinId, PriceData>);
  const [sekRate, setSekRate] = useState<number>(DEFAULT_SEK_RATE);
  const [thbRate, setThbRate] = useState<number>(34.50);
  const [selectedCoin, setSelectedCoin] = useState<CoinId>(() => {
    return (localStorage.getItem('selectedCoin') as CoinId) || 'ripple';
  });
  const [timeframe, setTimeframe] = useState<Timeframe>(() => {
    return (localStorage.getItem('timeframe') as Timeframe) || '4H';
  });
  const [candles, setCandles] = useState<OHLCCandle[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error' | 'success'>('loading');
  const [isUsingSnapshot, setIsUsingSnapshot] = useState<boolean>(false);
  const [snapshotPrices, setSnapshotPrices] = useState<Record<CoinId, PriceData> | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem('refreshInterval');
    return saved ? parseInt(saved) : 180;
  });
  const [tickerSpeed, setTickerSpeed] = useState<number>(() => {
    const saved = localStorage.getItem('tickerSpeed');
    return saved ? parseInt(saved) : 1; // Default speed 1
  });
  const [countdown, setCountdown] = useState<number>(refreshInterval);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(true);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState<boolean>(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(false); // mobile drawer toggle

  // Persist settings
  useEffect(() => { localStorage.setItem('assistantTab', assistantTab); }, [assistantTab]);
  useEffect(() => { localStorage.setItem('selectedCoin', selectedCoin); }, [selectedCoin]);
  useEffect(() => { localStorage.setItem('timeframe', timeframe); }, [timeframe]);
  useEffect(() => { localStorage.setItem('refreshInterval', refreshInterval.toString()); }, [refreshInterval]);
  useEffect(() => { localStorage.setItem('tickerSpeed', tickerSpeed.toString()); }, [tickerSpeed]);

  const handleAddCustomCoin = async () => {
    setCustomAddError('');
    setCustomAddSuccess(false);

    if (!newId || !newSymbol || !newName) {
      setCustomAddError('CoinGecko ID, Symbol, and Name are required.');
      return;
    }

    setIsVerifyingCustom(true);
    try {
      if (mergedCoins.some(c => c.id === newId)) {
        setCustomAddError('Coin with this CoinGecko ID already exists.');
        setIsVerifyingCustom(false);
        return;
      }

      const response = await fetch(`/api/crypto/prices?ids=${newId}`);
      if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}`);
      }
      const result = await response.json();
      const coinData = result.data?.[newId] || result?.[newId];

      if (!coinData || coinData.usd === undefined) {
        setCustomAddError(`CoinGecko ID "${newId}" returned no price. Double-check the CoinGecko slug.`);
        setIsVerifyingCustom(false);
        return;
      }

      const newCoin = {
        id: newId,
        name: newName,
        symbol: newSymbol,
        icon: newIcon || '',
        sector: 'Custom Assets',
        isCustom: true
      };

      const updatedCustom = [...customCoins, newCoin];
      setCustomCoins(updatedCustom);
      localStorage.setItem('crypto_custom_coins', JSON.stringify(updatedCustom));

      setNewId('');
      setNewSymbol('');
      setNewName('');
      setNewIcon('');
      setCustomAddSuccess(true);
      setIsAddingCustom(false);

      setTimeout(() => {
        loadPrices(true);
      }, 300);

    } catch (err: any) {
      console.error(err);
      setCustomAddError('Verification failed. Use an existing CoinGecko id (e.g. dogecoin, cardano).');
    } finally {
      setIsVerifyingCustom(false);
    }
  };

  const handleRemoveCustomCoin = (id: string) => {
    const updated = customCoins.filter(c => c.id !== id);
    setCustomCoins(updated);
    localStorage.setItem('crypto_custom_coins', JSON.stringify(updated));
    if (selectedCoin === id) {
      setSelectedCoin('ripple');
    }
  };

  // Load all prices + SEK rate
  const loadPrices = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadState('loading');
    try {
      const [fetchedPrices, fxRates] = await Promise.all([
        fetchAllPrices(mergedCoins),
        fetchFXRates()
      ]);
      
      const pricesWithTHB = { ...fetchedPrices };
      if (fxRates.SEK > 0) {
        pricesWithTHB['thb-currency'] = {
          usd: 10 / fxRates.SEK,
          usd_24h_change: 0,
          last_updated_at: Math.floor(Date.now() / 1000)
        };
      }
      
      setPrices(pricesWithTHB);
      setSekRate(fxRates.SEK);
      setThbRate(fxRates.THB);
      setLoadState('success');
      setCountdown(refreshInterval);
      setIsUsingSnapshot(false);
      
      // Store initial/latest snapshot
      if (!snapshotPrices || Object.keys(fetchedPrices).length > 0) {
        setSnapshotPrices(fetchedPrices);
      }
    } catch (error) {
      console.error("Error loading prices:", error);
      
      // FALLBACK LOGIC
      if (snapshotPrices) {
        setPrices(snapshotPrices);
        setIsUsingSnapshot(true);
        setLoadState('success'); // Still operational but with warning
      } else {
        setLoadState('error');
      }
    }
  }, [snapshotPrices, mergedCoins]);

  // Load Analysis for selected coin & timeframe
  const runAnalysis = useCallback(async (isSilent = false) => {
    if (selectedCoin === 'thb-currency') {
      setAnalysisLoading(false);
      setAnalysis({
        coin: coinMap['thb-currency'] || COIN_MAP['thb-currency'],
        currentPrice: prices['thb-currency'] || { usd: 1/thbRate, usd_24h_change: 0 },
        sekPrice: 10,
        sekRate: sekRate,
        timeframe: timeframe,
        signals: {
          trend: 'Neutral',
          strength: 50,
          indicators: { rsi: 50, ema_20: 0, atr: 0 }
        },
        recommendation: {
          action: 'HOLD',
          reasoning: ['Thai Baht pegged to 10 SEK for comparison purposes.', 'Currency markets strictly fiscal indicator.']
        },
        tradingBlueprint: {
          entry: 10,
          targets: [10, 10],
          stopLoss: 10,
          riskReward: 1
        },
        levels: {
          resistance: [10, 10, 10],
          support: [10, 10, 10],
          pivot: 10
        }
      });
      return;
    }
    setAnalysisLoading(true);
    const coinMeta = coinMap[selectedCoin];
    if (!coinMeta) {
      setAnalysisLoading(false);
      return;
    }
    const tfConfig = TIMEFRAMES.find(t => t.value === timeframe);
    const days = tfConfig ? tfConfig.days : 7;
    
    try {
      // Get latest available price (from state or fallback)
      // Use price from state but don't make the entire effect depend on the 'prices' object
      const currentPriceData = prices[selectedCoin] || FALLBACK_PRICES[selectedCoin] || { usd: 0, usd_24h_change: 0 };
      
      const fetchedCandles = await fetchOHLC(selectedCoin, days, currentPriceData.usd);
      setCandles(fetchedCandles);
      const result = analyzeCandles(coinMeta, currentPriceData, sekRate, timeframe, fetchedCandles);
      setAnalysis(result);
    } catch (err) {
      console.error("Error running analysis:", err);
    } finally {
      setAnalysisLoading(false);
    }
  }, [selectedCoin, timeframe, sekRate, prices, coinMap]); // Still a bit dependent on prices but we'll control the call

  // Initial load: Fetch prices first, then analysis
  useEffect(() => {
    const init = async () => {
      await loadPrices();
      await runAnalysis();
    };
    init();
  }, []);

  // Countdown timer & auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadPrices(true);
          runAnalysis(true);
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loadPrices, runAnalysis, refreshInterval]);

  // Trigger analysis when asset or timeframe changes
  useEffect(() => {
    runAnalysis();
  }, [selectedCoin, timeframe]);


  // Filtered coins for sidebar
  const filteredCoins = useMemo(() => {
    if (!searchQuery.trim()) return mergedCoins;
    const q = searchQuery.toLowerCase();
    return mergedCoins.filter(c => 
      c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
    );
  }, [searchQuery, mergedCoins]);

  // Top Gainers / Top Losers for Snapshot
  const sortedCoinsByChange = useMemo(() => {
    return [...mergedCoins].filter(c => c.id !== 'thb-currency').sort((a, b) => {
      const chA = prices[a.id]?.usd_24h_change ?? 0;
      const chB = prices[b.id]?.usd_24h_change ?? 0;
      return chB - chA;
    });
  }, [prices, mergedCoins]);

  const topGainers = useMemo(() => sortedCoinsByChange.slice(0, 5), [sortedCoinsByChange]);
  const topLosers = useMemo(() => [...sortedCoinsByChange].reverse().slice(0, 5), [sortedCoinsByChange]);
  const topSEKCoins = useMemo(() => [...mergedCoins].filter(c => c.id !== 'thb-currency').slice(0, 6), [mergedCoins]);

  return (
    <div className={`min-h-screen ${st.bg} ${st.text} flex flex-col font-sans antialiased overflow-x-hidden selection:bg-indigo-500 selection:text-white`}>
      
      {/* PANEL 1: HEADER */}
      <header className={`sticky top-0 z-40 ${st.headerBg} border-b backdrop-blur-md px-4 py-3`}>
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo & App title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
                 <Terminal className="w-5 h-5 text-white animate-pulse" />
               </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Crypto Trading Assistant
                </h1>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Real-Time AI Terminal & SEK Calculator</span>
                <span className="inline-block w-1 h-1 rounded-full bg-slate-600" />
                <span className="text-emerald-400 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" /> Live Free APIs
                </span>
              </div>
            </div>
          </div>

          {/* Workspace Views Segmented Toggles */}
          <button
            onClick={() => {
              const tabs: ('terminal' | 'portfolio' | 'heatmap')[] = ['terminal', 'portfolio', 'heatmap'];
              const nextIndex = (tabs.indexOf(assistantTab) + 1) % tabs.length;
              setAssistantTab(tabs[nextIndex]);
              localStorage.setItem('assistantTab', tabs[nextIndex]);
            }}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 ${st.btnActive}`}
            title={`Cycle View: ${
              assistantTab === 'terminal' ? 'Terminal' : assistantTab === 'portfolio' ? 'Portfolio' : 'Heatmap'
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
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  title={tf.description}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-tight transition-all cursor-pointer ${
                    timeframe === tf.value
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}

          {/* SEK rate chip & refresh controls */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">USD/SEK Rate:</span>
              <span className="font-bold text-emerald-400">{sekRate.toFixed(2)} SEK</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Refresh in:</span>
                <span className="font-bold text-indigo-400 w-6 text-right">{countdown}s</span>
              </div>
              <select 
                value={refreshInterval}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setRefreshInterval(val);
                  setCountdown(val);
                }}
                className="ml-1 bg-transparent border-none text-[10px] font-bold text-slate-500 focus:outline-none cursor-pointer hover:text-white transition-colors"
                title="Set refresh interval"
              >
                <option value={60}>1m</option>
                <option value={180}>3m</option>
                <option value={300}>5m</option>
                <option value={600}>10m</option>
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs font-mono">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-slate-400">Speed:</span>
              <input 
                type="range" 
                min="0" 
                max="5" 
                value={tickerSpeed}
                onChange={(e) => setTickerSpeed(parseInt(e.target.value))}
                className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="font-bold text-indigo-400 w-4">{tickerSpeed}</span>
            </div>

            <button
              onClick={() => loadPrices(false)}
              disabled={loadState === 'loading'}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
              title="Force refresh live data"
            >
              <RefreshCw className={`w-4 h-4 ${loadState === 'loading' ? 'animate-spin text-indigo-400' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            </button>

            {/* Mobile toggle for right sidebar */}
            <button
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className="xl:hidden p-2.5 bg-indigo-950 text-indigo-300 rounded-xl border border-indigo-800/60 text-xs font-bold cursor-pointer"
            >
              Market View
            </button>
          </div>
        </div>
      </header>

      {/* PANEL 2: TICKER TAPE BAR */}
      <div className="bg-slate-950 border-b border-slate-900 py-2 overflow-hidden">
        <div className="max-w-[1700px] mx-auto px-4 flex items-center gap-6 whitespace-nowrap overflow-hidden">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 shrink-0 flex items-center gap-1.5 bg-slate-950 z-10 pr-2">
            <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Live Ticker
          </span>
          <div 
            className="flex items-center gap-6 animate-marquee"
            style={{ 
              animationDuration: tickerSpeed === 0 ? '0s' : `${120 / tickerSpeed}s`,
              animationPlayState: tickerSpeed === 0 ? 'paused' : 'running'
            }}
          >
            {[...mergedCoins, ...mergedCoins].map((coin, idx) => {
              const pData = prices[coin.id];
              const change = pData?.usd_24h_change ?? 0;
              const isUp = change >= 0;
              const isSelected = coin.id === selectedCoin;
              
              return (
                <button
                  key={`${coin.id}-${idx}`}
                  onClick={() => setSelectedCoin(coin.id)}
                  className={`inline-flex items-center gap-2 text-xs font-mono font-medium py-1 px-2.5 rounded-lg transition-colors cursor-pointer ${
                    isSelected ? 'bg-indigo-950 text-indigo-300 ring-1 ring-indigo-500/50' : 'hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  {coin.icon ? (
                    <img src={coin.icon} alt={coin.symbol} className="w-3.5 h-3.5 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'; }} />
                  ) : (
                    <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-400 px-1 py-0.2 rounded font-mono">{coin.symbol.slice(0, 3)}</span>
                  )}
                  <span className="font-bold">{coin.symbol}</span>
                  <span className="text-slate-400">${pData?.usd ? pData.usd >= 1 ? pData.usd.toFixed(2) : pData.usd.toFixed(4) : '...'}</span>
                  <span className={`text-[11px] font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isUp ? '▲' : '▼'}{Math.abs(change).toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE SWITCHER */}
      {assistantTab === 'portfolio' ? (
        <div className="flex-1 max-w-[1700px] w-full mx-auto p-4 animate-fade-in">
          <PortfolioTracker 
            externalPrices={prices} 
            externalSekRate={sekRate} 
            externalThbRate={thbRate} 
            coins={mergedCoins}
          />
        </div>
      ) : assistantTab === 'heatmap' ? (
        <div className="flex-1 max-w-[1700px] w-full mx-auto p-4 animate-fade-in">
          <TradingHeatmap 
            initialType="crypto" 
            sekRate={sekRate} 
            onSelectAsset={(id, type) => {
              if (type === 'crypto') {
                setSelectedCoin(id);
                setAssistantTab('terminal');
              }
            }}
          />
        </div>
      ) : (
        /* MAIN CONTAINER (LAYOUT: 3 COLUMNS) */
        <div className="flex-1 max-w-[1700px] w-full mx-auto p-4 flex gap-6 items-start">
        
        {/* PANEL 3: LEFT SIDEBAR: Asset List */}
        <aside className={`shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-full sm:w-80'} hidden sm:flex flex-col gap-3 bg-slate-950/40 rounded-2xl border border-slate-900 self-stretch min-h-[750px]`}>
          <div className="p-3 border-b border-slate-900 flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 flex-1 mr-2">
                <div className="relative flex-1 font-sans">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={`Search ${mergedCoins.length} assets...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/90 text-xs text-white pl-9 pr-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 placeholder-slate-500 transition-all font-mono"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer">
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors ml-auto cursor-pointer"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <div className="p-3 overflow-y-auto space-y-2 flex-1 scrollbar-thin max-h-[calc(100vh-220px)]">
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider px-2 mb-2">
              {sidebarCollapsed ? "Assets" : `Supported Assets (${filteredCoins.length})`}
            </div>
            
            {filteredCoins.map((coin) => (
              <div key={coin.id} className={sidebarCollapsed ? 'flex justify-center' : ''}>
                {sidebarCollapsed ? (
                  <button
                    onClick={() => setSelectedCoin(coin.id)}
                    title={`${coin.name} (${coin.symbol})`}
                    className={`w-14 h-14 rounded-2xl p-1.5 flex items-center justify-center border transition-all cursor-pointer ${
                      selectedCoin === coin.id ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400' : 'bg-slate-900 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    {coin.icon ? (
                      <img src={coin.icon} alt={coin.symbol} className="w-full h-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'; }} />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-xs uppercase">
                        {coin.symbol.slice(0, 3)}
                      </div>
                    )}
                  </button>
                ) : (
                  <div className="relative group">
                    <CoinCard
                      coin={coin}
                      priceData={prices[coin.id]}
                      selected={selectedCoin === coin.id}
                      onClick={() => setSelectedCoin(coin.id)}
                    />
                    {coin.isCustom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCustomCoin(coin.id);
                        }}
                        className="absolute right-3.5 top-3.5 p-1 bg-rose-950/85 border border-rose-900/40 text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-rose-900 cursor-pointer"
                        title="Delete custom coin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {!sidebarCollapsed && (
              <div className="border border-slate-850 rounded-xl bg-slate-900/40 p-3 space-y-3 mt-4">
                <button 
                  onClick={() => setIsAddingCustom(!isAddingCustom)}
                  className="w-full flex items-center justify-between text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5" /> Add Custom Asset
                  </span>
                  <span className="text-[10px] bg-indigo-950 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-900/30">
                    {isAddingCustom ? 'Hide' : 'Add'}
                  </span>
                </button>

                {isAddingCustom && (
                  <div className="space-y-3 pt-2 border-t border-slate-800/50 animate-fade-in text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">CoinGecko ID</label>
                        {isFetchingInfo && <span className="text-[10px] text-indigo-400 animate-pulse font-mono flex items-center">Loading...</span>}
                      </div>
                      <input 
                        type="text" 
                        placeholder="e.g. dogecoin" 
                        value={newId}
                        onChange={(e) => setNewId(e.target.value.toLowerCase().trim())}
                        onBlur={(e) => fetchCoinInfo(e.target.value)}
                        className="w-full bg-slate-950 text-xs text-white p-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Coin Symbol</label>
                      <input 
                        type="text" 
                        placeholder="e.g. DOGE" 
                        value={newSymbol}
                        onChange={(e) => setNewSymbol(e.target.value.toUpperCase().trim())}
                        className="w-full bg-slate-950 text-xs text-white p-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Coin Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Dogecoin" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value.trim())}
                        className="w-full bg-slate-950 text-xs text-white p-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Icon URL (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. image link" 
                        value={newIcon}
                        onChange={(e) => setNewIcon(e.target.value.trim())}
                        className="w-full bg-slate-950 text-xs text-white p-2 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <button 
                      onClick={handleAddCustomCoin}
                      disabled={isVerifyingCustom}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isVerifyingCustom ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying slug...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Verify & Add Coin</span>
                        </>
                      )}
                    </button>
                    {customAddError && (
                      <p className="text-[10px] text-rose-400 italic mt-1 font-mono leading-relaxed">{customAddError}</p>
                    )}
                    {customAddSuccess && (
                      <p className="text-[10px] text-emerald-400 italic mt-1 font-mono leading-relaxed">Added successfully!</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Mobile asset selector bar */}
        <div className="w-full sm:hidden overflow-x-auto pb-2 flex gap-2">
          {mergedCoins.map(coin => (
            <button
              key={coin.id}
              onClick={() => setSelectedCoin(coin.id)}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                selectedCoin === coin.id ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-900 text-slate-300 border-slate-800'
              }`}
            >
              {coin.icon ? (
                <img src={coin.icon} alt={coin.symbol} className="w-4 h-4 object-contain animate-fade-in" onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'; }} />
              ) : (
                <div className="w-4 h-4 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-[9px] uppercase">
                  {coin.symbol.slice(0, 2)}
                </div>
              )}
              <span>{coin.symbol}</span>
            </button>
          ))}
        </div>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 space-y-6">
          {isUsingSnapshot && (
            <div className="bg-amber-950/40 border border-amber-500/40 p-4 rounded-2xl flex items-center justify-between text-amber-300 animate-pulse">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-sm">
                  <span className="font-bold">SNAPSHOT MODE:</span> CoinGecko API rate limit reached. Using latest cached price data from session start.
                </div>
              </div>
              <button 
                onClick={() => loadPrices(false)}
                className="px-3 py-1 text-xs font-bold bg-amber-900/60 hover:bg-amber-800 rounded-lg transition-colors text-white cursor-pointer font-mono"
              >
                Sync Live
              </button>
            </div>
          )}

          {loadState === 'error' && (
            <div className="bg-rose-950/40 border border-rose-500/40 p-4 rounded-2xl flex items-center justify-between text-rose-300">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <div className="text-sm">
                  <span className="font-bold">Notice:</span> CoinGecko price API rate limit reached. Using realistic live fallback simulation data.
                </div>
              </div>
              <button 
                onClick={() => loadPrices(false)}
                className="px-3 py-1 text-xs font-bold bg-rose-900 hover:bg-rose-800 rounded-lg transition-colors text-white cursor-pointer font-mono"
              >
                Retry Fetch
              </button>
            </div>
          )}

          {analysisLoading || !analysis ? (
            <div className="h-[600px] bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              <div className="text-slate-400 font-mono text-sm tracking-wide">
                Computing {timeframe} technical indicators & AI vectors for {coinMap[selectedCoin]?.name || selectedCoin}...
              </div>
            </div>
          ) : (
            <>
              <AnalysisPanel
                analysis={analysis}
                candles={candles}
                sekRate={sekRate}
                thbRate={thbRate}
              />
            </>
          )}
        </main>

        {/* RIGHT SIDEBAR: Market Snapshot & SEK Top List */}
        <aside className={`shrink-0 transition-all duration-300 ${rightSidebarCollapsed ? 'w-16' : 'w-80'} ${rightSidebarOpen ? 'block fixed inset-0 z-50 bg-slate-950 p-6 overflow-y-auto' : 'hidden'} xl:flex xl:relative xl:z-0 flex-col gap-6 self-stretch min-h-[750px]`}>
          <div className={`flex flex-col gap-6 h-full ${rightSidebarCollapsed ? 'items-center' : ''}`}>
            
            {/* Mobile Header (Hidden on Desktop) */}
            {rightSidebarOpen && (
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 xl:hidden">
                <div className="font-bold text-lg">Market Overview</div>
                <button onClick={() => setRightSidebarOpen(false)} className="p-2 bg-slate-900 rounded-xl cursor-pointer">✕ Close</button>
              </div>
            )}

            {/* Toggle Button (Desktop only) */}
            <div className={`hidden xl:flex ${rightSidebarCollapsed ? 'justify-center' : 'justify-start'} w-full`}>
              <button
                onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
                title={rightSidebarCollapsed ? "Expand right sidebar" : "Collapse right sidebar"}
              >
                {rightSidebarCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>

            {!rightSidebarCollapsed ? (
              <>
                <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800/80 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-1.5 font-bold text-slate-200 text-sm">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span>24h Market Movers</span>
                    </div>
                    <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                      <button 
                        onClick={() => setTrendsTab('gainers')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tight transition-all cursor-pointer ${
                          trendsTab === 'gainers' 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Gainers
                      </button>
                      <button 
                        onClick={() => setTrendsTab('losers')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tight transition-all cursor-pointer ${
                          trendsTab === 'losers' 
                            ? 'bg-rose-500/20 text-rose-400' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Losers
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(trendsTab === 'gainers' ? topGainers : topLosers).map(coin => {
                      const pData = prices[coin.id];
                      const change = pData?.usd_24h_change ?? 0;
                      const isUp = change >= 0;

                      return (
                        <button
                          key={coin.id}
                          onClick={() => { setSelectedCoin(coin.id); }}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            {coin.icon ? (
                              <img src={coin.icon} alt={coin.symbol} className="w-6 h-6 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'; }} />
                            ) : (
                              <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[9px] font-mono">
                                {coin.symbol.slice(0, 3)}
                              </div>
                            )}
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{coin.symbol}</span>
                                {coin.isCustom && (
                                  <span className="text-[8px] bg-indigo-500/20 text-indigo-300 font-mono px-1 rounded">Custom</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono italic">${pData?.usd ? (pData.usd >= 1 ? pData.usd.toFixed(2) : pData.usd.toFixed(4)) : '...'}</div>
                            </div>
                          </div>
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${isUp ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'}`}>
                            {isUp ? '+' : ''}{change.toFixed(2)}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800/80 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
                      <DollarSign className="w-4 h-4 text-indigo-400" />
                      <span>SEK Market Prices</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {topSEKCoins.map(coin => {
                      const pData = prices[coin.id];
                      const sekVal = (pData?.usd ?? 0) * sekRate;

                      return (
                        <div key={coin.id} className="flex items-center justify-between py-2 px-3 bg-slate-950/40 rounded-xl border border-slate-800/60 font-mono">
                          <span className="text-slate-300 font-bold">{coin.name}</span>
                          <span className="font-semibold text-slate-100">
                            {sekVal > 10 ? Math.round(sekVal).toLocaleString('sv-SE') : sekVal.toFixed(2)} kr
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-6 items-center pt-2">
                 <div className="flex flex-col gap-4">
                    <div title="24h Top Momentum" className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-emerald-400">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div title="SEK Prices" className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-indigo-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                 </div>
              </div>
            )}
            
            {!rightSidebarCollapsed && (
              <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 p-5 rounded-2xl border border-indigo-500/20 text-[10px] text-slate-500 space-y-3 mt-auto relative">
                <div className="font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="text-indigo-400 font-black tracking-widest uppercase italic">Node Terminal</span>
                </div>
                <p className="leading-relaxed font-medium">
                  Direct connection via CoinGecko V3 and ExchangeRate. Technical indicators computed client-side.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
      )}

      {/* PANEL 9: FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-[1700px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            <span className="text-slate-300 font-semibold">Live System Operational</span>
            <span className="text-slate-600">|</span>
            <span>CoinGecko Free API · ExchangeRate-API</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Crypto Trading Assistant</span> · Built with React 19 & Tailwind CSS
          </div>
          <div className="text-[11px] text-slate-500 italic max-w-md text-right hidden lg:block font-mono">
            Disclaimer: Not financial advice. Always verify indicators and execute trades according to your personal risk management strategy.
          </div>
        </div>
      </footer>
    </div>
  );
};
