import React, { useState, useMemo } from 'react';
import { 
  Bot, AlertCircle, RefreshCw, Send, CheckCircle2, LayoutGrid, Award, 
  HelpCircle, DollarSign, ArrowUpRight, ArrowDownRight, Activity, TrendingUp, TrendingDown 
} from 'lucide-react';

interface MarketImpact {
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  score: number; // 0-100
  catalyst: string;
}

interface SentimentResponse {
  overallScore: number; // 0-100
  stocks: MarketImpact;
  crypto: MarketImpact;
  forex: MarketImpact;
  keyTakeaway: string;
}

const NEWS_PRESETS = [
  {
    title: 'Fed Rate Cut Decision',
    text: 'Federal Reserve announces unexpected 50 basis point interest rate cut to support economic growth, citing cooling inflation and labor market stabilization. Treasury yields drop immediately as equities rally across sectors, led by tech and regional banks.'
  },
  {
    title: 'Major Tech Earnings Beat',
    text: 'Leading global AI chip manufacturer surpasses quarterly revenue expectations by 18%, reporting record demand for next-generation hardware pipelines. Capital expenditure forecasts are revised up, sparking high volume in major index ETFs.'
  },
  {
    title: 'Crypto Regulatory Restructuring',
    text: 'Bipartisan financial reform framework released, offering a clear regulatory pathway for spot asset custodians and stablecoin issuers. Key industry players praise the clarity, noting it could unlock billions in latent institutional liquidity.'
  },
  {
    title: 'Global Commodity Trade Friction',
    text: 'Sudden maritime disruptions in critical energy shipping straits lead to a sharp 6% spike in crude oil benchmarks. Importers express concern over near-term logistics costs, raising fears of supply-side inflation pressure.'
  }
];

export const AISentimentTerminal: React.FC<{ theme?: string }> = ({ theme = 'charcoal' }) => {
  const [inputText, setInputText] = useState<string>(NEWS_PRESETS[0].text);
  const [analysis, setAnalysis] = useState<SentimentResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  const loadPreset = (text: string) => {
    setInputText(text);
  };

  const handleAnalyzeSentiment = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const prompt = `Perform a comprehensive multi-market financial sentiment analysis on the following news article or headline block.
      
      News text: "${inputText}"
      
      You must respond in JSON format conforming exactly to this structure:
      {
        "overallScore": 0-100 (where 0 is hyper-bearish, 50 is perfectly neutral, 100 is hyper-bullish),
        "stocks": { "sentiment": "Bullish"|"Bearish"|"Neutral", "score": 0-100, "catalyst": "Concise summary sentence of the stocks impact" },
        "crypto": { "sentiment": "Bullish"|"Bearish"|"Neutral", "score": 0-100, "catalyst": "Concise summary sentence of the crypto impact" },
        "forex": { "sentiment": "Bullish"|"Bearish"|"Neutral", "score": 0-100, "catalyst": "Concise summary sentence of the forex impact" },
        "keyTakeaway": "A concise 1-2 sentence macro investment summary of the main news."
      }`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const saved = localStorage.getItem('gemini_media_aggregator_settings');
        if (saved) {
          const settings = JSON.parse(saved);
          if (settings.geminiApiKey) {
            headers['x-gemini-key'] = settings.geminiApiKey;
          }
        }
      } catch (e) {
        console.warn("Failed to retrieve custom Gemini API key from settings", e);
      }

      // POSTing to server-side API proxy to hide keys
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to request AI analysis: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.text) {
        const parsed = JSON.parse(data.text);
        setAnalysis(parsed);
      } else {
        throw new Error('Could not parse Gemini API content response');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to parse structured sentiment response.');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentStyle = (sentiment: string) => {
    switch (sentiment) {
      case 'Bullish':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Bearish':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Bullish':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'Bearish':
        return <TrendingDown className="w-4 h-4 text-rose-400" />;
      default:
        return <Activity className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className={`p-6 rounded-2xl border ${st.border} ${st.cardBg} space-y-6 animate-fade-in`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-zinc-800/40">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI News Sentiment Scanner Terminal
          </h3>
          <p className={`text-[10px] ${st.textDim} leading-relaxed`}>
            Leverage Gemini 3.5 server-side LLM modules to parse unstructured financial news into categorical sentiment and macro-catalyst scores.
          </p>
        </div>
        <div className={`text-[10px] px-2.5 py-1 rounded border font-mono font-bold ${st.badge}`}>
          AI Analytics Engine v1.5
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Input Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Historic Presets</span>
            <div className="flex flex-wrap gap-1.5">
              {NEWS_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => loadPreset(preset.text)}
                  className="px-2 py-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-teal-500/20 rounded-lg text-[9px] font-bold text-zinc-400 hover:text-white cursor-pointer transition-all"
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Paste Market News / Wire Bulletins</span>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste breaking news feed, earnings transcripts, or Fed statements here..."
              rows={8}
              className={`w-full font-sans text-xs p-3.5 rounded-xl ${st.inputBg} placeholder-zinc-600 focus:outline-none focus:border-teal-500 leading-relaxed resize-none`}
            />
          </div>

          <button
            onClick={handleAnalyzeSentiment}
            disabled={loading || !inputText.trim()}
            className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI processing sentiment matrix...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit to Gemini Sentiment Module</span>
              </>
            )}
          </button>
        </div>

        {/* Right Output Dashboard */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className={`p-4 rounded-xl ${st.innerBg} border ${st.border} flex-1 flex flex-col justify-between min-h-[300px]`}>
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-2.5 text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {analysis ? (
              <div className="space-y-4">
                {/* Overall Score Dial */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">Analysis Complete</span>
                  </div>

                  <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1 rounded-full border border-zinc-900">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Overall Index:</span>
                    <span className={`text-xs font-mono font-bold ${
                      analysis.overallScore >= 65 ? 'text-emerald-400' : analysis.overallScore >= 40 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {analysis.overallScore}/100
                    </span>
                  </div>
                </div>

                {/* Sub-Market breakdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Stocks */}
                  <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-1.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">Stocks Impact</span>
                      {getSentimentIcon(analysis.stocks.sentiment)}
                    </div>
                    <span className="text-xs font-bold text-white font-mono">{analysis.stocks.score}% Index</span>
                    <p className="text-[9px] text-zinc-400 leading-relaxed line-clamp-2">{analysis.stocks.catalyst}</p>
                  </div>

                  {/* Crypto */}
                  <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-1.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">Crypto Impact</span>
                      {getSentimentIcon(analysis.crypto.sentiment)}
                    </div>
                    <span className="text-xs font-bold text-white font-mono">{analysis.crypto.score}% Index</span>
                    <p className="text-[9px] text-zinc-400 leading-relaxed line-clamp-2">{analysis.crypto.catalyst}</p>
                  </div>

                  {/* Forex */}
                  <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-1.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">Forex Impact</span>
                      {getSentimentIcon(analysis.forex.sentiment)}
                    </div>
                    <span className="text-xs font-bold text-white font-mono">{analysis.forex.score}% Index</span>
                    <p className="text-[9px] text-zinc-400 leading-relaxed line-clamp-2">{analysis.forex.catalyst}</p>
                  </div>
                </div>

                {/* Narrative Summary */}
                <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                  <span className="text-[8px] text-zinc-500 font-bold uppercase block mb-1">Narrative Insight Takeaway</span>
                  <p className="text-[10px] text-zinc-300 leading-relaxed">{analysis.keyTakeaway}</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-2.5">
                <Bot className="w-8 h-8 text-zinc-700 animate-pulse" />
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-zinc-400">Scanner Online & Awaiting Feeds</span>
                  <p className="text-[9px] text-zinc-500 max-w-[280px]">
                    Load a historic preset or paste custom bulletins from the left panel, then hit Submit to parse the news.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
