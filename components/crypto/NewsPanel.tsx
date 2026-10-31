
import React from 'react';
import { NewsItem } from '../../crypto-types';
import { fetchCoinNews } from '../../services/cryptoApi';
import { Newspaper, ExternalLink, RefreshCw, AlertCircle, Settings, ToggleLeft, ToggleRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NewsPanelProps {
  symbol: string;
}

export const NewsPanel: React.FC<NewsPanelProps> = ({ symbol }) => {
  const [news, setNews] = React.useState<NewsItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isNewsEnabled, setIsNewsEnabled] = React.useState(() => {
    const saved = localStorage.getItem('isNewsEnabled');
    return saved === 'true'; // Default to false if not present
  });

  const loadNews = React.useCallback(async () => {
    if (!isNewsEnabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCoinNews(symbol);
      setNews(data.slice(0, 5)); // Just top 5
    } catch (err) {
      setError('Failed to load latest news');
    } finally {
      setLoading(false);
    }
  }, [symbol, isNewsEnabled]);

  React.useEffect(() => {
    loadNews();
  }, [loadNews]);

  React.useEffect(() => {
    localStorage.setItem('isNewsEnabled', isNewsEnabled.toString());
  }, [isNewsEnabled]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl mt-8 relative">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <Newspaper className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Top crypto news today</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Powered by Cointelegraph Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-2">
            <a 
              href="https://cointelegraph.com/" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-1 bg-slate-950/60 rounded-full border border-slate-800 hover:border-indigo-500/30 transition-all group"
            >
              <img src="https://cointelegraph.com/favicon.ico" className="w-3 h-3 grayscale group-hover:grayscale-0 transition-all" alt="" />
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter group-hover:text-white">Cointelegraph.com</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-600 group-hover:text-indigo-400" />
            </a>
          </div>
          
          <button 
            onClick={() => setIsNewsEnabled(!isNewsEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
              isNewsEnabled 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-slate-950/40 border-slate-800 text-slate-500'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-widest">
              {isNewsEnabled ? 'Live Feed Active' : 'Feed Hibernated'}
            </span>
            {isNewsEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          
          {isNewsEnabled && (
            <button 
              onClick={loadNews}
              disabled={loading}
              className="p-2 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {!isNewsEnabled ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4 bg-slate-950/20 rounded-2xl border border-slate-800/50 border-dashed">
            <div className="p-4 bg-slate-900 rounded-full border border-slate-800">
              <Settings className="w-8 h-8 text-slate-600" />
            </div>
            <div className="max-w-xs space-y-2">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">Feed Configuration Required</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase italic">
                Enable the "Live Feed" toggle above to aggregate real-time intelligence from over 5 major crypto sources.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex gap-4 p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                <div className="w-20 h-20 bg-slate-800 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-800 rounded w-1/2" />
                  <div className="h-10 bg-slate-800 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 flex flex-col items-center gap-3 text-rose-400">
            <AlertCircle className="w-8 h-8" />
            <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
          </div>
        ) : news.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3 text-slate-500 grayscale transition-all hover:grayscale-0">
            <Newspaper className="w-10 h-10 opacity-20" />
            <span className="text-[10px] font-black uppercase tracking-widest italic tracking-[0.3em]">No valid intelligence detected for {symbol}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((item, idx) => (
              <motion.a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group flex gap-5 p-4 rounded-2xl bg-slate-950/40 hover:bg-slate-800/40 border border-slate-800 hover:border-indigo-500/30 transition-all duration-300"
              >
                {item.image && (
                  <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border border-slate-800 group-hover:border-indigo-500/20">
                    <img 
                      src={item.image} 
                      alt="" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-500/10 text-indigo-400 text-[8px] font-black px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-widest">
                          {item.source}
                        </span>
                        <div className="flex items-center gap-1 text-slate-500 text-[8px] font-black uppercase">
                          <Clock className="w-2.5 h-2.5" />
                          {item.time}
                        </div>
                      </div>
                      <ExternalLink className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h4 className="text-xs font-black text-white leading-tight group-hover:text-indigo-300 transition-colors line-clamp-2 italic uppercase">
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-[10px] text-slate-500 line-clamp-2 font-medium leading-relaxed italic">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-950 p-4 rounded-b-2xl border-t border-slate-800 flex items-center justify-between opacity-60 grayscale hover:grayscale-0 transition-all">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3 h-3 text-indigo-400" />
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Intelligence Stream: Verified</span>
        </div>
        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Direct Cointelegraph API Link</div>
      </div>
    </div>
  );
};
