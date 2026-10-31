import React from 'react';
import { AnalysisResult, OHLCCandle } from '../../crypto-types';
import { Calculator, Target, DollarSign, Shield, TrendingUp, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StockProfitRiskCalcProps {
  analysis: AnalysisResult;
  sekRate: number;
  candles: OHLCCandle[];
}

export const StockProfitRiskCalc: React.FC<StockProfitRiskCalcProps> = ({ analysis, sekRate, candles }) => {
  const { coin: stock, tradingBlueprint, currentPrice } = analysis;
  
  const [isExpanded, setIsExpanded] = React.useState(true);
  
  const [winTarget, setWinTarget] = React.useState<number>(() => {
    const saved = localStorage.getItem('stock_winTarget');
    return saved ? Number(saved) : 5000; // default $5000 / 5000 SEK
  });
  
  const [winCurrency, setWinCurrency] = React.useState<'USD' | 'SEK'>(() => {
    const saved = localStorage.getItem('stock_winCurrency');
    return (saved as 'USD' | 'SEK') || 'USD';
  });

  React.useEffect(() => {
    localStorage.setItem('stock_winTarget', winTarget.toString());
  }, [winTarget]);

  React.useEffect(() => {
    localStorage.setItem('stock_winCurrency', winCurrency);
  }, [winCurrency]);

  const requiredForTarget = (targetPrice: number) => {
    const entry = tradingBlueprint.entry;
    const profitPerUnit = Math.abs(targetPrice - entry);
    if (profitPerUnit === 0) return 0;
    
    const targetInUSD = winCurrency === 'SEK' ? winTarget / sekRate : winTarget;
    const rawAmount = targetInUSD / profitPerUnit;

    // For stocks we round to simple whole units for cleaner calculations
    return Math.round(rawAmount);
  };

  const get24hRange = () => {
    if (!candles || candles.length === 0) return null;
    
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const lastDayCandles = candles.filter(c => c.time >= dayAgo);
    
    if (lastDayCandles.length === 0) {
      const count = Math.min(candles.length, 6);
      const recent = candles.slice(-count);
      return {
        high: Math.max(...recent.map(c => c.high)),
        low: Math.min(...recent.map(c => c.low))
      };
    }

    return {
      high: Math.max(...lastDayCandles.map(c => c.high)),
      low: Math.min(...lastDayCandles.map(c => c.low))
    };
  };

  const range = get24hRange();

  // Targets quantity calculations
  const target1Qty = requiredForTarget(tradingBlueprint.targets[0]);
  const target1CostUsd = target1Qty * currentPrice.usd;
  const target1CostSelected = winCurrency === 'SEK' ? target1CostUsd * sekRate : target1CostUsd;

  const target2Qty = requiredForTarget(tradingBlueprint.targets[1]);
  const target2CostUsd = target2Qty * currentPrice.usd;
  const target2CostSelected = winCurrency === 'SEK' ? target2CostUsd * sekRate : target2CostUsd;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl mt-4 relative">
      
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800 cursor-pointer group select-none font-sans"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Calculator className={`w-4 h-4 text-blue-400 transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white italic">Stock Profit & Risk Calc</h3>
            <p className="text-[9px] text-slate-505 font-bold uppercase tracking-wider">Real-Time SEK Stock Profit & Risk Calculator</p>
          </div>
        </div>

        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button 
              onClick={() => setWinCurrency('SEK')} 
              className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest transition-all cursor-pointer ${winCurrency === 'SEK' ? 'bg-blue-600 text-white shadow shadow-blue-600/30' : 'text-slate-500 hover:text-slate-300'}`}
            >
              SEK
            </button>
            <button 
              onClick={() => setWinCurrency('USD')} 
              className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest transition-all cursor-pointer ${winCurrency === 'USD' ? 'bg-blue-600 text-white shadow shadow-blue-600/30' : 'text-slate-500 hover:text-slate-300'}`}
            >
              USD
            </button>
          </div>
          
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 bg-slate-950 rounded-lg border border-slate-800 group-hover:border-slate-700 cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
              
              {/* Left Interactive Calculator (5 Columns) */}
              <div className="p-4 lg:col-span-5 space-y-4 font-sans">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-505 uppercase tracking-wider ml-1">Desired Profit Target</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-base font-bold italic">
                      {winCurrency === 'SEK' ? 'kr' : '$'}
                    </span>
                    <input 
                      type="number" 
                      value={winTarget}
                      onChange={(e) => setWinTarget(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-8 pr-3 text-lg font-mono font-bold text-white focus:outline-none focus:border-blue-500 transition-all placeholder-slate-800"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-850 text-[11px] text-slate-400 leading-normal font-sans space-y-1.5">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Diagnostic Assessment:</span>
                  </div>
                  <p>
                    Buying the share quantities calculated on the right side provides the required scale to target a net profit of <span className="text-blue-400 font-semibold">{winCurrency === 'SEK' ? 'kr' : '$'}{winTarget.toLocaleString()}</span> at the targets.
                  </p>
                </div>
              </div>

              {/* Right Outputs (7 Columns) */}
              <div className="p-4 lg:col-span-7 space-y-4 font-sans">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    {/* Target 1 Card */}
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      className="p-3 bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-lg relative overflow-hidden group border-b-blue-500/20"
                    >
                      <div className="absolute top-0 right-0 p-2 opacity-[0.02] group-hover:opacity-5 transition-opacity text-white">
                        <Target className="w-12 h-12" />
                      </div>
                      <div className="relative z-10 space-y-2 py-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Target 1 (Conservative)</span>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xl font-mono font-bold text-white tracking-tight tabular-nums leading-none">
                            {target1Qty.toLocaleString()}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-blue-400 uppercase italic tracking-wider">Shares Required</span>
                          </div>

                          <div className="pt-1.5 border-t border-slate-800/80 mt-2 space-y-0.5">
                            <div className="text-[8px] font-bold text-slate-505 uppercase tracking-wider">Est. Cost</div>
                            <div className="text-xs font-mono font-bold text-blue-300 tabular-nums">
                              {winCurrency === 'SEK' ? 'kr' : '$'}
                              {target1CostSelected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[8px] text-slate-505 font-semibold uppercase tracking-wider">
                              @ ${currentPrice.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Target 2 Card */}
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      className="p-3 bg-gradient-to-br from-slate-950 to-emerald-950/10 border border-slate-800 rounded-lg relative overflow-hidden group border-b-emerald-500/20"
                    >
                      <div className="absolute top-0 right-0 p-2 opacity-[0.02] group-hover:opacity-5 transition-opacity text-white">
                        <DollarSign className="w-12 h-12" />
                      </div>
                      <div className="relative z-10 space-y-2 py-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Target 2 (Aggressive)</span>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xl font-mono font-bold text-white tracking-tight tabular-nums leading-none">
                            {target2Qty.toLocaleString()}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-emerald-400 uppercase italic tracking-wider">Shares Required</span>
                          </div>

                          <div className="pt-1.5 border-t border-slate-800/80 mt-2 space-y-0.5">
                            <div className="text-[8px] font-bold text-slate-505 uppercase tracking-wider">Est. Cost</div>
                            <div className="text-xs font-mono font-bold text-emerald-300 tabular-nums">
                              {winCurrency === 'SEK' ? 'kr' : '$'}
                              {target2CostSelected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[8px] text-slate-505 font-semibold uppercase tracking-wider">
                              @ ${currentPrice.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* 24h Range Box */}
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Calculated 24h Range</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Live index levels</div>
                    </div>
                  </div>

                  {range ? (
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-white">
                        ${range.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - ${range.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[8px] text-slate-505 font-bold uppercase tracking-wider mt-0.5">
                        Spread: ${(range.high - range.low).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 font-mono text-[10px]">Computing Range...</div>
                  )}
                </div>

                {/* Leverage Note */}
                <div className="flex items-start gap-2 text-[9px] text-slate-500 leading-normal font-bold uppercase tracking-wider">
                  <Shield className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                  <span>Estimations represent exact shares purchase costs at current price. Standard securities do not compound like leverage-derivative contracts unless customized. Keep portfolios rebalanced.</span>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
