
import { OHLCCandle, PriceData, CoinId, AnalysisResult, Timeframe } from '../crypto-types';

export const analyzeCandles = (
  coin: { id: CoinId, name: string, symbol: string, icon: string },
  price: PriceData,
  sekRate: number,
  timeframe: Timeframe,
  candles: OHLCCandle[]
): AnalysisResult => {
  const currentPrice = price.usd;
  const lastClose = candles.length > 0 ? candles[candles.length - 1].close : currentPrice;
  const prevClose = candles.length > 1 ? candles[candles.length - 2].close : lastClose;
  
  // Calculate basic Trend
  const trend: 'Bullish' | 'Bearish' | 'Neutral' = lastClose > prevClose ? 'Bullish' : lastClose < prevClose ? 'Bearish' : 'Neutral';
  
  // Pivot Points (Standard)
  const lastHigh = Math.max(...candles.slice(-14).map(c => c.high));
  const lastLow = Math.min(...candles.slice(-14).map(c => c.low));
  
  const pivot = (lastHigh + lastLow + lastClose) / 3;
  const r1 = (2 * pivot) - lastLow;
  const s1 = (2 * pivot) - lastHigh;
  const r2 = pivot + (lastHigh - lastLow);
  const s2 = pivot - (lastHigh - lastLow);

  // Simple RSI simulation
  const gains = candles.slice(-14).reduce((acc, c, i, arr) => i === 0 ? acc : acc + Math.max(0, c.close - arr[i-1].close), 0);
  const losses = candles.slice(-14).reduce((acc, c, i, arr) => i === 0 ? acc : acc + Math.max(0, arr[i-1].close - c.close), 0);
  const rsi = losses === 0 ? 100 : gainToLossRatio(gains, losses);

  // Recommendations
  const action: any = trend === 'Bullish' && rsi < 70 ? 'BUY' : trend === 'Bearish' && rsi > 30 ? 'SELL' : 'HOLD';
  const reasoning = [
    `${timeframe} structure indicates ${trend.toLowerCase()} momentum.`,
    rsi > 70 ? 'Asset is potentially overbought.' : rsi < 30 ? 'Asset is potentially oversold.' : 'RSI is in neutral territory.',
    `Price is trading ${currentPrice > pivot ? 'above' : 'below'} the daily pivot point.`
  ];

  // Blueprint
  const stopLoss = trend === 'Bullish' ? currentPrice * 0.97 : currentPrice * 1.03;
  const entry = currentPrice;
  const target1 = trend === 'Bullish' ? currentPrice * 1.03 : currentPrice * 0.97;
  const target2 = trend === 'Bullish' ? currentPrice * 1.06 : currentPrice * 0.94;

  return {
    coin,
    currentPrice: price,
    sekPrice: currentPrice * sekRate,
    sekRate,
    timeframe,
    signals: {
      trend,
      strength: 65,
      indicators: {
        rsi,
        ema_20: pivot,
        atr: currentPrice * 0.02
      }
    },
    levels: {
      support: [s1, s2],
      resistance: [r1, r2],
      pivot
    },
    recommendation: {
      action,
      reasoning
    },
    tradingBlueprint: {
      entry,
      targets: [target1, target2],
      stopLoss,
      riskReward: 2.0
    }
  };
};

function gainToLossRatio(gains: number, losses: number) {
    const rs = gains / (losses || 1);
    return 100 - (100 / (1 + rs));
}
