import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowUpDown, Sliders, RefreshCw, AlertTriangle, Play, Percent, ShieldCheck, 
  Layers, HelpCircle, DollarSign, ArrowUpRight, ArrowDownRight, Globe 
} from 'lucide-react';

interface ArbitrageOpportunity {
  id: string;
  asset: string;
  buyExchange: string;
  buyPrice: number;
  sellExchange: string;
  sellPrice: number;
  grossSpread: number; // gross spread %
  netSpread: number; // net spread after fees %
  profitUSD: number; // profit for $10,000 transaction
  timestamp: string;
}

export const ArbitrageCorrelationTracker: React.FC<{ theme?: string }> = ({ theme = 'charcoal' }) => {
  const [transactionSize, setTransactionSize] = useState<number>(10000);
  const [executionFee, setExecutionFee] = useState<number>(0.15); // fee in %
  const [minSpreadAlert, setMinSpreadAlert] = useState<number>(0.25); // minimum spread to alert in %
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [arbitrageLog, setArbitrageLog] = useState<ArbitrageOpportunity[]>([]);
  const [tickCount, setTickCount] = useState<number>(0);

  // Asset correlation matrix values
  // We can select and adjust asset relations to see real-time relative performance warnings
  const [matrixValues, setMatrixValues] = useState<Record<string, number>>({
    'BTC-ETH': 0.88,
    'BTC-SPY': 0.35,
    'BTC-GLD': 0.12,
    'ETH-SPY': 0.42,
    'ETH-GLD': 0.08,
    'SPY-GLD': -0.15,
  });

  const assets = ['BTC', 'ETH', 'SPY', 'GLD'];

  // Styles map to match FinanceView
  const st = useMemo(() => {
    const isDark = theme !== 'white' && theme !== 'silver';
    return {
      text: isDark ? 'text-zinc-100' : 'text-zinc-800',
      textDim: isDark ? 'text-zinc-400' : 'text-zinc-600',
      textMuted: isDark ? 'text-zinc-500' : 'text-zinc-400',
      border: isDark ? 'border-zinc-800/80' : 'border-zinc-200',
      cardBg: isDark ? 'bg-zinc-900/40 border-zinc-850/80' : 'bg-zinc-50 border-zinc-200/80',
      innerBg: isDark ? 'bg-zinc-950/60' : 'bg-zinc-100',
      inputBg: isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-300 text-zinc-900',
      accentText: 'text-teal-400',
      badge: isDark ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-teal-50 text-teal-700 border-teal-200'
    };
  }, [theme]);

  // Simulate arbitrage ticks across Coinbase, Binance, Kraken, Uniswap
  useEffect(() => {
    const interval = setInterval(() => {
      setTickCount(prev => prev + 1);

      const exchanges = ['Coinbase', 'Binance', 'Kraken', 'Uniswap'];
      const basePrices: Record<string, number> = {
        'BTC': 58500,
        'ETH': 3120,
        'SOL': 142
      };

      const selectedBasePrice = basePrices[selectedAsset] || 100;
      
      // Randomize prices slightly for each exchange to construct a simulated spread
      const exchangePrices = exchanges.map(ex => {
        const dev = (Math.random() - 0.5) * 0.016; // Up to 0.8% deviation
        return {
          exchange: ex,
          price: Math.round(selectedBasePrice * (1 + dev) * 100) / 100
        };
      });

      // Find min price and max price
      const minEx = [...exchangePrices].sort((a, b) => a.price - b.price)[0];
      const maxEx = [...exchangePrices].sort((a, b) => b.price - a.price)[0];

      if (minEx.exchange !== maxEx.exchange) {
        const grossSpread = ((maxEx.price - minEx.price) / minEx.price) * 100;
        const totalFees = executionFee * 2; // buy fee + sell fee
        const netSpread = grossSpread - totalFees;
        const profitUSD = transactionSize * (netSpread / 100);

        if (netSpread >= minSpreadAlert) {
          const newOpportunity: ArbitrageOpportunity = {
            id: `arb_${Date.now()}`,
            asset: selectedAsset,
            buyExchange: minEx.exchange,
            buyPrice: minEx.price,
            sellExchange: maxEx.exchange,
            sellPrice: maxEx.price,
            grossSpread: Math.round(grossSpread * 100) / 100,
            netSpread: Math.round(netSpread * 100) / 100,
            profitUSD: Math.round(profitUSD * 100) / 100,
            timestamp: new Date().toLocaleTimeString()
          };

          setArbitrageLog(prev => [newOpportunity, ...prev.slice(0, 5)]);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [selectedAsset, transactionSize, executionFee, minSpreadAlert]);

  const updateMatrixVal = (pair: string, val: number) => {
    setMatrixValues(prev => ({
      ...prev,
      [pair]: val
    }));
  };

  // Helper to color heatmap tiles based on correlation score
  const getCorrelationColor = (val: number) => {
    if (val === 1) return 'bg-teal-500/30 text-white font-bold';
    if (val > 0.7) return 'bg-teal-500/20 text-teal-400 font-bold';
    if (val > 0.3) return 'bg-teal-500/10 text-teal-500/70';
    if (val > -0.1) return 'bg-zinc-900 text-zinc-500';
    return 'bg-rose-500/15 text-rose-400 font-bold';
  };

  return (
    <div className={`p-6 rounded-2xl border ${st.border} ${st.cardBg} space-y-6 animate-fade-in`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-zinc-800/40">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" />
            Cross-Asset Arbitrage & Correlation Matrix
          </h3>
          <p className={`text-[10px] ${st.textDim} leading-relaxed`}>
            Track cross-exchange pricing inefficiencies live, subtract transaction frictions, and analyze inter-market portfolio correlation clusters.
          </p>
        </div>
        <div className={`text-[10px] px-2.5 py-1 rounded border font-mono font-bold ${st.badge} flex items-center gap-1`}>
          <RefreshCw className="w-3 h-3 animate-spin-slow" /> live feeds
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel / Arbitrage Desk */}
        <div className="lg:col-span-7 space-y-4">
          <div className={`p-4 rounded-xl ${st.innerBg} border ${st.border} space-y-4`}>
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider block">Arbitrage Monitoring Desk</span>
              <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-900 text-[9px] font-bold">
                {['BTC', 'ETH', 'SOL'].map((token) => (
                  <button
                    key={token}
                    onClick={() => setSelectedAsset(token)}
                    className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                      selectedAsset === token 
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-[9px] text-zinc-500 block mb-1">Lot Size ($)</span>
                <input
                  type="number"
                  value={transactionSize}
                  onChange={(e) => setTransactionSize(Math.max(100, parseInt(e.target.value) || 0))}
                  className="w-full py-1 text-center bg-zinc-900 border border-zinc-800 rounded text-xs text-white font-mono focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 block mb-1">Exchange Fee (%)</span>
                <input
                  type="number"
                  step="0.01"
                  value={executionFee}
                  onChange={(e) => setExecutionFee(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full py-1 text-center bg-zinc-900 border border-zinc-800 rounded text-xs text-white font-mono focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 block mb-1">Min Spread Alert</span>
                <input
                  type="number"
                  step="0.05"
                  value={minSpreadAlert}
                  onChange={(e) => setMinSpreadAlert(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full py-1 text-center bg-zinc-900 border border-zinc-800 rounded text-xs text-white font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Arbitrage Opportunities Ledger */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Real-time Spreads Ledger</span>
            <div className="space-y-1.5 max-h-[190px] overflow-y-auto custom-scrollbar pr-1">
              {arbitrageLog.length > 0 ? (
                arbitrageLog.map((op) => (
                  <div key={op.id} className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-lg flex items-center justify-between text-xs animate-slide-in">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white font-mono">{op.asset}</span>
                        <span className="text-zinc-600 text-[10px] font-mono">{op.timestamp}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        Buy {op.buyExchange} (${op.buyPrice.toLocaleString()}) → Sell {op.sellExchange} (${op.sellPrice.toLocaleString()})
                      </p>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span className="text-emerald-400 font-bold font-mono">+{op.netSpread}% net</span>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Profit: <span className="text-emerald-500 font-bold">${op.profitUSD.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 border border-zinc-900 bg-zinc-950/40 rounded-lg text-center flex flex-col items-center justify-center space-y-2">
                  <Globe className="w-5 h-5 text-zinc-700 animate-spin-slow" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-zinc-500">Scanning Exchanges...</span>
                    <span className="text-[9px] text-zinc-600 block">Listening for spreads exceeding {minSpreadAlert}% net margin</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Correlation Heatmap Matrix */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`p-4 rounded-xl ${st.innerBg} border ${st.border} space-y-3.5`}>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider block border-b border-zinc-900 pb-1.5">Correlation Cluster Grid</span>

            {/* Matrix grid */}
            <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
              {/* Header row */}
              <div className="font-bold text-zinc-600 self-center">Pair</div>
              {assets.map(a => (
                <div key={a} className="font-bold text-zinc-400 font-mono">{a}</div>
              ))}

              {/* BTC row */}
              <div className="font-bold text-zinc-400 font-mono text-left self-center">BTC</div>
              <div className={getCorrelationColor(1)}>1.00</div>
              <div className={getCorrelationColor(matrixValues['BTC-ETH'])}>{matrixValues['BTC-ETH'].toFixed(2)}</div>
              <div className={getCorrelationColor(matrixValues['BTC-SPY'])}>{matrixValues['BTC-SPY'].toFixed(2)}</div>
              <div className={getCorrelationColor(matrixValues['BTC-GLD'])}>{matrixValues['BTC-GLD'].toFixed(2)}</div>

              {/* ETH row */}
              <div className="font-bold text-zinc-400 font-mono text-left self-center">ETH</div>
              <div className={getCorrelationColor(matrixValues['BTC-ETH'])}>{matrixValues['BTC-ETH'].toFixed(2)}</div>
              <div className={getCorrelationColor(1)}>1.00</div>
              <div className={getCorrelationColor(matrixValues['ETH-SPY'])}>{matrixValues['ETH-SPY'].toFixed(2)}</div>
              <div className={getCorrelationColor(matrixValues['ETH-GLD'])}>{matrixValues['ETH-GLD'].toFixed(2)}</div>

              {/* SPY row */}
              <div className="font-bold text-zinc-400 font-mono text-left self-center">SPY</div>
              <div className={getCorrelationColor(matrixValues['BTC-SPY'])}>{matrixValues['BTC-SPY'].toFixed(2)}</div>
              <div className={getCorrelationColor(matrixValues['ETH-SPY'])}>{matrixValues['ETH-SPY'].toFixed(2)}</div>
              <div className={getCorrelationColor(1)}>1.00</div>
              <div className={getCorrelationColor(matrixValues['SPY-GLD'])}>{matrixValues['SPY-GLD'].toFixed(2)}</div>

              {/* GLD row */}
              <div className="font-bold text-zinc-400 font-mono text-left self-center">GLD</div>
              <div className={getCorrelationColor(matrixValues['BTC-GLD'])}>{matrixValues['BTC-GLD'].toFixed(2)}</div>
              <div className={getCorrelationColor(matrixValues['ETH-GLD'])}>{matrixValues['ETH-GLD'].toFixed(2)}</div>
              <div className={getCorrelationColor(matrixValues['SPY-GLD'])}>{matrixValues['SPY-GLD'].toFixed(2)}</div>
              <div className={getCorrelationColor(1)}>1.00</div>
            </div>

            {/* Controllers for correlation to test portfolio effects */}
            <div className="space-y-2 border-t border-zinc-900 pt-3">
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-bold">Adjust Correlations (Macro Tests)</span>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-400 font-mono">BTC vs ETH relation</span>
                  <span className="font-bold text-teal-400">{matrixValues['BTC-ETH'].toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-1.00"
                  max="1.00"
                  step="0.05"
                  value={matrixValues['BTC-ETH']}
                  onChange={(e) => updateMatrixVal('BTC-ETH', parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-400 font-mono">BTC vs S&P 500 (SPY)</span>
                  <span className="font-bold text-teal-400">{matrixValues['BTC-SPY'].toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-1.00"
                  max="1.00"
                  step="0.05"
                  value={matrixValues['BTC-SPY']}
                  onChange={(e) => updateMatrixVal('BTC-SPY', parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
