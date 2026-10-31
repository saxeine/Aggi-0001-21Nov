import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Sliders, ShieldCheck, Play, RefreshCcw, HelpCircle, 
  AlertTriangle, DollarSign, Percent, Info, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface SimulationStep {
  trade: number;
  outcome: 'Win' | 'Loss';
  returnPct: number;
  payout: number;
  balance: number;
}

export const KellyCriterionCalculator: React.FC<{ theme?: string }> = ({ theme = 'charcoal' }) => {
  const [balance, setBalance] = useState<number>(10000);
  const [winRate, setWinRate] = useState<number>(55);
  const [riskReward, setRiskReward] = useState<number>(1.5);
  const [kellyFraction, setKellyFraction] = useState<number>(0.5); // Default Half-Kelly
  const [numSimTrades, setNumSimTrades] = useState<number>(20);
  const [simulation, setSimulation] = useState<SimulationStep[]>([]);
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

  // Kelly Formula: f* = p - (q / b) = p - (1-p)/b
  // Where p = win rate, q = loss rate = 1 - p, b = risk reward ratio
  const { rawKelly, recommendedKelly, leverageAlert } = useMemo(() => {
    const p = winRate / 100;
    const q = 1 - p;
    const b = riskReward;
    
    const f = p - (q / b);
    const raw = Math.max(0, f);
    const fractional = raw * kellyFraction;
    
    return {
      rawKelly: raw * 100,
      recommendedKelly: fractional * 100,
      leverageAlert: raw > 0.25
    };
  }, [winRate, riskReward, kellyFraction]);

  const recommendedBetSize = useMemo(() => {
    return (balance * recommendedKelly) / 100;
  }, [balance, recommendedKelly]);

  // Run Monte Carlo trade sequence simulation
  const runSimulation = () => {
    setIsSimulating(true);
    let currentBal = balance;
    const steps: SimulationStep[] = [{
      trade: 0,
      outcome: 'Win',
      returnPct: 0,
      payout: 0,
      balance: currentBal
    }];

    for (let i = 1; i <= numSimTrades; i++) {
      const isWin = Math.random() * 100 < winRate;
      const betSize = currentBal * (recommendedKelly / 100);
      const profitLoss = isWin ? betSize * riskReward : -betSize;
      currentBal = Math.max(10, currentBal + profitLoss);

      steps.push({
        trade: i,
        outcome: isWin ? 'Win' : 'Loss',
        returnPct: isWin ? recommendedKelly * riskReward : -recommendedKelly,
        payout: profitLoss,
        balance: Math.round(currentBal * 100) / 100
      });
    }

    setSimulation(steps);
    setTimeout(() => setIsSimulating(false), 300);
  };

  return (
    <div className={`p-6 rounded-2xl border ${st.border} ${st.cardBg} space-y-6 animate-fade-in`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-zinc-800/40">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Kelly Criterion Risk Planner
          </h3>
          <p className={`text-[10px] ${st.textDim} leading-relaxed`}>
            Apply scientific bet-sizing models to optimize compound capital growth while preventing catastrophic drawdowns.
          </p>
        </div>
        <div className={`text-[10px] px-2.5 py-1 rounded border font-mono font-bold ${st.badge}`}>
          Position Sizer Engine v1.2
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel */}
        <div className="lg:col-span-5 space-y-5">
          <div className={`p-4 rounded-xl ${st.innerBg} border ${st.border} space-y-4`}>
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
              <Sliders className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">Parameters</span>
            </div>

            {/* Win Rate Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className={st.textDim}>Historical Win Rate</span>
                <span className="font-mono text-teal-400 font-bold">{winRate}%</span>
              </div>
              <input
                type="range"
                min="35"
                max="85"
                value={winRate}
                onChange={(e) => setWinRate(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>

            {/* Risk to Reward Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className={st.textDim}>Avg Profit vs Loss Ratio (R:R)</span>
                <span className="font-mono text-teal-400 font-bold">{riskReward.toFixed(1)}:1</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={riskReward}
                onChange={(e) => setRiskReward(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>

            {/* Kelly Fraction */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className={st.textDim}>Kelly Fraction multiplier</span>
                <span className="font-mono text-teal-400 font-bold">{kellyFraction === 1 ? 'Full' : kellyFraction === 0.5 ? 'Half' : 'Quarter'} Kelly</span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-900">
                {[0.25, 0.5, 1.0].map((frac) => (
                  <button
                    key={frac}
                    onClick={() => setKellyFraction(frac)}
                    className={`py-1 text-[10px] font-bold rounded cursor-pointer transition-all ${
                      kellyFraction === frac 
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {frac === 0.25 ? '0.25x' : frac === 0.5 ? '0.50x' : '1.00x'}
                  </button>
                ))}
              </div>
            </div>

            {/* Starting Balance */}
            <div className="space-y-1.5">
              <span className={`text-[10px] ${st.textDim} block`}>Account Base Balance ($)</span>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(Math.max(10, parseInt(e.target.value) || 0))}
                  className={`w-full py-1.5 pl-8 pr-3 text-xs rounded-lg ${st.inputBg} focus:outline-none focus:border-teal-500 font-mono`}
                />
              </div>
            </div>
          </div>

          {/* Key Outputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3.5 rounded-xl border ${st.border} bg-zinc-950 space-y-1`}>
              <span className={`text-[9px] ${st.textMuted} uppercase tracking-wider block font-bold`}>Pure Kelly Math</span>
              <span className="text-lg font-bold text-white font-mono">{rawKelly.toFixed(1)}%</span>
              <span className={`text-[9px] ${st.textDim} block`}>Full capital exposure</span>
            </div>
            <div className={`p-3.5 rounded-xl border border-teal-500/20 bg-teal-500/5 space-y-1`}>
              <span className="text-[9px] text-teal-400 uppercase tracking-wider block font-bold">Suggested Bet Size</span>
              <span className="text-lg font-bold text-teal-400 font-mono">{recommendedKelly.toFixed(1)}%</span>
              <span className={`text-[9px] ${st.textDim} block`}>
                ${recommendedBetSize.toLocaleString(undefined, { maximumFractionDigits: 0 })} allocation
              </span>
            </div>
          </div>

          {leverageAlert && (
            <div className="flex gap-2.5 p-3 rounded-xl border border-amber-500/10 bg-amber-500/5 items-start">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-amber-400 block">High Leverage Caution</span>
                <p className="text-[9px] text-zinc-400 leading-relaxed">
                  Kelly is mathematically aggressive. Even a Half-Kelly of {recommendedKelly.toFixed(1)}% exposes your capital to high potential drawdowns during long-tail loss sequences.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Simulation & Visualizer */}
        <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
          <div className={`p-4 rounded-xl ${st.innerBg} border ${st.border} space-y-4 flex-1 flex flex-col justify-between`}>
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">Compound Growth Simulation</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={numSimTrades}
                  onChange={(e) => setNumSimTrades(parseInt(e.target.value))}
                  className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 rounded-lg focus:outline-none"
                >
                  <option value={15}>15 Trades</option>
                  <option value={30}>30 Trades</option>
                  <option value={50}>50 Trades</option>
                </select>
                <button
                  onClick={runSimulation}
                  disabled={isSimulating}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  <span>Simulate Run</span>
                </button>
              </div>
            </div>

            {simulation.length > 0 ? (
              <div className="space-y-4">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={simulation} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="simCol" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="trade" stroke="#71717a" fontSize={9} />
                      <YAxis stroke="#71717a" fontSize={9} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                        labelStyle={{ fontSize: '10px', color: '#a1a1aa' }}
                        itemStyle={{ fontSize: '10px' }}
                        formatter={(val: any) => [`$${val.toLocaleString()}`, 'Balance']}
                      />
                      <Area type="monotone" dataKey="balance" stroke="#0ea5e9" strokeWidth={1.8} fillOpacity={1} fill="url(#simCol)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-zinc-900 pt-3">
                  <div className="text-center">
                    <span className="text-[8px] text-zinc-500 uppercase block">Starting</span>
                    <span className="text-xs font-bold text-zinc-300 font-mono">${balance.toLocaleString()}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[8px] text-zinc-500 uppercase block">Ending Balance</span>
                    <span className={`text-xs font-bold font-mono ${simulation[simulation.length - 1].balance >= balance ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${simulation[simulation.length - 1].balance.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[8px] text-zinc-500 uppercase block">Sequence ROI</span>
                    <span className={`text-xs font-bold font-mono ${simulation[simulation.length - 1].balance >= balance ? 'text-emerald-400' : 'text-red-400'}`}>
                      {((simulation[simulation.length - 1].balance - balance) / balance * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center space-y-2">
                <RefreshCcw className="w-8 h-8 text-zinc-700 animate-spin-slow" />
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-zinc-400">Simulation Ready</span>
                  <p className="text-[9px] text-zinc-500 max-w-[280px]">
                    Click "Simulate Run" above to see how your selected Kelly fraction compounds across a random win/loss sequence of trades.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Kelly explanation Footer */}
          <div className="p-3 bg-zinc-950/40 border border-zinc-850/80 rounded-xl flex gap-2.5 items-center">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <p className="text-[9px] text-zinc-400 leading-relaxed">
              <strong>The Kelly Formula:</strong> Maximize compound growth rate by betting more when edge is high. Setting <span className="text-teal-400">Fractional Kelly</span> sacrifices absolute growth speed to drastically reduce portfolio variance and avoid long-term risk of ruin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
