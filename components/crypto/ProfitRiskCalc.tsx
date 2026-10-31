
import React from 'react';
import { AnalysisResult, OHLCCandle } from '../../crypto-types';
import { Calculator, Target, DollarSign, Shield, TrendingUp, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfitRiskCalcProps {
  analysis: AnalysisResult;
  sekRate: number;
  candles: OHLCCandle[];
}

export const ProfitRiskCalc: React.FC<ProfitRiskCalcProps> = ({ analysis, sekRate, candles }) => {
  const { coin, tradingBlueprint, currentPrice } = analysis;
  
  const [winTarget, setWinTarget] = React.useState<number>(() => {
    const saved = localStorage.getItem('winTarget');
    return saved ? Number(saved) : 500;
  });
  
  const [winCurrency, setWinCurrency] = React.useState<'USD' | 'SEK'>(() => {
    const saved = localStorage.getItem('winCurrency');
    return (saved as 'USD' | 'SEK') || 'SEK';
  });

  React.useEffect(() => {
    localStorage.setItem('winTarget', winTarget.toString());
  }, [winTarget]);

  React.useEffect(() => {
    localStorage.setItem('winCurrency', winCurrency);
  }, [winCurrency]);

  const requiredForTarget = (targetPrice: number) => {
    const entry = tradingBlueprint.entry;
    const profitPerUnit = Math.abs(targetPrice - entry);
    if (profitPerUnit === 0) return 0;
    
    const targetInUSD = winCurrency === 'SEK' ? winTarget / sekRate : winTarget;
    const rawAmount = targetInUSD / profitPerUnit;

    // Custom rounding rules based on asset type
    if (coin.id === 'bitcoin') {
      return rawAmount; // Bitcoin stays precise
    } else if (coin.id === 'ethereum') {
      return Math.round(rawAmount / 0.125) * 0.125; // ETH rounds to nearest 0.125
    } else {
      return Math.round(rawAmount); // All other assets round to nearest whole unit
    }
  };

  const get24hRange = () => {
    if (!candles || candles.length === 0) return null;
    
    // Find candles from the last 24 hours
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const lastDayCandles = candles.filter(c => c.time >= dayAgo);
    
    if (lastDayCandles.length === 0) {
      // Fallback to last few candles if no exact match
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

  const target1Qty = requiredForTarget(tradingBlueprint.targets[0]);
  const target1CostUsd = target1Qty * currentPrice.usd;
  const target1CostSelected = winCurrency === 'SEK' ? target1CostUsd * sekRate : target1CostUsd;

  const target2Qty = requiredForTarget(tradingBlueprint.targets[1]);
  const target2CostUsd = target2Qty * currentPrice.usd;
  const target2CostSelected = winCurrency === 'SEK' ? target2CostUsd * sekRate : target2CostUsd;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl mt-4 relative">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Calculator className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-sans">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white italic">Profit & Risk Calc</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Real-Time SEK Profit & Risk Calculator</p>
          </div>
        </div>
        
        <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800 font-sans">
          <button 
            onClick={() => setWinCurrency('SEK')} 
            className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest transition-all ${winCurrency === 'SEK' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            SEK
          </button>
          <button 
            onClick={() => setWinCurrency('USD')} 
            className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest transition-all ${winCurrency === 'USD' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            USD
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Left Column: Input and Basic Risk */}
          <div className="space-y-4">
            <div className="space-y-1.5 font-sans">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Desired Profit Target</label>
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 font-mono text-base font-bold italic pointer-events-none group-focus-within:text-emerald-500 transition-colors">
                  {winCurrency === 'SEK' ? 'kr' : '$'}
                </span>
                <input 
                  type="number" 
                  value={winTarget}
                  onChange={(e) => setWinTarget(Number(e.target.value))}
                  className="w-full bg-slate-950/40 border border-slate-800 rounded-lg py-2 pl-8 pr-3 text-lg font-mono font-bold text-white focus:outline-none focus:border-emerald-500 transition-all placeholder-slate-800"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium px-1 leading-normal italic">
                Hold exactly these amounts of <span className="text-white font-semibold">{coin.symbol}</span> to hit a <span className="text-emerald-400 font-semibold">{winTarget.toLocaleString()} {winCurrency}</span> profit at targets.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/50 flex flex-col gap-0.5 font-sans">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Shield className="w-3 h-3 text-rose-500" />
                  <span className="text-[9px] font-bold text-slate-505 uppercase tracking-wider">Stop Loss</span>
                </div>
                <span className="text-xs font-mono font-bold text-rose-400 italic">${tradingBlueprint.stopLoss.toLocaleString()}</span>
              </div>
              
              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/50 flex flex-col gap-0.5 font-sans">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <TrendingUp className="w-3 h-3 text-indigo-400" />
                  <span className="text-[9px] font-bold text-slate-505 uppercase tracking-wider">Risk/Reward</span>
                </div>
                <span className="text-xs font-mono font-bold text-white italic">1:{tradingBlueprint.riskReward}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Targets & Range */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="p-3 bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-lg relative overflow-hidden group font-sans"
              >
                <div className="absolute top-0 right-0 p-2 opacity-[0.02] group-hover:opacity-5 transition-opacity text-white">
                  <Target className="w-12 h-12" />
                </div>
                <div className="relative z-10 space-y-2 py-0.5 font-sans">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Target 1 (Conservative)</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xl font-mono font-bold text-white tracking-tight tabular-nums leading-none">
                      {target1Qty.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-indigo-400 uppercase italic tracking-wider">{coin.symbol} Required</span>
                    </div>
                    
                    <div className="pt-1.5 border-t border-slate-800/80 mt-2 space-y-0.5">
                      <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Est. Cost</div>
                      <div className="text-xs font-mono font-bold text-indigo-300 tabular-nums">
                        {winCurrency === 'SEK' ? 'kr' : '$'}
                        {target1CostSelected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider font-sans">
                        @ ${currentPrice.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="p-3 bg-gradient-to-br from-slate-950 to-emerald-950/10 border border-slate-800 rounded-lg relative overflow-hidden group border-b-emerald-500/20"
              >
                <div className="absolute top-0 right-0 p-2 opacity-[0.02] group-hover:opacity-5 transition-opacity text-white">
                  <DollarSign className="w-12 h-12" />
                </div>
                <div className="relative z-10 space-y-2 py-0.5 font-sans">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Target 2 (Aggressive)</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xl font-mono font-bold text-white tracking-tight tabular-nums leading-none">
                      {target2Qty.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-emerald-400 uppercase italic tracking-wider">{coin.symbol} Required</span>
                    </div>
                    
                    <div className="pt-1.5 border-t border-slate-800/80 mt-2 space-y-0.5">
                      <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Est. Cost</div>
                      <div className="text-xs font-mono font-bold text-emerald-300 tabular-nums">
                        {winCurrency === 'SEK' ? 'kr' : '$'}
                        {target2CostSelected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider font-sans">
                        @ ${currentPrice.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

          {/* 24h Range Box */}
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex items-center justify-between font-sans">
            <div className="flex items-center gap-3">
              <div className="space-y-0.5">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">24h Low</div>
                <div className="text-xs font-mono font-bold text-rose-400 italic">
                  ${range?.low.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '---'}
                </div>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div className="space-y-0.5">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">24h High</div>
                <div className="text-xs font-mono font-bold text-emerald-400 italic">
                  ${range?.high.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '---'}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-[9px] font-bold text-slate-505 uppercase tracking-wider mb-0.5">Calculation Sync</div>
              <div className="flex items-center gap-1 text-[9px] font-mono text-indigo-400 font-bold">
                <Clock className="w-2.5 h-2.5" />
                {currentPrice.last_updated_at ? new Date(currentPrice.last_updated_at * 1000).toLocaleTimeString() : 'LIVE'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      <div className="bg-slate-950 p-2.5 rounded-b-xl border-t border-slate-800 flex items-center justify-between opacity-60 grayscale hover:grayscale-0 transition-all font-sans">
        <div className="flex items-center gap-2">
          <Calculator className="w-3 h-3 text-emerald-400" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Risk Math Engine: Calibrated</span>
        </div>
        <div className="text-[8px] font-bold text-slate-100 italic bg-emerald-500/20 px-1.5 py-0.5 rounded uppercase">Optimized for {coin.name}</div>
      </div>
    </div>
  );
};
