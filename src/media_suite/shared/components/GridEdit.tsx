import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Crop, Grid, Layers, Lock, Unlock, Download, Upload, Trash2, Plus, Minus, X, 
  ArrowRight, FileImage, FolderTree, RefreshCw, Check, CheckSquare, Eye, List, LayoutGrid, HelpCircle, Save, Square
} from 'lucide-react';
import { cn } from '../utils/cn';
import JSZip from 'jszip';

export interface GridEditProps {
  imageUrl: string;
  width: number;
  height: number;
  onSave: (dataUrl: string) => void;
  onSaveAsNew: (dataUrl: string) => void;
  onSaveSlicesToSlides?: (slices: { dataUrl: string; name: string }[]) => void;
  onClose: () => void;
}

interface CropRect {
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage (0-100)
  height: number; // percentage (0-100)
}

interface SliceItem {
  id: string;
  dataUrl: string;
  row: number;
  col: number;
  name: string;
}

interface StoryboardSlot {
  id: string;
  imageId: string | null; // Can refer to slice item id or additional image id
  name: string;
}

interface AdditionalImage {
  id: string;
  dataUrl: string;
  name: string;
}

export default function GridEdit({ imageUrl, width, height, onSave, onSaveAsNew, onSaveSlicesToSlides, onClose }: GridEditProps) {
  const [activeTab, setActiveTab] = useState<'crop' | 'grid' | 'storyboard'>('crop');
  
  // Crop States
  const [cropRect, setCropRect] = useState<CropRect>({ x: 10, y: 10, width: 80, height: 80 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [croppedWidth, setCroppedWidth] = useState<number>(1280);
  const [croppedHeight, setCroppedHeight] = useState<number>(720);
  const [naturalWidth, setNaturalWidth] = useState<number>(1280);
  const [naturalHeight, setNaturalHeight] = useState<number>(720);

  const currentCropW = Math.round((cropRect.width / 100) * naturalWidth);
  const currentCropH = Math.round((cropRect.height / 100) * naturalHeight);
  
  // Grid Splitting States
  const [rows, setRows] = useState<number>(3);
  const [cols, setCols] = useState<number>(3);
  const [vGridLines, setVGridLines] = useState<number[]>([]); // in relative pixels of cropped size
  const [hGridLines, setHGridLines] = useState<number[]>([]); // in relative pixels of cropped size
  const [isDraggingLine, setIsDraggingLine] = useState(false);
  const [isGridLocked, setIsGridLocked] = useState<boolean>(false);
  const [fileFormat, setFileFormat] = useState<'png' | 'jpeg'>('png');
  const [fileNamePrefix, setFileNamePrefix] = useState<string>('4person-3-2');
  const [slices, setSlices] = useState<SliceItem[]>([]);
  
  // Zoom State for Workspace Preview
  const [gridZoom, setGridZoom] = useState<number>(100);
  
  // Storyboard Creator States
  const [storyboardSlots, setStoryboardSlots] = useState<StoryboardSlot[]>([]);
  const [additionalImages, setAdditionalImages] = useState<AdditionalImage[]>([]);
  const [showNamesMode, setShowNamesMode] = useState<'both' | 'name' | 'none'>('both');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  
  // Ref Elements
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Dragging References
  const cropDragStartRef = useRef<{ clientX: number; clientY: number; rect: CropRect; handle: string } | null>(null);
  const lineDragStartRef = useRef<{ clientX: number; clientY: number; type: 'v' | 'h'; index: number; initialValue: number } | null>(null);

  // Generate or adjust grid lines when cols/rows count changes without resetting manual adjustments
  const adjustGridLines = useCallback((w: number, h: number, r: number, c: number, forceReset = false) => {
    setVGridLines(prev => {
      if (forceReset || prev.length === 0) {
        const vCuts: number[] = [];
        for (let i = 1; i < c; i++) {
          vCuts.push(Math.round((i / c) * w));
        }
        return vCuts;
      }
      
      const targetCount = c - 1;
      if (prev.length === targetCount) {
        return prev;
      } else if (prev.length > targetCount) {
        return prev.slice(0, targetCount);
      } else {
        const evenLines: number[] = [];
        for (let i = 1; i < c; i++) {
          evenLines.push(Math.round((i / c) * w));
        }
        const needed = targetCount - prev.length;
        const extra = evenLines.slice(evenLines.length - needed);
        const combined = [...prev, ...extra];
        combined.sort((x, y) => x - y);
        return combined;
      }
    });

    setHGridLines(prev => {
      if (forceReset || prev.length === 0) {
        const hCuts: number[] = [];
        for (let i = 1; i < r; i++) {
          hCuts.push(Math.round((i / r) * h));
        }
        return hCuts;
      }
      
      const targetCount = r - 1;
      if (prev.length === targetCount) {
        return prev;
      } else if (prev.length > targetCount) {
        return prev.slice(0, targetCount);
      } else {
        const evenLines: number[] = [];
        for (let i = 1; i < r; i++) {
          evenLines.push(Math.round((i / r) * h));
        }
        const needed = targetCount - prev.length;
        const extra = evenLines.slice(evenLines.length - needed);
        const combined = [...prev, ...extra];
        combined.sort((x, y) => x - y);
        return combined;
      }
    });
  }, []);

  // Recalculate grid cuts when inputs change
  useEffect(() => {
    if (croppedImageUrl) {
      adjustGridLines(croppedWidth, croppedHeight, rows, cols, false);
    }
  }, [rows, cols, croppedWidth, croppedHeight, croppedImageUrl, adjustGridLines]);

  // Crop Drag Handling
  const handleCropMouseDown = (e: React.MouseEvent | React.TouchEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    cropDragStartRef.current = {
      clientX,
      clientY,
      rect: { ...cropRect },
      handle
    };
    setIsDraggingCrop(true);
  };

  useEffect(() => {
    const handleCropMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingCrop || !cropDragStartRef.current) return;
      const start = cropDragStartRef.current;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const container = cropContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      
      const dxPct = ((clientX - start.clientX) / rect.width) * 100;
      const dyPct = ((clientY - start.clientY) / rect.height) * 100;
      
      let newRect = { ...start.rect };
      const minSize = 5; // Minimum size of 5%
      
      if (start.handle === 'move') {
        newRect.x = Math.max(0, Math.min(100 - newRect.width, start.rect.x + dxPct));
        newRect.y = Math.max(0, Math.min(100 - newRect.height, start.rect.y + dyPct));
      } else {
        if (start.handle.includes('e')) {
          newRect.width = Math.max(minSize, Math.min(100 - start.rect.x, start.rect.width + dxPct));
        }
        if (start.handle.includes('w')) {
          const possibleX = start.rect.x + dxPct;
          const possibleWidth = start.rect.width - dxPct;
          if (possibleX >= 0 && possibleWidth >= minSize) {
            newRect.x = possibleX;
            newRect.width = possibleWidth;
          }
        }
        if (start.handle.includes('s')) {
          newRect.height = Math.max(minSize, Math.min(100 - start.rect.y, start.rect.height + dyPct));
        }
        if (start.handle.includes('n')) {
          const possibleY = start.rect.y + dyPct;
          const possibleHeight = start.rect.height - dyPct;
          if (possibleY >= 0 && possibleHeight >= minSize) {
            newRect.y = possibleY;
            newRect.height = possibleHeight;
          }
        }
      }
      setCropRect(newRect);
    };

    const handleCropMouseUp = () => {
      setIsDraggingCrop(false);
      cropDragStartRef.current = null;
    };

    if (isDraggingCrop) {
      window.addEventListener('mousemove', handleCropMouseMove);
      window.addEventListener('mouseup', handleCropMouseUp);
      window.addEventListener('touchmove', handleCropMouseMove);
      window.addEventListener('touchend', handleCropMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleCropMouseMove);
      window.removeEventListener('mouseup', handleCropMouseUp);
      window.removeEventListener('touchmove', handleCropMouseMove);
      window.removeEventListener('touchend', handleCropMouseUp);
    };
  }, [isDraggingCrop, cropRect]);

  // Crop Confirm Action
  const confirmCropAndNext = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const x = (cropRect.x / 100) * img.naturalWidth;
      const y = (cropRect.y / 100) * img.naturalHeight;
      const w = (cropRect.width / 100) * img.naturalWidth;
      const h = (cropRect.height / 100) * img.naturalHeight;
      
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/png');
        setCroppedImageUrl(dataUrl);
        setCroppedWidth(Math.round(w));
        setCroppedHeight(Math.round(h));
        
        adjustGridLines(w, h, rows, cols, true);
        setActiveTab('grid');
      }
    };
    img.src = imageUrl;
  };

  // Grid Splitting Handles Mouse Drag Handling
  const handleLineMouseDown = (e: React.MouseEvent | React.TouchEvent, type: 'v' | 'h', index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    lineDragStartRef.current = {
      clientX,
      clientY,
      type,
      index,
      initialValue: type === 'v' ? vGridLines[index] : hGridLines[index]
    };
    setIsDraggingLine(true);
  };

  useEffect(() => {
    const handleLineMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingLine || !lineDragStartRef.current) return;
      const start = lineDragStartRef.current;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const container = gridContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      
      if (start.type === 'v') {
        const dx = ((clientX - start.clientX) / rect.width) * croppedWidth;
        let newValue = Math.round(start.initialValue + dx);
        
        newValue = Math.max(0, Math.min(croppedWidth, newValue));
        
        setVGridLines(prev => prev.map((val, idx) => idx === start.index ? newValue : val));
      } else {
        const dy = ((clientY - start.clientY) / rect.height) * croppedHeight;
        let newValue = Math.round(start.initialValue + dy);
        
        newValue = Math.max(0, Math.min(croppedHeight, newValue));
        
        setHGridLines(prev => prev.map((val, idx) => idx === start.index ? newValue : val));
      }
    };

    const handleLineMouseUp = () => {
      setIsDraggingLine(false);
      lineDragStartRef.current = null;
      setVGridLines(prev => [...prev].sort((a, b) => a - b));
      setHGridLines(prev => [...prev].sort((a, b) => a - b));
    };

    if (isDraggingLine) {
      window.addEventListener('mousemove', handleLineMouseMove);
      window.addEventListener('mouseup', handleLineMouseUp);
      window.addEventListener('touchmove', handleLineMouseMove);
      window.addEventListener('touchend', handleLineMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleLineMouseMove);
      window.removeEventListener('mouseup', handleLineMouseUp);
      window.removeEventListener('touchmove', handleLineMouseMove);
      window.removeEventListener('touchend', handleLineMouseUp);
    };
  }, [isDraggingLine, vGridLines, hGridLines, croppedWidth, croppedHeight]);

  // Execute grid slicing logic
  const cutGridIntoSlices = () => {
    if (!croppedImageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const colBounds = [0, ...[...vGridLines].sort((a, b) => a - b), croppedWidth];
      const rowBounds = [0, ...[...hGridLines].sort((a, b) => a - b), croppedHeight];
      
      const newSlices: SliceItem[] = [];
      
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const left = colBounds[c];
          const w = colBounds[c + 1] - left;
          const top = rowBounds[r];
          const h = rowBounds[r + 1] - top;
          
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, left, top, w, h, 0, 0, w, h);
            const dataUrl = canvas.toDataURL(fileFormat === 'png' ? 'image/png' : 'image/jpeg');
            const sliceId = `slice-${r}-${c}-${Math.random().toString(36).substring(2, 6)}`;
            newSlices.push({
              id: sliceId,
              dataUrl,
              row: r,
              col: c,
              name: `${fileNamePrefix || 'slice'}-${r + 1}-${c + 1}`
            });
          }
        }
      }
      setSlices(newSlices);
      
      // Storyboard slots pre-filled sequential setup
      const initialSlots: StoryboardSlot[] = newSlices.map((s, idx) => ({
        id: `slot-${idx}`,
        imageId: s.id,
        name: `Screen ${idx + 1}`
      }));
      setStoryboardSlots(initialSlots);
      setIsGridLocked(true);
    };
    img.src = croppedImageUrl;
  };

  // ZIP download of grid slices
  const downloadSlicesZip = async () => {
    if (slices.length === 0) return;
    const zip = new JSZip();
    slices.forEach((s) => {
      const base64Data = s.dataUrl.split(',')[1];
      const ext = fileFormat === 'png' ? 'png' : 'jpg';
      zip.file(`${s.name}.${ext}`, base64Data, { base64: true });
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileNamePrefix || 'carved-slices'}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Storyboard Creator interactions
  const handleDragStartSlice = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOverSlot = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropSlot = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    const imageId = e.dataTransfer.getData('text/plain');
    if (imageId) {
      setStoryboardSlots(prev => prev.map((slot, idx) => idx === slotIndex ? { ...slot, imageId } : slot));
    }
  };

  const handleClearSlot = (slotIndex: number) => {
    setStoryboardSlots(prev => prev.map((slot, idx) => idx === slotIndex ? { ...slot, imageId: null } : slot));
  };

  const addStoryboardSlot = () => {
    setStoryboardSlots(prev => [
      ...prev,
      { id: `slot-${prev.length}-${Math.random().toString(36).substring(2,6)}`, imageId: null, name: `Screen ${prev.length + 1}` }
    ]);
  };

  const removeStoryboardSlot = () => {
    if (storyboardSlots.length > 0) {
      setStoryboardSlots(prev => prev.slice(0, -1));
    }
  };

  const clearStoryboardBoard = () => {
    setStoryboardSlots(prev => prev.map(s => ({ ...s, imageId: null })));
  };

  // Additional image upload handler in Storyboard maker
  const handleAdditionalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newImg: AdditionalImage = {
          id: `additional-${Math.random().toString(36).substring(2, 8)}`,
          dataUrl,
          name: file.name.replace(/\.[^/.]+$/, "")
        };
        setAdditionalImages(prev => [...prev, newImg]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const deleteAdditionalImage = (id: string) => {
    setAdditionalImages(prev => prev.filter(item => item.id !== id));
    // Clear slot associations
    setStoryboardSlots(prev => prev.map(slot => slot.imageId === id ? { ...slot, imageId: null } : slot));
  };

  // Generate composite high-resolution storyboard image
  const handleExportStoryboardComposite = () => {
    const activeSlots = storyboardSlots;
    if (activeSlots.length === 0) return;
    
    const loadPromises = activeSlots.map(slot => {
      return new Promise<{ slotId: string; img: HTMLImageElement | null; name: string }>((resolve) => {
        if (!slot.imageId) {
          resolve({ slotId: slot.id, img: null, name: slot.name });
          return;
        }
        const srcItem = [...slices, ...additionalImages].find(i => i.id === slot.imageId);
        if (!srcItem) {
          resolve({ slotId: slot.id, img: null, name: slot.name });
          return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve({ slotId: slot.id, img, name: slot.name });
        img.onerror = () => resolve({ slotId: slot.id, img: null, name: slot.name });
        img.src = srcItem.dataUrl;
      });
    });
    
    Promise.all(loadPromises).then(items => {
      const canvas = document.createElement('canvas');
      const total = items.length;
      
      let gridCols = 3;
      if (layoutMode === 'list') {
        gridCols = 1;
      } else {
        gridCols = cols > 0 ? cols : 3;
      }
      const gridRows = Math.ceil(total / gridCols);
      
      const cellW = 384; // generous 384px size
      const cellH = 216; // 16:9 ratio cells
      const pad = 24;
      
      canvas.width = gridCols * (cellW + pad) + pad;
      canvas.height = gridRows * (cellH + pad + 40) + pad;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.fillStyle = '#090e1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      items.forEach((item, idx) => {
        const r = Math.floor(idx / gridCols);
        const c = idx % gridCols;
        
        const x = pad + c * (cellW + pad);
        const y = pad + r * (cellH + pad + 40);
        
        // Slot background Card border drawing
        ctx.fillStyle = '#111827';
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, cellW, cellH, 10);
        } else {
          ctx.rect(x, y, cellW, cellH);
        }
        ctx.fill();
        ctx.stroke();
        
        if (item.img) {
          ctx.save();
          // Clip path for rounded corners
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, cellW, cellH, 10);
          } else {
            ctx.rect(x, y, cellW, cellH);
          }
          ctx.clip();
          
          // Draw image keeping proportion or fit center
          const iw = item.img.width;
          const ih = item.img.height;
          const scale = Math.max(cellW / iw, cellH / ih);
          const dw = iw * scale;
          const dh = ih * scale;
          const dx = x + (cellW - dw) / 2;
          const dy = y + (cellH - dh) / 2;
          ctx.drawImage(item.img, dx, dy, dw, dh);
          ctx.restore();
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x + 10, y + 10, cellW - 20, cellH - 20, 6);
          } else {
            ctx.rect(x + 10, y + 10, cellW - 20, cellH - 20);
          }
          ctx.fill();
          
          ctx.fillStyle = '#64748b';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Drag Image Here', x + cellW / 2, y + cellH / 2);
        }
        
        // Text labels below cell
        if (showNamesMode === 'both' || showNamesMode === 'name') {
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(item.name || `Screen ${idx + 1}`, x + cellW / 2, y + cellH + 12);
        }
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${fileNamePrefix || 'storyboard'}-compiled.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  // Direct addition/saving of all Storyboard slots into FrameSEQ slides
  const saveAllToMainSlides = () => {
    const occupiedSlots = storyboardSlots.filter(s => s.imageId !== null);
    if (occupiedSlots.length === 0) return;
    
    // Find all images matching active storyboard slots
    const resolvedSlots = occupiedSlots.map(slot => {
      const srcItem = [...slices, ...additionalImages].find(i => i.id === slot.imageId);
      return {
        dataUrl: srcItem?.dataUrl || '',
        name: slot.name || 'slice'
      };
    }).filter(item => item.dataUrl !== '');
    
    if (resolvedSlots.length === 0) return;
    
    if (onSaveSlicesToSlides) {
      onSaveSlicesToSlides(resolvedSlots);
    } else {
      // Create the first slide back
      onSave(resolvedSlots[0].dataUrl);
      
      // Save remaining as new slides
      for (let i = 1; i < resolvedSlots.length; i++) {
        onSaveAsNew(resolvedSlots[i].dataUrl);
      }
      onClose();
    }
  };

  // Direct addition of individual slice back to slide sequence
  const addSingleSliceToSlides = (dataUrl: string) => {
    onSaveAsNew(dataUrl);
  };

  return (
    <div className="fixed inset-0 bg-[#090e1a]/95 z-[100] flex flex-col overflow-hidden animate-fade-in backdrop-blur-sm">
      
      {/* Dynamic Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#0f172a] border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-600/20 rounded-xl flex items-center justify-center">
            <Grid className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <span>Grid Slicer & Storyboard</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-mono border border-emerald-500/10">v007-grid</span>
            </h1>
            <p className="text-[10px] text-neutral-500 font-medium">Carve images into sequential boards</p>
          </div>
        </div>

        {/* Top Centered Steps Tab Button Box */}
        <div className="flex bg-[#121215] p-1 rounded-lg border border-neutral-800 gap-1">
          <button 
            onClick={() => setActiveTab('crop')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer",
              activeTab === 'crop' 
                ? "bg-neutral-800 text-white shadow" 
                : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>Crop Area</span>
          </button>
          <button 
            onClick={() => {
              if (croppedImageUrl) {
                setActiveTab('grid');
              }
            }}
            disabled={!croppedImageUrl}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed",
              activeTab === 'grid' 
                ? "bg-neutral-800 text-white shadow" 
                : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid Split</span>
          </button>
          <button 
            onClick={() => {
              if (slices.length > 0) {
                setActiveTab('storyboard');
              }
            }}
            disabled={slices.length === 0}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed",
              activeTab === 'storyboard' 
                ? "bg-neutral-800 text-white shadow" 
                : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Storyboard</span>
          </button>
        </div>

        <button 
          onClick={onClose} 
          className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar Control Area */}
        <aside className="w-80 bg-[#0f172a] border-r border-neutral-800 flex flex-col shrink-0 overflow-y-auto p-5">
          {activeTab === 'crop' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <Crop className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Crop Image</h3>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Select the specific region to be carved. Drag the edges or coordinates on the workspace to fine-tune selection.
              </p>
              
              <button 
                onClick={confirmCropAndNext}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-sky-600/10 transition-all cursor-pointer active:scale-95"
              >
                Confirm Crop & Next
              </button>
            </div>
          )}

          {activeTab === 'grid' && !isGridLocked && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Grid Configuration</h3>
                </div>
                <button 
                  onClick={cutGridIntoSlices}
                  className="px-2.5 py-1 bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/30 rounded text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" /> Lock Grid
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">Rows</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10" 
                    value={rows} 
                    onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#121215] border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">Columns</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10" 
                    value={cols} 
                    onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#121215] border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/80">
                <HelpCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  Drag the <strong className="text-sky-300 font-bold">grid handles</strong> on the image, or type exact pixel values below.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'grid' && isGridLocked && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Grid Configuration</h3>
                </div>
                <button 
                  onClick={() => setIsGridLocked(false)}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                >
                  <Unlock className="w-3 h-3" /> Edit Details
                </button>
              </div>

              {/* Box grid layout stats */}
              <div className="grid grid-cols-3 gap-1.5 bg-[#121215] p-1.5 rounded-lg border border-neutral-800">
                <div className="text-center p-2.5 bg-neutral-900 rounded border border-neutral-800/40">
                  <div className="text-base font-extrabold text-white leading-none mb-1">{rows}</div>
                  <div className="text-[8px] text-neutral-500 uppercase tracking-widest font-black">Rows</div>
                </div>
                <div className="text-center p-2.5 bg-neutral-900 rounded border border-neutral-800/40">
                  <div className="text-base font-extrabold text-white leading-none mb-1">{cols}</div>
                  <div className="text-[8px] text-neutral-500 uppercase tracking-widest font-black">Cols</div>
                </div>
                <div className="text-center p-2.5 bg-neutral-900 rounded border border-neutral-800/40">
                  <div className="text-base font-extrabold text-emerald-400 leading-none mb-1">{slices.length}</div>
                  <div className="text-[8px] text-neutral-500 uppercase tracking-widest font-black">Slices</div>
                </div>
              </div>

              {/* Format selection */}
              <div>
                <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1.5">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setFileFormat('png')}
                    className={cn(
                      "py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer",
                      fileFormat === 'png' 
                        ? "bg-sky-600/10 border-sky-500 text-sky-400" 
                        : "bg-[#121215] border-neutral-800 text-neutral-400"
                    )}
                  >
                    PNG {fileFormat === 'png' && '✓'}
                  </button>
                  <button 
                    onClick={() => setFileFormat('jpeg')}
                    className={cn(
                      "py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer",
                      fileFormat === 'jpeg' 
                        ? "bg-sky-600/10 border-sky-500 text-sky-400" 
                        : "bg-[#121215] border-neutral-800 text-neutral-400"
                    )}
                  >
                    JPEG {fileFormat === 'jpeg' && '✓'}
                  </button>
                </div>
              </div>

              {/* Slice prefix */}
              <div>
                <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1.5">Slice File Name Prefix</label>
                <input 
                  type="text" 
                  value={fileNamePrefix}
                  onChange={(e) => setFileNamePrefix(e.target.value)}
                  className="w-full bg-[#121215] border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                />
                <p className="text-[9px] text-sky-400 italic mt-1.5 leading-tight">
                  Slices will be named: {fileNamePrefix || 'slice'}-slice-r-c.{fileFormat === 'png' ? 'png' : 'jpg'}
                </p>
              </div>

              {/* Storyboard maker switch */}
              <button 
                onClick={() => setActiveTab('storyboard')}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black shadow-lg shadow-emerald-600/10 transition-all cursor-pointer"
              >
                <LayoutGrid className="w-4 h-4" /> Storyboard Maker
              </button>

              {/* Download ZIP */}
              <button 
                onClick={downloadSlicesZip}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-sky-600/10 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download ZIP
              </button>
            </div>
          )}

          {activeTab === 'storyboard' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Storyboard Maker</h3>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Arrange your carved pieces into a sequential storyboard layout. You can drag and drop the pieces on the right.
              </p>

              {/* Composite export */}
              <button 
                onClick={handleExportStoryboardComposite}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black shadow transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" /> Export Storyboard
              </button>

              {/* Save All to Slides */}
              <button 
                onClick={saveAllToMainSlides}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#121215] hover:bg-neutral-800 text-sky-400 border border-sky-500/20 rounded-lg text-xs font-black shadow transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Slices to Slides
              </button>

              {/* ZIP assets */}
              <button 
                onClick={downloadSlicesZip}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download Assets (ZIP)
              </button>

              {/* Load input */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Load Storyboard
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAdditionalImageUpload} 
                accept="image/*" 
                multiple
                className="hidden" 
              />
            </div>
          )}
        </aside>

        {/* Right workspace preview */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#090e1a]">
          
          {/* Workspace Preview Header */}
          <div className="flex items-center justify-between px-6 py-3.5 bg-[#0f172a]/40 border-b border-neutral-900 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wider">Workspace Preview</span>
                {activeTab === 'crop' ? (
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[9px] font-mono border border-sky-400/30 font-bold shadow-sm shadow-sky-500/10">
                    {currentCropW} × {currentCropH} px
                  </span>
                ) : croppedImageUrl ? (
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 text-[9px] font-mono border border-sky-500/10 font-bold">
                    {croppedWidth} × {croppedHeight} px
                  </span>
                ) : null}
              </div>
            </div>

            {/* Zoom Controls for Grid Edit */}
            {activeTab === 'grid' && croppedImageUrl && (
              <div className="flex items-center gap-3 bg-[#121215] px-3 py-1.5 rounded-lg border border-neutral-800">
                <button
                  onClick={() => setGridZoom(prev => Math.max(25, prev - 25))}
                  disabled={gridZoom <= 25}
                  className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Zoom Out"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                
                <span className="text-[10px] font-mono text-neutral-300 min-w-[36px] text-center font-bold">
                  {gridZoom}%
                </span>
                
                <button
                  onClick={() => setGridZoom(prev => Math.min(300, prev + 25))}
                  disabled={gridZoom >= 300}
                  className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Zoom In"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                
                <div className="w-[1px] h-3.5 bg-neutral-800" />
                
                <button
                  onClick={() => setGridZoom(100)}
                  className="px-2 py-0.5 hover:bg-[#1f1f23] rounded text-[10px] text-neutral-400 hover:text-white transition-colors cursor-pointer font-bold"
                >
                  Reset
                </button>
              </div>
            )}

            {/* Quick action controls */}
            {activeTab === 'storyboard' && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121215] border border-neutral-800 text-neutral-300 rounded-lg text-[11px] font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-sky-400" /> Upload New
                </button>
                <button 
                  onClick={() => {
                    setSlices([]);
                    setStoryboardSlots([]);
                    setCroppedImageUrl(null);
                    setActiveTab('crop');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/15 border border-rose-500/20 text-rose-400 rounded-lg text-[11px] font-bold cursor-pointer hover:bg-rose-600/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            )}
          </div>

          {/* Interactive Workspace Area */}
          <div className="flex-1 overflow-auto p-8 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-editor-checkerboard opacity-5 pointer-events-none" />
            
            {/* Tab 1: Crop Area View */}
            {activeTab === 'crop' && (
              <div 
                ref={cropContainerRef}
                className="relative max-w-full max-h-full border border-neutral-800 rounded-xl overflow-hidden select-none bg-neutral-950 shadow-2xl"
                style={{ width: 'fit-content' }}
              >
                <img 
                  src={imageUrl} 
                  alt="Original storyboard slide" 
                  className="max-h-[65vh] w-auto max-w-[70vw] block object-contain pointer-events-none"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setNaturalWidth(img.naturalWidth);
                    setNaturalHeight(img.naturalHeight);
                    setCroppedWidth(img.naturalWidth);
                    setCroppedHeight(img.naturalHeight);
                  }}
                />
                {/* Crop Overlay Mask */}
                <div className="absolute inset-0 bg-black/60 pointer-events-none" />
                
                {/* Bright Crop Rectangle Selection */}
                <div 
                  className="absolute border-2 border-sky-400 z-10 cursor-move"
                  style={{
                    left: `${cropRect.x}%`,
                    top: `${cropRect.y}%`,
                    width: `${cropRect.width}%`,
                    height: `${cropRect.height}%`,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)'
                  }}
                  onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                  onTouchStart={(e) => handleCropMouseDown(e, 'move')}
                >
                  {/* Dimension Badge overlay inside Crop Area */}
                  <div className="absolute top-2 left-2 bg-sky-950/90 text-sky-300 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded border border-sky-400/40 shadow-lg pointer-events-none select-none z-30">
                    {currentCropW} × {currentCropH} px
                  </div>

                  {/* Outer Grid Lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-35 pointer-events-none">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>

                  {/* Corner Drag Handles */}
                  <div 
                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-sky-500 rounded-sm cursor-nwse-resize z-20"
                    onMouseDown={(e) => handleCropMouseDown(e, 'nw')}
                    onTouchStart={(e) => handleCropMouseDown(e, 'nw')}
                  />
                  <div 
                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-sky-500 rounded-sm cursor-nesw-resize z-20"
                    onMouseDown={(e) => handleCropMouseDown(e, 'ne')}
                    onTouchStart={(e) => handleCropMouseDown(e, 'ne')}
                  />
                  <div 
                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-sky-500 rounded-sm cursor-nesw-resize z-20"
                    onMouseDown={(e) => handleCropMouseDown(e, 'sw')}
                    onTouchStart={(e) => handleCropMouseDown(e, 'sw')}
                  />
                  <div 
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-sky-500 rounded-sm cursor-nwse-resize z-20"
                    onMouseDown={(e) => handleCropMouseDown(e, 'se')}
                    onTouchStart={(e) => handleCropMouseDown(e, 'se')}
                  />

                  {/* Edge Drag Handles */}
                  <div 
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-sky-500 rounded-sm cursor-ns-resize z-20"
                    onMouseDown={(e) => handleCropMouseDown(e, 'n')}
                    onTouchStart={(e) => handleCropMouseDown(e, 'n')}
                  />
                  <div 
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-sky-500 rounded-sm cursor-ns-resize z-20"
                    onMouseDown={(e) => handleCropMouseDown(e, 's')}
                    onTouchStart={(e) => handleCropMouseDown(e, 's')}
                  />
                  <div 
                    className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2 h-4 bg-white border border-sky-500 rounded-sm cursor-ew-resize z-20"
                    onMouseDown={(e) => handleCropMouseDown(e, 'w')}
                    onTouchStart={(e) => handleCropMouseDown(e, 'w')}
                  />
                  <div 
                    className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2 h-4 bg-white border border-sky-500 rounded-sm cursor-ew-resize z-20"
                    onMouseDown={(e) => handleCropMouseDown(e, 'e')}
                    onTouchStart={(e) => handleCropMouseDown(e, 'e')}
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Grid Split Cutting Workspace View */}
            {activeTab === 'grid' && croppedImageUrl && (
              <div 
                ref={gridContainerRef}
                className="relative border border-neutral-800 overflow-hidden select-none bg-neutral-950 shadow-2xl transition-all duration-100 ease-out"
                style={{ 
                  width: 'fit-content',
                  height: 'fit-content'
                }}
              >
                <img 
                  src={croppedImageUrl} 
                  alt="Cropped canvas region" 
                  className="block object-contain pointer-events-none"
                  style={{
                    height: `${65 * (gridZoom / 100)}vh`,
                    maxWidth: `${70 * (gridZoom / 100)}vw`,
                    maxHeight: `${65 * (gridZoom / 100)}vh`,
                    width: 'auto',
                  }}
                />

                {/* Draw cut grid lines overlays */}
                {vGridLines.map((lineVal, index) => (
                  <div 
                    key={`v-${index}`}
                    className="absolute top-0 bottom-0 border-l border-sky-500 shadow-md z-20"
                    style={{ left: `${(lineVal / croppedWidth) * 100}%` }}
                  >
                    {!isGridLocked && (
                      <div 
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-ew-resize bg-[#121215] text-white border border-sky-500 rounded-full py-2 px-1 text-[10px] font-bold text-center select-none shadow-lg z-30 flex flex-col items-center justify-center min-w-[36px]"
                        style={{ top: '50%' }}
                        onMouseDown={(e) => handleLineMouseDown(e, 'v', index)}
                        onTouchStart={(e) => handleLineMouseDown(e, 'v', index)}
                      >
                        <div className="text-[8px] tracking-tighter opacity-70">:::</div>
                        <div className="leading-none text-sky-400 mt-0.5">{lineVal}</div>
                        <div className="text-[7px] uppercase tracking-wider opacity-60 leading-none">px</div>
                      </div>
                    )}
                  </div>
                ))}

                {hGridLines.map((lineVal, index) => (
                  <div 
                    key={`h-${index}`}
                    className="absolute left-0 right-0 border-t border-sky-500 shadow-md z-20"
                    style={{ top: `${(lineVal / croppedHeight) * 100}%` }}
                  >
                    {!isGridLocked && (
                      <div 
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-ns-resize bg-[#121215] text-white border border-sky-500 rounded-full px-3 py-1 text-[10px] font-bold text-center select-none shadow-lg z-30 flex items-center justify-center gap-1.5 min-h-[22px]"
                        style={{ left: '50%' }}
                        onMouseDown={(e) => handleLineMouseDown(e, 'h', index)}
                        onTouchStart={(e) => handleLineMouseDown(e, 'h', index)}
                      >
                        <span className="text-[8px] tracking-tighter opacity-70">:::</span>
                        <span className="text-sky-400 font-bold">{lineVal}px</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Storyboard Builder drag-and-drop board View */}
            {activeTab === 'storyboard' && (
              <div className="w-full h-full flex gap-6 overflow-hidden animate-fade-in text-left">
                
                {/* Left Column: Carved pieces collection */}
                <div className="w-[35%] flex flex-col border border-neutral-800 rounded-xl bg-[#0f172a] overflow-hidden p-4">
                  <div className="mb-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-0.5">Carved Slices</h3>
                    <p className="text-[10px] text-neutral-500">Drag these slices into the storyboard slots.</p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {/* Add custom extra slices area */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-neutral-800 hover:border-sky-500/50 bg-[#121215] hover:bg-neutral-800/20 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all gap-1.5"
                    >
                      <Plus className="w-6 h-6 text-emerald-400" />
                      <div>
                        <p className="text-[11px] text-neutral-300 font-bold">Add Other Images</p>
                        <p className="text-[9px] text-neutral-500 mt-0.5">Select multiple files</p>
                      </div>
                    </div>

                    {/* Slices Grid items */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Carved Slices List */}
                      {slices.map((slice) => (
                        <div 
                          key={slice.id}
                          draggable
                          onDragStart={(e) => handleDragStartSlice(e, slice.id)}
                          className="group relative aspect-video bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 cursor-grab hover:border-sky-400/50 active:cursor-grabbing transition-all hover:scale-[1.02]"
                        >
                          <img src={slice.dataUrl} alt={slice.name} className="w-full h-full object-cover" />
                          <div className="absolute bottom-1 left-1 bg-black/75 px-1.5 py-0.5 rounded text-[8px] font-mono text-neutral-400 truncate max-w-[85%]">
                            {slice.name}
                          </div>
                          
                          {/* Direct Quick insertion back to parent slides */}
                          <button 
                            onClick={() => addSingleSliceToSlides(slice.dataUrl)}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-sky-600 hover:bg-sky-500 text-white rounded cursor-pointer transition-all"
                            title="Add directly as a new slide"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {/* Additional manual uploads list */}
                      {additionalImages.map((img) => (
                        <div 
                          key={img.id}
                          draggable
                          onDragStart={(e) => handleDragStartSlice(e, img.id)}
                          className="group relative aspect-video bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 cursor-grab hover:border-emerald-400/50 active:cursor-grabbing transition-all hover:scale-[1.02]"
                        >
                          <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                          <div className="absolute bottom-1 left-1 bg-black/75 px-1.5 py-0.5 rounded text-[8px] font-mono text-emerald-400 truncate max-w-[70%]">
                            {img.name}
                          </div>
                          <button 
                            onClick={() => deleteAdditionalImage(img.id)}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded cursor-pointer transition-all"
                            title="Delete this image"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Dynamic Storyboard Grid board */}
                <div className="flex-1 flex flex-col border border-neutral-800 rounded-xl bg-[#0f172a] overflow-hidden p-4">
                  
                  {/* Grid layout controls */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-neutral-800/80 mb-4 flex-wrap gap-2 shrink-0">
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-0.5">
                        Storyboard ({storyboardSlots.length} Screens)
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex bg-[#121215] p-0.5 rounded border border-neutral-800 gap-0.5 text-[9px] font-bold text-neutral-400">
                        <button 
                          onClick={() => setShowNamesMode(showNamesMode === 'both' ? 'none' : 'both')}
                          className={cn("px-2 py-1 rounded cursor-pointer", showNamesMode === 'both' ? "bg-sky-600/10 text-sky-400" : "hover:text-white")}
                        >
                          Mode: Image + Name
                        </button>
                      </div>

                      <div className="flex bg-[#121215] p-0.5 rounded border border-neutral-800 gap-0.5 text-[9px] font-bold text-neutral-400">
                        <button 
                          onClick={() => setLayoutMode('grid')}
                          className={cn("p-1 rounded cursor-pointer", layoutMode === 'grid' ? "bg-sky-600/10 text-sky-400" : "hover:text-white")}
                          title="Grid View"
                        >
                          <LayoutGrid className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => setLayoutMode('list')}
                          className={cn("p-1 rounded cursor-pointer", layoutMode === 'list' ? "bg-sky-600/10 text-sky-400" : "hover:text-white")}
                          title="List View"
                        >
                          <List className="w-3 h-3" />
                        </button>
                      </div>

                      <button 
                        onClick={addStoryboardSlot}
                        className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded text-[10px] font-bold cursor-pointer transition-all border border-emerald-500/20"
                      >
                        + Add Slot
                      </button>
                      <button 
                        onClick={removeStoryboardSlot}
                        className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded text-[10px] font-bold cursor-pointer transition-all border border-rose-500/20"
                      >
                        - Remove Slot
                      </button>
                      <button 
                        onClick={clearStoryboardBoard}
                        className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded text-[10px] font-bold cursor-pointer transition-all border border-neutral-700"
                      >
                        Clear Board
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Slots board rendering area */}
                  <div className="flex-1 overflow-y-auto pr-1">
                    <div className={cn(
                      "grid gap-4",
                      layoutMode === 'grid' 
                        ? "grid-cols-2 md:grid-cols-3" 
                        : "grid-cols-1"
                    )}>
                      {storyboardSlots.map((slot, index) => {
                        const associatedImg = [...slices, ...additionalImages].find(i => i.id === slot.imageId);
                        return (
                          <div 
                            key={slot.id}
                            onDragOver={handleDragOverSlot}
                            onDrop={(e) => handleDropSlot(e, index)}
                            className="bg-[#121215] border border-neutral-800/80 rounded-xl p-3 flex flex-col gap-2 transition-all hover:border-neutral-700"
                          >
                            <div className="relative aspect-video bg-neutral-950 border border-dashed border-neutral-800 rounded-lg overflow-hidden flex items-center justify-center group/card">
                              {associatedImg ? (
                                <>
                                  <img src={associatedImg.dataUrl} alt={slot.name} className="w-full h-full object-cover" />
                                  <button 
                                    onClick={() => handleClearSlot(index)}
                                    className="absolute top-1.5 right-1.5 opacity-0 group-hover/card:opacity-100 p-1 bg-black/80 hover:bg-rose-600 text-neutral-400 hover:text-white rounded-md transition-all cursor-pointer shadow"
                                    title="Clear image"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <div className="text-center p-3">
                                  <FileImage className="w-5 h-5 text-neutral-700 mx-auto mb-1" />
                                  <span className="text-[9px] text-neutral-500 font-medium">Drag Image Here</span>
                                </div>
                              )}
                            </div>

                            {/* Label inputs */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] text-sky-400 font-extrabold uppercase tracking-wider">
                                Screen {index + 1}
                              </span>
                              <input 
                                type="text" 
                                value={slot.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setStoryboardSlots(prev => prev.map((s, idx) => idx === index ? { ...s, name: val } : s));
                                }}
                                placeholder="Screen Name"
                                className="w-full bg-[#0f172a] border border-neutral-800 rounded-md px-2 py-1 text-[11px] text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Styled checkerboard CSS utility */}
      <style>{`
        .bg-editor-checkerboard {
          background-image: linear-gradient(45deg, #121215 25%, transparent 25%), 
                            linear-gradient(-45deg, #121215 25%, transparent 25%), 
                            linear-gradient(45deg, transparent 75%, #121215 75%), 
                            linear-gradient(-45deg, transparent 75%, #121215 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
      `}</style>
    </div>
  );
}
