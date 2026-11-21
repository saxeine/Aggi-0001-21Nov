import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactCrop, { Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Upload, Crop as CropIcon, Grid, Download, Settings, Check, Image as ImageIcon, Archive, GripHorizontal, GripVertical, Move, LayoutGrid } from "lucide-react";
import { cn } from "../../utils";
import { getCroppedImg, sliceImage } from "../../imageUtils";
import JSZip from "jszip";
// The pre-bundled CommonJS module only exposes a default export (the saveAs function).
import FileSaver from 'file-saver';
const saveAs = FileSaver;

type Mode = "crop" | "carve" | "storyboard";

export function SegCarverTool() {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [mode, setMode] = useState<Mode>("crop");
  const [slicePrefix, setSlicePrefix] = useState<string>("");

  // Crop State
  const [crop, setCrop] = useState<Crop>();
  const [completedPercentCrop, setCompletedPercentCrop] = useState<Crop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Carve State
  const [croppedImageSrc, setCroppedImageSrc] = useState<string>("");
  const [isAdjusting, setIsAdjusting] = useState(true);
  const [numRows, setNumRows] = useState(3);
  const [numCols, setNumCols] = useState(3);
  const [rowCuts, setRowCuts] = useState<number[]>([]);
  const [colCuts, setColCuts] = useState<number[]>([]);
  const [carveImageSize, setCarveImageSize] = useState({ width: 0, height: 0 });
  const [format, setFormat] = useState<"image/png" | "image/jpeg">("image/png");

  const [isProcessing, setIsProcessing] = useState(false);

  
  // Storyboard State
  const [storyboardSlices, setStoryboardSlices] = useState<{name: string, url: string}[]>([]);
  const [storyboardSlots, setStoryboardSlots] = useState<{url: string | null; name: string; story: string}[]>(
    Array.from({ length: 9 }, () => ({ url: null, name: "", story: "" }))
  );
  const [draggedSliceUrl, setDraggedSliceUrl] = useState<string | null>(null);
  const [storyboardCellMode, setStoryboardCellMode] = useState<"image-only" | "image-name" | "full">("image-name");
  const [storyboardLayout, setStoryboardLayout] = useState<"grid9" | "list-dynamic">("grid9");


  
  
  const handleDownloadAssets = async () => {
    setIsProcessing(true);
    try {
      const zip = new JSZip();
      const filePrefix = slicePrefix ? `${slicePrefix}-` : "";
      
      storyboardSlots.forEach((slot, idx) => {
        if (slot.url) {
          // url is data:image/png;base64,...
          const base64Data = slot.url.split(",")[1];
          const slotCleanName = slot.name ? slot.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() : `screen-${idx + 1}`;
          const filename = `${filePrefix}${idx + 1}-${slotCleanName}.png`;
          zip.file(filename, base64Data, { base64: true });
        }
      });
      
      const content = await zip.generateAsync({ type: "blob" });
      const zipName = slicePrefix ? `${slicePrefix}-storyboard-assets.zip` : "storyboard-assets.zip";
      saveAs(content, zipName);
    } catch (e) {
      console.error(e);
      alert("Failed to package assets.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportStoryboard = () => {
    const dataStr = JSON.stringify(storyboardSlots, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const exportFileDefaultName = 'storyboard-export.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', exportFileDefaultName);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);
  };

  const handleImportStoryboard = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed.length !== 9) {
             setStoryboardLayout("list-dynamic");
          }
          setStoryboardSlots(parsed);
          
          const newSlices: Array<{ name: string; url: string }> = [];
          parsed.forEach((slot, idx) => {
             if (slot.url && !newSlices.find(s => s.url === slot.url)) {
                 newSlices.push({ name: `Imported-${idx}`, url: slot.url });
             }
          });
          
          if (newSlices.length > 0) {
            setStoryboardSlices(prev => {
                const combined = [...prev];
                newSlices.forEach(ns => {
                   if (!combined.find(c => c.url === ns.url)) combined.push(ns);
                });
                return combined;
            });
          }
          setMode("storyboard");
        } else {
          alert("Invalid storyboard file format. Expected a non-empty array of screens.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse storyboard file.");
      }
    };
    reader.readAsText(file);
    
    event.target.value = '';
  };

  const handleOpenStoryboard = async () => {
    if (!croppedImageSrc) return;
    setIsProcessing(true);
    try {
      const slices = await sliceImage(croppedImageSrc, rowCuts, colCuts, format);
      if (slices.length > 0) {
        const mappedSlices = slices.map(slice => ({
          ...slice,
          name: slicePrefix ? `${slicePrefix}-${slice.name}` : slice.name
        }));
        setStoryboardSlices(mappedSlices);
        setMode("storyboard");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const onSelectOtherImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      let loadedCount = 0;
      const newSlices: { name: string; url: string }[] = [];

      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          newSlices.push({
            name: file.name.replace(/\.[^/.]+$/, ""),
            url: reader.result?.toString() || ""
          });
          loadedCount++;
          if (loadedCount === files.length) {
            setStoryboardSlices(prev => [...prev, ...newSlices]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Drag State for grid handles
  const carveImgRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState<{ type: "row" | "col"; index: number } | null>(null);

  const updateCutFromPointer = useCallback(
    (clientX: number, clientY: number, drag: { type: "row" | "col"; index: number }) => {
      const img = carveImgRef.current;
      if (!img || carveImageSize.width === 0 || carveImageSize.height === 0) return;
      const rect = img.getBoundingClientRect();

      if (drag.type === "row") {
        const relY = (clientY - rect.top) / rect.height;
        const px = Math.round(Math.max(0, Math.min(1, relY)) * carveImageSize.height);
        setRowCuts((prev) => {
          const next = [...prev];
          next[drag.index] = px;
          return next;
        });
      } else {
        const relX = (clientX - rect.left) / rect.width;
        const px = Math.round(Math.max(0, Math.min(1, relX)) * carveImageSize.width);
        setColCuts((prev) => {
          const next = [...prev];
          next[drag.index] = px;
          return next;
        });
      }
    },
    [carveImageSize]
  );

  // Global pointer listeners while dragging
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      updateCutFromPointer(e.clientX, e.clientY, dragging);
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, updateCutFromPointer]);

  const handleReset = () => {
    setImageSrc("");
    setCrop(undefined);
    setCompletedPercentCrop(null);
    setCroppedImageSrc("");
    setIsAdjusting(true);
    setNumRows(3);
    setNumCols(3);
    setRowCuts([]);
    setColCuts([]);
    setCarveImageSize({ width: 0, height: 0 });
    setSlicePrefix("");
    setStoryboardSlices([]);
    setStoryboardSlots(Array.from({ length: 9 }, () => ({ url: null, name: "", story: "" })));
    setMode("crop");
  };

  // Handle File Upload
  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Makes crop preview update between images.
      setCompletedPercentCrop(null);
      const file = e.target.files[0];
      
      // Get file name without extension and sanitize
      const dotIndex = file.name.lastIndexOf('.');
      const fileNameWithoutExtension = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
      const sanitizedPrefix = fileNameWithoutExtension.replace(/[^a-zA-Z0-9_-]/g, "_");
      setSlicePrefix(sanitizedPrefix);

      const reader = new FileReader();
      reader.addEventListener("load", () => setImageSrc(reader.result?.toString() || ""));
      reader.readAsDataURL(file);
      setMode("crop");
      setCroppedImageSrc("");
    }
  };

  // Generate cropped image when switching to carve mode
  useEffect(() => {
    if (mode === "carve" && imageSrc) {
      if (completedPercentCrop && completedPercentCrop.width > 0 && completedPercentCrop.height > 0) {
        getCroppedImg(imageSrc, completedPercentCrop).then((url) => {
          setCroppedImageSrc(url);
        });
      } else {
        // If no crop was made, use the whole image
        setCroppedImageSrc(imageSrc);
      }
      setIsAdjusting(true);
    }
  }, [mode, imageSrc, completedPercentCrop]);

  // Initialize cuts when numRows/numCols or image size changes
  useEffect(() => {
    if (carveImageSize.width > 0 && carveImageSize.height > 0) {
      setRowCuts((prev) => {
        const newCuts = Array.from({ length: Math.max(0, numRows - 1) }, (_, i) => {
          return prev[i] !== undefined ? prev[i] : Math.round(((i + 1) * carveImageSize.height) / numRows);
        });
        return newCuts;
      });
      setColCuts((prev) => {
        const newCuts = Array.from({ length: Math.max(0, numCols - 1) }, (_, i) => {
          return prev[i] !== undefined ? prev[i] : Math.round(((i + 1) * carveImageSize.width) / numCols);
        });
        return newCuts;
      });
    }
  }, [numRows, numCols, carveImageSize]);

  const handleDownload = async () => {
    if (!croppedImageSrc) return;
    setIsProcessing(true);
    try {
      const slices = await sliceImage(croppedImageSrc, rowCuts, colCuts, format);
      
      if (slices.length === 0) return;

      if (slices.length === 1) {
        // Single file download
        const a = document.createElement("a");
        a.href = slices[0].url;
        const nameWithPrefix = slicePrefix ? `${slicePrefix}-${slices[0].name}` : slices[0].name;
        a.download = nameWithPrefix;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Multiple files: Bundle into a ZIP to prevent browser blocking
        const zip = new JSZip();
        slices.forEach((slice) => {
          // slice.url is a data URL: data:image/png;base64,iVBORw0KGgo...
          const base64Data = slice.url.split(",")[1];
          const nameWithPrefix = slicePrefix ? `${slicePrefix}-${slice.name}` : slice.name;
          zip.file(nameWithPrefix, base64Data, { base64: true });
        });
        const content = await zip.generateAsync({ type: "blob" });
        const zipName = slicePrefix ? `${slicePrefix}-carved-slices.zip` : "carved-slices.zip";
        saveAs(content, zipName);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-900 text-slate-200 font-sans selection:bg-sky-500/30 selection:text-sky-200 p-4">
      
      {/* Main Content */}
      {imageSrc ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-300">
          
          {/* Controls Panel - Left/Top */}
          <aside className="lg:col-span-3 space-y-4">
            
            {/* Mode Switcher */}
                        <div className="bg-slate-800 p-1 rounded-md border border-slate-700 flex shadow-sm">
              <button
                onClick={() => setMode("crop")}
                className={cn(
                  "flex-1 py-1.5 px-1 flex items-center justify-center gap-1 rounded text-[10px] font-medium transition-all border",
                  mode === "crop"
                    ? "bg-slate-700 text-sky-400 shadow-sm border-slate-600"
                    : "text-slate-400 border-transparent hover:bg-slate-700/50 hover:text-slate-300"
                )}
              >
                <CropIcon className="w-3.5 h-3.5" />
                Crop Area
              </button>
              <button
                onClick={() => setMode("carve")}
                className={cn(
                  "flex-1 py-1.5 px-1 flex items-center justify-center gap-1 rounded text-[10px] font-medium transition-all border",
                  mode === "carve"
                    ? "bg-slate-700 text-sky-400 shadow-sm border-slate-600"
                    : "text-slate-400 border-transparent hover:bg-slate-700/50 hover:text-slate-300"
                )}
              >
                <Grid className="w-3.5 h-3.5" />
                Grid Split
              </button>
              <button
                onClick={() => setMode("storyboard")}
                className={cn(
                  "flex-1 py-1.5 px-1 flex items-center justify-center gap-1 rounded text-[10px] font-medium transition-all border",
                  mode === "storyboard"
                    ? "bg-emerald-700 text-emerald-300 shadow-sm border-emerald-600"
                    : "text-slate-400 border-transparent hover:bg-slate-700/50 hover:text-slate-300"
                )}
                
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Storyboard
              </button>
            </div>

            {/* Crop Controls */}
            {mode === "crop" && (
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-sm space-y-3 animate-in slide-in-from-left-2 duration-300">
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CropIcon className="w-3.5 h-3.5 text-sky-400" />
                  Crop Image
                </h2>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Select the specific region to be carved. Drag the edges to fine-tune selection.
                </p>
                <button
                  onClick={() => setMode("carve")}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white py-1.5 rounded font-medium transition-colors border border-sky-500 flex items-center justify-center gap-1.5 text-xs shadow-sm mt-2"
                >
                  Confirm Crop & Next
                </button>
              </div>
            )}

            {/* Carve Controls */}
            {mode === "carve" && (
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-sm space-y-4 animate-in slide-in-from-right-2 duration-300">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-sky-400" />
                    Grid Configuration
                  </h2>
                  <button
                    onClick={() => setIsAdjusting(!isAdjusting)}
                    className={cn(
                      "text-[10px] font-semibold px-2 py-1 rounded transition-colors border",
                      isAdjusting 
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20" 
                        : "bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"
                    )}
                  >
                    {isAdjusting ? "Lock Grid" : "Edit Details"}
                  </button>
                </div>

                {isAdjusting ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-slate-400 uppercase">Rows</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={numRows}
                          onChange={(e) => setNumRows(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-shadow"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-slate-400 uppercase">Columns</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={numCols}
                          onChange={(e) => setNumCols(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-shadow"
                        />
                      </div>
                    </div>

                    <div className="bg-sky-500/5 border border-sky-500/20 rounded px-2 py-1.5 flex items-start gap-1.5">
                      <Move className="w-3 h-3 text-sky-400 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-slate-400 leading-snug">
                        Drag the <span className="text-sky-400 font-semibold">grid handles</span> on the image, or type exact pixel values below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-slate-900/60 rounded-md p-2.5 border border-slate-700 flex items-center justify-between shadow-inner">
                      <div className="flex gap-3">
                        <div className="text-center">
                          <span className="block text-lg font-bold text-slate-200 leading-none">{numRows}</span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Rows</span>
                        </div>
                        <div className="w-px bg-slate-700"></div>
                        <div className="text-center">
                          <span className="block text-lg font-bold text-slate-200 leading-none">{numCols}</span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Cols</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-base font-bold text-sky-400 leading-none">{numRows * numCols}</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Slices</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 pt-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Format</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setFormat("image/png")}
                          className={cn(
                            "py-1.5 px-2 rounded border text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                            format === "image/png"
                              ? "bg-sky-500/10 border-sky-500 text-sky-400"
                              : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                          )}
                        >
                          PNG
                          {format === "image/png" && <Check className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => setFormat("image/jpeg")}
                          className={cn(
                            "py-1.5 px-2 rounded border text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                            format === "image/jpeg"
                              ? "bg-sky-500/10 border-sky-500 text-sky-400"
                              : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                          )}
                        >
                          JPEG
                          {format === "image/jpeg" && <Check className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Slice File Name Prefix
                      </label>
                      <input
                        type="text"
                        value={slicePrefix}
                        onChange={(e) => setSlicePrefix(e.target.value)}
                        placeholder="e.g. BOOK"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-shadow"
                      />
                      {slicePrefix && (
                        <p className="text-[9px] text-sky-400 italic">
                          Slices will be named: {slicePrefix}-slice-r-c.png
                        </p>
                      )}
                    </div>

                    
                    <button
                      onClick={handleOpenStoryboard}
                      disabled={isProcessing}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:border-slate-600 text-white py-2 rounded font-bold transition-colors border border-emerald-500 flex items-center justify-center gap-2 shadow-sm text-xs mt-2"
                    >
                      {isProcessing ? (
                        <span className="animate-pulse">Processing...</span>
                      ) : (
                        <>
                          <LayoutGrid className="w-4 h-4" />
                          Storyboard Maker
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={isProcessing}
                      className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:border-slate-600 text-white py-2 rounded font-bold transition-colors border border-sky-500 flex items-center justify-center gap-2 shadow-sm text-xs mt-2"
                    >
                      {isProcessing ? (
                        <span className="animate-pulse">Packaging ZIP...</span>
                      ) : (
                        <>
                          {numRows * numCols > 1 ? <Archive className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                          Download {numRows * numCols > 1 ? "ZIP" : "Slice"}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Storyboard Controls */}
            {mode === "storyboard" && (
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-sm space-y-4 animate-in slide-in-from-right-2 duration-300">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
                    Storyboard Maker
                  </h2>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Arrange your carved pieces into a sequential 9-screen storyboard layout. You can drag and drop the pieces on the right.
                </p>
                
                
                <button
                  onClick={handleExportStoryboard}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded font-medium transition-colors border border-emerald-500 flex items-center justify-center gap-1.5 text-xs shadow-sm mt-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Storyboard
                </button>
                <button
                  onClick={handleDownloadAssets}
                  disabled={isProcessing || !storyboardSlots.some(s => s.url)}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white disabled:bg-slate-700 disabled:text-slate-500 disabled:border-slate-600 py-1.5 rounded font-medium transition-colors border border-sky-500 flex items-center justify-center gap-1.5 text-xs shadow-sm mt-2"
                >
                  <Archive className="w-3.5 h-3.5" />
                  {isProcessing ? "Packaging..." : "Download Assets (ZIP)"}
                </button>

                <div className="relative mt-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportStoryboard}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="Import Storyboard"
                  />
                  <div className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded font-medium transition-colors border border-slate-600 flex items-center justify-center gap-1.5 text-xs shadow-sm pointer-events-none">
                    <Upload className="w-3.5 h-3.5" />
                    Load Storyboard
                  </div>
                </div>

              </div>
            )}
          </aside>

          {/* Workspace Area - Right/Bottom */}
          <section className="lg:col-span-9 h-full">
            <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-sm overflow-hidden flex flex-col h-[70vh] min-h-[500px]">
              {/* Workspace Header */}
              <div className="bg-slate-900/80 px-3 py-2 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Workspace preview
                  </span>
                  {mode === "carve" && carveImageSize.width > 0 && (
                    <span className="text-[10px] font-mono text-sky-400/80 font-medium bg-sky-400/10 px-1.5 py-0.5 rounded">
                      {carveImageSize.width} × {carveImageSize.height} px
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1.5 shadow-sm">
                    <Upload className="w-3 h-3 text-sky-400" />
                    Upload New
                    <input type="file" accept="image/*" onChange={onSelectFile} className="hidden" />
                  </label>
                  <button
                    onClick={handleReset}
                    className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-900/50 px-2.5 py-1 rounded text-[11px] font-medium transition-all shadow-sm cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Workspace Content */}
              <div className="p-4 flex-1 flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMWUxZTI4IiAvPgo8cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMWUxZTI4IiAvPgo8L3N2Zz4=')] overflow-hidden">
                
                {mode === "crop" && (
                  <div className="max-w-full max-h-full flex items-center justify-center overflow-hidden border border-slate-700 shadow-xl bg-slate-900">
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(_, pc) => setCompletedPercentCrop(pc)}
                      className="max-h-[calc(70vh-80px)]"
                    >
                      <img
                        ref={imgRef}
                        alt="Upload"
                        src={imageSrc}
                        className="max-w-full max-h-[calc(70vh-80px)] object-contain"
                      />
                    </ReactCrop>
                  </div>
                )}

                
                {mode === "storyboard" && (
                  <div className="flex w-full h-full text-slate-200">
                    {/* Storyboard sidebar */}
                    <div className="w-64 border-r border-slate-700 bg-slate-900/50 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
                      <div>
                        <h3 className="text-sm font-bold text-slate-300">Carved Slices</h3>
                        <p className="text-[10px] text-slate-400">Drag these slices into the storyboard slots.</p>
                      </div>

                      {/* Add multi other images */}
                      <div className="border border-dashed border-slate-700 hover:border-emerald-500/50 rounded-lg p-3 transition-colors bg-slate-850">
                        <label className="flex flex-col items-center justify-center gap-1 cursor-pointer">
                          <ImageIcon className="w-5 h-5 text-emerald-400" />
                          <span className="text-[11px] font-semibold text-emerald-300 text-center">Add Other Images</span>
                          <span className="text-[9px] text-slate-500 text-center">Select multiple files</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            onChange={onSelectOtherImages} 
                            className="hidden" 
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {storyboardSlices.map((slice, i) => (
                          <div 
                            key={i} 
                            className="bg-slate-800 border border-slate-700 rounded overflow-hidden aspect-square flex items-center justify-center cursor-grab active:cursor-grabbing hover:border-emerald-500 transition-colors relative group/slice"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", slice.url);
                              setDraggedSliceUrl(slice.url);
                            }}
                            onDragEnd={() => setDraggedSliceUrl(null)}
                          >
                            <img src={slice.url} alt={slice.name} className="max-w-full max-h-full object-contain pointer-events-none" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setStoryboardSlices(prev => prev.filter((_, idx) => idx !== i));
                              }}
                              className="absolute top-1 right-1 bg-slate-950/80 p-1 rounded-full border border-slate-800 text-slate-400 opacity-0 group-hover/slice:opacity-100 transition-opacity hover:text-rose-400 hover:border-rose-500/30 cursor-pointer shadow-md"
                              title="Delete slice"
                            >
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Storyboard grid */}
                    <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center">
                       <div className="w-full max-w-4xl">
                         <div className="flex flex-col gap-4 mb-6">
                           <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
                             <h2 className="text-xl font-bold text-slate-200">
                               Storyboard ({storyboardSlots.length} Screens)
                             </h2>
                             <div className="flex flex-wrap items-center gap-2">
                               <button 
                                 onClick={() => {
                                    const nextMode = storyboardCellMode === "image-only" ? "image-name" : storyboardCellMode === "image-name" ? "full" : "image-only";
                                    setStoryboardCellMode(nextMode);
                                 }}
                                 className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors text-slate-300 flex items-center gap-1"
                               >
                                 <Settings className="w-3.5 h-3.5" />
                                 Mode: {storyboardCellMode === "full" ? "Full" : storyboardCellMode === "image-name" ? "Image + Name" : "Image Only"}
                               </button>
                               <button 
                                 onClick={() => {
                                    const newLayout = storyboardLayout === "grid9" ? "list-dynamic" : "grid9";
                                    setStoryboardLayout(newLayout);
                                    
                                    const desiredLength = newLayout === "grid9" ? 9 : (numRows * numCols);
                                    setStoryboardSlots(prev => {
                                       const next = [...prev];
                                       if (next.length < desiredLength) {
                                           while(next.length < desiredLength) {
                                               next.push({ url: null, name: "", story: "" });
                                           }
                                       } else if (next.length > desiredLength) {
                                           next.length = desiredLength;
                                       }
                                       return next;
                                    });
                                 }}
                                 className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors text-slate-300 flex items-center gap-1"
                               >
                                 <LayoutGrid className="w-3.5 h-3.5" />
                                 Layout: {storyboardLayout === "grid9" ? "3x3 Grid" : "List Match Grid"}
                               </button>
                               <button 
                                 onClick={() => {
                                    setStoryboardSlots(prev => [...prev, { url: null, name: "", story: "" }]);
                                 }}
                                 className="text-xs px-3 py-1 bg-emerald-900/60 hover:bg-emerald-800/85 rounded border border-emerald-700/60 transition-colors text-emerald-200 flex items-center gap-1 font-semibold"
                               >
                                 + Add Slot
                               </button>
                               <button 
                                 onClick={() => {
                                    if (storyboardSlots.length > 1) {
                                      setStoryboardSlots(prev => prev.slice(0, -1));
                                    }
                                 }}
                                 disabled={storyboardSlots.length <= 1}
                                 className="text-xs px-3 py-1 bg-rose-950/40 hover:bg-rose-900/60 disabled:opacity-30 disabled:cursor-not-allowed rounded border border-rose-900/40 transition-colors text-rose-300 font-semibold"
                               >
                                 - Remove Slot
                               </button>
                               <button 
                                 onClick={() => {
                                   const desiredLength = storyboardLayout === "grid9" ? 9 : (numRows * numCols);
                                   setStoryboardSlots(Array.from({ length: desiredLength }, () => ({ url: null, name: "", story: "" })))
                                 }}
                                 className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors text-slate-300"
                               >
                                 Clear Board
                               </button>
                             </div>
                           </div>
                         </div>
                         <div className={cn(
                           storyboardLayout === "grid9" 
                             ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                             : "flex flex-col gap-6"
                         )}>
                           {storyboardSlots.map((slot, idx) => (
                             <div 
                               key={idx}
                               className={cn(
                                 "bg-slate-900 border rounded-lg overflow-hidden transition-colors relative group",
                                 slot.url ? "border-slate-700" : "border-slate-700 hover:border-emerald-500/50 border-dashed",
                                 storyboardLayout === "grid9" ? "flex flex-col" : "flex flex-col md:flex-row min-h-[200px]"
                               )}
                               onDragOver={(e) => {
                                 e.preventDefault();
                                 e.dataTransfer.dropEffect = "copy";
                               }}
                               onDrop={(e) => {
                                 e.preventDefault();
                                 const url = e.dataTransfer.getData("text/plain");
                                 if (url) {
                                   setStoryboardSlots(prev => {
                                     const next = [...prev];
                                     next[idx] = { ...next[idx], url };
                                     return next;
                                   });
                                 }
                               }}
                             >
                               {/* Image Area */}
                               <div className={cn(
                                 "relative flex flex-col items-center justify-center bg-slate-950", 
                                 slot.url ? "aspect-auto p-2" : "aspect-video",
                                 storyboardLayout === "grid9" ? "flex-1 min-h-[160px]" : "w-full md:w-1/3 shrink-0"
                               )}>
                                 {slot.url ? (
                                   <>
                                     <img src={slot.url} alt={`Slot ${idx+1}`} className="max-w-full max-h-48 md:max-h-full object-contain rounded" />
                                     <button 
                                       onClick={() => {
                                         setStoryboardSlots(prev => {
                                           const next = [...prev];
                                           next[idx] = { ...next[idx], url: null };
                                           return next;
                                         });
                                       }}
                                       className="absolute top-2 right-2 bg-slate-900/80 p-1.5 rounded-full border border-slate-700 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 hover:border-red-500/50"
                                     >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                     </button>
                                   </>
                                 ) : (
                                   <div className="text-slate-500 flex flex-col items-center gap-2 pointer-events-none p-6">
                                     <LayoutGrid className="w-6 h-6 opacity-50" />
                                     <span className="text-xs font-medium">Drag Image Here</span>
                                   </div>
                                 )}
                                 <div className="absolute bottom-2 left-2 bg-slate-900/80 px-2 py-0.5 rounded text-[10px] font-medium text-slate-400 border border-slate-700 pointer-events-none">
                                   Screen {idx + 1}
                                 </div>
                               </div>

                               {/* Text Inputs Area */}
                               {storyboardCellMode !== "image-only" && (
                                 <div className={cn(
                                   "p-3 bg-slate-800 flex flex-col gap-3",
                                   storyboardLayout === "grid9" ? "border-t border-slate-700 shrink-0" : "border-t md:border-t-0 md:border-l border-slate-700 flex-1 justify-center"
                                 )}>
                                   <input
                                     type="text"
                                     placeholder="Screen Name..."
                                     value={slot.name}
                                     onChange={(e) => {
                                       setStoryboardSlots(prev => {
                                         const next = [...prev];
                                         next[idx] = { ...next[idx], name: e.target.value };
                                         return next;
                                       });
                                     }}
                                     className={cn(
                                       "w-full bg-slate-900 text-slate-200 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-500 font-semibold",
                                       storyboardCellMode === "image-name" && "flex-1"
                                     )}
                                   />
                                   
                                   {storyboardCellMode === "full" && (
                                     <textarea
                                       placeholder="Describe the story or action for this screen..."
                                       value={slot.story}
                                       onChange={(e) => {
                                         setStoryboardSlots(prev => {
                                           const next = [...prev];
                                           next[idx] = { ...next[idx], story: e.target.value };
                                           return next;
                                         });
                                       }}
                                       className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-500 resize-none h-24 md:flex-1"
                                     />
                                   )}
                                 </div>
                               )}
                             </div>
                           ))}
                         </div>
                       </div>
                    </div>
                  </div>
                )}

                {mode === "carve" && croppedImageSrc && (
                  <div
                    className={cn(
                      "relative max-w-full flex items-center justify-center border border-slate-700 shadow-2xl bg-slate-900 inline-block overflow-hidden select-none",
                      dragging && "cursor-grabbing"
                    )}
                  >
                    <img
                      ref={carveImgRef}
                      src={croppedImageSrc}
                      alt="Cropped"
                      className="max-w-full max-h-[calc(70vh-80px)] block pointer-events-none"
                      draggable={false}
                      onLoad={(e) => {
                        setCarveImageSize({
                          width: e.currentTarget.naturalWidth,
                          height: e.currentTarget.naturalHeight,
                        });
                      }}
                    />
                    
                    {/* Render Grid Lines */}
                    {carveImageSize.width > 0 && carveImageSize.height > 0 && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="relative w-full h-full">
                          {/* Row Cuts */}
                          {rowCuts.map((cutY, idx) => {
                            const isActive = dragging?.type === "row" && dragging.index === idx;
                            return (
                              <div
                                key={`line-r-${idx}`}
                                className={cn(
                                  "absolute left-0 right-0 z-10 group",
                                  isAdjusting && "pointer-events-auto cursor-row-resize"
                                )}
                                style={{ top: `${(cutY / carveImageSize.height) * 100}%` }}
                                onPointerDown={
                                  isAdjusting
                                    ? (e) => {
                                        e.preventDefault();
                                        setDragging({ type: "row", index: idx });
                                      }
                                    : undefined
                                }
                              >
                                {/* Visible line */}
                                <div
                                  className={cn(
                                    "absolute left-0 right-0 border-t-[6px] border-slate-950 shadow-[0_0_12px_rgba(0,0,0,0.8)] -mt-[3px]",
                                    isActive && "border-slate-900"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "absolute inset-0 border-t-2 -mt-1",
                                      isActive ? "border-sky-300" : "border-sky-400/80",
                                      isAdjusting && "group-hover:border-sky-300"
                                    )}
                                  ></div>
                                </div>
                                {/* Drag handle */}
                                {isAdjusting && (
                                  <div
                                    className={cn(
                                      "absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-auto px-2 h-6 rounded-full border-2 shadow-lg transition-colors gap-1",
                                      isActive
                                        ? "bg-sky-400 border-sky-200 scale-110 text-slate-950"
                                        : "bg-slate-950 border-sky-400 group-hover:bg-sky-500 group-hover:border-sky-300 text-sky-400 group-hover:text-slate-950"
                                    )}
                                  >
                                    <GripHorizontal className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-mono font-bold">{cutY}px</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Col Cuts */}
                          {colCuts.map((cutX, idx) => {
                            const isActive = dragging?.type === "col" && dragging.index === idx;
                            return (
                              <div
                                key={`line-c-${idx}`}
                                className={cn(
                                  "absolute top-0 bottom-0 z-10 group",
                                  isAdjusting && "pointer-events-auto cursor-col-resize"
                                )}
                                style={{ left: `${(cutX / carveImageSize.width) * 100}%` }}
                                onPointerDown={
                                  isAdjusting
                                    ? (e) => {
                                        e.preventDefault();
                                        setDragging({ type: "col", index: idx });
                                      }
                                    : undefined
                                }
                              >
                                {/* Visible line */}
                                <div
                                  className={cn(
                                    "absolute top-0 bottom-0 border-l-[6px] border-slate-950 shadow-[0_0_12px_rgba(0,0,0,0.8)] -ml-[3px]",
                                    isActive && "border-slate-900"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "absolute inset-0 border-l-2 -ml-1",
                                      isActive ? "border-sky-300" : "border-sky-400/80",
                                      isAdjusting && "group-hover:border-sky-300"
                                    )}
                                  ></div>
                                </div>
                                {/* Drag handle */}
                                {isAdjusting && (
                                  <div
                                    className={cn(
                                      "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center justify-center w-auto px-1 py-2 h-auto rounded-full border-2 shadow-lg transition-colors gap-1",
                                      isActive
                                        ? "bg-sky-400 border-sky-200 scale-110 text-slate-950"
                                        : "bg-slate-950 border-sky-400 group-hover:bg-sky-500 group-hover:border-sky-300 text-sky-400 group-hover:text-slate-950"
                                    )}
                                  >
                                    <GripVertical className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-mono font-bold leading-none">{cutX}<br/>px</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </section>
        </div>
      ) : (
        /* Empty State */
        <div className="h-full flex items-center justify-center">
            <label className="cursor-pointer bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-lg font-bold transition-all border border-sky-500 flex items-center justify-center gap-2 shadow-lg hover:shadow-sky-500/20 group text-sm">
              <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
              Select Image to Begin
              <input type="file" accept="image/*" onChange={onSelectFile} className="hidden" />
            </label>
        </div>
      )}
    </div>
  );
}
