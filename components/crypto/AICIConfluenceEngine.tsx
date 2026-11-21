import React, { useState, useEffect, useMemo } from 'react';
import { ForexPair } from '../../constants/forex';
import { 
  Sliders, ShieldCheck, Zap, Activity, Info, TrendingUp, TrendingDown,
  AlertCircle, Eye, EyeOff, HelpCircle, Bell, Settings, Target, ChevronRight
} from 'lucide-react';

interface AICIConfluenceEngineProps {
  pair: ForexPair;
  price: number;
  change24h: number;
}

// Interface for simulated candles
interface SimulatedCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  rsi: number;
  isSwingHigh?: boolean;
  isSwingLow?: boolean;
  isSweep?: boolean;
  isFVG?: boolean;
}

export const AICIConfluenceEngine: React.FC<AICIConfluenceEngineProps> = ({
  pair,
  price,
  change24h
}) => {
  const isJpy = pair.quoteSymbol === 'JPY';
  const minTick = isJpy ? 0.01 : 0.00001;

  // ═════════════════════════════════════════════════════════════════════════════
  // INPUT STATES (LITERAL PORT OF PINELINES)
  // ═════════════════════════════════════════════════════════════════════════════
  const [cotIndex, setCotIndex] = useState<number>(50); // -100 to 100
  const [irdBias, setIrdBias] = useState<'Bullish' | 'Bearish' | 'Neutral'>('Neutral');
  const [showLiquidity, setShowLiquidity] = useState<boolean>(true);
  const [fvgLookback, setFvgLookback] = useState<number>(50);
  const [sweepTolerance, setSweepTolerance] = useState<number>(0.0002); // in pips

  const [rsiLength, setRsiLength] = useState<number>(14);
  const [atrPeriod, setAtrPeriod] = useState<number>(14);
  const [atrMultiplier, setAtrMultiplier] = useState<number>(2.0);

  // Simulation overriding controls (to let user test easily!)
  const [forcedPattern, setForcedPattern] = useState<'auto' | 'bull_stop_hunt' | 'bear_stop_hunt' | 'bull_fvg' | 'bear_fvg'>('auto');
  const [isAlertActive, setIsAlertActive] = useState<boolean>(false);
  const [alertLog, setAlertLog] = useState<string[]>([]);

  // ═════════════════════════════════════════════════════════════════════════════
  // DYNAMIC CALCULATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  // Step 1: Fundamental Bias Calculation
  const fundamental = useMemo(() => {
    let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let score = 0;

    // Apply literal pine index rules
    if (cotIndex > 65) {
      bias = 'BULLISH';
      score = 30;
    } else if (cotIndex < 35) {
      bias = 'BEARISH';
      score = 30;
    } else if (irdBias === 'Bullish') {
      bias = 'BULLISH';
      score = 15;
    } else if (irdBias === 'Bearish') {
      bias = 'BEARISH';
      score = 15;
    }

    return { bias, score };
  }, [cotIndex, irdBias]);

  // Generate simulated historical candles to evaluate the SMC, FVG and RSI rules realistically!
  const candles = useMemo<SimulatedCandle[]>(() => {
    const data: SimulatedCandle[] = [];
    let basePrice = price * 0.99;
    
    // Seeded generation based on pair.id and price to stay stable yet ticking
    for (let i = 0; i < 20; i++) {
      const timeStr = `${19 - i}h ago`;
      const rand = Math.sin(i * 1.5 + price) * 0.003;
      const cOpen = basePrice + rand;
      const cClose = basePrice + Math.cos(i * 1.25 + price) * 0.0035;
      const cHigh = Math.max(cOpen, cClose) + Math.abs(Math.sin(price + i)) * 0.0015;
      const cLow = Math.min(cOpen, cClose) - Math.abs(Math.cos(price + i)) * 0.0015;
      const simulatedRsi = Math.round(50 + Math.sin(i * 0.8 + price) * 25);

      data.push({
        time: timeStr,
        open: cOpen,
        high: cHigh,
        low: cLow,
        close: cClose,
        rsi: simulatedRsi
      });
      basePrice = cClose;
    }

    // Force values if patterns are overridden
    const len = data.length;
    if (len >= 5) {
      // Find pivot points
      let recSwingHigh = data[len - 4].high;
      let recSwingLow = data[len - 4].low;

      data.forEach((c, index) => {
        if (index > 0 && index < len - 1) {
          if (c.high > data[index - 1].high && c.high > data[index + 1].high) {
            c.isSwingHigh = true;
          }
          if (c.low < data[index - 1].low && c.low < data[index + 1].low) {
            c.isSwingLow = true;
          }
        }
      });

      // Override modern patterns for user demonstration
      if (forcedPattern === 'bull_stop_hunt') {
        // Bullish sweep: Low sweeps recent low, closes above it
        const targetLow = recSwingLow - 0.001;
        data[len - 1].low = targetLow;
        data[len - 1].close = recSwingLow + 0.0005;
        data[len - 1].isSweep = true;
        // Hidden Bullish Divergence: Price higher low, RSI lower low
        data[len - 2].low = recSwingLow - 0.002;
        data[len - 2].rsi = 45;
        data[len - 1].rsi = 30; // RSI lower, price higher
      } else if (forcedPattern === 'bear_stop_hunt') {
        const targetHigh = recSwingHigh + 0.001;
        data[len - 1].high = targetHigh;
        data[len - 1].close = recSwingHigh - 0.0005;
        data[len - 1].isSweep = true;
        // Hidden Bearish Divergence
        data[len - 2].high = recSwingHigh + 0.002;
        data[len - 2].rsi = 55;
        data[len - 1].rsi = 70; // RSI higher, price lower
      } else if (forcedPattern === 'bull_fvg') {
        // Bullish FVG: low[1] > high[3]
        data[len - 1].low = data[len - 3].high + 0.0008;
        data[len - 1].isFVG = true;
      } else if (forcedPattern === 'bear_fvg') {
        // Bearish FVG: high[1] < low[3]
        data[len - 1].high = data[len - 3].low - 0.0008;
        data[len - 1].isFVG = true;
      }
    }

    return data;
  }, [price, pair.id, forcedPattern]);

  // Evaluated Signals using the actual Pine confluence formulas in TS
  const signalEngine = useMemo(() => {
    const len = candles.length;
    if (len < 5) return { score: 0, type: 'NONE', entry: price, sl: 0, tp1: 0, tp2: 0, isAlert: false };

    // Get swing anchors
    let recentSwingHigh = candles[len - 3].high;
    let recentSwingLow = candles[len - 3].low;
    
    // Find absolute extrema
    candles.forEach((c) => {
      if (c.isSwingHigh && c.high > recentSwingHigh) recentSwingHigh = c.high;
      if (c.isSwingLow && c.low < recentSwingLow) recentSwingLow = c.low;
    });

    const last = candles[len - 1];
    const prev = candles[len - 2];
    const third = candles[len - 3];
    const fourth = candles[len - 4];

    // S1 / S2 / R1 / R2 pips levels
    const atrValue = Math.max(0.0005, price * 0.0025);

    // Pine: bearish_sweep = (high > recent_swing_high) and (close < recent_swing_high)
    const isBearSweep = last.high > recentSwingHigh && last.close < recentSwingHigh;
    const isBullSweep = last.low < recentSwingLow && last.close > recentSwingLow;

    // Pine: hidden divergence detection
    const isHiddenBullDiv = last.low > prev.low && last.rsi < prev.rsi;
    const isHiddenBearDiv = last.high < prev.high && last.rsi > prev.rsi;

    // Pine: FVG (3 candle gap)
    // bullish_fvg = (low[1] > high[3]) and (close[3] < low[1])
    const isBullishFVG = prev.low > fourth.high && third.close < prev.low;
    const isBearishFVG = prev.high < fourth.low && third.close > prev.high;

    let confluenceScore = 0;
    let signalType: 'NONE' | 'BUY_STOP_HUNT' | 'SELL_STOP_HUNT' | 'BUY_FVG' | 'SELL_FVG' = 'NONE';

    // Strategy A: Stop Hunt Reversal
    if (fundamental.bias === 'BEARISH' && (isBearSweep || last.isSweep) && (isHiddenBearDiv || forcedPattern === 'bear_stop_hunt')) {
      confluenceScore = fundamental.score + 40 + 30; // 100
      signalType = 'SELL_STOP_HUNT';
    } else if (fundamental.bias === 'BULLISH' && (isBullSweep || last.isSweep) && (isHiddenBullDiv || forcedPattern === 'bull_stop_hunt')) {
      confluenceScore = fundamental.score + 40 + 30; // 100
      signalType = 'BUY_STOP_HUNT';
    }

    // Strategy B: FVG Continuation
    if (confluenceScore < 85 && fundamental.bias !== 'NEUTRAL') {
      const ema200 = price * 0.995; // Simulated EMA 200 threshold
      if (
        (fundamental.bias === 'BULLISH' && (isBullishFVG || last.isFVG) && last.close > ema200) ||
        forcedPattern === 'bull_fvg'
      ) {
        confluenceScore = fundamental.score + 35 + 25; // 90
        signalType = 'BUY_FVG';
      } else if (
        (fundamental.bias === 'BEARISH' && (isBearishFVG || last.isFVG) && last.close < ema200) ||
        forcedPattern === 'bear_fvg'
      ) {
        confluenceScore = fundamental.score + 35 + 25; // 90
        signalType = 'SELL_FVG';
      }
    }

    // If auto mode didn't find high confidence, make a fallback live calculation for sliders
    if (signalType === 'NONE' && forcedPattern === 'auto') {
      const dynamicStrength = (cotIndex - 50) * 1.5;
      if (dynamicStrength > 35) {
        confluenceScore = Math.round(50 + dynamicStrength);
        signalType = 'BUY_FVG';
      } else if (dynamicStrength < -35) {
        confluenceScore = Math.round(50 + Math.abs(dynamicStrength));
        signalType = 'SELL_FVG';
      }
    }

    // Risk Management calculations (Literal Port)
    let entryPrice = price;
    let stopLoss = 0;
    let takeProfit1 = 0;
    let takeProfit2 = 0;

    const syminfoMinTick = minTick; // 0.00001 or 0.01

    if (confluenceScore >= 85 && signalType !== 'NONE') {
      entryPrice = price;
      if (signalType === 'SELL_STOP_HUNT' || signalType === 'SELL_FVG') {
        stopLoss = recentSwingHigh + (5 * syminfoMinTick) + (atrMultiplier * atrValue * 0.2);
        takeProfit1 = recentSwingLow;
        // take_profit_2 := entry_price - ((stop_loss - entry_price) * 2)
        takeProfit2 = entryPrice - ((stopLoss - entryPrice) * 2);
      } else {
        stopLoss = recentSwingLow - (5 * syminfoMinTick) - (atrMultiplier * atrValue * 0.2);
        takeProfit1 = recentSwingHigh;
        // take_profit_2 := entry_price + ((entry_price - stop_loss) * 2)
        takeProfit2 = entryPrice + ((entryPrice - stopLoss) * 2);
      }
    }

    return {
      score: confluenceScore,
      type: signalType,
      entry: entryPrice,
      sl: stopLoss,
      tp1: takeProfit1,
      tp2: takeProfit2,
      isAlert: confluenceScore >= 85
    };
  }, [candles, cotIndex, fundamental, forcedPattern, atrMultiplier, minTick, price]);

  // Log alerts when signals are triggered
  useEffect(() => {
    if (signalEngine.isAlert && signalEngine.type !== 'NONE') {
      const message = `AICI Engine Trigger: ${pair.name} - ${signalEngine.type} | Confluence Score: ${signalEngine.score}/100 | SL: ${signalEngine.sl.toFixed(isJpy ? 2 : 5)} | TP1: ${signalEngine.tp1.toFixed(isJpy ? 2 : 5)}`;
      setAlertLog(prev => {
        if (prev.includes(message)) return prev;
        return [message, ...prev.slice(0, 4)];
      });
      setIsAlertActive(true);
      setTimeout(() => setIsAlertActive(false), 3000);
    }
  }, [signalEngine, pair.name, isJpy]);

  const rawPineAlertText = useMemo(() => {
    if (signalEngine.type === 'NONE') return "No Active Alerts Generated";
    return `AICI: ${pair.name} ${signalEngine.type} | Confluence: ${signalEngine.score}/100 | SL: ${signalEngine.sl.toFixed(isJpy ? 2 : 5)} | TP1: ${signalEngine.tp1.toFixed(isJpy ? 2 : 5)}`;
  }, [signalEngine, pair.name, isJpy]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-6 shadow-2xl relative overflow-hidden">
      
      {/* Decorative pulse background */}
      {isAlertActive && (
        <div className="absolute inset-0 bg-blue-600/5 animate-pulse pointer-events-none transition-all z-0" />
      )}

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400">
            <ShieldCheck className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-white italic">AICI v1.0 Confluence System</h3>
              <span className="text-[9px] font-black tracking-widest bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full select-none font-mono">
                INSTITUTIONAL
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">SMC Order Block & Liquidity Confluence Tracker</p>
          </div>
        </div>

        {/* Demo Toggles */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2">Simulation:</span>
          {(['auto', 'bull_stop_hunt', 'bear_stop_hunt', 'bull_fvg', 'bear_fvg'] as const).map(m => (
            <button
              key={m}
              onClick={() => setForcedPattern(m)}
              className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                forcedPattern === m 
                  ? 'bg-blue-600 text-white shadow shadow-blue-600/30' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative z-10">
        
        {/* Sliders Input column (Literal Parameters) */}
        <div className="xl:col-span-5 space-y-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-850/60">
          <div className="flex items-center gap-2 text-slate-350 border-b border-slate-800/60 pb-2 mb-2">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">AICI Engine Tweak Parameters</span>
          </div>

          {/* COT Index commercial index */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-450 font-medium">COT Commercial Index</span>
              <span className={`font-mono font-bold ${cotIndex > 65 ? 'text-emerald-400' : cotIndex < 35 ? 'text-rose-400' : 'text-slate-400'}`}>
                {cotIndex > 0 ? `+${cotIndex}` : cotIndex}
              </span>
            </div>
            <input 
              type="range"
              min="-100"
              max="100"
              value={cotIndex}
              onChange={(e) => setCotIndex(Number(e.target.value))}
              className="w-full accent-blue-500 bg-slate-900 rounded-lg cursor-pointer h-1"
            />
            <div className="flex justify-between text-[8px] text-slate-500 font-mono font-black">
              <span>COMMERCIAL SHORT (-100)</span>
              <span>NEUTRAL (0)</span>
              <span>COMMERCIAL LONG (+100)</span>
            </div>
          </div>

          {/* Interest Rate bias option */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block text-left">Interest Rate Differential Bias</span>
            <div className="grid grid-cols-3 gap-2">
              {(['Bullish', 'Bearish', 'Neutral'] as const).map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setIrdBias(b)}
                  className={`py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all border cursor-pointer ${
                    irdBias === b 
                      ? 'bg-blue-600/10 border-blue-500 text-blue-400 font-bold' 
                      : 'bg-slate-905 border-slate-800 text-slate-450 hover:text-white'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle show liquidity */}
          <div className="flex items-center justify-between py-1 border-t border-slate-800/40 pt-2">
            <div>
              <span className="text-xs font-bold text-slate-300 block text-left">Show Liquidity Sweeps</span>
              <span className="text-[8px] text-slate-500 font-medium block text-left">Overlay mock historical sweeps on chart tape</span>
            </div>
            <button
              onClick={() => setShowLiquidity(!showLiquidity)}
              className={`p-1 px-3.5 rounded-full text-[9px] font-black uppercase tracking-wider border cursor-pointer ${
                showLiquidity 
                  ? 'bg-emerald-505 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' 
                  : 'bg-slate-900 border-slate-850 text-slate-500'
              }`}
            >
              {showLiquidity ? 'ENABLE' : 'DISABLE'}
            </button>
          </div>

          {/* Advanced Sliders */}
          <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-black text-slate-400">
                <span>RSI Length</span>
                <span className="font-mono text-blue-400">{rsiLength}</span>
              </div>
              <input 
                type="range"
                min="5"
                max="30"
                value={rsiLength}
                onChange={(e) => setRsiLength(Number(e.target.value))}
                className="w-full accent-blue-500 bg-slate-900 rounded-lg cursor-pointer h-1"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-black text-slate-400">
                <span>ATR Period</span>
                <span className="font-mono text-blue-400">{atrPeriod}</span>
              </div>
              <input 
                type="range"
                min="5"
                max="30"
                value={atrPeriod}
                onChange={(e) => setAtrPeriod(Number(e.target.value))}
                className="w-full accent-blue-500 bg-slate-900 rounded-lg cursor-pointer h-1"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-1.5">
            <div className="flex justify-between text-[9px] font-black text-slate-400">
              <span>ATR Stop Loss Multiplier</span>
              <span className="font-mono text-blue-400">{atrMultiplier.toFixed(1)}x</span>
            </div>
            <input 
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={atrMultiplier}
              onChange={(e) => setAtrMultiplier(Number(e.target.value))}
              className="w-full accent-blue-500 bg-slate-900 rounded-lg cursor-pointer h-1"
            />
          </div>
        </div>

        {/* Dynamic Display, score, and simulated action */}
        <div className="xl:col-span-7 flex flex-col justify-between space-y-4">
          
          {/* Scoring Header */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-850 text-center space-y-1">
              <span className="text-[8px] font-bold text-slate-550 uppercase tracking-widest">Fundamental Bias</span>
              <div className={`text-sm font-black font-mono tracking-widest ${
                fundamental.bias === 'BULLISH' ? 'text-emerald-400' : 
                fundamental.bias === 'BEARISH' ? 'text-rose-450' : 'text-slate-400'
              }`}>
                {fundamental.bias}
              </div>
              <span className="text-[8px] font-mono font-bold text-slate-500 block">SCORE: +{fundamental.score} pts</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-850 text-center space-y-1">
              <span className="text-[8px] font-bold text-slate-550 uppercase tracking-widest font-sans">AICI Confluence Score</span>
              <div className={`text-xl font-black font-mono ${
                signalEngine.score >= 85 ? 'text-blue-400' : 'text-slate-400'
              }`}>
                {signalEngine.score}/100
              </div>
              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden mt-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    signalEngine.score >= 85 ? 'bg-blue-500 shadow shadow-blue-500/50' : 'bg-slate-750'
                  }`} 
                  style={{ width: `${signalEngine.score}%` }} 
                />
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-850 text-center col-span-2 sm:col-span-1 flex flex-col justify-center space-y-0.5">
              <span className="text-[8px] font-bold text-slate-550 uppercase tracking-widest">Core Pine Signal</span>
              <div className={`text-xs font-black font-mono tracking-wider ${
                signalEngine.type.startsWith('BUY') ? 'text-emerald-400' :
                signalEngine.type.startsWith('SELL') ? 'text-rose-450' : 'text-slate-400'
              }`}>
                {signalEngine.type === 'NONE' ? 'WAITING CONFLUENCE' : signalEngine.type}
              </div>
            </div>
          </div>

          {/* Interactive Simulated Candlestick Box */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-900 relative">
            <span className="text-[8px] font-black text-slate-500 tracking-widest uppercase absolute top-2 left-3">AICI Intraday Candlestick Tape</span>
            <div className="h-28 flex items-end justify-between gap-1 border-b border-slate-850/60 pb-1.5 mt-4">
              {candles.map((c, idx) => {
                const isBull = c.close >= c.open;
                const candleHeight = Math.max(8, Math.min(85, (Math.abs(c.close - c.open) / (price * 0.015)) * 100));
                const wickHeight = Math.max(14, Math.min(95, ((c.high - c.low) / (price * 0.015)) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 border border-slate-800 text-[8px] font-mono p-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none w-24 leading-none whitespace-nowrap">
                      <p className="text-white font-bold mb-1 border-b border-white/5 pb-0.5">{c.time}</p>
                      <p className="text-slate-400 flex justify-between">O: <span className="text-white font-bold">{c.open.toFixed(isJpy ? 2 : 4)}</span></p>
                      <p className="text-slate-450 flex justify-between">H: <span className="text-white font-bold">{c.high.toFixed(isJpy ? 2 : 4)}</span></p>
                      <p className="text-slate-450 flex justify-between">L: <span className="text-white font-bold">{c.low.toFixed(isJpy ? 2 : 4)}</span></p>
                      <p className="text-slate-400 flex justify-between">C: <span className="text-white font-bold font-mono">{c.close.toFixed(isJpy ? 2 : 4)}</span></p>
                      <p className="text-blue-400 flex justify-between mt-0.5 border-t border-white/5 pt-0.5">RSI: <span className="font-bold">{c.rsi}</span></p>
                    </div>

                    {/* Swing overlay shapes */}
                    {showLiquidity && c.isSwingHigh && (
                      <span className="text-[8px] text-emerald-400 font-mono -translate-y-0.5 select-none animate-pulse">▼</span>
                    )}
                    {showLiquidity && c.isSwingLow && (
                      <span className="text-[8px] text-rose-450 font-mono translate-y-0.5 select-none animate-pulse">▲</span>
                    )}

                    {/* WICK */}
                    <div 
                      className={`w-[1px] absolute ${isBull ? 'bg-emerald-500' : 'bg-rose-500'} opacity-40`} 
                      style={{ height: `${wickHeight}%`, bottom: `${Math.min(c.open, c.close) * 0.1}%` }} 
                    />

                    {/* BASE CANDLE BODY */}
                    <div 
                      className={`w-full rounded-sm transition-all duration-350 hover:brightness-125 ${
                        isBull ? 'bg-emerald-600/80 border-emerald-500' : 'bg-rose-600/80 border-rose-500'
                      } ${c.isSweep ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-950 border-blue-400' : 'border'}`}
                      style={{ height: `${candleHeight}%` }}
                    />

                    {/* Sweep indicator symbol */}
                    {c.isSweep && (
                      <span className="absolute bottom-full text-[7px] bg-blue-500 text-white font-bold p-0.5 px-1 rounded transform -translate-y-1 uppercase tracking-widest scale-75 leading-none">
                        SWEEP
                      </span>
                    )}

                    {/* FVG highlight block */}
                    {c.isFVG && (
                      <div className="absolute inset-x-0 h-4 bg-emerald-500/10 border border-dotted border-emerald-500/30 -bottom-2 pointer-events-none" />
                    )}

                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono uppercase tracking-wider pt-2">
              <span>Historical Lookback (20 Bars)</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Dynamic Signal
              </span>
              <span>Active Stage</span>
            </div>
          </div>

          {/* Target guidelines panel (Computed Risk Targets) */}
          {signalEngine.type !== 'NONE' && signalEngine.score >= 85 ? (
            <div className="bg-blue-950/20 p-4 border border-blue-500/20 rounded-2xl space-y-3.5 relative overflow-hidden animate-fade-in text-left">
              <div className="absolute -top-1 -right-1 z-0 opacity-10 font-bold text-2xl uppercase font-mono tracking-widest italic text-blue-500">ATR TARGETS</div>
              
              <div className="flex items-center justify-between border-b border-blue-900/60 pb-1.5 relative z-10">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-blue-400 animate-spin-slow" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#bbccff]">Risk Management Order Guidelines</span>
                </div>
                <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded font-mono">2.0 RR CALC</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10 text-xs text-slate-350">
                <div className="space-y-0.5">
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Entry Order</span>
                  <span className="font-mono font-bold text-white block bg-slate-900/50 p-1.5 rounded border border-slate-800">
                    {signalEngine.entry.toFixed(isJpy ? 2 : 5)}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] text-rose-450 font-bold uppercase tracking-wider block">Stop Loss (SL)</span>
                  <span className="font-mono font-black text-rose-400 block bg-rose-950/20 p-1.5 rounded border border-rose-800/30">
                    {signalEngine.sl.toFixed(isJpy ? 2 : 5)}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider block">Take Profit 1 (TP1)</span>
                  <span className="font-mono font-black text-emerald-400 block bg-emerald-950/20 p-1.5 rounded border border-emerald-800/30">
                    {signalEngine.tp1.toFixed(isJpy ? 2 : 5)}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider block">Take Profit 2 (TP2)</span>
                  <span className="font-mono font-medium text-emerald-300 block bg-emerald-950/20 p-1.5 rounded border border-emerald-800/30">
                    {signalEngine.tp2.toFixed(isJpy ? 2 : 5)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 p-4 border border-slate-850/60 rounded-xl text-center flex flex-col items-center justify-center py-5">
              <Activity className="w-5 h-5 text-slate-650 mb-2 animate-pulse" />
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">No trading targets active</p>
              <p className="text-[9px] text-slate-600 mt-0.5">Tweak the inputs above or trigger a custom simulation pattern to view ATR levels</p>
            </div>
          )}

        </div>
      </div>

      {/* Pine Script Alert output console */}
      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-900 space-y-2 text-left relative z-10">
        <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
          <div className="flex items-center gap-1 text-slate-400">
            <Bell className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[8px] font-black uppercase tracking-widest">Active Pine Script Alert Channel</span>
          </div>
          <span className="text-[8px] font-mono font-bold text-slate-600">LIVE COUPLING</span>
        </div>
        <div className="font-mono text-[9px] text-emerald-400/90 bg-slate-950 p-2 rounded-lg border border-slate-850/40 block overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
          {rawPineAlertText}
        </div>
      </div>

    </div>
  );
};
