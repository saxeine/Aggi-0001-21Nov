import React from 'react';
import { ForexPair } from '../../constants/forex';

interface CurrencyCardProps {
  pair: ForexPair;
  price: number;
  change24h: number;
  selected: boolean;
  onClick: () => void;
}

export const CurrencyCard: React.FC<CurrencyCardProps> = ({ pair, price, change24h, selected, onClick }) => {
  const isUp = change24h >= 0;
  
  // Forex pairs are usually displayed with 4 decimals (e.g. EUR/USD = 1.0824) or 2 decimals for JPY crosses
  const formatPrice = (val: number) => {
    if (!val) return '...';
    if (pair.quoteSymbol === 'JPY') {
      return val.toFixed(2);
    }
    return val.toFixed(4);
  };

  return (
    <button
      onClick={onClick}
      id={`forex-card-${pair.id}`}
      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
        selected 
          ? 'bg-blue-600 border-blue-400 shadow shadow-blue-600/20 text-white' 
          : 'bg-slate-900 border-slate-850 text-slate-300 hover:border-slate-800 hover:bg-slate-850/80 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl shrink-0 leading-none">
          {pair.icon || '💵'}
        </div>
        <div className="text-left">
          <div className="text-xs font-bold leading-tight flex items-center gap-1">
            {pair.name}
          </div>
          <div className={`text-[10px] font-medium ${selected ? 'text-blue-100' : 'text-slate-500'}`}>
            {pair.baseName}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs font-bold font-mono">
          {formatPrice(price)}
        </div>
        <div className={`text-[9px] font-bold font-mono ${isUp ? 'text-emerald-400' : 'text-rose-400'} ${selected ? 'text-blue-100' : ''}`}>
          {isUp ? '▲' : '▼'}{Math.abs(change24h).toFixed(3)}%
        </div>
      </div>
    </button>
  );
};
