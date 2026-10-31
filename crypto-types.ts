
export type CoinId = string;

export type Timeframe = '1H' | '4H' | '1D' | '1W';

export interface PriceData {
  usd: number;
  usd_24h_change: number;
  last_updated_at?: number;
}

export interface OHLCCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData {
  rsi?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollinger?: {
    upper: number;
    middle: number;
    lower: number;
  };
  ema_20?: number;
  sma_50?: number;
  atr?: number;
}

export interface AnalysisResult {
  coin: {
    id: CoinId;
    name: string;
    symbol: string;
    icon: string;
  };
  currentPrice: PriceData;
  sekPrice: number;
  sekRate: number;
  timeframe: Timeframe;
  signals: {
    trend: 'Bullish' | 'Bearish' | 'Neutral';
    strength: number; // 0-100
    indicators: IndicatorData;
  };
  levels: {
    support: number[];
    resistance: number[];
    pivot: number;
  };
  recommendation: {
    action: 'BUY' | 'SELL' | 'HOLD' | 'STRONG BUY' | 'STRONG SELL';
    reasoning: string[];
  };
  tradingBlueprint: {
    entry: number;
    targets: number[];
    stopLoss: number;
    riskReward: number;
  };
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  time: string;
  image?: string;
  description?: string;
}
