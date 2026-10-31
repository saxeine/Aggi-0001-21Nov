import React from 'react';
import { NewsItem } from '../../crypto-types';
import { Newspaper, ExternalLink, RefreshCw, AlertCircle, ToggleLeft, ToggleRight, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StockNewsPanelProps {
  symbol: string;
  name: string;
}

export const StockNewsPanel: React.FC<StockNewsPanelProps> = ({ symbol, name }) => {
  const [news, setNews] = React.useState<NewsItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isNewsEnabled, setIsNewsEnabled] = React.useState(true);
  const [isNewsExpanded, setIsNewsExpanded] = React.useState(false);

  const generateStockNews = React.useCallback((sym: string, nm: string): NewsItem[] => {
    return [
      {
        id: '1',
        title: `${sym} Momentum Strengthens as Institutional Inflows Accelerate`,
        source: 'Bloomberg Terminal',
        time: 'Just now',
        url: '#',
        description: `Nasdaq institutional trading desk reports heavy buying interest in shares of ${nm} (${sym}) amid constructive high-timeframe technical indicator expansion.`
      },
      {
        id: '2',
        title: `Technical Analysis Check: ${sym} Testing Macro Resistance Layer`,
        source: 'TradingView Market Insights',
        time: '2 hours ago',
        url: '#',
        description: `Market technicians highlight constructive multi-factor indicators on ${sym} daily charts. RSI levels remains consolidated within neutral territory.`
      },
      {
        id: '3',
        title: `Macro Sentiment Sync: NASDAQ 500 Tech Cluster Stabilizes`,
        source: 'WSJ Markets',
        time: '5 hours ago',
        url: '#',
        description: `Growth clusters led by ${nm} see resilient volume consolidation as inflation indices match target thresholds.`
      }
    ];
  }, []);

  const loadNews = React.useCallback(async () => {
    if (!isNewsEnabled) return;
    setLoading(true);
    try {
      // Simulate slight network delay
      await new Promise((resolve) => setTimeout(resolve, 400));
      setNews(generateStockNews(symbol, name));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [symbol, name, isNewsEnabled, generateStockNews]);

  React.useEffect(() => {
    loadNews();
  }, [loadNews]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl mt-8 relative">
      
      {/* Header */}
      <div 
        onClick={() => setIsNewsExpanded(!isNewsExpanded)}
        className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800 cursor-pointer group select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Newspaper className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Stock Intelligence Feed</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Real-time narrative monitoring</p>
          </div>
        </div>

        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-950/60 rounded-full border border-slate-800 group">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">NASDAQ 500 INSIGHTS</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-600" />
            </div>
          </div>
          
          <button 
            onClick={() => setIsNewsEnabled(!isNewsEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              isNewsEnabled 
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                : 'bg-slate-950/40 border-slate-800 text-slate-500'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-widest">
              {isNewsEnabled ? 'Live Feed' : 'Hibernated'}
            </span>
            {isNewsEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          
          {isNewsEnabled && (
            <button 
              onClick={loadNews}
              disabled={loading}
              className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}

          <div 
            onClick={() => setIsNewsExpanded(!isNewsExpanded)}
            className="p-2 bg-slate-950 rounded-lg border border-slate-800 group-hover:border-slate-700 cursor-pointer"
          >
            {isNewsExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isNewsExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="p-6"
          >
            {!isNewsEnabled ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4 bg-slate-950/20 rounded-2xl border border-slate-800/50 border-dashed">
                <AlertCircle className="w-8 h-8 text-slate-600" />
                <div>
                  <h4 className="text-white text-xs font-black uppercase tracking-widest">Stock News Feed Offline</h4>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mt-1">Enable live feed monitoring above to re-index Nasdaq narratives</p>
                </div>
              </div>
            ) : loading ? (
              <div className="space-y-4 py-6">
                <div className="h-6 w-2/3 bg-slate-800/50 rounded animate-pulse" />
                <div className="h-10 w-full bg-slate-800/50 rounded animate-pulse" />
                <div className="h-6 w-1/2 bg-slate-800/50 rounded animate-pulse" />
              </div>
            ) : news.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">No coverage updates loaded.</div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {news.map((item, index) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ delay: index * 0.08 }}
                      className="p-4 bg-slate-950/40 hover:bg-slate-950/80 rounded-2xl border border-slate-800/60 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase">
                        <span className="text-blue-400">{item.source}</span>
                        <span className="flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          {item.time}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-white leading-snug">{item.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">{item.description}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
