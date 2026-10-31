import React from 'react';
import { AnalysisResult, OHLCCandle } from '../../crypto-types';
import { TrendingUp, TrendingDown, Target, Shield, Zap, Info, DollarSign, X, Calculator, Activity, ChevronDown, ChevronUp, Gauge } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StockNewsPanel } from './StockNewsPanel';
import { StockProfitRiskCalc } from './StockProfitRiskCalc';

interface StockAnalysisPanelProps {
  analysis: AnalysisResult;
  candles: OHLCCandle[];
  sekRate: number;
}

export const StockAnalysisPanel: React.FC<StockAnalysisPanelProps> = ({ analysis, candles, sekRate }) => {
  const { coin: stock, signals, recommendation, tradingBlueprint, levels } = analysis;
  const isUp = signals.trend === 'Bullish';
  
  const [winTarget, setWinTarget] = React.useState<number>(() => {
    const saved = localStorage.getItem('stock_winTarget');
    return saved ? Number(saved) : 5000;
  });
  const [winCurrency, setWinCurrency] = React.useState<'USD' | 'SEK'>(() => {
    const saved = localStorage.getItem('stock_winCurrency');
    return (saved as 'USD' | 'SEK') || 'USD';
  });

  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = React.useState(false);
  
  const [isRecExpanded, setIsRecExpanded] = React.useState(true);
  const [isChartExpanded, setIsChartExpanded] = React.useState(false);
  const [isPivotExpanded, setIsPivotExpanded] = React.useState(false);

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
    return Math.round(targetInUSD / profitPerUnit);
  };

  // SVG Chart Dimensions & Configuration
  const chartHeight = 180;
  const chartWidth = 600;

  // Calculate coordinates for SVG candles
  const chartData = React.useMemo(() => {
    if (!candles || candles.length === 0) return [];
    
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const maxVal = Math.max(...highs) * 1.002;
    const minVal = Math.min(...lows) * 0.998;
    const valRange = maxVal - minVal;

    const scaleY = (val: number) => {
      if (valRange === 0) return chartHeight / 2;
      return chartHeight - ((val - minVal) / valRange) * (chartHeight - 20) - 10;
    };

    const totalCandles = candles.length;
    const stepX = chartWidth / Math.max(1, totalCandles);

    return candles.map((c, i) => {
      const x = i * stepX + stepX / 2;
      return {
        key: i,
        time: c.time,
        x,
        openY: scaleY(c.open),
        closeY: scaleY(c.close),
        highY: scaleY(c.high),
        lowY: scaleY(c.low),
        candleColor: c.close >= c.open ? '#10b981' : '#f43f5e',
        rawClose: c.close,
        rawOpen: c.open,
        rawHigh: c.high,
        rawLow: c.low
      };
    });
  }, [candles]);

  return (
    <div className="space-y-4 animate-fade-in font-sans">
      {/* Calculator Modal */}
      <AnimatePresence>
        {isCalculatorOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-slate-950 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.85)] overflow-hidden relative"
            >
              <div className="absolute top-4 left-4 z-20">
                <span className="text-[9px] bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-500 font-bold tracking-wider">CALCULATOR</span>
              </div>
              <div className="absolute top-4 right-4 z-20">
                <button 
                  onClick={() => setIsCalculatorOpen(false)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all border border-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="w-full md:w-5/12 space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-blue-400">
                        <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                          <Calculator className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-white uppercase tracking-tight">Stock Profit Goal</h2>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Determine required shares</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Desired Profit</label>
                        <div className="flex bg-slate-900/50 p-0.5 rounded-lg border border-slate-800">
                          <button 
                            onClick={() => setWinCurrency('SEK')} 
                            className={`px-3 py-1 rounded-md text-[9px] font-bold tracking-widest transition-all cursor-pointer ${winCurrency === 'SEK' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            SEK
                          </button>
                          <button 
                            onClick={() => setWinCurrency('USD')} 
                            className={`px-3 py-1 rounded-md text-[9px] font-bold tracking-widest transition-all cursor-pointer ${winCurrency === 'USD' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            USD
                          </button>
                        </div>
                      </div>
                      
                      <div className="relative group">
                        <div className="absolute inset-0 bg-blue-500/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-mono text-2xl font-black italic pointer-events-none group-focus-within:text-blue-500 transition-colors">
                          {winCurrency === 'SEK' ? 'kr' : '$'}
                        </span>
                        <input 
                          type="number" 
                          autoFocus
                          value={winTarget}
                          onChange={(e) => setWinTarget(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-slate-900/40 border-2 border-slate-800 rounded-xl py-3 pl-12 pr-4 text-3xl font-mono font-black text-white focus:outline-none focus:border-blue-500 transition-all placeholder-slate-800 relative z-10"
                        />
                      </div>
                      
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Hold exactly this amount of <span className="text-white font-bold">{stock.name} ({stock.symbol})</span> to achieve a <span className="text-blue-400 font-bold">{winTarget.toLocaleString()} {winCurrency}</span> profit once stock price hits projected targets.
                      </p>
                    </div>
                  </div>

                  <div className="w-full md:w-7/12 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl relative overflow-hidden group border-b-blue-500/10"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-5 transition-opacity text-white">
                        <Target className="w-24 h-24" />
                      </div>
                      <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target 1 (Cons.)</span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-3xl font-mono font-bold text-white tracking-tight tabular-nums">
                            {requiredForTarget(tradingBlueprint.targets[0]).toLocaleString()}
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Shares Required</span>
                            <span className="text-[8px] font-semibold text-slate-500 uppercase px-2 py-0.5 rounded-full bg-slate-850">Low Risk</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl relative overflow-hidden group border-b-emerald-500/20"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-5 transition-opacity text-white">
                        <DollarSign className="w-24 h-24" />
                      </div>
                      <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target 2 (Aggr.)</span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-3xl font-mono font-bold text-white tracking-tight tabular-nums">
                            {requiredForTarget(tradingBlueprint.targets[1]).toLocaleString()}
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Shares Required</span>
                            <span className="text-[8px] font-semibold text-slate-500 uppercase px-2 py-0.5 rounded-full bg-slate-850">Optimal</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
              
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-10" />
            </motion.div>
            
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-xl -z-10" 
              onClick={() => setIsCalculatorOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 font-sans">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isUp ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'} border border-current/10`}>
              {isUp ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                {stock.name} Technical Feed
                <span className={`text-[9px] font-bold px-2 py-0.2 rounded-full ${isUp ? 'bg-blue-950 text-blue-400 border border-blue-500/30' : 'bg-rose-950 text-rose-400 border border-rose-500/30'}`}>
                  {signals.trend}
                </span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5 font-sans">
                Technical rating: <span className="font-bold text-white">{signals.strength}/100</span> · Active Calculation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCalculatorOpen(true)}
              className="group p-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 rounded-xl transition-all shadow shadow-blue-500/10 cursor-pointer"
              title="Profit Calculator"
            >
              <Calculator className="w-4 h-4 transition-transform group-hover:rotate-6" />
            </button>

            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
              <div className="flex flex-col items-end border-r border-slate-800 pr-6">
                <div className="text-[9px] items-center gap-1 font-bold text-slate-500 uppercase tracking-wider mb-0.5 flex">
                  <DollarSign className="w-2.5 h-2.5" /> USD Price
                </div>
                <div className="text-base font-mono font-bold text-blue-400">
                  ${analysis.currentPrice.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="flex flex-col items-end font-sans">
                <div className="text-[9px] items-center gap-1 font-bold text-slate-500 uppercase tracking-wider mb-0.5 flex">
                  <span className="w-2 h-2 flex items-center justify-center text-[7px] border border-current rounded-full">kr</span> SEK Price
                </div>
                <div className="text-base font-mono font-bold text-white font-sans">
                  {analysis.sekPrice > 100 ? Math.round(analysis.sekPrice).toLocaleString('sv-SE') : analysis.sekPrice.toFixed(2)}
                  <span className="text-[9px] ml-0.5 text-slate-500">kr</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Recommendation Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl font-sans">
          <button 
            onClick={() => setIsRecExpanded(!isRecExpanded)}
            className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800 cursor-pointer hover:from-slate-800 hover:to-slate-800 transition-all group select-none"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg border transition-colors ${isRecExpanded ? 'bg-blue-500/20 border-blue-500/40' : 'bg-blue-500/5 border-blue-500/10'}`}>
                <Zap className={`w-4 h-4 transition-colors ${isRecExpanded ? 'text-blue-400 fill-current' : 'text-slate-500'}`} />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white italic">Trading Consensus</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Tactical Action & Reasoning</p>
              </div>
            </div>
            <div className="p-1 bg-slate-950 rounded-lg border border-slate-800 group-hover:border-slate-700 transition-colors">
              {isRecExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </div>
          </button>

          <AnimatePresence>
            {isRecExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="p-4"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-3 font-sans">
                    <div className={`text-2xl font-black italic tracking-tight ${
                      recommendation.action.includes('BUY') ? 'text-emerald-500' : 
                      recommendation.action.includes('SELL') ? 'text-rose-500' : 'text-slate-400'
                    }`}>
                      {recommendation.action}
                    </div>
                    
                    <ul className="space-y-1.5 text-xs">
                      {recommendation.reasoning.map((reason, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300 leading-normal">
                          <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="w-full md:w-56 space-y-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-5 font-sans">
                    <div className="text-[9px] font-bold text-slate-505 uppercase tracking-wider mb-1">Indicators Snapshot</div>
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-slate-400 text-xs">RSI (14)</span>
                      <span className={`font-mono text-xs font-bold ${signals.indicators.rsi! > 70 ? 'text-rose-400' : signals.indicators.rsi! < 30 ? 'text-emerald-400' : 'text-white'}`}>
                        {signals.indicators.rsi?.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-slate-400 text-xs">EMA (20)</span>
                      <span className="font-mono text-xs text-white">${signals.indicators.ema_20?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-slate-400 text-xs">ATR Volatility</span>
                      <span className="font-mono text-xs text-white">${signals.indicators.atr?.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Candlestick SVG Chart Block */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl font-sans">
          <button 
            onClick={() => setIsChartExpanded(!isChartExpanded)}
            className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800 cursor-pointer hover:from-slate-800 hover:to-slate-800 transition-all group select-none"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg border transition-colors ${isChartExpanded ? 'bg-blue-500/20 border-blue-500/40' : 'bg-blue-500/5 border-blue-500/10'}`}>
                <Activity className={`w-4 h-4 transition-colors ${isChartExpanded ? 'text-blue-400' : 'text-slate-500'}`} />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white italic">Candlestick Structure Chart</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Real-time projections</p>
              </div>
            </div>
            <div className="p-1 bg-slate-950 rounded-lg border border-slate-800 group-hover:border-slate-700 transition-colors">
              {isChartExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </div>
          </button>

          <AnimatePresence>
            {isChartExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="p-4"
              >
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 overflow-x-auto">
                  <div className="relative" style={{ width: '100%', minWidth: '400px', height: `${chartHeight}px` }}>
                    <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                      {/* Horizontal reference lines */}
                      <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="#1e293b" strokeDasharray="3,3" />
                      <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#1e293b" strokeDasharray="3,3" />
                      <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="#1e293b" strokeDasharray="3,3" />
                      
                      {/* Draw candlesticks */}
                      {chartData.map((d) => {
                        const wickWidth = 1.5;
                        const bodyWidth = Math.max(4, chartWidth / chartData.length * 0.6);
                        const isPositive = d.closeY <= d.openY;
                        
                        return (
                          <g key={d.key}>
                            {/* Wick */}
                            <rect 
                              x={d.x - wickWidth / 2} 
                              y={Math.min(d.highY, d.lowY)} 
                              width={wickWidth}
                              height={Math.abs(d.highY - d.lowY)} 
                              fill={d.candleColor} 
                            />
                            {/* Body */}
                            <rect 
                              x={d.x - bodyWidth / 2} 
                              y={Math.min(d.openY, d.closeY)} 
                              width={bodyWidth}
                              height={Math.max(2, Math.abs(d.openY - d.closeY))} 
                              fill={isPositive ? '#10b981' : '#f43f5e'}
                              stroke={isPositive ? '#059669' : '#e11d48'}
                              strokeWidth={1}
                              className="transition-all hover:opacity-80"
                            />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-3">
                    <span>{chartData[0]?.time ? new Date(chartData[0].time).toLocaleDateString() : 'Start Point'}</span>
                    <span className="text-center font-semibold text-slate-400 uppercase tracking-widest">
                      NASDAQ: {stock.symbol} Candle Projection Grid
                    </span>
                    <span>{chartData[chartData.length - 1]?.time ? new Date(chartData[chartData.length - 1].time).toLocaleTimeString() : 'Current'}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stock Profit & Risk Calculator widget */}
        <StockProfitRiskCalc 
          analysis={analysis}
          sekRate={sekRate}
          candles={candles}
        />
      </div>

      {/* Support & Resistance Levels Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl font-sans">
        <button 
          onClick={() => setIsPivotExpanded(!isPivotExpanded)}
          className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800 cursor-pointer hover:from-slate-800 hover:to-slate-800 transition-all group select-none"
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg border transition-colors ${isPivotExpanded ? 'bg-blue-500/20 border-blue-500/40' : 'bg-blue-500/5 border-blue-500/10'}`}>
              <Info className={`w-4 h-4 transition-colors ${isPivotExpanded ? 'text-blue-400' : 'text-slate-500'}`} />
            </div>
            <div className="text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white italic">Tactical Pivot Bounds</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Support & Resistance Levels</p>
            </div>
          </div>
          <div className="p-1 bg-slate-950 rounded-lg border border-slate-800 group-hover:border-slate-700 transition-colors">
            {isPivotExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </div>
        </button>

        <AnimatePresence>
          {isPivotExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="p-4 relative overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                <div className="space-y-2 font-sans">
                   <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest pl-2 border-l-2 border-emerald-500">Resistance (Upside)</div>
                   {levels.resistance.map((l, i) => (
                     <div key={i} className="flex justify-between items-center py-1.5 px-3 bg-slate-950/40 rounded-lg font-mono text-xs border border-slate-800/40">
                       <span className="text-slate-500">R{i+1}</span>
                       <span className="text-emerald-400 font-bold">${l.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                     </div>
                   ))}
                </div>

                <div className="space-y-2 font-sans">
                   <div className="text-[9px] font-bold text-rose-400 uppercase tracking-widest pl-2 border-l-2 border-rose-500">Support (Downside)</div>
                   {levels.support.map((l, i) => (
                     <div key={i} className="flex justify-between items-center py-1.5 px-3 bg-slate-950/40 rounded-lg font-mono text-xs border border-slate-800/40">
                       <span className="text-slate-500">S{i+1}</span>
                       <span className="text-rose-400 font-bold">${l.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                     </div>
                   ))}
                </div>
              </div>
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[64px] font-black pointer-events-none opacity-[0.02] uppercase italic select-none">
                PIVOT: ${levels.pivot.toFixed(2)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Multi-Factor Evaluation Segment */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl font-sans">
        <button 
          onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
          className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800 cursor-pointer hover:from-slate-800 hover:to-slate-800 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg border transition-colors ${isAnalysisExpanded ? 'bg-blue-500/20 border-blue-500/40' : 'bg-blue-500/5 border-blue-500/10'}`}>
              <Activity className={`w-4 h-4 transition-colors ${isAnalysisExpanded ? 'text-blue-400' : 'text-slate-500'}`} />
            </div>
            <div className="text-left font-sans">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white italic">Structured Stock Technical Analysis</h3>
              <p className="text-[9px] text-slate-505 font-bold uppercase tracking-wider">Multi-Factor Convergent Evaluation</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end font-sans">
              <div className="text-[9px] font-black text-slate-505 uppercase tracking-tighter col-span-1 border-t-0">Confidence Index</div>
              <div className="text-xs font-mono font-black text-emerald-400">{signals.strength}%</div>
            </div>
            <div className="p-1 bg-slate-950 rounded-lg border border-slate-800 group-hover:border-slate-700 transition-colors">
              {isAnalysisExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </div>
          </div>
        </button>

        <AnimatePresence>
          {isAnalysisExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Trend Structure */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Trend Structure
                    </div>
                    <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Alignment</span>
                        <span className={`text-[10px] font-black uppercase ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isUp ? 'Bullish Sync' : 'Bearish Sync'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${isUp ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} 
                          style={{ width: `${signals.strength}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed italic">
                        {isUp 
                          ? 'Price trading above the 20-day exponential moving average, confirming continuous positive float.'
                          : 'Price trading below the 20-day exponential moving average, showing consistent resistance pressure.'}
                      </p>
                    </div>
                  </div>

                  {/* RSI Momentum Gauge */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                      <Gauge className="w-3.5 h-3.5" />
                      RSI Momentum Gauge
                    </div>
                    <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden">
                      <div className="flex items-center justify-between z-10 relative">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">RSI (14)</span>
                        <span className={`text-xl font-mono font-black ${signals.indicators.rsi! > 70 ? 'text-rose-400' : signals.indicators.rsi! < 30 ? 'text-emerald-400' : 'text-blue-400'}`}>
                          {signals.indicators.rsi!.toFixed(1)}
                        </span>
                      </div>
                      
                      <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden flex">
                        <div className="w-[30%] h-full border-r border-slate-900/50 bg-rose-500/20" title="Oversold" />
                        <div className="w-[40%] h-full border-r border-slate-900/50" />
                        <div className="w-[30%] h-full bg-emerald-500/20" title="Overbought" />
                        
                        <div 
                          className="absolute top-0 bottom-0 w-1.5 bg-white border border-slate-950 shadow-[0_0_8px_rgba(255,255,255,0.8)] -ml-0.5 rounded-full"
                          style={{ left: `${signals.indicators.rsi}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest">
                        <span>Oversold</span>
                        <span>Neutral</span>
                        <span>Overbought</span>
                      </div>
                    </div>
                  </div>

                  {/* Volatility Index */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                      <Shield className="w-3.5 h-3.5" />
                      True Range Volatility (ATR)
                    </div>
                    <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Spread Limit</span>
                        <span className="font-mono text-xs font-bold text-white">
                          ${signals.indicators.atr!.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: '45%' }} />
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed italic">
                        Average technical trading spread is restricted to standard thresholds representing healthy volume indexes.
                      </p>
                    </div>
                  </div>

                  {/* Fib Speed Retracements */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                      <Zap className="w-3.5 h-3.5" />
                      Fib Velocity Target
                    </div>
                    <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Retracement</span>
                        <span className="text-[10px] font-mono text-emerald-400 font-extrabold bg-emerald-950 px-2 py-0.5 border border-emerald-500/30 rounded">
                          0.618 Golden
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500/80" style={{ width: '61.8%' }} />
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed italic">
                        Fibonacci coefficients support continuation trends as support indexes remain undisturbed.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stock news panel */}
      <StockNewsPanel symbol={stock.symbol} name={stock.name} />

    </div>
  );
};
