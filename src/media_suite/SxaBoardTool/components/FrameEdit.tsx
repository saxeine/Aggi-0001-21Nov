import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Pencil, Droplet, Eraser, Square, Circle, Type, Minus, Crop,
  Undo2, Redo2, Trash2, Download, Check, Bold, Italic,
  Move, Pipette, Image as ImageIcon, ArrowUpRight, RotateCcw, Plus,
  MousePointer, ChevronLeft, ChevronRight, Save,
  MessageSquare, Cloud, FileText
} from 'lucide-react';
import { cn } from '../utils/cn';

export interface FrameEditProps {
  imageUrl: string;
  width: number;
  height: number;
  onSave: (dataUrl: string) => void;
  onApply?: (dataUrl: string) => void;
  onSaveAsNew?: (dataUrl: string) => void;
  onClose: () => void;
  index?: number;
  totalFrames?: number;
  onNavigate?: (direction: 'prev' | 'next', currentFrameDataUrl: string) => void;
}

type ShapeTool = 'line' | 'arrow' | 'rect' | 'ellipse';
type Tool = 'select' | 'pen' | 'eraser' | ShapeTool | 'text' | 'crop' | 'move' | 'eyedropper' | 'blur';

interface TextLayer {
  id: string;
  text: string;
  x: number; // relative to canvas.width
  y: number; // relative to canvas.height
  fontSize: number;
  fontFamily: string;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  hasOutline: boolean;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  dialogueType?: 'speech' | 'thought' | 'narration';
  tailLength?: 'short' | 'medium' | 'long';
}

interface ImageLayer {
  id: string;
  src: string; // dataUrl
  x: number; // relative to canvas.width (center x)
  y: number; // relative to canvas.height (center y)
  width: number;
  height: number;
  rotation?: number;
}

const FONT_FAMILIES = [
  'Inter, system-ui, sans-serif',
  'Impact, sans-serif',
  'Georgia, serif',
  'Courier New, monospace',
  'Arial, sans-serif',
  'Comic Sans MS, cursive',
];

const COLORS = [
  '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#000000',
];

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function FrameEdit({ imageUrl, width, height, onSave, onApply, onSaveAsNew, onClose, index, totalFrames, onNavigate }: FrameEditProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [applySuccess, setApplySuccess] = useState(false);
  const [saveAsNewSuccess, setSaveAsNewSuccess] = useState(false);
  const [tool, setTool] = useState<Tool>('select');
  const [activeShapeTool, setActiveShapeTool] = useState<ShapeTool>('line');
  const [showShapesFlyout, setShowShapesFlyout] = useState(false);
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(10);
  const [fill, setFill] = useState(false);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStartImageData, setPanStartImageData] = useState<ImageData | null>(null);
  
  // History now tracks the drawing canvas data, text layers, and image layers
  const [history, setHistory] = useState<{ imageData: ImageData; textLayers: TextLayer[]; imageLayers: ImageLayer[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  // Dynamic Text Layer State
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingTextInPlace, setEditingTextInPlace] = useState<string | null>(null);
  const [inPlaceInputValue, setInPlaceInputValue] = useState('');

  // Resizing text states
  const [isResizingText, setIsResizingText] = useState(false);
  const [resizeStartSize, setResizeStartSize] = useState(28);
  const [resizeStartPos, setResizeStartPos] = useState<{ x: number; y: number } | null>(null);
  
  const [textTransformMode, setTextTransformMode] = useState<'width' | 'height' | 'rotate' | null>(null);
  const [transformStartProps, setTransformStartProps] = useState({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 });

  // Dynamic Image Layer (Collage) State
  const [imageLayers, setImageLayers] = useState<ImageLayer[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragImageOffset, setDragImageOffset] = useState({ x: 0, y: 0 });
  const [isResizingImage, setIsResizingImage] = useState(false);
  const [resizeImageStartSize, setResizeImageStartSize] = useState({ w: 100, h: 100 });
  const [resizeImageStartPos, setResizeImageStartPos] = useState<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const justAddedTextRef = useRef(false);

  // FX Filter State
  const [activeFilter, setActiveFilter] = useState<string>('none');
  const [blurStrength, setBlurStrength] = useState<number>(10);
  const [blurredCache, setBlurredCache] = useState<HTMLCanvasElement | null>(null);
  const [lastBlurPos, setLastBlurPos] = useState<{ x: number, y: number } | null>(null);

  // Local state for default text settings & default input on toolbar
  const [textValue, setTextValue] = useState('Storyboard Text');
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0]);
  const [fontSize, setFontSize] = useState(28);
  const [fontBold, setFontBold] = useState(true);
  const [fontItalic, setFontItalic] = useState(false);
  const [fontOutline, setFontOutline] = useState(true);

  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  // Responsive display dimensions
  const displayScale = Math.min(1, Math.min(780 / width, 440 / height));
  const displayW = Math.round(width * displayScale);
  const displayH = Math.round(height * displayScale);

  const pushHistory = useCallback((customTextLayers?: TextLayer[], customImageLayers?: ImageLayer[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const textLayersToSave = customTextLayers !== undefined ? customTextLayers : textLayers;
    const imageLayersToSave = customImageLayers !== undefined ? customImageLayers : imageLayers;
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      next.push({ imageData: data, textLayers: textLayersToSave, imageLayers: imageLayersToSave });
      if (next.length > 40) next.shift();
      return next;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 39));
  }, [historyIndex, textLayers, imageLayers]);

  const restoreHistory = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !history[index]) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(history[index].imageData, 0, 0);
    setTextLayers(history[index].textLayers || []);
    setImageLayers(history[index].imageLayers || []);
    setHistoryIndex(index);
  }, [history]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) restoreHistory(historyIndex - 1);
  }, [historyIndex, restoreHistory]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) restoreHistory(historyIndex + 1);
  }, [historyIndex, history.length, restoreHistory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (imageUrl) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        const data = ctx.getImageData(0, 0, width, height);
        setHistory([{ imageData: data, textLayers: [], imageLayers: [] }]);
        setHistoryIndex(0);
      };
      img.onerror = () => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
        const data = ctx.getImageData(0, 0, width, height);
        setHistory([{ imageData: data, textLayers: [], imageLayers: [] }]);
        setHistoryIndex(0);
      };
      img.src = imageUrl;
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      const data = ctx.getImageData(0, 0, width, height);
      setHistory([{ imageData: data, textLayers: [], imageLayers: [] }]);
      setHistoryIndex(0);
    }
  }, [imageUrl, width, height]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.width = width;
    overlay.height = height;
  }, [width, height]);

  useEffect(() => {
    if (tool === 'crop' && cropRect) {
      drawPersistentCrop();
    } else {
      clearOverlay();
    }
  }, [tool, cropRect]);

  // Sync selected text layer settings to the toolbar
  useEffect(() => {
    if (selectedTextId) {
      const activeText = textLayers.find(l => l.id === selectedTextId);
      if (activeText) {
        setFontFamily(activeText.fontFamily);
        setFontSize(activeText.fontSize);
        setFontBold(activeText.isBold);
        setFontItalic(activeText.isItalic);
        setFontOutline(activeText.hasOutline);
        setColor(activeText.color);
      }
    }
  }, [selectedTextId, textLayers]);

  // Update selected text layer when settings change
  const updateSelectedTextProps = (patch: Partial<TextLayer>, shouldPushHistory = false) => {
    if (!selectedTextId) return;
    const nextLayers = textLayers.map(l => l.id === selectedTextId ? { ...l, ...patch } : l);
    setTextLayers(nextLayers);
    if (shouldPushHistory) {
      pushHistory(nextLayers);
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('changedTouches' in e && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const clearOverlay = () => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }) => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const headLength = Math.max(12, lineWidth * 3);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle - Math.PI / 6),
      to.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      to.x - headLength * Math.cos(angle + Math.PI / 6),
      to.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  };

  const drawShapePreview = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    } else if (tool === 'arrow') {
      drawArrow(ctx, from, to);
    } else if (tool === 'rect') {
      const w = to.x - from.x;
      const h = to.y - from.y;
      if (fill) ctx.fillRect(from.x, from.y, w, h);
      else ctx.strokeRect(from.x, from.y, w, h);
    } else if (tool === 'ellipse') {
      const rx = Math.abs(to.x - from.x) / 2;
      const ry = Math.abs(to.y - from.y) / 2;
      const cx = (from.x + to.x) / 2;
      const cy = (from.y + to.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (fill) ctx.fill();
      else ctx.stroke();
    } else if (tool === 'crop') {
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      const w = to.x - from.x;
      const h = to.y - from.y;
      ctx.strokeRect(from.x, from.y, w, h);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, overlay.width, Math.min(from.y, to.y));
      ctx.fillRect(0, Math.max(from.y, to.y), overlay.width, overlay.height - Math.max(from.y, to.y));
      ctx.fillRect(0, Math.min(from.y, to.y), Math.min(from.x, to.x), Math.abs(h));
      ctx.fillRect(Math.max(from.x, to.x), Math.min(from.y, to.y), overlay.width - Math.max(from.x, to.x), Math.abs(h));
      ctx.setLineDash([]);
    }
  };

  const drawPersistentCrop = () => {
    if (!cropRect) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const { x, y, w, h } = cropRect;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, overlay.width, y);
    ctx.fillRect(0, y + h, overlay.width, overlay.height - y - h);
    ctx.fillRect(0, y, x, h);
    ctx.fillRect(x + w, y, overlay.width - x - w, h);

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    ctx.fillStyle = '#c084fc';
    const s = 8;
    ctx.fillRect(x - s/2, y - s/2, s, s);
    ctx.fillRect(x + w - s/2, y - s/2, s, s);
    ctx.fillRect(x - s/2, y + h - s/2, s, s);
    ctx.fillRect(x + w - s/2, y + h - s/2, s, s);
  };

  const commitShape = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'crop') {
      const x = Math.min(from.x, to.x);
      const y = Math.min(from.y, to.y);
      const w = Math.abs(to.x - from.x);
      const h = Math.abs(to.y - from.y);
      if (w > 10 && h > 10) {
        setCropRect({ x, y, w, h });
        setIsCropping(true);
      }
      return;
    }

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    } else if (tool === 'arrow') {
      drawArrow(ctx, from, to);
    } else if (tool === 'rect') {
      const w = to.x - from.x;
      const h = to.y - from.y;
      if (fill) ctx.fillRect(from.x, from.y, w, h);
      else ctx.strokeRect(from.x, from.y, w, h);
    } else if (tool === 'ellipse') {
      const rx = Math.abs(to.x - from.x) / 2;
      const ry = Math.abs(to.y - from.y) / 2;
      const cx = (from.x + to.x) / 2;
      const cy = (from.y + to.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (fill) ctx.fill();
      else ctx.stroke();
    }

    clearOverlay();
    pushHistory();
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);

    if (tool === 'eyedropper') {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const pixel = ctx.getImageData(Math.floor(pos.x), Math.floor(pos.y), 1, 1).data;
      if (pixel[3] === 0) {
        setColor('#ffffff');
      } else {
        const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
        setColor(hex);
      }
      setTool('pen');
      return;
    }

    if (tool === 'text') {
      e.preventDefault();
      const newLayer: TextLayer = {
        id: generateId(),
        text: textValue || 'Storyboard Text',
        x: pos.x,
        y: pos.y,
        fontSize,
        fontFamily,
        color,
        isBold: fontBold,
        isItalic: fontItalic,
        hasOutline: fontOutline
      };
      const nextLayers = [...textLayers, newLayer];
      setTextLayers(nextLayers);
      setSelectedTextId(newLayer.id);
      justAddedTextRef.current = true;
      setTool('select');
      pushHistory(nextLayers);
      return;
    }

    if (tool === 'move') {
      e.preventDefault();
      setIsPanning(true);
      setStartPos(pos);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          setPanStartImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
        }
      }
      return;
    }

    setIsDrawing(true);
    setStartPos(pos);

    if (tool === 'pen' || tool === 'eraser' || tool === 'blur') {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      if (tool === 'blur') {
        const blurCnv = document.createElement('canvas');
        blurCnv.width = canvas.width;
        blurCnv.height = canvas.height;
        const bCtx = blurCnv.getContext('2d');
        if (bCtx) {
          bCtx.filter = `blur(${blurStrength}px)`;
          bCtx.drawImage(canvas, 0, 0);
        }
        setBlurredCache(blurCnv);
        setLastBlurPos(pos);
      } else {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        if (tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
          ctx.lineWidth = lineWidth * 3.5;
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);

    if (tool === 'move' && isPanning && startPos && panStartImageData) {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const dx = Math.round(pos.x - startPos.x);
      const dy = Math.round(pos.y - startPos.y);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(panStartImageData, dx, dy);
      return;
    }

    if (!isDrawing || !startPos) return;

    if (tool === 'pen' || tool === 'eraser') {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'blur' && blurredCache && lastBlurPos) {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const dist = Math.hypot(pos.x - lastBlurPos.x, pos.y - lastBlurPos.y);
      const radius = lineWidth * 3.5;
      const steps = Math.max(1, Math.ceil(dist / (radius / 2)));
      for (let i = 0; i <= steps; i++) {
        const cx = lastBlurPos.x + (pos.x - lastBlurPos.x) * (i / steps);
        const cy = lastBlurPos.y + (pos.y - lastBlurPos.y) * (i / steps);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(blurredCache, 0, 0);
        ctx.restore();
      }
      setLastBlurPos(pos);
    } else if (['line', 'arrow', 'rect', 'ellipse', 'crop'].includes(tool)) {
      e.preventDefault();
      drawShapePreview(startPos, pos);
    }
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'move' && isPanning) {
      e.preventDefault();
      setIsPanning(false);
      setStartPos(null);
      setPanStartImageData(null);
      pushHistory();
      return;
    }

    if (!isDrawing || !startPos) return;
    e.preventDefault();
    const pos = getPos(e);

    if (tool === 'pen' || tool === 'eraser' || tool === 'blur') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.globalCompositeOperation = 'source-over';
      }
      if (tool === 'blur') {
        setBlurredCache(null);
        setLastBlurPos(null);
      }
      pushHistory();
    } else if (['line', 'arrow', 'rect', 'ellipse', 'crop'].includes(tool)) {
      commitShape(startPos, pos);
    }

    setIsDrawing(false);
    setStartPos(null);
  };

  const handleTextMouseDown = (e: React.MouseEvent, layer: TextLayer) => {
    e.stopPropagation();
    setSelectedTextId(layer.id);
    setIsDraggingText(true);
    setTool('select');

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    setDragOffset({
      x: clickX - layer.x,
      y: clickY - layer.y
    });
  };

  const handleTextTouchStart = (e: React.TouchEvent, layer: TextLayer) => {
    e.stopPropagation();
    setSelectedTextId(layer.id);
    setIsDraggingText(true);
    setTool('select');

    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const clickX = (touch.clientX - rect.left) * scaleX;
    const clickY = (touch.clientY - rect.top) * scaleY;

    setDragOffset({
      x: clickX - layer.x,
      y: clickY - layer.y
    });
  };

  const handleTextTransformMouseDown = (e: React.MouseEvent | React.TouchEvent, layer: TextLayer, mode: 'width' | 'height' | 'rotate') => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedTextId(layer.id);
    setTextTransformMode(mode);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    setResizeStartPos({ x: clientX * scaleX, y: clientY * scaleY });
    setTransformStartProps({
      x: layer.x,
      y: layer.y,
      scaleX: layer.scaleX || 1,
      scaleY: layer.scaleY || 1,
      rotation: layer.rotation || 0
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, layer: TextLayer) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedTextId(layer.id);
    setIsResizingText(true);
    setResizeStartSize(layer.fontSize);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    
    setResizeStartPos({
      x: e.clientX * scaleX,
      y: e.clientY * scaleY
    });
  };

  const handleResizeTouchStart = (e: React.TouchEvent, layer: TextLayer) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedTextId(layer.id);
    setIsResizingText(true);
    setResizeStartSize(layer.fontSize);
    
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    
    setResizeStartPos({
      x: touch.clientX * scaleX,
      y: touch.clientY * scaleY
    });
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingText || !selectedTextId) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      const currentX = (e.clientX - rect.left) * scaleX;
      const currentY = (e.clientY - rect.top) * scaleY;

      const newX = Math.round(currentX - dragOffset.x);
      const newY = Math.round(currentY - dragOffset.y);

      setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, x: newX, y: newY } : l));
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isDraggingText || !selectedTextId || e.touches.length === 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      const touch = e.touches[0];
      const currentX = (touch.clientX - rect.left) * scaleX;
      const currentY = (touch.clientY - rect.top) * scaleY;

      const newX = Math.round(currentX - dragOffset.x);
      const newY = Math.round(currentY - dragOffset.y);

      setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, x: newX, y: newY } : l));
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingText) {
        pushHistory();
      }
      setIsDraggingText(false);
    };

    if (isDraggingText) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalTouchMove);
      window.addEventListener('touchend', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDraggingText, selectedTextId, dragOffset, width, height, pushHistory]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (textTransformMode && selectedTextId && resizeStartPos) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;
        
        const currentX = e.clientX * scaleX;
        const currentY = e.clientY * scaleY;
        const dx = currentX - resizeStartPos.x;
        const dy = currentY - resizeStartPos.y;
        
        setTextLayers(prev => prev.map(l => {
          if (l.id === selectedTextId) {
            let nextScaleX = transformStartProps.scaleX;
            let nextScaleY = transformStartProps.scaleY;
            let nextRotation = transformStartProps.rotation;
            
            if (textTransformMode === 'width') {
              nextScaleX = Math.max(0.1, transformStartProps.scaleX + dx * 0.01);
            } else if (textTransformMode === 'height') {
              nextScaleY = Math.max(0.1, transformStartProps.scaleY + dy * 0.01);
            } else if (textTransformMode === 'rotate') {
              // calculate angle from center of text to mouse
              const centerX = transformStartProps.x / scaleX + rect.left;
              const centerY = transformStartProps.y / scaleY + rect.top;
              const startAngle = Math.atan2(resizeStartPos.y / scaleY + rect.top - centerY, resizeStartPos.x / scaleX + rect.left - centerX);
              const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
              nextRotation = transformStartProps.rotation + (currentAngle - startAngle) * 180 / Math.PI;
            }
            return { ...l, scaleX: nextScaleX, scaleY: nextScaleY, rotation: nextRotation };
          }
          return l;
        }));
        return;
      }
      if (!isResizingText || !selectedTextId || !resizeStartPos) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      const currentX = e.clientX * scaleX;
      const currentY = e.clientY * scaleY;

      const dx = currentX - resizeStartPos.x;
      const dy = currentY - resizeStartPos.y;
      
      const displacement = (dx + dy) / 2;
      const newSize = Math.max(10, Math.min(200, Math.round(resizeStartSize + displacement)));

      setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, fontSize: newSize } : l));
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (textTransformMode && selectedTextId && resizeStartPos && e.touches.length > 0) {
        const touch = e.touches[0];
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;
        
        const currentX = touch.clientX * scaleX;
        const currentY = touch.clientY * scaleY;
        const dx = currentX - resizeStartPos.x;
        const dy = currentY - resizeStartPos.y;
        
        setTextLayers(prev => prev.map(l => {
          if (l.id === selectedTextId) {
            let nextScaleX = transformStartProps.scaleX;
            let nextScaleY = transformStartProps.scaleY;
            let nextRotation = transformStartProps.rotation;
            
            if (textTransformMode === 'width') {
              nextScaleX = Math.max(0.1, transformStartProps.scaleX + dx * 0.01);
            } else if (textTransformMode === 'height') {
              nextScaleY = Math.max(0.1, transformStartProps.scaleY + dy * 0.01);
            } else if (textTransformMode === 'rotate') {
              const centerX = transformStartProps.x / scaleX + rect.left;
              const centerY = transformStartProps.y / scaleY + rect.top;
              const startAngle = Math.atan2(resizeStartPos.y / scaleY + rect.top - centerY, resizeStartPos.x / scaleX + rect.left - centerX);
              const currentAngle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX);
              nextRotation = transformStartProps.rotation + (currentAngle - startAngle) * 180 / Math.PI;
            }
            return { ...l, scaleX: nextScaleX, scaleY: nextScaleY, rotation: nextRotation };
          }
          return l;
        }));
        return;
      }
      if (!isResizingText || !selectedTextId || !resizeStartPos || e.touches.length === 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      const touch = e.touches[0];
      const currentX = touch.clientX * scaleX;
      const currentY = touch.clientY * scaleY;

      const dx = currentX - resizeStartPos.x;
      const dy = currentY - resizeStartPos.y;
      
      const displacement = (dx + dy) / 2;
      const newSize = Math.max(10, Math.min(200, Math.round(resizeStartSize + displacement)));

      setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, fontSize: newSize } : l));
    };

    const handleGlobalMouseUp = () => {
      if (isResizingText || textTransformMode) {
        pushHistory();
      }
      setIsResizingText(false);
      setTextTransformMode(null);
    };

    if (isResizingText) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalTouchMove);
      window.addEventListener('touchend', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isResizingText, selectedTextId, resizeStartPos, resizeStartSize, width, height, pushHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true');

      // Global Undo/Redo keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (isTyping) return;

      if (selectedTextId) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          const nextLayers = textLayers.filter(l => l.id !== selectedTextId);
          setTextLayers(nextLayers);
          setSelectedTextId(null);
          pushHistory(nextLayers, imageLayers);
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 2;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          const nextLayers = textLayers.map(l => l.id === selectedTextId ? { ...l, x: l.x + dx, y: l.y + dy } : l);
          setTextLayers(nextLayers);
        }
      }

      if (selectedImageId) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          const nextLayers = imageLayers.filter(l => l.id !== selectedImageId);
          setImageLayers(nextLayers);
          setSelectedImageId(null);
          pushHistory(textLayers, nextLayers);
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 2;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          const nextLayers = imageLayers.map(l => l.id === selectedImageId ? { ...l, x: l.x + dx, y: l.y + dy } : l);
          setImageLayers(nextLayers);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTextId, textLayers, selectedImageId, imageLayers, handleUndo, handleRedo, pushHistory]);

  const drawTextLayersToCtx = (ctx: CanvasRenderingContext2D) => {
    textLayers.forEach(layer => {
      ctx.save();
      ctx.translate(layer.x, layer.y);
      if (layer.rotation) {
        ctx.rotate(layer.rotation * Math.PI / 180);
      }
      ctx.scale(layer.scaleX || 1, layer.scaleY || 1);
      
      if (layer.dialogueType === 'speech') {
        const weight = 'bold';
        const style = 'normal';
        ctx.font = `${style} ${weight} ${layer.fontSize}px ${layer.fontFamily}`;
        const textWidth = ctx.measureText(layer.text).width;
        const paddingX = 24;
        const paddingY = 12;
        const bubbleW = textWidth + paddingX * 2;
        const bubbleH = layer.fontSize + paddingY * 2;
        const radius = bubbleH / 2;

        // Draw bubble body
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, radius);
        } else {
          ctx.rect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH);
        }
        ctx.fill();
        ctx.stroke();

        // Draw speech tail
        const tailH = layer.tailLength === 'short' ? 8 : layer.tailLength === 'long' ? 28 : 16;
        ctx.beginPath();
        const startX = -bubbleW / 4;
        const startY = bubbleH / 2;
        ctx.moveTo(startX, startY - 1);
        ctx.lineTo(startX + 16, startY - 1);
        ctx.lineTo(startX + 2, startY + tailH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw text
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(layer.text, 0, 0);

      } else if (layer.dialogueType === 'thought') {
        const weight = 'normal';
        const style = 'italic';
        ctx.font = `${style} ${weight} ${layer.fontSize}px ${layer.fontFamily}`;
        const textWidth = ctx.measureText(layer.text).width;
        const paddingX = 24;
        const paddingY = 10;
        const bubbleW = textWidth + paddingX * 2;
        const bubbleH = layer.fontSize + paddingY * 2;
        const radius = bubbleH / 2;

        // Outer Purple Border (thick stroke)
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, radius);
        } else {
          ctx.rect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH);
        }
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Inner Black Border (thin stroke)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Fill background
        ctx.fillStyle = '#e8ebff';
        ctx.fill();

        // Thought tail circles underneath
        const drawThoughtCircle = (cx: number, cy: number, r: number) => {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, 2 * Math.PI);
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#e8ebff';
          ctx.fill();
        };

        // Circle 1 (Large)
        drawThoughtCircle(-bubbleW/3, bubbleH/2 + 7, 7);
        // Circle 2 (Medium)
        drawThoughtCircle(-bubbleW/3 - 8, bubbleH/2 + 16, 5);
        // Circle 3 (Small)
        drawThoughtCircle(-bubbleW/3 - 15, bubbleH/2 + 24, 3);

        // Draw text
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(layer.text, 0, 0);

      } else if (layer.dialogueType === 'narration') {
        const weight = 'bold';
        const style = 'normal';
        ctx.font = `${style} ${weight} ${layer.fontSize}px ${layer.fontFamily}`;
        const textWidth = ctx.measureText(layer.text).width;
        const paddingX = 32; // more padding on left for orange stripe
        const paddingY = 12;
        const bubbleW = Math.max(200, textWidth + paddingX + 24);
        const bubbleH = layer.fontSize + paddingY * 2;

        // Draw rectangular banner
        ctx.fillStyle = '#fffbeb';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH);
        ctx.fill();
        ctx.stroke();

        // Draw orange accent bar inside
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-bubbleW / 2 + 10, -bubbleH / 2 + 6, 6, bubbleH - 12);

        // Draw text (slightly shifted right because of the orange bar)
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(layer.text, 5, 0); // shift text slightly right for balance

      } else {
        const weight = layer.isBold ? 'bold' : 'normal';
        const style = layer.isItalic ? 'italic' : 'normal';
        ctx.font = `${style} ${weight} ${layer.fontSize}px ${layer.fontFamily}`;
        ctx.fillStyle = layer.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (layer.hasOutline) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = Math.max(3, layer.fontSize / 7);
          ctx.lineJoin = 'round';
          ctx.strokeText(layer.text, 0, 0);
        }
        
        ctx.fillText(layer.text, 0, 0);
      }
      ctx.restore();
    });
  };

  const drawImageLayersToCtx = (ctx: CanvasRenderingContext2D): Promise<void> => {
    return new Promise((resolve) => {
      if (imageLayers.length === 0) {
        resolve();
        return;
      }
      
      let loadedCount = 0;
      imageLayers.forEach(layer => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.save();
          ctx.translate(layer.x, layer.y);
          ctx.rotate(((layer.rotation || 0) * Math.PI) / 180);
          ctx.drawImage(img, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
          ctx.restore();
          
          loadedCount++;
          if (loadedCount === imageLayers.length) {
            resolve();
          }
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === imageLayers.length) {
            resolve();
          }
        };
        img.src = layer.src;
      });
    });
  };

  const applyCrop = () => {
    if (!cropRect) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y, w, h } = cropRect;
    const cropped = ctx.getImageData(x, y, w, h);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const temp = document.createElement('canvas');
    temp.width = w;
    temp.height = h;
    const tctx = temp.getContext('2d');
    if (!tctx) return;
    tctx.putImageData(cropped, 0, 0);

    const scale = Math.min(canvas.width / w, canvas.height / h);
    const dw = w * scale;
    const dh = h * scale;
    const dx = (canvas.width - dw) / 2;
    const dy = (canvas.height - dh) / 2;
    
    ctx.drawImage(temp, dx, dy, dw, dh);

    setCropRect(null);
    setIsCropping(false);
    clearOverlay();
    pushHistory();
    setTool('pen');
  };

  const cancelCrop = () => {
    setCropRect(null);
    setIsCropping(false);
    clearOverlay();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTextLayers([]);
    setImageLayers([]);
    setSelectedTextId(null);
    setSelectedImageId(null);
    pushHistory([], []);
  };

  const handleBakeLayers = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw all collage images, then draw all text overlays onto the pixel canvas
    await drawImageLayersToCtx(ctx);
    drawTextLayersToCtx(ctx);

    // Clear dynamic vector/image layers since they are now baked into the background canvas
    setTextLayers([]);
    setImageLayers([]);
    setSelectedTextId(null);
    setSelectedImageId(null);

    // Push state to canvas history
    pushHistory([], []);
  };

  const applyPixelFilter = (imageData: ImageData, filter: string) => {
    const data = imageData.data;
    const len = data.length;

    if (filter === 'grayscale') {
      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
    } else if (filter === 'sepia') {
      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
      }
    } else if (filter === 'invert') {
      for (let i = 0; i < len; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
    } else if (filter === 'cinematic') {
      const factor = 1.25; 
      for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        r *= 0.95;
        g *= 0.95;
        b *= 0.95;

        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;

        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * 0.85;
        g = gray + (g - gray) * 0.85;
        b = gray + (b - gray) * 0.85;

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
    } else if (filter === 'warm') {
      const factor = 1.1;
      for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        const sr = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
        const sg = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
        const sb = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        r = r + (sr - r) * 0.3;
        g = g + (sg - g) * 0.3;
        b = b + (sb - b) * 0.3;

        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;

        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * 1.4;
        g = gray + (g - gray) * 1.4;
        b = gray + (b - gray) * 1.4;

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
    } else if (filter === 'cold') {
      const factor = 0.95;
      for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        r = r * 1.02;
        g = g * 1.04;
        b = b * 1.08;

        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;

        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * 0.85;
        g = gray + (g - gray) * 0.85;
        b = gray + (b - gray) * 0.85;

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
    } else if (filter === 'high-contrast') {
      const factor = 1.4;
      for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
    }
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const origData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Create a temporary canvas to bake the filter
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
      const tempImgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      applyPixelFilter(tempImgData, activeFilter);
      tempCtx.putImageData(tempImgData, 0, 0);
      await drawImageLayersToCtx(tempCtx);
      drawTextLayersToCtx(tempCtx);
      const dataUrl = tempCanvas.toDataURL('image/png');
      onSave(dataUrl);
    } else {
      await drawImageLayersToCtx(ctx);
      drawTextLayersToCtx(ctx);
      const dataUrl = canvas.toDataURL('image/png');
      ctx.putImageData(origData, 0, 0);
      onSave(dataUrl);
    }
  };

  const handleApply = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const origData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    let dataUrl = '';
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
      const tempImgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      applyPixelFilter(tempImgData, activeFilter);
      tempCtx.putImageData(tempImgData, 0, 0);
      await drawImageLayersToCtx(tempCtx);
      drawTextLayersToCtx(tempCtx);
      dataUrl = tempCanvas.toDataURL('image/png');
    } else {
      await drawImageLayersToCtx(ctx);
      drawTextLayersToCtx(ctx);
      dataUrl = canvas.toDataURL('image/png');
      ctx.putImageData(origData, 0, 0);
    }

    if (dataUrl) {
      if (onApply) {
        onApply(dataUrl);
      } else {
        onSave(dataUrl);
      }
      setApplySuccess(true);
      setTimeout(() => setApplySuccess(false), 3000);
    }
  };

  const handleSaveAsNew = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const origData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
      const tempImgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      applyPixelFilter(tempImgData, activeFilter);
      tempCtx.putImageData(tempImgData, 0, 0);
      await drawImageLayersToCtx(tempCtx);
      drawTextLayersToCtx(tempCtx);
      const dataUrl = tempCanvas.toDataURL('image/png');
      if (onSaveAsNew) {
        onSaveAsNew(dataUrl);
        setSaveAsNewSuccess(true);
        setTimeout(() => setSaveAsNewSuccess(false), 3000);
      } else {
        onSave(dataUrl);
      }
    } else {
      await drawImageLayersToCtx(ctx);
      drawTextLayersToCtx(ctx);
      const dataUrl = canvas.toDataURL('image/png');
      ctx.putImageData(origData, 0, 0);
      if (onSaveAsNew) {
        onSaveAsNew(dataUrl);
        setSaveAsNewSuccess(true);
        setTimeout(() => setSaveAsNewSuccess(false), 3000);
      } else {
        onSave(dataUrl);
      }
    }
  };

  const handleNavigate = async (direction: 'prev' | 'next') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const origData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Create a temporary canvas to bake the filter
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    let dataUrl = '';
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
      const tempImgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      applyPixelFilter(tempImgData, activeFilter);
      tempCtx.putImageData(tempImgData, 0, 0);
      await drawImageLayersToCtx(tempCtx);
      drawTextLayersToCtx(tempCtx);
      dataUrl = tempCanvas.toDataURL('image/png');
    } else {
      await drawImageLayersToCtx(ctx);
      drawTextLayersToCtx(ctx);
      dataUrl = canvas.toDataURL('image/png');
      ctx.putImageData(origData, 0, 0);
    }

    if (onNavigate && dataUrl) {
      onNavigate(direction, dataUrl);
    }
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const origData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    let dataUrl = '';
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
      const tempImgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      applyPixelFilter(tempImgData, activeFilter);
      tempCtx.putImageData(tempImgData, 0, 0);
      await drawImageLayersToCtx(tempCtx);
      drawTextLayersToCtx(tempCtx);
      dataUrl = tempCanvas.toDataURL('image/png');
    } else {
      await drawImageLayersToCtx(ctx);
      drawTextLayersToCtx(ctx);
      dataUrl = canvas.toDataURL('image/png');
      ctx.putImageData(origData, 0, 0);
    }

    try {
      const filename = `frame-export-${Date.now()}.png`;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export PNG failed:", err);
      alert("Failed to export PNG. Tainted canvas error might occur with external images.");
    }
  };

  const handleAddNewText = () => {
    const newLayer: TextLayer = {
      id: generateId(),
      text: textValue || 'Storyboard Text',
      x: width / 2,
      y: height / 2,
      fontSize,
      fontFamily,
      color,
      isBold: fontBold,
      isItalic: fontItalic,
      hasOutline: fontOutline
    };
    const nextLayers = [...textLayers, newLayer];
    setTextLayers(nextLayers);
    setSelectedTextId(newLayer.id);
    setSelectedImageId(null);
    setTool('select');
    pushHistory(nextLayers, imageLayers);
  };

  const handleAddDialogueLayer = (type: 'speech' | 'thought' | 'narration') => {
    let defaultText = '';
    let defaultColor = '#000000';
    let defaultSize = 24;
    
    if (type === 'speech') {
      defaultText = 'Look out behind you!';
    } else if (type === 'thought') {
      defaultText = 'Hmm... what is that sound?';
    } else {
      defaultText = 'Suddenly, a loud screech echoes from the depth of the valley...';
    }

    const newLayer: TextLayer = {
      id: generateId(),
      text: defaultText,
      x: width / 2,
      y: height / 2,
      fontSize: defaultSize,
      fontFamily: FONT_FAMILIES[0],
      color: defaultColor,
      isBold: type === 'speech' || type === 'narration',
      isItalic: type === 'thought',
      hasOutline: false,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      dialogueType: type,
      tailLength: type === 'speech' ? 'medium' : undefined
    };

    const nextLayers = [...textLayers, newLayer];
    setTextLayers(nextLayers);
    setSelectedTextId(newLayer.id);
    setSelectedImageId(null);
    setTool('select');
    pushHistory(nextLayers, imageLayers);
    justAddedTextRef.current = true;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 200;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        
        const newImgLayer: ImageLayer = {
          id: generateId(),
          src: dataUrl,
          x: width / 2,
          y: height / 2,
          width: w,
          height: h,
          rotation: 0
        };
        const nextLayers = [...imageLayers, newImgLayer];
        setImageLayers(nextLayers);
        setSelectedImageId(newImgLayer.id);
        setSelectedTextId(null);
        setTool('select');
        pushHistory(textLayers, nextLayers);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleImageMouseDown = (e: React.MouseEvent, layer: ImageLayer) => {
    e.stopPropagation();
    setSelectedImageId(layer.id);
    setSelectedTextId(null);
    setIsDraggingImage(true);
    setTool('select');

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    setDragImageOffset({
      x: clickX - layer.x,
      y: clickY - layer.y
    });
  };

  const handleImageTouchStart = (e: React.TouchEvent, layer: ImageLayer) => {
    e.stopPropagation();
    setSelectedImageId(layer.id);
    setSelectedTextId(null);
    setIsDraggingImage(true);
    setTool('select');

    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const clickX = (touch.clientX - rect.left) * scaleX;
    const clickY = (touch.clientY - rect.top) * scaleY;

    setDragImageOffset({
      x: clickX - layer.x,
      y: clickY - layer.y
    });
  };

  const handleImageResizeMouseDown = (e: React.MouseEvent, layer: ImageLayer) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedImageId(layer.id);
    setSelectedTextId(null);
    setIsResizingImage(true);
    setResizeImageStartSize({ w: layer.width, h: layer.height });
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    
    setResizeImageStartPos({
      x: e.clientX * scaleX,
      y: e.clientY * scaleY
    });
  };

  const handleImageResizeTouchStart = (e: React.TouchEvent, layer: ImageLayer) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedImageId(layer.id);
    setSelectedTextId(null);
    setIsResizingImage(true);
    setResizeImageStartSize({ w: layer.width, h: layer.height });
    
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    
    setResizeImageStartPos({
      x: touch.clientX * scaleX,
      y: touch.clientY * scaleY
    });
  };

  // Image layer dragging useEffect
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingImage || !selectedImageId) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      const currentX = (e.clientX - rect.left) * scaleX;
      const currentY = (e.clientY - rect.top) * scaleY;

      const newX = Math.round(currentX - dragImageOffset.x);
      const newY = Math.round(currentY - dragImageOffset.y);

      setImageLayers(prev => prev.map(l => l.id === selectedImageId ? { ...l, x: newX, y: newY } : l));
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isDraggingImage || !selectedImageId || e.touches.length === 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      const touch = e.touches[0];
      const currentX = (touch.clientX - rect.left) * scaleX;
      const currentY = (touch.clientY - rect.top) * scaleY;

      const newX = Math.round(currentX - dragImageOffset.x);
      const newY = Math.round(currentY - dragImageOffset.y);

      setImageLayers(prev => prev.map(l => l.id === selectedImageId ? { ...l, x: newX, y: newY } : l));
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingImage) {
        pushHistory(textLayers, imageLayers);
      }
      setIsDraggingImage(false);
    };

    if (isDraggingImage) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalTouchMove);
      window.addEventListener('touchend', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDraggingImage, selectedImageId, dragImageOffset, width, height, textLayers, imageLayers, pushHistory]);

  // Image layer resizing useEffect
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isResizingImage || !selectedImageId || !resizeImageStartPos) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      const currentX = e.clientX * scaleX;
      const currentY = e.clientY * scaleY;

      const dx = currentX - resizeImageStartPos.x;
      const dy = currentY - resizeImageStartPos.y;
      
      const aspect = resizeImageStartSize.w / resizeImageStartSize.h;
      const delta = (dx + dy) / 2;
      const newW = Math.max(20, Math.min(width, Math.round(resizeImageStartSize.w + delta)));
      const newH = Math.max(20, Math.min(height, Math.round(newW / aspect)));

      setImageLayers(prev => prev.map(l => l.id === selectedImageId ? { ...l, width: newW, height: newH } : l));
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isResizingImage || !selectedImageId || !resizeImageStartPos || e.touches.length === 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      const touch = e.touches[0];
      const currentX = touch.clientX * scaleX;
      const currentY = touch.clientY * scaleY;

      const dx = currentX - resizeImageStartPos.x;
      const dy = currentY - resizeImageStartPos.y;
      
      const aspect = resizeImageStartSize.w / resizeImageStartSize.h;
      const delta = (dx + dy) / 2;
      const newW = Math.max(20, Math.min(width, Math.round(resizeImageStartSize.w + delta)));
      const newH = Math.max(20, Math.min(height, Math.round(newW / aspect)));

      setImageLayers(prev => prev.map(l => l.id === selectedImageId ? { ...l, width: newW, height: newH } : l));
    };

    const handleGlobalMouseUp = () => {
      if (isResizingImage) {
        pushHistory(textLayers, imageLayers);
      }
      setIsResizingImage(false);
    };

    if (isResizingImage) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalTouchMove);
      window.addEventListener('touchend', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isResizingImage, selectedImageId, resizeImageStartPos, resizeImageStartSize, width, height, textLayers, imageLayers, pushHistory]);

  const handleShapeSelect = (shape: ShapeTool) => {
    setActiveShapeTool(shape);
    setTool(shape);
    setShowShapesFlyout(false);
    cancelCrop();
  };

  const resetColorPicker = () => {
    setColor('#ffffff');
    if (selectedTextId) {
      updateSelectedTextProps({ color: '#ffffff' });
    }
  };

  const isShapeActive = ['line', 'arrow', 'rect', 'ellipse'].includes(tool);

  const getShapeIcon = (shape: ShapeTool) => {
    switch (shape) {
      case 'line': return <Minus className="w-4 h-4" />;
      case 'arrow': return <ArrowUpRight className="w-4 h-4" />;
      case 'rect': return <Square className="w-4 h-4" />;
      case 'ellipse': return <Circle className="w-4 h-4" />;
    }
  };

  const activeTextLayer = textLayers.find(l => l.id === selectedTextId);

  return (
    <div className="fixed inset-0 bg-[#0A0A0B]/95 z-[160] flex flex-col animate-fade-in backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-[#0C0C0E] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <span>FrameEditor Studio</span>
              <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 text-[9px] font-mono border border-sky-500/10">v007-pro</span>
            </h2>
            <p className="text-[10px] text-neutral-500">{width}×{height}px · Vector Text Overlays (Editable/Draggable)</p>
          </div>
        </div>

        {/* Transport Toggle */}
        {index !== undefined && totalFrames !== undefined && (
          <div className="flex items-center gap-2.5 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 shadow-inner">
            <button
              onClick={() => handleNavigate('prev')}
              disabled={index <= 0}
              className="p-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-20 text-neutral-300 hover:text-white rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Save & Go to Previous Frame"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono font-black text-neutral-400 uppercase tracking-widest px-1">
              Frame {index + 1} / {totalFrames}
            </span>
            <button
              onClick={() => handleNavigate('next')}
              disabled={index >= totalFrames - 1}
              className="p-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-20 text-neutral-300 hover:text-white rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Save & Go to Next Frame"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {applySuccess && (
            <span className="text-emerald-400 font-extrabold text-[10px] bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/20 animate-pulse uppercase tracking-wider">
              ✓ Applied to Storyboard
            </span>
          )}
          {saveAsNewSuccess && (
            <span className="text-emerald-400 font-extrabold text-[10px] bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/20 animate-pulse uppercase tracking-wider">
              ✓ Saved as New Frame
            </span>
          )}
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-bold border border-neutral-700 transition-colors cursor-pointer">
            <Download className="w-3.5 h-3.5 text-sky-400" /> Export PNG
          </button>
          <button onClick={handleSaveAsNew} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700 rounded-lg text-xs font-bold transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5 text-emerald-400" /> Save as New Frame
          </button>
          <button onClick={handleApply} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#059669] hover:bg-[#047857] text-white rounded-lg text-xs font-extrabold transition-colors cursor-pointer" title="Apply changes directly so you can review/undo/redo them before closing">
            <Check className="w-3.5 h-3.5" /> Apply Changes
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black transition-colors cursor-pointer" title="Save changes and close editor">
            <Save className="w-3.5 h-3.5" /> Save & Close
          </button>
          <button onClick={onClose} className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <div className="w-14 bg-[#0C0C0E] border-r border-neutral-800 flex flex-col items-center py-4 gap-1.5 shrink-0 z-20">
          <button onClick={() => { setTool('select'); setShowShapesFlyout(false); cancelCrop(); }} className={cn('w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer', tool === 'select' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200')} title="Pointer Selection Tool"><MousePointer className="w-4 h-4" /></button>
          <button onClick={() => { setTool('pen'); setShowShapesFlyout(false); cancelCrop(); }} className={cn('w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer', tool === 'pen' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200')} title="Draw Pen"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => { setTool('eraser'); setShowShapesFlyout(false); cancelCrop(); }} className={cn('w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer', tool === 'eraser' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200')} title="Eraser"><Eraser className="w-4 h-4" /></button>
          <button onClick={() => { setTool('blur'); setShowShapesFlyout(false); cancelCrop(); }} className={cn('w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer', tool === 'blur' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200')} title="Blur Brush"><Droplet className="w-4 h-4" /></button>

          <div className="relative">
            <button onClick={() => { setShowShapesFlyout(prev => !prev); setTool(activeShapeTool); cancelCrop(); }} className={cn('w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer', isShapeActive ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200')} title="Shapes Tool">{getShapeIcon(activeShapeTool)}</button>
            {showShapesFlyout && (
              <div className="absolute left-12 top-0 bg-[#0C0C0E] border border-neutral-700/80 p-1 rounded-xl shadow-xl flex flex-col gap-1 z-30 min-w-[130px]">
                <div className="px-2 py-1 border-b border-neutral-800 mb-1"><span className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-wider block">Drawing Shapes</span></div>
                <button onClick={() => handleShapeSelect('line')} className={cn('flex items-center gap-2 px-2.5 py-1.5 text-left text-xs rounded-lg transition-colors w-full cursor-pointer', activeShapeTool === 'line' && tool === 'line' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-300 hover:bg-neutral-800')}><Minus className="w-3.5 h-3.5 shrink-0 text-neutral-400" /><span>Line</span></button>
                <button onClick={() => handleShapeSelect('arrow')} className={cn('flex items-center gap-2 px-2.5 py-1.5 text-left text-xs rounded-lg transition-colors w-full cursor-pointer', activeShapeTool === 'arrow' && tool === 'arrow' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-300 hover:bg-neutral-800')}><ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-neutral-400" /><span>Arrow</span></button>
                <button onClick={() => handleShapeSelect('rect')} className={cn('flex items-center gap-2 px-2.5 py-1.5 text-left text-xs rounded-lg transition-colors w-full cursor-pointer', activeShapeTool === 'rect' && tool === 'rect' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-300 hover:bg-neutral-800')}><Square className="w-3.5 h-3.5 shrink-0 text-neutral-400" /><span>Rectangle</span></button>
                <button onClick={() => handleShapeSelect('ellipse')} className={cn('flex items-center gap-2 px-2.5 py-1.5 text-left text-xs rounded-lg transition-colors w-full cursor-pointer', activeShapeTool === 'ellipse' && tool === 'ellipse' ? 'bg-indigo-600 text-white font-bold' : 'text-neutral-300 hover:bg-neutral-800')}><Circle className="w-3.5 h-3.5 shrink-0 text-neutral-400" /><span>Ellipse</span></button>
              </div>
            )}
          </div>

          <button onClick={() => { setTool('text'); setShowShapesFlyout(false); cancelCrop(); }} className={cn('w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer', tool === 'text' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200')} title="Text tool overlay"><Type className="w-4 h-4" /></button>
          <button onClick={() => { setTool('crop'); setShowShapesFlyout(false); cancelCrop(); }} className={cn('w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer', tool === 'crop' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200')} title="Crop canvas"><Crop className="w-4 h-4" /></button>
          <button onClick={() => { setTool('eyedropper'); setShowShapesFlyout(false); cancelCrop(); }} className={cn('w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer', tool === 'eyedropper' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200')} title="Eyedropper color picker"><Pipette className="w-4 h-4" /></button>
          <button onClick={() => { setTool('move'); setShowShapesFlyout(false); cancelCrop(); }} className={cn('w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer', tool === 'move' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200')} title="Pan / Move drawing layer"><Move className="w-4 h-4" /></button>

          <div className="h-px w-8 bg-neutral-800 my-2" />
          
          <button onClick={handleUndo} disabled={historyIndex <= 0} className="w-10 h-10 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 cursor-pointer" title="Undo drawing/text layer (Ctrl+Z)"><Undo2 className="w-4 h-4" /></button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="w-10 h-10 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 cursor-pointer" title="Redo (Ctrl+Y)"><Redo2 className="w-4 h-4" /></button>
          <button onClick={handleClear} className="w-10 h-10 rounded-lg flex items-center justify-center text-rose-400 hover:bg-neutral-800 hover:text-rose-300 cursor-pointer" title="Reset drawing layer"><Trash2 className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex-wrap shrink-0">
            <div className="flex items-center gap-1">
              {COLORS.map(c => (
                <button key={c} onClick={() => { setColor(c); if (selectedTextId) updateSelectedTextProps({ color: c }, true); }} className={cn('w-5.5 h-5.5 rounded-full border transition-transform cursor-pointer', color === c ? 'border-white scale-110 shadow-lg' : 'border-slate-800 hover:scale-105')} style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={color} onChange={e => { setColor(e.target.value); if (selectedTextId) updateSelectedTextProps({ color: e.target.value }, true); }} className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 ml-1" />
              <button onClick={resetColorPicker} className="p-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded text-[10px] font-bold border border-slate-700 flex items-center gap-1 cursor-pointer"><RotateCcw className="w-3 h-3" /><span>Reset</span></button>
            </div>

            <div className="h-5 w-px bg-slate-800" />

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase">Brush</span>
              <input type="range" min={1} max={30} value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} className="w-20 accent-violet-500 cursor-ew-resize" />
              <span className="text-[10px] text-slate-400 font-mono w-6">{lineWidth}px</span>
            </div>

            {(tool === 'rect' || tool === 'ellipse') && (
              <>
                <div className="h-5 w-px bg-slate-800" />
                <label className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold cursor-pointer select-none"><input type="checkbox" checked={fill} onChange={e => setFill(e.target.checked)} className="accent-violet-500 cursor-pointer" />Fill Shape</label>
              </>
            )}

            <div className="h-5 w-px bg-slate-800" />

            <button onClick={handleAddNewText} className="flex items-center gap-1 px-2.5 py-1 bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/30 rounded text-[10px] font-bold cursor-pointer transition-all"><Plus className="w-3 h-3" /> Add Text Layer</button>

            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="flex items-center gap-1 px-2.5 py-1 bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/30 rounded text-[10px] font-bold cursor-pointer transition-all"
              title="Import an image to overlay and make a collage"
            >
              <Plus className="w-3 h-3" /> Import Collage Image
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />

            {(textLayers.length > 0 || imageLayers.length > 0) && (
              <button 
                onClick={handleBakeLayers} 
                className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/30 rounded text-[10px] font-extrabold cursor-pointer transition-all animate-pulse shadow-md shadow-amber-950/20"
                title="Bake/Flatten all text and collage layers into the background canvas permanently so you can paint over them or apply filters"
              >
                <Check className="w-3.5 h-3.5 text-amber-400" /> Bake & Flatten Layers
              </button>
            )}

            {textLayers.length > 0 && !selectedTextId && (
              <span className="text-[10px] text-slate-500 italic">Click a text layer to edit, resize or drag</span>
            )}

            <div className="h-5 w-px bg-slate-800" />

            {/* Cinematic FX Filters bar */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded px-2.5 py-1">
              <span className="text-[10px] text-violet-400 font-extrabold uppercase tracking-wide flex items-center gap-1">
                <span>FX filter:</span>
              </span>
              <select
                value={activeFilter}
                onChange={e => {
                  setActiveFilter(e.target.value);
                }}
                className="bg-transparent border-0 text-slate-300 text-[10px] font-extrabold outline-none cursor-pointer max-w-[110px]"
              >
                <option value="none" className="bg-[#0C0C0E]">Normal Style</option>
                <option value="grayscale" className="bg-[#0C0C0E]">Noir (B&W)</option>
                <option value="sepia" className="bg-[#0C0C0E]">Vintage Sepia</option>
                <option value="cinematic" className="bg-[#0C0C0E]">Cinematic</option>
                <option value="warm" className="bg-[#0C0C0E]">Warm Golden</option>
                <option value="cold" className="bg-[#0C0C0E]">Cold Cinema</option>
                <option value="high-contrast" className="bg-[#0C0C0E]">High Contrast</option>
                <option value="invert" className="bg-[#0C0C0E]">Negative (Invert)</option>
              </select>
            </div>

            <div className="h-5 w-px bg-slate-800" />

            {/* Text settings toolbar: STAYS OPEN AT ALL TIMES */}
            <div className="flex items-center gap-2 bg-slate-800/40 px-2 py-1 rounded border border-slate-700/60 shrink-0">
              <span className="text-[10px] text-purple-400 font-extrabold uppercase flex items-center gap-1">
                <Type className="w-3 h-3 text-purple-400" />
                <span>Text Settings:</span>
              </span>
              
              {/* Text input section also on the text editor toolbar! */}
              <input 
                type="text" 
                value={activeTextLayer ? activeTextLayer.text : textValue} 
                onChange={e => {
                  const val = e.target.value;
                  if (activeTextLayer) {
                    updateSelectedTextProps({ text: val });
                  } else {
                    setTextValue(val);
                  }
                }} 
                onBlur={() => {
                  if (activeTextLayer) {
                    pushHistory();
                  }
                }}
                placeholder="Type storyboard text..." 
                className="bg-slate-900 border border-slate-700 text-white text-[10px] rounded px-1.5 py-1 w-36 focus:border-violet-500 outline-none placeholder:text-neutral-600 font-bold" 
              />

              <select 
                value={activeTextLayer ? activeTextLayer.fontFamily : fontFamily} 
                onChange={e => {
                  const fam = e.target.value;
                  if (activeTextLayer) {
                    updateSelectedTextProps({ fontFamily: fam }, true);
                  } else {
                    setFontFamily(fam);
                  }
                }} 
                className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-1 font-bold outline-none cursor-pointer"
              >
                {FONT_FAMILIES.map(f => (
                  <option key={f} value={f}>{f.split(',')[0]}</option>
                ))}
              </select>

              {activeTextLayer ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold" title="Width">W:</span>
                    <input type="range" min={0.1} max={5} step={0.05} value={activeTextLayer.scaleX || 1} 
                      onChange={e => updateSelectedTextProps({ scaleX: Number(e.target.value) })} 
                      onMouseUp={() => pushHistory()} onTouchEnd={() => pushHistory()}
                      className="w-12 accent-violet-500 cursor-ew-resize" title="Horizontal Scale" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold" title="Height">H:</span>
                    <input type="range" min={0.1} max={5} step={0.05} value={activeTextLayer.scaleY || 1} 
                      onChange={e => updateSelectedTextProps({ scaleY: Number(e.target.value) })} 
                      onMouseUp={() => pushHistory()} onTouchEnd={() => pushHistory()}
                      className="w-12 accent-violet-500 cursor-ew-resize" title="Vertical Scale" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold" title="Rotation">R:</span>
                    <input type="range" min={-180} max={180} step={1} value={activeTextLayer.rotation || 0} 
                      onChange={e => updateSelectedTextProps({ rotation: Number(e.target.value) })} 
                      onMouseUp={() => pushHistory()} onTouchEnd={() => pushHistory()}
                      className="w-12 accent-amber-500 cursor-ew-resize" title="Rotation Angle" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-bold">Size:</span>
                  <input type="range" min={10} max={120} value={fontSize} 
                    onChange={e => setFontSize(Number(e.target.value))} 
                    className="w-16 accent-violet-500 cursor-ew-resize" />
                  <input type="number" min={10} max={120} value={fontSize} 
                    onChange={e => setFontSize(Number(e.target.value))} 
                    className="w-10 bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-1 text-center font-mono outline-none py-0.5" />
                </div>
              )}

              <div className="flex items-center gap-1">
                <button 
                  onClick={() => {
                    if (activeTextLayer) {
                      updateSelectedTextProps({ isBold: !activeTextLayer.isBold }, true);
                    } else {
                      setFontBold(!fontBold);
                    }
                  }} 
                  className={cn('p-1 rounded transition-all cursor-pointer', (activeTextLayer ? activeTextLayer.isBold : fontBold) ? 'bg-violet-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200')}
                  title="Bold text"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => {
                    if (activeTextLayer) {
                      updateSelectedTextProps({ isItalic: !activeTextLayer.isItalic }, true);
                    } else {
                      setFontItalic(!fontItalic);
                    }
                  }} 
                  className={cn('p-1 rounded transition-all cursor-pointer', (activeTextLayer ? activeTextLayer.isItalic : fontItalic) ? 'bg-violet-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200')}
                  title="Italic text"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => {
                    if (activeTextLayer) {
                      updateSelectedTextProps({ hasOutline: !activeTextLayer.hasOutline }, true);
                    } else {
                      setFontOutline(!fontOutline);
                    }
                  }} 
                  className={cn('px-1.5 py-0.5 rounded text-[8px] font-extrabold transition-all cursor-pointer border', (activeTextLayer ? activeTextLayer.hasOutline : fontOutline) ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400')}
                  title="Toggle Text Stroke Outline"
                >
                  OUTLINE
                </button>
              </div>

              {/* Directly accessible text color selection and quick-swatches */}
              <div className="flex items-center gap-1.5 ml-1 border-l border-slate-700/60 pl-2">
                <span className="text-[10px] text-slate-500 font-bold">Color:</span>
                <input 
                  type="color" 
                  value={activeTextLayer ? activeTextLayer.color : color} 
                  onChange={e => {
                    const col = e.target.value;
                    if (activeTextLayer) {
                      updateSelectedTextProps({ color: col }, true);
                    } else {
                      setColor(col);
                    }
                  }} 
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  title="Text Color Picker"
                />
                
                {/* Simple high-contrast quick-colors for storyboarding */}
                <div className="flex gap-1">
                  {['#ffffff', '#facc15', '#ef4444', '#000000'].map((qc) => (
                    <button
                      key={qc}
                      onClick={() => {
                        if (activeTextLayer) {
                          updateSelectedTextProps({ color: qc }, true);
                        } else {
                          setColor(qc);
                        }
                      }}
                      className={cn(
                        "w-3.5 h-3.5 rounded-full border border-slate-600 cursor-pointer transition-transform hover:scale-110",
                        (activeTextLayer ? activeTextLayer.color : color) === qc ? "ring-1 ring-violet-500 scale-110" : "opacity-80 hover:opacity-100"
                      )}
                      style={{ backgroundColor: qc }}
                      title={`Set text to ${qc === '#ffffff' ? 'White' : qc === '#facc15' ? 'Yellow' : qc === '#ef4444' ? 'Red' : 'Black'}`}
                    />
                  ))}
                </div>
              </div>

              {activeTextLayer?.dialogueType === 'speech' && (
                <div className="flex items-center gap-1.5 ml-1.5 border-l border-slate-700/60 pl-2 shrink-0">
                  <span className="text-[10px] text-sky-400 font-extrabold uppercase">Tail Length:</span>
                  <select
                    value={activeTextLayer.tailLength || 'medium'}
                    onChange={e => updateSelectedTextProps({ tailLength: e.target.value as 'short' | 'medium' | 'long' }, true)}
                    className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-1 font-bold outline-none cursor-pointer"
                  >
                    <option value="short">Short (8px)</option>
                    <option value="medium">Medium (16px)</option>
                    <option value="long">Long (28px)</option>
                  </select>
                </div>
              )}

              {activeTextLayer && (
                <>
                  <div className="h-4 w-px bg-slate-700" />
                  <button 
                    onClick={() => {
                      const nextLayers = textLayers.filter(l => l.id !== selectedTextId);
                      setTextLayers(nextLayers);
                      setSelectedTextId(null);
                      pushHistory(nextLayers);
                    }} 
                    className="p-1 hover:bg-slate-700/80 text-rose-400 hover:text-rose-300 rounded cursor-pointer"
                    title="Delete selected text layer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            {isCropping && (
              <>
                <div className="h-5 w-px bg-slate-800" />
                <span className="text-[10px] text-purple-400 font-bold">Crop selection ready</span>
                <button onClick={applyCrop} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer"><Check className="w-3 h-3" /> Apply Crop</button>
                <button onClick={cancelCrop} className="px-2.5 py-1 bg-slate-800 text-slate-400 hover:text-slate-200 rounded text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer">Cancel</button>
              </>
            )}
          </div>

          <div ref={containerRef} className="flex-1 flex items-center justify-center bg-slate-950 p-6 overflow-auto relative">
            {/* Dialogue Tools floating panel */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-4 py-1.5 rounded-full flex items-center gap-3 shadow-2xl">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Dialogue Tools:</span>
              <div className="flex bg-slate-950/80 p-0.5 rounded-full border border-slate-800">
                <button 
                  onClick={() => handleAddDialogueLayer('speech')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                  <span>Speech</span>
                </button>
                <button 
                  onClick={() => handleAddDialogueLayer('thought')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5 text-purple-400" />
                  <span>Thought</span>
                </button>
                <button 
                  onClick={() => handleAddDialogueLayer('narration')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-orange-500" />
                  <span>Narration</span>
                </button>
              </div>
            </div>

            <div className="relative shadow-2xl shadow-black/80 border border-slate-800 rounded-lg overflow-hidden checkerboard-bg" style={{ width: displayW, height: displayH }} onClick={() => { setSelectedTextId(null); setEditingTextInPlace(null); }}>
              <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full" 
                style={{ 
                  imageRendering: 'auto',
                  filter: activeFilter === 'grayscale' ? 'grayscale(100%)' :
                          activeFilter === 'sepia' ? 'sepia(80%)' :
                          activeFilter === 'cinematic' ? 'contrast(120%) brightness(95%) saturate(85%)' :
                          activeFilter === 'warm' ? 'sepia(30%) saturate(140%) contrast(110%)' :
                          activeFilter === 'cold' ? 'saturate(85%) brightness(105%) contrast(95%)' :
                          activeFilter === 'high-contrast' ? 'contrast(150%)' :
                          activeFilter === 'invert' ? 'invert(100%)' : 'none'
                }} 
              />
              <canvas 
                ref={overlayRef} 
                className={cn("absolute inset-0 w-full h-full z-10", tool === 'move' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : tool === 'select' ? 'cursor-default' : 'cursor-crosshair')} 
                onMouseDown={handlePointerDown} 
                onMouseMove={handlePointerMove} 
                onMouseUp={handlePointerUp} 
                onMouseLeave={handlePointerUp} 
                onTouchStart={handlePointerDown} 
                onTouchMove={handlePointerMove} 
                onTouchEnd={handlePointerUp} 
                onClick={(e) => {
                  if (justAddedTextRef.current) {
                    e.stopPropagation();
                    justAddedTextRef.current = false;
                    return;
                  }
                  if (tool === 'select') {
                    setSelectedTextId(null);
                    setSelectedImageId(null);
                    setEditingTextInPlace(null);
                  } else {
                    e.stopPropagation();
                  }
                }}
              />

              <div className="absolute inset-0 z-20 pointer-events-none">
                {imageLayers.map((layer) => {
                  const isSelected = layer.id === selectedImageId;
                  const imageDisplayW = layer.width * displayScale;
                  const imageDisplayH = layer.height * displayScale;
                  return (
                    <div
                      key={layer.id}
                      style={{
                        position: 'absolute',
                        left: `${(layer.x / width) * 100}%`,
                        top: `${(layer.y / height) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'auto',
                        width: imageDisplayW,
                        height: imageDisplayH
                      }}
                      onMouseDown={(e) => handleImageMouseDown(e, layer)}
                      onTouchStart={(e) => handleImageTouchStart(e, layer)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={cn(
                          "w-full h-full relative select-none group border",
                          isSelected ? "ring-2 ring-sky-500/80 bg-slate-950/20 border-sky-500" : "hover:border-white/20 border-transparent"
                        )}
                      >
                        <img
                          src={layer.src}
                          alt=""
                          className="w-full h-full object-contain pointer-events-none"
                        />
                        {isSelected && (
                          <>
                            <div className="absolute -top-1 -left-1 w-2 h-2 bg-sky-400 rounded-full border border-slate-950 pointer-events-none" />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-sky-400 rounded-full border border-slate-950 pointer-events-none" />
                            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-sky-400 rounded-full border border-slate-950 pointer-events-none" />
                            {/* Bottom-right interactive handle for resize dragging! */}
                            <div 
                              className="absolute -bottom-1 -right-1 w-3 h-3 bg-sky-400 hover:bg-sky-300 rounded-full border border-slate-950 cursor-se-resize pointer-events-auto shadow-md"
                              onMouseDown={(e) => handleImageResizeMouseDown(e, layer)}
                              onTouchStart={(e) => handleImageResizeTouchStart(e, layer)}
                              title="Drag to resize image"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {textLayers.map((layer) => {
                  const isSelected = layer.id === selectedTextId;
                  const isEditing = layer.id === editingTextInPlace;
                  const textDisplaySize = Math.max(10, layer.fontSize * displayScale);
                  return (
                    <div 
                      key={layer.id} 
                      style={{ position: 'absolute', left: `${(layer.x / width) * 100}%`, top: `${(layer.y / height) * 100}%`, transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg) scale(${layer.scaleX || 1}, ${layer.scaleY || 1})`, pointerEvents: 'auto' }} 
                      onMouseDown={(e) => handleTextMouseDown(e, layer)} 
                      onTouchStart={(e) => handleTextTouchStart(e, layer)} 
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => { e.stopPropagation(); setEditingTextInPlace(layer.id); setInPlaceInputValue(layer.text); }}
                    >
                      {isEditing ? (
                        <input type="text" value={inPlaceInputValue} autoFocus onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onChange={e => { setInPlaceInputValue(e.target.value); setTextLayers(prev => prev.map(l => l.id === layer.id ? { ...l, text: e.target.value } : l)); }} onBlur={() => { setEditingTextInPlace(null); pushHistory(); }} onKeyDown={e => { if (e.key === 'Enter') { setEditingTextInPlace(null); pushHistory(); } if (e.key === 'Escape') setEditingTextInPlace(null); }} className="bg-slate-900/95 border-2 border-violet-500 text-white px-2 py-1 rounded shadow-2xl outline-none" style={{ fontFamily: layer.fontFamily, fontSize: `${textDisplaySize}px`, fontWeight: layer.isBold ? 'bold' : 'normal', fontStyle: layer.isItalic ? 'italic' : 'normal', color: layer.color }} />
                      ) : (
                        layer.dialogueType === 'speech' ? (
                          <div className={cn("relative transition-all select-none whitespace-nowrap px-6 py-3 bg-white text-black font-bold border border-neutral-300 shadow-lg text-center cursor-grab active:cursor-grabbing rounded-[9999px]", isSelected ? "ring-2 ring-violet-500/80" : "")}>
                            <span style={{ fontSize: `${textDisplaySize}px`, fontFamily: layer.fontFamily }}>{layer.text || <span className="opacity-50 italic">...</span>}</span>
                            
                            {/* Tail SVG */}
                            {(() => {
                              const tailH = layer.tailLength === 'short' ? 8 : layer.tailLength === 'long' ? 28 : 16;
                              return (
                                <svg 
                                  width="16" 
                                  height={tailH} 
                                  viewBox={`0 0 16 ${tailH}`} 
                                  className="absolute left-6 top-full -translate-y-px text-white fill-current overflow-visible filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)]"
                                >
                                  <path d={`M0,0 L16,0 L2,${tailH} Z`} stroke="#cbd5e1" strokeWidth="1" />
                                </svg>
                              );
                            })()}

                            {isSelected && (
                              <>
                                <div className="absolute -top-1 -left-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                              </>
                            )}
                          </div>
                        ) : layer.dialogueType === 'thought' ? (
                          <div className="relative cursor-grab active:cursor-grabbing">
                            {/* Outer Purple Border */}
                            <div className={cn(
                              "rounded-full border-[3px] border-[#8b5cf6] p-[2px] bg-[#e8ebff] shadow-lg",
                              isSelected ? "ring-2 ring-violet-500/80" : ""
                            )}>
                              {/* Inner Black Border */}
                              <div className="rounded-full border-2 border-black bg-[#e8ebff] px-6 py-2.5 text-center">
                                <span 
                                  className="text-black italic font-medium whitespace-nowrap"
                                  style={{ fontSize: `${textDisplaySize}px`, fontFamily: layer.fontFamily }}
                                >
                                  {layer.text || <span className="opacity-50 italic">...</span>}
                                </span>
                              </div>
                            </div>

                            {/* Thought bubbles tail underneath */}
                            <div className="absolute top-[calc(100%+2px)] left-10 flex flex-col gap-1 pointer-events-none">
                              {/* Circle 1: Large */}
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-[#8b5cf6] bg-[#e8ebff] outline outline-1 outline-black -ml-1" />
                              {/* Circle 2: Medium */}
                              <div className="w-2.5 h-2.5 rounded-full border-2 border-[#8b5cf6] bg-[#e8ebff] outline outline-1 outline-black -ml-2.5" />
                              {/* Circle 3: Small */}
                              <div className="w-1.5 h-1.5 rounded-full border-2 border-[#8b5cf6] bg-[#e8ebff] outline outline-1 outline-black -ml-4" />
                            </div>

                            {isSelected && (
                              <>
                                <div className="absolute -top-1 -left-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                              </>
                            )}
                          </div>
                        ) : layer.dialogueType === 'narration' ? (
                          <div className={cn(
                            "relative bg-[#fffbeb] border-2 border-black/80 px-6 py-3 pl-8 shadow-md rounded-none min-w-[200px] cursor-grab active:cursor-grabbing",
                            isSelected ? "ring-2 ring-violet-500/80" : ""
                          )}>
                            {/* Orange vertical accent stripe */}
                            <div className="absolute left-2.5 top-2 bottom-2 w-1.5 bg-[#f97316] rounded-sm" />
                            
                            <div className="text-[#1e293b] font-semibold text-center whitespace-nowrap">
                              <span style={{ fontSize: `${textDisplaySize}px`, fontFamily: layer.fontFamily }}>{layer.text || <span className="opacity-50 italic">...</span>}</span>
                            </div>

                            {isSelected && (
                              <>
                                <div className="absolute -top-1 -left-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                              </>
                            )}
                          </div>
                        ) : (
                          <div className={cn("px-2.5 py-1.5 rounded transition-all select-none relative whitespace-nowrap group text-center cursor-grab active:cursor-grabbing", isSelected ? "ring-2 ring-violet-500/80 bg-slate-950/70 border border-violet-500" : "hover:bg-white/5 border border-transparent")} style={{ fontFamily: layer.fontFamily, fontSize: `${textDisplaySize}px`, fontWeight: layer.isBold ? 'bold' : 'normal', fontStyle: layer.isItalic ? 'italic' : 'normal', color: layer.color, textShadow: layer.hasOutline ? `-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000` : 'none' }}>
                            {layer.text || <span className="opacity-50 italic">Empty text block</span>}
                            {isSelected && (
                              <>
                                <div className="absolute -top-1 -left-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-violet-400 rounded-full border border-slate-950 pointer-events-none" />
                              </>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
