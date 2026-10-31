import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { 
  TrendingUp, TrendingDown, Search, Maximize2, Minimize2, 
  Layers, Settings, RefreshCw, BarChart2, Check, ExternalLink, Sparkles 
} from 'lucide-react';
import { COINS } from '../../constants/crypto';
import { SEED_STOCKS } from '../../constants/stocks';
import { FOREX_PAIRS } from '../../constants/forex';

interface HeatmapAsset {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  priceUsd: number;
  priceSek: number;
  change24h: number;
  type: 'crypto' | 'stock' | 'forex';
}

interface TradingHeatmapProps {
  initialType?: 'crypto' | 'stock' | 'forex';
  sekRate?: number;
  onSelectAsset?: (id: string, type: 'crypto' | 'stock' | 'forex') => void;
}

export const TradingHeatmap: React.FC<TradingHeatmapProps> = ({ 
  initialType = 'crypto', 
  sekRate = 10.65,
  onSelectAsset
}) => {
  const [assetType, setAssetType] = useState<'crypto' | 'stock' | 'forex'>(initialType);
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeBy, setSizeBy] = useState<'equal' | 'price'>('equal');
  const [viewMode, setViewMode] = useState<'treemap' | 'grid'>('treemap');
  
  // Simulated real-time price updates
  const [liveChanges, setLiveChanges] = useState<Record<string, number>>({});
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isLiveUpdating, setIsLiveUpdating] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [hoveredAsset, setHoveredAsset] = useState<{
    x: number;
    y: number;
    symbol: string;
    name: string;
    sector: string;
    priceUsd: number;
    priceSek: number;
    change24h: number;
    type: string;
  } | null>(null);

  // Load custom assets from localStorage
  const cryptoCustom = useMemo(() => {
    try {
      const saved = localStorage.getItem('crypto_custom_coins');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, []);

  const stockCustom = useMemo(() => {
    try {
      const saved = localStorage.getItem('stock_assistant_custom_list');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }, []);

  // Sync / initialize live prices and changes
  useEffect(() => {
    const initialChanges: Record<string, number> = {};
    const initialPrices: Record<string, number> = {};

    // Crypto
    COINS.forEach(c => {
      // Fetch or fallback
      const fallbacks: Record<string, number> = { bitcoin: 65420, ethereum: 3450, ripple: 0.62, solana: 145, cardano: 0.45 };
      initialPrices[c.id] = fallbacks[c.id] || 1.25;
      initialChanges[c.id] = (Math.random() * 8) - 4; // -4% to +4%
    });
    cryptoCustom.forEach((c: any) => {
      initialPrices[c.id] = 1.0;
      initialChanges[c.id] = (Math.random() * 8) - 4;
    });

    // Stocks
    SEED_STOCKS.forEach(s => {
      initialPrices[s.id] = s.seedPrice;
      initialChanges[s.id] = (Math.random() * 6) - 3; // -3% to +3%
    });
    stockCustom.forEach((s: any) => {
      initialPrices[s.id] = s.seedPrice || 100;
      initialChanges[s.id] = (Math.random() * 6) - 3;
    });

    // Forex
    FOREX_PAIRS.forEach(f => {
      const rates: Record<string, number> = { 'eur-usd': 1.0825, 'gbp-usd': 1.265, 'usd-jpy': 155.4, 'usd-sek': 10.65, 'eur-sek': 11.53 };
      initialPrices[f.id] = rates[f.id] || 1.15;
      initialChanges[f.id] = (Math.random() * 1.5) - 0.75; // -0.75% to +0.75%
    });

    setLivePrices(initialPrices);
    setLiveChanges(initialChanges);
  }, [cryptoCustom, stockCustom]);

  // Real-time micro-fluctuations (ticker simulator)
  useEffect(() => {
    if (!isLiveUpdating) return;

    const timer = setInterval(() => {
      setLiveChanges(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          // Add micro fluctuation
          const delta = (Math.random() * 0.4) - 0.2; // -0.2% to +0.2%
          next[id] = Math.max(-15, Math.min(15, next[id] + delta));
        });
        return next;
      });

      setLivePrices(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          const changePct = liveChanges[id] || 0;
          // Slowly drift base price around the changePct
          const drift = 1 + ((Math.random() * 0.002) - 0.001);
          next[id] = Math.max(0.0001, next[id] * drift);
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [isLiveUpdating, liveChanges]);

  // Merge full data array
  const allAssets = useMemo<HeatmapAsset[]>(() => {
    if (assetType === 'crypto') {
      const merged = [...COINS, ...cryptoCustom].filter(c => c.id !== 'thb-currency');
      return merged.map(c => ({
        id: c.id,
        symbol: c.symbol,
        name: c.name,
        sector: c.sector || 'Alternative Tokens',
        priceUsd: livePrices[c.id] || 1.0,
        priceSek: (livePrices[c.id] || 1.0) * sekRate,
        change24h: liveChanges[c.id] ?? 0.0,
        type: 'crypto'
      }));
    } else if (assetType === 'stock') {
      const merged = [...SEED_STOCKS, ...stockCustom];
      return merged.map(s => ({
        id: s.id,
        symbol: s.symbol,
        name: s.name,
        sector: s.sector || 'Equities',
        priceUsd: livePrices[s.id] || 100.0,
        priceSek: (livePrices[s.id] || 100.0) * sekRate,
        change24h: liveChanges[s.id] ?? 0.0,
        type: 'stock'
      }));
    } else {
      return FOREX_PAIRS.map(f => ({
        id: f.id,
        symbol: f.name,
        name: `${f.baseName} vs ${f.quoteName}`,
        sector: f.sector || 'Major Forex',
        priceUsd: livePrices[f.id] || 1.0,
        priceSek: f.quoteSymbol === 'SEK' ? livePrices[f.id] : (livePrices[f.id] * sekRate),
        change24h: liveChanges[f.id] ?? 0.0,
        type: 'forex'
      }));
    }
  }, [assetType, cryptoCustom, stockCustom, livePrices, liveChanges, sekRate]);

  // Filtered Assets based on Search
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return allAssets;
    const q = searchQuery.toLowerCase();
    return allAssets.filter(a => 
      a.symbol.toLowerCase().includes(q) || 
      a.name.toLowerCase().includes(q) || 
      a.sector.toLowerCase().includes(q)
    );
  }, [allAssets, searchQuery]);

  // Monitor element resizing
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // set dimensions with some safe padding
        setDimensions({
          width: Math.max(400, width),
          height: Math.max(350, height || 500)
        });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // DRAW THE HEATMAP USING D3
  useEffect(() => {
    if (!svgRef.current || filteredAssets.length === 0) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    // Color scaling logic (from deep red for losses to deep green for gains)
    // -5% or less -> Dark Red, 0% -> Charcoal Slate, +5% or more -> Dark Green
    const colorScale = d3.scaleLinear<string>()
      .domain([-5, -2, 0, 2, 5])
      .range(['#dc2626', '#7f1d1d', '#1e293b', '#14532d', '#16a34a']);

    if (viewMode === 'treemap') {
      // Group assets by sector for a beautiful nested Layout (like Finviz)
      const groupedData = d3.group(filteredAssets, d => d.sector);
      
      const hierarchyData = {
        name: 'Root',
        children: Array.from(groupedData).map(([sector, assets]) => ({
          name: sector,
          children: assets.map(asset => ({
            ...asset,
            value: sizeBy === 'price' ? Math.max(1, asset.priceUsd) : 100 // sizing metric
          }))
        }))
      };

      const root = d3.hierarchy(hierarchyData)
        .sum(d => (d as any).value || 0)
        .sort((a, b) => ((b as any).value || 0) - ((a as any).value || 0)) as unknown as d3.HierarchyRectangularNode<any>;

      d3.treemap()
        .size([width, height])
        .paddingOuter(4)
        .paddingTop(18) // margin for sector headers
        .paddingInner(3)
        .round(true)
        (root);

      // Create a main group
      const mainGroup = svg.append('g');

      // Sector containers
      const sectorGroups = mainGroup.selectAll('.sector-group')
        .data(root.descendants().filter(d => d.depth === 1))
        .enter()
        .append('g')
        .attr('class', 'sector-group');

      // Draw Sector Text headers
      sectorGroups.append('text')
        .attr('x', d => d.x0 + 4)
        .attr('y', d => d.y0 + 13)
        .text(d => d.data.name as string)
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-family', 'sans-serif')
        .attr('font-weight', 'bold')
        .attr('letter-spacing', '0.05em')
        .attr('clip-path', d => `inset(0px ${width - d.x1}px 0px 0px)`);

      // Individual Leaf node elements (Assets)
      const leafNodes = mainGroup.selectAll('.leaf-node')
        .data(root.leaves())
        .enter()
        .append('g')
        .attr('class', 'leaf-node')
        .attr('transform', d => `translate(${d.x0},${d.y0})`);

      // Draw standard background Rect
      leafNodes.append('rect')
        .attr('width', d => Math.max(0, d.x1 - d.x0))
        .attr('height', d => Math.max(0, d.y1 - d.y0))
        .attr('fill', d => colorScale((d.data as any).change24h))
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 1)
        .attr('rx', 4)
        .style('cursor', 'pointer')
        .style('transition', 'fill 0.3s ease')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .attr('stroke', '#818cf8')
            .attr('stroke-width', 2);
          
          const asset = d.data as any;
          // Calculate tooltip offset coordinates relative to container
          const [mx, my] = d3.pointer(event, svgRef.current);
          setHoveredAsset({
            x: mx,
            y: my,
            symbol: asset.symbol,
            name: asset.name,
            sector: asset.sector,
            priceUsd: asset.priceUsd,
            priceSek: asset.priceSek,
            change24h: asset.change24h,
            type: asset.type
          });
        })
        .on('mousemove', function(event) {
          const [mx, my] = d3.pointer(event, svgRef.current);
          setHoveredAsset(prev => prev ? { ...prev, x: mx, y: my } : null);
        })
        .on('mouseout', function() {
          d3.select(this)
            .attr('stroke', '#0f172a')
            .attr('stroke-width', 1);
          setHoveredAsset(null);
        })
        .on('click', (event, d) => {
          const asset = d.data as any;
          if (onSelectAsset) {
            onSelectAsset(asset.id, asset.type);
          }
        });

      // Append Symbol Text inside rectangles
      leafNodes.append('text')
        .attr('x', d => (d.x1 - d.x0) / 2)
        .attr('y', d => (d.y1 - d.y0) / 2 - 3)
        .attr('text-anchor', 'middle')
        .text(d => (d.data as any).symbol)
        .attr('fill', '#ffffff')
        .attr('font-size', d => {
          const w = d.x1 - d.x0;
          return w > 50 ? '12px' : w > 30 ? '10px' : '0px';
        })
        .attr('font-weight', 'bold')
        .attr('font-family', 'monospace')
        .style('pointer-events', 'none');

      // Append 24h Change Text inside rectangles
      leafNodes.append('text')
        .attr('x', d => (d.x1 - d.x0) / 2)
        .attr('y', d => (d.y1 - d.y0) / 2 + 10)
        .attr('text-anchor', 'middle')
        .text(d => {
          const change = (d.data as any).change24h;
          return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        })
        .attr('fill', d => {
          const change = (d.data as any).change24h;
          return change >= 0 ? '#86efac' : '#fca5a5';
        })
        .attr('font-size', d => {
          const w = d.x1 - d.x0;
          const h = d.y1 - d.y0;
          return (w > 55 && h > 35) ? '10px' : '0px';
        })
        .attr('font-weight', 'semibold')
        .attr('font-family', 'monospace')
        .style('pointer-events', 'none');

    } else {
      // GRID VIEW: Elegant uniform grid blocks using D3
      const columnsCount = Math.floor(Math.sqrt(filteredAssets.length * (width / height)));
      const cols = Math.max(3, Math.min(10, columnsCount));
      const rows = Math.ceil(filteredAssets.length / cols);
      
      const cardWidth = (width - (cols + 1) * 6) / cols;
      const cardHeight = (height - (rows + 1) * 6) / rows;

      const gridGroup = svg.append('g');

      const cells = gridGroup.selectAll('.grid-cell')
        .data(filteredAssets)
        .enter()
        .append('g')
        .attr('class', 'grid-cell')
        .attr('transform', (d, i) => {
          const colIndex = i % cols;
          const rowIndex = Math.floor(i / cols);
          const x = 6 + colIndex * (cardWidth + 6);
          const y = 6 + rowIndex * (cardHeight + 6);
          return `translate(${x},${y})`;
        });

      cells.append('rect')
        .attr('width', cardWidth)
        .attr('height', cardHeight)
        .attr('fill', d => colorScale(d.change24h))
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 1)
        .attr('rx', 6)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .attr('stroke', '#818cf8')
            .attr('stroke-width', 2);
          
          const [mx, my] = d3.pointer(event, svgRef.current);
          setHoveredAsset({
            x: mx,
            y: my,
            symbol: d.symbol,
            name: d.name,
            sector: d.sector,
            priceUsd: d.priceUsd,
            priceSek: d.priceSek,
            change24h: d.change24h,
            type: d.type
          });
        })
        .on('mousemove', function(event) {
          const [mx, my] = d3.pointer(event, svgRef.current);
          setHoveredAsset(prev => prev ? { ...prev, x: mx, y: my } : null);
        })
        .on('mouseout', function() {
          d3.select(this)
            .attr('stroke', '#0f172a')
            .attr('stroke-width', 1);
          setHoveredAsset(null);
        })
        .on('click', (event, d) => {
          if (onSelectAsset) {
            onSelectAsset(d.id, d.type);
          }
        });

      // Symbol
      cells.append('text')
        .attr('x', cardWidth / 2)
        .attr('y', cardHeight / 2 - 4)
        .attr('text-anchor', 'middle')
        .text(d => d.symbol)
        .attr('fill', '#ffffff')
        .attr('font-size', cardHeight > 40 ? '12px' : '10px')
        .attr('font-weight', 'extrabold')
        .attr('font-family', 'monospace')
        .style('pointer-events', 'none');

      // Change %
      cells.append('text')
        .attr('x', cardWidth / 2)
        .attr('y', cardHeight / 2 + 10)
        .attr('text-anchor', 'middle')
        .text(d => `${d.change24h >= 0 ? '+' : ''}${d.change24h.toFixed(2)}%`)
        .attr('fill', d => d.change24h >= 0 ? '#86efac' : '#fca5a5')
        .attr('font-size', cardHeight > 45 ? '10px' : '0px')
        .attr('font-family', 'monospace')
        .style('pointer-events', 'none');
    }

  }, [filteredAssets, dimensions, viewMode, sizeBy]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-2xl flex flex-col gap-5 text-slate-100">
      
      {/* Top dashboard control panel */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BarChart2 className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Trading Heatmap Matrix
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-900/30 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" /> D3 Engine
              </span>
            </h3>
          </div>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            Real-time visual map of price fluctuations. Color intensity represents percentage change, while grouping clusters assets by industry sector.
          </p>
        </div>

        {/* Filters and options */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Asset Type Selectors */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setAssetType('crypto')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                assetType === 'crypto' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Crypto
            </button>
            <button
              onClick={() => setAssetType('stock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                assetType === 'stock' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Stocks
            </button>
            <button
              onClick={() => setAssetType('forex')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                assetType === 'forex' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Forex
            </button>
          </div>

          {/* Size By metric */}
          {viewMode === 'treemap' && (
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500 font-bold px-2 self-center text-[10px] uppercase">Box Size:</span>
              <button
                onClick={() => setSizeBy('equal')}
                className={`px-2 py-1 rounded text-[10px] font-bold ${
                  sizeBy === 'equal' ? 'bg-slate-850 text-slate-100' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Each asset rectangle has the same size weight"
              >
                Equal
              </button>
              <button
                onClick={() => setSizeBy('price')}
                className={`px-2 py-1 rounded text-[10px] font-bold ${
                  sizeBy === 'price' ? 'bg-slate-850 text-slate-100' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Sized proportionally to current price value"
              >
                Price Weight
              </button>
            </div>
          )}

          {/* View Mode (Treemap vs Grid) */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('treemap')}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1 ${
                viewMode === 'treemap' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/30' : 'text-slate-400'
              }`}
              title="Treemap view categorized by Sector"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sectors</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1 ${
                viewMode === 'grid' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/30' : 'text-slate-400'
              }`}
              title="Grid view"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Flat Grid</span>
            </button>
          </div>

          {/* Live Sync Toggle */}
          <button
            onClick={() => setIsLiveUpdating(!isLiveUpdating)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              isLiveUpdating 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLiveUpdating ? 'animate-spin' : ''}`} />
            <span>{isLiveUpdating ? 'Live Ticking' : 'Static'}</span>
          </button>
        </div>
      </div>

      {/* Search and stats bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-850">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${assetType}...`}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Rapid Stats Overview */}
        <div className="flex items-center gap-4 text-xs font-mono self-start md:self-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span className="text-slate-400">Gaining:</span>
            <span className="font-bold text-emerald-400">
              {filteredAssets.filter(a => a.change24h > 0.1).length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
            <span className="text-slate-400">Declining:</span>
            <span className="font-bold text-rose-400">
              {filteredAssets.filter(a => a.change24h < -0.1).length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-slate-700" />
            <span className="text-slate-400">Flat:</span>
            <span className="font-semibold text-slate-300">
              {filteredAssets.filter(a => Math.abs(a.change24h) <= 0.1).length}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Canvas containing the interactive SVG */}
      <div className="relative flex-1 bg-slate-950 border border-slate-850 rounded-2xl min-h-[420px] overflow-hidden" ref={containerRef}>
        <svg 
          ref={svgRef} 
          width={dimensions.width} 
          height={dimensions.height}
          className="block select-none"
        />

        {/* Hover Floating Tooltip built with React overlays (anti-clipping / high density) */}
        {hoveredAsset && (
          <div 
            className="absolute z-30 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-3.5 shadow-2xl w-56 animate-fade-in flex flex-col gap-2"
            style={{ 
              left: Math.min(dimensions.width - 240, hoveredAsset.x + 15), 
              top: Math.min(dimensions.height - 180, hoveredAsset.y + 15) 
            }}
          >
            {/* Header info */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                {hoveredAsset.sector}
              </span>
              <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                hoveredAsset.change24h >= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' : 'bg-rose-950 text-rose-400 border border-rose-900/30'
              }`}>
                {hoveredAsset.change24h >= 0 ? '+' : ''}{hoveredAsset.change24h.toFixed(2)}%
              </span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                {hoveredAsset.symbol}
                <span className="text-[10px] text-slate-400 font-normal truncate max-w-[120px]">
                  ({hoveredAsset.name})
                </span>
              </h4>
            </div>

            <div className="border-t border-slate-800/80 pt-2 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Price USD:</span>
                <span className="font-semibold text-slate-100">
                  ${hoveredAsset.priceUsd >= 1 ? hoveredAsset.priceUsd.toFixed(2) : hoveredAsset.priceUsd.toFixed(4)}
                </span>
              </div>

              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Price SEK:</span>
                <span className="font-semibold text-indigo-300">
                  {hoveredAsset.priceSek >= 1 ? hoveredAsset.priceSek.toFixed(2) : hoveredAsset.priceSek.toFixed(4)} kr
                </span>
              </div>
            </div>

            {onSelectAsset && (
              <div className="text-[9px] text-indigo-400 font-bold border-t border-slate-800/60 pt-1.5 mt-0.5 flex items-center gap-1">
                <span>Click element to analyze indicators</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </div>
            )}
          </div>
        )}

        {filteredAssets.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Layers className="w-8 h-8 text-slate-650" />
            <p className="text-xs">No assets matched your search term.</p>
          </div>
        )}
      </div>

      {/* Footer / Instructions */}
      <div className="text-[10px] text-slate-500 font-mono flex flex-col sm:flex-row justify-between items-center gap-2 border-t border-slate-800/60 pt-3">
        <span>* Color intensity represents gains (emerald) / losses (red)</span>
        <span>Hover for live metrics • Click asset to load details</span>
      </div>

    </div>
  );
};
