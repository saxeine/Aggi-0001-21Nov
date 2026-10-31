import React from 'react';
import { PriceData } from '../../crypto-types';
import { Trash2 } from 'lucide-react';

interface StockCardProps {
  stock: { id: string, name: string, symbol: string, icon: string, isCustom?: boolean, sector?: string };
  priceData?: PriceData;
  selected: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

export const StockCard: React.FC<StockCardProps> = ({ stock, priceData, selected, onClick, onDelete }) => {
  const change = priceData?.usd_24h_change ?? 0;
  const isUp = change >= 0;

  return (
    <div
      className={`relative group w-full flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
        selected 
          ? 'bg-blue-600 border-blue-400 shadow shadow-blue-600/10 text-white' 
          : 'bg-slate-900 border-slate-850 text-slate-300 hover:border-slate-800 hover:bg-slate-850/80 hover:text-white'
      }`}
    >
      <div className="flex-1 flex items-center gap-2" onClick={onClick}>
        {stock.icon ? (
          <img src={stock.icon} alt={stock.symbol} className="w-7 h-7 object-contain rounded" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-7 h-7 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-[10px] text-blue-400 font-mono">
            {stock.symbol.slice(0, 2)}
          </div>
        )}
        <div className="text-left max-w-[120px] truncate">
          <div className="text-xs font-bold truncate leading-tight">{stock.name}</div>
          <div className={`text-[9px] font-mono ${selected ? 'text-blue-200' : 'text-slate-500'} flex items-center gap-1`}>
            <span className="font-bold">{stock.symbol}</span>
            {stock.sector && (
              <>
                <span className="opacity-40">•</span>
                <span className={`text-[8px] font-sans px-1 py-0.1 bg-slate-800/80 text-slate-400 rounded uppercase font-bold tracking-tight ${selected ? 'bg-blue-700/80 text-blue-200' : ''}`}>{stock.sector}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1.5">
        <div className="text-right" onClick={onClick}>
          <div className="text-xs font-bold font-mono">
            ${priceData?.usd ? (priceData.usd >= 1 ? priceData.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : priceData.usd.toFixed(4)) : '...'}
          </div>
          <div className={`text-[9px] font-bold font-mono ${isUp ? 'text-emerald-400' : 'text-rose-400'} ${selected && 'text-white'}`}>
            {isUp ? '▲' : '▼'}{Math.abs(change).toFixed(2)}%
          </div>
        </div>

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 bg-rose-955/40 hover:bg-rose-900 border border-rose-900/10 text-rose-400 hover:text-rose-100 rounded transition-all duration-200 cursor-pointer"
            title="Delete stock ticker"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
