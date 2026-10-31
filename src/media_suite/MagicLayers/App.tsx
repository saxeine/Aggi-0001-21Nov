import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  Upload, Layers, Eye, EyeOff, Download, Zap, Settings2,
  Image as ImageIcon, ChevronDown, ChevronUp, Wand2, Grid3X3,
  Split, Contrast, Sparkles, Copy, ArrowLeft, Save, X, FolderOpen,
} from 'lucide-react';
import type { ImageLayer } from './types';
import { segmentImageIntoLayers } from './utils/segment';
import { cn } from './utils/cn';

export interface MagicLayersProps {
  onBack?: () => void;
  activeSession?: any;
  onSaveArtifact?: (item: any) => void;
}

interface SessionImage {
  id: string;
  name: string;
  url: string;
}

function toDataUrl(item: { mimeType?: string; data: string }): string {
  const data = item.data || '';
  if (data.startsWith('data:') || data.startsWith('blob:') || /^https?:\/\//.test(data)) return data;
  return `data:${item.mimeType || 'image/png'};base64,${data}`;
}

/* =========================================================
   SUB-COMPONENTS
   ========================================================= */

/* =========================================================
   SAMPLE IMAGE GENERATOR — creates abstract art for demo
   ========================================================= */
function generateSampleImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 450;
  const ctx = canvas.getContext('2d')!;

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 300);
  skyGrad.addColorStop(0, '#1a1a4e');
  skyGrad.addColorStop(0.5, '#4a2c6e');
  skyGrad.addColorStop(1, '#e8735a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 600, 300);

  // Sun
  ctx.beginPath();
  ctx.arc(300, 220, 60, 0, Math.PI * 2);
  ctx.fillStyle = '#ffcc44';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(300, 220, 80, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 200, 60, 0.3)';
  ctx.fill();

  // Mountains
  ctx.fillStyle = '#2d1b4e';
  ctx.beginPath();
  ctx.moveTo(0, 300);
  ctx.lineTo(100, 180);
  ctx.lineTo(200, 250);
  ctx.lineTo(300, 150);
  ctx.lineTo(400, 230);
  ctx.lineTo(500, 170);
  ctx.lineTo(600, 260);
  ctx.lineTo(600, 300);
  ctx.fill();

  // Ground
  const groundGrad = ctx.createLinearGradient(0, 300, 0, 450);
  groundGrad.addColorStop(0, '#1a3a2a');
  groundGrad.addColorStop(1, '#0d1f15');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, 300, 600, 150);

  // Trees (triangles)
  for (let i = 0; i < 8; i++) {
    const x = 40 + i * 75;
    const baseY = 310 + Math.random() * 20;
    const treeH = 40 + Math.random() * 40;
    ctx.fillStyle = `hsl(${140 + Math.random() * 30}, ${40 + Math.random() * 20}%, ${15 + Math.random() * 10}%)`;
    ctx.beginPath();
    ctx.moveTo(x, baseY - treeH);
    ctx.lineTo(x - 15, baseY);
    ctx.lineTo(x + 15, baseY);
    ctx.fill();
  }

  // Stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 600;
    const y = Math.random() * 150;
    const r = Math.random() * 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.globalAlpha = 0.3 + Math.random() * 0.7;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  return canvas.toDataURL('image/png');
}

function EmptyState({
  onUpload,
  onDemo,
  onPickSession,
  sessionCount = 0,
}: {
  onUpload: (file: File) => Promise<void>;
  onDemo: () => void;
  onPickSession?: () => void;
  sessionCount?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div
        className={cn(
          "flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-16 transition-all cursor-pointer max-w-lg w-full",
          dragOver
            ? "border-indigo-500 bg-indigo-500/10 scale-105"
            : "border-neutral-700 bg-neutral-800/30 hover:border-neutral-500 hover:bg-neutral-800/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file?.type.startsWith('image/')) onUpload(file);
        }}
        onClick={() => fileRef.current?.click()}
      >
        <input
          type="file"
          ref={fileRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
        />
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30">
            <Wand2 className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce shadow-lg">
            <Sparkles className="w-4 h-4 text-yellow-900" />
          </div>
        </div>
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Magic Layers
        </h2>
        <p className="text-neutral-400 text-center mb-8 leading-relaxed max-w-sm">
          Upload an image and AI color segmentation will automatically
          separate it into distinct component layers
        </p>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl font-semibold transition-all active:scale-95 shadow-xl shadow-indigo-500/20">
            <Upload className="w-5 h-5" />
            <span>Upload Image</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onDemo(); }}
            className="flex items-center gap-2 px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-sm font-medium transition-all border border-neutral-700">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>Try Demo Image</span>
          </button>
          {onPickSession && sessionCount > 0 && (
            <button onClick={(e) => { e.stopPropagation(); onPickSession(); }}
              className="flex items-center gap-2 px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-sm font-medium transition-all border border-neutral-700">
              <FolderOpen className="w-4 h-4 text-indigo-400" />
              <span>From Session ({sessionCount})</span>
            </button>
          )}
        </div>
        <p className="text-xs text-neutral-600 mt-5">JPG, PNG, WebP — or drag & drop</p>
      </div>
    </div>
  );
}

function ProcessingOverlay({ progress }: { progress: number }) {
  const messages = [
    'Loading image...',
    'Analyzing color palette...',
    'Running K-means clustering...',
    'Identifying components...',
    'Generating layer masks...',
    'Almost done...',
  ];
  const msgIndex = Math.min(
    Math.floor(progress / (100 / messages.length)),
    messages.length - 1
  );

  return (
    <div className="absolute inset-0 bg-neutral-900/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-8">
      <div className="relative w-28 h-28 mb-8">
        <div className="absolute inset-0 border-[3px] border-indigo-500/20 rounded-full" />
        <div
          className="absolute inset-0 border-[3px] border-transparent border-t-indigo-500 border-r-purple-500 rounded-full animate-spin"
          style={{ animationDuration: '1s' }}
        />
        <div className="absolute inset-2 border-[3px] border-transparent border-b-pink-500 rounded-full animate-spin"
          style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
      <p className="text-xl font-semibold mb-2">Separating Components</p>
      <p className="text-neutral-500 text-sm mb-6">{messages[msgIndex]}</p>
      <div className="w-72 h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function LayerItem({
  layer,
  isActive,
  onSelect,
  onToggle,
  onMove,
  onDuplicate,
  isFirst,
  isLast,
}: {
  layer: ImageLayer;
  isActive: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onMove: (dir: 'up' | 'down') => void;
  onDuplicate: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-all",
        isActive
          ? "bg-indigo-600/15 border-indigo-500/50 shadow-md shadow-indigo-500/10"
          : "bg-neutral-800/40 border-neutral-800 hover:bg-neutral-800/70 hover:border-neutral-700"
      )}
      onClick={onSelect}
    >
      <div className="w-11 h-11 rounded-lg border border-neutral-700 flex-shrink-0 checkerboard overflow-hidden relative">
        <img src={layer.dataUrl} alt={layer.name} className="w-full h-full object-contain" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          isActive ? "text-indigo-300" : "text-neutral-200"
        )}>
          {layer.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="w-2.5 h-2.5 rounded-full border border-neutral-600"
            style={{ backgroundColor: layer.colorHex }} />
          <span className="text-[11px] text-neutral-500">
            {layer.percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onMove('up'); }}
          disabled={isFirst}
          className="p-0.5 hover:bg-neutral-700 rounded disabled:opacity-30">
          <ChevronUp className="w-3 h-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onMove('down'); }}
          disabled={isLast}
          className="p-0.5 hover:bg-neutral-700 rounded disabled:opacity-30">
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        className="p-1.5 rounded-lg text-neutral-600 hover:text-indigo-400 hover:bg-neutral-700 opacity-0 group-hover:opacity-100 transition-all"
        title="Duplicate">
        <Copy className="w-3.5 h-3.5" />
      </button>

      <button onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={cn(
          "p-1.5 rounded-lg transition-colors",
          layer.visible
            ? "text-neutral-400 hover:text-white"
            : "text-neutral-700"
        )}>
        {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ViewToggle({
  mode,
  setMode,
}: {
  mode: 'layers' | 'explode' | 'grid' | 'original' | 'compare';
  setMode: (m: 'layers' | 'explode' | 'grid' | 'original' | 'compare') => void;
}) {
  const options: {
    key: 'layers' | 'explode' | 'grid' | 'original' | 'compare';
    label: string;
    icon: React.ReactNode;
  }[] = [
    { key: 'layers', label: 'Stacked', icon: <Layers className="w-3.5 h-3.5" /> },
    { key: 'explode', label: 'Explode', icon: <Split className="w-3.5 h-3.5" /> },
    { key: 'compare', label: 'Compare', icon: <Contrast className="w-3.5 h-3.5" /> },
    { key: 'grid', label: 'Grid', icon: <Grid3X3 className="w-3.5 h-3.5" /> },
    { key: 'original', label: 'Original', icon: <ImageIcon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex items-center bg-neutral-800 rounded-lg p-1 gap-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => setMode(o.key)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            mode === o.key
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-neutral-400 hover:text-white hover:bg-neutral-700"
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ClusterSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3 bg-neutral-800/50 rounded-lg px-3 py-1.5 border border-neutral-700/50">
      <Zap className="w-3.5 h-3.5 text-yellow-400" />
      <span className="text-xs text-neutral-400 whitespace-nowrap">Clusters</span>
      <input
        type="range" min="2" max="16" step="1" value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-20 accent-indigo-500"
      />
      <span className="text-xs font-bold text-indigo-400 w-5 text-right">{value}</span>
    </div>
  );
}

/* =========================================================
   MAIN APP
   ========================================================= */

export default function MagicLayers({ onBack, activeSession, onSaveArtifact }: MagicLayersProps) {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [layers, setLayers] = useState<ImageLayer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [numClusters, setNumClusters] = useState(6);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'layers' | 'explode' | 'grid' | 'original' | 'compare'>('layers');
  const [showAllLayers, setShowAllLayers] = useState(true);
  const [explodeAmount, setExplodeAmount] = useState(50);
  const [comparePosition, setComparePosition] = useState(50);
  const [isDraggingCompare, setIsDraggingCompare] = useState(false);
  const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number }>({ w: 700, h: 500 });
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const compareRef = useRef<HTMLDivElement>(null);

  const sessionImages = useMemo<SessionImage[]>(() => {
    const items = activeSession?.mediaItems || [];
    return items
      .filter((item: any) => item.type === 'image' || item.mimeType?.startsWith('image/'))
      .map((item: any) => ({ id: item.id, name: item.name, url: toDataUrl(item) }));
  }, [activeSession]);

  /** Shared pipeline: any resolved image URL → dimensions → segmentation. */
  const processSource = useCallback(
    (url: string) => {
      setOriginalUrl(url);
      const img = new Image();
      img.onload = async () => {
        imageRef.current = img;
        // Calculate display dimensions (max 800x600, maintain aspect ratio)
        const maxW = 800, maxH = 600;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > maxW) { const r = maxW / w; w = maxW; h = Math.round(h * r); }
        if (h > maxH) { const r = maxH / h; h = maxH; w = Math.round(w * r); }
        setImgDimensions({ w, h });
        setIsProcessing(true);
        setProgress(0);
        setLayers([]);
        setSelectedLayer(null);
        setShowAllLayers(true);
        setError(null);

        try {
          const result = await segmentImageIntoLayers(img, numClusters, (pct) => setProgress(pct));
          setLayers(result);
          setSelectedLayer(result[0]?.id ?? null);
        } catch (err) {
          console.error('Segmentation failed:', err);
          setError(err instanceof Error ? err.message : 'Segmentation failed.');
        }
        setIsProcessing(false);
      };
      img.onerror = () => {
        setError('That image could not be loaded.');
        setIsProcessing(false);
      };
      img.src = url;
    },
    [numClusters],
  );

  const handleDemo = useCallback(() => {
    processSource(generateSampleImage());
  }, [processSource]);

  const handleFile = useCallback(
    async (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => processSource(e.target?.result as string);
      reader.onerror = () => setError('That file could not be read.');
      reader.readAsDataURL(file);
    },
    [processSource],
  );

  const resegment = useCallback(async () => {
    if (!imageRef.current) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    try {
      const result = await segmentImageIntoLayers(imageRef.current, numClusters, (pct) => setProgress(pct));
      setLayers(result);
      setSelectedLayer(result[0]?.id ?? null);
    } catch (err) {
      console.error('Resegmentation failed:', err);
      setError(err instanceof Error ? err.message : 'Segmentation failed.');
    }
    setIsProcessing(false);
  }, [numClusters]);

  const toggleLayerVisibility = (id: string) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));

  const moveLayer = (id: string, dir: 'up' | 'down') => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  };

  const duplicateLayer = (id: string) => {
    setLayers((prev) => {
      const layer = prev.find((l) => l.id === id);
      if (!layer) return prev;
      const newId = `layer-${Date.now()}`;
      const newLayer = { ...layer, id: newId, name: `${layer.name} copy` };
      const idx = prev.findIndex((l) => l.id === id);
      const copy = [...prev];
      copy.splice(idx + 1, 0, newLayer);
      return copy;
    });
  };

  const exportLayer = (layer: ImageLayer) => {
    const a = document.createElement('a');
    a.href = layer.dataUrl;
    a.download = `${layer.name}.png`;
    a.click();
  };

  const exportAllLayers = () => { layers.forEach((l) => exportLayer(l)); };

  /** Push a layer (or the full composite) into the active workspace session. */
  const saveToSession = (layer: ImageLayer) => {
    if (!onSaveArtifact) return;
    onSaveArtifact({
      id: Math.random().toString(36).slice(2, 10),
      name: `${layer.name}.png`,
      mimeType: 'image/png',
      data: layer.dataUrl.includes(',') ? layer.dataUrl.split(',')[1] : layer.dataUrl,
      type: 'image',
    });
  };

  const selectedData = layers.find((l) => l.id === selectedLayer);

  // Compare slider drag
  React.useEffect(() => {
    if (!isDraggingCompare) return;
    const onMove = (e: MouseEvent) => {
      if (!compareRef.current) return;
      const rect = compareRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      setComparePosition(Math.max(0, Math.min(100, x)));
    };
    const onUp = () => setIsDraggingCompare(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDraggingCompare]);

  /* ---------- Canvas rendering helpers ---------- */

  // Explode mode: position layers in a circle
  const getExplodeTransform = (index: number, total: number, amount: number) => {
    if (total <= 1) return { x: 0, y: 0 };
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    const radius = (amount / 100) * 180;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-neutral-900 text-neutral-100 overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-950/60 backdrop-blur-md z-30 shrink-0 gap-3">
        <div className="flex items-center gap-3 shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-neutral-700 text-[11px] font-bold text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
              title="Back to Media Suite"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Media Suite
            </button>
          )}
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight whitespace-nowrap">
            Magic<span className="text-indigo-400">Layers</span>
          </h1>
        </div>

        {originalUrl && (
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <span className="text-xs text-neutral-500 font-mono bg-neutral-800/50 px-2 py-1 rounded border border-neutral-700/50">
              {layers.length} components
            </span>
            <ClusterSlider value={numClusters} onChange={setNumClusters} />
            <button
              onClick={resegment}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              Re-segment
            </button>
            <ViewToggle mode={viewMode} setMode={setViewMode} />
            <button
              onClick={exportAllLayers}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium text-sm transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Download className="w-4 h-4" />
              Export All
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ---------- Left Sidebar ---------- */}
        {originalUrl && layers.length > 0 && (
          <aside className="w-80 border-r border-neutral-800 bg-neutral-950/40 flex flex-col shrink-0">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-sm">Components</span>
              </div>
              <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">
                {layers.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
              <div
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-all",
                  showAllLayers
                    ? "bg-indigo-600/15 border-indigo-500/50"
                    : "bg-neutral-800/40 border-neutral-800 hover:bg-neutral-800/70"
                )}
                onClick={() => setShowAllLayers(true)}
              >
                <div className="w-11 h-11 rounded-lg border border-neutral-700 flex-shrink-0 overflow-hidden checkerboard">
                  <img src={originalUrl!} alt="Original" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-200">Original Composite</p>
                  <p className="text-[11px] text-neutral-500">All layers combined</p>
                </div>
              </div>

              {[...layers].reverse().map((layer, i, arr) => (
                <LayerItem
                  key={layer.id}
                  layer={layer}
                  isActive={selectedLayer === layer.id && !showAllLayers}
                  onSelect={() => { setSelectedLayer(layer.id); setShowAllLayers(false); }}
                  onToggle={() => toggleLayerVisibility(layer.id)}
                  onMove={(dir) => moveLayer(layer.id, dir === 'up' ? 'up' : 'down')}
                  onDuplicate={() => duplicateLayer(layer.id)}
                  isFirst={i === arr.length - 1}
                  isLast={i === 0}
                />
              ))}
            </div>

            {/* Color palette */}
            <div className="border-t border-neutral-800 p-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
                Color Palette
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {layers.map((l) => (
                  <div
                    key={l.id}
                    className="w-8 h-8 rounded-lg border border-neutral-700 cursor-pointer transition-transform hover:scale-110 ring-2 ring-transparent hover:ring-indigo-500"
                    style={{ backgroundColor: l.colorHex }}
                    title={`${l.name}: ${l.colorHex}`}
                    onClick={() => { setSelectedLayer(l.id); setShowAllLayers(false); }}
                  />
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* ---------- Main Canvas ---------- */}
        <main className="flex-1 relative bg-[#050505] overflow-auto flex items-center justify-center p-8">
          {!originalUrl ? (
            <EmptyState
              onUpload={handleFile}
              onDemo={handleDemo}
              onPickSession={() => setSessionPickerOpen(true)}
              sessionCount={sessionImages.length}
            />
          ) : isProcessing ? (
            <div className="relative rounded-xl border border-neutral-800 overflow-hidden bg-neutral-900 flex items-center justify-center"
              style={{ width: imgDimensions.w, height: imgDimensions.h }}>
              <img src={originalUrl} alt="" className="max-w-full max-h-full object-contain opacity-30 blur-sm" />
              <ProcessingOverlay progress={progress} />
            </div>
          ) : (
            <div className="relative">
              {/* Canvas */}
              <div className="checkerboard rounded-lg overflow-hidden border border-neutral-800 shadow-2xl"
                style={{ width: imgDimensions.w, height: imgDimensions.h }}
              >
                {viewMode === 'original' ? (
                  <img src={originalUrl} alt="Original" className="w-full h-full object-contain" />

                ) : viewMode === 'compare' ? (
                  <div
                    ref={compareRef}
                    className="relative w-full h-full cursor-col-resize select-none"
                    onMouseDown={(e) => {
                      setIsDraggingCompare(true);
                      const rect = compareRef.current!.getBoundingClientRect();
                      setComparePosition(((e.clientX - rect.left) / rect.width) * 100);
                    }}
                  >
                    {/* Background = original */}
                    <img src={originalUrl} alt="" className="absolute inset-0 w-full h-full object-contain" />
                    {/* Foreground = segmented composite, clipped */}
                    <div className="absolute inset-0 overflow-hidden"
                      style={{ clipPath: `inset(0 0 0 ${comparePosition}%)` }}>
                      <div className="relative w-full h-full">
                        {layers.filter((l) => l.visible).map((l) => (
                          <img key={l.id} src={l.dataUrl} alt=""
                            className="absolute inset-0 w-full h-full object-contain" />
                        ))}
                      </div>
                    </div>
                    {/* Divider line */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
                      style={{ left: `${comparePosition}%` }} />
                    {/* Handle */}
                    <div className="absolute top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center z-20"
                      style={{ left: `calc(${comparePosition}% - 20px)` }}>
                      <Contrast className="w-5 h-5 text-neutral-800" />
                    </div>
                    {/* Labels */}
                    <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur rounded-full text-xs font-medium">
                      Original
                    </div>
                    <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur rounded-full text-xs font-medium">
                      Segmented
                    </div>
                  </div>

                ) : viewMode === 'grid' ? (
                  <div className="w-full h-full grid gap-1 p-1 bg-neutral-900 overflow-auto"
                    style={{
                      gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(layers.length))}, 1fr)`,
                      gridTemplateRows: `repeat(${Math.ceil(layers.length / Math.ceil(Math.sqrt(layers.length)))}, 1fr)`,
                    }}>
                    {layers.map((l) => (
                      <div key={l.id}
                        className="relative rounded-lg overflow-hidden border border-neutral-800 checkerboard flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-colors"
                        onClick={() => { setSelectedLayer(l.id); setShowAllLayers(false); }}>
                        <img src={l.dataUrl} alt={l.name} className="max-w-full max-h-full object-contain" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 px-1.5 py-0.5 text-[10px] font-medium truncate">
                          {l.name} ({l.percentage.toFixed(1)}%)
                        </div>
                      </div>
                    ))}
                  </div>

                ) : viewMode === 'explode' ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* Ghost original */}
                    <img src={originalUrl} alt=""
                      className="absolute w-[80%] h-[80%] object-contain opacity-10" />
                    {/* Exploded layers */}
                    {layers.filter((l) => l.visible).map((layer, idx, arr) => {
                      const transform = getExplodeTransform(idx, arr.length, explodeAmount);
                      const isSel = selectedLayer === layer.id;
                      return (
                        <img
                          key={layer.id}
                          src={layer.dataUrl}
                          alt={layer.name}
                          className={cn(
                            "absolute transition-all duration-500 ease-out cursor-pointer",
                            isSel ? "z-10 ring-2 ring-indigo-400 ring-offset-2 ring-offset-transparent" : "hover:z-10"
                          )}
                          style={{
                            width: '80%',
                            height: '80%',
                            objectFit: 'contain',
                            transform: `translate(${transform.x}px, ${transform.y}px) scale(${isSel ? 1.1 : 1})`,
                            opacity: isSel ? 1 : 0.85,
                          }}
                          onClick={() => { setSelectedLayer(layer.id); }}
                        />
                      );
                    })}
                  </div>

                ) : (
                  /* ---- Stacked layers view ---- */
                  <div className="relative w-full h-full flex items-center justify-center">
                    {showAllLayers
                      ? layers.filter((l) => l.visible).map((l) => (
                        <img key={l.id} src={l.dataUrl} alt={l.name}
                          className="absolute w-full h-full object-contain" />
                      ))
                      : selectedData && (
                        <>
                          <img src={originalUrl} alt=""
                            className="absolute w-full h-full object-contain opacity-15" />
                          <img src={selectedData.dataUrl} alt={selectedData.name}
                            className="relative w-full h-full object-contain" />
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full border border-white/20"
                              style={{ backgroundColor: selectedData.colorHex }} />
                            {selectedData.name}
                          </div>
                        </>
                      )}
                  </div>
                )}
              </div>

              {/* Explode slider */}
              {viewMode === 'explode' && (
                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-neutral-800/90 backdrop-blur px-4 py-2 rounded-full border border-neutral-700">
                  <Split className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs text-neutral-400">Spread</span>
                  <input type="range" min="0" max="100" value={explodeAmount}
                    onChange={(e) => setExplodeAmount(parseInt(e.target.value))}
                    className="w-32 accent-indigo-500" />
                  <span className="text-xs font-bold text-indigo-400 w-8">{explodeAmount}%</span>
                </div>
              )}

              {/* View mode hints */}
              {viewMode === 'compare' && !isDraggingCompare && (
                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 text-xs text-neutral-500 flex items-center gap-2 whitespace-nowrap">
                  <Contrast className="w-3 h-3" />
                  Drag the slider to compare original vs segmented
                </div>
              )}
              {viewMode === 'grid' && (
                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 text-xs text-neutral-500 flex items-center gap-2 whitespace-nowrap">
                  <Grid3X3 className="w-3 h-3" />
                  Click any component to inspect it
                </div>
              )}

              {/* Floating actions */}
              {viewMode === 'layers' && (
                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  {selectedData && !showAllLayers && (
                    <>
                      <button onClick={() => exportLayer(selectedData)}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full border border-neutral-700 text-sm transition-colors whitespace-nowrap">
                        <Download className="w-4 h-4" />
                        Download Layer
                      </button>
                      {onSaveArtifact && (
                        <button onClick={() => saveToSession(selectedData)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-full border border-indigo-500/40 text-sm transition-colors whitespace-nowrap"
                          title="Save this layer to the active workspace session">
                          <Save className="w-4 h-4" />
                          To Session
                        </button>
                      )}
                    </>
                  )}
                  <button onClick={() => { setShowAllLayers(true); }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-colors whitespace-nowrap",
                      showAllLayers
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700"
                    )}>
                    <Layers className="w-4 h-4" />
                    {showAllLayers ? 'All Layers' : 'Show All'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* New image / session buttons */}
          {originalUrl && !isProcessing && (
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              {sessionImages.length > 0 && (
                <button onClick={() => setSessionPickerOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-neutral-800/80 backdrop-blur hover:bg-neutral-700/80 rounded-lg border border-neutral-700 text-sm transition-colors">
                  <FolderOpen className="w-4 h-4 text-indigo-400" />
                  From Session
                </button>
              )}
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-neutral-800/80 backdrop-blur hover:bg-neutral-700/80 rounded-lg border border-neutral-700 text-sm transition-colors">
                <Upload className="w-4 h-4" />
                New Image
              </button>
            </div>
          )}
          <input
            type="file" ref={fileRef} className="hidden" accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setLayers([]); setSelectedLayer(null); handleFile(f); }
              e.target.value = '';
            }}
          />

          {error && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs z-20">
              {error}
            </div>
          )}
        </main>

        {/* ---------- Right Sidebar ---------- */}
        {selectedData && !showAllLayers && viewMode === 'layers' && (
          <aside className="w-72 border-l border-neutral-800 bg-neutral-950/40 flex flex-col shrink-0 overflow-y-auto">
            <div className="p-4 border-b border-neutral-800 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-sm">Layer Details</span>
            </div>

            <div className="p-4 flex flex-col gap-6">
              <div className="checkerboard rounded-xl border border-neutral-800 overflow-hidden">
                <img src={selectedData.dataUrl} alt={selectedData.name} className="w-full object-contain" />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Name</label>
                  <p className="text-sm font-medium mt-0.5">{selectedData.name}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Dominant Color</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-6 h-6 rounded-lg border border-neutral-700"
                        style={{ backgroundColor: selectedData.colorHex }} />
                      <code className="text-sm font-mono text-neutral-300">{selectedData.colorHex}</code>
                    </div>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Coverage</label>
                    <p className="text-sm font-medium mt-0.5">{selectedData.percentage.toFixed(1)}%</p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">RGB</label>
                  <div className="flex gap-2 mt-1">
                    {[
                      { label: 'R', value: selectedData.color[0] },
                      { label: 'G', value: selectedData.color[1] },
                      { label: 'B', value: selectedData.color[2] },
                    ].map((c) => (
                      <div key={c.label} className="flex-1 bg-neutral-800 rounded-lg p-2 text-center">
                        <span className="text-[10px] text-neutral-500">{c.label}</span>
                        <p className="text-sm font-mono font-bold">{c.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="h-px bg-neutral-800" />

              <div className="flex gap-2">
                <button onClick={() => exportLayer(selectedData)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium text-sm transition-colors shadow-lg shadow-indigo-500/20">
                  <Download className="w-4 h-4" />
                  Export PNG
                </button>
                <button onClick={() => { setShowAllLayers(true); }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 text-sm transition-colors"
                  title="Show all layers">
                  <Eye className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              {onSaveArtifact && (
                <button onClick={() => saveToSession(selectedData)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-indigo-500/40 text-indigo-300 font-medium text-sm transition-colors">
                  <Save className="w-4 h-4" />
                  Save Layer to Session
                </button>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ---------- Session image picker ---------- */}
      {sessionPickerOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[84vh] flex flex-col rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl overflow-hidden">
            <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold">Load from session</h3>
                  <p className="text-[10px] text-neutral-500">
                    Images from the active workspace session
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSessionPickerOpen(false)}
                className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              {sessionImages.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-10">
                  No images in the active session yet.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {sessionImages.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSessionPickerOpen(false);
                        processSource(item.url);
                      }}
                      className="relative rounded-lg overflow-hidden border border-neutral-700 hover:border-indigo-500 transition-colors group"
                    >
                      <img src={item.url} alt={item.name} className="h-24 w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/70 text-[9px] text-neutral-200 px-1 py-0.5 truncate text-left">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
