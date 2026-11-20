import React, { useState, useEffect, useMemo } from 'react';
import { PriceData } from '../../crypto-types';
import { generateResponse } from '../../services/gemini';
import { 
  Plus, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign, Wallet, 
  Sparkles, Check, X, Search, Info, Award, ChartPie, RefreshCw, 
  MessageSquare, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { SEED_STOCKS } from '../../constants/stocks';
import { saveDocToFirestore, getDocsFromFirestore, deleteDocFromFirestore } from '../../services/storage';

interface Holding {
  stockId: string;
  amount: number;
  buyPriceUsd: number;
}

interface StockPortfolioTrackerProps {
  stocks: { id: string, name: string, symbol: string, icon: string, seedPrice: number, sector?: string }[];
  externalPrices?: Record<string, PriceData>;
  externalSekRate?: number;
}

export const StockPortfolioTracker: React.FC<StockPortfolioTrackerProps> = ({
  stocks = [],
  externalPrices = {},
  externalSekRate = 10.65
}) => {
  // Holdings state
  const [holdings, setHoldings] = useState<Holding[]>(() => {
    const saved = localStorage.getItem('stock_portfolio_holdings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse stock portfolio holdings', e);
      }
    }
    // Default initial holdings (starts with zero assets)
    return [];
  });

  // Currency Selection
  const [currency, setCurrency] = useState<'USD' | 'SEK'>(() => {
    return (localStorage.getItem('stock_portfolio_currency') as any) || 'USD';
  });

  // Rates and Prices State
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [sekRate, setSekRate] = useState<number>(externalSekRate);

  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStockId, setSelectedStockId] = useState<string>('aapl');
  const [amountStr, setAmountStr] = useState('');
  const [purchasePriceUsdStr, setPurchasePriceUsdStr] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingId, setIsEditingId] = useState<number | null>(null);

  // AI Analyst Diagnosis State
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Sync internal rates with external if they change
  useEffect(() => {
    if (externalPrices) {
      setPrices(externalPrices);
    }
    if (externalSekRate) {
      setSekRate(externalSekRate);
    }
  }, [externalPrices, externalSekRate]);

  // Fetch from Firestore on mount
  useEffect(() => {
    const fetchFromFirestore = async () => {
      try {
        const firestoreDocs = await getDocsFromFirestore('stock_holdings');
        if (firestoreDocs && firestoreDocs.length > 0) {
          const parsed = firestoreDocs.map(item => ({
            stockId: item.stockId || item.id,
            amount: Number(item.amount),
            buyPriceUsd: Number(item.buyPriceUsd)
          }));
          setHoldings(parsed);
        }
      } catch (e) {
        console.warn('Failed to load stock holdings from Firestore: ', e);
      }
    };
    fetchFromFirestore();
  }, []);

  // Save holdings
  useEffect(() => {
    localStorage.setItem('stock_portfolio_holdings', JSON.stringify(holdings));
    
    const saveToFirestore = async () => {
      try {
        await saveDocToFirestore('settings', 'stock_holdings_backup', { holdings });
        for (const h of holdings) {
          await saveDocToFirestore('stock_holdings', h.stockId, {
            stockId: h.stockId,
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
    localStorage.setItem('stock_portfolio_currency', currency);
  }, [currency]);

  // Set default buy price when user selects a stock in the dropdown or toggles add certificate slip
  useEffect(() => {
    if (isEditingId !== null) return;
    const stockInfo = stocks.find(s => s.id === selectedStockId);
    const currentPrice = prices[selectedStockId]?.usd ?? stockInfo?.seedPrice ?? 100;
    setPurchasePriceUsdStr(currentPrice.toString());
  }, [selectedStockId, prices, stocks, isEditingId, isAdding]);

  // Search filter for selector
  const filteredStocks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return stocks.filter(s => 
      s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q)
    );
  }, [stocks, searchQuery]);

  // Calculations helper
  const currencySymbol = useMemo(() => {
    if (currency === 'SEK') return 'kr';
    return '$';
  }, [currency]);

  const convertUsdVal = (usdVal: number) => {
    if (currency === 'SEK') {
      return usdVal * sekRate;
    }
    return usdVal;
  };

  const formattedValue = (usdVal: number) => {
    const val = convertUsdVal(usdVal);
    if (currency === 'SEK') {
      return `${Math.round(val).toLocaleString('sv-SE')} kr`;
    }
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Portfolio aggregates
  const portfolioStats = useMemo(() => {
    let totalValueUsd = 0;
    let totalCostUsd = 0;
    let activeHoldingsCount = 0;

    const items = holdings.map(h => {
      const stockInfo = stocks.find(s => s.id === h.stockId);
      const symbol = stockInfo?.symbol || 'STOCK';
      const name = stockInfo?.name || 'Unknown Security';
      const currentPriceUsd = prices[h.stockId]?.usd || stockInfo?.seedPrice || 100;
      
      const valueUsd = h.amount * currentPriceUsd;
      const costUsd = h.amount * h.buyPriceUsd;
      const profitLossUsd = valueUsd - costUsd;
      const profitLossPct = costUsd > 0 ? (profitLossUsd / costUsd) * 100 : 0;
      
      totalValueUsd += valueUsd;
      totalCostUsd += costUsd;
      if (h.amount > 0) activeHoldingsCount++;

      return {
        ...h,
        symbol,
        name,
        currentPrice: currentPriceUsd,
        valueUsd,
        costUsd,
        profitLossUsd,
        profitLossPct,
        icon: stockInfo?.icon
      };
    });

    const totalPLUsd = totalValueUsd - totalCostUsd;
    const totalPLPct = totalCostUsd > 0 ? (totalPLUsd / totalCostUsd) * 100 : 0;

    return {
      items,
      totalValue: totalValueUsd,
      totalCost: totalCostUsd,
      totalPL: totalPLUsd,
      totalPLPct,
      activeHoldingsCount
    };
  }, [holdings, stocks, prices]);

  // Percentage allocation and doughnut slice coordinates computation
  const allocation = useMemo(() => {
    const total = portfolioStats.totalValue;
    if (total === 0) return [];

    const colors = [
      '#3b82f6', // blue
      '#10b981', // emerald
      '#a855f7', // purple
      '#f59e0b', // amber
      '#f43f5e', // rose
      '#06b6d4', // cyan
      '#ec4899', // pink
      '#84cc16'  // lime
    ];

    return portfolioStats.items
      .filter(item => item.valueUsd > 0)
      .map((item, idx) => ({
        stockId: item.stockId,
        symbol: item.symbol,
        valueUsd: item.valueUsd,
        pct: (item.valueUsd / total) * 100,
        color: colors[idx % colors.length]
      }))
      .sort((a, b) => b.valueUsd - a.valueUsd);
  }, [portfolioStats, currency]);

  // Generate SVG coordinates for Doughnut
  const doughnutSlices = useMemo(() => {
    let accumulatedAngle = 0;
    const r = 50; 
    const cx = 80;
    const cy = 80;

    return allocation.map((item) => {
      const angle = (item.pct / 100) * 360;
      
      // Calculate start and end coordinates
      const startRad = (accumulatedAngle * Math.PI) / 180;
      const endRad = ((accumulatedAngle + angle) * Math.PI) / 180;
      
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      // Path description
      const path = `
        M ${cx} ${cy}
        L ${x1} ${y1}
        A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}
        Z
      `;

      accumulatedAngle += angle;
      return {
        ...item,
        path
      };
    });
  }, [allocation]);

  // Handle addition
  const handleAddHolding = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr);
    const buyPrice = parseFloat(purchasePriceUsdStr);

    if (!selectedStockId || isNaN(amount) || amount <= 0 || isNaN(buyPrice) || buyPrice <= 0) {
      return;
    }

    if (isEditingId !== null) {
      // Modify existing
      const updated = [...holdings];
      updated[isEditingId] = {
        stockId: selectedStockId,
        amount,
        buyPriceUsd: buyPrice
      };
      setHoldings(updated);
      setIsEditingId(null);
    } else {
      // Check if item already exists inside portfolio
      const existingIdx = holdings.findIndex(h => h.stockId === selectedStockId);
      if (existingIdx !== -1) {
        // Compound holdings
        const updated = [...holdings];
        const oldH = updated[existingIdx];
        const newAmount = oldH.amount + amount;
        const newBuyPrice = ((oldH.amount * oldH.buyPriceUsd) + (amount * buyPrice)) / newAmount;
        updated[existingIdx] = {
          stockId: selectedStockId,
          amount: newAmount,
          buyPriceUsd: newBuyPrice
        };
        setHoldings(updated);
      } else {
        // Add new
        setHoldings([...holdings, { stockId: selectedStockId, amount, buyPriceUsd: buyPrice }]);
      }
    }

    // Reset inputs
    setAmountStr('');
    setSearchQuery('');
    setIsAdding(false);
  };

  // Delete transaction
  const handleDeleteHolding = async (idx: number) => {
    const target = holdings[idx];
    if (target) {
      const updated = holdings.filter((_, i) => i !== idx);
      setHoldings(updated);
      try {
        await deleteDocFromFirestore('stock_holdings', target.stockId);
      } catch (e) {
        console.warn('Failed to delete stock holding from Firestore:', e);
      }
    }
  };

  // Launch editing flow
  const handleEditHolding = (idx: number) => {
    const target = holdings[idx];
    setSelectedStockId(target.stockId);
    setAmountStr(target.amount.toString());
    setPurchasePriceUsdStr(target.buyPriceUsd.toString());
    setIsEditingId(idx);
    setIsAdding(true);
  };

  // Audit using Gemini
  const handleGenerateDiagnosis = async () => {
    if (holdings.length === 0) return;
    setIsGeneratingAiReport(true);
    setAiReport(null);
    setAiError(null);

    const holdingDescriptions = portfolioStats.items.map(i => 
      `- ${i.name} (${i.symbol}): ${i.amount.toLocaleString()} Shares @ $${i.buyPriceUsd.toFixed(2)} Purchase Cost (Current price: $${i.currentPrice.toFixed(2)})`
    ).join('\n');

    const totalValUsd = portfolioStats.totalValue;
    const totalPLUsd = portfolioStats.totalPL;
    const totalPLPct = portfolioStats.totalPLPct;

    const query = `
      You are an elite, highly critical global macro hedge fund portfolio manager.
      Please evaluate the following manual Nasdaq 500 stock portfolio holdings and generate an expert structural audit and rebalancing diagnosis.
      
      Equities Holdings:
      ${holdingDescriptions}
      
      Equities Macro Statistics:
      - Total Asset Allocation Net Worth: $${totalValUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      - Total Book Value Cost Basis: $${(totalValUsd - totalPLUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      - Total Profit & Loss (P&L): $${totalPLUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${totalPLPct.toFixed(1)}%)
      
      Generate a professional report with the following specific sections (using clean, sleek markdown formatting without self-praise):
      1. **EQUITY ALLOCATION VERDICT**: Verdict regarding the current distribution of these specific Nasdaq growth assets.
      2. **DIVERSIFICATION SCORECARD**: Critical analysis of asset distribution, highlighting any over-concentrations in specific megacaps.
      3. **REBALANCING MANIFESTO**: Next actionable tactical changes or rebalancing ratios to optimize downside resistance index.
      
      Be concise, direct, professional, objective, and realistic. Keep instructions highly specific to the equites provided above.
    `;

    try {
      const result = await generateResponse(query, [], [], 'gemini-3.8-flash');
      setAiReport(result.text);
    } catch (err: any) {
      console.error('Failed to generate stock portfolio diagnostic', err);
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
          <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-white flex items-center gap-1.5">
              US Nasdaq 500 Asset Tracker
              <span className="text-[8px] uppercase bg-blue-500/25 text-blue-300 font-bold border border-blue-500/30 px-1.5 py-0.1 rounded">
                Active
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">Manual share-basis performance calculator</p>
          </div>
        </div>

        <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-900 shrink-0">
          <button 
            onClick={() => setCurrency('USD')} 
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${currency === 'USD' ? 'bg-blue-600 text-white shadow shadow-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            USD ($)
          </button>
          <button 
            onClick={() => setCurrency('SEK')} 
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${currency === 'SEK' ? 'bg-blue-600 text-white shadow shadow-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            SEK (kr)
          </button>
        </div>
      </div>

      {/* CORE PORTFOLIO KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-900 border-b border-slate-900 bg-slate-950/40">
        <div className="p-4 space-y-0.5 hover:bg-slate-900/10 transition-colors">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Asset Allocation Value</div>
          <div className="text-xl font-mono font-bold text-white tabular-nums">
            {formattedValue(portfolioStats.totalValue)}
          </div>
          <p className="text-[9px] text-slate-500 font-sans italic">
            Rebalancing index represents <span className="text-emerald-400 font-semibold">fully fluid</span> ratios
          </p>
        </div>

        <div className="p-4 space-y-0.5 hover:bg-slate-900/10 transition-colors">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Calculated Balance Cost Basis</div>
          <div className="text-xl font-mono font-bold text-slate-300 tabular-nums">
            {formattedValue(portfolioStats.totalCost)}
          </div>
          <p className="text-[9px] text-slate-500 font-sans italic">
            Manual aggregate purchase parameters
          </p>
        </div>

        <div className="p-4 space-y-0.5 hover:bg-slate-900/10 transition-colors">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Profit / Losses</div>
          <div className={`text-xl font-mono font-bold tabular-nums flex items-center gap-1.5 ${portfolioStats.totalPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span>{portfolioStats.totalPL >= 0 ? '+' : ''}{formattedValue(portfolioStats.totalPL)}</span>
          </div>
          <div className={`text-[9px] font-bold ${portfolioStats.totalPL >= 0 ? 'text-emerald-500' : 'text-rose-400'} italic`}>
            {portfolioStats.totalPL >= 0 ? '▲' : '▼'} {Math.abs(portfolioStats.totalPLPct).toFixed(2)}% Performance
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-900">
        
        {/* LEFT COLUMN: LIST OF ASSET HOLDINGS (8 Columns) */}
        <div className="lg:col-span-8 p-4 space-y-4 font-sans">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Monitored Equities Holdings</h3>
            <button
              onClick={() => {
                setIsEditingId(null);
                setAmountStr('');
                setIsAdding(!isAdding);
              }}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-md"
            >
              {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {isAdding ? 'Close Portal' : 'Add Share Acquisition'}
            </button>
          </div>

          {/* ACQUISITION SLIP FORM */}
          <AnimatePresence>
            {isAdding && (
              <motion.form 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleAddHolding}
                className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-3.5"
              >
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  {isEditingId !== null ? 'Modify Equities Certificate' : 'Log Share Certificate Acquisition'}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  
                  {/* Stock Ticker Search Selector */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Select Share Asset</label>
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search supported stocks..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-950 text-[11px] text-white pl-8 pr-2 py-1.5 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 font-sans"
                        />
                      </div>
                      <select
                        value={selectedStockId}
                        onChange={(e) => setSelectedStockId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-blue-500 font-sans"
                      >
                        {filteredStocks.map(s => {
                          const seedMatch = SEED_STOCKS.find(orig => orig.id === s.id);
                          const resolvedSector = s.sector || seedMatch?.sector || 'Other';
                          const change_24h = prices[s.id]?.usd_24h_change ?? 0;
                          return (
                            <option key={s.id} value={s.id}>
                              {s.symbol} - {s.name} [{resolvedSector}] ({change_24h >= 0 ? '+' : ''}{change_24h.toFixed(2)}%)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Purchased Quantity</label>
                    <input 
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 15"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-blue-500 placeholder-slate-800"
                    />
                  </div>

                  {/* Buy Price Index */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Book Cost Basis (USD Price / Share)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[11px] text-slate-500">$</span>
                      <input 
                        type="number"
                        step="any"
                        required
                        placeholder="e.g. 185.50"
                        value={purchasePriceUsdStr}
                        onChange={(e) => setPurchasePriceUsdStr(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-6 pr-3 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsAdding(false);
                      setIsEditingId(null);
                    }}
                    className="px-3 py-1.5 border border-slate-800 hover:bg-slate-850 rounded-lg text-[10px] text-slate-400 cursor-pointer hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] text-white font-bold cursor-pointer"
                  >
                    {isEditingId !== null ? 'Modify Parameters' : 'Lock Transaction Certificate'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* HOLDINGS DATAGRID */}
          {portfolioStats.items.length === 0 ? (
            <div className="py-8 text-center space-y-2 bg-slate-900/10 border border-slate-905 rounded-lg border-dashed">
              <ShieldAlert className="w-6 h-6 text-slate-700 mx-auto" />
              <div>
                <h4 className="text-white text-xs font-bold uppercase tracking-wider">Securities Board Vacant</h4>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mt-0.5 font-mono">Manual ledger is empty. Click add above to document stock weights</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto bg-slate-900/20 border border-slate-900 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-[9px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                    <th className="py-2 px-3 pl-4">Asset</th>
                    <th className="py-2 px-3 text-right">Shares Held</th>
                    <th className="py-2 px-3 text-right">Basis Cost (USD)</th>
                    <th className="py-2 px-3 text-right">Current Price</th>
                    <th className="py-2 px-3 text-right">Net Balance</th>
                    <th className="py-2 px-3 text-right">Acquisition P&L</th>
                    <th className="py-2 pr-4 text-center">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-[11px] font-medium font-sans">
                  {portfolioStats.items.map((item, idx) => {
                    const plIsUp = item.profitLossUsd >= 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-900/15 group transition-all">
                        <td className="py-2 px-3 pl-4">
                          <div className="flex items-center gap-2">
                            {item.icon ? (
                              <img src={item.icon} alt={item.symbol} className="w-5 h-5 object-contain rounded" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-400 font-mono">
                                {item.symbol.slice(0,2)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-white text-[11px]">{item.symbol}</div>
                              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wide truncate max-w-[90px]">{item.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-slate-300">
                          {item.amount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-400 text-[10px]">
                          ${item.buyPriceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-blue-400 font-semibold text-[10px]">
                          ${item.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-white">
                          {formattedValue(item.valueUsd)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">
                          <div className={plIsUp ? 'text-emerald-400 text-[11px]' : 'text-rose-400 text-[11px]'}>
                            {plIsUp ? '+' : ''}{formattedValue(item.profitLossUsd)}
                          </div>
                          <div className={`text-[9px] font-bold ${plIsUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {plIsUp ? '▲' : '▼'}{Math.abs(item.profitLossPct).toFixed(2)}%
                          </div>
                        </td>
                        <td className="py-2 pr-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEditHolding(idx)}
                              className="p-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white transition-all cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteHolding(idx)}
                              className="p-1 bg-slate-950 hover:bg-rose-950/60 border border-slate-850 hover:border-rose-900 text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
                              title="Delete"
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

        {/* RIGHT COLUMN: ALLOCATION & AI DIAGNOSIS (4 Columns) */}
        <div className="lg:col-span-4 p-4 space-y-4 font-sans">
          
          {/* ASSET ALLOCATION DOUGHNUT */}
          <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-900 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
              <ChartPie className="w-3.5 h-3.5 text-blue-400" />
              Asset Weight Distribution
            </h3>
            
            {holdings.length === 0 ? (
              <div className="text-center text-[10px] text-slate-500 py-4 font-mono leading-relaxed">
                No graphical allocation. Connect live securities.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-4">
                
                {/* SVG doughnut rendering */}
                <div className="relative w-32 h-32 shrink-0">
                  <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="44" fill="#030712" className="z-10 relative" />
                    {doughnutSlices.map((slice, idx) => (
                      <path 
                        key={idx}
                        d={slice.path}
                        fill={slice.color}
                        className="hover:opacity-80 transition-opacity cursor-pointer duration-200"
                      >
                        <title>{`${slice.symbol}: ${slice.pct.toFixed(1)}%`}</title>
                      </path>
                    ))}
                    <circle cx="80" cy="80" r="44" fill="#030712" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] uppercase font-bold text-slate-500 font-mono tracking-wider">Weightings</span>
                    <span className="text-[10px] font-semibold text-slate-400 font-sans">{allocation.length} Assets</span>
                  </div>
                </div>

                {/* legend items */}
                <div className="flex-1 space-y-1 w-full text-xs">
                  {allocation.slice(0, 5).map((item) => (
                    <div key={item.stockId} className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-300 font-bold text-[11px]">{item.symbol}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 font-bold tabular-nums">{item.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                  {allocation.length > 5 && (
                    <div className="text-center text-[9px] text-slate-500 italic mt-0.5 font-mono">
                      + {allocation.length - 5} minor holdings inside pool
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI DIAGNOSTICS DISPATCH BOX */}
          <div className="bg-blue-950/10 border border-blue-500/10 p-3 rounded-lg relative space-y-3 font-sans">
            <span className="absolute top-2 right-2 text-[8px] bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded font-bold font-mono px-1 py-0.2">
              Gemini Advisor
            </span>

            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-white flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                AI Shareholder Audit
              </h3>
              <p className="text-[10px] text-slate-400 leading-normal">
                Submit raw holdings weightings to the Gemini model for index-level variance, tactical rebalancing, and sector diversified scoring.
              </p>
            </div>

            <button
              onClick={handleGenerateDiagnosis}
              disabled={isGeneratingAiReport || holdings.length === 0}
              className="w-full py-1.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold rounded-lg text-[10px] shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGeneratingAiReport ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-white" />
                  <span>Analyzing Positions...</span>
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

      {/* AI ANALYSIS OUTPUT PANEL */}
      <AnimatePresence>
        {aiReport && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-slate-900/60 border-t border-slate-900 font-sans"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-blue-500/10 rounded border border-blue-500/20 text-blue-450">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-white">Equities Portfolio Diagnostic Report</h4>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none">Multi-Factor Analysis Dispatch</p>
                </div>
              </div>
              <button
                onClick={() => setAiReport(null)}
                className="px-2 py-0.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-[9px] text-slate-400 rounded transition-colors cursor-pointer"
              >
                ✕ Close Report
              </button>
            </div>

            <div className="markdown-body text-[11px] text-slate-350 leading-relaxed space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin p-1 pr-3">
              <ReactMarkdown>{aiReport}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aiError && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 bg-rose-955/20 border-t border-rose-900 text-rose-300 text-[10px] font-semibold flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-450 shrink-0" />
            <span>AI Diagnostic Failed: {aiError}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
};
