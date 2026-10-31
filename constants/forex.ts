export interface ForexPair {
  id: string;
  name: string;
  baseSymbol: string;
  quoteSymbol: string;
  baseName: string;
  quoteName: string;
  icon: string;
  sector: 'Major Pairs' | 'SEK Crosses' | 'Minor/Exotic Pairs' | 'Custom Pairs';
  isCustom?: boolean;
}

export const FOREX_PAIRS: ForexPair[] = [
  { id: 'eur-usd', name: 'EUR/USD', baseSymbol: 'EUR', quoteSymbol: 'USD', baseName: 'Euro', quoteName: 'US Dollar', icon: '🇪🇺', sector: 'Major Pairs' },
  { id: 'gbp-usd', name: 'GBP/USD', baseSymbol: 'GBP', quoteSymbol: 'USD', baseName: 'British Pound', quoteName: 'US Dollar', icon: '🇬🇧', sector: 'Major Pairs' },
  { id: 'usd-jpy', name: 'USD/JPY', baseSymbol: 'USD', quoteSymbol: 'JPY', baseName: 'US Dollar', quoteName: 'Japanese Yen', icon: '🇯🇵', sector: 'Major Pairs' },
  { id: 'usd-sek', name: 'USD/SEK', baseSymbol: 'USD', quoteSymbol: 'SEK', baseName: 'US Dollar', quoteName: 'Swedish Krona', icon: '🇸🇪', sector: 'SEK Crosses' },
  { id: 'eur-sek', name: 'EUR/SEK', baseSymbol: 'EUR', quoteSymbol: 'SEK', baseName: 'Euro', quoteName: 'Swedish Krona', icon: '🇸🇪', sector: 'SEK Crosses' },
  { id: 'gbp-sek', name: 'GBP/SEK', baseSymbol: 'GBP', quoteSymbol: 'SEK', baseName: 'British Pound', quoteName: 'Swedish Krona', icon: '🇸🇪', sector: 'SEK Crosses' },
  { id: 'usd-chf', name: 'USD/CHF', baseSymbol: 'USD', quoteSymbol: 'CHF', baseName: 'US Dollar', quoteName: 'Swiss Franc', icon: '🇨🇭', sector: 'Major Pairs' },
  { id: 'aud-usd', name: 'AUD/USD', baseSymbol: 'AUD', quoteSymbol: 'USD', baseName: 'Australian Dollar', quoteName: 'US Dollar', icon: '🇦🇺', sector: 'Minor/Exotic Pairs' },
  { id: 'usd-cad', name: 'USD/CAD', baseSymbol: 'USD', quoteSymbol: 'CAD', baseName: 'US Dollar', quoteName: 'Canadian Dollar', icon: '🇨🇦', sector: 'Minor/Exotic Pairs' },
];

export const FOREX_MAP: Record<string, ForexPair> = FOREX_PAIRS.reduce((acc, p) => {
  acc[p.id] = p;
  return acc;
}, {} as any);
