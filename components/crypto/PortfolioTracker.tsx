import React, { useState, useEffect, useMemo } from 'react';
import { CoinId, PriceData } from '../../crypto-types';
import { COINS, COIN_MAP, DEFAULT_SEK_RATE, FALLBACK_PRICES } from '../../constants/crypto';
import { fetchAllPrices, fetchFXRates } from '../../services/cryptoApi';
import { generateResponse } from '../../services/gemini';
import { saveDocToFirestore, getDocsFromFirestore, deleteDocFromFirestore } from '../../services/storage';
import { 
  Plus, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign, Wallet, 
  HelpCircle, Sparkles, Check, X, Search, Info, Award, ChartPie, RefreshCw, 
  MessageSquare, ShieldAlert, FileText, ArrowRightLeft, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface Holding {
  coinId: CoinId;
  amount: number;
  buyPriceUsd: number;
}

interface PortfolioTrackerProps {
  externalPrices?: Record<CoinId, PriceData>;
  externalSekRate?: number;
  externalThbRate?: number;
  coins?: { id: string; name: string; symbol: string; icon: string; sector?: string; isCustom?: boolean }[];
}

export const PortfolioTracker: React.FC<PortfolioTrackerProps> = ({
  externalPrices,
  externalSekRate,
  externalThbRate,
  coins
}) => {
  // Merged coins list (custom + seed / standard)
  const mergedCoins = useMemo(() => {
    return coins || COINS;
  }, [coins]);

  // Dynamic Map for looking up properties of any coin, including custom ones
  const dynamicCoinMap = useMemo(() => {
    return mergedCoins.reduce((acc, coin) => {
      acc[coin.id] = coin;
      return acc;
    }, {} as Record<string, { id: string; name: string; symbol: string; icon: string; sector?: string; isCustom?: boolean }>);
  }, [mergedCoins]);

  // Holdings state
  const [holdings, setHoldings] = useState<Holding[]>(() => {
    const saved = localStorage.getItem('crypto_portfolio_holdings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse portfolio holdings', e);
      }
    }
    // Default initial holdings for demonstration/onboarding
    return [
      { coinId: 'bitcoin', amount: 0.25, buyPriceUsd: 62000 },
      { coinId: 'ethereum', amount: 1.8, buyPriceUsd: 3100 },
      { coinId: 'solana', amount: 15, buyPriceUsd: 130 }
    ];
  });

  // Currency Selection
  const [currency, setCurrency] = useState<'USD' | 'SEK' | 'THB'>(() => {
    return (localStorage.getItem('portfolio_currency') as any) || 'USD';
  });

  // Rates and Prices State (fallbacks if external not supplied)
  const [prices, setPrices] = useState<Record<CoinId, PriceData>>(() => 
    (externalPrices || FALLBACK_PRICES) as Record<CoinId, PriceData>
  );
  const [sekRate, setSekRate] = useState<number>(externalSekRate || DEFAULT_SEK_RATE);
  const [thbRate, setThbRate] = useState<number>(externalThbRate || 34.5);
  const [loadingPrices, setLoadingPrices] = useState<boolean>(false);

  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoinId, setSelectedCoinId] = useState<CoinId>('bitcoin');
  const [amountStr, setAmountStr] = useState('');
  const [purchasePriceUsdStr, setPurchasePriceUsdStr] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingId, setIsEditingId] = useState<number | null>(null);
  const [inputCurrency, setInputCurrency] = useState<'USD' | 'SEK'>('USD');

  // Search filter for selector
  const filteredCoins = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    // Exclude Thai Baht itself as an asset to track inside portfolio
    return mergedCoins.filter(c => 
      c.id !== 'thb-currency' && 
      (c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
    );
  }, [mergedCoins, searchQuery]);

  // AI Analyst Diagnosis State
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Sync internal rates with external if they change
  useEffect(() => {
    if (externalPrices) setPrices(externalPrices);
    if (externalSekRate) setSekRate(externalSekRate);
    if (externalThbRate) setThbRate(externalThbRate);
  }, [externalPrices, externalSekRate, externalThbRate]);

  // Fetch from Firestore on mount
  useEffect(() => {
    const fetchFromFirestore = async () => {
      try {
        const firestoreDocs = await getDocsFromFirestore('crypto_holdings');
        if (firestoreDocs && firestoreDocs.length > 0) {
          const parsed = firestoreDocs.map(item => ({
            coinId: item.coinId || item.id,
            amount: Number(item.amount),
            buyPriceUsd: Number(item.buyPriceUsd)
          }));
          setHoldings(parsed);
        }
      } catch (e) {
        console.warn('Failed to load crypto holdings from Firestore: ', e);
      }
    };
    fetchFromFirestore();
  }, []);

  // Save holdings
  useEffect(() => {
    localStorage.setItem('crypto_portfolio_holdings', JSON.stringify(holdings));
    
    const saveToFirestore = async () => {
      try {
        await saveDocToFirestore('settings', 'crypto_holdings_backup', { holdings });
        for (const h of holdings) {
          await saveDocToFirestore('crypto_holdings', h.coinId, {
            coinId: h.coinId,
            amount: h.amount,
            buyPriceUsd: h.buyPriceUsd
          });
        }
      } catch (e) {
        console.warn('Silent Firestore sync deferred: ', e);
      }
    };
    saveToFirestore();
  }, [holdings]);

  // Save currency preference
  useEffect(() => {
    localStorage.setItem('portfolio_currency', currency);
  }, [currency]);

  // Load prices if not provided externally
  const loadPricesAndRates = async () => {
    if (externalPrices) return; // Skip if parent handles it
    setLoadingPrices(true);
    try {
      const [fetchedPrices, fxRates] = await Promise.all([
        fetchAllPrices(),
        fetchFXRates()
      ]);
      if (Object.keys(fetchedPrices).length > 0) {
        setPrices(fetchedPrices);
      }
      if (fxRates.SEK > 0) setSekRate(fxRates.SEK);
      if (fxRates.THB > 0) setThbRate(fxRates.THB);
    } catch (e) {
      console.error('Error fetching live data for Portfolio Tracker:', e);
    } finally {
      setLoadingPrices(false);
    }
  };

  useEffect(() => {
    loadPricesAndRates();
  }, []);

  // Set default buy price when user selects a coin in the dropdown
  useEffect(() => {
    if (isEditingId !== null) return;
    const currentPriceUsd = prices[selectedCoinId]?.usd || FALLBACK_PRICES[selectedCoinId]?.usd || 0;
    const resolvedPrice = inputCurrency === 'SEK' ? (currentPriceUsd * sekRate) : currentPriceUsd;
    setPurchasePriceUsdStr(resolvedPrice ? resolvedPrice.toFixed(resolvedPrice < 1 ? 4 : 2) : '');
  }, [selectedCoinId, prices, inputCurrency, sekRate, isEditingId]);

  // Calculations helper
  const currencySymbol = useMemo(() => {
    if (currency === 'SEK') return 'kr';
    if (currency === 'THB') return '฿';
    return '$';
  }, [currency]);

  const convertUsdVal = (usdVal: number) => {
    if (currency === 'SEK') return usdVal * sekRate;
    if (currency === 'THB') return usdVal * thbRate;
    return usdVal;
  };

  const getPriceData = (coinId: CoinId): { usd: number; usd_24h_change: number } => {
    return prices[coinId] || FALLBACK_PRICES[coinId] || { usd: 0, usd_24h_change: 0 };
  };

  // Computations
  const portfolioStats = useMemo(() => {
    let totalInvestmentUsd = 0;
    let totalCurrentValueUsd = 0;
    let worstAssetSymbol = '';
    let worstAssetPLPct = Infinity;
    let bestAssetSymbol = '';
    let bestAssetPLPct = -Infinity;

    holdings.forEach((h) => {
      const pData = getPriceData(h.coinId);
      const costBasis = h.amount * h.buyPriceUsd;
      const currentVal = h.amount * pData.usd;

      totalInvestmentUsd += costBasis;
      totalCurrentValueUsd += currentVal;

      if (h.buyPriceUsd > 0) {
        const plPct = ((pData.usd - h.buyPriceUsd) / h.buyPriceUsd) * 100;
        const sym = dynamicCoinMap[h.coinId]?.symbol || h.coinId.toUpperCase();
        if (plPct < worstAssetPLPct) {
          worstAssetPLPct = plPct;
          worstAssetSymbol = sym;
        }
        if (plPct > bestAssetPLPct) {
          bestAssetPLPct = plPct;
          bestAssetSymbol = sym;
        }
      }
    });

    const totalPLUsd = totalCurrentValueUsd - totalInvestmentUsd;
    const totalPLPct = totalInvestmentUsd > 0 ? (totalPLUsd / totalInvestmentUsd) * 100 : 0;

    return {
      totalValue: convertUsdVal(totalCurrentValueUsd),
      totalCost: convertUsdVal(totalInvestmentUsd),
      totalPL: convertUsdVal(totalPLUsd),
      totalPLPct,
      bestAsset: bestAssetPLPct !== -Infinity ? `${bestAssetSymbol} (+${bestAssetPLPct.toFixed(1)}%)` : 'N/A',
      worstAsset: worstAssetPLPct !== Infinity ? `${worstAssetSymbol} (${worstAssetPLPct.toFixed(1)}%)` : 'N/A'
    };
  }, [holdings, prices, currency, sekRate, thbRate, dynamicCoinMap]);

  // Allocation computations for SVG Pie chart
  const allocation = useMemo(() => {
    const assetTotals: Record<string, number> = {};
    let totalUsd = 0;

    holdings.forEach(h => {
      const pData = getPriceData(h.coinId);
      const valUsd = h.amount * pData.usd;
      assetTotals[h.coinId] = (assetTotals[h.coinId] || 0) + valUsd;
      totalUsd += valUsd;
    });

    const items = Object.entries(assetTotals).map(([coinId, valueUsd]) => {
      const pct = totalUsd > 0 ? (valueUsd / totalUsd) * 100 : 0;
      const meta = dynamicCoinMap[coinId] || { name: coinId, symbol: coinId.toUpperCase() };
      return {
        coinId,
        symbol: meta.symbol,
        name: meta.name,
        valueUsd,
        pct
      };
    }).sort((a, b) => b.valueUsd - a.valueUsd);

    // Color schema for doughnut
    const colors = [
      '#6366f1', // Indigo
      '#3b82f6', // Blue
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#ec4899', // Pink
      '#8b5cf6', // Violet
      '#14b8a6', // Teal
      '#f43f5e', // Rose
      '#84cc16'  // Lime
    ];

    return items.map((item, idx) => ({
      ...item,
      color: colors[idx % colors.length]
    }));
  }, [holdings, prices]);

  // SVG doughnut generation details
  const doughnutSlices = useMemo(() => {
    let accumulatedAngle = 0;
    return allocation.map((item) => {
      const angle = (item.pct / 100) * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;

      // Polar to cartesian calculations for SVG arc
      const radius = 64;
      const cx = 80;
      const cy = 80;

      const x1 = cx + radius * Math.cos((startAngle - 90) * Math.PI / 180);
      const y1 = cy + radius * Math.sin((startAngle - 90) * Math.PI / 180);
      const x2 = cx + radius * Math.cos((accumulatedAngle - 90) * Math.PI / 180);
      const y2 = cy + radius * Math.sin((accumulatedAngle - 90) * Math.PI / 180);

      const largeArc = angle > 180 ? 1 : 0;

      return {
        path: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
        ...item
      };
    });
  }, [allocation]);

  // Precompute simple analyst indicators dynamically
  const getAnalystSummary = (coinId: CoinId) => {
    const pData = getPriceData(coinId);
    const change = pData.usd_24h_change;
    
    // Simulate indicator outputs using price indicators
    let action: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
    let trend: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
    let strength = 50;

    if (change > 3) {
      action = 'STRONG BUY';
      trend = 'Bullish';
      strength = Math.min(95, 75 + Math.round(change * 2));
    } else if (change > 0.5) {
      action = 'BUY';
      trend = 'Bullish';
      strength = Math.min(80, 55 + Math.round(change * 3));
    } else if (change < -3) {
      action = 'SELL';
      trend = 'Bearish';
      strength = Math.min(95, 65 + Math.round(Math.abs(change) * 2));
    } else if (change < -0.5) {
      action = 'HOLD';
      trend = 'Bearish';
      strength = 45;
    }

    return { action, trend, strength, change };
  };

  // Real-time conversion of buy price when user toggles USD/SEK switch
  const handleToggleInputCurrency = (target: 'USD' | 'SEK') => {
    if (target === inputCurrency) return;
    const currentVal = parseFloat(purchasePriceUsdStr);
    if (!isNaN(currentVal) && currentVal > 0) {
      if (target === 'SEK') {
        const nextVal = currentVal * sekRate;
        setPurchasePriceUsdStr(nextVal.toFixed(nextVal < 1 ? 4 : 2));
      } else {
        const nextVal = currentVal / sekRate;
        setPurchasePriceUsdStr(nextVal.toFixed(nextVal < 1 ? 4 : 2));
      }
    }
    setInputCurrency(target);
  };

  // Add / Edit submission
  const handleSaveHolding = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr);
    const buyPriceInput = parseFloat(purchasePriceUsdStr);
    const buyPriceUsd = inputCurrency === 'SEK' ? (buyPriceInput / sekRate) : buyPriceInput;

    if (isNaN(amount) || amount <= 0) {
      alert('Must provide a valid quantity greater than zero.');
      return;
    }

    if (isNaN(buyPriceUsd) || buyPriceUsd <= 0) {
      alert('Must provide a valid buying price per unit.');
      return;
    }

    if (isEditingId !== null) {
      // Modify existing
      setHoldings(prev => prev.map((h, idx) => 
        idx === isEditingId 
          ? { coinId: selectedCoinId, amount, buyPriceUsd } 
          : h
      ));
      setIsEditingId(null);
    } else {
      // Prevent duplicates by compounding or append
      const existingIdx = holdings.findIndex(h => h.coinId === selectedCoinId);
      if (existingIdx !== -1) {
        // Average the buy price and compound amount
        const existing = holdings[existingIdx];
        const newTotalAmount = existing.amount + amount;
        const totalCostBasis = (existing.amount * existing.buyPriceUsd) + (amount * buyPriceUsd);
        const newAvgBuyPrice = totalCostBasis / newTotalAmount;

        setHoldings(prev => prev.map((h, idx) => 
          idx === existingIdx 
            ? { coinId: selectedCoinId, amount: newTotalAmount, buyPriceUsd: newAvgBuyPrice }
            : h
        ));
      } else {
        setHoldings(prev => [...prev, { coinId: selectedCoinId, amount, buyPriceUsd }]);
      }
    }

    // Reset Form
    setAmountStr('');
    setIsAdding(false);
  };

  const handleStartEdit = (idx: number) => {
    const holding = holdings[idx];
    setSelectedCoinId(holding.coinId);
    setAmountStr(holding.amount.toString());
    const val = inputCurrency === 'SEK' ? (holding.buyPriceUsd * sekRate) : holding.buyPriceUsd;
    setPurchasePriceUsdStr(val.toFixed(val < 1 ? 4 : 2));
    setIsEditingId(idx);
    setIsAdding(true);
  };

  const handleDeleteHolding = async (idx: number) => {
    const target = holdings[idx];
    if (target) {
      setHoldings(prev => prev.filter((_, i) => i !== idx));
      try {
        await deleteDocFromFirestore('crypto_holdings', target.coinId);
      } catch (e) {
        console.warn('Failed to delete crypto holding from Firestore:', e);
      }
    }
  };

  // AI portfolio Diagnosis report generator
  const handleGenerateDiagnosis = async () => {
    if (holdings.length === 0) {
      alert('Please add some assets to your portfolio first!');
      return;
    }

    setIsGeneratingAiReport(true);
    setAiReport(null);
    setAiError(null);

    // Formulate a clean description of holdings
    const holdingDescriptions = holdings.map((h) => {
      const meta = dynamicCoinMap[h.coinId] || { name: h.coinId, symbol: h.coinId.toUpperCase() };
      const curPrice = getPriceData(h.coinId).usd;
      const totalVal = h.amount * curPrice;
      const plPct = h.buyPriceUsd > 0 ? ((curPrice - h.buyPriceUsd) / h.buyPriceUsd) * 100 : 0;
      
      return `- **${meta.name} (${meta.symbol})**: ${h.amount.toFixed(4)} tokens. Cost basis: $${h.buyPriceUsd.toFixed(2)} / current price: $${curPrice.toFixed(2)}. Value: $${totalVal.toFixed(2)}. P&L: ${plPct.toFixed(1)}%.`;
    }).join('\n');

    const totalValUsd = portfolioStats.totalValue / (currency === 'SEK' ? sekRate : currency === 'THB' ? thbRate : 1);
    const totalPLUsd = portfolioStats.totalPL / (currency === 'SEK' ? sekRate : currency === 'THB' ? thbRate : 1);
    const totalPLPct = portfolioStats.totalPLPct;

    const query = `
      You are an elite, highly critical crypto hedge fund analyst and macroeconomic advisor.
      Please evaluate the following manual crypto portfolio tracker holdings and generate an expert structural diagnostic audit.
      
      Portfolio Holdings:
      ${holdingDescriptions}
      
      Macro Statistics:
      - Total Net Worth: $${totalValUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      - Total Purchase Basis Cost: $${(totalValUsd - totalPLUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      - Total P&L: $${totalPLUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${totalPLPct.toFixed(1)}%)
      
      Generate a professional report with the following specific sections (using nice, clean, sleek markdown):
      1. **EXECUTIVE DISPATCH**: High-level verdict of these allocations in the current market environment.
      2. **DIVERSIFICATION SCORECARD**: Critical analysis of their asset distribution, over-concentrations, and correlation risks.
      3. **TACTICAL HOTSPOTS**: Specific alert flags or buying opportunities based on current coin indicators.
      4. **REBALANCING MANIFESTO**: Next clear, actionable strategic actions to optimize profitability and reduce overall downside risks.

      Be direct, professional, objective, and realistic. Keep the advice tailored specifically to the coin assets provided. Format in beautiful styled layout with bullet points.
    `;

    try {
      const result = await generateResponse(query, [], []);
      setAiReport(result.text);
    } catch (err: any) {
      console.error('Failed to generate AI portfolio diagnostic', err);
      setAiError(err.message || 'An error occurred during diagnosis generation.');
    } finally {
      setIsGeneratingAiReport(false);
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 rounded-xl border border-slate-900 overflow-hidden shadow-2xl relative font-sans">
      
      {/* HEADER BAR */}
      <div className="bg-slate-900/60 p-3 border-b border-slate-900 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-white flex items-center gap-1.5">
              Portfolio Assets Tracker
              <span className="text-[8px] uppercase bg-indigo-500/25 text-indigo-300 font-bold border border-indigo-500/30 px-1.5 py-0.1 rounded">
                Beta
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">Manually track and analyze cryptocurrency holdings in real-time</p>
          </div>
        </div>

        {/* Currency selectors & Quick Refresh */}
        <div className="flex items-center gap-2">
          {/* Refresh indicators */}
          {loadingPrices && (
            <span className="text-[10px] text-slate-500 flex items-center gap-1 animate-pulse mr-1 font-mono">
              <RefreshCw className="w-2.5 h-2.5 animate-spin text-indigo-400" />
              Syncing...
            </span>
          )}

          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            {(['USD', 'SEK', 'THB'] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                  currency === curr
                    ? 'bg-indigo-600 text-white shadow shadow-indigo-600/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              loadPricesAndRates();
            }}
            className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer"
            title="Refresh valuations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPrices ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* METRIC CARD BENTO GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-slate-900 divide-y sm:divide-y-0 sm:divide-x divide-slate-900 bg-slate-950/40 font-sans">
        
        {/* Metric 1 */}
        <div className="p-4 space-y-1 hover:bg-slate-900/10 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Net Worth</span>
            <Wallet className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-white tabular-nums">
            {currencySymbol}{portfolioStats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[9px] text-slate-500 font-medium italic">
            Based on current live exchanges rates & feeds.
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 space-y-1 hover:bg-slate-900/10 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Investment basis</span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base font-bold font-mono tracking-tight text-slate-200 tabular-nums">
            {currencySymbol}{portfolioStats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[9px] text-slate-500 font-medium font-mono italic">
            SUM basis cost of all purchases
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 space-y-1 hover:bg-slate-900/10 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">All-Time Yield (P&L)</span>
            {portfolioStats.totalPL >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div className={`text-base font-bold font-mono tracking-tight tabular-nums flex items-baseline gap-1.5 ${
            portfolioStats.totalPL >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            <span>
              {portfolioStats.totalPL >= 0 ? '+' : ''}
              {portfolioStats.totalPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/5">
              {portfolioStats.totalPLPct.toFixed(1)}%
            </span>
          </div>
          <div className="text-[9px] text-slate-500 font-medium italic">
            Overall yields since purchase dates
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 space-y-1.5 hover:bg-slate-900/10 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">High/Low Yields</span>
            <Award className="w-3.5 h-3.5 text-yellow-500" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-550 font-medium">Top Performer:</span>
              <span className="font-bold text-emerald-400 font-mono text-right">{portfolioStats.bestAsset}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-550 font-medium">Lowest Yield:</span>
              <span className="font-bold text-rose-400 font-mono text-right">{portfolioStats.worstAsset}</span>
            </div>
          </div>
        </div>
      </div>

      {/* LOWER CONTENT SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        
        {/* LEFT COLUMN: Holdings List & Add button (8 cols) */}
        <div className="p-4 lg:col-span-8 space-y-4 lg:border-r border-slate-900 font-sans">
          
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-indigo-400" />
              Active Crypto Positions ({holdings.length})
            </h3>

            {/* Close / Add Form Toggles */}
            <button
              onClick={() => {
                if (isAdding) {
                  setIsAdding(false);
                  setIsEditingId(null);
                } else {
                  setIsAdding(true);
                  setAmountStr('');
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isAdding 
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow shadow-indigo-600/30'
              }`}
            >
              {isAdding ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Form</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Holding</span>
                </>
              )}
            </button>
          </div>

          {/* ADD / EDIT TRANSACTION PANEL */}
          <AnimatePresence>
            {isAdding && (
              <motion.form
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSaveHolding}
                className="bg-slate-900/40 p-4 rounded-lg border border-slate-800 space-y-3.5"
              >
                <div className="font-bold text-[10px] text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isEditingId !== null ? 'Modify Position Parameters' : 'Register New Coin Position'}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Coin Select */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Select Crypto Asset</label>
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search supported crypto..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-950 text-[11px] text-white pl-8 pr-2 py-1.5 border border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 font-sans"
                        />
                      </div>
                      <select
                        value={selectedCoinId}
                        onChange={(e) => setSelectedCoinId(e.target.value as CoinId)}
                        className="w-full bg-slate-950 text-[11px] text-slate-200 p-2 border border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 font-sans"
                      >
                        {filteredCoins.map(coin => (
                          <option key={coin.id} value={coin.id}>
                            {coin.name} ({coin.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quantity and Price */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Holdings Quantity</label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="e.g. 0.5 or 12.4"
                        value={amountStr}
                        onChange={(e) => setAmountStr(e.target.value)}
                        className="w-full bg-slate-950 text-[11px] font-mono text-white p-2 border border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Buy Price per unit ({inputCurrency})
                        </label>
                        <div className="flex rounded-md bg-slate-900 p-0.5 border border-slate-800 scale-95 origin-right">
                          <button
                            type="button"
                            onClick={() => handleToggleInputCurrency('USD')}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                              inputCurrency === 'USD' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            USD ($)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleInputCurrency('SEK')}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                              inputCurrency === 'SEK' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            SEK (kr)
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-500">
                          {inputCurrency === 'SEK' ? 'kr' : '$'}
                        </span>
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder={inputCurrency === 'SEK' ? "Price in SEK / kr" : "Price in USD"}
                          value={purchasePriceUsdStr}
                          onChange={(e) => setPurchasePriceUsdStr(e.target.value)}
                          className="w-full bg-slate-950 text-[11px] font-mono text-white pl-8 pr-2 py-2 border border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1 shadow shadow-indigo-600/30 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isEditingId !== null ? 'Save Changes' : 'Register Position'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setIsEditingId(null);
                    }}
                    className="px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-[10px] font-bold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* HOLDINGS TABLE VIEW */}
          {holdings.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center gap-2 font-sans">
              <div className="p-3 bg-slate-900 rounded-full border border-slate-800 text-slate-500">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-300">Portfolio is Empty</h4>
                <p className="text-[10px] text-slate-500 max-w-sm mt-0.5">
                  Add custom positions using the "Add Holding" button above to witness live valuations and indicators!
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-900 bg-slate-950 font-sans">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-900 text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                    <th className="py-2 px-3">Asset</th>
                    <th className="py-2 px-3">Quantity</th>
                    <th className="py-2 px-2.5">Buy Price / Current</th>
                    <th className="py-2 px-3">Net Value</th>
                    <th className="py-2 px-3">Yield (P&L)</th>
                    <th className="py-2 px-3 text-center">Analyst Rating</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-[11px]">
                  {holdings.map((h, idx) => {
                    const coin = dynamicCoinMap[h.coinId] || { name: h.coinId, symbol: h.coinId.toUpperCase(), icon: '' };
                    const pData = getPriceData(h.coinId);
                    
                    const buyValUsd = h.amount * h.buyPriceUsd;
                    const curValUsd = h.amount * pData.usd;
                    const plUsd = curValUsd - buyValUsd;
                    const plPct = h.buyPriceUsd > 0 ? (plUsd / buyValUsd) * 100 : 0;

                    // Fetch analyst consensus
                    const rating = getAnalystSummary(h.coinId);

                    return (
                      <tr key={`${h.coinId}-${idx}`} className="hover:bg-slate-900/15 transition-colors">
                        {/* Name/Symbol */}
                        <td className="py-2 px-3 font-sans">
                          <div className="flex items-center gap-2">
                            {coin.icon ? (
                              <img src={coin.icon} alt={coin.name} className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[8px] text-zinc-400">
                                {coin.symbol.slice(0, 2)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-white text-[11px] truncate max-w-[80px]">{coin.name}</div>
                              <div className="text-[9px] text-slate-500 font-mono tracking-tight font-black">{coin.symbol}</div>
                            </div>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-2 px-3 font-mono font-medium tabular-nums text-slate-300">
                          {h.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </td>

                        {/* Cost & current prices */}
                        <td className="py-2 px-2.5 font-mono text-slate-450 tabular-nums text-[10px]">
                          <div>b: ${h.buyPriceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div>
                          <div className="text-emerald-400 flex items-center gap-0.5">
                            c: ${pData.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </div>
                        </td>

                        {/* Total Net value in selected currency */}
                        <td className="py-2 px-3 font-mono font-bold text-white tabular-nums">
                          {currencySymbol}{convertUsdVal(curValUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* PNL absolute and % */}
                        <td className="py-2 px-3 font-mono tabular-nums">
                          <span className={`font-bold flex items-center gap-0.5 text-[11px] ${plUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {plUsd >= 0 ? '+' : ''}
                            {convertUsdVal(plUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className={`text-[9px] px-1 py-0.2 rounded font-bold inline-block ${plUsd >= 0 ? 'bg-emerald-950/40 text-emerald-300' : 'bg-rose-950/40 text-rose-300'}`}>
                            {plUsd >= 0 ? '+' : ''}{plPct.toFixed(1)}%
                          </span>
                        </td>

                        {/* Analyst Rating consensus chip */}
                        <td className="py-2 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono border ${
                              rating.action === 'STRONG BUY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                              rating.action === 'BUY' ? 'bg-emerald-500/5 text-emerald-300 border-emerald-500/10' :
                              rating.action === 'SELL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                              'bg-slate-900 text-slate-400 border-slate-800'
                            }`}>
                              {rating.action}
                            </span>
                            <span className="text-[8px] text-slate-500 font-mono">
                              {rating.strength}%
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleStartEdit(idx)}
                              className="p-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 rounded transition-colors cursor-pointer"
                              title="Edit position basis"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteHolding(idx)}
                              className="p-1 bg-rose-950/30 border border-rose-900/30 text-rose-400 hover:text-rose-300 hover:bg-rose-900/60 rounded transition-colors cursor-pointer"
                              title="Close position"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Allocation Chart (Pie) & AI Expert review (4 cols) */}
        <div className="p-4 lg:col-span-4 bg-slate-950/20 space-y-4 font-sans">
          
          {/* ASSET ALLOCATION DOUGHNUT */}
          <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-900 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-300 flex items-center gap-1">
              <ChartPie className="w-3.5 h-3.5 text-indigo-400" />
              Asset Weight Distribution
            </h3>
            
            {holdings.length === 0 ? (
              <div className="text-center text-[10px] text-slate-500 py-4 font-mono leading-relaxed">
                No graphical allocation. Connect tokens.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-4">
                
                {/* SVG doughnut rendering */}
                <div className="relative w-32 h-32 shrink-0">
                  <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                    {/* Inner empty radius for doughnut */}
                    <circle cx="80" cy="80" r="44" fill="#030712" className="z-10 relative" />
                    {doughnutSlices.map((slice, idx) => (
                      <path 
                        key={idx}
                        d={slice.path}
                        fill={slice.color}
                        className="hover:opacity-80 transition-opacity cursor-pointer duration-200"
                      >
                        <title>{`${slice.name}: ${slice.pct.toFixed(1)}%`}</title>
                      </path>
                    ))}
                    {/* Center mask */}
                    <circle cx="80" cy="80" r="44" fill="#030712" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] uppercase font-bold text-slate-500 font-mono tracking-wider">Weightings</span>
                    <span className="text-[10px] font-bold text-slate-400 font-sans">{allocation.length} Assets</span>
                  </div>
                </div>

                {/* legend items */}
                <div className="flex-1 space-y-1 w-full">
                  {allocation.slice(0, 5).map((item, idx) => (
                    <div key={item.coinId} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 font-medium">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-300 font-bold">{item.symbol}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 font-bold tabular-nums">{item.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                  {allocation.length > 5 && (
                    <div className="text-center text-[9px] text-slate-505 italic mt-0.5 font-mono">
                      + {allocation.length - 5} minor holdings inside pool
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI DIAGNOSTICS DISPATCH BOX */}
          <div className="bg-indigo-950/10 border border-indigo-505/10 p-3.5 rounded-lg relative space-y-3 font-sans">
            <span className="absolute top-2 right-2 text-[8px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-bold font-mono px-1 py-0.2">
              Expert Feed
            </span>

            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-white flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                AI Analyst Portfolio Audit
              </h3>
              <p className="text-[10px] text-slate-400 leading-normal">
                Submit raw weightings to Gemini model for hedge-fund level risk, tactical rebalancing, and correlation scores.
              </p>
            </div>

            <button
              onClick={handleGenerateDiagnosis}
              disabled={isGeneratingAiReport || holdings.length === 0}
              className="w-full py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-lg text-[10px] shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGeneratingAiReport ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-white" />
                  <span>Analyzing Holdings...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-3 h-3" />
                  <span>Generate AI Portfolio Diagnosis</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* DETAILED DIAGNOSTIC REPORT FLYOUT PANEL */}
      <AnimatePresence>
        {aiReport && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="border-t border-slate-900 bg-slate-950 p-4 space-y-3 relative font-sans"
          >
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-xs">Hedge-Fund Audit Diagnostic Report</h3>
              </div>
              <button
                onClick={() => setAiReport(null)}
                className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 hover:text-white rounded text-[9px] text-slate-400 transition-all font-bold cursor-pointer"
                title="Dismiss Report"
              >
                ✕ Close Report
              </button>
            </div>

            {/* Markdown presentation */}
            <div className="prose prose-invert prose-xs text-[11px] text-slate-300 leading-normal max-w-none space-y-2 max-h-[350px] overflow-y-auto scrollbar-thin p-1 pr-3">
              <ReactMarkdown>{aiReport}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ERRORS */}
      {aiError && (
        <div className="bg-rose-950/30 border-t border-rose-900 text-rose-300 flex items-center gap-1.5 p-3 text-[10px] font-medium font-sans">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Error processing analyst diagnostics: {aiError}</span>
        </div>
      )}
    </div>
  );
};
