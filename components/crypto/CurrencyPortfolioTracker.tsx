import React, { useState, useEffect, useMemo } from 'react';
import { ForexPair, FOREX_PAIRS } from '../../constants/forex';
import { saveDocToFirestore, getDocsFromFirestore, deleteDocFromFirestore } from '../../services/storage';
import { 
  Calculator, Plus, Check, Trash2, Wallet, TrendingUp, TrendingDown, 
  Activity, Sparkles, Loader2, DollarSign
} from 'lucide-react';

interface ForexPosition {
  id: string;
  pairId: string; // e.g. "eur-usd"
  amount: number; // e.g. 5000 units
  buyPrice: number; // e.g. 1.0850 entry Price
  addedAt: string;
}

interface CurrencyPortfolioTrackerProps {
  pairs: ForexPair[];
  prices: Record<string, number>; // Live prices of pairs (e.g. {"eur-usd": 1.0825})
  change24hs: Record<string, number>; // Live 24h change (%)
  sekRate: number; // USD/SEK rate
}

export const CurrencyPortfolioTracker: React.FC<CurrencyPortfolioTrackerProps> = ({
  pairs = FOREX_PAIRS,
  prices,
  change24hs,
  sekRate
}) => {
  // Holdings positions list state
  const [positions, setPositions] = useState<ForexPosition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Preference for display currency
  const [currency, setCurrency] = useState<'USD' | 'SEK'>('SEK');

  // Transaction form states
  const [selectedPairId, setSelectedPairId] = useState<string>('eur-usd');
  const [positionSizeStr, setPositionSizeStr] = useState<string>('');
  const [entryPriceStr, setEntryPriceStr] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  
  // AI report states
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const selectedPair = useMemo(() => pairs.find(p => p.id === selectedPairId) || pairs[0], [pairs, selectedPairId]);

  // Load entry rate based on selected forex pair
  useEffect(() => {
    if (selectedPair) {
      const activePrice = prices[selectedPair.id] || 1.00;
      setEntryPriceStr(activePrice.toFixed(selectedPair.quoteSymbol === 'JPY' ? 2 : 4));
    }
  }, [selectedPairId, prices, selectedPair]);

  // 1. Fetch positions from Firebase on mount
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const settingsDocs = await getDocsFromFirestore('settings');
        const savedDoc = settingsDocs.find(d => d.id === 'forex_holdings');
        
        if (savedDoc) {
          const rawPositions = savedDoc.positions || [];
          const formatted = rawPositions.map((d: any) => ({
            id: d.id,
            pairId: d.pairId || d.pair || 'eur-usd',
            amount: Number(d.amount),
            buyPrice: Number(d.buyPrice || d.entry_price),
            addedAt: d.addedAt || new Date().toISOString()
          }));
          setPositions(formatted);
        } else {
          const firestorePositions = await getDocsFromFirestore('forex_holdings');
          if (firestorePositions && firestorePositions.length > 0) {
            // Parse format
            const formatted = firestorePositions.map(d => ({
              id: d.id,
              pairId: d.pairId || d.pair || 'eur-usd',
              amount: Number(d.amount),
              buyPrice: Number(d.buyPrice || d.entry_price),
              addedAt: d.addedAt || new Date().toISOString()
            }));
            setPositions(formatted);
          } else {
            // Initialize with excellent onboarding default positions
            const defaults: ForexPosition[] = [
              { id: 'pos_1', pairId: 'usd-sek', amount: 5000, buyPrice: 10.4500, addedAt: new Date().toISOString() },
              { id: 'pos_2', pairId: 'eur-usd', amount: 10000, buyPrice: 1.0850, addedAt: new Date().toISOString() }
            ];
            setPositions(defaults);
            await saveDocToFirestore('settings', 'forex_positions_backup', { positions: defaults });
            await saveDocToFirestore('settings', 'forex_holdings', { positions: defaults });
          }
        }
      } catch (e) {
        console.warn("Failed loading from Firestore, reading local:", e);
        // Fallback to local
        const local = localStorage.getItem('forex_portfolio_positions');
        if (local) {
          try {
            setPositions(JSON.parse(local));
          } catch (_) {}
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPositions();
  }, []);

  // 2. Sync to browser storage + Firebase on updates
  const syncPositionsWithStores = async (updated: ForexPosition[]) => {
    setPositions(updated);
    localStorage.setItem('forex_portfolio_positions', JSON.stringify(updated));
    // Persist as a backup setting document
    await saveDocToFirestore('settings', 'forex_holdings', { positions: updated });
    
    // Also save individual records in the firestore collections for SQL-Blueprint replication compatibility
    try {
      // Direct batch or sequential saves to 'forex_holdings/{holdingId}'
      for (const pos of updated) {
        await saveDocToFirestore('forex_holdings', pos.id, {
          pairId: pos.pairId,
          amount: pos.amount,
          buyPrice: pos.buyPrice,
          addedAt: pos.addedAt
        });
      }
    } catch (e) {
      console.warn("Sub-collection forex sync error deferred:", e);
    }
  };

  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(positionSizeStr);
    const buyPrice = Number(entryPriceStr);

    if (isNaN(amount) || amount <= 0 || isNaN(buyPrice) || buyPrice <= 0) {
      alert("Please specify valid Position size units and entry rate.");
      return;
    }

    setIsAdding(true);
    const newPos: ForexPosition = {
      id: `pos_${Date.now()}`,
      pairId: selectedPairId,
      amount,
      buyPrice,
      addedAt: new Date().toISOString()
    };

    const updated = [...positions, newPos];
    await syncPositionsWithStores(updated);
    setPositionSizeStr('');
    setIsAdding(false);
  };

  const handleRemovePosition = async (id: string) => {
    const updated = positions.filter(p => p.id !== id);
    await syncPositionsWithStores(updated);
    try {
      await deleteDocFromFirestore('forex_holdings', id);
    } catch (e) {
      console.warn("Error deleting position from Firestore collection:", e);
    }
  };

  // Portfolio calculations
  const portfolioStats = useMemo(() => {
    let totalCostUsd = 0;
    let totalCurrentValueUsd = 0;
    let totalProfitUsd = 0;

    positions.forEach(pos => {
      const pair = pairs.find(p => p.id === pos.pairId);
      if (!pair) return;

      const livePrice = prices[pos.pairId] || pos.buyPrice;
      const initialRate = pos.buyPrice;
      
      // Calculate sizes in base currency & quote currency returns
      // Note: Position size is in BASE currency units.
      // e.g. for EUR/USD, we hold EUR. Initial cost in USD is EUR * initialRate. Current value is EUR * livePrice
      let initialCostUsd = 0;
      let currentValueUsd = 0;

      if (pair.quoteSymbol === 'USD') {
        initialCostUsd = pos.amount * initialRate;
        currentValueUsd = pos.amount * livePrice;
      } else if (pair.quoteSymbol === 'SEK') {
        initialCostUsd = (pos.amount * initialRate) / sekRate;
        currentValueUsd = (pos.amount * livePrice) / sekRate;
      } else if (pair.quoteSymbol === 'JPY') {
        initialCostUsd = (pos.amount * initialRate) / livePrice; // approx
        currentValueUsd = (pos.amount * livePrice) / livePrice;
      } else {
        initialCostUsd = pos.amount * initialRate;
        currentValueUsd = pos.amount * livePrice;
      }

      totalCostUsd += initialCostUsd;
      totalCurrentValueUsd += currentValueUsd;
    });

    totalProfitUsd = totalCurrentValueUsd - totalCostUsd;
    const profitPercent = totalCostUsd > 0 ? (totalProfitUsd / totalCostUsd) * 100 : 0;

    return {
      costUsd: totalCostUsd,
      valueUsd: totalCurrentValueUsd,
      profitUsd: totalProfitUsd,
      profitPercent,
      costSek: totalCostUsd * sekRate,
      valueSek: totalCurrentValueUsd * sekRate,
      profitSek: totalProfitUsd * sekRate
    };
  }, [positions, pairs, prices, sekRate]);

  // AI report fueled by Gemini
  const handleGenerateAIReport = async () => {
    if (positions.length === 0) {
      setAiError("Add currency positions before invoking AI analysis.");
      return;
    }

    setIsGeneratingReport(true);
    setAiError(null);
    setAiReport(null);

    try {
      // Map holdings textually
      const parsedHoldings = positions.map(pos => {
        const pair = pairs.find(p => p.id === pos.pairId);
        const livePrice = prices[pos.pairId] || pos.buyPrice;
        const pnl = pos.amount * (livePrice - pos.buyPrice);
        return `- ${pair ? pair.name : pos.pairId}: Size: ${pos.amount.toLocaleString()} units, Entry: ${pos.buyPrice}, Live: ${livePrice}, PnL (Quote Units): ${pnl.toFixed(4)}`;
      }).join('\n');

      const systemPrompt = `You are an elite institutional Forex trading analyst specializing in macro currencies, central bank rates, and risk management. 
Provide a concise, professional diagnosis of this client's Forex currency portfolio. 
Focus your recommendations on support/resistance zones, the USD/SEK index relationship, and capital allocations. 
Highlight exact profit targets and stop-losses in Swedish Krona (SEK). Use elegant, informative, data-rich tone.`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const saved = localStorage.getItem('gemini_media_aggregator_settings');
        if (saved) {
          const settings = JSON.parse(saved);
          if (settings.geminiApiKey) {
            headers['x-gemini-key'] = settings.geminiApiKey;
          }
        }
      } catch (e) {
        console.warn("Failed to retrieve custom Gemini API key from settings", e);
      }

      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text: `${systemPrompt}\n\nClient Active Positions:\n${parsedHoldings}\n\nCurrent USD/SEK Exchange Rate: ${sekRate} SEK per USD.`
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Technical failure ${response.status}`);
      }

      const resJson = await response.json();
      const text = resJson.text || "No response received.";
      setAiReport(text);
    } catch (e: any) {
      setAiError(e.message || "An error occurred compiling the dashboard diagnostics.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tracker Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Total Cost Basis</div>
            <div className="text-xl font-bold font-mono text-white leading-none mt-1">
              {currency === 'SEK' 
                ? `${Math.round(portfolioStats.costSek).toLocaleString()} kr` 
                : `$${Math.round(portfolioStats.costUsd).toLocaleString()}`}
            </div>
          </div>
          <div className="p-2 bg-slate-800/80 rounded-lg text-slate-400">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Market Value</div>
            <div className="text-xl font-bold font-mono text-white leading-none mt-1">
              {currency === 'SEK' 
                ? `${Math.round(portfolioStats.valueSek).toLocaleString()} kr` 
                : `$${Math.round(portfolioStats.valueUsd).toLocaleString()}`}
            </div>
          </div>
          <div className="p-2 bg-slate-800/80 rounded-lg text-slate-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between col-span-2 sm:col-span-1">
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Total P&L (Unrealized)</div>
            <div className={`text-xl font-bold font-mono flex items-center gap-1 leading-none mt-1 ${portfolioStats.profitUsd >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
              {portfolioStats.profitUsd >= 0 ? '+' : ''}
              {currency === 'SEK' 
                ? `${Math.round(portfolioStats.profitSek).toLocaleString()} kr` 
                : `$${Math.round(portfolioStats.profitUsd).toLocaleString()}`}
            </div>
          </div>
          <div className={`p-2 rounded-lg ${portfolioStats.profitUsd >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {portfolioStats.profitUsd >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between col-span-2 sm:col-span-1">
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Net Return Rate</div>
            <div className={`text-xl font-bold font-mono leading-none mt-1 ${portfolioStats.profitPercent >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
              {portfolioStats.profitPercent === 0 ? '' : portfolioStats.profitPercent >= 0 ? '+' : ''}
              {portfolioStats.profitPercent.toFixed(2)}%
            </div>
          </div>
          <div className="flex bg-slate-950/60 p-0.5 rounded-lg border border-slate-800 self-center">
            <button 
              onClick={() => setCurrency('SEK')} 
              className={`px-2 py-0.5 rounded text-[8px] font-bold ${currency === 'SEK' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              SEK
            </button>
            <button 
              onClick={() => setCurrency('USD')} 
              className={`px-2 py-0.5 rounded text-[8px] font-bold ${currency === 'USD' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              USD
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form and Positions - 8 Columns */}
        <div className="lg:col-span-8 space-y-6">
          {/* Add position form */}
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" /> Track New Active Position
            </h3>
            
            <form onSubmit={handleAddPosition} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Currency Instrument</label>
                <select 
                  value={selectedPairId}
                  onChange={(e) => setSelectedPairId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                >
                  {pairs.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.baseSymbol}/{p.quoteSymbol})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Position Size (Base Units)</label>
                <input 
                  type="number"
                  placeholder="e.g. 10000"
                  value={positionSizeStr}
                  onChange={(e) => setPositionSizeStr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-white rounded-lg p-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Entry Price (Rate)</label>
                <input 
                  type="number"
                  step="0.0001"
                  placeholder="Rate"
                  value={entryPriceStr}
                  onChange={(e) => setEntryPriceStr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-white rounded-lg p-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button 
                type="submit"
                disabled={isAdding}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs tracking-wider transition-colors uppercase cursor-pointer"
              >
                {isAdding ? 'Adding...' : 'Add Position'}
              </button>
            </form>
          </div>

          {/* Positions table list */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/20 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Active Open Positions</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{positions.length} position(s)</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Syncing Cloud Database...
              </div>
            ) : positions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs leading-relaxed">
                No active currency positions logged. Setup your positions using the form above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-medium border-collapse table-auto">
                  <thead className="bg-slate-950/40 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Instrument</th>
                      <th className="p-4">Position Units</th>
                      <th className="p-4">Entry Rate</th>
                      <th className="p-4">Current Rate</th>
                      <th className="p-4 text-right">P&L</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {positions.map(pos => {
                      const pair = pairs.find(p => p.id === pos.pairId);
                      const livePrice = prices[pos.pairId] || pos.buyPrice;
                      const entryPrice = pos.buyPrice;
                      const changePx = livePrice - entryPrice;
                      
                      const isUp = changePx >= 0;

                      // P&L calculation
                      let profitUsd = 0;
                      if (pair) {
                        if (pair.quoteSymbol === 'USD') {
                          profitUsd = pos.amount * changePx;
                        } else if (pair.quoteSymbol === 'SEK') {
                          profitUsd = (pos.amount * changePx) / sekRate;
                        } else if (pair.quoteSymbol === 'JPY') {
                          profitUsd = (pos.amount * changePx) / livePrice;
                        } else {
                          profitUsd = pos.amount * changePx;
                        }
                      }
                      
                      const profitSek = profitUsd * sekRate;

                      return (
                        <tr key={pos.id} className="hover:bg-slate-850/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{pair?.icon || '💵'}</span>
                              <div>
                                <span className="font-bold text-slate-200">{pair?.name || pos.pairId}</span>
                                <span className="text-[9px] text-slate-500 uppercase block font-mono">{pair?.baseName}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-semibold text-slate-300">
                            {pos.amount.toLocaleString()} {pair?.baseSymbol}
                          </td>
                          <td className="p-4 font-mono text-slate-400">
                            {entryPrice.toFixed(pair?.quoteSymbol === 'JPY' ? 2 : 4)}
                          </td>
                          <td className="p-4 font-mono text-slate-400">
                            {livePrice.toFixed(pair?.quoteSymbol === 'JPY' ? 2 : 4)}
                          </td>
                          <td className="p-4 text-right font-mono font-bold">
                            <div className={isUp ? 'text-emerald-400' : 'text-rose-455'}>
                              {isUp ? '+' : ''}
                              {currency === 'SEK' 
                                ? `${Math.round(profitSek).toLocaleString()} kr` 
                                : `$${profitUsd.toFixed(2)}`}
                            </div>
                            <div className={`text-[9px] ${isUp ? 'text-emerald-500/80': 'text-rose-500/80'}`}>
                              {isUp ? '▲' : '▼'}{Math.abs((changePx / entryPrice) * 100).toFixed(3)}%
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => handleRemovePosition(pos.id)}
                              className="p-1.5 hover:bg-rose-500/10 rounded border border-transparent hover:border-rose-500/20 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                              title="Close Position"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* AI Forex Analyst Diagnoses - 4 Columns */}
        <div className="lg:col-span-12 xl:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
              <div className="p-1.5 bg-blue-500/10 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">AI Forex Analyst</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Powered by Gemini AI Studio</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Compile institutional-level structural trade reports, central-bank rate reflections, and support/resistance alerts based on your real-time active currency positions.
            </p>

            {aiReport && (
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-850 h-64 overflow-y-auto text-xs text-slate-350 space-y-2 font-sans leading-normal whitespace-pre-wrap">
                {aiReport}
              </div>
            )}

            {aiError && (
              <div className="p-4 bg-rose-500/5 text-rose-400 rounded-lg text-xs border border-rose-500/10">
                {aiError}
              </div>
            )}
          </div>

          <button
            onClick={handleGenerateAIReport}
            disabled={isGeneratingReport || positions.length === 0}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/15 text-xs tracking-wider transition-all flex items-center justify-center gap-2 uppercase disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGeneratingReport ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Diagnostics...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze with Gemini</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
