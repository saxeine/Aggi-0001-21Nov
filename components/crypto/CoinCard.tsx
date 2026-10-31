
import React from 'react';
import { CoinId, PriceData } from '../../crypto-types';

interface CoinCardProps {
  coin: { id: CoinId, name: string, symbol: string, icon: string };
  priceData?: PriceData;
  selected: boolean;
  onClick: () => void;
}

export const CoinCard: React.FC<CoinCardProps> = ({ coin, priceData, selected, onClick }) => {
  const change = priceData?.usd_24h_change ?? 0;
  const isUp = change >= 0;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
        selected 
          ? 'bg-indigo-600 border-indigo-400 shadow shadow-indigo-600/10 text-white' 
          : 'bg-slate-900 border-slate-850 text-slate-300 hover:border-slate-800 hover:bg-slate-850/80 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-2">
        {coin.icon && !coin.icon.includes('placeholder') && coin.icon !== 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' ? (
          <img src={coin.icon} alt={coin.symbol} className="w-7 h-7 object-contain rounded" onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'; }} />
        ) : (
          <div className={`w-7 h-7 rounded bg-gradient-to-tr ${selected ? 'from-indigo-400 to-indigo-300 text-indigo-900' : 'from-indigo-600 to-violet-500 text-white'} flex items-center justify-center font-bold text-[10px] uppercase font-mono tracking-wider shrink-0 shadow-sm`}>
            {coin.symbol.slice(0, 3)}
          </div>
        )}
        <div className="text-left">
          <div className="text-xs font-bold leading-tight">{coin.name}</div>
          <div className={`text-[9px] font-mono ${selected ? 'text-indigo-200' : 'text-slate-500'}`}>{coin.symbol}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs font-bold font-mono">
          ${priceData?.usd ? (priceData.usd >= 1 ? priceData.usd.toLocaleString() : priceData.usd.toFixed(4)) : '...'}
        </div>
        <div className={`text-[9px] font-bold font-mono ${isUp ? 'text-emerald-400' : 'text-rose-400'} ${selected && 'text-white'}`}>
          {isUp ? '▲' : '▼'}{Math.abs(change).toFixed(2)}%
        </div>
      </div>
    </button>
  );
};
