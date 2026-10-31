import React, { useState, useMemo } from 'react';
import { 
  LineChart, Sliders, Info, HelpCircle, Activity, TrendingUp, AlertOctagon, 
  RefreshCcw, DollarSign, ArrowUpRight, ArrowDownRight, Award 
} from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

interface YieldDataPoint {
  maturity: string;
  display: string;
  rate: number;
}

interface YieldPreset {
  name: string;
  description: string;
  rates: { '1M': number; '3M': number; '2Y': number; '5Y': number; '10Y': number; '30Y': number };
}

const HISTORIC_PRESETS: YieldPreset[] = [
  {
    name: 'Normal Growth (2015)',
    description: 'A standard healthy upward-sloping yield curve indicating long-term optimistic capital expectations.',
    rates: { '1M': 0.15, '3M': 0.25, '2Y': 1.05, '5Y': 1.75, '10Y': 2.25, '30Y': 2.95 }
  },
  {
    name: 'Deep Inversion (2023)',
    description: 'Extreme short-term rate hikes due to aggressive monetary tightening, leading to severe curve inversion.',
    rates: { '1M': 5.25, '3M': 5.40, '2Y': 4.90, '5Y': 4.35, '10Y': 4.05, '30Y': 4.15 }
  },
  {
    name: 'Pre-Crash (August 2019)',
    description: 'A classic flat-to-inverted yield curve that successfully flagged the impending economic disruptions.',
    rates: { '1M': 2.10, '3M': 1.95, '2Y': 1.55, '5Y': 1.45, '10Y': 1.50, '30Y': 1.98 }
  },
  {
    name: 'Flat Curve (2006)',
    description: 'Transitionary state before severe inversion. Yields of all long and short durations completely converge.',
    rates: { '1M': 4.95, '3M': 5.05, '2Y': 4.85, '5Y': 4.75, '10Y': 4.80, '30Y': 4.85 }
  }
];

export const YieldCurveAnalyser: React.FC<{ theme?: string }> = ({ theme = 'charcoal' }) => {
  const [rates, setRates] = useState<Record<string, number>>({
    '1M': 5.25,
    '3M': 5.40,
    '2Y': 4.90,
    '5Y': 4.35,
    '10Y': 4.05,
    '30Y': 4.15
  });

  // Simple Bond Calculator Workspace State
  const [bondFaceValue, setBondFaceValue] = useState<number>(1000);
  const [bondCoupon, setBondCoupon] = useState<number>(4.5); // Coupon Rate %
  const [bondYTM, setBondYTM] = useState<number>(4.05); // Yield to Maturity %
  const [bondYears, setBondYears] = useState<number>(10);

  // Styles map to match FinanceView
  const st = useMemo(() => {
    const isDark = theme !== 'white' && theme !== 'silver';
    return {
      text: isDark ? 'text-zinc-100' : 'text-zinc-800',
      textDim: isDark ? 'text-zinc-400' : 'text-zinc-600',
      textMuted: isDark ? 'text-zinc-500' : 'text-zinc-400',
      border: isDark ? 'border-zinc-800/80' : 'border-zinc-200',
      cardBg: isDark ? 'bg-zinc-900/40 border-zinc-850/80' : 'bg-zinc-5 border-zinc-200/80',
      innerBg: isDark ? 'bg-zinc-950/60' : 'bg-zinc-100',
      inputBg: isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-300 text-zinc-900',
      accentText: 'text-teal-400',
      badge: isDark ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-teal-50 text-teal-700 border-teal-200'
    };
  }, [theme]);

  // Compute key Spreads and Metrics
  const spreads = useMemo(() => {
    const s10y2y = rates['10Y'] - rates['2Y'];
    const s10y3m = rates['10Y'] - rates['3M'];
    const isInverted = s10y2y < 0 || s10y3m < 0;

    // NY Fed Probability of Recession Estimation Model
    // A simplified probit metric based on 10Y-3M spread
    let recessionProb = 0;
    if (s10y3m < 0) {
      // Inversion probability calculations
      recessionProb = Math.min(95, Math.round(15 + Math.abs(s10y3m) * 20));
    } else {
      recessionProb = Math.max(2, Math.round(15 - s10y3m * 8));
    }

    return {
      s10y2y,
      s10y3m,
      isInverted,
      recessionProb
    };
  }, [rates]);

  // Bond Pricing Formula
  const bondPrice = useMemo(() => {
    const C = (bondFaceValue * (bondCoupon / 100)) / 2; // Semi-annual coupon
    const r = bondYTM / 100 / 2; // Semi-annual discount rate
    const n = bondYears * 2; // Semi-annual periods
    const F = bondFaceValue;

    // Present value of coupons + present value of face value
    let pvCoupons = 0;
    for (let t = 1; t <= n; t++) {
      pvCoupons += C / Math.pow(1 + r, t);
    }
    const pvFace = F / Math.pow(1 + r, n);

    return Math.round((pvCoupons + pvFace) * 100) / 100;
  }, [bondFaceValue, bondCoupon, bondYTM, bondYears]);

  const chartData = useMemo(() => {
    const list = [
      { maturity: '1M', rate: rates['1M'], display: '1-Month' },
      { maturity: '3M', rate: rates['3M'], display: '3-Month' },
      { maturity: '2Y', rate: rates['2Y'], display: '2-Year' },
      { maturity: '5Y', rate: rates['5Y'], display: '5-Year' },
      { maturity: '10Y', rate: rates['10Y'], display: '10-Year' },
      { maturity: '30Y', rate: rates['30Y'], display: '30-Year' }
    ];
    return list;
  }, [rates]);

  const loadPreset = (preset: YieldPreset) => {
    setRates(preset.rates);
    // Link bond pricing YTM automatically to the active 10Y rate
    setBondYTM(preset.rates['10Y']);
  };

  const handleRateSliderChange = (mat: string, value: number) => {
    setRates(prev => ({
      ...prev,
      [mat]: value
    }));
  };

  return (
    <div className={`p-6 rounded-2xl border ${st.border} ${st.cardBg} space-y-6 animate-fade-in`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-zinc-800/40">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Treasury Yield Curve Desk & Bond Valuer
          </h3>
          <p className={`text-[10px] ${st.textDim} leading-relaxed`}>
            Visualize the yield curve structure, analyze yield spread warnings (10Y-2Y), estimate recession metrics, and calculate bond present values.
          </p>
        </div>
        <div className={`text-[10px] px-2.5 py-1 rounded border font-mono font-bold ${st.badge}`}>
          Curve Analyser v1.1
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Controller Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`p-4 rounded-xl ${st.innerBg} border ${st.border} space-y-4`}>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider block border-b border-zinc-900 pb-1.5">Preset Scenarios</span>
            <div className="grid grid-cols-2 gap-1.5">
              {HISTORIC_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => loadPreset(preset)}
                  className="px-2.5 py-2 text-left bg-zinc-950 hover:bg-zinc-900 rounded-lg border border-zinc-900 hover:border-teal-500/25 transition-all text-[10px] space-y-0.5 cursor-pointer"
                >
                  <span className="font-bold text-white block">{preset.name}</span>
                  <span className="text-zinc-500 text-[9px] line-clamp-1">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={`p-4 rounded-xl ${st.innerBg} border ${st.border} space-y-3.5`}>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider block border-b border-zinc-900 pb-1.5">Adjust Durations</span>
            <div className="space-y-2">
              {['1M', '3M', '2Y', '5Y', '10Y', '30Y'].map((mat) => (
                <div key={mat} className="flex items-center justify-between gap-4">
                  <span className="text-xs font-mono font-bold text-zinc-400 w-8">{mat}</span>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="0.05"
                    value={rates[mat]}
                    onChange={(e) => handleRateSliderChange(mat, parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  />
                  <span className="text-xs font-mono text-zinc-200 font-bold w-12 text-right">{rates[mat].toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts and Calculations Visual Area */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${st.border} bg-zinc-950 flex flex-col justify-between h-[280px]`}>
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">Dynamic Yield Slope</span>
                {spreads.isInverted ? (
                  <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3" /> Inverted
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Normal Slope</span>
                )}
              </div>

              <div className="h-[180px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="maturity" stroke="#71717a" fontSize={9} />
                    <YAxis stroke="#71717a" fontSize={9} unit="%" domain={[0, 7]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                      labelStyle={{ fontSize: '10px', color: '#a1a1aa' }}
                      itemStyle={{ fontSize: '10px' }}
                      formatter={(val: any) => [`${val.toFixed(2)}%`, 'Yield']}
                    />
                    <Line type="monotone" dataKey="rate" stroke="#14b8a6" strokeWidth={2.5} dot={{ fill: '#14b8a6', r: 4 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-zinc-900 pt-2 text-center text-[10px]">
                <div>
                  <span className="text-zinc-500 block">10Y-2Y Spread:</span>
                  <span className={`font-bold font-mono ${spreads.s10y2y < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {(spreads.s10y2y * 100).toFixed(0)} bps
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Recession Prob (probit):</span>
                  <span className={`font-bold font-mono ${spreads.recessionProb > 50 ? 'text-rose-400' : 'text-zinc-300'}`}>
                    {spreads.recessionProb}%
                  </span>
                </div>
              </div>
            </div>

            {/* Bond Present Value Calculator */}
            <div className={`p-4 rounded-xl border ${st.border} bg-zinc-950 flex flex-col justify-between h-[280px]`}>
              <div className="border-b border-zinc-900 pb-2">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider block">Bond Present Valuer</span>
              </div>

              <div className="space-y-2.5 my-auto">
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-zinc-500 block">Face Value ($)</span>
                    <input
                      type="number"
                      value={bondFaceValue}
                      onChange={(e) => setBondFaceValue(Math.max(100, parseInt(e.target.value) || 0))}
                      className={`w-full py-1 px-2 mt-1 rounded bg-zinc-900 border border-zinc-800 text-white font-mono text-center`}
                    />
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Coupon Rate (%)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={bondCoupon}
                      onChange={(e) => setBondCoupon(Math.max(0, parseFloat(e.target.value) || 0))}
                      className={`w-full py-1 px-2 mt-1 rounded bg-zinc-900 border border-zinc-800 text-white font-mono text-center`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-zinc-500 block">Discount Rate / YTM (%)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={bondYTM}
                      onChange={(e) => setBondYTM(Math.max(0, parseFloat(e.target.value) || 0))}
                      className={`w-full py-1 px-2 mt-1 rounded bg-zinc-900 border border-zinc-800 text-white font-mono text-center`}
                    />
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Maturity (Years)</span>
                    <input
                      type="number"
                      value={bondYears}
                      onChange={(e) => setBondYears(Math.max(1, parseInt(e.target.value) || 1))}
                      className={`w-full py-1 px-2 mt-1 rounded bg-zinc-900 border border-zinc-800 text-white font-mono text-center`}
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-850/80 text-center">
                <span className="text-[9px] text-zinc-500 uppercase block font-bold tracking-wider">Present Value (Market Price)</span>
                <span className="text-base font-extrabold text-teal-400 font-mono">${bondPrice.toFixed(2)}</span>
                <span className="text-[8px] text-zinc-500 block mt-0.5">
                  {bondPrice > bondFaceValue ? 'Trading at a Premium' : bondPrice < bondFaceValue ? 'Trading at a Discount' : 'Trading at Par'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-zinc-950/40 border border-zinc-850/80 rounded-xl flex gap-2.5 items-center">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <p className="text-[9px] text-zinc-400 leading-relaxed">
              An inverted yield curve (when short-term yields exceed long-term yields) is one of the most reliable predictors of upcoming recessions, signaling that bond markets expect rate cuts in the future.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
