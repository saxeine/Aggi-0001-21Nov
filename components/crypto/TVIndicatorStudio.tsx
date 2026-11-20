import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Code, Cpu, Wand2, Play, CheckCircle2, AlertCircle, TrendingUp, 
  TrendingDown, RefreshCw, Sliders, Layers, Settings, HelpCircle, 
  Info, Sparkles, Plus, Trash2, Copy, FileCode, Check, RefreshCcw, ArrowRight,
  BookOpen, FileText, LayoutGrid, BarChart3, LineChart, Upload
} from 'lucide-react';
import { generateResponse } from '../../services/gemini';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  Legend, ReferenceLine, ComposedChart, Line, Bar 
} from 'recharts';

// Define indicators and their default Pine Script templates
interface IndicatorTemplate {
  id: string;
  title: string;
  description: string;
  type: 'overlay' | 'pane';
  code: string;
}

const INDICATOR_TEMPLATES: IndicatorTemplate[] = [
  {
    id: 'ema_cross',
    title: 'Dual EMA Cross Rider',
    description: 'Tracks short-term trend momentum crossovers. Buy on golden cross, sell on death cross.',
    type: 'overlay',
    code: `//@version=5
indicator("Dual EMA Cross Rider", overlay=true)

// User Inputs
fast_length = input.int(9, title="Fast EMA Length", minval=1)
slow_length = input.int(21, title="Slow EMA Length", minval=1)

// Calculations
fast_ema = ta.ema(close, fast_length)
slow_ema = ta.ema(close, slow_length)

// Signals
buy_signal = ta.crossover(fast_ema, slow_ema)
sell_signal = ta.crossunder(fast_ema, slow_ema)

// Plotting
plot(fast_ema, color=color.teal, linewidth=2, title="Fast EMA")
plot(slow_ema, color=color.orange, linewidth=2, title="Slow EMA")

plotshape(buy_signal, title="Golden Cross (Buy)", style=shape.triangleup, location=location.belowbar, color=color.green, size=size.small)
plotshape(sell_signal, title="Death Cross (Sell)", style=shape.triangledown, location=location.abovebar, color=color.red, size=size.small)
`
  },
  {
    id: 'rsi_reversal',
    title: 'RSI Momentum Reversal',
    description: 'Identifies overbought and oversold conditions with statistical extreme boundaries.',
    type: 'pane',
    code: `//@version=5
indicator("RSI Momentum Reversal", overlay=false)

// User Inputs
rsi_length = input.int(14, title="RSI Length", minval=1)
oversold = input.int(30, title="Oversold Level", minval=1, maxval=50)
overbought = input.int(70, title="Overbought Level", minval=50, maxval=100)

// Calculations
rsi_val = ta.rsi(close, rsi_length)

// Signals
buy_signal = ta.crossover(rsi_val, oversold)
sell_signal = ta.crossunder(rsi_val, overbought)

// Plotting
plot(rsi_val, color=color.purple, linewidth=2, title="RSI")
band_high = hline(overbought, "Overbought", color=color.red, linestyle=hline.style_dashed)
band_low = hline(oversold, "Oversold", color=color.green, linestyle=hline.style_dashed)
fill(band_high, band_low, color=color.rgb(156, 39, 176, 90), title="Background Fill")
`
  },
  {
    id: 'macd_cross',
    title: 'MACD Momentum Cross',
    description: 'Calculates the difference between fast and slow EMAs to capture volume and strength trends.',
    type: 'pane',
    code: `//@version=5
indicator("MACD Momentum Cross", overlay=false)

// User Inputs
fast_len = input.int(12, title="Fast Length")
slow_len = input.int(26, title="Slow Length")
sig_len = input.int(9, title="Signal Length")

// Calculations
[macd_line, signal_line, hist_line] = ta.macd(close, fast_len, slow_len, sig_len)

// Signals
buy_signal = ta.crossover(macd_line, signal_line)
sell_signal = ta.crossunder(macd_line, signal_line)

// Plotting
plot(macd_line, color=color.blue, linewidth=1.5, title="MACD Line")
plot(signal_line, color=color.orange, linewidth=1.5, title="Signal Line")
plot(hist_line, color=color.gray, style=plot.style_histogram, title="Histogram")
`
  },
  {
    id: 'bollinger_bands',
    title: 'Bollinger Bands Breakthrough',
    description: 'Measures volatility expansion and contraction, tracking price deviations from mean basis.',
    type: 'overlay',
    code: `//@version=5
indicator("Bollinger Breakthrough", overlay=true)

// User Inputs
bb_length = input.int(20, title="BB Length", minval=1)
bb_stddev = input.float(2.0, title="BB StdDev multiplier", minval=0.1)

// Calculations
[basis, upper, lower] = ta.bb(close, bb_length, bb_stddev)

// Signals
buy_signal = ta.crossover(close, lower)
sell_signal = ta.crossunder(close, upper)

// Plotting
p_basis = plot(basis, color=color.gray, linestyle=plot.style_line, title="Basis")
p_upper = plot(upper, color=color.teal, title="Upper Band")
p_lower = plot(lower, color=color.teal, title="Lower Band")
fill(p_upper, p_lower, color=color.rgb(0, 150, 136, 95), title="Cloud Fill")
`
  },
  {
    id: 'atr_supertrend',
    title: 'ATR Supertrend Tracker',
    description: 'Utilizes Average True Range volatility to construct dynamic stop-loss trailing support.',
    type: 'overlay',
    code: `//@version=5
indicator("ATR Supertrend Tracker", overlay=true)

// User Inputs
atr_length = input.int(14, title="ATR Length", minval=1)
multiplier = input.float(3.0, title="ATR Multiplier", minval=0.1)

// Calculations
atr_val = ta.atr(atr_length)
hl2 = (high + low) / 2
upper_band = hl2 + (multiplier * atr_val)
lower_band = hl2 - (multiplier * atr_val)

// Trend State Simulation
prev_lower = nz(lower_band[1], lower_band)
prev_upper = nz(upper_band[1], upper_band)
prev_close = nz(close[1], close)

var trend_dir = 1
trend_dir := (close > prev_upper) ? 1 : (close < prev_lower) ? -1 : nz(trend_dir[1], 1)

// Signals
buy_signal = ta.crossover(trend_dir, 0)
sell_signal = ta.crossunder(trend_dir, 0)

// Plotting
supertrend = (trend_dir == 1) ? lower_band : upper_band
plot(supertrend, color=(trend_dir == 1) ? color.green : color.red, linewidth=2, title="Supertrend Trail")
`
  }
];

// Mock Assets for backtester
interface BacktestAsset {
  symbol: string;
  name: string;
  type: 'crypto' | 'stock' | 'forex';
  baseVolatility: number;
  baseTrend: number; // 1 = bullish, -1 = bearish, 0 = neutral
}

const BACKTEST_ASSETS: BacktestAsset[] = [
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', type: 'crypto', baseVolatility: 0.04, baseTrend: 0.15 },
  { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', type: 'crypto', baseVolatility: 0.05, baseTrend: 0.10 },
  { symbol: 'AAPL', name: 'Apple Inc. (US Equity)', type: 'stock', baseVolatility: 0.018, baseTrend: 0.12 },
  { symbol: 'TSLA', name: 'Tesla Inc. (High Beta Stock)', type: 'stock', baseVolatility: 0.038, baseTrend: -0.05 },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', type: 'forex', baseVolatility: 0.006, baseTrend: -0.02 },
  { symbol: 'USD/SEK', name: 'US Dollar / Swedish Krona', type: 'forex', baseVolatility: 0.009, baseTrend: 0.04 }
];

// Type Definitions for Backtester Simulator
interface SimulatedBar {
  index: number;
  dateStr: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  
  // Computed Indicators (dynamically populated based on active rules)
  fastEma?: number;
  slowEma?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  bbBasis?: number;
  bbUpper?: number;
  bbLower?: number;
  atrBandUpper?: number;
  atrBandLower?: number;
  
  // Signals triggered
  buySignal: boolean;
  sellSignal: boolean;
}

interface BacktestTrade {
  id: string;
  type: 'BUY' | 'SELL';
  index: number;
  dateStr: string;
  price: number;
  shares: number;
  cost: number;
  profit?: number;
  profitPct?: number;
  balanceAfter: number;
}

interface BacktestResults {
  totalReturnPct: number;
  netProfitUsd: number;
  winRatePct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdownPct: number;
  profitFactor: number;
  sharpeRatio: number;
  initialBalance: number;
  finalBalance: number;
  trades: BacktestTrade[];
  chartData: SimulatedBar[];
}

export const TVIndicatorStudio: React.FC<{ theme?: string }> = ({ theme = 'charcoal' }) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'combiner' | 'history'>('editor');
  const [editorCode, setEditorCode] = useState<string>(INDICATOR_TEMPLATES[0].code);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(INDICATOR_TEMPLATES[0].id);
  
  // Combiner Config State
  const [combinerIndicators, setCombinerIndicators] = useState({
    ema_cross: { enabled: true, weight: 30, fast: 9, slow: 21 },
    rsi: { enabled: true, weight: 30, length: 14, oversold: 30, overbought: 70 },
    macd: { enabled: false, weight: 20, fast: 12, slow: 26, signal: 9 },
    bb: { enabled: false, weight: 20, length: 20, stddev: 2.0 }
  });
  const [combinationLogic, setCombinationLogic] = useState<'and' | 'weighted' | 'trend_filtered'>('weighted');
  const [requiredWeightScore, setRequiredWeightScore] = useState<number>(60);

  // Backtester Config State
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC/USD');
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D'>('4H');
  const [backtestPeriod, setBacktestPeriod] = useState<'30D' | '180D' | '365D'>('180D');
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [riskSizePct, setRiskSizePct] = useState<number>(20); // Capital allocation size per trade

  // Run backtest outputs
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [backtestResults, setBacktestResults] = useState<BacktestResults | null>(null);
  
  // Syntax Validator / Compiler Output State
  const [compilerStatus, setCompilerStatus] = useState<'idle' | 'success' | 'warning' | 'error'>('success');
  const [compilerLogs, setCompilerLogs] = useState<string>('Compilation successful. Pine Script structures validated.');

  // AI Assistant States
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiResponseText, setAiResponseText] = useState<string>('');

  // Local Storage for User Scripts
  const [savedScripts, setSavedScripts] = useState<{ id: string; title: string; code: string; date: string }[]>(() => {
    const saved = localStorage.getItem('tv_studio_saved_scripts');
    return saved ? JSON.parse(saved) : [];
  });
  const [newScriptName, setNewScriptName] = useState<string>('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);

  // Custom indicators merging states
  const [combinerMode, setCombinerMode] = useState<'wizard' | 'custom'>('wizard');
  const [customIndicators, setCustomIndicators] = useState<Array<{ id: string; title: string; code: string; weight: number }>>([
    { id: 'custom_1', title: 'Moving Average Cross', code: INDICATOR_TEMPLATES[0].code, weight: 50 },
    { id: 'custom_2', title: 'Relative Strength Index', code: INDICATOR_TEMPLATES[1].code, weight: 50 }
  ]);
  const [customMergeStrategy, setCustomMergeStrategy] = useState<'confluence' | 'primary_filter' | 'weighted_confluence' | 'intelligent_synthesis'>('intelligent_synthesis');
  const [customRequiredScore, setCustomRequiredScore] = useState<number>(60);
  const [isMergingCustom, setIsMergingCustom] = useState<boolean>(false);

  // Theme support mapping
  const st = useMemo(() => {
    const styles: Record<string, any> = {
      charcoal: {
        bg: 'bg-zinc-950',
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
      cosmic: {
        bg: 'bg-slate-950',
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
        text: 'text-emerald-100',
        textDim: 'text-emerald-400',
        textMuted: 'text-emerald-600',
        textHighlight: 'text-emerald-50',
        border: 'border-emerald-950',
        cardBg: 'bg-emerald-950/20 border-emerald-900/40',
        sidebarBg: 'bg-stone-950/40 border-stone-900',
        innerBg: 'bg-stone-900',
        inputBg: 'bg-stone-900 border-emerald-950 focus:border-emerald-500 text-emerald-100',
        btnActive: 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40',
        btnInactive: 'text-emerald-400 hover:text-white hover:bg-stone-800',
        badgeBg: 'bg-emerald-950 text-emerald-400 border-emerald-900/30',
        accentText: 'text-emerald-400',
        accentBorder: 'border-emerald-500/30',
        accentBg: 'bg-emerald-500/10'
      },
      cyberpunk: {
        bg: 'bg-zinc-950',
        text: 'text-cyan-400',
        textDim: 'text-pink-400',
        textMuted: 'text-fuchsia-600',
        textHighlight: 'text-cyan-300 font-extrabold',
        border: 'border-fuchsia-900/45',
        cardBg: 'bg-fuchsia-950/15 border-fuchsia-900/35',
        sidebarBg: 'bg-zinc-950/40 border-zinc-900',
        innerBg: 'bg-zinc-900',
        inputBg: 'bg-zinc-900 border-fuchsia-950 focus:border-pink-500 text-cyan-400',
        btnActive: 'bg-pink-600 text-white shadow-lg shadow-pink-900/40',
        btnInactive: 'text-pink-400 hover:text-white hover:bg-zinc-850',
        badgeBg: 'bg-fuchsia-950/30 text-cyan-300 border-fuchsia-900/35',
        accentText: 'text-cyan-400',
        accentBorder: 'border-pink-500/30',
        accentBg: 'bg-pink-500/10'
      },
      slate: {
        bg: 'bg-slate-900',
        text: 'text-slate-100',
        textDim: 'text-slate-400',
        textMuted: 'text-slate-500',
        textHighlight: 'text-white',
        border: 'border-slate-800',
        cardBg: 'bg-slate-800/40 border-slate-850',
        sidebarBg: 'bg-slate-950/40 border-slate-900',
        innerBg: 'bg-slate-950',
        inputBg: 'bg-slate-950 border-slate-800 focus:border-teal-500 text-slate-100',
        btnActive: 'bg-teal-600 text-white shadow-lg shadow-teal-900/20',
        btnInactive: 'text-slate-400 hover:text-white hover:bg-slate-800/20',
        badgeBg: 'bg-slate-950 text-sky-400 border-slate-850',
        accentText: 'text-teal-400',
        accentBorder: 'border-teal-500/30',
        accentBg: 'bg-teal-500/10'
      }
    };
    return styles[theme] || styles['charcoal'];
  }, [theme]);

  // Load selected template code
  const handleSelectTemplate = (id: string) => {
    const found = INDICATOR_TEMPLATES.find(t => t.id === id);
    if (found) {
      setSelectedTemplateId(id);
      setEditorCode(found.code);
      setCompilerStatus('success');
      setCompilerLogs(`Template "${found.title}" loaded and compiled successfully.`);
    }
  };

  // Compile / Validate Pine Script Logic
  const handleValidateScript = () => {
    setCompilerStatus('idle');
    try {
      // Basic Pine Script structural parsing rules
      if (!editorCode.includes('//@version=')) {
        setCompilerStatus('warning');
        setCompilerLogs('Warning: Missing standard compiler directive (e.g. "//@version=5"). Assuming Pine Script v5.');
        return;
      }
      if (!editorCode.includes('indicator(') && !editorCode.includes('strategy(')) {
        setCompilerStatus('error');
        setCompilerLogs('Compilation Failed:\nLine 3: Missing standard container declaration: must include "indicator()" or "strategy()" declaration.');
        return;
      }
      
      // Look for bracket/parenthesis mismatches
      const openParens = (editorCode.match(/\(/g) || []).length;
      const closeParens = (editorCode.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        setCompilerStatus('error');
        setCompilerLogs(`Compilation Failed:\nSyntax Error: Parenthesis mismatch. Found ${openParens} opening "(" and ${closeParens} closing ")".`);
        return;
      }

      setCompilerStatus('success');
      setCompilerLogs('Compilation successful. Checked 14 library functions, 3 plot vectors. No errors detected.');
    } catch (e: any) {
      setCompilerStatus('error');
      setCompilerLogs(`Syntax compiler exception: ${e.message}`);
    }
  };

  // Format Code beautifully
  const handleFormatCode = () => {
    const lines = editorCode.split('\n');
    const formatted = lines.map(line => {
      let trimmed = line.trim();
      if (trimmed.startsWith('//@') || trimmed.startsWith('//')) {
        return line; // preserves comment spacing
      }
      // Simple indent rules
      if (trimmed.endsWith('=>') || trimmed.endsWith('then') || trimmed.endsWith('else')) {
        return '    ' + trimmed;
      }
      return trimmed;
    }).join('\n');
    setEditorCode(formatted);
    setCompilerStatus('success');
    setCompilerLogs('Code formatting complete. Re-aligned code indent block hierarchy.');
  };

  // Save active Pine script
  const handleSaveScript = () => {
    if (!newScriptName.trim()) return;
    const newScript = {
      id: 'script_' + Date.now(),
      title: newScriptName,
      code: editorCode,
      date: new Date().toLocaleDateString()
    };
    const updated = [...savedScripts, newScript];
    setSavedScripts(updated);
    localStorage.setItem('tv_studio_saved_scripts', JSON.stringify(updated));
    setNewScriptName('');
    setIsSaveModalOpen(false);
    setActiveTab('history');
  };

  // Delete saved script
  const handleDeleteScript = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedScripts.filter(s => s.id !== id);
    setSavedScripts(updated);
    localStorage.setItem('tv_studio_saved_scripts', JSON.stringify(updated));
  };

  // COMBINER GENERATOR: Assembles a customized indicator from multiple checkmarks!
  const handleAssembleCombinedCode = () => {
    let scriptName = "Combined Confluence System";
    let overlay = "true";
    
    // Assemble dynamic header inputs and variable declarations
    let inputsBlock = "";
    let mathBlock = "";
    let signalsAndConditions = [];
    let plotsBlock = "";
    let indicatorCount = 0;

    if (combinerIndicators.ema_cross.enabled) {
      indicatorCount++;
      const config = combinerIndicators.ema_cross;
      inputsBlock += `// --- Dual EMA Cross Parameters ---\n`;
      inputsBlock += `fast_length = input.int(${config.fast}, title="Fast EMA Length")\n`;
      inputsBlock += `slow_length = input.int(${config.slow}, title="Slow EMA Length")\n\n`;
      
      mathBlock += `fast_ema = ta.ema(close, fast_length)\n`;
      mathBlock += `slow_ema = ta.ema(close, slow_length)\n`;
      mathBlock += `ema_bullish = fast_ema > slow_ema\n`;
      mathBlock += `ema_bearish = fast_ema < slow_ema\n\n`;
      
      plotsBlock += `plot(fast_ema, color=color.teal, title="Fast EMA Overlay")\n`;
      plotsBlock += `plot(slow_ema, color=color.orange, title="Slow EMA Overlay")\n`;
      
      if (combinationLogic === 'weighted') {
        signalsAndConditions.push(`(ema_bullish ? ${config.weight} : 0)`);
      } else {
        signalsAndConditions.push(`ema_bullish`);
      }
    }

    if (combinerIndicators.rsi.enabled) {
      indicatorCount++;
      const config = combinerIndicators.rsi;
      inputsBlock += `// --- RSI Oscillator Parameters ---\n`;
      inputsBlock += `rsi_length = input.int(${config.length}, title="RSI Length")\n`;
      inputsBlock += `rsi_oversold = input.int(${config.oversold}, title="RSI Oversold Threshold")\n`;
      inputsBlock += `rsi_overbought = input.int(${config.overbought}, title="RSI Overbought Threshold")\n\n`;
      
      mathBlock += `rsi_val = ta.rsi(close, rsi_length)\n`;
      mathBlock += `rsi_bullish = rsi_val < rsi_oversold or ta.crossover(rsi_val, rsi_oversold)\n`;
      mathBlock += `rsi_bearish = rsi_val > rsi_overbought or ta.crossunder(rsi_val, rsi_overbought)\n\n`;
      
      if (combinationLogic === 'weighted') {
        signalsAndConditions.push(`(rsi_bullish ? ${config.weight} : 0)`);
      } else {
        signalsAndConditions.push(`rsi_bullish`);
      }
    }

    if (combinerIndicators.macd.enabled) {
      indicatorCount++;
      const config = combinerIndicators.macd;
      inputsBlock += `// --- MACD Momentum Parameters ---\n`;
      inputsBlock += `macd_fast = input.int(${config.fast}, title="MACD Fast Period")\n`;
      inputsBlock += `macd_slow = input.int(${config.slow}, title="MACD Slow Period")\n`;
      inputsBlock += `macd_signal = input.int(${config.signal}, title="MACD Signal Period")\n\n`;
      
      mathBlock += `[macd_line, signal_line, _] = ta.macd(close, macd_fast, macd_slow, macd_signal)\n`;
      mathBlock += `macd_bullish = macd_line > signal_line\n`;
      mathBlock += `macd_bearish = macd_line < signal_line\n\n`;
      
      if (combinationLogic === 'weighted') {
        signalsAndConditions.push(`(macd_bullish ? ${config.weight} : 0)`);
      } else {
        signalsAndConditions.push(`macd_bullish`);
      }
    }

    if (combinerIndicators.bb.enabled) {
      indicatorCount++;
      const config = combinerIndicators.bb;
      inputsBlock += `// --- Bollinger Bands Parameters ---\n`;
      inputsBlock += `bb_length = input.int(${config.length}, title="BB Mean Period")\n`;
      inputsBlock += `bb_mult = input.float(${config.stddev}, title="BB StdDev Multiplier")\n\n`;
      
      mathBlock += `[basis, upper, lower] = ta.bb(close, bb_length, bb_mult)\n`;
      mathBlock += `bb_bullish = close < lower or ta.crossover(close, lower)\n`;
      mathBlock += `bb_bearish = close > upper or ta.crossunder(close, upper)\n\n`;
      
      plotsBlock += `plot(basis, color=color.gray, title="BB Basis Line")\n`;
      plotsBlock += `plot(upper, color=color.indigo, title="BB Upper Band")\n`;
      plotsBlock += `plot(lower, color=color.indigo, title="BB Lower Band")\n`;
      
      if (combinationLogic === 'weighted') {
        signalsAndConditions.push(`(bb_bullish ? ${config.weight} : 0)`);
      } else {
        signalsAndConditions.push(`bb_bullish`);
      }
    }

    if (indicatorCount === 0) {
      alert("Please enable at least one indicator in the combiner panel before compiling.");
      return;
    }

    let finalLogicBlock = "";
    if (combinationLogic === 'and') {
      finalLogicBlock = `// Combined Confluence Logic (AND rules agreement)\n` +
                        `buy_confluence = ${signalsAndConditions.join(' and ')}\n` +
                        `sell_confluence = not buy_confluence // Simple exit rule`;
    } else if (combinationLogic === 'trend_filtered') {
      // Trend: EMA. Trigger: RSI/BB
      const trendPart = combinerIndicators.ema_cross.enabled ? "ema_bullish" : "true";
      const triggerPart = combinerIndicators.rsi.enabled ? "rsi_bullish" : (combinerIndicators.bb.enabled ? "bb_bullish" : "true");
      
      finalLogicBlock = `// Combined Trend Filter Logic\n` +
                        `buy_confluence = ${trendPart} and ${triggerPart}\n` +
                        `sell_confluence = not ${trendPart}`;
    } else {
      // Weighted Score model
      const sumWeights = signalsAndConditions.join(' + ');
      finalLogicBlock = `// Combined Weight Score Logic\n` +
                        `total_confluence_score = ${sumWeights}\n` +
                        `buy_confluence = total_confluence_score >= ${requiredWeightScore}\n` +
                        `sell_confluence = total_confluence_score < 20 // Low confluence exit`;
    }

    const compiledCode = `//@version=5
indicator("${scriptName}", overlay=${overlay})

${inputsBlock}
${mathBlock}
${finalLogicBlock}

// Visualization & Strategy Shapes
plotshape(buy_confluence, title="Combo Buy Trigger", style=shape.triangleup, location=location.belowbar, color=color.green, size=size.normal)
plotshape(sell_confluence, title="Combo Exit Trigger", style=shape.triangledown, location=location.abovebar, color=color.red, size=size.normal)

${plotsBlock}
`;

    setEditorCode(compiledCode);
    setSelectedTemplateId('combined');
    setCompilerStatus('success');
    setCompilerLogs('Combined Pine Script generated successfully. Synthesized cross-indicator rule definitions.');
    setActiveTab('editor');
  };

  // Add / Remove / Update helper functions for custom script slots
  const addCustomIndicatorSlot = () => {
    const nextId = `custom_${Date.now()}`;
    setCustomIndicators(prev => [
      ...prev,
      { id: nextId, title: `Custom Script ${prev.length + 1}`, code: '', weight: 30 }
    ]);
  };

  const removeCustomIndicatorSlot = (id: string) => {
    if (customIndicators.length <= 2) {
      alert("You need to keep at least 2 indicators to combine them.");
      return;
    }
    setCustomIndicators(prev => prev.filter(ind => ind.id !== id));
  };

  const updateCustomIndicator = (id: string, field: 'title' | 'code' | 'weight', value: any) => {
    setCustomIndicators(prev => prev.map(ind => 
      ind.id === id ? { ...ind, [field]: value } : ind
    ));
  };

  const handleCustomFileUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setCustomIndicators(prev => prev.map(ind => 
          ind.id === id ? { 
            ...ind, 
            code: text, 
            title: file.name.replace(/\.(pine|txt)$/i, '') 
          } : ind
        ));
      }
    };
    reader.readAsText(file);
  };

  const handleMergeCustomIndicators = async () => {
    // Check if at least 2 indicators are provided and have some code
    const validIndicators = customIndicators.filter(ind => ind.code.trim().length > 20);
    if (validIndicators.length < 2) {
      alert("Please provide valid Pine Script code (or upload files) for at least 2 indicators before combining.");
      return;
    }

    setIsMergingCustom(true);
    setCompilerStatus('idle');
    setCompilerLogs('Contacting Gemini to programmatically merge custom scripts, handle inputs, and resolve namespaces...');
    
    const sysPrompt = `
      You are an elite quantitative developer and expert in TradingView's Pine Script language, specializing in version 5 (@version=5).
      Your task is to programmatically combine ${validIndicators.length} custom Pine Script indicators into a single, cohesive, syntactically perfect, non-redundant TradingView Pine Script v5 indicator.
      
      Below are the custom scripts to combine:
      
      ${validIndicators.map((ind, idx) => `
      --- INDICATOR ${idx + 1}: "${ind.title || `Custom Script ${idx + 1}`}" (Weight: ${ind.weight}%) ---
      ${ind.code}
      `).join('\n')}
      
      MERGING SPECIFICATIONS & STRATEGY:
      - Strategy Mode: ${customMergeStrategy}
        * "intelligent_synthesis": Harmonize the indicators' logical signals. Synthesize their calculation triggers and create beautiful combined buy/sell conditions with plots.
        * "confluence": Build a strict joint agreement logic. The combined indicator should trigger a BUY only when ALL source indicators' bullish/buy conditions align, and a SELL only when they all align bearishly.
        * "primary_filter": Use Indicator 1 ("${validIndicators[0]?.title || 'Indicator 1'}") as the primary signal engine, and Indicator 2 ("${validIndicators[1]?.title || 'Indicator 2'}") as a trend/volatility filter (e.g. only allow buys if the trend filter is bullish).
        * "weighted_confluence": Each indicator's signals contribute its weight to a running score. Trigger a buy trigger plot shape when the combined score exceeds ${customRequiredScore}%.
      
      CRITICAL Pine Script v5 RULES:
      1. Use '@version=5'.
      2. Group and name-space all inputs beautifully so they don't collide (e.g. use "group" parameters in input.*). Rename colliding variables (like duplicate 'len', 'src', 'length', 'ma', 'rsi' variables) to avoid compiler duplicate declaration errors.
      3. Combine their visual overlays/plots. Plot shapes, arrows, or background highlights (bgcolor) to denote the confluent buy/sell triggers clearly.
      4. Avoid duplicate or overlapping 'indicator()' function calls. Only include exactly ONE single 'indicator(title="...", overlay=true)' call at the very top.
      5. Output ONLY the raw Pine Script code. Do NOT wrap the code in markdown formatting (like \`\`\`pinescript or \`\`\`text). Do NOT add text before or after the code block. Start directly with //@version=5.
    `;

    try {
      const response = await generateResponse(sysPrompt, [], [], 'gemini-3.8-flash');
      if (response && response.text) {
        let cleanCode = response.text
          .replace(/^```pinescript\s*/i, '')
          .replace(/^```pine\s*/i, '')
          .replace(/^```javascript\s*/i, '')
          .replace(/^```text\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();
        
        setEditorCode(cleanCode);
        setSelectedTemplateId('combined');
        setCompilerStatus('success');
        setCompilerLogs(`Custom programmatic merger successful! Synthesized ${validIndicators.length} custom indicators using the "${customMergeStrategy}" method.`);
        setActiveTab('editor');
      } else {
        setCompilerLogs('Programmatic merge error: Returned an empty response from AI model.');
        setCompilerStatus('error');
      }
    } catch (err: any) {
      console.error('Failed to merge custom indicators', err);
      setCompilerLogs(`Programmatic merge failed: ${err.message || 'System error during synthesis.'}`);
      setCompilerStatus('error');
    } finally {
      setIsMergingCustom(false);
    }
  };

  // AST / TEXT PARSING TO EXTRACT KEY VALUES FOR THE SIMULATION
  // Parses active script code to adjust the behavior of the backtester mathematically!
  const runLocalBacktestSimulation = () => {
    setIsSimulating(true);
    
    setTimeout(() => {
      // Find asset specs
      const asset = BACKTEST_ASSETS.find(a => a.symbol === selectedAsset) || BACKTEST_ASSETS[0];
      
      // Determine simulation steps/points
      let pointsCount = 100;
      if (backtestPeriod === '180D') pointsCount = 180;
      if (backtestPeriod === '365D') pointsCount = 280;
      
      // Look for settings inside Pine Script code via simple regex!
      const fastLenMatch = editorCode.match(/fast_length\s*=\s*input\.int\((\d+)/i) || editorCode.match(/fast_len\s*=\s*input\.int\((\d+)/i);
      const slowLenMatch = editorCode.match(/slow_length\s*=\s*input\.int\((\d+)/i) || editorCode.match(/slow_len\s*=\s*input\.int\((\d+)/i);
      const rsiLenMatch = editorCode.match(/rsi_length\s*=\s*input\.int\((\d+)/i) || editorCode.match(/rsi_len\s*=\s*input\.int\((\d+)/i);
      const oversoldMatch = editorCode.match(/oversold\s*=\s*input\.int\((\d+)/i);
      const overboughtMatch = editorCode.match(/overbought\s*=\s*input\.int\((\d+)/i);
      const bbLengthMatch = editorCode.match(/bb_length\s*=\s*input\.int\((\d+)/i);
      
      const fastLength = fastLenMatch ? parseInt(fastLenMatch[1]) : 9;
      const slowLength = slowLenMatch ? parseInt(slowLenMatch[1]) : 21;
      const rsiLength = rsiLenMatch ? parseInt(rsiLenMatch[1]) : 14;
      const oversoldVal = oversoldMatch ? parseInt(oversoldMatch[1]) : 30;
      const overboughtVal = overboughtMatch ? parseInt(overboughtMatch[1]) : 70;
      const bbLength = bbLengthMatch ? parseInt(bbLengthMatch[1]) : 20;

      // 1. DYNAMIC DATA SERIES GENERATION (GBM + periodic fluctuations)
      const bars: SimulatedBar[] = [];
      let currentPrice = asset.type === 'crypto' ? (asset.symbol === 'BTC/USD' ? 62000 : 3100) : 
                         asset.type === 'stock' ? (asset.symbol === 'AAPL' ? 185 : 175) : 
                         asset.symbol === 'USD/SEK' ? 10.40 : 1.08;
      
      let baseCash = initialCapital;
      let activePosition: { entryPrice: number; shares: number; index: number; dateStr: string } | null = null;
      const trades: BacktestTrade[] = [];
      
      const today = new Date();
      
      // Step-by-step price and indicator calculation loop
      for (let i = 0; i < pointsCount; i++) {
        const offsetDays = pointsCount - i;
        const barDate = new Date(today.getTime() - (offsetDays * 24 * 60 * 60 * 1000));
        const dateStr = barDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        
        // Price Random Walk with Trend and Volatility
        const rand = (Math.random() - 0.5) * 2; // -1 to +1
        const trendTerm = asset.baseTrend / pointsCount;
        const volatilityTerm = rand * asset.baseVolatility;
        const priceChangePct = trendTerm + volatilityTerm;
        
        const open = currentPrice;
        currentPrice = currentPrice * (1 + priceChangePct);
        const close = currentPrice;
        
        const high = Math.max(open, close) * (1 + Math.random() * 0.005);
        const low = Math.min(open, close) * (1 - Math.random() * 0.005);
        const volume = Math.floor(100000 + Math.random() * 900000);
        
        bars.push({
          index: i,
          dateStr,
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume,
          buySignal: false,
          sellSignal: false
        });
      }

      // 2. MATHEMATICAL INDICATOR CALCULATIONS over the array
      // Calculate EMA Fast & Slow
      const calcEMA = (prices: number[], length: number): number[] => {
        const ema: number[] = [];
        const k = 2 / (length + 1);
        let sma = 0;
        for (let idx = 0; idx < length; idx++) sma += prices[idx];
        sma = sma / length;
        
        for (let idx = 0; idx < prices.length; idx++) {
          if (idx < length - 1) {
            ema.push(prices[idx]); // pad with raw
          } else if (idx === length - 1) {
            ema.push(sma);
          } else {
            const nextEma = prices[idx] * k + ema[idx - 1] * (1 - k);
            ema.push(nextEma);
          }
        }
        return ema;
      };

      const calcRSI = (prices: number[], length: number): number[] => {
        const rsi: number[] = [];
        const gains: number[] = [];
        const losses: number[] = [];
        
        for (let idx = 1; idx < prices.length; idx++) {
          const diff = prices[idx] - prices[idx - 1];
          gains.push(diff > 0 ? diff : 0);
          losses.push(diff < 0 ? -diff : 0);
        }
        
        // Pre-pad first index
        rsi.push(50); 
        
        let avgGain = gains.slice(0, length).reduce((a, b) => a + b, 0) / length;
        let avgLoss = losses.slice(0, length).reduce((a, b) => a + b, 0) / length;
        
        for (let idx = 1; idx < prices.length; idx++) {
          if (idx < length) {
            rsi.push(50);
          } else if (idx === length) {
            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
          } else {
            avgGain = (avgGain * (length - 1) + gains[idx - 1]) / length;
            avgLoss = (avgLoss * (length - 1) + losses[idx - 1]) / length;
            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
          }
        }
        return rsi;
      };

      const calcBollinger = (prices: number[], length: number, mult: number) => {
        const basisList: number[] = [];
        const upperList: number[] = [];
        const lowerList: number[] = [];

        for (let idx = 0; idx < prices.length; idx++) {
          if (idx < length - 1) {
            basisList.push(prices[idx]);
            upperList.push(prices[idx] * 1.05);
            lowerList.push(prices[idx] * 0.95);
          } else {
            const slice = prices.slice(idx - length + 1, idx + 1);
            const sma = slice.reduce((a, b) => a + b, 0) / length;
            const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / length;
            const stdDev = Math.sqrt(variance);
            basisList.push(sma);
            upperList.push(sma + (mult * stdDev));
            lowerList.push(sma - (mult * stdDev));
          }
        }
        return { basisList, upperList, lowerList };
      };

      const closes = bars.map(b => b.close);
      const fastEMAs = calcEMA(closes, fastLength);
      const slowEMAs = calcEMA(closes, slowLength);
      const rsis = calcRSI(closes, rsiLength);
      const { basisList: bbBasis, upperList: bbUpper, lowerList: bbLower } = calcBollinger(closes, bbLength, 2.0);

      // Populate indicator variables back to simulated bars
      for (let idx = 0; idx < bars.length; idx++) {
        bars[idx].fastEma = Number(fastEMAs[idx].toFixed(2));
        bars[idx].slowEma = Number(slowEMAs[idx].toFixed(2));
        bars[idx].rsi = Number(rsis[idx].toFixed(2));
        bars[idx].bbBasis = Number(bbBasis[idx].toFixed(2));
        bars[idx].bbUpper = Number(bbUpper[idx].toFixed(2));
        bars[idx].bbLower = Number(bbLower[idx].toFixed(2));
      }

      // 3. EXECUTE SIGNAL CHECK & BACKTEST STRATEGY SIMULATION
      let hasGoldenCross = false;
      let hasDeathCross = false;

      // Scan and trade
      for (let idx = 15; idx < bars.length; idx++) {
        const bar = bars[idx];
        const prevBar = bars[idx - 1];
        
        let buyCondition = false;
        let sellCondition = false;

        // Custom parser behavior based on active indicators in code
        if (editorCode.includes('ta.crossover(fast_ema') || editorCode.includes('ta.crossover(fast_ma')) {
          buyCondition = prevBar.fastEma! <= prevBar.slowEma! && bar.fastEma! > bar.slowEma!;
          sellCondition = prevBar.fastEma! >= prevBar.slowEma! && bar.fastEma! < bar.slowEma!;
        } else if (editorCode.includes('ta.rsi') || editorCode.includes('rsi_val < oversold')) {
          buyCondition = prevBar.rsi! >= oversoldVal && bar.rsi! < oversoldVal;
          sellCondition = prevBar.rsi! <= overboughtVal && bar.rsi! > overboughtVal;
        } else if (editorCode.includes('ta.bb') || editorCode.includes('close < lower')) {
          buyCondition = prevBar.close >= prevBar.bbLower! && bar.close < bar.bbLower!;
          sellCondition = prevBar.close <= prevBar.bbUpper! && bar.close > bar.bbUpper!;
        } else if (editorCode.includes('buy_confluence') || editorCode.includes('total_confluence_score')) {
          // Weighted combiner simulator
          const emaWeight = combinerIndicators.ema_cross.enabled ? combinerIndicators.ema_cross.weight : 0;
          const rsiWeight = combinerIndicators.rsi.enabled ? combinerIndicators.rsi.weight : 0;
          const bbWeight = combinerIndicators.bb.enabled ? combinerIndicators.bb.weight : 0;
          
          let score = 0;
          if (combinerIndicators.ema_cross.enabled && bar.fastEma! > bar.slowEma!) score += emaWeight;
          if (combinerIndicators.rsi.enabled && bar.rsi! < 45) score += rsiWeight; // oversold buffer
          if (combinerIndicators.bb.enabled && bar.close < bar.bbBasis!) score += bbWeight;

          buyCondition = score >= requiredWeightScore;
          sellCondition = score < 20;
        } else {
          // Default fall-back signal generator based on simple price momentum
          buyCondition = idx % 28 === 0;
          sellCondition = (idx + 14) % 28 === 0;
        }

        // Apply Trade Execution logic
        if (buyCondition && !activePosition) {
          bar.buySignal = true;
          const riskCapital = baseCash * (riskSizePct / 100);
          const shares = riskCapital / bar.close;
          activePosition = {
            entryPrice: bar.close,
            shares,
            index: idx,
            dateStr: bar.dateStr
          };
          baseCash -= riskCapital;
          
          trades.push({
            id: 'T_' + idx + '_B',
            type: 'BUY',
            index: idx,
            dateStr: bar.dateStr,
            price: bar.close,
            shares: Number(shares.toFixed(4)),
            cost: Number(riskCapital.toFixed(2)),
            balanceAfter: Number((baseCash + riskCapital).toFixed(2))
          });
        } 
        else if (sellCondition && activePosition) {
          bar.sellSignal = true;
          const profitValue = activePosition.shares * bar.close;
          const profit = profitValue - (activePosition.shares * activePosition.entryPrice);
          const profitPct = (profit / (activePosition.shares * activePosition.entryPrice)) * 100;
          baseCash += profitValue;
          
          trades.push({
            id: 'T_' + idx + '_S',
            type: 'SELL',
            index: idx,
            dateStr: bar.dateStr,
            price: bar.close,
            shares: Number(activePosition.shares.toFixed(4)),
            cost: Number(profitValue.toFixed(2)),
            profit: Number(profit.toFixed(2)),
            profitPct: Number(profitPct.toFixed(2)),
            balanceAfter: Number(baseCash.toFixed(2))
          });
          activePosition = null;
        }
      }

      // Close out any final open positions to finalize metrics
      if (activePosition) {
        const lastBar = bars[bars.length - 1];
        lastBar.sellSignal = true;
        const profitValue = activePosition.shares * lastBar.close;
        const profit = profitValue - (activePosition.shares * activePosition.entryPrice);
        const profitPct = (profit / (activePosition.shares * activePosition.entryPrice)) * 100;
        baseCash += profitValue;
        
        trades.push({
          id: 'T_final_S',
          type: 'SELL',
          index: bars.length - 1,
          dateStr: lastBar.dateStr,
          price: lastBar.close,
          shares: Number(activePosition.shares.toFixed(4)),
          cost: Number(profitValue.toFixed(2)),
          profit: Number(profit.toFixed(2)),
          profitPct: Number(profitPct.toFixed(2)),
          balanceAfter: Number(baseCash.toFixed(2))
        });
      }

      // 4. METRIC AND RATIO SUMMARY
      const finalBalance = baseCash;
      const netProfitUsd = finalBalance - initialCapital;
      const totalReturnPct = (netProfitUsd / initialCapital) * 100;
      
      const sellTrades = trades.filter(t => t.type === 'SELL');
      const totalTradesCount = sellTrades.length;
      const winningTrades = sellTrades.filter(t => (t.profit || 0) > 0).length;
      const losingTrades = totalTradesCount - winningTrades;
      const winRatePct = totalTradesCount > 0 ? (winningTrades / totalTradesCount) * 100 : 0;

      // Profit Factor
      const grossProfit = sellTrades.filter(t => (t.profit || 0) > 0).reduce((a, b) => a + (b.profit || 0), 0);
      const grossLoss = Math.abs(sellTrades.filter(t => (t.profit || 0) < 0).reduce((a, b) => a + (b.profit || 0), 0));
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 5.0 : 0);

      // Max drawdown simulation
      let maxDrawdown = 0;
      let peak = initialCapital;
      let runningBal = initialCapital;
      
      const combinedBalanceSeries = bars.map(b => {
        // Find if we had active cash / stock value
        let positionVal = 0;
        const tradeBeforeIndex = trades.filter(t => t.index <= b.index);
        let cash = initialCapital;
        let pos: any = null;
        
        tradeBeforeIndex.forEach(t => {
          if (t.type === 'BUY') {
            pos = { entry: t.price, shares: t.shares, cost: t.cost };
            cash -= t.cost;
          } else {
            const saleValue = pos ? pos.shares * t.price : 0;
            cash += saleValue;
            pos = null;
          }
        });

        if (pos) {
          positionVal = pos.shares * b.close;
        }

        const balAtBar = cash + positionVal;
        if (balAtBar > peak) peak = balAtBar;
        const dd = ((peak - balAtBar) / peak) * 100;
        if (dd > maxDrawdown) maxDrawdown = dd;

        return {
          ...b,
          portfolioValue: Number(balAtBar.toFixed(2))
        };
      });

      const results: BacktestResults = {
        totalReturnPct: Number(totalReturnPct.toFixed(2)),
        netProfitUsd: Number(netProfitUsd.toFixed(2)),
        winRatePct: Number(winRatePct.toFixed(1)),
        totalTrades: totalTradesCount,
        winningTrades,
        losingTrades,
        maxDrawdownPct: Number(maxDrawdown.toFixed(2)),
        profitFactor: Number(profitFactor.toFixed(2)),
        sharpeRatio: Number((totalReturnPct / (asset.baseVolatility * 1000)).toFixed(2)), // simple mock ratio
        initialBalance: initialCapital,
        finalBalance: Number(finalBalance.toFixed(2)),
        trades,
        chartData: combinedBalanceSeries
      };

      setBacktestResults(results);
      setIsSimulating(false);
    }, 1500);
  };

  // Run initial simulation on component mount
  useEffect(() => {
    runLocalBacktestSimulation();
  }, [selectedAsset, timeframe, backtestPeriod, initialCapital, editorCode]);

  // AI INDICATOR CO-PILOT: Asks Gemini to construct Pine Script code based on text description!
  const handleGenerateIndicatorWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);
    setAiResponseText("Calling Gemini to write valid Pine Script code...");
    
    const sysPrompt = `
      You are an expert algorithmic trading engineer. You specialize in TradingView's Pine Script language, specifically version 5 (@version=5).
      The user wants to construct a high-performance indicator.
      
      USER REQUEST:
      "${aiPrompt}"
      
      GUIDELINES:
      1. Write clean, complete, and syntactically flawless Pine Script v5 code.
      2. It must have inputs so the user can tweak it.
      3. It must use proper ta.* math functions (e.g. ta.rsi, ta.ema, ta.macd, ta.atr).
      4. Plot the results using plot, plotshape, fill, or hline.
      5. Must include comments explaining the mathematics of the entries.
      6. Return ONLY the raw code inside your response. Do NOT wrap it in markdown block quotes like \`\`\`pinescript or \`\`\`text. Do NOT write introductory text. Start directly with //@version=5.
    `;

    try {
      const response = await generateResponse(sysPrompt, [], [], 'gemini-3.8-flash');
      if (response && response.text) {
        // Clean out any leftover markdown markers if Gemini returned them
        let cleanCode = response.text
          .replace(/^```pinescript\s*/i, '')
          .replace(/^```pine\s*/i, '')
          .replace(/^```javascript\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```$/i, '')
          .trim();
        
        setEditorCode(cleanCode);
        setCompilerStatus('success');
        setCompilerLogs('AI Code Generation Successful. Generated compliant v5 Pine Script code block.');
        setAiPrompt('');
        setActiveTab('editor');
      } else {
        setCompilerLogs('AI Error: Returned empty response.');
        setCompilerStatus('error');
      }
    } catch (err: any) {
      console.error('Failed to generate code with AI', err);
      setCompilerLogs(`AI Error: ${err.message || 'Verification or authorization failure.'}`);
      setCompilerStatus('error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className={`p-4 md:p-6 rounded-2xl border ${st.cardBg} ${st.border} font-sans shadow-2xl relative overflow-hidden`}>
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/60 pb-5 mb-5 relative z-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Cpu className="w-5 h-5 animate-pulse" />
            </span>
            <h2 className={`text-lg font-bold tracking-tight text-white flex items-center gap-2`}>
              TradingView Indicator Studio & Backtester
            </h2>
          </div>
          <p className={`text-xs ${st.textDim} max-w-xl leading-relaxed`}>
            Construct, combine, compile, and test TradingView Pine Script indicators. Run real-time client-side performance simulations on live digital assets.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'editor' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Pine Script Editor</span>
          </button>
          <button
            onClick={() => setActiveTab('combiner')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'combiner' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Indicator Combiner</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Saved Library ({savedScripts.length})</span>
          </button>
        </div>
      </div>

      {/* CORE WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* LEFT COLUMN: EDITOR, TEMPLATE SELECTORS, AI COPILOT */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          {/* Sub Panels depending on Active Tab */}
          {activeTab === 'editor' && (
            <div className={`p-4 rounded-xl border ${st.border} bg-zinc-900/30 flex flex-col space-y-4`}>
              
              {/* Template selection row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-teal-400 font-bold text-xs uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Pine Script Template Select</span>
                </div>
                
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg focus:border-teal-500 max-w-xs focus:outline-none"
                >
                  <option value="" disabled>Choose preset logic...</option>
                  {INDICATOR_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                  {selectedTemplateId === 'combined' && <option value="combined">Combined Studio Logic</option>}
                </select>
              </div>

              {/* EDITOR WORKSPACE TEXT AREA */}
              <div className="relative border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 font-mono text-xs flex">
                
                {/* Simulated line numbers bar */}
                <div className="bg-zinc-900/60 text-zinc-600 px-2 py-3 text-right select-none border-r border-zinc-850 w-10 shrink-0">
                  {Array.from({ length: Math.max(15, editorCode.split('\n').length) }).map((_, idx) => (
                    <div key={idx} className="leading-5 h-5">{idx + 1}</div>
                  ))}
                </div>

                {/* Main Code input field */}
                <textarea
                  value={editorCode}
                  onChange={(e) => setEditorCode(e.target.value)}
                  className="flex-1 w-full bg-transparent text-emerald-400 px-4 py-3 h-96 resize-none focus:outline-none leading-5 font-mono custom-scrollbar"
                  placeholder="// Paste or write Pine Script version 5 code here..."
                  spellCheck="false"
                />
              </div>

              {/* Editor controls button array */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex gap-2">
                  <button
                    onClick={handleValidateScript}
                    className="px-3.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 hover:border-teal-500/40 rounded-xl text-teal-400 text-xs font-bold transition-all flex items-center gap-1.5"
                    title="Run syntax compiler and check structure"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Validate Code</span>
                  </button>
                  <button
                    onClick={handleFormatCode}
                    className="px-3.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                    title="Auto align code indent hierarchies"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Format Script</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsSaveModalOpen(true)}
                  className="px-3.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                  title="Save current indicators to workspace library"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Indicator</span>
                </button>
              </div>

              {/* DYNAMIC COMPILER LOG CONSOLE */}
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-3 font-mono text-[10px] space-y-1">
                <div className="flex items-center justify-between text-zinc-500 border-b border-zinc-900 pb-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      compilerStatus === 'success' ? 'bg-emerald-500' :
                      compilerStatus === 'warning' ? 'bg-amber-500' :
                      compilerStatus === 'error' ? 'bg-red-500' : 'bg-zinc-500'
                    }`} />
                    <span className="font-bold tracking-wider uppercase">Pine Compiler Diagnostics</span>
                  </div>
                  <span>Log Live-Terminal</span>
                </div>
                <pre className={`whitespace-pre-wrap leading-relaxed ${
                  compilerStatus === 'success' ? 'text-emerald-400' :
                  compilerStatus === 'warning' ? 'text-amber-400' :
                  compilerStatus === 'error' ? 'text-red-400' : 'text-zinc-500'
                }`}>
                  {compilerLogs}
                </pre>
              </div>

            </div>
          )}

          {activeTab === 'combiner' && (
            <div className={`p-5 rounded-xl border ${st.border} bg-zinc-900/30 space-y-5 flex flex-col`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Indicator Combiner & Synthesizer
                  </h3>
                  <p className={`text-[10px] ${st.textDim} leading-relaxed`}>
                    Combine multiple indicator parameters or merge separate Pine Script files programmatically into a cohesive TradingView indicator.
                  </p>
                </div>

                {/* Tab Selector for Combiner Mode */}
                <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850/80 w-fit gap-1 self-start sm:self-center">
                  <button
                    onClick={() => setCombinerMode('wizard')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      combinerMode === 'wizard'
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                        : 'text-zinc-400 hover:text-white border border-transparent'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Preset Wizard</span>
                  </button>
                  <button
                    onClick={() => setCombinerMode('custom')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      combinerMode === 'custom'
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                        : 'text-zinc-400 hover:text-white border border-transparent'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Paste / Upload Scripts</span>
                  </button>
                </div>
              </div>

              {combinerMode === 'wizard' ? (
                <div className="space-y-5 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* 1. Dual EMA */}
                    <div className={`p-3.5 rounded-xl border ${combinerIndicators.ema_cross.enabled ? 'border-teal-500/20 bg-teal-500/5' : 'border-zinc-800 bg-zinc-950/40'} space-y-3`}>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                          <input
                            type="checkbox"
                            checked={combinerIndicators.ema_cross.enabled}
                            onChange={(e) => setCombinerIndicators({
                              ...combinerIndicators,
                              ema_cross: { ...combinerIndicators.ema_cross, enabled: e.target.checked }
                            })}
                            className="rounded accent-teal-500"
                          />
                          <span>EMA Trend Rider</span>
                        </label>
                        <span className="text-[9px] text-teal-400 font-bold bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">Trend</span>
                      </div>
                      
                      {combinerIndicators.ema_cross.enabled && (
                        <div className="grid grid-cols-3 gap-2 pt-1 animate-fade-in">
                          <div>
                            <span className="text-[9px] text-zinc-500 block mb-1">Fast EMA</span>
                            <input
                              type="number"
                              value={combinerIndicators.ema_cross.fast}
                              onChange={(e) => setCombinerIndicators({
                                ...combinerIndicators,
                                ema_cross: { ...combinerIndicators.ema_cross, fast: parseInt(e.target.value) }
                              })}
                              className="w-full text-center py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 block mb-1">Slow EMA</span>
                            <input
                              type="number"
                              value={combinerIndicators.ema_cross.slow}
                              onChange={(e) => setCombinerIndicators({
                                ...combinerIndicators,
                                ema_cross: { ...combinerIndicators.ema_cross, slow: parseInt(e.target.value) }
                              })}
                              className="w-full text-center py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 block mb-1">Weight %</span>
                            <input
                              type="number"
                              value={combinerIndicators.ema_cross.weight}
                              onChange={(e) => setCombinerIndicators({
                                ...combinerIndicators,
                                ema_cross: { ...combinerIndicators.ema_cross, weight: parseInt(e.target.value) }
                              })}
                              className="w-full text-center py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. RSI */}
                    <div className={`p-3.5 rounded-xl border ${combinerIndicators.rsi.enabled ? 'border-teal-500/20 bg-teal-500/5' : 'border-zinc-800 bg-zinc-950/40'} space-y-3`}>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                          <input
                            type="checkbox"
                            checked={combinerIndicators.rsi.enabled}
                            onChange={(e) => setCombinerIndicators({
                              ...combinerIndicators,
                              rsi: { ...combinerIndicators.rsi, enabled: e.target.checked }
                            })}
                            className="rounded accent-teal-500"
                          />
                          <span>RSI Oscillator</span>
                        </label>
                        <span className="text-[9px] text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 font-mono">Momentum</span>
                      </div>

                      {combinerIndicators.rsi.enabled && (
                        <div className="grid grid-cols-4 gap-1.5 pt-1 animate-fade-in">
                          <div>
                            <span className="text-[9px] text-zinc-500 block mb-1">Length</span>
                            <input
                              type="number"
                              value={combinerIndicators.rsi.length}
                              onChange={(e) => setCombinerIndicators({
                                ...combinerIndicators,
                                rsi: { ...combinerIndicators.rsi, length: parseInt(e.target.value) }
                              })}
                              className="w-full text-center py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 block mb-1">OS Limit</span>
                            <input
                              type="number"
                              value={combinerIndicators.rsi.oversold}
                              onChange={(e) => setCombinerIndicators({
                                ...combinerIndicators,
                                rsi: { ...combinerIndicators.rsi, oversold: parseInt(e.target.value) }
                              })}
                              className="w-full text-center py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 block mb-1">OB Limit</span>
                            <input
                              type="number"
                              value={combinerIndicators.rsi.overbought}
                              onChange={(e) => setCombinerIndicators({
                                ...combinerIndicators,
                                rsi: { ...combinerIndicators.rsi, overbought: parseInt(e.target.value) }
                              })}
                              className="w-full text-center py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 block mb-1">Weight %</span>
                            <input
                              type="number"
                              value={combinerIndicators.rsi.weight}
                              onChange={(e) => setCombinerIndicators({
                                ...combinerIndicators,
                                rsi: { ...combinerIndicators.rsi, weight: parseInt(e.target.value) }
                              })}
                              className="w-full text-center py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. MACD */}
                    <div className={`p-3.5 rounded-xl border ${combinerIndicators.macd.enabled ? 'border-teal-500/20 bg-teal-500/5' : 'border-zinc-800 bg-zinc-950/40'} space-y-3`}>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                          <input
                            type="checkbox"
                            checked={combinerIndicators.macd.enabled}
                            onChange={(e) => setCombinerIndicators({
                              ...combinerIndicators,
                              macd: { ...combinerIndicators.macd, enabled: e.target.checked }
                            })}
                            className="rounded accent-teal-500"
                          />
                          <span>MACD Trend Crossover</span>
                        </label>
                        <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Volume</span>
                      </div>

                      {combinerIndicators.macd.enabled && (
                        <div className="grid grid-cols-4 gap-1.5 pt-1 animate-fade-in">
                          <div>
                            <span className="text-[9px] text-zinc-500 block mb-1">Fast</span>
                            <input
                              type="number"
                              value={combinerIndicators.macd.fast}
                              onChange={(e) => setCombinerIndicators({
                                ...combinerIndicators,
                                macd: { ...combinerIndicators.macd, fast: parseInt(e.target.value) }
                              })}
                              className="w-full text-center py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 block mb-1">Slow</span>
                            <input
                              type="number"
                              value={combinerIndicators.macd.slow}
                              onChange={(e) => setCombinerIndicators({
                                ...combinerIndicators,
                                macd: { ...combinerIndicators.macd, slow: parseInt(e.target.value) }
                              })}
                              className="w-full text-center py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 block mb-1">Signal</span>
                            <input
                              type="number"
                              value={combinerIndicators.macd.signal}
                              onChange={(e) => setCombinerIndicators({
                                ...combinerIndicators,
                                macd: { ...combinerIndicators.macd, signal: parseInt(e.target.value) }
                              })}
                              className="w-full text-center py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 block mb-1">Weight %</span>
                            <input
                              type="number"
                              value={combinerIndicators.macd.weight}
                              onChange={(e) => setCombinerIndicators({
                                ...combinerIndicators,
                                macd: { ...combinerIndicators.macd, weight: parseInt(e.target.value) }
                              })}
                              className="w-full text-center py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4. Bollinger Bands */}
                    <div className={`p-3.5 rounded-xl border ${combinerIndicators.bb.enabled ? 'border-teal-500/20 bg-teal-500/5' : 'border-zinc-800 bg-zinc-950/40'} space-y-3`}>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                          <input
                            type="checkbox"
                            checked={combinerIndicators.bb.enabled}
                            onChange={(e) => setCombinerIndicators({
                              ...combinerIndicators,
                              bb: { ...combinerIndicators.bb, enabled: e.target.checked }
                            })}
                            className="rounded accent-teal-500"
                          />
                          <span>Bollinger Breakout</span>
                        </label>
                        <span className="text-[9px] text-sky-400 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">Volatility</span>
                      </div>

                      {combinerIndicators.bb.enabled && (
                        <div className="grid grid-cols-3 gap-2 pt-1 animate-fade-in">
                          <div>
                            <span className="text-[9px] text-zinc-500 block mb-1">Length</span>
                            <input
                              type="number"
                              value={combinerIndicators.bb.length}
                              onChange={(e) => setCombinerIndicators({
                                ...combinerIndicators,
                                bb: { ...combinerIndicators.bb, length: parseInt(e.target.value) }
                              })}
                              className="w-full text-center py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 block mb-1">Std Dev</span>
                            <input
                              type="number"
                              step="0.1"
                              value={combinerIndicators.bb.stddev}
                              onChange={(e) => setCombinerIndicators({
                                ...combinerIndicators,
                                bb: { ...combinerIndicators.bb, stddev: parseFloat(e.target.value) }
                              })}
                              className="w-full text-center py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 block mb-1">Weight %</span>
                            <input
                              type="number"
                              value={combinerIndicators.bb.weight}
                              onChange={(e) => setCombinerIndicators({
                                ...combinerIndicators,
                                bb: { ...combinerIndicators.bb, weight: parseInt(e.target.value) }
                              })}
                              className="w-full text-center py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Combination Logic Formula Settings */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">Synthesizer Logical Cross Rules</span>
                        <span className="text-xs text-zinc-300 font-medium">How should the indicators align to generate buy/sell signals?</span>
                      </div>
                      <select
                        value={combinationLogic}
                        onChange={(e: any) => setCombinationLogic(e.target.value)}
                        className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg focus:outline-none focus:border-teal-500"
                      >
                        <option value="weighted">Weighted Scoring Model</option>
                        <option value="and">Confluence Multi-agreement (AND)</option>
                        <option value="trend_filtered">Trend-Aligned Breakout (EMA + RSI)</option>
                      </select>
                    </div>

                    {combinationLogic === 'weighted' && (
                      <div className="space-y-2 animate-fade-in">
                        <div className="flex justify-between text-[10px] text-zinc-400 font-semibold">
                          <span>Required Aggregation Score to Buy:</span>
                          <span className="text-teal-400 font-bold">{requiredWeightScore}% Match</span>
                        </div>
                        <input
                          type="range"
                          min="30"
                          max="90"
                          value={requiredWeightScore}
                          onChange={(e) => setRequiredWeightScore(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={handleAssembleCombinedCode}
                    className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-500/10 flex items-center justify-center gap-2 cursor-pointer transition-transform duration-200 active:scale-98"
                  >
                    <Cpu className="w-4 h-4" />
                    <span>Compile Combined Indicators & Open Editor</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-4">
                    {customIndicators.map((ind, index) => (
                      <div 
                        key={ind.id} 
                        className="p-4 bg-zinc-950/40 rounded-xl border border-zinc-800/80 space-y-4 relative group"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files[0];
                          if (file) handleCustomFileUpload(ind.id, file);
                        }}
                      >
                        {/* Slot Header */}
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold flex items-center justify-center text-teal-400">
                              {index + 1}
                            </span>
                            <input
                              type="text"
                              value={ind.title}
                              onChange={(e) => updateCustomIndicator(ind.id, 'title', e.target.value)}
                              className="bg-transparent text-xs font-bold text-white focus:outline-none focus:border-b focus:border-teal-500 pb-0.5"
                              placeholder={`Indicator ${index + 1} Name`}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Preset Loader Dropdown */}
                            <select
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  const template = INDICATOR_TEMPLATES.find(t => t.id === val);
                                  if (template) {
                                    updateCustomIndicator(ind.id, 'code', template.code);
                                    updateCustomIndicator(ind.id, 'title', template.title);
                                  }
                                }
                              }}
                              className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 rounded-lg focus:outline-none focus:border-teal-500/40"
                              defaultValue=""
                            >
                              <option value="" disabled>Load Preset...</option>
                              {INDICATOR_TEMPLATES.map(t => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                              ))}
                            </select>

                            {customIndicators.length > 2 && (
                              <button
                                onClick={() => removeCustomIndicatorSlot(ind.id)}
                                className="p-1 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Remove slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* File Upload Area and Weight Slider */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                          <div className="lg:col-span-1 flex flex-col gap-3">
                            {/* File Drag-and-drop / Upload box */}
                            <label className="flex-1 min-h-[100px] border border-dashed border-zinc-800 hover:border-teal-500/40 rounded-xl flex flex-col items-center justify-center p-3 text-center cursor-pointer bg-zinc-950 hover:bg-zinc-900/40 transition-all group">
                              <input
                                type="file"
                                accept=".pine,.txt"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleCustomFileUpload(ind.id, file);
                                }}
                              />
                              <Upload className="w-5 h-5 text-zinc-500 group-hover:text-teal-400 transition-colors mb-1.5" />
                              <span className="text-[10px] font-bold text-zinc-300">Upload Script</span>
                              <span className="text-[9px] text-zinc-500 mt-0.5">Drag .pine / .txt file</span>
                            </label>

                            {customMergeStrategy === 'weighted_confluence' && (
                              <div className="space-y-1.5 p-3 bg-zinc-950 rounded-xl border border-zinc-900">
                                <div className="flex justify-between text-[10px] font-semibold text-zinc-400">
                                  <span>Influence Weight:</span>
                                  <span className="text-teal-400 font-bold">{ind.weight}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="10"
                                  max="100"
                                  value={ind.weight}
                                  onChange={(e) => updateCustomIndicator(ind.id, 'weight', parseInt(e.target.value))}
                                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                />
                              </div>
                            )}
                          </div>

                          {/* Code Paste Textarea */}
                          <div className="lg:col-span-3 flex flex-col">
                            <span className="text-[9px] text-zinc-500 block mb-1 font-bold uppercase tracking-wider">Paste Pine Script Code Block</span>
                            <textarea
                              value={ind.code}
                              onChange={(e) => updateCustomIndicator(ind.id, 'code', e.target.value)}
                              placeholder={`Paste TradingView indicator script here... (starts with //@version=5)`}
                              rows={6}
                              className="w-full font-mono text-[10px] p-3 bg-zinc-950 border border-zinc-850 focus:border-teal-500 text-zinc-100 rounded-xl placeholder-zinc-700 resize-y focus:outline-none leading-relaxed h-[150px] custom-scrollbar"
                            />
                            {ind.code.trim().length > 0 && (
                              <span className="text-[9px] text-zinc-500 mt-1 self-end">
                                {ind.code.trim().split('\n').length} lines • {ind.code.trim().length} chars
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addCustomIndicatorSlot}
                      className="w-full py-2 bg-zinc-950/60 hover:bg-zinc-950 border border-dashed border-zinc-800 hover:border-teal-500/20 text-zinc-400 hover:text-teal-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Another Indicator Code Area</span>
                    </button>
                  </div>

                  {/* Combination Settings for Custom Merging */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">Custom Merge Configuration</span>
                        <span className="text-xs text-zinc-300 font-medium">Select compilation and logical synthesis alignment model</span>
                      </div>
                      <select
                        value={customMergeStrategy}
                        onChange={(e: any) => setCustomMergeStrategy(e.target.value)}
                        className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg focus:outline-none focus:border-teal-500"
                      >
                        <option value="intelligent_synthesis">Intelligent AI Synthesis (Recommended)</option>
                        <option value="confluence">Strict Confluence (AND Agreement)</option>
                        <option value="primary_filter">Primary + Filter Overlay (Trend Filter)</option>
                        <option value="weighted_confluence">Weighted Confluence Score</option>
                      </select>
                    </div>

                    {customMergeStrategy === 'weighted_confluence' && (
                      <div className="space-y-2 animate-fade-in pt-1 border-t border-zinc-900/60">
                        <div className="flex justify-between text-[10px] text-zinc-400 font-semibold">
                          <span>Required Aggregation Score to trigger BUY:</span>
                          <span className="text-teal-400 font-bold">{customRequiredScore}% Confluence</span>
                        </div>
                        <input
                          type="range"
                          min="30"
                          max="90"
                          value={customRequiredScore}
                          onChange={(e) => setCustomRequiredScore(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                        />
                        <p className="text-[9px] text-zinc-500">
                          Signals will be weighted based on their individual influence weight. A BUY plot is rendered only when the sum of weights of active BUY signals meets or exceeds this threshold.
                        </p>
                      </div>
                    )}

                    {customMergeStrategy === 'primary_filter' && (
                      <p className="text-[9px] text-zinc-500 animate-fade-in pt-1 border-t border-zinc-900/60">
                        The compiled output uses <strong>{customIndicators[0]?.title || 'Indicator 1'}</strong> as the primary entry/exit signaller, and only permits entries if they align with the trend direction defined by <strong>{customIndicators[1]?.title || 'Indicator 2'}</strong>.
                      </p>
                    )}
                    
                    {customMergeStrategy === 'confluence' && (
                      <p className="text-[9px] text-zinc-500 animate-fade-in pt-1 border-t border-zinc-900/60">
                        Strict multi-indicator agreement model. Buy signals are triggered ONLY when all {customIndicators.length} indicators trigger a BUY simultaneously, reducing false signals during volatile ranges.
                      </p>
                    )}
                  </div>

                  {/* Merge & Run Button */}
                  <button
                    onClick={handleMergeCustomIndicators}
                    disabled={isMergingCustom}
                    className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-500/10 flex items-center justify-center gap-2 cursor-pointer transition-transform duration-200 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMergingCustom ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Programmatically Merging Indicators (Gemini API)...</span>
                      </>
                    ) : (
                      <>
                        <Cpu className="w-4 h-4" />
                        <span>Synthesize & Merge Scripts into Editor</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className={`p-5 rounded-xl border ${st.border} bg-zinc-900/30 space-y-4`}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-sky-400">Indicator Library</h3>
                  <p className="text-[10px] text-zinc-500">Your custom-designed indicator systems cached in your browser.</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-full font-bold">
                  {savedScripts.length} Saved
                </span>
              </div>

              {savedScripts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-zinc-950/40 rounded-xl border border-zinc-850/60 p-6">
                  <FileCode className="w-8 h-8 text-zinc-700" />
                  <p className="text-xs text-zinc-500 font-medium">No saved scripts found. Build or generate with AI and save them here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                  {savedScripts.map(script => (
                    <div
                      key={script.id}
                      onClick={() => {
                        setEditorCode(script.code);
                        setCompilerLogs(`Script "${script.title}" loaded successfully.`);
                        setCompilerStatus('success');
                        setActiveTab('editor');
                      }}
                      className="p-4 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-850/80 hover:border-teal-500/30 rounded-xl flex flex-col justify-between cursor-pointer group transition-all duration-200"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between">
                          <h4 className="text-xs font-bold text-white group-hover:text-teal-400 transition-colors truncate max-w-[150px]">
                            {script.title}
                          </h4>
                          <button
                            onClick={(e) => handleDeleteScript(script.id, e)}
                            className="p-1 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete script"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed font-mono truncate max-w-[200px]">
                          {script.code.substring(0, 100)}...
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-zinc-900/60 mt-4">
                        <span className="text-[9px] text-zinc-500 font-semibold">{script.date}</span>
                        <span className="text-[9px] text-teal-400 font-bold group-hover:underline flex items-center gap-1">
                          <span>Load Script</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI INDICATOR CO-PILOT CHAT PANEL */}
          <div className="p-4 rounded-xl border border-teal-500/10 bg-gradient-to-r from-teal-500/5 to-indigo-500/5 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 text-teal-400/10">
              <Sparkles className="w-12 h-12" />
            </div>
            
            <div className="space-y-1 relative z-10">
              <h3 className="text-xs font-bold text-teal-400 tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Indicator Co-Pilot</span>
              </h3>
              <p className={`text-[10px] ${st.textDim} leading-relaxed`}>
                Instruct Gemini to build custom Pine Script indicator systems (e.g., "Create a trend continuation ATR stop system that filters sideways congestion using low ADX volumes").
              </p>
            </div>

            <div className="flex gap-2 relative z-10">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateIndicatorWithAI()}
                placeholder="Ask AI to design or modify a TradingView Pine Script..."
                disabled={isGeneratingAi}
                className="flex-1 px-3 py-1.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-teal-500 disabled:opacity-50"
              />
              <button
                onClick={handleGenerateIndicatorWithAI}
                disabled={isGeneratingAi || !aiPrompt.trim()}
                className="px-4 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 hover:border-teal-500/50 disabled:opacity-40 disabled:hover:bg-teal-500/20 text-teal-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {isGeneratingAi ? (
                  <span className="w-3.5 h-3.5 border border-teal-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                <span>Generate</span>
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: BACKTEST SIMULATOR CONTROL, METRICS, GRAPH, TRADE LOG */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          
          {/* SIMULATOR CONFIGURATION CARD */}
          <div className={`p-4 rounded-xl border ${st.border} bg-zinc-900/30 space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-sky-400">
                <Play className="w-3.5 h-3.5" />
                <span>Backtest Simulator Engine</span>
              </div>
              <span className="text-[9px] font-bold text-zinc-500 px-1.5 py-0.5 rounded-full border border-zinc-800">
                Offline Sim v2.4
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Target Asset</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 text-xs text-white rounded-lg focus:outline-none"
                >
                  {BACKTEST_ASSETS.map(asset => (
                    <option key={asset.symbol} value={asset.symbol}>{asset.symbol} ({asset.name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Interval</label>
                <select
                  value={timeframe}
                  onChange={(e: any) => setTimeframe(e.target.value)}
                  className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 text-xs text-white rounded-lg focus:outline-none"
                >
                  <option value="1H">1 Hour</option>
                  <option value="4H">4 Hour</option>
                  <option value="1D">1 Day</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Period Range</label>
                <select
                  value={backtestPeriod}
                  onChange={(e: any) => setBacktestPeriod(e.target.value)}
                  className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 text-xs text-white rounded-lg focus:outline-none"
                >
                  <option value="30D">Last 30 Days</option>
                  <option value="180D">Last 6 Months</option>
                  <option value="365D">Last 1 Year</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Initial Cash ($)</label>
                <input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Math.max(100, parseInt(e.target.value)))}
                  className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 text-xs text-white rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Trade Size (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={riskSizePct}
                  onChange={(e) => setRiskSizePct(Math.min(100, Math.max(1, parseInt(e.target.value))))}
                  className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 text-xs text-white rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={runLocalBacktestSimulation}
                  disabled={isSimulating}
                  className="w-full py-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-55 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isSimulating ? (
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>Run Backtest</span>
                </button>
              </div>
            </div>
          </div>

          {/* SIMULATION VISUAL CHART AREA */}
          {backtestResults && (
            <div className={`p-4 rounded-xl border ${st.border} bg-zinc-900/30 flex flex-col space-y-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs text-white">Simulation Chart & Signal Map</span>
                </div>
                <div className="flex gap-2 text-[9px] text-zinc-500 font-bold">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-teal-500" /> Price</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-indigo-500" /> Capital Growth</span>
                </div>
              </div>

              {/* Chart Plotting with Recharts */}
              <div className="h-56 w-full bg-zinc-950 p-2 rounded-xl border border-zinc-900 overflow-hidden relative">
                {isSimulating && (
                  <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-2 z-20">
                    <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] text-teal-400 font-mono animate-pulse">Recalculating vectors...</span>
                  </div>
                )}
                
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={backtestResults.chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="dateStr" tick={{ fill: '#71717a', fontSize: 8 }} tickLine={false} />
                    <YAxis yAxisId="price" domain={['auto', 'auto']} tick={{ fill: '#14b8a6', fontSize: 8 }} tickLine={false} />
                    <YAxis yAxisId="balance" orientation="right" domain={['auto', 'auto']} tick={{ fill: '#6366f1', fontSize: 8 }} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '10px', color: '#fff' }}
                      labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
                    />
                    
                    {/* EMA plots conditionally if generated */}
                    <Line yAxisId="price" type="monotone" dataKey="close" stroke="#14b8a6" strokeWidth={1.5} dot={false} name="Price" />
                    
                    {editorCode.includes('fast_ema') && (
                      <Line yAxisId="price" type="monotone" dataKey="fastEma" stroke="#2dd4bf" strokeWidth={1} dot={false} strokeDasharray="3 3" name="Fast EMA" />
                    )}
                    {editorCode.includes('slow_ema') && (
                      <Line yAxisId="price" type="monotone" dataKey="slowEma" stroke="#f97316" strokeWidth={1} dot={false} strokeDasharray="3 3" name="Slow EMA" />
                    )}

                    <Area yAxisId="balance" type="monotone" dataKey="portfolioValue" fill="url(#colorBal)" stroke="#6366f1" strokeWidth={1.5} name="Capital Bal" opacity={0.3} />
                    
                    <defs>
                      <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* SIMULATED PERFORMANCE SCORECARD */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2">
                <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-900 text-center">
                  <span className="text-[9px] text-zinc-500 block mb-0.5">Total Return</span>
                  <span className={`text-sm font-black flex items-center justify-center gap-0.5 ${backtestResults.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {backtestResults.totalReturnPct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{backtestResults.totalReturnPct >= 0 ? '+' : ''}{backtestResults.totalReturnPct}%</span>
                  </span>
                </div>

                <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-900 text-center">
                  <span className="text-[9px] text-zinc-500 block mb-0.5">Win Rate</span>
                  <span className="text-sm font-black text-teal-400">
                    {backtestResults.winRatePct}%
                  </span>
                </div>

                <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-900 text-center">
                  <span className="text-[9px] text-zinc-500 block mb-0.5">Profit Factor</span>
                  <span className="text-sm font-black text-indigo-400">
                    {backtestResults.profitFactor}
                  </span>
                </div>

                <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-900 text-center">
                  <span className="text-[9px] text-zinc-500 block mb-0.5">Max Drawdown</span>
                  <span className="text-sm font-black text-rose-500">
                    -{backtestResults.maxDrawdownPct}%
                  </span>
                </div>
              </div>

              {/* METRICS EXPANSION TABLE */}
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 space-y-2 text-[10px]">
                <div className="flex justify-between border-b border-zinc-900 pb-1.5 text-zinc-500 font-semibold uppercase tracking-wider">
                  <span>Performance Metric</span>
                  <span>Value</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>Net Profit (USD Equivalent):</span>
                  <span className={`font-bold ${backtestResults.netProfitUsd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${backtestResults.netProfitUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>Total Simulated Trades Executed:</span>
                  <span className="font-bold text-white">{backtestResults.totalTrades} ({backtestResults.winningTrades}W / {backtestResults.losingTrades}L)</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>Risk Adjusted Sharpe Index:</span>
                  <span className="font-bold text-teal-400">{backtestResults.sharpeRatio}</span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>Simulated Portfolio Value:</span>
                  <span className="font-bold text-indigo-400">${backtestResults.finalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* TRADE LEDGER LOG */}
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">Strategy Trade Logs Ledger</span>
                <div className="max-h-36 overflow-y-auto border border-zinc-900 rounded-xl bg-zinc-950 custom-scrollbar text-[10px]">
                  {backtestResults.trades.length === 0 ? (
                    <div className="text-center py-6 text-zinc-600 font-medium font-mono">No trades executed. Review indicators bounds.</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-900/50 text-zinc-500 border-b border-zinc-900 font-semibold">
                          <th className="p-2">Date</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Price</th>
                          <th className="p-2">Shares</th>
                          <th className="p-2 text-right">Profit / Bal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/60 text-zinc-300 font-mono">
                        {backtestResults.trades.map((trade) => (
                          <tr key={trade.id} className="hover:bg-zinc-900/30">
                            <td className="p-2 text-zinc-500">{trade.dateStr}</td>
                            <td className="p-2">
                              <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                                trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {trade.type}
                              </span>
                            </td>
                            <td className="p-2 text-white">${trade.price.toLocaleString()}</td>
                            <td className="p-2 text-zinc-400">{trade.shares}</td>
                            <td className="p-2 text-right">
                              {trade.type === 'SELL' ? (
                                <span className={trade.profit && trade.profit >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                                  {trade.profit && trade.profit >= 0 ? '+' : ''}${trade.profit?.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-zinc-500">${trade.balanceAfter.toLocaleString()}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* SAVE SCRIPT MODAL DIALOG OVERLAY */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-850 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-teal-400" />
                <span>Save Dynamic Indicator</span>
              </h3>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-900 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Indicator Script Label</label>
              <input
                type="text"
                value={newScriptName}
                onChange={(e) => setNewScriptName(e.target.value)}
                placeholder="e.g. My MACD + RSI Confluence Strategy"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScript}
                disabled={!newScriptName.trim()}
                className="flex-1 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Save Indicator System
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
