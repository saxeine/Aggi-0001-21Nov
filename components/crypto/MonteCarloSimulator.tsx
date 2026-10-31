import React, { useState, useMemo } from 'react';
import { 
  LineChart, Sliders, Play, TrendingUp, Info, DollarSign, Percent, 
  HelpCircle, Target, ArrowRight, ShieldCheck, FileText 
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface PercentileData {
  year: number;
  p10: number; // 10th percentile (worst-case)
  p30: number; // 30th percentile
  p50: number; // 50th percentile (median)
  p70: number; // 70th percentile
  p90: number; // 90th percentile (best-case)
}

export const MonteCarloSimulator: React.FC<{ theme?: string }> = ({ theme = 'charcoal' }) => {
  const [initialCapital, setInitialCapital] = useState<number>(50000);
  const [annualSavings, setAnnualSavings] = useState<number>(6000);
  const [expectedReturn, setExpectedReturn] = useState<number>(8); // 8% expected return
  const [volatility, setVolatility] = useState<number>(15); // 15% standard deviation
  const [horizonYears, setHorizonYears] = useState<number>(20);
  const [targetGoal, setTargetGoal] = useState<number>(500000);
  const [simData, setSimData] = useState<PercentileData[]>([]);
  const [probabilityOfSuccess, setProbabilityOfSuccess] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

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

  // Box-Muller transform for normal distribution simulation
  const randomNormal = (mean: number, stdDev: number) => {
    let u1 = 0, u2 = 0;
    while(u1 === 0) u1 = Math.random(); 
    while(u2 === 0) u2 = Math.random();
    const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
    return mean + stdDev * randStdNormal;
  };

  const handleSimulate = () => {
    setIsSimulating(true);
    const runs = 1000;
    const years = horizonYears;
    const finalValues: number[] = [];

    // Initialize simulation matrices
    const yearlyResults: number[][] = Array.from({ length: years + 1 }, () => []);

    // Push initial values
    for (let r = 0; r < runs; r++) {
      yearlyResults[0].push(initialCapital);
    }

    const meanLog = Math.log(1 + expectedReturn / 100) - 0.5 * Math.pow(volatility / 100, 2);
    const volLog = volatility / 100;

    for (let y = 1; y <= years; y++) {
      for (let r = 0; r < runs; r++) {
        const prevBal = yearlyResults[y - 1][r];
        const randomReturn = Math.exp(randomNormal(meanLog, volLog)) - 1;
        const newBal = (prevBal + annualSavings) * (1 + randomReturn);
        yearlyResults[y].push(Math.max(0, newBal));
      }
    }

    // Sort results of each year to find percentiles
    const percentileSeries: PercentileData[] = [];
    for (let y = 0; y <= years; y++) {
      const sorted = [...yearlyResults[y]].sort((a, b) => a - b);
      
      const p10Idx = Math.floor(runs * 0.10);
      const p30Idx = Math.floor(runs * 0.30);
      const p50Idx = Math.floor(runs * 0.50);
      const p70Idx = Math.floor(runs * 0.70);
      const p90Idx = Math.floor(runs * 0.90);

      percentileSeries.push({
        year: y,
        p10: Math.round(sorted[p10Idx]),
        p30: Math.round(sorted[p30Idx]),
        p50: Math.round(sorted[p50Idx]),
        p70: Math.round(sorted[p70Idx]),
        p90: Math.round(sorted[p90Idx])
      });
    }

    // Calculate final probability of meeting target goal
    const lastYearResults = yearlyResults[years];
    const successes = lastYearResults.filter(val => val >= targetGoal).length;
    const successRate = (successes / runs) * 100;

    setSimData(percentileSeries);
    setProbabilityOfSuccess(Math.round(successRate));
    
    setTimeout(() => {
      setIsSimulating(false);
    }, 400);
  };

  return (
    <div className={`p-6 rounded-2xl border ${st.border} ${st.cardBg} space-y-6 animate-fade-in`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-zinc-800/40">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
            <LineChart className="w-4 h-4" />
            Monte Carlo Portfolio Simulator
          </h3>
          <p className={`text-[10px] ${st.textDim} leading-relaxed`}>
            Run 1,000 parallel stochastic financial paths using log-normal returns to determine capital growth ranges and target success rates.
          </p>
        </div>
        <div className={`text-[10px] px-2.5 py-1 rounded border font-mono font-bold ${st.badge}`}>
          Stochastic Solver v2.0
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Controller Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`p-4 rounded-xl ${st.innerBg} border ${st.border} space-y-4`}>
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
              <Sliders className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">Simulation Inputs</span>
            </div>

            {/* Starting Balance */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className={st.textDim}>Initial Portfolio Size</span>
                <span className="font-mono text-zinc-300 font-bold">${initialCapital.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="5000"
                max="500000"
                step="5000"
                value={initialCapital}
                onChange={(e) => setInitialCapital(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>

            {/* Annual Contributions */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className={st.textDim}>Yearly Net Contributions</span>
                <span className="font-mono text-zinc-300 font-bold">${annualSavings.toLocaleString()}/yr</span>
              </div>
              <input
                type="range"
                min="0"
                max="50000"
                step="1000"
                value={annualSavings}
                onChange={(e) => setAnnualSavings(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>

            {/* Return Expectations */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className={st.textDim}>Expected Annual Return</span>
                <span className="font-mono text-teal-400 font-bold">{expectedReturn}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>

            {/* Volatility */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className={st.textDim}>Market Volatility (Std Dev)</span>
                <span className="font-mono text-red-400 font-bold">±{volatility}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                value={volatility}
                onChange={(e) => setVolatility(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>

            {/* Horizon */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className={st.textDim}>Investment Horizon</span>
                <span className="font-mono text-zinc-300 font-bold">{horizonYears} Years</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                value={horizonYears}
                onChange={(e) => setHorizonYears(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>

            {/* Target Financial Goal */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-900">
              <span className={`text-[10px] ${st.textDim} block`}>Define Financial Goal Target ($)</span>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="number"
                  value={targetGoal}
                  onChange={(e) => setTargetGoal(Math.max(1000, parseInt(e.target.value) || 0))}
                  className={`w-full py-1.5 pl-8 pr-3 text-xs rounded-lg ${st.inputBg} focus:outline-none focus:border-teal-500 font-mono`}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>{isSimulating ? 'Processing Stochastic Simulation...' : 'Generate 1,000 Portfolio Runs'}</span>
          </button>
        </div>

        {/* Charts and Calculations Visual Area */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className={`p-4 rounded-xl ${st.innerBg} border ${st.border} flex-1 flex flex-col justify-between min-h-[300px]`}>
            {simData.length > 0 ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">Compounded Percentile Bands</span>
                  </div>

                  {probabilityOfSuccess !== null && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Target className="w-3.5 h-3.5 text-sky-400" />
                      <span className={st.textDim}>Goal Success Probability:</span>
                      <span className={`font-bold ${probabilityOfSuccess >= 70 ? 'text-emerald-400' : probabilityOfSuccess >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                        {probabilityOfSuccess}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={simData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="p90Color" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.01}/>
                        </linearGradient>
                        <linearGradient id="p50Color" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="year" stroke="#71717a" fontSize={9} label={{ value: 'Years', position: 'insideBottom', offset: -5, fill: '#71717a', fontSize: 9 }} />
                      <YAxis stroke="#71717a" fontSize={9} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                        labelStyle={{ fontSize: '10px', color: '#a1a1aa' }}
                        itemStyle={{ fontSize: '10px' }}
                        formatter={(val: any) => [`$${val.toLocaleString()}`]}
                      />
                      {/* Outer boundary - best case area */}
                      <Area type="monotone" dataKey="p90" stroke="#0ea5e9" strokeDasharray="3 3" strokeWidth={1} fillOpacity={1} fill="url(#p90Color)" name="90th% (Best)" />
                      {/* Inner median area */}
                      <Area type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#p50Color)" name="50th% (Median)" />
                      {/* Lower boundary - worst case */}
                      <Area type="monotone" dataKey="p10" stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1} fill="none" name="10th% (Conservative)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-zinc-900 pt-3 text-center">
                  <div>
                    <span className="text-[8px] text-zinc-500 uppercase block">Optimistic (90th%)</span>
                    <span className="text-xs font-bold font-mono text-sky-400">${simData[simData.length - 1].p90.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-zinc-500 uppercase block">Median Plan (50th%)</span>
                    <span className="text-xs font-bold font-mono text-emerald-400">${simData[simData.length - 1].p50.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-zinc-500 uppercase block">Underperforming (10th%)</span>
                    <span className="text-xs font-bold font-mono text-rose-400">${simData[simData.length - 1].p10.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 py-12">
                <Play className="w-8 h-8 text-zinc-700 animate-pulse" />
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-zinc-400">Monte Carlo Simulator Ready</span>
                  <p className="text-[9px] text-zinc-500 max-w-[280px]">
                    Configure capital and expected variance metrics, then hit the "Generate Portfolio Runs" button to compile parallel stochastic pathways.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-zinc-950/40 border border-zinc-850/80 rounded-xl flex gap-2.5 items-center">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <p className="text-[9px] text-zinc-400 leading-relaxed">
              Standard deterministic calculators ignore market variance. Stochastic Monte Carlo simulations introduce simulated annual shocks, offering a highly realistic risk assessment of long-term portfolios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
