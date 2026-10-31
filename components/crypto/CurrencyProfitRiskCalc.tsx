import React, { useState, useEffect } from 'react';
import { ForexPair } from '../../constants/forex';
import { Calculator, ArrowRight, Shield, TrendingUp, AlertCircle } from 'lucide-react';

interface CurrencyProfitRiskCalcProps {
  pair: ForexPair;
  currentPrice: number;
  sekRate: number; // USD/SEK rate
}

export const CurrencyProfitRiskCalc: React.FC<CurrencyProfitRiskCalcProps> = ({ pair, currentPrice, sekRate }) => {
  const [winTarget, setWinTarget] = useState<number>(() => {
    const saved = localStorage.getItem('forex_winTarget');
    return saved ? Number(saved) : 5000;
  });
  
  const [winCurrency, setWinCurrency] = useState<'USD' | 'SEK'>(() => {
    const saved = localStorage.getItem('forex_winCurrency');
    return (saved as 'USD' | 'SEK') || 'SEK';
  });

  const [entryPrice, setEntryPrice] = useState<number>(currentPrice);
  const [targetPrice, setTargetPrice] = useState<number>(currentPrice * 1.01);
  const [stopLossPrice, setStopLossPrice] = useState<number>(currentPrice * 0.995);
  const [useCustomRates, setUseCustomRates] = useState<boolean>(false);

  // Sync with currentPrice when pair changes or user doesn't lock custom rates
  useEffect(() => {
    if (!useCustomRates) {
      setEntryPrice(currentPrice);
      setTargetPrice(currentPrice * 1.008);
      setStopLossPrice(currentPrice * 0.996);
    }
  }, [currentPrice, useCustomRates]);

  useEffect(() => {
    localStorage.setItem('forex_winTarget', winTarget.toString());
  }, [winTarget]);

  useEffect(() => {
    localStorage.setItem('forex_winCurrency', winCurrency);
  }, [winCurrency]);

  // Determine Pip Size
  const isJpy = pair.quoteSymbol === 'JPY';
  const pipSize = isJpy ? 0.01 : 0.0001;

  // Calculate pips
  const profitPips = Math.abs(targetPrice - entryPrice) / pipSize;
  const lossPips = Math.abs(entryPrice - stopLossPrice) / pipSize;
  const riskRewardRatio = lossPips > 0 ? (profitPips / lossPips) : 0;

  /**
   * Calculates profit in quote currency, converts to USD and SEK based on quote currency rates
   */
  const getRequiredUnits = () => {
    const priceDiff = Math.abs(targetPrice - entryPrice);
    if (priceDiff === 0) return 0;

    // Desired profit in USD
    const targetInUSD = winCurrency === 'SEK' ? winTarget / sekRate : winTarget;

    // Calculate profit per unit in USD
    let profitPerUnitUsd = 0;
    
    if (pair.quoteSymbol === 'USD') {
      // e.g. EUR/USD quote is USD
      profitPerUnitUsd = priceDiff;
    } else if (pair.quoteSymbol === 'SEK') {
      // e.g. USD/SEK quote is SEK
      const profitPerUnitSek = priceDiff;
      profitPerUnitUsd = profitPerUnitSek / sekRate;
    } else if (pair.quoteSymbol === 'JPY') {
      // e.g. USD/JPY quote is JPY
      // 1 JPY in USD is 1 / USD_JPY rate
      const profitPerUnitJpy = priceDiff;
      profitPerUnitUsd = profitPerUnitJpy / currentPrice; 
    } else {
      // Fallback relative to SEK rates
      profitPerUnitUsd = priceDiff * 0.9;
    }

    return targetInUSD / profitPerUnitUsd;
  };

  const unitsNeeded = getRequiredUnits();
  const lotSizeStandard = unitsNeeded / 100000;
  const lotSizeMini = unitsNeeded / 10000;
  const lotSizeMicro = unitsNeeded / 1000;

  // Margin Required estimate (Assuming standard 1:100 leverage)
  const estimatedMarginUsd = (unitsNeeded * (entryPrice / (pair.quoteSymbol === 'USD' ? 1 : entryPrice))) / 100;
  const estimatedMarginSek = estimatedMarginUsd * sekRate;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl mt-4 relative font-sans">
      <div className="absolute top-2 right-12 z-0 opacity-10 pointer-events-none text-4xl font-black italic text-white uppercase select-none">APP6</div>
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Calculator className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white italic">Forex Pip & Profit Calc</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Calculate required lot sizes & target outcomes</p>
          </div>
        </div>
        
        <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <button 
            onClick={() => setWinCurrency('SEK')} 
            className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest transition-all ${winCurrency === 'SEK' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            SEK
          </button>
          <button 
            onClick={() => setWinCurrency('USD')} 
            className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest transition-all ${winCurrency === 'USD' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            USD
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Left Column: Inputs */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Desired Profit Goal</label>
                <button 
                  onClick={() => setUseCustomRates(!useCustomRates)}
                  className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${useCustomRates ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                >
                  {useCustomRates ? '🔓 Custom Rates Unlocked' : '🔒 Sync Rates to Market'}
                </button>
              </div>
              
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 font-mono text-base font-bold italic pointer-events-none group-focus-within:text-blue-500 transition-colors">
                  {winCurrency === 'SEK' ? 'kr' : '$'}
                </span>
                <input 
                  type="number" 
                  value={winTarget}
                  onChange={(e) => setWinTarget(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xl font-mono font-bold text-white focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Price Inputs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block ml-1">Entry Rate</span>
                <input 
                  type="number" 
                  step="0.0001"
                  disabled={!useCustomRates}
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono font-bold text-slate-300 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block ml-1">Take Profit</span>
                <input 
                  type="number" 
                  step="0.0001"
                  disabled={!useCustomRates}
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest block ml-1">Stop Loss</span>
                <input 
                  type="number" 
                  step="0.0001"
                  disabled={!useCustomRates}
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono font-bold text-rose-300 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Calculations summaries */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Profit Range</div>
                <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                  +{profitPips.toFixed(1)} Pips
                </div>
              </div>
              <div>
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Risk Range</div>
                <div className="text-xs font-bold text-rose-450 font-mono mt-0.5">
                  -{lossPips.toFixed(1)} Pips
                </div>
              </div>
              <div>
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Risk / Reward</div>
                <div className="text-xs font-bold text-white font-mono mt-0.5 flex items-center justify-center gap-1">
                  1 : {riskRewardRatio.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Outcomes & Required Lots */}
          <div className="space-y-3">
            <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-xl space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-1">
                Required Position Size for {winTarget.toLocaleString()} {winCurrency}
              </span>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      Micro Lots
                    </span>
                    <span className="text-[8px] text-slate-500 tracking-wider font-semibold uppercase">1,000 units/lot</span>
                  </div>
                  <span className="text-sm font-black font-mono text-blue-400">
                    {lotSizeMicro.toFixed(2)} Lots
                  </span>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-900 pt-1.5">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                      Mini Lots
                    </span>
                    <span className="text-[8px] text-slate-500 tracking-wider font-semibold uppercase">10,000 units/lot</span>
                  </div>
                  <span className="text-sm font-black font-mono text-indigo-400">
                    {lotSizeMini.toFixed(3)} Lots
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-900 pt-1.5">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-purple-400" />
                      Units Position Size
                    </span>
                    <span className="text-[8px] text-slate-500 tracking-wider font-semibold uppercase">Individual Base Currency</span>
                  </div>
                  <span className="text-sm font-black font-mono text-white">
                    {Math.round(unitsNeeded).toLocaleString()} {pair.baseSymbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Estimates */}
            <div className="flex items-center justify-between px-3 py-2 bg-blue-500/5 rounded-lg border border-blue-500/10">
              <span className="text-[9px] font-bold text-blue-300 uppercase flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                Est. Leverage Margin (1:100):
              </span>
              <span className="text-xs font-bold font-mono text-blue-300">
                {winCurrency === 'SEK' 
                  ? `${Math.round(estimatedMarginSek).toLocaleString()} SEK` 
                  : `${Math.round(estimatedMarginUsd).toLocaleString()} USD`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
